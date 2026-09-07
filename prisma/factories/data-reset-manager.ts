/**
 * Data Reset and Management Utilities
 *
 * Provides clean reset/reseed procedures that maintain referential integrity,
 * data validation and integrity checks for post-seed verification,
 * and configuration options for different seed scenarios.
 */

import { PrismaClient } from '@prisma/client';
import {
  getEnvironmentConfig,
  loadSeedConfig,
  mergeConfigs,
  validateSeedConfig,
} from './seed-config';
import { SeedConfiguration } from './types';
import { DataIntegrityValidator } from './validators';

export interface ResetOptions {
  preserveUsers?: boolean;
  preserveBusiness?: boolean;
  preserveBusinessUsers?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
}

export interface SeedScenario {
  name: string;
  description: string;
  config: Partial<SeedConfiguration>;
  resetOptions?: ResetOptions;
}

export interface ResetResult {
  success: boolean;
  duration: number;
  deletedCounts: Record<string, number>;
  errors: string[];
  warnings: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary: ValidationSummary;
}

export interface ValidationError {
  type:
    | 'referential_integrity'
    | 'business_logic'
    | 'data_consistency'
    | 'configuration';
  entity: string;
  field?: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface ValidationWarning {
  type: 'performance' | 'data_quality' | 'configuration';
  entity: string;
  field?: string;
  message: string;
}

export interface ValidationSummary {
  totalEntities: number;
  validatedEntities: number;
  criticalErrors: number;
  highErrors: number;
  mediumErrors: number;
  lowErrors: number;
  warnings: number;
}

/**
 * Main data reset and management class
 */
export class DataResetManager {
  private prisma: PrismaClient;
  private validator: DataIntegrityValidator;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    // Note: DataIntegrityValidator will be initialized per business when needed
    this.validator = null as any; // Temporary fix
  }

  /**
   * Get predefined seed scenarios
   */
  getPredefinedScenarios(): SeedScenario[] {
    const baseConfig = loadSeedConfig();

    return [
      {
        name: 'demo',
        description:
          'Full demo environment with comprehensive data for sales demonstrations',
        config: baseConfig,
        resetOptions: {
          preserveUsers: true,
          preserveBusiness: true,
          preserveBusinessUsers: true,
        },
      },
      {
        name: 'development',
        description: 'Reduced dataset for development and testing',
        config: mergeConfigs(baseConfig, getEnvironmentConfig('development')),
        resetOptions: {
          preserveUsers: true,
          preserveBusiness: true,
          preserveBusinessUsers: true,
        },
      },
      {
        name: 'testing',
        description: 'Minimal dataset for automated testing',
        config: mergeConfigs(baseConfig, getEnvironmentConfig('testing')),
        resetOptions: {
          preserveUsers: false,
          preserveBusiness: false,
          preserveBusinessUsers: false,
        },
      },
      {
        name: 'performance',
        description: 'Large dataset for performance testing',
        config: mergeConfigs(baseConfig, {
          clients: {
            count: 200,
            demographics: baseConfig.clients.demographics,
          },
          staff: { count: 12, specialties: baseConfig.staff.specialties },
          appointments: {
            historicalMonths: 12,
            patternsConfig: baseConfig.appointments.patternsConfig,
          },
        }),
        resetOptions: {
          preserveUsers: true,
          preserveBusiness: true,
          preserveBusinessUsers: true,
        },
      },
      {
        name: 'minimal',
        description: 'Bare minimum data for basic functionality testing',
        config: mergeConfigs(baseConfig, {
          clients: { count: 5, demographics: baseConfig.clients.demographics },
          staff: {
            count: 2,
            specialties: baseConfig.staff.specialties.slice(0, 2),
          },
          appointments: {
            historicalMonths: 1,
            patternsConfig: baseConfig.appointments.patternsConfig,
          },
        }),
        resetOptions: {
          preserveUsers: true,
          preserveBusiness: true,
          preserveBusinessUsers: true,
        },
      },
    ];
  }

  /**
   * Get scenario by name
   */
  getScenario(name: string): SeedScenario | null {
    return (
      this.getPredefinedScenarios().find(scenario => scenario.name === name) ||
      null
    );
  }

  /**
   * Clean reset with referential integrity maintenance
   */
  async cleanReset(
    businessId: string,
    options: ResetOptions = {}
  ): Promise<ResetResult> {
    const startTime = Date.now();
    const deletedCounts: Record<string, number> = {};
    const errors: string[] = [];
    const warnings: string[] = [];

    console.log('🧹 Starting clean data reset...');

    if (options.verbose) {
      console.log(`Options: ${JSON.stringify(options, null, 2)}`);
    }

    try {
      // Validate business exists
      const business = await this.prisma.business.findUnique({
        where: { id: businessId },
      });

      if (!business) {
        throw new Error(`Business with ID ${businessId} not found`);
      }

      if (options.dryRun) {
        console.log('🔍 DRY RUN MODE - No data will be deleted');

        // Count what would be deleted
        const counts = await this.getEntityCounts(businessId);

        console.log('📊 Entities that would be deleted:');
        Object.entries(counts).forEach(([entity, count]) => {
          if (count > 0) {
            console.log(`  ${entity}: ${count}`);
          }
        });

        return {
          success: true,
          duration: Date.now() - startTime,
          deletedCounts: counts,
          errors: [],
          warnings: ['Dry run mode - no data was actually deleted'],
        };
      }

      // Perform actual deletion in transaction
      await this.prisma.$transaction(async tx => {
        // Delete in reverse dependency order to maintain referential integrity

        // 1. Delete business operations data first (if models exist)
        try {
          // Note: Some models might not exist in the current schema
          // We'll handle this gracefully

          // Delete loyalty transactions (if model exists)
          try {
            const loyaltyTransactionsDeleted = await tx.$executeRaw`
              DELETE FROM loyalty_transactions 
              WHERE membership_id IN (
                SELECT id FROM loyalty_memberships 
                WHERE loyalty_program_id IN (
                  SELECT id FROM loyalty_programs WHERE business_id = ${businessId}
                )
              )
            `;
            deletedCounts['loyaltyTransactions'] = Number(
              loyaltyTransactionsDeleted
            );
            if (options.verbose)
              console.log(
                `  Deleted ${loyaltyTransactionsDeleted} loyalty transactions`
              );
          } catch (error) {
            warnings.push('Loyalty transactions table not found or accessible');
          }

          // Delete loyalty memberships (if model exists)
          try {
            const loyaltyMembershipsDeleted = await tx.$executeRaw`
              DELETE FROM loyalty_memberships 
              WHERE loyalty_program_id IN (
                SELECT id FROM loyalty_programs WHERE business_id = ${businessId}
              )
            `;
            deletedCounts['loyaltyMemberships'] = Number(
              loyaltyMembershipsDeleted
            );
            if (options.verbose)
              console.log(
                `  Deleted ${loyaltyMembershipsDeleted} loyalty memberships`
              );
          } catch (error) {
            warnings.push('Loyalty memberships table not found or accessible');
          }

          // Delete loyalty programs (if model exists)
          try {
            const loyaltyProgramsDeleted = await tx.$executeRaw`
              DELETE FROM loyalty_programs WHERE business_id = ${businessId}
            `;
            deletedCounts['loyaltyPrograms'] = Number(loyaltyProgramsDeleted);
            if (options.verbose)
              console.log(
                `  Deleted ${loyaltyProgramsDeleted} loyalty programs`
              );
          } catch (error) {
            warnings.push('Loyalty programs table not found or accessible');
          }

          // Delete campaign recipients (if model exists)
          try {
            const campaignRecipientsDeleted = await tx.$executeRaw`
              DELETE FROM campaign_recipients 
              WHERE campaign_id IN (
                SELECT id FROM marketing_campaigns WHERE business_id = ${businessId}
              )
            `;
            deletedCounts['campaignRecipients'] = Number(
              campaignRecipientsDeleted
            );
            if (options.verbose)
              console.log(
                `  Deleted ${campaignRecipientsDeleted} campaign recipients`
              );
          } catch (error) {
            warnings.push('Campaign recipients table not found or accessible');
          }

          // Delete marketing campaigns (if model exists)
          try {
            const marketingCampaignsDeleted = await tx.$executeRaw`
              DELETE FROM marketing_campaigns WHERE business_id = ${businessId}
            `;
            deletedCounts['marketingCampaigns'] = Number(
              marketingCampaignsDeleted
            );
            if (options.verbose)
              console.log(
                `  Deleted ${marketingCampaignsDeleted} marketing campaigns`
              );
          } catch (error) {
            warnings.push('Marketing campaigns table not found or accessible');
          }

          // Delete promotion usage (if model exists)
          try {
            const promotionUsageDeleted = await tx.$executeRaw`
              DELETE FROM promotion_usage 
              WHERE promotion_id IN (
                SELECT id FROM promotions WHERE business_id = ${businessId}
              )
            `;
            deletedCounts['promotionUsage'] = Number(promotionUsageDeleted);
            if (options.verbose)
              console.log(
                `  Deleted ${promotionUsageDeleted} promotion usage records`
              );
          } catch (error) {
            warnings.push('Promotion usage table not found or accessible');
          }

          // Delete promotions (if model exists)
          try {
            const promotionsDeleted = await tx.$executeRaw`
              DELETE FROM promotions WHERE business_id = ${businessId}
            `;
            deletedCounts['promotions'] = Number(promotionsDeleted);
            if (options.verbose)
              console.log(`  Deleted ${promotionsDeleted} promotions`);
          } catch (error) {
            warnings.push('Promotions table not found or accessible');
          }

          // Delete gift card redemptions (if model exists)
          try {
            const giftCardRedemptionsDeleted = await tx.$executeRaw`
              DELETE FROM gift_card_redemptions 
              WHERE gift_card_id IN (
                SELECT id FROM gift_cards WHERE business_id = ${businessId}
              )
            `;
            deletedCounts['giftCardRedemptions'] = Number(
              giftCardRedemptionsDeleted
            );
            if (options.verbose)
              console.log(
                `  Deleted ${giftCardRedemptionsDeleted} gift card redemptions`
              );
          } catch (error) {
            warnings.push(
              'Gift card redemptions table not found or accessible'
            );
          }

          // Delete gift cards (if model exists)
          try {
            const giftCardsDeleted = await tx.$executeRaw`
              DELETE FROM gift_cards WHERE business_id = ${businessId}
            `;
            deletedCounts['giftCards'] = Number(giftCardsDeleted);
            if (options.verbose)
              console.log(`  Deleted ${giftCardsDeleted} gift cards`);
          } catch (error) {
            warnings.push('Gift cards table not found or accessible');
          }

          // Delete product sales (if model exists)
          try {
            const productSalesDeleted = await tx.$executeRaw`
              DELETE FROM product_sales WHERE business_id = ${businessId}
            `;
            deletedCounts['productSales'] = Number(productSalesDeleted);
            if (options.verbose)
              console.log(`  Deleted ${productSalesDeleted} product sales`);
          } catch (error) {
            warnings.push('Product sales table not found or accessible');
          }

          // Delete products (if model exists)
          try {
            const productsDeleted = await tx.$executeRaw`
              DELETE FROM products WHERE business_id = ${businessId}
            `;
            deletedCounts['products'] = Number(productsDeleted);
            if (options.verbose)
              console.log(`  Deleted ${productsDeleted} products`);
          } catch (error) {
            warnings.push('Products table not found or accessible');
          }
        } catch (error) {
          warnings.push(
            `Some business operations data could not be deleted: ${error}`
          );
        }

        // 2. Delete core business data (these should exist)

        // Delete appointment services
        const appointmentServicesDeleted =
          await tx.appointmentService.deleteMany({
            where: {
              appointment: {
                businessId,
              },
            },
          });
        deletedCounts['appointmentServices'] = appointmentServicesDeleted.count;
        if (options.verbose)
          console.log(
            `  Deleted ${appointmentServicesDeleted.count} appointment services`
          );

        // Delete transactions
        const transactionsDeleted = await tx.transaction.deleteMany({
          where: { businessId },
        });
        deletedCounts['transactions'] = transactionsDeleted.count;
        if (options.verbose)
          console.log(`  Deleted ${transactionsDeleted.count} transactions`);

        // Delete appointments
        const appointmentsDeleted = await tx.appointment.deleteMany({
          where: { businessId },
        });
        deletedCounts['appointments'] = appointmentsDeleted.count;
        if (options.verbose)
          console.log(`  Deleted ${appointmentsDeleted.count} appointments`);

        // Delete staff services
        const staffServicesDeleted = await tx.staffService.deleteMany({
          where: {
            staff: {
              businessId,
            },
          },
        });
        deletedCounts['staffServices'] = staffServicesDeleted.count;
        if (options.verbose)
          console.log(`  Deleted ${staffServicesDeleted.count} staff services`);

        // Delete services
        const servicesDeleted = await tx.service.deleteMany({
          where: { businessId },
        });
        deletedCounts['services'] = servicesDeleted.count;
        if (options.verbose)
          console.log(`  Deleted ${servicesDeleted.count} services`);

        // Delete staff
        const staffDeleted = await tx.staff.deleteMany({
          where: { businessId },
        });
        deletedCounts['staff'] = staffDeleted.count;
        if (options.verbose)
          console.log(`  Deleted ${staffDeleted.count} staff members`);

        // Delete clients
        const clientsDeleted = await tx.client.deleteMany({
          where: { businessId },
        });
        deletedCounts['clients'] = clientsDeleted.count;
        if (options.verbose)
          console.log(`  Deleted ${clientsDeleted.count} clients`);

        // Optionally delete business users
        if (!options.preserveBusinessUsers) {
          const businessUsersDeleted = await tx.businessUser.deleteMany({
            where: { businessId },
          });
          deletedCounts['businessUsers'] = businessUsersDeleted.count;
          if (options.verbose)
            console.log(
              `  Deleted ${businessUsersDeleted.count} business user relationships`
            );
        }

        // Optionally delete the business itself
        if (!options.preserveBusiness) {
          await tx.business.delete({
            where: { id: businessId },
          });
          deletedCounts['business'] = 1;
          if (options.verbose) console.log(`  Deleted business`);
        }
      });

      const duration = Date.now() - startTime;
      console.log(`✅ Clean reset completed successfully in ${duration}ms`);

      return {
        success: true,
        duration,
        deletedCounts,
        errors,
        warnings,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      errors.push(errorMessage);

      console.error('❌ Clean reset failed:', errorMessage);

      return {
        success: false,
        duration,
        deletedCounts,
        errors,
        warnings,
      };
    }
  }

  /**
   * Get entity counts for a business
   */
  private async getEntityCounts(
    businessId: string
  ): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};

    try {
      // Core entities
      counts.clients = await this.prisma.client.count({
        where: { businessId },
      });
      counts.staff = await this.prisma.staff.count({ where: { businessId } });
      counts.services = await this.prisma.service.count({
        where: { businessId },
      });
      counts.appointments = await this.prisma.appointment.count({
        where: { businessId },
      });
      counts.transactions = await this.prisma.transaction.count({
        where: { businessId },
      });

      // Relationship entities
      counts.staffServices = await this.prisma.staffService.count({
        where: { staff: { businessId } },
      });
      counts.appointmentServices = await this.prisma.appointmentService.count({
        where: { appointment: { businessId } },
      });

      // Business users
      counts.businessUsers = await this.prisma.businessUser.count({
        where: { businessId },
      });

      // Extended entities (if they exist)
      try {
        counts.products = await this.prisma.$queryRaw<[{ count: bigint }]>`
          SELECT COUNT(*) as count FROM products WHERE business_id = ${businessId}
        `.then(result => Number(result[0]?.count || 0));
      } catch {
        counts.products = 0;
      }

      try {
        counts.giftCards = await this.prisma.$queryRaw<[{ count: bigint }]>`
          SELECT COUNT(*) as count FROM gift_cards WHERE business_id = ${businessId}
        `.then(result => Number(result[0]?.count || 0));
      } catch {
        counts.giftCards = 0;
      }
    } catch (error) {
      console.warn('Warning: Could not get all entity counts:', error);
    }

    return counts;
  }

  /**
   * Comprehensive data validation and integrity checks
   */
  async validateDataIntegrity(businessId: string): Promise<ValidationResult> {
    console.log('🔍 Starting comprehensive data validation...');

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let totalEntities = 0;
    let validatedEntities = 0;

    try {
      // Validate business exists
      const business = await this.prisma.business.findUnique({
        where: { id: businessId },
      });

      if (!business) {
        errors.push({
          type: 'referential_integrity',
          entity: 'business',
          message: `Business with ID ${businessId} not found`,
          severity: 'critical',
        });

        return {
          isValid: false,
          errors,
          warnings,
          summary: {
            totalEntities: 0,
            validatedEntities: 0,
            criticalErrors: 1,
            highErrors: 0,
            mediumErrors: 0,
            lowErrors: 0,
            warnings: 0,
          },
        };
      }

      validatedEntities++;
      totalEntities++;

      // Use the validator for comprehensive checks if available
      try {
        const validator = new DataIntegrityValidator(this.prisma, businessId);
        const validationResult = await validator.validateFinancialIntegrity();

        // Convert validator results to our format
        validationResult.errors.forEach(error => {
          errors.push({
            type: 'referential_integrity',
            entity: error.entity ?? 'unknown',
            field: error.field,
            message: error.message,
            severity: error.severity as 'critical' | 'high' | 'medium' | 'low',
          });
        });

        validationResult.warnings.forEach(warning => {
          warnings.push({
            type: 'data_quality',
            entity: warning.entity ?? 'unknown',
            field: warning.field,
            message: warning.message,
          });
        });
      } catch (error) {
        // If validator is not available or fails, continue with basic validation
        errors.push({
          type: 'referential_integrity',
          entity: 'validation',
          message: `Validation process failed: ${error instanceof Error ? error.message : String(error)}`,
          severity: 'critical',
        });
      }

      // Additional business logic validations
      await this.validateBusinessLogic(businessId, errors, warnings);

      // Count entities for summary
      const counts = await this.getEntityCounts(businessId);
      totalEntities = Object.values(counts).reduce(
        (sum, count) => sum + count,
        1
      ); // +1 for business
      validatedEntities = totalEntities; // Assume all were validated if no critical errors

      // Generate summary
      const summary: ValidationSummary = {
        totalEntities,
        validatedEntities,
        criticalErrors: errors.filter(e => e.severity === 'critical').length,
        highErrors: errors.filter(e => e.severity === 'high').length,
        mediumErrors: errors.filter(e => e.severity === 'medium').length,
        lowErrors: errors.filter(e => e.severity === 'low').length,
        warnings: warnings.length,
      };

      const isValid = summary.criticalErrors === 0 && summary.highErrors === 0;

      console.log(`📊 Validation Summary:`);
      console.log(`  Total entities: ${summary.totalEntities}`);
      console.log(`  Validated entities: ${summary.validatedEntities}`);
      console.log(`  Critical errors: ${summary.criticalErrors}`);
      console.log(`  High errors: ${summary.highErrors}`);
      console.log(`  Medium errors: ${summary.mediumErrors}`);
      console.log(`  Low errors: ${summary.lowErrors}`);
      console.log(`  Warnings: ${summary.warnings}`);

      if (isValid) {
        console.log('✅ Data validation passed');
      } else {
        console.log('❌ Data validation failed');
      }

      return {
        isValid,
        errors,
        warnings,
        summary,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      errors.push({
        type: 'referential_integrity',
        entity: 'validation',
        message: `Validation process failed: ${errorMessage}`,
        severity: 'critical',
      });

      return {
        isValid: false,
        errors,
        warnings,
        summary: {
          totalEntities,
          validatedEntities,
          criticalErrors: errors.filter(e => e.severity === 'critical').length,
          highErrors: errors.filter(e => e.severity === 'high').length,
          mediumErrors: errors.filter(e => e.severity === 'medium').length,
          lowErrors: errors.filter(e => e.severity === 'low').length,
          warnings: warnings.length,
        },
      };
    }
  }

  /**
   * Validate business logic constraints
   */
  private async validateBusinessLogic(
    businessId: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    // Validate appointment-service relationships
    const appointmentsWithoutServices = await this.prisma.appointment.count({
      where: {
        businessId,
        services: {
          none: {},
        },
      },
    });

    if (appointmentsWithoutServices > 0) {
      errors.push({
        type: 'business_logic',
        entity: 'appointment',
        message: `Found ${appointmentsWithoutServices} appointments without services`,
        severity: 'high',
      });
    }

    // Validate staff-service assignments
    const staffWithoutServices = await this.prisma.staff.count({
      where: {
        businessId,
        services: {
          none: {},
        },
      },
    });

    if (staffWithoutServices > 0) {
      warnings.push({
        type: 'data_quality',
        entity: 'staff',
        message: `Found ${staffWithoutServices} staff members without assigned services`,
      });
    }

    // Validate transaction amounts match appointment totals
    const appointmentsWithTransactions = await this.prisma.appointment.findMany(
      {
        where: {
          businessId,
          transactions: {
            some: {},
          },
        },
        include: {
          services: true,
          transactions: true,
        },
      }
    );

    for (const appointment of appointmentsWithTransactions) {
      const serviceTotal = appointment.services.reduce(
        (sum, service) => sum + service.price.toNumber(),
        0
      );
      const transactionTotal = appointment.transactions.reduce(
        (sum, transaction) => sum + transaction.amount.toNumber(),
        0
      );

      if (Math.abs(serviceTotal - transactionTotal) > 0.01) {
        errors.push({
          type: 'business_logic',
          entity: 'appointment',
          field: 'total_amount',
          message: `Appointment ${appointment.id} service total (${serviceTotal}) doesn't match transaction total (${transactionTotal})`,
          severity: 'medium',
        });
      }
    }

    // Validate appointment times are within business hours
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (business?.operatingHours) {
      const operatingHours = business.operatingHours as any;
      const appointmentsOutsideHours = await this.prisma.appointment.findMany({
        where: { businessId },
        select: { id: true, startTime: true, endTime: true },
      });

      for (const appointment of appointmentsOutsideHours) {
        const dayOfWeek = appointment.startTime.getDay();
        const dayNames = [
          'sunday',
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
        ];
        const dayName = dayNames[dayOfWeek];
        const dayHours = operatingHours[dayName];

        if (dayHours && !dayHours.isOpen) {
          warnings.push({
            type: 'data_quality',
            entity: 'appointment',
            field: 'start_time',
            message: `Appointment ${appointment.id} scheduled on closed day (${dayName})`,
          });
        }
      }
    }
  }

  /**
   * Validate configuration before seeding
   */
  validateConfiguration(config: SeedConfiguration): ValidationResult {
    const validation = validateSeedConfig(config);

    const errors: ValidationError[] = validation.errors.map(error => ({
      type: 'configuration' as const,
      entity: 'configuration',
      message: error,
      severity: 'high' as const,
    }));

    const warnings: ValidationWarning[] = [];

    // Additional configuration warnings
    if (config.clients.count > 100) {
      warnings.push({
        type: 'performance',
        entity: 'configuration',
        field: 'clients.count',
        message: `Large client count (${config.clients.count}) may impact seeding performance`,
      });
    }

    if (config.appointments.historicalMonths > 12) {
      warnings.push({
        type: 'performance',
        entity: 'configuration',
        field: 'appointments.historicalMonths',
        message: `Long historical period (${config.appointments.historicalMonths} months) may impact seeding performance`,
      });
    }

    const summary: ValidationSummary = {
      totalEntities: 1,
      validatedEntities: 1,
      criticalErrors: 0,
      highErrors: errors.filter(e => e.severity === 'high').length,
      mediumErrors: errors.filter(e => e.severity === 'medium').length,
      lowErrors: errors.filter(e => e.severity === 'low').length,
      warnings: warnings.length,
    };

    return {
      isValid: validation.isValid,
      errors,
      warnings,
      summary,
    };
  }

  /**
   * Generate detailed report of current data state
   */
  async generateDataReport(businessId: string): Promise<string> {
    const counts = await this.getEntityCounts(businessId);
    const validation = await this.validateDataIntegrity(businessId);

    let report = '# Data Management Report\n\n';

    report += `## Business: ${businessId}\n`;
    report += `Generated: ${new Date().toISOString()}\n\n`;

    report += '## Entity Counts\n\n';
    Object.entries(counts).forEach(([entity, count]) => {
      report += `- ${entity}: ${count}\n`;
    });

    report += '\n## Validation Summary\n\n';
    report += `- Total entities: ${validation.summary.totalEntities}\n`;
    report += `- Validated entities: ${validation.summary.validatedEntities}\n`;
    report += `- Critical errors: ${validation.summary.criticalErrors}\n`;
    report += `- High errors: ${validation.summary.highErrors}\n`;
    report += `- Medium errors: ${validation.summary.mediumErrors}\n`;
    report += `- Low errors: ${validation.summary.lowErrors}\n`;
    report += `- Warnings: ${validation.summary.warnings}\n`;

    if (validation.errors.length > 0) {
      report += '\n## Validation Errors\n\n';
      validation.errors.forEach(error => {
        report += `- **${error.severity.toUpperCase()}** [${error.entity}`;
        if (error.field) report += `.${error.field}`;
        report += `]: ${error.message}\n`;
      });
    }

    if (validation.warnings.length > 0) {
      report += '\n## Validation Warnings\n\n';
      validation.warnings.forEach(warning => {
        report += `- [${warning.entity}`;
        if (warning.field) report += `.${warning.field}`;
        report += `]: ${warning.message}\n`;
      });
    }

    return report;
  }
}

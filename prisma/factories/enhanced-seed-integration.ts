/**
 * Enhanced Seed Integration
 * 
 * Integrates the data reset and management utilities with the existing seed system
 * to provide comprehensive data management capabilities.
 */

import { PrismaClient } from '@prisma/client';
import { DataResetManager, SeedScenario } from './data-reset-manager';
import { mergeConfigs } from './seed-config';

export interface EnhancedSeedOptions {
    scenario?: string;
    businessId: string;
    resetBeforeSeed?: boolean;
    validateAfterSeed?: boolean;
    preserveUsers?: boolean;
    preserveBusiness?: boolean;
    preserveBusinessUsers?: boolean;
    verbose?: boolean;
}

export interface SeedResult {
    success: boolean;
    duration: number;
    scenario: string;
    entitiesCreated: Record<string, number>;
    validationResult?: any;
    errors: string[];
    warnings: string[];
}

/**
 * Enhanced seed orchestrator that integrates with the management system
 */
export class EnhancedSeedOrchestrator {
    private prisma: PrismaClient;
    private resetManager: DataResetManager;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
        this.resetManager = new DataResetManager(prisma);
    }

    /**
     * Run enhanced seed with management integration
     */
    async runEnhancedSeed(options: EnhancedSeedOptions): Promise<SeedResult> {
        const startTime = Date.now();
        const errors: string[] = [];
        const warnings: string[] = [];
        const entitiesCreated: Record<string, number> = {};

        console.log('🌱 Starting enhanced seed process...');

        try {
            // 1. Load and validate scenario configuration
            const scenario = await this.loadScenarioConfig(options.scenario || 'demo');
            console.log(`📋 Using scenario: ${scenario.name} - ${scenario.description}`);

            // Validate configuration
            const configValidation = this.resetManager.validateConfiguration(scenario.config as any);
            if (!configValidation.isValid) {
                configValidation.errors.forEach(error => errors.push(error.message));
                throw new Error('Scenario configuration validation failed');
            }

            if (configValidation.warnings.length > 0) {
                configValidation.warnings.forEach(warning => warnings.push(warning.message));
            }

            // 2. Optional clean reset before seeding
            if (options.resetBeforeSeed) {
                console.log('🧹 Performing clean reset before seeding...');

                const resetResult = await this.resetManager.cleanReset(options.businessId, {
                    preserveUsers: options.preserveUsers,
                    preserveBusiness: options.preserveBusiness,
                    preserveBusinessUsers: options.preserveBusinessUsers,
                    verbose: options.verbose,
                });

                if (!resetResult.success) {
                    resetResult.errors.forEach(error => errors.push(error));
                    throw new Error('Clean reset failed');
                }

                resetResult.warnings.forEach(warning => warnings.push(warning));
                console.log('✅ Clean reset completed');
            }

            // 3. Validate business context
            const business = await this.prisma.business.findUnique({
                where: { id: options.businessId },
            });

            if (!business) {
                throw new Error(`Business with ID ${options.businessId} not found`);
            }

            // 4. Run the actual seeding process
            console.log('🚀 Starting data generation...');

            // This would integrate with the existing seed factories
            const seedResults = await this.executeSeedingProcess(options.businessId, scenario, options.verbose);

            Object.assign(entitiesCreated, seedResults.entitiesCreated);
            seedResults.warnings.forEach(warning => warnings.push(warning));

            // 5. Optional post-seed validation
            let validationResult;
            if (options.validateAfterSeed) {
                console.log('🔍 Performing post-seed validation...');

                validationResult = await this.resetManager.validateDataIntegrity(options.businessId);

                if (!validationResult.isValid) {
                    validationResult.errors.forEach((error: any) => {
                        if (error.severity === 'critical' || error.severity === 'high') {
                            errors.push(`${error.entity}: ${error.message}`);
                        } else {
                            warnings.push(`${error.entity}: ${error.message}`);
                        }
                    });
                }

                validationResult.warnings.forEach((warning: any) => {
                    warnings.push(`${warning.entity}: ${warning.message}`);
                });

                console.log(`✅ Validation completed: ${validationResult.isValid ? 'PASSED' : 'FAILED'}`);
            }

            const duration = Date.now() - startTime;
            console.log(`🎉 Enhanced seed completed successfully in ${duration}ms!`);

            return {
                success: true,
                duration,
                scenario: scenario.name,
                entitiesCreated,
                validationResult,
                errors,
                warnings,
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);
            errors.push(errorMessage);

            console.error('❌ Enhanced seed failed:', errorMessage);

            return {
                success: false,
                duration,
                scenario: options.scenario || 'demo',
                entitiesCreated,
                errors,
                warnings,
            };
        }
    }

    /**
     * Load scenario configuration
     */
    private async loadScenarioConfig(scenarioName: string): Promise<SeedScenario> {
        const scenario = this.resetManager.getScenario(scenarioName);

        if (!scenario) {
            const availableScenarios = this.resetManager.getPredefinedScenarios().map(s => s.name);
            throw new Error(`Scenario '${scenarioName}' not found. Available: ${availableScenarios.join(', ')}`);
        }

        return scenario;
    }

    /**
     * Execute the actual seeding process
     * This integrates with the existing factory system
     */
    private async executeSeedingProcess(
        businessId: string,
        scenario: SeedScenario,
        verbose: boolean = false
    ): Promise<{
        entitiesCreated: Record<string, number>;
        warnings: string[];
    }> {
        const entitiesCreated: Record<string, number> = {};
        const warnings: string[] = [];

        try {
            // Import the existing factories
            const { initializeSeedSystem } = await import('./index');

            // Initialize the seed system with the scenario configuration
            const seedSystem = await initializeSeedSystem(this.prisma, businessId);

            // Override the configuration with scenario-specific settings
            const config = mergeConfigs(seedSystem.config, scenario.config);

            if (verbose) {
                console.log('📊 Seed Configuration:');
                console.log(`  Clients: ${config.clients.count}`);
                console.log(`  Staff: ${config.staff.count}`);
                console.log(`  Historical months: ${config.appointments.historicalMonths}`);
                console.log(`  Service categories: ${config.services.categories.length}`);
            }

            // Generate staff data
            if (config.staff.count > 0) {
                console.log('👥 Generating staff profiles...');
                const { StaffFactory } = await import('./staff-factory');
                const staffFactory = new StaffFactory(this.prisma, businessId, config.staff.specialties);

                const staff = await staffFactory.generateBatch(config.staff.count);
                entitiesCreated.staff = staff.length;

                if (verbose) console.log(`  Generated ${staff.length} staff members`);
            }

            // Generate services
            console.log('🎨 Generating service menu...');
            const { ServiceFactory } = await import('./service-factory');
            const serviceFactory = new ServiceFactory(this.prisma, businessId);

            const services = await serviceFactory.generateAllServices({
                includeSeasonalServices: true,
                includePricingTiers: true,
                includePackages: true,
            });
            entitiesCreated.services = services.length;

            if (verbose) console.log(`  Generated ${services.length} services`);

            // Generate clients
            if (config.clients.count > 0) {
                console.log('🧑‍🤝‍🧑 Generating client profiles...');
                const { ClientFactory } = await import('./client-factory');
                const clientFactory = new ClientFactory(this.prisma, businessId, config.clients.demographics);

                await clientFactory.initialize();
                const clients = await clientFactory.generateClients(
                    config.clients.count,
                    { historicalMonths: config.appointments.historicalMonths }
                );
                entitiesCreated.clients = clients.length;

                if (verbose) console.log(`  Generated ${clients.length} clients`);
            }

            // Generate appointments
            console.log('📅 Generating appointment history...');
            const { AppointmentFactory } = await import('./appointment-factory');
            const appointmentFactory = new AppointmentFactory(
                this.prisma,
                businessId,
                config.appointments.patternsConfig
            );

            await appointmentFactory.initialize();

            const now = new Date();
            const startDate = new Date(now);
            startDate.setMonth(startDate.getMonth() - config.appointments.historicalMonths);

            const appointments = await appointmentFactory.generateHistoricalAppointments(
                startDate,
                now,
                500 // Target appointment count
            );
            entitiesCreated.appointments = appointments.length;

            if (verbose) console.log(`  Generated ${appointments.length} appointments`);

            // Generate transactions
            console.log('💰 Generating financial transactions...');
            const { TransactionFactory } = await import('./transaction-factory');
            const transactionFactory = new TransactionFactory(
                this.prisma,
                businessId,
                config.financial.paymentMethods,
                config.financial.transactionTypes
            );

            await transactionFactory.initialize();
            const transactions = await transactionFactory.generateComprehensiveTransactions(
                400, // Target transaction count
                { startDate, endDate: now }
            );
            entitiesCreated.transactions = transactions.length;

            if (verbose) console.log(`  Generated ${transactions.length} transactions`);

            // Generate business operations data
            console.log('🏪 Generating business operations data...');
            const { BusinessOperationsFactory } = await import('./business-operations-factory');
            const businessOpsFactory = new BusinessOperationsFactory(this.prisma, businessId);

            const businessOpsData = await businessOpsFactory.generateWithProgress({
                products: { generateProducts: true, generateSalesHistory: true, salesHistoryMonths: 6 },
                giftCards: { generateGiftCards: true, giftCardCount: 15 },
                promotions: { generatePromotions: true, includeSeasonalPromotions: true, includeLoyaltyPromotions: true },
                marketing: { generateCampaigns: true, includeEmailCampaigns: true, includeSMSCampaigns: true },
                loyalty: { generateLoyaltyProgram: true, generateMemberships: true },
            });

            entitiesCreated.products = businessOpsData.products.length;
            entitiesCreated.giftCards = businessOpsData.giftCards.length;
            entitiesCreated.promotions = businessOpsData.promotions.length;
            entitiesCreated.marketingCampaigns = businessOpsData.marketingCampaigns.length;

            if (verbose) {
                console.log(`  Generated ${businessOpsData.products.length} products`);
                console.log(`  Generated ${businessOpsData.giftCards.length} gift cards`);
                console.log(`  Generated ${businessOpsData.promotions.length} promotions`);
                console.log(`  Generated ${businessOpsData.marketingCampaigns.length} marketing campaigns`);
            }

            // Generate communication and loyalty systems
            console.log('💬 Generating communication systems...');
            const { ComprehensiveCommunicationFactory } = await import('./comprehensive-communication-factory');
            const commFactory = new ComprehensiveCommunicationFactory(this.prisma, businessId);

            const commSystem = await commFactory.generateCompleteSystem();
            entitiesCreated.reviews = commSystem.reviews.length;
            entitiesCreated.communications = commSystem.communications.length;
            entitiesCreated.loyaltyMemberships = commSystem.loyaltyMemberships.length;

            if (verbose) {
                console.log(`  Generated ${commSystem.reviews.length} client reviews`);
                console.log(`  Generated ${commSystem.communications.length} communications`);
                console.log(`  Generated ${commSystem.loyaltyMemberships.length} loyalty memberships`);
            }

            return {
                entitiesCreated,
                warnings,
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            warnings.push(`Seeding process warning: ${errorMessage}`);

            return {
                entitiesCreated,
                warnings,
            };
        }
    }

    /**
     * Generate summary report of seed results
     */
    generateSeedReport(result: SeedResult): string {
        let report = '# Enhanced Seed Report\n\n';

        report += `## Summary\n`;
        report += `- **Status**: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}\n`;
        report += `- **Scenario**: ${result.scenario}\n`;
        report += `- **Duration**: ${result.duration}ms\n`;
        report += `- **Timestamp**: ${new Date().toISOString()}\n\n`;

        if (Object.keys(result.entitiesCreated).length > 0) {
            report += `## Entities Created\n\n`;
            Object.entries(result.entitiesCreated).forEach(([entity, count]) => {
                report += `- **${entity}**: ${count}\n`;
            });
            report += '\n';
        }

        if (result.validationResult) {
            report += `## Validation Results\n\n`;
            report += `- **Valid**: ${result.validationResult.isValid ? '✅ Yes' : '❌ No'}\n`;
            report += `- **Total Entities**: ${result.validationResult.summary.totalEntities}\n`;
            report += `- **Critical Errors**: ${result.validationResult.summary.criticalErrors}\n`;
            report += `- **High Errors**: ${result.validationResult.summary.highErrors}\n`;
            report += `- **Warnings**: ${result.validationResult.summary.warnings}\n\n`;
        }

        if (result.errors.length > 0) {
            report += `## Errors\n\n`;
            result.errors.forEach(error => {
                report += `- ❌ ${error}\n`;
            });
            report += '\n';
        }

        if (result.warnings.length > 0) {
            report += `## Warnings\n\n`;
            result.warnings.forEach(warning => {
                report += `- ⚠️ ${warning}\n`;
            });
            report += '\n';
        }

        return report;
    }
}

/**
 * Convenience function for running enhanced seed
 */
export async function runEnhancedSeed(
    prisma: PrismaClient,
    options: EnhancedSeedOptions
): Promise<SeedResult> {
    const orchestrator = new EnhancedSeedOrchestrator(prisma);
    return await orchestrator.runEnhancedSeed(options);
}

/**
 * Convenience function for environment-specific seeding
 */
export async function seedForEnvironment(
    prisma: PrismaClient,
    businessId: string,
    environment: 'development' | 'testing' | 'demo' | 'performance' | 'minimal',
    options: Partial<EnhancedSeedOptions> = {}
): Promise<SeedResult> {
    return await runEnhancedSeed(prisma, {
        businessId,
        scenario: environment,
        resetBeforeSeed: true,
        validateAfterSeed: true,
        preserveUsers: true,
        preserveBusiness: true,
        preserveBusinessUsers: true,
        verbose: false,
        ...options,
    });
}
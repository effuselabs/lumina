/**
 * Data Migration Service for Calendar Infrastructure
 *
 * Migrates existing JSON-based operatingHours and workingHours data
 * to structured database tables with validation and rollback capabilities.
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { z } from 'zod';

// Validation schemas for existing JSON data
const OperatingHoursSchema = z.record(
  z.enum([
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ]),
  z.object({
    isOpen: z.boolean(),
    openTime: z.string().regex(/^\d{2}:\d{2}$/),
    closeTime: z.string().regex(/^\d{2}:\d{2}$/),
  })
);

const WorkingHoursSchema = z.record(
  z.enum([
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ]),
  z.object({
    isAvailable: z.boolean(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
  })
);

interface MigrationResult {
  success: boolean;
  businessesMigrated: number;
  staffMigrated: number;
  errors: Array<{
    type: 'business' | 'staff';
    id: string;
    error: string;
  }>;
  rollbackData?: {
    businessHours: Array<{ id: string; businessId: string; dayOfWeek: number }>;
    staffAvailability: Array<{
      id: string;
      staffId: string;
      dayOfWeek: number;
    }>;
  };
}

interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    type: 'business' | 'staff';
    id: string;
    field: string;
    message: string;
  }>;
}

export class DataMigrationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Migrate all existing JSON data to structured tables
   */
  async migrateAllData(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      businessesMigrated: 0,
      staffMigrated: 0,
      errors: [],
      rollbackData: {
        businessHours: [],
        staffAvailability: [],
      },
    };

    try {
      // Start transaction for atomic migration
      await this.prisma.$transaction(async tx => {
        // Migrate business operating hours
        const businessResult = await this.migrateBusinessHours(tx);
        result.businessesMigrated = businessResult.migrated;
        result.errors.push(...businessResult.errors);
        result.rollbackData!.businessHours = businessResult.rollbackData;

        // Migrate staff working hours
        const staffResult = await this.migrateStaffAvailability(tx);
        result.staffMigrated = staffResult.migrated;
        result.errors.push(...staffResult.errors);
        result.rollbackData!.staffAvailability = staffResult.rollbackData;

        // If there are critical errors, rollback
        if (result.errors.length > 0) {
          const criticalErrors = result.errors.filter(
            e =>
              e.error.includes('validation failed') ||
              e.error.includes('constraint violation')
          );

          if (criticalErrors.length > 0) {
            throw new Error(
              `Migration failed with ${criticalErrors.length} critical errors`
            );
          }
        }
      });

      result.success = result.errors.length === 0;
      return result;
    } catch (error) {
      result.success = false;
      result.errors.push({
        type: 'business',
        id: 'migration',
        error: `Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      return result;
    }
  }

  /**
   * Migrate business operating hours from JSON to structured table
   */
  private async migrateBusinessHours(tx: any): Promise<{
    migrated: number;
    errors: Array<{ type: 'business'; id: string; error: string }>;
    rollbackData: Array<{ id: string; businessId: string; dayOfWeek: number }>;
  }> {
    const result = {
      migrated: 0,
      errors: [] as Array<{ type: 'business'; id: string; error: string }>,
      rollbackData: [] as Array<{
        id: string;
        businessId: string;
        dayOfWeek: number;
      }>,
    };

    // Get all businesses with operatingHours JSON data
    const businesses = await tx.business.findMany({
      where: {
        operatingHours: {
          not: Prisma.JsonNull,
        },
      },
      select: {
        id: true,
        operatingHours: true,
      },
    });

    for (const business of businesses) {
      try {
        // Validate JSON structure
        const operatingHours = OperatingHoursSchema.parse(
          business.operatingHours
        );

        // Convert day names to numbers (0 = Sunday, 1 = Monday, etc.)
        const dayMapping = {
          sunday: 0,
          monday: 1,
          tuesday: 2,
          wednesday: 3,
          thursday: 4,
          friday: 5,
          saturday: 6,
        };

        // Create business hours records
        for (const [dayName, hours] of Object.entries(operatingHours)) {
          const dayOfWeek = dayMapping[dayName as keyof typeof dayMapping];

          const businessHour = await tx.businessHours.create({
            data: {
              businessId: business.id,
              dayOfWeek,
              openTime: hours.isOpen ? hours.openTime : null,
              closeTime: hours.isOpen ? hours.closeTime : null,
              isClosed: !hours.isOpen,
            },
          });

          result.rollbackData.push({
            id: businessHour.id,
            businessId: business.id,
            dayOfWeek,
          });
        }

        result.migrated++;
      } catch (error) {
        result.errors.push({
          type: 'business',
          id: business.id,
          error: `Failed to migrate business hours: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }

    return result;
  }

  /**
   * Migrate staff working hours from JSON to structured table
   */
  private async migrateStaffAvailability(tx: any): Promise<{
    migrated: number;
    errors: Array<{ type: 'staff'; id: string; error: string }>;
    rollbackData: Array<{ id: string; staffId: string; dayOfWeek: number }>;
  }> {
    const result = {
      migrated: 0,
      errors: [] as Array<{ type: 'staff'; id: string; error: string }>,
      rollbackData: [] as Array<{
        id: string;
        staffId: string;
        dayOfWeek: number;
      }>,
    };

    // Get all staff with workingHours JSON data
    const staffMembers = await tx.staff.findMany({
      where: {
        workingHours: {
          not: Prisma.JsonNull,
        },
      },
      select: {
        id: true,
        businessId: true,
        workingHours: true,
      },
    });

    for (const staff of staffMembers) {
      try {
        // Validate JSON structure
        const workingHours = WorkingHoursSchema.parse(staff.workingHours);

        // Convert day names to numbers (0 = Sunday, 1 = Monday, etc.)
        const dayMapping = {
          sunday: 0,
          monday: 1,
          tuesday: 2,
          wednesday: 3,
          thursday: 4,
          friday: 5,
          saturday: 6,
        };

        // Create staff availability records
        for (const [dayName, hours] of Object.entries(workingHours)) {
          if (hours.isAvailable) {
            const dayOfWeek = dayMapping[dayName as keyof typeof dayMapping];

            const availability = await tx.staffAvailability.create({
              data: {
                staffId: staff.id,
                businessId: staff.businessId,
                dayOfWeek,
                startTime: hours.startTime,
                endTime: hours.endTime,
                isRecurring: true,
              },
            });

            result.rollbackData.push({
              id: availability.id,
              staffId: staff.id,
              dayOfWeek,
            });
          }
        }

        result.migrated++;
      } catch (error) {
        result.errors.push({
          type: 'staff',
          id: staff.id,
          error: `Failed to migrate staff availability: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }

    return result;
  }

  /**
   * Validate data integrity after migration
   */
  async validateMigrationIntegrity(): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
    };

    try {
      // Validate business hours integrity
      const businessValidation = await this.validateBusinessHoursIntegrity();
      result.errors.push(...businessValidation.errors);

      // Validate staff availability integrity
      const staffValidation = await this.validateStaffAvailabilityIntegrity();
      result.errors.push(...staffValidation.errors);

      result.isValid = result.errors.length === 0;
      return result;
    } catch (error) {
      result.isValid = false;
      result.errors.push({
        type: 'business',
        id: 'validation',
        field: 'integrity',
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      return result;
    }
  }

  /**
   * Validate business hours data integrity
   */
  private async validateBusinessHoursIntegrity(): Promise<{
    errors: Array<{
      type: 'business';
      id: string;
      field: string;
      message: string;
    }>;
  }> {
    const errors: Array<{
      type: 'business';
      id: string;
      field: string;
      message: string;
    }> = [];

    // Check for businesses with JSON data but no structured data
    const businessesWithoutStructuredData = await this.prisma.business.findMany(
      {
        where: {
          operatingHours: { not: Prisma.JsonNull },
          businessHours: { none: {} },
        },
        select: { id: true },
      }
    );

    for (const business of businessesWithoutStructuredData) {
      errors.push({
        type: 'business',
        id: business.id,
        field: 'businessHours',
        message:
          'Business has JSON operating hours but no structured business hours data',
      });
    }

    // Check for invalid time formats
    const allBusinessHours = await this.prisma.businessHours.findMany({
      select: { id: true, businessId: true, openTime: true, closeTime: true },
    });

    const timeFormatRegex = /^\d{2}:\d{2}$/;
    const invalidTimeFormats = allBusinessHours.filter(
      bh =>
        (bh.openTime && !timeFormatRegex.test(bh.openTime)) ||
        (bh.closeTime && !timeFormatRegex.test(bh.closeTime))
    );

    for (const businessHour of invalidTimeFormats) {
      errors.push({
        type: 'business',
        id: businessHour.businessId,
        field: 'timeFormat',
        message: `Invalid time format: openTime=${businessHour.openTime}, closeTime=${businessHour.closeTime}`,
      });
    }

    // Check for logical inconsistencies (open time after close time)
    const logicalInconsistencies = await this.prisma.businessHours.findMany({
      where: {
        AND: [
          { openTime: { not: null } },
          { closeTime: { not: null } },
          { isClosed: false },
        ],
      },
      select: { id: true, businessId: true, openTime: true, closeTime: true },
    });

    for (const businessHour of logicalInconsistencies) {
      if (
        businessHour.openTime &&
        businessHour.closeTime &&
        businessHour.openTime >= businessHour.closeTime
      ) {
        errors.push({
          type: 'business',
          id: businessHour.businessId,
          field: 'timeLogic',
          message: `Open time (${businessHour.openTime}) is not before close time (${businessHour.closeTime})`,
        });
      }
    }

    return { errors };
  }

  /**
   * Validate staff availability data integrity
   */
  private async validateStaffAvailabilityIntegrity(): Promise<{
    errors: Array<{
      type: 'staff';
      id: string;
      field: string;
      message: string;
    }>;
  }> {
    const errors: Array<{
      type: 'staff';
      id: string;
      field: string;
      message: string;
    }> = [];

    // Check for staff with JSON data but no structured data
    const staffWithoutStructuredData = await this.prisma.staff.findMany({
      where: {
        workingHours: { not: Prisma.JsonNull },
        staffAvailability: { none: {} },
      },
      select: { id: true },
    });

    for (const staff of staffWithoutStructuredData) {
      errors.push({
        type: 'staff',
        id: staff.id,
        field: 'staffAvailability',
        message:
          'Staff has JSON working hours but no structured availability data',
      });
    }

    // Check for invalid time formats
    const allStaffAvailability = await this.prisma.staffAvailability.findMany({
      select: { id: true, staffId: true, startTime: true, endTime: true },
    });

    const timeFormatRegex = /^\d{2}:\d{2}$/;
    const invalidTimeFormats = allStaffAvailability.filter(
      sa =>
        !timeFormatRegex.test(sa.startTime) || !timeFormatRegex.test(sa.endTime)
    );

    for (const availability of invalidTimeFormats) {
      errors.push({
        type: 'staff',
        id: availability.staffId,
        field: 'timeFormat',
        message: `Invalid time format: startTime=${availability.startTime}, endTime=${availability.endTime}`,
      });
    }

    // Check for logical inconsistencies (start time after end time)
    const logicalInconsistencies = await this.prisma.staffAvailability.findMany(
      {
        select: { id: true, staffId: true, startTime: true, endTime: true },
      }
    );

    for (const availability of logicalInconsistencies) {
      if (availability.startTime >= availability.endTime) {
        errors.push({
          type: 'staff',
          id: availability.staffId,
          field: 'timeLogic',
          message: `Start time (${availability.startTime}) is not before end time (${availability.endTime})`,
        });
      }
    }

    return { errors };
  }

  /**
   * Rollback migration by removing structured data
   */
  async rollbackMigration(
    rollbackData: MigrationResult['rollbackData']
  ): Promise<{
    success: boolean;
    businessHoursRemoved: number;
    staffAvailabilityRemoved: number;
    errors: string[];
  }> {
    const result = {
      success: true,
      businessHoursRemoved: 0,
      staffAvailabilityRemoved: 0,
      errors: [] as string[],
    };

    if (!rollbackData) {
      result.errors.push('No rollback data provided');
      result.success = false;
      return result;
    }

    try {
      await this.prisma.$transaction(async tx => {
        // Remove business hours
        if (rollbackData.businessHours.length > 0) {
          const businessHourIds = rollbackData.businessHours.map(bh => bh.id);
          const deleteResult = await tx.businessHours.deleteMany({
            where: { id: { in: businessHourIds } },
          });
          result.businessHoursRemoved = deleteResult.count;
        }

        // Remove staff availability
        if (rollbackData.staffAvailability.length > 0) {
          const staffAvailabilityIds = rollbackData.staffAvailability.map(
            sa => sa.id
          );
          const deleteResult = await tx.staffAvailability.deleteMany({
            where: { id: { in: staffAvailabilityIds } },
          });
          result.staffAvailabilityRemoved = deleteResult.count;
        }
      });

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(
        `Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return result;
    }
  }

  /**
   * Get migration status for all businesses and staff
   */
  async getMigrationStatus(): Promise<{
    businesses: {
      total: number;
      withJsonData: number;
      withStructuredData: number;
      migrated: number;
      needsMigration: number;
    };
    staff: {
      total: number;
      withJsonData: number;
      withStructuredData: number;
      migrated: number;
      needsMigration: number;
    };
  }> {
    const [
      totalBusinesses,
      businessesWithJson,
      businessesWithStructured,
      totalStaff,
      staffWithJson,
      staffWithStructured,
    ] = await Promise.all([
      this.prisma.business.count(),
      this.prisma.business.count({
        where: { operatingHours: { not: Prisma.JsonNull } },
      }),
      this.prisma.business.count({ where: { businessHours: { some: {} } } }),
      this.prisma.staff.count(),
      this.prisma.staff.count({
        where: { workingHours: { not: Prisma.JsonNull } },
      }),
      this.prisma.staff.count({ where: { staffAvailability: { some: {} } } }),
    ]);

    return {
      businesses: {
        total: totalBusinesses,
        withJsonData: businessesWithJson,
        withStructuredData: businessesWithStructured,
        migrated: businessesWithStructured,
        needsMigration: businessesWithJson - businessesWithStructured,
      },
      staff: {
        total: totalStaff,
        withJsonData: staffWithJson,
        withStructuredData: staffWithStructured,
        migrated: staffWithStructured,
        needsMigration: staffWithJson - staffWithStructured,
      },
    };
  }
}

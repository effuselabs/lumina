/**
 * Enhanced Business Hours Repository with Backward Compatibility
 *
 * This is an example of how to integrate the backward compatibility service
 * into existing repository classes to provide seamless fallback behavior.
 */

import { PrismaClient } from '@prisma/client';
import { BackwardCompatibilityService } from '../services/backward-compatibility';

interface BusinessHour {
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
}

interface BusinessHoursQuery {
  businessId: string;
  date?: Date;
}

export class EnhancedBusinessHoursRepository {
  private backwardCompatService: BackwardCompatibilityService;

  constructor(private prisma: PrismaClient) {
    this.backwardCompatService = new BackwardCompatibilityService(prisma);
  }

  /**
   * Get business hours with automatic fallback to JSON data
   */
  async getBusinessHours(query: BusinessHoursQuery): Promise<BusinessHour[]> {
    const result = await this.backwardCompatService.getBusinessHours(
      query.businessId
    );

    // Log deprecation warning if using JSON fallback
    if (result.source === 'json' && result.deprecationWarning) {
      this.backwardCompatService.logDeprecationWarning(
        'business',
        query.businessId,
        'operatingHours'
      );
    }

    return result.hours;
  }

  /**
   * Check if business is open at a specific time with fallback support
   */
  async isBusinessOpen(businessId: string, dateTime: Date): Promise<boolean> {
    const dayOfWeek = dateTime.getDay();
    const timeString = dateTime.toTimeString().substring(0, 5); // HH:MM format

    const businessHours = await this.getBusinessHours({ businessId });
    const dayHours = businessHours.find(h => h.dayOfWeek === dayOfWeek);

    if (
      !dayHours ||
      dayHours.isClosed ||
      !dayHours.openTime ||
      !dayHours.closeTime
    ) {
      return false;
    }

    return timeString >= dayHours.openTime && timeString <= dayHours.closeTime;
  }

  /**
   * Set business hours (creates structured data)
   */
  async setBusinessHours(
    businessId: string,
    hours: BusinessHour[]
  ): Promise<void> {
    await this.prisma.$transaction(async tx => {
      // Remove existing structured hours
      await tx.businessHours.deleteMany({
        where: { businessId },
      });

      // Create new structured hours
      for (const hour of hours) {
        await tx.businessHours.create({
          data: {
            businessId,
            dayOfWeek: hour.dayOfWeek,
            openTime: hour.openTime,
            closeTime: hour.closeTime,
            isClosed: hour.isClosed,
          },
        });
      }
    });
  }

  /**
   * Get business hours for a specific day with fallback support
   */
  async getBusinessHoursForDay(
    businessId: string,
    dayOfWeek: number
  ): Promise<BusinessHour | null> {
    const businessHours = await this.getBusinessHours({ businessId });
    return businessHours.find(h => h.dayOfWeek === dayOfWeek) || null;
  }

  /**
   * Check if business needs migration from JSON to structured format
   */
  async needsMigration(businessId: string): Promise<boolean> {
    const status =
      await this.backwardCompatService.hasBusinessHours(businessId);
    return status.needsMigration;
  }

  /**
   * Migrate business from JSON to structured format
   */
  async migrateBusiness(businessId: string): Promise<{
    success: boolean;
    error?: string;
    migratedHours: number;
  }> {
    return await this.backwardCompatService.forceMigrateBusiness(businessId);
  }

  /**
   * Validate business hours format and consistency
   */
  async validateBusinessHours(businessId: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const result = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[],
    };

    try {
      const businessHours = await this.getBusinessHours({ businessId });

      // Check if all days are present
      if (businessHours.length !== 7) {
        result.errors.push(`Expected 7 days, found ${businessHours.length}`);
        result.isValid = false;
      }

      // Check for logical inconsistencies
      for (const hour of businessHours) {
        if (!hour.isClosed && hour.openTime && hour.closeTime) {
          if (hour.openTime >= hour.closeTime) {
            result.errors.push(
              `Day ${hour.dayOfWeek}: Open time (${hour.openTime}) is not before close time (${hour.closeTime})`
            );
            result.isValid = false;
          }
        }

        if (hour.isClosed && (hour.openTime || hour.closeTime)) {
          result.warnings.push(
            `Day ${hour.dayOfWeek}: Marked as closed but has open/close times`
          );
        }
      }

      // Check if using deprecated JSON format
      const status =
        await this.backwardCompatService.hasBusinessHours(businessId);
      if (status.needsMigration) {
        result.warnings.push(
          'Business is using deprecated JSON format. Migration recommended.'
        );
      }
    } catch (error) {
      result.errors.push(
        `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      result.isValid = false;
    }

    return result;
  }

  /**
   * Get business hours with source information for debugging
   */
  async getBusinessHoursWithSource(businessId: string): Promise<{
    hours: BusinessHour[];
    source: 'structured' | 'json' | 'default';
    migrationNeeded: boolean;
    deprecationWarning?: string;
  }> {
    return await this.backwardCompatService.getBusinessHours(businessId);
  }
}

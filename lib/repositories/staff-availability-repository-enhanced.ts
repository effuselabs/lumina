/**
 * Enhanced Staff Availability Repository with Backward Compatibility
 *
 * This is an example of how to integrate the backward compatibility service
 * into existing repository classes to provide seamless fallback behavior.
 */

import { PrismaClient } from '@prisma/client';
import { BackwardCompatibilityService } from '../services/backward-compatibility';

interface StaffAvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
}

interface StaffAvailabilityQuery {
  staffId: string;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

export class EnhancedStaffAvailabilityRepository {
  private backwardCompatService: BackwardCompatibilityService;

  constructor(private prisma: PrismaClient) {
    this.backwardCompatService = new BackwardCompatibilityService(prisma);
  }

  /**
   * Get staff availability with automatic fallback to JSON data
   */
  async getStaffAvailability(
    query: StaffAvailabilityQuery
  ): Promise<StaffAvailabilitySlot[]> {
    const result = await this.backwardCompatService.getStaffAvailability(
      query.staffId
    );

    // Log deprecation warning if using JSON fallback
    if (result.source === 'json' && result.deprecationWarning) {
      this.backwardCompatService.logDeprecationWarning(
        'staff',
        query.staffId,
        'workingHours'
      );
    }

    return result.availability;
  }

  /**
   * Check if staff is available at a specific time with fallback support
   */
  async isStaffAvailable(staffId: string, dateTime: Date): Promise<boolean> {
    const dayOfWeek = dateTime.getDay();
    const timeString = dateTime.toTimeString().substring(0, 5); // HH:MM format

    // Get recurring availability
    const availability = await this.getStaffAvailability({ staffId });
    const dayAvailability = availability.filter(a => a.dayOfWeek === dayOfWeek);

    if (dayAvailability.length === 0) {
      return false;
    }

    // Check if time falls within any availability slot
    return dayAvailability.some(
      slot => timeString >= slot.startTime && timeString <= slot.endTime
    );
  }

  /**
   * Set staff availability (creates structured data)
   */
  async setStaffAvailability(
    staffId: string,
    businessId: string,
    availability: StaffAvailabilitySlot[]
  ): Promise<void> {
    await this.prisma.$transaction(async tx => {
      // Remove existing structured availability
      await tx.staffAvailability.deleteMany({
        where: { staffId },
      });

      // Create new structured availability
      for (const slot of availability) {
        await tx.staffAvailability.create({
          data: {
            staffId,
            businessId,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isRecurring: slot.isRecurring,
          },
        });
      }
    });
  }

  /**
   * Get staff availability for a specific day with fallback support
   */
  async getStaffAvailabilityForDay(
    staffId: string,
    dayOfWeek: number
  ): Promise<StaffAvailabilitySlot[]> {
    const availability = await this.getStaffAvailability({ staffId });
    return availability.filter(a => a.dayOfWeek === dayOfWeek);
  }

  /**
   * Get available staff for a specific time slot with fallback support
   */
  async getAvailableStaff(
    businessId: string,
    dateTime: Date,
    serviceDuration: number
  ): Promise<string[]> {
    const dayOfWeek = dateTime.getDay();
    const startTime = dateTime.toTimeString().substring(0, 5);

    // Calculate end time
    const endDateTime = new Date(dateTime.getTime() + serviceDuration * 60000);
    const endTime = endDateTime.toTimeString().substring(0, 5);

    // Get all staff for the business
    const staff = await this.prisma.staff.findMany({
      where: { businessId, isActive: true },
      select: { id: true },
    });

    const availableStaff: string[] = [];

    for (const staffMember of staff) {
      const availability = await this.getStaffAvailability({
        staffId: staffMember.id,
      });
      const dayAvailability = availability.filter(
        a => a.dayOfWeek === dayOfWeek
      );

      // Check if any slot can accommodate the service duration
      const canAccommodate = dayAvailability.some(
        slot => startTime >= slot.startTime && endTime <= slot.endTime
      );

      if (canAccommodate) {
        availableStaff.push(staffMember.id);
      }
    }

    return availableStaff;
  }

  /**
   * Check if staff needs migration from JSON to structured format
   */
  async needsMigration(staffId: string): Promise<boolean> {
    const status =
      await this.backwardCompatService.hasStaffAvailability(staffId);
    return status.needsMigration;
  }

  /**
   * Migrate staff from JSON to structured format
   */
  async migrateStaff(staffId: string): Promise<{
    success: boolean;
    error?: string;
    migratedSlots: number;
  }> {
    return await this.backwardCompatService.forceMigrateStaff(staffId);
  }

  /**
   * Add availability override for a specific date
   */
  async addAvailabilityOverride(
    staffId: string,
    businessId: string,
    date: Date,
    startTime: string | null,
    endTime: string | null,
    isAvailable: boolean,
    reason?: string
  ): Promise<void> {
    await this.prisma.staffAvailabilityOverride.upsert({
      where: {
        staffId_date: {
          staffId,
          date,
        },
      },
      update: {
        startTime,
        endTime,
        isAvailable,
        reason,
      },
      create: {
        staffId,
        businessId,
        date,
        startTime,
        endTime,
        isAvailable,
        reason,
      },
    });
  }

  /**
   * Get effective availability for a specific date (considering overrides)
   */
  async getEffectiveAvailability(
    staffId: string,
    date: Date
  ): Promise<StaffAvailabilitySlot[]> {
    const dayOfWeek = date.getDay();

    // Check for override first
    const override = await this.prisma.staffAvailabilityOverride.findUnique({
      where: {
        staffId_date: {
          staffId,
          date,
        },
      },
    });

    if (override) {
      if (!override.isAvailable) {
        return []; // Staff is not available on this date
      }

      if (override.startTime && override.endTime) {
        return [
          {
            dayOfWeek,
            startTime: override.startTime,
            endTime: override.endTime,
            isRecurring: false,
          },
        ];
      }
    }

    // Use regular availability
    return await this.getStaffAvailabilityForDay(staffId, dayOfWeek);
  }

  /**
   * Validate staff availability format and consistency
   */
  async validateStaffAvailability(staffId: string): Promise<{
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
      const availability = await this.getStaffAvailability({ staffId });

      // Check for logical inconsistencies
      for (const slot of availability) {
        if (slot.startTime >= slot.endTime) {
          result.errors.push(
            `Day ${slot.dayOfWeek}: Start time (${slot.startTime}) is not before end time (${slot.endTime})`
          );
          result.isValid = false;
        }
      }

      // Check for overlapping slots on the same day
      const dayGroups = availability.reduce(
        (groups, slot) => {
          if (!groups[slot.dayOfWeek]) {
            groups[slot.dayOfWeek] = [];
          }
          groups[slot.dayOfWeek].push(slot);
          return groups;
        },
        {} as Record<number, StaffAvailabilitySlot[]>
      );

      for (const [day, slots] of Object.entries(dayGroups)) {
        if (slots.length > 1) {
          // Sort slots by start time
          slots.sort((a, b) => a.startTime.localeCompare(b.startTime));

          for (let i = 0; i < slots.length - 1; i++) {
            if (slots[i].endTime > slots[i + 1].startTime) {
              result.errors.push(`Day ${day}: Overlapping availability slots`);
              result.isValid = false;
            }
          }
        }
      }

      // Check if using deprecated JSON format
      const status =
        await this.backwardCompatService.hasStaffAvailability(staffId);
      if (status.needsMigration) {
        result.warnings.push(
          'Staff is using deprecated JSON format. Migration recommended.'
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
   * Get staff availability with source information for debugging
   */
  async getStaffAvailabilityWithSource(staffId: string): Promise<{
    availability: StaffAvailabilitySlot[];
    source: 'structured' | 'json' | 'default';
    migrationNeeded: boolean;
    deprecationWarning?: string;
  }> {
    return await this.backwardCompatService.getStaffAvailability(staffId);
  }
}

/**
 * Real-time Availability Service for Public Booking Interface
 *
 * Integrates with Calendar Infrastructure (LUM-96) to provide real-time availability
 * checking with conflict detection and caching for the public booking interface.
 *
 * Requirements: 1.3, 6.1, 6.2, 6.3, 6.5, 10.1
 *
 * @version 1.0.0
 * @author Lumina Development Team
 */

import { prisma } from '@/lib/prisma';
import {
  AvailabilityCalculator,
  AvailabilityQuery,
} from './availability-calculator';
import { CalendarIntegration } from './calendar-integration';

// Public booking specific types
export interface PublicAvailabilityRequest {
  businessId: string;
  serviceIds: string[];
  date: Date;
  staffId?: string;
  duration?: number;
}

export interface PublicTimeSlot {
  startTime: Date;
  endTime: Date;
  staffId: string;
  staffName: string;
  isAvailable: boolean;
  totalDuration: number;
  totalPrice: number;
  services: Array<{
    id: string;
    name: string;
    duration: number;
    price: number;
  }>;
  metadata?: {
    cacheHit?: boolean;
    validationTime?: number;
    conflictChecked?: boolean;
  };
}

export interface PublicAvailabilityResult {
  slots: PublicTimeSlot[];
  nextAvailableDate?: string;
  metadata: {
    totalSlots: number;
    availableSlots: number;
    calculationTime: number;
    cacheHitRate: number;
    realTimeValidation: boolean;
    servicesValidated: string[];
  };
}

export interface SlotValidationRequest {
  businessId: string;
  staffId: string;
  startTime: Date;
  endTime: Date;
  serviceIds: string[];
}

export interface SlotValidationResult {
  isAvailable: boolean;
  conflicts: string[];
  warnings: string[];
  validationTime: number;
}

/**
 * Real-time Availability Service
 *
 * Provides real-time availability checking for public booking interface
 * with integration to Calendar Infrastructure (LUM-96)
 */
export class RealTimeAvailabilityService {
  private static readonly SLOT_INTERVAL_MINUTES = 15;
  private static readonly MAX_SLOTS_PER_DAY = 50;
  private static readonly CACHE_TTL_SECONDS = 300; // 5 minutes
  private static readonly VALIDATION_TIMEOUT_MS = 5000; // 5 seconds

  /**
   * Get available time slots for public booking
   * Requirements: 1.3, 6.1, 6.2, 6.3, 10.1
   */
  static async getAvailableSlots(
    request: PublicAvailabilityRequest
  ): Promise<PublicAvailabilityResult> {
    const startTime = Date.now();
    let cacheHits = 0;
    let totalQueries = 0;

    try {
      // Validate business and services
      await this.validateBusinessAndServices(
        request.businessId,
        request.serviceIds
      );

      // Get service details for duration and pricing
      const services = await this.getServiceDetails(
        request.businessId,
        request.serviceIds
      );
      const totalDuration =
        request.duration ||
        services.reduce((sum, service) => sum + service.duration, 0);
      const totalPrice = services.reduce(
        (sum, service) => sum + Number(service.price),
        0
      );

      // Get qualified staff for the services
      const qualifiedStaff = await this.getQualifiedStaff(
        request.businessId,
        request.serviceIds,
        request.staffId
      );

      if (qualifiedStaff.length === 0) {
        return {
          slots: [],
          metadata: {
            totalSlots: 0,
            availableSlots: 0,
            calculationTime: Date.now() - startTime,
            cacheHitRate: 0,
            realTimeValidation: true,
            servicesValidated: request.serviceIds,
          },
        };
      }

      // Calculate availability for each qualified staff member
      const allSlots: PublicTimeSlot[] = [];

      for (const staff of qualifiedStaff) {
        totalQueries++;

        try {
          // Use Calendar Infrastructure for availability calculation
          const availabilityQuery: AvailabilityQuery = {
            businessId: request.businessId,
            staffId: staff.id,
            date: request.date,
            duration: totalDuration,
            serviceId: request.serviceIds[0], // Use first service for calculation
          };

          const availabilityResult =
            await AvailabilityCalculator.calculateAvailability(
              availabilityQuery
            );

          if (availabilityResult.metadata.cacheHit) {
            cacheHits++;
          }

          // Convert and validate each slot with real-time conflict detection
          for (const slot of availabilityResult.slots) {
            if (!slot.isAvailable) continue;

            // Perform real-time validation
            const validationResult = await this.validateSlotRealTime({
              businessId: request.businessId,
              staffId: staff.id,
              startTime: slot.startTime,
              endTime: slot.endTime,
              serviceIds: request.serviceIds,
            });

            if (validationResult.isAvailable) {
              allSlots.push({
                startTime: slot.startTime,
                endTime: slot.endTime,
                staffId: staff.id,
                staffName: staff.displayName,
                isAvailable: true,
                totalDuration,
                totalPrice,
                services: services.map(service => ({
                  id: service.id,
                  name: service.name,
                  duration: service.duration,
                  price: Number(service.price),
                })),
                metadata: {
                  cacheHit: availabilityResult.metadata.cacheHit,
                  validationTime: validationResult.validationTime,
                  conflictChecked: true,
                },
              });
            }
          }
        } catch (error) {
          console.error(
            `Error calculating availability for staff ${staff.id}:`,
            error
          );
          // Continue with other staff members
        }
      }

      // Sort slots by start time
      allSlots.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

      // Limit slots and find next available date if needed
      const limitedSlots = allSlots.slice(0, this.MAX_SLOTS_PER_DAY);
      const nextAvailableDate =
        limitedSlots.length === 0
          ? await this.findNextAvailableDate(request)
          : undefined;

      const cacheHitRate =
        totalQueries > 0 ? (cacheHits / totalQueries) * 100 : 0;

      return {
        slots: limitedSlots,
        nextAvailableDate,
        metadata: {
          totalSlots: allSlots.length,
          availableSlots: limitedSlots.length,
          calculationTime: Date.now() - startTime,
          cacheHitRate: Math.round(cacheHitRate * 100) / 100,
          realTimeValidation: true,
          servicesValidated: request.serviceIds,
        },
      };
    } catch (error) {
      console.error('Error in real-time availability service:', error);
      throw new Error(
        `Availability calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validate a specific time slot in real-time
   * Requirements: 6.1, 6.2, 6.3
   */
  static async validateSlotRealTime(
    request: SlotValidationRequest
  ): Promise<SlotValidationResult> {
    const startTime = Date.now();

    try {
      // Use Calendar Integration for comprehensive validation
      const availabilityCheck = await CalendarIntegration.checkAvailability({
        businessId: request.businessId,
        staffId: request.staffId,
        startTime: request.startTime,
        endTime: request.endTime,
        serviceIds: request.serviceIds,
      });

      const conflicts = availabilityCheck.conflicts.map(c => c.message);
      const warnings = availabilityCheck.warnings.map(w => w.message);

      return {
        isAvailable: availabilityCheck.isAvailable,
        conflicts,
        warnings,
        validationTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error('Error in real-time slot validation:', error);
      return {
        isAvailable: false,
        conflicts: [
          `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
        warnings: [],
        validationTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Invalidate availability cache for real-time updates
   * Requirements: 6.5
   */
  static async invalidateAvailabilityCache(
    businessId: string,
    staffId?: string,
    dateRange?: { startDate: Date; endDate: Date }
  ): Promise<void> {
    try {
      await CalendarIntegration.invalidateAvailabilityCache({
        businessId,
        staffId,
        dateRange,
        type: staffId ? 'staff_availability' : 'business_hours',
      });
    } catch (error) {
      console.error('Error invalidating availability cache:', error);
      // Don't throw - cache invalidation failures shouldn't break the application
    }
  }

  /**
   * Warm availability cache for upcoming dates
   * Requirements: 6.5, 10.1
   */
  static async warmAvailabilityCache(
    businessId: string,
    staffIds: string[],
    dateRange: { startDate: Date; endDate: Date }
  ): Promise<void> {
    try {
      await CalendarIntegration.warmAvailabilityCache(
        businessId,
        staffIds,
        dateRange
      );
    } catch (error) {
      console.error('Error warming availability cache:', error);
      // Don't throw - cache warming failures shouldn't break the application
    }
  }

  /**
   * Get cache performance metrics
   * Requirements: 10.1
   */
  static getCacheMetrics() {
    return CalendarIntegration.getCacheMetrics();
  }

  // Private helper methods

  /**
   * Validate business exists and services are available for online booking
   */
  private static async validateBusinessAndServices(
    businessId: string,
    serviceIds: string[]
  ): Promise<void> {
    // Validate business
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        bookingEnabled: true,
        onlineBooking: true,
      },
    });

    if (!business) {
      throw new Error('Business not found');
    }

    if (!business.bookingEnabled || !business.onlineBooking) {
      throw new Error('Online booking is not enabled for this business');
    }

    // Validate services
    const services = await prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        businessId,
        isActive: true,
        isOnline: true,
      },
    });

    if (services.length !== serviceIds.length) {
      throw new Error(
        'One or more services are not available for online booking'
      );
    }
  }

  /**
   * Get service details for duration and pricing calculations
   */
  private static async getServiceDetails(
    businessId: string,
    serviceIds: string[]
  ) {
    return await prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        businessId,
        isActive: true,
        isOnline: true,
      },
      select: {
        id: true,
        name: true,
        duration: true,
        price: true,
      },
    });
  }

  /**
   * Get qualified staff members who can perform the requested services
   */
  private static async getQualifiedStaff(
    businessId: string,
    serviceIds: string[],
    specificStaffId?: string
  ) {
    const whereClause: any = {
      businessId,
      isActive: true,
      acceptsOnlineBookings: true,
      services: {
        some: {
          serviceId: { in: serviceIds },
        },
      },
    };

    if (specificStaffId) {
      whereClause.id = specificStaffId;
    }

    const staff = await prisma.staff.findMany({
      where: whereClause,
      include: {
        services: {
          where: {
            serviceId: { in: serviceIds },
          },
        },
      },
    });

    // Filter staff who can perform ALL required services
    return staff.filter(staffMember => {
      const staffServiceIds = staffMember.services.map(s => s.serviceId);
      return serviceIds.every(serviceId => staffServiceIds.includes(serviceId));
    });
  }

  /**
   * Find the next available date when no slots are available on the requested date
   */
  private static async findNextAvailableDate(
    request: PublicAvailabilityRequest
  ): Promise<string | undefined> {
    const maxDaysToSearch = 14;
    const currentDate = new Date(request.date);

    for (let dayOffset = 1; dayOffset <= maxDaysToSearch; dayOffset++) {
      const nextDate = new Date(currentDate);
      nextDate.setDate(currentDate.getDate() + dayOffset);

      try {
        const nextDayRequest: PublicAvailabilityRequest = {
          ...request,
          date: nextDate,
        };

        const result = await this.getAvailableSlots(nextDayRequest);

        if (result.slots.length > 0) {
          return nextDate.toISOString().split('T')[0]; // Return YYYY-MM-DD format
        }
      } catch (error) {
        console.error(
          `Error checking availability for ${nextDate.toISOString()}:`,
          error
        );
        // Continue searching other dates
      }
    }

    return undefined; // No availability found in the next 14 days
  }
}

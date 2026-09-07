import { prisma } from '@/lib/prisma';
import {
  dayOfWeekIn,
  minutesFromClockTime,
  minutesIntoBusinessDay,
  resolveBusinessTimezone,
} from './business-time';
import {
  MultiServiceBooking,
  ServiceDurationValidator,
  TimeSlot,
} from './service-duration-validator';

export interface AvailabilityGap {
  startTime: Date;
  endTime: Date;
  duration: number; // in minutes
  reason: 'APPOINTMENT' | 'BUSINESS_HOURS' | 'STAFF_UNAVAILABLE' | 'TIME_OFF';
}

export interface ContinuousTimeSlot {
  startTime: Date;
  endTime: Date;
  duration: number; // in minutes
  staffId: string;
  isValid: boolean;
  gaps?: AvailabilityGap[];
}

export interface ServiceAvailabilityOptions {
  businessId: string;
  serviceId: string;
  staffId?: string;
  date: Date;
  includeUnavailable?: boolean;
}

export interface MultiServiceAvailabilityOptions {
  businessId: string;
  services: MultiServiceBooking[];
  date: Date;
  staffId?: string;
  includeUnavailable?: boolean;
}

export interface SlotValidationResult {
  isValid: boolean;
  continuousDuration: number;
  requiredDuration: number;
  gaps: AvailabilityGap[];
  reason?: string;
}

/**
 * Time Slot Analysis Engine
 * Analyzes availability gaps, validates continuous time slots, and finds suitable slots for services
 * Requirements: 8.6, 8.7, 1.4, 1.5
 */
export class TimeSlotAnalysisEngine {
  private static readonly SLOT_INTERVAL = 15; // minutes
  private static readonly MAX_SEARCH_DAYS = 30;

  /**
   * Find suitable time slots for a specific service
   * Requirements: 8.6, 8.7
   */
  static async findSuitableSlots(
    options: ServiceAvailabilityOptions
  ): Promise<TimeSlot[]> {
    try {
      const {
        businessId,
        serviceId,
        staffId,
        date,
        includeUnavailable = false,
      } = options;

      // Get service duration
      const serviceDuration = await this.getServiceDuration(serviceId, staffId);
      if (!serviceDuration) {
        throw new Error(`Service ${serviceId} not found`);
      }

      const requiredDuration =
        serviceDuration.duration + (serviceDuration.bufferTime || 0);

      // Get business hours for the day
      const dayOfWeek = date.getDay();
      const businessHours = await this.getBusinessHoursForDay(
        businessId,
        dayOfWeek
      );

      if (!businessHours) {
        return []; // Business closed
      }

      // Get available staff if not specified
      const targetStaffIds = staffId
        ? [staffId]
        : await this.getServiceStaff(businessId, serviceId);

      const allSlots: TimeSlot[] = [];

      for (const currentStaffId of targetStaffIds) {
        // Get continuous time slots for this staff member
        const continuousSlots = await this.getContinuousTimeSlots(
          currentStaffId,
          date,
          businessHours,
          businessId
        );

        // Filter slots that can accommodate the service
        for (const slot of continuousSlots) {
          if (slot.duration >= requiredDuration) {
            // Generate specific time slots within this continuous period
            const specificSlots = this.generateSpecificSlots(
              slot,
              requiredDuration,
              currentStaffId
            );

            // Validate each slot
            for (const specificSlot of specificSlots) {
              const validation = await this.validateContinuousTimeSlot(
                specificSlot,
                requiredDuration,
                currentStaffId,
                businessId
              );

              if (validation.isValid || includeUnavailable) {
                allSlots.push({
                  ...specificSlot,
                  staffId: currentStaffId,
                });
              }
            }
          }
        }
      }

      // Sort by start time
      return allSlots.sort(
        (a, b) => a.startTime.getTime() - b.startTime.getTime()
      );
    } catch (error) {
      console.error('Error finding suitable slots:', error);
      throw error;
    }
  }

  /**
   * Find suitable slots for multi-service bookings
   * Requirements: 8.6, 8.7
   */
  static async findMultiServiceSlots(
    options: MultiServiceAvailabilityOptions
  ): Promise<TimeSlot[]> {
    try {
      const {
        businessId,
        services,
        date,
        staffId,
        includeUnavailable = false,
      } = options;

      // Calculate total required duration
      const totalDuration =
        await ServiceDurationValidator.getMinimumSlotDuration(
          services,
          businessId
        );

      // Get business hours
      const dayOfWeek = date.getDay();
      const businessHours = await this.getBusinessHoursForDay(
        businessId,
        dayOfWeek
      );

      if (!businessHours) {
        return [];
      }

      // Determine staff members who can perform all services
      const capableStaffIds = staffId
        ? [staffId]
        : await this.getMultiServiceCapableStaff(businessId, services);

      const allSlots: TimeSlot[] = [];

      for (const currentStaffId of capableStaffIds) {
        const continuousSlots = await this.getContinuousTimeSlots(
          currentStaffId,
          date,
          businessHours,
          businessId
        );

        for (const slot of continuousSlots) {
          if (slot.duration >= totalDuration) {
            const specificSlots = this.generateSpecificSlots(
              slot,
              totalDuration,
              currentStaffId
            );

            for (const specificSlot of specificSlots) {
              const validation = await this.validateContinuousTimeSlot(
                specificSlot,
                totalDuration,
                currentStaffId,
                businessId
              );

              if (validation.isValid || includeUnavailable) {
                allSlots.push({
                  ...specificSlot,
                  staffId: currentStaffId,
                });
              }
            }
          }
        }
      }

      return allSlots.sort(
        (a, b) => a.startTime.getTime() - b.startTime.getTime()
      );
    } catch (error) {
      console.error('Error finding multi-service slots:', error);
      throw error;
    }
  }

  /**
   * Validate continuous time slot across staff availability gaps
   * Requirements: 8.6, 8.7
   */
  static async validateContinuousTimeSlot(
    timeSlot: TimeSlot,
    requiredDuration: number,
    staffId: string,
    businessId: string
  ): Promise<SlotValidationResult> {
    try {
      const gaps = await this.detectAvailabilityGaps(
        staffId,
        timeSlot.startTime,
        timeSlot.endTime,
        businessId
      );

      // Calculate continuous duration (total duration minus gaps)
      const totalGapDuration = gaps.reduce((sum, gap) => sum + gap.duration, 0);
      const slotDuration = Math.floor(
        (timeSlot.endTime.getTime() - timeSlot.startTime.getTime()) /
          (1000 * 60)
      );
      const continuousDuration = slotDuration - totalGapDuration;

      const isValid =
        continuousDuration >= requiredDuration && gaps.length === 0;

      const result: SlotValidationResult = {
        isValid,
        continuousDuration,
        requiredDuration,
        gaps,
      };

      if (!isValid) {
        if (gaps.length > 0) {
          result.reason = `Time slot has ${gaps.length} availability gap(s)`;
        } else {
          result.reason = `Insufficient continuous time: ${continuousDuration} minutes available, ${requiredDuration} minutes required`;
        }
      }

      return result;
    } catch (error) {
      console.error('Error validating continuous time slot:', error);
      return {
        isValid: false,
        continuousDuration: 0,
        requiredDuration,
        gaps: [],
        reason: 'Validation error occurred',
      };
    }
  }

  /**
   * Validate against business hours boundaries
   * Requirements: 1.4, 1.5
   */
  static async validateBusinessHoursBoundaries(
    timeSlot: TimeSlot,
    businessId: string
  ): Promise<{ isValid: boolean; reason?: string }> {
    try {
      // The salon's clock, not the server's and not UTC. `getUTCHours`
      // called an 11:00 Los Angeles appointment 18:00 and rejected it
      // for closing time — and read a Monday evening slot as Tuesday,
      // fetching the wrong day's hours before it even got that far.
      const timezone = await resolveBusinessTimezone(businessId);
      const dayOfWeek = dayOfWeekIn(timeSlot.startTime, timezone);
      const businessHours = await this.getBusinessHoursForDay(
        businessId,
        dayOfWeek
      );

      if (!businessHours) {
        return {
          isValid: false,
          reason: 'Business is closed on this day',
        };
      }

      const businessOpenMinutes = minutesFromClockTime(businessHours.openTime);
      const businessCloseMinutes = minutesFromClockTime(
        businessHours.closeTime
      );
      const slotStartMinutes = minutesIntoBusinessDay(
        timeSlot.startTime,
        timezone
      );

      // Measured from the *start's* midnight, so a slot running to 18:00
      // reads as 1080 rather than wrapping to 0 and looking like it ends
      // before it begins.
      const slotEndMinutes =
        slotStartMinutes +
        Math.round(
          (timeSlot.endTime.getTime() - timeSlot.startTime.getTime()) / 60000
        );

      // Check if appointment starts after opening and ends before closing
      const startsAfterOpen = slotStartMinutes >= businessOpenMinutes;
      const endsBeforeClose = slotEndMinutes <= businessCloseMinutes;

      if (!startsAfterOpen) {
        return {
          isValid: false,
          reason: `Appointment starts before business opens at ${businessHours.openTime}`,
        };
      }

      if (!endsBeforeClose) {
        return {
          isValid: false,
          reason: `Appointment ends after business closes at ${businessHours.closeTime}`,
        };
      }

      return { isValid: true };
    } catch (error) {
      console.error('Error validating business hours boundaries:', error);
      return {
        isValid: false,
        reason: 'Business hours validation error',
      };
    }
  }

  /**
   * Get continuous time slots for a staff member on a specific day
   * Private helper method
   */
  private static async getContinuousTimeSlots(
    staffId: string,
    date: Date,
    businessHours: { openTime: string; closeTime: string },
    businessId: string
  ): Promise<ContinuousTimeSlot[]> {
    try {
      // Get staff availability for the day
      const staffAvailability = await this.getStaffAvailabilityForDay(
        staffId,
        date
      );

      if (!staffAvailability || staffAvailability.length === 0) {
        return [];
      }

      // Get existing appointments and time-off
      const conflicts = await this.getConflictsForDay(staffId, date);

      const continuousSlots: ContinuousTimeSlot[] = [];

      for (const availability of staffAvailability) {
        // Parse availability times
        const [startHour, startMinute] = availability.startTime
          .split(':')
          .map(Number);
        const [endHour, endMinute] = availability.endTime
          .split(':')
          .map(Number);

        const availabilityStart = new Date(date);
        availabilityStart.setHours(startHour, startMinute, 0, 0);

        const availabilityEnd = new Date(date);
        availabilityEnd.setHours(endHour, endMinute, 0, 0);

        // Find gaps within this availability period
        const gaps = conflicts.filter(
          conflict =>
            conflict.startTime < availabilityEnd &&
            conflict.endTime > availabilityStart
        );

        if (gaps.length === 0) {
          // No gaps - entire period is continuous
          const duration = Math.floor(
            (availabilityEnd.getTime() - availabilityStart.getTime()) /
              (1000 * 60)
          );

          continuousSlots.push({
            startTime: availabilityStart,
            endTime: availabilityEnd,
            duration,
            staffId,
            isValid: true,
          });
        } else {
          // Split availability around gaps
          const sortedGaps = gaps.sort(
            (a, b) => a.startTime.getTime() - b.startTime.getTime()
          );

          let currentStart = availabilityStart;

          for (const gap of sortedGaps) {
            // Add slot before gap if there's time
            if (currentStart < gap.startTime) {
              const duration = Math.floor(
                (gap.startTime.getTime() - currentStart.getTime()) / (1000 * 60)
              );

              if (duration >= this.SLOT_INTERVAL) {
                continuousSlots.push({
                  startTime: new Date(currentStart),
                  endTime: new Date(gap.startTime),
                  duration,
                  staffId,
                  isValid: true,
                });
              }
            }

            currentStart = new Date(
              Math.max(currentStart.getTime(), gap.endTime.getTime())
            );
          }

          // Add final slot after last gap
          if (currentStart < availabilityEnd) {
            const duration = Math.floor(
              (availabilityEnd.getTime() - currentStart.getTime()) / (1000 * 60)
            );

            if (duration >= this.SLOT_INTERVAL) {
              continuousSlots.push({
                startTime: new Date(currentStart),
                endTime: new Date(availabilityEnd),
                duration,
                staffId,
                isValid: true,
              });
            }
          }
        }
      }

      return continuousSlots;
    } catch (error) {
      console.error('Error getting continuous time slots:', error);
      return [];
    }
  }

  /**
   * Detect availability gaps within a time period
   * Private helper method
   */
  private static async detectAvailabilityGaps(
    staffId: string,
    startTime: Date,
    endTime: Date,
    businessId: string
  ): Promise<AvailabilityGap[]> {
    const gaps: AvailabilityGap[] = [];

    try {
      // Get appointments that overlap with the time slot
      const appointments = await prisma.appointment.findMany({
        where: {
          staffId,
          status: {
            in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'],
          },
          OR: [
            {
              AND: [
                { startTime: { lte: startTime } },
                { endTime: { gt: startTime } },
              ],
            },
            {
              AND: [
                { startTime: { lt: endTime } },
                { endTime: { gte: endTime } },
              ],
            },
            {
              AND: [
                { startTime: { gte: startTime } },
                { endTime: { lte: endTime } },
              ],
            },
          ],
        },
        select: {
          startTime: true,
          endTime: true,
        },
      });

      for (const appointment of appointments) {
        const gapStart = new Date(
          Math.max(startTime.getTime(), appointment.startTime.getTime())
        );
        const gapEnd = new Date(
          Math.min(endTime.getTime(), appointment.endTime.getTime())
        );
        const duration = Math.floor(
          (gapEnd.getTime() - gapStart.getTime()) / (1000 * 60)
        );

        if (duration > 0) {
          gaps.push({
            startTime: gapStart,
            endTime: gapEnd,
            duration,
            reason: 'APPOINTMENT',
          });
        }
      }

      // Get time-off requests that overlap
      const timeOffRequests = await prisma.timeOffRequest.findMany({
        where: {
          staffId,
          status: 'APPROVED',
          startDate: { lte: endTime },
          endDate: { gte: startTime },
        },
      });

      for (const timeOff of timeOffRequests) {
        const gapStart = new Date(
          Math.max(startTime.getTime(), timeOff.startDate.getTime())
        );
        const gapEnd = new Date(
          Math.min(endTime.getTime(), timeOff.endDate.getTime())
        );
        const duration = Math.floor(
          (gapEnd.getTime() - gapStart.getTime()) / (1000 * 60)
        );

        if (duration > 0) {
          gaps.push({
            startTime: gapStart,
            endTime: gapEnd,
            duration,
            reason: 'TIME_OFF',
          });
        }
      }

      return gaps.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    } catch (error) {
      console.error('Error detecting availability gaps:', error);
      return [];
    }
  }

  /**
   * Generate specific time slots within a continuous period
   * Private helper method
   */
  private static generateSpecificSlots(
    continuousSlot: ContinuousTimeSlot,
    requiredDuration: number,
    staffId: string
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    let currentTime = new Date(continuousSlot.startTime);

    while (currentTime < continuousSlot.endTime) {
      const slotEndTime = new Date(
        currentTime.getTime() + requiredDuration * 60000
      );

      if (slotEndTime <= continuousSlot.endTime) {
        slots.push({
          startTime: new Date(currentTime),
          endTime: slotEndTime,
          staffId,
        });
      }

      currentTime = new Date(
        currentTime.getTime() + this.SLOT_INTERVAL * 60000
      );
    }

    return slots;
  }

  /**
   * Get staff availability for a specific day
   * Private helper method
   */
  private static async getStaffAvailabilityForDay(
    staffId: string,
    date: Date
  ): Promise<Array<{ startTime: string; endTime: string }> | null> {
    const dayOfWeek = date.getDay();

    // Check for override first
    const override = await prisma.staffAvailabilityOverride.findUnique({
      where: {
        staffId_date: {
          staffId,
          date,
        },
      },
    });

    if (override) {
      if (!override.isAvailable) {
        return null;
      }
      if (override.startTime && override.endTime) {
        return [{ startTime: override.startTime, endTime: override.endTime }];
      }
    }

    // Get recurring availability
    const availability = await prisma.staffAvailability.findMany({
      where: {
        staffId,
        dayOfWeek,
        isRecurring: true,
        AND: [
          {
            OR: [{ effectiveDate: null }, { effectiveDate: { lte: date } }],
          },
          {
            OR: [{ expiryDate: null }, { expiryDate: { gte: date } }],
          },
        ],
      },
      select: {
        startTime: true,
        endTime: true,
      },
    });

    return availability.length > 0 ? availability : null;
  }

  /**
   * Get conflicts (appointments, time-off) for a specific day
   * Private helper method
   */
  private static async getConflictsForDay(
    staffId: string,
    date: Date
  ): Promise<Array<{ startTime: Date; endTime: Date }>> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const conflicts: Array<{ startTime: Date; endTime: Date }> = [];

    // Get appointments
    const appointments = await prisma.appointment.findMany({
      where: {
        staffId,
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'],
        },
      },
      select: {
        startTime: true,
        endTime: true,
      },
    });

    conflicts.push(...appointments);

    // Get time-off (convert dates to full day conflicts)
    const timeOffRequests = await prisma.timeOffRequest.findMany({
      where: {
        staffId,
        status: 'APPROVED',
        startDate: { lte: endOfDay },
        endDate: { gte: startOfDay },
      },
    });

    for (const timeOff of timeOffRequests) {
      conflicts.push({
        startTime: new Date(
          Math.max(startOfDay.getTime(), timeOff.startDate.getTime())
        ),
        endTime: new Date(
          Math.min(endOfDay.getTime(), timeOff.endDate.getTime())
        ),
      });
    }

    return conflicts;
  }

  /**
   * Get service duration with staff override support
   * Private helper method
   */
  private static async getServiceDuration(
    serviceId: string,
    staffId?: string
  ): Promise<{
    serviceId: string;
    duration: number;
    bufferTime?: number;
  } | null> {
    try {
      // First try to get staff-specific service duration
      if (staffId) {
        const staffService = await prisma.staffService.findUnique({
          where: {
            staffId_serviceId: {
              staffId,
              serviceId,
            },
          },
          include: {
            service: {
              select: {
                duration: true,
                name: true,
              },
            },
          },
        });

        if (staffService) {
          return {
            serviceId,
            duration:
              staffService.customDuration || staffService.service.duration,
            bufferTime: 0,
          };
        }
      }

      // Fall back to default service duration
      const service = await prisma.service.findUnique({
        where: { id: serviceId },
        select: {
          duration: true,
          name: true,
        },
      });

      if (!service) {
        return null;
      }

      return {
        serviceId,
        duration: service.duration,
        bufferTime: 0,
      };
    } catch (error) {
      console.error('Error getting service duration:', error);
      return null;
    }
  }

  /**
   * Get business hours for a specific day
   * Private helper method
   */
  private static async getBusinessHoursForDay(
    businessId: string,
    dayOfWeek: number
  ): Promise<{ openTime: string; closeTime: string } | null> {
    // Same implementation as in ServiceDurationValidator
    try {
      const businessHours = await prisma.businessHours.findUnique({
        where: {
          businessId_dayOfWeek: {
            businessId,
            dayOfWeek,
          },
        },
      });

      if (
        businessHours &&
        !businessHours.isClosed &&
        businessHours.openTime &&
        businessHours.closeTime
      ) {
        return {
          openTime: businessHours.openTime,
          closeTime: businessHours.closeTime,
        };
      }

      // Fall back to JSON operating hours
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { operatingHours: true },
      });

      if (business?.operatingHours) {
        const hours = business.operatingHours as any;
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

        if (hours[dayName]?.isOpen) {
          return {
            openTime: hours[dayName].openTime,
            closeTime: hours[dayName].closeTime,
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting business hours:', error);
      return null;
    }
  }

  /**
   * Get staff members who can perform a specific service
   * Private helper method
   */
  private static async getServiceStaff(
    businessId: string,
    serviceId: string
  ): Promise<string[]> {
    const staffServices = await prisma.staffService.findMany({
      where: {
        serviceId,
        staff: {
          businessId,
          isActive: true,
          acceptsOnlineBookings: true,
        },
      },
      select: {
        staffId: true,
      },
    });

    return staffServices.map(ss => ss.staffId);
  }

  /**
   * Get staff members capable of performing all services in a multi-service booking
   * Private helper method
   */
  private static async getMultiServiceCapableStaff(
    businessId: string,
    services: MultiServiceBooking[]
  ): Promise<string[]> {
    const serviceIds = services.map(s => s.serviceId);

    // Find staff who can perform ALL services
    const staffServices = await prisma.staffService.findMany({
      where: {
        serviceId: { in: serviceIds },
        staff: {
          businessId,
          isActive: true,
          acceptsOnlineBookings: true,
        },
      },
      select: {
        staffId: true,
        serviceId: true,
      },
    });

    // Group by staff ID
    const staffServiceMap = new Map<string, Set<string>>();

    for (const ss of staffServices) {
      if (!staffServiceMap.has(ss.staffId)) {
        staffServiceMap.set(ss.staffId, new Set());
      }
      staffServiceMap.get(ss.staffId)!.add(ss.serviceId);
    }

    // Find staff who can perform all required services
    const capableStaff: string[] = [];

    for (const [staffId, staffServices] of staffServiceMap) {
      const canPerformAll = serviceIds.every(serviceId =>
        staffServices.has(serviceId)
      );
      if (canPerformAll) {
        capableStaff.push(staffId);
      }
    }

    return capableStaff;
  }
}

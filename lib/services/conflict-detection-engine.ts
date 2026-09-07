import { prisma } from '@/lib/prisma';
import {
  businessDayBounds,
  dateKeyIn,
  dayOfWeekFor,
  dayOfWeekIn,
  minutesFromClockTime,
  minutesIntoBusinessDay,
  resolveBusinessTimezone,
} from './business-time';
import {
  BOOKING_STATE_TTL_MS,
  CONFIG_TTL_MS,
  remember,
} from './schedule-cache';
import { TimeSlot } from './service-duration-validator';
import { TimeSlotAnalysisEngine } from './time-slot-analysis-engine';

export interface AppointmentRequest {
  businessId: string;
  staffId: string;
  startTime: Date;
  endTime: Date;
  serviceIds: string[];
  clientId?: string;
  excludeAppointmentId?: string; // For rescheduling existing appointments
}

export interface Conflict {
  type: ConflictType;
  severity: ConflictSeverity;
  message: string;
  details: ConflictDetails;
  suggestedResolutions?: Resolution[];
}

export interface ConflictDetails {
  conflictingAppointment?: {
    id: string;
    startTime: Date;
    endTime: Date;
    clientName: string;
    services: string[];
  };
  timeOffRequest?: {
    id: string;
    startDate: Date;
    endDate: Date;
    reason: string;
  };
  businessHours?: {
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
  };
  staffAvailability?: {
    dayOfWeek: number;
    availableSlots: Array<{ startTime: string; endTime: string }>;
  };
  serviceDuration?: {
    requiredDuration: number;
    availableDuration: number;
    serviceNames: string[];
  };
}

export interface Resolution {
  type: ResolutionType;
  description: string;
  alternativeSlots?: TimeSlot[];
  alternativeStaff?: Array<{
    staffId: string;
    staffName: string;
    availableSlots: TimeSlot[];
  }>;
}

export interface ValidationResult {
  isValid: boolean;
  conflicts: Conflict[];
  warnings: Conflict[];
}

export enum ConflictType {
  OVERLAPPING_APPOINTMENT = 'OVERLAPPING_APPOINTMENT',
  BUSINESS_HOURS_VIOLATION = 'BUSINESS_HOURS_VIOLATION',
  STAFF_UNAVAILABLE = 'STAFF_UNAVAILABLE',
  TIME_OFF_CONFLICT = 'TIME_OFF_CONFLICT',
  INSUFFICIENT_DURATION = 'INSUFFICIENT_DURATION',
  BUSINESS_CLOSED = 'BUSINESS_CLOSED',
}

export enum ConflictSeverity {
  ERROR = 'ERROR', // Prevents booking
  WARNING = 'WARNING', // Allows booking with warning
  INFO = 'INFO', // Informational only
}

export enum ResolutionType {
  RESCHEDULE = 'RESCHEDULE',
  CHANGE_STAFF = 'CHANGE_STAFF',
  SPLIT_SERVICES = 'SPLIT_SERVICES',
  EXTEND_HOURS = 'EXTEND_HOURS',
}

/**
 * Conflict Detection Engine
 * Provides real-time conflict checking and validation for appointment requests
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */
export class ConflictDetectionEngine {
  private static readonly MAX_ALTERNATIVE_SLOTS = 5;
  private static readonly MAX_ALTERNATIVE_STAFF = 3;
  private static readonly SEARCH_DAYS_AHEAD = 14;

  /**
   * Detect all conflicts for an appointment request
   * Requirements: 4.1, 4.2, 4.3, 4.4
   */
  static async detectConflicts(
    request: AppointmentRequest
  ): Promise<Conflict[]> {
    try {
      const conflicts: Conflict[] = [];

      // Validate business context
      await this.validateBusinessContext(request.businessId);

      // Check business hours
      const businessHoursConflict = await this.checkBusinessHours(request);
      if (businessHoursConflict) {
        conflicts.push(businessHoursConflict);
      }

      // Check staff availability
      const staffAvailabilityConflict =
        await this.checkStaffAvailability(request);
      if (staffAvailabilityConflict) {
        conflicts.push(staffAvailabilityConflict);
      }

      // Check overlapping appointments
      const overlappingConflicts =
        await this.checkOverlappingAppointments(request);
      conflicts.push(...overlappingConflicts);

      // Check time-off conflicts
      const timeOffConflicts = await this.checkTimeOffConflicts(request);
      conflicts.push(...timeOffConflicts);

      // Check service duration fit
      const durationConflicts = await this.checkServiceDurationFit(request);
      conflicts.push(...durationConflicts);

      // Generate resolutions for conflicts
      for (const conflict of conflicts) {
        if (conflict.severity === ConflictSeverity.ERROR) {
          conflict.suggestedResolutions = await this.generateResolutions(
            request,
            conflict
          );
        }
      }

      return conflicts;
    } catch (error) {
      console.error('Error detecting conflicts:', error);
      // Re-throw specific errors, otherwise wrap in generic error
      if (
        error instanceof Error &&
        error.message === 'Invalid business context'
      ) {
        throw error;
      }
      throw new Error('Conflict detection failed');
    }
  }

  /**
   * Validate appointment slot with comprehensive checks
   * Requirements: 4.5, 3.4, 3.5
   */
  static async validateAppointmentSlot(
    staffId: string,
    startTime: Date,
    duration: number,
    businessId: string,
    serviceIds?: string[],
    excludeAppointmentId?: string
  ): Promise<ValidationResult> {
    try {
      const endTime = new Date(startTime.getTime() + duration * 60000);

      const request: AppointmentRequest = {
        businessId,
        staffId,
        startTime,
        endTime,
        serviceIds: serviceIds || [],
        excludeAppointmentId,
      };

      const allConflicts = await this.detectConflicts(request);

      // Separate errors from warnings
      const conflicts = allConflicts.filter(
        c => c.severity === ConflictSeverity.ERROR
      );
      const warnings = allConflicts.filter(
        c => c.severity === ConflictSeverity.WARNING
      );

      return {
        isValid: conflicts.length === 0,
        conflicts,
        warnings,
      };
    } catch (error) {
      console.error('Error validating appointment slot:', error);
      return {
        isValid: false,
        conflicts: [
          {
            type: ConflictType.BUSINESS_HOURS_VIOLATION,
            severity: ConflictSeverity.ERROR,
            message: 'Validation error occurred',
            details: {},
          },
        ],
        warnings: [],
      };
    }
  }

  /**
   * Check for overlapping appointments with precise time comparison
   * Requirements: 4.1, 4.2
   */
  static async checkOverlappingAppointments(
    request: AppointmentRequest
  ): Promise<Conflict[]> {
    try {
      const conflicts: Conflict[] = [];

      // Query for overlapping appointments
      const overlappingAppointments = await prisma.appointment.findMany({
        where: {
          staffId: request.staffId,
          status: {
            in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'],
          },
          // Exclude the appointment being rescheduled
          ...(request.excludeAppointmentId && {
            id: { not: request.excludeAppointmentId },
          }),
          // Check for time overlap using precise comparison
          OR: [
            // Appointment starts during requested time
            {
              AND: [
                { startTime: { gte: request.startTime } },
                { startTime: { lt: request.endTime } },
              ],
            },
            // Appointment ends during requested time
            {
              AND: [
                { endTime: { gt: request.startTime } },
                { endTime: { lte: request.endTime } },
              ],
            },
            // Appointment completely encompasses requested time
            {
              AND: [
                { startTime: { lte: request.startTime } },
                { endTime: { gte: request.endTime } },
              ],
            },
          ],
        },
        include: {
          client: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          services: {
            include: {
              service: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      // Create conflict for each overlapping appointment
      for (const appointment of overlappingAppointments) {
        const clientName = appointment.client
          ? `${appointment.client.firstName} ${appointment.client.lastName}`
          : appointment.clientName || 'Walk-in Client';

        const serviceNames = appointment.services.map(s => s.service.name);

        conflicts.push({
          type: ConflictType.OVERLAPPING_APPOINTMENT,
          severity: ConflictSeverity.ERROR,
          message: `Appointment overlaps with existing booking for ${clientName}`,
          details: {
            conflictingAppointment: {
              id: appointment.id,
              startTime: appointment.startTime,
              endTime: appointment.endTime,
              clientName,
              services: serviceNames,
            },
          },
        });
      }

      return conflicts;
    } catch (error) {
      console.error('Error checking overlapping appointments:', error);
      return [
        {
          type: ConflictType.OVERLAPPING_APPOINTMENT,
          severity: ConflictSeverity.ERROR,
          message: 'Unable to check for appointment conflicts',
          details: {},
        },
      ];
    }
  }

  /**
   * Check business hours constraints
   * Private helper method
   */
  private static async checkBusinessHours(
    request: AppointmentRequest
  ): Promise<Conflict | null> {
    try {
      const validation =
        await TimeSlotAnalysisEngine.validateBusinessHoursBoundaries(
          { startTime: request.startTime, endTime: request.endTime },
          request.businessId
        );

      if (!validation.isValid) {
        const timezone = await resolveBusinessTimezone(request.businessId);
        const dayOfWeek = dayOfWeekIn(request.startTime, timezone);
        const businessHours = await this.getBusinessHoursForDay(
          request.businessId,
          dayOfWeek
        );

        return {
          type: ConflictType.BUSINESS_HOURS_VIOLATION,
          severity: ConflictSeverity.ERROR,
          message: validation.reason || 'Appointment is outside business hours',
          details: {
            businessHours: businessHours
              ? {
                  dayOfWeek,
                  openTime: businessHours.openTime,
                  closeTime: businessHours.closeTime,
                }
              : undefined,
          },
        };
      }

      return null;
    } catch (error) {
      console.error('Error checking business hours:', error);
      return {
        type: ConflictType.BUSINESS_HOURS_VIOLATION,
        severity: ConflictSeverity.ERROR,
        message: 'Unable to validate business hours',
        details: {},
      };
    }
  }

  /**
   * Check staff availability
   * Private helper method
   */
  private static async checkStaffAvailability(
    request: AppointmentRequest
  ): Promise<Conflict | null> {
    try {
      // The salon's day, and the salon's clock. `getDay()` on the
      // instant read a Monday evening in Los Angeles as Tuesday, and
      // `setHours(0, 0, 0, 0)` built the override key at the server's
      // midnight, which matches no `@db.Date` row west of Greenwich.
      const timezone = await resolveBusinessTimezone(request.businessId);
      const dateKey = dateKeyIn(request.startTime, timezone);
      const dayOfWeek = dayOfWeekFor(dateKey);
      const date = new Date(`${dateKey}T00:00:00.000Z`);

      // Check for availability override first
      const override = await remember(
        `cde:override:${request.staffId}:${dateKey}`,
        CONFIG_TTL_MS,
        () =>
          prisma.staffAvailabilityOverride.findUnique({
            where: {
              staffId_date: {
                staffId: request.staffId,
                date,
              },
            },
          })
      );

      if (override && !override.isAvailable) {
        return {
          type: ConflictType.STAFF_UNAVAILABLE,
          severity: ConflictSeverity.ERROR,
          message: `Staff member is not available on ${date.toDateString()}`,
          details: {
            staffAvailability: {
              dayOfWeek,
              availableSlots: [],
            },
          },
        };
      }

      // Get regular availability
      const availability = await remember(
        `cde:staffHours:${request.staffId}:${dateKey}`,
        CONFIG_TTL_MS,
        () =>
          prisma.staffAvailability.findMany({
            where: {
              staffId: request.staffId,
              dayOfWeek,
              isRecurring: true,
              AND: [
                {
                  OR: [
                    { effectiveDate: null },
                    { effectiveDate: { lte: date } },
                  ],
                },
                {
                  OR: [{ expiryDate: null }, { expiryDate: { gte: date } }],
                },
              ],
            },
          })
      );

      if (availability.length === 0) {
        return {
          type: ConflictType.STAFF_UNAVAILABLE,
          severity: ConflictSeverity.ERROR,
          message: 'Staff member has no availability set for this day',
          details: {
            staffAvailability: {
              dayOfWeek,
              availableSlots: [],
            },
          },
        };
      }

      // Minutes into the salon's day. Reading UTC hours here is what
      // called an 11:00 Pacific appointment 18:00 and declared it
      // outside a staff member's 11:00-18:00 shift.
      const requestStartMinutes = minutesIntoBusinessDay(
        request.startTime,
        timezone
      );
      const requestEndMinutes =
        requestStartMinutes +
        Math.round(
          (request.endTime.getTime() - request.startTime.getTime()) / 60000
        );

      const isWithinAvailability = availability.some(slot => {
        const slotStartMinutes = minutesFromClockTime(slot.startTime);
        const slotEndMinutes = minutesFromClockTime(slot.endTime);

        return (
          requestStartMinutes >= slotStartMinutes &&
          requestEndMinutes <= slotEndMinutes
        );
      });

      if (!isWithinAvailability) {
        const availableSlots = availability.map(slot => ({
          startTime: slot.startTime,
          endTime: slot.endTime,
        }));

        return {
          type: ConflictType.STAFF_UNAVAILABLE,
          severity: ConflictSeverity.ERROR,
          message: 'Requested time is outside staff availability hours',
          details: {
            staffAvailability: {
              dayOfWeek,
              availableSlots,
            },
          },
        };
      }

      return null;
    } catch (error) {
      console.error('Error checking staff availability:', error);
      return {
        type: ConflictType.STAFF_UNAVAILABLE,
        severity: ConflictSeverity.ERROR,
        message: 'Unable to check staff availability',
        details: {},
      };
    }
  }

  /**
   * Check time-off conflicts
   * Private helper method
   */
  private static async checkTimeOffConflicts(
    request: AppointmentRequest
  ): Promise<Conflict[]> {
    try {
      const conflicts: Conflict[] = [];

      // Get approved time-off requests that overlap with the appointment
      // Keyed by the salon's day rather than the exact slot: approved time off
      // spans days, so every slot on a day gets the same answer, and asking
      // once per slot was two hundred identical queries per request.
      // Fetch the whole salon day, then narrow to this slot in memory.
      //
      // The query used to be bounded by the slot itself, which cannot be
      // cached: every slot on a day asked the same question and got the same
      // answer, two hundred times per request. Widening it to the day and
      // filtering here is both cacheable and still exact — narrowing by the
      // day alone would let a 10:00 slot's empty result stand in for a 15:00
      // slot during an afternoon's time off, and book straight through it.
      const timeOffTimezone = await resolveBusinessTimezone(request.businessId);
      const timeOffDateKey = dateKeyIn(request.startTime, timeOffTimezone);
      const { startOfDay: dayStart, endOfDay: dayEnd } = businessDayBounds(
        timeOffDateKey,
        timeOffTimezone
      );

      const timeOffForDay = await remember(
        `cde:timeOff:${request.staffId}:${timeOffDateKey}`,
        CONFIG_TTL_MS,
        () =>
          prisma.timeOffRequest.findMany({
            where: {
              staffId: request.staffId,
              status: 'APPROVED',
              startDate: { lte: dayEnd },
              endDate: { gte: dayStart },
            },
          })
      );

      const timeOffRequests = timeOffForDay.filter(
        timeOff =>
          timeOff.startDate <= request.endTime &&
          timeOff.endDate >= request.startTime
      );

      for (const timeOff of timeOffRequests) {
        conflicts.push({
          type: ConflictType.TIME_OFF_CONFLICT,
          severity: ConflictSeverity.ERROR,
          message: `Staff member has approved time off during this period`,
          details: {
            timeOffRequest: {
              id: timeOff.id,
              startDate: timeOff.startDate,
              endDate: timeOff.endDate,
              reason: timeOff.reason || 'Time off',
            },
          },
        });
      }

      return conflicts;
    } catch (error) {
      console.error('Error checking time-off conflicts:', error);
      return [
        {
          type: ConflictType.TIME_OFF_CONFLICT,
          severity: ConflictSeverity.ERROR,
          message: 'Unable to check time-off conflicts',
          details: {},
        },
      ];
    }
  }

  /**
   * Check service duration fit
   * Private helper method
   */
  private static async checkServiceDurationFit(
    request: AppointmentRequest
  ): Promise<Conflict[]> {
    try {
      const conflicts: Conflict[] = [];

      if (request.serviceIds.length === 0) {
        return conflicts;
      }

      // Get service details
      const services = await prisma.service.findMany({
        where: {
          id: { in: request.serviceIds },
          businessId: request.businessId,
        },
        select: {
          id: true,
          name: true,
          duration: true,
        },
      });

      // Calculate total required duration
      const totalRequiredDuration = services.reduce(
        (sum, service) => sum + service.duration,
        0
      );
      const availableDuration = Math.floor(
        (request.endTime.getTime() - request.startTime.getTime()) / (1000 * 60)
      );

      if (totalRequiredDuration > availableDuration) {
        conflicts.push({
          type: ConflictType.INSUFFICIENT_DURATION,
          severity: ConflictSeverity.ERROR,
          message: `Services require ${totalRequiredDuration} minutes but only ${availableDuration} minutes available`,
          details: {
            serviceDuration: {
              requiredDuration: totalRequiredDuration,
              availableDuration,
              serviceNames: services.map(s => s.name),
            },
          },
        });
      }

      return conflicts;
    } catch (error) {
      console.error('Error checking service duration fit:', error);
      return [
        {
          type: ConflictType.INSUFFICIENT_DURATION,
          severity: ConflictSeverity.ERROR,
          message: 'Unable to validate service duration',
          details: {},
        },
      ];
    }
  }

  /**
   * Generate conflict resolution suggestions
   * Private helper method
   */
  private static async generateResolutions(
    request: AppointmentRequest,
    conflict: Conflict
  ): Promise<Resolution[]> {
    const resolutions: Resolution[] = [];

    try {
      switch (conflict.type) {
        case ConflictType.OVERLAPPING_APPOINTMENT:
        case ConflictType.STAFF_UNAVAILABLE:
        case ConflictType.TIME_OFF_CONFLICT:
          // Suggest alternative time slots
          const alternativeSlots = await this.findAlternativeSlots(request);
          if (alternativeSlots.length > 0) {
            resolutions.push({
              type: ResolutionType.RESCHEDULE,
              description: `Reschedule to one of ${alternativeSlots.length} available time slots`,
              alternativeSlots,
            });
          }

          // Suggest alternative staff
          const alternativeStaff = await this.findAlternativeStaff(request);
          if (alternativeStaff.length > 0) {
            resolutions.push({
              type: ResolutionType.CHANGE_STAFF,
              description: `Book with alternative staff member`,
              alternativeStaff,
            });
          }
          break;

        case ConflictType.BUSINESS_HOURS_VIOLATION:
          // Suggest slots within business hours
          const businessHoursSlots =
            await this.findSlotsWithinBusinessHours(request);
          if (businessHoursSlots.length > 0) {
            resolutions.push({
              type: ResolutionType.RESCHEDULE,
              description: 'Reschedule to a time within business hours',
              alternativeSlots: businessHoursSlots,
            });
          }
          break;

        case ConflictType.INSUFFICIENT_DURATION:
          // Suggest longer slots or split services
          const longerSlots = await this.findLongerSlots(request);
          if (longerSlots.length > 0) {
            resolutions.push({
              type: ResolutionType.RESCHEDULE,
              description: 'Reschedule to a longer time slot',
              alternativeSlots: longerSlots,
            });
          }
          break;
      }
    } catch (error) {
      console.error('Error generating resolutions:', error);
    }

    return resolutions;
  }

  /**
   * Validate business context exists
   * Private helper method
   */
  private static async validateBusinessContext(
    businessId: string
  ): Promise<void> {
    try {
      const business = await remember(
        `cde:businessExists:${businessId}`,
        CONFIG_TTL_MS,
        () =>
          prisma.business.findUnique({
            where: { id: businessId },
            select: { id: true },
          })
      );

      if (!business) {
        throw new Error('Invalid business context');
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'Invalid business context'
      ) {
        throw error;
      }
      throw new Error('Invalid business context');
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
    try {
      // Try structured business hours first
      const businessHours = await remember(
        `cde:hours:${businessId}:${dayOfWeek}`,
        CONFIG_TTL_MS,
        () =>
          prisma.businessHours.findUnique({
            where: {
              businessId_dayOfWeek: {
                businessId,
                dayOfWeek,
              },
            },
          })
      );

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
   * Find alternative time slots for the same staff member
   * Private helper method
   */
  private static async findAlternativeSlots(
    request: AppointmentRequest
  ): Promise<TimeSlot[]> {
    try {
      const duration = Math.floor(
        (request.endTime.getTime() - request.startTime.getTime()) / (1000 * 60)
      );

      const alternatives: TimeSlot[] = [];
      const searchDate = new Date(request.startTime);
      searchDate.setHours(0, 0, 0, 0);

      // Search for alternatives over the next few days
      for (
        let dayOffset = 0;
        dayOffset < this.SEARCH_DAYS_AHEAD &&
        alternatives.length < this.MAX_ALTERNATIVE_SLOTS;
        dayOffset++
      ) {
        const currentDate = new Date(searchDate);
        currentDate.setDate(currentDate.getDate() + dayOffset);

        // Skip the original requested time on the same day
        if (dayOffset === 0) {
          // Look for slots after the requested time
          const laterSlots = await this.findSlotsAfterTime(
            request.staffId,
            request.endTime,
            duration,
            request.businessId
          );
          alternatives.push(
            ...laterSlots.slice(
              0,
              this.MAX_ALTERNATIVE_SLOTS - alternatives.length
            )
          );
        } else {
          // Look for any available slots on other days
          const daySlots = await this.findSlotsForDay(
            request.staffId,
            currentDate,
            duration,
            request.businessId
          );
          alternatives.push(
            ...daySlots.slice(
              0,
              this.MAX_ALTERNATIVE_SLOTS - alternatives.length
            )
          );
        }
      }

      return alternatives;
    } catch (error) {
      console.error('Error finding alternative slots:', error);
      return [];
    }
  }

  /**
   * Find alternative staff members who can perform the services
   * Private helper method
   */
  private static async findAlternativeStaff(
    request: AppointmentRequest
  ): Promise<
    Array<{
      staffId: string;
      staffName: string;
      availableSlots: TimeSlot[];
    }>
  > {
    try {
      if (request.serviceIds.length === 0) {
        return [];
      }

      // Find staff who can perform all required services
      const capableStaff = await prisma.staff.findMany({
        where: {
          businessId: request.businessId,
          isActive: true,
          acceptsOnlineBookings: true,
          id: { not: request.staffId }, // Exclude current staff
          services: {
            some: {
              serviceId: { in: request.serviceIds },
            },
          },
        },
        include: {
          user: {
            select: {
              name: true,
            },
          },
          services: {
            where: {
              serviceId: { in: request.serviceIds },
            },
          },
        },
      });

      // Filter staff who can perform ALL required services
      const qualifiedStaff = capableStaff.filter(staff => {
        const staffServiceIds = staff.services.map(s => s.serviceId);
        return request.serviceIds.every(serviceId =>
          staffServiceIds.includes(serviceId)
        );
      });

      const alternatives: Array<{
        staffId: string;
        staffName: string;
        availableSlots: TimeSlot[];
      }> = [];

      const duration = Math.floor(
        (request.endTime.getTime() - request.startTime.getTime()) / (1000 * 60)
      );

      // Find available slots for each qualified staff member
      for (const staff of qualifiedStaff.slice(0, this.MAX_ALTERNATIVE_STAFF)) {
        const availableSlots = await this.findSlotsForDay(
          staff.id,
          request.startTime,
          duration,
          request.businessId
        );

        if (availableSlots.length > 0) {
          alternatives.push({
            staffId: staff.id,
            staffName: staff.user.name || staff.displayName,
            availableSlots: availableSlots.slice(0, 3), // Limit to 3 slots per staff
          });
        }
      }

      return alternatives;
    } catch (error) {
      console.error('Error finding alternative staff:', error);
      return [];
    }
  }

  /**
   * Find slots within business hours
   * Private helper method
   */
  private static async findSlotsWithinBusinessHours(
    request: AppointmentRequest
  ): Promise<TimeSlot[]> {
    try {
      const duration = Math.floor(
        (request.endTime.getTime() - request.startTime.getTime()) / (1000 * 60)
      );

      return this.findSlotsForDay(
        request.staffId,
        request.startTime,
        duration,
        request.businessId
      );
    } catch (error) {
      console.error('Error finding slots within business hours:', error);
      return [];
    }
  }

  /**
   * Find longer slots to accommodate services
   * Private helper method
   */
  private static async findLongerSlots(
    request: AppointmentRequest
  ): Promise<TimeSlot[]> {
    try {
      if (request.serviceIds.length === 0) {
        return [];
      }

      // Calculate required duration for all services
      const services = await prisma.service.findMany({
        where: {
          id: { in: request.serviceIds },
          businessId: request.businessId,
        },
        select: { duration: true },
      });

      const requiredDuration = services.reduce(
        (sum, service) => sum + service.duration,
        0
      );

      return this.findSlotsForDay(
        request.staffId,
        request.startTime,
        requiredDuration,
        request.businessId
      );
    } catch (error) {
      console.error('Error finding longer slots:', error);
      return [];
    }
  }

  /**
   * Find available slots after a specific time
   * Private helper method
   */
  private static async findSlotsAfterTime(
    staffId: string,
    afterTime: Date,
    duration: number,
    businessId: string
  ): Promise<TimeSlot[]> {
    // This would use TimeSlotAnalysisEngine to find suitable slots
    // For now, return empty array as placeholder
    return [];
  }

  /**
   * Find available slots for a specific day
   * Private helper method
   */
  private static async findSlotsForDay(
    staffId: string,
    date: Date,
    duration: number,
    businessId: string
  ): Promise<TimeSlot[]> {
    try {
      // Use TimeSlotAnalysisEngine to find suitable slots
      const options = {
        businessId,
        serviceId: '', // We'll use duration directly
        staffId,
        date,
        includeUnavailable: false,
      };

      // Get business hours for the day
      const dayOfWeek = date.getDay();
      const businessHours = await this.getBusinessHoursForDay(
        businessId,
        dayOfWeek
      );

      if (!businessHours) {
        return [];
      }

      // Get continuous time slots for the staff member
      const continuousSlots = await this.getContinuousTimeSlotsForStaff(
        staffId,
        date,
        businessHours,
        businessId
      );

      const availableSlots: TimeSlot[] = [];

      // Generate specific slots within continuous periods
      for (const continuousSlot of continuousSlots) {
        if (continuousSlot.duration >= duration) {
          const specificSlots = this.generateSpecificSlotsFromContinuous(
            continuousSlot,
            duration,
            staffId
          );
          availableSlots.push(...specificSlots);
        }
      }

      return availableSlots.slice(0, this.MAX_ALTERNATIVE_SLOTS);
    } catch (error) {
      console.error('Error finding slots for day:', error);
      return [];
    }
  }

  /**
   * Advanced validation with comprehensive checks including time-off conflicts
   * Requirements: 4.5, 3.4, 3.5
   */
  static async validateAppointmentSlotAdvanced(
    request: AppointmentRequest,
    options: {
      checkTimeOff?: boolean;
      checkServiceDuration?: boolean;
      generateResolutions?: boolean;
      includeWarnings?: boolean;
    } = {}
  ): Promise<ValidationResult> {
    try {
      const {
        checkTimeOff = true,
        checkServiceDuration = true,
        generateResolutions = true,
        includeWarnings = true,
      } = options;

      const allConflicts: Conflict[] = [];

      // Core validation checks
      const coreConflicts = await this.detectConflicts(request);
      allConflicts.push(...coreConflicts);

      // Additional advanced checks
      if (checkTimeOff) {
        const timeOffConflicts =
          await this.checkAdvancedTimeOffConflicts(request);
        allConflicts.push(...timeOffConflicts);
      }

      if (checkServiceDuration) {
        const durationConflicts =
          await this.checkAdvancedServiceDuration(request);
        allConflicts.push(...durationConflicts);
      }

      // Check for potential scheduling issues (warnings)
      if (includeWarnings) {
        const warnings = await this.checkSchedulingWarnings(request);
        allConflicts.push(...warnings);
      }

      // Generate resolutions for errors
      if (generateResolutions) {
        for (const conflict of allConflicts) {
          if (
            conflict.severity === ConflictSeverity.ERROR &&
            !conflict.suggestedResolutions
          ) {
            conflict.suggestedResolutions = await this.generateResolutions(
              request,
              conflict
            );
          }
        }
      }

      // Separate errors from warnings
      const conflicts = allConflicts.filter(
        c => c.severity === ConflictSeverity.ERROR
      );
      const warnings = allConflicts.filter(
        c => c.severity !== ConflictSeverity.ERROR
      );

      return {
        isValid: conflicts.length === 0,
        conflicts,
        warnings,
      };
    } catch (error) {
      console.error('Error in advanced validation:', error);
      return {
        isValid: false,
        conflicts: [
          {
            type: ConflictType.BUSINESS_HOURS_VIOLATION,
            severity: ConflictSeverity.ERROR,
            message: 'Advanced validation error occurred',
            details: {},
          },
        ],
        warnings: [],
      };
    }
  }

  /**
   * Check overlapping appointments with precise time comparison and buffer consideration
   * Requirements: 4.1, 4.2
   */
  static async checkOverlappingAppointmentsAdvanced(
    request: AppointmentRequest,
    bufferMinutes: number = 0
  ): Promise<Conflict[]> {
    try {
      const conflicts: Conflict[] = [];

      // Adjust times with buffer
      const bufferedStartTime = new Date(
        request.startTime.getTime() - bufferMinutes * 60000
      );
      const bufferedEndTime = new Date(
        request.endTime.getTime() + bufferMinutes * 60000
      );

      // Query for overlapping appointments with buffer consideration
      const overlappingAppointments = await prisma.appointment.findMany({
        where: {
          staffId: request.staffId,
          status: {
            in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'],
          },
          ...(request.excludeAppointmentId && {
            id: { not: request.excludeAppointmentId },
          }),
          // Precise overlap detection with buffer
          OR: [
            // Appointment starts within buffered time
            {
              AND: [
                { startTime: { gte: bufferedStartTime } },
                { startTime: { lt: bufferedEndTime } },
              ],
            },
            // Appointment ends within buffered time
            {
              AND: [
                { endTime: { gt: bufferedStartTime } },
                { endTime: { lte: bufferedEndTime } },
              ],
            },
            // Appointment completely encompasses buffered time
            {
              AND: [
                { startTime: { lte: bufferedStartTime } },
                { endTime: { gte: bufferedEndTime } },
              ],
            },
          ],
        },
        include: {
          client: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          services: {
            include: {
              service: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          startTime: 'asc',
        },
      });

      // Create detailed conflicts for each overlapping appointment
      for (const appointment of overlappingAppointments) {
        const clientName = appointment.client
          ? `${appointment.client.firstName} ${appointment.client.lastName}`
          : appointment.clientName || 'Walk-in Client';

        const serviceNames = appointment.services.map(s => s.service.name);

        // Calculate overlap details
        const overlapStart = new Date(
          Math.max(request.startTime.getTime(), appointment.startTime.getTime())
        );
        const overlapEnd = new Date(
          Math.min(request.endTime.getTime(), appointment.endTime.getTime())
        );
        const overlapMinutes = Math.floor(
          (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60)
        );

        const severity =
          bufferMinutes > 0 && overlapMinutes <= bufferMinutes
            ? ConflictSeverity.WARNING
            : ConflictSeverity.ERROR;

        const message =
          bufferMinutes > 0
            ? `Appointment ${severity === ConflictSeverity.WARNING ? 'is close to' : 'overlaps with'} existing booking for ${clientName} (${overlapMinutes} minute ${severity === ConflictSeverity.WARNING ? 'gap' : 'overlap'})`
            : `Appointment overlaps with existing booking for ${clientName} by ${overlapMinutes} minutes`;

        conflicts.push({
          type: ConflictType.OVERLAPPING_APPOINTMENT,
          severity,
          message,
          details: {
            conflictingAppointment: {
              id: appointment.id,
              startTime: appointment.startTime,
              endTime: appointment.endTime,
              clientName,
              services: serviceNames,
            },
          },
        });
      }

      return conflicts;
    } catch (error) {
      console.error('Error checking advanced overlapping appointments:', error);
      return [
        {
          type: ConflictType.OVERLAPPING_APPOINTMENT,
          severity: ConflictSeverity.ERROR,
          message: 'Unable to check for appointment conflicts',
          details: {},
        },
      ];
    }
  }

  /**
   * Advanced time-off conflict detection with partial day support
   * Requirements: 3.4, 3.5
   */
  private static async checkAdvancedTimeOffConflicts(
    request: AppointmentRequest
  ): Promise<Conflict[]> {
    try {
      const conflicts: Conflict[] = [];

      // Get time-off requests that might affect the appointment
      const timeOffRequests = await prisma.timeOffRequest.findMany({
        where: {
          staffId: request.staffId,
          status: 'APPROVED',
          // Check for any overlap with the appointment date
          startDate: { lte: request.endTime },
          endDate: { gte: request.startTime },
        },
        orderBy: {
          startDate: 'asc',
        },
      });

      for (const timeOff of timeOffRequests) {
        // Check if time-off is for full days or specific times
        const isFullDayTimeOff = this.isFullDayTimeOff(
          timeOff.startDate,
          timeOff.endDate
        );

        if (isFullDayTimeOff) {
          // Full day time-off - any appointment on these days conflicts
          const appointmentDate = new Date(request.startTime);
          appointmentDate.setHours(0, 0, 0, 0);

          const timeOffStart = new Date(timeOff.startDate);
          timeOffStart.setHours(0, 0, 0, 0);

          const timeOffEnd = new Date(timeOff.endDate);
          timeOffEnd.setHours(23, 59, 59, 999);

          if (
            appointmentDate >= timeOffStart &&
            appointmentDate <= timeOffEnd
          ) {
            conflicts.push({
              type: ConflictType.TIME_OFF_CONFLICT,
              severity: ConflictSeverity.ERROR,
              message: `Staff member has full-day time off on ${appointmentDate.toDateString()}`,
              details: {
                timeOffRequest: {
                  id: timeOff.id,
                  startDate: timeOff.startDate,
                  endDate: timeOff.endDate,
                  reason: timeOff.reason || 'Time off',
                },
              },
            });
          }
        } else {
          // Partial day time-off - check for time overlap
          const hasTimeOverlap =
            request.startTime < timeOff.endDate &&
            request.endTime > timeOff.startDate;

          if (hasTimeOverlap) {
            const overlapStart = new Date(
              Math.max(request.startTime.getTime(), timeOff.startDate.getTime())
            );
            const overlapEnd = new Date(
              Math.min(request.endTime.getTime(), timeOff.endDate.getTime())
            );
            const overlapMinutes = Math.floor(
              (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60)
            );

            conflicts.push({
              type: ConflictType.TIME_OFF_CONFLICT,
              severity: ConflictSeverity.ERROR,
              message: `Staff member has time off during this period (${overlapMinutes} minute overlap)`,
              details: {
                timeOffRequest: {
                  id: timeOff.id,
                  startDate: timeOff.startDate,
                  endDate: timeOff.endDate,
                  reason: timeOff.reason || 'Time off',
                },
              },
            });
          }
        }
      }

      return conflicts;
    } catch (error) {
      console.error('Error checking advanced time-off conflicts:', error);
      return [
        {
          type: ConflictType.TIME_OFF_CONFLICT,
          severity: ConflictSeverity.ERROR,
          message: 'Unable to check time-off conflicts',
          details: {},
        },
      ];
    }
  }

  /**
   * Advanced service duration validation with staff-specific durations
   * Private helper method
   */
  private static async checkAdvancedServiceDuration(
    request: AppointmentRequest
  ): Promise<Conflict[]> {
    try {
      const conflicts: Conflict[] = [];

      if (request.serviceIds.length === 0) {
        return conflicts;
      }

      // Get service details with potential staff overrides
      const services = await Promise.all(
        request.serviceIds.map(async serviceId => {
          // Check for staff-specific duration first
          const staffService = await prisma.staffService.findUnique({
            where: {
              staffId_serviceId: {
                staffId: request.staffId,
                serviceId,
              },
            },
            include: {
              service: {
                select: {
                  name: true,
                  duration: true,
                },
              },
            },
          });

          if (staffService) {
            return {
              id: serviceId,
              name: staffService.service.name,
              duration:
                staffService.customDuration || staffService.service.duration,
            };
          }

          // Fall back to default service duration
          const service = await prisma.service.findUnique({
            where: { id: serviceId },
            select: {
              name: true,
              duration: true,
            },
          });

          return service
            ? {
                id: serviceId,
                name: service.name,
                duration: service.duration,
              }
            : null;
        })
      );

      const validServices = services.filter(s => s !== null);

      if (validServices.length !== request.serviceIds.length) {
        conflicts.push({
          type: ConflictType.INSUFFICIENT_DURATION,
          severity: ConflictSeverity.ERROR,
          message: 'One or more services not found',
          details: {},
        });
        return conflicts;
      }

      // Calculate total required duration with buffer time
      const BUFFER_TIME_MINUTES = 5; // Standard buffer between services
      const totalServiceDuration = validServices.reduce(
        (sum, service) => sum + service.duration,
        0
      );
      const bufferTime = Math.max(
        0,
        (validServices.length - 1) * BUFFER_TIME_MINUTES
      );
      const totalRequiredDuration = totalServiceDuration + bufferTime;

      const availableDuration = Math.floor(
        (request.endTime.getTime() - request.startTime.getTime()) / (1000 * 60)
      );

      if (totalRequiredDuration > availableDuration) {
        const shortfall = totalRequiredDuration - availableDuration;

        conflicts.push({
          type: ConflictType.INSUFFICIENT_DURATION,
          severity: ConflictSeverity.ERROR,
          message: `Services require ${totalRequiredDuration} minutes (including ${bufferTime} minutes buffer) but only ${availableDuration} minutes available. Shortfall: ${shortfall} minutes.`,
          details: {
            serviceDuration: {
              requiredDuration: totalRequiredDuration,
              availableDuration,
              serviceNames: validServices.map(s => s.name),
            },
          },
        });
      } else if (totalRequiredDuration < availableDuration - 30) {
        // Warning for significantly over-allocated time
        const excess = availableDuration - totalRequiredDuration;

        conflicts.push({
          type: ConflictType.INSUFFICIENT_DURATION,
          severity: ConflictSeverity.WARNING,
          message: `Time slot is ${excess} minutes longer than required for selected services`,
          details: {
            serviceDuration: {
              requiredDuration: totalRequiredDuration,
              availableDuration,
              serviceNames: validServices.map(s => s.name),
            },
          },
        });
      }

      return conflicts;
    } catch (error) {
      console.error('Error checking advanced service duration:', error);
      return [
        {
          type: ConflictType.INSUFFICIENT_DURATION,
          severity: ConflictSeverity.ERROR,
          message: 'Unable to validate service duration',
          details: {},
        },
      ];
    }
  }

  /**
   * Check for scheduling warnings (non-blocking issues)
   * Private helper method
   */
  private static async checkSchedulingWarnings(
    request: AppointmentRequest
  ): Promise<Conflict[]> {
    const warnings: Conflict[] = [];

    try {
      // Check for back-to-back appointments (potential rush)
      const adjacentAppointments = await prisma.appointment.findMany({
        where: {
          staffId: request.staffId,
          status: {
            in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'],
          },
          ...(request.excludeAppointmentId && {
            id: { not: request.excludeAppointmentId },
          }),
          OR: [
            // Appointment ending right when this one starts
            { endTime: request.startTime },
            // Appointment starting right when this one ends
            { startTime: request.endTime },
          ],
        },
        include: {
          client: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (adjacentAppointments.length > 0) {
        warnings.push({
          type: ConflictType.STAFF_UNAVAILABLE,
          severity: ConflictSeverity.WARNING,
          message:
            'Back-to-back appointments scheduled - no buffer time between clients',
          details: {},
        });
      }

      // Check for appointments outside typical business hours
      const hour = request.startTime.getHours();
      if (hour < 8 || hour > 20) {
        warnings.push({
          type: ConflictType.BUSINESS_HOURS_VIOLATION,
          severity: ConflictSeverity.INFO,
          message: 'Appointment scheduled outside typical business hours',
          details: {},
        });
      }

      // Check for weekend appointments
      const dayOfWeek = request.startTime.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        warnings.push({
          type: ConflictType.BUSINESS_HOURS_VIOLATION,
          severity: ConflictSeverity.INFO,
          message: 'Weekend appointment scheduled',
          details: {},
        });
      }

      return warnings;
    } catch (error) {
      console.error('Error checking scheduling warnings:', error);
      return [];
    }
  }

  /**
   * Check if time-off request is for full days
   * Private helper method
   */
  private static isFullDayTimeOff(startDate: Date, endDate: Date): boolean {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Check if start is at beginning of day and end is at end of day
    const isStartOfDay =
      start.getHours() === 0 &&
      start.getMinutes() === 0 &&
      start.getSeconds() === 0;
    const isEndOfDay = end.getHours() === 23 && end.getMinutes() === 59;

    // Or if the time-off spans multiple full days
    const daysDifference = Math.floor(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );

    return (isStartOfDay && isEndOfDay) || daysDifference >= 1;
  }

  /**
   * Get continuous time slots for a staff member (helper for finding alternatives)
   * Private helper method
   */
  private static async getContinuousTimeSlotsForStaff(
    staffId: string,
    date: Date,
    businessHours: { openTime: string; closeTime: string },
    businessId: string
  ): Promise<Array<{ startTime: Date; endTime: Date; duration: number }>> {
    try {
      // Get staff availability for the day
      const dayOfWeek = date.getDay();
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
      });

      if (availability.length === 0) {
        return [];
      }

      // Get existing appointments and time-off for the day
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const conflicts = await prisma.appointment.findMany({
        where: {
          staffId,
          startTime: { gte: startOfDay, lte: endOfDay },
          status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
        },
        select: {
          startTime: true,
          endTime: true,
        },
      });

      const continuousSlots: Array<{
        startTime: Date;
        endTime: Date;
        duration: number;
      }> = [];

      // Process each availability slot
      for (const slot of availability) {
        const [startHour, startMinute] = slot.startTime.split(':').map(Number);
        const [endHour, endMinute] = slot.endTime.split(':').map(Number);

        const slotStart = new Date(date);
        slotStart.setHours(startHour, startMinute, 0, 0);

        const slotEnd = new Date(date);
        slotEnd.setHours(endHour, endMinute, 0, 0);

        // Find conflicts within this slot
        const slotConflicts = conflicts
          .filter(
            conflict =>
              conflict.startTime < slotEnd && conflict.endTime > slotStart
          )
          .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

        if (slotConflicts.length === 0) {
          // No conflicts - entire slot is available
          const duration = Math.floor(
            (slotEnd.getTime() - slotStart.getTime()) / (1000 * 60)
          );
          continuousSlots.push({
            startTime: slotStart,
            endTime: slotEnd,
            duration,
          });
        } else {
          // Split around conflicts
          let currentStart = slotStart;

          for (const conflict of slotConflicts) {
            if (currentStart < conflict.startTime) {
              const duration = Math.floor(
                (conflict.startTime.getTime() - currentStart.getTime()) /
                  (1000 * 60)
              );
              if (duration >= 15) {
                // Minimum 15-minute slots
                continuousSlots.push({
                  startTime: new Date(currentStart),
                  endTime: new Date(conflict.startTime),
                  duration,
                });
              }
            }
            currentStart = new Date(
              Math.max(currentStart.getTime(), conflict.endTime.getTime())
            );
          }

          // Add final slot after last conflict
          if (currentStart < slotEnd) {
            const duration = Math.floor(
              (slotEnd.getTime() - currentStart.getTime()) / (1000 * 60)
            );
            if (duration >= 15) {
              continuousSlots.push({
                startTime: new Date(currentStart),
                endTime: new Date(slotEnd),
                duration,
              });
            }
          }
        }
      }

      return continuousSlots;
    } catch (error) {
      console.error('Error getting continuous time slots for staff:', error);
      return [];
    }
  }

  /**
   * Generate specific time slots from continuous periods
   * Private helper method
   */
  private static generateSpecificSlotsFromContinuous(
    continuousSlot: { startTime: Date; endTime: Date; duration: number },
    requiredDuration: number,
    staffId: string
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const SLOT_INTERVAL = 15; // minutes

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

      currentTime = new Date(currentTime.getTime() + SLOT_INTERVAL * 60000);
    }

    return slots;
  }
}

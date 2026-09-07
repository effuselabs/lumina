import { prisma } from '@/lib/prisma';
import { TimeSlot } from '@/types/booking';
import { DateTime } from 'luxon';

/**
 * The salon's own day for an instant, as `yyyy-MM-dd`.
 *
 * This service built its slots with `setHours`, which reads the server's zone.
 * On a UTC host that offered a Los Angeles salon alternatives at two in the
 * morning — the same defect as the main availability path, in the fallback
 * nobody looks at until the main path finds nothing.
 */
function dateKeyIn(instant: Date, timezone: string): string {
  return DateTime.fromJSDate(instant).setZone(timezone).toFormat('yyyy-MM-dd');
}

/** `HH:MM` on a salon day, as an absolute instant. */
function businessTimeToInstant(
  dateKey: string,
  time: string,
  timezone: string
): Date {
  return DateTime.fromFormat(`${dateKey} ${time}`, 'yyyy-MM-dd HH:mm', {
    zone: timezone,
  }).toJSDate();
}

/** JavaScript's day numbering (0 = Sunday) for a `yyyy-MM-dd` calendar date. */
function dayOfWeekFor(dateKey: string): number {
  return DateTime.fromISO(dateKey, { zone: 'utc' }).weekday % 7;
}

/** The salon's day, `dayOffset` days on. */
function addDaysTo(dateKey: string, dayOffset: number): string {
  return DateTime.fromISO(dateKey, { zone: 'utc' })
    .plus({ days: dayOffset })
    .toFormat('yyyy-MM-dd');
}

interface AlternativeSlotOptions {
  businessId: string;
  serviceIds: string[];
  originalStartTime: Date;
  staffId?: string;
  maxAlternatives?: number;
  searchDaysAhead?: number;
}

interface AlternativeSlotResult {
  alternatives: TimeSlot[];
  nextAvailableDate?: Date;
  searchedDays: number;
  totalSlotsFound: number;
}

export class AlternativeSlotsService {
  /**
   * Find alternative time slots when the requested slot is unavailable
   */
  static async findAlternativeSlots({
    businessId,
    serviceIds,
    originalStartTime,
    staffId,
    maxAlternatives = 10,
    searchDaysAhead = 14,
  }: AlternativeSlotOptions): Promise<AlternativeSlotResult> {
    try {
      // Get service details for duration calculation
      const services = await prisma.service.findMany({
        where: {
          id: { in: serviceIds },
          businessId,
          isActive: true,
        },
        include: {
          staff: {
            where: staffId ? { staffId } : undefined,
            include: {
              staff: {
                select: {
                  id: true,
                  displayName: true,
                  isActive: true,
                  acceptsOnlineBookings: true,
                },
              },
            },
          },
        },
      });

      if (services.length === 0) {
        return {
          alternatives: [],
          searchedDays: 0,
          totalSlotsFound: 0,
        };
      }

      const totalDuration = services.reduce(
        (sum, service) => sum + service.duration,
        0
      );
      const totalPrice = services.reduce(
        (sum, service) => sum + Number(service.price),
        0
      );

      // Get qualified staff members
      const qualifiedStaffIds = staffId
        ? [staffId]
        : Array.from(
            new Set(
              services.flatMap(service =>
                service.staff
                  .filter(
                    s => s.staff.isActive && s.staff.acceptsOnlineBookings
                  )
                  .map(s => s.staffId)
              )
            )
          );

      if (qualifiedStaffIds.length === 0) {
        return {
          alternatives: [],
          searchedDays: 0,
          totalSlotsFound: 0,
        };
      }

      const alternatives: TimeSlot[] = [];
      let searchedDays = 0;
      let nextAvailableDate: Date | undefined;

      // Search for alternatives starting from the original date, counted
      // in the salon's days rather than the server's.
      const timezone = await this.getBusinessTimezone(businessId);
      const searchStartKey = dateKeyIn(originalStartTime, timezone);

      for (
        let dayOffset = 0;
        dayOffset <= searchDaysAhead && alternatives.length < maxAlternatives;
        dayOffset++
      ) {
        const searchKey = addDaysTo(searchStartKey, dayOffset);
        searchedDays++;

        // Get business hours for this day
        const dayOfWeek = dayOfWeekFor(searchKey);
        const businessHours = await this.getBusinessHours(
          businessId,
          dayOfWeek
        );

        if (!businessHours || businessHours.isClosed) {
          continue;
        }

        // Generate time slots for this day
        const daySlots = await this.generateTimeSlotsForDay({
          businessId,
          dateKey: searchKey,
          timezone,
          duration: totalDuration,
          businessHours,
          qualifiedStaffIds,
          originalStartTime: dayOffset === 0 ? originalStartTime : undefined,
        });

        // Add slots to alternatives
        for (const slot of daySlots) {
          if (alternatives.length >= maxAlternatives) break;

          // Skip the original time slot
          if (
            dayOffset === 0 &&
            slot.startTime.getTime() === originalStartTime.getTime()
          ) {
            continue;
          }

          // Create TimeSlot object
          const staffMember = services[0].staff.find(
            s => s.staffId === slot.staffId
          )?.staff;
          if (!staffMember) continue;

          const timeSlot: TimeSlot = {
            startTime: slot.startTime,
            endTime: slot.endTime,
            staffId: slot.staffId,
            staffName: staffMember.displayName,
            isAvailable: true,
            totalDuration,
            totalPrice,
          };

          alternatives.push(timeSlot);

          // Set next available date if not set. The slot's own start
          // is an instant on that salon day, so it survives being
          // read in any zone — unlike a midnight built from one.
          if (!nextAvailableDate) {
            nextAvailableDate = timeSlot.startTime;
          }
        }
      }

      // Sort alternatives by date and time
      alternatives.sort(
        (a, b) => a.startTime.getTime() - b.startTime.getTime()
      );

      return {
        alternatives,
        nextAvailableDate,
        searchedDays,
        totalSlotsFound: alternatives.length,
      };
    } catch (error) {
      console.error('Error finding alternative slots:', error);
      return {
        alternatives: [],
        searchedDays: 0,
        totalSlotsFound: 0,
      };
    }
  }

  /**
   * Find alternative slots around a specific time (before and after)
   */
  static async findNearbyAlternatives({
    businessId,
    serviceIds,
    originalStartTime,
    staffId,
    maxAlternatives = 6,
    timeWindowHours = 4,
  }: AlternativeSlotOptions & { timeWindowHours?: number }): Promise<
    TimeSlot[]
  > {
    try {
      const services = await prisma.service.findMany({
        where: {
          id: { in: serviceIds },
          businessId,
          isActive: true,
        },
        include: {
          staff: {
            where: staffId ? { staffId } : undefined,
            include: {
              staff: {
                select: {
                  id: true,
                  displayName: true,
                  isActive: true,
                  acceptsOnlineBookings: true,
                },
              },
            },
          },
        },
      });

      if (services.length === 0) return [];

      const totalDuration = services.reduce(
        (sum, service) => sum + service.duration,
        0
      );
      const totalPrice = services.reduce(
        (sum, service) => sum + Number(service.price),
        0
      );

      // Get qualified staff
      const qualifiedStaffIds = staffId
        ? [staffId]
        : Array.from(
            new Set(
              services.flatMap(service =>
                service.staff
                  .filter(
                    s => s.staff.isActive && s.staff.acceptsOnlineBookings
                  )
                  .map(s => s.staffId)
              )
            )
          );

      if (qualifiedStaffIds.length === 0) return [];

      const alternatives: TimeSlot[] = [];
      const timezone = await this.getBusinessTimezone(businessId);
      const searchKey = dateKeyIn(originalStartTime, timezone);
      const dayOfWeek = dayOfWeekFor(searchKey);

      // Get business hours
      const businessHours = await this.getBusinessHours(businessId, dayOfWeek);
      if (!businessHours || businessHours.isClosed) return [];

      // Generate time slots for the same day
      const daySlots = await this.generateTimeSlotsForDay({
        businessId,
        dateKey: searchKey,
        timezone,
        duration: totalDuration,
        businessHours,
        qualifiedStaffIds,
      });

      // Filter slots within the time window
      const windowStart = new Date(
        originalStartTime.getTime() - timeWindowHours * 60 * 60 * 1000
      );
      const windowEnd = new Date(
        originalStartTime.getTime() + timeWindowHours * 60 * 60 * 1000
      );

      for (const slot of daySlots) {
        if (alternatives.length >= maxAlternatives) break;

        // Skip the original time slot
        if (slot.startTime.getTime() === originalStartTime.getTime()) continue;

        // Check if slot is within time window
        if (slot.startTime >= windowStart && slot.startTime <= windowEnd) {
          const staffMember = services[0].staff.find(
            s => s.staffId === slot.staffId
          )?.staff;
          if (!staffMember) continue;

          const timeSlot: TimeSlot = {
            startTime: slot.startTime,
            endTime: slot.endTime,
            staffId: slot.staffId,
            staffName: staffMember.displayName,
            isAvailable: true,
            totalDuration,
            totalPrice,
          };

          alternatives.push(timeSlot);
        }
      }

      // Sort by proximity to original time
      alternatives.sort((a, b) => {
        const diffA = Math.abs(
          a.startTime.getTime() - originalStartTime.getTime()
        );
        const diffB = Math.abs(
          b.startTime.getTime() - originalStartTime.getTime()
        );
        return diffA - diffB;
      });

      return alternatives;
    } catch (error) {
      console.error('Error finding nearby alternatives:', error);
      return [];
    }
  }

  /**
   * Get business hours for a specific day
   */
  private static async getBusinessHours(businessId: string, dayOfWeek: number) {
    try {
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { operatingHours: true },
      });

      if (!business?.operatingHours) return null;

      const hours = business.operatingHours as any;
      const dayKey = this.getDayKey(dayOfWeek);

      return hours[dayKey] || null;
    } catch (error) {
      console.error('Error getting business hours:', error);
      return null;
    }
  }

  /**
   * The salon's IANA timezone. Every instant this service produces is
   * derived from it, so a missing one falls back to UTC rather than to
   * whatever zone the server happens to run in.
   */
  private static async getBusinessTimezone(
    businessId: string
  ): Promise<string> {
    try {
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { timezone: true },
      });

      return business?.timezone || 'UTC';
    } catch (error) {
      console.error('Error getting business timezone:', error);
      return 'UTC';
    }
  }

  /**
   * Generate available time slots for a specific day
   */
  private static async generateTimeSlotsForDay({
    businessId,
    dateKey,
    timezone,
    duration,
    businessHours,
    qualifiedStaffIds,
    originalStartTime,
  }: {
    businessId: string;
    dateKey: string;
    timezone: string;
    duration: number;
    businessHours: { openTime?: string; closeTime?: string };
    qualifiedStaffIds: string[];
    originalStartTime?: Date;
  }) {
    const slots: Array<{ startTime: Date; endTime: Date; staffId: string }> =
      [];

    if (!businessHours.openTime || !businessHours.closeTime) return slots;

    // Opening and closing as instants, in the salon's zone.
    const dayStart = businessTimeToInstant(
      dateKey,
      businessHours.openTime,
      timezone
    );
    const dayEnd = businessTimeToInstant(
      dateKey,
      businessHours.closeTime,
      timezone
    );

    // Get existing appointments for all qualified staff
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        businessId,
        staffId: { in: qualifiedStaffIds },
        startTime: {
          gte: dayStart,
          lt: dayEnd,
        },
        status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
      },
      select: {
        staffId: true,
        startTime: true,
        endTime: true,
      },
    });

    // Generate slots for each staff member
    for (const staffId of qualifiedStaffIds) {
      const staffAppointments = existingAppointments.filter(
        apt => apt.staffId === staffId
      );

      // Generate 30-minute intervals
      const slotInterval = 30; // minutes
      let currentTime = new Date(dayStart);

      while (currentTime.getTime() + duration * 60 * 1000 <= dayEnd.getTime()) {
        const slotStart = new Date(currentTime);
        const slotEnd = new Date(currentTime.getTime() + duration * 60 * 1000);

        // Skip if in the past (with 2-hour minimum notice)
        const now = new Date();
        const minimumNoticeMs = 2 * 60 * 60 * 1000; // 2 hours
        if (slotStart.getTime() <= now.getTime() + minimumNoticeMs) {
          currentTime = new Date(
            currentTime.getTime() + slotInterval * 60 * 1000
          );
          continue;
        }

        // Check for conflicts with existing appointments
        const hasConflict = staffAppointments.some(apt => {
          return (
            (slotStart >= apt.startTime && slotStart < apt.endTime) ||
            (slotEnd > apt.startTime && slotEnd <= apt.endTime) ||
            (slotStart <= apt.startTime && slotEnd >= apt.endTime)
          );
        });

        if (!hasConflict) {
          slots.push({
            startTime: slotStart,
            endTime: slotEnd,
            staffId,
          });
        }

        currentTime = new Date(
          currentTime.getTime() + slotInterval * 60 * 1000
        );
      }
    }

    return slots;
  }

  /**
   * Convert day of week number to key
   */
  private static getDayKey(dayOfWeek: number): string {
    const days = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    return days[dayOfWeek];
  }
}

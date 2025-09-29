import { prisma } from '@/lib/prisma';
import { TimeSlot } from '@/types/booking';
import { addDays, format, startOfDay } from 'date-fns';

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

            const totalDuration = services.reduce((sum, service) => sum + service.duration, 0);
            const totalPrice = services.reduce((sum, service) => sum + Number(service.price), 0);

            // Get qualified staff members
            const qualifiedStaffIds = staffId
                ? [staffId]
                : Array.from(new Set(
                    services.flatMap(service =>
                        service.staff
                            .filter(s => s.staff.isActive && s.staff.acceptsOnlineBookings)
                            .map(s => s.staffId)
                    )
                ));

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

            // Search for alternatives starting from the original date
            const searchStartDate = startOfDay(originalStartTime);

            for (let dayOffset = 0; dayOffset <= searchDaysAhead && alternatives.length < maxAlternatives; dayOffset++) {
                const searchDate = addDays(searchStartDate, dayOffset);
                searchedDays++;

                // Get business hours for this day
                const dayOfWeek = searchDate.getDay();
                const businessHours = await this.getBusinessHours(businessId, dayOfWeek);

                if (!businessHours || businessHours.isClosed) {
                    continue;
                }

                // Generate time slots for this day
                const daySlots = await this.generateTimeSlotsForDay({
                    businessId,
                    date: searchDate,
                    duration: totalDuration,
                    businessHours,
                    qualifiedStaffIds,
                    originalStartTime: dayOffset === 0 ? originalStartTime : undefined,
                });

                // Add slots to alternatives
                for (const slot of daySlots) {
                    if (alternatives.length >= maxAlternatives) break;

                    // Skip the original time slot
                    if (dayOffset === 0 && slot.startTime.getTime() === originalStartTime.getTime()) {
                        continue;
                    }

                    // Create TimeSlot object
                    const staffMember = services[0].staff.find(s => s.staffId === slot.staffId)?.staff;
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

                    // Set next available date if not set
                    if (!nextAvailableDate) {
                        nextAvailableDate = searchDate;
                    }
                }
            }

            // Sort alternatives by date and time
            alternatives.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

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
    }: AlternativeSlotOptions & { timeWindowHours?: number }): Promise<TimeSlot[]> {
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

            const totalDuration = services.reduce((sum, service) => sum + service.duration, 0);
            const totalPrice = services.reduce((sum, service) => sum + Number(service.price), 0);

            // Get qualified staff
            const qualifiedStaffIds = staffId
                ? [staffId]
                : Array.from(new Set(
                    services.flatMap(service =>
                        service.staff
                            .filter(s => s.staff.isActive && s.staff.acceptsOnlineBookings)
                            .map(s => s.staffId)
                    )
                ));

            if (qualifiedStaffIds.length === 0) return [];

            const alternatives: TimeSlot[] = [];
            const searchDate = startOfDay(originalStartTime);
            const dayOfWeek = searchDate.getDay();

            // Get business hours
            const businessHours = await this.getBusinessHours(businessId, dayOfWeek);
            if (!businessHours || businessHours.isClosed) return [];

            // Generate time slots for the same day
            const daySlots = await this.generateTimeSlotsForDay({
                businessId,
                date: searchDate,
                duration: totalDuration,
                businessHours,
                qualifiedStaffIds,
            });

            // Filter slots within the time window
            const windowStart = new Date(originalStartTime.getTime() - timeWindowHours * 60 * 60 * 1000);
            const windowEnd = new Date(originalStartTime.getTime() + timeWindowHours * 60 * 60 * 1000);

            for (const slot of daySlots) {
                if (alternatives.length >= maxAlternatives) break;

                // Skip the original time slot
                if (slot.startTime.getTime() === originalStartTime.getTime()) continue;

                // Check if slot is within time window
                if (slot.startTime >= windowStart && slot.startTime <= windowEnd) {
                    const staffMember = services[0].staff.find(s => s.staffId === slot.staffId)?.staff;
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
                const diffA = Math.abs(a.startTime.getTime() - originalStartTime.getTime());
                const diffB = Math.abs(b.startTime.getTime() - originalStartTime.getTime());
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
     * Generate available time slots for a specific day
     */
    private static async generateTimeSlotsForDay({
        businessId,
        date,
        duration,
        businessHours,
        qualifiedStaffIds,
        originalStartTime,
    }: {
        businessId: string;
        date: Date;
        duration: number;
        businessHours: any;
        qualifiedStaffIds: string[];
        originalStartTime?: Date;
    }) {
        const slots: Array<{ startTime: Date; endTime: Date; staffId: string }> = [];

        if (!businessHours.openTime || !businessHours.closeTime) return slots;

        // Parse business hours
        const [openHour, openMinute] = businessHours.openTime.split(':').map(Number);
        const [closeHour, closeMinute] = businessHours.closeTime.split(':').map(Number);

        const dayStart = new Date(date);
        dayStart.setHours(openHour, openMinute, 0, 0);

        const dayEnd = new Date(date);
        dayEnd.setHours(closeHour, closeMinute, 0, 0);

        // Get existing appointments for all qualified staff
        const existingAppointments = await prisma.appointment.findMany({
            where: {
                businessId,
                staffId: { in: qualifiedStaffIds },
                startTime: {
                    gte: dayStart,
                    lt: addDays(dayStart, 1),
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
            const staffAppointments = existingAppointments.filter(apt => apt.staffId === staffId);

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
                    currentTime = new Date(currentTime.getTime() + slotInterval * 60 * 1000);
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

                currentTime = new Date(currentTime.getTime() + slotInterval * 60 * 1000);
            }
        }

        return slots;
    }

    /**
     * Convert day of week number to key
     */
    private static getDayKey(dayOfWeek: number): string {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return days[dayOfWeek];
    }

    /**
     * Format alternative slots for user display
     */
    static formatAlternativesForDisplay(alternatives: TimeSlot[]): Array<{
        date: string;
        time: string;
        staffName: string;
        slot: TimeSlot;
    }> {
        return alternatives.map(slot => ({
            date: format(slot.startTime, 'EEEE, MMM d'),
            time: `${format(slot.startTime, 'h:mm a')} - ${format(slot.endTime, 'h:mm a')}`,
            staffName: slot.staffName,
            slot,
        }));
    }
}
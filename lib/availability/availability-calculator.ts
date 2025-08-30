import { prisma } from '@/lib/prisma'

export interface TimeSlot {
    startTime: Date
    endTime: Date
    available: boolean
    staffId?: string
}

export interface StaffAvailability {
    staffId: string
    staffName: string
    workingHours: any
    appointments: Array<{
        startTime: Date
        endTime: Date
    }>
}

export interface AvailabilityOptions {
    businessId: string
    serviceId?: string
    staffId?: string
    date: Date
    duration: number // in minutes
}

export class AvailabilityCalculator {
    /**
     * Calculate available time slots for a given date and service
     */
    static async calculateAvailability(options: AvailabilityOptions): Promise<TimeSlot[]> {
        const { businessId, serviceId, staffId, date, duration } = options

        // Get business operating hours
        const business = await prisma.business.findUnique({
            where: { id: businessId },
            select: {
                operatingHours: true,
                timezone: true,
            },
        })

        if (!business) {
            throw new Error('Business not found')
        }

        // Get available staff
        const staffQuery: any = {
            businessId,
            isActive: true,
            acceptsOnlineBookings: true,
        }

        if (staffId) {
            staffQuery.id = staffId
        }

        if (serviceId) {
            staffQuery.services = {
                some: {
                    serviceId,
                },
            }
        }

        const availableStaff = await prisma.staff.findMany({
            where: staffQuery,
            include: {
                user: {
                    select: {
                        name: true,
                    },
                },
                appointments: {
                    where: {
                        startTime: {
                            gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
                            lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
                        },
                        status: {
                            in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'],
                        },
                    },
                    select: {
                        startTime: true,
                        endTime: true,
                    },
                },
            },
        })

        // Calculate slots for each staff member
        const allSlots: TimeSlot[] = []

        for (const staff of availableStaff) {
            const staffSlots = this.calculateStaffSlots({
                staff,
                date,
                duration,
                businessHours: business.operatingHours as any,
            })

            allSlots.push(...staffSlots)
        }

        // Sort slots by time
        return allSlots.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    }

    /**
     * Calculate available slots for a specific staff member
     */
    private static calculateStaffSlots(options: {
        staff: any
        date: Date
        duration: number
        businessHours: any
    }): TimeSlot[] {
        const { staff, date, duration, businessHours } = options
        const slots: TimeSlot[] = []

        // Get day of week (0 = Sunday, 1 = Monday, etc.)
        const dayOfWeek = date.getDay()

        // Default business hours if not configured
        const defaultHours = {
            0: null, // Sunday - closed
            1: { start: '09:00', end: '18:00' }, // Monday
            2: { start: '09:00', end: '18:00' }, // Tuesday
            3: { start: '09:00', end: '18:00' }, // Wednesday
            4: { start: '09:00', end: '18:00' }, // Thursday
            5: { start: '09:00', end: '18:00' }, // Friday
            6: { start: '09:00', end: '17:00' }, // Saturday
        }

        const hours = businessHours || defaultHours
        const dayHours = hours[dayOfWeek]

        if (!dayHours) {
            return [] // Business is closed on this day
        }

        // Parse staff working hours (could override business hours)
        const staffHours = staff.workingHours || dayHours

        // Generate time slots
        const [startHour, startMinute] = dayHours.start.split(':').map(Number)
        const [endHour, endMinute] = dayHours.end.split(':').map(Number)

        const startTime = new Date(date)
        startTime.setHours(startHour, startMinute, 0, 0)

        const endTime = new Date(date)
        endTime.setHours(endHour, endMinute, 0, 0)

        // Generate slots every 15 minutes
        const slotInterval = 15 // minutes
        let currentTime = new Date(startTime)

        while (currentTime < endTime) {
            const slotEndTime = new Date(currentTime.getTime() + duration * 60000)

            // Check if slot end time is within business hours
            if (slotEndTime <= endTime) {
                // Check for conflicts with existing appointments
                const hasConflict = staff.appointments.some((appointment: any) => {
                    const appointmentStart = new Date(appointment.startTime)
                    const appointmentEnd = new Date(appointment.endTime)

                    return (
                        (currentTime >= appointmentStart && currentTime < appointmentEnd) ||
                        (slotEndTime > appointmentStart && slotEndTime <= appointmentEnd) ||
                        (currentTime <= appointmentStart && slotEndTime >= appointmentEnd)
                    )
                })

                slots.push({
                    startTime: new Date(currentTime),
                    endTime: new Date(slotEndTime),
                    available: !hasConflict,
                    staffId: staff.id,
                })
            }

            // Move to next slot
            currentTime = new Date(currentTime.getTime() + slotInterval * 60000)
        }

        return slots
    }

    /**
     * Check if a specific time slot is available
     */
    static async isSlotAvailable(options: {
        businessId: string
        staffId: string
        startTime: Date
        endTime: Date
        excludeAppointmentId?: string
    }): Promise<boolean> {
        const { businessId, staffId, startTime, endTime, excludeAppointmentId } = options

        const conflictQuery: any = {
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
        }

        if (excludeAppointmentId) {
            conflictQuery.id = { not: excludeAppointmentId }
        }

        const conflictingAppointment = await prisma.appointment.findFirst({
            where: conflictQuery,
        })

        return !conflictingAppointment
    }

    /**
     * Get staff availability for a date range
     */
    static async getStaffAvailabilityRange(options: {
        businessId: string
        staffId: string
        startDate: Date
        endDate: Date
    }): Promise<StaffAvailability[]> {
        const { businessId, staffId, startDate, endDate } = options

        const staff = await prisma.staff.findMany({
            where: {
                businessId,
                ...(staffId ? { id: staffId } : {}),
                isActive: true,
            },
            include: {
                user: {
                    select: {
                        name: true,
                    },
                },
                appointments: {
                    where: {
                        startTime: {
                            gte: startDate,
                            lte: endDate,
                        },
                        status: {
                            in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'],
                        },
                    },
                    select: {
                        startTime: true,
                        endTime: true,
                    },
                },
            },
        })

        return staff.map(s => ({
            staffId: s.id,
            staffName: s.displayName || s.user.name || 'Unknown',
            workingHours: s.workingHours,
            appointments: s.appointments,
        }))
    }

    /**
     * Find next available slot for a service
     */
    static async findNextAvailableSlot(options: {
        businessId: string
        serviceId: string
        staffId?: string
        fromDate?: Date
        duration: number
    }): Promise<TimeSlot | null> {
        const { businessId, serviceId, staffId, duration } = options
        const fromDate = options.fromDate || new Date()

        // Search for the next 30 days
        for (let i = 0; i < 30; i++) {
            const searchDate = new Date(fromDate)
            searchDate.setDate(searchDate.getDate() + i)

            const slots = await this.calculateAvailability({
                businessId,
                serviceId,
                staffId,
                date: searchDate,
                duration,
            })

            const availableSlot = slots.find(slot => slot.available)
            if (availableSlot) {
                return availableSlot
            }
        }

        return null
    }
}
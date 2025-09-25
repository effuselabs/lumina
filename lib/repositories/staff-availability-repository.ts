import { prisma } from '@/lib/prisma'
import { StaffAvailability, StaffAvailabilityOverride } from '@prisma/client'

export interface AvailabilityPattern {
    dayOfWeek: number
    startTime: string
    endTime: string
    isRecurring?: boolean
    effectiveDate?: Date
    expiryDate?: Date
}

export interface RecurringPattern {
    patterns: AvailabilityPattern[]
    effectiveDate?: Date
    expiryDate?: Date
}

export interface DayAvailability {
    startTime?: string
    endTime?: string
    isAvailable: boolean
    reason?: string
}

export interface DateRange {
    startDate: Date
    endDate: Date
}

export interface AvailabilitySlot {
    staffId: string
    date: Date
    startTime: string
    endTime: string
    isAvailable: boolean
    isOverride: boolean
    reason?: string
}

export interface ConflictInfo {
    type: 'APPOINTMENT' | 'TIME_OFF' | 'AVAILABILITY_GAP'
    startTime: Date
    endTime: Date
    description: string
}

export class StaffAvailabilityRepository {
    /**
     * Set availability for a staff member on a specific day
     */
    async setAvailability(staffId: string, availability: AvailabilityPattern): Promise<StaffAvailability> {
        // Get business ID for the staff member
        const staff = await prisma.staff.findUnique({
            where: { id: staffId },
            select: { businessId: true }
        })

        if (!staff) {
            throw new Error('Staff member not found')
        }

        return await prisma.staffAvailability.create({
            data: {
                staffId,
                businessId: staff.businessId,
                dayOfWeek: availability.dayOfWeek,
                startTime: availability.startTime,
                endTime: availability.endTime,
                isRecurring: availability.isRecurring ?? true,
                effectiveDate: availability.effectiveDate,
                expiryDate: availability.expiryDate
            }
        })
    }

    /**
     * Get availability for a staff member within a date range
     */
    async getAvailability(staffId: string, dateRange: DateRange): Promise<AvailabilitySlot[]> {
        const staff = await prisma.staff.findUnique({
            where: { id: staffId },
            select: { businessId: true }
        })

        if (!staff) {
            throw new Error('Staff member not found')
        }

        // Get recurring availability patterns
        const recurringAvailability = await prisma.staffAvailability.findMany({
            where: {
                staffId,
                isRecurring: true,
                OR: [
                    { effectiveDate: null },
                    { effectiveDate: { lte: dateRange.endDate } }
                ],
                OR: [
                    { expiryDate: null },
                    { expiryDate: { gte: dateRange.startDate } }
                ]
            },
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
        })

        // Get availability overrides for the date range
        const overrides = await prisma.staffAvailabilityOverride.findMany({
            where: {
                staffId,
                date: {
                    gte: dateRange.startDate,
                    lte: dateRange.endDate
                }
            },
            orderBy: { date: 'asc' }
        })

        // Build availability slots
        const slots: AvailabilitySlot[] = []
        const currentDate = new Date(dateRange.startDate)

        while (currentDate <= dateRange.endDate) {
            const dayOfWeek = currentDate.getDay()
            const dateString = currentDate.toISOString().split('T')[0]

            // Check for override first
            const override = overrides.find(o =>
                o.date.toISOString().split('T')[0] === dateString
            )

            if (override) {
                if (override.isAvailable && override.startTime && override.endTime) {
                    slots.push({
                        staffId,
                        date: new Date(currentDate),
                        startTime: override.startTime,
                        endTime: override.endTime,
                        isAvailable: true,
                        isOverride: true,
                        reason: override.reason || undefined
                    })
                } else {
                    slots.push({
                        staffId,
                        date: new Date(currentDate),
                        startTime: '00:00',
                        endTime: '23:59',
                        isAvailable: false,
                        isOverride: true,
                        reason: override.reason || 'Not available'
                    })
                }
            } else {
                // Use recurring availability
                const dayAvailability = recurringAvailability.filter(a => a.dayOfWeek === dayOfWeek)

                for (const availability of dayAvailability) {
                    // Check if this availability is effective for this date
                    const isEffective = (!availability.effectiveDate || availability.effectiveDate <= currentDate) &&
                        (!availability.expiryDate || availability.expiryDate >= currentDate)

                    if (isEffective) {
                        slots.push({
                            staffId,
                            date: new Date(currentDate),
                            startTime: availability.startTime,
                            endTime: availability.endTime,
                            isAvailable: true,
                            isOverride: false
                        })
                    }
                }
            }

            currentDate.setDate(currentDate.getDate() + 1)
        }

        return slots
    }

    /**
     * Set recurring availability patterns for a staff member
     */
    async setRecurringAvailability(staffId: string, pattern: RecurringPattern): Promise<StaffAvailability[]> {
        const staff = await prisma.staff.findUnique({
            where: { id: staffId },
            select: { businessId: true }
        })

        if (!staff) {
            throw new Error('Staff member not found')
        }

        const results: StaffAvailability[] = []

        for (const availability of pattern.patterns) {
            const result = await prisma.staffAvailability.create({
                data: {
                    staffId,
                    businessId: staff.businessId,
                    dayOfWeek: availability.dayOfWeek,
                    startTime: availability.startTime,
                    endTime: availability.endTime,
                    isRecurring: true,
                    effectiveDate: pattern.effectiveDate || availability.effectiveDate,
                    expiryDate: pattern.expiryDate || availability.expiryDate
                }
            })
            results.push(result)
        }

        return results
    }

    /**
     * Override availability for a specific date
     */
    async overrideAvailability(staffId: string, date: Date, availability: DayAvailability): Promise<StaffAvailabilityOverride> {
        const staff = await prisma.staff.findUnique({
            where: { id: staffId },
            select: { businessId: true }
        })

        if (!staff) {
            throw new Error('Staff member not found')
        }

        return await prisma.staffAvailabilityOverride.upsert({
            where: {
                staffId_date: {
                    staffId,
                    date
                }
            },
            update: {
                startTime: availability.startTime,
                endTime: availability.endTime,
                isAvailable: availability.isAvailable,
                reason: availability.reason
            },
            create: {
                staffId,
                businessId: staff.businessId,
                date,
                startTime: availability.startTime,
                endTime: availability.endTime,
                isAvailable: availability.isAvailable,
                reason: availability.reason
            }
        })
    }

    /**
     * Get available staff for a specific date and time with service duration
     */
    async getAvailableStaff(businessId: string, dateTime: Date, serviceDuration: number): Promise<string[]> {
        const date = new Date(dateTime.getFullYear(), dateTime.getMonth(), dateTime.getDate())
        const dayOfWeek = date.getDay()
        const startTime = dateTime.toTimeString().slice(0, 5) // HH:MM format
        const endDateTime = new Date(dateTime.getTime() + serviceDuration * 60000)
        const endTime = endDateTime.toTimeString().slice(0, 5)

        // Get all active staff for the business
        const allStaff = await prisma.staff.findMany({
            where: {
                businessId,
                isActive: true,
                acceptsOnlineBookings: true
            },
            select: { id: true }
        })

        const availableStaffIds: string[] = []

        for (const staff of allStaff) {
            const isAvailable = await this.isStaffAvailable(staff.id, dateTime, serviceDuration)
            if (isAvailable) {
                availableStaffIds.push(staff.id)
            }
        }

        return availableStaffIds
    }

    /**
     * Check if a staff member is available for a specific time slot
     */
    async isStaffAvailable(staffId: string, dateTime: Date, serviceDuration: number): Promise<boolean> {
        const date = new Date(dateTime.getFullYear(), dateTime.getMonth(), dateTime.getDate())
        const dayOfWeek = date.getDay()
        const startTime = dateTime.toTimeString().slice(0, 5)
        const endDateTime = new Date(dateTime.getTime() + serviceDuration * 60000)
        const endTime = endDateTime.toTimeString().slice(0, 5)

        // Check for availability override first
        const override = await prisma.staffAvailabilityOverride.findUnique({
            where: {
                staffId_date: {
                    staffId,
                    date
                }
            }
        })

        if (override) {
            if (!override.isAvailable) {
                return false
            }
            if (override.startTime && override.endTime) {
                return startTime >= override.startTime && endTime <= override.endTime
            }
        }

        // Check recurring availability
        const availability = await prisma.staffAvailability.findMany({
            where: {
                staffId,
                dayOfWeek,
                isRecurring: true,
                OR: [
                    { effectiveDate: null },
                    { effectiveDate: { lte: date } }
                ],
                OR: [
                    { expiryDate: null },
                    { expiryDate: { gte: date } }
                ]
            }
        })

        // Check if any availability slot covers the requested time
        for (const slot of availability) {
            if (startTime >= slot.startTime && endTime <= slot.endTime) {
                return true
            }
        }

        return false
    }

    /**
     * Detect conflicts with existing appointments
     */
    async detectAvailabilityConflicts(staffId: string, dateRange: DateRange): Promise<ConflictInfo[]> {
        const conflicts: ConflictInfo[] = []

        // Get existing appointments in the date range
        const appointments = await prisma.appointment.findMany({
            where: {
                staffId,
                startTime: {
                    gte: dateRange.startDate,
                    lte: dateRange.endDate
                },
                status: {
                    in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS']
                }
            },
            select: {
                startTime: true,
                endTime: true,
                services: {
                    select: {
                        serviceName: true
                    }
                }
            }
        })

        for (const appointment of appointments) {
            conflicts.push({
                type: 'APPOINTMENT',
                startTime: appointment.startTime,
                endTime: appointment.endTime,
                description: `Existing appointment: ${appointment.services.map(s => s.serviceName).join(', ')}`
            })
        }

        // Get approved time-off requests
        const timeOffRequests = await prisma.timeOffRequest.findMany({
            where: {
                staffId,
                status: 'APPROVED',
                startDate: { lte: dateRange.endDate },
                endDate: { gte: dateRange.startDate }
            }
        })

        for (const timeOff of timeOffRequests) {
            conflicts.push({
                type: 'TIME_OFF',
                startTime: timeOff.startDate,
                endTime: timeOff.endDate,
                description: `Time off: ${timeOff.reason || 'No reason provided'}`
            })
        }

        return conflicts
    }

    /**
     * Update recurring availability pattern
     */
    async updateRecurringAvailability(staffId: string, dayOfWeek: number, startTime: string, endTime: string): Promise<StaffAvailability[]> {
        const staff = await prisma.staff.findUnique({
            where: { id: staffId },
            select: { businessId: true }
        })

        if (!staff) {
            throw new Error('Staff member not found')
        }

        // Delete existing recurring availability for this day
        await prisma.staffAvailability.deleteMany({
            where: {
                staffId,
                dayOfWeek,
                isRecurring: true
            }
        })

        // Create new availability
        const newAvailability = await prisma.staffAvailability.create({
            data: {
                staffId,
                businessId: staff.businessId,
                dayOfWeek,
                startTime,
                endTime,
                isRecurring: true
            }
        })

        return [newAvailability]
    }

    /**
     * Delete availability override
     */
    async deleteAvailabilityOverride(staffId: string, date: Date): Promise<void> {
        await prisma.staffAvailabilityOverride.delete({
            where: {
                staffId_date: {
                    staffId,
                    date
                }
            }
        })
    }

    /**
     * Get staff availability with fallback to JSON field for backward compatibility
     */
    async getAvailabilityWithFallback(staffId: string, dateRange: DateRange): Promise<AvailabilitySlot[]> {
        // First try to get from structured tables
        const structuredAvailability = await this.getAvailability(staffId, dateRange)

        if (structuredAvailability.length > 0) {
            return structuredAvailability
        }

        // Fallback to JSON field in Staff model
        const staff = await prisma.staff.findUnique({
            where: { id: staffId },
            select: { workingHours: true, businessId: true }
        })

        if (staff?.workingHours && typeof staff.workingHours === 'object') {
            const jsonHours = staff.workingHours as any
            const fallbackSlots: AvailabilitySlot[] = []

            const dayMap: { [key: string]: number } = {
                sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
                thursday: 4, friday: 5, saturday: 6
            }

            const currentDate = new Date(dateRange.startDate)

            while (currentDate <= dateRange.endDate) {
                const dayOfWeek = currentDate.getDay()
                const dayName = Object.keys(dayMap).find(key => dayMap[key] === dayOfWeek)

                if (dayName && jsonHours[dayName]) {
                    const dayHours = jsonHours[dayName]
                    if (dayHours.isAvailable && dayHours.startTime && dayHours.endTime) {
                        fallbackSlots.push({
                            staffId,
                            date: new Date(currentDate),
                            startTime: dayHours.startTime,
                            endTime: dayHours.endTime,
                            isAvailable: true,
                            isOverride: false
                        })
                    }
                }

                currentDate.setDate(currentDate.getDate() + 1)
            }

            return fallbackSlots
        }

        return []
    }

    /**
     * Validate availability time format and logic
     */
    validateAvailabilityTime(startTime: string, endTime: string): { isValid: boolean; errors: string[] } {
        const errors: string[] = []

        // Validate time format (HH:MM)
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
        if (!timeRegex.test(startTime)) {
            errors.push('Invalid start time format. Use HH:MM format.')
        }
        if (!timeRegex.test(endTime)) {
            errors.push('Invalid end time format. Use HH:MM format.')
        }

        // Validate time logic
        if (startTime >= endTime) {
            errors.push('Start time must be before end time.')
        }

        return {
            isValid: errors.length === 0,
            errors
        }
    }
}
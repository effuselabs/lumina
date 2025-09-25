import { prisma } from '@/lib/prisma'
import { BusinessHoliday, BusinessHours } from '@prisma/client'

export interface BusinessSchedule {
    dayOfWeek: number
    openTime?: string
    closeTime?: string
    isClosed?: boolean
}

export interface Holiday {
    date: Date
    name?: string
    isClosed?: boolean
    openTime?: string
    closeTime?: string
}

export interface BusinessHoursWithHolidays extends BusinessHours {
    holidays?: BusinessHoliday[]
}

export class BusinessHoursRepository {
    /**
     * Get business hours for a specific business and day
     */
    async getBusinessHours(businessId: string, dayOfWeek?: number): Promise<BusinessHours[]> {
        const where: any = { businessId }

        if (dayOfWeek !== undefined) {
            where.dayOfWeek = dayOfWeek
        }

        return await prisma.businessHours.findMany({
            where,
            orderBy: { dayOfWeek: 'asc' }
        })
    }

    /**
     * Get business hours for a specific date, including holiday overrides
     */
    async getBusinessHoursForDate(businessId: string, date: Date): Promise<{
        businessHours: BusinessHours | null
        holiday: BusinessHoliday | null
    }> {
        const dayOfWeek = date.getDay()

        // Get regular business hours for the day
        const businessHours = await prisma.businessHours.findUnique({
            where: {
                businessId_dayOfWeek: {
                    businessId,
                    dayOfWeek
                }
            }
        })

        // Check for holiday override
        const holiday = await prisma.businessHoliday.findUnique({
            where: {
                businessId_date: {
                    businessId,
                    date
                }
            }
        })

        return { businessHours, holiday }
    }

    /**
     * Set business hours for a specific day
     */
    async setBusinessHours(businessId: string, schedule: BusinessSchedule): Promise<BusinessHours> {
        return await prisma.businessHours.upsert({
            where: {
                businessId_dayOfWeek: {
                    businessId,
                    dayOfWeek: schedule.dayOfWeek
                }
            },
            update: {
                openTime: schedule.openTime,
                closeTime: schedule.closeTime,
                isClosed: schedule.isClosed ?? false,
                updatedAt: new Date()
            },
            create: {
                businessId,
                dayOfWeek: schedule.dayOfWeek,
                openTime: schedule.openTime,
                closeTime: schedule.closeTime,
                isClosed: schedule.isClosed ?? false
            }
        })
    }

    /**
     * Set business hours for multiple days
     */
    async setBulkBusinessHours(businessId: string, schedules: BusinessSchedule[]): Promise<BusinessHours[]> {
        const results: BusinessHours[] = []

        for (const schedule of schedules) {
            const result = await this.setBusinessHours(businessId, schedule)
            results.push(result)
        }

        return results
    }

    /**
     * Add or update a holiday
     */
    async addHoliday(businessId: string, holiday: Holiday): Promise<BusinessHoliday> {
        return await prisma.businessHoliday.upsert({
            where: {
                businessId_date: {
                    businessId,
                    date: holiday.date
                }
            },
            update: {
                name: holiday.name,
                isClosed: holiday.isClosed ?? true,
                openTime: holiday.openTime,
                closeTime: holiday.closeTime
            },
            create: {
                businessId,
                date: holiday.date,
                name: holiday.name,
                isClosed: holiday.isClosed ?? true,
                openTime: holiday.openTime,
                closeTime: holiday.closeTime
            }
        })
    }

    /**
     * Get holidays for a business within a date range
     */
    async getHolidays(businessId: string, startDate?: Date, endDate?: Date): Promise<BusinessHoliday[]> {
        const where: any = { businessId }

        if (startDate || endDate) {
            where.date = {}
            if (startDate) where.date.gte = startDate
            if (endDate) where.date.lte = endDate
        }

        return await prisma.businessHoliday.findMany({
            where,
            orderBy: { date: 'asc' }
        })
    }

    /**
     * Remove a holiday
     */
    async removeHoliday(businessId: string, date: Date): Promise<void> {
        await prisma.businessHoliday.delete({
            where: {
                businessId_date: {
                    businessId,
                    date
                }
            }
        })
    }

    /**
     * Check if business is open at a specific date and time
     */
    async isBusinessOpen(businessId: string, dateTime: Date): Promise<boolean> {
        const date = new Date(dateTime.getFullYear(), dateTime.getMonth(), dateTime.getDate())
        const timeString = dateTime.toTimeString().slice(0, 5) // HH:MM format

        const { businessHours, holiday } = await this.getBusinessHoursForDate(businessId, date)

        // Check holiday first
        if (holiday) {
            if (holiday.isClosed) {
                return false
            }
            // Holiday has special hours
            if (holiday.openTime && holiday.closeTime) {
                return timeString >= holiday.openTime && timeString <= holiday.closeTime
            }
        }

        // Check regular business hours
        if (!businessHours || businessHours.isClosed) {
            return false
        }

        if (!businessHours.openTime || !businessHours.closeTime) {
            return false
        }

        return timeString >= businessHours.openTime && timeString <= businessHours.closeTime
    }

    /**
     * Validate business hours format and logic
     */
    async validateBusinessHours(businessId: string, startTime: string, endTime: string, dayOfWeek: number): Promise<{
        isValid: boolean
        errors: string[]
    }> {
        const errors: string[] = []

        // Validate time format (HH:MM)
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
        if (!timeRegex.test(startTime)) {
            errors.push('Invalid start time format. Use HH:MM format.')
        }
        if (!timeRegex.test(endTime)) {
            errors.push('Invalid end time format. Use HH:MM format.')
        }

        // Validate day of week
        if (dayOfWeek < 0 || dayOfWeek > 6) {
            errors.push('Day of week must be between 0 (Sunday) and 6 (Saturday).')
        }

        // Validate time logic
        if (startTime >= endTime) {
            errors.push('Start time must be before end time.')
        }

        // Check for conflicts with existing appointments (if needed)
        // This would require additional logic to check existing appointments

        return {
            isValid: errors.length === 0,
            errors
        }
    }

    /**
     * Get all business hours with holidays for a business
     */
    async getCompleteSchedule(businessId: string, startDate?: Date, endDate?: Date): Promise<{
        businessHours: BusinessHours[]
        holidays: BusinessHoliday[]
    }> {
        const businessHours = await this.getBusinessHours(businessId)
        const holidays = await this.getHolidays(businessId, startDate, endDate)

        return { businessHours, holidays }
    }

    /**
     * Delete business hours for a specific day
     */
    async deleteBusinessHours(businessId: string, dayOfWeek: number): Promise<void> {
        await prisma.businessHours.delete({
            where: {
                businessId_dayOfWeek: {
                    businessId,
                    dayOfWeek
                }
            }
        })
    }

    /**
     * Get business hours with fallback to JSON field for backward compatibility
     */
    async getBusinessHoursWithFallback(businessId: string): Promise<BusinessHours[]> {
        // First try to get from structured table
        const structuredHours = await this.getBusinessHours(businessId)

        if (structuredHours.length > 0) {
            return structuredHours
        }

        // Fallback to JSON field in Business model
        const business = await prisma.business.findUnique({
            where: { id: businessId },
            select: { operatingHours: true }
        })

        if (business?.operatingHours && typeof business.operatingHours === 'object') {
            const jsonHours = business.operatingHours as any
            const fallbackHours: BusinessHours[] = []

            const dayMap: { [key: string]: number } = {
                sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
                thursday: 4, friday: 5, saturday: 6
            }

            for (const [day, hours] of Object.entries(jsonHours)) {
                if (typeof hours === 'object' && hours !== null) {
                    const dayHours = hours as any
                    fallbackHours.push({
                        id: `fallback-${businessId}-${dayMap[day]}`,
                        businessId,
                        dayOfWeek: dayMap[day],
                        openTime: dayHours.isOpen ? dayHours.openTime : null,
                        closeTime: dayHours.isOpen ? dayHours.closeTime : null,
                        isClosed: !dayHours.isOpen,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    } as BusinessHours)
                }
            }

            return fallbackHours
        }

        return []
    }
}
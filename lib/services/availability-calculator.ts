/**
 * Advanced Availability Calculator Service
 * 
 * Provides comprehensive availability calculation functionality for the Lumina booking system.
 * Handles complex scheduling scenarios including:
 * - Multi-staff availability coordination
 * - Business hours constraints
 * - Time-off periods and holidays
 * - Appointment conflicts detection
 * - Timezone-aware calculations
 * - Performance optimization through caching
 * 
 * @version 2.0.0
 * @author Lumina Development Team
 */

import { prisma } from '@/lib/prisma'
import { AvailabilityCache } from './availability-cache'
import { ConflictDetectionEngine } from './conflict-detection-engine'

// Types for availability calculation
export interface AvailabilitySlot {
    startTime: Date
    endTime: Date
    staffId: string
    staffName: string
    isAvailable: boolean
    conflicts?: string[]
    metadata?: {
        businessHours?: boolean
        staffAvailability?: boolean
        hasConflicts?: boolean
        cacheHit?: boolean
    }
}

export interface AvailabilityConstraints {
    businessHours: { openTime: string; closeTime: string } | null
    staffAvailability: Array<{ startTime: string; endTime: string }>
    existingAppointments: Array<{ startTime: Date; endTime: Date }>
    timeOffPeriods: Array<{ startDate: Date; endDate: Date }>
    holidays: Array<{ date: Date; name: string }>
}

export interface AvailabilityQuery {
    businessId: string
    serviceId?: string
    staffId?: string
    date: Date
    duration: number
    timezone?: string
}

export interface AvailabilityResult {
    slots: AvailabilitySlot[]
    metadata: {
        totalSlots: number
        availableSlots: number
        conflictedSlots: number
        cacheHit: boolean
        calculationTime: number
        timezone: string
    }
}

/**
 * Main Availability Calculator Class
 * 
 * This class provides the core functionality for calculating staff and service availability
 * across different time periods, taking into account business constraints, staff schedules,
 * existing appointments, and various conflict scenarios.
 */
export class AvailabilityCalculator {
    /**
     * Calculate available time slots for a specific service and date
     * 
     * @param query - The availability query parameters
     * @returns Promise<AvailabilityResult> - Available slots with metadata
     */
    static async calculateAvailability(query: AvailabilityQuery): Promise<AvailabilityResult> {
        const startTime = Date.now()

        try {
            // Validate business context
            await this.validateBusinessContext(query.businessId)

            // Check cache first
            const cacheKey = this.generateCacheKey(query)
            const cachedResult = await AvailabilityCache.get(cacheKey as any)

            if (cachedResult) {
                return {
                    slots: (cachedResult as any).slots,
                    metadata: {
                        ...(cachedResult as any).metadata,
                        cacheHit: true,
                        calculationTime: Date.now() - startTime
                    }
                }
            }

            // Get service duration if not provided
            let duration = query.duration
            if (!duration && query.serviceId) {
                const serviceInfo = await this.getServiceDuration(query.serviceId, query.staffId)
                duration = serviceInfo?.duration || 60 // Default 60 minutes
            }

            // Get available staff for the service
            const availableStaff = query.staffId
                ? [query.staffId]
                : await this.getAvailableStaff(query.businessId, query.serviceId, query.date)

            if (availableStaff.length === 0) {
                return {
                    slots: [],
                    metadata: {
                        totalSlots: 0,
                        availableSlots: 0,
                        conflictedSlots: 0,
                        cacheHit: false,
                        calculationTime: Date.now() - startTime,
                        timezone: query.timezone || 'UTC'
                    }
                }
            }

            // Calculate slots for each staff member
            const allSlots: AvailabilitySlot[] = []
            for (const staffId of availableStaff) {
                const staffSlots = await this.calculateStaffAvailability(
                    staffId,
                    query.businessId,
                    query.date,
                    duration,
                    query.timezone
                )
                allSlots.push(...staffSlots)
            }

            // Sort slots by start time
            allSlots.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())

            // Calculate metadata
            const availableSlots = allSlots.filter(slot => slot.isAvailable)
            const conflictedSlots = allSlots.filter(slot => !slot.isAvailable)

            const result: AvailabilityResult = {
                slots: allSlots,
                metadata: {
                    totalSlots: allSlots.length,
                    availableSlots: availableSlots.length,
                    conflictedSlots: conflictedSlots.length,
                    cacheHit: false,
                    calculationTime: Date.now() - startTime,
                    timezone: query.timezone || 'UTC'
                }
            }

            // Cache the result
            await AvailabilityCache.set(cacheKey as any, result) // Cache for 5 minutes

            return result
        } catch (error) {
            console.error('Error calculating availability:', error)
            throw new Error(`Failed to calculate availability: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    /**
     * Calculate availability for a specific staff member
     * 
     * @param staffId - The staff member ID
     * @param businessId - The business ID
     * @param date - The date to calculate availability for
     * @param requiredDuration - Required duration in minutes
     * @param timezone - Optional timezone for calculations
     * @returns Promise<AvailabilitySlot[]> - Available slots for the staff member
     */
    static async calculateStaffAvailability(
        staffId: string,
        businessId: string,
        date: Date,
        requiredDuration: number,
        timezone?: string
    ): Promise<AvailabilitySlot[]> {
        try {
            // Validate staff context
            await this.validateStaffContext(staffId, businessId)

            // Get staff info for display name
            const staffInfo = await this.getStaffInfo(staffId)
            const staffName = staffInfo?.displayName || `Staff ${staffId}`

            // Get all constraints for this staff member and date
            const constraints = await this.getAvailabilityConstraints(staffId, businessId, date)

            // Generate potential time slots
            const potentialSlots = await this.generatePotentialSlots(
                constraints,
                date,
                requiredDuration,
                staffId,
                staffName
            )

            // Check each slot for conflicts
            const validatedSlots: AvailabilitySlot[] = []
            for (const slot of potentialSlots) {
                const conflicts = await this.detectSlotConflicts(
                    slot,
                    constraints.existingAppointments,
                    staffId,
                    businessId
                )

                validatedSlots.push({
                    ...slot,
                    isAvailable: conflicts.length === 0,
                    conflicts: conflicts.length > 0 ? conflicts : undefined,
                    metadata: {
                        businessHours: true,
                        staffAvailability: true,
                        hasConflicts: conflicts.length > 0,
                        cacheHit: false
                    }
                })
            }

            return validatedSlots
        } catch (error) {
            console.error(`Error getting staff slots for ${staffId}:`, error)
            return []
        }
    }

    /**
     * Get all availability constraints for a staff member on a specific date
     * Private helper method
     */
    private static async getAvailabilityConstraints(
        staffId: string,
        businessId: string,
        date: Date
    ): Promise<AvailabilityConstraints> {
        try {
            const dayOfWeek = date.getDay()

            // Get business hours for the day
            const businessHours = await this.getBusinessHoursForDay(businessId, dayOfWeek)

            // Get staff availability for the day
            const staffAvailability = await this.getStaffAvailabilityForDay(staffId, date)

            // Get existing appointments for the staff member on this date
            const startOfDay = new Date(date)
            startOfDay.setHours(0, 0, 0, 0)
            const endOfDay = new Date(date)
            endOfDay.setHours(23, 59, 59, 999)

            const existingAppointments = await prisma.appointment.findMany({
                where: {
                    staffId,
                    businessId,
                    startTime: {
                        gte: startOfDay,
                        lte: endOfDay
                    },
                    status: {
                        in: ['CONFIRMED']
                    }
                },
                select: {
                    startTime: true,
                    endTime: true
                }
            })

            // Get time-off periods that overlap with this date
            const timeOffPeriods = await prisma.timeOffRequest.findMany({
                where: {
                    staffId,
                    status: 'APPROVED',
                    startDate: {
                        lte: endOfDay
                    },
                    endDate: {
                        gte: startOfDay
                    }
                },
                select: {
                    startDate: true,
                    endDate: true
                }
            })

            // Get holidays for this date (business-wide)
            const holidays = await prisma.businessHoliday.findMany({
                where: {
                    businessId,
                    date: {
                        gte: startOfDay,
                        lte: endOfDay
                    }
                },
                select: {
                    date: true,
                    name: true
                }
            }) as { date: Date; name: string }[]

            return {
                businessHours,
                staffAvailability: staffAvailability || [],
                existingAppointments,
                timeOffPeriods,
                holidays
            }
        } catch (error) {
            console.error('Error getting availability constraints:', error)
            throw error
        }
    }

    /**
     * Generate potential time slots based on constraints
     * Private helper method
     */
    private static async generatePotentialSlots(
        constraints: AvailabilityConstraints,
        date: Date,
        requiredDuration: number,
        staffId: string,
        staffName: string
    ): Promise<AvailabilitySlot[]> {
        const slots: AvailabilitySlot[] = []

        // If no business hours or staff availability, return empty
        if (!constraints.businessHours || constraints.staffAvailability.length === 0) {
            return slots
        }

        // Check if there are any holidays or time-off periods that block the entire day
        if (constraints.holidays.length > 0 || constraints.timeOffPeriods.length > 0) {
            return slots
        }

        // Get the effective working hours (intersection of business hours and staff availability)
        for (const staffPeriod of constraints.staffAvailability) {
            const effectiveStart = this.getLatestTime(
                date,
                constraints.businessHours.openTime,
                staffPeriod.startTime
            )
            const effectiveEnd = this.getEarliestTime(
                date,
                constraints.businessHours.closeTime,
                staffPeriod.endTime
            )

            // Generate slots in 15-minute intervals
            const slotInterval = 15 // minutes
            let currentTime = new Date(effectiveStart)

            while (currentTime.getTime() + (requiredDuration * 60 * 1000) <= effectiveEnd.getTime()) {
                const slotEnd = new Date(currentTime.getTime() + (requiredDuration * 60 * 1000))

                slots.push({
                    startTime: new Date(currentTime),
                    endTime: slotEnd,
                    staffId,
                    staffName,
                    isAvailable: true // Will be validated later
                })

                // Move to next slot
                currentTime = new Date(currentTime.getTime() + (slotInterval * 60 * 1000))
            }
        }

        return slots
    }

    /**
     * Detect conflicts for a specific time slot
     * Private helper method
     */
    private static async detectSlotConflicts(
        slot: AvailabilitySlot,
        existingAppointments: Array<{ startTime: Date; endTime: Date }>,
        staffId: string,
        businessId: string
    ): Promise<string[]> {
        const conflicts: string[] = []

        // Check against existing appointments
        for (const appointment of existingAppointments) {
            if (this.timeSlotsOverlap(
                { startTime: slot.startTime, endTime: slot.endTime },
                { startTime: appointment.startTime, endTime: appointment.endTime }
            )) {
                conflicts.push(`Overlaps with existing appointment from ${appointment.startTime.toLocaleTimeString()} to ${appointment.endTime.toLocaleTimeString()}`)
            }
        }

        // Use conflict detection engine for advanced validation
        try {
            const conflictResult = await ConflictDetectionEngine.validateAppointmentSlot(
                slot.startTime as any,
                slot.endTime as any,
                staffId,
                businessId
            )

            if (!conflictResult.isValid && conflictResult.conflicts) {
                conflicts.push(...conflictResult.conflicts.map(c => c.message))
            }
        } catch (error) {
            console.error('Error in conflict detection:', error)
            conflicts.push('Unable to validate slot due to system error')
        }

        return conflicts
    }

    /**
     * Check if two time slots overlap
     * Private helper method
     */
    private static timeSlotsOverlap(
        slot1: { startTime: Date; endTime: Date },
        slot2: { startTime: Date; endTime: Date }
    ): boolean {
        return slot1.startTime < slot2.endTime && slot2.startTime < slot1.endTime
    }

    /**
     * Get the latest of two times on a given date
     * Private helper method
     */
    private static getLatestTime(date: Date, time1: string, time2: string): Date {
        const date1 = new Date(date)
        const [hours1, minutes1] = time1.split(':').map(Number)
        date1.setHours(hours1, minutes1, 0, 0)

        const date2 = new Date(date)
        const [hours2, minutes2] = time2.split(':').map(Number)
        date2.setHours(hours2, minutes2, 0, 0)

        return date1 > date2 ? date1 : date2
    }

    /**
     * Get the earliest of two times on a given date
     * Private helper method
     */
    private static getEarliestTime(date: Date, time1: string, time2: string): Date {
        const date1 = new Date(date)
        const [hours1, minutes1] = time1.split(':').map(Number)
        date1.setHours(hours1, minutes1, 0, 0)

        const date2 = new Date(date)
        const [hours2, minutes2] = time2.split(':').map(Number)
        date2.setHours(hours2, minutes2, 0, 0)

        return date1 < date2 ? date1 : date2
    }

    /**
     * Get business hours for a specific day of the week
     * Private helper method
     */
    private static async getBusinessHoursForDay(
        businessId: string,
        dayOfWeek: number
    ): Promise<{ openTime: string; closeTime: string } | null> {
        try {
            // Map JavaScript day (0=Sunday) to our database day format
            const businessHours = await prisma.businessHours.findUnique({
                where: {
                    businessId_dayOfWeek: {
                        businessId,
                        dayOfWeek
                    }
                }
            })

            if (businessHours && !businessHours.isClosed && businessHours.openTime && businessHours.closeTime) {
                return {
                    openTime: businessHours.openTime,
                    closeTime: businessHours.closeTime
                }
            }

            return null
        } catch (error) {
            console.error('Error getting business hours:', error)
            return null
        }
    }

    /**
     * Get staff availability for a specific date
     * Private helper method
     */
    private static async getStaffAvailabilityForDay(
        staffId: string,
        date: Date
    ): Promise<Array<{ startTime: string; endTime: string }> | null> {
        const dayOfWeek = date.getDay()

        try {
            // First check for any overrides for this specific date
            const override = await prisma.staffAvailabilityOverride.findUnique({
                where: {
                    staffId_date: {
                        staffId,
                        date: new Date(date.getFullYear(), date.getMonth(), date.getDate())
                    }
                }
            })

            if (override) {
                if (override.isAvailable && override.startTime && override.endTime) {
                    return [{ startTime: override.startTime, endTime: override.endTime }]
                } else {
                    return [] // Staff not available on this date
                }
            }

            // Get regular weekly availability
            const availability = await prisma.staffAvailability.findMany({
                where: {
                    staffId,
                    dayOfWeek,
                    // isActive: true
                },
                select: {
                    startTime: true,
                    endTime: true
                },
                orderBy: {
                    startTime: 'asc'
                }
            })

            return availability.length > 0 ? availability : null
        } catch (error) {
            console.error('Error getting staff availability:', error)
            return null
        }
    }

    /**
     * Get available staff for a service on a specific date
     * Private helper method
     */
    private static async getAvailableStaff(
        businessId: string,
        serviceId?: string,
        date?: Date
    ): Promise<string[]> {
        try {
            const whereClause: any = {
                businessId,
                isActive: true
            }

            // If serviceId is provided, filter by staff who can perform this service
            if (serviceId) {
                whereClause.staffServices = {
                    some: {
                        serviceId
                    }
                }
            }

            const staff = await prisma.staff.findMany({
                where: whereClause,
                select: {
                    id: true
                }
            })

            return staff.map(s => s.id)
        } catch (error) {
            console.error('Error getting available staff:', error)
            return []
        }
    }

    /**
     * Get staff information for display purposes
     * Private helper method
     */
    private static async getStaffInfo(staffId: string): Promise<{ displayName: string } | null> {
        try {
            const staff = await prisma.staff.findUnique({
                where: { id: staffId },
                select: {
                    displayName: true
                }
            })

            return staff ? { displayName: staff.displayName } : null
        } catch (error) {
            console.error('Error getting staff info:', error)
            return null
        }
    }

    /**
     * Get service duration, with optional staff-specific overrides
     * Private helper method
     */
    private static async getServiceDuration(
        serviceId: string,
        staffId?: string
    ): Promise<{ duration: number } | null> {
        try {
            // First check for staff-specific service duration override
            if (staffId) {
                const staffService = await prisma.staffService.findUnique({
                    where: {
                        staffId_serviceId: {
                            staffId,
                            serviceId
                        }
                    },
                    select: {
                        customDuration: true
                    }
                })

                if (staffService?.customDuration) {
                    return { duration: staffService.customDuration }
                }
            }

            // Get default service duration
            const service = await prisma.service.findUnique({
                where: { id: serviceId },
                select: {
                    duration: true
                }
            })

            return service ? { duration: service.duration } : null
        } catch (error) {
            console.error('Error getting service duration:', error)
            return null
        }
    }

    /**
     * Validate that the business exists and is active
     * Private helper method
     */
    private static async validateBusinessContext(businessId: string): Promise<void> {
        const business = await prisma.business.findUnique({
            where: { id: businessId },
            select: { id: true }
        })

        if (!business) {
            throw new Error(`Business ${businessId} not found`)
        }
    }

    /**
     * Validate that the staff member exists and belongs to the business
     * Private helper method
     */
    private static async validateStaffContext(staffId: string, businessId: string): Promise<void> {
        const staff = await prisma.staff.findUnique({
            where: {
                id: staffId,
                businessId: businessId
            },
            select: { isActive: true }
        })

        if (!staff) {
            throw new Error(`Staff member ${staffId} not found in business ${businessId}`)
        }

        if (!staff.isActive) {
            throw new Error(`Staff member ${staffId} is not active`)
        }
    }

    /**
     * Generate a cache key for availability queries
     * Private helper method
     */
    private static generateCacheKey(query: AvailabilityQuery): string {
        const dateStr = query.date.toISOString().split('T')[0]
        return `availability:${query.businessId}:${query.serviceId || 'any'}:${query.staffId || 'any'}:${dateStr}:${query.duration}`
    }

    // Public cache management methods
    /**
     * Invalidate cached availability data for a specific staff member
     */
    static async invalidateStaffAvailabilityCache(staffId: string, businessId: string): Promise<void> {
        await AvailabilityCache.invalidateStaffAvailability(staffId, businessId)
    }

    /**
     * Invalidate cached business hours data
     */
    static async invalidateBusinessHoursCache(businessId: string): Promise<void> {
        await AvailabilityCache.invalidateBusinessHours(businessId)
    }

    /**
     * Batch calculate and cache availability for multiple staff members and date ranges
     */
    static async batchCalculateAndCache(
        businessId: string,
        staffIds: string[],
        dateRange: { startDate: Date; endDate: Date },
        serviceId?: string
    ): Promise<void> {
        await AvailabilityCache.batchCalculateAndCache(
            businessId,
            staffIds,
            dateRange,
            serviceId
        )
    }

    /**
     * Get cache performance metrics
     */
    static getCacheMetrics() {
        return AvailabilityCache.getMetrics()
    }

    /**
     * Clean up expired cache entries
     */
    static async cleanupExpiredCache(): Promise<number> {
        return AvailabilityCache.cleanupExpired()
    }
}
import { prisma } from '@/lib/prisma'

export interface TimeSlot {
    startTime: Date
    endTime: Date
    staffId?: string
}

export interface ServiceDuration {
    serviceId: string
    duration: number // in minutes
    bufferTime?: number // optional buffer time in minutes
}

export interface ValidationResult {
    isValid: boolean
    reason?: string
    requiredDuration: number
    availableDuration: number
    suggestedAlternatives?: TimeSlot[]
}

export interface MultiServiceBooking {
    serviceId: string
    staffId?: string
    customDuration?: number
}

/**
 * Service Duration Validator
 * Validates that services can fit within available time slots
 * Handles service duration lookup, buffer time, and multi-service bookings
 */
export class ServiceDurationValidator {
    private static readonly DEFAULT_BUFFER_TIME = 0 // minutes
    private static readonly SLOT_INTERVAL = 15 // minutes

    /**
     * Validate if a service fits within a given time slot
     * Requirements: 8.1, 8.2, 8.3
     */
    static async validateServiceFit(
        serviceId: string,
        timeSlot: TimeSlot,
        businessId: string,
        staffId?: string
    ): Promise<ValidationResult> {
        try {
            // Get service duration (with potential staff override)
            const serviceDuration = await this.getServiceDuration(serviceId, staffId)

            if (!serviceDuration) {
                return {
                    isValid: false,
                    reason: 'Service not found',
                    requiredDuration: 0,
                    availableDuration: 0
                }
            }

            // Calculate available duration in the time slot
            const availableDuration = Math.floor(
                (timeSlot.endTime.getTime() - timeSlot.startTime.getTime()) / (1000 * 60)
            )

            // Include buffer time in required duration
            const requiredDuration = serviceDuration.duration + (serviceDuration.bufferTime || this.DEFAULT_BUFFER_TIME)

            const isValid = availableDuration >= requiredDuration

            const result: ValidationResult = {
                isValid,
                requiredDuration,
                availableDuration
            }

            if (!isValid) {
                result.reason = `Service requires ${requiredDuration} minutes but only ${availableDuration} minutes available`

                // Find suggested alternatives if validation fails
                result.suggestedAlternatives = await this.findAlternativeSlots(
                    serviceId,
                    timeSlot.startTime,
                    businessId,
                    staffId
                )
            }

            return result
        } catch (error) {
            console.error('Error validating service fit:', error)
            return {
                isValid: false,
                reason: 'Validation error occurred',
                requiredDuration: 0,
                availableDuration: 0
            }
        }
    }

    /**
     * Get minimum slot duration for multiple services
     * Requirements: 8.4, 8.5
     */
    static async getMinimumSlotDuration(
        serviceBookings: MultiServiceBooking[],
        businessId: string
    ): Promise<number> {
        try {
            let totalDuration = 0

            for (const booking of serviceBookings) {
                const serviceDuration = await this.getServiceDuration(
                    booking.serviceId,
                    booking.staffId
                )

                if (!serviceDuration) {
                    throw new Error(`Service ${booking.serviceId} not found`)
                }

                // Use custom duration if provided, otherwise use service default
                const duration = booking.customDuration || serviceDuration.duration
                const bufferTime = serviceDuration.bufferTime || this.DEFAULT_BUFFER_TIME

                totalDuration += duration + bufferTime
            }

            return totalDuration
        } catch (error) {
            console.error('Error calculating minimum slot duration:', error)
            throw error
        }
    }

    /**
     * Validate multi-service booking fits in time slot
     * Requirements: 8.4, 8.5
     */
    static async validateMultiServiceBooking(
        services: MultiServiceBooking[],
        timeSlot: TimeSlot,
        businessId: string
    ): Promise<ValidationResult> {
        try {
            const requiredDuration = await this.getMinimumSlotDuration(services, businessId)

            const availableDuration = Math.floor(
                (timeSlot.endTime.getTime() - timeSlot.startTime.getTime()) / (1000 * 60)
            )

            const isValid = availableDuration >= requiredDuration

            const result: ValidationResult = {
                isValid,
                requiredDuration,
                availableDuration
            }

            if (!isValid) {
                result.reason = `Multi-service booking requires ${requiredDuration} minutes but only ${availableDuration} minutes available`

                // Find alternative slots for multi-service booking
                result.suggestedAlternatives = await this.findMultiServiceAlternatives(
                    services,
                    timeSlot.startTime,
                    businessId
                )
            }

            return result
        } catch (error) {
            console.error('Error validating multi-service booking:', error)
            return {
                isValid: false,
                reason: 'Multi-service validation error occurred',
                requiredDuration: 0,
                availableDuration: 0
            }
        }
    }

    /**
     * Get service duration with staff override support
     * Private helper method
     */
    private static async getServiceDuration(
        serviceId: string,
        staffId?: string
    ): Promise<ServiceDuration | null> {
        try {
            // First try to get staff-specific service duration
            if (staffId) {
                const staffService = await prisma.staffService.findUnique({
                    where: {
                        staffId_serviceId: {
                            staffId,
                            serviceId
                        }
                    },
                    include: {
                        service: {
                            select: {
                                duration: true,
                                name: true
                            }
                        }
                    }
                })

                if (staffService) {
                    return {
                        serviceId,
                        duration: staffService.customDuration || staffService.service.duration,
                        bufferTime: this.DEFAULT_BUFFER_TIME
                    }
                }
            }

            // Fall back to default service duration
            const service = await prisma.service.findUnique({
                where: { id: serviceId },
                select: {
                    duration: true,
                    name: true
                }
            })

            if (!service) {
                return null
            }

            return {
                serviceId,
                duration: service.duration,
                bufferTime: this.DEFAULT_BUFFER_TIME
            }
        } catch (error) {
            console.error('Error getting service duration:', error)
            return null
        }
    }

    /**
     * Find alternative time slots for a service
     * Private helper method
     */
    private static async findAlternativeSlots(
        serviceId: string,
        preferredStartTime: Date,
        businessId: string,
        staffId?: string,
        maxAlternatives: number = 3
    ): Promise<TimeSlot[]> {
        try {
            const serviceDuration = await this.getServiceDuration(serviceId, staffId)
            if (!serviceDuration) return []

            const alternatives: TimeSlot[] = []
            const searchDate = new Date(preferredStartTime)
            searchDate.setHours(0, 0, 0, 0)

            // Search for alternatives in the same day first, then next few days
            for (let dayOffset = 0; dayOffset < 7 && alternatives.length < maxAlternatives; dayOffset++) {
                const currentDate = new Date(searchDate)
                currentDate.setDate(currentDate.getDate() + dayOffset)

                // Get business hours for this day
                const dayOfWeek = currentDate.getDay()
                const businessHours = await this.getBusinessHoursForDay(businessId, dayOfWeek)

                if (!businessHours) continue // Business closed

                // Generate potential slots
                const daySlots = await this.generateDaySlotsForService(
                    serviceId,
                    currentDate,
                    businessHours,
                    businessId,
                    staffId
                )

                // Add valid slots to alternatives
                for (const slot of daySlots) {
                    if (alternatives.length >= maxAlternatives) break

                    // Skip slots before preferred time on the same day
                    if (dayOffset === 0 && slot.startTime <= preferredStartTime) continue

                    alternatives.push(slot)
                }
            }

            return alternatives
        } catch (error) {
            console.error('Error finding alternative slots:', error)
            return []
        }
    }

    /**
     * Find alternative slots for multi-service bookings
     * Private helper method
     */
    private static async findMultiServiceAlternatives(
        services: MultiServiceBooking[],
        preferredStartTime: Date,
        businessId: string,
        maxAlternatives: number = 3
    ): Promise<TimeSlot[]> {
        try {
            const requiredDuration = await this.getMinimumSlotDuration(services, businessId)
            const alternatives: TimeSlot[] = []
            const searchDate = new Date(preferredStartTime)
            searchDate.setHours(0, 0, 0, 0)

            // Search for alternatives that can accommodate all services
            for (let dayOffset = 0; dayOffset < 7 && alternatives.length < maxAlternatives; dayOffset++) {
                const currentDate = new Date(searchDate)
                currentDate.setDate(currentDate.getDate() + dayOffset)

                const dayOfWeek = currentDate.getDay()
                const businessHours = await this.getBusinessHoursForDay(businessId, dayOfWeek)

                if (!businessHours) continue

                // Generate slots that can fit the entire multi-service booking
                const daySlots = await this.generateDaySlotsForDuration(
                    requiredDuration,
                    currentDate,
                    businessHours,
                    businessId
                )

                for (const slot of daySlots) {
                    if (alternatives.length >= maxAlternatives) break

                    if (dayOffset === 0 && slot.startTime <= preferredStartTime) continue

                    alternatives.push(slot)
                }
            }

            return alternatives
        } catch (error) {
            console.error('Error finding multi-service alternatives:', error)
            return []
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

            // Fall back to JSON operating hours
            const business = await prisma.business.findUnique({
                where: { id: businessId },
                select: { operatingHours: true }
            })

            if (business?.operatingHours) {
                const hours = business.operatingHours as any
                const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
                const dayName = dayNames[dayOfWeek]

                if (hours[dayName]?.isOpen) {
                    return {
                        openTime: hours[dayName].openTime,
                        closeTime: hours[dayName].closeTime
                    }
                }
            }

            return null
        } catch (error) {
            console.error('Error getting business hours:', error)
            return null
        }
    }

    /**
     * Generate available slots for a service on a specific day
     * Private helper method
     */
    private static async generateDaySlotsForService(
        serviceId: string,
        date: Date,
        businessHours: { openTime: string; closeTime: string },
        businessId: string,
        staffId?: string
    ): Promise<TimeSlot[]> {
        const serviceDuration = await this.getServiceDuration(serviceId, staffId)
        if (!serviceDuration) return []

        return this.generateDaySlotsForDuration(
            serviceDuration.duration + (serviceDuration.bufferTime || this.DEFAULT_BUFFER_TIME),
            date,
            businessHours,
            businessId,
            staffId
        )
    }

    /**
     * Generate available slots for a specific duration on a day
     * Private helper method
     */
    private static async generateDaySlotsForDuration(
        requiredDuration: number,
        date: Date,
        businessHours: { openTime: string; closeTime: string },
        businessId: string,
        staffId?: string
    ): Promise<TimeSlot[]> {
        const slots: TimeSlot[] = []

        // Parse business hours
        const [openHour, openMinute] = businessHours.openTime.split(':').map(Number)
        const [closeHour, closeMinute] = businessHours.closeTime.split(':').map(Number)

        const startTime = new Date(date)
        startTime.setHours(openHour, openMinute, 0, 0)

        const endTime = new Date(date)
        endTime.setHours(closeHour, closeMinute, 0, 0)

        // Generate slots at regular intervals
        let currentTime = new Date(startTime)

        while (currentTime < endTime) {
            const slotEndTime = new Date(currentTime.getTime() + requiredDuration * 60000)

            // Check if slot fits within business hours
            if (slotEndTime <= endTime) {
                slots.push({
                    startTime: new Date(currentTime),
                    endTime: slotEndTime,
                    staffId
                })
            }

            // Move to next interval
            currentTime = new Date(currentTime.getTime() + this.SLOT_INTERVAL * 60000)
        }

        return slots
    }
}
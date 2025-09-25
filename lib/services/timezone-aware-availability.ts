/**
 * Time Zone Aware Availability Calculator
 * 
 * Extends the existing availability calculator with comprehensive timezone support,
 * ensuring all availability calculations are timezone-aware and handle DST transitions.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { DateTime } from 'luxon'
import { BusinessHoursRepository } from '../repositories/business-hours-repository-enhanced'
import { StaffAvailabilityRepository } from '../repositories/staff-availability-repository-enhanced'
import { AvailabilityCalculator } from './availability-calculator'
import { MultiLocationTimeZoneManager, TimeZoneHandler } from './timezone-handler'

export interface TimeZoneAwareAvailabilityRequest {
    businessId: string
    staffId?: string
    serviceId?: string
    date: string // YYYY-MM-DD format
    timezone: string // Client's preferred timezone for display
    locationId?: string // For multi-location businesses
}

export interface TimeZoneAwareTimeSlot {
    utcStart: DateTime
    utcEnd: DateTime
    localStart: string // HH:MM in requested timezone
    localEnd: string   // HH:MM in requested timezone
    localDate: string  // YYYY-MM-DD in requested timezone
    businessTimezone: string
    displayTimezone: string
    duration: number // minutes
    isDSTTransition?: boolean
    dstWarning?: string
}

export interface BusinessHoursWithTimeZone {
    dayOfWeek: number
    openTime: string
    closeTime: string
    isClosed: boolean
    timezone: string
    utcOpenTime?: DateTime
    utcCloseTime?: DateTime
    dstTransition?: boolean
}

/**
 * Time zone aware availability calculator
 */
export class TimeZoneAwareAvailabilityCalculator {
    private availabilityCalculator: AvailabilityCalculator
    private businessHoursRepo: BusinessHoursRepository
    private staffAvailabilityRepo: StaffAvailabilityRepository

    constructor(
        availabilityCalculator: AvailabilityCalculator,
        businessHoursRepo: BusinessHoursRepository,
        staffAvailabilityRepo: StaffAvailabilityRepository
    ) {
        this.availabilityCalculator = availabilityCalculator
        this.businessHoursRepo = businessHoursRepo
        this.staffAvailabilityRepo = staffAvailabilityRepo
    }

    /**
     * Gets available time slots with full timezone awareness
     */
    async getAvailableSlots(
        request: TimeZoneAwareAvailabilityRequest
    ): Promise<TimeZoneAwareTimeSlot[]> {
        // Validate timezone
        if (!TimeZoneHandler.validateTimeZone(request.timezone)) {
            throw new Error(`Invalid timezone: ${request.timezone}`)
        }

        // Get business timezone
        const businessTimezone = await this.getBusinessTimeZone(request.businessId, request.locationId)

        // Get business hours in business timezone
        const businessHours = await this.getBusinessHoursWithTimeZone(
            request.businessId,
            request.date,
            businessTimezone
        )

        if (businessHours.isClosed) {
            return []
        }

        // Get staff availability in business timezone
        const staffAvailability = request.staffId
            ? await this.getStaffAvailabilityWithTimeZone(
                request.staffId,
                request.date,
                businessTimezone
            )
            : null

        // Calculate base availability using existing calculator
        const baseSlots = await this.availabilityCalculator.getAvailableSlots({
            businessId: request.businessId,
            staffId: request.staffId,
            serviceId: request.serviceId,
            date: request.date,
            duration: 60 // Default duration, will be adjusted based on service
        })

        // Convert to timezone-aware slots
        const timeZoneAwareSlots: TimeZoneAwareTimeSlot[] = []

        for (const slot of baseSlots) {
            try {
                // Convert slot times to proper DateTime objects
                const utcStart = this.parseSlotTime(slot.startTime, request.date, businessTimezone)
                const utcEnd = this.parseSlotTime(slot.endTime, request.date, businessTimezone)

                // Convert to display timezone
                const localSlot = TimeZoneHandler.timeSlotToLocal(
                    utcStart,
                    utcEnd,
                    request.timezone
                )

                // Check for DST transitions
                const dstInfo = TimeZoneHandler.handleDSTTransition(
                    localSlot.start,
                    localSlot.end,
                    localSlot.date,
                    request.timezone
                )

                timeZoneAwareSlots.push({
                    utcStart,
                    utcEnd,
                    localStart: localSlot.start,
                    localEnd: localSlot.end,
                    localDate: localSlot.date,
                    businessTimezone,
                    displayTimezone: request.timezone,
                    duration: utcEnd.diff(utcStart, 'minutes').minutes,
                    isDSTTransition: dstInfo.dstTransition,
                    dstWarning: dstInfo.dstTransition
                        ? `DST transition detected: ${dstInfo.transitionType}`
                        : undefined
                })
            } catch (error) {
                console.error('Error processing time slot:', error)
                // Skip invalid slots
                continue
            }
        }

        return timeZoneAwareSlots
    }

    /**
     * Validates an appointment time across timezones
     */
    async validateAppointmentTime(
        businessId: string,
        staffId: string,
        appointmentStart: string, // HH:MM format
        appointmentEnd: string,   // HH:MM format
        date: string,             // YYYY-MM-DD format
        clientTimezone: string,
        locationId?: string
    ): Promise<{
        isValid: boolean
        errors: string[]
        warnings: string[]
        utcStart?: DateTime
        utcEnd?: DateTime
    }> {
        const errors: string[] = []
        const warnings: string[] = []

        // Validate client timezone
        if (!TimeZoneHandler.validateTimeZone(clientTimezone)) {
            errors.push(`Invalid client timezone: ${clientTimezone}`)
            return { isValid: false, errors, warnings }
        }

        // Get business timezone
        const businessTimezone = await this.getBusinessTimeZone(businessId, locationId)

        // Check if the time is valid in client timezone (handles DST gaps)
        if (!TimeZoneHandler.isValidTimeInZone(appointmentStart, date, clientTimezone)) {
            errors.push(`Invalid appointment start time in timezone ${clientTimezone}: ${appointmentStart}`)
        }

        if (!TimeZoneHandler.isValidTimeInZone(appointmentEnd, date, clientTimezone)) {
            errors.push(`Invalid appointment end time in timezone ${clientTimezone}: ${appointmentEnd}`)
        }

        if (errors.length > 0) {
            return { isValid: false, errors, warnings }
        }

        // Convert to UTC for validation
        const utcStart = TimeZoneHandler.localToUTC(appointmentStart, date, clientTimezone)
        const utcEnd = TimeZoneHandler.localToUTC(appointmentEnd, date, clientTimezone)

        // Check for DST transitions
        const dstInfo = TimeZoneHandler.handleDSTTransition(
            appointmentStart,
            appointmentEnd,
            date,
            clientTimezone
        )

        if (dstInfo.dstTransition) {
            warnings.push(
                `Appointment time falls on DST transition (${dstInfo.transitionType}). ` +
                `Please verify the appointment time with the client.`
            )
        }

        // Validate against business hours in business timezone
        const businessHours = await this.getBusinessHoursWithTimeZone(
            businessId,
            date,
            businessTimezone
        )

        if (businessHours.isClosed) {
            errors.push('Business is closed on this date')
        } else if (businessHours.utcOpenTime && businessHours.utcCloseTime) {
            if (utcStart < businessHours.utcOpenTime) {
                errors.push('Appointment starts before business opens')
            }
            if (utcEnd > businessHours.utcCloseTime) {
                errors.push('Appointment ends after business closes')
            }
        }

        // Validate against staff availability
        const staffAvailability = await this.getStaffAvailabilityWithTimeZone(
            staffId,
            date,
            businessTimezone
        )

        if (staffAvailability.length === 0) {
            errors.push('Staff member is not available on this date')
        } else {
            const isWithinStaffHours = staffAvailability.some(availability => {
                return availability.utcOpenTime && availability.utcCloseTime &&
                    utcStart >= availability.utcOpenTime &&
                    utcEnd <= availability.utcCloseTime
            })

            if (!isWithinStaffHours) {
                errors.push('Appointment is outside staff availability hours')
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            utcStart,
            utcEnd
        }
    }

    /**
     * Converts existing availability data to timezone-aware format
     */
    async convertToTimeZoneAware(
        businessId: string,
        existingSlots: Array<{
            startTime: string
            endTime: string
            date: string
        }>,
        targetTimezone: string,
        locationId?: string
    ): Promise<TimeZoneAwareTimeSlot[]> {
        const businessTimezone = await this.getBusinessTimeZone(businessId, locationId)
        const timeZoneAwareSlots: TimeZoneAwareTimeSlot[] = []

        for (const slot of existingSlots) {
            try {
                // Assume existing slots are in business timezone
                const utcStart = TimeZoneHandler.localToUTC(slot.startTime, slot.date, businessTimezone)
                const utcEnd = TimeZoneHandler.localToUTC(slot.endTime, slot.date, businessTimezone)

                // Convert to target timezone
                const localSlot = TimeZoneHandler.timeSlotToLocal(utcStart, utcEnd, targetTimezone)

                // Check for DST transitions
                const dstInfo = TimeZoneHandler.handleDSTTransition(
                    localSlot.start,
                    localSlot.end,
                    localSlot.date,
                    targetTimezone
                )

                timeZoneAwareSlots.push({
                    utcStart,
                    utcEnd,
                    localStart: localSlot.start,
                    localEnd: localSlot.end,
                    localDate: localSlot.date,
                    businessTimezone,
                    displayTimezone: targetTimezone,
                    duration: utcEnd.diff(utcStart, 'minutes').minutes,
                    isDSTTransition: dstInfo.dstTransition,
                    dstWarning: dstInfo.dstTransition
                        ? `DST transition detected: ${dstInfo.transitionType}`
                        : undefined
                })
            } catch (error) {
                console.error('Error converting slot to timezone-aware:', error)
                continue
            }
        }

        return timeZoneAwareSlots
    }

    /**
     * Gets business hours with timezone information
     */
    private async getBusinessHoursWithTimeZone(
        businessId: string,
        date: string,
        timezone: string
    ): Promise<BusinessHoursWithTimeZone> {
        const dateObj = DateTime.fromFormat(date, 'yyyy-MM-dd')
        const dayOfWeek = dateObj.weekday % 7 // Convert to 0-6 format

        const businessHours = await this.businessHoursRepo.getBusinessHours(businessId, dayOfWeek)

        if (!businessHours || businessHours.isClosed) {
            return {
                dayOfWeek,
                openTime: '',
                closeTime: '',
                isClosed: true,
                timezone
            }
        }

        // Convert business hours to UTC for comparison
        let utcOpenTime: DateTime | undefined
        let utcCloseTime: DateTime | undefined

        if (businessHours.openTime && businessHours.closeTime) {
            try {
                utcOpenTime = TimeZoneHandler.localToUTC(businessHours.openTime, date, timezone)
                utcCloseTime = TimeZoneHandler.localToUTC(businessHours.closeTime, date, timezone)
            } catch (error) {
                console.error('Error converting business hours to UTC:', error)
            }
        }

        // Check for DST transition
        const dstInfo = businessHours.openTime && businessHours.closeTime
            ? TimeZoneHandler.handleDSTTransition(
                businessHours.openTime,
                businessHours.closeTime,
                date,
                timezone
            )
            : { dstTransition: false }

        return {
            dayOfWeek,
            openTime: businessHours.openTime || '',
            closeTime: businessHours.closeTime || '',
            isClosed: businessHours.isClosed,
            timezone,
            utcOpenTime,
            utcCloseTime,
            dstTransition: dstInfo.dstTransition
        }
    }

    /**
     * Gets staff availability with timezone information
     */
    private async getStaffAvailabilityWithTimeZone(
        staffId: string,
        date: string,
        timezone: string
    ): Promise<BusinessHoursWithTimeZone[]> {
        const dateObj = DateTime.fromFormat(date, 'yyyy-MM-dd')
        const dayOfWeek = dateObj.weekday % 7

        const availability = await this.staffAvailabilityRepo.getStaffAvailability(
            staffId,
            dateObj.toJSDate(),
            dateObj.plus({ days: 1 }).toJSDate()
        )

        return availability
            .filter(slot => slot.dayOfWeek === dayOfWeek)
            .map(slot => {
                let utcOpenTime: DateTime | undefined
                let utcCloseTime: DateTime | undefined

                if (slot.startTime && slot.endTime) {
                    try {
                        utcOpenTime = TimeZoneHandler.localToUTC(slot.startTime, date, timezone)
                        utcCloseTime = TimeZoneHandler.localToUTC(slot.endTime, date, timezone)
                    } catch (error) {
                        console.error('Error converting staff availability to UTC:', error)
                    }
                }

                const dstInfo = slot.startTime && slot.endTime
                    ? TimeZoneHandler.handleDSTTransition(
                        slot.startTime,
                        slot.endTime,
                        date,
                        timezone
                    )
                    : { dstTransition: false }

                return {
                    dayOfWeek: slot.dayOfWeek,
                    openTime: slot.startTime || '',
                    closeTime: slot.endTime || '',
                    isClosed: !slot.startTime || !slot.endTime,
                    timezone,
                    utcOpenTime,
                    utcCloseTime,
                    dstTransition: dstInfo.dstTransition
                }
            })
    }

    /**
     * Gets business timezone, with fallback to default
     */
    private async getBusinessTimeZone(businessId: string, locationId?: string): Promise<string> {
        // This would typically fetch from database
        // For now, return default timezone
        return 'America/New_York'
    }

    /**
     * Parses slot time string to DateTime object
     */
    private parseSlotTime(timeStr: string, date: string, timezone: string): DateTime {
        // Handle different time formats that might come from existing calculator
        if (timeStr.includes('T')) {
            // ISO format
            return DateTime.fromISO(timeStr).toUTC()
        } else {
            // HH:MM format
            return TimeZoneHandler.localToUTC(timeStr, date, timezone)
        }
    }
}

/**
 * Multi-location timezone-aware availability manager
 */
export class MultiLocationAvailabilityManager {
    private timeZoneManager: MultiLocationTimeZoneManager
    private availabilityCalculator: TimeZoneAwareAvailabilityCalculator

    constructor(
        timeZoneManager: MultiLocationTimeZoneManager,
        availabilityCalculator: TimeZoneAwareAvailabilityCalculator
    ) {
        this.timeZoneManager = timeZoneManager
        this.availabilityCalculator = availabilityCalculator
    }

    /**
     * Gets availability across all business locations
     */
    async getAvailabilityAllLocations(
        businessId: string,
        date: string,
        displayTimezone: string,
        serviceId?: string
    ): Promise<Array<{
        locationId?: string
        locationTimezone: string
        slots: TimeZoneAwareTimeSlot[]
    }>> {
        const locations = this.timeZoneManager['businessConfig'].locations || [
            { id: 'default', name: 'Main Location', timezone: this.timeZoneManager['businessConfig'].timezone }
        ]

        const results = []

        for (const location of locations) {
            try {
                const slots = await this.availabilityCalculator.getAvailableSlots({
                    businessId,
                    date,
                    timezone: displayTimezone,
                    locationId: location.id,
                    serviceId
                })

                results.push({
                    locationId: location.id,
                    locationTimezone: location.timezone,
                    slots
                })
            } catch (error) {
                console.error(`Error getting availability for location ${location.id}:`, error)
                results.push({
                    locationId: location.id,
                    locationTimezone: location.timezone,
                    slots: []
                })
            }
        }

        return results
    }

    /**
     * Finds the best available time across all locations
     */
    async findBestTimeAcrossLocations(
        businessId: string,
        preferredTime: string, // HH:MM format
        date: string,
        duration: number, // minutes
        displayTimezone: string,
        serviceId?: string
    ): Promise<{
        locationId?: string
        slot: TimeZoneAwareTimeSlot
        isExactMatch: boolean
    } | null> {
        const allLocationAvailability = await this.getAvailabilityAllLocations(
            businessId,
            date,
            displayTimezone,
            serviceId
        )

        let bestMatch: {
            locationId?: string
            slot: TimeZoneAwareTimeSlot
            isExactMatch: boolean
            timeDifference: number
        } | null = null

        const preferredDateTime = DateTime.fromFormat(`${date} ${preferredTime}`, 'yyyy-MM-dd HH:mm', {
            zone: displayTimezone
        })

        for (const location of allLocationAvailability) {
            for (const slot of location.slots) {
                if (slot.duration >= duration) {
                    const slotDateTime = DateTime.fromFormat(
                        `${slot.localDate} ${slot.localStart}`,
                        'yyyy-MM-dd HH:mm',
                        { zone: displayTimezone }
                    )

                    const timeDifference = Math.abs(slotDateTime.diff(preferredDateTime, 'minutes').minutes)
                    const isExactMatch = timeDifference === 0

                    if (!bestMatch || timeDifference < bestMatch.timeDifference) {
                        bestMatch = {
                            locationId: location.locationId,
                            slot,
                            isExactMatch,
                            timeDifference
                        }
                    }

                    // If we found an exact match, return immediately
                    if (isExactMatch) {
                        return {
                            locationId: location.locationId,
                            slot,
                            isExactMatch: true
                        }
                    }
                }
            }
        }

        return bestMatch ? {
            locationId: bestMatch.locationId,
            slot: bestMatch.slot,
            isExactMatch: bestMatch.isExactMatch
        } : null
    }
}
/**
 * Comprehensive error handling system for calendar infrastructure and availability management
 * Implements detailed error types, user-friendly messages, and suggested alternatives
 */

import { TimeSlot } from '@/lib/services/service-duration-validator'

// Base error class for all availability-related errors
export abstract class AvailabilityError extends Error {
    public readonly code: string
    public readonly userMessage: string
    public readonly suggestedAlternatives: SuggestedAlternative[]
    public readonly context: Record<string, any>
    public readonly timestamp: Date

    constructor(
        code: string,
        message: string,
        userMessage: string,
        suggestedAlternatives: SuggestedAlternative[] = [],
        context: Record<string, any> = {}
    ) {
        super(message)
        this.name = this.constructor.name
        this.code = code
        this.userMessage = userMessage
        this.suggestedAlternatives = suggestedAlternatives
        this.context = context
        this.timestamp = new Date()

        // Maintain proper stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor)
        }
    }

    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            userMessage: this.userMessage,
            suggestedAlternatives: this.suggestedAlternatives,
            context: this.context,
            timestamp: this.timestamp,
            stack: this.stack
        }
    }
}

// Suggested alternative interface
export interface SuggestedAlternative {
    type: 'time_slot' | 'staff_member' | 'service_option' | 'date_range' | 'action'
    title: string
    description: string
    data?: {
        timeSlot?: TimeSlot
        staffId?: string
        staffName?: string
        serviceId?: string
        serviceName?: string
        dateRange?: { start: Date; end: Date }
        actionType?: string
        actionData?: Record<string, any>
    }
}

// Specific error types for different availability scenarios

export class BusinessClosedError extends AvailabilityError {
    constructor(
        requestedTime: Date,
        businessHours?: { openTime: string; closeTime: string },
        suggestedAlternatives: SuggestedAlternative[] = []
    ) {
        const dayName = requestedTime.toLocaleDateString('en-US', { weekday: 'long' })
        const timeString = requestedTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        })

        let userMessage = `We're closed on ${dayName} at ${timeString}.`
        if (businessHours) {
            userMessage += ` Our hours are ${businessHours.openTime} - ${businessHours.closeTime}.`
        }

        super(
            'BUSINESS_CLOSED',
            `Business is closed at requested time: ${requestedTime.toISOString()}`,
            userMessage,
            suggestedAlternatives,
            { requestedTime, businessHours }
        )
    }
}

export class StaffUnavailableError extends AvailabilityError {
    constructor(
        staffName: string,
        requestedTime: Date,
        reason: 'no_availability' | 'time_off' | 'not_scheduled',
        suggestedAlternatives: SuggestedAlternative[] = []
    ) {
        const timeString = requestedTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        })
        const dateString = requestedTime.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
        })

        let userMessage: string
        switch (reason) {
            case 'time_off':
                userMessage = `${staffName} is taking time off on ${dateString}.`
                break
            case 'not_scheduled':
                userMessage = `${staffName} is not scheduled to work at ${timeString} on ${dateString}.`
                break
            default:
                userMessage = `${staffName} is not available at ${timeString} on ${dateString}.`
        }

        super(
            'STAFF_UNAVAILABLE',
            `Staff member ${staffName} is unavailable at ${requestedTime.toISOString()}: ${reason}`,
            userMessage,
            suggestedAlternatives,
            { staffName, requestedTime, reason }
        )
    }
}

export class SchedulingConflictError extends AvailabilityError {
    constructor(
        conflictType: 'overlapping_appointment' | 'double_booking' | 'resource_conflict',
        conflictDetails: {
            existingAppointment?: {
                id: string
                startTime: Date
                endTime: Date
                clientName: string
                serviceName: string
            }
        },
        suggestedAlternatives: SuggestedAlternative[] = []
    ) {
        let userMessage: string
        if (conflictDetails.existingAppointment) {
            const timeString = conflictDetails.existingAppointment.startTime.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            })
            userMessage = `This time slot conflicts with an existing appointment at ${timeString}.`
        } else {
            userMessage = 'This time slot is no longer available due to a scheduling conflict.'
        }

        super(
            'SCHEDULING_CONFLICT',
            `Scheduling conflict detected: ${conflictType}`,
            userMessage,
            suggestedAlternatives,
            { conflictType, conflictDetails }
        )
    }
}

export class InsufficientDurationError extends AvailabilityError {
    constructor(
        requiredDuration: number,
        availableDuration: number,
        serviceNames: string[],
        suggestedAlternatives: SuggestedAlternative[] = []
    ) {
        const serviceList = serviceNames.length > 1
            ? `${serviceNames.slice(0, -1).join(', ')} and ${serviceNames[serviceNames.length - 1]}`
            : serviceNames[0]

        const userMessage = `The selected services (${serviceList}) require ${requiredDuration} minutes, but only ${availableDuration} minutes are available in this time slot.`

        super(
            'INSUFFICIENT_DURATION',
            `Insufficient duration: required ${requiredDuration}min, available ${availableDuration}min`,
            userMessage,
            suggestedAlternatives,
            { requiredDuration, availableDuration, serviceNames }
        )
    }
}

export class InvalidTimeSlotError extends AvailabilityError {
    constructor(
        reason: 'past_time' | 'invalid_format' | 'end_before_start' | 'too_far_future',
        requestedTime?: Date,
        suggestedAlternatives: SuggestedAlternative[] = []
    ) {
        let userMessage: string
        switch (reason) {
            case 'past_time':
                userMessage = 'You cannot book appointments in the past. Please select a future time.'
                break
            case 'invalid_format':
                userMessage = 'The selected time format is invalid. Please try again.'
                break
            case 'end_before_start':
                userMessage = 'The appointment end time cannot be before the start time.'
                break
            case 'too_far_future':
                userMessage = 'Appointments can only be booked up to 6 months in advance.'
                break
            default:
                userMessage = 'The selected time slot is invalid.'
        }

        super(
            'INVALID_TIME_SLOT',
            `Invalid time slot: ${reason}`,
            userMessage,
            suggestedAlternatives,
            { reason, requestedTime }
        )
    }
}

export class BusinessContextMissingError extends AvailabilityError {
    constructor(operation: string) {
        super(
            'BUSINESS_CONTEXT_MISSING',
            `Business context missing for operation: ${operation}`,
            'Unable to process your request. Please try again.',
            [],
            { operation }
        )
    }
}

export class TimeOffConflictError extends AvailabilityError {
    constructor(
        staffName: string,
        timeOffPeriod: { startDate: Date; endDate: Date; reason?: string },
        suggestedAlternatives: SuggestedAlternative[] = []
    ) {
        const startDate = timeOffPeriod.startDate.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric'
        })
        const endDate = timeOffPeriod.endDate.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric'
        })

        const userMessage = `${staffName} has approved time off from ${startDate} to ${endDate}.`

        super(
            'TIME_OFF_CONFLICT',
            `Time off conflict for staff member ${staffName}`,
            userMessage,
            suggestedAlternatives,
            { staffName, timeOffPeriod }
        )
    }
}

export class CacheFailureError extends AvailabilityError {
    constructor(
        operation: string,
        fallbackUsed: boolean = false,
        suggestedAlternatives: SuggestedAlternative[] = []
    ) {
        const userMessage = fallbackUsed
            ? 'We\'re experiencing some delays, but your request is being processed.'
            : 'We\'re having technical difficulties. Please try again in a moment.'

        super(
            'CACHE_FAILURE',
            `Cache failure during ${operation}`,
            userMessage,
            suggestedAlternatives,
            { operation, fallbackUsed }
        )
    }
}

export class DatabaseConnectionError extends AvailabilityError {
    constructor(operation: string) {
        super(
            'DATABASE_CONNECTION_ERROR',
            `Database connection failed during ${operation}`,
            'We\'re experiencing technical difficulties. Please try again in a moment.',
            [],
            { operation }
        )
    }
}

export class ValidationError extends AvailabilityError {
    constructor(
        field: string,
        value: any,
        expectedFormat: string,
        suggestedAlternatives: SuggestedAlternative[] = []
    ) {
        const userMessage = `Please check the ${field} field. Expected format: ${expectedFormat}.`

        super(
            'VALIDATION_ERROR',
            `Validation failed for field ${field}: expected ${expectedFormat}, got ${value}`,
            userMessage,
            suggestedAlternatives,
            { field, value, expectedFormat }
        )
    }
}

// Error factory for creating appropriate error instances
export class AvailabilityErrorFactory {
    static createBusinessClosedError(
        requestedTime: Date,
        businessHours?: { openTime: string; closeTime: string },
        alternativeSlots: TimeSlot[] = []
    ): BusinessClosedError {
        const suggestedAlternatives: SuggestedAlternative[] = alternativeSlots.map(slot => ({
            type: 'time_slot',
            title: `Available at ${slot.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
            description: `${slot.duration} minutes available`,
            data: { timeSlot: slot }
        }))

        return new BusinessClosedError(requestedTime, businessHours, suggestedAlternatives)
    }

    static createStaffUnavailableError(
        staffName: string,
        requestedTime: Date,
        reason: 'no_availability' | 'time_off' | 'not_scheduled',
        alternativeStaff: Array<{ id: string; name: string; availableSlots: TimeSlot[] }> = []
    ): StaffUnavailableError {
        const suggestedAlternatives: SuggestedAlternative[] = alternativeStaff.flatMap(staff =>
            staff.availableSlots.map(slot => ({
                type: 'staff_member',
                title: `${staff.name} available`,
                description: `${slot.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${slot.endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
                data: {
                    staffId: staff.id,
                    staffName: staff.name,
                    timeSlot: slot
                }
            }))
        )

        return new StaffUnavailableError(staffName, requestedTime, reason, suggestedAlternatives)
    }

    static createInsufficientDurationError(
        requiredDuration: number,
        availableDuration: number,
        serviceNames: string[],
        longerSlots: TimeSlot[] = []
    ): InsufficientDurationError {
        const suggestedAlternatives: SuggestedAlternative[] = longerSlots.map(slot => ({
            type: 'time_slot',
            title: `${slot.duration} minutes available`,
            description: `${slot.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${slot.endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
            data: { timeSlot: slot }
        }))

        return new InsufficientDurationError(requiredDuration, availableDuration, serviceNames, suggestedAlternatives)
    }
}

// Type guards for error handling
export function isAvailabilityError(error: any): error is AvailabilityError {
    return error instanceof AvailabilityError
}

export function isBusinessClosedError(error: any): error is BusinessClosedError {
    return error instanceof BusinessClosedError
}

export function isStaffUnavailableError(error: any): error is StaffUnavailableError {
    return error instanceof StaffUnavailableError
}

export function isSchedulingConflictError(error: any): error is SchedulingConflictError {
    return error instanceof SchedulingConflictError
}

export function isInsufficientDurationError(error: any): error is InsufficientDurationError {
    return error instanceof InsufficientDurationError
}

export function isCacheFailureError(error: any): error is CacheFailureError {
    return error instanceof CacheFailureError
}

// Error severity levels for monitoring and alerting
export enum ErrorSeverity {
    LOW = 'LOW',           // User errors, validation failures
    MEDIUM = 'MEDIUM',     // Business logic conflicts, cache failures
    HIGH = 'HIGH',         // Database errors, system failures
    CRITICAL = 'CRITICAL'  // Security violations, data corruption
}

// Get error severity for monitoring purposes
export function getErrorSeverity(error: AvailabilityError): ErrorSeverity {
    switch (error.code) {
        case 'BUSINESS_CONTEXT_MISSING':
            return ErrorSeverity.CRITICAL
        case 'DATABASE_CONNECTION_ERROR':
            return ErrorSeverity.HIGH
        case 'CACHE_FAILURE':
            return ErrorSeverity.MEDIUM
        case 'SCHEDULING_CONFLICT':
        case 'STAFF_UNAVAILABLE':
        case 'TIME_OFF_CONFLICT':
            return ErrorSeverity.MEDIUM
        case 'BUSINESS_CLOSED':
        case 'INSUFFICIENT_DURATION':
        case 'INVALID_TIME_SLOT':
        case 'VALIDATION_ERROR':
            return ErrorSeverity.LOW
        default:
            return ErrorSeverity.MEDIUM
    }
}
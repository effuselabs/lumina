/**
 * Enhanced error handler for availability infrastructure
 * Integrates with existing conflict detection and provides comprehensive error management
 */

import {
    AvailabilityError,
    AvailabilityErrorFactory,
    BusinessClosedError,
    BusinessContextMissingError,
    CacheFailureError,
    InsufficientDurationError,
    InvalidTimeSlotError,
    SchedulingConflictError,
    StaffUnavailableError,
    SuggestedAlternative,
    TimeOffConflictError
} from '@/lib/errors/availability-errors'
import { LogLevel, availabilityLogger, withPerformanceLogging } from '@/lib/monitoring/availability-logger'
import { gracefulDegradation } from '@/lib/services/graceful-degradation'
import { Conflict, ConflictType } from './conflict-detection-engine'
import { TimeSlot } from './service-duration-validator'

// Enhanced error context for better error handling
export interface ErrorContext {
    businessId: string
    staffId?: string
    operation: string
    requestedTime?: Date
    serviceIds?: string[]
    userId?: string
    sessionId?: string
}

// Error resolution suggestions
export interface ErrorResolution {
    type: 'alternative_time' | 'alternative_staff' | 'alternative_service' | 'split_booking' | 'reschedule'
    title: string
    description: string
    actionable: boolean
    data?: Record<string, any>
}

class EnhancedErrorHandler {
    private static instance: EnhancedErrorHandler

    static getInstance(): EnhancedErrorHandler {
        if (!EnhancedErrorHandler.instance) {
            EnhancedErrorHandler.instance = new EnhancedErrorHandler()
        }
        return EnhancedErrorHandler.instance
    }

    // Convert conflicts to availability errors with suggestions
    async convertConflictsToErrors(
        conflicts: Conflict[],
        context: ErrorContext,
        alternativeSlots: TimeSlot[] = []
    ): Promise<AvailabilityError[]> {
        const errors: AvailabilityError[] = []

        for (const conflict of conflicts) {
            try {
                const error = await this.convertSingleConflictToError(conflict, context, alternativeSlots)
                if (error) {
                    errors.push(error)
                }
            } catch (conversionError) {
                availabilityLogger.log(LogLevel.ERROR, `Failed to convert conflict to error: ${conflict.type}`, context, {
                    conflict,
                    conversionError: conversionError instanceof Error ? conversionError.message : String(conversionError)
                })
            }
        }

        return errors
    }

    // Convert single conflict to appropriate error type
    private async convertSingleConflictToError(
        conflict: Conflict,
        context: ErrorContext,
        alternativeSlots: TimeSlot[]
    ): Promise<AvailabilityError | null> {
        const suggestions = await this.generateSuggestionsForConflict(conflict, context, alternativeSlots)

        switch (conflict.type) {
            case ConflictType.BUSINESS_HOURS_VIOLATION:
                return this.createBusinessClosedError(conflict, context, suggestions)

            case ConflictType.STAFF_UNAVAILABLE:
                return this.createStaffUnavailableError(conflict, context, suggestions)

            case ConflictType.OVERLAPPING_APPOINTMENT:
                return this.createSchedulingConflictError(conflict, context, suggestions)

            case ConflictType.TIME_OFF_CONFLICT:
                return this.createTimeOffConflictError(conflict, context, suggestions)

            case ConflictType.INSUFFICIENT_DURATION:
                return this.createInsufficientDurationError(conflict, context, suggestions)

            default:
                availabilityLogger.log(LogLevel.WARN, `Unknown conflict type: ${conflict.type}`, context)
                return null
        }
    }

    // Create business closed error with alternatives
    private createBusinessClosedError(
        conflict: Conflict,
        context: ErrorContext,
        suggestions: SuggestedAlternative[]
    ): BusinessClosedError {
        const businessHours = conflict.details.businessHours
        const requestedTime = context.requestedTime || new Date()

        return AvailabilityErrorFactory.createBusinessClosedError(
            requestedTime,
            businessHours ? {
                openTime: businessHours.openTime,
                closeTime: businessHours.closeTime
            } : undefined,
            suggestions.filter(s => s.type === 'time_slot').map(s => s.data?.timeSlot).filter((slot): slot is TimeSlot => slot !== undefined)
        )
    }

    // Create staff unavailable error with alternatives
    private createStaffUnavailableError(
        conflict: Conflict,
        context: ErrorContext,
        suggestions: SuggestedAlternative[]
    ): StaffUnavailableError {
        const staffName = context.staffId || 'Staff member' // Would normally lookup staff name
        const requestedTime = context.requestedTime || new Date()

        // Determine reason from conflict details
        let reason: 'no_availability' | 'time_off' | 'not_scheduled' = 'no_availability'
        if (conflict.details.timeOffRequest) {
            reason = 'time_off'
        } else if (conflict.details.staffAvailability) {
            reason = 'not_scheduled'
        }

        return AvailabilityErrorFactory.createStaffUnavailableError(
            staffName,
            requestedTime,
            reason,
            suggestions.filter(s => s.type === 'staff_member').map(s => ({
                id: s.data?.staffId || '',
                name: s.data?.staffName || '',
                availableSlots: s.data?.timeSlot ? [s.data.timeSlot] : []
            }))
        )
    }

    // Create scheduling conflict error
    private createSchedulingConflictError(
        conflict: Conflict,
        context: ErrorContext,
        suggestions: SuggestedAlternative[]
    ): SchedulingConflictError {
        const conflictDetails = conflict.details.conflictingAppointment ? {
            existingAppointment: {
                id: conflict.details.conflictingAppointment.id,
                startTime: conflict.details.conflictingAppointment.startTime,
                endTime: conflict.details.conflictingAppointment.endTime,
                clientName: conflict.details.conflictingAppointment.clientName,
                serviceName: conflict.details.conflictingAppointment.services.join(', ')
            }
        } : {}

        return new SchedulingConflictError(
            'overlapping_appointment',
            conflictDetails,
            suggestions
        )
    }

    // Create time-off conflict error
    private createTimeOffConflictError(
        conflict: Conflict,
        context: ErrorContext,
        suggestions: SuggestedAlternative[]
    ): TimeOffConflictError {
        const staffName = context.staffId || 'Staff member'
        const timeOffRequest = conflict.details.timeOffRequest

        if (!timeOffRequest) {
            throw new Error('Time-off conflict missing time-off request details')
        }

        return new TimeOffConflictError(
            staffName,
            {
                startDate: timeOffRequest.startDate,
                endDate: timeOffRequest.endDate,
                reason: timeOffRequest.reason
            },
            suggestions
        )
    }

    // Create insufficient duration error
    private createInsufficientDurationError(
        conflict: Conflict,
        context: ErrorContext,
        suggestions: SuggestedAlternative[]
    ): InsufficientDurationError {
        const serviceDuration = conflict.details.serviceDuration

        if (!serviceDuration) {
            throw new Error('Insufficient duration conflict missing duration details')
        }

        return AvailabilityErrorFactory.createInsufficientDurationError(
            serviceDuration.requiredDuration,
            serviceDuration.availableDuration,
            serviceDuration.serviceNames,
            suggestions.filter(s => s.type === 'time_slot').map(s => s.data?.timeSlot).filter((slot): slot is TimeSlot => slot !== undefined)
        )
    }

    // Generate suggestions for conflicts
    private async generateSuggestionsForConflict(
        conflict: Conflict,
        context: ErrorContext,
        alternativeSlots: TimeSlot[]
    ): Promise<SuggestedAlternative[]> {
        const suggestions: SuggestedAlternative[] = []

        try {
            // Add time slot alternatives
            alternativeSlots.forEach(slot => {
                suggestions.push({
                    type: 'time_slot',
                    title: `Available at ${slot.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
                    description: `${Math.round((slot.endTime.getTime() - slot.startTime.getTime()) / (1000 * 60))} minutes available`,
                    data: { timeSlot: slot }
                })
            })

            // Add conflict-specific suggestions
            switch (conflict.type) {
                case ConflictType.BUSINESS_HOURS_VIOLATION:
                    await this.addBusinessHoursSuggestions(suggestions, conflict, context)
                    break

                case ConflictType.STAFF_UNAVAILABLE:
                    await this.addStaffAlternativeSuggestions(suggestions, conflict, context)
                    break

                case ConflictType.OVERLAPPING_APPOINTMENT:
                    await this.addReschedulingSuggestions(suggestions, conflict, context)
                    break

                case ConflictType.INSUFFICIENT_DURATION:
                    await this.addDurationSuggestions(suggestions, conflict, context)
                    break
            }

        } catch (error) {
            availabilityLogger.log(LogLevel.WARN, `Failed to generate suggestions for conflict: ${conflict.type}`, context, {
                error: error instanceof Error ? error.message : String(error)
            })
        }

        return suggestions.slice(0, 5) // Limit to 5 suggestions
    }

    // Add business hours specific suggestions
    private async addBusinessHoursSuggestions(
        suggestions: SuggestedAlternative[],
        conflict: Conflict,
        context: ErrorContext
    ): Promise<void> {
        const businessHours = conflict.details.businessHours
        if (businessHours && context.requestedTime) {
            const requestedDate = context.requestedTime
            const nextBusinessDay = new Date(requestedDate)
            nextBusinessDay.setDate(nextBusinessDay.getDate() + 1)

            suggestions.push({
                type: 'action',
                title: 'View business hours',
                description: `We're open ${businessHours.openTime} - ${businessHours.closeTime}`,
                data: {
                    actionType: 'view_business_hours',
                    actionData: businessHours
                }
            })
        }
    }

    // Add staff alternative suggestions
    private async addStaffAlternativeSuggestions(
        suggestions: SuggestedAlternative[],
        conflict: Conflict,
        context: ErrorContext
    ): Promise<void> {
        // In a real implementation, this would query for alternative staff members
        // For now, we'll add a generic suggestion
        suggestions.push({
            type: 'action',
            title: 'View other available staff',
            description: 'See other team members who might be available',
            data: {
                actionType: 'view_alternative_staff',
                actionData: { businessId: context.businessId }
            }
        })
    }

    // Add rescheduling suggestions
    private async addReschedulingSuggestions(
        suggestions: SuggestedAlternative[],
        conflict: Conflict,
        context: ErrorContext
    ): Promise<void> {
        suggestions.push({
            type: 'action',
            title: 'Find next available time',
            description: 'Search for the next available appointment slot',
            data: {
                actionType: 'find_next_available',
                actionData: {
                    businessId: context.businessId,
                    staffId: context.staffId,
                    serviceIds: context.serviceIds
                }
            }
        })
    }

    // Add duration-specific suggestions
    private async addDurationSuggestions(
        suggestions: SuggestedAlternative[],
        conflict: Conflict,
        context: ErrorContext
    ): Promise<void> {
        const serviceDuration = conflict.details.serviceDuration
        if (serviceDuration && serviceDuration.serviceNames.length > 1) {
            suggestions.push({
                type: 'action',
                title: 'Split into separate appointments',
                description: 'Book services in separate time slots',
                data: {
                    actionType: 'split_booking',
                    actionData: {
                        serviceNames: serviceDuration.serviceNames,
                        requiredDuration: serviceDuration.requiredDuration
                    }
                }
            })
        }
    }

    // Handle cache failures with graceful degradation
    async handleCacheFailure<T>(
        operation: string,
        context: ErrorContext,
        cacheOperation: () => Promise<T>,
        fallbackOperation: () => Promise<T>
    ): Promise<T> {
        return await gracefulDegradation.executeWithDegradation(
            'availability_cache',
            cacheOperation,
            fallbackOperation,
            context
        )
    }

    // Validate business context and throw appropriate error
    validateBusinessContext(businessId: string | undefined, operation: string): void {
        if (!businessId) {
            const error = new BusinessContextMissingError(operation)
            availabilityLogger.logError(error, { operation })
            throw error
        }
    }

    // Validate time slot and throw appropriate error
    validateTimeSlot(startTime: Date, endTime: Date, operation: string): void {
        const now = new Date()
        const sixMonthsFromNow = new Date()
        sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6)

        if (startTime < now) {
            throw new InvalidTimeSlotError('past_time', startTime)
        }

        if (endTime <= startTime) {
            throw new InvalidTimeSlotError('end_before_start', startTime)
        }

        if (startTime > sixMonthsFromNow) {
            throw new InvalidTimeSlotError('too_far_future', startTime)
        }
    }

    // Log and handle unexpected errors
    handleUnexpectedError(error: unknown, context: ErrorContext): AvailabilityError {
        const message = error instanceof Error ? error.message : String(error)
        const stack = error instanceof Error ? error.stack : undefined

        availabilityLogger.log(LogLevel.ERROR, `Unexpected error in ${context.operation}: ${message}`, context, {
            error: message,
            stack
        })

        // Return a generic cache failure error for unexpected errors
        return new CacheFailureError(context.operation, false)
    }
}

// Export singleton instance
export const enhancedErrorHandler = EnhancedErrorHandler.getInstance()

// Utility function to wrap operations with enhanced error handling
export async function withEnhancedErrorHandling<T>(
    operation: string,
    context: ErrorContext,
    fn: () => Promise<T>
): Promise<T> {
    try {
        // Validate business context
        enhancedErrorHandler.validateBusinessContext(context.businessId, operation)

        // Execute with performance logging
        return await withPerformanceLogging(operation, context.businessId, fn)

    } catch (error) {
        if (error instanceof AvailabilityError) {
            // Already a properly formatted availability error
            availabilityLogger.logError(error, context)
            throw error
        } else {
            // Convert unexpected error to availability error
            const availabilityError = enhancedErrorHandler.handleUnexpectedError(error, context)
            throw availabilityError
        }
    }
}
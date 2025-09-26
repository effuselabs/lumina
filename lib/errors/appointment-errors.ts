/**
 * Comprehensive error handling system for appointment booking engine
 * Extends the availability error system with appointment-specific error types
 */

import { AvailabilityError, ErrorSeverity, SuggestedAlternative } from './availability-errors'

// Base error class for all appointment-related errors
export abstract class AppointmentError extends AvailabilityError {
    public readonly appointmentId?: string
    public readonly clientId?: string
    public readonly staffId?: string

    constructor(
        code: string,
        message: string,
        userMessage: string,
        suggestedAlternatives: SuggestedAlternative[] = [],
        context: Record<string, any> = {},
        appointmentId?: string,
        clientId?: string,
        staffId?: string
    ) {
        super(code, message, userMessage, suggestedAlternatives, context)
        this.appointmentId = appointmentId
        this.clientId = clientId
        this.staffId = staffId
    }

    toJSON() {
        return {
            ...super.toJSON(),
            appointmentId: this.appointmentId,
            clientId: this.clientId,
            staffId: this.staffId
        }
    }
}

// Appointment booking specific errors

export class AppointmentNotFoundError extends AppointmentError {
    constructor(
        appointmentId: string,
        businessId: string,
        suggestedAlternatives: SuggestedAlternative[] = []
    ) {
        super(
            'APPOINTMENT_NOT_FOUND',
            `Appointment ${appointmentId} not found in business ${businessId}`,
            'The requested appointment could not be found. It may have been cancelled or rescheduled.',
            suggestedAlternatives,
            { appointmentId, businessId },
            appointmentId
        )
    }
}

export class AppointmentAlreadyExistsError extends AppointmentError {
    constructor(
        conflictingAppointmentId: string,
        requestedTime: Date,
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

        super(
            'APPOINTMENT_ALREADY_EXISTS',
            `Appointment already exists at ${requestedTime.toISOString()}`,
            `You already have an appointment scheduled for ${timeString} on ${dateString}.`,
            suggestedAlternatives,
            { conflictingAppointmentId, requestedTime },
            conflictingAppointmentId
        )
    }
}

export class InvalidStatusTransitionError extends AppointmentError {
    constructor(
        appointmentId: string,
        currentStatus: string,
        requestedStatus: string,
        validTransitions: string[],
        suggestedAlternatives: SuggestedAlternative[] = []
    ) {
        const validTransitionsText = validTransitions.length > 0
            ? `Valid transitions from ${currentStatus}: ${validTransitions.join(', ')}`
            : `No valid transitions available from ${currentStatus}`

        super(
            'INVALID_STATUS_TRANSITION',
            `Invalid status transition from ${currentStatus} to ${requestedStatus}`,
            `Cannot change appointment status from ${currentStatus} to ${requestedStatus}. ${validTransitionsText}.`,
            suggestedAlternatives,
            { appointmentId, currentStatus, requestedStatus, validTransitions },
            appointmentId
        )
    }
}

export class AppointmentAlreadyCompletedError extends AppointmentError {
    constructor(
        appointmentId: string,
        completedAt: Date,
        suggestedAlternatives: SuggestedAlternative[] = []
    ) {
        const completedTimeString = completedAt.toLocaleString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })

        super(
            'APPOINTMENT_ALREADY_COMPLETED',
            `Appointment ${appointmentId} was already completed at ${completedAt.toISOString()}`,
            `This appointment was already completed on ${completedTimeString} and cannot be modified.`,
            suggestedAlternatives,
            { appointmentId, completedAt },
            appointmentId
        )
    }
}

export class AppointmentCancellationError extends AppointmentError {
    constructor(
        appointmentId: string,
        reason: 'too_late' | 'already_started' | 'payment_required' | 'policy_violation',
        policyDetails?: {
            minimumNoticeHours?: number
            cancellationFee?: number
            refundPolicy?: string
        },
        suggestedAlternatives: SuggestedAlternative[] = []
    ) {
        let userMessage: string
        switch (reason) {
            case 'too_late':
                const hours = policyDetails?.minimumNoticeHours || 24
                userMessage = `Appointments must be cancelled at least ${hours} hours in advance.`
                break
            case 'already_started':
                userMessage = 'This appointment has already started and cannot be cancelled.'
                break
            case 'payment_required':
                userMessage = 'A cancellation fee may apply. Please contact us to cancel this appointment.'
                break
            case 'policy_violation':
                userMessage = 'This appointment cannot be cancelled due to business policy restrictions.'
                break
            default:
                userMessage = 'This appointment cannot be cancelled at this time.'
        }

        super(
            'APPOINTMENT_CANCELLATION_ERROR',
            `Cannot cancel appointment ${appointmentId}: ${reason}`,
            userMessage,
            suggestedAlternatives,
            { appointmentId, reason, policyDetails },
            appointmentId
        )
    }
}

export class MultiServiceBookingError extends AppointmentError {
    constructor(
        errorType: 'service_incompatibility' | 'staff_skill_mismatch' | 'duration_exceeded' | 'pricing_error',
        serviceIds: string[],
        serviceNames: string[],
        details: {
            incompatibleServices?: string[]
            requiredSkills?: string[]
            maxDuration?: number
            pricingIssue?: string
        },
        suggestedAlternatives: SuggestedAlternative[] = []
    ) {
        let userMessage: string
        const serviceList = serviceNames.length > 1
            ? `${serviceNames.slice(0, -1).join(', ')} and ${serviceNames[serviceNames.length - 1]}`
            : serviceNames[0]

        switch (errorType) {
            case 'service_incompatibility':
                userMessage = `The selected services (${serviceList}) cannot be booked together in a single appointment.`
                break
            case 'staff_skill_mismatch':
                userMessage = `The selected staff member is not qualified to perform all requested services (${serviceList}).`
                break
            case 'duration_exceeded':
                const maxHours = details.maxDuration ? Math.floor(details.maxDuration / 60) : 4
                userMessage = `The total duration for selected services exceeds the maximum appointment length of ${maxHours} hours.`
                break
            case 'pricing_error':
                userMessage = `There was an issue calculating the total price for the selected services. Please try booking services separately.`
                break
            default:
                userMessage = `There was an issue with your multi-service booking. Please try selecting services individually.`
        }

        super(
            'MULTI_SERVICE_BOOKING_ERROR',
            `Multi-service booking failed: ${errorType}`,
            userMessage,
            suggestedAlternatives,
            { errorType, serviceIds, serviceNames, details }
        )
    }
}

export class PastAppointmentModificationError extends AppointmentError {
    constructor(
        appointmentId: string,
        appointmentTime: Date,
        operation: 'update' | 'cancel' | 'reschedule',
        suggestedAlternatives: SuggestedAlternative[] = []
    ) {
        const timeString = appointmentTime.toLocaleString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })

        let userMessage: string
        switch (operation) {
            case 'update':
                userMessage = `Cannot modify past appointments. This appointment was scheduled for ${timeString}.`
                break
            case 'cancel':
                userMessage = `Cannot cancel past appointments. This appointment was scheduled for ${timeString}.`
                break
            case 'reschedule':
                userMessage = `Cannot reschedule past appointments. This appointment was scheduled for ${timeString}.`
                break
            default:
                userMessage = `Cannot modify past appointments. This appointment was scheduled for ${timeString}.`
        }

        super(
            'PAST_APPOINTMENT_MODIFICATION',
            `Cannot ${operation} past appointment ${appointmentId}`,
            userMessage,
            suggestedAlternatives,
            { appointmentId, appointmentTime, operation },
            appointmentId
        )
    }
}

export class InsufficientNoticeError extends AppointmentError {
    constructor(
        appointmentId: string,
        operation: 'cancel' | 'reschedule' | 'modify',
        requiredNoticeHours: number,
        actualNoticeHours: number,
        suggestedAlternatives: SuggestedAlternative[] = []
    ) {
        const userMessage = `${operation === 'cancel' ? 'Cancellations' : operation === 'reschedule' ? 'Rescheduling' : 'Modifications'} require at least ${requiredNoticeHours} hours notice. You have ${Math.floor(actualNoticeHours)} hours remaining.`

        super(
            'INSUFFICIENT_NOTICE',
            `Insufficient notice for ${operation}: required ${requiredNoticeHours}h, actual ${actualNoticeHours}h`,
            userMessage,
            suggestedAlternatives,
            { appointmentId, operation, requiredNoticeHours, actualNoticeHours },
            appointmentId
        )
    }
}

export class PaymentRequiredError extends AppointmentError {
    constructor(
        appointmentId: string,
        operation: 'confirm' | 'complete' | 'reschedule',
        paymentDetails: {
            amountDue: number
            currency: string
            paymentType: 'deposit' | 'full_payment' | 'cancellation_fee'
            dueDate?: Date
        },
        suggestedAlternatives: SuggestedAlternative[] = []
    ) {
        const amount = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: paymentDetails.currency
        }).format(paymentDetails.amountDue / 100) // Assuming amount is in cents

        let userMessage: string
        switch (paymentDetails.paymentType) {
            case 'deposit':
                userMessage = `A deposit of ${amount} is required to ${operation} this appointment.`
                break
            case 'full_payment':
                userMessage = `Payment of ${amount} is required to ${operation} this appointment.`
                break
            case 'cancellation_fee':
                userMessage = `A cancellation fee of ${amount} applies to cancel this appointment.`
                break
            default:
                userMessage = `Payment of ${amount} is required to proceed.`
        }

        super(
            'PAYMENT_REQUIRED',
            `Payment required for ${operation}: ${paymentDetails.amountDue} ${paymentDetails.currency}`,
            userMessage,
            suggestedAlternatives,
            { appointmentId, operation, paymentDetails },
            appointmentId
        )
    }
}

export class ClientNotFoundError extends AppointmentError {
    constructor(
        clientId: string,
        businessId: string,
        suggestedAlternatives: SuggestedAlternative[] = []
    ) {
        super(
            'CLIENT_NOT_FOUND',
            `Client ${clientId} not found in business ${businessId}`,
            'The specified client could not be found. Please verify the client information.',
            suggestedAlternatives,
            { clientId, businessId },
            undefined,
            clientId
        )
    }
}

export class StaffNotFoundError extends AppointmentError {
    constructor(
        staffId: string,
        businessId: string,
        suggestedAlternatives: SuggestedAlternative[] = []
    ) {
        super(
            'STAFF_NOT_FOUND',
            `Staff member ${staffId} not found in business ${businessId}`,
            'The specified staff member could not be found or is no longer available.',
            suggestedAlternatives,
            { staffId, businessId },
            undefined,
            undefined,
            staffId
        )
    }
}

export class ServiceNotFoundError extends AppointmentError {
    constructor(
        serviceId: string,
        businessId: string,
        suggestedAlternatives: SuggestedAlternative[] = []
    ) {
        super(
            'SERVICE_NOT_FOUND',
            `Service ${serviceId} not found in business ${businessId}`,
            'The requested service is no longer available. Please select a different service.',
            suggestedAlternatives,
            { serviceId, businessId }
        )
    }
}

export class DatabaseConstraintViolationError extends AppointmentError {
    constructor(
        operation: string,
        constraint: string,
        details: Record<string, any>,
        suggestedAlternatives: SuggestedAlternative[] = []
    ) {
        super(
            'DATABASE_CONSTRAINT_VIOLATION',
            `Database constraint violation during ${operation}: ${constraint}`,
            'There was a data integrity issue. Please try again or contact support if the problem persists.',
            suggestedAlternatives,
            { operation, constraint, details }
        )
    }
}

export class CalendarIntegrationFailureError extends AppointmentError {
    constructor(
        operation: string,
        integrationService: string,
        fallbackUsed: boolean = false,
        suggestedAlternatives: SuggestedAlternative[] = []
    ) {
        const userMessage = fallbackUsed
            ? 'We\'re experiencing some delays with our scheduling system, but your request is being processed.'
            : 'Our scheduling system is temporarily unavailable. Please try again in a moment.'

        super(
            'CALENDAR_INTEGRATION_FAILURE',
            `Calendar integration failure during ${operation} with ${integrationService}`,
            userMessage,
            suggestedAlternatives,
            { operation, integrationService, fallbackUsed }
        )
    }
}

// Error factory for creating appointment-specific errors
export class AppointmentErrorFactory {
    static createAppointmentNotFoundError(
        appointmentId: string,
        businessId: string,
        alternativeAppointments: Array<{ id: string; startTime: Date; serviceName: string }> = []
    ): AppointmentNotFoundError {
        const suggestedAlternatives: SuggestedAlternative[] = alternativeAppointments.map(apt => ({
            type: 'action',
            title: `View ${apt.serviceName} appointment`,
            description: `${apt.startTime.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} at ${apt.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
            data: {
                actionType: 'view_appointment',
                actionData: { appointmentId: apt.id }
            }
        }))

        return new AppointmentNotFoundError(appointmentId, businessId, suggestedAlternatives)
    }

    static createInvalidStatusTransitionError(
        appointmentId: string,
        currentStatus: string,
        requestedStatus: string,
        validTransitions: string[]
    ): InvalidStatusTransitionError {
        const suggestedAlternatives: SuggestedAlternative[] = validTransitions.map(status => ({
            type: 'action',
            title: `Change to ${status}`,
            description: `Update appointment status to ${status}`,
            data: {
                actionType: 'update_status',
                actionData: { appointmentId, newStatus: status }
            }
        }))

        return new InvalidStatusTransitionError(
            appointmentId,
            currentStatus,
            requestedStatus,
            validTransitions,
            suggestedAlternatives
        )
    }

    static createMultiServiceBookingError(
        errorType: 'service_incompatibility' | 'staff_skill_mismatch' | 'duration_exceeded' | 'pricing_error',
        serviceIds: string[],
        serviceNames: string[],
        details: any,
        alternativeOptions: Array<{
            type: 'separate_bookings' | 'alternative_staff' | 'shorter_services'
            title: string
            description: string
            data?: any
        }> = []
    ): MultiServiceBookingError {
        const suggestedAlternatives: SuggestedAlternative[] = alternativeOptions.map(option => ({
            type: 'action',
            title: option.title,
            description: option.description,
            data: {
                actionType: option.type,
                actionData: option.data
            }
        }))

        return new MultiServiceBookingError(errorType, serviceIds, serviceNames, details, suggestedAlternatives)
    }

    static createPaymentRequiredError(
        appointmentId: string,
        operation: 'confirm' | 'complete' | 'reschedule',
        paymentDetails: {
            amountDue: number
            currency: string
            paymentType: 'deposit' | 'full_payment' | 'cancellation_fee'
            dueDate?: Date
        }
    ): PaymentRequiredError {
        const suggestedAlternatives: SuggestedAlternative[] = [
            {
                type: 'action',
                title: 'Make Payment',
                description: `Pay ${new Intl.NumberFormat('en-US', { style: 'currency', currency: paymentDetails.currency }).format(paymentDetails.amountDue / 100)}`,
                data: {
                    actionType: 'make_payment',
                    actionData: { appointmentId, paymentDetails }
                }
            }
        ]

        return new PaymentRequiredError(appointmentId, operation, paymentDetails, suggestedAlternatives)
    }
}

// Type guards for appointment error handling
export function isAppointmentError(error: any): error is AppointmentError {
    return error instanceof AppointmentError
}

export function isAppointmentNotFoundError(error: any): error is AppointmentNotFoundError {
    return error instanceof AppointmentNotFoundError
}

export function isInvalidStatusTransitionError(error: any): error is InvalidStatusTransitionError {
    return error instanceof InvalidStatusTransitionError
}

export function isMultiServiceBookingError(error: any): error is MultiServiceBookingError {
    return error instanceof MultiServiceBookingError
}

export function isPaymentRequiredError(error: any): error is PaymentRequiredError {
    return error instanceof PaymentRequiredError
}

export function isCalendarIntegrationFailureError(error: any): error is CalendarIntegrationFailureError {
    return error instanceof CalendarIntegrationFailureError
}

// Get error severity for appointment errors
export function getAppointmentErrorSeverity(error: AppointmentError): ErrorSeverity {
    switch (error.code) {
        case 'DATABASE_CONSTRAINT_VIOLATION':
        case 'CALENDAR_INTEGRATION_FAILURE':
            return ErrorSeverity.HIGH
        case 'APPOINTMENT_NOT_FOUND':
        case 'CLIENT_NOT_FOUND':
        case 'STAFF_NOT_FOUND':
        case 'SERVICE_NOT_FOUND':
            return ErrorSeverity.MEDIUM
        case 'INVALID_STATUS_TRANSITION':
        case 'APPOINTMENT_ALREADY_COMPLETED':
        case 'APPOINTMENT_CANCELLATION_ERROR':
        case 'MULTI_SERVICE_BOOKING_ERROR':
        case 'PAST_APPOINTMENT_MODIFICATION':
        case 'INSUFFICIENT_NOTICE':
        case 'PAYMENT_REQUIRED':
            return ErrorSeverity.LOW
        default:
            return ErrorSeverity.MEDIUM
    }
}

// Error context for appointment operations
export interface AppointmentErrorContext {
    businessId: string
    operation: string
    appointmentId?: string
    clientId?: string
    staffId?: string
    serviceIds?: string[]
    userId?: string
    sessionId?: string
    requestedTime?: Date
    currentStatus?: string
    requestedStatus?: string
}
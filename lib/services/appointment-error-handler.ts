/**
 * Appointment-specific error handler that extends the enhanced error handler
 * Provides comprehensive error handling for appointment booking operations
 */

import {
    AppointmentError,
    AppointmentErrorContext,
    AppointmentErrorFactory,
    CalendarIntegrationFailureError,
    ClientNotFoundError,
    DatabaseConstraintViolationError,
    StaffNotFoundError,
    getAppointmentErrorSeverity,
    isAppointmentError
} from '@/lib/errors/appointment-errors'
import {
    ErrorSeverity,
    SuggestedAlternative,
    isAvailabilityError
} from '@/lib/errors/availability-errors'
import { LogLevel, availabilityLogger } from '@/lib/monitoring/availability-logger'
import { Prisma } from '@prisma/client'
import { withEnhancedErrorHandling } from './enhanced-error-handler'
import { gracefulDegradation } from './graceful-degradation'

// Appointment operation types for error context
export type AppointmentOperation =
    | 'create_appointment'
    | 'update_appointment'
    | 'cancel_appointment'
    | 'get_appointment'
    | 'list_appointments'
    | 'update_status'
    | 'add_services'
    | 'remove_services'
    | 'validate_appointment'
    | 'check_conflicts'

// Error monitoring and alerting configuration
interface ErrorMonitoringConfig {
    enableAlerts: boolean
    alertThresholds: {
        errorRate: number // errors per minute
        criticalErrors: number // critical errors per hour
    }
    logLevel: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG'
}

class AppointmentErrorHandler {
    private static instance: AppointmentErrorHandler
    private errorCounts: Map<string, { count: number; lastReset: Date }> = new Map()
    private monitoringConfig: ErrorMonitoringConfig = {
        enableAlerts: true,
        alertThresholds: {
            errorRate: 10, // 10 errors per minute
            criticalErrors: 5 // 5 critical errors per hour
        },
        logLevel: 'ERROR'
    }

    static getInstance(): AppointmentErrorHandler {
        if (!AppointmentErrorHandler.instance) {
            AppointmentErrorHandler.instance = new AppointmentErrorHandler()
        }
        return AppointmentErrorHandler.instance
    }

    // Handle Prisma database errors and convert to appointment errors
    handleDatabaseError(
        error: unknown,
        context: AppointmentErrorContext
    ): AppointmentError {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            return this.handlePrismaKnownError(error, context)
        }

        if (error instanceof Prisma.PrismaClientUnknownRequestError) {
            return this.handlePrismaUnknownError(error, context)
        }

        if (error instanceof Prisma.PrismaClientValidationError) {
            return this.handlePrismaValidationError(error, context)
        }

        // Generic database error
        this.logError(error, context, ErrorSeverity.HIGH)
        return new DatabaseConstraintViolationError(
            context.operation,
            'unknown_database_error',
            { originalError: error instanceof Error ? error.message : String(error) }
        )
    }

    // Handle known Prisma errors
    private handlePrismaKnownError(
        error: Prisma.PrismaClientKnownRequestError,
        context: AppointmentErrorContext
    ): AppointmentError {
        switch (error.code) {
            case 'P2002': // Unique constraint violation
                return this.handleUniqueConstraintViolation(error, context)

            case 'P2025': // Record not found
                return this.handleRecordNotFound(error, context)

            case 'P2003': // Foreign key constraint violation
                return this.handleForeignKeyViolation(error, context)

            case 'P2016': // Query interpretation error
                return this.handleQueryError(error, context)

            default:
                this.logError(error, context, ErrorSeverity.HIGH)
                return new DatabaseConstraintViolationError(
                    context.operation,
                    error.code,
                    {
                        prismaError: error.message,
                        meta: error.meta
                    }
                )
        }
    }

    // Handle unique constraint violations
    private handleUniqueConstraintViolation(
        error: Prisma.PrismaClientKnownRequestError,
        context: AppointmentErrorContext
    ): AppointmentError {
        const target = error.meta?.target as string[] | undefined

        if (target?.includes('staffId') && target?.includes('startTime')) {
            // Staff double booking
            return AppointmentErrorFactory.createMultiServiceBookingError(
                'service_incompatibility',
                context.serviceIds || [],
                [], // Service names would need to be looked up
                { constraint: 'staff_time_conflict' },
                [{
                    type: 'separate_bookings',
                    title: 'Book at different times',
                    description: 'Select different time slots for your appointments'
                }]
            )
        }

        this.logError(error, context, ErrorSeverity.MEDIUM)
        return new DatabaseConstraintViolationError(
            context.operation,
            'unique_constraint_violation',
            {
                constraint: target?.join('_') || 'unknown',
                prismaError: error.message
            }
        )
    }

    // Handle record not found errors
    private handleRecordNotFound(
        error: Prisma.PrismaClientKnownRequestError,
        context: AppointmentErrorContext
    ): AppointmentError {
        if (context.appointmentId) {
            return AppointmentErrorFactory.createAppointmentNotFoundError(
                context.appointmentId,
                context.businessId
            )
        }

        this.logError(error, context, ErrorSeverity.MEDIUM)
        return new DatabaseConstraintViolationError(
            context.operation,
            'record_not_found',
            { prismaError: error.message }
        )
    }

    // Handle foreign key constraint violations
    private handleForeignKeyViolation(
        error: Prisma.PrismaClientKnownRequestError,
        context: AppointmentErrorContext
    ): AppointmentError {
        const field = error.meta?.field_name as string | undefined

        if (field?.includes('clientId')) {
            return new ClientNotFoundError(
                context.clientId || 'unknown',
                context.appointmentId,
                context
            )
        }

        if (field?.includes('staffId')) {
            return new StaffNotFoundError(
                context.staffId || 'unknown',
                context.appointmentId,
                context
            )
        }

        this.logError(error, context, ErrorSeverity.MEDIUM)
        return new DatabaseConstraintViolationError(
            context.operation,
            'foreign_key_violation',
            {
                field: field || 'unknown',
                prismaError: error.message
            }
        )
    }

    // Handle query interpretation errors
    private handleQueryError(
        error: Prisma.PrismaClientKnownRequestError,
        context: AppointmentErrorContext
    ): AppointmentError {
        this.logError(error, context, ErrorSeverity.HIGH)
        return new DatabaseConstraintViolationError(
            context.operation,
            'query_error',
            { prismaError: error.message }
        )
    }

    // Handle unknown Prisma errors
    private handlePrismaUnknownError(
        error: Prisma.PrismaClientUnknownRequestError,
        context: AppointmentErrorContext
    ): AppointmentError {
        this.logError(error, context, ErrorSeverity.HIGH)
        return new DatabaseConstraintViolationError(
            context.operation,
            'unknown_database_error',
            { prismaError: error.message }
        )
    }

    // Handle Prisma validation errors
    private handlePrismaValidationError(
        error: Prisma.PrismaClientValidationError,
        context: AppointmentErrorContext
    ): AppointmentError {
        this.logError(error, context, ErrorSeverity.MEDIUM)
        return new DatabaseConstraintViolationError(
            context.operation,
            'validation_error',
            { prismaError: error.message }
        )
    }

    // Handle calendar integration failures with graceful degradation
    async handleCalendarIntegrationError<T>(
        operation: string,
        context: AppointmentErrorContext,
        calendarOperation: () => Promise<T>,
        fallbackOperation?: () => Promise<T>
    ): Promise<T> {
        try {
            return await gracefulDegradation.executeWithDegradation(
                'calendar_integration',
                calendarOperation,
                fallbackOperation || (() => {
                    throw new CalendarIntegrationFailureError(operation, 'calendar_service', false)
                }),
                context
            )
        } catch (error) {
            if (isAvailabilityError(error) || isAppointmentError(error)) {
                throw error
            }

            this.logError(error, context, ErrorSeverity.HIGH)
            throw new CalendarIntegrationFailureError(
                operation,
                'calendar_service',
                fallbackOperation !== undefined
            )
        }
    }

    // Generate detailed error messages with suggested alternatives
    generateDetailedErrorMessage(
        error: AppointmentError,
        context: AppointmentErrorContext
    ): {
        userMessage: string
        technicalMessage: string
        suggestedActions: SuggestedAlternative[]
        errorCode: string
        severity: ErrorSeverity
    } {
        const severity = getAppointmentErrorSeverity(error)

        // Add context-specific suggestions
        const contextualSuggestions = this.generateContextualSuggestions(error, context)
        const allSuggestions = [...error.suggestedAlternatives, ...contextualSuggestions]

        return {
            userMessage: error.userMessage,
            technicalMessage: error.message,
            suggestedActions: allSuggestions.slice(0, 5), // Limit to 5 suggestions
            errorCode: error.code,
            severity
        }
    }

    // Generate contextual suggestions based on error and context
    private generateContextualSuggestions(
        error: AppointmentError,
        context: AppointmentErrorContext
    ): SuggestedAlternative[] {
        const suggestions: SuggestedAlternative[] = []

        // Add operation-specific suggestions
        switch (context.operation) {
            case 'create_appointment':
                suggestions.push({
                    type: 'action',
                    title: 'View available times',
                    description: 'See all available appointment slots',
                    data: {
                        actionType: 'view_availability',
                        actionData: {
                            businessId: context.businessId,
                            staffId: context.staffId,
                            serviceIds: context.serviceIds
                        }
                    }
                })
                break

            case 'update_appointment':
                if (context.appointmentId) {
                    suggestions.push({
                        type: 'action',
                        title: 'View appointment details',
                        description: 'Check current appointment information',
                        data: {
                            actionType: 'view_appointment',
                            actionData: { appointmentId: context.appointmentId }
                        }
                    })
                }
                break

            case 'cancel_appointment':
                suggestions.push({
                    type: 'action',
                    title: 'Contact support',
                    description: 'Get help with cancellation policies',
                    data: {
                        actionType: 'contact_support',
                        actionData: { reason: 'cancellation_help' }
                    }
                })
                break
        }

        // Add error-specific suggestions
        if (error.code === 'APPOINTMENT_NOT_FOUND') {
            suggestions.push({
                type: 'action',
                title: 'View all appointments',
                description: 'See your complete appointment history',
                data: {
                    actionType: 'list_appointments',
                    actionData: { businessId: context.businessId }
                }
            })
        }

        return suggestions
    }

    // Log errors with appropriate severity and monitoring
    private logError(
        error: unknown,
        context: AppointmentErrorContext,
        severity: ErrorSeverity
    ): void {
        const errorMessage = error instanceof Error ? error.message : String(error)
        const errorStack = error instanceof Error ? error.stack : undefined

        // Update error counts for monitoring
        this.updateErrorCounts(context.operation, severity)

        // Log the error
        availabilityLogger.log(
            severity === ErrorSeverity.CRITICAL || severity === ErrorSeverity.HIGH ? LogLevel.ERROR : LogLevel.WARN,
            `Appointment ${context.operation} failed: ${errorMessage}`,
            context,
            {
                error: errorMessage,
                stack: errorStack,
                severity,
                timestamp: new Date().toISOString()
            }
        )

        // Trigger alerts if thresholds are exceeded
        if (this.monitoringConfig.enableAlerts) {
            this.checkAlertThresholds(context.operation, severity)
        }
    }

    // Update error counts for monitoring
    private updateErrorCounts(operation: string, severity: ErrorSeverity): void {
        const key = `${operation}_${severity}`
        const now = new Date()
        const existing = this.errorCounts.get(key)

        if (!existing || now.getTime() - existing.lastReset.getTime() > 60000) { // Reset every minute
            this.errorCounts.set(key, { count: 1, lastReset: now })
        } else {
            existing.count++
        }
    }

    // Check if alert thresholds are exceeded
    private checkAlertThresholds(operation: string, severity: ErrorSeverity): void {
        const now = new Date()

        // Check error rate threshold
        const errorRateKey = `${operation}_total`
        const errorRate = this.errorCounts.get(errorRateKey)
        if (errorRate && errorRate.count > this.monitoringConfig.alertThresholds.errorRate) {
            this.triggerAlert('HIGH_ERROR_RATE', {
                operation,
                errorRate: errorRate.count,
                threshold: this.monitoringConfig.alertThresholds.errorRate,
                timeWindow: '1 minute'
            })
        }

        // Check critical error threshold
        if (severity === ErrorSeverity.CRITICAL) {
            const criticalKey = `${operation}_CRITICAL`
            const criticalCount = this.errorCounts.get(criticalKey)
            if (criticalCount && criticalCount.count > this.monitoringConfig.alertThresholds.criticalErrors) {
                this.triggerAlert('HIGH_CRITICAL_ERROR_RATE', {
                    operation,
                    criticalErrors: criticalCount.count,
                    threshold: this.monitoringConfig.alertThresholds.criticalErrors,
                    timeWindow: '1 hour'
                })
            }
        }
    }

    // Trigger monitoring alerts
    private triggerAlert(alertType: string, data: Record<string, any>): void {
        availabilityLogger.log(LogLevel.ERROR, `ALERT: ${alertType}`, data, {
            alertType,
            timestamp: new Date().toISOString(),
            severity: 'CRITICAL'
        })

        // In a real implementation, this would integrate with monitoring systems
        // like Sentry, DataDog, or custom alerting infrastructure
    }

    // Validate appointment operation context
    validateContext(context: AppointmentErrorContext): void {
        if (!context.businessId) {
            throw new DatabaseConstraintViolationError(
                'context_validation',
                'business_context_missing',
                { field: 'businessId' },
                context
            )
        }

        if (!context.operation) {
            throw new DatabaseConstraintViolationError(
                'context_validation',
                'operation_context_missing',
                { field: 'operation' },
                context
            )
        }
    }

    // Update monitoring configuration
    updateMonitoringConfig(config: Partial<ErrorMonitoringConfig>): void {
        this.monitoringConfig = { ...this.monitoringConfig, ...config }
    }

    // Get error statistics for monitoring dashboard
    getErrorStatistics(): {
        totalErrors: number
        errorsByOperation: Record<string, number>
        errorsBySeverity: Record<ErrorSeverity, number>
        recentErrors: Array<{
            operation: string
            severity: ErrorSeverity
            count: number
            lastOccurrence: Date
        }>
    } {
        const stats = {
            totalErrors: 0,
            errorsByOperation: {} as Record<string, number>,
            errorsBySeverity: {} as Record<ErrorSeverity, number>,
            recentErrors: [] as Array<{
                operation: string
                severity: ErrorSeverity
                count: number
                lastOccurrence: Date
            }>
        }

        for (const [key, data] of this.errorCounts.entries()) {
            const [operation, severity] = key.split('_')

            stats.totalErrors += data.count
            stats.errorsByOperation[operation] = (stats.errorsByOperation[operation] || 0) + data.count
            stats.errorsBySeverity[severity as ErrorSeverity] = (stats.errorsBySeverity[severity as ErrorSeverity] || 0) + data.count

            stats.recentErrors.push({
                operation,
                severity: severity as ErrorSeverity,
                count: data.count,
                lastOccurrence: data.lastReset
            })
        }

        return stats
    }
}

// Export singleton instance
export const appointmentErrorHandler = AppointmentErrorHandler.getInstance()

// Utility function to wrap appointment operations with comprehensive error handling
export async function withAppointmentErrorHandling<T>(
    operation: AppointmentOperation,
    context: AppointmentErrorContext,
    fn: () => Promise<T>
): Promise<T> {
    try {
        // Validate context
        appointmentErrorHandler.validateContext(context)

        // Execute with enhanced error handling
        return await withEnhancedErrorHandling(operation, context, fn)

    } catch (error) {
        if (isAppointmentError(error) || isAvailabilityError(error)) {
            // Already a properly formatted error
            throw error
        }

        // Handle database errors
        if (error instanceof Prisma.PrismaClientKnownRequestError ||
            error instanceof Prisma.PrismaClientUnknownRequestError ||
            error instanceof Prisma.PrismaClientValidationError) {
            throw appointmentErrorHandler.handleDatabaseError(error, context)
        }

        // Handle unexpected errors
        const appointmentError = new DatabaseConstraintViolationError(
            operation,
            'unexpected_error',
            {
                originalError: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            },
            context
        )

        throw appointmentError
    }
}

// Utility function for handling calendar integration with error handling
export async function withCalendarIntegrationErrorHandling<T>(
    operation: string,
    context: AppointmentErrorContext,
    calendarOperation: () => Promise<T>,
    fallbackOperation?: () => Promise<T>
): Promise<T> {
    return appointmentErrorHandler.handleCalendarIntegrationError(
        operation,
        context,
        calendarOperation,
        fallbackOperation
    )
}
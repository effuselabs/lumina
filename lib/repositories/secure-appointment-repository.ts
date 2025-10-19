import {
    SecurityViolationType,
    businessContextSecurity,
    createAuditLog,
    logSecurityViolation
} from '@/lib/security/business-context-security'
import { AppointmentWithRelations } from '@/types/database'
import { AppointmentStatus, BusinessRole } from '@prisma/client'
import {
    AppointmentFilters,
    AppointmentRepository,
    CreateAppointmentRequest,
    UpdateAppointmentRequest
} from './appointment-repository'

// ============================================================================
// SECURE APPOINTMENT REPOSITORY
// ============================================================================

/**
 * Enhanced appointment repository with comprehensive security validation
 * Extends the base AppointmentRepository with business context security
 */
export class SecureAppointmentRepository extends AppointmentRepository {

    /**
     * Create appointment with comprehensive security validation
     */
    override async create(
        request: CreateAppointmentRequest,
        userId?: string,
        metadata?: Record<string, any>
    ): Promise<AppointmentWithRelations> {
        // Validate business context
        const validation = await businessContextSecurity.validateBusinessContext(
            request.businessId,
            userId,
            ['OWNER', 'MANAGER', 'STAFF'],
            { action: 'create_appointment', ...metadata }
        )

        if (!validation.isValid) {
            throw new Error('Unauthorized: Cannot create appointment in this business context')
        }

        // Validate staff belongs to business
        const staffValidation = await businessContextSecurity.validateStaffAccess(
            request.staffId,
            request.businessId,
            userId,
            { action: 'assign_appointment', ...metadata }
        )

        if (!staffValidation.isValid) {
            throw new Error('Unauthorized: Staff member not found or access denied')
        }

        // Validate client belongs to business if provided
        if (request.clientId) {
            const clientValidation = await businessContextSecurity.validateClientAccess(
                request.clientId,
                request.businessId,
                userId,
                { action: 'book_for_client', ...metadata }
            )

            if (!clientValidation.isValid) {
                throw new Error('Unauthorized: Client not found or access denied')
            }
        }

        try {
            // Create appointment using parent method
            const appointment = await super.create(request)

            // Create audit log
            await createAuditLog({
                userId: validation.securityContext!.userId,
                businessId: request.businessId,
                action: 'CREATE_APPOINTMENT',
                resourceType: 'appointment',
                resourceId: appointment.id,
                newValues: {
                    startTime: appointment.startTime,
                    endTime: appointment.endTime,
                    staffId: appointment.staffId,
                    clientId: appointment.clientId,
                    totalPrice: appointment.totalPrice,
                    services: appointment.services.map(s => s.serviceName)
                },
                metadata: {
                    totalDuration: appointment.totalDuration,
                    serviceCount: appointment.services.length,
                    ...metadata
                },
                ...this.extractRequestMetadata(metadata)
            })

            return appointment
        } catch (error) {
            // Log security violation if creation fails due to constraint violations
            if (error instanceof Error && error.message.includes('constraint')) {
                await logSecurityViolation({
                    type: SecurityViolationType.SUSPICIOUS_ACTIVITY,
                    userId: validation.securityContext?.userId,
                    businessId: request.businessId,
                    resourceType: 'appointment',
                    attemptedAction: 'create_appointment',
                    details: {
                        error: error.message,
                        request: this.sanitizeRequestForLogging(request),
                        ...metadata
                    }
                })
            }
            throw error
        }
    }

    /**
     * Find appointment by ID with security validation
     */
    override async findById(
        id: string,
        businessId: string,
        userId?: string,
        metadata?: Record<string, any>
    ): Promise<AppointmentWithRelations | null> {
        // Validate appointment access
        const validation = await businessContextSecurity.validateAppointmentAccess(
            id,
            businessId,
            userId,
            'view_appointment',
            metadata
        )

        if (!validation.isValid) {
            return null // Return null instead of throwing to prevent information leakage
        }

        try {
            const appointment = await super.findById(id, businessId)

            // Log access for audit trail
            if (appointment) {
                await createAuditLog({
                    userId: validation.securityContext!.userId,
                    businessId,
                    action: 'VIEW_APPOINTMENT',
                    resourceType: 'appointment',
                    resourceId: id,
                    metadata: {
                        appointmentDate: appointment.startTime,
                        clientName: appointment.client ?
                            `${appointment.client.firstName} ${appointment.client.lastName}` :
                            appointment.clientName,
                        ...metadata
                    },
                    ...this.extractRequestMetadata(metadata)
                })
            }

            return appointment
        } catch (error) {
            await logSecurityViolation({
                type: SecurityViolationType.SUSPICIOUS_ACTIVITY,
                userId: validation.securityContext?.userId,
                businessId,
                resourceId: id,
                resourceType: 'appointment',
                attemptedAction: 'view_appointment',
                details: {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    ...metadata
                }
            })
            throw error
        }
    }

    /**
     * Update appointment with security validation and audit logging
     */
    override async update(
        id: string,
        businessId: string,
        updates: UpdateAppointmentRequest,
        userId?: string,
        metadata?: Record<string, any>
    ): Promise<AppointmentWithRelations> {
        // Validate appointment access
        const validation = await businessContextSecurity.validateAppointmentAccess(
            id,
            businessId,
            userId,
            'update_appointment',
            metadata
        )

        if (!validation.isValid) {
            throw new Error('Unauthorized: Cannot update appointment')
        }

        // Get current appointment for audit trail
        const currentAppointment = await super.findById(id, businessId)
        if (!currentAppointment) {
            throw new Error('Appointment not found')
        }

        // Check if user has permission to modify appointments
        const hasModifyPermission = validation.securityContext?.businessRole &&
            ['OWNER', 'MANAGER'].includes(validation.securityContext.businessRole)

        // Staff can only modify their own appointments
        if (!hasModifyPermission && currentAppointment.staffId !== validation.securityContext?.userId) {
            await logSecurityViolation({
                type: SecurityViolationType.INSUFFICIENT_PERMISSIONS,
                userId: validation.securityContext?.userId,
                businessId,
                resourceId: id,
                resourceType: 'appointment',
                attemptedAction: 'update_appointment',
                details: {
                    userRole: validation.securityContext?.businessRole,
                    appointmentStaffId: currentAppointment.staffId,
                    ...metadata
                }
            })
            throw new Error('Unauthorized: Can only modify your own appointments')
        }

        try {
            const updatedAppointment = await super.update(id, businessId, updates)

            // Create audit log with old and new values
            await createAuditLog({
                userId: validation.securityContext!.userId,
                businessId,
                action: 'UPDATE_APPOINTMENT',
                resourceType: 'appointment',
                resourceId: id,
                oldValues: {
                    startTime: currentAppointment.startTime,
                    endTime: currentAppointment.endTime,
                    status: currentAppointment.status,
                    totalPrice: currentAppointment.totalPrice,
                    notes: currentAppointment.notes,
                    internalNotes: currentAppointment.internalNotes
                },
                newValues: {
                    startTime: updatedAppointment.startTime,
                    endTime: updatedAppointment.endTime,
                    status: updatedAppointment.status,
                    totalPrice: updatedAppointment.totalPrice,
                    notes: updatedAppointment.notes,
                    internalNotes: updatedAppointment.internalNotes
                },
                metadata: {
                    changedFields: Object.keys(updates),
                    ...metadata
                },
                ...this.extractRequestMetadata(metadata)
            })

            return updatedAppointment
        } catch (error) {
            await logSecurityViolation({
                type: SecurityViolationType.SUSPICIOUS_ACTIVITY,
                userId: validation.securityContext?.userId,
                businessId,
                resourceId: id,
                resourceType: 'appointment',
                attemptedAction: 'update_appointment',
                details: {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    updates: this.sanitizeUpdatesForLogging(updates),
                    ...metadata
                }
            })
            throw error
        }
    }

    /**
     * Delete appointment with security validation
     */
    override async delete(
        id: string,
        businessId: string,
        userId?: string,
        metadata?: Record<string, any>
    ): Promise<void> {
        // Validate appointment access with elevated permissions
        const validation = await businessContextSecurity.validateAppointmentAccess(
            id,
            businessId,
            userId,
            'delete_appointment',
            metadata
        )

        if (!validation.isValid) {
            throw new Error('Unauthorized: Cannot delete appointment')
        }

        // Only owners and managers can delete appointments
        const canDelete = validation.securityContext?.businessRole &&
            ['OWNER', 'MANAGER'].includes(validation.securityContext.businessRole)

        if (!canDelete) {
            await logSecurityViolation({
                type: SecurityViolationType.INSUFFICIENT_PERMISSIONS,
                userId: validation.securityContext?.userId,
                businessId,
                resourceId: id,
                resourceType: 'appointment',
                attemptedAction: 'delete_appointment',
                details: {
                    userRole: validation.securityContext?.businessRole,
                    requiredRoles: ['OWNER', 'MANAGER'],
                    ...metadata
                }
            })
            throw new Error('Unauthorized: Only owners and managers can delete appointments')
        }

        // Get appointment details for audit log
        const appointment = await super.findById(id, businessId)
        if (!appointment) {
            throw new Error('Appointment not found')
        }

        try {
            await super.delete(id, businessId)

            // Create audit log
            await createAuditLog({
                userId: validation.securityContext!.userId,
                businessId,
                action: 'DELETE_APPOINTMENT',
                resourceType: 'appointment',
                resourceId: id,
                oldValues: {
                    startTime: appointment.startTime,
                    endTime: appointment.endTime,
                    status: appointment.status,
                    clientName: appointment.client ?
                        `${appointment.client.firstName} ${appointment.client.lastName}` :
                        appointment.clientName,
                    services: appointment.services.map(s => s.serviceName)
                },
                metadata: {
                    deletionReason: metadata?.reason || 'Not specified',
                    ...metadata
                },
                ...this.extractRequestMetadata(metadata)
            })
        } catch (error) {
            await logSecurityViolation({
                type: SecurityViolationType.SUSPICIOUS_ACTIVITY,
                userId: validation.securityContext?.userId,
                businessId,
                resourceId: id,
                resourceType: 'appointment',
                attemptedAction: 'delete_appointment',
                details: {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    ...metadata
                }
            })
            throw error
        }
    }

    /**
     * Update appointment status with security validation
     */
    override async updateStatus(
        id: string,
        businessId: string,
        status: AppointmentStatus,
        userId?: string,
        metadata?: Record<string, any>
    ): Promise<AppointmentWithRelations> {
        // Validate appointment access
        const validation = await businessContextSecurity.validateAppointmentAccess(
            id,
            businessId,
            userId,
            'update_appointment_status',
            metadata
        )

        if (!validation.isValid) {
            throw new Error('Unauthorized: Cannot update appointment status')
        }

        // Get current appointment
        const currentAppointment = await super.findById(id, businessId)
        if (!currentAppointment) {
            throw new Error('Appointment not found')
        }

        // Validate status transition permissions
        const canUpdateStatus = this.validateStatusUpdatePermission(
            currentAppointment.status,
            status,
            validation.securityContext?.businessRole,
            currentAppointment.staffId === validation.securityContext?.userId
        )

        if (!canUpdateStatus.allowed) {
            await logSecurityViolation({
                type: SecurityViolationType.INSUFFICIENT_PERMISSIONS,
                userId: validation.securityContext?.userId,
                businessId,
                resourceId: id,
                resourceType: 'appointment',
                attemptedAction: 'update_appointment_status',
                details: {
                    currentStatus: currentAppointment.status,
                    requestedStatus: status,
                    userRole: validation.securityContext?.businessRole,
                    isAssignedStaff: currentAppointment.staffId === validation.securityContext?.userId,
                    reason: canUpdateStatus.reason,
                    ...metadata
                }
            })
            throw new Error(`Unauthorized: ${canUpdateStatus.reason}`)
        }

        try {
            const updatedAppointment = await super.updateStatus(id, businessId, status)

            // Create audit log
            await createAuditLog({
                userId: validation.securityContext!.userId,
                businessId,
                action: 'UPDATE_APPOINTMENT_STATUS',
                resourceType: 'appointment',
                resourceId: id,
                oldValues: { status: currentAppointment.status },
                newValues: { status },
                metadata: {
                    statusTransition: `${currentAppointment.status} -> ${status}`,
                    ...metadata
                },
                ...this.extractRequestMetadata(metadata)
            })

            return updatedAppointment
        } catch (error) {
            await logSecurityViolation({
                type: SecurityViolationType.SUSPICIOUS_ACTIVITY,
                userId: validation.securityContext?.userId,
                businessId,
                resourceId: id,
                resourceType: 'appointment',
                attemptedAction: 'update_appointment_status',
                details: {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    currentStatus: currentAppointment.status,
                    requestedStatus: status,
                    ...metadata
                }
            })
            throw error
        }
    }

    /**
     * Find appointments by business with security scoping
     */
    async findByBusinessSecure(
        businessId: string,
        filters: AppointmentFilters = {},
        userId?: string,
        metadata?: Record<string, any>
    ) {
        // Validate business context
        const validation = await businessContextSecurity.validateBusinessContext(
            businessId,
            userId,
            ['OWNER', 'MANAGER', 'STAFF'],
            { action: 'list_appointments', ...metadata }
        )

        if (!validation.isValid) {
            throw new Error('Unauthorized: Cannot access appointments for this business')
        }

        // Staff can only see their own appointments unless they're managers/owners
        const canViewAll = validation.securityContext?.businessRole &&
            ['OWNER', 'MANAGER'].includes(validation.securityContext.businessRole)

        const secureFilters = canViewAll ? filters : {
            ...filters,
            staffId: validation.securityContext?.userId // Force filter to user's appointments
        }

        try {
            const result = await super.findByBusiness(businessId, secureFilters)

            // Log access for monitoring
            await createAuditLog({
                userId: validation.securityContext!.userId,
                businessId,
                action: 'LIST_APPOINTMENTS',
                resourceType: 'appointment',
                metadata: {
                    resultCount: result.appointments.length,
                    filters: secureFilters,
                    canViewAll,
                    ...metadata
                },
                ...this.extractRequestMetadata(metadata)
            })

            return result
        } catch (error) {
            await logSecurityViolation({
                type: SecurityViolationType.SUSPICIOUS_ACTIVITY,
                userId: validation.securityContext?.userId,
                businessId,
                resourceType: 'appointment',
                attemptedAction: 'list_appointments',
                details: {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    filters,
                    ...metadata
                }
            })
            throw error
        }
    }

    // ============================================================================
    // PRIVATE HELPER METHODS
    // ============================================================================

    /**
     * Validate status update permissions
     */
    private validateStatusUpdatePermission(
        currentStatus: AppointmentStatus,
        newStatus: AppointmentStatus,
        userRole?: BusinessRole,
        isAssignedStaff?: boolean
    ): { allowed: boolean; reason?: string } {
        // Owners and managers can update any status
        if (userRole && ['OWNER', 'MANAGER'].includes(userRole)) {
            return { allowed: true }
        }

        // Staff can only update their own appointments
        if (!isAssignedStaff) {
            return { allowed: false, reason: 'Can only update status of your own appointments' }
        }

        // Define allowed transitions for staff
        const allowedStaffTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
            SCHEDULED: ['CONFIRMED', 'CANCELLED'],
            CONFIRMED: ['IN_PROGRESS', 'CANCELLED'],
            IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
            COMPLETED: [], // Cannot change completed status
            CANCELLED: [], // Cannot change cancelled status
            NO_SHOW: [] // Cannot change no-show status
        }

        const allowedStatuses = allowedStaffTransitions[currentStatus] || []

        if (!allowedStatuses.includes(newStatus)) {
            return {
                allowed: false,
                reason: `Cannot transition from ${currentStatus} to ${newStatus}`
            }
        }

        return { allowed: true }
    }

    /**
     * Extract request metadata for logging
     */
    private extractRequestMetadata(metadata?: Record<string, any>) {
        return {
            ipAddress: metadata?.ipAddress,
            userAgent: metadata?.userAgent,
            requestId: metadata?.requestId
        }
    }

    /**
     * Sanitize request data for logging (remove sensitive information)
     */
    private sanitizeRequestForLogging(request: CreateAppointmentRequest) {
        return {
            businessId: request.businessId,
            staffId: request.staffId,
            startTime: request.startTime,
            endTime: request.endTime,
            totalDuration: request.totalDuration,
            totalPrice: request.totalPrice,
            serviceCount: request.services.length,
            hasClientId: !!request.clientId,
            hasClientInfo: !!(request.clientName || request.clientEmail || request.clientPhone)
        }
    }

    /**
     * Sanitize update data for logging
     */
    private sanitizeUpdatesForLogging(updates: UpdateAppointmentRequest) {
        return {
            hasTimeChange: !!(updates.startTime || updates.endTime),
            hasPriceChange: !!updates.totalPrice,
            hasStatusChange: !!(updates as any).status,
            hasNotesChange: !!(updates.notes || updates.internalNotes),
            changedFields: Object.keys(updates)
        }
    }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const secureAppointmentRepository = new SecureAppointmentRepository()
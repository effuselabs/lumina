/**
 * Appointment Validation API Route
 * 
 * Endpoint for validating appointment data before creation or updates,
 * including availability, conflicts, and business rules validation.
 * 
 * Requirements: 4.1, 4.2, 4.3, 1.1, 1.2, 1.3
 * 
 * @version 1.0.0
 * @author Lumina Development Team
 */

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { CalendarIntegration } from '@/lib/services/calendar-integration'
import { MultiServiceCoordinator } from '@/lib/services/multi-service-coordinator'
import {
    validateAppointmentSchema
} from '@/lib/validations/appointment'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Initialize services
const multiServiceCoordinator = new MultiServiceCoordinator()

// ============================================================================
// POST /api/appointments/validate - Validate appointment data
// ============================================================================

export async function POST(request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Parse and validate request body
        const body = await request.json()
        const validatedData = validateAppointmentSchema.parse(body)

        // Verify user has access to this business
        const businessUser = await prisma.businessUser.findFirst({
            where: {
                businessId: validatedData.businessId,
                userId: session.user.id,
            },
        })

        if (!businessUser) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        // Verify staff belongs to the business
        const staff = await prisma.staff.findFirst({
            where: {
                id: validatedData.staffId,
                businessId: validatedData.businessId,
                isActive: true
            },
            select: {
                id: true,
                displayName: true,
                businessId: true
            }
        })

        if (!staff) {
            return NextResponse.json({
                error: 'Staff member not found or not active in this business'
            }, { status: 400 })
        }

        // Verify client belongs to the business (if provided)
        let client = null
        if (validatedData.clientId) {
            client = await prisma.client.findFirst({
                where: {
                    id: validatedData.clientId,
                    businessId: validatedData.businessId
                },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true
                }
            })

            if (!client) {
                return NextResponse.json({
                    error: 'Client not found in this business'
                }, { status: 400 })
            }
        }

        // Verify all services belong to the business
        const services = await prisma.service.findMany({
            where: {
                id: { in: validatedData.services },
                businessId: validatedData.businessId,
                isActive: true
            },
            select: {
                id: true,
                name: true,
                duration: true,
                price: true,
                category: true
            }
        })

        if (services.length !== validatedData.services.length) {
            return NextResponse.json({
                error: 'One or more services not found or not active in this business'
            }, { status: 400 })
        }

        // Initialize validation result
        const validationResult = {
            isValid: true,
            errors: [] as string[],
            warnings: [] as string[],
            validations: {
                basicValidation: { passed: true, details: 'Basic data validation passed' },
                serviceValidation: { passed: false, details: '', services: [] as any[] },
                availabilityValidation: { passed: false, details: '', alternatives: [] as any[] },
                conflictValidation: { passed: false, details: '', conflicts: [] as any[] },
                durationValidation: { passed: false, details: '' },
                businessRulesValidation: { passed: false, details: '' }
            },
            recommendations: [] as string[],
            metadata: {
                requestedTime: {
                    startTime: validatedData.startTime,
                    endTime: validatedData.endTime,
                    duration: Math.round((validatedData.endTime.getTime() - validatedData.startTime.getTime()) / (1000 * 60))
                },
                staff: {
                    id: staff.id,
                    name: staff.displayName
                },
                client: client ? {
                    id: client.id,
                    name: `${client.firstName} ${client.lastName}`,
                    email: client.email,
                    phone: client.phone
                } : null,
                services: services.map(s => ({
                    id: s.id,
                    name: s.name,
                    duration: s.duration,
                    price: s.price.toNumber(),
                    category: s.category
                })),
                validatedAt: new Date().toISOString()
            }
        }

        // 1. Validate multi-service booking
        try {
            const serviceBookingRequests = services.map((service, index) => ({
                serviceId: service.id,
                serviceName: service.name,
                price: service.price.toNumber(),
                duration: service.duration,
                serviceOrder: index + 1,
                startOffset: 0, // Will be calculated by coordinator
                assignedStaffId: validatedData.staffId
            }))

            const serviceValidation = await multiServiceCoordinator.validateMultiServiceBooking(
                serviceBookingRequests,
                { startTime: validatedData.startTime, endTime: validatedData.endTime },
                validatedData.staffId,
                validatedData.businessId
            )

            validationResult.validations.serviceValidation = {
                passed: serviceValidation.isValid,
                details: serviceValidation.isValid ? 'Multi-service booking validation passed' : serviceValidation.errors.join(', '),
                services: serviceValidation.optimizedServices || serviceBookingRequests
            }

            if (!serviceValidation.isValid) {
                validationResult.isValid = false
                validationResult.errors.push(...serviceValidation.errors)
            }

            if (serviceValidation.warnings.length > 0) {
                validationResult.warnings.push(...serviceValidation.warnings)
            }
        } catch (error) {
            validationResult.isValid = false
            validationResult.errors.push('Service validation failed')
            validationResult.validations.serviceValidation = {
                passed: false,
                details: `Service validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                services: []
            }
        }

        // 2. Check availability
        try {
            const availabilityResult = await CalendarIntegration.checkAvailability({
                businessId: validatedData.businessId,
                staffId: validatedData.staffId,
                startTime: validatedData.startTime,
                endTime: validatedData.endTime,
                serviceIds: validatedData.services,
                excludeAppointmentId: validatedData.excludeAppointmentId
            })

            validationResult.validations.availabilityValidation = {
                passed: availabilityResult.isAvailable,
                details: availabilityResult.isAvailable ? 'Time slot is available' : availabilityResult.reason || 'Time slot not available',
                alternatives: availabilityResult.alternatives?.map(alt => ({
                    startTime: alt.startTime,
                    endTime: alt.endTime,
                    staffId: alt.staffId,
                    staffName: alt.staffName
                })) || []
            }

            if (!availabilityResult.isAvailable) {
                validationResult.isValid = false
                validationResult.errors.push('Selected time slot is not available')

                if (availabilityResult.alternatives && availabilityResult.alternatives.length > 0) {
                    validationResult.recommendations.push(`${availabilityResult.alternatives.length} alternative time slots available`)
                }
            }
        } catch (error) {
            validationResult.isValid = false
            validationResult.errors.push('Availability check failed')
            validationResult.validations.availabilityValidation = {
                passed: false,
                details: `Availability check error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                alternatives: []
            }
        }

        // 3. Check for conflicts
        try {
            const conflictResult = await CalendarIntegration.detectConflicts({
                businessId: validatedData.businessId,
                staffId: validatedData.staffId,
                startTime: validatedData.startTime,
                endTime: validatedData.endTime,
                serviceIds: validatedData.services,
                clientId: validatedData.clientId,
                excludeAppointmentId: validatedData.excludeAppointmentId
            })

            validationResult.validations.conflictValidation = {
                passed: !conflictResult.hasConflicts,
                details: conflictResult.hasConflicts ? `${conflictResult.conflicts.length} conflicts detected` : 'No conflicts detected',
                conflicts: conflictResult.conflicts.map(conflict => ({
                    type: conflict.type,
                    severity: conflict.severity,
                    message: conflict.message,
                    appointmentId: conflict.details.conflictingAppointment?.id,
                    clientName: conflict.details.conflictingAppointment?.clientName,
                    serviceName: conflict.details.conflictingAppointment?.services?.[0] || 'Unknown Service'
                }))
            }

            if (conflictResult.hasConflicts) {
                validationResult.isValid = false
                validationResult.errors.push('Appointment conflicts with existing bookings')
            }

            if (conflictResult.warnings.length > 0) {
                validationResult.warnings.push(...conflictResult.warnings.map(w => w.message))
            }
        } catch (error) {
            validationResult.isValid = false
            validationResult.errors.push('Conflict detection failed')
            validationResult.validations.conflictValidation = {
                passed: false,
                details: `Conflict detection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                conflicts: []
            }
        }

        // 4. Validate service duration
        try {
            const durationResult = await CalendarIntegration.validateServiceDuration({
                serviceIds: validatedData.services,
                timeSlot: { startTime: validatedData.startTime, endTime: validatedData.endTime },
                businessId: validatedData.businessId,
                staffId: validatedData.staffId
            })

            validationResult.validations.durationValidation = {
                passed: durationResult.isValid,
                details: durationResult.isValid ? 'Service duration validation passed' : durationResult.reason || 'Duration validation failed'
            }

            if (!durationResult.isValid) {
                validationResult.isValid = false
                validationResult.errors.push('Service duration does not match time slot')
            }
        } catch (error) {
            validationResult.isValid = false
            validationResult.errors.push('Duration validation failed')
            validationResult.validations.durationValidation = {
                passed: false,
                details: `Duration validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
        }

        // 5. Business rules validation
        try {
            // Check if appointment is in the past
            if (validatedData.startTime <= new Date()) {
                validationResult.isValid = false
                validationResult.errors.push('Cannot schedule appointments in the past')
            }

            // Check business hours (this would integrate with business hours from LUM-96)
            // For now, we'll mark as passed
            validationResult.validations.businessRulesValidation = {
                passed: validatedData.startTime > new Date(),
                details: validatedData.startTime > new Date() ? 'Business rules validation passed' : 'Appointment cannot be in the past'
            }
        } catch (error) {
            validationResult.validations.businessRulesValidation = {
                passed: false,
                details: `Business rules validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
        }

        // Add recommendations based on validation results
        if (validationResult.isValid) {
            validationResult.recommendations.push('Appointment data is valid and ready for booking')
        } else {
            validationResult.recommendations.push('Please address the validation errors before booking')
        }

        if (validationResult.warnings.length > 0) {
            validationResult.recommendations.push('Consider the warnings for optimal scheduling')
        }

        return NextResponse.json(validationResult)

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: 'Validation error',
                    details: error.errors.map(e => ({
                        field: e.path.join('.'),
                        message: e.message
                    }))
                },
                { status: 400 }
            )
        }

        console.error('Error validating appointment:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
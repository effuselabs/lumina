/**
 * Appointment Services Management API Route
 * 
 * Endpoint for managing services within an appointment,
 * supporting multi-service appointments with proper validation.
 * 
 * Requirements: 7.1, 7.2, 7.3
 * 
 * @version 1.0.0
 * @author Lumina Development Team
 */

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { AppointmentService } from '@/lib/services/appointment-service'
import {
    addServicesSchema,
    removeServicesSchema,
    type RemoveServicesRequest
} from '@/lib/validations/appointment'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Initialize appointment service
const appointmentService = new AppointmentService()

// ============================================================================
// POST /api/appointments/[id]/services - Add services to appointment
// ============================================================================

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const businessId = searchParams.get('businessId')

        if (!businessId) {
            return NextResponse.json({ error: 'Business ID is required' }, { status: 400 })
        }

        // Parse and validate request body
        const body = await request.json()
        const validatedData = addServicesSchema.parse(body)

        // Verify user has access to this business
        const businessUser = await prisma.businessUser.findFirst({
            where: {
                businessId,
                userId: session.user.id,
            },
        })

        if (!businessUser) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        // Verify appointment exists and belongs to business
        const appointment = await appointmentService.getAppointmentById(params.id, businessId)
        if (!appointment) {
            return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
        }

        // Verify all services belong to the business and are active
        const serviceIds = validatedData.services.map(s => s.serviceId)
        const services = await prisma.service.findMany({
            where: {
                id: { in: serviceIds },
                businessId,
                isActive: true
            }
        })

        if (services.length !== serviceIds.length) {
            return NextResponse.json({
                error: 'One or more services not found or not active in this business'
            }, { status: 400 })
        }

        // Update appointment with new services using service layer
        const updateResult = await appointmentService.updateAppointment(
            params.id,
            businessId,
            {
                services: [
                    // Keep existing services
                    ...appointment.services.map(s => ({
                        serviceId: s.serviceId,
                        serviceName: s.serviceName,
                        price: s.price.toNumber(),
                        duration: s.duration,
                        serviceOrder: s.serviceOrder,
                        startOffset: s.startOffset,
                        assignedStaffId: s.assignedStaffId || undefined
                    })),
                    // Add new services
                    ...validatedData.services
                ]
            }
        )

        if (!updateResult.success) {
            return NextResponse.json({
                error: 'Failed to add services to appointment',
                details: updateResult.errors,
                warnings: updateResult.warnings
            }, { status: 400 })
        }

        return NextResponse.json({
            appointment: updateResult.appointment,
            addedServices: validatedData.services,
            warnings: updateResult.warnings,
            message: 'Services added successfully'
        }, { status: 201 })

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

        console.error('Error adding services to appointment:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// ============================================================================
// DELETE /api/appointments/[id]/services - Remove services from appointment
// ============================================================================

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const businessId = searchParams.get('businessId')

        if (!businessId) {
            return NextResponse.json({ error: 'Business ID is required' }, { status: 400 })
        }

        // Parse and validate request body
        let validatedData: RemoveServicesRequest
        try {
            const body = await request.text()
            if (body.trim()) {
                const parsedBody = JSON.parse(body)
                validatedData = removeServicesSchema.parse(parsedBody)
            } else {
                return NextResponse.json({ error: 'Request body is required' }, { status: 400 })
            }
        } catch (parseError) {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
        }

        // Verify user has access to this business
        const businessUser = await prisma.businessUser.findFirst({
            where: {
                businessId,
                userId: session.user.id,
            },
        })

        if (!businessUser) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        // Verify appointment exists and belongs to business
        const appointment = await appointmentService.getAppointmentById(params.id, businessId)
        if (!appointment) {
            return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
        }

        // Check if appointment has at least one service after removal
        const remainingServices = appointment.services.filter(
            s => !validatedData.serviceIds.includes(s.serviceId)
        )

        if (remainingServices.length === 0) {
            return NextResponse.json({
                error: 'Cannot remove all services from appointment. At least one service is required.'
            }, { status: 400 })
        }

        // Update appointment with remaining services
        const updateResult = await appointmentService.updateAppointment(
            params.id,
            businessId,
            {
                services: remainingServices.map(s => ({
                    serviceId: s.serviceId,
                    serviceName: s.serviceName,
                    price: s.price.toNumber(),
                    duration: s.duration,
                    serviceOrder: s.serviceOrder,
                    startOffset: s.startOffset,
                    assignedStaffId: s.assignedStaffId || undefined
                }))
            }
        )

        if (!updateResult.success) {
            return NextResponse.json({
                error: 'Failed to remove services from appointment',
                details: updateResult.errors,
                warnings: updateResult.warnings
            }, { status: 400 })
        }

        return NextResponse.json({
            appointment: updateResult.appointment,
            removedServiceIds: validatedData.serviceIds,
            warnings: updateResult.warnings,
            message: 'Services removed successfully'
        })

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

        console.error('Error removing services from appointment:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// ============================================================================
// GET /api/appointments/[id]/services - Get appointment services
// ============================================================================

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const businessId = searchParams.get('businessId')

        if (!businessId) {
            return NextResponse.json({ error: 'Business ID is required' }, { status: 400 })
        }

        // Verify user has access to this business
        const businessUser = await prisma.businessUser.findFirst({
            where: {
                businessId,
                userId: session.user.id,
            },
        })

        if (!businessUser) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        // Get appointment with services
        const appointment = await appointmentService.getAppointmentById(params.id, businessId)
        if (!appointment) {
            return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
        }

        // Calculate service totals
        const totalDuration = appointment.services.reduce((sum, s) => sum + s.duration, 0)
        const totalPrice = appointment.services.reduce((sum, s) => sum + s.price.toNumber(), 0)

        return NextResponse.json({
            appointmentId: appointment.id,
            services: appointment.services.map(s => ({
                id: s.id,
                serviceId: s.serviceId,
                serviceName: s.serviceName,
                price: s.price.toNumber(),
                duration: s.duration,
                serviceOrder: s.serviceOrder,
                startOffset: s.startOffset,
                assignedStaffId: s.assignedStaffId
            })),
            totals: {
                duration: totalDuration,
                price: totalPrice,
                serviceCount: appointment.services.length
            }
        })

    } catch (error) {
        console.error('Error getting appointment services:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
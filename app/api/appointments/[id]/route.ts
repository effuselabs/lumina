/**
 * Individual Appointment API Routes
 * 
 * CRUD operations for individual appointments including retrieval, updates,
 * and cancellation with proper business context validation.
 * 
 * Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 5.1, 5.2, 5.3
 * 
 * @version 1.0.0
 * @author Lumina Development Team
 */

import { broadcastAppointmentChange } from '@/app/api/websocket/route'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { AppointmentService } from '@/lib/services/appointment-service'
import {
    type CancelAppointmentRequest,
    cancelAppointmentSchema,
    updateAppointmentSchema
} from '@/lib/validations/appointment'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Initialize appointment service
const appointmentService = new AppointmentService()

// ============================================================================
// GET /api/appointments/[id] - Get appointment details
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
        const includeConflicts = searchParams.get('includeConflicts') === 'true'
        const validateAvailability = searchParams.get('validateAvailability') === 'true'

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

        // Get appointment using service layer
        const appointment = await appointmentService.getAppointmentById(
            params.id,
            businessId,
            { includeConflicts, validateAvailability }
        )

        if (!appointment) {
            return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
        }

        return NextResponse.json({ appointment })

    } catch (error) {
        console.error('Error fetching appointment:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// ============================================================================
// PUT /api/appointments/[id] - Update appointment
// ============================================================================

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { businessId, ...updateData } = body

        if (!businessId) {
            return NextResponse.json({ error: 'Business ID is required' }, { status: 400 })
        }

        // Validate request body
        const validatedData = updateAppointmentSchema.parse(updateData)

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

        // Additional validation for services if provided
        if (validatedData.services) {
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
        }

        // Update appointment using service layer
        const result = await appointmentService.updateAppointment(
            params.id,
            businessId,
            validatedData
        )

        if (!result.success) {
            return NextResponse.json({
                error: 'Failed to update appointment',
                details: result.errors,
                warnings: result.warnings
            }, { status: 400 })
        }

        // Broadcast appointment update to WebSocket clients
        try {
            await broadcastAppointmentChange({
                type: 'appointment_updated',
                data: {
                    appointmentId: params.id,
                    businessId,
                    appointment: result.appointment,
                    changes: validatedData,
                    userId: session.user.id,
                    timestamp: new Date().toISOString(),
                },
            });
        } catch (broadcastError) {
            console.error('Failed to broadcast appointment update:', broadcastError);
            // Don't fail the request if broadcasting fails
        }

        return NextResponse.json({
            appointment: result.appointment,
            warnings: result.warnings
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

        console.error('Error updating appointment:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// ============================================================================
// DELETE /api/appointments/[id] - Cancel appointment
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

        // Parse cancellation options from request body if provided
        let cancelOptions: CancelAppointmentRequest

        try {
            const body = await request.text()
            if (body.trim()) {
                const parsedBody = JSON.parse(body)
                cancelOptions = cancelAppointmentSchema.parse(parsedBody)
            } else {
                // Apply default values when body is empty
                cancelOptions = cancelAppointmentSchema.parse({})
            }
        } catch {
            // Apply default values on parse error
            cancelOptions = cancelAppointmentSchema.parse({})
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

        // Cancel appointment using service layer
        const result = await appointmentService.cancelAppointment(
            params.id,
            businessId,
            {
                ...cancelOptions,
                changedBy: cancelOptions.changedBy || session.user.id
            }
        )

        if (!result.success) {
            return NextResponse.json({
                error: 'Failed to cancel appointment',
                details: result.errors,
                warnings: result.warnings
            }, { status: 400 })
        }

        // Broadcast appointment deletion to WebSocket clients
        try {
            await broadcastAppointmentChange({
                type: 'appointment_deleted',
                data: {
                    appointmentId: params.id,
                    businessId,
                    appointment: result.appointment,
                    userId: session.user.id,
                    timestamp: new Date().toISOString(),
                },
            });
        } catch (broadcastError) {
            console.error('Failed to broadcast appointment deletion:', broadcastError);
            // Don't fail the request if broadcasting fails
        }

        return NextResponse.json({
            appointment: result.appointment,
            warnings: result.warnings,
            message: 'Appointment cancelled successfully'
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

        console.error('Error cancelling appointment:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
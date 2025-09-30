/**
 * Appointments API Routes
 * 
 * Core CRUD operations for appointment management with multi-tenant security,
 * real-time availability checking, and comprehensive validation.
 * 
 * Requirements: 1.1, 2.1, 3.1, 3.2, 6.1, 6.2
 * 
 * @version 1.0.0
 * @author Lumina Development Team
 */

import { broadcastAppointmentChange } from '@/app/api/websocket/route'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { AppointmentService } from '@/lib/services/appointment-service'
import {
    appointmentFiltersSchema,
    createAppointmentSchema
} from '@/lib/validations/appointment'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Initialize appointment service
const appointmentService = new AppointmentService()

// ============================================================================
// GET /api/appointments - List appointments with filtering and pagination
// ============================================================================

export async function GET(request: NextRequest) {
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

        // Parse and validate query parameters
        const queryParams: Record<string, any> = {}

        // Extract all search parameters
        for (const [key, value] of searchParams.entries()) {
            if (key !== 'businessId') {
                queryParams[key] = value
            }
        }

        // Validate filters
        const filters = appointmentFiltersSchema.parse(queryParams)

        // Get appointments using service layer
        const result = await appointmentService.getAppointments(businessId, filters)

        return NextResponse.json({
            appointments: result.appointments,
            pagination: {
                total: result.total,
                limit: filters.limit,
                offset: filters.offset,
                hasMore: result.hasMore,
                nextOffset: result.nextOffset
            }
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

        console.error('Error fetching appointments:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// ============================================================================
// POST /api/appointments - Create a new appointment
// ============================================================================

export async function POST(request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()

        // Validate request body
        const validatedData = createAppointmentSchema.parse(body)

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
            }
        })

        if (!staff) {
            return NextResponse.json({
                error: 'Staff member not found or not active in this business'
            }, { status: 400 })
        }

        // Verify client belongs to the business (if clientId provided)
        if (validatedData.clientId) {
            const client = await prisma.client.findFirst({
                where: {
                    id: validatedData.clientId,
                    businessId: validatedData.businessId
                }
            })

            if (!client) {
                return NextResponse.json({
                    error: 'Client not found in this business'
                }, { status: 400 })
            }
        }

        // Verify all services belong to the business
        const serviceIds = validatedData.services.map(s => s.serviceId)
        const services = await prisma.service.findMany({
            where: {
                id: { in: serviceIds },
                businessId: validatedData.businessId,
                isActive: true
            }
        })

        if (services.length !== serviceIds.length) {
            return NextResponse.json({
                error: 'One or more services not found or not active in this business'
            }, { status: 400 })
        }

        // Create appointment using service layer
        const result = await appointmentService.createAppointment({
            businessId: validatedData.businessId,
            clientId: validatedData.clientId,
            staffId: validatedData.staffId,
            userId: validatedData.userId || session.user.id,
            startTime: validatedData.startTime,
            endTime: validatedData.endTime,
            services: validatedData.services,
            clientName: validatedData.clientName,
            clientEmail: validatedData.clientEmail,
            clientPhone: validatedData.clientPhone,
            notes: validatedData.notes,
            internalNotes: validatedData.internalNotes,
            depositAmount: validatedData.depositAmount,
            depositPaid: validatedData.depositPaid
        })

        if (!result.success) {
            return NextResponse.json({
                error: 'Failed to create appointment',
                details: result.errors,
                warnings: result.warnings
            }, { status: 400 })
        }

        // Broadcast appointment creation to WebSocket clients
        try {
            await broadcastAppointmentChange({
                type: 'appointment_created',
                data: {
                    appointmentId: result.appointment!.id,
                    businessId: validatedData.businessId,
                    appointment: result.appointment,
                    userId: session.user.id,
                    timestamp: new Date().toISOString(),
                },
            });
        } catch (broadcastError) {
            console.error('Failed to broadcast appointment creation:', broadcastError);
            // Don't fail the request if broadcasting fails
        }

        return NextResponse.json({
            appointment: result.appointment,
            warnings: result.warnings
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

        console.error('Error creating appointment:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
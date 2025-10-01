import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

interface RouteParams {
    params: {
        staffId: string
    }
}

// Schema for availability override
const AvailabilityOverrideSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).nullable(),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).nullable(),
    isAvailable: z.boolean(),
    reason: z.string().optional()
})

// PUT /api/availability/staff/:staffId/override
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await auth()
        if (!session?.user?.businessId) {
            return NextResponse.json(
                { error: 'Business context required' },
                { status: 401 }
            )
        }

        const businessId = session.user.businessId
        const { staffId } = params
        const body = await request.json()

        // Validate request body
        const validation = AvailabilityOverrideSchema.safeParse(body)
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid override data', details: validation.error.errors },
                { status: 400 }
            )
        }

        const { date, startTime, endTime, isAvailable, reason } = validation.data

        // Verify staff belongs to the business
        const staff = await prisma.staff.findFirst({
            where: {
                id: staffId,
                businessId
            }
        })

        if (!staff) {
            return NextResponse.json(
                { error: 'Staff member not found or not authorized' },
                { status: 404 }
            )
        }

        // Validate time logic
        if (isAvailable && (!startTime || !endTime)) {
            return NextResponse.json(
                { error: 'Start time and end time required when available' },
                { status: 400 }
            )
        }

        if (isAvailable && startTime && endTime && startTime >= endTime) {
            return NextResponse.json(
                { error: 'Start time must be before end time' },
                { status: 400 }
            )
        }

        // Check for existing appointments on this date
        const overrideDate = new Date(date)
        const existingAppointments = await prisma.appointment.findMany({
            where: {
                staffId,
                businessId,
                startTime: {
                    gte: new Date(overrideDate.setHours(0, 0, 0, 0)),
                    lt: new Date(overrideDate.setHours(23, 59, 59, 999))
                },
                status: {
                    not: 'CANCELLED'
                }
            },
            select: {
                id: true,
                startTime: true,
                endTime: true,
                services: {
                    select: {
                        service: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            }
        })

        // If making unavailable or changing hours, check for conflicts
        const conflicts = []
        if (!isAvailable || (isAvailable && startTime && endTime)) {
            for (const appointment of existingAppointments) {
                const appointmentStart = appointment.startTime.toTimeString().slice(0, 5)
                const appointmentEnd = appointment.endTime.toTimeString().slice(0, 5)

                if (!isAvailable) {
                    conflicts.push({
                        appointmentId: appointment.id,
                        appointmentTime: `${appointmentStart} - ${appointmentEnd}`,
                        serviceName: appointment.services?.[0]?.service?.name || 'Unknown Service',
                        reason: 'Staff will be unavailable'
                    })
                } else if (startTime && endTime) {
                    // Check if appointment falls outside new availability window
                    if (appointmentStart < startTime || appointmentEnd > endTime) {
                        conflicts.push({
                            appointmentId: appointment.id,
                            appointmentTime: `${appointmentStart} - ${appointmentEnd}`,
                            serviceName: appointment.services?.[0]?.service?.name || 'Unknown Service',
                            reason: 'Appointment outside new availability window'
                        })
                    }
                }
            }
        }

        // Create or update the override
        const override = await prisma.staffAvailabilityOverride.upsert({
            where: {
                staffId_date: {
                    staffId,
                    date: new Date(date)
                }
            },
            update: {
                startTime,
                endTime,
                isAvailable,
                reason,
                updatedAt: new Date()
            },
            create: {
                staffId,
                businessId,
                date: new Date(date),
                startTime,
                endTime,
                isAvailable,
                reason
            }
        })

        return NextResponse.json({
            message: 'Availability override updated successfully',
            override,
            conflicts: conflicts.length > 0 ? conflicts : undefined,
            warning: conflicts.length > 0 ? 'This change conflicts with existing appointments' : undefined
        })
    } catch (error) {
        console.error('Error updating availability override:', error)
        return NextResponse.json(
            { error: 'Failed to update availability override' },
            { status: 500 }
        )
    }
}

// DELETE /api/availability/staff/:staffId/override
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await auth()
        if (!session?.user?.businessId) {
            return NextResponse.json(
                { error: 'Business context required' },
                { status: 401 }
            )
        }

        const businessId = session.user.businessId
        const { staffId } = params
        const { searchParams } = new URL(request.url)
        const date = searchParams.get('date')

        if (!date) {
            return NextResponse.json(
                { error: 'Date parameter required' },
                { status: 400 }
            )
        }

        // Verify staff belongs to the business
        const staff = await prisma.staff.findFirst({
            where: {
                id: staffId,
                businessId
            }
        })

        if (!staff) {
            return NextResponse.json(
                { error: 'Staff member not found or not authorized' },
                { status: 404 }
            )
        }

        // Delete the override
        await prisma.staffAvailabilityOverride.delete({
            where: {
                staffId_date: {
                    staffId,
                    date: new Date(date)
                }
            }
        })

        return NextResponse.json({
            message: 'Availability override removed successfully'
        })
    } catch (error) {
        console.error('Error removing availability override:', error)
        return NextResponse.json(
            { error: 'Failed to remove availability override' },
            { status: 500 }
        )
    }
}
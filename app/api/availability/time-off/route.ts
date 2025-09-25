import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Schema for time-off request
const TimeOffRequestSchema = z.object({
    staffId: z.string().uuid(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    reason: z.string().optional()
})

// POST /api/availability/time-off
export async function POST(request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.businessId) {
            return NextResponse.json(
                { error: 'Business context required' },
                { status: 401 }
            )
        }

        const businessId = session.user.businessId
        const body = await request.json()

        // Validate request body
        const validation = TimeOffRequestSchema.safeParse(body)
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid time-off request data', details: validation.error.errors },
                { status: 400 }
            )
        }

        const { staffId, startDate, endDate, reason } = validation.data

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

        // Validate date range
        const start = new Date(startDate)
        const end = new Date(endDate)

        if (start > end) {
            return NextResponse.json(
                { error: 'Start date must be before or equal to end date' },
                { status: 400 }
            )
        }

        if (start < new Date()) {
            return NextResponse.json(
                { error: 'Cannot request time off for past dates' },
                { status: 400 }
            )
        }

        // Check for overlapping time-off requests
        const overlappingRequests = await prisma.timeOffRequests.findMany({
            where: {
                staffId,
                businessId,
                status: {
                    in: ['PENDING', 'APPROVED']
                },
                OR: [
                    {
                        AND: [
                            { startDate: { lte: end } },
                            { endDate: { gte: start } }
                        ]
                    }
                ]
            }
        })

        if (overlappingRequests.length > 0) {
            return NextResponse.json(
                {
                    error: 'Overlapping time-off request exists',
                    conflicts: overlappingRequests.map(req => ({
                        id: req.id,
                        startDate: req.startDate,
                        endDate: req.endDate,
                        status: req.status
                    }))
                },
                { status: 409 }
            )
        }

        // Check for existing appointments during the requested period
        const existingAppointments = await prisma.appointment.findMany({
            where: {
                staffId,
                businessId,
                startTime: {
                    gte: new Date(start.setHours(0, 0, 0, 0)),
                    lte: new Date(end.setHours(23, 59, 59, 999))
                },
                status: {
                    not: 'CANCELLED'
                }
            },
            select: {
                id: true,
                startTime: true,
                endTime: true,
                service: {
                    select: {
                        name: true
                    }
                },
                client: {
                    select: {
                        name: true
                    }
                }
            }
        })

        // Create the time-off request
        const timeOffRequest = await prisma.timeOffRequests.create({
            data: {
                staffId,
                businessId,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                reason,
                status: 'PENDING'
            },
            include: {
                staff: {
                    select: {
                        name: true
                    }
                }
            }
        })

        return NextResponse.json({
            message: 'Time-off request created successfully',
            timeOffRequest,
            conflicts: existingAppointments.length > 0 ? existingAppointments.map(apt => ({
                appointmentId: apt.id,
                startTime: apt.startTime,
                endTime: apt.endTime,
                serviceName: apt.service?.name,
                clientName: apt.client?.name
            })) : undefined,
            warning: existingAppointments.length > 0 ? 'This request conflicts with existing appointments' : undefined
        })
    } catch (error) {
        console.error('Error creating time-off request:', error)
        return NextResponse.json(
            { error: 'Failed to create time-off request' },
            { status: 500 }
        )
    }
}

// GET /api/availability/time-off
export async function GET(request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.businessId) {
            return NextResponse.json(
                { error: 'Business context required' },
                { status: 401 }
            )
        }

        const businessId = session.user.businessId
        const { searchParams } = new URL(request.url)

        const status = searchParams.get('status')
        const staffId = searchParams.get('staffId')
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')

        // Build where clause
        const where: any = { businessId }

        if (status) {
            where.status = status.toUpperCase()
        }

        if (staffId) {
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

            where.staffId = staffId
        }

        if (startDate && endDate) {
            where.OR = [
                {
                    AND: [
                        { startDate: { lte: new Date(endDate) } },
                        { endDate: { gte: new Date(startDate) } }
                    ]
                }
            ]
        }

        const timeOffRequests = await prisma.timeOffRequests.findMany({
            where,
            include: {
                staff: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                approvedByStaff: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: [
                { createdAt: 'desc' }
            ]
        })

        return NextResponse.json({ timeOffRequests })
    } catch (error) {
        console.error('Error fetching time-off requests:', error)
        return NextResponse.json(
            { error: 'Failed to fetch time-off requests' },
            { status: 500 }
        )
    }
}
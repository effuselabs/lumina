import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const availabilitySchema = z.object({
    businessId: z.string(),
    serviceId: z.string(),
    staffId: z.string().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
})

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const params = {
            businessId: searchParams.get('businessId'),
            serviceId: searchParams.get('serviceId'),
            staffId: searchParams.get('staffId'),
            date: searchParams.get('date'),
        }

        const validation = availabilitySchema.safeParse(params)
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid parameters', details: validation.error.errors },
                { status: 400 }
            )
        }

        const { businessId, serviceId, staffId, date } = validation.data

        // Get service details
        const service = await prisma.service.findFirst({
            where: {
                id: serviceId,
                businessId,
                isActive: true,
            },
        })

        if (!service) {
            return NextResponse.json(
                { error: 'Service not found' },
                { status: 404 }
            )
        }

        // Get business operating hours and timezone
        const business = await prisma.business.findUnique({
            where: { id: businessId },
            select: {
                operatingHours: true,
                timezone: true,
            },
        })

        if (!business) {
            return NextResponse.json(
                { error: 'Business not found' },
                { status: 404 }
            )
        }

        // Get available staff for the service
        let availableStaff
        if (staffId) {
            availableStaff = await prisma.staff.findMany({
                where: {
                    id: staffId,
                    businessId,
                    isActive: true,
                    acceptsOnlineBookings: true,
                    services: {
                        some: {
                            serviceId,
                        },
                    },
                },
                include: {
                    user: {
                        select: {
                            name: true,
                        },
                    },
                },
            })
        } else {
            availableStaff = await prisma.staff.findMany({
                where: {
                    businessId,
                    isActive: true,
                    acceptsOnlineBookings: true,
                    services: {
                        some: {
                            serviceId,
                        },
                    },
                },
                include: {
                    user: {
                        select: {
                            name: true,
                        },
                    },
                },
            })
        }

        if (availableStaff.length === 0) {
            return NextResponse.json(
                { error: 'No available staff for this service' },
                { status: 404 }
            )
        }

        // Calculate available time slots for each staff member
        const availableSlots = await calculateAvailableSlots(
            availableStaff,
            service,
            date,
            business.operatingHours as any,
            business.timezone
        )

        return NextResponse.json({
            service: {
                id: service.id,
                name: service.name,
                duration: service.duration,
                price: service.price,
            },
            availableSlots,
        })
    } catch (error) {
        console.error('Error fetching availability:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

async function calculateAvailableSlots(
    staff: any[],
    service: any,
    date: string,
    operatingHours: any,
    timezone: string
) {
    const slots = []
    const requestDate = new Date(date + 'T00:00:00')
    const dayOfWeek = requestDate.getDay() // 0 = Sunday, 1 = Monday, etc.

    // Default operating hours if not configured
    const defaultHours = {
        0: null, // Sunday - closed
        1: { start: '09:00', end: '18:00' }, // Monday
        2: { start: '09:00', end: '18:00' }, // Tuesday
        3: { start: '09:00', end: '18:00' }, // Wednesday
        4: { start: '09:00', end: '18:00' }, // Thursday
        5: { start: '09:00', end: '18:00' }, // Friday
        6: { start: '09:00', end: '17:00' }, // Saturday
    }

    const businessHours = operatingHours || defaultHours
    const dayHours = businessHours[dayOfWeek]

    if (!dayHours) {
        return [] // Business is closed on this day
    }

    for (const staffMember of staff) {
        // Get existing appointments for this staff member on this date
        const existingAppointments = await prisma.appointment.findMany({
            where: {
                staffId: staffMember.id,
                startTime: {
                    gte: new Date(date + 'T00:00:00'),
                    lt: new Date(date + 'T23:59:59'),
                },
                status: {
                    in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'],
                },
            },
            select: {
                startTime: true,
                endTime: true,
            },
        })

        // Generate time slots
        const staffSlots = generateTimeSlots(
            dayHours.start,
            dayHours.end,
            service.duration,
            existingAppointments,
            date
        )

        if (staffSlots.length > 0) {
            slots.push({
                staffId: staffMember.id,
                staffName: staffMember.displayName || staffMember.user.name,
                slots: staffSlots,
            })
        }
    }

    return slots
}

function generateTimeSlots(
    startTime: string,
    endTime: string,
    serviceDuration: number,
    existingAppointments: any[],
    date: string
) {
    const slots = []
    const [startHour, startMinute] = startTime.split(':').map(Number)
    const [endHour, endMinute] = endTime.split(':').map(Number)

    const startDateTime = new Date(date + 'T' + startTime + ':00')
    const endDateTime = new Date(date + 'T' + endTime + ':00')

    // Generate slots every 15 minutes
    const slotInterval = 15 // minutes
    let currentTime = new Date(startDateTime)

    while (currentTime < endDateTime) {
        const slotEndTime = new Date(currentTime.getTime() + serviceDuration * 60000)

        // Check if slot end time is within business hours
        if (slotEndTime <= endDateTime) {
            // Check for conflicts with existing appointments
            const hasConflict = existingAppointments.some(appointment => {
                const appointmentStart = new Date(appointment.startTime)
                const appointmentEnd = new Date(appointment.endTime)

                return (
                    (currentTime >= appointmentStart && currentTime < appointmentEnd) ||
                    (slotEndTime > appointmentStart && slotEndTime <= appointmentEnd) ||
                    (currentTime <= appointmentStart && slotEndTime >= appointmentEnd)
                )
            })

            if (!hasConflict) {
                slots.push({
                    startTime: currentTime.toISOString(),
                    endTime: slotEndTime.toISOString(),
                    displayTime: currentTime.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                    }),
                })
            }
        }

        // Move to next slot
        currentTime = new Date(currentTime.getTime() + slotInterval * 60000)
    }

    return slots
}
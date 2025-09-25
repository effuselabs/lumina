import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Schema for business hours validation
const BusinessHoursSchema = z.object({
    dayOfWeek: z.number().min(0).max(6),
    openTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).nullable(),
    closeTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).nullable(),
    isClosed: z.boolean().default(false)
})

const BusinessHoursUpdateSchema = z.object({
    hours: z.array(BusinessHoursSchema)
})

// GET /api/availability/business-hours
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

        // Get business hours from structured table first, fallback to JSON
        let businessHours = await prisma.businessHours.findMany({
            where: { businessId },
            orderBy: { dayOfWeek: 'asc' }
        })

        // If no structured data, try to get from JSON field
        if (businessHours.length === 0) {
            const business = await prisma.business.findUnique({
                where: { id: businessId },
                select: { operatingHours: true }
            })

            if (business?.operatingHours) {
                // Convert JSON format to structured format
                const jsonHours = business.operatingHours as any
                const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

                businessHours = days.map((day, index) => {
                    const dayData = jsonHours[day]
                    return {
                        id: `temp-${index}`,
                        businessId,
                        dayOfWeek: index,
                        openTime: dayData?.isOpen ? dayData.openTime : null,
                        closeTime: dayData?.isOpen ? dayData.closeTime : null,
                        isClosed: !dayData?.isOpen,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                })
            }
        }

        return NextResponse.json({ businessHours })
    } catch (error) {
        console.error('Error fetching business hours:', error)
        return NextResponse.json(
            { error: 'Failed to fetch business hours' },
            { status: 500 }
        )
    }
}

// POST /api/availability/business-hours
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
        const validation = BusinessHoursUpdateSchema.safeParse(body)
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid business hours data', details: validation.error.errors },
                { status: 400 }
            )
        }

        const { hours } = validation.data

        // Validate business hours logic
        for (const hour of hours) {
            if (!hour.isClosed && (!hour.openTime || !hour.closeTime)) {
                return NextResponse.json(
                    { error: `Open and close times required for day ${hour.dayOfWeek}` },
                    { status: 400 }
                )
            }

            if (!hour.isClosed && hour.openTime && hour.closeTime && hour.openTime >= hour.closeTime) {
                return NextResponse.json(
                    { error: `Open time must be before close time for day ${hour.dayOfWeek}` },
                    { status: 400 }
                )
            }
        }

        // Update business hours using upsert
        const updatedHours = await Promise.all(
            hours.map(hour =>
                prisma.businessHours.upsert({
                    where: {
                        businessId_dayOfWeek: {
                            businessId,
                            dayOfWeek: hour.dayOfWeek
                        }
                    },
                    update: {
                        openTime: hour.openTime,
                        closeTime: hour.closeTime,
                        isClosed: hour.isClosed,
                        updatedAt: new Date()
                    },
                    create: {
                        businessId,
                        dayOfWeek: hour.dayOfWeek,
                        openTime: hour.openTime,
                        closeTime: hour.closeTime,
                        isClosed: hour.isClosed
                    }
                })
            )
        )

        return NextResponse.json({
            message: 'Business hours updated successfully',
            businessHours: updatedHours
        })
    } catch (error) {
        console.error('Error updating business hours:', error)
        return NextResponse.json(
            { error: 'Failed to update business hours' },
            { status: 500 }
        )
    }
}
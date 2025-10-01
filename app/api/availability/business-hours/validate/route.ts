import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Schema for validation request
const ValidationSchema = z.object({
    startTime: z.string().datetime(),
    endTime: z.string().datetime()
})

// GET /api/availability/business-hours/validate
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

        const startTime = searchParams.get('startTime')
        const endTime = searchParams.get('endTime')

        if (!startTime || !endTime) {
            return NextResponse.json(
                { error: 'startTime and endTime parameters required' },
                { status: 400 }
            )
        }

        // Validate datetime format
        const validation = ValidationSchema.safeParse({ startTime, endTime })
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid datetime format', details: validation.error.errors },
                { status: 400 }
            )
        }

        const start = new Date(startTime)
        const end = new Date(endTime)

        if (start >= end) {
            return NextResponse.json(
                { error: 'Start time must be before end time' },
                { status: 400 }
            )
        }

        // Get business hours for the day of week
        const dayOfWeek = start.getDay()

        let businessHours = await prisma.businessHours.findUnique({
            where: {
                businessId_dayOfWeek: {
                    businessId,
                    dayOfWeek
                }
            }
        })

        // Fallback to JSON data if structured data not available
        if (!businessHours) {
            const business = await prisma.business.findUnique({
                where: { id: businessId },
                select: { operatingHours: true }
            })

            if (business?.operatingHours) {
                const jsonHours = business.operatingHours as any
                const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
                const dayData = jsonHours[days[dayOfWeek]]

                if (dayData) {
                    businessHours = {
                        id: 'temp',
                        businessId,
                        dayOfWeek,
                        openTime: dayData.isOpen ? dayData.openTime : null,
                        closeTime: dayData.isOpen ? dayData.closeTime : null,
                        isClosed: !dayData.isOpen,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                }
            }
        }

        if (!businessHours) {
            return NextResponse.json({
                isValid: false,
                reason: 'No business hours configured for this day',
                conflicts: []
            })
        }

        if (businessHours.isClosed || !businessHours.openTime || !businessHours.closeTime) {
            return NextResponse.json({
                isValid: false,
                reason: 'Business is closed on this day',
                conflicts: []
            })
        }

        // Check if appointment time falls within business hours
        const appointmentStartTime = start.toTimeString().slice(0, 5) // HH:MM format
        const appointmentEndTime = end.toTimeString().slice(0, 5)

        const isStartValid = appointmentStartTime >= businessHours.openTime
        const isEndValid = appointmentEndTime <= businessHours.closeTime

        if (!isStartValid || !isEndValid) {
            return NextResponse.json({
                isValid: false,
                reason: 'Appointment time is outside business hours',
                conflicts: [{
                    type: 'BUSINESS_HOURS',
                    message: `Business hours: ${businessHours.openTime} - ${businessHours.closeTime}`,
                    businessHours: {
                        openTime: businessHours.openTime,
                        closeTime: businessHours.closeTime,
                        dayOfWeek: businessHours.dayOfWeek
                    }
                }]
            })
        }

        // Check for holidays
        const appointmentDate = start.toISOString().split('T')[0] // YYYY-MM-DD format
        const holiday = await prisma.businessHoliday.findUnique({
            where: {
                businessId_date: {
                    businessId,
                    date: new Date(appointmentDate)
                }
            }
        })

        if (holiday?.isClosed) {
            return NextResponse.json({
                isValid: false,
                reason: `Business is closed for holiday: ${holiday.name || 'Holiday'}`,
                conflicts: [{
                    type: 'HOLIDAY',
                    message: `Holiday: ${holiday.name || 'Business closed'}`,
                    holiday: {
                        date: holiday.date,
                        name: holiday.name,
                        isClosed: holiday.isClosed
                    }
                }]
            })
        }

        return NextResponse.json({
            isValid: true,
            reason: 'Appointment time is within business hours',
            conflicts: []
        })

    } catch (error) {
        console.error('Error validating business hours:', error)
        return NextResponse.json(
            { error: 'Failed to validate business hours' },
            { status: 500 }
        )
    }
}
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Schema for staff availability
const AvailabilitySlotSchema = z.object({
    dayOfWeek: z.number().min(0).max(6),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    isRecurring: z.boolean().default(true),
    effectiveDate: z.string().datetime().optional(),
    expiryDate: z.string().datetime().optional()
})

const StaffAvailabilitySchema = z.object({
    staffId: z.string().uuid(),
    availability: z.array(AvailabilitySlotSchema)
})

// POST /api/availability/staff
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
        const validation = StaffAvailabilitySchema.safeParse(body)
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid staff availability data', details: validation.error.errors },
                { status: 400 }
            )
        }

        const { staffId, availability } = validation.data

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

        // Validate availability slots
        for (const slot of availability) {
            if (slot.startTime >= slot.endTime) {
                return NextResponse.json(
                    { error: `Start time must be before end time for day ${slot.dayOfWeek}` },
                    { status: 400 }
                )
            }
        }

        // Clear existing availability for this staff member
        await prisma.staffAvailability.deleteMany({
            where: {
                staffId,
                businessId
            }
        })

        // Create new availability records
        const createdAvailability = await Promise.all(
            availability.map(slot =>
                prisma.staffAvailability.create({
                    data: {
                        staffId,
                        businessId,
                        dayOfWeek: slot.dayOfWeek,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        isRecurring: slot.isRecurring,
                        effectiveDate: slot.effectiveDate ? new Date(slot.effectiveDate) : null,
                        expiryDate: slot.expiryDate ? new Date(slot.expiryDate) : null
                    }
                })
            )
        )

        return NextResponse.json({
            message: 'Staff availability updated successfully',
            availability: createdAvailability
        })
    } catch (error) {
        console.error('Error updating staff availability:', error)
        return NextResponse.json(
            { error: 'Failed to update staff availability' },
            { status: 500 }
        )
    }
}
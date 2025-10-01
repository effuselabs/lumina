import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AvailabilityCalculator } from '@/lib/services/availability-calculator'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
// Removed unused imports for now - will be needed when timezone support is fully implemented
import { TimeZoneHandler } from '../../../../lib/services/timezone-handler'

// Schema for availability query with timezone support
const AvailabilityQuerySchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
    serviceId: z.string().uuid().optional(),
    staffId: z.string().uuid().optional(),
    duration: z.number().min(15).max(480).optional(), // 15 minutes to 8 hours
    includeUnavailable: z.boolean().default(false),
    timezone: z.string().optional(), // Client's preferred timezone
    locationId: z.string().optional() // For multi-location businesses
})

// GET /api/availability/slots
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

        // Extract and validate query parameters
        const queryParams = {
            date: searchParams.get('date'),
            serviceId: searchParams.get('serviceId'),
            staffId: searchParams.get('staffId'),
            duration: searchParams.get('duration') ? parseInt(searchParams.get('duration') || '0') : undefined,
            includeUnavailable: searchParams.get('includeUnavailable') === 'true',
            timezone: searchParams.get('timezone'),
            locationId: searchParams.get('locationId')
        }

        // Validate required parameters
        if (!queryParams.date) {
            return NextResponse.json(
                { error: 'Date parameter is required' },
                { status: 400 }
            )
        }

        const validation = AvailabilityQuerySchema.safeParse(queryParams)
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid query parameters', details: validation.error.errors },
                { status: 400 }
            )
        }

        const { date, serviceId, staffId, duration, includeUnavailable, timezone, locationId } = validation.data

        // Validate timezone if provided
        if (timezone && !TimeZoneHandler.validateTimeZone(timezone)) {
            return NextResponse.json(
                { error: `Invalid timezone: ${timezone}` },
                { status: 400 }
            )
        }

        // Verify staff belongs to business if staffId provided
        if (staffId) {
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
        }

        // Verify service belongs to business if serviceId provided
        if (serviceId) {
            const service = await prisma.service.findFirst({
                where: {
                    id: serviceId,
                    businessId
                }
            })

            if (!service) {
                return NextResponse.json(
                    { error: 'Service not found or not authorized' },
                    { status: 404 }
                )
            }
        }

        // Get business timezone for reference
        const business = await prisma.business.findUnique({
            where: { id: businessId },
            select: { timezone: true }
        })
        const businessTimezone = business?.timezone || 'America/New_York'

        // Use timezone-aware calculator if timezone is provided
        if (timezone) {
            // Use static method for availability calculation
            const result = await AvailabilityCalculator.calculateAvailability({
                businessId,
                staffId,
                serviceId,
                date: new Date(date),
                duration: 60, // Default duration
                timezone
            })
            
            const slots = result.slots

            // Format timezone-aware response
            const response = {
                date,
                businessId,
                timezone,
                businessTimezone,
                locationId,
                totalSlots: slots.length,
                slots: slots.map(slot => ({
                    startTime: slot.startTime.toISOString(),
                    endTime: slot.endTime.toISOString(),
                    staffId: slot.staffId,
                    staffName: slot.staffName,
                    isAvailable: slot.isAvailable,
                    conflicts: slot.conflicts || []
                })),
                timezoneInfo: {
                    clientTimezone: timezone,
                    businessTimezone,
                    timezoneOffset: TimeZoneHandler.getTimeZoneInfo(timezone).offset,
                    isDST: TimeZoneHandler.getTimeZoneInfo(timezone).isDST
                },
                filters: {
                    serviceId,
                    staffId,
                    duration,
                    timezone,
                    locationId
                }
            }

            return NextResponse.json(response)
        } else {
            // Use standard calculator for backward compatibility
            const availabilityOptions = {
                businessId,
                date: new Date(date),
                serviceId,
                staffId,
                duration: duration || 60, // Default to 60 minutes
                includeUnavailable
            }

            const result = await AvailabilityCalculator.calculateAvailability(availabilityOptions)
            const slots = result.slots

            // Format standard response
            const response = {
                date,
                businessId,
                businessTimezone,
                totalSlots: slots.length,
                availableSlots: slots.filter(s => s.isAvailable).length,
                unavailableSlots: slots.filter(s => !s.isAvailable).length,
                slots: slots.map(slot => ({
                    startTime: slot.startTime.toISOString(),
                    endTime: slot.endTime.toISOString(),
                    staffId: slot.staffId,
                    staffName: slot.staffName,
                    isAvailable: slot.isAvailable,
                    conflicts: slot.conflicts || []
                })),
                filters: {
                    serviceId,
                    staffId,
                    duration,
                    includeUnavailable
                }
            }

            return NextResponse.json(response)
        }
    } catch (error) {
        console.error('Error fetching availability slots:', error)
        return NextResponse.json(
            {
                error: 'Failed to fetch availability slots',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}
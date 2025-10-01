import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ConflictDetectionEngine } from '@/lib/services/conflict-detection-engine'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Schema for conflict checking
const ConflictCheckSchema = z.object({
    staffId: z.string().uuid(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    serviceIds: z.array(z.string().uuid()).optional().default([]),
    excludeAppointmentId: z.string().uuid().optional()
})

// GET /api/availability/conflicts
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

        // Extract query parameters
        const queryParams = {
            staffId: searchParams.get('staffId'),
            startTime: searchParams.get('startTime'),
            endTime: searchParams.get('endTime'),
            serviceIds: searchParams.get('serviceIds')?.split(',').filter(Boolean) || [],
            excludeAppointmentId: searchParams.get('excludeAppointmentId')
        }

        // Validate required parameters
        if (!queryParams.staffId || !queryParams.startTime || !queryParams.endTime) {
            return NextResponse.json(
                { error: 'staffId, startTime, and endTime parameters are required' },
                { status: 400 }
            )
        }

        const validation = ConflictCheckSchema.safeParse(queryParams)
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid query parameters', details: validation.error.errors },
                { status: 400 }
            )
        }

        const { staffId, startTime, endTime, serviceIds, excludeAppointmentId } = validation.data

        // Verify staff belongs to business
        const staff = await prisma.staff.findFirst({
            where: {
                id: staffId,
                businessId
            },
            select: {
                id: true,
                displayName: true
            }
        })

        if (!staff) {
            return NextResponse.json(
                { error: 'Staff member not found or not authorized' },
                { status: 404 }
            )
        }

        // Verify services belong to business if provided
        if (serviceIds.length > 0) {
            const services = await prisma.service.findMany({
                where: {
                    id: { in: serviceIds },
                    businessId
                }
            })

            if (services.length !== serviceIds.length) {
                return NextResponse.json(
                    { error: 'One or more services not found or not authorized' },
                    { status: 404 }
                )
            }
        }

        // Create appointment request for conflict detection
        const appointmentRequest = {
            businessId,
            staffId,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            serviceIds,
            excludeAppointmentId
        }

        // Detect conflicts using the conflict detection engine
        const conflicts = await ConflictDetectionEngine.detectConflicts(appointmentRequest)

        // Format response
        const response = {
            hasConflicts: conflicts.length > 0,
            conflictCount: conflicts.length,
            conflicts: conflicts.map(conflict => ({
                type: conflict.type,
                severity: conflict.severity,
                message: conflict.message,
                details: conflict.details,
                suggestedResolutions: conflict.suggestedResolutions?.map(resolution => ({
                    type: resolution.type,
                    description: resolution.description,
                    alternativeSlots: resolution.alternativeSlots?.map(slot => ({
                        startTime: slot.startTime.toISOString(),
                        endTime: slot.endTime.toISOString(),
                        staffId: slot.staffId,
                        staffName: slot.staffName
                    })),
                    alternativeStaff: resolution.alternativeStaff?.map(alt => ({
                        staffId: alt.staffId,
                        staffName: alt.staffName,
                        availableSlots: alt.availableSlots.map(slot => ({
                            startTime: slot.startTime.toISOString(),
                            endTime: slot.endTime.toISOString(),
                            staffId: slot.staffId,
                            staffName: slot.staffName
                        }))
                    }))
                }))
            })),
            request: {
                staffId,
                staffName: staff.displayName,
                startTime,
                endTime,
                serviceIds,
                excludeAppointmentId
            }
        }

        return NextResponse.json(response)
    } catch (error) {
        console.error('Error checking conflicts:', error)
        return NextResponse.json(
            {
                error: 'Failed to check conflicts',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}
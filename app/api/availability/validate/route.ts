import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ConflictDetectionEngine } from '@/lib/services/conflict-detection-engine'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Schema for appointment validation
const AppointmentValidationSchema = z.object({
    staffId: z.string().uuid(),
    startTime: z.string().datetime(),
    duration: z.number().min(15).max(480), // 15 minutes to 8 hours
    serviceIds: z.array(z.string().uuid()).optional().default([]),
    excludeAppointmentId: z.string().uuid().optional()
})

// POST /api/availability/validate
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
        const validation = AppointmentValidationSchema.safeParse(body)
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid validation request', details: validation.error.errors },
                { status: 400 }
            )
        }

        const { staffId, startTime, duration, serviceIds, excludeAppointmentId } = validation.data

        // Verify staff belongs to business
        const staff = await prisma.staff.findFirst({
            where: {
                id: staffId,
                businessId
            },
            select: {
                id: true,
                name: true
            }
        })

        if (!staff) {
            return NextResponse.json(
                { error: 'Staff member not found or not authorized' },
                { status: 404 }
            )
        }

        // Verify services belong to business if provided
        let services = []
        if (serviceIds.length > 0) {
            services = await prisma.service.findMany({
                where: {
                    id: { in: serviceIds },
                    businessId
                },
                select: {
                    id: true,
                    name: true,
                    duration: true
                }
            })

            if (services.length !== serviceIds.length) {
                return NextResponse.json(
                    { error: 'One or more services not found or not authorized' },
                    { status: 404 }
                )
            }
        }

        // Validate appointment slot using the conflict detection engine
        const validationResult = await ConflictDetectionEngine.validateAppointmentSlot(
            staffId,
            new Date(startTime),
            duration,
            businessId,
            serviceIds,
            excludeAppointmentId
        )

        // Calculate service duration validation if services provided
        let serviceDurationValidation = null
        if (services.length > 0) {
            const totalServiceDuration = services.reduce((sum, service) => sum + service.duration, 0)
            serviceDurationValidation = {
                totalServiceDuration,
                requestedDuration: duration,
                isValid: totalServiceDuration <= duration,
                services: services.map(service => ({
                    id: service.id,
                    name: service.name,
                    duration: service.duration
                }))
            }

            // Add service duration conflict if invalid
            if (totalServiceDuration > duration) {
                validationResult.conflicts.push({
                    type: 'INSUFFICIENT_DURATION',
                    severity: 'ERROR',
                    message: `Services require ${totalServiceDuration} minutes but only ${duration} minutes requested`,
                    details: {
                        serviceDuration: {
                            requiredDuration: totalServiceDuration,
                            availableDuration: duration,
                            serviceNames: services.map(s => s.name)
                        }
                    }
                })
                validationResult.isValid = false
            }
        }

        // Format response
        const response = {
            isValid: validationResult.isValid,
            canBook: validationResult.isValid,
            hasConflicts: validationResult.conflicts.length > 0,
            hasWarnings: validationResult.warnings.length > 0,
            conflicts: validationResult.conflicts.map(conflict => ({
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
            warnings: validationResult.warnings.map(warning => ({
                type: warning.type,
                severity: warning.severity,
                message: warning.message,
                details: warning.details
            })),
            serviceDurationValidation,
            request: {
                staffId,
                staffName: staff.name,
                startTime,
                endTime: new Date(new Date(startTime).getTime() + duration * 60000).toISOString(),
                duration,
                serviceIds,
                excludeAppointmentId
            }
        }

        return NextResponse.json(response)
    } catch (error) {
        console.error('Error validating appointment:', error)
        return NextResponse.json(
            {
                error: 'Failed to validate appointment',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}
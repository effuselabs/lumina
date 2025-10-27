import { prisma } from '@/lib/prisma'
import { AppointmentRequest, ConflictDetectionEngine, ConflictSeverity, ConflictType } from '@/lib/services/conflict-detection-engine'
import { asMock } from '@/__tests__/utils/prisma-mock-helpers'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
    prisma: {
        business: {
            findUnique: jest.fn()
        },
        businessHours: {
            findUnique: jest.fn()
        },
        appointment: {
            findMany: jest.fn()
        },
        staffAvailability: {
            findMany: jest.fn()
        },
        staffAvailabilityOverride: {
            findUnique: jest.fn()
        },
        timeOffRequest: {
            findMany: jest.fn()
        },
        service: {
            findMany: jest.fn(),
            findUnique: jest.fn()
        },
        staffService: {
            findUnique: jest.fn()
        },
        staff: {
            findMany: jest.fn()
        }
    }
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('ConflictDetectionEngine', () => {
    const mockBusinessId = 'business-1'
    const mockStaffId = 'staff-1'
    const mockServiceId = 'service-1'

    beforeEach(() => {
        jest.clearAllMocks()

        // Default business validation
        asMock(mockPrisma.business.findUnique).mockResolvedValue({
            id: mockBusinessId
        } as any)
    })

    describe('detectConflicts', () => {
        const baseRequest: AppointmentRequest = {
            businessId: mockBusinessId,
            staffId: mockStaffId,
            startTime: new Date('2024-01-15T10:00:00Z'),
            endTime: new Date('2024-01-15T11:00:00Z'),
            serviceIds: [mockServiceId]
        }

        it('should detect no conflicts for valid appointment', async () => {
            // Mock business hours (Monday = 1)
            asMock(mockPrisma.businessHours.findUnique).mockResolvedValue({
                businessId: mockBusinessId,
                dayOfWeek: 1,
                openTime: '09:00',
                closeTime: '18:00',
                isClosed: false
            } as any)

            // Mock staff availability
            asMock(mockPrisma.staffAvailabilityOverride.findUnique).mockResolvedValue(null)
            asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue([{
                staffId: mockStaffId,
                dayOfWeek: 1,
                startTime: '09:00',
                endTime: '17:00',
                isRecurring: true
            }] as any)

            // Mock no overlapping appointments
            asMock(mockPrisma.appointment.findMany).mockResolvedValue([])

            // Mock no time-off requests
            asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue([])

            // Mock service duration
            asMock(mockPrisma.service.findMany).mockResolvedValue([{
                id: mockServiceId,
                name: 'Test Service',
                duration: 60
            }] as any)

            const conflicts = await ConflictDetectionEngine.detectConflicts(baseRequest)

            expect(conflicts).toHaveLength(0)
        })

        it('should detect business hours violation', async () => {
            // Mock business closed on this day
            asMock(mockPrisma.businessHours.findUnique).mockResolvedValue({
                businessId: mockBusinessId,
                dayOfWeek: 1,
                openTime: null,
                closeTime: null,
                isClosed: true
            } as any)

            const conflicts = await ConflictDetectionEngine.detectConflicts(baseRequest)

            expect(conflicts).toHaveLength(1)
            expect(conflicts[0].type).toBe(ConflictType.BUSINESS_HOURS_VIOLATION)
            expect(conflicts[0].severity).toBe(ConflictSeverity.ERROR)
        })

        it('should detect overlapping appointment conflict', async () => {
            // Mock valid business hours and staff availability
            asMock(mockPrisma.businessHours.findUnique).mockResolvedValue({
                businessId: mockBusinessId,
                dayOfWeek: 1,
                openTime: '09:00',
                closeTime: '18:00',
                isClosed: false
            } as any)

            asMock(mockPrisma.staffAvailabilityOverride.findUnique).mockResolvedValue(null)
            asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue([{
                staffId: mockStaffId,
                dayOfWeek: 1,
                startTime: '09:00',
                endTime: '17:00',
                isRecurring: true
            }] as any)

            // Mock overlapping appointment
            asMock(mockPrisma.appointment.findMany).mockResolvedValue([{
                id: 'existing-appointment',
                startTime: new Date('2024-01-15T10:30:00Z'),
                endTime: new Date('2024-01-15T11:30:00Z'),
                client: {
                    firstName: 'John',
                    lastName: 'Doe'
                },
                services: [{
                    service: { name: 'Haircut' }
                }]
            }] as any)

            asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue([])
            asMock(mockPrisma.service.findMany).mockResolvedValue([{
                id: mockServiceId,
                name: 'Test Service',
                duration: 60
            }] as any)

            const conflicts = await ConflictDetectionEngine.detectConflicts(baseRequest)

            expect(conflicts).toHaveLength(1)
            expect(conflicts[0].type).toBe(ConflictType.OVERLAPPING_APPOINTMENT)
            expect(conflicts[0].severity).toBe(ConflictSeverity.ERROR)
            expect(conflicts[0].message).toContain('John Doe')
        })

        it('should detect staff unavailability', async () => {
            // Mock business hours
            asMock(mockPrisma.businessHours.findUnique).mockResolvedValue({
                businessId: mockBusinessId,
                dayOfWeek: 1,
                openTime: '09:00',
                closeTime: '18:00',
                isClosed: false
            } as any)

            // Mock staff not available (no availability records)
            asMock(mockPrisma.staffAvailabilityOverride.findUnique).mockResolvedValue(null)
            asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue([])

            // Mock no overlapping appointments
            asMock(mockPrisma.appointment.findMany).mockResolvedValue([])
            asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue([])
            asMock(mockPrisma.service.findMany).mockResolvedValue([{
                id: mockServiceId,
                name: 'Test Service',
                duration: 60
            }] as any)

            const conflicts = await ConflictDetectionEngine.detectConflicts(baseRequest)

            const staffUnavailableConflicts = conflicts.filter((c: any) => c.type === ConflictType.STAFF_UNAVAILABLE)
            expect(staffUnavailableConflicts).toHaveLength(1)
            expect(staffUnavailableConflicts[0].severity).toBe(ConflictSeverity.ERROR)
        })

        it('should detect time-off conflict', async () => {
            // Mock valid business hours and staff availability
            asMock(mockPrisma.businessHours.findUnique).mockResolvedValue({
                businessId: mockBusinessId,
                dayOfWeek: 1,
                openTime: '09:00',
                closeTime: '18:00',
                isClosed: false
            } as any)

            asMock(mockPrisma.staffAvailabilityOverride.findUnique).mockResolvedValue(null)
            asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue([{
                staffId: mockStaffId,
                dayOfWeek: 1,
                startTime: '09:00',
                endTime: '17:00',
                isRecurring: true
            }] as any)

            asMock(mockPrisma.appointment.findMany).mockResolvedValue([])

            // Mock approved time-off request
            asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue([{
                id: 'time-off-1',
                staffId: mockStaffId,
                startDate: new Date('2024-01-15T00:00:00Z'),
                endDate: new Date('2024-01-15T23:59:59Z'),
                status: 'APPROVED',
                reason: 'Vacation'
            }] as any)

            const conflicts = await ConflictDetectionEngine.detectConflicts(baseRequest)

            expect(conflicts).toHaveLength(1)
            expect(conflicts[0].type).toBe(ConflictType.TIME_OFF_CONFLICT)
            expect(conflicts[0].severity).toBe(ConflictSeverity.ERROR)
        })

        it('should detect insufficient duration conflict', async () => {
            // Mock valid business hours and staff availability that matches the request time
            asMock(mockPrisma.businessHours.findUnique).mockResolvedValue({
                businessId: mockBusinessId,
                dayOfWeek: 1,
                openTime: '09:00',
                closeTime: '18:00',
                isClosed: false
            } as any)

            asMock(mockPrisma.staffAvailabilityOverride.findUnique).mockResolvedValue(null)
            asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue([{
                staffId: mockStaffId,
                dayOfWeek: 1,
                startTime: '10:00', // Matches the request start time
                endTime: '17:00',
                isRecurring: true
            }] as any)

            asMock(mockPrisma.appointment.findMany).mockResolvedValue([])
            asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue([])

            // Mock service requiring more time than available
            asMock(mockPrisma.service.findMany).mockResolvedValue([{
                id: mockServiceId,
                name: 'Long Service',
                duration: 120 // 2 hours, but appointment is only 1 hour
            }] as any)

            const conflicts = await ConflictDetectionEngine.detectConflicts(baseRequest)

            // Should have only the duration conflict since staff is available at the requested time
            const durationConflicts = conflicts.filter((c: any) => c.type === ConflictType.INSUFFICIENT_DURATION)
            expect(durationConflicts).toHaveLength(1)
            expect(durationConflicts[0].severity).toBe(ConflictSeverity.ERROR)
            expect(durationConflicts[0].message).toContain('120 minutes')
            expect(durationConflicts[0].message).toContain('60 minutes')
        })
    })

    describe('validateAppointmentSlot', () => {
        it('should validate valid appointment slot', async () => {
            // Mock valid conditions
            asMock(mockPrisma.businessHours.findUnique).mockResolvedValue({
                businessId: mockBusinessId,
                dayOfWeek: 1,
                openTime: '09:00',
                closeTime: '18:00',
                isClosed: false
            } as any)

            asMock(mockPrisma.staffAvailabilityOverride.findUnique).mockResolvedValue(null)
            asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue([{
                staffId: mockStaffId,
                dayOfWeek: 1,
                startTime: '10:00', // Matches the appointment time
                endTime: '17:00',
                isRecurring: true
            }] as any)

            asMock(mockPrisma.appointment.findMany).mockResolvedValue([])
            asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue([])
            asMock(mockPrisma.service.findMany).mockResolvedValue([{
                id: mockServiceId,
                name: 'Test Service',
                duration: 60
            }] as any)

            const result = await ConflictDetectionEngine.validateAppointmentSlot(
                mockStaffId,
                new Date('2024-01-15T10:00:00Z'),
                60,
                mockBusinessId,
                [mockServiceId]
            )

            expect(result.isValid).toBe(true)
            expect(result.conflicts).toHaveLength(0)
        })

        it('should invalidate appointment slot with conflicts', async () => {
            // Mock business closed
            asMock(mockPrisma.businessHours.findUnique).mockResolvedValue({
                businessId: mockBusinessId,
                dayOfWeek: 1,
                openTime: null,
                closeTime: null,
                isClosed: true
            } as any)

            // Mock staff availability to avoid additional conflicts
            asMock(mockPrisma.staffAvailabilityOverride.findUnique).mockResolvedValue(null)
            asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue([])

            const result = await ConflictDetectionEngine.validateAppointmentSlot(
                mockStaffId,
                new Date('2024-01-15T10:00:00Z'),
                60,
                mockBusinessId
            )

            expect(result.isValid).toBe(false)
            expect(result.conflicts.length).toBeGreaterThan(0)
            expect(result.conflicts.some((c: any) => c.type === ConflictType.BUSINESS_HOURS_VIOLATION)).toBe(true)
        })
    })

    describe('checkOverlappingAppointments', () => {
        const request: AppointmentRequest = {
            businessId: mockBusinessId,
            staffId: mockStaffId,
            startTime: new Date('2024-01-15T10:00:00Z'),
            endTime: new Date('2024-01-15T11:00:00Z'),
            serviceIds: []
        }

        it('should detect precise time overlap', async () => {
            asMock(mockPrisma.appointment.findMany).mockResolvedValue([{
                id: 'overlapping-appointment',
                startTime: new Date('2024-01-15T10:30:00Z'),
                endTime: new Date('2024-01-15T11:30:00Z'),
                client: {
                    firstName: 'Jane',
                    lastName: 'Smith'
                },
                services: [{
                    service: { name: 'Manicure' }
                }]
            }] as any)

            const conflicts = await ConflictDetectionEngine.checkOverlappingAppointments(request)

            expect(conflicts).toHaveLength(1)
            expect(conflicts[0].type).toBe(ConflictType.OVERLAPPING_APPOINTMENT)
            expect(conflicts[0].message).toContain('Jane Smith')
            expect(conflicts[0].details.conflictingAppointment).toBeDefined()
            expect(conflicts[0].details.conflictingAppointment?.services).toContain('Manicure')
        })

        it('should handle walk-in client names', async () => {
            asMock(mockPrisma.appointment.findMany).mockResolvedValue([{
                id: 'walk-in-appointment',
                startTime: new Date('2024-01-15T10:15:00Z'),
                endTime: new Date('2024-01-15T10:45:00Z'),
                client: null,
                clientName: 'Walk-in Customer',
                services: [{
                    service: { name: 'Quick Cut' }
                }]
            }] as any)

            const conflicts = await ConflictDetectionEngine.checkOverlappingAppointments(request)

            expect(conflicts).toHaveLength(1)
            expect(conflicts[0].message).toContain('Walk-in Customer')
        })

        it('should exclude appointment being rescheduled', async () => {
            const requestWithExclusion = {
                ...request,
                excludeAppointmentId: 'appointment-to-exclude'
            }

            asMock(mockPrisma.appointment.findMany).mockResolvedValue([])

            const conflicts = await ConflictDetectionEngine.checkOverlappingAppointments(requestWithExclusion)

            expect(conflicts).toHaveLength(0)
            expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        id: { not: 'appointment-to-exclude' }
                    })
                })
            )
        })

        it('should detect appointment that completely encompasses requested time', async () => {
            asMock(mockPrisma.appointment.findMany).mockResolvedValue([{
                id: 'encompassing-appointment',
                startTime: new Date('2024-01-15T09:30:00Z'),
                endTime: new Date('2024-01-15T11:30:00Z'),
                client: {
                    firstName: 'Bob',
                    lastName: 'Johnson'
                },
                services: [{
                    service: { name: 'Full Service' }
                }]
            }] as any)

            const conflicts = await ConflictDetectionEngine.checkOverlappingAppointments(request)

            expect(conflicts).toHaveLength(1)
            expect(conflicts[0].message).toContain('Bob Johnson')
        })
    })

    describe('validateAppointmentSlotAdvanced', () => {
        const request: AppointmentRequest = {
            businessId: mockBusinessId,
            staffId: mockStaffId,
            startTime: new Date('2024-01-15T10:00:00Z'),
            endTime: new Date('2024-01-15T11:00:00Z'),
            serviceIds: [mockServiceId]
        }

        it('should perform comprehensive validation with all checks enabled', async () => {
            // Mock valid conditions
            asMock(mockPrisma.businessHours.findUnique).mockResolvedValue({
                businessId: mockBusinessId,
                dayOfWeek: 1,
                openTime: '09:00',
                closeTime: '18:00',
                isClosed: false
            } as any)

            asMock(mockPrisma.staffAvailabilityOverride.findUnique).mockResolvedValue(null)
            asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue([{
                staffId: mockStaffId,
                dayOfWeek: 1,
                startTime: '10:00', // Matches the request time
                endTime: '17:00',
                isRecurring: true
            }] as any)

            asMock(mockPrisma.appointment.findMany).mockResolvedValue([])
            asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue([])

            // Mock service with staff override
            asMock(mockPrisma.staffService.findUnique).mockResolvedValue({
                staffId: mockStaffId,
                serviceId: mockServiceId,
                customDuration: 45,
                service: {
                    name: 'Custom Service',
                    duration: 60
                }
            } as any)

            const result = await ConflictDetectionEngine.validateAppointmentSlotAdvanced(request, {
                checkTimeOff: true,
                checkServiceDuration: true,
                generateResolutions: true,
                includeWarnings: true
            })

            expect(result.isValid).toBe(true)
            expect(result.conflicts).toHaveLength(0)
        })

        it('should generate warnings for scheduling issues', async () => {
            // Mock valid conditions but with back-to-back appointments
            asMock(mockPrisma.businessHours.findUnique).mockResolvedValue({
                businessId: mockBusinessId,
                dayOfWeek: 1,
                openTime: '09:00',
                closeTime: '18:00',
                isClosed: false
            } as any)

            asMock(mockPrisma.staffAvailabilityOverride.findUnique).mockResolvedValue(null)
            asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue([{
                staffId: mockStaffId,
                dayOfWeek: 1,
                startTime: '10:00', // Matches the request time
                endTime: '17:00',
                isRecurring: true
            }] as any)

            // Mock back-to-back appointment
            mockPrisma.appointment.findMany
                .mockResolvedValueOnce([]) // For overlap check
                .mockResolvedValueOnce([{ // For adjacent appointment check
                    id: 'adjacent-appointment',
                    startTime: new Date('2024-01-15T11:00:00Z'), // Starts when this one ends
                    endTime: new Date('2024-01-15T12:00:00Z'),
                    client: { firstName: 'Adjacent', lastName: 'Client' }
                }] as any)

            asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue([])
            asMock(mockPrisma.service.findMany).mockResolvedValue([{
                id: mockServiceId,
                name: 'Test Service',
                duration: 60
            }] as any)

            const result = await ConflictDetectionEngine.validateAppointmentSlotAdvanced(request, {
                includeWarnings: true
            })

            expect(result.isValid).toBe(true) // No errors, just warnings
            expect(result.warnings.length).toBeGreaterThan(0)
            expect(result.warnings.some((w: any) => w.message.includes('Back-to-back'))).toBe(true)
        })
    })

    describe('checkOverlappingAppointmentsAdvanced', () => {
        const request: AppointmentRequest = {
            businessId: mockBusinessId,
            staffId: mockStaffId,
            startTime: new Date('2024-01-15T10:00:00Z'),
            endTime: new Date('2024-01-15T11:00:00Z'),
            serviceIds: []
        }

        it('should detect conflicts with buffer time consideration', async () => {
            asMock(mockPrisma.appointment.findMany).mockResolvedValue([{
                id: 'close-appointment',
                startTime: new Date('2024-01-15T11:05:00Z'), // 5 minutes after requested end
                endTime: new Date('2024-01-15T12:00:00Z'),
                client: {
                    firstName: 'Close',
                    lastName: 'Appointment'
                },
                services: [{
                    service: { name: 'Service' }
                }]
            }] as any)

            const conflicts = await ConflictDetectionEngine.checkOverlappingAppointmentsAdvanced(
                request,
                10 // 10-minute buffer
            )

            expect(conflicts).toHaveLength(1)
            expect(conflicts[0].severity).toBe(ConflictSeverity.WARNING) // Within buffer, so warning
            expect(conflicts[0].message).toContain('is close to')
        })

        it('should provide detailed overlap information', async () => {
            asMock(mockPrisma.appointment.findMany).mockResolvedValue([{
                id: 'overlapping-appointment',
                startTime: new Date('2024-01-15T10:30:00Z'),
                endTime: new Date('2024-01-15T11:30:00Z'),
                client: {
                    firstName: 'Overlapping',
                    lastName: 'Client'
                },
                services: [{
                    service: { name: 'Overlapping Service' }
                }]
            }] as any)

            const conflicts = await ConflictDetectionEngine.checkOverlappingAppointmentsAdvanced(request)

            expect(conflicts).toHaveLength(1)
            expect(conflicts[0].message).toContain('30 minute') // 30-minute overlap
            expect(conflicts[0].details.conflictingAppointment?.services).toContain('Overlapping Service')
        })
    })

    describe('Error Handling', () => {
        it('should handle database errors gracefully', async () => {
            asMock(mockPrisma.business.findUnique).mockRejectedValue(new Error('Database error'))

            const request: AppointmentRequest = {
                businessId: mockBusinessId,
                staffId: mockStaffId,
                startTime: new Date('2024-01-15T10:00:00Z'),
                endTime: new Date('2024-01-15T11:00:00Z'),
                serviceIds: []
            }

            await expect(ConflictDetectionEngine.detectConflicts(request))
                .rejects.toThrow('Invalid business context')
        })

        it('should handle invalid business context', async () => {
            asMock(mockPrisma.business.findUnique).mockResolvedValue(null)

            const request: AppointmentRequest = {
                businessId: 'invalid-business',
                staffId: mockStaffId,
                startTime: new Date('2024-01-15T10:00:00Z'),
                endTime: new Date('2024-01-15T11:00:00Z'),
                serviceIds: []
            }

            await expect(ConflictDetectionEngine.detectConflicts(request))
                .rejects.toThrow('Invalid business context')
        })

        it('should return error result when validation fails', async () => {
            asMock(mockPrisma.business.findUnique).mockRejectedValue(new Error('Database error'))

            const result = await ConflictDetectionEngine.validateAppointmentSlot(
                mockStaffId,
                new Date('2024-01-15T10:00:00Z'),
                60,
                'invalid-business'
            )

            expect(result.isValid).toBe(false)
            expect(result.conflicts).toHaveLength(1)
            expect(result.conflicts[0].message).toContain('Validation error occurred')
        })
    })
})
import { prisma } from '@/lib/prisma'
import { ServiceAvailabilityOptions, TimeSlotAnalysisEngine } from '@/lib/services/time-slot-analysis-engine'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
    prisma: {
        service: {
            findUnique: jest.fn(),
        },
        staffService: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
        },
        businessHours: {
            findUnique: jest.fn(),
        },
        business: {
            findUnique: jest.fn(),
        },
        staffAvailability: {
            findMany: jest.fn(),
        },
        staffAvailabilityOverride: {
            findUnique: jest.fn(),
        },
        appointment: {
            findMany: jest.fn(),
        },
        timeOffRequest: {
            findMany: jest.fn(),
        },
    },
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('TimeSlotAnalysisEngine', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('findSuitableSlots', () => {
        it('should find available slots for a service', async () => {
            // Mock service
            mockPrisma.service.findUnique.mockResolvedValue({
                id: 'service-1',
                duration: 60,
                name: 'Haircut'
            } as any)

            // Mock business hours
            mockPrisma.businessHours.findUnique.mockResolvedValue({
                businessId: 'business-1',
                dayOfWeek: 1, // Monday
                openTime: '09:00',
                closeTime: '17:00',
                isClosed: false
            } as any)

            // Mock staff services
            mockPrisma.staffService.findMany.mockResolvedValue([
                { staffId: 'staff-1' }
            ] as any)

            // Mock staff availability
            mockPrisma.staffAvailability.findMany.mockResolvedValue([
                {
                    staffId: 'staff-1',
                    dayOfWeek: 1,
                    startTime: '09:00',
                    endTime: '17:00',
                    isRecurring: true
                }
            ] as any)

            // Mock no overrides
            mockPrisma.staffAvailabilityOverride.findUnique.mockResolvedValue(null)

            // Mock no appointments
            mockPrisma.appointment.findMany.mockResolvedValue([])

            // Mock no time off
            mockPrisma.timeOffRequest.findMany.mockResolvedValue([])

            const options: ServiceAvailabilityOptions = {
                businessId: 'business-1',
                serviceId: 'service-1',
                date: new Date('2024-01-15T00:00:00Z'), // Monday
            }

            const slots = await TimeSlotAnalysisEngine.findSuitableSlots(options)

            expect(slots.length).toBeGreaterThan(0)
            expect(slots[0].staffId).toBe('staff-1')
        })

        it('should return empty array when business is closed', async () => {
            // Mock service
            mockPrisma.service.findUnique.mockResolvedValue({
                id: 'service-1',
                duration: 60,
                name: 'Haircut'
            } as any)

            // Mock business closed
            mockPrisma.businessHours.findUnique.mockResolvedValue({
                businessId: 'business-1',
                dayOfWeek: 0, // Sunday
                isClosed: true
            } as any)

            const options: ServiceAvailabilityOptions = {
                businessId: 'business-1',
                serviceId: 'service-1',
                date: new Date('2024-01-14T00:00:00Z'), // Sunday
            }

            const slots = await TimeSlotAnalysisEngine.findSuitableSlots(options)

            expect(slots).toEqual([])
        })

        it('should exclude slots with appointments', async () => {
            // Mock service
            mockPrisma.service.findUnique.mockResolvedValue({
                id: 'service-1',
                duration: 60,
                name: 'Haircut'
            } as any)

            // Mock business hours
            mockPrisma.businessHours.findUnique.mockResolvedValue({
                businessId: 'business-1',
                dayOfWeek: 1,
                openTime: '09:00',
                closeTime: '17:00',
                isClosed: false
            } as any)

            // Mock staff services
            mockPrisma.staffService.findMany.mockResolvedValue([
                { staffId: 'staff-1' }
            ] as any)

            // Mock staff availability
            mockPrisma.staffAvailability.findMany.mockResolvedValue([
                {
                    staffId: 'staff-1',
                    dayOfWeek: 1,
                    startTime: '09:00',
                    endTime: '17:00',
                    isRecurring: true
                }
            ] as any)

            // Mock no overrides
            mockPrisma.staffAvailabilityOverride.findUnique.mockResolvedValue(null)

            // Mock existing appointment
            mockPrisma.appointment.findMany.mockResolvedValue([
                {
                    staffId: 'staff-1',
                    startTime: new Date('2024-01-15T10:00:00Z'),
                    endTime: new Date('2024-01-15T11:00:00Z'),
                    status: 'SCHEDULED'
                }
            ] as any)

            // Mock no time off
            mockPrisma.timeOffRequest.findMany.mockResolvedValue([])

            const options: ServiceAvailabilityOptions = {
                businessId: 'business-1',
                serviceId: 'service-1',
                date: new Date('2024-01-15T00:00:00Z'),
            }

            const slots = await TimeSlotAnalysisEngine.findSuitableSlots(options)

            // Should have slots but not during the appointment time
            const conflictingSlots = slots.filter(slot =>
                slot.startTime.getTime() === new Date('2024-01-15T10:00:00Z').getTime()
            )

            expect(conflictingSlots).toHaveLength(0)
        })
    })

    describe('validateBusinessHoursBoundaries', () => {
        it('should validate slot within business hours', async () => {
            mockPrisma.businessHours.findUnique.mockResolvedValue({
                businessId: 'business-1',
                dayOfWeek: 1,
                openTime: '09:00',
                closeTime: '17:00',
                isClosed: false
            } as any)

            const timeSlot = {
                startTime: new Date('2024-01-15T10:00:00Z'),
                endTime: new Date('2024-01-15T11:00:00Z'),
                staffId: 'staff-1'
            }

            const result = await TimeSlotAnalysisEngine.validateBusinessHoursBoundaries(
                timeSlot,
                'business-1'
            )

            expect(result.isValid).toBe(true)
        })

        it('should reject slot starting before business opens', async () => {
            mockPrisma.businessHours.findUnique.mockResolvedValue({
                businessId: 'business-1',
                dayOfWeek: 1,
                openTime: '09:00',
                closeTime: '17:00',
                isClosed: false
            } as any)

            const timeSlot = {
                startTime: new Date('2024-01-15T08:00:00Z'), // Before 9 AM
                endTime: new Date('2024-01-15T09:00:00Z'),
                staffId: 'staff-1'
            }

            const result = await TimeSlotAnalysisEngine.validateBusinessHoursBoundaries(
                timeSlot,
                'business-1'
            )

            expect(result.isValid).toBe(false)
            expect(result.reason).toContain('starts before business opens')
        })

        it('should reject slot ending after business closes', async () => {
            mockPrisma.businessHours.findUnique.mockResolvedValue({
                businessId: 'business-1',
                dayOfWeek: 1,
                openTime: '09:00',
                closeTime: '17:00',
                isClosed: false
            } as any)

            const timeSlot = {
                startTime: new Date('2024-01-15T16:30:00Z'),
                endTime: new Date('2024-01-15T18:00:00Z'), // After 5 PM
                staffId: 'staff-1'
            }

            const result = await TimeSlotAnalysisEngine.validateBusinessHoursBoundaries(
                timeSlot,
                'business-1'
            )

            expect(result.isValid).toBe(false)
            expect(result.reason).toContain('ends after business closes')
        })

        it('should handle business closed day', async () => {
            mockPrisma.businessHours.findUnique.mockResolvedValue({
                businessId: 'business-1',
                dayOfWeek: 0,
                isClosed: true
            } as any)

            const timeSlot = {
                startTime: new Date('2024-01-14T10:00:00Z'), // Sunday
                endTime: new Date('2024-01-14T11:00:00Z'),
                staffId: 'staff-1'
            }

            const result = await TimeSlotAnalysisEngine.validateBusinessHoursBoundaries(
                timeSlot,
                'business-1'
            )

            expect(result.isValid).toBe(false)
            expect(result.reason).toBe('Business is closed on this day')
        })
    })

    describe('validateContinuousTimeSlot', () => {
        it('should validate continuous slot without gaps', async () => {
            // Mock no appointments
            mockPrisma.appointment.findMany.mockResolvedValue([])

            // Mock no time off
            mockPrisma.timeOffRequest.findMany.mockResolvedValue([])

            const timeSlot = {
                startTime: new Date('2024-01-15T10:00:00Z'),
                endTime: new Date('2024-01-15T11:00:00Z'),
                staffId: 'staff-1'
            }

            const result = await TimeSlotAnalysisEngine.validateContinuousTimeSlot(
                timeSlot,
                60, // 60 minutes required
                'staff-1',
                'business-1'
            )

            expect(result.isValid).toBe(true)
            expect(result.continuousDuration).toBe(60)
            expect(result.gaps).toHaveLength(0)
        })

        it('should detect gaps from appointments', async () => {
            // Mock appointment that creates a gap
            mockPrisma.appointment.findMany.mockResolvedValue([
                {
                    staffId: 'staff-1',
                    startTime: new Date('2024-01-15T10:15:00Z'),
                    endTime: new Date('2024-01-15T10:45:00Z'),
                    status: 'SCHEDULED'
                }
            ] as any)

            // Mock no time off
            mockPrisma.timeOffRequest.findMany.mockResolvedValue([])

            const timeSlot = {
                startTime: new Date('2024-01-15T10:00:00Z'),
                endTime: new Date('2024-01-15T11:00:00Z'),
                staffId: 'staff-1'
            }

            const result = await TimeSlotAnalysisEngine.validateContinuousTimeSlot(
                timeSlot,
                60, // 60 minutes required
                'staff-1',
                'business-1'
            )

            expect(result.isValid).toBe(false)
            expect(result.gaps).toHaveLength(1)
            expect(result.gaps[0].reason).toBe('APPOINTMENT')
            expect(result.gaps[0].duration).toBe(30) // 30-minute appointment
        })

        it('should detect gaps from time off', async () => {
            // Mock no appointments
            mockPrisma.appointment.findMany.mockResolvedValue([])

            // Mock time off that creates a gap
            mockPrisma.timeOffRequest.findMany.mockResolvedValue([
                {
                    staffId: 'staff-1',
                    startDate: new Date('2024-01-15T10:00:00Z'),
                    endDate: new Date('2024-01-15T11:00:00Z'),
                    status: 'APPROVED'
                }
            ] as any)

            const timeSlot = {
                startTime: new Date('2024-01-15T10:00:00Z'),
                endTime: new Date('2024-01-15T11:00:00Z'),
                staffId: 'staff-1'
            }

            const result = await TimeSlotAnalysisEngine.validateContinuousTimeSlot(
                timeSlot,
                60,
                'staff-1',
                'business-1'
            )

            expect(result.isValid).toBe(false)
            expect(result.gaps).toHaveLength(1)
            expect(result.gaps[0].reason).toBe('TIME_OFF')
        })
    })

    describe('error handling', () => {
        it('should handle service not found gracefully', async () => {
            mockPrisma.service.findUnique.mockResolvedValue(null)

            const options: ServiceAvailabilityOptions = {
                businessId: 'business-1',
                serviceId: 'nonexistent-service',
                date: new Date('2024-01-15T00:00:00Z'),
            }

            await expect(
                TimeSlotAnalysisEngine.findSuitableSlots(options)
            ).rejects.toThrow('Service nonexistent-service not found')
        })

        it('should handle database errors gracefully', async () => {
            mockPrisma.service.findUnique.mockRejectedValue(new Error('Database error'))

            const options: ServiceAvailabilityOptions = {
                businessId: 'business-1',
                serviceId: 'service-1',
                date: new Date('2024-01-15T00:00:00Z'),
            }

            await expect(
                TimeSlotAnalysisEngine.findSuitableSlots(options)
            ).rejects.toThrow('Service service-1 not found')
        })
    })
})
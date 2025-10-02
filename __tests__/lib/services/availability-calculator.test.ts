import { prisma } from '@/lib/prisma'
import { AvailabilityCalculator } from '@/lib/services/availability-calculator'
import { ConflictDetectionEngine } from '@/lib/services/conflict-detection-engine'
import { asMock } from '@/__tests__/utils/prisma-mock-helpers'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
    prisma: {
        business: {
            findUnique: jest.fn()
        },
        staff: {
            findUnique: jest.fn(),
            findMany: jest.fn()
        },
        service: {
            findUnique: jest.fn()
        },
        staffService: {
            findUnique: jest.fn()
        },
        businessHours: {
            findUnique: jest.fn()
        },
        staffAvailability: {
            findMany: jest.fn()
        },
        staffAvailabilityOverride: {
            findUnique: jest.fn()
        },
        appointment: {
            findMany: jest.fn()
        },
        timeOffRequest: {
            findMany: jest.fn()
        },
        businessHoliday: {
            findMany: jest.fn()
        }
    }
}))

// Mock ConflictDetectionEngine
jest.mock('@/lib/services/conflict-detection-engine', () => ({
    ConflictDetectionEngine: {
        validateAppointmentSlot: jest.fn()
    }
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockConflictEngine = ConflictDetectionEngine as jest.Mocked<typeof ConflictDetectionEngine>

describe('AvailabilityCalculator', () => {
    const businessId = 'business-1'
    const staffId = 'staff-1'
    const serviceId = 'service-1'
    const testDate = new Date('2024-01-15T00:00:00.000Z') // Monday

    beforeEach(() => {
        jest.clearAllMocks()

        // Default business validation
        asMock(mockPrisma.business.findUnique).mockResolvedValue({ id: businessId } as any)

        // Default staff validation
        asMock(mockPrisma.staff.findUnique).mockResolvedValue({
            id: staffId,
            displayName: 'Test Staff',
            businessId
        } as any)

        // Default conflict engine response
        asMock(mockConflictEngine.validateAppointmentSlot).mockResolvedValue({
            isValid: true,
            conflicts: []
        } as any)
    })

    describe('getAvailableSlots', () => {
        it('should return available slots for a specific service', async () => {
            // Setup mocks
            asMock(mockPrisma.service.findUnique).mockResolvedValue({
                id: serviceId,
                duration: 60
            } as any)

            asMock(mockPrisma.staff.findMany).mockResolvedValue([{
                id: staffId
            }] as any)

            asMock(mockPrisma.businessHours.findUnique).mockResolvedValue({
                businessId,
                dayOfWeek: 1, // Monday
                openTime: '09:00',
                closeTime: '17:00',
                isClosed: false
            } as any)

            asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue([{
                staffId,
                dayOfWeek: 1,
                startTime: '09:00',
                endTime: '17:00',
                isRecurring: true
            }] as any)

            asMock(mockPrisma.staffAvailabilityOverride.findUnique).mockResolvedValue(null)
            asMock(mockPrisma.appointment.findMany).mockResolvedValue([])
            asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue([])
            asMock(mockPrisma.businessHoliday.findMany).mockResolvedValue([])

            const result = await AvailabilityCalculator.getAvailableSlots({
                businessId,
                date: testDate,
                serviceId
            })

            expect(result).toBeDefined()
            expect(result.length).toBeGreaterThan(0)
            expect(result[0]).toMatchObject({
                staffId,
                staffName: 'Test Staff',
                isAvailable: true,
                duration: 60,
                serviceId
            })
        })

        it('should return empty array when business is closed', async () => {
            asMock(mockPrisma.businessHours.findUnique).mockResolvedValue({
                businessId,
                dayOfWeek: 1,
                isClosed: true
            } as any)

            asMock(mockPrisma.staff.findMany).mockResolvedValue([{ id: staffId }] as any)

            const result = await AvailabilityCalculator.getAvailableSlots({
                businessId,
                date: testDate,
                serviceId
            })

            expect(result).toEqual([])
        })

        it('should return unavailable slots when includeUnavailable is true', async () => {
            asMock(mockPrisma.businessHours.findUnique).mockResolvedValue({
                businessId,
                dayOfWeek: 1,
                isClosed: true
            } as any)

            asMock(mockPrisma.staff.findMany).mockResolvedValue([{ id: staffId }] as any)

            const result = await AvailabilityCalculator.getAvailableSlots({
                businessId,
                date: testDate,
                serviceId,
                includeUnavailable: true
            })

            expect(result).toBeDefined()
            expect(result.length).toBeGreaterThan(0)
            expect(result[0]).toMatchObject({
                staffId,
                isAvailable: false,
                conflicts: ['Business closed or staff unavailable']
            })
        })

        it('should handle staff with time-off', async () => {
            asMock(mockPrisma.service.findUnique).mockResolvedValue({
                id: serviceId,
                duration: 60
            } as any)

            asMock(mockPrisma.staff.findMany).mockResolvedValue([{ id: staffId }] as any)

            asMock(mockPrisma.businessHours.findUnique).mockResolvedValue({
                businessId,
                dayOfWeek: 1,
                openTime: '09:00',
                closeTime: '17:00',
                isClosed: false
            } as any)

            asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue([{
                staffId,
                dayOfWeek: 1,
                startTime: '09:00',
                endTime: '17:00',
                isRecurring: true
            }] as any)

            asMock(mockPrisma.staffAvailabilityOverride.findUnique).mockResolvedValue(null)
            asMock(mockPrisma.appointment.findMany).mockResolvedValue([])

            // Staff has approved time-off
            asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue([{
                staffId,
                startDate: testDate,
                endDate: testDate,
                status: 'APPROVED'
            }] as any)

            asMock(mockPrisma.businessHoliday.findMany).mockResolvedValue([])

            const result = await AvailabilityCalculator.getAvailableSlots({
                businessId,
                date: testDate,
                serviceId,
                includeUnavailable: true
            })

            expect(result).toBeDefined()
            expect(result[0]).toMatchObject({
                isAvailable: false,
                conflicts: ['Staff time-off approved']
            })
        })

        it('should handle existing appointments as conflicts', async () => {
            asMock(mockPrisma.service.findUnique).mockResolvedValue({
                id: serviceId,
                duration: 60
            } as any)

            asMock(mockPrisma.staff.findMany).mockResolvedValue([{ id: staffId }] as any)

            asMock(mockPrisma.businessHours.findUnique).mockResolvedValue({
                businessId,
                dayOfWeek: 1,
                openTime: '09:00',
                closeTime: '17:00',
                isClosed: false
            } as any)

            asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue([{
                staffId,
                dayOfWeek: 1,
                startTime: '09:00',
                endTime: '17:00',
                isRecurring: true
            }] as any)

            asMock(mockPrisma.staffAvailabilityOverride.findUnique).mockResolvedValue(null)

            // Existing appointment from 10:00-11:00
            const appointmentStart = new Date(testDate)
            appointmentStart.setHours(10, 0, 0, 0)
            const appointmentEnd = new Date(testDate)
            appointmentEnd.setHours(11, 0, 0, 0)

            asMock(mockPrisma.appointment.findMany).mockResolvedValue([{
                staffId,
                startTime: appointmentStart,
                endTime: appointmentEnd,
                status: 'SCHEDULED'
            }] as any)

            asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue([])
            asMock(mockPrisma.businessHoliday.findMany).mockResolvedValue([])

            const result = await AvailabilityCalculator.getAvailableSlots({
                businessId,
                date: testDate,
                serviceId
            })

            // Should have slots before and after the appointment, but not overlapping
            expect(result).toBeDefined()

            // Check that no slots overlap with the appointment
            const overlappingSlots = result.filter(slot =>
                slot.startTime < appointmentEnd && slot.endTime > appointmentStart
            )
            expect(overlappingSlots).toHaveLength(0)
        })

        it('should use custom duration when provided', async () => {
            const customDuration = 90 // 1.5 hours

            asMock(mockPrisma.staff.findMany).mockResolvedValue([{ id: staffId }] as any)

            asMock(mockPrisma.businessHours.findUnique).mockResolvedValue({
                businessId,
                dayOfWeek: 1,
                openTime: '09:00',
                closeTime: '17:00',
                isClosed: false
            } as any)

            asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue([{
                staffId,
                dayOfWeek: 1,
                startTime: '09:00',
                endTime: '17:00',
                isRecurring: true
            }] as any)

            asMock(mockPrisma.staffAvailabilityOverride.findUnique).mockResolvedValue(null)
            asMock(mockPrisma.appointment.findMany).mockResolvedValue([])
            asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue([])
            asMock(mockPrisma.businessHoliday.findMany).mockResolvedValue([])

            const result = await AvailabilityCalculator.getAvailableSlots({
                businessId,
                date: testDate,
                duration: customDuration
            })

            expect(result).toBeDefined()
            expect(result.length).toBeGreaterThan(0)
            expect(result[0].duration).toBe(customDuration)
        })

        it('should handle staff availability override', async () => {
            asMock(mockPrisma.service.findUnique).mockResolvedValue({
                id: serviceId,
                duration: 60
            } as any)

            asMock(mockPrisma.staff.findMany).mockResolvedValue([{ id: staffId }] as any)

            asMock(mockPrisma.businessHours.findUnique).mockResolvedValue({
                businessId,
                dayOfWeek: 1,
                openTime: '09:00',
                closeTime: '17:00',
                isClosed: false
            } as any)

            // Staff has override for shorter hours
            asMock(mockPrisma.staffAvailabilityOverride.findUnique).mockResolvedValue({
                staffId,
                date: testDate,
                startTime: '10:00',
                endTime: '14:00',
                isAvailable: true
            } as any)

            asMock(mockPrisma.appointment.findMany).mockResolvedValue([])
            asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue([])
            asMock(mockPrisma.businessHoliday.findMany).mockResolvedValue([])

            const result = await AvailabilityCalculator.getAvailableSlots({
                businessId,
                date: testDate,
                serviceId
            })

            expect(result).toBeDefined()

            // All slots should be within override hours (10:00-14:00)
            result.forEach(slot => {
                const slotHour = slot.startTime.getHours()
                expect(slotHour).toBeGreaterThanOrEqual(10)
                expect(slotHour).toBeLessThan(14)
            })
        })

        it('should throw error for invalid business context', async () => {
            asMock(mockPrisma.business.findUnique).mockResolvedValue(null)

            await expect(AvailabilityCalculator.getAvailableSlots({
                businessId: 'invalid-business',
                date: testDate,
                serviceId
            })).rejects.toThrow('Business invalid-business not found')
        })
    })

    describe('getStaffSpecificAvailability', () => {
        it('should return staff availability for date range', async () => {
            const startDate = new Date('2024-01-15T00:00:00.000Z') // Monday
            const endDate = new Date('2024-01-17T00:00:00.000Z') // Wednesday

            asMock(mockPrisma.service.findUnique).mockResolvedValue({
                id: serviceId,
                duration: 60
            } as any)

            // Mock business hours for multiple days
            mockPrisma.businessHours.findUnique
                .mockResolvedValueOnce({ // Monday
                    businessId,
                    dayOfWeek: 1,
                    openTime: '09:00',
                    closeTime: '17:00',
                    isClosed: false
                } as any)
                .mockResolvedValueOnce({ // Tuesday
                    businessId,
                    dayOfWeek: 2,
                    openTime: '09:00',
                    closeTime: '17:00',
                    isClosed: false
                } as any)
                .mockResolvedValueOnce({ // Wednesday
                    businessId,
                    dayOfWeek: 3,
                    openTime: '09:00',
                    closeTime: '17:00',
                    isClosed: false
                } as any)

            // Mock staff availability for multiple days
            asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue([{
                staffId,
                dayOfWeek: 1,
                startTime: '09:00',
                endTime: '17:00',
                isRecurring: true
            }, {
                staffId,
                dayOfWeek: 2,
                startTime: '09:00',
                endTime: '17:00',
                isRecurring: true
            }, {
                staffId,
                dayOfWeek: 3,
                startTime: '09:00',
                endTime: '17:00',
                isRecurring: true
            }] as any)

            asMock(mockPrisma.staffAvailabilityOverride.findUnique).mockResolvedValue(null)
            asMock(mockPrisma.appointment.findMany).mockResolvedValue([])
            asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue([])
            asMock(mockPrisma.businessHoliday.findMany).mockResolvedValue([])

            const result = await AvailabilityCalculator.getStaffSpecificAvailability({
                businessId,
                staffId,
                dateRange: { startDate, endDate },
                serviceId
            })

            expect(result).toBeDefined()
            expect(result.length).toBeGreaterThan(0)

            // Should have slots for multiple days
            const uniqueDates = new Set(result.map(slot => slot.startTime.toDateString()))
            expect(uniqueDates.size).toBeGreaterThan(1)
        })

        it('should throw error for invalid staff context', async () => {
            asMock(mockPrisma.staff.findUnique).mockResolvedValue(null)

            await expect(AvailabilityCalculator.getStaffSpecificAvailability({
                businessId,
                staffId: 'invalid-staff',
                dateRange: {
                    startDate: testDate,
                    endDate: testDate
                }
            })).rejects.toThrow('Staff member invalid-staff not found in business')
        })
    })

    describe('edge cases and error handling', () => {
        it('should handle database errors gracefully', async () => {
            // Mock business validation to pass first
            asMock(mockPrisma.business.findUnique).mockResolvedValue({ id: businessId } as any)

            // Mock staff to exist
            asMock(mockPrisma.staff.findMany).mockResolvedValue([{ id: staffId }] as any)

            // Make business hours query fail
            asMock(mockPrisma.businessHours.findUnique).mockRejectedValue(new Error('Database error'))

            await expect(AvailabilityCalculator.getAvailableSlots({
                businessId,
                date: testDate,
                serviceId
            })).rejects.toThrow('Failed to calculate availability')
        })

        it('should handle missing service gracefully', async () => {
            asMock(mockPrisma.service.findUnique).mockResolvedValue(null)
            asMock(mockPrisma.staff.findMany).mockResolvedValue([{ id: staffId }] as any)

            // Should use default duration when service not found
            asMock(mockPrisma.businessHours.findUnique).mockResolvedValue({
                businessId,
                dayOfWeek: 1,
                openTime: '09:00',
                closeTime: '17:00',
                isClosed: false
            } as any)

            asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue([{
                staffId,
                dayOfWeek: 1,
                startTime: '09:00',
                endTime: '17:00',
                isRecurring: true
            }] as any)

            asMock(mockPrisma.staffAvailabilityOverride.findUnique).mockResolvedValue(null)
            asMock(mockPrisma.appointment.findMany).mockResolvedValue([])
            asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue([])
            asMock(mockPrisma.businessHoliday.findMany).mockResolvedValue([])

            const result = await AvailabilityCalculator.getAvailableSlots({
                businessId,
                date: testDate,
                serviceId: 'non-existent-service'
            })

            expect(result).toBeDefined()
            expect(result.length).toBeGreaterThan(0)
            expect(result[0].duration).toBe(60) // Default duration
        })

        it('should handle conflict detection engine errors', async () => {
            mockConflictEngine.validateAppointmentSlot.mockRejectedValue(new Error('Conflict engine error'))

            asMock(mockPrisma.service.findUnique).mockResolvedValue({
                id: serviceId,
                duration: 60
            } as any)

            asMock(mockPrisma.staff.findMany).mockResolvedValue([{ id: staffId }] as any)

            asMock(mockPrisma.businessHours.findUnique).mockResolvedValue({
                businessId,
                dayOfWeek: 1,
                openTime: '09:00',
                closeTime: '17:00',
                isClosed: false
            } as any)

            asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue([{
                staffId,
                dayOfWeek: 1,
                startTime: '09:00',
                endTime: '17:00',
                isRecurring: true
            }] as any)

            asMock(mockPrisma.staffAvailabilityOverride.findUnique).mockResolvedValue(null)
            asMock(mockPrisma.appointment.findMany).mockResolvedValue([])
            asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue([])
            asMock(mockPrisma.businessHoliday.findMany).mockResolvedValue([])

            // Should not throw error, just continue without conflict engine validation
            const result = await AvailabilityCalculator.getAvailableSlots({
                businessId,
                date: testDate,
                serviceId
            })

            expect(result).toBeDefined()
            expect(result.length).toBeGreaterThan(0)
        })
    })
})
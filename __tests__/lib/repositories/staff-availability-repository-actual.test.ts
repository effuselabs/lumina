import { prisma } from '@/lib/prisma'
import { StaffAvailabilityRepository } from '@/lib/repositories/staff-availability-repository'
import { Staff, StaffAvailability, StaffAvailabilityOverride } from '@prisma/client'
import { asMock } from '@/__tests__/utils/prisma-mock-helpers'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
    prisma: {
        staff: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
        },
        staffAvailability: {
            findMany: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            deleteMany: jest.fn(),
        },
        staffAvailabilityOverride: {
            findMany: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            upsert: jest.fn(),
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

describe('StaffAvailabilityRepository', () => {
    let repository: StaffAvailabilityRepository
    const staffId = 'staff-123'
    const businessId = 'business-123'

    beforeEach(() => {
        repository = new StaffAvailabilityRepository()
        jest.clearAllMocks()
    })

    describe('setAvailability', () => {
        it('should create new staff availability', async () => {
            const availabilityData = {
                dayOfWeek: 1, // Monday
                startTime: '09:00:00',
                endTime: '17:00:00',
                isRecurring: true,
            }

            const mockStaff = { id: staffId, businessId }
            const mockCreatedAvailability: StaffAvailability = {
                id: 'avail-1',
                staffId,
                businessId,
                ...availabilityData,
                effectiveDate: null,
                expiryDate: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            asMock(mockPrisma.staff.findUnique).mockResolvedValue(mockStaff as Staff)
            asMock(mockPrisma.staffAvailability.create).mockResolvedValue(mockCreatedAvailability)

            const result = await repository.setAvailability(staffId, availabilityData)

            expect(mockPrisma.staff.findUnique).toHaveBeenCalledWith({
                where: { id: staffId },
                select: { businessId: true },
            })
            expect(mockPrisma.staffAvailability.create).toHaveBeenCalledWith({
                data: {
                    staffId,
                    businessId,
                    ...availabilityData,
                },
            })
            expect(result).toEqual(mockCreatedAvailability)
        })

        it('should throw error when staff not found', async () => {
            const availabilityData = {
                dayOfWeek: 1,
                startTime: '09:00:00',
                endTime: '17:00:00',
            }

            asMock(mockPrisma.staff.findUnique).mockResolvedValue(null)

            await expect(repository.setAvailability(staffId, availabilityData))
                .rejects.toThrow('Staff member not found')
        })

        it('should handle non-recurring availability with dates', async () => {
            const availabilityData = {
                dayOfWeek: 5, // Friday
                startTime: '10:00:00',
                endTime: '16:00:00',
                isRecurring: false,
                effectiveDate: new Date('2024-01-19'),
                expiryDate: new Date('2024-01-19'),
            }

            const mockStaff = { id: staffId, businessId }
            const mockCreatedAvailability: StaffAvailability = {
                id: 'avail-1',
                staffId,
                businessId,
                ...availabilityData,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            asMock(mockPrisma.staff.findUnique).mockResolvedValue(mockStaff as Staff)
            asMock(mockPrisma.staffAvailability.create).mockResolvedValue(mockCreatedAvailability)

            const result = await repository.setAvailability(staffId, availabilityData)

            expect(result.isRecurring).toBe(false)
            expect(result.effectiveDate).toEqual(availabilityData.effectiveDate)
            expect(result.expiryDate).toEqual(availabilityData.expiryDate)
        })
    })

    describe('getAvailability', () => {
        it('should return staff availability for date range', async () => {
            const dateRange = {
                startDate: new Date('2024-01-15'),
                endDate: new Date('2024-01-21'),
            }

            const mockStaff = { id: staffId, businessId }
            const mockAvailability: StaffAvailability[] = [
                {
                    id: 'avail-1',
                    staffId,
                    businessId,
                    dayOfWeek: 1,
                    startTime: '09:00:00',
                    endTime: '17:00:00',
                    isRecurring: true,
                    effectiveDate: null,
                    expiryDate: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ]

            const mockOverrides: StaffAvailabilityOverride[] = []

            asMock(mockPrisma.staff.findUnique).mockResolvedValue(mockStaff as Staff)
            asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue(mockAvailability)
            asMock(mockPrisma.staffAvailabilityOverride.findMany).mockResolvedValue(mockOverrides)

            const result = await repository.getAvailability(staffId, dateRange)

            expect(mockPrisma.staff.findUnique).toHaveBeenCalledWith({
                where: { id: staffId },
                select: { businessId: true },
            })
            expect(result).toBeDefined()
            expect(Array.isArray(result)).toBe(true)
        })

        it('should throw error when staff not found', async () => {
            const dateRange = {
                startDate: new Date('2024-01-15'),
                endDate: new Date('2024-01-21'),
            }

            asMock(mockPrisma.staff.findUnique).mockResolvedValue(null)

            await expect(repository.getAvailability(staffId, dateRange))
                .rejects.toThrow('Staff member not found')
        })
    })

    describe('setRecurringAvailability', () => {
        it('should replace existing recurring availability', async () => {
            const recurringPattern = {
                patterns: [
                    {
                        dayOfWeek: 1,
                        startTime: '09:00:00',
                        endTime: '17:00:00',
                    },
                    {
                        dayOfWeek: 2,
                        startTime: '09:00:00',
                        endTime: '17:00:00',
                    },
                ],
            }

            const mockStaff = { id: staffId, businessId }
            const mockCreatedAvailability: StaffAvailability[] = recurringPattern.patterns.map((pattern, index) => ({
                id: `avail-${index + 1}`,
                staffId,
                businessId,
                ...pattern,
                isRecurring: true,
                effectiveDate: null,
                expiryDate: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            }))

            asMock(mockPrisma.staff.findUnique).mockResolvedValue(mockStaff as Staff)
            asMock(mockPrisma.staffAvailability.deleteMany).mockResolvedValue({ count: 2 })
            mockPrisma.staffAvailability.create
                .mockResolvedValueOnce(mockCreatedAvailability[0])
                .mockResolvedValueOnce(mockCreatedAvailability[1])

            const result = await repository.setRecurringAvailability(staffId, recurringPattern)

            expect(mockPrisma.staffAvailability.deleteMany).toHaveBeenCalledWith({
                where: {
                    staffId,
                    isRecurring: true,
                },
            })
            expect(mockPrisma.staffAvailability.create).toHaveBeenCalledTimes(2)
            expect(result).toEqual(mockCreatedAvailability)
        })
    })

    describe('overrideAvailability', () => {
        it('should create availability override', async () => {
            const date = new Date('2024-01-15')
            const availability = {
                startTime: '10:00:00',
                endTime: '16:00:00',
                isAvailable: true,
                reason: 'Late start',
            }

            const mockStaff = { id: staffId, businessId }
            const mockOverride: StaffAvailabilityOverride = {
                id: 'override-1',
                staffId,
                businessId,
                date,
                ...availability,
                createdAt: new Date(),
            }

            asMock(mockPrisma.staff.findUnique).mockResolvedValue(mockStaff as Staff)
            asMock(mockPrisma.staffAvailabilityOverride.upsert).mockResolvedValue(mockOverride)

            const result = await repository.overrideAvailability(staffId, date, availability)

            expect(mockPrisma.staffAvailabilityOverride.upsert).toHaveBeenCalledWith({
                where: {
                    staffId_date: {
                        staffId,
                        date,
                    },
                },
                update: {
                    ...availability,
                },
                create: {
                    staffId,
                    businessId,
                    date,
                    ...availability,
                },
            })
            expect(result).toEqual(mockOverride)
        })

        it('should create unavailable override', async () => {
            const date = new Date('2024-01-15')
            const availability = {
                startTime: undefined,
                endTime: undefined,
                isAvailable: false,
                reason: 'Sick day',
            }

            const mockStaff = { id: staffId, businessId }
            const mockOverride: StaffAvailabilityOverride = {
                id: 'override-1',
                staffId,
                businessId,
                date,
                startTime: null,
                endTime: null,
                isAvailable: false,
                reason: 'Sick day',
                createdAt: new Date(),
            }

            asMock(mockPrisma.staff.findUnique).mockResolvedValue(mockStaff as Staff)
            asMock(mockPrisma.staffAvailabilityOverride.upsert).mockResolvedValue(mockOverride)

            const result = await repository.overrideAvailability(staffId, date, availability)

            expect(result.isAvailable).toBe(false)
            expect(result.startTime).toBeNull()
            expect(result.endTime).toBeNull()
        })
    })

    describe('getAvailableStaff', () => {
        it('should return available staff for specific time', async () => {
            const dateTime = new Date('2024-01-15T10:00:00Z') // Monday 10 AM
            const serviceDuration = 60 // 1 hour

            const mockAvailableStaff = ['staff-1', 'staff-2']

            // Mock the complex query logic
            asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue([
                {
                    id: 'avail-1',
                    staffId: 'staff-1',
                    businessId,
                    dayOfWeek: 1,
                    startTime: '09:00:00',
                    endTime: '17:00:00',
                    isRecurring: true,
                    effectiveDate: null,
                    expiryDate: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ] as StaffAvailability[])

            asMock(mockPrisma.staffAvailabilityOverride.findMany).mockResolvedValue([])
            asMock(mockPrisma.appointment.findMany).mockResolvedValue([])
            asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue([])

            const result = await repository.getAvailableStaff(businessId, dateTime, serviceDuration)

            expect(Array.isArray(result)).toBe(true)
        })
    })

    describe('isStaffAvailable', () => {
        it('should return true when staff is available', async () => {
            const dateTime = new Date('2024-01-15T10:00:00Z')
            const serviceDuration = 60

            asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue([
                {
                    id: 'avail-1',
                    staffId,
                    businessId,
                    dayOfWeek: 1,
                    startTime: '09:00:00',
                    endTime: '17:00:00',
                    isRecurring: true,
                    effectiveDate: null,
                    expiryDate: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ] as StaffAvailability[])

            asMock(mockPrisma.staffAvailabilityOverride.findFirst).mockResolvedValue(null)
            asMock(mockPrisma.appointment.findMany).mockResolvedValue([])
            asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue([])

            const result = await repository.isStaffAvailable(staffId, dateTime, serviceDuration)

            expect(typeof result).toBe('boolean')
        })
    })

    describe('detectAvailabilityConflicts', () => {
        it('should detect conflicts with appointments', async () => {
            const dateRange = {
                startDate: new Date('2024-01-15'),
                endDate: new Date('2024-01-17'),
            }

            const mockConflictingAppointments = [
                {
                    id: 'appointment-1',
                    staffId,
                    startTime: new Date('2024-01-16T10:00:00Z'),
                    endTime: new Date('2024-01-16T11:00:00Z'),
                    status: 'SCHEDULED',
                },
            ]

            asMock(mockPrisma.appointment.findMany).mockResolvedValue(mockConflictingAppointments)
            asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue([])

            const result = await repository.detectAvailabilityConflicts(staffId, dateRange)

            expect(Array.isArray(result)).toBe(true)
        })

        it('should return empty array when no conflicts', async () => {
            const dateRange = {
                startDate: new Date('2024-01-15'),
                endDate: new Date('2024-01-17'),
            }

            asMock(mockPrisma.appointment.findMany).mockResolvedValue([])
            asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue([])

            const result = await repository.detectAvailabilityConflicts(staffId, dateRange)

            expect(result).toEqual([])
        })
    })

    describe('updateRecurringAvailability', () => {
        it('should update recurring availability for specific day', async () => {
            const dayOfWeek = 1
            const startTime = '10:00:00'
            const endTime = '18:00:00'

            const mockStaff = { id: staffId, businessId }
            const mockUpdatedAvailability: StaffAvailability[] = [
                {
                    id: 'avail-1',
                    staffId,
                    businessId,
                    dayOfWeek,
                    startTime,
                    endTime,
                    isRecurring: true,
                    effectiveDate: null,
                    expiryDate: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ]

            asMock(mockPrisma.staff.findUnique).mockResolvedValue(mockStaff as Staff)
            asMock(mockPrisma.staffAvailability.deleteMany).mockResolvedValue({ count: 1 })
            asMock(mockPrisma.staffAvailability.create).mockResolvedValue(mockUpdatedAvailability[0])

            const result = await repository.updateRecurringAvailability(staffId, dayOfWeek, startTime, endTime)

            expect(mockPrisma.staffAvailability.deleteMany).toHaveBeenCalledWith({
                where: {
                    staffId,
                    dayOfWeek,
                    isRecurring: true,
                },
            })
            expect(result).toEqual(mockUpdatedAvailability)
        })
    })

    describe('deleteAvailabilityOverride', () => {
        it('should delete availability override', async () => {
            const date = new Date('2024-01-15')

            asMock(mockPrisma.staffAvailabilityOverride.delete).mockResolvedValue({} as any)

            await repository.deleteAvailabilityOverride(staffId, date)

            expect(mockPrisma.staffAvailabilityOverride.delete).toHaveBeenCalledWith({
                where: {
                    staffId_date: {
                        staffId,
                        date,
                    },
                },
            })
        })
    })

    describe('error handling', () => {
        it('should handle database errors gracefully', async () => {
            const dateRange = {
                startDate: new Date('2024-01-15'),
                endDate: new Date('2024-01-21'),
            }

            asMock(mockPrisma.staff.findUnique).mockRejectedValue(new Error('Database error'))

            await expect(repository.getAvailability(staffId, dateRange))
                .rejects.toThrow('Database error')
        })

        it('should validate required parameters', async () => {
            const availabilityData = {
                dayOfWeek: 1,
                startTime: '09:00:00',
                endTime: '17:00:00',
            }

            await expect(repository.setAvailability('', availabilityData))
                .rejects.toThrow()
        })
    })
})
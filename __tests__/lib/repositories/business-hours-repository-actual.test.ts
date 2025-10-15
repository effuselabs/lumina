import { prisma } from '@/lib/prisma'
import { BusinessHoursRepository } from '@/lib/repositories/business-hours-repository'
import { BusinessHoliday, BusinessHours } from '@prisma/client'
import { asMock } from '@/__tests__/utils/prisma-mock-helpers'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
    prisma: {
        businessHours: {
            findMany: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            upsert: jest.fn(),
        },
        businessHoliday: {
            findMany: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
            upsert: jest.fn(),
        },
        business: {
            findUnique: jest.fn(),
        },
    },
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('BusinessHoursRepository', () => {
    let repository: BusinessHoursRepository
    const businessId = 'business-123'

    beforeEach(() => {
        repository = new BusinessHoursRepository()
        jest.clearAllMocks()
    })

    describe('getBusinessHours', () => {
        it('should return business hours for a specific business', async () => {
            const mockBusinessHours: BusinessHours[] = [
                {
                    id: 'hours-1',
                    businessId,
                    dayOfWeek: 1, // Monday
                    openTime: '09:00:00',
                    closeTime: '17:00:00',
                    isClosed: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ]

            asMock(mockPrisma.businessHours.findMany).mockResolvedValue(mockBusinessHours)

            const result = await repository.getBusinessHours(businessId)

            expect(mockPrisma.businessHours.findMany).toHaveBeenCalledWith({
                where: { businessId },
                orderBy: { dayOfWeek: 'asc' },
            })
            expect(result).toEqual(mockBusinessHours)
        })

        it('should return business hours for a specific day', async () => {
            const mockBusinessHours: BusinessHours[] = [
                {
                    id: 'hours-1',
                    businessId,
                    dayOfWeek: 1, // Monday
                    openTime: '09:00:00',
                    closeTime: '17:00:00',
                    isClosed: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ]

            asMock(mockPrisma.businessHours.findMany).mockResolvedValue(mockBusinessHours)

            const result = await repository.getBusinessHours(businessId, 1)

            expect(mockPrisma.businessHours.findMany).toHaveBeenCalledWith({
                where: { businessId, dayOfWeek: 1 },
                orderBy: { dayOfWeek: 'asc' },
            })
            expect(result).toEqual(mockBusinessHours)
        })

        it('should return empty array when no business hours found', async () => {
            asMock(mockPrisma.businessHours.findMany).mockResolvedValue([])

            const result = await repository.getBusinessHours(businessId)

            expect(result).toEqual([])
        })
    })

    describe('getBusinessHoursForDate', () => {
        it('should return business hours and holiday for specific date', async () => {
            const testDate = new Date('2024-01-15') // Monday
            const mockBusinessHours: BusinessHours = {
                id: 'hours-1',
                businessId,
                dayOfWeek: 1,
                openTime: '09:00:00',
                closeTime: '17:00:00',
                isClosed: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            const mockHoliday: BusinessHoliday = {
                id: 'holiday-1',
                businessId,
                date: testDate,
                name: 'Test Holiday',
                isClosed: true,
                openTime: null,
                closeTime: null,
                createdAt: new Date(),
            }

            asMock(mockPrisma.businessHours.findFirst).mockResolvedValue(mockBusinessHours)
            asMock(mockPrisma.businessHoliday.findFirst).mockResolvedValue(mockHoliday)

            const result = await repository.getBusinessHoursForDate(businessId, testDate)

            expect(result.businessHours).toEqual(mockBusinessHours)
            expect(result.holiday).toEqual(mockHoliday)
        })

        it('should return null holiday when no holiday exists', async () => {
            const testDate = new Date('2024-01-15')
            const mockBusinessHours: BusinessHours = {
                id: 'hours-1',
                businessId,
                dayOfWeek: 1,
                openTime: '09:00:00',
                closeTime: '17:00:00',
                isClosed: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            asMock(mockPrisma.businessHours.findFirst).mockResolvedValue(mockBusinessHours)
            asMock(mockPrisma.businessHoliday.findFirst).mockResolvedValue(null)

            const result = await repository.getBusinessHoursForDate(businessId, testDate)

            expect(result.businessHours).toEqual(mockBusinessHours)
            expect(result.holiday).toBeNull()
        })
    })

    describe('setBusinessHours', () => {
        it('should create/update business hours', async () => {
            const schedule = {
                dayOfWeek: 1,
                openTime: '09:00:00',
                closeTime: '17:00:00',
                isClosed: false,
            }

            const mockCreatedHours: BusinessHours = {
                id: 'hours-1',
                businessId,
                ...schedule,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            asMock(mockPrisma.businessHours.upsert).mockResolvedValue(mockCreatedHours)

            const result = await repository.setBusinessHours(businessId, schedule)

            expect(mockPrisma.businessHours.upsert).toHaveBeenCalledWith({
                where: {
                    businessId_dayOfWeek: {
                        businessId,
                        dayOfWeek: schedule.dayOfWeek,
                    },
                },
                update: {
                    openTime: schedule.openTime,
                    closeTime: schedule.closeTime,
                    isClosed: schedule.isClosed,
                    updatedAt: expect.any(Date),
                },
                create: {
                    businessId,
                    ...schedule,
                },
            })
            expect(result).toEqual(mockCreatedHours)
        })

        it('should handle closed days correctly', async () => {
            const schedule = {
                dayOfWeek: 0, // Sunday
                openTime: null,
                closeTime: null,
                isClosed: true,
            }

            const mockCreatedHours: BusinessHours = {
                id: 'hours-1',
                businessId,
                dayOfWeek: 0,
                openTime: null,
                closeTime: null,
                isClosed: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            asMock(mockPrisma.businessHours.upsert).mockResolvedValue(mockCreatedHours)

            const result = await repository.setBusinessHours(businessId, schedule)

            expect(result.isClosed).toBe(true)
            expect(result.openTime).toBeNull()
            expect(result.closeTime).toBeNull()
        })
    })

    describe('isBusinessOpen', () => {
        it('should return true when business is open', async () => {
            const testDateTime = new Date('2024-01-15T10:00:00Z') // Monday 10 AM

            const mockBusinessHours: BusinessHours = {
                id: 'hours-1',
                businessId,
                dayOfWeek: 1,
                openTime: '09:00',
                closeTime: '17:00',
                isClosed: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            asMock(mockPrisma.businessHours.findFirst).mockResolvedValue(mockBusinessHours)
            asMock(mockPrisma.businessHoliday.findFirst).mockResolvedValue(null)

            const result = await repository.isBusinessOpen(businessId, testDateTime)

            expect(result).toBe(true)
        })

        it('should return false when business is closed', async () => {
            const testDateTime = new Date('2024-01-14T10:00:00Z') // Sunday 10 AM

            const mockBusinessHours: BusinessHours = {
                id: 'hours-1',
                businessId,
                dayOfWeek: 0,
                openTime: null,
                closeTime: null,
                isClosed: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            asMock(mockPrisma.businessHours.findFirst).mockResolvedValue(mockBusinessHours)
            asMock(mockPrisma.businessHoliday.findFirst).mockResolvedValue(null)

            const result = await repository.isBusinessOpen(businessId, testDateTime)

            expect(result).toBe(false)
        })

        it('should return false when outside business hours', async () => {
            const testDateTime = new Date('2024-01-15T20:00:00Z') // Monday 8 PM

            const mockBusinessHours: BusinessHours = {
                id: 'hours-1',
                businessId,
                dayOfWeek: 1,
                openTime: '09:00',
                closeTime: '17:00',
                isClosed: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            asMock(mockPrisma.businessHours.findFirst).mockResolvedValue(mockBusinessHours)
            asMock(mockPrisma.businessHoliday.findFirst).mockResolvedValue(null)

            const result = await repository.isBusinessOpen(businessId, testDateTime)

            expect(result).toBe(false)
        })

        it('should return false on holidays', async () => {
            const testDateTime = new Date('2024-12-25T10:00:00Z') // Christmas

            const mockBusinessHours: BusinessHours = {
                id: 'hours-1',
                businessId,
                dayOfWeek: 3, // Wednesday
                openTime: '09:00',
                closeTime: '17:00',
                isClosed: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            const mockHoliday: BusinessHoliday = {
                id: 'holiday-1',
                businessId,
                date: new Date('2024-12-25'),
                name: 'Christmas Day',
                isClosed: true,
                openTime: null,
                closeTime: null,
                createdAt: new Date(),
            }

            asMock(mockPrisma.businessHours.findFirst).mockResolvedValue(mockBusinessHours)
            asMock(mockPrisma.businessHoliday.findFirst).mockResolvedValue(mockHoliday)

            const result = await repository.isBusinessOpen(businessId, testDateTime)

            expect(result).toBe(false)
        })
    })

    describe('addHoliday', () => {
        it('should create a new holiday', async () => {
            const holidayData = {
                date: new Date('2024-12-25'),
                name: 'Christmas Day',
                isClosed: true,
            }

            const mockHoliday: BusinessHoliday = {
                id: 'holiday-1',
                businessId,
                ...holidayData,
                openTime: null,
                closeTime: null,
                createdAt: new Date(),
            }

            asMock(mockPrisma.businessHoliday.upsert).mockResolvedValue(mockHoliday)

            const result = await repository.addHoliday(businessId, holidayData)

            expect(mockPrisma.businessHoliday.upsert).toHaveBeenCalledWith({
                where: {
                    businessId_date: {
                        businessId,
                        date: holidayData.date,
                    },
                },
                update: {
                    name: holidayData.name,
                    isClosed: holidayData.isClosed,
                    openTime: undefined,
                    closeTime: undefined,
                    updatedAt: expect.any(Date),
                },
                create: {
                    businessId,
                    ...holidayData,
                },
            })
            expect(result).toEqual(mockHoliday)
        })

        it('should create holiday with custom hours', async () => {
            const holidayData = {
                date: new Date('2024-12-24'),
                name: 'Christmas Eve',
                isClosed: false,
                openTime: '09:00:00',
                closeTime: '14:00:00',
            }

            const mockHoliday: BusinessHoliday = {
                id: 'holiday-1',
                businessId,
                ...holidayData,
                createdAt: new Date(),
            }

            asMock(mockPrisma.businessHoliday.upsert).mockResolvedValue(mockHoliday)

            const result = await repository.addHoliday(businessId, holidayData)

            expect(result.openTime).toBe('09:00:00')
            expect(result.closeTime).toBe('14:00:00')
            expect(result.isClosed).toBe(false)
        })
    })

    describe('getHolidays', () => {
        it('should return holidays for date range', async () => {
            const startDate = new Date('2024-12-01')
            const endDate = new Date('2024-12-31')

            const mockHolidays: BusinessHoliday[] = [
                {
                    id: 'holiday-1',
                    businessId,
                    date: new Date('2024-12-25'),
                    name: 'Christmas Day',
                    isClosed: true,
                    openTime: null,
                    closeTime: null,
                    createdAt: new Date(),
                },
            ]

            asMock(mockPrisma.businessHoliday.findMany).mockResolvedValue(mockHolidays)

            const result = await repository.getHolidays(businessId, startDate, endDate)

            expect(mockPrisma.businessHoliday.findMany).toHaveBeenCalledWith({
                where: {
                    businessId,
                    date: {
                        gte: startDate,
                        lte: endDate,
                    },
                },
                orderBy: { date: 'asc' },
            })
            expect(result).toEqual(mockHolidays)
        })

        it('should return all holidays when no date range provided', async () => {
            const mockHolidays: BusinessHoliday[] = [
                {
                    id: 'holiday-1',
                    businessId,
                    date: new Date('2024-12-25'),
                    name: 'Christmas Day',
                    isClosed: true,
                    openTime: null,
                    closeTime: null,
                    createdAt: new Date(),
                },
            ]

            asMock(mockPrisma.businessHoliday.findMany).mockResolvedValue(mockHolidays)

            const result = await repository.getHolidays(businessId)

            expect(mockPrisma.businessHoliday.findMany).toHaveBeenCalledWith({
                where: { businessId },
                orderBy: { date: 'asc' },
            })
            expect(result).toEqual(mockHolidays)
        })
    })

    describe('validateBusinessHours', () => {
        it('should return valid for correct business hours', async () => {
            const result = await repository.validateBusinessHours(businessId, '09:00', '17:00', 1)

            expect(result.isValid).toBe(true)
            expect(result.errors).toHaveLength(0)
        })

        it('should return invalid for end time before start time', async () => {
            const result = await repository.validateBusinessHours(businessId, '17:00', '09:00', 1)

            expect(result.isValid).toBe(false)
            expect(result.errors).toContain('End time must be after start time')
        })

        it('should return invalid for invalid time format', async () => {
            const result = await repository.validateBusinessHours(businessId, '25:00', '17:00', 1)

            expect(result.isValid).toBe(false)
            expect(result.errors).toContain('Invalid start time format')
        })

        it('should return invalid for invalid day of week', async () => {
            const result = await repository.validateBusinessHours(businessId, '09:00', '17:00', 8)

            expect(result.isValid).toBe(false)
            expect(result.errors).toContain('Day of week must be between 0 and 6')
        })
    })

    describe('error handling', () => {
        it('should handle database errors gracefully', async () => {
            asMock(mockPrisma.businessHours.findMany).mockRejectedValue(new Error('Database error'))

            await expect(repository.getBusinessHours(businessId)).rejects.toThrow('Database error')
        })

        it('should validate business ID parameter', async () => {
            await expect(repository.getBusinessHours('')).rejects.toThrow()
        })
    })
})
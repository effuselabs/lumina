import { prisma } from '@/lib/prisma'
import { BusinessHoursRepository } from '@/lib/repositories/business-hours-repository'
import { BusinessHours, DayOfWeek } from '@prisma/client'

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
                    dayOfWeek: DayOfWeek.MONDAY,
                    openTime: '09:00:00',
                    closeTime: '17:00:00',
                    isClosed: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ]

            mockPrisma.businessHours.findMany.mockResolvedValue(mockBusinessHours)

            const result = await repository.getBusinessHours(businessId)

            expect(mockPrisma.businessHours.findMany).toHaveBeenCalledWith({
                where: { businessId },
                orderBy: { dayOfWeek: 'asc' },
            })
            expect(result).toEqual(mockBusinessHours)
        })

        it('should return empty array when no business hours found', async () => {
            mockPrisma.businessHours.findMany.mockResolvedValue([])

            const result = await repository.getBusinessHours(businessId)

            expect(result).toEqual([])
        })
    })

    describe('getBusinessHoursForDay', () => {
        it('should return business hours for specific day', async () => {
            const mockBusinessHours: BusinessHours = {
                id: 'hours-1',
                businessId,
                dayOfWeek: DayOfWeek.MONDAY,
                openTime: '09:00:00',
                closeTime: '17:00:00',
                isClosed: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            mockPrisma.businessHours.findFirst.mockResolvedValue(mockBusinessHours)

            const result = await repository.getBusinessHoursForDay(businessId, DayOfWeek.MONDAY)

            expect(mockPrisma.businessHours.findFirst).toHaveBeenCalledWith({
                where: {
                    businessId,
                    dayOfWeek: DayOfWeek.MONDAY,
                },
            })
            expect(result).toEqual(mockBusinessHours)
        })

        it('should return null when no hours found for day', async () => {
            mockPrisma.businessHours.findFirst.mockResolvedValue(null)

            const result = await repository.getBusinessHoursForDay(businessId, DayOfWeek.SUNDAY)

            expect(result).toBeNull()
        })
    })

    describe('setBusinessHours', () => {
        it('should create new business hours', async () => {
            const businessHoursData = {
                dayOfWeek: DayOfWeek.MONDAY,
                openTime: '09:00:00',
                closeTime: '17:00:00',
                isClosed: false,
            }

            const mockCreatedHours: BusinessHours = {
                id: 'hours-1',
                businessId,
                ...businessHoursData,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            mockPrisma.businessHours.upsert.mockResolvedValue(mockCreatedHours)

            const result = await repository.setBusinessHours(businessId, businessHoursData)

            expect(mockPrisma.businessHours.upsert).toHaveBeenCalledWith({
                where: {
                    businessId_dayOfWeek: {
                        businessId,
                        dayOfWeek: businessHoursData.dayOfWeek,
                    },
                },
                update: {
                    openTime: businessHoursData.openTime,
                    closeTime: businessHoursData.closeTime,
                    isClosed: businessHoursData.isClosed,
                    updatedAt: expect.any(Date),
                },
                create: {
                    businessId,
                    ...businessHoursData,
                },
            })
            expect(result).toEqual(mockCreatedHours)
        })

        it('should handle closed days correctly', async () => {
            const businessHoursData = {
                dayOfWeek: DayOfWeek.SUNDAY,
                openTime: null,
                closeTime: null,
                isClosed: true,
            }

            const mockCreatedHours: BusinessHours = {
                id: 'hours-1',
                businessId,
                dayOfWeek: DayOfWeek.SUNDAY,
                openTime: null,
                closeTime: null,
                isClosed: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            mockPrisma.businessHours.upsert.mockResolvedValue(mockCreatedHours)

            const result = await repository.setBusinessHours(businessId, businessHoursData)

            expect(result.isClosed).toBe(true)
            expect(result.openTime).toBeNull()
            expect(result.closeTime).toBeNull()
        })
    })

    describe('isBusinessOpen', () => {
        it('should return true when business is open', async () => {
            const testDate = new Date('2024-01-15T10:00:00Z') // Monday
            const mockBusinessHours: BusinessHours = {
                id: 'hours-1',
                businessId,
                dayOfWeek: DayOfWeek.MONDAY,
                openTime: '09:00:00',
                closeTime: '17:00:00',
                isClosed: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            mockPrisma.businessHours.findFirst.mockResolvedValue(mockBusinessHours)

            const result = await repository.isBusinessOpen(businessId, testDate)

            expect(result).toBe(true)
        })

        it('should return false when business is closed', async () => {
            const testDate = new Date('2024-01-14T10:00:00Z') // Sunday
            const mockBusinessHours: BusinessHours = {
                id: 'hours-1',
                businessId,
                dayOfWeek: DayOfWeek.SUNDAY,
                openTime: null,
                closeTime: null,
                isClosed: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            mockPrisma.businessHours.findFirst.mockResolvedValue(mockBusinessHours)

            const result = await repository.isBusinessOpen(businessId, testDate)

            expect(result).toBe(false)
        })

        it('should return false when outside business hours', async () => {
            const testDate = new Date('2024-01-15T20:00:00Z') // Monday 8 PM
            const mockBusinessHours: BusinessHours = {
                id: 'hours-1',
                businessId,
                dayOfWeek: DayOfWeek.MONDAY,
                openTime: '09:00:00',
                closeTime: '17:00:00',
                isClosed: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            mockPrisma.businessHours.findFirst.mockResolvedValue(mockBusinessHours)

            const result = await repository.isBusinessOpen(businessId, testDate)

            expect(result).toBe(false)
        })
    })

    describe('validateBusinessHours', () => {
        it('should return true for valid business hours', async () => {
            const startTime = new Date('2024-01-15T10:00:00Z') // Monday 10 AM
            const endTime = new Date('2024-01-15T16:00:00Z') // Monday 4 PM

            const mockBusinessHours: BusinessHours = {
                id: 'hours-1',
                businessId,
                dayOfWeek: DayOfWeek.MONDAY,
                openTime: '09:00:00',
                closeTime: '17:00:00',
                isClosed: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            mockPrisma.businessHours.findFirst.mockResolvedValue(mockBusinessHours)

            const result = await repository.validateBusinessHours(businessId, startTime, endTime)

            expect(result).toBe(true)
        })

        it('should return false for invalid business hours', async () => {
            const startTime = new Date('2024-01-15T08:00:00Z') // Monday 8 AM (before opening)
            const endTime = new Date('2024-01-15T16:00:00Z') // Monday 4 PM

            const mockBusinessHours: BusinessHours = {
                id: 'hours-1',
                businessId,
                dayOfWeek: DayOfWeek.MONDAY,
                openTime: '09:00:00',
                closeTime: '17:00:00',
                isClosed: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            mockPrisma.businessHours.findFirst.mockResolvedValue(mockBusinessHours)

            const result = await repository.validateBusinessHours(businessId, startTime, endTime)

            expect(result).toBe(false)
        })

        it('should return false when business is closed', async () => {
            const startTime = new Date('2024-01-14T10:00:00Z') // Sunday
            const endTime = new Date('2024-01-14T16:00:00Z')

            const mockBusinessHours: BusinessHours = {
                id: 'hours-1',
                businessId,
                dayOfWeek: DayOfWeek.SUNDAY,
                openTime: null,
                closeTime: null,
                isClosed: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            mockPrisma.businessHours.findFirst.mockResolvedValue(mockBusinessHours)

            const result = await repository.validateBusinessHours(businessId, startTime, endTime)

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

            const mockHoliday = {
                id: 'holiday-1',
                businessId,
                ...holidayData,
                openTime: null,
                closeTime: null,
                createdAt: new Date(),
            }

            mockPrisma.businessHoliday.create.mockResolvedValue(mockHoliday)

            const result = await repository.addHoliday(businessId, holidayData)

            expect(mockPrisma.businessHoliday.create).toHaveBeenCalledWith({
                data: {
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

            const mockHoliday = {
                id: 'holiday-1',
                businessId,
                ...holidayData,
                createdAt: new Date(),
            }

            mockPrisma.businessHoliday.create.mockResolvedValue(mockHoliday)

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

            const mockHolidays = [
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

            mockPrisma.businessHoliday.findMany.mockResolvedValue(mockHolidays)

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
    })

    describe('error handling', () => {
        it('should handle database errors gracefully', async () => {
            mockPrisma.businessHours.findMany.mockRejectedValue(new Error('Database error'))

            await expect(repository.getBusinessHours(businessId)).rejects.toThrow('Database error')
        })

        it('should validate business ID parameter', async () => {
            await expect(repository.getBusinessHours('')).rejects.toThrow()
        })
    })
})
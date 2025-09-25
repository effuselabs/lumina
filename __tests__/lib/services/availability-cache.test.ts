import { prisma } from '@/lib/prisma'
import { AvailabilityCache } from '@/lib/services/availability-cache'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
    prisma: {
        availabilityCache: {
            findUnique: jest.fn(),
            upsert: jest.fn(),
            deleteMany: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
            findMany: jest.fn(),
            findFirst: jest.fn(),
            groupBy: jest.fn(),
            $transaction: jest.fn()
        }
    }
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('AvailabilityCache', () => {
    const businessId = 'business-1'
    const staffId = 'staff-1'
    const testDate = new Date('2024-01-15T00:00:00.000Z')
    const serviceId = 'service-1'

    const mockSlots = [
        {
            startTime: new Date('2024-01-15T09:00:00.000Z'),
            endTime: new Date('2024-01-15T10:00:00.000Z'),
            staffId,
            staffName: 'Test Staff',
            isAvailable: true,
            duration: 60
        }
    ]

    beforeEach(() => {
        jest.clearAllMocks()
        AvailabilityCache.resetMetrics()
    })

    describe('get', () => {
        it('should return cached slots when cache hit', async () => {
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now

            mockPrisma.availabilityCache.findUnique.mockResolvedValue({
                availableSlots: mockSlots,
                expiresAt
            } as any)

            const result = await AvailabilityCache.get({
                businessId,
                staffId,
                date: testDate,
                serviceId
            })

            expect(result).toEqual(mockSlots)
            expect(mockPrisma.availabilityCache.findUnique).toHaveBeenCalledWith({
                where: { cacheKey: 'avail:business-1:staff-1:2024-01-15:service-1:default' },
                select: {
                    availableSlots: true,
                    expiresAt: true
                }
            })

            const metrics = AvailabilityCache.getMetrics()
            expect(metrics.totalHits).toBe(1)
            expect(metrics.totalMisses).toBe(0)
        })

        it('should return null when cache miss', async () => {
            mockPrisma.availabilityCache.findUnique.mockResolvedValue(null)

            const result = await AvailabilityCache.get({
                businessId,
                staffId,
                date: testDate,
                serviceId
            })

            expect(result).toBeNull()

            const metrics = AvailabilityCache.getMetrics()
            expect(metrics.totalHits).toBe(0)
            expect(metrics.totalMisses).toBe(1)
        })

        it('should return null and clean up expired cache entry', async () => {
            const expiredDate = new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago

            mockPrisma.availabilityCache.findUnique.mockResolvedValue({
                availableSlots: mockSlots,
                expiresAt: expiredDate
            } as any)

            mockPrisma.availabilityCache.delete.mockResolvedValue({} as any)

            const result = await AvailabilityCache.get({
                businessId,
                staffId,
                date: testDate,
                serviceId
            })

            expect(result).toBeNull()
            expect(mockPrisma.availabilityCache.delete).toHaveBeenCalledWith({
                where: { cacheKey: 'avail:business-1:staff-1:2024-01-15:service-1:default' }
            })

            const metrics = AvailabilityCache.getMetrics()
            expect(metrics.totalMisses).toBe(1)
        })

        it('should handle database errors gracefully', async () => {
            mockPrisma.availabilityCache.findUnique.mockRejectedValue(new Error('Database error'))

            const result = await AvailabilityCache.get({
                businessId,
                staffId,
                date: testDate,
                serviceId
            })

            expect(result).toBeNull()

            const metrics = AvailabilityCache.getMetrics()
            expect(metrics.totalMisses).toBe(1)
        })
    })

    describe('set', () => {
        it('should cache availability slots', async () => {
            mockPrisma.availabilityCache.count.mockResolvedValue(100) // Below limit
            mockPrisma.availabilityCache.upsert.mockResolvedValue({} as any)

            await AvailabilityCache.set({
                businessId,
                staffId,
                date: testDate,
                serviceId
            }, mockSlots)

            expect(mockPrisma.availabilityCache.upsert).toHaveBeenCalledWith({
                where: { cacheKey: 'avail:business-1:staff-1:2024-01-15:service-1:default' },
                update: {
                    availableSlots: mockSlots,
                    expiresAt: expect.any(Date),
                    updatedAt: expect.any(Date)
                },
                create: {
                    businessId,
                    staffId,
                    date: testDate,
                    availableSlots: mockSlots,
                    cacheKey: 'avail:business-1:staff-1:2024-01-15:service-1:default',
                    expiresAt: expect.any(Date)
                }
            })
        })

        it('should handle database errors gracefully', async () => {
            mockPrisma.availabilityCache.count.mockResolvedValue(100)
            mockPrisma.availabilityCache.upsert.mockRejectedValue(new Error('Database error'))

            // Should not throw error
            await expect(AvailabilityCache.set({
                businessId,
                staffId,
                date: testDate,
                serviceId
            }, mockSlots)).resolves.toBeUndefined()
        })

        it('should cleanup old entries when approaching limit', async () => {
            mockPrisma.availabilityCache.count.mockResolvedValue(10000) // At limit
            mockPrisma.availabilityCache.findMany.mockResolvedValue([
                { id: 'old-1' },
                { id: 'old-2' }
            ] as any)
            mockPrisma.availabilityCache.deleteMany.mockResolvedValue({ count: 2 } as any)
            mockPrisma.availabilityCache.upsert.mockResolvedValue({} as any)

            await AvailabilityCache.set({
                businessId,
                staffId,
                date: testDate,
                serviceId
            }, mockSlots)

            expect(mockPrisma.availabilityCache.deleteMany).toHaveBeenCalledWith({
                where: {
                    id: {
                        in: ['old-1', 'old-2']
                    }
                }
            })
        })
    })

    describe('invalidate', () => {
        it('should invalidate cache by business ID', async () => {
            mockPrisma.availabilityCache.deleteMany.mockResolvedValue({ count: 5 } as any)

            await AvailabilityCache.invalidate({ businessId })

            expect(mockPrisma.availabilityCache.deleteMany).toHaveBeenCalledWith({
                where: { businessId }
            })
        })

        it('should invalidate cache by staff ID', async () => {
            mockPrisma.availabilityCache.deleteMany.mockResolvedValue({ count: 3 } as any)

            await AvailabilityCache.invalidate({ businessId, staffId })

            expect(mockPrisma.availabilityCache.deleteMany).toHaveBeenCalledWith({
                where: { businessId, staffId }
            })
        })

        it('should invalidate cache by date', async () => {
            mockPrisma.availabilityCache.deleteMany.mockResolvedValue({ count: 2 } as any)

            await AvailabilityCache.invalidate({ businessId, date: testDate })

            expect(mockPrisma.availabilityCache.deleteMany).toHaveBeenCalledWith({
                where: { businessId, date: testDate }
            })
        })

        it('should handle database errors gracefully', async () => {
            mockPrisma.availabilityCache.deleteMany.mockRejectedValue(new Error('Database error'))

            // Should not throw error
            await expect(AvailabilityCache.invalidate({ businessId })).resolves.toBeUndefined()
        })
    })

    describe('invalidateStaffAvailability', () => {
        it('should invalidate all cache entries for a staff member', async () => {
            mockPrisma.availabilityCache.deleteMany.mockResolvedValue({ count: 10 } as any)

            await AvailabilityCache.invalidateStaffAvailability(staffId, businessId)

            expect(mockPrisma.availabilityCache.deleteMany).toHaveBeenCalledWith({
                where: {
                    staffId,
                    businessId
                }
            })
        })
    })

    describe('invalidateBusinessHours', () => {
        it('should invalidate all cache entries for a business', async () => {
            mockPrisma.availabilityCache.deleteMany.mockResolvedValue({ count: 50 } as any)

            await AvailabilityCache.invalidateBusinessHours(businessId)

            expect(mockPrisma.availabilityCache.deleteMany).toHaveBeenCalledWith({
                where: { businessId }
            })
        })
    })

    describe('batchCalculateAndCache', () => {
        it('should batch calculate and cache availability', async () => {
            const mockCalculator = jest.fn().mockResolvedValue(mockSlots)
            const staffIds = ['staff-1', 'staff-2']
            const dateRange = {
                startDate: new Date('2024-01-15'),
                endDate: new Date('2024-01-16')
            }

            // Mock cache misses
            mockPrisma.availabilityCache.findUnique.mockResolvedValue(null)
            mockPrisma.availabilityCache.count.mockResolvedValue(100)
            mockPrisma.availabilityCache.$transaction.mockResolvedValue([])

            await AvailabilityCache.batchCalculateAndCache(
                businessId,
                staffIds,
                dateRange,
                serviceId,
                mockCalculator
            )

            // Should call calculator for each staff/date combination
            expect(mockCalculator).toHaveBeenCalledTimes(4) // 2 staff × 2 days
            expect(mockPrisma.availabilityCache.$transaction).toHaveBeenCalled()
        })

        it('should skip already cached entries', async () => {
            const mockCalculator = jest.fn().mockResolvedValue(mockSlots)
            const staffIds = ['staff-1']
            const dateRange = {
                startDate: new Date('2024-01-15'),
                endDate: new Date('2024-01-15')
            }

            // Mock cache hit
            mockPrisma.availabilityCache.findUnique.mockResolvedValue({
                availableSlots: mockSlots,
                expiresAt: new Date(Date.now() + 10 * 60 * 1000)
            } as any)

            await AvailabilityCache.batchCalculateAndCache(
                businessId,
                staffIds,
                dateRange,
                serviceId,
                mockCalculator
            )

            // Should not call calculator since entry is cached
            expect(mockCalculator).not.toHaveBeenCalled()
        })
    })

    describe('cleanupExpired', () => {
        it('should clean up expired cache entries', async () => {
            mockPrisma.availabilityCache.deleteMany.mockResolvedValue({ count: 15 } as any)

            const result = await AvailabilityCache.cleanupExpired()

            expect(result).toBe(15)
            expect(mockPrisma.availabilityCache.deleteMany).toHaveBeenCalledWith({
                where: {
                    expiresAt: {
                        lt: expect.any(Date)
                    }
                }
            })
        })

        it('should handle database errors gracefully', async () => {
            mockPrisma.availabilityCache.deleteMany.mockRejectedValue(new Error('Database error'))

            const result = await AvailabilityCache.cleanupExpired()

            expect(result).toBe(0)
        })
    })

    describe('getCacheStats', () => {
        it('should return cache statistics', async () => {
            mockPrisma.availabilityCache.count
                .mockResolvedValueOnce(100) // total entries
                .mockResolvedValueOnce(10) // expired entries

            mockPrisma.availabilityCache.groupBy.mockResolvedValue([
                { businessId: 'business-1', _count: { businessId: 60 } },
                { businessId: 'business-2', _count: { businessId: 40 } }
            ] as any)

            mockPrisma.availabilityCache.findFirst
                .mockResolvedValueOnce({ createdAt: new Date('2024-01-01') } as any) // oldest
                .mockResolvedValueOnce({ createdAt: new Date('2024-01-15') } as any) // newest

            const stats = await AvailabilityCache.getCacheStats()

            expect(stats).toEqual({
                totalEntries: 100,
                expiredEntries: 10,
                entriesByBusiness: {
                    'business-1': 60,
                    'business-2': 40
                },
                oldestEntry: new Date('2024-01-01'),
                newestEntry: new Date('2024-01-15')
            })
        })

        it('should handle database errors gracefully', async () => {
            mockPrisma.availabilityCache.count.mockRejectedValue(new Error('Database error'))

            const stats = await AvailabilityCache.getCacheStats()

            expect(stats).toEqual({
                totalEntries: 0,
                expiredEntries: 0,
                entriesByBusiness: {}
            })
        })
    })

    describe('metrics', () => {
        it('should track cache hit rate correctly', async () => {
            // Setup cache hits and misses
            mockPrisma.availabilityCache.findUnique
                .mockResolvedValueOnce({
                    availableSlots: mockSlots,
                    expiresAt: new Date(Date.now() + 10 * 60 * 1000)
                } as any) // Hit
                .mockResolvedValueOnce(null) // Miss
                .mockResolvedValueOnce({
                    availableSlots: mockSlots,
                    expiresAt: new Date(Date.now() + 10 * 60 * 1000)
                } as any) // Hit

            // Make cache requests
            await AvailabilityCache.get({ businessId, staffId, date: testDate })
            await AvailabilityCache.get({ businessId, staffId, date: testDate })
            await AvailabilityCache.get({ businessId, staffId, date: testDate })

            const metrics = AvailabilityCache.getMetrics()

            expect(metrics.totalRequests).toBe(3)
            expect(metrics.totalHits).toBe(2)
            expect(metrics.totalMisses).toBe(1)
            expect(metrics.hitRate).toBe(66.67) // 2/3 * 100, rounded
            expect(metrics.averageQueryTime).toBeGreaterThan(0)
        })

        it('should reset metrics correctly', () => {
            // Make some requests first
            AvailabilityCache.getMetrics() // This will initialize metrics

            AvailabilityCache.resetMetrics()

            const metrics = AvailabilityCache.getMetrics()

            expect(metrics.totalRequests).toBe(0)
            expect(metrics.totalHits).toBe(0)
            expect(metrics.totalMisses).toBe(0)
            expect(metrics.hitRate).toBe(0)
            expect(metrics.averageQueryTime).toBe(0)
        })
    })

    describe('cache key generation', () => {
        it('should generate consistent cache keys', async () => {
            mockPrisma.availabilityCache.findUnique.mockResolvedValue(null)

            await AvailabilityCache.get({
                businessId: 'business-1',
                staffId: 'staff-1',
                date: new Date('2024-01-15'),
                serviceId: 'service-1',
                duration: 60
            })

            expect(mockPrisma.availabilityCache.findUnique).toHaveBeenCalledWith({
                where: { cacheKey: 'avail:business-1:staff-1:2024-01-15:service-1:60' },
                select: {
                    availableSlots: true,
                    expiresAt: true
                }
            })
        })

        it('should handle missing optional parameters in cache key', async () => {
            mockPrisma.availabilityCache.findUnique.mockResolvedValue(null)

            await AvailabilityCache.get({
                businessId: 'business-1',
                date: new Date('2024-01-15')
            })

            expect(mockPrisma.availabilityCache.findUnique).toHaveBeenCalledWith({
                where: { cacheKey: 'avail:business-1:all:2024-01-15:any:default' },
                select: {
                    availableSlots: true,
                    expiresAt: true
                }
            })
        })
    })
})
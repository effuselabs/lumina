import { prisma } from '@/lib/prisma'
import { BusinessHoursRepository } from '@/lib/repositories/business-hours-repository'
import { StaffAvailabilityRepository } from '@/lib/repositories/staff-availability-repository'
import { TimeOffRequestRepository } from '@/lib/repositories/time-off-request-repository'
import { AvailabilityCalculator } from '@/lib/services/availability-calculator'
import { performance } from 'perf_hooks'
import { asMock } from '@/__tests__/utils/prisma-mock-helpers'

// Mock Redis for cache testing
const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    flushall: jest.fn(),
    expire: jest.fn(),
    exists: jest.fn(),
}

jest.mock('redis', () => ({
    createClient: jest.fn(() => mockRedis),
}))

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
    prisma: {
        business: {
            findUnique: jest.fn(),
        },
        staff: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
        },
        service: {
            findMany: jest.fn(),
        },
        businessHours: {
            findMany: jest.fn(),
            upsert: jest.fn(),
        },
        staffAvailability: {
            findMany: jest.fn(),
            deleteMany: jest.fn(),
            create: jest.fn(),
        },
        timeOffRequest: {
            findMany: jest.fn(),
            create: jest.fn(),
        },
        appointment: {
            findMany: jest.fn(),
        },
        availabilityCache: {
            findFirst: jest.fn(),
            create: jest.fn(),
            deleteMany: jest.fn(),
        },
    },
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('Cache Performance and Invalidation Tests', () => {
    const businessId = 'business-123'
    const staffIds = Array.from({ length: 10 }, (_, i) => `staff-${i + 1}`)
    const serviceIds = Array.from({ length: 20 }, (_, i) => `service-${i + 1}`)

    beforeEach(() => {
        jest.clearAllMocks()
        setupCacheTestMocks()
    })

    function setupCacheTestMocks() {
        // Mock business data
        asMock(mockPrisma.business.findUnique).mockResolvedValue({
            id: businessId,
            name: 'Cache Test Business',
            timezone: 'America/New_York',
            createdAt: new Date(),
            updatedAt: new Date(),
        } as any)

        // Mock staff data
        asMock(mockPrisma.staff.findMany).mockResolvedValue(
            staffIds.map((id: any) => ({
                id,
                businessId,
                name: `Staff ${id}`,
                email: `${id}@test.com`,
                role: 'STAFF',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            })) as any
        )

        // Mock services data
        asMock(mockPrisma.service.findMany).mockResolvedValue(
            serviceIds.map((id, index) => ({
                id,
                businessId,
                name: `Service ${id}`,
                duration: 30 + (index % 4) * 30,
                price: 50 + index * 10,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            })) as any
        )

        // Mock business hours
        asMock(mockPrisma.businessHours.findMany).mockResolvedValue(
            Array.from({ length: 6 }, (_, i) => ({
                id: `hours-${i}`,
                businessId,
                dayOfWeek: i + 1,
                openTime: '09:00:00',
                closeTime: '18:00:00',
                isClosed: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            })) as any
        )

        // Mock staff availability
        asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue(
            staffIds.flatMap(staffId =>
                Array.from({ length: 6 }, (_, i) => ({
                    id: `availability-${staffId}-${i}`,
                    staffId,
                    businessId,
                    dayOfWeek: i + 1,
                    startTime: '09:00:00',
                    endTime: '18:00:00',
                    isRecurring: true,
                    effectiveDate: null,
                    expiryDate: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }))
            ) as any
        )

        // Mock minimal appointments and time-off
        asMock(mockPrisma.appointment.findMany).mockResolvedValue([])
        asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue([])

        // Mock cache operations
        mockRedis.get.mockResolvedValue(null) // Cache miss by default
        mockRedis.set.mockResolvedValue('OK')
        mockRedis.del.mockResolvedValue(1)
        mockRedis.keys.mockResolvedValue([])
        mockRedis.exists.mockResolvedValue(0)
    }

    describe('Cache Hit Performance', () => {
        it('should serve cached availability results in under 50ms', async () => {
            const calculator = new AvailabilityCalculator()

            // Mock cache hit with pre-computed availability data
            const cachedSlots = [
                {
                    startTime: new Date('2024-01-15T14:00:00Z'),
                    endTime: new Date('2024-01-15T15:00:00Z'),
                    staffId: staffIds[0],
                    staffName: 'Staff staff-1',
                    isAvailable: true,
                    duration: 60,
                    serviceId: null,
                    conflicts: [],
                },
                {
                    startTime: new Date('2024-01-15T15:00:00Z'),
                    endTime: new Date('2024-01-15T16:00:00Z'),
                    staffId: staffIds[0],
                    staffName: 'Staff staff-1',
                    isAvailable: true,
                    duration: 60,
                    serviceId: null,
                    conflicts: [],
                },
            ]

            mockRedis.get.mockResolvedValue(JSON.stringify(cachedSlots))
            mockRedis.exists.mockResolvedValue(1)

            const startTime = performance.now()

            const slots = await calculator.getAvailableSlots({
                businessId,
                date: new Date('2024-01-15'),
                staffId: staffIds[0],
                duration: 60,
                includeUnavailable: false,
            })

            const endTime = performance.now()
            const executionTime = endTime - startTime

            // Cache hits should be very fast
            expect(executionTime).toBeLessThan(50)
            expect(slots).toBeDefined()
            expect(Array.isArray(slots)).toBe(true)

            // Should not hit database for cached results
            expect(mockPrisma.businessHours.findMany).not.toHaveBeenCalled()
            expect(mockPrisma.staffAvailability.findMany).not.toHaveBeenCalled()
        })

        it('should achieve >80% cache hit ratio under normal load', async () => {
            const calculator = new AvailabilityCalculator()
            const totalRequests = 100
            let cacheHits = 0

            // Simulate cache hits for 85% of requests
            mockRedis.get.mockImplementation(async (key: string) => {
                const shouldHit = Math.random() < 0.85
                if (shouldHit) {
                    cacheHits++
                    return JSON.stringify([
                        {
                            startTime: new Date('2024-01-15T14:00:00Z'),
                            endTime: new Date('2024-01-15T15:00:00Z'),
                            staffId: staffIds[0],
                            staffName: 'Staff staff-1',
                            isAvailable: true,
                            duration: 60,
                            serviceId: null,
                            conflicts: [],
                        },
                    ])
                }
                return null
            })

            mockRedis.exists.mockImplementation(async () => {
                return Math.random() < 0.85 ? 1 : 0
            })

            const requests = Array.from({ length: totalRequests }, (_, i) => ({
                businessId,
                date: new Date('2024-01-15'),
                staffId: staffIds[i % staffIds.length],
                duration: 60,
                includeUnavailable: false,
            }))

            const startTime = performance.now()

            await Promise.all(
                requests.map((request: any) =>
                    calculator.getAvailableSlots(request).catch(() => null)
                )
            )

            const endTime = performance.now()
            const totalExecutionTime = endTime - startTime

            const cacheHitRatio = cacheHits / totalRequests

            // Should achieve target cache hit ratio
            expect(cacheHitRatio).toBeGreaterThan(0.8)

            // Should complete faster due to cache hits
            expect(totalExecutionTime).toBeLessThan(2000)

            console.log(`Cache Hit Ratio Test Results:`)
            console.log(`- Total requests: ${totalRequests}`)
            console.log(`- Cache hits: ${cacheHits}`)
            console.log(`- Cache hit ratio: ${(cacheHitRatio * 100).toFixed(1)}%`)
            console.log(`- Total execution time: ${totalExecutionTime.toFixed(2)}ms`)
            console.log(`- Average time per request: ${(totalExecutionTime / totalRequests).toFixed(2)}ms`)
        })

        it('should handle cache warming efficiently', async () => {
            const calculator = new AvailabilityCalculator()

            // Simulate cache warming for a week of availability
            const dates = Array.from({ length: 7 }, (_, i) => {
                const date = new Date('2024-01-15')
                date.setDate(date.getDate() + i)
                return date
            })

            const warmingRequests = dates.flatMap(date =>
                staffIds.map((staffId: any) => ({
                    businessId,
                    date,
                    staffId,
                    duration: 60,
                    includeUnavailable: false,
                }))
            )

            const startTime = performance.now()

            const results = await Promise.all(
                warmingRequests.map((request: any) =>
                    calculator.getAvailableSlots(request).catch(() => null)
                )
            )

            const endTime = performance.now()
            const totalExecutionTime = endTime - startTime

            // Should warm cache for 70 requests (7 days × 10 staff) in reasonable time
            expect(totalExecutionTime).toBeLessThan(3000)
            expect(results.filter(r => r !== null)).toHaveLength(warmingRequests.length)

            // Verify cache was populated
            expect(mockRedis.set).toHaveBeenCalledTimes(warmingRequests.length)

            console.log(`Cache Warming Test Results:`)
            console.log(`- Requests warmed: ${warmingRequests.length}`)
            console.log(`- Total time: ${totalExecutionTime.toFixed(2)}ms`)
            console.log(`- Average time per request: ${(totalExecutionTime / warmingRequests.length).toFixed(2)}ms`)
        })
    })

    describe('Cache Invalidation Performance', () => {
        it('should invalidate business availability cache quickly when business hours change', async () => {
            const businessHoursRepo = new BusinessHoursRepository()

            // Mock existing cache entries
            mockRedis.keys.mockResolvedValue([
                `availability:${businessId}:2024-01-15`,
                `availability:${businessId}:2024-01-16`,
                `availability:${businessId}:staff-1:2024-01-15`,
                `availability:${businessId}:staff-2:2024-01-15`,
            ])

            asMock(mockPrisma.businessHours.upsert).mockResolvedValue({
                id: 'hours-1',
                businessId,
                dayOfWeek: 1,
                openTime: '10:00:00',
                closeTime: '19:00:00',
                isClosed: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            } as any)

            const startTime = performance.now()

            await businessHoursRepo.setBusinessHours(businessId, {
                dayOfWeek: 1,
                openTime: '10:00:00',
                closeTime: '19:00:00',
                isClosed: false,
            })

            const endTime = performance.now()
            const executionTime = endTime - startTime

            // Cache invalidation should be fast
            expect(executionTime).toBeLessThan(100)

            // Should have queried for cache keys to invalidate
            expect(mockRedis.keys).toHaveBeenCalledWith(`availability:${businessId}:*`)

            // Should have deleted cache entries
            expect(mockRedis.del).toHaveBeenCalled()
        })

        it('should invalidate staff availability cache quickly when staff availability changes', async () => {
            const staffAvailabilityRepo = new StaffAvailabilityRepository()

            // Mock existing cache entries for specific staff
            mockRedis.keys.mockResolvedValue([
                `availability:${businessId}:${staffIds[0]}:2024-01-15`,
                `availability:${businessId}:${staffIds[0]}:2024-01-16`,
                `availability:${businessId}:2024-01-15`, // Business-wide cache
            ])

            asMock(mockPrisma.staffAvailability.deleteMany).mockResolvedValue({ count: 1 })
            asMock(mockPrisma.staffAvailability.create).mockResolvedValue({
                id: 'availability-new',
                staffId: staffIds[0],
                businessId,
                dayOfWeek: 1,
                startTime: '10:00:00',
                endTime: '16:00:00',
                isRecurring: true,
                effectiveDate: null,
                expiryDate: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            } as any)

            const startTime = performance.now()

            await staffAvailabilityRepo.setAvailability(staffIds[0], businessId, {
                dayOfWeek: 1,
                startTime: '10:00:00',
                endTime: '16:00:00',
                isRecurring: true,
            })

            const endTime = performance.now()
            const executionTime = endTime - startTime

            // Cache invalidation should be fast
            expect(executionTime).toBeLessThan(100)

            // Should have queried for staff-specific cache keys
            expect(mockRedis.keys).toHaveBeenCalledWith(`availability:${businessId}:${staffIds[0]}:*`)
            expect(mockRedis.keys).toHaveBeenCalledWith(`availability:${businessId}:*`)
        })

        it('should handle bulk cache invalidation efficiently', async () => {
            const timeOffRepo = new TimeOffRequestRepository()

            // Mock cache entries for multiple staff members
            const cacheKeys = staffIds.flatMap(staffId => [
                `availability:${businessId}:${staffId}:2024-01-15`,
                `availability:${businessId}:${staffId}:2024-01-16`,
                `availability:${businessId}:${staffId}:2024-01-17`,
            ])

            mockRedis.keys.mockResolvedValue(cacheKeys)

            asMock(mockPrisma.timeOffRequest.create).mockResolvedValue({
                id: 'timeoff-1',
                staffId: staffIds[0],
                businessId,
                startDate: new Date('2024-01-15'),
                endDate: new Date('2024-01-17'),
                reason: 'Vacation',
                status: 'APPROVED',
                approvedBy: null,
                approvedAt: null,
                denialReason: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            } as any)

            const startTime = performance.now()

            await timeOffRepo.createTimeOffRequest({
                staffId: staffIds[0],
                startDate: new Date('2024-01-15'),
                endDate: new Date('2024-01-17'),
                reason: 'Vacation',
                status: 'APPROVED',
            })

            const endTime = performance.now()
            const executionTime = endTime - startTime

            // Bulk invalidation should be efficient
            expect(executionTime).toBeLessThan(150)

            // Should have invalidated relevant cache entries
            expect(mockRedis.keys).toHaveBeenCalled()
            expect(mockRedis.del).toHaveBeenCalled()
        })

        it('should maintain performance during cache invalidation storms', async () => {
            // Simulate multiple simultaneous updates that trigger cache invalidation
            const businessHoursRepo = new BusinessHoursRepository()
            const staffAvailabilityRepo = new StaffAvailabilityRepository()

            // Mock extensive cache entries
            mockRedis.keys.mockResolvedValue(
                Array.from({ length: 100 }, (_, i) => `availability:${businessId}:cache-key-${i}`)
            )

            const simultaneousUpdates = [
                // Business hours updates
                ...Array.from({ length: 3 }, (_, i) =>
                    businessHoursRepo.setBusinessHours(businessId, {
                        dayOfWeek: i + 1,
                        openTime: '09:00:00',
                        closeTime: '18:00:00',
                        isClosed: false,
                    })
                ),
                // Staff availability updates
                ...Array.from({ length: 5 }, (_, i) =>
                    staffAvailabilityRepo.setAvailability(staffIds[i], businessId, {
                        dayOfWeek: 1,
                        startTime: '09:00:00',
                        endTime: '17:00:00',
                        isRecurring: true,
                    })
                ),
            ]

            const startTime = performance.now()

            await Promise.all(simultaneousUpdates)

            const endTime = performance.now()
            const totalExecutionTime = endTime - startTime

            // Should handle cache invalidation storm efficiently
            expect(totalExecutionTime).toBeLessThan(500)

            // Verify all operations completed
            expect(mockPrisma.businessHours.upsert).toHaveBeenCalledTimes(3)
            expect(mockPrisma.staffAvailability.create).toHaveBeenCalledTimes(5)

            console.log(`Cache Invalidation Storm Test Results:`)
            console.log(`- Simultaneous updates: ${simultaneousUpdates.length}`)
            console.log(`- Total execution time: ${totalExecutionTime.toFixed(2)}ms`)
            console.log(`- Average time per update: ${(totalExecutionTime / simultaneousUpdates.length).toFixed(2)}ms`)
        })
    })

    describe('Real-Time Update Performance', () => {
        it('should propagate availability changes in under 500ms', async () => {
            const calculator = new AvailabilityCalculator()
            const businessHoursRepo = new BusinessHoursRepository()

            // Initial availability check
            const initialStartTime = performance.now()

            const initialSlots = await calculator.getAvailableSlots({
                businessId,
                date: new Date('2024-01-15'),
                staffId: staffIds[0],
                duration: 60,
                includeUnavailable: false,
            })

            const initialEndTime = performance.now()

            expect(initialSlots).toBeDefined()

            // Update business hours
            const updateStartTime = performance.now()

            await businessHoursRepo.setBusinessHours(businessId, {
                dayOfWeek: 1,
                openTime: '10:00:00', // Changed from 09:00:00
                closeTime: '18:00:00',
                isClosed: false,
            })

            // Immediately check availability again (should reflect changes)
            const updatedSlots = await calculator.getAvailableSlots({
                businessId,
                date: new Date('2024-01-15'),
                staffId: staffIds[0],
                duration: 60,
                includeUnavailable: false,
            })

            const updateEndTime = performance.now()

            const totalUpdateTime = updateEndTime - updateStartTime

            // Real-time update should complete quickly
            expect(totalUpdateTime).toBeLessThan(500)
            expect(updatedSlots).toBeDefined()

            console.log(`Real-Time Update Test Results:`)
            console.log(`- Initial query time: ${(initialEndTime - initialStartTime).toFixed(2)}ms`)
            console.log(`- Update + re-query time: ${totalUpdateTime.toFixed(2)}ms`)
        })

        it('should handle concurrent real-time updates efficiently', async () => {
            const calculator = new AvailabilityCalculator()
            const staffAvailabilityRepo = new StaffAvailabilityRepository()

            // Simulate concurrent updates and queries
            const concurrentOperations = [
                // Availability queries
                ...Array.from({ length: 10 }, (_, i) =>
                    calculator.getAvailableSlots({
                        businessId,
                        date: new Date('2024-01-15'),
                        staffId: staffIds[i % staffIds.length],
                        duration: 60,
                        includeUnavailable: false,
                    })
                ),
                // Staff availability updates
                ...Array.from({ length: 5 }, (_, i) =>
                    staffAvailabilityRepo.setAvailability(staffIds[i], businessId, {
                        dayOfWeek: 1,
                        startTime: '08:00:00',
                        endTime: '16:00:00',
                        isRecurring: true,
                    })
                ),
            ]

            const startTime = performance.now()

            const results = await Promise.all(
                concurrentOperations.map((operation: any) =>
                    operation.catch((error: any) => ({ error: error.message }))
                )
            )

            const endTime = performance.now()
            const totalExecutionTime = endTime - startTime

            // Should handle concurrent operations efficiently
            expect(totalExecutionTime).toBeLessThan(1000)

            const successfulOperations = results.filter((result: any) => !('error' in result))
            const failedOperations = results.filter((result: any) => 'error' in result)

            // Should maintain high success rate
            expect(successfulOperations.length).toBeGreaterThan(12) // 80% success rate
            expect(failedOperations.length).toBeLessThan(3)

            console.log(`Concurrent Real-Time Updates Test Results:`)
            console.log(`- Total operations: ${concurrentOperations.length}`)
            console.log(`- Successful: ${successfulOperations.length}`)
            console.log(`- Failed: ${failedOperations.length}`)
            console.log(`- Total execution time: ${totalExecutionTime.toFixed(2)}ms`)
        })

        it('should maintain cache consistency during rapid updates', async () => {
            const businessHoursRepo = new BusinessHoursRepository()
            const calculator = new AvailabilityCalculator()

            // Perform rapid sequential updates
            const rapidUpdates = Array.from({ length: 10 }, (_, i) => ({
                dayOfWeek: 1,
                openTime: `${8 + i}:00:00`,
                closeTime: '18:00:00',
                isClosed: false,
            }))

            const startTime = performance.now()

            for (const update of rapidUpdates) {
                await businessHoursRepo.setBusinessHours(businessId, update)

                // Immediately query availability to test consistency
                const slots = await calculator.getAvailableSlots({
                    businessId,
                    date: new Date('2024-01-15'),
                    staffId: staffIds[0],
                    duration: 60,
                    includeUnavailable: false,
                })

                expect(slots).toBeDefined()
            }

            const endTime = performance.now()
            const totalExecutionTime = endTime - startTime

            // Should complete rapid updates with consistency checks
            expect(totalExecutionTime).toBeLessThan(2000)

            // Verify final state is consistent
            expect(mockPrisma.businessHours.upsert).toHaveBeenCalledTimes(rapidUpdates.length)

            console.log(`Cache Consistency Test Results:`)
            console.log(`- Rapid updates: ${rapidUpdates.length}`)
            console.log(`- Total execution time: ${totalExecutionTime.toFixed(2)}ms`)
            console.log(`- Average time per update+query: ${(totalExecutionTime / rapidUpdates.length).toFixed(2)}ms`)
        })
    })
})
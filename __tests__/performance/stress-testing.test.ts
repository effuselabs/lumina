import { prisma } from '@/lib/prisma'
import { BusinessHoursRepository } from '@/lib/repositories/business-hours-repository'
import { StaffAvailabilityRepository } from '@/lib/repositories/staff-availability-repository'
import { AvailabilityCalculator } from '@/lib/services/availability-calculator'
import { ConflictDetectionEngine } from '@/lib/services/conflict-detection-engine'
import { performance } from 'perf_hooks'
import { asMock } from '@/__tests__/utils/prisma-mock-helpers'

// Mock Prisma for stress testing
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

// Mock Redis for cache stress testing
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

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('Availability System Stress Testing', () => {
    const businessId = 'business-123'
    const staffIds = Array.from({ length: 50 }, (_, i) => `staff-${i + 1}`)
    const serviceIds = Array.from({ length: 100 }, (_, i) => `service-${i + 1}`)

    beforeEach(() => {
        jest.clearAllMocks()
        setupStressTestMocks()
    })

    function setupStressTestMocks() {
        // Mock business data
        asMock(mockPrisma.business.findUnique).mockResolvedValue({
            id: businessId,
            name: 'Stress Test Business',
            timezone: 'America/New_York',
            createdAt: new Date(),
            updatedAt: new Date(),
        } as any)

        // Mock large staff dataset
        asMock(mockPrisma.staff.findMany).mockResolvedValue(
            staffIds.map(id => ({
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

        // Mock large service dataset
        asMock(mockPrisma.service.findMany).mockResolvedValue(
            serviceIds.map((id, index) => ({
                id,
                businessId,
                name: `Service ${id}`,
                duration: 15 + (index % 8) * 15, // 15, 30, 45, 60, 75, 90, 105, 120 minute services
                price: 25 + index * 5,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            })) as any
        )

        // Mock business hours
        asMock(mockPrisma.businessHours.findMany).mockResolvedValue(
            Array.from({ length: 7 }, (_, i) => ({
                id: `hours-${i}`,
                businessId,
                dayOfWeek: i,
                openTime: i === 0 ? null : '06:00:00', // Closed Sunday, long hours other days
                closeTime: i === 0 ? null : '22:00:00',
                isClosed: i === 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            })) as any
        )

        // Mock extensive staff availability
        asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue(
            staffIds.flatMap(staffId =>
                Array.from({ length: 6 }, (_, i) => ({
                    id: `availability-${staffId}-${i}`,
                    staffId,
                    businessId,
                    dayOfWeek: i + 1,
                    startTime: '06:00:00',
                    endTime: '22:00:00',
                    isRecurring: true,
                    effectiveDate: null,
                    expiryDate: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }))
            ) as any
        )

        // Mock large number of existing appointments for realistic stress testing
        const existingAppointments = Array.from({ length: 1000 }, (_, i) => ({
            id: `appointment-${i + 1}`,
            businessId,
            staffId: staffIds[i % staffIds.length],
            startTime: new Date(`2024-01-15T${6 + (i % 16)}:${(i % 4) * 15}:00Z`),
            endTime: new Date(`2024-01-15T${6 + (i % 16) + 1}:${(i % 4) * 15}:00Z`),
            status: 'CONFIRMED',
            createdAt: new Date(),
            updatedAt: new Date(),
        }))

        asMock(mockPrisma.appointment.findMany).mockResolvedValue(existingAppointments as any)

        // Mock time-off requests
        asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue([])

        // Mock cache operations
        mockRedis.get.mockResolvedValue(null)
        mockRedis.set.mockResolvedValue('OK')
        mockRedis.del.mockResolvedValue(1)
        mockRedis.keys.mockResolvedValue([])
        mockRedis.exists.mockResolvedValue(0)
    }

    describe('Extreme Load Stress Tests', () => {
        it('should handle 500 concurrent availability requests without degradation', async () => {
            const calculator = new AvailabilityCalculator()
            const extremeLoad = 500

            const requests = Array.from({ length: extremeLoad }, (_, i) => ({
                businessId,
                date: new Date('2024-01-15'),
                staffId: i < 250 ? staffIds[i % staffIds.length] : undefined,
                serviceId: i >= 250 ? serviceIds[i % serviceIds.length] : undefined,
                duration: 30 + (i % 4) * 30,
                includeUnavailable: false,
            }))

            const startTime = performance.now()

            const results = await Promise.all(
                requests.map(request =>
                    calculator.getAvailableSlots(request).catch((error: any) => ({
                        error: error.message,
                        request,
                    }))
                )
            )

            const endTime = performance.now()
            const totalExecutionTime = endTime - startTime

            // Should handle extreme load in reasonable time (under 10 seconds)
            expect(totalExecutionTime).toBeLessThan(10000)

            const successfulRequests = results.filter((result: any) => !('error' in result))
            const failedRequests = results.filter((result: any) => 'error' in result)

            // Should maintain >85% success rate even under extreme load
            expect(successfulRequests.length).toBeGreaterThan(425)
            expect(failedRequests.length).toBeLessThan(75)

            // Calculate performance metrics
            const averageResponseTime = totalExecutionTime / extremeLoad
            const throughput = extremeLoad / (totalExecutionTime / 1000)

            console.log(`Extreme Load Stress Test Results:`)
            console.log(`- Total requests: ${extremeLoad}`)
            console.log(`- Successful: ${successfulRequests.length}`)
            console.log(`- Failed: ${failedRequests.length}`)
            console.log(`- Success rate: ${((successfulRequests.length / extremeLoad) * 100).toFixed(1)}%`)
            console.log(`- Total time: ${totalExecutionTime.toFixed(2)}ms`)
            console.log(`- Average response time: ${averageResponseTime.toFixed(2)}ms`)
            console.log(`- Throughput: ${throughput.toFixed(1)} requests/second`)
        })

        it('should handle 1000 concurrent conflict detection requests', async () => {
            const conflictEngine = new ConflictDetectionEngine()
            const extremeConflictLoad = 1000

            const requests = Array.from({ length: extremeConflictLoad }, (_, i) => ({
                businessId,
                staffId: staffIds[i % staffIds.length],
                startTime: new Date(`2024-01-15T${6 + (i % 16)}:${(i % 4) * 15}:00Z`),
                endTime: new Date(`2024-01-15T${6 + (i % 16) + 1}:${(i % 4) * 15}:00Z`),
                serviceIds: [serviceIds[i % serviceIds.length]],
            }))

            const startTime = performance.now()

            const results = await Promise.all(
                requests.map(request =>
                    conflictEngine.detectConflicts(request).catch((error: any) => ({
                        error: error.message,
                        request,
                    }))
                )
            )

            const endTime = performance.now()
            const totalExecutionTime = endTime - startTime

            // Should handle extreme conflict detection load
            expect(totalExecutionTime).toBeLessThan(8000)

            const successfulRequests = results.filter((result: any) => !('error' in result))
            const failedRequests = results.filter((result: any) => 'error' in result)

            expect(successfulRequests.length).toBeGreaterThan(850) // 85% success rate
            expect(failedRequests.length).toBeLessThan(150)

            console.log(`Extreme Conflict Detection Stress Test Results:`)
            console.log(`- Total requests: ${extremeConflictLoad}`)
            console.log(`- Successful: ${successfulRequests.length}`)
            console.log(`- Failed: ${failedRequests.length}`)
            console.log(`- Success rate: ${((successfulRequests.length / extremeConflictLoad) * 100).toFixed(1)}%`)
            console.log(`- Total time: ${totalExecutionTime.toFixed(2)}ms`)
            console.log(`- Average response time: ${(totalExecutionTime / extremeConflictLoad).toFixed(2)}ms`)
        })

        it('should survive memory pressure under extreme load', async () => {
            const calculator = new AvailabilityCalculator()
            const memoryStressRounds = 20
            const requestsPerRound = 100

            const initialMemory = process.memoryUsage()
            let maxMemoryUsage = initialMemory.heapUsed

            for (let round = 0; round < memoryStressRounds; round++) {
                const requests = Array.from({ length: requestsPerRound }, (_, i) => ({
                    businessId,
                    date: new Date('2024-01-15'),
                    staffId: staffIds[(round * requestsPerRound + i) % staffIds.length],
                    duration: 60,
                    includeUnavailable: false,
                }))

                await Promise.all(
                    requests.map(request =>
                        calculator.getAvailableSlots(request).catch(() => null)
                    )
                )

                const currentMemory = process.memoryUsage()
                maxMemoryUsage = Math.max(maxMemoryUsage, currentMemory.heapUsed)

                // Force garbage collection if available
                if (global.gc) {
                    global.gc()
                }
            }

            const finalMemory = process.memoryUsage()
            const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
            const maxMemoryIncrease = maxMemoryUsage - initialMemory.heapUsed

            // Memory increase should be reasonable even under extreme load
            expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024) // Less than 100MB final increase
            expect(maxMemoryIncrease).toBeLessThan(200 * 1024 * 1024) // Less than 200MB peak increase

            console.log(`Memory Pressure Stress Test Results:`)
            console.log(`- Rounds: ${memoryStressRounds}`)
            console.log(`- Requests per round: ${requestsPerRound}`)
            console.log(`- Total requests: ${memoryStressRounds * requestsPerRound}`)
            console.log(`- Initial memory: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`)
            console.log(`- Final memory: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`)
            console.log(`- Max memory: ${(maxMemoryUsage / 1024 / 1024).toFixed(2)}MB`)
            console.log(`- Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`)
        })
    })

    describe('Cache Invalidation Stress Tests', () => {
        it('should handle cache invalidation storms without performance degradation', async () => {
            const businessHoursRepo = new BusinessHoursRepository()
            const staffAvailabilityRepo = new StaffAvailabilityRepository()
            const calculator = new AvailabilityCalculator()

            // Mock extensive cache entries
            const cacheKeys = Array.from({ length: 1000 }, (_, i) => `availability:${businessId}:cache-key-${i}`)
            mockRedis.keys.mockResolvedValue(cacheKeys)

            // Create invalidation storm
            const invalidationOperations = [
                // Business hours updates (affects all cache)
                ...Array.from({ length: 10 }, (_, i) =>
                    businessHoursRepo.setBusinessHours(businessId, {
                        dayOfWeek: (i % 6) + 1,
                        openTime: '08:00:00',
                        closeTime: '20:00:00',
                        isClosed: false,
                    })
                ),
                // Staff availability updates (affects staff-specific cache)
                ...Array.from({ length: 20 }, (_, i) =>
                    staffAvailabilityRepo.setAvailability(
                        staffIds[i % staffIds.length],
                        businessId,
                        {
                            dayOfWeek: 1,
                            startTime: '09:00:00',
                            endTime: '17:00:00',
                            isRecurring: true,
                        }
                    )
                ),
                // Concurrent availability queries during invalidation
                ...Array.from({ length: 50 }, (_, i) =>
                    calculator.getAvailableSlots({
                        businessId,
                        date: new Date('2024-01-15'),
                        staffId: staffIds[i % staffIds.length],
                        duration: 60,
                        includeUnavailable: false,
                    })
                ),
            ]

            const startTime = performance.now()

            const results = await Promise.all(
                invalidationOperations.map(operation =>
                    operation.catch((error: any) => ({ error: error.message }))
                )
            )

            const endTime = performance.now()
            const totalExecutionTime = endTime - startTime

            // Should handle invalidation storm efficiently
            expect(totalExecutionTime).toBeLessThan(3000)

            const successfulOperations = results.filter((result: any) => !('error' in result))
            const failedOperations = results.filter((result: any) => 'error' in result)

            // Should maintain high success rate during invalidation storm
            expect(successfulOperations.length).toBeGreaterThan(72) // 90% success rate
            expect(failedOperations.length).toBeLessThan(8)

            console.log(`Cache Invalidation Storm Stress Test Results:`)
            console.log(`- Total operations: ${invalidationOperations.length}`)
            console.log(`- Successful: ${successfulOperations.length}`)
            console.log(`- Failed: ${failedOperations.length}`)
            console.log(`- Cache keys to invalidate: ${cacheKeys.length}`)
            console.log(`- Total execution time: ${totalExecutionTime.toFixed(2)}ms`)
        })

        it('should maintain performance during rapid cache churn', async () => {
            const calculator = new AvailabilityCalculator()
            const businessHoursRepo = new BusinessHoursRepository()

            // Simulate rapid cache churn (frequent updates and queries)
            const churnCycles = 50
            const queriesPerCycle = 10

            let totalQueries = 0
            let totalUpdates = 0
            const performanceMetrics: number[] = []

            for (let cycle = 0; cycle < churnCycles; cycle++) {
                const cycleStartTime = performance.now()

                // Update business hours (invalidates cache)
                await businessHoursRepo.setBusinessHours(businessId, {
                    dayOfWeek: 1,
                    openTime: `${8 + (cycle % 4)}:00:00`,
                    closeTime: '18:00:00',
                    isClosed: false,
                })
                totalUpdates++

                // Immediately query availability multiple times
                const queries = Array.from({ length: queriesPerCycle }, (_, i) => ({
                    businessId,
                    date: new Date('2024-01-15'),
                    staffId: staffIds[(cycle * queriesPerCycle + i) % staffIds.length],
                    duration: 60,
                    includeUnavailable: false,
                }))

                await Promise.all(
                    queries.map(query =>
                        calculator.getAvailableSlots(query).catch(() => null)
                    )
                )
                totalQueries += queriesPerCycle

                const cycleEndTime = performance.now()
                const cycleTime = cycleEndTime - cycleStartTime
                performanceMetrics.push(cycleTime)
            }

            // Analyze performance degradation over time
            const firstHalfAvg = performanceMetrics.slice(0, churnCycles / 2)
                .reduce((sum, time) => sum + time, 0) / (churnCycles / 2)

            const secondHalfAvg = performanceMetrics.slice(churnCycles / 2)
                .reduce((sum, time) => sum + time, 0) / (churnCycles / 2)

            const performanceDegradation = (secondHalfAvg - firstHalfAvg) / firstHalfAvg

            // Performance should not degrade significantly over time
            expect(performanceDegradation).toBeLessThan(0.3) // Less than 30% degradation

            console.log(`Cache Churn Stress Test Results:`)
            console.log(`- Churn cycles: ${churnCycles}`)
            console.log(`- Total queries: ${totalQueries}`)
            console.log(`- Total updates: ${totalUpdates}`)
            console.log(`- First half avg cycle time: ${firstHalfAvg.toFixed(2)}ms`)
            console.log(`- Second half avg cycle time: ${secondHalfAvg.toFixed(2)}ms`)
            console.log(`- Performance degradation: ${(performanceDegradation * 100).toFixed(1)}%`)
        })
    })

    describe('Database Connection Stress Tests', () => {
        it('should handle database connection pool exhaustion gracefully', async () => {
            const calculator = new AvailabilityCalculator()
            const conflictEngine = new ConflictDetectionEngine()

            // Simulate connection pool exhaustion with many concurrent operations
            const connectionStressOperations = Array.from({ length: 200 }, (_, i) => {
                const operationType = i % 3

                switch (operationType) {
                    case 0:
                        return calculator.getAvailableSlots({
                            businessId,
                            date: new Date('2024-01-15'),
                            staffId: staffIds[i % staffIds.length],
                            duration: 60,
                            includeUnavailable: false,
                        })
                    case 1:
                        return conflictEngine.detectConflicts({
                            businessId,
                            staffId: staffIds[i % staffIds.length],
                            startTime: new Date(`2024-01-15T${8 + (i % 12)}:00:00Z`),
                            endTime: new Date(`2024-01-15T${9 + (i % 12)}:00:00Z`),
                            serviceIds: [serviceIds[i % serviceIds.length]],
                        })
                    case 2:
                        return conflictEngine.validateAppointmentSlot(
                            staffIds[i % staffIds.length],
                            new Date(`2024-01-15T${10 + (i % 10)}:00:00Z`),
                            60,
                            businessId,
                            [serviceIds[i % serviceIds.length]]
                        )
                    default:
                        throw new Error('Invalid operation type')
                }
            })

            const startTime = performance.now()

            const results = await Promise.all(
                connectionStressOperations.map(operation =>
                    operation.catch((error: any) => ({ error: error.message }))
                )
            )

            const endTime = performance.now()
            const totalExecutionTime = endTime - startTime

            // Should handle connection stress without complete failure
            expect(totalExecutionTime).toBeLessThan(15000) // Allow more time for connection management

            const successfulOperations = results.filter((result: any) => !('error' in result))
            const failedOperations = results.filter((result: any) => 'error' in result)

            // Should maintain reasonable success rate even under connection stress
            expect(successfulOperations.length).toBeGreaterThan(160) // 80% success rate
            expect(failedOperations.length).toBeLessThan(40)

            console.log(`Database Connection Stress Test Results:`)
            console.log(`- Total operations: ${connectionStressOperations.length}`)
            console.log(`- Successful: ${successfulOperations.length}`)
            console.log(`- Failed: ${failedOperations.length}`)
            console.log(`- Success rate: ${((successfulOperations.length / connectionStressOperations.length) * 100).toFixed(1)}%`)
            console.log(`- Total execution time: ${totalExecutionTime.toFixed(2)}ms`)
        })

        it('should recover from database timeout scenarios', async () => {
            const calculator = new AvailabilityCalculator()

            // Simulate database timeouts by making some queries fail initially
            let queryCount = 0
            const originalFindMany = mockPrisma.businessHours.findMany

            asMock(mockPrisma.businessHours.findMany).mockImplementation(async (...args) => {
                queryCount++

                // Simulate timeouts for first 20% of queries
                if (queryCount <= 20) {
                    throw new Error('Database timeout')
                }

                return originalFindMany.apply(mockPrisma.businessHours, args)
            })

            const recoveryTestRequests = Array.from({ length: 100 }, (_, i) => ({
                businessId,
                date: new Date('2024-01-15'),
                staffId: staffIds[i % staffIds.length],
                duration: 60,
                includeUnavailable: false,
            }))

            const startTime = performance.now()

            const results = await Promise.all(
                recoveryTestRequests.map(request =>
                    calculator.getAvailableSlots(request).catch((error: any) => ({
                        error: error.message,
                    }))
                )
            )

            const endTime = performance.now()
            const totalExecutionTime = endTime - startTime

            const successfulRequests = results.filter((result: any) => !('error' in result))
            const failedRequests = results.filter((result: any) => 'error' in result)

            // Should recover and process most requests successfully
            expect(successfulRequests.length).toBeGreaterThan(75) // 75% success rate after recovery
            expect(failedRequests.length).toBeLessThan(25)

            // Should complete in reasonable time despite initial failures
            expect(totalExecutionTime).toBeLessThan(5000)

            console.log(`Database Recovery Stress Test Results:`)
            console.log(`- Total requests: ${recoveryTestRequests.length}`)
            console.log(`- Successful: ${successfulRequests.length}`)
            console.log(`- Failed: ${failedRequests.length}`)
            console.log(`- Recovery rate: ${((successfulRequests.length / recoveryTestRequests.length) * 100).toFixed(1)}%`)
            console.log(`- Total execution time: ${totalExecutionTime.toFixed(2)}ms`)
        })
    })
})
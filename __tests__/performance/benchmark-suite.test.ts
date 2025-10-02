import { prisma } from '@/lib/prisma'
import { AvailabilityCalculator } from '@/lib/services/availability-calculator'
import { ConflictDetectionEngine } from '@/lib/services/conflict-detection-engine'
import { PerformanceTestRunner, PerformanceTestUtils } from './performance-test-runner'
import { asMock } from '@/__tests__/utils/prisma-mock-helpers'

// Mock Prisma for benchmarking
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
        },
        staffAvailability: {
            findMany: jest.fn(),
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
        },
    },
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('Calendar Infrastructure Performance Benchmark Suite', () => {
    const businessId = 'benchmark-business'
    const staffIds = Array.from({ length: 25 }, (_, i) => `staff-${i + 1}`)
    const serviceIds = Array.from({ length: 50 }, (_, i) => `service-${i + 1}`)

    let testRunner: PerformanceTestRunner

    beforeEach(() => {
        jest.clearAllMocks()
        testRunner = new PerformanceTestRunner()
        setupBenchmarkMocks()
    })

    function setupBenchmarkMocks() {
        // Mock business data
        asMock(mockPrisma.business.findUnique).mockResolvedValue({
            id: businessId,
            name: 'Benchmark Business',
            timezone: 'America/New_York',
            createdAt: new Date(),
            updatedAt: new Date(),
        } as any)

        // Mock staff data
        asMock(mockPrisma.staff.findMany).mockResolvedValue(
            staffIds.map(id => ({
                id,
                businessId,
                name: `Staff ${id}`,
                email: `${id}@benchmark.com`,
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
                duration: 30 + (index % 6) * 15,
                price: 50 + index * 5,
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
                openTime: '08:00:00',
                closeTime: '20:00:00',
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
                    startTime: '08:00:00',
                    endTime: '20:00:00',
                    isRecurring: true,
                    effectiveDate: null,
                    expiryDate: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }))
            ) as any
        )

        // Mock appointments and time-off
        asMock(mockPrisma.appointment.findMany).mockResolvedValue([])
        asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue([])
        asMock(mockPrisma.availabilityCache.findFirst).mockResolvedValue(null)
    }

    describe('Availability Query Performance Benchmarks', () => {
        it('should meet sub-200ms performance requirements for availability queries', async () => {
            const calculator = new AvailabilityCalculator()

            const operations = Array.from({ length: 100 }, (_, i) => () =>
                calculator.getAvailableSlots({
                    businessId,
                    date: new Date('2024-01-15'),
                    staffId: staffIds[i % staffIds.length],
                    duration: 60,
                    includeUnavailable: false,
                })
            )

            const metrics = await testRunner.runBatch(operations, {
                name: 'Availability Query Benchmark',
                warmupRuns: 10,
                trackMemory: true,
            })

            // Validate performance requirements
            PerformanceTestUtils.validateAvailabilityPerformance(metrics)
            PerformanceTestUtils.validateMemoryUsage(metrics, 25)

            // Additional specific assertions
            expect(metrics.p95Time).toBeLessThan(200)
            expect(metrics.averageTime).toBeLessThan(100)
            expect(metrics.successRate).toBeGreaterThan(0.95)
        })

        it('should handle concurrent availability queries efficiently', async () => {
            const calculator = new AvailabilityCalculator()

            const metrics = await testRunner.runConcurrent(
                async (index) => {
                    return calculator.getAvailableSlots({
                        businessId,
                        date: new Date('2024-01-15'),
                        staffId: staffIds[index % staffIds.length],
                        serviceId: index % 2 === 0 ? serviceIds[index % serviceIds.length] : undefined,
                        duration: 60,
                        includeUnavailable: false,
                    })
                },
                {
                    totalOperations: 200,
                    concurrency: 20,
                    name: 'Concurrent Availability Benchmark',
                }
            )

            // Should handle concurrent load efficiently
            expect(metrics.totalTime).toBeLessThan(5000)
            expect(metrics.successRate).toBeGreaterThan(0.90)
            expect(metrics.throughput).toBeGreaterThan(30) // At least 30 ops/sec
        })

        it('should maintain performance with service filtering', async () => {
            const calculator = new AvailabilityCalculator()

            const operations = Array.from({ length: 50 }, (_, i) => () =>
                calculator.getAvailableSlots({
                    businessId,
                    date: new Date('2024-01-15'),
                    serviceId: serviceIds[i % serviceIds.length],
                    duration: 30 + (i % 4) * 30,
                    includeUnavailable: false,
                })
            )

            const metrics = await testRunner.runBatch(operations, {
                name: 'Service Filtering Benchmark',
                warmupRuns: 5,
            })

            expect(metrics.p95Time).toBeLessThan(250) // Slightly higher due to service filtering
            expect(metrics.averageTime).toBeLessThan(150)
            expect(metrics.successRate).toBeGreaterThan(0.95)
        })
    })

    describe('Conflict Detection Performance Benchmarks', () => {
        it('should meet sub-100ms performance requirements for conflict detection', async () => {
            const conflictEngine = new ConflictDetectionEngine()

            const operations = Array.from({ length: 100 }, (_, i) => () =>
                conflictEngine.detectConflicts({
                    businessId,
                    staffId: staffIds[i % staffIds.length],
                    startTime: new Date(`2024-01-15T${8 + (i % 12)}:${(i % 4) * 15}:00Z`),
                    endTime: new Date(`2024-01-15T${9 + (i % 12)}:${(i % 4) * 15}:00Z`),
                    serviceIds: [serviceIds[i % serviceIds.length]],
                })
            )

            const metrics = await testRunner.runBatch(operations, {
                name: 'Conflict Detection Benchmark',
                warmupRuns: 10,
            })

            PerformanceTestUtils.validateConflictDetectionPerformance(metrics)

            expect(metrics.p95Time).toBeLessThan(100)
            expect(metrics.averageTime).toBeLessThan(50)
            expect(metrics.successRate).toBeGreaterThan(0.95)
        })

        it('should handle appointment slot validation efficiently', async () => {
            const conflictEngine = new ConflictDetectionEngine()

            const operations = Array.from({ length: 75 }, (_, i) => () =>
                conflictEngine.validateAppointmentSlot(
                    staffIds[i % staffIds.length],
                    new Date(`2024-01-15T${9 + (i % 10)}:${(i % 4) * 15}:00Z`),
                    60,
                    businessId,
                    [serviceIds[i % serviceIds.length]]
                )
            )

            const metrics = await testRunner.runBatch(operations, {
                name: 'Appointment Validation Benchmark',
                warmupRuns: 5,
            })

            expect(metrics.p95Time).toBeLessThan(100)
            expect(metrics.averageTime).toBeLessThan(60)
            expect(metrics.successRate).toBeGreaterThan(0.95)
        })

        it('should handle batch conflict detection efficiently', async () => {
            const conflictEngine = new ConflictDetectionEngine()

            const metrics = await testRunner.runConcurrent(
                async (index) => {
                    return conflictEngine.detectConflicts({
                        businessId,
                        staffId: staffIds[index % staffIds.length],
                        startTime: new Date(`2024-01-15T${8 + (index % 12)}:00:00Z`),
                        endTime: new Date(`2024-01-15T${9 + (index % 12)}:00:00Z`),
                        serviceIds: [serviceIds[index % serviceIds.length]],
                    })
                },
                {
                    totalOperations: 150,
                    concurrency: 15,
                    name: 'Batch Conflict Detection Benchmark',
                }
            )

            expect(metrics.totalTime).toBeLessThan(3000)
            expect(metrics.successRate).toBeGreaterThan(0.90)
            expect(metrics.throughput).toBeGreaterThan(40) // At least 40 ops/sec
        })
    })

    describe('Mixed Operation Performance Benchmarks', () => {
        it('should handle mixed availability and conflict operations efficiently', async () => {
            const calculator = new AvailabilityCalculator()
            const conflictEngine = new ConflictDetectionEngine()

            const operations = Array.from({ length: 100 }, (_, i) => {
                if (i % 3 === 0) {
                    // Availability query
                    return () => calculator.getAvailableSlots({
                        businessId,
                        date: new Date('2024-01-15'),
                        staffId: staffIds[i % staffIds.length],
                        duration: 60,
                        includeUnavailable: false,
                    })
                } else if (i % 3 === 1) {
                    // Conflict detection
                    return () => conflictEngine.detectConflicts({
                        businessId,
                        staffId: staffIds[i % staffIds.length],
                        startTime: new Date(`2024-01-15T${10 + (i % 8)}:00:00Z`),
                        endTime: new Date(`2024-01-15T${11 + (i % 8)}:00:00Z`),
                        serviceIds: [serviceIds[i % serviceIds.length]],
                    })
                } else {
                    // Appointment validation
                    return () => conflictEngine.validateAppointmentSlot(
                        staffIds[i % staffIds.length],
                        new Date(`2024-01-15T${12 + (i % 6)}:00:00Z`),
                        60,
                        businessId,
                        [serviceIds[i % serviceIds.length]]
                    )
                }
            })

            const metrics = await testRunner.runBatch(operations, {
                name: 'Mixed Operations Benchmark',
                warmupRuns: 10,
            })

            // Mixed operations should still perform well
            expect(metrics.p95Time).toBeLessThan(200)
            expect(metrics.averageTime).toBeLessThan(100)
            expect(metrics.successRate).toBeGreaterThan(0.90)
            expect(metrics.throughput).toBeGreaterThan(10)
        })

        it('should maintain performance under sustained mixed load', async () => {
            const calculator = new AvailabilityCalculator()
            const conflictEngine = new ConflictDetectionEngine()

            let operationCounter = 0
            const createMixedOperation = () => {
                const opType = operationCounter % 3
                operationCounter++

                switch (opType) {
                    case 0:
                        return calculator.getAvailableSlots({
                            businessId,
                            date: new Date('2024-01-15'),
                            staffId: staffIds[operationCounter % staffIds.length],
                            duration: 60,
                            includeUnavailable: false,
                        })
                    case 1:
                        return conflictEngine.detectConflicts({
                            businessId,
                            staffId: staffIds[operationCounter % staffIds.length],
                            startTime: new Date(`2024-01-15T${10 + (operationCounter % 8)}:00:00Z`),
                            endTime: new Date(`2024-01-15T${11 + (operationCounter % 8)}:00:00Z`),
                            serviceIds: [serviceIds[operationCounter % serviceIds.length]],
                        })
                    case 2:
                        return conflictEngine.validateAppointmentSlot(
                            staffIds[operationCounter % staffIds.length],
                            new Date(`2024-01-15T${12 + (operationCounter % 6)}:00:00Z`),
                            60,
                            businessId,
                            [serviceIds[operationCounter % serviceIds.length]]
                        )
                    default:
                        throw new Error('Invalid operation type')
                }
            }

            const metrics = await testRunner.runSustainedLoad(
                createMixedOperation,
                {
                    durationMs: 5000, // 5 seconds
                    requestsPerSecond: 20, // 20 requests per second
                    name: 'Sustained Mixed Load Benchmark',
                }
            )

            // Should maintain performance over time
            expect(metrics.averageTime).toBeLessThan(150)
            expect(metrics.p95Time).toBeLessThan(300)
            expect(metrics.successRate).toBeGreaterThan(0.85)
            expect(metrics.throughput).toBeGreaterThan(15)
        })
    })

    describe('Scalability Benchmarks', () => {
        it('should scale linearly with increased staff count', async () => {
            const calculator = new AvailabilityCalculator()

            // Test with different staff counts
            const staffCounts = [5, 10, 25]
            const results: { staffCount: number; metrics: any }[] = []

            for (const staffCount of staffCounts) {
                const limitedStaffIds = staffIds.slice(0, staffCount)

                // Update mock to return limited staff
                asMock(mockPrisma.staff.findMany).mockResolvedValue(
                    limitedStaffIds.map(id => ({
                        id,
                        businessId,
                        name: `Staff ${id}`,
                        email: `${id}@benchmark.com`,
                        role: 'STAFF',
                        isActive: true,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    })) as any
                )

                const operations = Array.from({ length: 50 }, (_, i) => () =>
                    calculator.getAvailableSlots({
                        businessId,
                        date: new Date('2024-01-15'),
                        staffId: limitedStaffIds[i % limitedStaffIds.length],
                        duration: 60,
                        includeUnavailable: false,
                    })
                )

                const metrics = await testRunner.runBatch(operations, {
                    name: `Scalability Test - ${staffCount} Staff`,
                    warmupRuns: 5,
                })

                results.push({ staffCount, metrics })
            }

            // Verify scalability characteristics
            results.forEach(({ staffCount, metrics }) => {
                // Performance should remain reasonable regardless of staff count
                expect(metrics.p95Time).toBeLessThan(300)
                expect(metrics.successRate).toBeGreaterThan(0.90)

                console.log(`Staff Count ${staffCount}: Avg ${metrics.averageTime.toFixed(2)}ms, P95 ${metrics.p95Time.toFixed(2)}ms`)
            })

            // Performance should not degrade significantly with more staff
            const smallStaffMetrics = results[0].metrics
            const largeStaffMetrics = results[results.length - 1].metrics
            const performanceDegradation = (largeStaffMetrics.averageTime - smallStaffMetrics.averageTime) / smallStaffMetrics.averageTime

            expect(performanceDegradation).toBeLessThan(0.5) // Less than 50% degradation
        })

        it('should handle increased service complexity efficiently', async () => {
            const calculator = new AvailabilityCalculator()

            // Test with different service durations
            const serviceDurations = [30, 60, 120, 240] // 30 min to 4 hours
            const results: { duration: number; metrics: any }[] = []

            for (const duration of serviceDurations) {
                const operations = Array.from({ length: 30 }, (_, i) => () =>
                    calculator.getAvailableSlots({
                        businessId,
                        date: new Date('2024-01-15'),
                        staffId: staffIds[i % staffIds.length],
                        duration,
                        includeUnavailable: false,
                    })
                )

                const metrics = await testRunner.runBatch(operations, {
                    name: `Service Duration Test - ${duration}min`,
                    warmupRuns: 3,
                })

                results.push({ duration, metrics })
            }

            // Verify performance with different service durations
            results.forEach(({ duration, metrics }) => {
                expect(metrics.p95Time).toBeLessThan(250)
                expect(metrics.successRate).toBeGreaterThan(0.90)

                console.log(`Duration ${duration}min: Avg ${metrics.averageTime.toFixed(2)}ms, P95 ${metrics.p95Time.toFixed(2)}ms`)
            })
        })
    })

    describe('Memory and Resource Benchmarks', () => {
        it('should maintain stable memory usage under load', async () => {
            const calculator = new AvailabilityCalculator()

            const operations = Array.from({ length: 200 }, (_, i) => () =>
                calculator.getAvailableSlots({
                    businessId,
                    date: new Date('2024-01-15'),
                    staffId: staffIds[i % staffIds.length],
                    duration: 60,
                    includeUnavailable: false,
                })
            )

            const metrics = await testRunner.runBatch(operations, {
                name: 'Memory Usage Benchmark',
                trackMemory: true,
            })

            PerformanceTestUtils.validateMemoryUsage(metrics, 30)

            const memoryIncrease = (metrics.memoryUsage.final.heapUsed - metrics.memoryUsage.initial.heapUsed) / 1024 / 1024
            console.log(`Memory increase: ${memoryIncrease.toFixed(2)}MB for ${operations.length} operations`)
        })

        it('should handle garbage collection efficiently', async () => {
            const calculator = new AvailabilityCalculator()

            // Run multiple rounds with forced GC
            const rounds = 5
            const operationsPerRound = 50
            const memorySnapshots: number[] = []

            for (let round = 0; round < rounds; round++) {
                const operations = Array.from({ length: operationsPerRound }, (_, i) => () =>
                    calculator.getAvailableSlots({
                        businessId,
                        date: new Date('2024-01-15'),
                        staffId: staffIds[i % staffIds.length],
                        duration: 60,
                        includeUnavailable: false,
                    })
                )

                await testRunner.runBatch(operations, {
                    name: `GC Test Round ${round + 1}`,
                    trackMemory: false,
                })

                // Force garbage collection
                if (global.gc) {
                    global.gc()
                }

                memorySnapshots.push(process.memoryUsage().heapUsed)
            }

            // Memory should not continuously increase
            const firstSnapshot = memorySnapshots[0]
            const lastSnapshot = memorySnapshots[memorySnapshots.length - 1]
            const memoryGrowth = (lastSnapshot - firstSnapshot) / 1024 / 1024

            expect(memoryGrowth).toBeLessThan(20) // Less than 20MB growth over 5 rounds

            console.log(`Memory growth over ${rounds} rounds: ${memoryGrowth.toFixed(2)}MB`)
        })
    })
})
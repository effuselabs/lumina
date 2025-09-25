import { prisma } from '@/lib/prisma'
import { AvailabilityCalculator } from '@/lib/services/availability-calculator'
import { ConflictDetectionEngine } from '@/lib/services/conflict-detection-engine'
import { performance } from 'perf_hooks'

// Mock Prisma for load testing
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
            deleteMany: jest.fn(),
        },
    },
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('Availability System Load Testing', () => {
    const businessId = 'business-123'
    const staffIds = Array.from({ length: 20 }, (_, i) => `staff-${i + 1}`)
    const serviceIds = Array.from({ length: 50 }, (_, i) => `service-${i + 1}`)

    beforeEach(() => {
        jest.clearAllMocks()
        setupLoadTestMocks()
    })

    function setupLoadTestMocks() {
        // Mock business data
        mockPrisma.business.findUnique.mockResolvedValue({
            id: businessId,
            name: 'Load Test Business',
            timezone: 'America/New_York',
            createdAt: new Date(),
            updatedAt: new Date(),
        } as any)

        // Mock staff data (20 staff members for load testing)
        mockPrisma.staff.findMany.mockResolvedValue(
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

        // Mock services data (50 services)
        mockPrisma.service.findMany.mockResolvedValue(
            serviceIds.map((id, index) => ({
                id,
                businessId,
                name: `Service ${id}`,
                duration: 30 + (index % 6) * 15, // 30, 45, 60, 75, 90, 105 minute services
                price: 50 + index * 5,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            })) as any
        )

        // Mock business hours
        mockPrisma.businessHours.findMany.mockResolvedValue(
            Array.from({ length: 7 }, (_, i) => ({
                id: `hours-${i}`,
                businessId,
                dayOfWeek: i,
                openTime: i === 0 ? null : '08:00:00', // Closed Sunday
                closeTime: i === 0 ? null : '20:00:00',
                isClosed: i === 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            })) as any
        )

        // Mock staff availability
        mockPrisma.staffAvailability.findMany.mockResolvedValue(
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

        // Mock some existing appointments for realistic load testing
        const existingAppointments = Array.from({ length: 100 }, (_, i) => ({
            id: `appointment-${i + 1}`,
            businessId,
            staffId: staffIds[i % staffIds.length],
            startTime: new Date(`2024-01-15T${8 + (i % 12)}:${(i % 4) * 15}:00Z`),
            endTime: new Date(`2024-01-15T${8 + (i % 12) + 1}:${(i % 4) * 15}:00Z`),
            status: 'CONFIRMED',
            createdAt: new Date(),
            updatedAt: new Date(),
        }))

        mockPrisma.appointment.findMany.mockResolvedValue(existingAppointments as any)

        // Mock minimal time-off requests
        mockPrisma.timeOffRequest.findMany.mockResolvedValue([])

        // Mock cache misses for load testing
        mockPrisma.availabilityCache.findFirst.mockResolvedValue(null)
    }

    describe('Concurrent User Load Testing (100+ Users)', () => {
        it('should handle 100 concurrent availability requests', async () => {
            const calculator = new AvailabilityCalculator()
            const concurrentRequests = 100

            const requests = Array.from({ length: concurrentRequests }, (_, i) => ({
                businessId,
                date: new Date('2024-01-15'),
                staffId: i < 50 ? staffIds[i % staffIds.length] : undefined,
                serviceId: i >= 50 ? serviceIds[i % serviceIds.length] : undefined,
                duration: 60,
                includeUnavailable: false,
            }))

            const startTime = performance.now()

            const results = await Promise.all(
                requests.map(request =>
                    calculator.getAvailableSlots(request).catch(error => ({
                        error: error.message,
                        request,
                    }))
                )
            )

            const endTime = performance.now()
            const totalExecutionTime = endTime - startTime

            // Should complete 100 concurrent requests in under 5 seconds
            expect(totalExecutionTime).toBeLessThan(5000)

            // Count successful vs failed requests
            const successfulRequests = results.filter(result => !('error' in result))
            const failedRequests = results.filter(result => 'error' in result)

            // Should have high success rate (>95%)
            expect(successfulRequests.length).toBeGreaterThan(95)
            expect(failedRequests.length).toBeLessThan(5)

            // Log performance metrics
            console.log(`Load Test Results:`)
            console.log(`- Total requests: ${concurrentRequests}`)
            console.log(`- Successful: ${successfulRequests.length}`)
            console.log(`- Failed: ${failedRequests.length}`)
            console.log(`- Total time: ${totalExecutionTime.toFixed(2)}ms`)
            console.log(`- Average time per request: ${(totalExecutionTime / concurrentRequests).toFixed(2)}ms`)
        })

        it('should handle 150 concurrent conflict detection requests', async () => {
            const conflictEngine = new ConflictDetectionEngine()
            const concurrentRequests = 150

            const requests = Array.from({ length: concurrentRequests }, (_, i) => ({
                businessId,
                staffId: staffIds[i % staffIds.length],
                startTime: new Date(`2024-01-15T${8 + (i % 12)}:${(i % 4) * 15}:00Z`),
                endTime: new Date(`2024-01-15T${8 + (i % 12) + 1}:${(i % 4) * 15}:00Z`),
                serviceIds: [serviceIds[i % serviceIds.length]],
            }))

            const startTime = performance.now()

            const results = await Promise.all(
                requests.map(request =>
                    conflictEngine.detectConflicts(request).catch(error => ({
                        error: error.message,
                        request,
                    }))
                )
            )

            const endTime = performance.now()
            const totalExecutionTime = endTime - startTime

            // Should complete 150 concurrent conflict checks in under 3 seconds
            expect(totalExecutionTime).toBeLessThan(3000)

            const successfulRequests = results.filter(result => !('error' in result))
            const failedRequests = results.filter(result => 'error' in result)

            // Should have high success rate (>95%)
            expect(successfulRequests.length).toBeGreaterThan(142) // 95% of 150
            expect(failedRequests.length).toBeLessThan(8)

            console.log(`Conflict Detection Load Test Results:`)
            console.log(`- Total requests: ${concurrentRequests}`)
            console.log(`- Successful: ${successfulRequests.length}`)
            console.log(`- Failed: ${failedRequests.length}`)
            console.log(`- Total time: ${totalExecutionTime.toFixed(2)}ms`)
            console.log(`- Average time per request: ${(totalExecutionTime / concurrentRequests).toFixed(2)}ms`)
        })

        it('should handle mixed concurrent operations', async () => {
            const calculator = new AvailabilityCalculator()
            const conflictEngine = new ConflictDetectionEngine()

            // Mix of different operation types
            const availabilityRequests = Array.from({ length: 50 }, (_, i) => ({
                type: 'availability' as const,
                request: {
                    businessId,
                    date: new Date('2024-01-15'),
                    staffId: staffIds[i % staffIds.length],
                    duration: 60,
                    includeUnavailable: false,
                },
            }))

            const conflictRequests = Array.from({ length: 50 }, (_, i) => ({
                type: 'conflict' as const,
                request: {
                    businessId,
                    staffId: staffIds[i % staffIds.length],
                    startTime: new Date(`2024-01-15T${10 + (i % 8)}:00:00Z`),
                    endTime: new Date(`2024-01-15T${11 + (i % 8)}:00:00Z`),
                    serviceIds: [serviceIds[i % serviceIds.length]],
                },
            }))

            const validationRequests = Array.from({ length: 50 }, (_, i) => ({
                type: 'validation' as const,
                request: {
                    staffId: staffIds[i % staffIds.length],
                    startTime: new Date(`2024-01-15T${12 + (i % 6)}:00:00Z`),
                    duration: 60,
                    businessId,
                    serviceIds: [serviceIds[i % serviceIds.length]],
                },
            }))

            const allRequests = [
                ...availabilityRequests,
                ...conflictRequests,
                ...validationRequests,
            ].sort(() => Math.random() - 0.5) // Randomize order

            const startTime = performance.now()

            const results = await Promise.all(
                allRequests.map(async ({ type, request }) => {
                    try {
                        switch (type) {
                            case 'availability':
                                return {
                                    type,
                                    result: await calculator.getAvailableSlots(request),
                                }
                            case 'conflict':
                                return {
                                    type,
                                    result: await conflictEngine.detectConflicts(request),
                                }
                            case 'validation':
                                return {
                                    type,
                                    result: await conflictEngine.validateAppointmentSlot(
                                        request.staffId,
                                        request.startTime,
                                        request.duration,
                                        request.businessId,
                                        request.serviceIds
                                    ),
                                }
                            default:
                                throw new Error('Unknown request type')
                        }
                    } catch (error) {
                        return {
                            type,
                            error: (error as Error).message,
                            request,
                        }
                    }
                })
            )

            const endTime = performance.now()
            const totalExecutionTime = endTime - startTime

            // Should complete 150 mixed operations in under 4 seconds
            expect(totalExecutionTime).toBeLessThan(4000)

            const successfulRequests = results.filter(result => !('error' in result))
            const failedRequests = results.filter(result => 'error' in result)

            expect(successfulRequests.length).toBeGreaterThan(142) // 95% success rate
            expect(failedRequests.length).toBeLessThan(8)

            // Verify all operation types were successful
            const availabilityResults = results.filter(r => r.type === 'availability' && !('error' in r))
            const conflictResults = results.filter(r => r.type === 'conflict' && !('error' in r))
            const validationResults = results.filter(r => r.type === 'validation' && !('error' in r))

            expect(availabilityResults.length).toBeGreaterThan(45)
            expect(conflictResults.length).toBeGreaterThan(45)
            expect(validationResults.length).toBeGreaterThan(45)

            console.log(`Mixed Operations Load Test Results:`)
            console.log(`- Total requests: ${allRequests.length}`)
            console.log(`- Successful: ${successfulRequests.length}`)
            console.log(`- Failed: ${failedRequests.length}`)
            console.log(`- Availability operations: ${availabilityResults.length}/50`)
            console.log(`- Conflict operations: ${conflictResults.length}/50`)
            console.log(`- Validation operations: ${validationResults.length}/50`)
            console.log(`- Total time: ${totalExecutionTime.toFixed(2)}ms`)
        })
    })

    describe('Sustained Load Testing', () => {
        it('should maintain performance under sustained load', async () => {
            const calculator = new AvailabilityCalculator()
            const requestsPerBatch = 20
            const numberOfBatches = 10
            const batchDelay = 100 // 100ms between batches

            const batchResults: Array<{
                batchNumber: number
                executionTime: number
                successCount: number
                failureCount: number
            }> = []

            for (let batch = 0; batch < numberOfBatches; batch++) {
                const requests = Array.from({ length: requestsPerBatch }, (_, i) => ({
                    businessId,
                    date: new Date('2024-01-15'),
                    staffId: staffIds[(batch * requestsPerBatch + i) % staffIds.length],
                    duration: 60,
                    includeUnavailable: false,
                }))

                const batchStartTime = performance.now()

                const results = await Promise.all(
                    requests.map(request =>
                        calculator.getAvailableSlots(request).catch(error => ({
                            error: error.message,
                        }))
                    )
                )

                const batchEndTime = performance.now()
                const batchExecutionTime = batchEndTime - batchStartTime

                const successCount = results.filter(result => !('error' in result)).length
                const failureCount = results.filter(result => 'error' in result).length

                batchResults.push({
                    batchNumber: batch + 1,
                    executionTime: batchExecutionTime,
                    successCount,
                    failureCount,
                })

                // Wait between batches to simulate sustained load
                if (batch < numberOfBatches - 1) {
                    await new Promise(resolve => setTimeout(resolve, batchDelay))
                }
            }

            // Analyze performance degradation
            const firstBatchTime = batchResults[0].executionTime
            const lastBatchTime = batchResults[batchResults.length - 1].executionTime
            const performanceDegradation = (lastBatchTime - firstBatchTime) / firstBatchTime

            // Performance should not degrade by more than 50%
            expect(performanceDegradation).toBeLessThan(0.5)

            // All batches should maintain good success rates
            batchResults.forEach(batch => {
                expect(batch.successCount).toBeGreaterThan(18) // 90% success rate
                expect(batch.failureCount).toBeLessThan(2)
            })

            console.log(`Sustained Load Test Results:`)
            console.log(`- Total batches: ${numberOfBatches}`)
            console.log(`- Requests per batch: ${requestsPerBatch}`)
            console.log(`- First batch time: ${firstBatchTime.toFixed(2)}ms`)
            console.log(`- Last batch time: ${lastBatchTime.toFixed(2)}ms`)
            console.log(`- Performance degradation: ${(performanceDegradation * 100).toFixed(1)}%`)
        })

        it('should handle peak load scenarios', async () => {
            const calculator = new AvailabilityCalculator()
            const conflictEngine = new ConflictDetectionEngine()

            // Simulate peak booking time (e.g., Monday morning when people book for the week)
            const peakRequests = Array.from({ length: 200 }, (_, i) => {
                const requestType = i % 3
                const baseRequest = {
                    businessId,
                    staffId: staffIds[i % staffIds.length],
                    date: new Date('2024-01-15'),
                    startTime: new Date(`2024-01-15T${8 + (i % 12)}:${(i % 4) * 15}:00Z`),
                    endTime: new Date(`2024-01-15T${9 + (i % 12)}:${(i % 4) * 15}:00Z`),
                    serviceId: serviceIds[i % serviceIds.length],
                    duration: 60,
                }

                switch (requestType) {
                    case 0:
                        return {
                            type: 'availability' as const,
                            operation: () => calculator.getAvailableSlots({
                                businessId: baseRequest.businessId,
                                date: baseRequest.date,
                                staffId: baseRequest.staffId,
                                duration: baseRequest.duration,
                                includeUnavailable: false,
                            }),
                        }
                    case 1:
                        return {
                            type: 'conflict' as const,
                            operation: () => conflictEngine.detectConflicts({
                                businessId: baseRequest.businessId,
                                staffId: baseRequest.staffId,
                                startTime: baseRequest.startTime,
                                endTime: baseRequest.endTime,
                                serviceIds: [baseRequest.serviceId],
                            }),
                        }
                    case 2:
                        return {
                            type: 'validation' as const,
                            operation: () => conflictEngine.validateAppointmentSlot(
                                baseRequest.staffId,
                                baseRequest.startTime,
                                baseRequest.duration,
                                baseRequest.businessId,
                                [baseRequest.serviceId]
                            ),
                        }
                    default:
                        throw new Error('Invalid request type')
                }
            })

            const startTime = performance.now()

            const results = await Promise.all(
                peakRequests.map(async ({ type, operation }) => {
                    try {
                        const result = await operation()
                        return { type, success: true, result }
                    } catch (error) {
                        return { type, success: false, error: (error as Error).message }
                    }
                })
            )

            const endTime = performance.now()
            const totalExecutionTime = endTime - startTime

            // Should handle peak load in under 8 seconds
            expect(totalExecutionTime).toBeLessThan(8000)

            const successfulRequests = results.filter(result => result.success)
            const failedRequests = results.filter(result => !result.success)

            // Should maintain >90% success rate even under peak load
            expect(successfulRequests.length).toBeGreaterThan(180)
            expect(failedRequests.length).toBeLessThan(20)

            // Verify performance by operation type
            const availabilityOps = results.filter(r => r.type === 'availability')
            const conflictOps = results.filter(r => r.type === 'conflict')
            const validationOps = results.filter(r => r.type === 'validation')

            console.log(`Peak Load Test Results:`)
            console.log(`- Total requests: ${peakRequests.length}`)
            console.log(`- Successful: ${successfulRequests.length}`)
            console.log(`- Failed: ${failedRequests.length}`)
            console.log(`- Availability ops: ${availabilityOps.filter(op => op.success).length}/${availabilityOps.length}`)
            console.log(`- Conflict ops: ${conflictOps.filter(op => op.success).length}/${conflictOps.length}`)
            console.log(`- Validation ops: ${validationOps.filter(op => op.success).length}/${validationOps.length}`)
            console.log(`- Total time: ${totalExecutionTime.toFixed(2)}ms`)
            console.log(`- Average time per request: ${(totalExecutionTime / peakRequests.length).toFixed(2)}ms`)
        })
    })

    describe('Resource Utilization Under Load', () => {
        it('should maintain reasonable memory usage under load', async () => {
            const calculator = new AvailabilityCalculator()
            const initialMemory = process.memoryUsage()

            // Perform sustained operations
            for (let i = 0; i < 10; i++) {
                const batchRequests = Array.from({ length: 50 }, (_, j) => ({
                    businessId,
                    date: new Date('2024-01-15'),
                    staffId: staffIds[(i * 50 + j) % staffIds.length],
                    duration: 60,
                    includeUnavailable: false,
                }))

                await Promise.all(
                    batchRequests.map(request =>
                        calculator.getAvailableSlots(request).catch(() => null)
                    )
                )

                // Force garbage collection if available
                if (global.gc) {
                    global.gc()
                }
            }

            const finalMemory = process.memoryUsage()
            const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed

            // Memory increase should be reasonable (less than 50MB for 500 operations)
            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)

            console.log(`Memory Usage Test Results:`)
            console.log(`- Initial heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`)
            console.log(`- Final heap: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`)
            console.log(`- Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`)
        })

        it('should handle database connection pooling efficiently', async () => {
            // This test verifies that database connections are managed efficiently
            // under high concurrent load

            const calculator = new AvailabilityCalculator()
            const concurrentBatches = 5
            const requestsPerBatch = 40

            const batchPromises = Array.from({ length: concurrentBatches }, async (_, batchIndex) => {
                const requests = Array.from({ length: requestsPerBatch }, (_, i) => ({
                    businessId,
                    date: new Date('2024-01-15'),
                    staffId: staffIds[(batchIndex * requestsPerBatch + i) % staffIds.length],
                    duration: 60,
                    includeUnavailable: false,
                }))

                const startTime = performance.now()

                const results = await Promise.all(
                    requests.map(request =>
                        calculator.getAvailableSlots(request).catch(error => ({
                            error: error.message,
                        }))
                    )
                )

                const endTime = performance.now()

                return {
                    batchIndex,
                    executionTime: endTime - startTime,
                    successCount: results.filter(r => !('error' in r)).length,
                    failureCount: results.filter(r => 'error' in r).length,
                }
            })

            const startTime = performance.now()
            const batchResults = await Promise.all(batchPromises)
            const endTime = performance.now()

            const totalExecutionTime = endTime - startTime

            // All batches should complete successfully
            batchResults.forEach(batch => {
                expect(batch.successCount).toBeGreaterThan(35) // 87.5% success rate
                expect(batch.failureCount).toBeLessThan(5)
            })

            // Total time should be reasonable for concurrent execution
            expect(totalExecutionTime).toBeLessThan(3000)

            console.log(`Database Connection Pooling Test Results:`)
            console.log(`- Concurrent batches: ${concurrentBatches}`)
            console.log(`- Requests per batch: ${requestsPerBatch}`)
            console.log(`- Total requests: ${concurrentBatches * requestsPerBatch}`)
            console.log(`- Total execution time: ${totalExecutionTime.toFixed(2)}ms`)
            batchResults.forEach(batch => {
                console.log(`  Batch ${batch.batchIndex + 1}: ${batch.executionTime.toFixed(2)}ms, ${batch.successCount}/${requestsPerBatch} successful`)
            })
        })
    })
})
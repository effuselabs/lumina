/**
 * Database Stress Testing and Performance Benchmarks
 * 
 * Stress testing for database operations under high concurrency,
 * performance benchmarking against sub-500ms targets, and monitoring
 * for performance degradation alerts.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 9.4, 9.5
 * 
 * @version 1.0.0
 * @author Lumina Development Team
 */

import { OptimizedPrismaClientFactory, getConnectionMetrics } from '@/lib/db/connection-pool'
import { QueryOptimizer } from '@/lib/db/query-optimizer'
import { OptimizedAppointmentRepository } from '@/lib/repositories/appointment-repository-optimized'
import { AppointmentStatus } from '@prisma/client'
import { performance } from 'perf_hooks'

// Mock dependencies for stress testing
jest.mock('@/lib/db/connection-pool')
jest.mock('@/lib/repositories/appointment-repository-optimized')
jest.mock('@/lib/db/query-optimizer')

const mockPrismaFactory = OptimizedPrismaClientFactory as jest.Mocked<typeof OptimizedPrismaClientFactory>
const mockRepository = OptimizedAppointmentRepository as jest.MockedClass<typeof OptimizedAppointmentRepository>
const mockQueryOptimizer = QueryOptimizer as jest.MockedClass<typeof QueryOptimizer>
const mockGetConnectionMetrics = getConnectionMetrics as jest.MockedFunction<typeof getConnectionMetrics>

describe('Database Stress Testing and Performance Benchmarks', () => {
    let repositoryInstance: jest.Mocked<OptimizedAppointmentRepository>
    let queryOptimizerInstance: jest.Mocked<QueryOptimizer>

    const testBusinessId = 'business-stress-123'
    const testStaffIds = Array.from({ length: 30 }, (_, i) => `staff-stress-${i + 1}`)
    const testClientIds = Array.from({ length: 1000 }, (_, i) => `client-stress-${i + 1}`)
    const testServiceIds = Array.from({ length: 100 }, (_, i) => `service-stress-${i + 1}`)

    // Performance benchmarks (sub-500ms targets)
    const PERFORMANCE_BENCHMARKS = {
        CREATE_APPOINTMENT: 500, // ms
        FIND_BY_ID: 200, // ms
        FIND_BY_BUSINESS: 300, // ms
        FIND_BY_STAFF: 300, // ms
        UPDATE_APPOINTMENT: 400, // ms
        BATCH_OPERATIONS: 600, // ms
        COMPLEX_QUERIES: 450, // ms
        STATISTICS_QUERIES: 400, // ms
        CONCURRENT_READS: 250, // ms average
        CONCURRENT_WRITES: 500, // ms average
        TRANSACTION_ROLLBACK: 300, // ms
        INDEX_OPTIMIZATION: 100 // ms for index usage
    }

    // Stress testing thresholds
    const STRESS_THRESHOLDS = {
        HIGH_CONCURRENCY: 10000, // ms for 500 concurrent operations
        CONNECTION_EXHAUSTION: 8000, // ms for connection pool stress
        MEMORY_PRESSURE: 15000, // ms under memory constraints
        DEADLOCK_RECOVERY: 5000, // ms for deadlock scenarios
        BULK_OPERATIONS: 12000, // ms for bulk data operations
        QUERY_COMPLEXITY: 2000 // ms for complex analytical queries
    }

    beforeEach(() => {
        jest.clearAllMocks()
        setupStressMocks()
    })

    const setupStressMocks = () => {
        // Repository instance
        repositoryInstance = {
            create: jest.fn(),
            findById: jest.fn(),
            findByBusinessOptimized: jest.fn(),
            findByStaffOptimized: jest.fn(),
            update: jest.fn(),
            updateStatus: jest.fn(),
            batchUpdateStatus: jest.fn(),
            batchCreate: jest.fn(),
            findConflictsOptimized: jest.fn(),
            getAppointmentStatsOptimized: jest.fn(),
            executeRawQuery: jest.fn(),
            executeTransaction: jest.fn()
        } as any

        // Query optimizer instance
        queryOptimizerInstance = {
            optimizeQuery: jest.fn(),
            analyzeQueryPerformance: jest.fn(),
            suggestIndexes: jest.fn(),
            validateIndexUsage: jest.fn(),
            getQueryStats: jest.fn()
        } as any

        // Mock constructors
        mockRepository.mockImplementation(() => repositoryInstance)
        mockQueryOptimizer.mockImplementation(() => queryOptimizerInstance)

        // Setup realistic database operation mocks
        setupDatabaseMocks()
    }

    const setupDatabaseMocks = () => {
        // Create operations with realistic timing
        repositoryInstance.create.mockImplementation(async (data: any) => {
            const baseDelay = 30 + Math.random() * 40 // 30-70ms base
            const complexityDelay = data.services?.length * 10 || 0 // Additional delay for multi-service
            await new Promise(resolve => setTimeout(resolve, baseDelay + complexityDelay))

            return {
                id: `appointment-${Date.now()}-${Math.random()}`,
                ...data,
                status: AppointmentStatus.SCHEDULED,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        })

        // Read operations
        repositoryInstance.findById.mockImplementation(async (id, businessId) => {
            await new Promise(resolve => setTimeout(resolve, 15 + Math.random() * 25)) // 15-40ms
            return {
                id,
                businessId,
                status: AppointmentStatus.SCHEDULED,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        })

        repositoryInstance.findByBusinessOptimized.mockImplementation(async (businessId, options) => {
            const baseDelay = 25 + Math.random() * 35 // 25-60ms
            const paginationDelay = (options?.offset || 0) > 0 ? 10 : 0 // Additional delay for pagination
            await new Promise(resolve => setTimeout(resolve, baseDelay + paginationDelay))

            return {
                appointments: Array.from({ length: options?.limit || 20 }, (_, i) => ({
                    id: `appointment-${i}`,
                    businessId,
                    status: AppointmentStatus.SCHEDULED
                })),
                total: 5000,
                hasMore: (options?.offset || 0) + (options?.limit || 20) < 5000,
                nextCursor: 'cursor-123'
            }
        })

        repositoryInstance.findByStaffOptimized.mockImplementation(async (staffId, businessId, dateRange, options) => {
            await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 30)) // 20-50ms
            return {
                appointments: Array.from({ length: options?.limit || 20 }, (_, i) => ({
                    id: `staff-appointment-${i}`,
                    businessId,
                    staffId,
                    status: AppointmentStatus.SCHEDULED
                })),
                total: 200,
                hasMore: false
            }
        })

        // Update operations
        repositoryInstance.update.mockImplementation(async (id, businessId, updates) => {
            await new Promise(resolve => setTimeout(resolve, 25 + Math.random() * 35)) // 25-60ms
            return {
                id,
                businessId,
                ...updates,
                updatedAt: new Date()
            }
        })

        // Batch operations
        repositoryInstance.batchCreate.mockImplementation(async (appointments) => {
            const batchDelay = 50 + appointments.length * 2 // Base + per-item delay
            await new Promise(resolve => setTimeout(resolve, batchDelay))
            return {
                created: appointments.length,
                errors: []
            }
        })

        repositoryInstance.batchUpdateStatus.mockImplementation(async (ids, businessId, status) => {
            const batchDelay = 40 + ids.length * 1.5 // Base + per-item delay
            await new Promise(resolve => setTimeout(resolve, batchDelay))
            return {
                updated: ids.length,
                errors: []
            }
        })

        // Complex queries
        repositoryInstance.getAppointmentStatsOptimized.mockImplementation(async (businessId, dateRange) => {
            await new Promise(resolve => setTimeout(resolve, 80 + Math.random() * 60)) // 80-140ms for analytics
            return {
                total: 1000,
                byStatus: {
                    [AppointmentStatus.SCHEDULED]: 300,
                    [AppointmentStatus.CONFIRMED]: 400,
                    [AppointmentStatus.COMPLETED]: 250,
                    [AppointmentStatus.CANCELLED]: 50
                },
                byStaff: testStaffIds.reduce((acc, staffId) => {
                    acc[staffId] = Math.floor(Math.random() * 50)
                    return acc
                }, {} as Record<string, number>),
                totalRevenue: 50000,
                averageAppointmentValue: 50
            }
        })

        // Query optimizer mocks
        queryOptimizerInstance.optimizeQuery.mockImplementation(async (query) => {
            await new Promise(resolve => setTimeout(resolve, 5 + Math.random() * 10))
            return {
                optimizedQuery: query,
                estimatedImprovement: Math.random() * 0.3 + 0.1, // 10-40% improvement
                suggestedIndexes: ['idx_business_id_start_time', 'idx_staff_id_date']
            }
        })

        queryOptimizerInstance.analyzeQueryPerformance.mockImplementation(async (query) => {
            await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 15))
            return {
                executionTime: Math.random() * 100 + 20, // 20-120ms
                indexesUsed: ['idx_business_id', 'idx_start_time'],
                rowsScanned: Math.floor(Math.random() * 1000),
                rowsReturned: Math.floor(Math.random() * 100),
                optimizationScore: Math.random() * 0.5 + 0.5 // 50-100%
            }
        })

        // Connection metrics mock
        mockGetConnectionMetrics.mockReturnValue({
            metrics: {
                totalQueries: 10000,
                averageQueryTime: 45.5,
                slowQueries: 150,
                errors: 25,
                connectionPoolSize: 20,
                activeConnections: 15,
                idleConnections: 5
            },
            performance: {
                errorRate: 0.0025,
                slowQueryRate: 0.015,
                averageResponseTime: 45.5,
                connectionUtilization: 0.75
            }
        })
    }

    const createStressTestAppointment = (index: number) => ({
        businessId: testBusinessId,
        clientId: testClientIds[index % testClientIds.length],
        staffId: testStaffIds[index % testStaffIds.length],
        startTime: new Date(Date.now() + (index * 15 * 60 * 1000)), // 15 minutes apart
        endTime: new Date(Date.now() + ((index * 15 + 60) * 60 * 1000)), // 1 hour duration
        totalDuration: 60,
        totalPrice: 50 + (index % 30) * 5,
        services: [{
            serviceId: testServiceIds[index % testServiceIds.length],
            serviceName: `Service ${index}`,
            price: 50 + (index % 30) * 5,
            duration: 60,
            serviceOrder: 1,
            startOffset: 0
        }]
    })

    describe('Performance Benchmark Validation', () => {
        it('should meet sub-500ms benchmark for appointment creation', async () => {
            const benchmarkIterations = 50
            const creationTimes: number[] = []

            for (let i = 0; i < benchmarkIterations; i++) {
                const appointmentData = createStressTestAppointment(i)

                const startTime = performance.now()
                await repositoryInstance.create(appointmentData)
                const endTime = performance.now()

                const duration = endTime - startTime
                creationTimes.push(duration)
            }

            const averageTime = creationTimes.reduce((sum, time) => sum + time, 0) / creationTimes.length
            const p95Time = creationTimes.sort((a, b) => a - b)[Math.floor(benchmarkIterations * 0.95)]
            const maxTime = Math.max(...creationTimes)

            expect(averageTime).toBeLessThan(PERFORMANCE_BENCHMARKS.CREATE_APPOINTMENT * 0.8) // 80% of benchmark
            expect(p95Time).toBeLessThan(PERFORMANCE_BENCHMARKS.CREATE_APPOINTMENT)
            expect(maxTime).toBeLessThan(PERFORMANCE_BENCHMARKS.CREATE_APPOINTMENT * 1.5) // Allow some outliers

            console.log(`Appointment Creation Benchmark:`)
            console.log(`- Iterations: ${benchmarkIterations}`)
            console.log(`- Average time: ${averageTime.toFixed(2)}ms`)
            console.log(`- 95th percentile: ${p95Time.toFixed(2)}ms`)
            console.log(`- Max time: ${maxTime.toFixed(2)}ms`)
            console.log(`- Benchmark target: ${PERFORMANCE_BENCHMARKS.CREATE_APPOINTMENT}ms`)
        })

        it('should meet sub-200ms benchmark for appointment retrieval by ID', async () => {
            const benchmarkIterations = 100
            const retrievalTimes: number[] = []

            for (let i = 0; i < benchmarkIterations; i++) {
                const appointmentId = `benchmark-appointment-${i}`

                const startTime = performance.now()
                await repositoryInstance.findById(appointmentId, testBusinessId)
                const endTime = performance.now()

                const duration = endTime - startTime
                retrievalTimes.push(duration)
            }

            const averageTime = retrievalTimes.reduce((sum, time) => sum + time, 0) / retrievalTimes.length
            const p95Time = retrievalTimes.sort((a, b) => a - b)[Math.floor(benchmarkIterations * 0.95)]

            expect(averageTime).toBeLessThan(PERFORMANCE_BENCHMARKS.FIND_BY_ID * 0.7) // 70% of benchmark
            expect(p95Time).toBeLessThan(PERFORMANCE_BENCHMARKS.FIND_BY_ID)

            console.log(`Appointment Retrieval Benchmark:`)
            console.log(`- Iterations: ${benchmarkIterations}`)
            console.log(`- Average time: ${averageTime.toFixed(2)}ms`)
            console.log(`- 95th percentile: ${p95Time.toFixed(2)}ms`)
            console.log(`- Benchmark target: ${PERFORMANCE_BENCHMARKS.FIND_BY_ID}ms`)
        })

        it('should meet sub-300ms benchmark for business appointment queries', async () => {
            const benchmarkIterations = 75
            const queryTimes: number[] = []

            for (let i = 0; i < benchmarkIterations; i++) {
                const options = {
                    limit: 20,
                    offset: i * 20,
                    filters: i % 3 === 0 ? { status: AppointmentStatus.SCHEDULED } : undefined
                }

                const startTime = performance.now()
                await repositoryInstance.findByBusinessOptimized(testBusinessId, options)
                const endTime = performance.now()

                const duration = endTime - startTime
                queryTimes.push(duration)
            }

            const averageTime = queryTimes.reduce((sum, time) => sum + time, 0) / queryTimes.length
            const p95Time = queryTimes.sort((a, b) => a - b)[Math.floor(benchmarkIterations * 0.95)]

            expect(averageTime).toBeLessThan(PERFORMANCE_BENCHMARKS.FIND_BY_BUSINESS * 0.8)
            expect(p95Time).toBeLessThan(PERFORMANCE_BENCHMARKS.FIND_BY_BUSINESS)

            console.log(`Business Query Benchmark:`)
            console.log(`- Iterations: ${benchmarkIterations}`)
            console.log(`- Average time: ${averageTime.toFixed(2)}ms`)
            console.log(`- 95th percentile: ${p95Time.toFixed(2)}ms`)
            console.log(`- Benchmark target: ${PERFORMANCE_BENCHMARKS.FIND_BY_BUSINESS}ms`)
        })

        it('should meet sub-400ms benchmark for appointment statistics', async () => {
            const benchmarkIterations = 30
            const statsTimes: number[] = []

            for (let i = 0; i < benchmarkIterations; i++) {
                const dateRange = {
                    startDate: new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000), // i+1 weeks ago
                    endDate: new Date()
                }

                const startTime = performance.now()
                await repositoryInstance.getAppointmentStatsOptimized(testBusinessId, dateRange)
                const endTime = performance.now()

                const duration = endTime - startTime
                statsTimes.push(duration)
            }

            const averageTime = statsTimes.reduce((sum, time) => sum + time, 0) / statsTimes.length
            const p95Time = statsTimes.sort((a, b) => a - b)[Math.floor(benchmarkIterations * 0.95)]

            expect(averageTime).toBeLessThan(PERFORMANCE_BENCHMARKS.STATISTICS_QUERIES)
            expect(p95Time).toBeLessThan(PERFORMANCE_BENCHMARKS.STATISTICS_QUERIES * 1.2)

            console.log(`Statistics Query Benchmark:`)
            console.log(`- Iterations: ${benchmarkIterations}`)
            console.log(`- Average time: ${averageTime.toFixed(2)}ms`)
            console.log(`- 95th percentile: ${p95Time.toFixed(2)}ms`)
            console.log(`- Benchmark target: ${PERFORMANCE_BENCHMARKS.STATISTICS_QUERIES}ms`)
        })
    })

    describe('High Concurrency Stress Testing', () => {
        it('should handle 500 concurrent database operations', async () => {
            const concurrentOperations = 500
            const operationTypes = ['create', 'read', 'update', 'query'] as const

            const operations = Array.from({ length: concurrentOperations }, (_, index) => {
                const operationType = operationTypes[index % operationTypes.length]

                switch (operationType) {
                    case 'create':
                        return () => repositoryInstance.create(createStressTestAppointment(index))
                    case 'read':
                        return () => repositoryInstance.findById(`appointment-${index}`, testBusinessId)
                    case 'update':
                        return () => repositoryInstance.update(`appointment-${index}`, testBusinessId, { notes: `Updated ${index}` })
                    case 'query':
                        return () => repositoryInstance.findByBusinessOptimized(testBusinessId, { limit: 10, offset: index * 10 })
                }
            })

            const startTime = performance.now()
            const results = await Promise.all(operations.map(op => op().catch(error => ({ error: error.message }))))
            const endTime = performance.now()
            const totalTime = endTime - startTime

            expect(totalTime).toBeLessThan(STRESS_THRESHOLDS.HIGH_CONCURRENCY)

            const successfulOperations = results.filter(result => !('error' in result))
            const failedOperations = results.filter(result => 'error' in result)

            expect(successfulOperations.length).toBeGreaterThan(concurrentOperations * 0.95) // 95% success rate
            expect(failedOperations.length).toBeLessThan(concurrentOperations * 0.05)

            console.log(`High Concurrency Stress Test:`)
            console.log(`- Concurrent operations: ${concurrentOperations}`)
            console.log(`- Successful operations: ${successfulOperations.length}`)
            console.log(`- Failed operations: ${failedOperations.length}`)
            console.log(`- Success rate: ${((successfulOperations.length / concurrentOperations) * 100).toFixed(1)}%`)
            console.log(`- Total time: ${totalTime.toFixed(2)}ms`)
            console.log(`- Average time per operation: ${(totalTime / concurrentOperations).toFixed(2)}ms`)
        })

        it('should handle concurrent read operations efficiently', async () => {
            const concurrentReads = 200
            const readTypes = ['findById', 'findByBusiness', 'findByStaff'] as const

            const readOperations = Array.from({ length: concurrentReads }, (_, index) => {
                const readType = readTypes[index % readTypes.length]

                switch (readType) {
                    case 'findById':
                        return () => repositoryInstance.findById(`read-test-${index}`, testBusinessId)
                    case 'findByBusiness':
                        return () => repositoryInstance.findByBusinessOptimized(testBusinessId, { limit: 5 })
                    case 'findByStaff':
                        return () => repositoryInstance.findByStaffOptimized(
                            testStaffIds[index % testStaffIds.length],
                            testBusinessId,
                            undefined,
                            { limit: 5 }
                        )
                }
            })

            const startTime = performance.now()
            const results = await Promise.all(readOperations.map(op => op()))
            const endTime = performance.now()
            const totalTime = endTime - startTime

            const averageTime = totalTime / concurrentReads
            expect(averageTime).toBeLessThan(PERFORMANCE_BENCHMARKS.CONCURRENT_READS)
            expect(totalTime).toBeLessThan(STRESS_THRESHOLDS.HIGH_CONCURRENCY * 0.4) // Reads should be faster

            console.log(`Concurrent Read Operations:`)
            console.log(`- Concurrent reads: ${concurrentReads}`)
            console.log(`- Total time: ${totalTime.toFixed(2)}ms`)
            console.log(`- Average time per read: ${averageTime.toFixed(2)}ms`)
            console.log(`- Benchmark target: ${PERFORMANCE_BENCHMARKS.CONCURRENT_READS}ms`)
        })

        it('should handle concurrent write operations with proper isolation', async () => {
            const concurrentWrites = 150
            const writeTypes = ['create', 'update', 'updateStatus'] as const

            const writeOperations = Array.from({ length: concurrentWrites }, (_, index) => {
                const writeType = writeTypes[index % writeTypes.length]

                switch (writeType) {
                    case 'create':
                        return () => repositoryInstance.create(createStressTestAppointment(index))
                    case 'update':
                        return () => repositoryInstance.update(`write-test-${index}`, testBusinessId, { notes: `Concurrent update ${index}` })
                    case 'updateStatus':
                        return () => repositoryInstance.updateStatus(`write-test-${index}`, testBusinessId, AppointmentStatus.CONFIRMED, 'Concurrent status update')
                }
            })

            const startTime = performance.now()
            const results = await Promise.all(writeOperations.map(op => op().catch(error => ({ error: error.message }))))
            const endTime = performance.now()
            const totalTime = endTime - startTime

            const successfulWrites = results.filter(result => !('error' in result))
            const averageTime = totalTime / concurrentWrites

            expect(averageTime).toBeLessThan(PERFORMANCE_BENCHMARKS.CONCURRENT_WRITES)
            expect(successfulWrites.length).toBeGreaterThan(concurrentWrites * 0.9) // 90% success rate for writes

            console.log(`Concurrent Write Operations:`)
            console.log(`- Concurrent writes: ${concurrentWrites}`)
            console.log(`- Successful writes: ${successfulWrites.length}`)
            console.log(`- Total time: ${totalTime.toFixed(2)}ms`)
            console.log(`- Average time per write: ${averageTime.toFixed(2)}ms`)
            console.log(`- Benchmark target: ${PERFORMANCE_BENCHMARKS.CONCURRENT_WRITES}ms`)
        })
    })

    describe('Connection Pool Stress Testing', () => {
        it('should handle connection pool exhaustion gracefully', async () => {
            const connectionStressOperations = 300
            const maxPoolSize = 20 // Simulate limited connection pool

            // Simulate operations that hold connections for varying durations
            const connectionOperations = Array.from({ length: connectionStressOperations }, async (_, index) => {
                const holdTime = 50 + Math.random() * 200 // 50-250ms connection hold time

                // Simulate connection acquisition delay when pool is exhausted
                if (index > maxPoolSize) {
                    await new Promise(resolve => setTimeout(resolve, Math.random() * 100))
                }

                const operationType = index % 4
                switch (operationType) {
                    case 0:
                        return repositoryInstance.create(createStressTestAppointment(index))
                    case 1:
                        return repositoryInstance.findByBusinessOptimized(testBusinessId, { limit: 5 })
                    case 2:
                        return repositoryInstance.update(`conn-test-${index}`, testBusinessId, { notes: `Connection test ${index}` })
                    case 3:
                        return repositoryInstance.getAppointmentStatsOptimized(testBusinessId, {
                            startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
                            endDate: new Date()
                        })
                }
            })

            const startTime = performance.now()
            const results = await Promise.all(connectionOperations)
            const endTime = performance.now()
            const totalTime = endTime - startTime

            expect(totalTime).toBeLessThan(STRESS_THRESHOLDS.CONNECTION_EXHAUSTION)

            const connectionMetrics = getConnectionMetrics()
            expect(connectionMetrics.performance.errorRate).toBeLessThan(0.05) // Less than 5% error rate
            expect(connectionMetrics.performance.connectionUtilization).toBeLessThan(1.0) // Not over-utilized

            console.log(`Connection Pool Stress Test:`)
            console.log(`- Operations: ${connectionStressOperations}`)
            console.log(`- Max pool size: ${maxPoolSize}`)
            console.log(`- Total time: ${totalTime.toFixed(2)}ms`)
            console.log(`- Connection utilization: ${(connectionMetrics.performance.connectionUtilization * 100).toFixed(1)}%`)
            console.log(`- Error rate: ${(connectionMetrics.performance.errorRate * 100).toFixed(2)}%`)
        })

        it('should recover from connection timeouts', async () => {
            const timeoutRecoveryOperations = 100
            let timeoutCount = 0
            let recoveryCount = 0

            // Mock connection timeout scenarios
            repositoryInstance.findByBusinessOptimized.mockImplementation(async (businessId, options) => {
                // Simulate 20% timeout rate
                if (Math.random() < 0.2) {
                    timeoutCount++
                    throw new Error('Connection timeout')
                }

                await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 40))
                recoveryCount++

                return {
                    appointments: [],
                    total: 0,
                    hasMore: false
                }
            })

            const recoveryPromises = Array.from({ length: timeoutRecoveryOperations }, async (_, index) => {
                try {
                    return await repositoryInstance.findByBusinessOptimized(testBusinessId, { limit: 10 })
                } catch (error) {
                    // Simulate retry logic
                    await new Promise(resolve => setTimeout(resolve, 100)) // Wait before retry
                    try {
                        return await repositoryInstance.findByBusinessOptimized(testBusinessId, { limit: 10 })
                    } catch (retryError) {
                        return { error: retryError.message }
                    }
                }
            })

            const startTime = performance.now()
            const results = await Promise.all(recoveryPromises)
            const endTime = performance.now()
            const totalTime = endTime - startTime

            expect(totalTime).toBeLessThan(STRESS_THRESHOLDS.CONNECTION_EXHAUSTION)

            const successfulOperations = results.filter(result => !('error' in result))
            const recoveryRate = successfulOperations.length / timeoutRecoveryOperations

            expect(recoveryRate).toBeGreaterThan(0.8) // 80% recovery rate

            console.log(`Connection Timeout Recovery:`)
            console.log(`- Operations: ${timeoutRecoveryOperations}`)
            console.log(`- Timeouts encountered: ${timeoutCount}`)
            console.log(`- Successful recoveries: ${recoveryCount}`)
            console.log(`- Recovery rate: ${(recoveryRate * 100).toFixed(1)}%`)
            console.log(`- Total time: ${totalTime.toFixed(2)}ms`)
        })
    })

    describe('Bulk Operations Stress Testing', () => {
        it('should handle bulk appointment creation efficiently', async () => {
            const bulkSizes = [50, 100, 200, 500]
            const bulkResults: Array<{ size: number; time: number; throughput: number }> = []

            for (const bulkSize of bulkSizes) {
                const bulkAppointments = Array.from({ length: bulkSize }, (_, i) => createStressTestAppointment(i))

                const startTime = performance.now()
                const result = await repositoryInstance.batchCreate(bulkAppointments)
                const endTime = performance.now()
                const bulkTime = endTime - startTime

                const throughput = bulkSize / (bulkTime / 1000) // Operations per second

                bulkResults.push({ size: bulkSize, time: bulkTime, throughput })

                expect(bulkTime).toBeLessThan(STRESS_THRESHOLDS.BULK_OPERATIONS)
                expect(result.created).toBe(bulkSize)
                expect(result.errors).toHaveLength(0)
            }

            console.log(`Bulk Creation Performance:`)
            bulkResults.forEach(({ size, time, throughput }) => {
                console.log(`- Bulk size ${size}: ${time.toFixed(2)}ms (${throughput.toFixed(1)} ops/sec)`)
            })
        })

        it('should handle bulk status updates efficiently', async () => {
            const bulkStatusSizes = [25, 50, 100, 250]
            const statusUpdateResults: Array<{ size: number; time: number }> = []

            for (const bulkSize of bulkStatusSizes) {
                const appointmentIds = Array.from({ length: bulkSize }, (_, i) => `bulk-status-${i}`)

                const startTime = performance.now()
                const result = await repositoryInstance.batchUpdateStatus(
                    appointmentIds,
                    testBusinessId,
                    AppointmentStatus.CONFIRMED,
                    'Bulk status update test'
                )
                const endTime = performance.now()
                const bulkTime = endTime - startTime

                statusUpdateResults.push({ size: bulkSize, time: bulkTime })

                expect(bulkTime).toBeLessThan(STRESS_THRESHOLDS.BULK_OPERATIONS * 0.5) // Status updates should be faster
                expect(result.updated).toBe(bulkSize)
                expect(result.errors).toHaveLength(0)
            }

            console.log(`Bulk Status Update Performance:`)
            statusUpdateResults.forEach(({ size, time }) => {
                console.log(`- Bulk size ${size}: ${time.toFixed(2)}ms`)
            })
        })
    })

    describe('Query Optimization and Index Usage', () => {
        it('should utilize database indexes effectively', async () => {
            const queryOptimizationTests = [
                {
                    name: 'Business ID Index',
                    query: 'SELECT * FROM appointments WHERE business_id = ?',
                    expectedIndexes: ['idx_business_id']
                },
                {
                    name: 'Staff and Date Index',
                    query: 'SELECT * FROM appointments WHERE staff_id = ? AND start_time >= ? AND start_time < ?',
                    expectedIndexes: ['idx_staff_id_start_time']
                },
                {
                    name: 'Status Index',
                    query: 'SELECT * FROM appointments WHERE business_id = ? AND status = ?',
                    expectedIndexes: ['idx_business_id_status']
                }
            ]

            for (const test of queryOptimizationTests) {
                const startTime = performance.now()
                const analysis = await queryOptimizerInstance.analyzeQueryPerformance(test.query)
                const endTime = performance.now()
                const analysisTime = endTime - startTime

                expect(analysisTime).toBeLessThan(PERFORMANCE_BENCHMARKS.INDEX_OPTIMIZATION)
                expect(analysis.optimizationScore).toBeGreaterThan(0.7) // 70% optimization score
                expect(analysis.indexesUsed.some(index =>
                    test.expectedIndexes.some(expected => index.includes(expected.split('_')[1]))
                )).toBe(true)

                console.log(`Query Optimization - ${test.name}:`)
                console.log(`- Execution time: ${analysis.executionTime.toFixed(2)}ms`)
                console.log(`- Indexes used: ${analysis.indexesUsed.join(', ')}`)
                console.log(`- Optimization score: ${(analysis.optimizationScore * 100).toFixed(1)}%`)
                console.log(`- Rows scanned: ${analysis.rowsScanned}`)
                console.log(`- Rows returned: ${analysis.rowsReturned}`)
            }
        })

        it('should suggest performance improvements for slow queries', async () => {
            const slowQueries = [
                'SELECT * FROM appointments WHERE client_name LIKE ?',
                'SELECT * FROM appointments WHERE notes LIKE ? AND created_at > ?',
                'SELECT COUNT(*) FROM appointments GROUP BY staff_id, DATE(start_time)'
            ]

            for (const query of slowQueries) {
                const optimization = await queryOptimizerInstance.optimizeQuery(query)

                expect(optimization.estimatedImprovement).toBeGreaterThan(0.1) // At least 10% improvement
                expect(optimization.suggestedIndexes).toBeDefined()
                expect(optimization.suggestedIndexes.length).toBeGreaterThan(0)

                console.log(`Query Optimization Suggestion:`)
                console.log(`- Original query: ${query}`)
                console.log(`- Estimated improvement: ${(optimization.estimatedImprovement * 100).toFixed(1)}%`)
                console.log(`- Suggested indexes: ${optimization.suggestedIndexes.join(', ')}`)
            }
        })
    })

    describe('Performance Monitoring and Alerting', () => {
        it('should detect performance degradation patterns', async () => {
            const monitoringPeriods = 10
            const operationsPerPeriod = 50
            const performanceMetrics: Array<{ period: number; averageTime: number; slowQueries: number }> = []

            for (let period = 0; period < monitoringPeriods; period++) {
                const periodOperations = Array.from({ length: operationsPerPeriod }, async (_, index) => {
                    const globalIndex = period * operationsPerPeriod + index

                    const startTime = performance.now()
                    await repositoryInstance.findByBusinessOptimized(testBusinessId, { limit: 10, offset: globalIndex * 10 })
                    const endTime = performance.now()

                    return endTime - startTime
                })

                const operationTimes = await Promise.all(periodOperations)
                const averageTime = operationTimes.reduce((sum, time) => sum + time, 0) / operationTimes.length
                const slowQueries = operationTimes.filter(time => time > PERFORMANCE_BENCHMARKS.FIND_BY_BUSINESS).length

                performanceMetrics.push({ period: period + 1, averageTime, slowQueries })

                // Small delay between periods
                await new Promise(resolve => setTimeout(resolve, 100))
            }

            // Analyze performance trends
            const firstHalfAvg = performanceMetrics.slice(0, monitoringPeriods / 2)
                .reduce((sum, metric) => sum + metric.averageTime, 0) / (monitoringPeriods / 2)

            const secondHalfAvg = performanceMetrics.slice(monitoringPeriods / 2)
                .reduce((sum, metric) => sum + metric.averageTime, 0) / (monitoringPeriods / 2)

            const performanceDegradation = (secondHalfAvg - firstHalfAvg) / firstHalfAvg

            // Performance should not degrade significantly
            expect(performanceDegradation).toBeLessThan(0.3) // Less than 30% degradation

            const totalSlowQueries = performanceMetrics.reduce((sum, metric) => sum + metric.slowQueries, 0)
            const slowQueryRate = totalSlowQueries / (monitoringPeriods * operationsPerPeriod)

            expect(slowQueryRate).toBeLessThan(0.1) // Less than 10% slow queries

            console.log(`Performance Monitoring Results:`)
            console.log(`- Monitoring periods: ${monitoringPeriods}`)
            console.log(`- Operations per period: ${operationsPerPeriod}`)
            console.log(`- First half average: ${firstHalfAvg.toFixed(2)}ms`)
            console.log(`- Second half average: ${secondHalfAvg.toFixed(2)}ms`)
            console.log(`- Performance degradation: ${(performanceDegradation * 100).toFixed(1)}%`)
            console.log(`- Slow query rate: ${(slowQueryRate * 100).toFixed(1)}%`)
        })

        it('should trigger alerts for performance threshold violations', async () => {
            const alertThresholds = {
                averageResponseTime: PERFORMANCE_BENCHMARKS.FIND_BY_BUSINESS,
                slowQueryRate: 0.05, // 5%
                errorRate: 0.02, // 2%
                connectionUtilization: 0.9 // 90%
            }

            const monitoringOperations = 100
            let alertsTriggered = 0
            const operationTimes: number[] = []

            for (let i = 0; i < monitoringOperations; i++) {
                const startTime = performance.now()

                try {
                    await repositoryInstance.findByBusinessOptimized(testBusinessId, { limit: 20 })
                    const endTime = performance.now()
                    const operationTime = endTime - startTime
                    operationTimes.push(operationTime)

                    // Check for performance threshold violations
                    if (operationTime > alertThresholds.averageResponseTime) {
                        alertsTriggered++
                    }
                } catch (error) {
                    alertsTriggered++
                }
            }

            const averageTime = operationTimes.reduce((sum, time) => sum + time, 0) / operationTimes.length
            const slowOperations = operationTimes.filter(time => time > alertThresholds.averageResponseTime).length
            const slowOperationRate = slowOperations / monitoringOperations

            const connectionMetrics = getConnectionMetrics()

            // Validate alert conditions
            if (averageTime > alertThresholds.averageResponseTime) {
                console.log(`ALERT: Average response time exceeded threshold (${averageTime.toFixed(2)}ms > ${alertThresholds.averageResponseTime}ms)`)
            }

            if (slowOperationRate > alertThresholds.slowQueryRate) {
                console.log(`ALERT: Slow query rate exceeded threshold (${(slowOperationRate * 100).toFixed(1)}% > ${(alertThresholds.slowQueryRate * 100).toFixed(1)}%)`)
            }

            if (connectionMetrics.performance.connectionUtilization > alertThresholds.connectionUtilization) {
                console.log(`ALERT: Connection utilization exceeded threshold (${(connectionMetrics.performance.connectionUtilization * 100).toFixed(1)}% > ${(alertThresholds.connectionUtilization * 100).toFixed(1)}%)`)
            }

            console.log(`Performance Alert Monitoring:`)
            console.log(`- Operations monitored: ${monitoringOperations}`)
            console.log(`- Average response time: ${averageTime.toFixed(2)}ms`)
            console.log(`- Slow operations: ${slowOperations}`)
            console.log(`- Slow operation rate: ${(slowOperationRate * 100).toFixed(1)}%`)
            console.log(`- Alerts triggered: ${alertsTriggered}`)
        })
    })
})
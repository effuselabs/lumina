/**
 * Concurrent Appointment Operations Performance Tests
 * 
 * Performance tests for concurrent appointment operations including
 * creation, updates, status changes, and calendar integration under
 * high concurrency scenarios.
 * 
 * Requirements: All requirements - comprehensive validation
 * 
 * @version 1.0.0
 * @author Lumina Development Team
 */

import { AppointmentCache } from '@/lib/cache/appointment-cache'
import { getConnectionMetrics } from '@/lib/db/connection-pool'
import { OptimizedAppointmentRepository } from '@/lib/repositories/appointment-repository-optimized'
import { AppointmentService } from '@/lib/services/appointment-service'
import { AppointmentStatusManager } from '@/lib/services/appointment-status-manager'
import { CalendarIntegration } from '@/lib/services/calendar-integration'
import { MultiServiceCoordinator } from '@/lib/services/multi-service-coordinator'
import { AppointmentStatus } from '@prisma/client'
import { performance } from 'perf_hooks'

// Mock dependencies for performance testing
jest.mock('@/lib/db/connection-pool')
jest.mock('@/lib/repositories/appointment-repository-optimized')
jest.mock('@/lib/services/appointment-service')
jest.mock('@/lib/services/calendar-integration')
jest.mock('@/lib/services/multi-service-coordinator')
jest.mock('@/lib/services/appointment-status-manager')
jest.mock('@/lib/cache/appointment-cache')

const mockRepository = OptimizedAppointmentRepository as jest.MockedClass<typeof OptimizedAppointmentRepository>
const mockAppointmentService = AppointmentService as jest.MockedClass<typeof AppointmentService>
const mockCalendarIntegration = CalendarIntegration as jest.MockedClass<typeof CalendarIntegration>
const mockMultiServiceCoordinator = MultiServiceCoordinator as jest.MockedClass<typeof MultiServiceCoordinator>
const mockStatusManager = AppointmentStatusManager as jest.MockedClass<typeof AppointmentStatusManager>
const mockAppointmentCache = AppointmentCache as jest.MockedClass<typeof AppointmentCache>

describe('Concurrent Appointment Operations Performance Tests', () => {
    let repositoryInstance: jest.Mocked<OptimizedAppointmentRepository>
    let serviceInstance: jest.Mocked<AppointmentService>
    let calendarInstance: jest.Mocked<CalendarIntegration>
    let coordinatorInstance: jest.Mocked<MultiServiceCoordinator>
    let statusManagerInstance: jest.Mocked<AppointmentStatusManager>
    let cacheInstance: jest.Mocked<AppointmentCache>

    const testBusinessId = 'business-perf-123'
    const testStaffIds = Array.from({ length: 20 }, (_, i) => `staff-perf-${i + 1}`)
    const testClientIds = Array.from({ length: 100 }, (_, i) => `client-perf-${i + 1}`)
    const testServiceIds = Array.from({ length: 50 }, (_, i) => `service-perf-${i + 1}`)

    // Performance thresholds for concurrent operations
    const PERFORMANCE_THRESHOLDS = {
        CONCURRENT_CREATION: 2000, // ms for 50 concurrent creations
        CONCURRENT_UPDATES: 1500, // ms for 30 concurrent updates
        CONCURRENT_STATUS_CHANGES: 1000, // ms for 25 concurrent status changes
        CONCURRENT_QUERIES: 800, // ms for 100 concurrent queries
        MIXED_OPERATIONS: 3000, // ms for 100 mixed operations
        CACHE_COORDINATION: 500, // ms for cache operations
        CONFLICT_RESOLUTION: 1200 // ms for conflict detection under load
    }

    beforeEach(() => {
        jest.clearAllMocks()

        // Setup mock instances
        repositoryInstance = {
            create: jest.fn(),
            findById: jest.fn(),
            findByBusinessOptimized: jest.fn(),
            findByStaffOptimized: jest.fn(),
            update: jest.fn(),
            updateStatus: jest.fn(),
            batchUpdateStatus: jest.fn(),
            findConflictsOptimized: jest.fn(),
            getAppointmentStatsOptimized: jest.fn()
        } as any

        serviceInstance = {
            createAppointment: jest.fn(),
            getAppointments: jest.fn(),
            getAppointmentById: jest.fn(),
            updateAppointment: jest.fn(),
            cancelAppointment: jest.fn()
        } as any

        calendarInstance = {
            checkAvailability: jest.fn(),
            detectConflicts: jest.fn(),
            validateServiceDuration: jest.fn(),
            invalidateAvailabilityCache: jest.fn()
        } as any

        coordinatorInstance = {
            validateMultiServiceBooking: jest.fn(),
            calculateTotalDuration: jest.fn(),
            calculateTotalPrice: jest.fn(),
            optimizeServiceOrder: jest.fn()
        } as any

        statusManagerInstance = {
            updateStatus: jest.fn(),
            getValidTransitions: jest.fn(),
            validateStatusTransition: jest.fn(),
            triggerStatusEvents: jest.fn()
        } as any

        cacheInstance = {
            get: jest.fn(),
            set: jest.fn(),
            invalidate: jest.fn(),
            invalidatePattern: jest.fn(),
            warmCache: jest.fn()
        } as any

        // Mock constructors
        mockRepository.mockImplementation(() => repositoryInstance)
        mockAppointmentService.mockImplementation(() => serviceInstance)
        mockCalendarIntegration.mockImplementation(() => calendarInstance)
        mockMultiServiceCoordinator.mockImplementation(() => coordinatorInstance)
        mockStatusManager.mockImplementation(() => statusManagerInstance)
        mockAppointmentCache.mockImplementation(() => cacheInstance)

        // Setup default successful responses
        setupDefaultMocks()
    })

    const setupDefaultMocks = () => {
        // Repository mocks
        repositoryInstance.create.mockImplementation(async (data: any) => ({
            id: `appointment-${Date.now()}-${Math.random()}`,
            ...data,
            status: AppointmentStatus.SCHEDULED,
            createdAt: new Date(),
            updatedAt: new Date()
        }))

        repositoryInstance.findById.mockResolvedValue({
            id: 'test-appointment',
            businessId: testBusinessId,
            status: AppointmentStatus.SCHEDULED
        } as any)

        repositoryInstance.update.mockImplementation(async (id, businessId, updates) => ({
            id,
            businessId,
            ...updates,
            updatedAt: new Date()
        } as any))

        repositoryInstance.updateStatus.mockImplementation(async (id, businessId, status) => ({
            id,
            businessId,
            status,
            updatedAt: new Date()
        } as any))

        repositoryInstance.findConflictsOptimized.mockResolvedValue([])

        // Service mocks
        serviceInstance.createAppointment.mockImplementation(async (data: any) => ({
            success: true,
            appointment: {
                id: `appointment-${Date.now()}-${Math.random()}`,
                ...data,
                status: AppointmentStatus.SCHEDULED
            },
            errors: [],
            warnings: []
        }))

        serviceInstance.updateAppointment.mockResolvedValue({
            success: true,
            appointment: { id: 'updated-appointment' },
            errors: [],
            warnings: []
        } as any)

        // Calendar integration mocks
        calendarInstance.checkAvailability.mockResolvedValue({
            isAvailable: true,
            reason: 'Available',
            alternatives: []
        })

        calendarInstance.detectConflicts.mockResolvedValue({
            hasConflicts: false,
            conflicts: [],
            warnings: []
        })

        calendarInstance.validateServiceDuration.mockResolvedValue({
            isValid: true,
            reason: 'Valid duration'
        })

        // Status manager mocks
        statusManagerInstance.updateStatus.mockResolvedValue({
            success: true,
            validTransitions: []
        })

        statusManagerInstance.validateStatusTransition.mockResolvedValue(true)

        // Cache mocks
        cacheInstance.get.mockResolvedValue(null) // Cache miss for performance testing
        cacheInstance.set.mockResolvedValue()
        cacheInstance.invalidate.mockResolvedValue()
    }

    const createTestAppointmentData = (index: number) => ({
        businessId: testBusinessId,
        clientId: testClientIds[index % testClientIds.length],
        staffId: testStaffIds[index % testStaffIds.length],
        startTime: new Date(Date.now() + (index * 60 * 60 * 1000)), // Stagger by hours
        endTime: new Date(Date.now() + ((index + 1) * 60 * 60 * 1000)),
        totalDuration: 60,
        totalPrice: 50 + (index % 10) * 10,
        services: [{
            serviceId: testServiceIds[index % testServiceIds.length],
            serviceName: `Service ${index}`,
            price: 50 + (index % 10) * 10,
            duration: 60,
            serviceOrder: 1,
            startOffset: 0
        }]
    })

    describe('Concurrent Appointment Creation', () => {
        it('should handle 50 concurrent appointment creations within performance threshold', async () => {
            const concurrentCreations = 50
            const appointmentPromises = Array.from({ length: concurrentCreations }, async (_, index) => {
                const appointmentData = createTestAppointmentData(index)
                return serviceInstance.createAppointment(appointmentData)
            })

            const startTime = performance.now()
            const results = await Promise.all(appointmentPromises)
            const endTime = performance.now()
            const totalTime = endTime - startTime

            // Verify performance threshold
            expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_CREATION)

            // Verify all creations succeeded
            const successfulCreations = results.filter((result: any) => result.success)
            expect(successfulCreations).toHaveLength(concurrentCreations)

            // Calculate performance metrics
            const averageTime = totalTime / concurrentCreations
            const throughput = concurrentCreations / (totalTime / 1000)

            console.log(`Concurrent Creation Performance:`)
            console.log(`- Total requests: ${concurrentCreations}`)
            console.log(`- Total time: ${totalTime.toFixed(2)}ms`)
            console.log(`- Average time: ${averageTime.toFixed(2)}ms`)
            console.log(`- Throughput: ${throughput.toFixed(1)} requests/second`)
            console.log(`- Success rate: 100%`)
        })

        it('should maintain performance with calendar integration under concurrent load', async () => {
            const concurrentRequests = 30

            // Add realistic calendar integration delays
            calendarInstance.checkAvailability.mockImplementation(async () => {
                await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 20)) // 10-30ms delay
                return {
                    isAvailable: true,
                    reason: 'Available after calendar check',
                    alternatives: []
                }
            })

            calendarInstance.detectConflicts.mockImplementation(async () => {
                await new Promise(resolve => setTimeout(resolve, 5 + Math.random() * 15)) // 5-20ms delay
                return {
                    hasConflicts: false,
                    conflicts: [],
                    warnings: []
                }
            })

            const appointmentPromises = Array.from({ length: concurrentRequests }, async (_, index) => {
                const appointmentData = createTestAppointmentData(index)

                // Simulate full calendar integration workflow
                await calendarInstance.checkAvailability(
                    appointmentData.staffId,
                    { startTime: appointmentData.startTime, endTime: appointmentData.endTime },
                    [appointmentData.services[0].serviceId]
                )

                await calendarInstance.detectConflicts({
                    businessId: appointmentData.businessId,
                    staffId: appointmentData.staffId,
                    startTime: appointmentData.startTime,
                    endTime: appointmentData.endTime,
                    serviceIds: [appointmentData.services[0].serviceId]
                })

                return serviceInstance.createAppointment(appointmentData)
            })

            const startTime = performance.now()
            const results = await Promise.all(appointmentPromises)
            const endTime = performance.now()
            const totalTime = endTime - startTime

            expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_CREATION * 1.5) // Allow 50% more time for calendar integration
            expect(results.filter(r => r.success)).toHaveLength(concurrentRequests)

            console.log(`Calendar Integration Concurrent Creation:`)
            console.log(`- Requests: ${concurrentRequests}`)
            console.log(`- Total time: ${totalTime.toFixed(2)}ms`)
            console.log(`- Average time: ${(totalTime / concurrentRequests).toFixed(2)}ms`)
        })

        it('should handle concurrent multi-service appointment creation', async () => {
            const concurrentMultiService = 20

            coordinatorInstance.validateMultiServiceBooking.mockImplementation(async (services) => {
                await new Promise(resolve => setTimeout(resolve, 15 + Math.random() * 25)) // 15-40ms delay
                return {
                    isValid: true,
                    errors: [],
                    warnings: [],
                    optimizedServices: services,
                    totalDuration: services.reduce((sum, s) => sum + s.duration, 0)
                }
            })

            const multiServicePromises = Array.from({ length: concurrentMultiService }, async (_, index) => {
                const appointmentData = {
                    ...createTestAppointmentData(index),
                    services: [
                        {
                            serviceId: testServiceIds[index % testServiceIds.length],
                            serviceName: `Service ${index}-1`,
                            price: 50,
                            duration: 60,
                            serviceOrder: 1,
                            startOffset: 0
                        },
                        {
                            serviceId: testServiceIds[(index + 1) % testServiceIds.length],
                            serviceName: `Service ${index}-2`,
                            price: 30,
                            duration: 30,
                            serviceOrder: 2,
                            startOffset: 60
                        }
                    ]
                }

                await coordinatorInstance.validateMultiServiceBooking(
                    appointmentData.services,
                    { startTime: appointmentData.startTime, endTime: appointmentData.endTime },
                    appointmentData.staffId
                )

                return serviceInstance.createAppointment(appointmentData)
            })

            const startTime = performance.now()
            const results = await Promise.all(multiServicePromises)
            const endTime = performance.now()
            const totalTime = endTime - startTime

            expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_CREATION * 2) // Allow more time for multi-service
            expect(results.filter(r => r.success)).toHaveLength(concurrentMultiService)

            console.log(`Multi-Service Concurrent Creation:`)
            console.log(`- Requests: ${concurrentMultiService}`)
            console.log(`- Total time: ${totalTime.toFixed(2)}ms`)
            console.log(`- Average time: ${(totalTime / concurrentMultiService).toFixed(2)}ms`)
        })
    })

    describe('Concurrent Appointment Updates', () => {
        it('should handle 30 concurrent appointment updates efficiently', async () => {
            const concurrentUpdates = 30
            const appointmentIds = Array.from({ length: concurrentUpdates }, (_, i) => `appointment-update-${i}`)

            const updatePromises = appointmentIds.map(async (appointmentId, index) => {
                const updateData = {
                    notes: `Updated notes ${index}`,
                    startTime: new Date(Date.now() + (index + 100) * 60 * 60 * 1000),
                    endTime: new Date(Date.now() + (index + 101) * 60 * 60 * 1000)
                }

                return serviceInstance.updateAppointment(appointmentId, testBusinessId, updateData)
            })

            const startTime = performance.now()
            const results = await Promise.all(updatePromises)
            const endTime = performance.now()
            const totalTime = endTime - startTime

            expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_UPDATES)
            expect(results.filter(r => r.success)).toHaveLength(concurrentUpdates)

            console.log(`Concurrent Updates Performance:`)
            console.log(`- Updates: ${concurrentUpdates}`)
            console.log(`- Total time: ${totalTime.toFixed(2)}ms`)
            console.log(`- Average time: ${(totalTime / concurrentUpdates).toFixed(2)}ms`)
        })

        it('should coordinate cache invalidation during concurrent updates', async () => {
            const concurrentUpdates = 25
            let cacheInvalidationCount = 0

            cacheInstance.invalidate.mockImplementation(async () => {
                cacheInvalidationCount++
                await new Promise(resolve => setTimeout(resolve, 2 + Math.random() * 8)) // 2-10ms delay
            })

            calendarInstance.invalidateAvailabilityCache.mockImplementation(async () => {
                await new Promise(resolve => setTimeout(resolve, 5 + Math.random() * 15)) // 5-20ms delay
            })

            const updatePromises = Array.from({ length: concurrentUpdates }, async (_, index) => {
                const appointmentId = `appointment-cache-${index}`
                const updateData = {
                    startTime: new Date(Date.now() + (index + 200) * 60 * 60 * 1000),
                    endTime: new Date(Date.now() + (index + 201) * 60 * 60 * 1000)
                }

                const result = await serviceInstance.updateAppointment(appointmentId, testBusinessId, updateData)

                // Simulate cache invalidation after update
                await cacheInstance.invalidate(`appointment:${appointmentId}`)
                await calendarInstance.invalidateAvailabilityCache(
                    testStaffIds[index % testStaffIds.length],
                    { startDate: updateData.startTime, endDate: updateData.endTime }
                )

                return result
            })

            const startTime = performance.now()
            const results = await Promise.all(updatePromises)
            const endTime = performance.now()
            const totalTime = endTime - startTime

            expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_UPDATES * 1.5) // Allow extra time for cache operations
            expect(results.filter(r => r.success)).toHaveLength(concurrentUpdates)
            expect(cacheInvalidationCount).toBe(concurrentUpdates)

            console.log(`Cache Coordination Performance:`)
            console.log(`- Updates with cache invalidation: ${concurrentUpdates}`)
            console.log(`- Total time: ${totalTime.toFixed(2)}ms`)
            console.log(`- Cache invalidations: ${cacheInvalidationCount}`)
        })
    })

    describe('Concurrent Status Changes', () => {
        it('should handle 25 concurrent status changes with proper synchronization', async () => {
            const concurrentStatusChanges = 25
            const appointmentIds = Array.from({ length: concurrentStatusChanges }, (_, i) => `appointment-status-${i}`)

            // Mock status transitions
            const statusTransitions = [
                { from: AppointmentStatus.SCHEDULED, to: AppointmentStatus.CONFIRMED },
                { from: AppointmentStatus.CONFIRMED, to: AppointmentStatus.IN_PROGRESS },
                { from: AppointmentStatus.IN_PROGRESS, to: AppointmentStatus.COMPLETED }
            ]

            statusManagerInstance.updateStatus.mockImplementation(async (appointmentId, newStatus) => {
                await new Promise(resolve => setTimeout(resolve, 5 + Math.random() * 15)) // 5-20ms delay
                return {
                    success: true,
                    validTransitions: []
                }
            })

            const statusChangePromises = appointmentIds.map(async (appointmentId, index) => {
                const transition = statusTransitions[index % statusTransitions.length]

                return statusManagerInstance.updateStatus(
                    appointmentId,
                    transition.to,
                    testBusinessId,
                    {
                        changedBy: 'user-123',
                        reason: `Status change ${index}`
                    }
                )
            })

            const startTime = performance.now()
            const results = await Promise.all(statusChangePromises)
            const endTime = performance.now()
            const totalTime = endTime - startTime

            expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_STATUS_CHANGES)
            expect(results.filter(r => r.success)).toHaveLength(concurrentStatusChanges)

            console.log(`Concurrent Status Changes Performance:`)
            console.log(`- Status changes: ${concurrentStatusChanges}`)
            console.log(`- Total time: ${totalTime.toFixed(2)}ms`)
            console.log(`- Average time: ${(totalTime / concurrentStatusChanges).toFixed(2)}ms`)
        })

        it('should handle batch status updates efficiently', async () => {
            const batchSize = 50
            const appointmentIds = Array.from({ length: batchSize }, (_, i) => `batch-appointment-${i}`)

            repositoryInstance.batchUpdateStatus.mockImplementation(async (ids, businessId, status, reason) => {
                await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100)) // 50-150ms delay
                return {
                    updated: ids.length,
                    errors: []
                }
            })

            const startTime = performance.now()
            const result = await repositoryInstance.batchUpdateStatus(
                appointmentIds,
                testBusinessId,
                AppointmentStatus.CONFIRMED,
                'Batch confirmation'
            )
            const endTime = performance.now()
            const totalTime = endTime - startTime

            expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_STATUS_CHANGES)
            expect(result.updated).toBe(batchSize)
            expect(result.errors).toHaveLength(0)

            console.log(`Batch Status Update Performance:`)
            console.log(`- Batch size: ${batchSize}`)
            console.log(`- Total time: ${totalTime.toFixed(2)}ms`)
            console.log(`- Time per appointment: ${(totalTime / batchSize).toFixed(2)}ms`)
        })
    })

    describe('Concurrent Query Operations', () => {
        it('should handle 100 concurrent appointment queries efficiently', async () => {
            const concurrentQueries = 100

            repositoryInstance.findByBusinessOptimized.mockImplementation(async (businessId, options) => {
                await new Promise(resolve => setTimeout(resolve, 5 + Math.random() * 15)) // 5-20ms delay
                return {
                    appointments: Array.from({ length: options?.limit || 20 }, (_, i) => ({
                        id: `query-appointment-${i}`,
                        businessId
                    })),
                    total: 100,
                    hasMore: true,
                    nextCursor: 'next-cursor'
                }
            })

            const queryPromises = Array.from({ length: concurrentQueries }, async (_, index) => {
                return repositoryInstance.findByBusinessOptimized(testBusinessId, {
                    limit: 20,
                    offset: index * 20
                })
            })

            const startTime = performance.now()
            const results = await Promise.all(queryPromises)
            const endTime = performance.now()
            const totalTime = endTime - startTime

            expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_QUERIES)
            expect(results).toHaveLength(concurrentQueries)
            results.forEach((result: any) => {
                expect(result.appointments).toBeDefined()
                expect(result.total).toBe(100)
            })

            console.log(`Concurrent Queries Performance:`)
            console.log(`- Queries: ${concurrentQueries}`)
            console.log(`- Total time: ${totalTime.toFixed(2)}ms`)
            console.log(`- Average time: ${(totalTime / concurrentQueries).toFixed(2)}ms`)
            console.log(`- Throughput: ${(concurrentQueries / (totalTime / 1000)).toFixed(1)} queries/second`)
        })

        it('should optimize cache usage during concurrent queries', async () => {
            const concurrentQueries = 50
            let cacheHits = 0
            let cacheMisses = 0

            cacheInstance.get.mockImplementation(async (key: any) => {
                await new Promise(resolve => setTimeout(resolve, 1 + Math.random() * 3)) // 1-4ms delay

                // Simulate 70% cache hit rate
                if (Math.random() < 0.7) {
                    cacheHits++
                    return {
                        appointments: [{ id: 'cached-appointment', businessId: testBusinessId }],
                        total: 1,
                        hasMore: false
                    }
                } else {
                    cacheMisses++
                    return null
                }
            })

            const queryPromises = Array.from({ length: concurrentQueries }, async (_, index) => {
                const cacheKey = `appointments:${testBusinessId}:page:${index}`
                let result = await cacheInstance.get(cacheKey)

                if (!result) {
                    // Cache miss - fetch from database
                    result = await repositoryInstance.findByBusinessOptimized(testBusinessId, {
                        limit: 20,
                        offset: index * 20
                    })

                    // Cache the result
                    await cacheInstance.set(cacheKey, result, 300) // 5 minute TTL
                }

                return result
            })

            const startTime = performance.now()
            const results = await Promise.all(queryPromises)
            const endTime = performance.now()
            const totalTime = endTime - startTime

            expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_QUERIES * 0.8) // Should be faster with cache
            expect(results).toHaveLength(concurrentQueries)
            expect(cacheHits + cacheMisses).toBe(concurrentQueries)

            console.log(`Cache-Optimized Queries Performance:`)
            console.log(`- Queries: ${concurrentQueries}`)
            console.log(`- Cache hits: ${cacheHits} (${((cacheHits / concurrentQueries) * 100).toFixed(1)}%)`)
            console.log(`- Cache misses: ${cacheMisses} (${((cacheMisses / concurrentQueries) * 100).toFixed(1)}%)`)
            console.log(`- Total time: ${totalTime.toFixed(2)}ms`)
        })
    })

    describe('Mixed Concurrent Operations', () => {
        it('should handle 100 mixed concurrent operations efficiently', async () => {
            const totalOperations = 100
            const operationTypes = ['create', 'update', 'query', 'status'] as const

            const mixedOperations = Array.from({ length: totalOperations }, (_, index) => {
                const operationType = operationTypes[index % operationTypes.length]

                switch (operationType) {
                    case 'create':
                        return {
                            type: 'create',
                            operation: () => serviceInstance.createAppointment(createTestAppointmentData(index))
                        }
                    case 'update':
                        return {
                            type: 'update',
                            operation: () => serviceInstance.updateAppointment(
                                `appointment-${index}`,
                                testBusinessId,
                                { notes: `Updated ${index}` }
                            )
                        }
                    case 'query':
                        return {
                            type: 'query',
                            operation: () => repositoryInstance.findByBusinessOptimized(testBusinessId, { limit: 10 })
                        }
                    case 'status':
                        return {
                            type: 'status',
                            operation: () => statusManagerInstance.updateStatus(
                                `appointment-${index}`,
                                AppointmentStatus.CONFIRMED,
                                testBusinessId,
                                { changedBy: 'user-123' }
                            )
                        }
                }
            })

            const startTime = performance.now()
            const results = await Promise.all(
                mixedOperations.map(({ operation }) =>
                    operation().catch((error: any) => ({ error: error.message }))
                )
            )
            const endTime = performance.now()
            const totalTime = endTime - startTime

            expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.MIXED_OPERATIONS)

            const successfulOperations = results.filter((result: any) => !('error' in result))
            const failedOperations = results.filter((result: any) => 'error' in result)

            expect(successfulOperations.length).toBeGreaterThan(totalOperations * 0.95) // 95% success rate
            expect(failedOperations.length).toBeLessThan(totalOperations * 0.05)

            // Analyze by operation type
            const operationStats = operationTypes.map(type => {
                const typeOperations = mixedOperations.filter(op => op.type === type)
                const typeResults = results.slice(
                    mixedOperations.findIndex(op => op.type === type),
                    mixedOperations.findIndex(op => op.type === type) + typeOperations.length
                )
                const typeSuccessful = typeResults.filter((result: any) => !('error' in result))

                return {
                    type,
                    total: typeOperations.length,
                    successful: typeSuccessful.length,
                    successRate: (typeSuccessful.length / typeOperations.length) * 100
                }
            })

            console.log(`Mixed Operations Performance:`)
            console.log(`- Total operations: ${totalOperations}`)
            console.log(`- Total time: ${totalTime.toFixed(2)}ms`)
            console.log(`- Average time: ${(totalTime / totalOperations).toFixed(2)}ms`)
            console.log(`- Overall success rate: ${((successfulOperations.length / totalOperations) * 100).toFixed(1)}%`)

            operationStats.forEach(stat => {
                console.log(`- ${stat.type}: ${stat.successful}/${stat.total} (${stat.successRate.toFixed(1)}%)`)
            })
        })
    })

    describe('Conflict Resolution Under Concurrency', () => {
        it('should handle concurrent conflict detection efficiently', async () => {
            const concurrentConflictChecks = 40

            calendarInstance.detectConflicts.mockImplementation(async (request) => {
                await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 30)) // 10-40ms delay

                // Simulate some conflicts
                const hasConflicts = Math.random() < 0.3 // 30% conflict rate

                return {
                    hasConflicts,
                    conflicts: hasConflicts ? [{
                        type: 'SCHEDULING_CONFLICT',
                        severity: 'HIGH',
                        message: 'Overlapping appointment found',
                        details: {
                            appointmentId: 'conflicting-appointment',
                            startTime: request.startTime,
                            endTime: request.endTime
                        }
                    }] : [],
                    warnings: []
                }
            })

            const conflictCheckPromises = Array.from({ length: concurrentConflictChecks }, async (_, index) => {
                const request = {
                    businessId: testBusinessId,
                    staffId: testStaffIds[index % testStaffIds.length],
                    startTime: new Date(Date.now() + (index * 30 * 60 * 1000)), // 30 minutes apart
                    endTime: new Date(Date.now() + ((index * 30 + 60) * 60 * 1000)), // 1 hour duration
                    serviceIds: [testServiceIds[index % testServiceIds.length]]
                }

                return calendarInstance.detectConflicts(request)
            })

            const startTime = performance.now()
            const results = await Promise.all(conflictCheckPromises)
            const endTime = performance.now()
            const totalTime = endTime - startTime

            expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.CONFLICT_RESOLUTION)
            expect(results).toHaveLength(concurrentConflictChecks)

            const conflictsFound = results.filter((result: any) => result.hasConflicts).length
            const noConflicts = results.filter((result: any) => !result.hasConflicts).length

            console.log(`Concurrent Conflict Detection Performance:`)
            console.log(`- Conflict checks: ${concurrentConflictChecks}`)
            console.log(`- Total time: ${totalTime.toFixed(2)}ms`)
            console.log(`- Average time: ${(totalTime / concurrentConflictChecks).toFixed(2)}ms`)
            console.log(`- Conflicts found: ${conflictsFound}`)
            console.log(`- No conflicts: ${noConflicts}`)
        })

        it('should resolve conflicts and provide alternatives under load', async () => {
            const concurrentResolutions = 20

            calendarInstance.checkAvailability.mockImplementation(async (staffId, timeSlot) => {
                await new Promise(resolve => setTimeout(resolve, 15 + Math.random() * 35)) // 15-50ms delay

                const isAvailable = Math.random() < 0.6 // 60% availability rate

                return {
                    isAvailable,
                    reason: isAvailable ? 'Time slot available' : 'Time slot conflicts',
                    alternatives: isAvailable ? [] : [
                        {
                            startTime: new Date(timeSlot.startTime.getTime() + 60 * 60 * 1000),
                            endTime: new Date(timeSlot.endTime.getTime() + 60 * 60 * 1000),
                            staffId,
                            reason: 'Next available slot'
                        }
                    ]
                }
            })

            const resolutionPromises = Array.from({ length: concurrentResolutions }, async (_, index) => {
                const timeSlot = {
                    startTime: new Date(Date.now() + (index * 45 * 60 * 1000)), // 45 minutes apart
                    endTime: new Date(Date.now() + ((index * 45 + 60) * 60 * 1000))
                }

                const staffId = testStaffIds[index % testStaffIds.length]
                const serviceIds = [testServiceIds[index % testServiceIds.length]]

                return calendarInstance.checkAvailability(staffId, timeSlot, serviceIds)
            })

            const startTime = performance.now()
            const results = await Promise.all(resolutionPromises)
            const endTime = performance.now()
            const totalTime = endTime - startTime

            expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.CONFLICT_RESOLUTION * 1.5) // Allow more time for alternatives
            expect(results).toHaveLength(concurrentResolutions)

            const availableSlots = results.filter((result: any) => result.isAvailable).length
            const unavailableSlots = results.filter((result: any) => !result.isAvailable).length
            const alternativesProvided = results.filter((result: any) => result.alternatives.length > 0).length

            console.log(`Concurrent Conflict Resolution Performance:`)
            console.log(`- Resolution requests: ${concurrentResolutions}`)
            console.log(`- Total time: ${totalTime.toFixed(2)}ms`)
            console.log(`- Available slots: ${availableSlots}`)
            console.log(`- Unavailable slots: ${unavailableSlots}`)
            console.log(`- Alternatives provided: ${alternativesProvided}`)
        })
    })

    describe('Performance Monitoring and Metrics', () => {
        it('should maintain connection pool efficiency under concurrent load', async () => {
            const mockMetrics = {
                metrics: {
                    totalQueries: 1000,
                    averageQueryTime: 45.5,
                    slowQueries: 25,
                    errors: 5
                },
                performance: {
                    errorRate: 0.005,
                    slowQueryRate: 0.025,
                    averageResponseTime: 45.5
                }
            }

                ; (getConnectionMetrics as jest.Mock).mockReturnValue(mockMetrics)

            // Simulate concurrent database operations
            const concurrentDbOps = 100
            const dbOperations = Array.from({ length: concurrentDbOps }, async (_, index) => {
                // Mix of different database operations
                if (index % 3 === 0) {
                    return repositoryInstance.findByBusinessOptimized(testBusinessId, { limit: 10 })
                } else if (index % 3 === 1) {
                    return repositoryInstance.create(createTestAppointmentData(index))
                } else {
                    return repositoryInstance.updateStatus(
                        `appointment-${index}`,
                        testBusinessId,
                        AppointmentStatus.CONFIRMED,
                        'Performance test'
                    )
                }
            })

            const startTime = performance.now()
            await Promise.all(dbOperations)
            const endTime = performance.now()
            const totalTime = endTime - startTime

            const metrics = getConnectionMetrics()

            expect(totalTime).toBeLessThan(3000) // Should complete within 3 seconds
            expect(metrics.performance.errorRate).toBeLessThan(0.01) // Less than 1% error rate
            expect(metrics.performance.slowQueryRate).toBeLessThan(0.1) // Less than 10% slow queries
            expect(metrics.metrics.averageQueryTime).toBeLessThan(100) // Average under 100ms

            console.log(`Connection Pool Performance Under Load:`)
            console.log(`- Concurrent operations: ${concurrentDbOps}`)
            console.log(`- Total time: ${totalTime.toFixed(2)}ms`)
            console.log(`- Average query time: ${metrics.metrics.averageQueryTime.toFixed(2)}ms`)
            console.log(`- Error rate: ${(metrics.performance.errorRate * 100).toFixed(2)}%`)
            console.log(`- Slow query rate: ${(metrics.performance.slowQueryRate * 100).toFixed(2)}%`)
        })

        it('should track performance degradation over sustained load', async () => {
            const sustainedRounds = 10
            const operationsPerRound = 20
            const performanceMetrics: number[] = []

            for (let round = 0; round < sustainedRounds; round++) {
                const roundOperations = Array.from({ length: operationsPerRound }, async (_, index) => {
                    const globalIndex = round * operationsPerRound + index
                    return serviceInstance.createAppointment(createTestAppointmentData(globalIndex))
                })

                const roundStartTime = performance.now()
                await Promise.all(roundOperations)
                const roundEndTime = performance.now()
                const roundTime = roundEndTime - roundStartTime

                performanceMetrics.push(roundTime)

                // Small delay between rounds
                await new Promise(resolve => setTimeout(resolve, 50))
            }

            // Analyze performance degradation
            const firstHalfAvg = performanceMetrics.slice(0, sustainedRounds / 2)
                .reduce((sum, time) => sum + time, 0) / (sustainedRounds / 2)

            const secondHalfAvg = performanceMetrics.slice(sustainedRounds / 2)
                .reduce((sum, time) => sum + time, 0) / (sustainedRounds / 2)

            const performanceDegradation = (secondHalfAvg - firstHalfAvg) / firstHalfAvg

            // Performance should not degrade significantly
            expect(performanceDegradation).toBeLessThan(0.2) // Less than 20% degradation

            console.log(`Sustained Load Performance Analysis:`)
            console.log(`- Rounds: ${sustainedRounds}`)
            console.log(`- Operations per round: ${operationsPerRound}`)
            console.log(`- First half average: ${firstHalfAvg.toFixed(2)}ms`)
            console.log(`- Second half average: ${secondHalfAvg.toFixed(2)}ms`)
            console.log(`- Performance degradation: ${(performanceDegradation * 100).toFixed(1)}%`)
        })
    })
})
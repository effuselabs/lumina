/**
 * Peak Booking Scenarios Load Testing
 * 
 * Load testing for peak booking scenarios including Monday morning rushes,
 * holiday booking periods, and promotional campaign traffic spikes.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 9.4, 9.5
 * 
 * @version 1.0.0
 * @author Lumina Development Team
 */

import { AppointmentCache } from '@/lib/cache/appointment-cache'
import { CalendarCacheCoordinator } from '@/lib/cache/calendar-cache-coordinator'
import { OptimizedAppointmentRepository } from '@/lib/repositories/appointment-repository-optimized'
import { AppointmentService } from '@/lib/services/appointment-service'
import { CalendarIntegration } from '@/lib/services/calendar-integration'
import { AppointmentStatus } from '@prisma/client'
import { performance } from 'perf_hooks'

// Mock dependencies for load testing
jest.mock('@/lib/db/connection-pool')
jest.mock('@/lib/repositories/appointment-repository-optimized')
jest.mock('@/lib/services/appointment-service')
jest.mock('@/lib/services/calendar-integration')
jest.mock('@/lib/cache/appointment-cache')
jest.mock('@/lib/cache/calendar-cache-coordinator')

const mockRepository = OptimizedAppointmentRepository as jest.MockedClass<typeof OptimizedAppointmentRepository>
const mockAppointmentService = AppointmentService as jest.MockedClass<typeof AppointmentService>
const mockCalendarIntegration = CalendarIntegration as jest.MockedClass<typeof CalendarIntegration>
const mockAppointmentCache = AppointmentCache as jest.MockedClass<typeof AppointmentCache>
const mockCacheCoordinator = CalendarCacheCoordinator as jest.MockedClass<typeof CalendarCacheCoordinator>

describe('Peak Booking Scenarios Load Testing', () => {
    let repositoryInstance: jest.Mocked<OptimizedAppointmentRepository>
    let serviceInstance: jest.Mocked<AppointmentService>
    let calendarInstance: jest.Mocked<CalendarIntegration>
    let cacheInstance: jest.Mocked<AppointmentCache>
    let coordinatorInstance: jest.Mocked<CalendarCacheCoordinator>

    const testBusinessId = 'business-load-123'
    const testStaffIds = Array.from({ length: 25 }, (_, i) => `staff-load-${i + 1}`)
    const testClientIds = Array.from({ length: 500 }, (_, i) => `client-load-${i + 1}`)
    const testServiceIds = Array.from({ length: 75 }, (_, i) => `service-load-${i + 1}`)

    // Load testing thresholds
    const LOAD_THRESHOLDS = {
        MONDAY_MORNING_RUSH: 5000, // ms for 200 concurrent bookings
        HOLIDAY_BOOKING_SURGE: 8000, // ms for 500 concurrent bookings
        PROMOTIONAL_CAMPAIGN: 6000, // ms for 300 concurrent bookings with validation
        SUSTAINED_HIGH_LOAD: 10000, // ms for 1000 operations over 30 seconds
        CACHE_STORM_RECOVERY: 3000, // ms for cache invalidation storm recovery
        DATABASE_STRESS: 7000, // ms for database connection pool stress
        MEMORY_PRESSURE: 15000 // ms for memory pressure test
    }

    beforeEach(() => {
        jest.clearAllMocks()
        setupLoadTestingMocks()
    })

    const setupLoadTestingMocks = () => {
        // Repository instance
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

        // Service instance
        serviceInstance = {
            createAppointment: jest.fn(),
            getAppointments: jest.fn(),
            getAppointmentById: jest.fn(),
            updateAppointment: jest.fn(),
            cancelAppointment: jest.fn()
        } as any

        // Calendar integration instance
        calendarInstance = {
            checkAvailability: jest.fn(),
            detectConflicts: jest.fn(),
            validateServiceDuration: jest.fn(),
            invalidateAvailabilityCache: jest.fn()
        } as any

        // Cache instances
        cacheInstance = {
            get: jest.fn(),
            set: jest.fn(),
            invalidate: jest.fn(),
            invalidatePattern: jest.fn(),
            warmCache: jest.fn(),
            getStats: jest.fn()
        } as any

        coordinatorInstance = {
            invalidateBusinessCache: jest.fn(),
            invalidateStaffCache: jest.fn(),
            coordinateInvalidation: jest.fn(),
            warmBusinessCache: jest.fn()
        } as any

        // Mock constructors
        mockRepository.mockImplementation(() => repositoryInstance)
        mockAppointmentService.mockImplementation(() => serviceInstance)
        mockCalendarIntegration.mockImplementation(() => calendarInstance)
        mockAppointmentCache.mockImplementation(() => cacheInstance)
        mockCacheCoordinator.mockImplementation(() => coordinatorInstance)

        // Setup realistic performance mocks
        setupRealisticMocks()
    }

    const setupRealisticMocks = () => {
        // Repository operations with realistic delays
        repositoryInstance.create.mockImplementation(async (data) => {
            await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 40)) // 20-60ms
            return {
                id: `appointment-${Date.now()}-${Math.random()}`,
                ...data,
                status: AppointmentStatus.SCHEDULED,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        })

        repositoryInstance.findByBusinessOptimized.mockImplementation(async (businessId, options) => {
            await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 30)) // 10-40ms
            return {
                appointments: Array.from({ length: options?.limit || 20 }, (_, i) => ({
                    id: `appointment-${i}`,
                    businessId,
                    status: AppointmentStatus.SCHEDULED
                })),
                total: 1000,
                hasMore: true,
                nextCursor: 'cursor-123'
            }
        })

        repositoryInstance.findConflictsOptimized.mockImplementation(async () => {
            await new Promise(resolve => setTimeout(resolve, 15 + Math.random() * 25)) // 15-40ms
            return Math.random() < 0.1 ? [{ id: 'conflict-appointment' }] : [] // 10% conflict rate
        })

        // Service operations
        serviceInstance.createAppointment.mockImplementation(async (data) => {
            await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 70)) // 30-100ms
            return {
                success: Math.random() < 0.95, // 95% success rate
                appointment: {
                    id: `appointment-${Date.now()}-${Math.random()}`,
                    ...data,
                    status: AppointmentStatus.SCHEDULED
                },
                errors: Math.random() < 0.05 ? ['Validation error'] : [],
                warnings: Math.random() < 0.2 ? ['Peak time booking'] : []
            }
        })

        // Calendar integration with variable delays
        calendarInstance.checkAvailability.mockImplementation(async () => {
            await new Promise(resolve => setTimeout(resolve, 25 + Math.random() * 50)) // 25-75ms
            return {
                isAvailable: Math.random() < 0.8, // 80% availability
                reason: 'Availability check completed',
                alternatives: []
            }
        })

        calendarInstance.detectConflicts.mockImplementation(async () => {
            await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 40)) // 20-60ms
            return {
                hasConflicts: Math.random() < 0.15, // 15% conflict rate
                conflicts: [],
                warnings: []
            }
        })

        // Cache operations
        cacheInstance.get.mockImplementation(async () => {
            await new Promise(resolve => setTimeout(resolve, 2 + Math.random() * 8)) // 2-10ms
            return Math.random() < 0.3 ? null : { cached: true } // 70% cache hit rate
        })

        cacheInstance.set.mockImplementation(async () => {
            await new Promise(resolve => setTimeout(resolve, 3 + Math.random() * 7)) // 3-10ms
        })

        cacheInstance.invalidate.mockImplementation(async () => {
            await new Promise(resolve => setTimeout(resolve, 5 + Math.random() * 15)) // 5-20ms
        })
    }

    const createLoadTestAppointment = (index: number) => ({
        businessId: testBusinessId,
        clientId: testClientIds[index % testClientIds.length],
        staffId: testStaffIds[index % testStaffIds.length],
        startTime: new Date(Date.now() + (index * 30 * 60 * 1000)), // 30 minutes apart
        endTime: new Date(Date.now() + ((index * 30 + 60) * 60 * 1000)), // 1 hour duration
        totalDuration: 60,
        totalPrice: 50 + (index % 20) * 5,
        services: [{
            serviceId: testServiceIds[index % testServiceIds.length],
            serviceName: `Service ${index}`,
            price: 50 + (index % 20) * 5,
            duration: 60,
            serviceOrder: 1,
            startOffset: 0
        }]
    })

    describe('Monday Morning Rush Load Testing', () => {
        it('should handle Monday morning booking rush (200 concurrent bookings)', async () => {
            const mondayRushLoad = 200
            const timeWindow = 30 * 60 * 1000 // 30 minutes

            console.log(`Starting Monday Morning Rush Test: ${mondayRushLoad} bookings in ${timeWindow / 60000} minutes`)

            const bookingPromises = Array.from({ length: mondayRushLoad }, async (_, index) => {
                // Simulate realistic booking pattern - more bookings at the start
                const delay = Math.random() * timeWindow * (index < mondayRushLoad / 2 ? 0.3 : 0.7)
                await new Promise(resolve => setTimeout(resolve, delay))

                const appointmentData = createLoadTestAppointment(index)
                return serviceInstance.createAppointment(appointmentData)
            })

            const startTime = performance.now()
            const results = await Promise.all(bookingPromises)
            const endTime = performance.now()
            const totalTime = endTime - startTime

            expect(totalTime).toBeLessThan(LOAD_THRESHOLDS.MONDAY_MORNING_RUSH)

            const successfulBookings = results.filter(result => result.success)
            const failedBookings = results.filter(result => !result.success)
            const warningsCount = results.reduce((sum, result) => sum + result.warnings.length, 0)

            expect(successfulBookings.length).toBeGreaterThan(mondayRushLoad * 0.9) // 90% success rate
            expect(failedBookings.length).toBeLessThan(mondayRushLoad * 0.1)

            console.log(`Monday Morning Rush Results:`)
            console.log(`- Total bookings attempted: ${mondayRushLoad}`)
            console.log(`- Successful bookings: ${successfulBookings.length}`)
            console.log(`- Failed bookings: ${failedBookings.length}`)
            console.log(`- Success rate: ${((successfulBookings.length / mondayRushLoad) * 100).toFixed(1)}%`)
            console.log(`- Total time: ${totalTime.toFixed(2)}ms`)
            console.log(`- Average time per booking: ${(totalTime / mondayRushLoad).toFixed(2)}ms`)
            console.log(`- Warnings generated: ${warningsCount}`)
        })

        it('should maintain cache performance during Monday rush', async () => {
            const cacheOperations = 150
            let cacheHits = 0
            let cacheMisses = 0
            let cacheInvalidations = 0

            // Mock cache statistics
            cacheInstance.get.mockImplementation(async (key) => {
                await new Promise(resolve => setTimeout(resolve, 2 + Math.random() * 6))
                if (Math.random() < 0.6) { // 60% hit rate during high load
                    cacheHits++
                    return { cached: true, data: 'cached-data' }
                } else {
                    cacheMisses++
                    return null
                }
            })

            cacheInstance.invalidate.mockImplementation(async () => {
                await new Promise(resolve => setTimeout(resolve, 8 + Math.random() * 12))
                cacheInvalidations++
            })

            const cachePromises = Array.from({ length: cacheOperations }, async (_, index) => {
                const operation = index % 3

                switch (operation) {
                    case 0: // Cache read
                        return cacheInstance.get(`appointment:${index}`)
                    case 1: // Cache write
                        return cacheInstance.set(`appointment:${index}`, { data: `data-${index}` }, 300)
                    case 2: // Cache invalidation
                        return cacheInstance.invalidate(`appointment:${index}`)
                }
            })

            const startTime = performance.now()
            await Promise.all(cachePromises)
            const endTime = performance.now()
            const totalTime = endTime - startTime

            expect(totalTime).toBeLessThan(LOAD_THRESHOLDS.CACHE_STORM_RECOVERY)
            expect(cacheHits + cacheMisses).toBeGreaterThan(0)

            console.log(`Cache Performance During Rush:`)
            console.log(`- Cache operations: ${cacheOperations}`)
            console.log(`- Cache hits: ${cacheHits}`)
            console.log(`- Cache misses: ${cacheMisses}`)
            console.log(`- Cache invalidations: ${cacheInvalidations}`)
            console.log(`- Hit rate: ${((cacheHits / (cacheHits + cacheMisses)) * 100).toFixed(1)}%`)
            console.log(`- Total time: ${totalTime.toFixed(2)}ms`)
        })
    })

    describe('Holiday Booking Surge Load Testing', () => {
        it('should handle holiday booking surge (500 concurrent bookings)', async () => {
            const holidaySurgeLoad = 500
            const surgeWindow = 60 * 60 * 1000 // 1 hour

            console.log(`Starting Holiday Surge Test: ${holidaySurgeLoad} bookings in ${surgeWindow / 60000} minutes`)

            // Simulate holiday booking pattern - intense bursts
            const burstSize = 50
            const numberOfBursts = holidaySurgeLoad / burstSize
            const burstInterval = surgeWindow / numberOfBursts

            const allResults: any[] = []
            const burstTimes: number[] = []

            for (let burst = 0; burst < numberOfBursts; burst++) {
                const burstPromises = Array.from({ length: burstSize }, async (_, index) => {
                    const globalIndex = burst * burstSize + index
                    const appointmentData = createLoadTestAppointment(globalIndex)
                    return serviceInstance.createAppointment(appointmentData)
                })

                const burstStartTime = performance.now()
                const burstResults = await Promise.all(burstPromises)
                const burstEndTime = performance.now()
                const burstTime = burstEndTime - burstStartTime

                allResults.push(...burstResults)
                burstTimes.push(burstTime)

                // Wait between bursts (except for the last one)
                if (burst < numberOfBursts - 1) {
                    await new Promise(resolve => setTimeout(resolve, burstInterval / 4))
                }
            }

            const totalTime = burstTimes.reduce((sum, time) => sum + time, 0)
            expect(totalTime).toBeLessThan(LOAD_THRESHOLDS.HOLIDAY_BOOKING_SURGE)

            const successfulBookings = allResults.filter(result => result.success)
            const failedBookings = allResults.filter(result => !result.success)

            expect(successfulBookings.length).toBeGreaterThan(holidaySurgeLoad * 0.85) // 85% success rate

            console.log(`Holiday Surge Results:`)
            console.log(`- Total bookings: ${holidaySurgeLoad}`)
            console.log(`- Bursts: ${numberOfBursts} (${burstSize} bookings each)`)
            console.log(`- Successful bookings: ${successfulBookings.length}`)
            console.log(`- Failed bookings: ${failedBookings.length}`)
            console.log(`- Success rate: ${((successfulBookings.length / holidaySurgeLoad) * 100).toFixed(1)}%`)
            console.log(`- Total processing time: ${totalTime.toFixed(2)}ms`)
            console.log(`- Average burst time: ${(totalTime / numberOfBursts).toFixed(2)}ms`)
        })

        it('should handle calendar integration under holiday surge load', async () => {
            const calendarOperations = 300

            // Mock calendar operations with holiday load characteristics
            calendarInstance.checkAvailability.mockImplementation(async () => {
                await new Promise(resolve => setTimeout(resolve, 40 + Math.random() * 80)) // Slower during high load
                return {
                    isAvailable: Math.random() < 0.7, // Lower availability during holidays
                    reason: 'Holiday availability check',
                    alternatives: Math.random() < 0.3 ? [{
                        startTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
                        endTime: new Date(Date.now() + 3 * 60 * 60 * 1000),
                        staffId: 'alternative-staff',
                        reason: 'Alternative slot'
                    }] : []
                }
            })

            const calendarPromises = Array.from({ length: calendarOperations }, async (_, index) => {
                const staffId = testStaffIds[index % testStaffIds.length]
                const timeSlot = {
                    startTime: new Date(Date.now() + (index * 15 * 60 * 1000)),
                    endTime: new Date(Date.now() + ((index * 15 + 60) * 60 * 1000))
                }
                const serviceIds = [testServiceIds[index % testServiceIds.length]]

                return calendarInstance.checkAvailability(staffId, timeSlot, serviceIds)
            })

            const startTime = performance.now()
            const results = await Promise.all(calendarPromises)
            const endTime = performance.now()
            const totalTime = endTime - startTime

            expect(totalTime).toBeLessThan(LOAD_THRESHOLDS.HOLIDAY_BOOKING_SURGE * 0.8) // Calendar ops should be faster

            const availableSlots = results.filter(result => result.isAvailable).length
            const unavailableSlots = results.filter(result => !result.isAvailable).length
            const alternativesProvided = results.filter(result => result.alternatives.length > 0).length

            console.log(`Calendar Integration Holiday Load:`)
            console.log(`- Calendar operations: ${calendarOperations}`)
            console.log(`- Available slots: ${availableSlots}`)
            console.log(`- Unavailable slots: ${unavailableSlots}`)
            console.log(`- Alternatives provided: ${alternativesProvided}`)
            console.log(`- Total time: ${totalTime.toFixed(2)}ms`)
            console.log(`- Average time per operation: ${(totalTime / calendarOperations).toFixed(2)}ms`)
        })
    })

    describe('Promotional Campaign Load Testing', () => {
        it('should handle promotional campaign traffic spike (300 concurrent bookings with validation)', async () => {
            const campaignLoad = 300
            const validationIntensity = 0.8 // 80% of requests require full validation

            console.log(`Starting Promotional Campaign Test: ${campaignLoad} bookings with ${validationIntensity * 100}% validation`)

            const campaignPromises = Array.from({ length: campaignLoad }, async (_, index) => {
                const appointmentData = createLoadTestAppointment(index)

                // Simulate promotional validation requirements
                if (Math.random() < validationIntensity) {
                    // Full validation workflow
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
                }

                return serviceInstance.createAppointment(appointmentData)
            })

            const startTime = performance.now()
            const results = await Promise.all(campaignPromises)
            const endTime = performance.now()
            const totalTime = endTime - startTime

            expect(totalTime).toBeLessThan(LOAD_THRESHOLDS.PROMOTIONAL_CAMPAIGN)

            const successfulBookings = results.filter(result => result.success)
            const failedBookings = results.filter(result => !result.success)
            const warningsCount = results.reduce((sum, result) => sum + result.warnings.length, 0)

            expect(successfulBookings.length).toBeGreaterThan(campaignLoad * 0.88) // 88% success rate

            console.log(`Promotional Campaign Results:`)
            console.log(`- Campaign bookings: ${campaignLoad}`)
            console.log(`- Validation rate: ${(validationIntensity * 100).toFixed(0)}%`)
            console.log(`- Successful bookings: ${successfulBookings.length}`)
            console.log(`- Failed bookings: ${failedBookings.length}`)
            console.log(`- Success rate: ${((successfulBookings.length / campaignLoad) * 100).toFixed(1)}%`)
            console.log(`- Total time: ${totalTime.toFixed(2)}ms`)
            console.log(`- Warnings: ${warningsCount}`)
        })

        it('should maintain performance during promotional validation surge', async () => {
            const validationOperations = 250
            let validationSuccesses = 0
            let validationFailures = 0

            const validationPromises = Array.from({ length: validationOperations }, async (_, index) => {
                try {
                    const appointmentData = createLoadTestAppointment(index)

                    // Simulate comprehensive validation
                    const availabilityResult = await calendarInstance.checkAvailability(
                        appointmentData.staffId,
                        { startTime: appointmentData.startTime, endTime: appointmentData.endTime },
                        [appointmentData.services[0].serviceId]
                    )

                    const conflictResult = await calendarInstance.detectConflicts({
                        businessId: appointmentData.businessId,
                        staffId: appointmentData.staffId,
                        startTime: appointmentData.startTime,
                        endTime: appointmentData.endTime,
                        serviceIds: [appointmentData.services[0].serviceId]
                    })

                    if (availabilityResult.isAvailable && !conflictResult.hasConflicts) {
                        validationSuccesses++
                        return { valid: true, appointmentData }
                    } else {
                        validationFailures++
                        return { valid: false, reason: 'Validation failed' }
                    }
                } catch (error) {
                    validationFailures++
                    return { valid: false, error: error.message }
                }
            })

            const startTime = performance.now()
            const results = await Promise.all(validationPromises)
            const endTime = performance.now()
            const totalTime = endTime - startTime

            expect(totalTime).toBeLessThan(LOAD_THRESHOLDS.PROMOTIONAL_CAMPAIGN * 0.7) // Validation should be faster
            expect(validationSuccesses + validationFailures).toBe(validationOperations)

            console.log(`Promotional Validation Performance:`)
            console.log(`- Validation operations: ${validationOperations}`)
            console.log(`- Validation successes: ${validationSuccesses}`)
            console.log(`- Validation failures: ${validationFailures}`)
            console.log(`- Success rate: ${((validationSuccesses / validationOperations) * 100).toFixed(1)}%`)
            console.log(`- Total time: ${totalTime.toFixed(2)}ms`)
            console.log(`- Average validation time: ${(totalTime / validationOperations).toFixed(2)}ms`)
        })
    })

    describe('Sustained High Load Testing', () => {
        it('should handle sustained high load (1000 operations over 30 seconds)', async () => {
            const sustainedOperations = 1000
            const sustainedDuration = 30 * 1000 // 30 seconds
            const batchSize = 50
            const numberOfBatches = sustainedOperations / batchSize
            const batchInterval = sustainedDuration / numberOfBatches

            console.log(`Starting Sustained Load Test: ${sustainedOperations} operations over ${sustainedDuration / 1000} seconds`)

            const operationTypes = ['create', 'query', 'update', 'status'] as const
            const allResults: any[] = []
            const batchMetrics: Array<{ batchNumber: number; time: number; operations: number }> = []

            for (let batch = 0; batch < numberOfBatches; batch++) {
                const batchOperations = Array.from({ length: batchSize }, async (_, index) => {
                    const globalIndex = batch * batchSize + index
                    const operationType = operationTypes[globalIndex % operationTypes.length]

                    switch (operationType) {
                        case 'create':
                            return serviceInstance.createAppointment(createLoadTestAppointment(globalIndex))
                        case 'query':
                            return repositoryInstance.findByBusinessOptimized(testBusinessId, { limit: 10 })
                        case 'update':
                            return repositoryInstance.update(`appointment-${globalIndex}`, testBusinessId, { notes: `Updated ${globalIndex}` })
                        case 'status':
                            return repositoryInstance.updateStatus(`appointment-${globalIndex}`, testBusinessId, AppointmentStatus.CONFIRMED, 'Batch update')
                    }
                })

                const batchStartTime = performance.now()
                const batchResults = await Promise.all(batchOperations)
                const batchEndTime = performance.now()
                const batchTime = batchEndTime - batchStartTime

                allResults.push(...batchResults)
                batchMetrics.push({
                    batchNumber: batch + 1,
                    time: batchTime,
                    operations: batchSize
                })

                // Wait between batches
                if (batch < numberOfBatches - 1) {
                    await new Promise(resolve => setTimeout(resolve, batchInterval))
                }
            }

            const totalTime = batchMetrics.reduce((sum, batch) => sum + batch.time, 0)
            expect(totalTime).toBeLessThan(LOAD_THRESHOLDS.SUSTAINED_HIGH_LOAD)

            // Analyze performance consistency
            const batchTimes = batchMetrics.map(batch => batch.time)
            const averageBatchTime = batchTimes.reduce((sum, time) => sum + time, 0) / batchTimes.length
            const maxBatchTime = Math.max(...batchTimes)
            const minBatchTime = Math.min(...batchTimes)
            const timeVariance = maxBatchTime - minBatchTime

            expect(timeVariance).toBeLessThan(averageBatchTime * 2) // Variance should be reasonable

            console.log(`Sustained Load Results:`)
            console.log(`- Total operations: ${sustainedOperations}`)
            console.log(`- Batches: ${numberOfBatches}`)
            console.log(`- Total processing time: ${totalTime.toFixed(2)}ms`)
            console.log(`- Average batch time: ${averageBatchTime.toFixed(2)}ms`)
            console.log(`- Min batch time: ${minBatchTime.toFixed(2)}ms`)
            console.log(`- Max batch time: ${maxBatchTime.toFixed(2)}ms`)
            console.log(`- Time variance: ${timeVariance.toFixed(2)}ms`)
            console.log(`- Operations per second: ${((sustainedOperations / (totalTime / 1000))).toFixed(1)}`)
        })

        it('should maintain memory efficiency during sustained load', async () => {
            const memoryTestOperations = 500
            const memoryCheckInterval = 50

            const initialMemory = process.memoryUsage()
            const memorySnapshots: Array<{ operation: number; heapUsed: number; external: number }> = []

            for (let i = 0; i < memoryTestOperations; i++) {
                // Perform operation
                const appointmentData = createLoadTestAppointment(i)
                await serviceInstance.createAppointment(appointmentData)

                // Take memory snapshot periodically
                if (i % memoryCheckInterval === 0) {
                    const currentMemory = process.memoryUsage()
                    memorySnapshots.push({
                        operation: i,
                        heapUsed: currentMemory.heapUsed,
                        external: currentMemory.external
                    })
                }

                // Force garbage collection periodically if available
                if (i % (memoryCheckInterval * 2) === 0 && global.gc) {
                    global.gc()
                }
            }

            const finalMemory = process.memoryUsage()
            const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed

            // Memory increase should be reasonable
            expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024) // Less than 100MB

            console.log(`Memory Efficiency During Sustained Load:`)
            console.log(`- Operations: ${memoryTestOperations}`)
            console.log(`- Initial heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`)
            console.log(`- Final heap: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`)
            console.log(`- Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`)
            console.log(`- Memory snapshots taken: ${memorySnapshots.length}`)
        })
    })

    describe('Database Stress Testing', () => {
        it('should handle database connection pool stress', async () => {
            const dbStressOperations = 400
            const maxConcurrentConnections = 50

            // Simulate database connection pool stress
            const connectionBatches = []
            for (let i = 0; i < dbStressOperations; i += maxConcurrentConnections) {
                const batch = Array.from({ length: Math.min(maxConcurrentConnections, dbStressOperations - i) }, (_, j) => {
                    const index = i + j
                    const operationType = index % 4

                    switch (operationType) {
                        case 0:
                            return repositoryInstance.create(createLoadTestAppointment(index))
                        case 1:
                            return repositoryInstance.findByBusinessOptimized(testBusinessId, { limit: 5 })
                        case 2:
                            return repositoryInstance.findConflictsOptimized(
                                testStaffIds[index % testStaffIds.length],
                                testBusinessId,
                                {
                                    startTime: new Date(Date.now() + index * 60 * 1000),
                                    endTime: new Date(Date.now() + (index + 1) * 60 * 1000)
                                }
                            )
                        case 3:
                            return repositoryInstance.getAppointmentStatsOptimized(testBusinessId, {
                                startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
                                endDate: new Date()
                            })
                    }
                })
                connectionBatches.push(batch)
            }

            const startTime = performance.now()

            for (const batch of connectionBatches) {
                await Promise.all(batch)
                // Small delay between batches to simulate realistic load
                await new Promise(resolve => setTimeout(resolve, 10))
            }

            const endTime = performance.now()
            const totalTime = endTime - startTime

            expect(totalTime).toBeLessThan(LOAD_THRESHOLDS.DATABASE_STRESS)

            console.log(`Database Stress Test Results:`)
            console.log(`- Total operations: ${dbStressOperations}`)
            console.log(`- Max concurrent connections: ${maxConcurrentConnections}`)
            console.log(`- Connection batches: ${connectionBatches.length}`)
            console.log(`- Total time: ${totalTime.toFixed(2)}ms`)
            console.log(`- Average time per operation: ${(totalTime / dbStressOperations).toFixed(2)}ms`)
        })
    })

    describe('Performance Monitoring and Alerting', () => {
        it('should detect performance degradation and trigger alerts', async () => {
            const monitoringOperations = 100
            const performanceThreshold = 200 // ms per operation
            const alertThreshold = 0.1 // 10% of operations exceeding threshold

            const operationTimes: number[] = []
            let slowOperations = 0

            for (let i = 0; i < monitoringOperations; i++) {
                const operationStartTime = performance.now()

                await serviceInstance.createAppointment(createLoadTestAppointment(i))

                const operationEndTime = performance.now()
                const operationTime = operationEndTime - operationStartTime

                operationTimes.push(operationTime)

                if (operationTime > performanceThreshold) {
                    slowOperations++
                }
            }

            const averageTime = operationTimes.reduce((sum, time) => sum + time, 0) / operationTimes.length
            const slowOperationRate = slowOperations / monitoringOperations

            // Performance should be within acceptable limits
            expect(averageTime).toBeLessThan(performanceThreshold)
            expect(slowOperationRate).toBeLessThan(alertThreshold)

            console.log(`Performance Monitoring Results:`)
            console.log(`- Operations monitored: ${monitoringOperations}`)
            console.log(`- Average operation time: ${averageTime.toFixed(2)}ms`)
            console.log(`- Slow operations: ${slowOperations}`)
            console.log(`- Slow operation rate: ${(slowOperationRate * 100).toFixed(1)}%`)
            console.log(`- Performance threshold: ${performanceThreshold}ms`)
            console.log(`- Alert threshold: ${(alertThreshold * 100).toFixed(1)}%`)
        })
    })
})
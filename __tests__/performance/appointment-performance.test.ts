/**
 * Appointment Performance Tests
 * 
 * Performance tests to validate sub-500ms operation targets for appointment
 * database operations, query optimization, and connection pooling.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4
 * 
 * @version 1.0.0
 * @author Lumina Development Team
 */

import { OptimizedPrismaClientFactory, getConnectionMetrics, shutdownConnections } from '@/lib/db/connection-pool'
import { OptimizedAppointmentRepository } from '@/lib/repositories/appointment-repository-optimized'
import { AppointmentStatus } from '@prisma/client'
import { performance } from 'perf_hooks'

// ============================================================================
// TEST SETUP AND UTILITIES
// ============================================================================

describe('Appointment Performance Tests', () => {
    let repository: OptimizedAppointmentRepository
    let testBusinessId: string
    let testStaffId: string
    let testClientId: string
    let testServiceId: string
    let createdAppointmentIds: string[] = []

    // Performance thresholds
    const PERFORMANCE_THRESHOLDS = {
        CREATE_APPOINTMENT: 500, // ms
        FIND_BY_ID: 200, // ms
        FIND_BY_BUSINESS: 300, // ms
        FIND_BY_STAFF: 300, // ms
        UPDATE_APPOINTMENT: 400, // ms
        BATCH_UPDATE: 600, // ms
        CONFLICT_DETECTION: 250, // ms
        STATISTICS: 400, // ms
        PAGINATION: 350 // ms
    }

    beforeAll(async () => {
        repository = new OptimizedAppointmentRepository()

        // Create test data
        const prisma = OptimizedPrismaClientFactory.getClient()

        // Create test business
        const business = await prisma.business.create({
            data: {
                name: 'Performance Test Salon',
                slug: `perf-test-${Date.now()}`,
                email: 'test@performance.com'
            }
        })
        testBusinessId = business.id

        // Create test user and staff
        const user = await prisma.user.create({
            data: {
                email: `staff-${Date.now()}@performance.com`,
                name: 'Performance Test Staff'
            }
        })

        const staff = await prisma.staff.create({
            data: {
                businessId: testBusinessId,
                userId: user.id,
                displayName: 'Performance Test Staff',
                employmentType: 'COMMISSION',
                commissionRate: 50.00
            }
        })
        testStaffId = staff.id

        // Create test client
        const client = await prisma.client.create({
            data: {
                businessId: testBusinessId,
                firstName: 'Performance',
                lastName: 'Test Client',
                email: `client-${Date.now()}@performance.com`,
                phone: '+1234567890'
            }
        })
        testClientId = client.id

        // Create test service
        const service = await prisma.service.create({
            data: {
                businessId: testBusinessId,
                name: 'Performance Test Service',
                price: 100.00,
                duration: 60
            }
        })
        testServiceId = service.id

        // Link staff to service
        await prisma.staffService.create({
            data: {
                staffId: testStaffId,
                serviceId: testServiceId
            }
        })
    })

    afterAll(async () => {
        const prisma = OptimizedPrismaClientFactory.getClient()

        // Clean up test data
        if (createdAppointmentIds.length > 0) {
            await prisma.appointment.deleteMany({
                where: { id: { in: createdAppointmentIds } }
            })
        }

        await prisma.staffService.deleteMany({ where: { staffId: testStaffId } })
        await prisma.service.deleteMany({ where: { businessId: testBusinessId } })
        await prisma.client.deleteMany({ where: { businessId: testBusinessId } })
        await prisma.staff.deleteMany({ where: { businessId: testBusinessId } })
        await prisma.business.delete({ where: { id: testBusinessId } })

        await shutdownConnections()
    })

    // ============================================================================
    // PERFORMANCE TEST UTILITIES
    // ============================================================================

    const measurePerformance = async <T>(
        operation: string,
        threshold: number,
        fn: () => Promise<T>
    ): Promise<{ result: T; duration: number; withinThreshold: boolean }> => {
        const startTime = performance.now()
        const result = await fn()
        const duration = performance.now() - startTime
        const withinThreshold = duration <= threshold

        console.log(`${operation}: ${duration.toFixed(2)}ms (threshold: ${threshold}ms) - ${withinThreshold ? 'PASS' : 'FAIL'}`)

        return { result, duration, withinThreshold }
    }

    const createTestAppointment = async (overrides: any = {}) => {
        const startTime = new Date()
        startTime.setHours(startTime.getHours() + 1) // 1 hour from now
        const endTime = new Date(startTime)
        endTime.setHours(endTime.getHours() + 1) // 1 hour duration

        return {
            businessId: testBusinessId,
            clientId: testClientId,
            staffId: testStaffId,
            startTime,
            endTime,
            totalDuration: 60,
            totalPrice: 100.00,
            services: [{
                serviceId: testServiceId,
                serviceName: 'Performance Test Service',
                price: 100.00,
                duration: 60,
                serviceOrder: 1,
                startOffset: 0
            }],
            ...overrides
        }
    }

    // ============================================================================
    // CREATE APPOINTMENT PERFORMANCE TESTS
    // ============================================================================

    describe('Create Appointment Performance', () => {
        it('should create appointment within 500ms threshold', async () => {
            const appointmentData = await createTestAppointment()

            const { result, duration, withinThreshold } = await measurePerformance(
                'Create Appointment',
                PERFORMANCE_THRESHOLDS.CREATE_APPOINTMENT,
                () => repository.create(appointmentData)
            )

            createdAppointmentIds.push(result.id)

            expect(withinThreshold).toBe(true)
            expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.CREATE_APPOINTMENT)
            expect(result).toBeDefined()
            expect(result.id).toBeDefined()
        })

        it('should handle concurrent appointment creation efficiently', async () => {
            const concurrentCreations = 5
            const appointmentPromises = Array.from({ length: concurrentCreations }, async (_, index) => {
                const appointmentData = await createTestAppointment({
                    startTime: new Date(Date.now() + (index + 2) * 60 * 60 * 1000), // Stagger times
                    endTime: new Date(Date.now() + (index + 3) * 60 * 60 * 1000)
                })
                return repository.create(appointmentData)
            })

            const startTime = performance.now()
            const results = await Promise.all(appointmentPromises)
            const totalDuration = performance.now() - startTime
            const averageDuration = totalDuration / concurrentCreations

            results.forEach((result: any) => createdAppointmentIds.push(result.id))

            console.log(`Concurrent Creation: ${totalDuration.toFixed(2)}ms total, ${averageDuration.toFixed(2)}ms average`)

            expect(averageDuration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.CREATE_APPOINTMENT)
            expect(results).toHaveLength(concurrentCreations)
        })
    })

    // ============================================================================
    // READ OPERATION PERFORMANCE TESTS
    // ============================================================================

    describe('Read Operation Performance', () => {
        let testAppointmentId: string

        beforeAll(async () => {
            const appointmentData = await createTestAppointment()
            const appointment = await repository.create(appointmentData)
            testAppointmentId = appointment.id
            createdAppointmentIds.push(testAppointmentId)
        })

        it('should find appointment by ID within 200ms threshold', async () => {
            const { result, duration, withinThreshold } = await measurePerformance(
                'Find Appointment by ID',
                PERFORMANCE_THRESHOLDS.FIND_BY_ID,
                () => repository.findById(testAppointmentId, testBusinessId)
            )

            expect(withinThreshold).toBe(true)
            expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.FIND_BY_ID)
            expect(result).toBeDefined()
            expect(result?.id).toBe(testAppointmentId)
        })

        it('should find appointments by business within 300ms threshold', async () => {
            const { result, duration, withinThreshold } = await measurePerformance(
                'Find Appointments by Business',
                PERFORMANCE_THRESHOLDS.FIND_BY_BUSINESS,
                () => repository.findByBusinessOptimized(testBusinessId, { limit: 50 })
            )

            expect(withinThreshold).toBe(true)
            expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.FIND_BY_BUSINESS)
            expect(result.appointments).toBeDefined()
            expect(Array.isArray(result.appointments)).toBe(true)
        })

        it('should find appointments by staff within 300ms threshold', async () => {
            const dateRange = {
                startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
                endDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
            }

            const { result, duration, withinThreshold } = await measurePerformance(
                'Find Appointments by Staff',
                PERFORMANCE_THRESHOLDS.FIND_BY_STAFF,
                () => repository.findByStaffOptimized(testStaffId, testBusinessId, dateRange, { limit: 50 })
            )

            expect(withinThreshold).toBe(true)
            expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.FIND_BY_STAFF)
            expect(result.appointments).toBeDefined()
            expect(Array.isArray(result.appointments)).toBe(true)
        })
    })

    // ============================================================================
    // PAGINATION PERFORMANCE TESTS
    // ============================================================================

    describe('Pagination Performance', () => {
        beforeAll(async () => {
            // Create multiple appointments for pagination testing
            const appointmentPromises = Array.from({ length: 20 }, async (_, index) => {
                const appointmentData = await createTestAppointment({
                    startTime: new Date(Date.now() + (index + 10) * 60 * 60 * 1000),
                    endTime: new Date(Date.now() + (index + 11) * 60 * 60 * 1000)
                })
                return repository.create(appointmentData)
            })

            const results = await Promise.all(appointmentPromises)
            results.forEach((result: any) => createdAppointmentIds.push(result.id))
        })

        it('should handle cursor-based pagination within 350ms threshold', async () => {
            // First page
            const { result: firstPage, duration: firstDuration, withinThreshold: firstWithin } =
                await measurePerformance(
                    'Cursor Pagination - First Page',
                    PERFORMANCE_THRESHOLDS.PAGINATION,
                    () => repository.findByBusinessOptimized(testBusinessId, { limit: 10 })
                )

            expect(firstWithin).toBe(true)
            expect(firstDuration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.PAGINATION)
            expect(firstPage.appointments).toHaveLength(10)

            // Second page using cursor
            if (firstPage.nextCursor) {
                const { result: secondPage, duration: secondDuration, withinThreshold: secondWithin } =
                    await measurePerformance(
                        'Cursor Pagination - Second Page',
                        PERFORMANCE_THRESHOLDS.PAGINATION,
                        () => repository.findByBusinessOptimized(testBusinessId, {
                            limit: 10,
                            cursor: firstPage.nextCursor
                        })
                    )

                expect(secondWithin).toBe(true)
                expect(secondDuration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.PAGINATION)
                expect(secondPage.appointments.length).toBeGreaterThan(0)
            }
        })
    })

    // ============================================================================
    // CONFLICT DETECTION PERFORMANCE TESTS
    // ============================================================================

    describe('Conflict Detection Performance', () => {
        it('should detect conflicts within 250ms threshold', async () => {
            const timeSlot = {
                startTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
                endTime: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours from now
            }

            const { result, duration, withinThreshold } = await measurePerformance(
                'Conflict Detection',
                PERFORMANCE_THRESHOLDS.CONFLICT_DETECTION,
                () => repository.findConflictsOptimized(testStaffId, testBusinessId, timeSlot)
            )

            expect(withinThreshold).toBe(true)
            expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.CONFLICT_DETECTION)
            expect(Array.isArray(result)).toBe(true)
        })
    })

    // ============================================================================
    // BATCH OPERATIONS PERFORMANCE TESTS
    // ============================================================================

    describe('Batch Operations Performance', () => {
        let batchTestAppointmentIds: string[]

        beforeAll(async () => {
            // Create appointments for batch testing
            const appointmentPromises = Array.from({ length: 10 }, async (_, index) => {
                const appointmentData = await createTestAppointment({
                    startTime: new Date(Date.now() + (index + 30) * 60 * 60 * 1000),
                    endTime: new Date(Date.now() + (index + 31) * 60 * 60 * 1000)
                })
                return repository.create(appointmentData)
            })

            const results = await Promise.all(appointmentPromises)
            batchTestAppointmentIds = results.map(r => r.id)
            createdAppointmentIds.push(...batchTestAppointmentIds)
        })

        it('should handle batch status updates within 600ms threshold', async () => {
            const { result, duration, withinThreshold } = await measurePerformance(
                'Batch Status Update',
                PERFORMANCE_THRESHOLDS.BATCH_UPDATE,
                () => repository.batchUpdateStatus(
                    batchTestAppointmentIds,
                    testBusinessId,
                    AppointmentStatus.CONFIRMED,
                    'Batch confirmation test'
                )
            )

            expect(withinThreshold).toBe(true)
            expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.BATCH_UPDATE)
            expect(result.updated).toBe(batchTestAppointmentIds.length)
            expect(result.errors).toHaveLength(0)
        })
    })

    // ============================================================================
    // STATISTICS PERFORMANCE TESTS
    // ============================================================================

    describe('Statistics Performance', () => {
        it('should generate appointment statistics within 400ms threshold', async () => {
            const dateRange = {
                startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
                endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
            }

            const { result, duration, withinThreshold } = await measurePerformance(
                'Appointment Statistics',
                PERFORMANCE_THRESHOLDS.STATISTICS,
                () => repository.getAppointmentStatsOptimized(testBusinessId, dateRange)
            )

            expect(withinThreshold).toBe(true)
            expect(duration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.STATISTICS)
            expect(result.total).toBeGreaterThanOrEqual(0)
            expect(result.byStatus).toBeDefined()
            expect(result.byStaff).toBeDefined()
            expect(result.totalRevenue).toBeGreaterThanOrEqual(0)
        })
    })

    // ============================================================================
    // CONNECTION POOL PERFORMANCE TESTS
    // ============================================================================

    describe('Connection Pool Performance', () => {
        it('should maintain connection pool metrics within acceptable ranges', async () => {
            const metrics = getConnectionMetrics()

            console.log('Connection Pool Metrics:', {
                averageQueryTime: metrics.metrics.averageQueryTime.toFixed(2) + 'ms',
                totalQueries: metrics.metrics.totalQueries,
                slowQueries: metrics.metrics.slowQueries,
                errorRate: (metrics.performance.errorRate * 100).toFixed(2) + '%',
                slowQueryRate: (metrics.performance.slowQueryRate * 100).toFixed(2) + '%'
            })

            // Validate performance metrics
            expect(metrics.metrics.averageQueryTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.FIND_BY_ID)
            expect(metrics.performance.errorRate).toBeLessThanOrEqual(0.01) // Less than 1% error rate
            expect(metrics.performance.slowQueryRate).toBeLessThanOrEqual(0.1) // Less than 10% slow queries
        })

        it('should handle concurrent database operations efficiently', async () => {
            const concurrentOperations = 10
            const operations = Array.from({ length: concurrentOperations }, async (_, index) => {
                // Mix of different operations
                if (index % 3 === 0) {
                    return repository.findByBusinessOptimized(testBusinessId, { limit: 5 })
                } else if (index % 3 === 1) {
                    return repository.findByStaffOptimized(testStaffId, testBusinessId, undefined, { limit: 5 })
                } else {
                    return repository.getAppointmentStatsOptimized(testBusinessId, {
                        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
                        endDate: new Date()
                    })
                }
            })

            const startTime = performance.now()
            const results = await Promise.all(operations)
            const totalDuration = performance.now() - startTime
            const averageDuration = totalDuration / concurrentOperations

            console.log(`Concurrent Operations: ${totalDuration.toFixed(2)}ms total, ${averageDuration.toFixed(2)}ms average`)

            expect(averageDuration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.FIND_BY_BUSINESS)
            expect(results).toHaveLength(concurrentOperations)
            results.forEach((result: any) => expect(result).toBeDefined())
        })
    })

    // ============================================================================
    // PERFORMANCE REGRESSION TESTS
    // ============================================================================

    describe('Performance Regression Tests', () => {
        it('should maintain consistent performance across multiple operations', async () => {
            const iterations = 5
            const durations: number[] = []

            for (let i = 0; i < iterations; i++) {
                const startTime = performance.now()
                await repository.findByBusinessOptimized(testBusinessId, { limit: 20 })
                const duration = performance.now() - startTime
                durations.push(duration)
            }

            const averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length
            const maxDuration = Math.max(...durations)
            const minDuration = Math.min(...durations)
            const variance = maxDuration - minDuration

            console.log(`Performance Consistency: avg=${averageDuration.toFixed(2)}ms, min=${minDuration.toFixed(2)}ms, max=${maxDuration.toFixed(2)}ms, variance=${variance.toFixed(2)}ms`)

            // Performance should be consistent (variance should be reasonable)
            expect(averageDuration).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.FIND_BY_BUSINESS)
            expect(variance).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.FIND_BY_BUSINESS * 0.5) // Variance should be less than 50% of threshold
        })
    })
})
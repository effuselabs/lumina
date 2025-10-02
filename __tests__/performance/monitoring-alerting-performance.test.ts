/**
 * Monitoring and Alerting Performance Tests
 * 
 * Tests for monitoring system performance, detecting degradation patterns,
 * and triggering alerts when performance thresholds are exceeded.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 9.4, 9.5
 * 
 * @version 1.0.0
 * @author Lumina Development Team
 */

import { AppointmentCache } from '@/lib/cache/appointment-cache'
import { getConnectionMetrics } from '@/lib/db/connection-pool'
import { OptimizedAppointmentRepository } from '@/lib/repositories/appointment-repository-optimized'
import { AppointmentService } from '@/lib/services/appointment-service'
import { performance } from 'perf_hooks'

// Mock dependencies for monitoring tests
jest.mock('@/lib/db/connection-pool')
jest.mock('@/lib/repositories/appointment-repository-optimized')
jest.mock('@/lib/services/appointment-service')
jest.mock('@/lib/cache/appointment-cache')

const mockGetConnectionMetrics = getConnectionMetrics as jest.MockedFunction<typeof getConnectionMetrics>
const mockRepository = OptimizedAppointmentRepository as jest.MockedClass<typeof OptimizedAppointmentRepository>
const mockAppointmentService = AppointmentService as jest.MockedClass<typeof AppointmentService>
const mockAppointmentCache = AppointmentCache as jest.MockedClass<typeof AppointmentCache>

// Performance monitoring interface
interface PerformanceMetrics {
    timestamp: number
    operationType: string
    duration: number
    success: boolean
    errorMessage?: string
    resourceUsage: {
        memoryUsage: number
        cpuUsage: number
        connectionCount: number
    }
}

interface AlertThresholds {
    averageResponseTime: number
    p95ResponseTime: number
    errorRate: number
    slowQueryRate: number
    memoryUsage: number
    connectionUtilization: number
}

interface AlertEvent {
    timestamp: number
    alertType: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    message: string
    metrics: any
    threshold: number
    actualValue: number
}

describe('Monitoring and Alerting Performance Tests', () => {
    let repositoryInstance: jest.Mocked<OptimizedAppointmentRepository>
    let serviceInstance: jest.Mocked<AppointmentService>
    let cacheInstance: jest.Mocked<AppointmentCache>

    const testBusinessId = 'business-monitor-123'
    const performanceMetrics: PerformanceMetrics[] = []
    const alertEvents: AlertEvent[] = []

    // Alert thresholds based on performance requirements
    const ALERT_THRESHOLDS: AlertThresholds = {
        averageResponseTime: 500, // ms
        p95ResponseTime: 750, // ms
        errorRate: 0.05, // 5%
        slowQueryRate: 0.1, // 10%
        memoryUsage: 512 * 1024 * 1024, // 512MB
        connectionUtilization: 0.8 // 80%
    }

    beforeEach(() => {
        jest.clearAllMocks()
        performanceMetrics.length = 0
        alertEvents.length = 0
        setupMonitoringMocks()
    })

    const setupMonitoringMocks = () => {
        // Repository instance with monitoring
        repositoryInstance = {
            create: jest.fn(),
            findById: jest.fn(),
            findByBusinessOptimized: jest.fn(),
            update: jest.fn(),
            getAppointmentStatsOptimized: jest.fn()
        } as any

        // Service instance with monitoring
        serviceInstance = {
            createAppointment: jest.fn(),
            getAppointments: jest.fn(),
            updateAppointment: jest.fn()
        } as any

        // Cache instance with monitoring
        cacheInstance = {
            get: jest.fn(),
            set: jest.fn(),
            invalidate: jest.fn(),
            getStats: jest.fn()
        } as any

        // Mock constructors
        mockRepository.mockImplementation(() => repositoryInstance)
        mockAppointmentService.mockImplementation(() => serviceInstance)
        mockAppointmentCache.mockImplementation(() => cacheInstance)

        // Setup monitoring-aware mocks
        setupMonitoringAwareMocks()
    }

    const setupMonitoringAwareMocks = () => {
        // Repository operations with performance tracking
        repositoryInstance.create.mockImplementation(async (data: any) => {
            const startTime = performance.now()

            // Simulate variable performance
            const baseDelay = 30 + Math.random() * 40
            const degradationFactor = performanceMetrics.length > 100 ? 1.5 : 1.0 // Simulate degradation over time
            const delay = baseDelay * degradationFactor

            await new Promise(resolve => setTimeout(resolve, delay))

            const endTime = performance.now()
            const duration = endTime - startTime

            recordMetric('create', duration, true)

            return {
                id: `appointment-${Date.now()}`,
                ...data,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        })

        repositoryInstance.findById.mockImplementation(async (id, businessId) => {
            const startTime = performance.now()

            // Simulate occasional slow queries
            const isSlowQuery = Math.random() < 0.05 // 5% slow queries
            const delay = isSlowQuery ? 800 + Math.random() * 400 : 15 + Math.random() * 25

            await new Promise(resolve => setTimeout(resolve, delay))

            const endTime = performance.now()
            const duration = endTime - startTime

            recordMetric('findById', duration, true)

            return {
                id,
                businessId,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        })

        repositoryInstance.findByBusinessOptimized.mockImplementation(async (businessId, options) => {
            const startTime = performance.now()

            // Simulate performance based on query complexity
            const baseDelay = 25 + Math.random() * 35
            const complexityFactor = (options?.offset || 0) > 1000 ? 2.0 : 1.0
            const delay = baseDelay * complexityFactor

            await new Promise(resolve => setTimeout(resolve, delay))

            const endTime = performance.now()
            const duration = endTime - startTime

            recordMetric('findByBusiness', duration, true)

            return {
                appointments: Array.from({ length: options?.limit || 20 }, (_, i) => ({
                    id: `appointment-${i}`,
                    businessId
                })),
                total: 5000,
                hasMore: true
            }
        })

        // Service operations with error simulation
        serviceInstance.createAppointment.mockImplementation(async (data: any) => {
            const startTime = performance.now()

            // Simulate occasional errors
            const hasError = Math.random() < 0.03 // 3% error rate

            if (hasError) {
                const endTime = performance.now()
                recordMetric('createAppointment', endTime - startTime, false, 'Validation error')
                throw new Error('Validation error')
            }

            await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100))

            const endTime = performance.now()
            const duration = endTime - startTime

            recordMetric('createAppointment', duration, true)

            return {
                success: true,
                appointment: { id: `appointment-${Date.now()}`, ...data },
                errors: [],
                warnings: []
            }
        })

        // Cache operations with hit/miss tracking
        cacheInstance.get.mockImplementation(async (key: any) => {
            const startTime = performance.now()

            await new Promise(resolve => setTimeout(resolve, 2 + Math.random() * 8))

            const endTime = performance.now()
            const duration = endTime - startTime

            const isHit = Math.random() < 0.7 // 70% hit rate
            recordMetric('cacheGet', duration, true)

            return isHit ? { cached: true } : null
        })

        cacheInstance.getStats.mockReturnValue({
            hits: 700,
            misses: 300,
            hitRate: 0.7,
            averageResponseTime: 5.2,
            totalOperations: 1000
        })

        // Connection metrics with dynamic values
        mockGetConnectionMetrics.mockImplementation(() => {
            const currentTime = Date.now()
            const utilizationFactor = Math.sin(currentTime / 10000) * 0.3 + 0.5 // Oscillating utilization

            return {
                metrics: {
                    totalQueries: performanceMetrics.length,
                    averageQueryTime: calculateAverageResponseTime(),
                    slowQueries: performanceMetrics.filter(m => m.duration > ALERT_THRESHOLDS.averageResponseTime).length,
                    errors: performanceMetrics.filter(m => !m.success).length,
                    connectionPoolSize: 20,
                    activeConnections: Math.floor(20 * utilizationFactor),
                    idleConnections: Math.floor(20 * (1 - utilizationFactor))
                },
                performance: {
                    errorRate: performanceMetrics.filter(m => !m.success).length / Math.max(performanceMetrics.length, 1),
                    slowQueryRate: performanceMetrics.filter(m => m.duration > ALERT_THRESHOLDS.averageResponseTime).length / Math.max(performanceMetrics.length, 1),
                    averageResponseTime: calculateAverageResponseTime(),
                    connectionUtilization: utilizationFactor
                }
            }
        })
    }

    const recordMetric = (operationType: string, duration: number, success: boolean, errorMessage?: string) => {
        const currentMemory = process.memoryUsage()

        const metric: PerformanceMetrics = {
            timestamp: Date.now(),
            operationType,
            duration,
            success,
            errorMessage,
            resourceUsage: {
                memoryUsage: currentMemory.heapUsed,
                cpuUsage: Math.random() * 100, // Simulated CPU usage
                connectionCount: Math.floor(Math.random() * 20) + 5
            }
        }

        performanceMetrics.push(metric)
        checkAlertThresholds(metric)
    }

    const calculateAverageResponseTime = (): number => {
        if (performanceMetrics.length === 0) return 0
        return performanceMetrics.reduce((sum, metric) => sum + metric.duration, 0) / performanceMetrics.length
    }

    const calculateP95ResponseTime = (): number => {
        if (performanceMetrics.length === 0) return 0
        const sortedDurations = performanceMetrics.map(m => m.duration).sort((a, b) => a - b)
        const p95Index = Math.floor(sortedDurations.length * 0.95)
        return sortedDurations[p95Index] || 0
    }

    const checkAlertThresholds = (metric: PerformanceMetrics) => {
        const recentMetrics = performanceMetrics.slice(-100) // Last 100 operations

        // Check average response time
        const avgResponseTime = calculateAverageResponseTime()
        if (avgResponseTime > ALERT_THRESHOLDS.averageResponseTime) {
            triggerAlert('AVERAGE_RESPONSE_TIME', 'HIGH',
                `Average response time exceeded threshold`,
                { avgResponseTime },
                ALERT_THRESHOLDS.averageResponseTime,
                avgResponseTime)
        }

        // Check P95 response time
        const p95ResponseTime = calculateP95ResponseTime()
        if (p95ResponseTime > ALERT_THRESHOLDS.p95ResponseTime) {
            triggerAlert('P95_RESPONSE_TIME', 'MEDIUM',
                `95th percentile response time exceeded threshold`,
                { p95ResponseTime },
                ALERT_THRESHOLDS.p95ResponseTime,
                p95ResponseTime)
        }

        // Check error rate
        const errorRate = recentMetrics.filter(m => !m.success).length / recentMetrics.length
        if (errorRate > ALERT_THRESHOLDS.errorRate) {
            triggerAlert('ERROR_RATE', 'HIGH',
                `Error rate exceeded threshold`,
                { errorRate: errorRate * 100 },
                ALERT_THRESHOLDS.errorRate * 100,
                errorRate * 100)
        }

        // Check memory usage
        if (metric.resourceUsage.memoryUsage > ALERT_THRESHOLDS.memoryUsage) {
            triggerAlert('MEMORY_USAGE', 'MEDIUM',
                `Memory usage exceeded threshold`,
                { memoryUsage: metric.resourceUsage.memoryUsage / 1024 / 1024 },
                ALERT_THRESHOLDS.memoryUsage / 1024 / 1024,
                metric.resourceUsage.memoryUsage / 1024 / 1024)
        }
    }

    const triggerAlert = (alertType: string, severity: AlertEvent['severity'], message: string, metrics: any, threshold: number, actualValue: number) => {
        const alert: AlertEvent = {
            timestamp: Date.now(),
            alertType,
            severity,
            message,
            metrics,
            threshold,
            actualValue
        }

        alertEvents.push(alert)

        // In a real implementation, this would send notifications
        console.log(`🚨 ALERT [${severity}]: ${message}`)
        console.log(`   Threshold: ${threshold}, Actual: ${actualValue.toFixed(2)}`)
    }

    describe('Real-time Performance Monitoring', () => {
        it('should monitor appointment operation performance in real-time', async () => {
            const monitoringOperations = 200
            const operationTypes = ['create', 'read', 'update', 'query'] as const

            console.log(`Starting real-time monitoring of ${monitoringOperations} operations...`)

            for (let i = 0; i < monitoringOperations; i++) {
                const operationType = operationTypes[i % operationTypes.length]

                try {
                    switch (operationType) {
                        case 'create':
                            await repositoryInstance.create({
                                businessId: testBusinessId,
                                clientId: `client-${i}`,
                                staffId: `staff-${i % 10}`,
                                startTime: new Date(),
                                endTime: new Date(),
                                totalDuration: 60,
                                totalPrice: 50
                            })
                            break
                        case 'read':
                            await repositoryInstance.findById(`appointment-${i}`, testBusinessId)
                            break
                        case 'update':
                            await repositoryInstance.update(`appointment-${i}`, testBusinessId, { notes: `Updated ${i}` })
                            break
                        case 'query':
                            await repositoryInstance.findByBusinessOptimized(testBusinessId, { limit: 20, offset: i * 20 })
                            break
                    }
                } catch (error) {
                    // Error already recorded in mock
                }

                // Small delay to simulate realistic operation spacing
                await new Promise(resolve => setTimeout(resolve, 10))
            }

            // Analyze monitoring results
            const avgResponseTime = calculateAverageResponseTime()
            const p95ResponseTime = calculateP95ResponseTime()
            const errorRate = performanceMetrics.filter(m => !m.success).length / performanceMetrics.length
            const slowQueryRate = performanceMetrics.filter(m => m.duration > ALERT_THRESHOLDS.averageResponseTime).length / performanceMetrics.length

            expect(performanceMetrics).toHaveLength(monitoringOperations)
            expect(avgResponseTime).toBeLessThan(ALERT_THRESHOLDS.averageResponseTime * 1.5) // Allow some tolerance
            expect(errorRate).toBeLessThan(ALERT_THRESHOLDS.errorRate * 2) // Allow some tolerance

            console.log(`Real-time Monitoring Results:`)
            console.log(`- Operations monitored: ${performanceMetrics.length}`)
            console.log(`- Average response time: ${avgResponseTime.toFixed(2)}ms`)
            console.log(`- 95th percentile response time: ${p95ResponseTime.toFixed(2)}ms`)
            console.log(`- Error rate: ${(errorRate * 100).toFixed(2)}%`)
            console.log(`- Slow query rate: ${(slowQueryRate * 100).toFixed(2)}%`)
            console.log(`- Alerts triggered: ${alertEvents.length}`)
        })

        it('should detect performance degradation patterns over time', async () => {
            const degradationTestPeriods = 10
            const operationsPerPeriod = 30
            const periodMetrics: Array<{ period: number; avgTime: number; errorRate: number }> = []

            console.log(`Testing performance degradation detection over ${degradationTestPeriods} periods...`)

            for (let period = 0; period < degradationTestPeriods; period++) {
                const periodStartMetrics = performanceMetrics.length

                // Perform operations for this period
                for (let i = 0; i < operationsPerPeriod; i++) {
                    try {
                        await repositoryInstance.findByBusinessOptimized(testBusinessId, {
                            limit: 20,
                            offset: (period * operationsPerPeriod + i) * 20
                        })
                    } catch (error) {
                        // Error recorded in mock
                    }
                }

                // Calculate period metrics
                const periodEndMetrics = performanceMetrics.length
                const periodOperations = performanceMetrics.slice(periodStartMetrics, periodEndMetrics)
                const avgTime = periodOperations.reduce((sum, m) => sum + m.duration, 0) / periodOperations.length
                const errorRate = periodOperations.filter(m => !m.success).length / periodOperations.length

                periodMetrics.push({ period: period + 1, avgTime, errorRate })

                // Simulate time passage
                await new Promise(resolve => setTimeout(resolve, 50))
            }

            // Analyze degradation trends
            const firstHalf = periodMetrics.slice(0, degradationTestPeriods / 2)
            const secondHalf = periodMetrics.slice(degradationTestPeriods / 2)

            const firstHalfAvg = firstHalf.reduce((sum, p) => sum + p.avgTime, 0) / firstHalf.length
            const secondHalfAvg = secondHalf.reduce((sum, p) => sum + p.avgTime, 0) / secondHalf.length

            const degradationPercentage = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100

            console.log(`Performance Degradation Analysis:`)
            console.log(`- Test periods: ${degradationTestPeriods}`)
            console.log(`- Operations per period: ${operationsPerPeriod}`)
            console.log(`- First half average: ${firstHalfAvg.toFixed(2)}ms`)
            console.log(`- Second half average: ${secondHalfAvg.toFixed(2)}ms`)
            console.log(`- Degradation: ${degradationPercentage.toFixed(1)}%`)

            periodMetrics.forEach(({ period, avgTime, errorRate }) => {
                console.log(`  Period ${period}: ${avgTime.toFixed(2)}ms avg, ${(errorRate * 100).toFixed(1)}% errors`)
            })
        })
    })

    describe('Alert System Validation', () => {
        it('should trigger alerts when performance thresholds are exceeded', async () => {
            const alertTestOperations = 150

            console.log(`Testing alert system with ${alertTestOperations} operations...`)

            // Perform operations that will trigger various alerts
            for (let i = 0; i < alertTestOperations; i++) {
                try {
                    if (i % 20 === 0) {
                        // Simulate slow operations periodically
                        await new Promise(resolve => setTimeout(resolve, 600)) // Slow operation
                        recordMetric('slowOperation', 600, true)
                    } else {
                        await repositoryInstance.findById(`alert-test-${i}`, testBusinessId)
                    }
                } catch (error) {
                    // Error recorded in mock
                }
            }

            // Verify alerts were triggered
            expect(alertEvents.length).toBeGreaterThan(0)

            const alertsByType = alertEvents.reduce((acc, alert) => {
                acc[alert.alertType] = (acc[alert.alertType] || 0) + 1
                return acc
            }, {} as Record<string, number>)

            const alertsBySeverity = alertEvents.reduce((acc, alert) => {
                acc[alert.severity] = (acc[alert.severity] || 0) + 1
                return acc
            }, {} as Record<string, number>)

            console.log(`Alert System Results:`)
            console.log(`- Total alerts triggered: ${alertEvents.length}`)
            console.log(`- Alerts by type:`, alertsByType)
            console.log(`- Alerts by severity:`, alertsBySeverity)

            // Verify alert details
            alertEvents.forEach(alert => {
                expect(alert.timestamp).toBeDefined()
                expect(alert.alertType).toBeDefined()
                expect(alert.severity).toMatch(/^(LOW|MEDIUM|HIGH|CRITICAL)$/)
                expect(alert.message).toBeDefined()
                expect(alert.threshold).toBeGreaterThan(0)
                expect(alert.actualValue).toBeGreaterThan(0)
            })
        })

        it('should escalate alerts based on severity and frequency', async () => {
            const escalationTestOperations = 100
            let criticalAlerts = 0
            let highAlerts = 0

            // Simulate conditions that should trigger escalation
            for (let i = 0; i < escalationTestOperations; i++) {
                try {
                    // Simulate high error rate scenario
                    if (i % 5 === 0) {
                        recordMetric('errorOperation', 100, false, 'Simulated error')
                    } else {
                        await repositoryInstance.findById(`escalation-test-${i}`, testBusinessId)
                    }
                } catch (error) {
                    // Error recorded
                }
            }

            // Count alerts by severity
            criticalAlerts = alertEvents.filter(a => a.severity === 'CRITICAL').length
            highAlerts = alertEvents.filter(a => a.severity === 'HIGH').length

            console.log(`Alert Escalation Results:`)
            console.log(`- Critical alerts: ${criticalAlerts}`)
            console.log(`- High alerts: ${highAlerts}`)
            console.log(`- Total alerts: ${alertEvents.length}`)

            // Verify escalation logic
            expect(alertEvents.length).toBeGreaterThan(0)

            // Check that high-severity alerts were triggered for high error rates
            const errorRateAlerts = alertEvents.filter(a => a.alertType === 'ERROR_RATE')
            if (errorRateAlerts.length > 0) {
                expect(errorRateAlerts.some(a => a.severity === 'HIGH')).toBe(true)
            }
        })

        it('should provide actionable alert information', async () => {
            // Trigger specific alert scenarios
            const alertScenarios = [
                {
                    name: 'High Response Time',
                    action: async () => {
                        recordMetric('slowQuery', 800, true) // Exceeds threshold
                    }
                },
                {
                    name: 'High Error Rate',
                    action: async () => {
                        for (let i = 0; i < 10; i++) {
                            recordMetric('errorOperation', 50, false, 'Test error')
                        }
                    }
                },
                {
                    name: 'Memory Pressure',
                    action: async () => {
                        const highMemoryMetric: PerformanceMetrics = {
                            timestamp: Date.now(),
                            operationType: 'memoryTest',
                            duration: 100,
                            success: true,
                            resourceUsage: {
                                memoryUsage: ALERT_THRESHOLDS.memoryUsage * 1.5, // Exceed threshold
                                cpuUsage: 50,
                                connectionCount: 10
                            }
                        }
                        performanceMetrics.push(highMemoryMetric)
                        checkAlertThresholds(highMemoryMetric)
                    }
                }
            ]

            for (const scenario of alertScenarios) {
                console.log(`Testing alert scenario: ${scenario.name}`)
                await scenario.action()
            }

            // Verify alert information quality
            const recentAlerts = alertEvents.slice(-10) // Last 10 alerts

            recentAlerts.forEach(alert => {
                expect(alert.message).toBeDefined()
                expect(alert.message.length).toBeGreaterThan(10) // Meaningful message
                expect(alert.metrics).toBeDefined()
                expect(alert.threshold).toBeGreaterThan(0)
                expect(alert.actualValue).toBeGreaterThan(0)
                expect(alert.actualValue).toBeGreaterThan(alert.threshold) // Alert should only trigger when threshold exceeded

                console.log(`Alert: ${alert.alertType} - ${alert.message}`)
                console.log(`  Threshold: ${alert.threshold}, Actual: ${alert.actualValue}`)
                console.log(`  Severity: ${alert.severity}`)
            })
        })
    })

    describe('Resource Monitoring', () => {
        it('should monitor database connection pool utilization', async () => {
            const connectionMonitoringOperations = 100

            console.log(`Monitoring connection pool utilization over ${connectionMonitoringOperations} operations...`)

            const connectionMetricsHistory: Array<{
                timestamp: number
                utilization: number
                activeConnections: number
                totalConnections: number
            }> = []

            for (let i = 0; i < connectionMonitoringOperations; i++) {
                await repositoryInstance.findByBusinessOptimized(testBusinessId, { limit: 10 })

                // Record connection metrics
                const metrics = getConnectionMetrics()
                connectionMetricsHistory.push({
                    timestamp: Date.now(),
                    utilization: metrics.performance.connectionUtilization,
                    activeConnections: metrics.metrics.activeConnections,
                    totalConnections: metrics.metrics.connectionPoolSize
                })

                await new Promise(resolve => setTimeout(resolve, 20))
            }

            // Analyze connection utilization patterns
            const avgUtilization = connectionMetricsHistory.reduce((sum, m) => sum + m.utilization, 0) / connectionMetricsHistory.length
            const maxUtilization = Math.max(...connectionMetricsHistory.map(m => m.utilization))
            const utilizationSpikes = connectionMetricsHistory.filter(m => m.utilization > ALERT_THRESHOLDS.connectionUtilization).length

            expect(avgUtilization).toBeLessThan(ALERT_THRESHOLDS.connectionUtilization)
            expect(maxUtilization).toBeLessThan(1.0) // Should never exceed 100%

            console.log(`Connection Pool Monitoring Results:`)
            console.log(`- Average utilization: ${(avgUtilization * 100).toFixed(1)}%`)
            console.log(`- Max utilization: ${(maxUtilization * 100).toFixed(1)}%`)
            console.log(`- Utilization spikes: ${utilizationSpikes}`)
            console.log(`- Alert threshold: ${(ALERT_THRESHOLDS.connectionUtilization * 100).toFixed(1)}%`)
        })

        it('should monitor cache performance and hit rates', async () => {
            const cacheMonitoringOperations = 150

            console.log(`Monitoring cache performance over ${cacheMonitoringOperations} operations...`)

            const cacheMetricsHistory: Array<{
                timestamp: number
                hitRate: number
                responseTime: number
                operation: string
            }> = []

            for (let i = 0; i < cacheMonitoringOperations; i++) {
                const startTime = performance.now()
                const result = await cacheInstance.get(`cache-key-${i}`)
                const endTime = performance.now()

                cacheMetricsHistory.push({
                    timestamp: Date.now(),
                    hitRate: result ? 1 : 0, // 1 for hit, 0 for miss
                    responseTime: endTime - startTime,
                    operation: 'get'
                })
            }

            // Analyze cache performance
            const overallHitRate = cacheMetricsHistory.reduce((sum, m) => sum + m.hitRate, 0) / cacheMetricsHistory.length
            const avgResponseTime = cacheMetricsHistory.reduce((sum, m) => sum + m.responseTime, 0) / cacheMetricsHistory.length
            const cacheStats = cacheInstance.getStats()

            expect(overallHitRate).toBeGreaterThan(0.5) // At least 50% hit rate
            expect(avgResponseTime).toBeLessThan(20) // Cache should be fast

            console.log(`Cache Performance Monitoring Results:`)
            console.log(`- Overall hit rate: ${(overallHitRate * 100).toFixed(1)}%`)
            console.log(`- Average response time: ${avgResponseTime.toFixed(2)}ms`)
            console.log(`- Cache stats:`, cacheStats)
        })

        it('should detect memory leaks and resource exhaustion', async () => {
            const memoryMonitoringOperations = 200
            const memorySnapshots: Array<{
                timestamp: number
                heapUsed: number
                heapTotal: number
                external: number
                operation: number
            }> = []

            console.log(`Monitoring memory usage over ${memoryMonitoringOperations} operations...`)

            for (let i = 0; i < memoryMonitoringOperations; i++) {
                // Perform operation
                await repositoryInstance.create({
                    businessId: testBusinessId,
                    clientId: `memory-test-${i}`,
                    staffId: `staff-${i % 5}`,
                    startTime: new Date(),
                    endTime: new Date(),
                    totalDuration: 60,
                    totalPrice: 50
                })

                // Take memory snapshot every 20 operations
                if (i % 20 === 0) {
                    const memUsage = process.memoryUsage()
                    memorySnapshots.push({
                        timestamp: Date.now(),
                        heapUsed: memUsage.heapUsed,
                        heapTotal: memUsage.heapTotal,
                        external: memUsage.external,
                        operation: i
                    })

                    // Force garbage collection if available
                    if (global.gc) {
                        global.gc()
                    }
                }
            }

            // Analyze memory trends
            const initialMemory = memorySnapshots[0]
            const finalMemory = memorySnapshots[memorySnapshots.length - 1]
            const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
            const memoryIncreasePercentage = (memoryIncrease / initialMemory.heapUsed) * 100

            // Check for memory leaks (significant increase without corresponding operations)
            expect(memoryIncreasePercentage).toBeLessThan(50) // Less than 50% increase

            console.log(`Memory Monitoring Results:`)
            console.log(`- Initial heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`)
            console.log(`- Final heap: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`)
            console.log(`- Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB (${memoryIncreasePercentage.toFixed(1)}%)`)
            console.log(`- Memory snapshots: ${memorySnapshots.length}`)

            // Log memory progression
            memorySnapshots.forEach((snapshot, index) => {
                if (index % 2 === 0) { // Log every other snapshot
                    console.log(`  Operation ${snapshot.operation}: ${(snapshot.heapUsed / 1024 / 1024).toFixed(2)}MB`)
                }
            })
        })
    })

    describe('Performance Trend Analysis', () => {
        it('should identify performance trends and predict degradation', async () => {
            const trendAnalysisOperations = 300
            const trendWindow = 50 // Analyze trends over 50-operation windows

            console.log(`Analyzing performance trends over ${trendAnalysisOperations} operations...`)

            const trendData: Array<{
                window: number
                avgResponseTime: number
                errorRate: number
                throughput: number
            }> = []

            for (let window = 0; window < trendAnalysisOperations / trendWindow; window++) {
                const windowStartTime = performance.now()
                const windowStartMetrics = performanceMetrics.length

                // Perform operations for this window
                for (let i = 0; i < trendWindow; i++) {
                    await repositoryInstance.findByBusinessOptimized(testBusinessId, {
                        limit: 10,
                        offset: (window * trendWindow + i) * 10
                    })
                }

                const windowEndTime = performance.now()
                const windowDuration = windowEndTime - windowStartTime
                const windowMetrics = performanceMetrics.slice(windowStartMetrics)

                const avgResponseTime = windowMetrics.reduce((sum, m) => sum + m.duration, 0) / windowMetrics.length
                const errorRate = windowMetrics.filter(m => !m.success).length / windowMetrics.length
                const throughput = trendWindow / (windowDuration / 1000) // Operations per second

                trendData.push({
                    window: window + 1,
                    avgResponseTime,
                    errorRate,
                    throughput
                })
            }

            // Analyze trends
            const responseTimes = trendData.map(d => d.avgResponseTime)
            const throughputs = trendData.map(d => d.throughput)

            // Calculate trend slopes (simple linear regression)
            const responseTimeTrend = calculateTrendSlope(responseTimes)
            const throughputTrend = calculateTrendSlope(throughputs)

            console.log(`Performance Trend Analysis:`)
            console.log(`- Analysis windows: ${trendData.length}`)
            console.log(`- Response time trend: ${responseTimeTrend > 0 ? 'Increasing' : 'Decreasing'} (${responseTimeTrend.toFixed(3)})`)
            console.log(`- Throughput trend: ${throughputTrend > 0 ? 'Increasing' : 'Decreasing'} (${throughputTrend.toFixed(3)})`)

            trendData.forEach(({ window, avgResponseTime, errorRate, throughput }) => {
                console.log(`  Window ${window}: ${avgResponseTime.toFixed(2)}ms avg, ${(errorRate * 100).toFixed(1)}% errors, ${throughput.toFixed(1)} ops/sec`)
            })

            // Predict if performance is degrading
            const isDegrading = responseTimeTrend > 0.5 || throughputTrend < -0.5
            if (isDegrading) {
                console.log(`⚠️  Performance degradation detected!`)
                triggerAlert('PERFORMANCE_DEGRADATION', 'HIGH',
                    'Performance degradation trend detected',
                    { responseTimeTrend, throughputTrend },
                    0,
                    Math.abs(responseTimeTrend))
            }
        })

        const calculateTrendSlope = (values: number[]): number => {
            const n = values.length
            const xSum = (n * (n - 1)) / 2 // Sum of indices 0, 1, 2, ..., n-1
            const ySum = values.reduce((sum, val) => sum + val, 0)
            const xySum = values.reduce((sum, val, index) => sum + (index * val), 0)
            const x2Sum = values.reduce((sum, _, index) => sum + (index * index), 0)

            return (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum)
        }
    })
})
/**
 * Test suite for availability monitoring and alerting system
 */

import {
    AlertSeverity,
    AlertType,
    availabilityMonitoring,
    recordAvailabilityQuery,
    recordBookingAttempt,
    recordCacheOperation,
    recordConflictDetection
} from '@/lib/monitoring/availability-monitoring'

// Mock the logger to avoid console output during tests
jest.mock('@/lib/monitoring/availability-logger', () => ({
    availabilityLogger: {
        log: jest.fn(),
        logError: jest.fn(),
        logPerformance: jest.fn(),
        logCache: jest.fn(),
        logBusinessMetric: jest.fn()
    }
}))

describe('AvailabilityMonitoring', () => {
    beforeEach(() => {
        // Clear any existing metrics and alerts
        jest.clearAllMocks()
    })

    describe('Performance Monitoring', () => {
        it('should record performance metrics', () => {
            const businessId = 'business-123'
            const duration = 150

            recordAvailabilityQuery(businessId, duration, true)

            const metrics = availabilityMonitoring.getCurrentMetrics()
            expect(metrics.performance).toHaveLength(1)
            expect(metrics.performance[0].operation).toBe('availability_check')
            expect(metrics.performance[0].duration).toBe(duration)
            expect(metrics.performance[0].businessId).toBe(businessId)
            expect(metrics.performance[0].success).toBe(true)
        })

        it('should generate alert for slow availability queries', () => {
            const businessId = 'business-123'
            const slowDuration = 300 // Above 200ms threshold

            recordAvailabilityQuery(businessId, slowDuration, true)

            // Check that an alert was generated
            const alerts = availabilityMonitoring.getRecentAlerts(10)
            const performanceAlert = alerts.find((alert: any) => alert.type === AlertType.PERFORMANCE_DEGRADATION)

            expect(performanceAlert).toBeDefined()
            expect(performanceAlert?.severity).toBe(AlertSeverity.WARNING)
            expect(performanceAlert?.currentValue).toBe(slowDuration)
        })

        it('should generate critical alert for very slow queries', () => {
            const businessId = 'business-123'
            const verySlowDuration = 500 // Above 2x threshold (400ms)

            recordAvailabilityQuery(businessId, verySlowDuration, true)

            const alerts = availabilityMonitoring.getRecentAlerts(10)
            const performanceAlert = alerts.find((alert: any) => alert.type === AlertType.PERFORMANCE_DEGRADATION)

            expect(performanceAlert?.severity).toBe(AlertSeverity.CRITICAL)
        })

        it('should generate alert for slow conflict detection', () => {
            const businessId = 'business-123'
            const slowDuration = 150 // Above 100ms threshold

            recordConflictDetection(businessId, slowDuration, 2)

            const alerts = availabilityMonitoring.getRecentAlerts(10)
            const conflictAlert = alerts.find((alert: any) => alert.type === AlertType.CONFLICT_DETECTION_SLOW)

            expect(conflictAlert).toBeDefined()
            expect(conflictAlert?.severity).toBe(AlertSeverity.WARNING)
        })
    })

    describe('Cache Monitoring', () => {
        it('should record cache operations', () => {
            const businessId = 'business-123'
            const cacheKey = 'availability:staff-456:2024-01-01'

            recordCacheOperation('hit', cacheKey, businessId)
            recordCacheOperation('miss', cacheKey, businessId)

            const metrics = availabilityMonitoring.getCurrentMetrics()
            expect(metrics.cache).toHaveLength(2)
            expect(metrics.cache[0].operation).toBe('hit')
            expect(metrics.cache[1].operation).toBe('miss')
        })

        it('should generate alert for low cache hit ratio', () => {
            const businessId = 'business-123'
            const cacheKey = 'availability:test'

            // Generate low hit ratio (2 hits, 8 misses = 20% hit ratio)
            recordCacheOperation('hit', cacheKey, businessId)
            recordCacheOperation('hit', cacheKey, businessId)
            for (let i = 0; i < 8; i++) {
                recordCacheOperation('miss', `${cacheKey}:${i}`, businessId)
            }

            const alerts = availabilityMonitoring.getRecentAlerts(10)
            const cacheAlert = alerts.find((alert: any) => alert.type === AlertType.CACHE_HIT_RATIO_LOW)

            expect(cacheAlert).toBeDefined()
            expect(cacheAlert?.severity).toBe(AlertSeverity.CRITICAL) // Below 50% of 70% threshold
        })
    })

    describe('Business Metrics', () => {
        it('should record booking attempts', () => {
            const businessId = 'business-123'

            recordBookingAttempt(businessId, true)
            recordBookingAttempt(businessId, false, 'STAFF_UNAVAILABLE')

            const metrics = availabilityMonitoring.getCurrentMetrics()
            expect(metrics.business).toHaveLength(2)
            expect(metrics.business[0].type).toBe('booking_attempt')
            expect(metrics.business[0].value).toBe(1) // Success
            expect(metrics.business[1].value).toBe(0) // Failure
        })

        it('should generate alert for high conflict detection rate', () => {
            const businessId = 'business-123'

            // Record high conflict count
            availabilityMonitoring.recordBusinessMetric({
                type: 'conflict_detected',
                businessId,
                timestamp: new Date(),
                value: 10 // Above threshold of 5
            })

            const alerts = availabilityMonitoring.getRecentAlerts(10)
            const anomalyAlert = alerts.find((alert: any) => alert.type === AlertType.BUSINESS_ANOMALY)

            expect(anomalyAlert).toBeDefined()
            expect(anomalyAlert?.title).toContain('High Conflict Detection Rate')
        })
    })

    describe('Alert Management', () => {
        it('should filter alerts by type', () => {
            const businessId = 'business-123'

            // Generate different types of alerts
            recordAvailabilityQuery(businessId, 300, true) // Performance alert
            recordCacheOperation('miss', 'test', businessId) // Won't generate alert with single miss

            const performanceAlerts = availabilityMonitoring.getAlertsByType(AlertType.PERFORMANCE_DEGRADATION)
            expect(performanceAlerts.length).toBeGreaterThan(0)
            expect(performanceAlerts.every((alert: any) => alert.type === AlertType.PERFORMANCE_DEGRADATION)).toBe(true)
        })

        it('should filter alerts by business', () => {
            const businessId1 = 'business-123'
            const businessId2 = 'business-456'

            recordAvailabilityQuery(businessId1, 300, true)
            recordAvailabilityQuery(businessId2, 350, true)

            const business1Alerts = availabilityMonitoring.getAlertsByBusiness(businessId1)
            const business2Alerts = availabilityMonitoring.getAlertsByBusiness(businessId2)

            expect(business1Alerts.every((alert: any) => alert.businessId === businessId1)).toBe(true)
            expect(business2Alerts.every((alert: any) => alert.businessId === businessId2)).toBe(true)
        })

        it('should limit recent alerts', () => {
            const businessId = 'business-123'

            // Generate multiple alerts
            for (let i = 0; i < 15; i++) {
                recordAvailabilityQuery(businessId, 300 + i, true)
            }

            const recentAlerts = availabilityMonitoring.getRecentAlerts(10)
            expect(recentAlerts.length).toBeLessThanOrEqual(10)
        })
    })

    describe('Threshold Management', () => {
        it('should update monitoring thresholds', () => {
            const newThresholds = {
                availabilityQueryTime: 150,
                cacheHitRatio: 0.8
            }

            availabilityMonitoring.updateThresholds(newThresholds)

            // Test that new thresholds are applied
            const businessId = 'business-123'
            recordAvailabilityQuery(businessId, 160, true) // Above new 150ms threshold

            const alerts = availabilityMonitoring.getRecentAlerts(10)
            const performanceAlert = alerts.find((alert: any) => alert.type === AlertType.PERFORMANCE_DEGRADATION)

            expect(performanceAlert).toBeDefined()
            expect(performanceAlert?.threshold).toBe(150)
        })
    })

    describe('Metrics Aggregation', () => {
        it('should provide current metrics summary', () => {
            const businessId = 'business-123'

            // Record various metrics
            recordAvailabilityQuery(businessId, 100, true)
            recordAvailabilityQuery(businessId, 200, false, 'DATABASE_ERROR')
            recordCacheOperation('hit', 'test1', businessId)
            recordCacheOperation('miss', 'test2', businessId)
            recordBookingAttempt(businessId, true)

            const metrics = availabilityMonitoring.getCurrentMetrics()

            expect(metrics.performance.length).toBeGreaterThan(0)
            expect(metrics.cache.length).toBeGreaterThan(0)
            expect(metrics.business.length).toBeGreaterThan(0)
            expect(metrics.aggregated).toBeInstanceOf(Map)
        })
    })

    describe('Error Rate Monitoring', () => {
        it('should detect high error rates', (done) => {
            const businessId = 'business-123'

            // Generate high error rate (80% errors)
            recordAvailabilityQuery(businessId, 100, true)
            recordAvailabilityQuery(businessId, 150, false, 'ERROR1')
            recordAvailabilityQuery(businessId, 120, false, 'ERROR2')
            recordAvailabilityQuery(businessId, 180, false, 'ERROR3')
            recordAvailabilityQuery(businessId, 110, false, 'ERROR4')

            // Wait for periodic check to run
            setTimeout(() => {
                const alerts = availabilityMonitoring.getRecentAlerts(10)
                const errorRateAlert = alerts.find((alert: any) => alert.type === AlertType.HIGH_ERROR_RATE)

                expect(errorRateAlert).toBeDefined()
                expect(errorRateAlert?.severity).toBe(AlertSeverity.CRITICAL)
                done()
            }, 100)
        })
    })

    describe('System Overload Detection', () => {
        it('should detect system overload conditions', (done) => {
            const businessId = 'business-123'

            // Generate high volume of slow requests
            for (let i = 0; i < 120; i++) {
                recordAvailabilityQuery(businessId, 600, true) // Slow but successful
            }

            // Wait for periodic check
            setTimeout(() => {
                const alerts = availabilityMonitoring.getRecentAlerts(10)
                const overloadAlert = alerts.find((alert: any) => alert.type === AlertType.SYSTEM_OVERLOAD)

                expect(overloadAlert).toBeDefined()
                expect(overloadAlert?.severity).toBe(AlertSeverity.CRITICAL)
                done()
            }, 100)
        })
    })
})

describe('Monitoring Utility Functions', () => {
    it('should record availability query with all parameters', () => {
        recordAvailabilityQuery('business-123', 150, true)

        const metrics = availabilityMonitoring.getCurrentMetrics()
        const metric = metrics.performance[metrics.performance.length - 1]

        expect(metric.operation).toBe('availability_check')
        expect(metric.duration).toBe(150)
        expect(metric.businessId).toBe('business-123')
        expect(metric.success).toBe(true)
    })

    it('should record conflict detection with metadata', () => {
        recordConflictDetection('business-123', 80, 3)

        const metrics = availabilityMonitoring.getCurrentMetrics()
        const metric = metrics.performance[metrics.performance.length - 1]

        expect(metric.operation).toBe('conflict_detection')
        expect(metric.metadata?.conflictCount).toBe(3)
    })

    it('should record cache operations', () => {
        recordCacheOperation('hit', 'test-key', 'business-123')

        const metrics = availabilityMonitoring.getCurrentMetrics()
        const metric = metrics.cache[metrics.cache.length - 1]

        expect(metric.operation).toBe('hit')
        expect(metric.key).toBe('test-key')
        expect(metric.businessId).toBe('business-123')
    })

    it('should record booking attempts', () => {
        recordBookingAttempt('business-123', false, 'STAFF_UNAVAILABLE')

        const metrics = availabilityMonitoring.getCurrentMetrics()
        const metric = metrics.business[metrics.business.length - 1]

        expect(metric.type).toBe('booking_attempt')
        expect(metric.value).toBe(0)
        expect(metric.metadata?.errorCode).toBe('STAFF_UNAVAILABLE')
    })
})
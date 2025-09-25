/**
 * Comprehensive monitoring and alerting system for availability infrastructure
 * Tracks performance metrics, cache hit ratios, conflict detection accuracy, and business usage
 */

import { availabilityLogger, BusinessMetric, CacheMetric, LogLevel, PerformanceMetric } from './availability-logger'

// Performance thresholds for alerting
interface PerformanceThresholds {
    availabilityQueryTime: number      // 200ms
    conflictDetectionTime: number      // 100ms
    cacheHitRatio: number             // 70%
    errorRate: number                 // 5%
    responseTime95th: number          // 500ms
}

// Default performance thresholds
const DEFAULT_THRESHOLDS: PerformanceThresholds = {
    availabilityQueryTime: 200,
    conflictDetectionTime: 100,
    cacheHitRatio: 0.7,
    errorRate: 0.05,
    responseTime95th: 500
}

// Alert types
export enum AlertType {
    PERFORMANCE_DEGRADATION = 'PERFORMANCE_DEGRADATION',
    CACHE_HIT_RATIO_LOW = 'CACHE_HIT_RATIO_LOW',
    HIGH_ERROR_RATE = 'HIGH_ERROR_RATE',
    CONFLICT_DETECTION_SLOW = 'CONFLICT_DETECTION_SLOW',
    SYSTEM_OVERLOAD = 'SYSTEM_OVERLOAD',
    BUSINESS_ANOMALY = 'BUSINESS_ANOMALY'
}

// Alert severity levels
export enum AlertSeverity {
    INFO = 'INFO',
    WARNING = 'WARNING',
    CRITICAL = 'CRITICAL',
    EMERGENCY = 'EMERGENCY'
}

// Alert interface
export interface Alert {
    id: string
    type: AlertType
    severity: AlertSeverity
    title: string
    description: string
    timestamp: Date
    businessId?: string
    metrics: Record<string, number>
    threshold?: number
    currentValue: number
    recommendations: string[]
}

// Monitoring metrics aggregation
interface MetricsAggregation {
    totalRequests: number
    successfulRequests: number
    errorCount: number
    averageResponseTime: number
    p95ResponseTime: number
    p99ResponseTime: number
    cacheHits: number
    cacheMisses: number
    conflictDetections: number
    businessMetrics: Map<string, number>
}

// Time window for metrics aggregation
enum TimeWindow {
    MINUTE = 60 * 1000,
    FIVE_MINUTES = 5 * 60 * 1000,
    FIFTEEN_MINUTES = 15 * 60 * 1000,
    HOUR = 60 * 60 * 1000,
    DAY = 24 * 60 * 60 * 1000
}

class AvailabilityMonitoring {
    private static instance: AvailabilityMonitoring
    private thresholds: PerformanceThresholds
    private metricsBuffer: Map<string, MetricsAggregation> = new Map()
    private alertHistory: Alert[] = []
    private monitoringInterval: NodeJS.Timeout | null = null
    private performanceMetrics: PerformanceMetric[] = []
    private cacheMetrics: CacheMetric[] = []
    private businessMetrics: BusinessMetric[] = []

    private constructor(thresholds: PerformanceThresholds = DEFAULT_THRESHOLDS) {
        this.thresholds = thresholds
        this.startMonitoring()
    }

    static getInstance(thresholds?: PerformanceThresholds): AvailabilityMonitoring {
        if (!AvailabilityMonitoring.instance) {
            AvailabilityMonitoring.instance = new AvailabilityMonitoring(thresholds)
        }
        return AvailabilityMonitoring.instance
    }

    // Record performance metric
    recordPerformanceMetric(metric: PerformanceMetric): void {
        this.performanceMetrics.push(metric)

        // Check for immediate alerts
        this.checkPerformanceThresholds(metric)

        // Update aggregated metrics
        this.updateAggregatedMetrics(metric)
    }

    // Record cache metric
    recordCacheMetric(metric: CacheMetric): void {
        this.cacheMetrics.push(metric)

        // Update cache hit ratio tracking
        this.updateCacheMetrics(metric)
    }

    // Record business metric
    recordBusinessMetric(metric: BusinessMetric): void {
        this.businessMetrics.push(metric)

        // Check for business anomalies
        this.checkBusinessAnomalies(metric)
    }

    // Check performance thresholds and generate alerts
    private checkPerformanceThresholds(metric: PerformanceMetric): void {
        // Check availability query time
        if (metric.operation === 'availability_check' && metric.duration > this.thresholds.availabilityQueryTime) {
            this.generateAlert({
                type: AlertType.PERFORMANCE_DEGRADATION,
                severity: metric.duration > this.thresholds.availabilityQueryTime * 2 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
                title: 'Slow Availability Query',
                description: `Availability query took ${metric.duration}ms, exceeding threshold of ${this.thresholds.availabilityQueryTime}ms`,
                businessId: metric.businessId,
                metrics: { duration: metric.duration, threshold: this.thresholds.availabilityQueryTime },
                currentValue: metric.duration,
                threshold: this.thresholds.availabilityQueryTime,
                recommendations: [
                    'Check database query performance',
                    'Verify cache is functioning properly',
                    'Consider optimizing availability calculation logic'
                ]
            })
        }

        // Check conflict detection time
        if (metric.operation === 'conflict_detection' && metric.duration > this.thresholds.conflictDetectionTime) {
            this.generateAlert({
                type: AlertType.CONFLICT_DETECTION_SLOW,
                severity: metric.duration > this.thresholds.conflictDetectionTime * 3 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
                title: 'Slow Conflict Detection',
                description: `Conflict detection took ${metric.duration}ms, exceeding threshold of ${this.thresholds.conflictDetectionTime}ms`,
                businessId: metric.businessId,
                metrics: { duration: metric.duration, threshold: this.thresholds.conflictDetectionTime },
                currentValue: metric.duration,
                threshold: this.thresholds.conflictDetectionTime,
                recommendations: [
                    'Review conflict detection algorithm efficiency',
                    'Check database indexes for appointment queries',
                    'Consider caching frequently accessed conflict data'
                ]
            })
        }
    }

    // Update cache metrics and check hit ratio
    private updateCacheMetrics(metric: CacheMetric): void {
        const businessId = metric.businessId || 'global'
        const timeWindow = this.getTimeWindowKey(TimeWindow.FIFTEEN_MINUTES)
        const key = `${businessId}_${timeWindow}`

        const aggregation = this.metricsBuffer.get(key) || this.createEmptyAggregation()

        if (metric.operation === 'hit') {
            aggregation.cacheHits += 1
        } else if (metric.operation === 'miss') {
            aggregation.cacheMisses += 1
        }

        this.metricsBuffer.set(key, aggregation)

        // Check cache hit ratio
        const totalCacheOperations = aggregation.cacheHits + aggregation.cacheMisses
        if (totalCacheOperations >= 10) { // Minimum sample size
            const hitRatio = aggregation.cacheHits / totalCacheOperations

            if (hitRatio < this.thresholds.cacheHitRatio) {
                this.generateAlert({
                    type: AlertType.CACHE_HIT_RATIO_LOW,
                    severity: hitRatio < this.thresholds.cacheHitRatio * 0.5 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
                    title: 'Low Cache Hit Ratio',
                    description: `Cache hit ratio is ${(hitRatio * 100).toFixed(1)}%, below threshold of ${(this.thresholds.cacheHitRatio * 100).toFixed(1)}%`,
                    businessId: metric.businessId,
                    metrics: {
                        hitRatio,
                        threshold: this.thresholds.cacheHitRatio,
                        hits: aggregation.cacheHits,
                        misses: aggregation.cacheMisses
                    },
                    currentValue: hitRatio,
                    threshold: this.thresholds.cacheHitRatio,
                    recommendations: [
                        'Review cache invalidation strategy',
                        'Check cache TTL settings',
                        'Verify cache key generation logic',
                        'Consider increasing cache memory allocation'
                    ]
                })
            }
        }
    }

    // Check for business anomalies
    private checkBusinessAnomalies(metric: BusinessMetric): void {
        // Track booking attempt success rates
        if (metric.type === 'booking_attempt') {
            const businessId = metric.businessId
            const timeWindow = this.getTimeWindowKey(TimeWindow.HOUR)
            const key = `${businessId}_${timeWindow}_booking_success`

            // Get historical success rate for comparison
            const historicalRate = this.getHistoricalBookingSuccessRate(businessId)
            const currentRate = metric.value // 1 for success, 0 for failure

            // If current rate is significantly lower than historical, alert
            if (historicalRate > 0.8 && currentRate < 0.5) {
                this.generateAlert({
                    type: AlertType.BUSINESS_ANOMALY,
                    severity: AlertSeverity.WARNING,
                    title: 'Booking Success Rate Drop',
                    description: `Booking success rate has dropped significantly for business ${businessId}`,
                    businessId,
                    metrics: { currentRate, historicalRate },
                    currentValue: currentRate,
                    threshold: historicalRate * 0.8,
                    recommendations: [
                        'Check for system issues affecting bookings',
                        'Review recent changes to availability logic',
                        'Verify staff availability data is up to date'
                    ]
                })
            }
        }

        // Track conflict detection frequency
        if (metric.type === 'conflict_detected' && metric.value > 5) {
            this.generateAlert({
                type: AlertType.BUSINESS_ANOMALY,
                severity: AlertSeverity.INFO,
                title: 'High Conflict Detection Rate',
                description: `Unusually high number of conflicts detected: ${metric.value}`,
                businessId: metric.businessId,
                metrics: { conflictCount: metric.value },
                currentValue: metric.value,
                threshold: 5,
                recommendations: [
                    'Review staff availability schedules',
                    'Check for overlapping appointments',
                    'Verify business hours configuration'
                ]
            })
        }
    }

    // Generate and process alert
    private generateAlert(alertData: Omit<Alert, 'id' | 'timestamp'>): void {
        const alert: Alert = {
            id: this.generateAlertId(),
            timestamp: new Date(),
            ...alertData
        }

        // Add to alert history
        this.alertHistory.push(alert)

        // Log the alert
        availabilityLogger.log(
            this.alertSeverityToLogLevel(alert.severity),
            `ALERT: ${alert.title}`,
            {
                operation: 'monitoring_alert',
                businessId: alert.businessId
            },
            {
                alert,
                alertType: alert.type,
                severity: alert.severity
            }
        )

        // Send alert to external systems
        this.sendAlert(alert)

        // Cleanup old alerts (keep last 1000)
        if (this.alertHistory.length > 1000) {
            this.alertHistory = this.alertHistory.slice(-1000)
        }
    }

    // Send alert to external monitoring systems
    private sendAlert(alert: Alert): void {
        if (process.env.NODE_ENV === 'production') {
            // Send to external alerting systems
            // Examples: PagerDuty, Slack, email, SMS

            switch (alert.severity) {
                case AlertSeverity.EMERGENCY:
                case AlertSeverity.CRITICAL:
                    // Send to PagerDuty, SMS, immediate notification
                    this.sendCriticalAlert(alert)
                    break

                case AlertSeverity.WARNING:
                    // Send to Slack, email
                    this.sendWarningAlert(alert)
                    break

                case AlertSeverity.INFO:
                    // Log to monitoring dashboard
                    this.sendInfoAlert(alert)
                    break
            }
        }
    }

    // Send critical alerts (PagerDuty, SMS, etc.)
    private sendCriticalAlert(alert: Alert): void {
        // Example integrations:
        // - PagerDuty incident creation
        // - SMS notifications to on-call engineers
        // - Slack alerts to critical channels

        console.error(`CRITICAL ALERT: ${alert.title}`, alert)
    }

    // Send warning alerts (Slack, email)
    private sendWarningAlert(alert: Alert): void {
        // Example integrations:
        // - Slack notifications
        // - Email to development team
        // - Dashboard notifications

        console.warn(`WARNING ALERT: ${alert.title}`, alert)
    }

    // Send info alerts (dashboard logging)
    private sendInfoAlert(alert: Alert): void {
        // Example integrations:
        // - Dashboard metrics
        // - Analytics tracking
        // - Business intelligence systems

        console.info(`INFO ALERT: ${alert.title}`, alert)
    }

    // Start monitoring loop
    private startMonitoring(): void {
        this.monitoringInterval = setInterval(() => {
            this.performPeriodicChecks()
        }, TimeWindow.MINUTE) // Check every minute
    }

    // Perform periodic monitoring checks
    private performPeriodicChecks(): void {
        try {
            // Check error rates
            this.checkErrorRates()

            // Check system overload
            this.checkSystemOverload()

            // Cleanup old metrics
            this.cleanupOldMetrics()

        } catch (error) {
            availabilityLogger.log(LogLevel.ERROR, 'Error in periodic monitoring checks', {
                operation: 'monitoring_check'
            }, { error: error instanceof Error ? error.message : String(error) })
        }
    }

    // Check error rates across the system
    private checkErrorRates(): void {
        const timeWindow = this.getTimeWindowKey(TimeWindow.FIFTEEN_MINUTES)
        const recentMetrics = this.performanceMetrics.filter(
            m => Date.now() - m.timestamp.getTime() < TimeWindow.FIFTEEN_MINUTES
        )

        if (recentMetrics.length === 0) return

        const errorCount = recentMetrics.filter(m => !m.success).length
        const totalCount = recentMetrics.length
        const errorRate = errorCount / totalCount

        if (errorRate > this.thresholds.errorRate) {
            this.generateAlert({
                type: AlertType.HIGH_ERROR_RATE,
                severity: errorRate > this.thresholds.errorRate * 2 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
                title: 'High Error Rate Detected',
                description: `Error rate is ${(errorRate * 100).toFixed(1)}%, exceeding threshold of ${(this.thresholds.errorRate * 100).toFixed(1)}%`,
                metrics: { errorRate, threshold: this.thresholds.errorRate, errorCount, totalCount },
                currentValue: errorRate,
                threshold: this.thresholds.errorRate,
                recommendations: [
                    'Check application logs for error patterns',
                    'Verify database connectivity',
                    'Review recent deployments',
                    'Check external service dependencies'
                ]
            })
        }
    }

    // Check for system overload conditions
    private checkSystemOverload(): void {
        const recentMetrics = this.performanceMetrics.filter(
            m => Date.now() - m.timestamp.getTime() < TimeWindow.FIVE_MINUTES
        )

        if (recentMetrics.length > 100) { // High request volume
            const averageResponseTime = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length

            if (averageResponseTime > this.thresholds.responseTime95th) {
                this.generateAlert({
                    type: AlertType.SYSTEM_OVERLOAD,
                    severity: AlertSeverity.CRITICAL,
                    title: 'System Overload Detected',
                    description: `High request volume (${recentMetrics.length} requests) with elevated response times (${averageResponseTime.toFixed(0)}ms avg)`,
                    metrics: {
                        requestCount: recentMetrics.length,
                        averageResponseTime,
                        threshold: this.thresholds.responseTime95th
                    },
                    currentValue: averageResponseTime,
                    threshold: this.thresholds.responseTime95th,
                    recommendations: [
                        'Consider scaling application instances',
                        'Check database connection pool',
                        'Review cache performance',
                        'Implement request throttling if needed'
                    ]
                })
            }
        }
    }

    // Utility methods
    private createEmptyAggregation(): MetricsAggregation {
        return {
            totalRequests: 0,
            successfulRequests: 0,
            errorCount: 0,
            averageResponseTime: 0,
            p95ResponseTime: 0,
            p99ResponseTime: 0,
            cacheHits: 0,
            cacheMisses: 0,
            conflictDetections: 0,
            businessMetrics: new Map()
        }
    }

    private updateAggregatedMetrics(metric: PerformanceMetric): void {
        const businessId = metric.businessId || 'global'
        const timeWindow = this.getTimeWindowKey(TimeWindow.FIFTEEN_MINUTES)
        const key = `${businessId}_${timeWindow}`

        const aggregation = this.metricsBuffer.get(key) || this.createEmptyAggregation()

        aggregation.totalRequests += 1
        if (metric.success) {
            aggregation.successfulRequests += 1
        } else {
            aggregation.errorCount += 1
        }

        // Update response time metrics
        const totalResponseTime = aggregation.averageResponseTime * (aggregation.totalRequests - 1) + metric.duration
        aggregation.averageResponseTime = totalResponseTime / aggregation.totalRequests

        this.metricsBuffer.set(key, aggregation)
    }

    private getTimeWindowKey(window: TimeWindow): string {
        const now = Date.now()
        const windowStart = Math.floor(now / window) * window
        return windowStart.toString()
    }

    private generateAlertId(): string {
        return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    private alertSeverityToLogLevel(severity: AlertSeverity): LogLevel {
        switch (severity) {
            case AlertSeverity.EMERGENCY:
            case AlertSeverity.CRITICAL:
                return LogLevel.FATAL
            case AlertSeverity.WARNING:
                return LogLevel.WARN
            case AlertSeverity.INFO:
                return LogLevel.INFO
            default:
                return LogLevel.INFO
        }
    }

    private getHistoricalBookingSuccessRate(businessId: string): number {
        // In a real implementation, this would query historical data
        // For now, return a default success rate
        return 0.85
    }

    private cleanupOldMetrics(): void {
        const cutoffTime = Date.now() - TimeWindow.DAY

        this.performanceMetrics = this.performanceMetrics.filter(m => m.timestamp.getTime() > cutoffTime)
        this.cacheMetrics = this.cacheMetrics.filter(m => m.timestamp.getTime() > cutoffTime)
        this.businessMetrics = this.businessMetrics.filter(m => m.timestamp.getTime() > cutoffTime)
    }

    // Public API methods
    getRecentAlerts(count: number = 50): Alert[] {
        return this.alertHistory.slice(-count)
    }

    getAlertsByType(type: AlertType): Alert[] {
        return this.alertHistory.filter(alert => alert.type === type)
    }

    getAlertsByBusiness(businessId: string): Alert[] {
        return this.alertHistory.filter(alert => alert.businessId === businessId)
    }

    getCurrentMetrics(): {
        performance: PerformanceMetric[]
        cache: CacheMetric[]
        business: BusinessMetric[]
        aggregated: Map<string, MetricsAggregation>
    } {
        return {
            performance: [...this.performanceMetrics],
            cache: [...this.cacheMetrics],
            business: [...this.businessMetrics],
            aggregated: new Map(this.metricsBuffer)
        }
    }

    updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
        this.thresholds = { ...this.thresholds, ...newThresholds }

        availabilityLogger.log(LogLevel.INFO, 'Monitoring thresholds updated', {
            operation: 'threshold_update'
        }, { newThresholds: this.thresholds })
    }

    // Cleanup
    destroy(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval)
            this.monitoringInterval = null
        }
    }
}

// Export singleton instance
export const availabilityMonitoring = AvailabilityMonitoring.getInstance()

// Convenience functions for recording metrics
export function recordAvailabilityQuery(businessId: string, duration: number, success: boolean, errorCode?: string): void {
    availabilityMonitoring.recordPerformanceMetric({
        operation: 'availability_check',
        duration,
        timestamp: new Date(),
        businessId,
        success,
        errorCode
    })
}

export function recordConflictDetection(businessId: string, duration: number, conflictCount: number): void {
    availabilityMonitoring.recordPerformanceMetric({
        operation: 'conflict_detection',
        duration,
        timestamp: new Date(),
        businessId,
        success: true,
        metadata: { conflictCount }
    })
}

export function recordCacheOperation(operation: 'hit' | 'miss' | 'set' | 'invalidate', key: string, businessId: string): void {
    availabilityMonitoring.recordCacheMetric({
        operation,
        key,
        timestamp: new Date(),
        businessId
    })
}

export function recordBookingAttempt(businessId: string, success: boolean, errorCode?: string): void {
    availabilityMonitoring.recordBusinessMetric({
        type: 'booking_attempt',
        businessId,
        timestamp: new Date(),
        value: success ? 1 : 0,
        metadata: { success, errorCode }
    })
}
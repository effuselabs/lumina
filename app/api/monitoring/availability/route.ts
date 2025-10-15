/**
 * API endpoint for availability monitoring dashboard
 * Provides real-time metrics, alerts, and system health status
 */

import { availabilityLogger, LogLevel } from '@/lib/monitoring/availability-logger'
import { AlertSeverity, AlertType, availabilityMonitoring } from '@/lib/monitoring/availability-monitoring'
import { gracefulDegradation } from '@/lib/services/graceful-degradation'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/monitoring/availability - Get monitoring dashboard data
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const businessId = searchParams.get('businessId')
        const timeRange = searchParams.get('timeRange') || '1h'
        const alertType = searchParams.get('alertType') as AlertType | null

        // Get current metrics
        const metrics = availabilityMonitoring.getCurrentMetrics()

        // Get recent alerts
        const recentAlerts = alertType
            ? availabilityMonitoring.getAlertsByType(alertType)
            : availabilityMonitoring.getRecentAlerts(100)

        // Filter alerts by business if specified
        const filteredAlerts = businessId
            ? recentAlerts.filter(alert => alert.businessId === businessId)
            : recentAlerts

        // Get service health status
        const serviceHealth = gracefulDegradation.getAllServiceHealth()

        // Calculate summary statistics
        const now = Date.now()
        const timeRangeMs = parseTimeRange(timeRange)
        const cutoffTime = now - timeRangeMs

        const recentPerformanceMetrics = metrics.performance.filter(
            m => m.timestamp.getTime() > cutoffTime
        )

        const recentCacheMetrics = metrics.cache.filter(
            m => m.timestamp.getTime() > cutoffTime
        )

        const summary = {
            totalRequests: recentPerformanceMetrics.length,
            successRate: recentPerformanceMetrics.length > 0
                ? recentPerformanceMetrics.filter(m => m.success).length / recentPerformanceMetrics.length
                : 1,
            averageResponseTime: recentPerformanceMetrics.length > 0
                ? recentPerformanceMetrics.reduce((sum, m) => sum + m.duration, 0) / recentPerformanceMetrics.length
                : 0,
            cacheHitRatio: recentCacheMetrics.length > 0
                ? recentCacheMetrics.filter(m => m.operation === 'hit').length /
                recentCacheMetrics.filter(m => m.operation === 'hit' || m.operation === 'miss').length
                : 0,
            activeAlerts: filteredAlerts.filter(alert =>
                alert.severity === AlertSeverity.CRITICAL || alert.severity === AlertSeverity.EMERGENCY
            ).length,
            systemHealth: calculateSystemHealth(serviceHealth, filteredAlerts)
        }

        // Performance breakdown by operation
        const performanceByOperation = recentPerformanceMetrics.reduce((acc, metric) => {
            if (!acc[metric.operation]) {
                acc[metric.operation] = {
                    count: 0,
                    totalDuration: 0,
                    successCount: 0,
                    errorCount: 0
                }
            }

            acc[metric.operation].count += 1
            acc[metric.operation].totalDuration += metric.duration

            if (metric.success) {
                acc[metric.operation].successCount += 1
            } else {
                acc[metric.operation].errorCount += 1
            }

            return acc
        }, {} as Record<string, any>)

        // Convert to array with calculated averages
        const operationMetrics = Object.entries(performanceByOperation).map(([operation, data]) => ({
            operation,
            count: data.count,
            averageDuration: data.totalDuration / data.count,
            successRate: data.successCount / data.count,
            errorRate: data.errorCount / data.count
        }))

        // Alert summary by type
        const alertSummary = filteredAlerts.reduce((acc, alert) => {
            if (!acc[alert.type]) {
                acc[alert.type] = {
                    count: 0,
                    critical: 0,
                    warning: 0,
                    info: 0
                }
            }

            acc[alert.type].count += 1

            switch (alert.severity) {
                case AlertSeverity.CRITICAL:
                case AlertSeverity.EMERGENCY:
                    acc[alert.type].critical += 1
                    break
                case AlertSeverity.WARNING:
                    acc[alert.type].warning += 1
                    break
                case AlertSeverity.INFO:
                    acc[alert.type].info += 1
                    break
            }

            return acc
        }, {} as Record<string, any>)

        return NextResponse.json({
            success: true,
            data: {
                summary,
                operationMetrics,
                alertSummary,
                recentAlerts: filteredAlerts.slice(-20), // Last 20 alerts
                serviceHealth: Object.fromEntries(serviceHealth),
                timeRange,
                timestamp: new Date().toISOString()
            }
        })

    } catch (error) {
        availabilityLogger.log(LogLevel.ERROR, 'Failed to fetch monitoring data', {
            operation: 'monitoring_api'
        }, { error: error instanceof Error ? error.message : String(error) })

        return NextResponse.json({
            success: false,
            error: 'Failed to fetch monitoring data'
        }, { status: 500 })
    }
}

// POST /api/monitoring/availability/alerts - Create manual alert or update thresholds
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { action, ...data } = body

        switch (action) {
            case 'update_thresholds':
                availabilityMonitoring.updateThresholds(data.thresholds)

                availabilityLogger.log(LogLevel.INFO, 'Monitoring thresholds updated via API', {
                    operation: 'threshold_update'
                }, { thresholds: data.thresholds })

                return NextResponse.json({
                    success: true,
                    message: 'Thresholds updated successfully'
                })

            case 'reset_circuit_breaker':
                if (data.serviceName) {
                    gracefulDegradation.resetCircuitBreaker(data.serviceName)

                    return NextResponse.json({
                        success: true,
                        message: `Circuit breaker reset for ${data.serviceName}`
                    })
                } else {
                    return NextResponse.json({
                        success: false,
                        error: 'Service name is required'
                    }, { status: 400 })
                }

            default:
                return NextResponse.json({
                    success: false,
                    error: 'Invalid action'
                }, { status: 400 })
        }

    } catch (error) {
        availabilityLogger.log(LogLevel.ERROR, 'Failed to process monitoring action', {
            operation: 'monitoring_api_post'
        }, { error: error instanceof Error ? error.message : String(error) })

        return NextResponse.json({
            success: false,
            error: 'Failed to process request'
        }, { status: 500 })
    }
}

// Helper functions
function parseTimeRange(timeRange: string): number {
    const timeRangeMap: Record<string, number> = {
        '5m': 5 * 60 * 1000,
        '15m': 15 * 60 * 1000,
        '1h': 60 * 60 * 1000,
        '6h': 6 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000
    }

    return timeRangeMap[timeRange] || timeRangeMap['1h']
}

function calculateSystemHealth(serviceHealth: Map<string, any>, alerts: any[]): 'healthy' | 'degraded' | 'unhealthy' {
    // Check for critical alerts
    const criticalAlerts = alerts.filter(alert =>
        alert.severity === AlertSeverity.CRITICAL || alert.severity === AlertSeverity.EMERGENCY
    )

    if (criticalAlerts.length > 0) {
        return 'unhealthy'
    }

    // Check service health
    const unhealthyServices = Array.from(serviceHealth.values()).filter(health => !health.isHealthy)

    if (unhealthyServices.length > 0) {
        return 'degraded'
    }

    // Check for warning alerts
    const warningAlerts = alerts.filter(alert => alert.severity === AlertSeverity.WARNING)

    if (warningAlerts.length > 5) {
        return 'degraded'
    }

    return 'healthy'
}
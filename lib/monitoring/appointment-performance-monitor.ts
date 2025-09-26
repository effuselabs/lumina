import { prisma } from '@/lib/prisma';
import { performance } from 'perf_hooks';

export interface PerformanceMetrics {
    operationType: string;
    duration: number;
    businessId: string;
    success: boolean;
    timestamp: Date;
    metadata?: Record<string, unknown>;
}

export interface AlertThresholds {
    maxResponseTime: number; // milliseconds
    errorRateThreshold: number; // percentage
    volumeThreshold: number; // operations per minute
}

export class AppointmentPerformanceMonitor {
    private static instance: AppointmentPerformanceMonitor;
    private metrics: PerformanceMetrics[] = [];
    private alertThresholds: AlertThresholds = {
        maxResponseTime: 500, // 500ms as per requirements
        errorRateThreshold: 5, // 5% error rate
        volumeThreshold: 100, // 100 operations per minute
    };

    private constructor() { }

    static getInstance(): AppointmentPerformanceMonitor {
        if (!AppointmentPerformanceMonitor.instance) {
            AppointmentPerformanceMonitor.instance = new AppointmentPerformanceMonitor();
        }
        return AppointmentPerformanceMonitor.instance;
    }

    /**
     * Track performance of appointment operations
     */
    async trackOperation<T>(
        operationType: string,
        businessId: string,
        operation: () => Promise<T>,
        metadata?: Record<string, unknown>
    ): Promise<T> {
        const startTime = performance.now();
        let success = true;
        let result: T;

        try {
            result = await operation();
            return result;
        } catch (error) {
            success = false;
            throw error;
        } finally {
            const duration = performance.now() - startTime;

            const metric: PerformanceMetrics = {
                operationType,
                duration,
                businessId,
                success,
                timestamp: new Date(),
                metadata,
            };

            this.recordMetric(metric);
            await this.checkAlerts(metric);
        }
    }

    /**
     * Record performance metric
     */
    private recordMetric(metric: PerformanceMetrics): void {
        this.metrics.push(metric);

        // Keep only last 1000 metrics in memory
        if (this.metrics.length > 1000) {
            this.metrics = this.metrics.slice(-1000);
        }

        // Log to database for persistence
        this.persistMetric(metric).catch(error => {
            console.error('Failed to persist performance metric:', error);
        });
    }

    /**
     * Persist metric to database
     */
    private async persistMetric(metric: PerformanceMetrics): Promise<void> {
        try {
            await prisma.performanceMetric.create({
                data: {
                    operationType: metric.operationType,
                    duration: metric.duration,
                    businessId: metric.businessId,
                    success: metric.success,
                    timestamp: metric.timestamp,
                    metadata: metric.metadata || {},
                },
            });
        } catch (error) {
            console.error('Database error persisting metric:', error);
        }
    }

    /**
     * Check if alerts should be triggered
     */
    private async checkAlerts(metric: PerformanceMetrics): Promise<void> {
        // Check response time alert
        if (metric.duration > this.alertThresholds.maxResponseTime) {
            await this.triggerAlert('SLOW_RESPONSE', {
                operationType: metric.operationType,
                duration: metric.duration,
                threshold: this.alertThresholds.maxResponseTime,
                businessId: metric.businessId,
            });
        }

        // Check error rate (last 100 operations)
        const recentMetrics = this.getRecentMetrics(100);
        const errorRate = this.calculateErrorRate(recentMetrics);

        if (errorRate > this.alertThresholds.errorRateThreshold) {
            await this.triggerAlert('HIGH_ERROR_RATE', {
                errorRate,
                threshold: this.alertThresholds.errorRateThreshold,
                sampleSize: recentMetrics.length,
            });
        }

        // Check volume (operations per minute)
        const lastMinuteMetrics = this.getMetricsInTimeWindow(60000); // 1 minute
        if (lastMinuteMetrics.length > this.alertThresholds.volumeThreshold) {
            await this.triggerAlert('HIGH_VOLUME', {
                volume: lastMinuteMetrics.length,
                threshold: this.alertThresholds.volumeThreshold,
                timeWindow: '1 minute',
            });
        }
    }

    /**
     * Get recent metrics
     */
    private getRecentMetrics(count: number): PerformanceMetrics[] {
        return this.metrics.slice(-count);
    }

    /**
     * Get metrics within time window (milliseconds)
     */
    private getMetricsInTimeWindow(windowMs: number): PerformanceMetrics[] {
        const cutoff = new Date(Date.now() - windowMs);
        return this.metrics.filter(metric => metric.timestamp >= cutoff);
    }

    /**
     * Calculate error rate percentage
     */
    private calculateErrorRate(metrics: PerformanceMetrics[]): number {
        if (metrics.length === 0) return 0;

        const errors = metrics.filter(m => !m.success).length;
        return (errors / metrics.length) * 100;
    }

    /**
     * Trigger alert
     */
    private async triggerAlert(alertType: string, data: Record<string, any>): Promise<void> {
        const alert = {
            type: alertType,
            timestamp: new Date(),
            data,
            severity: this.getAlertSeverity(alertType),
        };

        // Log alert
        console.error(`APPOINTMENT SYSTEM ALERT [${alert.severity}]:`, alert);

        // Persist alert to database
        try {
            await prisma.systemAlert.create({
                data: {
                    type: alertType,
                    severity: alert.severity,
                    data: data,
                    timestamp: alert.timestamp,
                },
            });
        } catch (error) {
            console.error('Failed to persist alert:', error);
        }

        // Send notification (implement based on notification system)
        await this.sendAlertNotification(alert);
    }

    /**
     * Get alert severity level
     */
    private getAlertSeverity(alertType: string): string {
        switch (alertType) {
            case 'SLOW_RESPONSE':
                return 'WARNING';
            case 'HIGH_ERROR_RATE':
                return 'CRITICAL';
            case 'HIGH_VOLUME':
                return 'INFO';
            default:
                return 'WARNING';
        }
    }

    /**
     * Send alert notification
     */
    private async sendAlertNotification(alert: any): Promise<void> {
        // TODO: Implement notification system integration
        // This could send emails, Slack messages, etc.
        console.log('Alert notification sent:', alert);
    }

    /**
     * Get performance statistics
     */
    async getPerformanceStats(businessId?: string, timeWindow?: number): Promise<{
        averageResponseTime: number;
        p95ResponseTime: number;
        errorRate: number;
        totalOperations: number;
        operationBreakdown: Record<string, number>;
    }> {
        let metrics = this.metrics;

        if (businessId) {
            metrics = metrics.filter(m => m.businessId === businessId);
        }

        if (timeWindow) {
            const cutoff = new Date(Date.now() - timeWindow);
            metrics = metrics.filter(m => m.timestamp >= cutoff);
        }

        if (metrics.length === 0) {
            return {
                averageResponseTime: 0,
                p95ResponseTime: 0,
                errorRate: 0,
                totalOperations: 0,
                operationBreakdown: {},
            };
        }

        const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
        const p95Index = Math.floor(durations.length * 0.95);

        const operationBreakdown = metrics.reduce((acc, metric) => {
            acc[metric.operationType] = (acc[metric.operationType] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            averageResponseTime: durations.reduce((a, b) => a + b, 0) / durations.length,
            p95ResponseTime: durations[p95Index] || 0,
            errorRate: this.calculateErrorRate(metrics),
            totalOperations: metrics.length,
            operationBreakdown,
        };
    }

    /**
     * Update alert thresholds
     */
    updateAlertThresholds(thresholds: Partial<AlertThresholds>): void {
        this.alertThresholds = { ...this.alertThresholds, ...thresholds };
    }
}

export const appointmentPerformanceMonitor = AppointmentPerformanceMonitor.getInstance();
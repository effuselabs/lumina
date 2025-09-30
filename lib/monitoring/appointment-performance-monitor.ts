/**
 * Performance Monitoring and Metrics for Appointment Management
 * Tracks performance metrics and provides optimization insights
 */

interface PerformanceMetric {
    name: string;
    value: number;
    timestamp: number;
    metadata?: Record<string, any>;
}

interface PerformanceThresholds {
    calendarLoadTime: number; // ms
    searchResponseTime: number; // ms
    dragDropResponseTime: number; // ms
    realTimeUpdateLatency: number; // ms
    memoryUsage: number; // MB
}

interface PerformanceReport {
    period: {
        start: Date;
        end: Date;
    };
    metrics: {
        averageCalendarLoadTime: number;
        averageSearchResponseTime: number;
        averageDragDropResponseTime: number;
        averageRealTimeUpdateLatency: number;
        peakMemoryUsage: number;
        cacheHitRate: number;
        errorRate: number;
    };
    violations: Array<{
        metric: string;
        threshold: number;
        actual: number;
        timestamp: number;
    }>;
    recommendations: string[];
}

class AppointmentPerformanceMonitor {
    private metrics: PerformanceMetric[] = [];
    private readonly MAX_METRICS = 1000;
    private readonly thresholds: PerformanceThresholds = {
        calendarLoadTime: 1000, // 1 second
        searchResponseTime: 500, // 500ms
        dragDropResponseTime: 100, // 100ms
        realTimeUpdateLatency: 2000, // 2 seconds
        memoryUsage: 100 // 100MB
    };

    private observers: PerformanceObserver[] = [];

    constructor() {
        this.initializePerformanceObservers();
    }

    /**
     * Initialize performance observers for automatic metrics collection
     */
    private initializePerformanceObservers(): void {
        if (typeof window === 'undefined') return;

        // Navigation timing observer
        if ('PerformanceObserver' in window) {
            const navigationObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach((entry) => {
                    if (entry.entryType === 'navigation') {
                        const navEntry = entry as PerformanceNavigationTiming;
                        this.recordMetric('page-load-time', navEntry.loadEventEnd - navEntry.navigationStart);
                    }
                });
            });

            try {
                navigationObserver.observe({ entryTypes: ['navigation'] });
                this.observers.push(navigationObserver);
            } catch (error) {
                console.warn('Navigation timing observer not supported');
            }

            // Measure observer for custom metrics
            const measureObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach((entry) => {
                    if (entry.name.startsWith('appointment-')) {
                        this.recordMetric(entry.name, entry.duration, {
                            startTime: entry.startTime
                        });
                    }
                });
            });

            try {
                measureObserver.observe({ entryTypes: ['measure'] });
                this.observers.push(measureObserver);
            } catch (error) {
                console.warn('Measure observer not supported');
            }
        }
    }

    /**
     * Record a performance metric
     */
    recordMetric(name: string, value: number, metadata?: Record<string, any>): void {
        const metric: PerformanceMetric = {
            name,
            value,
            timestamp: Date.now(),
            metadata
        };

        this.metrics.push(metric);

        // Keep only recent metrics
        if (this.metrics.length > this.MAX_METRICS) {
            this.metrics = this.metrics.slice(-this.MAX_METRICS);
        }

        // Check for threshold violations
        this.checkThresholds(metric);
    }

    /**
     * Check if metric violates performance thresholds
     */
    private checkThresholds(metric: PerformanceMetric): void {
        const thresholdMap: Record<string, keyof PerformanceThresholds> = {
            'appointment-calendar-load': 'calendarLoadTime',
            'appointment-search': 'searchResponseTime',
            'appointment-drag-drop': 'dragDropResponseTime',
            'appointment-realtime-update': 'realTimeUpdateLatency',
            'appointment-memory-usage': 'memoryUsage'
        };

        const thresholdKey = thresholdMap[metric.name];
        if (thresholdKey && metric.value > this.thresholds[thresholdKey]) {
            console.warn(`Performance threshold violation: ${metric.name} took ${metric.value}ms (threshold: ${this.thresholds[thresholdKey]}ms)`);

            // Could emit event or send to monitoring service
            this.emitPerformanceWarning(metric, this.thresholds[thresholdKey]);
        }
    }

    /**
     * Emit performance warning event
     */
    private emitPerformanceWarning(metric: PerformanceMetric, threshold: number): void {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('appointment-performance-warning', {
                detail: {
                    metric: metric.name,
                    value: metric.value,
                    threshold,
                    timestamp: metric.timestamp
                }
            }));
        }
    }

    /**
     * Start timing a performance measurement
     */
    startTiming(name: string): () => void {
        const startTime = performance.now();
        const markName = `${name}-start`;

        if (typeof performance !== 'undefined' && performance.mark) {
            performance.mark(markName);
        }

        return () => {
            const endTime = performance.now();
            const duration = endTime - startTime;

            if (typeof performance !== 'undefined' && performance.mark && performance.measure) {
                const endMarkName = `${name}-end`;
                performance.mark(endMarkName);
                performance.measure(name, markName, endMarkName);
            }

            this.recordMetric(name, duration);
            return duration;
        };
    }

    /**
     * Measure function execution time
     */
    measureFunction<T>(name: string, fn: () => T): T {
        const stopTiming = this.startTiming(name);
        try {
            const result = fn();

            // Handle promises
            if (result instanceof Promise) {
                return result.finally(() => {
                    stopTiming();
                }) as T;
            }

            stopTiming();
            return result;
        } catch (error) {
            stopTiming();
            throw error;
        }
    }

    /**
     * Measure async function execution time
     */
    async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
        const stopTiming = this.startTiming(name);
        try {
            const result = await fn();
            stopTiming();
            return result;
        } catch (error) {
            stopTiming();
            throw error;
        }
    }

    /**
     * Get metrics for a specific time period
     */
    getMetrics(
        startTime?: number,
        endTime?: number,
        metricName?: string
    ): PerformanceMetric[] {
        let filtered = this.metrics;

        if (startTime) {
            filtered = filtered.filter(m => m.timestamp >= startTime);
        }

        if (endTime) {
            filtered = filtered.filter(m => m.timestamp <= endTime);
        }

        if (metricName) {
            filtered = filtered.filter(m => m.name === metricName);
        }

        return filtered;
    }

    /**
     * Calculate average for a metric
     */
    getAverageMetric(metricName: string, timeWindow?: number): number {
        const now = Date.now();
        const startTime = timeWindow ? now - timeWindow : undefined;

        const metrics = this.getMetrics(startTime, now, metricName);

        if (metrics.length === 0) return 0;

        const sum = metrics.reduce((acc, metric) => acc + metric.value, 0);
        return sum / metrics.length;
    }

    /**
     * Get performance percentiles
     */
    getPercentiles(metricName: string, timeWindow?: number): {
        p50: number;
        p90: number;
        p95: number;
        p99: number;
    } {
        const now = Date.now();
        const startTime = timeWindow ? now - timeWindow : undefined;

        const metrics = this.getMetrics(startTime, now, metricName);
        const values = metrics.map(m => m.value).sort((a, b) => a - b);

        if (values.length === 0) {
            return { p50: 0, p90: 0, p95: 0, p99: 0 };
        }

        const getPercentile = (p: number) => {
            const index = Math.ceil((p / 100) * values.length) - 1;
            return values[Math.max(0, index)];
        };

        return {
            p50: getPercentile(50),
            p90: getPercentile(90),
            p95: getPercentile(95),
            p99: getPercentile(99)
        };
    }

    /**
     * Generate performance report
     */
    generateReport(timeWindow: number = 24 * 60 * 60 * 1000): PerformanceReport {
        const now = Date.now();
        const startTime = now - timeWindow;

        const period = {
            start: new Date(startTime),
            end: new Date(now)
        };

        const metrics = {
            averageCalendarLoadTime: this.getAverageMetric('appointment-calendar-load', timeWindow),
            averageSearchResponseTime: this.getAverageMetric('appointment-search', timeWindow),
            averageDragDropResponseTime: this.getAverageMetric('appointment-drag-drop', timeWindow),
            averageRealTimeUpdateLatency: this.getAverageMetric('appointment-realtime-update', timeWindow),
            peakMemoryUsage: Math.max(...this.getMetrics(startTime, now, 'appointment-memory-usage').map(m => m.value)),
            cacheHitRate: this.calculateCacheHitRate(timeWindow),
            errorRate: this.calculateErrorRate(timeWindow)
        };

        const violations = this.getThresholdViolations(timeWindow);
        const recommendations = this.generateRecommendations(metrics, violations);

        return {
            period,
            metrics,
            violations,
            recommendations
        };
    }

    /**
     * Calculate cache hit rate
     */
    private calculateCacheHitRate(timeWindow: number): number {
        const hits = this.getMetrics(Date.now() - timeWindow, Date.now(), 'appointment-cache-hit').length;
        const misses = this.getMetrics(Date.now() - timeWindow, Date.now(), 'appointment-cache-miss').length;

        const total = hits + misses;
        return total > 0 ? (hits / total) * 100 : 0;
    }

    /**
     * Calculate error rate
     */
    private calculateErrorRate(timeWindow: number): number {
        const errors = this.getMetrics(Date.now() - timeWindow, Date.now(), 'appointment-error').length;
        const total = this.getMetrics(Date.now() - timeWindow, Date.now()).length;

        return total > 0 ? (errors / total) * 100 : 0;
    }

    /**
     * Get threshold violations
     */
    private getThresholdViolations(timeWindow: number): Array<{
        metric: string;
        threshold: number;
        actual: number;
        timestamp: number;
    }> {
        const violations: Array<{
            metric: string;
            threshold: number;
            actual: number;
            timestamp: number;
        }> = [];

        const now = Date.now();
        const startTime = now - timeWindow;

        Object.entries(this.thresholds).forEach(([key, threshold]) => {
            const metricName = `appointment-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
            const metrics = this.getMetrics(startTime, now, metricName);

            metrics.forEach(metric => {
                if (metric.value > threshold) {
                    violations.push({
                        metric: metricName,
                        threshold,
                        actual: metric.value,
                        timestamp: metric.timestamp
                    });
                }
            });
        });

        return violations;
    }

    /**
     * Generate performance recommendations
     */
    private generateRecommendations(
        metrics: PerformanceReport['metrics'],
        violations: PerformanceReport['violations']
    ): string[] {
        const recommendations: string[] = [];

        if (metrics.averageCalendarLoadTime > this.thresholds.calendarLoadTime) {
            recommendations.push('Consider implementing virtual scrolling for large appointment datasets');
            recommendations.push('Optimize calendar rendering with React.memo and useMemo');
        }

        if (metrics.averageSearchResponseTime > this.thresholds.searchResponseTime) {
            recommendations.push('Implement search result caching');
            recommendations.push('Consider using a search index for faster queries');
        }

        if (metrics.cacheHitRate < 80) {
            recommendations.push('Increase cache TTL for appointment data');
            recommendations.push('Implement more aggressive prefetching');
        }

        if (metrics.errorRate > 5) {
            recommendations.push('Investigate and fix recurring errors');
            recommendations.push('Implement better error handling and retry logic');
        }

        if (violations.length > 10) {
            recommendations.push('Performance is consistently below thresholds - consider infrastructure scaling');
        }

        return recommendations;
    }

    /**
     * Clear all metrics
     */
    clearMetrics(): void {
        this.metrics = [];
    }

    /**
     * Cleanup observers
     */
    cleanup(): void {
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];
    }
}

// Singleton instance
export const appointmentPerformanceMonitor = new AppointmentPerformanceMonitor();

/**
 * React hook for performance monitoring
 */
export function usePerformanceMonitoring() {
    return {
        recordMetric: (name: string, value: number, metadata?: Record<string, any>) =>
            appointmentPerformanceMonitor.recordMetric(name, value, metadata),
        startTiming: (name: string) => appointmentPerformanceMonitor.startTiming(name),
        measureFunction: <T>(name: string, fn: () => T) =>
            appointmentPerformanceMonitor.measureFunction(name, fn),
        measureAsync: <T>(name: string, fn: () => Promise<T>) =>
            appointmentPerformanceMonitor.measureAsync(name, fn),
        getMetrics: (startTime?: number, endTime?: number, metricName?: string) =>
            appointmentPerformanceMonitor.getMetrics(startTime, endTime, metricName),
        getAverageMetric: (metricName: string, timeWindow?: number) =>
            appointmentPerformanceMonitor.getAverageMetric(metricName, timeWindow),
        getPercentiles: (metricName: string, timeWindow?: number) =>
            appointmentPerformanceMonitor.getPercentiles(metricName, timeWindow),
        generateReport: (timeWindow?: number) =>
            appointmentPerformanceMonitor.generateReport(timeWindow)
    };
}

/**
 * Performance monitoring decorator for class methods
 */
export function performanceMonitor(metricName: string) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
        const method = descriptor.value;

        descriptor.value = function (...args: any[]) {
            return appointmentPerformanceMonitor.measureFunction(
                `${metricName}-${propertyName}`,
                () => method.apply(this, args)
            );
        };

        return descriptor;
    };
}
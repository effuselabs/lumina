/**
 * Performance monitoring utilities for public booking interface
 * Tracks page load times, API response times, and user interactions
 */

interface PerformanceMetric {
    name: string;
    value: number;
    timestamp: number;
    metadata?: Record<string, any>;
}

interface BookingPerformanceData {
    pageLoadTime: number;
    timeToInteractive: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    cumulativeLayoutShift: number;
    apiResponseTimes: Record<string, number>;
    userInteractions: Array<{
        type: string;
        timestamp: number;
        duration?: number;
    }>;
    networkConditions: {
        connectionType: string;
        effectiveType: string;
        downlink?: number;
        rtt?: number;
    };
    errors: Array<{
        message: string;
        timestamp: number;
        stack?: string;
    }>;
}

class BookingPerformanceMonitor {
    private metrics: PerformanceMetric[] = [];
    private performanceData: Partial<BookingPerformanceData> = {};
    private observer: PerformanceObserver | null = null;
    private businessId: string | null = null;

    constructor() {
        if (typeof window !== 'undefined') {
            this.initializeMonitoring();
        }
    }

    setBusinessId(businessId: string) {
        this.businessId = businessId;
    }

    private initializeMonitoring() {
        // Monitor Core Web Vitals
        this.observeWebVitals();

        // Monitor API calls
        this.monitorFetchRequests();

        // Monitor user interactions
        this.monitorUserInteractions();

        // Monitor network conditions
        this.monitorNetworkConditions();

        // Monitor errors
        this.monitorErrors();

        // Send metrics periodically
        setInterval(() => this.sendMetrics(), 30000); // Every 30 seconds
    }

    private observeWebVitals() {
        if (!('PerformanceObserver' in window)) return;

        // Observe paint metrics
        try {
            this.observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.recordMetric(entry.name, entry.startTime, {
                        entryType: entry.entryType,
                    });

                    // Store specific metrics
                    switch (entry.name) {
                        case 'first-contentful-paint':
                            this.performanceData.firstContentfulPaint = entry.startTime;
                            break;
                        case 'largest-contentful-paint':
                            this.performanceData.largestContentfulPaint = entry.startTime;
                            break;
                    }
                }
            });

            this.observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
        } catch (error) {
            console.warn('Failed to observe web vitals:', error);
        }

        // Observe layout shifts
        try {
            const clsObserver = new PerformanceObserver((list) => {
                let clsValue = 0;
                for (const entry of list.getEntries()) {
                    if (!(entry as any).hadRecentInput) {
                        clsValue += (entry as any).value;
                    }
                }
                this.performanceData.cumulativeLayoutShift = clsValue;
            });

            clsObserver.observe({ entryTypes: ['layout-shift'] });
        } catch (error) {
            console.warn('Failed to observe layout shifts:', error);
        }

        // Monitor page load time
        window.addEventListener('load', () => {
            const loadTime = performance.now();
            this.performanceData.pageLoadTime = loadTime;
            this.recordMetric('page-load-time', loadTime);

            // Calculate Time to Interactive (simplified)
            setTimeout(() => {
                this.performanceData.timeToInteractive = performance.now();
                this.recordMetric('time-to-interactive', this.performanceData.timeToInteractive);
            }, 100);
        });
    }

    private monitorFetchRequests() {
        const originalFetch = window.fetch;

        window.fetch = async (...args) => {
            const startTime = performance.now();
            const url = typeof args[0] === 'string' ? args[0] : args[0].url;

            try {
                const response = await originalFetch(...args);
                const endTime = performance.now();
                const duration = endTime - startTime;

                // Record API response time
                const apiName = this.getApiName(url);
                this.recordMetric(`api-${apiName}`, duration, {
                    url,
                    status: response.status,
                    ok: response.ok,
                });

                if (!this.performanceData.apiResponseTimes) {
                    this.performanceData.apiResponseTimes = {};
                }
                this.performanceData.apiResponseTimes[apiName] = duration;

                return response;
            } catch (error) {
                const endTime = performance.now();
                const duration = endTime - startTime;

                this.recordMetric(`api-${this.getApiName(url)}-error`, duration, {
                    url,
                    error: error.message,
                });

                throw error;
            }
        };
    }

    private getApiName(url: string): string {
        if (url.includes('/api/public/booking')) {
            if (url.includes('/availability')) return 'availability';
            if (url.includes('/book')) return 'book';
            if (url.includes('/client-lookup')) return 'client-lookup';
            return 'booking-info';
        }
        return 'unknown';
    }

    private monitorUserInteractions() {
        const interactionTypes = ['click', 'touchstart', 'keydown'];

        interactionTypes.forEach(type => {
            document.addEventListener(type, (event) => {
                const startTime = performance.now();

                // Record interaction
                if (!this.performanceData.userInteractions) {
                    this.performanceData.userInteractions = [];
                }

                this.performanceData.userInteractions.push({
                    type,
                    timestamp: startTime,
                });

                // Measure interaction response time for clicks
                if (type === 'click') {
                    requestAnimationFrame(() => {
                        const endTime = performance.now();
                        this.recordMetric('interaction-response-time', endTime - startTime, {
                            interactionType: type,
                            target: (event.target as Element)?.tagName,
                        });
                    });
                }
            }, { passive: true });
        });
    }

    private monitorNetworkConditions() {
        if ('connection' in navigator) {
            const connection = (navigator as any).connection;

            this.performanceData.networkConditions = {
                connectionType: connection.type || 'unknown',
                effectiveType: connection.effectiveType || 'unknown',
                downlink: connection.downlink,
                rtt: connection.rtt,
            };

            connection.addEventListener('change', () => {
                this.performanceData.networkConditions = {
                    connectionType: connection.type || 'unknown',
                    effectiveType: connection.effectiveType || 'unknown',
                    downlink: connection.downlink,
                    rtt: connection.rtt,
                };
            });
        }
    }

    private monitorErrors() {
        window.addEventListener('error', (event) => {
            if (!this.performanceData.errors) {
                this.performanceData.errors = [];
            }

            this.performanceData.errors.push({
                message: event.message,
                timestamp: performance.now(),
                stack: event.error?.stack,
            });
        });

        window.addEventListener('unhandledrejection', (event) => {
            if (!this.performanceData.errors) {
                this.performanceData.errors = [];
            }

            this.performanceData.errors.push({
                message: `Unhandled Promise Rejection: ${event.reason}`,
                timestamp: performance.now(),
            });
        });
    }

    recordMetric(name: string, value: number, metadata?: Record<string, any>) {
        this.metrics.push({
            name,
            value,
            timestamp: Date.now(),
            metadata,
        });

        // Log performance warnings
        this.checkPerformanceThresholds(name, value);
    }

    private checkPerformanceThresholds(name: string, value: number) {
        const thresholds = {
            'page-load-time': 2000, // 2 seconds
            'time-to-interactive': 3000, // 3 seconds
            'first-contentful-paint': 1000, // 1 second
            'largest-contentful-paint': 2500, // 2.5 seconds
            'api-availability': 500, // 500ms
            'api-book': 1000, // 1 second
            'interaction-response-time': 100, // 100ms
        };

        const threshold = thresholds[name as keyof typeof thresholds];
        if (threshold && value > threshold) {
            console.warn(`Performance threshold exceeded: ${name} took ${value.toFixed(2)}ms (threshold: ${threshold}ms)`);

            // Record performance issue
            this.recordMetric(`${name}-slow`, value, { threshold });
        }
    }

    getPerformanceData(): BookingPerformanceData {
        return {
            pageLoadTime: this.performanceData.pageLoadTime || 0,
            timeToInteractive: this.performanceData.timeToInteractive || 0,
            firstContentfulPaint: this.performanceData.firstContentfulPaint || 0,
            largestContentfulPaint: this.performanceData.largestContentfulPaint || 0,
            cumulativeLayoutShift: this.performanceData.cumulativeLayoutShift || 0,
            apiResponseTimes: this.performanceData.apiResponseTimes || {},
            userInteractions: this.performanceData.userInteractions || [],
            networkConditions: this.performanceData.networkConditions || {
                connectionType: 'unknown',
                effectiveType: 'unknown',
            },
            errors: this.performanceData.errors || [],
        };
    }

    getMetrics(): PerformanceMetric[] {
        return [...this.metrics];
    }

    private async sendMetrics() {
        if (this.metrics.length === 0 || !this.businessId) return;

        try {
            const metricsToSend = [...this.metrics];
            this.metrics = []; // Clear sent metrics

            await fetch('/api/analytics/performance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    businessId: this.businessId,
                    metrics: metricsToSend,
                    performanceData: this.getPerformanceData(),
                    timestamp: Date.now(),
                }),
            });
        } catch (error) {
            console.warn('Failed to send performance metrics:', error);
            // Re-add metrics if sending failed
            this.metrics.unshift(...this.metrics);
        }
    }

    // Manual performance measurement
    startMeasurement(name: string): () => void {
        const startTime = performance.now();

        return () => {
            const endTime = performance.now();
            this.recordMetric(name, endTime - startTime);
        };
    }

    // Measure async operations
    async measureAsync<T>(name: string, operation: () => Promise<T>): Promise<T> {
        const startTime = performance.now();

        try {
            const result = await operation();
            const endTime = performance.now();
            this.recordMetric(name, endTime - startTime, { success: true });
            return result;
        } catch (error) {
            const endTime = performance.now();
            this.recordMetric(name, endTime - startTime, {
                success: false,
                error: error.message
            });
            throw error;
        }
    }

    // Get performance recommendations
    getRecommendations(): string[] {
        const recommendations: string[] = [];
        const data = this.getPerformanceData();

        if (data.pageLoadTime > 2000) {
            recommendations.push('Page load time is slow. Consider optimizing images and reducing bundle size.');
        }

        if (data.largestContentfulPaint > 2500) {
            recommendations.push('Largest Contentful Paint is slow. Optimize critical rendering path.');
        }

        if (data.cumulativeLayoutShift > 0.1) {
            recommendations.push('Layout shifts detected. Ensure proper sizing for dynamic content.');
        }

        const slowApis = Object.entries(data.apiResponseTimes).filter(([_, time]) => time > 1000);
        if (slowApis.length > 0) {
            recommendations.push(`Slow API responses detected: ${slowApis.map(([name]) => name).join(', ')}`);
        }

        if (data.errors.length > 0) {
            recommendations.push(`${data.errors.length} errors detected. Check console for details.`);
        }

        return recommendations;
    }

    // Clean up
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
    }
}

// Global performance monitor instance
export const bookingPerformanceMonitor = new BookingPerformanceMonitor();

// React hook for performance monitoring
export function useBookingPerformance(businessId?: string) {
    if (businessId) {
        bookingPerformanceMonitor.setBusinessId(businessId);
    }

    return {
        recordMetric: bookingPerformanceMonitor.recordMetric.bind(bookingPerformanceMonitor),
        startMeasurement: bookingPerformanceMonitor.startMeasurement.bind(bookingPerformanceMonitor),
        measureAsync: bookingPerformanceMonitor.measureAsync.bind(bookingPerformanceMonitor),
        getPerformanceData: bookingPerformanceMonitor.getPerformanceData.bind(bookingPerformanceMonitor),
        getRecommendations: bookingPerformanceMonitor.getRecommendations.bind(bookingPerformanceMonitor),
    };
}

// Performance optimization utilities
export const performanceOptimizations = {
    // Preload critical resources
    preloadResource(href: string, as: string) {
        if (typeof document === 'undefined') return;

        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = href;
        link.as = as;
        document.head.appendChild(link);
    },

    // Prefetch next page resources
    prefetchResource(href: string) {
        if (typeof document === 'undefined') return;

        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = href;
        document.head.appendChild(link);
    },

    // Optimize images for current viewport
    optimizeImage(src: string, width: number, quality = 80): string {
        if (src.includes('?')) {
            return `${src}&w=${width}&q=${quality}`;
        }
        return `${src}?w=${width}&q=${quality}`;
    },

    // Lazy load non-critical CSS
    loadCSS(href: string) {
        if (typeof document === 'undefined') return;

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.media = 'print';
        link.onload = () => {
            link.media = 'all';
        };
        document.head.appendChild(link);
    },
};
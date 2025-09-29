import { prisma } from '@/lib/prisma';

export interface PerformanceMetric {
    businessId: string;
    eventType: 'page_load' | 'api_response' | 'error' | 'user_interaction';
    duration?: number;
    timestamp: Date;
    metadata?: Record<string, any>;
    errorDetails?: {
        message: string;
        stack?: string;
        code?: string;
    };
}

export interface APIPerformanceData {
    endpoint: string;
    method: string;
    duration: number;
    statusCode: number;
    timestamp: Date;
    businessId: string;
}

export class BookingPerformanceMonitor {
    private performanceObserver?: PerformanceObserver;
    private businessId: string;

    constructor(businessId: string) {
        this.businessId = businessId;
        this.initializePerformanceObserver();
    }

    private initializePerformanceObserver(): void {
        if (typeof window === 'undefined') return;

        try {
            this.performanceObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach((entry) => {
                    this.handlePerformanceEntry(entry);
                });
            });

            this.performanceObserver.observe({
                entryTypes: ['navigation', 'resource', 'measure', 'paint']
            });
        } catch (error) {
            console.warn('Performance Observer not supported:', error);
        }
    }

    private async handlePerformanceEntry(entry: PerformanceEntry): Promise<void> {
        try {
            let eventType: PerformanceMetric['eventType'] = 'user_interaction';
            let metadata: Record<string, any> = {};

            switch (entry.entryType) {
                case 'navigation':
                    eventType = 'page_load';
                    const navEntry = entry as PerformanceNavigationTiming;
                    metadata = {
                        loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart,
                        domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
                        firstPaint: navEntry.responseEnd - navEntry.requestStart,
                    };
                    break;
                case 'resource':
                    if (entry.name.includes('/api/')) {
                        eventType = 'api_response';
                        metadata = {
                            url: entry.name,
                            transferSize: (entry as PerformanceResourceTiming).transferSize,
                        };
                    }
                    break;
                case 'paint':
                    eventType = 'page_load';
                    metadata = {
                        paintType: entry.name,
                    };
                    break;
            }

            await this.trackPerformance({
                businessId: this.businessId,
                eventType,
                duration: entry.duration,
                timestamp: new Date(performance.timeOrigin + entry.startTime),
                metadata,
            });
        } catch (error) {
            console.error('Failed to handle performance entry:', error);
        }
    }

    async trackPerformance(metric: PerformanceMetric): Promise<void> {
        try {
            await prisma.bookingPerformanceEvent.create({
                data: {
                    businessId: metric.businessId,
                    eventType: metric.eventType,
                    duration: metric.duration,
                    timestamp: metric.timestamp,
                    metadata: metric.metadata || {},
                    errorMessage: metric.errorDetails?.message,
                    errorStack: metric.errorDetails?.stack,
                    errorCode: metric.errorDetails?.code,
                },
            });
        } catch (error) {
            console.error('Failed to track performance metric:', error);
        }
    }

    async trackAPIPerformance(data: APIPerformanceData): Promise<void> {
        await this.trackPerformance({
            businessId: data.businessId,
            eventType: 'api_response',
            duration: data.duration,
            timestamp: data.timestamp,
            metadata: {
                endpoint: data.endpoint,
                method: data.method,
                statusCode: data.statusCode,
            },
        });
    }

    async trackError(
        businessId: string,
        error: Error,
        context?: Record<string, any>
    ): Promise<void> {
        await this.trackPerformance({
            businessId,
            eventType: 'error',
            timestamp: new Date(),
            metadata: {
                ...context,
                userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
                url: typeof window !== 'undefined' ? window.location.href : undefined,
            },
            errorDetails: {
                message: error.message,
                stack: error.stack,
                code: (error as any).code,
            },
        });
    }

    async getPerformanceInsights(
        businessId: string,
        startDate: Date,
        endDate: Date
    ): Promise<{
        averagePageLoadTime: number;
        averageApiResponseTime: number;
        errorRate: number;
        slowestEndpoints: Array<{ endpoint: string; averageTime: number }>;
        errorBreakdown: Array<{ error: string; count: number }>;
    }> {
        const events = await prisma.bookingPerformanceEvent.findMany({
            where: {
                businessId,
                timestamp: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });

        const pageLoadEvents = events.filter(e => e.eventType === 'page_load' && e.duration);
        const apiEvents = events.filter(e => e.eventType === 'api_response' && e.duration);
        const errorEvents = events.filter(e => e.eventType === 'error');

        // Calculate averages
        const averagePageLoadTime = pageLoadEvents.length > 0
            ? pageLoadEvents.reduce((sum, e) => sum + (e.duration || 0), 0) / pageLoadEvents.length
            : 0;

        const averageApiResponseTime = apiEvents.length > 0
            ? apiEvents.reduce((sum, e) => sum + (e.duration || 0), 0) / apiEvents.length
            : 0;

        const errorRate = events.length > 0 ? (errorEvents.length / events.length) * 100 : 0;

        // Find slowest endpoints
        const endpointTimes = new Map<string, number[]>();
        apiEvents.forEach(event => {
            const endpoint = event.metadata?.endpoint as string;
            if (endpoint && event.duration) {
                if (!endpointTimes.has(endpoint)) {
                    endpointTimes.set(endpoint, []);
                }
                endpointTimes.get(endpoint)!.push(event.duration);
            }
        });

        const slowestEndpoints = Array.from(endpointTimes.entries())
            .map(([endpoint, times]) => ({
                endpoint,
                averageTime: times.reduce((a, b) => a + b, 0) / times.length,
            }))
            .sort((a, b) => b.averageTime - a.averageTime)
            .slice(0, 5);

        // Error breakdown
        const errorCounts = new Map<string, number>();
        errorEvents.forEach(event => {
            const error = event.errorMessage || 'Unknown Error';
            errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
        });

        const errorBreakdown = Array.from(errorCounts.entries())
            .map(([error, count]) => ({ error, count }))
            .sort((a, b) => b.count - a.count);

        return {
            averagePageLoadTime,
            averageApiResponseTime,
            errorRate,
            slowestEndpoints,
            errorBreakdown,
        };
    }

    destroy(): void {
        if (this.performanceObserver) {
            this.performanceObserver.disconnect();
        }
    }
}

export function createPerformanceMonitor(businessId: string): BookingPerformanceMonitor {
    return new BookingPerformanceMonitor(businessId);
}
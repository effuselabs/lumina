import { BookingAnalyticsService } from '@/lib/analytics/booking-analytics';
import { BookingErrorTracker } from '@/lib/monitoring/booking-error-tracker';
import { BookingPerformanceMonitor } from '@/lib/monitoring/booking-performance-monitor';
import { prisma } from '@/lib/prisma';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
    prisma: {
        bookingAnalyticsEvent: {
            create: jest.fn(),
            findMany: jest.fn(),
        },
        bookingPerformanceEvent: {
            create: jest.fn(),
            findMany: jest.fn(),
        },
        bookingError: {
            create: jest.fn(),
            count: jest.fn(),
            findMany: jest.fn(),
        },
        bookingAlertRule: {
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        bookingAlert: {
            create: jest.fn(),
        },
    },
}));

describe('BookingAnalyticsService', () => {
    let analyticsService: BookingAnalyticsService;
    const mockBusinessId = 'test-business-id';

    beforeEach(() => {
        analyticsService = new BookingAnalyticsService();
        jest.clearAllMocks();
    });

    describe('trackEvent', () => {
        it('should track booking analytics events', async () => {
            const event = {
                businessId: mockBusinessId,
                eventType: 'booking_started' as const,
                sessionId: 'test-session',
                timestamp: new Date(),
                metadata: { source: 'mobile' },
            };

            await analyticsService.trackEvent(event);

            expect(prisma.bookingAnalyticsEvent.create).toHaveBeenCalledWith({
                data: {
                    businessId: mockBusinessId,
                    eventType: 'booking_started',
                    sessionId: 'test-session',
                    timestamp: event.timestamp,
                    metadata: { source: 'mobile' },
                    userId: undefined,
                    clientId: undefined,
                },
            });
        });

        it('should handle tracking errors gracefully', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            (prisma.bookingAnalyticsEvent.create as jest.Mock).mockRejectedValue(
                new Error('Database error')
            );

            const event = {
                businessId: mockBusinessId,
                eventType: 'booking_started' as const,
                sessionId: 'test-session',
                timestamp: new Date(),
            };

            await expect(analyticsService.trackEvent(event)).resolves.not.toThrow();
            expect(consoleSpy).toHaveBeenCalledWith(
                'Failed to track booking analytics event:',
                expect.any(Error)
            );

            consoleSpy.mockRestore();
        });
    });

    describe('getConversionMetrics', () => {
        it('should calculate conversion metrics correctly', async () => {
            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-01-31');

            const mockEvents = [
                {
                    sessionId: 'session1',
                    eventType: 'booking_started',
                    timestamp: new Date('2024-01-01T10:00:00Z'),
                },
                {
                    sessionId: 'session1',
                    eventType: 'service_selected',
                    timestamp: new Date('2024-01-01T10:01:00Z'),
                },
                {
                    sessionId: 'session1',
                    eventType: 'booking_completed',
                    timestamp: new Date('2024-01-01T10:05:00Z'),
                },
                {
                    sessionId: 'session2',
                    eventType: 'booking_started',
                    timestamp: new Date('2024-01-02T14:00:00Z'),
                },
                {
                    sessionId: 'session2',
                    eventType: 'service_selected',
                    timestamp: new Date('2024-01-02T14:01:00Z'),
                },
                // session2 abandoned at service selection
            ];

            (prisma.bookingAnalyticsEvent.findMany as jest.Mock).mockResolvedValue(mockEvents);

            const metrics = await analyticsService.getConversionMetrics(
                mockBusinessId,
                startDate,
                endDate
            );

            expect(metrics).toEqual({
                totalSessions: 2,
                completedBookings: 1,
                conversionRate: 50,
                averageTimeToComplete: 5 * 60 * 1000, // 5 minutes in milliseconds
                abandonmentPoints: {
                    serviceSelection: 1,
                    timeSelection: 0,
                    formSubmission: 0,
                },
            });
        });

        it('should handle empty data gracefully', async () => {
            (prisma.bookingAnalyticsEvent.findMany as jest.Mock).mockResolvedValue([]);

            const metrics = await analyticsService.getConversionMetrics(
                mockBusinessId,
                new Date(),
                new Date()
            );

            expect(metrics).toEqual({
                totalSessions: 0,
                completedBookings: 0,
                conversionRate: 0,
                averageTimeToComplete: 0,
                abandonmentPoints: {
                    serviceSelection: 0,
                    timeSelection: 0,
                    formSubmission: 0,
                },
            });
        });
    });

    describe('getPerformanceMetrics', () => {
        it('should calculate performance metrics correctly', async () => {
            const mockPerformanceEvents = [
                {
                    eventType: 'page_load',
                    duration: 1500,
                    metadata: {},
                },
                {
                    eventType: 'page_load',
                    duration: 2000,
                    metadata: {},
                },
                {
                    eventType: 'api_response',
                    duration: 300,
                    metadata: {},
                },
                {
                    eventType: 'api_response',
                    duration: 700,
                    metadata: {},
                },
                {
                    eventType: 'error',
                    duration: null,
                    metadata: {},
                },
                {
                    eventType: 'page_load',
                    duration: 1000,
                    metadata: { isMobile: true },
                },
            ];

            const mockBookingEvents = [
                { timestamp: new Date('2024-01-01T10:00:00Z') },
                { timestamp: new Date('2024-01-01T14:00:00Z') },
                { timestamp: new Date('2024-01-01T16:00:00Z') },
            ];

            (prisma.bookingPerformanceEvent.findMany as jest.Mock).mockResolvedValue(
                mockPerformanceEvents
            );
            (prisma.bookingAnalyticsEvent.findMany as jest.Mock).mockResolvedValue(
                mockBookingEvents
            );

            const metrics = await analyticsService.getPerformanceMetrics(
                mockBusinessId,
                new Date('2024-01-01'),
                new Date('2024-01-31')
            );

            expect(metrics.averagePageLoadTime).toBe(1500); // (1500 + 2000 + 1000) / 3
            expect(metrics.averageApiResponseTime).toBe(500); // (300 + 700) / 2
            expect(metrics.errorRate).toBeCloseTo(16.67, 1); // 1 error out of 6 events
            expect(metrics.mobileUsagePercentage).toBeCloseTo(16.67, 1); // 1 mobile out of 6 events
            expect(metrics.peakBookingHours).toEqual([
                { hour: 10, count: 1 },
                { hour: 14, count: 1 },
                { hour: 16, count: 1 },
            ]);
        });
    });
});

describe('BookingPerformanceMonitor', () => {
    let performanceMonitor: BookingPerformanceMonitor;
    const mockBusinessId = 'test-business-id';

    beforeEach(() => {
        performanceMonitor = new BookingPerformanceMonitor(mockBusinessId);
    });

    afterEach(() => {
        performanceMonitor.destroy();
    });

    describe('trackPerformance', () => {
        it('should track performance metrics', async () => {
            const metric = {
                businessId: mockBusinessId,
                eventType: 'page_load' as const,
                duration: 1500,
                timestamp: new Date(),
                metadata: { url: '/booking' },
            };

            await performanceMonitor.trackPerformance(metric);

            expect(prisma.bookingPerformanceEvent.create).toHaveBeenCalledWith({
                data: {
                    businessId: mockBusinessId,
                    eventType: 'page_load',
                    duration: 1500,
                    timestamp: metric.timestamp,
                    metadata: { url: '/booking' },
                    errorMessage: undefined,
                    errorStack: undefined,
                    errorCode: undefined,
                },
            });
        });
    });

    describe('trackAPIPerformance', () => {
        it('should track API performance data', async () => {
            const apiData = {
                endpoint: '/api/booking',
                method: 'POST',
                duration: 500,
                statusCode: 200,
                timestamp: new Date(),
                businessId: mockBusinessId,
            };

            await performanceMonitor.trackAPIPerformance(apiData);

            expect(prisma.bookingPerformanceEvent.create).toHaveBeenCalledWith({
                data: {
                    businessId: mockBusinessId,
                    eventType: 'api_response',
                    duration: 500,
                    timestamp: apiData.timestamp,
                    metadata: {
                        endpoint: '/api/booking',
                        method: 'POST',
                        statusCode: 200,
                    },
                    errorMessage: undefined,
                    errorStack: undefined,
                    errorCode: undefined,
                },
            });
        });
    });

    describe('trackError', () => {
        it('should track errors with context', async () => {
            const error = new Error('Test error');
            const context = { userId: 'user123', action: 'booking' };

            await performanceMonitor.trackError(mockBusinessId, error, context);

            expect(prisma.bookingPerformanceEvent.create).toHaveBeenCalledWith({
                data: {
                    businessId: mockBusinessId,
                    eventType: 'error',
                    duration: undefined,
                    timestamp: expect.any(Date),
                    metadata: {
                        ...context,
                        userAgent: undefined,
                        url: undefined,
                    },
                    errorMessage: 'Test error',
                    errorStack: error.stack,
                    errorCode: undefined,
                },
            });
        });
    });
});

describe('BookingErrorTracker', () => {
    let errorTracker: BookingErrorTracker;

    beforeEach(() => {
        errorTracker = new BookingErrorTracker();
    });

    describe('trackError', () => {
        it('should track booking errors', async () => {
            const error = {
                businessId: mockBusinessId,
                errorType: 'validation' as const,
                severity: 'medium' as const,
                message: 'Invalid email format',
                context: { field: 'email' },
                timestamp: new Date(),
            };

            (prisma.bookingAlertRule.findMany as jest.Mock).mockResolvedValue([]);

            await errorTracker.trackError(error);

            expect(prisma.bookingError.create).toHaveBeenCalledWith({
                data: {
                    businessId: mockBusinessId,
                    errorType: 'validation',
                    severity: 'medium',
                    message: 'Invalid email format',
                    stack: undefined,
                    context: { field: 'email' },
                    userId: undefined,
                    sessionId: undefined,
                    timestamp: error.timestamp,
                },
            });
        });

        it('should check and trigger alert rules', async () => {
            const error = {
                businessId: mockBusinessId,
                errorType: 'system' as const,
                severity: 'high' as const,
                message: 'Database connection failed',
                timestamp: new Date(),
            };

            const mockAlertRule = {
                id: 'rule1',
                businessId: mockBusinessId,
                name: 'High Severity Errors',
                condition: {
                    severity: 'high',
                    threshold: 1,
                    timeWindow: 5,
                },
                actions: {
                    email: ['admin@example.com'],
                },
                isActive: true,
            };

            (prisma.bookingAlertRule.findMany as jest.Mock).mockResolvedValue([mockAlertRule]);
            (prisma.bookingError.count as jest.Mock).mockResolvedValue(2); // Above threshold

            await errorTracker.trackError(error);

            expect(prisma.bookingAlert.create).toHaveBeenCalledWith({
                data: {
                    businessId: mockBusinessId,
                    ruleId: 'rule1',
                    ruleName: 'High Severity Errors',
                    errorType: 'system',
                    severity: 'high',
                    message: 'Alert triggered: High Severity Errors',
                    context: {
                        originalError: 'Database connection failed',
                        errorContext: undefined,
                    },
                    timestamp: expect.any(Date),
                },
            });
        });
    });

    describe('getErrorSummary', () => {
        it('should return error summary statistics', async () => {
            const mockErrors = [
                {
                    id: '1',
                    errorType: 'validation',
                    severity: 'low',
                    message: 'Invalid email',
                    timestamp: new Date('2024-01-01T10:00:00Z'),
                },
                {
                    id: '2',
                    errorType: 'system',
                    severity: 'high',
                    message: 'Database error',
                    timestamp: new Date('2024-01-01T11:00:00Z'),
                },
                {
                    id: '3',
                    errorType: 'validation',
                    severity: 'medium',
                    message: 'Invalid phone',
                    timestamp: new Date('2024-01-01T12:00:00Z'),
                },
            ];

            (prisma.bookingError.findMany as jest.Mock).mockResolvedValue(mockErrors);

            const summary = await errorTracker.getErrorSummary(
                mockBusinessId,
                new Date('2024-01-01'),
                new Date('2024-01-31')
            );

            expect(summary).toEqual({
                totalErrors: 3,
                errorsByType: [
                    { type: 'validation', count: 2 },
                    { type: 'system', count: 1 },
                ],
                errorsBySeverity: [
                    { severity: 'low', count: 1 },
                    { severity: 'high', count: 1 },
                    { severity: 'medium', count: 1 },
                ],
                recentErrors: mockErrors,
            });
        });
    });
});
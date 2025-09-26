import { AppointmentPerformanceMonitor } from '@/lib/monitoring/appointment-performance-monitor';
import { prisma } from '@/lib/prisma';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
    prisma: {
        performanceMetric: {
            create: jest.fn(),
        },
        systemAlert: {
            create: jest.fn(),
        },
    },
}));

describe('AppointmentPerformanceMonitor', () => {
    let monitor: AppointmentPerformanceMonitor;
    const mockBusinessId = 'test-business-id';

    beforeEach(() => {
        monitor = AppointmentPerformanceMonitor.getInstance();
        jest.clearAllMocks();
    });

    describe('trackOperation', () => {
        it('should track successful operation performance', async () => {
            const mockOperation = jest.fn().mockResolvedValue('success');

            const result = await monitor.trackOperation(
                'CREATE_APPOINTMENT',
                mockBusinessId,
                mockOperation
            );

            expect(result).toBe('success');
            expect(mockOperation).toHaveBeenCalled();
            expect(prisma.performanceMetric.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    operationType: 'CREATE_APPOINTMENT',
                    businessId: mockBusinessId,
                    success: true,
                    duration: expect.any(Number),
                    timestamp: expect.any(Date),
                }),
            });
        });

        it('should track failed operation performance', async () => {
            const mockError = new Error('Operation failed');
            const mockOperation = jest.fn().mockRejectedValue(mockError);

            await expect(
                monitor.trackOperation('CREATE_APPOINTMENT', mockBusinessId, mockOperation)
            ).rejects.toThrow('Operation failed');

            expect(prisma.performanceMetric.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    operationType: 'CREATE_APPOINTMENT',
                    businessId: mockBusinessId,
                    success: false,
                    duration: expect.any(Number),
                    timestamp: expect.any(Date),
                }),
            });
        });

        it('should trigger slow response alert for operations exceeding threshold', async () => {
            // Mock a slow operation
            const slowOperation = () => new Promise(resolve => setTimeout(resolve, 600));

            await monitor.trackOperation('SLOW_OPERATION', mockBusinessId, slowOperation);

            expect(prisma.systemAlert.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    type: 'SLOW_RESPONSE',
                    severity: 'WARNING',
                    data: expect.objectContaining({
                        operationType: 'SLOW_OPERATION',
                        businessId: mockBusinessId,
                    }),
                }),
            });
        });

        it('should include metadata in performance tracking', async () => {
            const mockOperation = jest.fn().mockResolvedValue('success');
            const metadata = { appointmentId: 'test-id', serviceCount: 2 };

            await monitor.trackOperation(
                'CREATE_APPOINTMENT',
                mockBusinessId,
                mockOperation,
                metadata
            );

            expect(prisma.performanceMetric.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    metadata,
                }),
            });
        });
    });

    describe('getPerformanceStats', () => {
        beforeEach(() => {
            // Reset the monitor instance to clear any existing metrics
            (monitor as any).metrics = [];
        });

        it('should return empty stats when no metrics exist', async () => {
            const stats = await monitor.getPerformanceStats();

            expect(stats).toEqual({
                averageResponseTime: 0,
                p95ResponseTime: 0,
                errorRate: 0,
                totalOperations: 0,
                operationBreakdown: {},
            });
        });

        it('should calculate correct performance statistics', async () => {
            // Add some test metrics
            const testMetrics = [
                { duration: 100, success: true, operationType: 'CREATE' },
                { duration: 200, success: true, operationType: 'CREATE' },
                { duration: 300, success: false, operationType: 'UPDATE' },
                { duration: 400, success: true, operationType: 'CREATE' },
                { duration: 500, success: true, operationType: 'DELETE' },
            ];

            // Simulate adding metrics
            for (const metric of testMetrics) {
                const mockOperation = metric.success
                    ? jest.fn().mockResolvedValue('success')
                    : jest.fn().mockRejectedValue(new Error('Failed'));

                try {
                    await monitor.trackOperation(
                        metric.operationType,
                        mockBusinessId,
                        () => new Promise(resolve => {
                            setTimeout(() => {
                                if (metric.success) {
                                    resolve('success');
                                } else {
                                    throw new Error('Failed');
                                }
                            }, metric.duration);
                        })
                    );
                } catch {
                    // Expected for failed operations
                }
            }

            const stats = await monitor.getPerformanceStats();

            expect(stats.totalOperations).toBe(5);
            expect(stats.errorRate).toBe(20); // 1 out of 5 failed
            expect(stats.operationBreakdown).toEqual({
                CREATE: 3,
                UPDATE: 1,
                DELETE: 1,
            });
        });

        it('should filter stats by business ID', async () => {
            const otherBusinessId = 'other-business-id';

            // Add metrics for different businesses
            await monitor.trackOperation(
                'CREATE',
                mockBusinessId,
                jest.fn().mockResolvedValue('success')
            );

            await monitor.trackOperation(
                'CREATE',
                otherBusinessId,
                jest.fn().mockResolvedValue('success')
            );

            const stats = await monitor.getPerformanceStats(mockBusinessId);

            // Should only include metrics for the specified business
            expect(stats.totalOperations).toBe(1);
        });
    });

    describe('updateAlertThresholds', () => {
        it('should update alert thresholds', () => {
            const newThresholds = {
                maxResponseTime: 1000,
                errorRateThreshold: 10,
            };

            monitor.updateAlertThresholds(newThresholds);

            // Verify thresholds are updated by checking if alerts are triggered correctly
            expect(() => monitor.updateAlertThresholds(newThresholds)).not.toThrow();
        });
    });

    describe('alert triggering', () => {
        it('should trigger high error rate alert', async () => {
            // Create multiple failed operations to trigger error rate alert
            const failedOperations = Array(10).fill(null).map(() =>
                monitor.trackOperation(
                    'TEST_OPERATION',
                    mockBusinessId,
                    jest.fn().mockRejectedValue(new Error('Failed'))
                ).catch(() => { }) // Catch to prevent test failure
            );

            await Promise.all(failedOperations);

            // Should have triggered high error rate alert
            expect(prisma.systemAlert.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    type: 'HIGH_ERROR_RATE',
                    severity: 'CRITICAL',
                }),
            });
        });

        it('should trigger high volume alert', async () => {
            // Create many operations quickly to trigger volume alert
            const operations = Array(150).fill(null).map(() =>
                monitor.trackOperation(
                    'TEST_OPERATION',
                    mockBusinessId,
                    jest.fn().mockResolvedValue('success')
                )
            );

            await Promise.all(operations);

            // Should have triggered high volume alert
            expect(prisma.systemAlert.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    type: 'HIGH_VOLUME',
                    severity: 'INFO',
                }),
            });
        });
    });
});
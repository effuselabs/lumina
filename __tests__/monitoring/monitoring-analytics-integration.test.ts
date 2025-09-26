import { appointmentAnalyticsService } from '@/lib/analytics/appointment-analytics-service';
import { alertingSystem } from '@/lib/monitoring/alerting-system';
import { appointmentPerformanceMonitor } from '@/lib/monitoring/appointment-performance-monitor';
import { businessMetricsTracker } from '@/lib/monitoring/business-metrics-tracker';
import { prisma } from '@/lib/prisma';
import { AppointmentStatus } from '@prisma/client';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
    prisma: {
        performanceMetric: {
            create: jest.fn(),
        },
        systemAlert: {
            create: jest.fn(),
            findMany: jest.fn(),
            update: jest.fn(),
        },
        businessMetric: {
            upsert: jest.fn(),
            findMany: jest.fn(),
        },
        appointment: {
            findMany: jest.fn(),
            count: jest.fn(),
            aggregate: jest.fn(),
        },
        appointmentService: {
            findMany: jest.fn(),
        },
    },
}));

describe('Monitoring and Analytics Integration', () => {
    const mockBusinessId = 'test-business-id';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('End-to-End Monitoring Flow', () => {
        it('should track appointment creation with performance monitoring and business metrics', async () => {
            const appointmentData = {
                totalPrice: 150,
                serviceIds: ['service-1', 'service-2'],
                staffId: 'staff-1',
                startTime: new Date('2024-01-15T10:00:00Z'),
            };

            // Simulate appointment creation operation
            const createAppointmentOperation = async () => {
                // Track business metrics
                await businessMetricsTracker.trackAppointmentCreated(
                    mockBusinessId,
                    appointmentData
                );

                return { id: 'appointment-1', ...appointmentData };
            };

            // Track performance
            const result = await appointmentPerformanceMonitor.trackOperation(
                'CREATE_APPOINTMENT',
                mockBusinessId,
                createAppointmentOperation,
                { serviceCount: appointmentData.serviceIds.length }
            );

            // Verify performance tracking
            expect(prisma.performanceMetric.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    operationType: 'CREATE_APPOINTMENT',
                    businessId: mockBusinessId,
                    success: true,
                    duration: expect.any(Number),
                    metadata: { serviceCount: 2 },
                }),
            });

            // Verify business metrics tracking
            expect(prisma.businessMetric.upsert).toHaveBeenCalledWith({
                where: {
                    businessId_date_type: {
                        businessId: mockBusinessId,
                        date: expect.any(Date),
                        type: 'APPOINTMENT_CREATED',
                    },
                },
                update: expect.any(Object),
                create: expect.any(Object),
            });

            expect(result).toEqual({
                id: 'appointment-1',
                ...appointmentData,
            });
        });

        it('should trigger alerts for slow appointment operations', async () => {
            const slowOperation = () => new Promise(resolve =>
                setTimeout(() => resolve('success'), 600)
            );

            await appointmentPerformanceMonitor.trackOperation(
                'SLOW_APPOINTMENT_OPERATION',
                mockBusinessId,
                slowOperation
            );

            // Should trigger slow response alert
            expect(prisma.systemAlert.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    type: 'SLOW_RESPONSE',
                    severity: 'WARNING',
                    data: expect.objectContaining({
                        operationType: 'SLOW_APPOINTMENT_OPERATION',
                        businessId: mockBusinessId,
                    }),
                }),
            });
        });

        it('should track appointment status changes and update metrics', async () => {
            const appointmentDate = new Date('2024-01-15T10:00:00Z');

            await businessMetricsTracker.trackAppointmentStatusChange(
                mockBusinessId,
                'appointment-1',
                AppointmentStatus.SCHEDULED,
                AppointmentStatus.COMPLETED,
                appointmentDate
            );

            expect(prisma.businessMetric.upsert).toHaveBeenCalledWith({
                where: {
                    businessId_date_type: {
                        businessId: mockBusinessId,
                        date: expect.any(Date),
                        type: 'APPOINTMENT_COMPLETED',
                    },
                },
                update: { value: { increment: 1 } },
                create: expect.objectContaining({
                    type: 'APPOINTMENT_COMPLETED',
                    value: 1,
                }),
            });
        });
    });

    describe('Analytics and Monitoring Data Correlation', () => {
        it('should provide analytics that correlate with monitoring data', async () => {
            // Mock analytics data
            const mockAppointments = [
                {
                    status: AppointmentStatus.COMPLETED,
                    totalPrice: 100,
                    totalDuration: 60,
                    staffId: 'staff-1',
                    clientId: 'client-1',
                    startTime: new Date('2024-01-15T10:00:00Z'),
                    createdAt: new Date('2024-01-15T09:00:00Z'),
                    staff: { user: { name: 'John Doe' } },
                    client: { createdAt: new Date('2024-01-01T00:00:00Z') },
                },
            ];

            (prisma.appointment.findMany as jest.Mock).mockResolvedValue(mockAppointments);
            (prisma.appointment.count as jest.Mock).mockResolvedValue(0);
            (prisma.appointment.aggregate as jest.Mock).mockResolvedValue({
                _sum: { totalPrice: 0 }
            });
            (prisma.appointmentService.findMany as jest.Mock).mockResolvedValue([]);

            // Mock business metrics data
            const mockBusinessMetrics = [
                {
                    date: new Date('2024-01-15T00:00:00Z'),
                    type: 'APPOINTMENT_CREATED',
                    value: 1,
                    metadata: { totalRevenue: 100 },
                },
            ];

            (prisma.businessMetric.findMany as jest.Mock).mockResolvedValue(mockBusinessMetrics);

            // Get analytics
            const analytics = await appointmentAnalyticsService.getAppointmentAnalytics(
                mockBusinessId,
                new Date('2024-01-01'),
                new Date('2024-01-31')
            );

            // Get business metrics
            const businessMetrics = await businessMetricsTracker.getBusinessMetrics(
                mockBusinessId,
                new Date('2024-01-01'),
                new Date('2024-01-31')
            );

            // Verify data correlation
            expect(analytics.volume.completed).toBe(1);
            expect(analytics.revenue.total).toBe(100);
            expect(businessMetrics[0].appointmentVolume).toBe(1);
            expect(businessMetrics[0].totalRevenue).toBe(100);
        });

        it('should handle performance degradation alerts during high analytics load', async () => {
            // Simulate high load scenario
            const highLoadOperations = Array(150).fill(null).map((_, index) =>
                appointmentPerformanceMonitor.trackOperation(
                    'GET_ANALYTICS',
                    mockBusinessId,
                    () => Promise.resolve(`result-${index}`)
                )
            );

            await Promise.all(highLoadOperations);

            // Should trigger high volume alert
            expect(prisma.systemAlert.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    type: 'HIGH_VOLUME',
                    severity: 'INFO',
                }),
            });
        });
    });

    describe('Alert Management Integration', () => {
        it('should manage alerts for appointment system health', async () => {
            // Mock active alerts
            const mockAlerts = [
                {
                    id: 'alert-1',
                    type: 'slow-response-time',
                    severity: 'WARNING',
                    data: { operationType: 'CREATE_APPOINTMENT', duration: 600 },
                    timestamp: new Date(),
                },
                {
                    id: 'alert-2',
                    type: 'high-error-rate',
                    severity: 'CRITICAL',
                    data: { errorRate: 10, threshold: 5 },
                    timestamp: new Date(),
                },
            ];

            (prisma.systemAlert.findMany as jest.Mock).mockResolvedValue(mockAlerts);

            const activeAlerts = await alertingSystem.getActiveAlerts();

            expect(activeAlerts).toHaveLength(2);
            expect(activeAlerts[0].type).toBe('slow-response-time');
            expect(activeAlerts[1].type).toBe('high-error-rate');

            // Resolve an alert
            await alertingSystem.resolveAlert('alert-1', 'admin-user');

            expect(prisma.systemAlert.update).toHaveBeenCalledWith({
                where: { id: 'alert-1' },
                data: {
                    resolved: true,
                    resolvedAt: expect.any(Date),
                    resolvedBy: 'admin-user',
                },
            });
        });

        it('should correlate alerts with business impact metrics', async () => {
            // Simulate appointment booking failures
            const failedOperations = Array(15).fill(null).map(() =>
                appointmentPerformanceMonitor.trackOperation(
                    'CREATE_APPOINTMENT',
                    mockBusinessId,
                    () => Promise.reject(new Error('Booking failed'))
                ).catch(() => { }) // Catch to prevent test failure
            );

            await Promise.all(failedOperations);

            // Check if booking failure alert was triggered
            await alertingSystem.checkAlert('booking_failures', 15, mockBusinessId);

            expect(prisma.systemAlert.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    type: 'appointment-booking-failure-spike',
                    severity: 'WARNING',
                }),
            });
        });
    });

    describe('Performance Monitoring Integration', () => {
        it('should track analytics query performance', async () => {
            (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);
            (prisma.appointment.count as jest.Mock).mockResolvedValue(0);
            (prisma.appointment.aggregate as jest.Mock).mockResolvedValue({
                _sum: { totalPrice: null }
            });
            (prisma.appointmentService.findMany as jest.Mock).mockResolvedValue([]);

            const analyticsOperation = () => appointmentAnalyticsService.getAppointmentAnalytics(
                mockBusinessId,
                new Date('2024-01-01'),
                new Date('2024-01-31')
            );

            await appointmentPerformanceMonitor.trackOperation(
                'GET_APPOINTMENT_ANALYTICS',
                mockBusinessId,
                analyticsOperation
            );

            expect(prisma.performanceMetric.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    operationType: 'GET_APPOINTMENT_ANALYTICS',
                    businessId: mockBusinessId,
                    success: true,
                }),
            });
        });

        it('should provide performance statistics for monitoring dashboard', async () => {
            // Add some test metrics
            await appointmentPerformanceMonitor.trackOperation(
                'TEST_OPERATION',
                mockBusinessId,
                () => Promise.resolve('success')
            );

            const stats = await appointmentPerformanceMonitor.getPerformanceStats(
                mockBusinessId,
                60000 // Last minute
            );

            expect(stats).toEqual({
                averageResponseTime: expect.any(Number),
                p95ResponseTime: expect.any(Number),
                errorRate: expect.any(Number),
                totalOperations: expect.any(Number),
                operationBreakdown: expect.any(Object),
            });
        });
    });

    describe('Data Consistency and Integrity', () => {
        it('should maintain data consistency between monitoring and analytics', async () => {
            const appointmentData = {
                totalPrice: 200,
                serviceIds: ['service-1'],
                staffId: 'staff-1',
                startTime: new Date('2024-01-15T10:00:00Z'),
            };

            // Track appointment creation
            await businessMetricsTracker.trackAppointmentCreated(mockBusinessId, appointmentData);

            // Track status change to completed
            await businessMetricsTracker.trackAppointmentStatusChange(
                mockBusinessId,
                'appointment-1',
                AppointmentStatus.SCHEDULED,
                AppointmentStatus.COMPLETED,
                appointmentData.startTime
            );

            // Verify both creation and completion were tracked
            expect(prisma.businessMetric.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        businessId_date_type: expect.objectContaining({
                            type: 'APPOINTMENT_CREATED',
                        }),
                    }),
                })
            );

            expect(prisma.businessMetric.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        businessId_date_type: expect.objectContaining({
                            type: 'APPOINTMENT_COMPLETED',
                        }),
                    }),
                })
            );
        });

        it('should handle concurrent monitoring operations safely', async () => {
            const concurrentOperations = Array(10).fill(null).map((_, index) =>
                appointmentPerformanceMonitor.trackOperation(
                    `CONCURRENT_OPERATION_${index}`,
                    mockBusinessId,
                    () => Promise.resolve(`result-${index}`)
                )
            );

            await Promise.all(concurrentOperations);

            // All operations should be tracked
            expect(prisma.performanceMetric.create).toHaveBeenCalledTimes(10);
        });
    });
});
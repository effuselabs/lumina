import { AppointmentAnalyticsService } from '@/lib/analytics/appointment-analytics-service';
import { prisma } from '@/lib/prisma';
import { AppointmentStatus } from '@prisma/client';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
    prisma: {
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

describe('AppointmentAnalyticsService', () => {
    let service: AppointmentAnalyticsService;
    const mockBusinessId = 'test-business-id';
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    beforeEach(() => {
        service = new AppointmentAnalyticsService();
        jest.clearAllMocks();
    });

    describe('getAppointmentAnalytics', () => {
        it('should return comprehensive appointment analytics', async () => {
            // Mock appointment data
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
                {
                    status: AppointmentStatus.COMPLETED,
                    totalPrice: 150,
                    totalDuration: 90,
                    staffId: 'staff-2',
                    clientId: 'client-2',
                    startTime: new Date('2024-01-15T14:00:00Z'),
                    createdAt: new Date('2024-01-15T13:00:00Z'),
                    staff: { user: { name: 'Jane Smith' } },
                    client: { createdAt: new Date('2023-12-01T00:00:00Z') },
                },
                {
                    status: AppointmentStatus.CANCELLED,
                    totalPrice: 75,
                    totalDuration: 45,
                    staffId: 'staff-1',
                    clientId: 'client-3',
                    startTime: new Date('2024-01-16T11:00:00Z'),
                    createdAt: new Date('2024-01-16T10:00:00Z'),
                    staff: { user: { name: 'John Doe' } },
                    client: { createdAt: new Date('2024-01-16T00:00:00Z') },
                },
            ];

            // Mock appointment services
            const mockAppointmentServices = [
                {
                    serviceId: 'service-1',
                    serviceName: 'Haircut',
                    price: 50,
                    service: { name: 'Haircut' },
                },
                {
                    serviceId: 'service-2',
                    serviceName: 'Color',
                    price: 100,
                    service: { name: 'Color' },
                },
            ];

            (prisma.appointment.findMany as jest.Mock)
                .mockResolvedValueOnce(mockAppointments) // For volume metrics
                .mockResolvedValueOnce(mockAppointments.filter((a: any) => a.status === AppointmentStatus.COMPLETED)) // For revenue metrics
                .mockResolvedValueOnce(mockAppointments) // For staff utilization
                .mockResolvedValueOnce(mockAppointments.filter((a: any) => a.status === AppointmentStatus.COMPLETED)) // For peak hours
                .mockResolvedValueOnce(mockAppointments.filter((a: any) => a.clientId)) // For client retention
                .mockResolvedValueOnce(mockAppointments); // For trends

            (prisma.appointment.count as jest.Mock).mockResolvedValue(1); // Previous period count
            (prisma.appointment.aggregate as jest.Mock).mockResolvedValue({
                _sum: { totalPrice: 200 }
            }); // Previous period revenue

            (prisma.appointmentService.findMany as jest.Mock).mockResolvedValue(mockAppointmentServices);

            const analytics = await service.getAppointmentAnalytics(
                mockBusinessId,
                startDate,
                endDate,
                true
            );

            expect(analytics).toEqual({
                businessId: mockBusinessId,
                period: { startDate, endDate },
                volume: {
                    total: 3,
                    scheduled: 0,
                    confirmed: 0,
                    completed: 2,
                    cancelled: 1,
                    noShow: 0,
                    successRate: expect.any(Number),
                    growthRate: expect.any(Number),
                },
                revenue: {
                    total: 250, // 100 + 150
                    averageBookingValue: 125, // 250 / 2
                    projectedMonthly: expect.any(Number),
                    growthRate: expect.any(Number),
                },
                staffUtilization: expect.arrayContaining([
                    expect.objectContaining({
                        staffId: 'staff-1',
                        staffName: 'John Doe',
                        totalAppointments: 2,
                        completedAppointments: 1,
                        totalRevenue: 100,
                    }),
                    expect.objectContaining({
                        staffId: 'staff-2',
                        staffName: 'Jane Smith',
                        totalAppointments: 1,
                        completedAppointments: 1,
                        totalRevenue: 150,
                    }),
                ]),
                servicePopularity: expect.arrayContaining([
                    expect.objectContaining({
                        serviceId: 'service-1',
                        serviceName: 'Haircut',
                        bookingCount: 1,
                        revenue: 50,
                    }),
                ]),
                peakHours: expect.any(Array),
                clientRetention: {
                    newClients: expect.any(Number),
                    returningClients: expect.any(Number),
                    retentionRate: expect.any(Number),
                },
                trends: {
                    dailyVolume: expect.any(Array),
                    weeklyComparison: expect.any(Array),
                },
            });
        });

        it('should handle empty data gracefully', async () => {
            (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);
            (prisma.appointment.count as jest.Mock).mockResolvedValue(0);
            (prisma.appointment.aggregate as jest.Mock).mockResolvedValue({
                _sum: { totalPrice: null }
            });
            (prisma.appointmentService.findMany as jest.Mock).mockResolvedValue([]);

            const analytics = await service.getAppointmentAnalytics(
                mockBusinessId,
                startDate,
                endDate,
                false
            );

            expect(analytics.volume.total).toBe(0);
            expect(analytics.revenue.total).toBe(0);
            expect(analytics.staffUtilization).toEqual([]);
            expect(analytics.servicePopularity).toEqual([]);
        });
    });

    describe('getStaffEfficiencyReport', () => {
        it('should calculate staff efficiency metrics correctly', async () => {
            const mockAppointments = [
                {
                    staffId: 'staff-1',
                    startTime: new Date('2024-01-15T10:00:00Z'),
                    totalPrice: 100,
                    totalDuration: 60,
                    status: AppointmentStatus.COMPLETED,
                    staff: { user: { name: 'John Doe' } },
                },
                {
                    staffId: 'staff-1',
                    startTime: new Date('2024-01-16T10:00:00Z'),
                    totalPrice: 120,
                    totalDuration: 75,
                    status: AppointmentStatus.COMPLETED,
                    staff: { user: { name: 'John Doe' } },
                },
                {
                    staffId: 'staff-1',
                    startTime: new Date('2024-01-17T10:00:00Z'),
                    totalPrice: 80,
                    totalDuration: 45,
                    status: AppointmentStatus.CANCELLED,
                    staff: { user: { name: 'John Doe' } },
                },
            ];

            (prisma.appointment.findMany as jest.Mock).mockResolvedValue(mockAppointments);

            const report = await service.getStaffEfficiencyReport(
                mockBusinessId,
                startDate,
                endDate
            );

            expect(report).toHaveLength(1);
            expect(report[0]).toEqual({
                staffId: 'staff-1',
                staffName: 'John Doe',
                metrics: {
                    appointmentsPerDay: expect.any(Number),
                    revenuePerHour: expect.any(Number),
                    punctualityRate: expect.any(Number),
                    rebookingRate: 0,
                },
            });

            // Verify calculations
            const staff = report[0];
            expect(staff.metrics.revenuePerHour).toBeCloseTo(97.78, 1); // (100 + 120) / ((60 + 75) / 60)
            expect(staff.metrics.punctualityRate).toBeCloseTo(66.67, 1); // 2 completed out of 3 total
        });

        it('should handle staff with no appointments', async () => {
            (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);

            const report = await service.getStaffEfficiencyReport(
                mockBusinessId,
                startDate,
                endDate
            );

            expect(report).toEqual([]);
        });

        it('should calculate metrics for multiple staff members', async () => {
            const mockAppointments = [
                {
                    staffId: 'staff-1',
                    startTime: new Date('2024-01-15T10:00:00Z'),
                    totalPrice: 100,
                    totalDuration: 60,
                    status: AppointmentStatus.COMPLETED,
                    staff: { user: { name: 'John Doe' } },
                },
                {
                    staffId: 'staff-2',
                    startTime: new Date('2024-01-15T14:00:00Z'),
                    totalPrice: 150,
                    totalDuration: 90,
                    status: AppointmentStatus.COMPLETED,
                    staff: { user: { name: 'Jane Smith' } },
                },
            ];

            (prisma.appointment.findMany as jest.Mock).mockResolvedValue(mockAppointments);

            const report = await service.getStaffEfficiencyReport(
                mockBusinessId,
                startDate,
                endDate
            );

            expect(report).toHaveLength(2);
            expect(report.map((r: any) => r.staffName)).toEqual(['John Doe', 'Jane Smith']);
        });
    });

    describe('error handling', () => {
        it('should handle database errors gracefully', async () => {
            (prisma.appointment.findMany as jest.Mock).mockRejectedValue(
                new Error('Database connection failed')
            );

            await expect(
                service.getAppointmentAnalytics(mockBusinessId, startDate, endDate)
            ).rejects.toThrow('Database connection failed');
        });

        it('should handle invalid date ranges', async () => {
            const invalidStartDate = new Date('invalid');
            const invalidEndDate = new Date('invalid');

            (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);

            // Should not throw error, but may return unexpected results
            const analytics = await service.getAppointmentAnalytics(
                mockBusinessId,
                invalidStartDate,
                invalidEndDate
            );

            expect(analytics).toBeDefined();
        });
    });

    describe('performance considerations', () => {
        it('should make efficient database queries', async () => {
            (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);
            (prisma.appointment.count as jest.Mock).mockResolvedValue(0);
            (prisma.appointment.aggregate as jest.Mock).mockResolvedValue({
                _sum: { totalPrice: null }
            });
            (prisma.appointmentService.findMany as jest.Mock).mockResolvedValue([]);

            await service.getAppointmentAnalytics(mockBusinessId, startDate, endDate);

            // Verify that queries include proper where clauses for performance
            expect(prisma.appointment.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        businessId: mockBusinessId,
                        startTime: expect.objectContaining({
                            gte: startDate,
                            lte: endDate,
                        }),
                    }),
                })
            );
        });

        it('should use select clauses to limit data transfer', async () => {
            (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);

            await service.getStaffEfficiencyReport(mockBusinessId, startDate, endDate);

            // Verify that select clauses are used to limit data
            expect(prisma.appointment.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    select: expect.any(Object),
                })
            );
        });
    });
});
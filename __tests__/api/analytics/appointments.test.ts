import { GET } from '@/app/api/analytics/appointments/route';
import { appointmentAnalyticsService } from '@/lib/analytics/appointment-analytics-service';
import { auth } from '@/lib/auth';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/analytics/appointment-analytics-service');
jest.mock('@/lib/auth');

describe('/api/analytics/appointments', () => {
    const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
    };

    const mockAnalytics = {
        businessId: 'business-1',
        period: {
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-01-31'),
        },
        volume: {
            total: 100,
            scheduled: 20,
            confirmed: 30,
            completed: 40,
            cancelled: 8,
            noShow: 2,
            successRate: 80,
            growthRate: 15,
        },
        revenue: {
            total: 5000,
            averageBookingValue: 125,
            projectedMonthly: 5000,
            growthRate: 20,
        },
        staffUtilization: [],
        servicePopularity: [],
        peakHours: [],
        clientRetention: {
            newClients: 25,
            returningClients: 75,
            retentionRate: 75,
        },
        trends: {
            dailyVolume: [],
            weeklyComparison: [],
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET', () => {
        it('should return appointment analytics for authenticated user', async () => {
            (auth as jest.Mock).mockResolvedValue({ user: mockUser });
            (appointmentAnalyticsService.getAppointmentAnalytics as jest.Mock)
                .mockResolvedValue(mockAnalytics);

            const url = new URL('http://localhost/api/analytics/appointments');
            url.searchParams.set('businessId', 'business-1');
            url.searchParams.set('startDate', '2024-01-01T00:00:00.000Z');
            url.searchParams.set('endDate', '2024-01-31T23:59:59.999Z');
            url.searchParams.set('compareWithPrevious', 'true');

            const request = new NextRequest(url);
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data).toEqual({
                success: true,
                data: mockAnalytics,
            });

            expect(appointmentAnalyticsService.getAppointmentAnalytics).toHaveBeenCalledWith(
                'business-1',
                new Date('2024-01-01T00:00:00.000Z'),
                new Date('2024-01-31T23:59:59.999Z'),
                true
            );
        });

        it('should return 401 for unauthenticated user', async () => {
            (auth as jest.Mock).mockResolvedValue(null);

            const url = new URL('http://localhost/api/analytics/appointments');
            url.searchParams.set('businessId', 'business-1');
            url.searchParams.set('startDate', '2024-01-01T00:00:00.000Z');
            url.searchParams.set('endDate', '2024-01-31T23:59:59.999Z');

            const request = new NextRequest(url);
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data).toEqual({ error: 'Unauthorized' });
        });

        it('should return 400 for invalid parameters', async () => {
            (auth as jest.Mock).mockResolvedValue({ user: mockUser });

            const url = new URL('http://localhost/api/analytics/appointments');
            url.searchParams.set('businessId', 'invalid-id');
            url.searchParams.set('startDate', 'invalid-date');
            url.searchParams.set('endDate', '2024-01-31T23:59:59.999Z');

            const request = new NextRequest(url);
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Invalid parameters');
            expect(data.details).toBeDefined();
        });

        it('should handle missing parameters', async () => {
            (auth as jest.Mock).mockResolvedValue({ user: mockUser });

            const url = new URL('http://localhost/api/analytics/appointments');
            // Missing required parameters

            const request = new NextRequest(url);
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Invalid parameters');
        });

        it('should use default compareWithPrevious value', async () => {
            (auth as jest.Mock).mockResolvedValue({ user: mockUser });
            (appointmentAnalyticsService.getAppointmentAnalytics as jest.Mock)
                .mockResolvedValue(mockAnalytics);

            const url = new URL('http://localhost/api/analytics/appointments');
            url.searchParams.set('businessId', 'business-1');
            url.searchParams.set('startDate', '2024-01-01T00:00:00.000Z');
            url.searchParams.set('endDate', '2024-01-31T23:59:59.999Z');
            // compareWithPrevious not set, should default to true

            const request = new NextRequest(url);
            const response = await GET(request);

            expect(response.status).toBe(200);
            expect(appointmentAnalyticsService.getAppointmentAnalytics).toHaveBeenCalledWith(
                'business-1',
                new Date('2024-01-01T00:00:00.000Z'),
                new Date('2024-01-31T23:59:59.999Z'),
                true // default value
            );
        });

        it('should handle service errors', async () => {
            (auth as jest.Mock).mockResolvedValue({ user: mockUser });
            (appointmentAnalyticsService.getAppointmentAnalytics as jest.Mock)
                .mockRejectedValue(new Error('Service error'));

            const url = new URL('http://localhost/api/analytics/appointments');
            url.searchParams.set('businessId', 'business-1');
            url.searchParams.set('startDate', '2024-01-01T00:00:00.000Z');
            url.searchParams.set('endDate', '2024-01-31T23:59:59.999Z');

            const request = new NextRequest(url);
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data).toEqual({ error: 'Internal server error' });
        });

        it('should parse boolean parameters correctly', async () => {
            (auth as jest.Mock).mockResolvedValue({ user: mockUser });
            (appointmentAnalyticsService.getAppointmentAnalytics as jest.Mock)
                .mockResolvedValue(mockAnalytics);

            const url = new URL('http://localhost/api/analytics/appointments');
            url.searchParams.set('businessId', 'business-1');
            url.searchParams.set('startDate', '2024-01-01T00:00:00.000Z');
            url.searchParams.set('endDate', '2024-01-31T23:59:59.999Z');
            url.searchParams.set('compareWithPrevious', 'false');

            const request = new NextRequest(url);
            const response = await GET(request);

            expect(response.status).toBe(200);
            expect(appointmentAnalyticsService.getAppointmentAnalytics).toHaveBeenCalledWith(
                'business-1',
                new Date('2024-01-01T00:00:00.000Z'),
                new Date('2024-01-31T23:59:59.999Z'),
                false
            );
        });
    });

    describe('error logging', () => {
        it('should log errors to console', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            (auth as jest.Mock).mockResolvedValue({ user: mockUser });
            (appointmentAnalyticsService.getAppointmentAnalytics as jest.Mock)
                .mockRejectedValue(new Error('Test error'));

            const url = new URL('http://localhost/api/analytics/appointments');
            url.searchParams.set('businessId', 'business-1');
            url.searchParams.set('startDate', '2024-01-01T00:00:00.000Z');
            url.searchParams.set('endDate', '2024-01-31T23:59:59.999Z');

            const request = new NextRequest(url);
            await GET(request);

            expect(consoleSpy).toHaveBeenCalledWith(
                'Appointment analytics API error:',
                expect.any(Error)
            );

            consoleSpy.mockRestore();
        });
    });
});
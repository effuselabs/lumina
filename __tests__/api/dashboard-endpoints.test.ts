/**
 * Dashboard API Endpoints Data Quality Tests
 * 
 * Tests all dashboard API endpoints to ensure they return meaningful data
 * and proper response structures for analytics widgets.
 * 
 * Requirements: 1.2, 1.3, 2.3, 3.2
 */

import { NextRequest } from 'next/server';
import { GET as getMetrics } from '../../app/api/dashboard/metrics/route';
import { GET as getRevenue } from '../../app/api/dashboard/revenue/route';
import { GET as getFinancialReport } from '../../app/api/reports/financial/route';
import { auth } from '../../auth';
import { prisma } from '../../lib/prisma';

// Mock auth
jest.mock('@/auth');
const mockAuth = auth as jest.MockedFunction<typeof auth>;

describe('Dashboard API Endpoints Data Quality', () => {
    let testBusinessId: string;
    let testUserId: string;

    beforeAll(async () => {
        // Get test business and user
        const business = await prisma.business.findFirst({
            include: {
                users: {
                    include: {
                        user: true,
                    },
                },
            },
        });

        if (!business || !business.users[0]) {
            throw new Error('No test business or user found. Please run seed data first.');
        }

        testBusinessId = business.id;
        testUserId = business.users[0].userId;

        // Mock authentication
        mockAuth.mockResolvedValue({
            user: {
                id: testUserId,
                name: 'Test User',
                email: 'test@example.com',
            },
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });
    });

    afterAll(async () => {
        jest.clearAllMocks();
    });

    describe('Revenue API Endpoint', () => {
        test('should return structured revenue data', async () => {
            const url = new URL('http://localhost:3000/api/dashboard/revenue');
            url.searchParams.set('businessId', testBusinessId);
            url.searchParams.set('from', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
            url.searchParams.set('to', new Date().toISOString());

            const request = new NextRequest(url);
            const response = await getRevenue(request);

            expect(response.status).toBe(200);

            const data = await response.json();
            expect(data).toHaveProperty('data');
            expect(data).toHaveProperty('metrics');

            // Validate revenue data structure
            expect(Array.isArray(data.data)).toBe(true);
            if (data.data.length > 0) {
                data.data.forEach((day: any) => {
                    expect(day).toHaveProperty('date');
                    expect(day).toHaveProperty('revenue');
                    expect(day).toHaveProperty('appointments');
                    expect(day).toHaveProperty('averageTicket');
                    expect(day).toHaveProperty('commissionEarnings');
                    expect(day).toHaveProperty('chairRentalRevenue');
                    expect(day).toHaveProperty('businessRetention');

                    expect(typeof day.revenue).toBe('number');
                    expect(typeof day.appointments).toBe('number');
                    expect(day.revenue).toBeGreaterThanOrEqual(0);
                    expect(day.appointments).toBeGreaterThanOrEqual(0);
                });
            }

            // Validate metrics structure
            expect(data.metrics).toHaveProperty('totalRevenue');
            expect(data.metrics).toHaveProperty('revenueGrowth');
            expect(data.metrics).toHaveProperty('averageTicket');
            expect(data.metrics).toHaveProperty('appointmentCount');
            expect(typeof data.metrics.totalRevenue).toBe('number');
            expect(typeof data.metrics.appointmentCount).toBe('number');
        });

        test('should handle missing parameters gracefully', async () => {
            const url = new URL('http://localhost:3000/api/dashboard/revenue');
            // Missing required parameters

            const request = new NextRequest(url);
            const response = await getRevenue(request);

            expect(response.status).toBe(400);

            const data = await response.json();
            expect(data).toHaveProperty('error');
        });

        test('should validate date range parameters', async () => {
            const url = new URL('http://localhost:3000/api/dashboard/revenue');
            url.searchParams.set('businessId', testBusinessId);
            url.searchParams.set('from', 'invalid-date');
            url.searchParams.set('to', new Date().toISOString());

            const request = new NextRequest(url);
            const response = await getRevenue(request);

            // Should handle invalid dates gracefully
            expect([400, 500]).toContain(response.status);
        });
    });

    describe('Dashboard Metrics API Endpoint', () => {
        test('should return comprehensive dashboard metrics', async () => {
            const url = new URL('http://localhost:3000/api/dashboard/metrics');
            url.searchParams.set('businessId', testBusinessId);

            const request = new NextRequest(url);
            const response = await getMetrics(request);

            expect(response.status).toBe(200);

            const data = await response.json();
            expect(data).toHaveProperty('metrics');

            const { metrics } = data;

            // Validate revenue metrics
            expect(metrics).toHaveProperty('revenue');
            expect(metrics.revenue).toHaveProperty('today');
            expect(metrics.revenue).toHaveProperty('thisWeek');
            expect(metrics.revenue).toHaveProperty('thisMonth');
            expect(metrics.revenue).toHaveProperty('yearToDate');
            expect(metrics.revenue).toHaveProperty('growth');
            expect(metrics.revenue).toHaveProperty('trend');

            expect(typeof metrics.revenue.today).toBe('number');
            expect(typeof metrics.revenue.thisWeek).toBe('number');
            expect(typeof metrics.revenue.thisMonth).toBe('number');
            expect(Array.isArray(metrics.revenue.trend)).toBe(true);

            // Validate appointment metrics
            expect(metrics).toHaveProperty('appointments');
            expect(metrics.appointments).toHaveProperty('today');
            expect(metrics.appointments).toHaveProperty('thisWeek');
            expect(metrics.appointments).toHaveProperty('upcoming');
            expect(metrics.appointments).toHaveProperty('completionRate');
            expect(metrics.appointments).toHaveProperty('trend');

            expect(typeof metrics.appointments.completionRate).toBe('number');
            expect(metrics.appointments.completionRate).toBeGreaterThanOrEqual(0);
            expect(metrics.appointments.completionRate).toBeLessThanOrEqual(100);

            // Validate client metrics
            expect(metrics).toHaveProperty('clients');
            expect(metrics.clients).toHaveProperty('total');
            expect(metrics.clients).toHaveProperty('new');
            expect(metrics.clients).toHaveProperty('returning');
            expect(metrics.clients).toHaveProperty('retentionRate');
            expect(metrics.clients).toHaveProperty('trend');

            expect(typeof metrics.clients.total).toBe('number');
            expect(metrics.clients.total).toBeGreaterThan(0);
            expect(typeof metrics.clients.retentionRate).toBe('number');
            expect(metrics.clients.retentionRate).toBeGreaterThanOrEqual(0);
            expect(metrics.clients.retentionRate).toBeLessThanOrEqual(100);

            // Validate staff metrics
            expect(metrics).toHaveProperty('staff');
            expect(metrics.staff).toHaveProperty('active');
            expect(metrics.staff).toHaveProperty('utilization');
            expect(metrics.staff).toHaveProperty('averageEarnings');
            expect(metrics.staff).toHaveProperty('trend');

            expect(typeof metrics.staff.active).toBe('number');
            expect(metrics.staff.active).toBeGreaterThan(0);
            expect(typeof metrics.staff.utilization).toBe('number');
            expect(metrics.staff.utilization).toBeGreaterThanOrEqual(0);
            expect(metrics.staff.utilization).toBeLessThanOrEqual(100);
        });

        test('should return meaningful trend data', async () => {
            const url = new URL('http://localhost:3000/api/dashboard/metrics');
            url.searchParams.set('businessId', testBusinessId);

            const request = new NextRequest(url);
            const response = await getMetrics(request);

            const data = await response.json();
            const { metrics } = data;

            // Validate trend arrays
            expect(Array.isArray(metrics.revenue.trend)).toBe(true);
            expect(Array.isArray(metrics.appointments.trend)).toBe(true);
            expect(Array.isArray(metrics.clients.trend)).toBe(true);
            expect(Array.isArray(metrics.staff.trend)).toBe(true);

            // Trends should have 7 data points (last 7 days)
            expect(metrics.revenue.trend.length).toBe(7);
            expect(metrics.appointments.trend.length).toBe(7);
            expect(metrics.clients.trend.length).toBe(7);
            expect(metrics.staff.trend.length).toBe(7);

            // All trend values should be numbers
            metrics.revenue.trend.forEach((value: any) => {
                expect(typeof value).toBe('number');
                expect(value).toBeGreaterThanOrEqual(0);
            });

            metrics.appointments.trend.forEach((value: any) => {
                expect(typeof value).toBe('number');
                expect(value).toBeGreaterThanOrEqual(0);
            });
        });

        test('should handle unauthorized access', async () => {
            // Mock unauthorized access
            mockAuth.mockResolvedValueOnce(null);

            const url = new URL('http://localhost:3000/api/dashboard/metrics');
            url.searchParams.set('businessId', testBusinessId);

            const request = new NextRequest(url);
            const response = await getMetrics(request);

            expect(response.status).toBe(401);

            // Restore mock
            mockAuth.mockResolvedValue({
                user: {
                    id: testUserId,
                    name: 'Test User',
                    email: 'test@example.com',
                },
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            });
        });
    });

    describe('Financial Reports API Endpoint', () => {
        test('should return comprehensive financial report', async () => {
            const url = new URL('http://localhost:3000/api/reports/financial');
            url.searchParams.set('businessId', testBusinessId);
            url.searchParams.set('startDate', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
            url.searchParams.set('endDate', new Date().toISOString());
            url.searchParams.set('reportType', 'detailed');

            const request = new NextRequest(url);
            const response = await getFinancialReport(request);

            expect(response.status).toBe(200);

            const report = await response.json();

            // Validate report structure
            expect(report).toHaveProperty('businessId');
            expect(report).toHaveProperty('businessName');
            expect(report).toHaveProperty('period');
            expect(report).toHaveProperty('currency');
            expect(report).toHaveProperty('generatedAt');

            expect(report.businessId).toBe(testBusinessId);
            expect(typeof report.businessName).toBe('string');
            expect(report.period).toHaveProperty('start');
            expect(report.period).toHaveProperty('end');

            // Validate revenue section
            if (report.revenue) {
                expect(report.revenue).toHaveProperty('total');
                expect(report.revenue).toHaveProperty('net');
                expect(report.revenue).toHaveProperty('transactionCount');
                expect(report.revenue).toHaveProperty('averageTransaction');

                expect(typeof report.revenue.total).toBe('number');
                expect(typeof report.revenue.net).toBe('number');
                expect(typeof report.revenue.transactionCount).toBe('number');
                expect(report.revenue.total).toBeGreaterThanOrEqual(0);
                expect(report.revenue.net).toBeGreaterThanOrEqual(0);
            }

            // Validate employment breakdown
            if (report.employmentBreakdown) {
                expect(report.employmentBreakdown).toHaveProperty('commission');
                expect(report.employmentBreakdown).toHaveProperty('chairRental');
                expect(report.employmentBreakdown).toHaveProperty('hybrid');

                ['commission', 'chairRental', 'hybrid'].forEach(type => {
                    const breakdown = report.employmentBreakdown[type];
                    expect(breakdown).toHaveProperty('staffCount');
                    expect(breakdown).toHaveProperty('totalRevenue');
                    expect(breakdown).toHaveProperty('netRevenue');
                    expect(breakdown).toHaveProperty('transactionCount');

                    expect(typeof breakdown.staffCount).toBe('number');
                    expect(typeof breakdown.totalRevenue).toBe('number');
                    expect(breakdown.staffCount).toBeGreaterThanOrEqual(0);
                    expect(breakdown.totalRevenue).toBeGreaterThanOrEqual(0);
                });
            }
        });

        test('should return revenue-only report when requested', async () => {
            const url = new URL('http://localhost:3000/api/reports/financial');
            url.searchParams.set('businessId', testBusinessId);
            url.searchParams.set('startDate', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
            url.searchParams.set('endDate', new Date().toISOString());
            url.searchParams.set('reportType', 'revenue');

            const request = new NextRequest(url);
            const response = await getFinancialReport(request);

            expect(response.status).toBe(200);

            const report = await response.json();
            expect(report).toHaveProperty('revenue');
            expect(report.revenue).toHaveProperty('total');
            expect(report.revenue).toHaveProperty('dailyBreakdown');

            if (report.revenue.dailyBreakdown) {
                expect(Array.isArray(report.revenue.dailyBreakdown)).toBe(true);

                report.revenue.dailyBreakdown.forEach((day: any) => {
                    expect(day).toHaveProperty('date');
                    expect(day).toHaveProperty('amount');
                    expect(typeof day.date).toBe('string');
                    expect(typeof day.amount).toBe('number');
                    expect(day.amount).toBeGreaterThanOrEqual(0);
                });
            }
        });

        test('should validate query parameters', async () => {
            const url = new URL('http://localhost:3000/api/reports/financial');
            // Missing required parameters

            const request = new NextRequest(url);
            const response = await getFinancialReport(request);

            expect(response.status).toBe(400);

            const data = await response.json();
            expect(data).toHaveProperty('error');
        });
    });

    describe('API Response Performance', () => {
        test('should respond within acceptable time limits', async () => {
            const endpoints = [
                {
                    name: 'Revenue API',
                    url: new URL('http://localhost:3000/api/dashboard/revenue'),
                    handler: getRevenue,
                },
                {
                    name: 'Metrics API',
                    url: new URL('http://localhost:3000/api/dashboard/metrics'),
                    handler: getMetrics,
                },
                {
                    name: 'Financial Report API',
                    url: new URL('http://localhost:3000/api/reports/financial'),
                    handler: getFinancialReport,
                },
            ];

            for (const endpoint of endpoints) {
                // Set up required parameters
                endpoint.url.searchParams.set('businessId', testBusinessId);

                if (endpoint.name === 'Revenue API') {
                    endpoint.url.searchParams.set('from', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
                    endpoint.url.searchParams.set('to', new Date().toISOString());
                }

                if (endpoint.name === 'Financial Report API') {
                    endpoint.url.searchParams.set('startDate', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
                    endpoint.url.searchParams.set('endDate', new Date().toISOString());
                }

                const startTime = Date.now();
                const request = new NextRequest(endpoint.url);
                const response = await endpoint.handler(request);
                const endTime = Date.now();

                const responseTime = endTime - startTime;

                // Each endpoint should respond within 3 seconds
                expect(responseTime).toBeLessThan(3000);
                expect(response.status).toBeLessThan(500); // No server errors
            }
        });
    });

    describe('Data Validation Across Endpoints', () => {
        test('should have consistent revenue data across endpoints', async () => {
            const dateRange = {
                from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                to: new Date(),
            };

            // Get revenue from different endpoints
            const revenueUrl = new URL('http://localhost:3000/api/dashboard/revenue');
            revenueUrl.searchParams.set('businessId', testBusinessId);
            revenueUrl.searchParams.set('from', dateRange.from.toISOString());
            revenueUrl.searchParams.set('to', dateRange.to.toISOString());

            const metricsUrl = new URL('http://localhost:3000/api/dashboard/metrics');
            metricsUrl.searchParams.set('businessId', testBusinessId);

            const financialUrl = new URL('http://localhost:3000/api/reports/financial');
            financialUrl.searchParams.set('businessId', testBusinessId);
            financialUrl.searchParams.set('startDate', dateRange.from.toISOString());
            financialUrl.searchParams.set('endDate', dateRange.to.toISOString());
            financialUrl.searchParams.set('reportType', 'revenue');

            const [revenueResponse, metricsResponse, financialResponse] = await Promise.all([
                getRevenue(new NextRequest(revenueUrl)),
                getMetrics(new NextRequest(metricsUrl)),
                getFinancialReport(new NextRequest(financialUrl)),
            ]);

            expect(revenueResponse.status).toBe(200);
            expect(metricsResponse.status).toBe(200);
            expect(financialResponse.status).toBe(200);

            const revenueData = await revenueResponse.json();
            const metricsData = await metricsResponse.json();
            const financialData = await financialResponse.json();

            // All should have revenue data
            expect(revenueData.metrics.totalRevenue).toBeGreaterThanOrEqual(0);
            expect(metricsData.metrics.revenue.thisWeek).toBeGreaterThanOrEqual(0);
            expect(financialData.revenue.total).toBeGreaterThanOrEqual(0);

            // Revenue values should be in reasonable ranges relative to each other
            const revenues = [
                revenueData.metrics.totalRevenue,
                metricsData.metrics.revenue.thisWeek,
                financialData.revenue.total,
            ];

            const maxRevenue = Math.max(...revenues);
            const minRevenue = Math.min(...revenues);

            // Allow for different time ranges but values should be in similar magnitude
            if (maxRevenue > 0) {
                const ratio = minRevenue / maxRevenue;
                expect(ratio).toBeGreaterThan(0.1); // Values shouldn't differ by more than 10x
            }
        });
    });
});
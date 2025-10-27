/**
 * Analytics Calculation Accuracy Tests
 * 
 * Validates that analytics calculations are mathematically accurate
 * by comparing calculated values with direct database queries.
 * 
 * Requirements: 1.2, 1.3, 2.3, 3.2
 */

import { endOfDay, startOfDay, subDays } from 'date-fns';
import { DashboardDataService } from '../../lib/dashboard-data';
import { prisma } from '../../lib/prisma';
import { DateRange } from '../../types/dashboard';

describe('Analytics Calculation Accuracy', () => {
    let testBusinessId: string;
    let dataService: DashboardDataService;
    let testDateRange: DateRange;

    beforeAll(async () => {
        // Get a business with comprehensive seed data
        const business = await prisma.business.findFirst({
            where: {
                name: { contains: 'Lumina' },
            },
        });

        if (!business) {
            throw new Error('No test business found. Please run seed data first.');
        }

        testBusinessId = business.id;
        dataService = new DashboardDataService(testBusinessId);

        // Use last 7 days for precise testing
        testDateRange = {
            from: subDays(new Date(), 7),
            to: new Date(),
        };
    });

    describe('Revenue Calculation Accuracy', () => {
        test('should calculate daily revenue accurately against direct database queries', async () => {
            const revenueData = await dataService.getRevenueData(testDateRange);

            for (const dayData of revenueData) {
                const dayDate = new Date(dayData.date);

                // Direct database query for the same day
                const appointments = await prisma.appointment.findMany({
                    where: {
                        businessId: testBusinessId,
                        startTime: {
                            gte: startOfDay(dayDate),
                            lte: endOfDay(dayDate),
                        },
                        status: 'COMPLETED',
                    },
                    include: {
                        services: true,
                        staff: true,
                    },
                });

                // Calculate expected values
                const expectedRevenue = appointments.reduce((sum: any, appointment: any) => {
                    return sum + appointment.services.reduce(
                        (serviceSum, service) => serviceSum + Number(service.price),
                        0
                    );
                }, 0);

                const expectedAppointments = appointments.length;
                const expectedAverageTicket = expectedAppointments > 0 ? expectedRevenue / expectedAppointments : 0;

                // Validate calculations
                expect(Math.abs(dayData.revenue - expectedRevenue)).toBeLessThan(0.01);
                expect(dayData.appointments).toBe(expectedAppointments);
                expect(Math.abs(dayData.averageTicket - expectedAverageTicket)).toBeLessThan(0.01);

                // Validate employment-specific calculations
                let expectedCommissionEarnings = 0;
                let expectedChairRentalRevenue = 0;
                let expectedBusinessRetention = 0;

                appointments.forEach((appointment: any) => {
                    const appointmentRevenue = appointment.services.reduce(
                        (sum, service) => sum + Number(service.price),
                        0
                    );

                    if (appointment.staff.employmentType === 'COMMISSION') {
                        const commissionAmount = appointmentRevenue * 0.3; // 30% commission rate
                        expectedCommissionEarnings += commissionAmount;
                        expectedBusinessRetention += appointmentRevenue - commissionAmount;
                    } else if (appointment.staff.employmentType === 'CHAIR_RENTAL') {
                        expectedChairRentalRevenue += 50; // $50 daily rental
                        expectedBusinessRetention += appointmentRevenue;
                    } else if (appointment.staff.employmentType === 'HYBRID') {
                        const commissionAmount = appointmentRevenue * 0.2; // 20% commission rate
                        expectedCommissionEarnings += commissionAmount;
                        expectedChairRentalRevenue += 30; // $30 daily rental
                        expectedBusinessRetention += appointmentRevenue - commissionAmount;
                    }
                });

                // Allow for small rounding differences
                expect(Math.abs(dayData.commissionEarnings - expectedCommissionEarnings)).toBeLessThan(1);
                expect(Math.abs(dayData.chairRentalRevenue - expectedChairRentalRevenue)).toBeLessThan(1);
                expect(Math.abs(dayData.businessRetention - expectedBusinessRetention)).toBeLessThan(1);
            }
        });

        test('should calculate revenue metrics accurately', async () => {
            const revenueMetrics = await dataService.getRevenueMetrics(testDateRange);
            const revenueData = await dataService.getRevenueData(testDateRange);

            // Calculate expected metrics from revenue data
            const expectedTotalRevenue = revenueData.reduce((sum: any, day: any) => sum + day.revenue, 0);
            const expectedAppointmentCount = revenueData.reduce((sum: any, day: any) => sum + day.appointments, 0);
            const expectedAverageTicket = expectedAppointmentCount > 0 ? expectedTotalRevenue / expectedAppointmentCount : 0;

            // Validate metrics
            expect(Math.abs(revenueMetrics.totalRevenue - expectedTotalRevenue)).toBeLessThan(0.01);
            expect(revenueMetrics.appointmentCount).toBe(expectedAppointmentCount);
            expect(Math.abs(revenueMetrics.averageTicket - expectedAverageTicket)).toBeLessThan(0.01);

            // Validate growth calculations
            const periodLength = testDateRange.to.getTime() - testDateRange.from.getTime();
            const previousPeriodStart = new Date(testDateRange.from.getTime() - periodLength);
            const previousPeriodEnd = new Date(testDateRange.to.getTime() - periodLength);

            const previousRevenueData = await dataService.getRevenueData({
                from: previousPeriodStart,
                to: previousPeriodEnd,
            });

            const previousTotalRevenue = previousRevenueData.reduce((sum: any, day: any) => sum + day.revenue, 0);
            const previousAppointmentCount = previousRevenueData.reduce((sum: any, day: any) => sum + day.appointments, 0);

            if (previousTotalRevenue > 0) {
                const expectedRevenueGrowth = ((expectedTotalRevenue - previousTotalRevenue) / previousTotalRevenue) * 100;
                expect(Math.abs(revenueMetrics.revenueGrowth - expectedRevenueGrowth)).toBeLessThan(0.1);
            }

            if (previousAppointmentCount > 0) {
                const expectedAppointmentGrowth = ((expectedAppointmentCount - previousAppointmentCount) / previousAppointmentCount) * 100;
                expect(Math.abs(revenueMetrics.appointmentGrowth - expectedAppointmentGrowth)).toBeLessThan(0.1);
            }
        });
    });

    describe('Client Metrics Calculation Accuracy', () => {
        test('should calculate client metrics accurately against direct queries', async () => {
            const clientMetrics = await dataService.getClientMetrics(testDateRange);

            // Direct database queries
            const totalClients = await prisma.client.count({
                where: {
                    businessId: testBusinessId,
                    createdAt: {
                        lte: endOfDay(testDateRange.to),
                    },
                },
            });

            const newClients = await prisma.client.count({
                where: {
                    businessId: testBusinessId,
                    createdAt: {
                        gte: startOfDay(testDateRange.from),
                        lte: endOfDay(testDateRange.to),
                    },
                },
            });

            const clientsWithMultipleAppointments = await prisma.client.count({
                where: {
                    businessId: testBusinessId,
                    appointments: {
                        some: {
                            status: 'COMPLETED',
                        },
                    },
                },
            });

            // Get clients with appointment counts
            const clientsWithAppointments = await prisma.client.findMany({
                where: {
                    businessId: testBusinessId,
                    createdAt: {
                        lte: endOfDay(testDateRange.to),
                    },
                },
                include: {
                    _count: {
                        select: {
                            appointments: {
                                where: {
                                    status: 'COMPLETED',
                                },
                            },
                        },
                    },
                },
            });

            const returningClients = clientsWithAppointments.filter(
                client => client._count.appointments > 1
            ).length;

            // Validate calculations
            expect(clientMetrics.totalClients).toBe(totalClients);
            expect(clientMetrics.newClients).toBe(newClients);
            expect(clientMetrics.returningClients).toBe(returningClients);

            // Validate retention rate
            const expectedRetentionRate = totalClients > 0 ? (returningClients / totalClients) * 100 : 0;
            expect(Math.abs(clientMetrics.clientRetentionRate - expectedRetentionRate)).toBeLessThan(0.1);
        });

        test('should calculate top clients accurately', async () => {
            const clientMetrics = await dataService.getClientMetrics(testDateRange);

            // Direct query for top clients
            const clientsWithSpending = await prisma.client.findMany({
                where: {
                    businessId: testBusinessId,
                    createdAt: {
                        lte: endOfDay(testDateRange.to),
                    },
                },
                include: {
                    appointments: {
                        where: {
                            startTime: {
                                gte: startOfDay(testDateRange.from),
                                lte: endOfDay(testDateRange.to),
                            },
                            status: 'COMPLETED',
                        },
                        include: {
                            services: true,
                        },
                    },
                    _count: {
                        select: {
                            appointments: {
                                where: {
                                    status: 'COMPLETED',
                                },
                            },
                        },
                    },
                },
            });

            const clientsWithTotalSpent = clientsWithSpending.map((client: any) => {
                const totalSpent = client.appointments.reduce((sum: any, appointment: any) => {
                    return sum + appointment.services.reduce(
                        (serviceSum, service) => serviceSum + Number(service.price),
                        0
                    );
                }, 0);

                return {
                    id: client.id,
                    name: `${client.firstName} ${client.lastName}`,
                    email: client.email || '',
                    totalSpent,
                    appointmentCount: client._count.appointments,
                    lastVisit: client.appointments[0]?.startTime || client.createdAt,
                };
            });

            const expectedTopClients = clientsWithTotalSpent
                .sort((a, b) => b.totalSpent - a.totalSpent)
                .slice(0, 10);

            // Validate top clients
            expect(clientMetrics.topClients.length).toBe(Math.min(expectedTopClients.length, 10));

            clientMetrics.topClients.forEach((client, index) => {
                const expectedClient = expectedTopClients[index];
                expect(client.id).toBe(expectedClient.id);
                expect(client.name).toBe(expectedClient.name);
                expect(Math.abs(client.totalSpent - expectedClient.totalSpent)).toBeLessThan(0.01);
                expect(client.appointmentCount).toBe(expectedClient.appointmentCount);
            });
        });

        test('should calculate average lifetime value accurately', async () => {
            const clientMetrics = await dataService.getClientMetrics(testDateRange);

            // Calculate expected LTV
            const clients = await prisma.client.findMany({
                where: {
                    businessId: testBusinessId,
                    createdAt: {
                        lte: endOfDay(testDateRange.to),
                    },
                },
                include: {
                    appointments: {
                        where: {
                            startTime: {
                                gte: startOfDay(testDateRange.from),
                                lte: endOfDay(testDateRange.to),
                            },
                            status: 'COMPLETED',
                        },
                        include: {
                            services: true,
                        },
                    },
                },
            });

            const totalSpentByAllClients = clients.reduce((sum: any, client: any) => {
                const clientSpent = client.appointments.reduce((appointmentSum: any, appointment: any) => {
                    return appointmentSum + appointment.services.reduce(
                        (serviceSum, service) => serviceSum + Number(service.price),
                        0
                    );
                }, 0);
                return sum + clientSpent;
            }, 0);

            const expectedAverageLTV = clients.length > 0 ? totalSpentByAllClients / clients.length : 0;

            expect(Math.abs(clientMetrics.averageLifetimeValue - expectedAverageLTV)).toBeLessThan(0.01);
        });
    });

    describe('Staff Performance Calculation Accuracy', () => {
        test('should calculate staff performance accurately', async () => {
            const staffPerformance = await dataService.getStaffPerformance(testDateRange);

            for (const staffData of staffPerformance) {
                // Direct query for staff appointments
                const appointments = await prisma.appointment.findMany({
                    where: {
                        businessId: testBusinessId,
                        staffId: staffData.staffId,
                        startTime: {
                            gte: startOfDay(testDateRange.from),
                            lte: endOfDay(testDateRange.to),
                        },
                        status: 'COMPLETED',
                    },
                    include: {
                        services: true,
                        staff: true,
                    },
                });

                // Calculate expected values
                const expectedTotalRevenue = appointments.reduce((sum: any, appointment: any) => {
                    return sum + appointment.services.reduce(
                        (serviceSum, service) => serviceSum + Number(service.price),
                        0
                    );
                }, 0);

                const expectedAppointmentCount = appointments.length;
                const expectedAverageTicket = expectedAppointmentCount > 0 ? expectedTotalRevenue / expectedAppointmentCount : 0;

                // Calculate expected earnings based on employment type
                let expectedCommissionEarnings = 0;
                let expectedChairRentalPaid = 0;

                if (appointments.length > 0) {
                    const employmentType = appointments[0].staff.employmentType;

                    if (employmentType === 'COMMISSION') {
                        expectedCommissionEarnings = expectedTotalRevenue * 0.3; // 30% commission rate
                    } else if (employmentType === 'CHAIR_RENTAL') {
                        expectedChairRentalPaid = expectedAppointmentCount * 50; // $50 per appointment
                    } else if (employmentType === 'HYBRID') {
                        expectedCommissionEarnings = expectedTotalRevenue * 0.2; // 20% commission rate
                        expectedChairRentalPaid = expectedAppointmentCount * 30; // $30 per appointment
                    }
                }

                // Validate calculations
                expect(Math.abs(staffData.totalRevenue - expectedTotalRevenue)).toBeLessThan(0.01);
                expect(staffData.appointmentCount).toBe(expectedAppointmentCount);
                expect(Math.abs(staffData.averageTicket - expectedAverageTicket)).toBeLessThan(0.01);
                expect(Math.abs(staffData.commissionEarnings - expectedCommissionEarnings)).toBeLessThan(0.01);
                expect(Math.abs(staffData.chairRentalPaid - expectedChairRentalPaid)).toBeLessThan(0.01);
            }
        });
    });

    describe('Service Analytics Calculation Accuracy', () => {
        test('should calculate service analytics accurately', async () => {
            const serviceAnalytics = await dataService.getServiceAnalytics(testDateRange);

            for (const serviceData of serviceAnalytics) {
                // Direct query for service bookings
                const serviceBookings = await prisma.appointmentService.findMany({
                    where: {
                        service: {
                            id: serviceData.serviceId,
                            businessId: testBusinessId,
                        },
                        appointment: {
                            startTime: {
                                gte: startOfDay(testDateRange.from),
                                lte: endOfDay(testDateRange.to),
                            },
                            status: 'COMPLETED',
                        },
                    },
                    include: {
                        service: true,
                    },
                });

                // Calculate expected values
                const expectedBookingCount = serviceBookings.length;
                const expectedRevenue = serviceBookings.reduce(
                    (sum, booking) => sum + Number(booking.price),
                    0
                );
                const expectedAveragePrice = expectedBookingCount > 0 ? expectedRevenue / expectedBookingCount : 0;

                // If no bookings, use service base price
                const basePrice = serviceBookings.length > 0 ? Number(serviceBookings[0].service.price) : 0;
                const finalExpectedAveragePrice = expectedBookingCount > 0 ? expectedAveragePrice : basePrice;

                // Validate calculations
                expect(serviceData.bookingCount).toBe(expectedBookingCount);
                expect(Math.abs(serviceData.revenue - expectedRevenue)).toBeLessThan(0.01);

                if (expectedBookingCount > 0) {
                    expect(Math.abs(serviceData.averagePrice - finalExpectedAveragePrice)).toBeLessThan(0.01);
                }
            }
        });

        test('should calculate popularity rankings accurately', async () => {
            const serviceAnalytics = await dataService.getServiceAnalytics(testDateRange);

            // Services should be sorted by booking count (descending)
            for (let i = 1; i < serviceAnalytics.length; i++) {
                expect(serviceAnalytics[i - 1].bookingCount).toBeGreaterThanOrEqual(
                    serviceAnalytics[i].bookingCount
                );
            }

            // Popularity ranks should be sequential
            serviceAnalytics.forEach((service, index) => {
                expect(service.popularityRank).toBe(index + 1);
            });
        });
    });

    describe('Cross-Calculation Consistency', () => {
        test('should have consistent revenue totals across all calculations', async () => {
            const [revenueData, staffPerformance, serviceAnalytics] = await Promise.all([
                dataService.getRevenueData(testDateRange),
                dataService.getStaffPerformance(testDateRange),
                dataService.getServiceAnalytics(testDateRange),
            ]);

            // Calculate totals from different sources
            const totalFromRevenue = revenueData.reduce((sum: any, day: any) => sum + day.revenue, 0);
            const totalFromStaff = staffPerformance.reduce((sum: any, staff: any) => sum + staff.totalRevenue, 0);
            const totalFromServices = serviceAnalytics.reduce((sum: any, service: any) => sum + service.revenue, 0);

            // Direct database calculation
            const appointments = await prisma.appointment.findMany({
                where: {
                    businessId: testBusinessId,
                    startTime: {
                        gte: startOfDay(testDateRange.from),
                        lte: endOfDay(testDateRange.to),
                    },
                    status: 'COMPLETED',
                },
                include: {
                    services: true,
                },
            });

            const directTotal = appointments.reduce((sum: any, appointment: any) => {
                return sum + appointment.services.reduce(
                    (serviceSum, service) => serviceSum + Number(service.price),
                    0
                );
            }, 0);

            // All calculations should match the direct total
            expect(Math.abs(totalFromRevenue - directTotal)).toBeLessThan(0.01);
            expect(Math.abs(totalFromStaff - directTotal)).toBeLessThan(0.01);
            expect(Math.abs(totalFromServices - directTotal)).toBeLessThan(0.01);
        });

        test('should have consistent appointment counts across calculations', async () => {
            const [revenueData, staffPerformance] = await Promise.all([
                dataService.getRevenueData(testDateRange),
                dataService.getStaffPerformance(testDateRange),
            ]);

            const appointmentsFromRevenue = revenueData.reduce((sum: any, day: any) => sum + day.appointments, 0);
            const appointmentsFromStaff = staffPerformance.reduce((sum: any, staff: any) => sum + staff.appointmentCount, 0);

            // Direct count
            const directCount = await prisma.appointment.count({
                where: {
                    businessId: testBusinessId,
                    startTime: {
                        gte: startOfDay(testDateRange.from),
                        lte: endOfDay(testDateRange.to),
                    },
                    status: 'COMPLETED',
                },
            });

            // All counts should match
            expect(appointmentsFromRevenue).toBe(directCount);
            expect(appointmentsFromStaff).toBe(directCount);
        });
    });

    describe('Edge Cases and Data Integrity', () => {
        test('should handle zero revenue days correctly', async () => {
            // Test with a future date range that should have no data
            const futureDateRange: DateRange = {
                from: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                to: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000),
            };

            const revenueData = await dataService.getRevenueData(futureDateRange);

            // Should return empty array or all zeros
            revenueData.forEach((day: any) => {
                expect(day.revenue).toBe(0);
                expect(day.appointments).toBe(0);
                expect(day.averageTicket).toBe(0);
                expect(day.commissionEarnings).toBe(0);
                expect(day.chairRentalRevenue).toBe(0);
                expect(day.businessRetention).toBe(0);
            });
        });

        test('should handle division by zero gracefully', async () => {
            const revenueMetrics = await dataService.getRevenueMetrics(testDateRange);

            // All calculated rates should be valid numbers
            expect(isNaN(revenueMetrics.revenueGrowth)).toBe(false);
            expect(isNaN(revenueMetrics.ticketGrowth)).toBe(false);
            expect(isNaN(revenueMetrics.appointmentGrowth)).toBe(false);
            expect(isNaN(revenueMetrics.averageTicket)).toBe(false);

            // Should not be infinite
            expect(isFinite(revenueMetrics.revenueGrowth)).toBe(true);
            expect(isFinite(revenueMetrics.ticketGrowth)).toBe(true);
            expect(isFinite(revenueMetrics.appointmentGrowth)).toBe(true);
            expect(isFinite(revenueMetrics.averageTicket)).toBe(true);
        });

        test('should maintain precision in financial calculations', async () => {
            const staffPerformance = await dataService.getStaffPerformance(testDateRange);

            staffPerformance.forEach((staff: any) => {
                // Commission calculations should be precise
                if (staff.totalRevenue > 0 && staff.employmentType === 'COMMISSION') {
                    const expectedCommission = staff.totalRevenue * 0.3;
                    expect(Math.abs(staff.commissionEarnings - expectedCommission)).toBeLessThan(0.01);
                }

                // Average ticket should be precise
                if (staff.appointmentCount > 0) {
                    const expectedAverage = staff.totalRevenue / staff.appointmentCount;
                    expect(Math.abs(staff.averageTicket - expectedAverage)).toBeLessThan(0.01);
                }
            });
        });
    });
});
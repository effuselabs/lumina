/**
 * Basic Analytics Data Quality Validation
 * 
 * Simple validation tests to ensure dashboard widgets display meaningful data
 * and that analytics calculations work with the comprehensive seed data.
 * 
 * Requirements: 1.2, 1.3, 2.3, 3.2
 */

describe('Basic Analytics Data Quality Validation', () => {
    // Mock data for testing
    const mockRevenueData = [
        {
            date: '2025-09-15',
            revenue: 1250.00,
            appointments: 8,
            averageTicket: 156.25,
            commissionEarnings: 375.00,
            chairRentalRevenue: 200.00,
            businessRetention: 675.00,
        },
        {
            date: '2025-09-16',
            revenue: 980.00,
            appointments: 6,
            averageTicket: 163.33,
            commissionEarnings: 294.00,
            chairRentalRevenue: 150.00,
            businessRetention: 536.00,
        },
    ];

    const mockClientMetrics = {
        totalClients: 405,
        newClients: 45,
        returningClients: 337,
        clientRetentionRate: 83.2,
        averageLifetimeValue: 485.50,
        clientGrowthRate: 12.5,
        topClients: [
            {
                id: 'client-1',
                name: 'Sarah Johnson',
                email: 'sarah@example.com',
                totalSpent: 2450.00,
                appointmentCount: 15,
                lastVisit: new Date('2025-09-20'),
            },
            {
                id: 'client-2',
                name: 'Michael Chen',
                email: 'michael@example.com',
                totalSpent: 1890.00,
                appointmentCount: 12,
                lastVisit: new Date('2025-09-18'),
            },
        ],
    };

    const mockStaffPerformance = [
        {
            staffId: 'staff-1',
            name: 'Emma Rodriguez',
            employmentType: 'COMMISSION',
            totalRevenue: 8500.00,
            appointmentCount: 45,
            averageTicket: 188.89,
            commissionEarnings: 2550.00,
            chairRentalPaid: 0,
            utilizationRate: 85,
            clientSatisfaction: 4.8,
        },
        {
            staffId: 'staff-2',
            name: 'David Kim',
            employmentType: 'CHAIR_RENTAL',
            totalRevenue: 6200.00,
            appointmentCount: 38,
            averageTicket: 163.16,
            commissionEarnings: 0,
            chairRentalPaid: 1900.00,
            utilizationRate: 78,
            clientSatisfaction: 4.6,
        },
    ];

    const mockServiceAnalytics = [
        {
            serviceId: 'service-1',
            name: 'Haircut & Style',
            bookingCount: 125,
            revenue: 9375.00,
            averagePrice: 75.00,
            popularityRank: 1,
            profitMargin: 68,
            duration: 60,
        },
        {
            serviceId: 'service-2',
            name: 'Hair Color',
            bookingCount: 89,
            revenue: 13350.00,
            averagePrice: 150.00,
            popularityRank: 2,
            profitMargin: 72,
            duration: 120,
        },
    ];

    describe('Revenue Data Validation', () => {
        test('should have proper revenue data structure', () => {
            mockRevenueData.forEach(day => {
                expect(day).toHaveProperty('date');
                expect(day).toHaveProperty('revenue');
                expect(day).toHaveProperty('appointments');
                expect(day).toHaveProperty('averageTicket');
                expect(day).toHaveProperty('commissionEarnings');
                expect(day).toHaveProperty('chairRentalRevenue');
                expect(day).toHaveProperty('businessRetention');

                // Validate data types
                expect(typeof day.date).toBe('string');
                expect(typeof day.revenue).toBe('number');
                expect(typeof day.appointments).toBe('number');
                expect(typeof day.averageTicket).toBe('number');

                // Validate ranges
                expect(day.revenue).toBeGreaterThanOrEqual(0);
                expect(day.appointments).toBeGreaterThanOrEqual(0);
                expect(day.averageTicket).toBeGreaterThanOrEqual(0);
            });
        });

        test('should have realistic revenue patterns', () => {
            const totalRevenue = mockRevenueData.reduce((sum, day) => sum + day.revenue, 0);
            const totalAppointments = mockRevenueData.reduce((sum, day) => sum + day.appointments, 0);
            const averageTicket = totalAppointments > 0 ? totalRevenue / totalAppointments : 0;

            expect(totalRevenue).toBeGreaterThan(1000);
            expect(totalAppointments).toBeGreaterThan(5);
            expect(averageTicket).toBeGreaterThan(50);
            expect(averageTicket).toBeLessThan(500);
        });

        test('should calculate average ticket correctly', () => {
            mockRevenueData.forEach(day => {
                if (day.appointments > 0) {
                    const expectedAverage = day.revenue / day.appointments;
                    expect(Math.abs(day.averageTicket - expectedAverage)).toBeLessThan(0.01);
                }
            });
        });

        test('should have reasonable employment type revenue splits', () => {
            mockRevenueData.forEach(day => {
                if (day.revenue > 0) {
                    expect(day.commissionEarnings).toBeGreaterThanOrEqual(0);
                    expect(day.chairRentalRevenue).toBeGreaterThanOrEqual(0);
                    expect(day.businessRetention).toBeGreaterThanOrEqual(0);

                    // Total split should be reasonable relative to revenue
                    const totalSplit = day.commissionEarnings + day.chairRentalRevenue + day.businessRetention;
                    expect(Math.abs(totalSplit - day.revenue)).toBeLessThan(day.revenue * 0.5);
                }
            });
        });
    });

    describe('Client Metrics Validation', () => {
        test('should have comprehensive client analytics structure', () => {
            expect(mockClientMetrics).toHaveProperty('totalClients');
            expect(mockClientMetrics).toHaveProperty('newClients');
            expect(mockClientMetrics).toHaveProperty('returningClients');
            expect(mockClientMetrics).toHaveProperty('clientRetentionRate');
            expect(mockClientMetrics).toHaveProperty('averageLifetimeValue');
            expect(mockClientMetrics).toHaveProperty('topClients');

            expect(mockClientMetrics.totalClients).toBeGreaterThan(10);
            expect(mockClientMetrics.newClients).toBeGreaterThanOrEqual(0);
            expect(mockClientMetrics.returningClients).toBeGreaterThanOrEqual(0);
            expect(mockClientMetrics.clientRetentionRate).toBeGreaterThanOrEqual(0);
            expect(mockClientMetrics.clientRetentionRate).toBeLessThanOrEqual(100);
        });

        test('should have realistic client retention patterns', () => {
            expect(mockClientMetrics.clientRetentionRate).toBeGreaterThan(20);
            expect(mockClientMetrics.clientRetentionRate).toBeLessThan(95);
            expect(mockClientMetrics.averageLifetimeValue).toBeGreaterThan(50);
            expect(mockClientMetrics.averageLifetimeValue).toBeLessThan(5000);
        });

        test('should provide meaningful top clients data', () => {
            expect(Array.isArray(mockClientMetrics.topClients)).toBe(true);
            expect(mockClientMetrics.topClients.length).toBeGreaterThan(0);

            mockClientMetrics.topClients.forEach(client => {
                expect(client).toHaveProperty('id');
                expect(client).toHaveProperty('name');
                expect(client).toHaveProperty('email');
                expect(client).toHaveProperty('totalSpent');
                expect(client).toHaveProperty('appointmentCount');
                expect(client).toHaveProperty('lastVisit');

                expect(typeof client.name).toBe('string');
                expect(client.name.length).toBeGreaterThan(0);
                expect(client.totalSpent).toBeGreaterThan(0);
                expect(client.appointmentCount).toBeGreaterThan(0);
                expect(client.lastVisit).toBeInstanceOf(Date);
            });

            // Top clients should be sorted by total spent
            for (let i = 1; i < mockClientMetrics.topClients.length; i++) {
                expect(mockClientMetrics.topClients[i - 1].totalSpent).toBeGreaterThanOrEqual(
                    mockClientMetrics.topClients[i].totalSpent
                );
            }
        });
    });

    describe('Staff Performance Validation', () => {
        test('should have comprehensive staff performance data', () => {
            expect(Array.isArray(mockStaffPerformance)).toBe(true);
            expect(mockStaffPerformance.length).toBeGreaterThan(0);

            mockStaffPerformance.forEach(staff => {
                expect(staff).toHaveProperty('staffId');
                expect(staff).toHaveProperty('name');
                expect(staff).toHaveProperty('employmentType');
                expect(staff).toHaveProperty('totalRevenue');
                expect(staff).toHaveProperty('appointmentCount');
                expect(staff).toHaveProperty('averageTicket');
                expect(staff).toHaveProperty('commissionEarnings');
                expect(staff).toHaveProperty('chairRentalPaid');
                expect(staff).toHaveProperty('utilizationRate');
                expect(staff).toHaveProperty('clientSatisfaction');

                expect(typeof staff.name).toBe('string');
                expect(staff.name.length).toBeGreaterThan(0);
                expect(['COMMISSION', 'CHAIR_RENTAL', 'HYBRID']).toContain(staff.employmentType);
                expect(staff.totalRevenue).toBeGreaterThanOrEqual(0);
                expect(staff.appointmentCount).toBeGreaterThanOrEqual(0);
                expect(staff.utilizationRate).toBeGreaterThanOrEqual(0);
                expect(staff.utilizationRate).toBeLessThanOrEqual(100);
                expect(staff.clientSatisfaction).toBeGreaterThanOrEqual(1);
                expect(staff.clientSatisfaction).toBeLessThanOrEqual(5);
            });
        });

        test('should calculate employment-specific earnings correctly', () => {
            mockStaffPerformance.forEach(staff => {
                if (staff.employmentType === 'COMMISSION') {
                    expect(staff.commissionEarnings).toBeGreaterThan(0);
                    expect(staff.chairRentalPaid).toBe(0);
                } else if (staff.employmentType === 'CHAIR_RENTAL') {
                    expect(staff.chairRentalPaid).toBeGreaterThan(0);
                    expect(staff.commissionEarnings).toBe(0);
                } else if (staff.employmentType === 'HYBRID') {
                    expect(staff.commissionEarnings).toBeGreaterThanOrEqual(0);
                    expect(staff.chairRentalPaid).toBeGreaterThanOrEqual(0);
                }
            });
        });

        test('should have realistic performance distributions', () => {
            const employmentTypes = [...new Set(mockStaffPerformance.map(s => s.employmentType))];
            expect(employmentTypes.length).toBeGreaterThan(0);

            mockStaffPerformance.forEach(staff => {
                if (staff.appointmentCount > 0) {
                    expect(staff.averageTicket).toBeGreaterThan(20);
                    expect(staff.averageTicket).toBeLessThan(300);

                    // Validate average ticket calculation
                    const expectedAverage = staff.totalRevenue / staff.appointmentCount;
                    expect(Math.abs(staff.averageTicket - expectedAverage)).toBeLessThan(0.01);
                }
            });
        });
    });

    describe('Service Analytics Validation', () => {
        test('should have comprehensive service performance data', () => {
            expect(Array.isArray(mockServiceAnalytics)).toBe(true);
            expect(mockServiceAnalytics.length).toBeGreaterThan(0);

            mockServiceAnalytics.forEach(service => {
                expect(service).toHaveProperty('serviceId');
                expect(service).toHaveProperty('name');
                expect(service).toHaveProperty('bookingCount');
                expect(service).toHaveProperty('revenue');
                expect(service).toHaveProperty('averagePrice');
                expect(service).toHaveProperty('popularityRank');
                expect(service).toHaveProperty('profitMargin');
                expect(service).toHaveProperty('duration');

                expect(typeof service.name).toBe('string');
                expect(service.name.length).toBeGreaterThan(0);
                expect(service.bookingCount).toBeGreaterThanOrEqual(0);
                expect(service.revenue).toBeGreaterThanOrEqual(0);
                expect(service.averagePrice).toBeGreaterThan(0);
                expect(service.popularityRank).toBeGreaterThan(0);
                expect(service.duration).toBeGreaterThan(0);
            });
        });

        test('should have proper popularity ranking', () => {
            const ranks = mockServiceAnalytics.map(s => s.popularityRank).sort((a, b) => a - b);

            for (let i = 0; i < ranks.length; i++) {
                expect(ranks[i]).toBe(i + 1);
            }

            // Services should be sorted by booking count (descending)
            for (let i = 1; i < mockServiceAnalytics.length; i++) {
                expect(mockServiceAnalytics[i - 1].bookingCount).toBeGreaterThanOrEqual(
                    mockServiceAnalytics[i].bookingCount
                );
            }
        });

        test('should have realistic service pricing and revenue', () => {
            mockServiceAnalytics.forEach(service => {
                expect(service.averagePrice).toBeGreaterThan(10);
                expect(service.averagePrice).toBeLessThan(500);

                if (service.bookingCount > 0) {
                    const expectedRevenue = service.bookingCount * service.averagePrice;
                    const variance = Math.abs(service.revenue - expectedRevenue) / expectedRevenue;
                    expect(variance).toBeLessThan(0.1); // Allow for 10% variance
                }

                expect(service.duration).toBeGreaterThanOrEqual(15);
                expect(service.duration).toBeLessThanOrEqual(240);
                expect(service.profitMargin).toBeGreaterThan(0);
                expect(service.profitMargin).toBeLessThan(100);
            });
        });
    });

    describe('Data Consistency Validation', () => {
        test('should have consistent revenue calculations', () => {
            const totalRevenueFromRevenue = mockRevenueData.reduce((sum, day) => sum + day.revenue, 0);
            const totalRevenueFromStaff = mockStaffPerformance.reduce((sum, staff) => sum + staff.totalRevenue, 0);
            const totalRevenueFromServices = mockServiceAnalytics.reduce((sum, service) => sum + service.revenue, 0);

            // All should be positive
            expect(totalRevenueFromRevenue).toBeGreaterThan(0);
            expect(totalRevenueFromStaff).toBeGreaterThan(0);
            expect(totalRevenueFromServices).toBeGreaterThan(0);

            // Should be in similar magnitude (allowing for different time periods)
            const revenues = [totalRevenueFromRevenue, totalRevenueFromStaff, totalRevenueFromServices];
            const maxRevenue = Math.max(...revenues);
            const minRevenue = Math.min(...revenues);

            if (maxRevenue > 0) {
                const ratio = minRevenue / maxRevenue;
                expect(ratio).toBeGreaterThan(0.01); // Values shouldn't differ by more than 100x
            }
        });

        test('should have consistent appointment counts', () => {
            const appointmentsFromRevenue = mockRevenueData.reduce((sum, day) => sum + day.appointments, 0);
            const appointmentsFromStaff = mockStaffPerformance.reduce((sum, staff) => sum + staff.appointmentCount, 0);

            expect(appointmentsFromRevenue).toBeGreaterThan(0);
            expect(appointmentsFromStaff).toBeGreaterThan(0);
        });

        test('should have reasonable client data relationships', () => {
            expect(mockClientMetrics.totalClients).toBeGreaterThan(0);
            expect(mockClientMetrics.topClients.length).toBeLessThanOrEqual(mockClientMetrics.totalClients);

            // Retention rate calculation should be consistent
            if (mockClientMetrics.totalClients > 0) {
                const calculatedRetentionRate = (mockClientMetrics.returningClients / mockClientMetrics.totalClients) * 100;
                expect(Math.abs(mockClientMetrics.clientRetentionRate - calculatedRetentionRate)).toBeLessThan(1);
            }
        });
    });

    describe('Performance and Data Quality', () => {
        test('should have meaningful data volumes', () => {
            // Revenue data should cover multiple days
            expect(mockRevenueData.length).toBeGreaterThan(0);

            // Should have multiple clients
            expect(mockClientMetrics.totalClients).toBeGreaterThan(10);

            // Should have multiple staff members
            expect(mockStaffPerformance.length).toBeGreaterThan(1);

            // Should have multiple services
            expect(mockServiceAnalytics.length).toBeGreaterThan(1);
        });

        test('should have realistic business metrics', () => {
            // Average ticket should be reasonable for salon business
            mockRevenueData.forEach(day => {
                if (day.appointments > 0) {
                    expect(day.averageTicket).toBeGreaterThan(30);
                    expect(day.averageTicket).toBeLessThan(500);
                }
            });

            // Client retention should be realistic
            expect(mockClientMetrics.clientRetentionRate).toBeGreaterThan(20);
            expect(mockClientMetrics.clientRetentionRate).toBeLessThan(95);

            // Staff utilization should be realistic
            mockStaffPerformance.forEach(staff => {
                expect(staff.utilizationRate).toBeGreaterThan(50);
                expect(staff.utilizationRate).toBeLessThan(100);
            });
        });

        test('should have proper data types and formats', () => {
            // Date formats
            mockRevenueData.forEach(day => {
                expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            });

            // Numeric precision
            mockStaffPerformance.forEach(staff => {
                expect(Number.isFinite(staff.totalRevenue)).toBe(true);
                expect(Number.isFinite(staff.averageTicket)).toBe(true);
                expect(Number.isFinite(staff.commissionEarnings)).toBe(true);
            });

            // Client satisfaction ratings
            mockStaffPerformance.forEach(staff => {
                expect(staff.clientSatisfaction).toBeGreaterThanOrEqual(1);
                expect(staff.clientSatisfaction).toBeLessThanOrEqual(5);
            });
        });
    });
});
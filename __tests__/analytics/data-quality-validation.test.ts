/**
 * Analytics and Reporting Data Quality Validation Test Suite
 *
 * This test suite validates that all dashboard widgets display meaningful data
 * and that analytics calculations are accurate with the comprehensive seed data.
 *
 * Requirements: 1.2, 1.3, 2.3, 3.2
 */

import { endOfDay, startOfDay, subDays } from 'date-fns';
import { DashboardDataService } from '../../lib/dashboard-data';
import { prisma } from '../../lib/prisma';
import {
  AppointmentSummary,
  ClientMetrics,
  DateRange,
  RevenueData,
  RevenueMetrics,
  ServiceAnalytics,
  StaffPerformance,
} from '../../types/dashboard';

describe('Analytics and Reporting Data Quality Validation', () => {
  let testBusinessId: string;
  let dataService: DashboardDataService;
  let testDateRange: DateRange;

  beforeAll(async () => {
    // Get a business with comprehensive seed data
    const business = await prisma.business.findFirst({
      where: {
        name: { contains: 'Lumina' }, // Assuming seed data creates businesses with 'Lumina' in name
      },
    });

    if (!business) {
      throw new Error('No test business found. Please run seed data first.');
    }

    testBusinessId = business.id;
    dataService = new DashboardDataService(testBusinessId);

    // Use last 30 days for testing
    testDateRange = {
      from: subDays(new Date(), 30),
      to: new Date(),
    };
  });

  describe('Dashboard Widget Data Validation', () => {
    describe('Revenue Chart Widget', () => {
      let revenueData: RevenueData[];
      let revenueMetrics: RevenueMetrics;

      beforeAll(async () => {
        revenueData = await dataService.getRevenueData(testDateRange);
        revenueMetrics = await dataService.getRevenueMetrics(testDateRange);
      });

      test('should return meaningful revenue data with proper structure', () => {
        expect(revenueData).toBeDefined();
        expect(Array.isArray(revenueData)).toBe(true);
        expect(revenueData.length).toBeGreaterThan(0);

        // Validate data structure
        revenueData.forEach((day: any) => {
          expect(day).toHaveProperty('date');
          expect(day).toHaveProperty('revenue');
          expect(day).toHaveProperty('appointments');
          expect(day).toHaveProperty('averageTicket');
          expect(day).toHaveProperty('commissionEarnings');
          expect(day).toHaveProperty('chairRentalRevenue');
          expect(day).toHaveProperty('businessRetention');

          // Validate data types and ranges
          expect(typeof day.date).toBe('string');
          expect(typeof day.revenue).toBe('number');
          expect(typeof day.appointments).toBe('number');
          expect(typeof day.averageTicket).toBe('number');
          expect(day.revenue).toBeGreaterThanOrEqual(0);
          expect(day.appointments).toBeGreaterThanOrEqual(0);
          expect(day.averageTicket).toBeGreaterThanOrEqual(0);
        });
      });

      test('should have realistic revenue patterns and distributions', () => {
        const totalRevenue = revenueData.reduce(
          (sum: any, day: any) => sum + day.revenue,
          0
        );
        const totalAppointments = revenueData.reduce(
          (sum: any, day: any) => sum + day.appointments,
          0
        );
        const averageTicket =
          totalAppointments > 0 ? totalRevenue / totalAppointments : 0;

        // Validate realistic ranges for salon business
        expect(totalRevenue).toBeGreaterThan(1000); // Should have meaningful revenue
        expect(totalAppointments).toBeGreaterThan(10); // Should have multiple appointments
        expect(averageTicket).toBeGreaterThan(30); // Realistic average ticket for salon
        expect(averageTicket).toBeLessThan(500); // Not unrealistically high

        // Check for data distribution (not all zeros)
        const daysWithRevenue = revenueData.filter(
          (day: any) => day.revenue > 0
        ).length;
        expect(daysWithRevenue).toBeGreaterThan(revenueData.length * 0.3); // At least 30% of days should have revenue
      });

      test('should calculate accurate revenue metrics', () => {
        expect(revenueMetrics).toBeDefined();
        expect(revenueMetrics).toHaveProperty('totalRevenue');
        expect(revenueMetrics).toHaveProperty('revenueGrowth');
        expect(revenueMetrics).toHaveProperty('averageTicket');
        expect(revenueMetrics).toHaveProperty('appointmentCount');

        // Validate metrics consistency
        const calculatedTotal = revenueData.reduce(
          (sum: any, day: any) => sum + day.revenue,
          0
        );
        expect(
          Math.abs(revenueMetrics.totalRevenue - calculatedTotal)
        ).toBeLessThan(1); // Allow for rounding

        expect(revenueMetrics.totalRevenue).toBeGreaterThan(0);
        expect(revenueMetrics.appointmentCount).toBeGreaterThan(0);
        expect(revenueMetrics.averageTicket).toBeGreaterThan(0);
      });

      test('should properly calculate employment type revenue splits', () => {
        revenueData.forEach((day: any) => {
          if (day.revenue > 0) {
            // Commission + chair rental + business retention should be reasonable
            const totalSplit =
              day.commissionEarnings +
              day.chairRentalRevenue +
              day.businessRetention;

            // Allow for some variance due to different calculation methods
            expect(Math.abs(totalSplit - day.revenue)).toBeLessThan(
              day.revenue * 0.5
            );

            // Each component should be non-negative
            expect(day.commissionEarnings).toBeGreaterThanOrEqual(0);
            expect(day.chairRentalRevenue).toBeGreaterThanOrEqual(0);
            expect(day.businessRetention).toBeGreaterThanOrEqual(0);
          }
        });
      });
    });

    describe('Client Metrics Widget', () => {
      let clientMetrics: ClientMetrics;

      beforeAll(async () => {
        clientMetrics = await dataService.getClientMetrics(testDateRange);
      });

      test('should return comprehensive client analytics', () => {
        expect(clientMetrics).toBeDefined();
        expect(clientMetrics).toHaveProperty('totalClients');
        expect(clientMetrics).toHaveProperty('newClients');
        expect(clientMetrics).toHaveProperty('returningClients');
        expect(clientMetrics).toHaveProperty('clientRetentionRate');
        expect(clientMetrics).toHaveProperty('averageLifetimeValue');
        expect(clientMetrics).toHaveProperty('topClients');

        // Validate realistic client numbers
        expect(clientMetrics.totalClients).toBeGreaterThan(10); // Should have meaningful client base
        expect(clientMetrics.newClients).toBeGreaterThanOrEqual(0);
        expect(clientMetrics.returningClients).toBeGreaterThanOrEqual(0);
        expect(clientMetrics.clientRetentionRate).toBeGreaterThanOrEqual(0);
        expect(clientMetrics.clientRetentionRate).toBeLessThanOrEqual(100);
      });

      test('should have realistic client retention patterns', () => {
        // Retention rate should be reasonable for a salon
        expect(clientMetrics.clientRetentionRate).toBeGreaterThan(20); // At least 20% retention
        expect(clientMetrics.clientRetentionRate).toBeLessThan(95); // Not unrealistically high

        // Average lifetime value should be meaningful
        expect(clientMetrics.averageLifetimeValue).toBeGreaterThan(50); // Reasonable LTV for salon
        expect(clientMetrics.averageLifetimeValue).toBeLessThan(5000); // Not unrealistically high
      });

      test('should provide meaningful top clients data', () => {
        expect(Array.isArray(clientMetrics.topClients)).toBe(true);
        expect(clientMetrics.topClients.length).toBeGreaterThan(0);
        expect(clientMetrics.topClients.length).toBeLessThanOrEqual(10);

        clientMetrics.topClients.forEach((client: any) => {
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

        // Top clients should be sorted by total spent (descending)
        for (let i = 1; i < clientMetrics.topClients.length; i++) {
          expect(
            clientMetrics.topClients[i - 1].totalSpent
          ).toBeGreaterThanOrEqual(clientMetrics.topClients[i].totalSpent);
        }
      });
    });

    describe('Staff Performance Widget', () => {
      let staffPerformance: StaffPerformance[];

      beforeAll(async () => {
        staffPerformance = await dataService.getStaffPerformance(testDateRange);
      });

      test('should return comprehensive staff performance data', () => {
        expect(Array.isArray(staffPerformance)).toBe(true);
        expect(staffPerformance.length).toBeGreaterThan(0);

        staffPerformance.forEach((staff: any) => {
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

          // Validate data types and ranges
          expect(typeof staff.name).toBe('string');
          expect(staff.name.length).toBeGreaterThan(0);
          expect(['COMMISSION', 'CHAIR_RENTAL', 'HYBRID']).toContain(
            staff.employmentType
          );
          expect(staff.totalRevenue).toBeGreaterThanOrEqual(0);
          expect(staff.appointmentCount).toBeGreaterThanOrEqual(0);
          expect(staff.averageTicket).toBeGreaterThanOrEqual(0);
          expect(staff.utilizationRate).toBeGreaterThanOrEqual(0);
          expect(staff.utilizationRate).toBeLessThanOrEqual(100);
          expect(staff.clientSatisfaction).toBeGreaterThanOrEqual(1);
          expect(staff.clientSatisfaction).toBeLessThanOrEqual(5);
        });
      });

      test('should have realistic performance distributions', () => {
        // Should have staff with different employment types
        const employmentTypes = [
          ...new Set(staffPerformance.map((s: any) => s.employmentType)),
        ];
        expect(employmentTypes.length).toBeGreaterThan(1); // Should have variety

        // Performance should vary between staff members
        const revenues = staffPerformance.map((s: any) => s.totalRevenue);
        const maxRevenue = Math.max(...revenues);
        const minRevenue = Math.min(...revenues);

        if (staffPerformance.length > 1) {
          expect(maxRevenue).toBeGreaterThan(minRevenue); // Should have performance variation
        }

        // Average tickets should be reasonable
        staffPerformance.forEach((staff: any) => {
          if (staff.appointmentCount > 0) {
            expect(staff.averageTicket).toBeGreaterThan(20); // Reasonable minimum
            expect(staff.averageTicket).toBeLessThan(300); // Reasonable maximum
          }
        });
      });

      test('should calculate employment-specific earnings correctly', () => {
        staffPerformance.forEach((staff: any) => {
          if (staff.employmentType === 'COMMISSION') {
            expect(staff.commissionEarnings).toBeGreaterThan(0);
            expect(staff.chairRentalPaid).toBe(0);
          } else if (staff.employmentType === 'CHAIR_RENTAL') {
            expect(staff.chairRentalPaid).toBeGreaterThan(0);
            expect(staff.commissionEarnings).toBe(0);
          } else if (staff.employmentType === 'HYBRID') {
            // Hybrid should have both components
            expect(staff.commissionEarnings).toBeGreaterThanOrEqual(0);
            expect(staff.chairRentalPaid).toBeGreaterThanOrEqual(0);
          }
        });
      });
    });

    describe('Service Analytics Widget', () => {
      let serviceAnalytics: ServiceAnalytics[];

      beforeAll(async () => {
        serviceAnalytics = await dataService.getServiceAnalytics(testDateRange);
      });

      test('should return comprehensive service performance data', () => {
        expect(Array.isArray(serviceAnalytics)).toBe(true);
        expect(serviceAnalytics.length).toBeGreaterThan(0);

        serviceAnalytics.forEach((service: any) => {
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
        // Popularity ranks should be sequential starting from 1
        const ranks = serviceAnalytics
          .map((s: any) => s.popularityRank)
          .sort((a, b) => a - b);

        for (let i = 0; i < ranks.length; i++) {
          expect(ranks[i]).toBe(i + 1);
        }

        // Services should be sorted by booking count (descending)
        for (let i = 1; i < serviceAnalytics.length; i++) {
          expect(serviceAnalytics[i - 1].bookingCount).toBeGreaterThanOrEqual(
            serviceAnalytics[i].bookingCount
          );
        }
      });

      test('should have realistic service pricing and revenue', () => {
        serviceAnalytics.forEach((service: any) => {
          // Average price should be reasonable for salon services
          expect(service.averagePrice).toBeGreaterThan(10);
          expect(service.averagePrice).toBeLessThan(500);

          // Revenue should match booking count * average price (approximately)
          if (service.bookingCount > 0) {
            const expectedRevenue = service.bookingCount * service.averagePrice;
            const variance =
              Math.abs(service.revenue - expectedRevenue) / expectedRevenue;
            expect(variance).toBeLessThan(0.5); // Allow for some variance due to price variations
          }

          // Duration should be reasonable (15 minutes to 4 hours)
          expect(service.duration).toBeGreaterThanOrEqual(15);
          expect(service.duration).toBeLessThanOrEqual(240);
        });
      });
    });

    describe('Recent Activity Widget', () => {
      let recentAppointments: AppointmentSummary[];

      beforeAll(async () => {
        recentAppointments = await dataService.getRecentAppointments(20);
      });

      test('should return recent appointment data', () => {
        expect(Array.isArray(recentAppointments)).toBe(true);
        expect(recentAppointments.length).toBeGreaterThan(0);
        expect(recentAppointments.length).toBeLessThanOrEqual(20);

        recentAppointments.forEach((appointment: any) => {
          expect(appointment).toHaveProperty('id');
          expect(appointment).toHaveProperty('clientName');
          expect(appointment).toHaveProperty('serviceName');
          expect(appointment).toHaveProperty('staffName');
          expect(appointment).toHaveProperty('startTime');
          expect(appointment).toHaveProperty('endTime');
          expect(appointment).toHaveProperty('status');
          expect(appointment).toHaveProperty('totalAmount');

          expect(typeof appointment.clientName).toBe('string');
          expect(appointment.clientName.length).toBeGreaterThan(0);
          expect(typeof appointment.serviceName).toBe('string');
          expect(appointment.serviceName.length).toBeGreaterThan(0);
          expect(typeof appointment.staffName).toBe('string');
          expect(appointment.staffName.length).toBeGreaterThan(0);
          expect(appointment.startTime).toBeInstanceOf(Date);
          expect(appointment.endTime).toBeInstanceOf(Date);
          expect(appointment.totalAmount).toBeGreaterThan(0);
        });
      });

      test('should be sorted by most recent first', () => {
        for (let i = 1; i < recentAppointments.length; i++) {
          expect(
            recentAppointments[i - 1].startTime.getTime()
          ).toBeGreaterThanOrEqual(recentAppointments[i].startTime.getTime());
        }
      });

      test('should have realistic appointment data', () => {
        recentAppointments.forEach((appointment: any) => {
          // Start time should be before end time
          expect(appointment.startTime.getTime()).toBeLessThan(
            appointment.endTime.getTime()
          );

          // Total amount should be reasonable
          expect(appointment.totalAmount).toBeGreaterThan(10);
          expect(appointment.totalAmount).toBeLessThan(1000);

          // Status should be valid
          expect(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).toContain(
            appointment.status
          );
        });
      });
    });
  });

  describe('Data Consistency and Integrity', () => {
    test('should have consistent data across different widgets', async () => {
      // Get data from multiple sources
      const [revenueData, clientMetrics, staffPerformance, serviceAnalytics] =
        await Promise.all([
          dataService.getRevenueData(testDateRange),
          dataService.getClientMetrics(testDateRange),
          dataService.getStaffPerformance(testDateRange),
          dataService.getServiceAnalytics(testDateRange),
        ]);

      // Total revenue should be consistent
      const revenueFromRevenueWidget = revenueData.reduce(
        (sum: any, day: any) => sum + day.revenue,
        0
      );
      const revenueFromStaffWidget = staffPerformance.reduce(
        (sum: any, staff: any) => sum + staff.totalRevenue,
        0
      );
      const revenueFromServiceWidget = serviceAnalytics.reduce(
        (sum: any, service: any) => sum + service.revenue,
        0
      );

      // Allow for some variance due to different calculation methods and date ranges
      const maxRevenue = Math.max(
        revenueFromRevenueWidget,
        revenueFromStaffWidget,
        revenueFromServiceWidget
      );
      const minRevenue = Math.min(
        revenueFromRevenueWidget,
        revenueFromStaffWidget,
        revenueFromServiceWidget
      );

      if (maxRevenue > 0) {
        const variance = (maxRevenue - minRevenue) / maxRevenue;
        expect(variance).toBeLessThan(0.3); // Allow up to 30% variance
      }

      // Client count should be reasonable
      expect(clientMetrics.totalClients).toBeGreaterThan(0);

      // Staff count should match
      expect(staffPerformance.length).toBeGreaterThan(0);

      // Service count should be reasonable
      expect(serviceAnalytics.length).toBeGreaterThan(5); // Should have multiple services
    });

    test('should have proper date range filtering', async () => {
      // Test with a smaller date range
      const smallDateRange: DateRange = {
        from: subDays(new Date(), 7),
        to: new Date(),
      };

      const [fullRangeData, smallRangeData] = await Promise.all([
        dataService.getRevenueData(testDateRange),
        dataService.getRevenueData(smallDateRange),
      ]);

      // Small range should have fewer or equal data points
      expect(smallRangeData.length).toBeLessThanOrEqual(fullRangeData.length);

      // All dates in small range should be within the specified range
      smallRangeData.forEach((day: any) => {
        const dayDate = new Date(day.date);
        expect(dayDate.getTime()).toBeGreaterThanOrEqual(
          startOfDay(smallDateRange.from).getTime()
        );
        expect(dayDate.getTime()).toBeLessThanOrEqual(
          endOfDay(smallDateRange.to).getTime()
        );
      });
    });
  });

  describe('Performance and Scalability', () => {
    test('should return data within reasonable time limits', async () => {
      const startTime = Date.now();

      await Promise.all([
        dataService.getRevenueData(testDateRange),
        dataService.getClientMetrics(testDateRange),
        dataService.getStaffPerformance(testDateRange),
        dataService.getServiceAnalytics(testDateRange),
        dataService.getRecentAppointments(10),
      ]);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Should complete within 5 seconds
      expect(executionTime).toBeLessThan(5000);
    });

    test('should handle large date ranges efficiently', async () => {
      const largeDateRange: DateRange = {
        from: subDays(new Date(), 180), // 6 months
        to: new Date(),
      };

      const startTime = Date.now();
      const revenueData = await dataService.getRevenueData(largeDateRange);
      const endTime = Date.now();

      expect(revenueData).toBeDefined();
      expect(Array.isArray(revenueData)).toBe(true);

      // Should complete within 10 seconds even for large ranges
      expect(endTime - startTime).toBeLessThan(10000);
    });
  });
});

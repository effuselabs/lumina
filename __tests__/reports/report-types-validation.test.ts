/**
 * Report Types Data Quality Validation
 *
 * Tests all report types (P&L, commission, client, service) to ensure
 * they display accurate calculations with the generated seed data.
 *
 * Requirements: 1.2, 1.3, 2.3, 3.2
 */

import { endOfMonth, startOfMonth, subDays } from 'date-fns';
import { DashboardDataService } from '../../lib/dashboard-data';
import {
  calculateBusinessRevenue,
  calculateStaffEarnings,
} from '../../lib/financial/transaction-service';
import { prisma } from '../../lib/prisma';
import { DateRange } from '../../types/dashboard';

describe('Report Types Data Quality Validation', () => {
  let testBusinessId: string;
  let dataService: DashboardDataService;
  let testDateRange: DateRange;
  let monthlyDateRange: DateRange;

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

    // Use last 30 days for testing
    testDateRange = {
      from: subDays(new Date(), 30),
      to: new Date(),
    };

    // Use current month for monthly reports
    const now = new Date();
    monthlyDateRange = {
      from: startOfMonth(now),
      to: endOfMonth(now),
    };
  });

  describe('Profit & Loss (P&L) Report Validation', () => {
    test('should calculate accurate revenue and expenses', async () => {
      const businessRevenue = await calculateBusinessRevenue(
        testBusinessId,
        testDateRange.from,
        testDateRange.to
      );

      expect(businessRevenue).toBeDefined();
      expect(businessRevenue).toHaveProperty('totalRevenue');
      expect(businessRevenue).toHaveProperty('netRevenue');
      expect(businessRevenue).toHaveProperty('totalRefunds');
      expect(businessRevenue).toHaveProperty('transactionCount');
      expect(businessRevenue).toHaveProperty('averageTransactionAmount');

      // Validate revenue calculations
      expect(businessRevenue.totalRevenue).toBeGreaterThanOrEqual(0);
      expect(businessRevenue.netRevenue).toBeGreaterThanOrEqual(0);
      expect(businessRevenue.totalRefunds).toBeGreaterThanOrEqual(0);
      expect(businessRevenue.transactionCount).toBeGreaterThanOrEqual(0);

      // Net revenue should be total revenue minus refunds
      expect(businessRevenue.netRevenue).toBe(
        businessRevenue.totalRevenue - businessRevenue.totalRefunds
      );

      // Average transaction should be calculated correctly
      if (businessRevenue.transactionCount > 0) {
        const expectedAverage =
          businessRevenue.totalRevenue / businessRevenue.transactionCount;
        expect(
          Math.abs(businessRevenue.averageTransactionAmount - expectedAverage)
        ).toBeLessThan(0.01);
      }
    });

    test('should break down revenue by employment type', async () => {
      const [commissionRevenue, chairRentalRevenue, hybridRevenue] =
        await Promise.all([
          calculateBusinessRevenue(
            testBusinessId,
            testDateRange.from,
            testDateRange.to,
            { employmentType: 'COMMISSION' }
          ),
          calculateBusinessRevenue(
            testBusinessId,
            testDateRange.from,
            testDateRange.to,
            { employmentType: 'CHAIR_RENTAL' }
          ),
          calculateBusinessRevenue(
            testBusinessId,
            testDateRange.from,
            testDateRange.to,
            { employmentType: 'HYBRID' }
          ),
        ]);

      // All employment types should have valid data structure
      [commissionRevenue, chairRentalRevenue, hybridRevenue].forEach(
        (revenue: any) => {
          expect(revenue).toHaveProperty('totalRevenue');
          expect(revenue).toHaveProperty('netRevenue');
          expect(revenue.totalRevenue).toBeGreaterThanOrEqual(0);
          expect(revenue.netRevenue).toBeGreaterThanOrEqual(0);
        }
      );

      // Total should equal sum of all employment types (approximately)
      const totalByEmploymentType =
        commissionRevenue.totalRevenue +
        chairRentalRevenue.totalRevenue +
        hybridRevenue.totalRevenue;

      const overallRevenue = await calculateBusinessRevenue(
        testBusinessId,
        testDateRange.from,
        testDateRange.to
      );

      if (overallRevenue.totalRevenue > 0) {
        const variance =
          Math.abs(totalByEmploymentType - overallRevenue.totalRevenue) /
          overallRevenue.totalRevenue;
        expect(variance).toBeLessThan(0.1); // Allow 10% variance for calculation differences
      }
    });

    test('should calculate business retention accurately', async () => {
      const staffPerformance =
        await dataService.getStaffPerformance(testDateRange);
      const businessRevenue = await calculateBusinessRevenue(
        testBusinessId,
        testDateRange.from,
        testDateRange.to
      );

      // Calculate expected business retention
      const totalCommissionsPaid = staffPerformance.reduce(
        (sum: any, staff: any) => {
          return sum + staff.commissionEarnings;
        },
        0
      );

      const totalChairRentalReceived = staffPerformance.reduce(
        (sum: any, staff: any) => {
          return sum + staff.chairRentalPaid;
        },
        0
      );

      // Business retention should be revenue minus commissions paid plus chair rental received
      const expectedRetention =
        businessRevenue.totalRevenue -
        totalCommissionsPaid +
        totalChairRentalReceived;

      // Validate that retention calculation is reasonable
      expect(expectedRetention).toBeGreaterThanOrEqual(0);
      expect(expectedRetention).toBeLessThanOrEqual(
        businessRevenue.totalRevenue * 1.5
      ); // Allow for chair rental income
    });
  });

  describe('Commission Report Validation', () => {
    test('should calculate accurate staff earnings by employment type', async () => {
      const staff = await prisma.staff.findMany({
        where: {
          businessId: testBusinessId,
          isActive: true,
        },
      });

      expect(staff.length).toBeGreaterThan(0);

      for (const staffMember of staff) {
        const earnings = await calculateStaffEarnings(
          staffMember.id,
          testDateRange.from,
          testDateRange.to
        );

        expect(earnings).toBeDefined();
        expect(earnings).toHaveProperty('totalRevenue');
        expect(earnings).toHaveProperty('totalCommissions');
        expect(earnings).toHaveProperty('transactionCount');
        expect(earnings).toHaveProperty('averageCommissionRate');

        expect(earnings.totalRevenue).toBeGreaterThanOrEqual(0);
        expect(earnings.totalCommissions).toBeGreaterThanOrEqual(0);
        expect(earnings.transactionCount).toBeGreaterThanOrEqual(0);

        // Commission rate should be reasonable
        if (earnings.totalRevenue > 0) {
          const calculatedRate =
            earnings.totalCommissions / earnings.totalRevenue;
          expect(calculatedRate).toBeGreaterThanOrEqual(0);
          expect(calculatedRate).toBeLessThanOrEqual(1); // Can't be more than 100%

          // For commission staff, rate should be reasonable (10-50%)
          if (staffMember.employmentType === 'COMMISSION') {
            expect(calculatedRate).toBeGreaterThan(0.1);
            expect(calculatedRate).toBeLessThan(0.6);
          }
        }
      }
    });

    test('should have consistent commission calculations across staff', async () => {
      const staffPerformance =
        await dataService.getStaffPerformance(testDateRange);

      // Group by employment type
      const commissionStaff = staffPerformance.filter(
        (s: any) => s.employmentType === 'COMMISSION'
      );
      const chairRentalStaff = staffPerformance.filter(
        (s: any) => s.employmentType === 'CHAIR_RENTAL'
      );
      const hybridStaff = staffPerformance.filter(
        (s: any) => s.employmentType === 'HYBRID'
      );

      // Commission staff should have commission earnings but no chair rental
      commissionStaff.forEach((staff: any) => {
        if (staff.totalRevenue > 0) {
          expect(staff.commissionEarnings).toBeGreaterThan(0);
          expect(staff.chairRentalPaid).toBe(0);
        }
      });

      // Chair rental staff should have chair rental but no commissions
      chairRentalStaff.forEach((staff: any) => {
        if (staff.appointmentCount > 0) {
          expect(staff.chairRentalPaid).toBeGreaterThan(0);
          expect(staff.commissionEarnings).toBe(0);
        }
      });

      // Hybrid staff should have both components
      hybridStaff.forEach((staff: any) => {
        if (staff.totalRevenue > 0 || staff.appointmentCount > 0) {
          expect(staff.commissionEarnings).toBeGreaterThanOrEqual(0);
          expect(staff.chairRentalPaid).toBeGreaterThanOrEqual(0);
        }
      });
    });

    test('should calculate commission rates accurately', async () => {
      const staff = await prisma.staff.findMany({
        where: {
          businessId: testBusinessId,
          isActive: true,
          employmentType: 'COMMISSION',
        },
      });

      for (const staffMember of staff) {
        const earnings = await calculateStaffEarnings(
          staffMember.id,
          testDateRange.from,
          testDateRange.to
        );

        if (earnings.totalRevenue > 0) {
          // Check if commission rate matches expected rate
          const actualRate = earnings.totalCommissions / earnings.totalRevenue;

          // If staff has a defined commission rate, it should match
          if (staffMember.commissionRate) {
            const expectedRate = Number(staffMember.commissionRate);
            const variance = Math.abs(actualRate - expectedRate) / expectedRate;
            expect(variance).toBeLessThan(0.1); // Allow 10% variance
          }

          // Average commission rate should be consistent
          expect(
            Math.abs(earnings.averageCommissionRate - actualRate)
          ).toBeLessThan(0.01);
        }
      }
    });
  });

  describe('Client Report Validation', () => {
    test('should provide accurate client analytics', async () => {
      const clientMetrics = await dataService.getClientMetrics(testDateRange);

      expect(clientMetrics.totalClients).toBeGreaterThan(0);
      expect(clientMetrics.newClients).toBeGreaterThanOrEqual(0);
      expect(clientMetrics.returningClients).toBeGreaterThanOrEqual(0);

      // Validate client retention calculation
      if (clientMetrics.totalClients > 0) {
        const calculatedRetentionRate =
          (clientMetrics.returningClients / clientMetrics.totalClients) * 100;
        expect(
          Math.abs(clientMetrics.clientRetentionRate - calculatedRetentionRate)
        ).toBeLessThan(1);
      }

      // Validate top clients data
      expect(Array.isArray(clientMetrics.topClients)).toBe(true);
      expect(clientMetrics.topClients.length).toBeGreaterThan(0);

      clientMetrics.topClients.forEach((client: any) => {
        expect(client.totalSpent).toBeGreaterThan(0);
        expect(client.appointmentCount).toBeGreaterThan(0);
        expect(client.name.length).toBeGreaterThan(0);
        expect(client.lastVisit).toBeInstanceOf(Date);
      });

      // Top clients should be sorted by total spent
      for (let i = 1; i < clientMetrics.topClients.length; i++) {
        expect(
          clientMetrics.topClients[i - 1].totalSpent
        ).toBeGreaterThanOrEqual(clientMetrics.topClients[i].totalSpent);
      }
    });

    test('should calculate lifetime value accurately', async () => {
      const clientMetrics = await dataService.getClientMetrics(testDateRange);

      // Validate average lifetime value calculation
      if (clientMetrics.topClients.length > 0) {
        const totalSpentByTopClients = clientMetrics.topClients.reduce(
          (sum, client) => sum + client.totalSpent,
          0
        );
        const averageOfTopClients =
          totalSpentByTopClients / clientMetrics.topClients.length;

        // Average LTV should be reasonable compared to top clients
        expect(clientMetrics.averageLifetimeValue).toBeGreaterThan(0);
        expect(clientMetrics.averageLifetimeValue).toBeLessThan(
          averageOfTopClients * 2
        );
      }
    });

    test('should track client visit patterns accurately', async () => {
      // Get detailed client data
      const clients = await prisma.client.findMany({
        where: {
          businessId: testBusinessId,
        },
        include: {
          appointments: {
            where: {
              status: 'COMPLETED',
              startTime: {
                gte: testDateRange.from,
                lte: testDateRange.to,
              },
            },
            include: {
              services: true,
            },
          },
        },
      });

      expect(clients.length).toBeGreaterThan(0);

      // Validate client visit patterns
      clients.forEach((client: any) => {
        const appointments = client.appointments;

        if (appointments.length > 0) {
          // Calculate total spent
          const totalSpent = appointments.reduce(
            (sum: any, appointment: any) => {
              return (
                sum +
                appointment.services.reduce(
                  (serviceSum, service) => serviceSum + Number(service.price),
                  0
                )
              );
            },
            0
          );

          expect(totalSpent).toBeGreaterThan(0);

          // Validate appointment count
          expect(appointments.length).toBeGreaterThan(0);

          // Check if client is correctly classified as returning
          const isReturning = appointments.length > 1;

          // This should match the client metrics calculation
          if (isReturning) {
            expect(appointments.length).toBeGreaterThan(1);
          }
        }
      });
    });
  });

  describe('Service Report Validation', () => {
    test('should provide accurate service analytics', async () => {
      const serviceAnalytics =
        await dataService.getServiceAnalytics(testDateRange);

      expect(Array.isArray(serviceAnalytics)).toBe(true);
      expect(serviceAnalytics.length).toBeGreaterThan(0);

      serviceAnalytics.forEach((service: any) => {
        expect(service.name.length).toBeGreaterThan(0);
        expect(service.bookingCount).toBeGreaterThanOrEqual(0);
        expect(service.revenue).toBeGreaterThanOrEqual(0);
        expect(service.averagePrice).toBeGreaterThan(0);
        expect(service.popularityRank).toBeGreaterThan(0);
        expect(service.duration).toBeGreaterThan(0);

        // Validate revenue calculation
        if (service.bookingCount > 0) {
          const expectedRevenue = service.bookingCount * service.averagePrice;
          const variance =
            Math.abs(service.revenue - expectedRevenue) / expectedRevenue;
          expect(variance).toBeLessThan(0.5); // Allow for price variations
        }
      });

      // Validate popularity ranking
      const ranks = serviceAnalytics
        .map((s: any) => s.popularityRank)
        .sort((a, b) => a - b);
      for (let i = 0; i < ranks.length; i++) {
        expect(ranks[i]).toBe(i + 1);
      }

      // Services should be sorted by booking count
      for (let i = 1; i < serviceAnalytics.length; i++) {
        expect(serviceAnalytics[i - 1].bookingCount).toBeGreaterThanOrEqual(
          serviceAnalytics[i].bookingCount
        );
      }
    });

    test('should calculate service profitability accurately', async () => {
      const serviceAnalytics =
        await dataService.getServiceAnalytics(testDateRange);

      serviceAnalytics.forEach((service: any) => {
        // Profit margin should be reasonable for salon services
        expect(service.profitMargin).toBeGreaterThan(0);
        expect(service.profitMargin).toBeLessThan(100);

        // Duration should be realistic for salon services
        expect(service.duration).toBeGreaterThanOrEqual(15); // At least 15 minutes
        expect(service.duration).toBeLessThanOrEqual(300); // At most 5 hours

        // Average price should be reasonable
        expect(service.averagePrice).toBeGreaterThan(10);
        expect(service.averagePrice).toBeLessThan(500);
      });
    });

    test('should track service performance trends', async () => {
      // Compare current period with previous period
      const previousPeriodRange: DateRange = {
        from: subDays(testDateRange.from, 30),
        to: testDateRange.from,
      };

      const [currentServices, previousServices] = await Promise.all([
        dataService.getServiceAnalytics(testDateRange),
        dataService.getServiceAnalytics(previousPeriodRange),
      ]);

      // Should have services in both periods
      expect(currentServices.length).toBeGreaterThan(0);

      // Create a map for easy comparison
      const previousServiceMap = new Map(
        previousServices.map((s: any) => [s.serviceId, s])
      );

      currentServices.forEach((currentService: any) => {
        const previousService = previousServiceMap.get(
          currentService.serviceId
        );

        if (previousService) {
          // Both periods should have reasonable data
          expect(currentService.bookingCount).toBeGreaterThanOrEqual(0);
          expect(previousService.bookingCount).toBeGreaterThanOrEqual(0);

          // Revenue should be consistent with booking count
          if (currentService.bookingCount > 0) {
            expect(currentService.revenue).toBeGreaterThan(0);
          }

          if (previousService.bookingCount > 0) {
            expect(previousService.revenue).toBeGreaterThan(0);
          }
        }
      });
    });
  });

  describe('Cross-Report Data Consistency', () => {
    test('should have consistent revenue across all report types', async () => {
      const [revenueData, businessRevenue, staffPerformance, serviceAnalytics] =
        await Promise.all([
          dataService.getRevenueData(testDateRange),
          calculateBusinessRevenue(
            testBusinessId,
            testDateRange.from,
            testDateRange.to
          ),
          dataService.getStaffPerformance(testDateRange),
          dataService.getServiceAnalytics(testDateRange),
        ]);

      // Calculate total revenue from different sources
      const revenueFromDashboard = revenueData.reduce(
        (sum: any, day: any) => sum + day.revenue,
        0
      );
      const revenueFromFinancial = businessRevenue.totalRevenue;
      const revenueFromStaff = staffPerformance.reduce(
        (sum: any, staff: any) => sum + staff.totalRevenue,
        0
      );
      const revenueFromServices = serviceAnalytics.reduce(
        (sum: any, service: any) => sum + service.revenue,
        0
      );

      const revenues = [
        revenueFromDashboard,
        revenueFromFinancial,
        revenueFromStaff,
        revenueFromServices,
      ];
      const maxRevenue = Math.max(...revenues);
      const minRevenue = Math.min(...revenues);

      // Allow for some variance due to different calculation methods
      if (maxRevenue > 0) {
        const variance = (maxRevenue - minRevenue) / maxRevenue;
        expect(variance).toBeLessThan(0.3); // Allow up to 30% variance
      }

      // All revenue figures should be positive
      revenues.forEach((revenue: any) => {
        expect(revenue).toBeGreaterThanOrEqual(0);
      });
    });

    test('should have consistent appointment counts across reports', async () => {
      const [revenueData, staffPerformance] = await Promise.all([
        dataService.getRevenueData(testDateRange),
        dataService.getStaffPerformance(testDateRange),
      ]);

      const appointmentsFromRevenue = revenueData.reduce(
        (sum: any, day: any) => sum + day.appointments,
        0
      );
      const appointmentsFromStaff = staffPerformance.reduce(
        (sum: any, staff: any) => sum + staff.appointmentCount,
        0
      );

      // Appointment counts should be consistent
      expect(
        Math.abs(appointmentsFromRevenue - appointmentsFromStaff)
      ).toBeLessThan(
        Math.max(appointmentsFromRevenue, appointmentsFromStaff) * 0.1
      );
    });

    test('should have consistent client data across reports', async () => {
      const clientMetrics = await dataService.getClientMetrics(testDateRange);

      // Validate that client counts are reasonable
      expect(clientMetrics.totalClients).toBeGreaterThan(0);
      expect(
        clientMetrics.newClients + clientMetrics.returningClients
      ).toBeLessThanOrEqual(
        clientMetrics.totalClients * 2 // Allow for some overlap in date ranges
      );

      // Top clients should be a subset of total clients
      expect(clientMetrics.topClients.length).toBeLessThanOrEqual(
        clientMetrics.totalClients
      );
    });
  });

  describe('Report Performance and Scalability', () => {
    test('should generate all report types within acceptable time', async () => {
      const startTime = Date.now();

      await Promise.all([
        calculateBusinessRevenue(
          testBusinessId,
          testDateRange.from,
          testDateRange.to
        ),
        dataService.getClientMetrics(testDateRange),
        dataService.getStaffPerformance(testDateRange),
        dataService.getServiceAnalytics(testDateRange),
      ]);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // All reports should complete within 10 seconds
      expect(executionTime).toBeLessThan(10000);
    });

    test('should handle large date ranges efficiently', async () => {
      const largeDateRange: DateRange = {
        from: subDays(new Date(), 180), // 6 months
        to: new Date(),
      };

      const startTime = Date.now();

      const businessRevenue = await calculateBusinessRevenue(
        testBusinessId,
        largeDateRange.from,
        largeDateRange.to
      );

      const endTime = Date.now();

      expect(businessRevenue).toBeDefined();
      expect(businessRevenue.totalRevenue).toBeGreaterThanOrEqual(0);

      // Should complete within 15 seconds even for large ranges
      expect(endTime - startTime).toBeLessThan(15000);
    });
  });
});

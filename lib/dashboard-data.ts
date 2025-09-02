import { prisma } from '@/lib/prisma';
import {
  AppointmentSummary,
  ClientMetrics,
  DateRange,
  RevenueData,
  RevenueMetrics,
  ServiceAnalytics,
  StaffPerformance,
  TopClient,
  WidgetFilters,
} from '@/types/dashboard';
import { endOfDay, format, startOfDay, subDays } from 'date-fns';

export class DashboardDataService {
  private businessId: string;

  constructor(businessId: string) {
    this.businessId = businessId;
  }

  // Revenue Analytics
  async getRevenueData(
    dateRange: DateRange,
    filters?: WidgetFilters
  ): Promise<RevenueData[]> {
    const appointments = await prisma.appointment.findMany({
      where: {
        businessId: this.businessId,
        startTime: {
          gte: startOfDay(dateRange.from),
          lte: endOfDay(dateRange.to),
        },
        status: 'COMPLETED',
        ...(filters?.staffIds && { staffId: { in: filters.staffIds } }),
      },
      include: {
        services: {
          include: {
            service: true,
          },
        },
        staff: {
          include: {
            user: true,
          },
        },
        transactions: {
          where: {
            status: 'COMPLETED',
          },
        },
      },
    });

    // Group by date and calculate metrics
    const revenueByDate = new Map<
      string,
      {
        revenue: number;
        appointments: number;
        commissionEarnings: number;
        chairRentalRevenue: number;
        businessRetention: number;
      }
    >();

    for (const appointment of appointments) {
      const dateKey = format(appointment.startTime, 'yyyy-MM-dd');
      const current = revenueByDate.get(dateKey) || {
        revenue: 0,
        appointments: 0,
        commissionEarnings: 0,
        chairRentalRevenue: 0,
        businessRetention: 0,
      };

      // Calculate revenue from appointment services
      const revenue = appointment.services.reduce(
        (sum, service) => sum + Number(service.price),
        0
      );

      current.revenue += revenue;
      current.appointments += 1;

      // Calculate employment-specific metrics based on staff employment type
      // For now, use simplified calculation based on staff employment type
      if (appointment.staff.employmentType === 'COMMISSION') {
        // Assume 30% commission rate for demo
        const commissionAmount = revenue * 0.3;
        current.commissionEarnings += commissionAmount;
        current.businessRetention += revenue - commissionAmount;
      } else if (appointment.staff.employmentType === 'CHAIR_RENTAL') {
        // Assume $50 daily rental for demo
        current.chairRentalRevenue += 50;
        current.businessRetention += revenue;
      } else {
        // HYBRID type
        const commissionAmount = revenue * 0.2;
        current.commissionEarnings += commissionAmount;
        current.chairRentalRevenue += 30;
        current.businessRetention += revenue - commissionAmount;
      }

      revenueByDate.set(dateKey, current);
    }

    // Convert to array and calculate averages
    return Array.from(revenueByDate.entries()).map(([date, data]) => ({
      date,
      revenue: data.revenue,
      appointments: data.appointments,
      averageTicket:
        data.appointments > 0 ? data.revenue / data.appointments : 0,
      commissionEarnings: data.commissionEarnings,
      chairRentalRevenue: data.chairRentalRevenue,
      businessRetention: data.businessRetention,
    }));
  }

  async getRevenueMetrics(
    dateRange: DateRange,
    filters?: WidgetFilters
  ): Promise<RevenueMetrics> {
    const currentPeriodData = await this.getRevenueData(dateRange, filters);

    // Calculate previous period for growth comparison
    const periodLength = dateRange.to.getTime() - dateRange.from.getTime();
    const previousPeriodStart = new Date(
      dateRange.from.getTime() - periodLength
    );
    const previousPeriodEnd = new Date(dateRange.to.getTime() - periodLength);

    const previousPeriodData = await this.getRevenueData(
      { from: previousPeriodStart, to: previousPeriodEnd },
      filters
    );

    const currentTotals = currentPeriodData.reduce(
      (acc, day) => ({
        revenue: acc.revenue + day.revenue,
        appointments: acc.appointments + day.appointments,
      }),
      { revenue: 0, appointments: 0 }
    );

    const previousTotals = previousPeriodData.reduce(
      (acc, day) => ({
        revenue: acc.revenue + day.revenue,
        appointments: acc.appointments + day.appointments,
      }),
      { revenue: 0, appointments: 0 }
    );

    const averageTicket =
      currentTotals.appointments > 0
        ? currentTotals.revenue / currentTotals.appointments
        : 0;

    const previousAverageTicket =
      previousTotals.appointments > 0
        ? previousTotals.revenue / previousTotals.appointments
        : 0;

    return {
      totalRevenue: currentTotals.revenue,
      revenueGrowth:
        previousTotals.revenue > 0
          ? ((currentTotals.revenue - previousTotals.revenue) /
              previousTotals.revenue) *
            100
          : 0,
      averageTicket,
      ticketGrowth:
        previousAverageTicket > 0
          ? ((averageTicket - previousAverageTicket) / previousAverageTicket) *
            100
          : 0,
      appointmentCount: currentTotals.appointments,
      appointmentGrowth:
        previousTotals.appointments > 0
          ? ((currentTotals.appointments - previousTotals.appointments) /
              previousTotals.appointments) *
            100
          : 0,
      conversionRate: 85, // Placeholder - would need booking attempt data
    };
  }

  // Client Analytics
  async getClientMetrics(
    dateRange: DateRange,
    _filters?: WidgetFilters
  ): Promise<ClientMetrics> {
    const clients = await prisma.client.findMany({
      where: {
        businessId: this.businessId,
        createdAt: {
          lte: endOfDay(dateRange.to),
        },
      },
      include: {
        appointments: {
          where: {
            startTime: {
              gte: startOfDay(dateRange.from),
              lte: endOfDay(dateRange.to),
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

    const newClients = clients.filter(
      client => client.createdAt >= startOfDay(dateRange.from)
    ).length;

    const returningClients = clients.filter(
      client => client._count.appointments > 1
    ).length;

    const totalSpentByClient = clients.map(client => {
      const totalSpent = client.appointments.reduce((sum, appointment) => {
        return (
          sum +
          appointment.services.reduce(
            (serviceSum, service) => serviceSum + Number(service.price),
            0
          )
        );
      }, 0);

      return {
        ...client,
        totalSpent,
        name: `${client.firstName} ${client.lastName}`,
      };
    });

    const topClients: TopClient[] = totalSpentByClient
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)
      .map(client => ({
        id: client.id,
        name: client.name,
        email: client.email || '',
        totalSpent: client.totalSpent,
        appointmentCount: client._count.appointments,
        lastVisit: client.appointments[0]?.startTime || client.createdAt,
      }));

    const averageLifetimeValue =
      totalSpentByClient.length > 0
        ? totalSpentByClient.reduce(
            (sum, client) => sum + client.totalSpent,
            0
          ) / totalSpentByClient.length
        : 0;

    return {
      totalClients: clients.length,
      newClients,
      returningClients,
      clientRetentionRate:
        clients.length > 0 ? (returningClients / clients.length) * 100 : 0,
      averageLifetimeValue,
      clientGrowthRate: 12.5, // Placeholder - would need historical data
      topClients,
    };
  }

  // Staff Performance
  async getStaffPerformance(
    dateRange: DateRange,
    filters?: WidgetFilters
  ): Promise<StaffPerformance[]> {
    const staff = await prisma.staff.findMany({
      where: {
        businessId: this.businessId,
        ...(filters?.staffIds && { id: { in: filters.staffIds } }),
      },
      include: {
        user: true,
        appointments: {
          where: {
            startTime: {
              gte: startOfDay(dateRange.from),
              lte: endOfDay(dateRange.to),
            },
            status: 'COMPLETED',
          },
          include: {
            services: true,
            transactions: {
              where: {
                status: 'COMPLETED',
              },
            },
          },
        },
      },
    });

    return staff.map(staffMember => {
      const appointments = staffMember.appointments;
      const totalRevenue = appointments.reduce((sum, appointment) => {
        return (
          sum +
          appointment.services.reduce(
            (serviceSum, service) => serviceSum + Number(service.price),
            0
          )
        );
      }, 0);

      const appointmentCount = appointments.length;
      const averageTicket =
        appointmentCount > 0 ? totalRevenue / appointmentCount : 0;

      // Calculate earnings based on employment type
      let commissionEarnings = 0;
      let chairRentalPaid = 0;

      if (staffMember.employmentType === 'COMMISSION') {
        commissionEarnings = totalRevenue * 0.3; // 30% commission rate
      } else if (staffMember.employmentType === 'CHAIR_RENTAL') {
        chairRentalPaid = appointmentCount * 50; // $50 per appointment
      } else {
        // HYBRID type
        commissionEarnings = totalRevenue * 0.2; // 20% commission rate
        chairRentalPaid = appointmentCount * 30; // $30 per appointment
      }

      return {
        staffId: staffMember.id,
        name: staffMember.user.name || 'Unknown',
        employmentType: staffMember.employmentType,
        totalRevenue,
        appointmentCount,
        averageTicket,
        commissionEarnings,
        chairRentalPaid,
        utilizationRate: 75, // Placeholder - would need availability data
        clientSatisfaction: 4.8, // Placeholder - would need review data
      };
    });
  }

  // Service Analytics
  async getServiceAnalytics(
    dateRange: DateRange,
    filters?: WidgetFilters
  ): Promise<ServiceAnalytics[]> {
    const services = await prisma.service.findMany({
      where: {
        businessId: this.businessId,
        isActive: true,
        ...(filters?.serviceIds && { id: { in: filters.serviceIds } }),
      },
      include: {
        appointments: {
          where: {
            appointment: {
              startTime: {
                gte: startOfDay(dateRange.from),
                lte: endOfDay(dateRange.to),
              },
              status: 'COMPLETED',
            },
          },
        },
      },
    });

    const serviceStats = services.map(service => {
      const appointments = service.appointments;
      const bookingCount = appointments.length;
      const revenue = appointments.reduce(
        (sum, apt) => sum + Number(apt.price),
        0
      );
      const averagePrice =
        bookingCount > 0 ? revenue / bookingCount : Number(service.price);

      return {
        serviceId: service.id,
        name: service.name,
        bookingCount,
        revenue,
        averagePrice,
        popularityRank: 0, // Will be calculated after sorting
        profitMargin: 65, // Placeholder - would need cost data
        duration: service.duration,
      };
    });

    // Sort by booking count and assign popularity ranks
    serviceStats.sort((a, b) => b.bookingCount - a.bookingCount);
    serviceStats.forEach((service, index) => {
      service.popularityRank = index + 1;
    });

    return serviceStats;
  }

  // Recent Appointments
  async getRecentAppointments(
    limit: number = 10,
    filters?: WidgetFilters
  ): Promise<AppointmentSummary[]> {
    const appointments = await prisma.appointment.findMany({
      where: {
        businessId: this.businessId,
        ...(filters?.staffIds && { staffId: { in: filters.staffIds } }),
        ...(filters?.clientIds && { clientId: { in: filters.clientIds } }),
      },
      include: {
        client: true,
        services: {
          include: {
            service: true,
          },
        },
        staff: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        startTime: 'desc',
      },
      take: limit,
    });

    return appointments.map(appointment => {
      const totalAmount = appointment.services.reduce(
        (sum, service) => sum + Number(service.price),
        0
      );

      const serviceName = appointment.services
        .map(s => s.service.name)
        .join(', ');

      const clientName = appointment.client
        ? `${appointment.client.firstName} ${appointment.client.lastName}`
        : appointment.clientName || 'Walk-in';

      return {
        id: appointment.id,
        clientName,
        serviceName,
        staffName: appointment.staff.user.name || 'Unknown',
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status: appointment.status,
        totalAmount,
        notes: appointment.notes || undefined,
      };
    });
  }

  // Utility method to get default date range (last 30 days)
  static getDefaultDateRange(): DateRange {
    const to = new Date();
    const from = subDays(to, 30);
    return { from, to };
  }
}

import { prisma } from '@/lib/prisma';
import { AppointmentStatus } from '@prisma/client';

export interface AppointmentAnalytics {
  businessId: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  volume: {
    total: number;
    scheduled: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    noShow: number;
    successRate: number;
    growthRate?: number;
  };
  revenue: {
    total: number;
    averageBookingValue: number;
    projectedMonthly: number;
    growthRate?: number;
  };
  staffUtilization: StaffUtilizationMetrics[];
  servicePopularity: ServicePopularityMetrics[];
  peakHours: PeakHourMetrics[];
  clientRetention: {
    newClients: number;
    returningClients: number;
    retentionRate: number;
  };
  trends: {
    dailyVolume: DailyVolumeMetric[];
    weeklyComparison: WeeklyComparisonMetric[];
  };
}

export interface StaffUtilizationMetrics {
  staffId: string;
  staffName: string;
  totalAppointments: number;
  completedAppointments: number;
  totalRevenue: number;
  utilizationRate: number;
  averageServiceTime: number;
  efficiency: number;
}

export interface ServicePopularityMetrics {
  serviceId: string;
  serviceName: string;
  bookingCount: number;
  revenue: number;
  averagePrice: number;
  popularityRank: number;
  growthRate?: number;
}

export interface PeakHourMetrics {
  hour: number;
  appointmentCount: number;
  revenue: number;
  utilizationRate: number;
}

export interface DailyVolumeMetric {
  date: Date;
  appointments: number;
  revenue: number;
  successRate: number;
}

export interface WeeklyComparisonMetric {
  weekStart: Date;
  appointments: number;
  revenue: number;
  growthRate: number;
}

export class AppointmentAnalyticsService {
  /**
   * Get comprehensive appointment analytics for a business
   */
  async getAppointmentAnalytics(
    businessId: string,
    startDate: Date,
    endDate: Date,
    compareWithPrevious: boolean = true
  ): Promise<AppointmentAnalytics> {
    const [
      volumeMetrics,
      revenueMetrics,
      staffUtilization,
      servicePopularity,
      peakHours,
      clientRetention,
      trends,
    ] = await Promise.all([
      this.getVolumeMetrics(
        businessId,
        startDate,
        endDate,
        compareWithPrevious
      ),
      this.getRevenueMetrics(
        businessId,
        startDate,
        endDate,
        compareWithPrevious
      ),
      this.getStaffUtilizationMetrics(businessId, startDate, endDate),
      this.getServicePopularityMetrics(businessId, startDate, endDate),
      this.getPeakHourMetrics(businessId, startDate, endDate),
      this.getClientRetentionMetrics(businessId, startDate, endDate),
      this.getTrendMetrics(businessId, startDate, endDate),
    ]);

    return {
      businessId,
      period: { startDate, endDate },
      volume: volumeMetrics,
      revenue: revenueMetrics,
      staffUtilization,
      servicePopularity,
      peakHours,
      clientRetention,
      trends,
    };
  }

  /**
   * Get appointment volume metrics
   */
  private async getVolumeMetrics(
    businessId: string,
    startDate: Date,
    endDate: Date,
    compareWithPrevious: boolean
  ): Promise<AppointmentAnalytics['volume']> {
    const appointments = await prisma.appointment.findMany({
      where: {
        businessId,
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        status: true,
        createdAt: true,
      },
    });

    const statusCounts = appointments.reduce(
      (acc, appointment) => {
        acc[appointment.status] = (acc[appointment.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const total = appointments.length;
    const completed = statusCounts.COMPLETED || 0;
    const successRate = total > 0 ? (completed / total) * 100 : 0;

    let growthRate: number | undefined;
    if (compareWithPrevious) {
      const periodLength = endDate.getTime() - startDate.getTime();
      const previousStartDate = new Date(startDate.getTime() - periodLength);
      const previousEndDate = new Date(startDate.getTime());

      const previousAppointments = await prisma.appointment.count({
        where: {
          businessId,
          startTime: {
            gte: previousStartDate,
            lte: previousEndDate,
          },
        },
      });

      growthRate =
        previousAppointments > 0
          ? ((total - previousAppointments) / previousAppointments) * 100
          : 0;
    }

    return {
      total,
      scheduled: statusCounts.SCHEDULED || 0,
      confirmed: statusCounts.CONFIRMED || 0,
      completed,
      cancelled: statusCounts.CANCELLED || 0,
      noShow: statusCounts.NO_SHOW || 0,
      successRate,
      growthRate,
    };
  }

  /**
   * Get revenue metrics
   */
  private async getRevenueMetrics(
    businessId: string,
    startDate: Date,
    endDate: Date,
    compareWithPrevious: boolean
  ): Promise<AppointmentAnalytics['revenue']> {
    const appointments = await prisma.appointment.findMany({
      where: {
        businessId,
        startTime: {
          gte: startDate,
          lte: endDate,
        },
        status: AppointmentStatus.COMPLETED,
      },
      select: {
        totalPrice: true,
      },
    });

    const total = appointments.reduce(
      (sum, appointment) => sum + Number(appointment.totalPrice),
      0
    );

    const averageBookingValue =
      appointments.length > 0 ? total / appointments.length : 0;

    // Project monthly revenue based on current period
    const periodDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const projectedMonthly = periodDays > 0 ? (total / periodDays) * 30 : 0;

    let growthRate: number | undefined;
    if (compareWithPrevious) {
      const periodLength = endDate.getTime() - startDate.getTime();
      const previousStartDate = new Date(startDate.getTime() - periodLength);
      const previousEndDate = new Date(startDate.getTime());

      const previousRevenue = await prisma.appointment.aggregate({
        where: {
          businessId,
          startTime: {
            gte: previousStartDate,
            lte: previousEndDate,
          },
          status: AppointmentStatus.COMPLETED,
        },
        _sum: {
          totalPrice: true,
        },
      });

      const previousTotal = Number(previousRevenue._sum.totalPrice) || 0;
      growthRate =
        previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : 0;
    }

    return {
      total,
      averageBookingValue,
      projectedMonthly,
      growthRate,
    };
  }

  /**
   * Get staff utilization metrics
   */
  private async getStaffUtilizationMetrics(
    businessId: string,
    startDate: Date,
    endDate: Date
  ): Promise<StaffUtilizationMetrics[]> {
    const staffAppointments = await prisma.appointment.findMany({
      where: {
        businessId,
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        staffId: true,
        status: true,
        totalPrice: true,
        totalDuration: true,
        staff: {
          select: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    const staffMetrics = staffAppointments.reduce(
      (acc, appointment) => {
        const staffId = appointment.staffId;
        if (!acc[staffId]) {
          acc[staffId] = {
            staffId,
            staffName: appointment.staff.user?.name || 'Unknown',
            totalAppointments: 0,
            completedAppointments: 0,
            totalRevenue: 0,
            totalDuration: 0,
          };
        }

        acc[staffId].totalAppointments++;
        if (appointment.status === AppointmentStatus.COMPLETED) {
          acc[staffId].completedAppointments++;
          acc[staffId].totalRevenue += Number(appointment.totalPrice);
        }
        acc[staffId].totalDuration += appointment.totalDuration || 0;

        return acc;
      },
      {} as Record<string, any>
    );

    return Object.values(staffMetrics).map((staff: any) => {
      const utilizationRate =
        staff.totalAppointments > 0
          ? (staff.completedAppointments / staff.totalAppointments) * 100
          : 0;

      const averageServiceTime =
        staff.completedAppointments > 0
          ? staff.totalDuration / staff.completedAppointments
          : 0;

      // Calculate efficiency based on revenue per hour
      const totalHours = staff.totalDuration / 60;
      const efficiency = totalHours > 0 ? staff.totalRevenue / totalHours : 0;

      return {
        staffId: staff.staffId,
        staffName: staff.staffName,
        totalAppointments: staff.totalAppointments,
        completedAppointments: staff.completedAppointments,
        totalRevenue: staff.totalRevenue,
        utilizationRate,
        averageServiceTime,
        efficiency,
      };
    });
  }

  /**
   * Get service popularity metrics
   */
  private async getServicePopularityMetrics(
    businessId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ServicePopularityMetrics[]> {
    const serviceAppointments = await prisma.appointmentService.findMany({
      where: {
        appointment: {
          businessId,
          startTime: {
            gte: startDate,
            lte: endDate,
          },
          status: AppointmentStatus.COMPLETED,
        },
      },
      select: {
        serviceId: true,
        serviceName: true,
        price: true,
        service: {
          select: {
            name: true,
          },
        },
      },
    });

    const serviceMetrics = serviceAppointments.reduce(
      (acc, appointmentService) => {
        const serviceId = appointmentService.serviceId;
        if (!acc[serviceId]) {
          acc[serviceId] = {
            serviceId,
            serviceName: appointmentService.service.name,
            bookingCount: 0,
            revenue: 0,
            totalPrice: 0,
          };
        }

        acc[serviceId].bookingCount++;
        acc[serviceId].revenue += Number(appointmentService.price);
        acc[serviceId].totalPrice += Number(appointmentService.price);

        return acc;
      },
      {} as Record<string, any>
    );

    const services = Object.values(serviceMetrics).map((service: any) => ({
      serviceId: service.serviceId,
      serviceName: service.serviceName,
      bookingCount: service.bookingCount,
      revenue: service.revenue,
      averagePrice:
        service.bookingCount > 0 ? service.revenue / service.bookingCount : 0,
      popularityRank: 0, // Will be set after sorting
    }));

    // Sort by booking count and assign ranks
    services.sort((a, b) => b.bookingCount - a.bookingCount);
    services.forEach((service, index) => {
      service.popularityRank = index + 1;
    });

    return services;
  }

  /**
   * Get peak hour metrics
   */
  private async getPeakHourMetrics(
    businessId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PeakHourMetrics[]> {
    const appointments = await prisma.appointment.findMany({
      where: {
        businessId,
        startTime: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: [AppointmentStatus.COMPLETED, AppointmentStatus.CONFIRMED],
        },
      },
      select: {
        startTime: true,
        totalPrice: true,
        status: true,
      },
    });

    const hourMetrics = appointments.reduce(
      (acc, appointment) => {
        const hour = appointment.startTime.getHours();
        if (!acc[hour]) {
          acc[hour] = {
            hour,
            appointmentCount: 0,
            revenue: 0,
            completedCount: 0,
          };
        }

        acc[hour].appointmentCount++;
        if (appointment.status === AppointmentStatus.COMPLETED) {
          acc[hour].revenue += Number(appointment.totalPrice);
          acc[hour].completedCount++;
        }

        return acc;
      },
      {} as Record<number, any>
    );

    return Object.values(hourMetrics).map((hourData: any) => ({
      hour: hourData.hour,
      appointmentCount: hourData.appointmentCount,
      revenue: hourData.revenue,
      utilizationRate:
        hourData.appointmentCount > 0
          ? (hourData.completedCount / hourData.appointmentCount) * 100
          : 0,
    }));
  }

  /**
   * Get client retention metrics
   */
  private async getClientRetentionMetrics(
    businessId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AppointmentAnalytics['clientRetention']> {
    const appointments = await prisma.appointment.findMany({
      where: {
        businessId,
        startTime: {
          gte: startDate,
          lte: endDate,
        },
        clientId: {
          not: null,
        },
      },
      select: {
        clientId: true,
        client: {
          select: {
            createdAt: true,
          },
        },
      },
    });

    const uniqueClients = new Set(appointments.map(a => a.clientId));
    const newClients = appointments.filter(
      appointment =>
        appointment.client && appointment.client.createdAt >= startDate
    ).length;

    const returningClients = uniqueClients.size - newClients;
    const retentionRate =
      uniqueClients.size > 0
        ? (returningClients / uniqueClients.size) * 100
        : 0;

    return {
      newClients,
      returningClients,
      retentionRate,
    };
  }

  /**
   * Get trend metrics
   */
  private async getTrendMetrics(
    businessId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AppointmentAnalytics['trends']> {
    const appointments = await prisma.appointment.findMany({
      where: {
        businessId,
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        startTime: true,
        totalPrice: true,
        status: true,
      },
    });

    // Daily volume metrics
    const dailyMetrics = appointments.reduce(
      (acc, appointment) => {
        const dateKey = appointment.startTime.toISOString().split('T')[0];
        if (!acc[dateKey]) {
          acc[dateKey] = {
            date: new Date(dateKey),
            appointments: 0,
            revenue: 0,
            completed: 0,
          };
        }

        acc[dateKey].appointments++;
        if (appointment.status === AppointmentStatus.COMPLETED) {
          acc[dateKey].revenue += Number(appointment.totalPrice);
          acc[dateKey].completed++;
        }

        return acc;
      },
      {} as Record<string, any>
    );

    const dailyVolume: DailyVolumeMetric[] = Object.values(dailyMetrics).map(
      (day: any) => ({
        date: day.date,
        appointments: day.appointments,
        revenue: day.revenue,
        successRate:
          day.appointments > 0 ? (day.completed / day.appointments) * 100 : 0,
      })
    );

    // Weekly comparison metrics (simplified)
    const weeklyComparison: WeeklyComparisonMetric[] = [];
    // TODO: Implement weekly comparison logic

    return {
      dailyVolume,
      weeklyComparison,
    };
  }

  /**
   * Get staff efficiency report
   */
  async getStaffEfficiencyReport(
    businessId: string,
    startDate: Date,
    endDate: Date
  ): Promise<
    {
      staffId: string;
      staffName: string;
      metrics: {
        appointmentsPerDay: number;
        revenuePerHour: number;
        clientSatisfactionScore?: number;
        punctualityRate: number;
        rebookingRate: number;
      };
    }[]
  > {
    const staffAppointments = await prisma.appointment.findMany({
      where: {
        businessId,
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        staffId: true,
        startTime: true,
        totalPrice: true,
        totalDuration: true,
        status: true,
        staff: {
          select: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    const staffMetrics = staffAppointments.reduce(
      (acc, appointment) => {
        const staffId = appointment.staffId;
        if (!acc[staffId]) {
          acc[staffId] = {
            staffId,
            staffName: appointment.staff.user?.name || 'Unknown',
            appointments: [],
            totalRevenue: 0,
            totalDuration: 0,
          };
        }

        acc[staffId].appointments.push(appointment);
        if (appointment.status === AppointmentStatus.COMPLETED) {
          acc[staffId].totalRevenue += Number(appointment.totalPrice);
          acc[staffId].totalDuration += appointment.totalDuration || 0;
        }

        return acc;
      },
      {} as Record<string, any>
    );

    const periodDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return Object.values(staffMetrics).map((staff: any) => {
      const completedAppointments = staff.appointments.filter(
        (a: any) => a.status === AppointmentStatus.COMPLETED
      );

      const appointmentsPerDay =
        periodDays > 0 ? staff.appointments.length / periodDays : 0;
      const totalHours = staff.totalDuration / 60;
      const revenuePerHour =
        totalHours > 0 ? staff.totalRevenue / totalHours : 0;

      // Calculate punctuality rate (simplified - assumes on-time if completed)
      const punctualityRate =
        staff.appointments.length > 0
          ? (completedAppointments.length / staff.appointments.length) * 100
          : 0;

      return {
        staffId: staff.staffId,
        staffName: staff.staffName,
        metrics: {
          appointmentsPerDay,
          revenuePerHour,
          punctualityRate,
          rebookingRate: 0, // TODO: Calculate based on repeat clients
        },
      };
    });
  }
}

export const appointmentAnalyticsService = new AppointmentAnalyticsService();

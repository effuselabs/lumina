import { prisma } from '@/lib/prisma';
import { AppointmentStatus } from '@prisma/client';

export interface BusinessMetrics {
  businessId: string;
  date: Date;
  appointmentVolume: number;
  successfulBookings: number;
  cancelledBookings: number;
  noShowBookings: number;
  totalRevenue: number;
  averageBookingValue: number;
  staffUtilization: Record<string, number>;
  popularServices: Record<string, number>;
  peakHours: Record<string, number>;
}

export interface AppointmentVolumeMetrics {
  total: number;
  scheduled: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  noShow: number;
  successRate: number;
}

export class BusinessMetricsTracker {
  /**
   * Track appointment creation
   */
  async trackAppointmentCreated(
    businessId: string,
    appointmentData: {
      totalPrice: number;
      serviceIds: string[];
      staffId: string;
      startTime: Date;
    }
  ): Promise<void> {
    try {
      await prisma.businessMetric.upsert({
        where: {
          businessId_date_type: {
            businessId,
            date: this.getDateKey(appointmentData.startTime),
            type: 'APPOINTMENT_CREATED',
          },
        },
        update: {
          value: { increment: 1 },
          metadata: {
            totalRevenue: { increment: appointmentData.totalPrice },
          },
        },
        create: {
          businessId,
          date: this.getDateKey(appointmentData.startTime),
          type: 'APPOINTMENT_CREATED',
          value: 1,
          metadata: {
            totalRevenue: appointmentData.totalPrice,
          },
        },
      });

      // Track service popularity
      for (const serviceId of appointmentData.serviceIds) {
        await this.trackServiceUsage(
          businessId,
          serviceId,
          appointmentData.startTime
        );
      }

      // Track staff utilization
      await this.trackStaffUtilization(
        businessId,
        appointmentData.staffId,
        appointmentData.startTime
      );

      // Track peak hours
      await this.trackPeakHour(businessId, appointmentData.startTime);
    } catch (error) {
      console.error('Failed to track appointment creation metrics:', error);
    }
  }

  /**
   * Track appointment status change
   */
  async trackAppointmentStatusChange(
    businessId: string,
    appointmentId: string,
    oldStatus: AppointmentStatus,
    newStatus: AppointmentStatus,
    appointmentDate: Date
  ): Promise<void> {
    try {
      const dateKey = this.getDateKey(appointmentDate);

      // Track status-specific metrics
      switch (newStatus) {
        case 'CONFIRMED':
          await this.incrementMetric(
            businessId,
            dateKey,
            'APPOINTMENT_CONFIRMED'
          );
          break;
        case 'COMPLETED':
          await this.incrementMetric(
            businessId,
            dateKey,
            'APPOINTMENT_COMPLETED'
          );
          break;
        case 'CANCELLED':
          await this.incrementMetric(
            businessId,
            dateKey,
            'APPOINTMENT_CANCELLED'
          );
          break;
        case 'NO_SHOW':
          await this.incrementMetric(
            businessId,
            dateKey,
            'APPOINTMENT_NO_SHOW'
          );
          break;
      }

      // Calculate success rate
      await this.updateSuccessRate(businessId, dateKey);
    } catch (error) {
      console.error('Failed to track appointment status change:', error);
    }
  }

  /**
   * Track service usage
   */
  private async trackServiceUsage(
    businessId: string,
    serviceId: string,
    date: Date
  ): Promise<void> {
    const dateKey = this.getDateKey(date);

    await prisma.businessMetric.upsert({
      where: {
        businessId_date_type: {
          businessId,
          date: dateKey,
          type: 'SERVICE_USAGE',
        },
      },
      update: {
        metadata: {
          services: {
            [serviceId]: { increment: 1 },
          },
        },
      },
      create: {
        businessId,
        date: dateKey,
        type: 'SERVICE_USAGE',
        value: 1,
        metadata: {
          services: {
            [serviceId]: 1,
          },
        },
      },
    });
  }

  /**
   * Track staff utilization
   */
  private async trackStaffUtilization(
    businessId: string,
    staffId: string,
    date: Date
  ): Promise<void> {
    const dateKey = this.getDateKey(date);

    await prisma.businessMetric.upsert({
      where: {
        businessId_date_type: {
          businessId,
          date: dateKey,
          type: 'STAFF_UTILIZATION',
        },
      },
      update: {
        metadata: {
          staff: {
            [staffId]: { increment: 1 },
          },
        },
      },
      create: {
        businessId,
        date: dateKey,
        type: 'STAFF_UTILIZATION',
        value: 1,
        metadata: {
          staff: {
            [staffId]: 1,
          },
        },
      },
    });
  }

  /**
   * Track peak hours
   */
  private async trackPeakHour(businessId: string, date: Date): Promise<void> {
    // Same reasoning as getDateKey: `getHours` is the server's clock, so a
    // 10:00 appointment counted as hour 4 from Chicago and hour 10 from a
    // UTC host, silently mixing two scales in one histogram. UTC is what
    // production has always written.
    const hour = date.getUTCHours();
    const dateKey = this.getDateKey(date);

    await prisma.businessMetric.upsert({
      where: {
        businessId_date_type: {
          businessId,
          date: dateKey,
          type: 'PEAK_HOURS',
        },
      },
      update: {
        metadata: {
          hours: {
            [hour]: { increment: 1 },
          },
        },
      },
      create: {
        businessId,
        date: dateKey,
        type: 'PEAK_HOURS',
        value: 1,
        metadata: {
          hours: {
            [hour]: 1,
          },
        },
      },
    });
  }

  /**
   * Increment a metric
   */
  private async incrementMetric(
    businessId: string,
    date: Date,
    type: string
  ): Promise<void> {
    await prisma.businessMetric.upsert({
      where: {
        businessId_date_type: {
          businessId,
          date,
          type,
        },
      },
      update: {
        value: { increment: 1 },
      },
      create: {
        businessId,
        date,
        type,
        value: 1,
      },
    });
  }

  /**
   * Update success rate calculation
   */
  private async updateSuccessRate(
    businessId: string,
    date: Date
  ): Promise<void> {
    const metrics = await prisma.businessMetric.findMany({
      where: {
        businessId,
        date,
        type: {
          in: [
            'APPOINTMENT_COMPLETED',
            'APPOINTMENT_CANCELLED',
            'APPOINTMENT_NO_SHOW',
          ],
        },
      },
    });

    const completed =
      metrics.find(m => m.type === 'APPOINTMENT_COMPLETED')?.value || 0;
    const cancelled =
      metrics.find(m => m.type === 'APPOINTMENT_CANCELLED')?.value || 0;
    const noShow =
      metrics.find(m => m.type === 'APPOINTMENT_NO_SHOW')?.value || 0;

    const total = completed + cancelled + noShow;
    const successRate = total > 0 ? (completed / total) * 100 : 0;

    await prisma.businessMetric.upsert({
      where: {
        businessId_date_type: {
          businessId,
          date,
          type: 'SUCCESS_RATE',
        },
      },
      update: {
        value: successRate,
      },
      create: {
        businessId,
        date,
        type: 'SUCCESS_RATE',
        value: successRate,
      },
    });
  }

  /**
   * Get appointment volume metrics
   */
  async getAppointmentVolumeMetrics(
    businessId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AppointmentVolumeMetrics> {
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
    const cancelled = statusCounts.CANCELLED || 0;
    const noShow = statusCounts.NO_SHOW || 0;

    const successRate = total > 0 ? (completed / total) * 100 : 0;

    return {
      total,
      scheduled: statusCounts.SCHEDULED || 0,
      confirmed: statusCounts.CONFIRMED || 0,
      completed,
      cancelled,
      noShow,
      successRate,
    };
  }

  /**
   * Get business metrics for date range
   */
  async getBusinessMetrics(
    businessId: string,
    startDate: Date,
    endDate: Date
  ): Promise<BusinessMetrics[]> {
    const metrics = await prisma.businessMetric.findMany({
      where: {
        businessId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Group metrics by date
    const metricsByDate = metrics.reduce(
      (acc, metric) => {
        const dateKey = metric.date.toISOString().split('T')[0];
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(metric);
        return acc;
      },
      {} as Record<string, any[]>
    );

    return Object.entries(metricsByDate).map(([dateStr, dayMetrics]) => {
      const date = new Date(dateStr);

      const appointmentVolume =
        dayMetrics.find(m => m.type === 'APPOINTMENT_CREATED')?.value || 0;
      const completed =
        dayMetrics.find(m => m.type === 'APPOINTMENT_COMPLETED')?.value || 0;
      const cancelled =
        dayMetrics.find(m => m.type === 'APPOINTMENT_CANCELLED')?.value || 0;
      const noShow =
        dayMetrics.find(m => m.type === 'APPOINTMENT_NO_SHOW')?.value || 0;

      const revenueMetric = dayMetrics.find(
        m => m.type === 'APPOINTMENT_CREATED'
      );
      const totalRevenue = revenueMetric?.metadata?.totalRevenue || 0;
      const averageBookingValue =
        appointmentVolume > 0 ? totalRevenue / appointmentVolume : 0;

      const staffUtilizationMetric = dayMetrics.find(
        m => m.type === 'STAFF_UTILIZATION'
      );
      const staffUtilization = staffUtilizationMetric?.metadata?.staff || {};

      const serviceUsageMetric = dayMetrics.find(
        m => m.type === 'SERVICE_USAGE'
      );
      const popularServices = serviceUsageMetric?.metadata?.services || {};

      const peakHoursMetric = dayMetrics.find(m => m.type === 'PEAK_HOURS');
      const peakHours = peakHoursMetric?.metadata?.hours || {};

      return {
        businessId,
        date,
        appointmentVolume,
        successfulBookings: completed,
        cancelledBookings: cancelled,
        noShowBookings: noShow,
        totalRevenue,
        averageBookingValue,
        staffUtilization,
        popularServices,
        peakHours,
      };
    });
  }

  /**
   * Get date key for metrics grouping.
   *
   * `new Date(y, m, d)` is midnight in whatever zone the process runs in, so
   * this bucketed metrics by the server's day and wrote a key of 06:00Z from
   * Chicago where a UTC host writes 00:00Z. Two hosts in different zones
   * therefore wrote two different rows for the same day, and neither could
   * find the other's — the upsert's unique key is (businessId, date, type).
   * Production runs in UTC, so every row already written uses UTC midnight;
   * pinning it there keeps them all reachable.
   *
   * Bucketing by the *business's* day, which is what a salon owner actually
   * means by "Tuesday's bookings", is a further step: it changes what the
   * numbers mean and needs a migration for existing rows. Recorded in
   * docs/PLAN.md rather than smuggled in here.
   */
  private getDateKey(date: Date): Date {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
    );
  }
}

export const businessMetricsTracker = new BusinessMetricsTracker();

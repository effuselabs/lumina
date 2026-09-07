import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { endOfDay, startOfDay, subDays } from 'date-fns';
import { NextRequest, NextResponse } from 'next/server';

export interface DashboardMetrics {
  revenue: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    yearToDate: number;
    growth: {
      daily: number;
      weekly: number;
      monthly: number;
    };
    trend: number[];
  };
  appointments: {
    today: number;
    thisWeek: number;
    upcoming: number;
    completionRate: number;
    trend: number[];
  };
  clients: {
    total: number;
    new: number;
    returning: number;
    retentionRate: number;
    trend: number[];
  };
  staff: {
    active: number;
    utilization: number;
    averageEarnings: number;
    trend: number[];
  };
}

async function verifyBusinessAccess(
  userId: string,
  businessId: string
): Promise<boolean> {
  const businessUser = await prisma.businessUser.findFirst({
    where: {
      userId,
      businessId,
    },
  });

  return !!businessUser;
}

async function calculateRevenue(
  businessId: string,
  startDate: Date,
  endDate: Date
) {
  // TODO: Implement actual revenue calculation from transactions
  // For now, return mock data based on appointments
  const appointments = await prisma.appointment.count({
    where: {
      businessId,
      startTime: {
        gte: startDate,
        lte: endDate,
      },
      status: 'COMPLETED',
    },
  });

  // Mock revenue calculation (average $75 per appointment)
  return appointments * 75;
}

async function calculateGrowth(
  current: number,
  previous: number
): Promise<number> {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

async function generateTrend(
  businessId: string,
  days: number
): Promise<number[]> {
  const trend: number[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(today, i);
    const startDate = startOfDay(date);
    const endDate = endOfDay(date);

    const appointments = await prisma.appointment.count({
      where: {
        businessId,
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    trend.push(appointments);
  }

  return trend;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID required' },
        { status: 400 }
      );
    }

    // Verify user has access to business
    const hasAccess = await verifyBusinessAccess(session.user.id, businessId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const now = new Date();
    const today = startOfDay(now);
    const yesterday = startOfDay(subDays(now, 1));
    const weekStart = startOfDay(subDays(now, 7));
    const lastWeekStart = startOfDay(subDays(now, 14));
    const monthStart = startOfDay(subDays(now, 30));
    const lastMonthStart = startOfDay(subDays(now, 60));
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // Revenue calculations
    const revenueToday = await calculateRevenue(businessId, today, now);
    const revenueYesterday = await calculateRevenue(
      businessId,
      yesterday,
      today
    );
    const revenueThisWeek = await calculateRevenue(businessId, weekStart, now);
    const revenueLastWeek = await calculateRevenue(
      businessId,
      lastWeekStart,
      weekStart
    );
    const revenueThisMonth = await calculateRevenue(
      businessId,
      monthStart,
      now
    );
    const revenueLastMonth = await calculateRevenue(
      businessId,
      lastMonthStart,
      monthStart
    );
    const revenueYearToDate = await calculateRevenue(
      businessId,
      yearStart,
      now
    );
    const revenueTrend = await generateTrend(businessId, 7);

    // Appointment calculations
    const appointmentsToday = await prisma.appointment.count({
      where: {
        businessId,
        startTime: {
          gte: today,
          lte: now,
        },
      },
    });

    const appointmentsThisWeek = await prisma.appointment.count({
      where: {
        businessId,
        startTime: {
          gte: weekStart,
          lte: now,
        },
      },
    });

    const upcomingAppointments = await prisma.appointment.count({
      where: {
        businessId,
        startTime: {
          gt: now,
        },
        status: 'SCHEDULED',
      },
    });

    const completedAppointments = await prisma.appointment.count({
      where: {
        businessId,
        status: 'COMPLETED',
        startTime: {
          gte: monthStart,
          lte: now,
        },
      },
    });

    const totalAppointments = await prisma.appointment.count({
      where: {
        businessId,
        startTime: {
          gte: monthStart,
          lte: now,
        },
      },
    });

    const completionRate =
      totalAppointments > 0
        ? Math.round((completedAppointments / totalAppointments) * 100)
        : 0;
    const appointmentsTrend = await generateTrend(businessId, 7);

    // Client calculations
    const totalClients = await prisma.client.count({
      where: { businessId },
    });

    const newClients = await prisma.client.count({
      where: {
        businessId,
        createdAt: {
          gte: monthStart,
        },
      },
    });

    const returningClients = await prisma.client.count({
      where: {
        businessId,
        appointments: {
          some: {
            startTime: {
              gte: monthStart,
              lte: now,
            },
          },
        },
      },
    });

    const retentionRate =
      totalClients > 0
        ? Math.round((returningClients / totalClients) * 100)
        : 0;

    // Generate client trend (new clients per day)
    const clientsTrend: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(now, i);
      const startDate = startOfDay(date);
      const endDate = endOfDay(date);

      const newClientsOnDay = await prisma.client.count({
        where: {
          businessId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      clientsTrend.push(newClientsOnDay);
    }

    // Staff calculations
    const activeStaff = await prisma.staff.count({
      where: {
        businessId,
        isActive: true,
      },
    });

    // Mock staff utilization and earnings (TODO: implement real calculations)
    const staffUtilization = 85; // Mock 85% utilization
    const averageEarnings = 2500; // Mock $2500 average monthly earnings
    const staffTrend = [2, 3, 2, 4, 3, 2, 3]; // Mock trend data

    const metrics: DashboardMetrics = {
      revenue: {
        today: revenueToday,
        thisWeek: revenueThisWeek,
        thisMonth: revenueThisMonth,
        yearToDate: revenueYearToDate,
        growth: {
          daily: await calculateGrowth(revenueToday, revenueYesterday),
          weekly: await calculateGrowth(revenueThisWeek, revenueLastWeek),
          monthly: await calculateGrowth(revenueThisMonth, revenueLastMonth),
        },
        trend: revenueTrend.map(appointments => appointments * 75), // Convert to revenue
      },
      appointments: {
        today: appointmentsToday,
        thisWeek: appointmentsThisWeek,
        upcoming: upcomingAppointments,
        completionRate,
        trend: appointmentsTrend,
      },
      clients: {
        total: totalClients,
        new: newClients,
        returning: returningClients,
        retentionRate,
        trend: clientsTrend,
      },
      staff: {
        active: activeStaff,
        utilization: staffUtilization,
        averageEarnings,
        trend: staffTrend,
      },
    };

    return NextResponse.json({ metrics });
  } catch (error) {
    console.error('Dashboard metrics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard metrics' },
      { status: 500 }
    );
  }
}

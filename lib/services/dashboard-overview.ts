import { calculateBusinessRevenue } from '@/lib/financial/transaction-service';
import { prisma } from '@/lib/prisma';
import { statsWindows } from '@/lib/services/appointment-stats';
import type { AppointmentStatus } from '@prisma/client';
import { DateTime } from 'luxon';

/**
 * The figures on the dashboard overview, read from the business's records.
 *
 * The overview used to fetch `/api/dashboard/metrics`, which counted "today"
 * on the server's calendar and only up to the current moment — usually 0, at
 * which point the page fell back to the all-time appointment count and told
 * the owner they had 502 appointments today. Utilisation was a hardcoded 85%,
 * and revenue was completed appointments times an assumed $75 (#115).
 */
export interface DashboardOverview {
  /** Payments less refunds, from completed transactions. */
  revenue: { last30Days: number; previous30Days: number };
  /** The salon's calendar day; cancelled appointments are not counted. */
  appointments: { today: number; stillToCome: number };
  clients: { total: number; visitedLast30Days: number };
  staff: { active: number };
}

export interface ScheduleEntry {
  id: string;
  clientName: string;
  services: string;
  staffName: string;
  /** Start time on the salon's clock, e.g. "2:30 PM". */
  time: string;
  durationMinutes: number;
  status: AppointmentStatus;
}

const BOOKED = { not: 'CANCELLED' as const };

export async function dashboardOverview(
  businessId: string,
  timezone: string,
  now: Date = new Date()
): Promise<DashboardOverview> {
  const { today, last30Days } = statsWindows(now, timezone);
  const previous30Days = {
    start: DateTime.fromJSDate(last30Days.start).minus({ days: 30 }).toJSDate(),
    end: last30Days.start,
  };

  const [
    revenueNow,
    revenueBefore,
    appointmentsToday,
    stillToCome,
    totalClients,
    visitedClients,
    activeStaff,
  ] = await Promise.all([
    calculateBusinessRevenue(businessId, last30Days.start, last30Days.end),
    calculateBusinessRevenue(
      businessId,
      previous30Days.start,
      previous30Days.end
    ),
    prisma.appointment.count({
      where: {
        businessId,
        status: BOOKED,
        startTime: { gte: today.start, lt: today.end },
      },
    }),
    prisma.appointment.count({
      where: {
        businessId,
        status: BOOKED,
        startTime: { gte: now, lt: today.end },
      },
    }),
    prisma.client.count({ where: { businessId } }),
    prisma.client.count({
      where: {
        businessId,
        appointments: {
          some: {
            status: BOOKED,
            startTime: { gte: last30Days.start, lt: last30Days.end },
          },
        },
      },
    }),
    prisma.staff.count({ where: { businessId, isActive: true } }),
  ]);

  return {
    revenue: {
      last30Days: revenueNow.netRevenue,
      previous30Days: revenueBefore.netRevenue,
    },
    appointments: { today: appointmentsToday, stillToCome },
    clients: { total: totalClients, visitedLast30Days: visitedClients },
    staff: { active: activeStaff },
  };
}

/** Today's appointments on the salon's clock, earliest first. */
export async function todaysSchedule(
  businessId: string,
  timezone: string,
  now: Date = new Date()
): Promise<ScheduleEntry[]> {
  const { today } = statsWindows(now, timezone);
  const appointments = await prisma.appointment.findMany({
    where: {
      businessId,
      status: BOOKED,
      startTime: { gte: today.start, lt: today.end },
    },
    orderBy: { startTime: 'asc' },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      status: true,
      clientName: true,
      client: { select: { firstName: true, lastName: true } },
      staff: {
        select: { displayName: true, user: { select: { name: true } } },
      },
      services: { select: { serviceName: true } },
    },
  });

  return appointments.map(appointment => ({
    id: appointment.id,
    clientName: appointment.client
      ? `${appointment.client.firstName} ${appointment.client.lastName}`
      : appointment.clientName || 'Walk-in',
    services: appointment.services.map(s => s.serviceName).join(', '),
    staffName:
      appointment.staff.displayName || appointment.staff.user.name || '',
    time: DateTime.fromJSDate(appointment.startTime)
      .setZone(timezone)
      .toFormat('h:mm a'),
    durationMinutes: Math.round(
      (appointment.endTime.getTime() - appointment.startTime.getTime()) / 60000
    ),
    status: appointment.status,
  }));
}

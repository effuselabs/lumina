import { prisma } from '@/lib/prisma';
import { DateTime } from 'luxon';

/** An instant range, [start, end). */
interface Window {
  start: Date;
  end: Date;
}

/**
 * The windows the appointments page summarises, in the salon's own calendar:
 * today, this week (Sunday to Saturday, as the calendar lays weeks out), and
 * the last 30 days for the no-show rate.
 */
export function statsWindows(
  now: Date,
  timezone: string
): { today: Window; week: Window; last30Days: Window } {
  const local = DateTime.fromJSDate(now).setZone(timezone);
  const startOfDay = local.startOf('day');
  // Luxon weeks start on Monday; step back to the Sunday on or before today.
  const startOfWeek = startOfDay.minus({ days: startOfDay.weekday % 7 });

  return {
    today: {
      start: startOfDay.toJSDate(),
      end: startOfDay.plus({ days: 1 }).toJSDate(),
    },
    week: {
      start: startOfWeek.toJSDate(),
      end: startOfWeek.plus({ weeks: 1 }).toJSDate(),
    },
    last30Days: { start: local.minus({ days: 30 }).toJSDate(), end: now },
  };
}

export interface AppointmentStats {
  today: number;
  thisWeek: number;
  /** Share of finished appointments that were no-shows; null when none finished. */
  noShowRate: number | null;
}

/**
 * The appointments page's summary, read from the business's appointments.
 *
 * It showed 8, 42 and 3.2% to every salon, with invented trends (#102).
 * Cancelled appointments are not counted as booked; the no-show rate is
 * no-shows over appointments that reached an outcome — completed or no-show
 * — in the last 30 days.
 */
export async function appointmentStats(
  businessId: string,
  timezone: string,
  now: Date = new Date()
): Promise<AppointmentStats> {
  const { today, week, last30Days } = statsWindows(now, timezone);
  const booked = { businessId, status: { not: 'CANCELLED' as const } };

  const [todayCount, weekCount, outcomes] = await Promise.all([
    prisma.appointment.count({
      where: { ...booked, startTime: { gte: today.start, lt: today.end } },
    }),
    prisma.appointment.count({
      where: { ...booked, startTime: { gte: week.start, lt: week.end } },
    }),
    prisma.appointment.groupBy({
      by: ['status'],
      where: {
        businessId,
        status: { in: ['COMPLETED', 'NO_SHOW'] },
        startTime: { gte: last30Days.start, lt: last30Days.end },
      },
      _count: { _all: true },
    }),
  ]);

  const countOf = (status: string) =>
    outcomes.find(row => row.status === status)?._count._all ?? 0;
  const finished = countOf('COMPLETED') + countOf('NO_SHOW');

  return {
    today: todayCount,
    thisWeek: weekCount,
    noShowRate: finished === 0 ? null : countOf('NO_SHOW') / finished,
  };
}

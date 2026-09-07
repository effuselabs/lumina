/**
 * Time in a business's own zone.
 *
 * A salon's hours are written as `"09:00"` and mean nine in the morning where
 * the salon is. Turning that into an instant with `Date.prototype.setHours`,
 * or reading an instant back with `getHours`/`getUTCHours`, uses whatever zone
 * the Node process happens to run in — so the same code gave different answers
 * on a developer's laptop, on a UTC container, and in CI, and the disagreement
 * was invisible wherever the two happened to match.
 *
 * These are the only conversions between a salon's wall clock and an instant.
 * Every service that reasons about business hours or staff availability uses
 * them, so the availability calculator and the conflict engine that re-checks
 * its output cannot drift apart again — which they did, one computing correct
 * slots and the other rejecting every one of them.
 */

import { DateTime } from 'luxon';

import { prisma } from '@/lib/prisma';
import { CONFIG_TTL_MS, remember } from './schedule-cache';
import { TimeZoneHandler } from './timezone-handler';

/** Used when a business has no timezone recorded. Never the server's zone. */
export const FALLBACK_TIMEZONE = 'UTC';

/**
 * The calendar date a query is asking about, as `yyyy-MM-dd`.
 *
 * The API builds this Date with `new Date('2026-09-14')`, which is midnight
 * UTC — a label for a day, not an instant in anyone's day. Reading it back
 * with `getFullYear`/`getMonth`/`getDate` returns the previous day anywhere
 * west of Greenwich, which is the whole of "asking for Wednesday returned
 * Tuesday's slots". Read the label the way it was written: in UTC.
 */
export function toDateKey(date: Date): string {
  return DateTime.fromJSDate(date, { zone: 'utc' }).toFormat('yyyy-MM-dd');
}

/**
 * The salon's calendar date for a real instant.
 *
 * Distinct from `toDateKey`, and the distinction matters: an appointment at
 * 2026-09-15T00:00:00Z falls on Monday the 14th for a Los Angeles salon. Use
 * this for a moment in time, and `toDateKey` for a requested day.
 */
export function dateKeyIn(instant: Date, timezone: string): string {
  return DateTime.fromJSDate(instant).setZone(timezone).toFormat('yyyy-MM-dd');
}

/** `HH:MM` on a calendar date in the salon's zone, as an absolute instant. */
export function businessTimeToInstant(
  dateKey: string,
  time: string,
  timezone: string
): Date {
  return TimeZoneHandler.localToUTC(time, dateKey, timezone).toJSDate();
}

/** The instants at which the salon's calendar day opens and closes out. */
export function businessDayBounds(
  dateKey: string,
  timezone: string
): { startOfDay: Date; endOfDay: Date } {
  const start = DateTime.fromISO(dateKey, { zone: timezone }).startOf('day');

  return {
    startOfDay: start.toUTC().toJSDate(),
    endOfDay: start.endOf('day').toUTC().toJSDate(),
  };
}

/** JavaScript's day numbering (0 = Sunday) for a `yyyy-MM-dd` calendar date. */
export function dayOfWeekFor(dateKey: string): number {
  return DateTime.fromISO(dateKey, { zone: 'utc' }).weekday % 7;
}

/** JavaScript's day numbering (0 = Sunday) for an instant, in the salon's zone. */
export function dayOfWeekIn(instant: Date, timezone: string): number {
  return DateTime.fromJSDate(instant).setZone(timezone).weekday % 7;
}

/**
 * Minutes past midnight on the salon's clock, for comparing an instant against
 * an `"HH:MM"` opening or closing time. Reading `getUTCHours()` instead —
 * which is what the conflict engine did — declares an 11:00 appointment at a
 * Los Angeles salon to be at 18:00 and rejects it for closing time.
 */
export function minutesIntoBusinessDay(
  instant: Date,
  timezone: string
): number {
  const local = DateTime.fromJSDate(instant).setZone(timezone);

  return local.hour * 60 + local.minute;
}

/** Minutes past midnight for an `"HH:MM"` string. */
export function minutesFromClockTime(time: string): number {
  const [hour, minute] = time.split(':').map(Number);

  return hour * 60 + minute;
}

/**
 * The salon's timezone, from the business row.
 *
 * Callers used to be trusted to pass this and routinely did not — the public
 * availability route fetched it and dropped the row, and the real-time service
 * never passed one at all. Fetching it where it is needed is the only
 * arrangement in which it cannot go missing again.
 *
 * Memoised because of where it is needed: the conflict engine re-validates
 * every proposed slot, so an unmemoised read here is one `business.findUnique`
 * per slot per staff member — several hundred round trips for one availability
 * request. It shares `schedule-cache`, so one call clears every memo on this
 * path rather than each having its own escape hatch to forget.
 */
export async function resolveBusinessTimezone(
  businessId: string
): Promise<string> {
  return remember(`timezone:${businessId}`, CONFIG_TTL_MS, async () => {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { timezone: true },
    });

    const stored = business?.timezone || FALLBACK_TIMEZONE;

    return TimeZoneHandler.validateTimeZone(stored)
      ? stored
      : FALLBACK_TIMEZONE;
  });
}

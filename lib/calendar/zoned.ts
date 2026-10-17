import { DateTime } from 'luxon';

/**
 * The calendar lays its grid out with the browser's local-time arithmetic —
 * `getHours`, `setHours`, `toDateString` — throughout its views. Left alone,
 * that puts every appointment at the viewer's hour, not the salon's: an owner
 * checking a Los Angeles salon's calendar from Toronto saw a 9 AM booking at
 * 12 PM (#59).
 *
 * Rather than rewrite every view, the calendar works in the salon's wall
 * clock: instants are converted at the boundary into Dates whose local fields
 * read the salon's time, and converted back before anything leaves. Inside the
 * calendar, "local" means the salon's.
 */

/** A real instant as a Date whose local fields are the salon's clock. */
export function toWallClock(instant: Date, timezone: string): Date {
  const zoned = DateTime.fromJSDate(instant).setZone(timezone);
  return new Date(
    zoned.year,
    zoned.month - 1,
    zoned.day,
    zoned.hour,
    zoned.minute,
    zoned.second,
    zoned.millisecond
  );
}

/** A salon wall-clock Date back to the real instant it names. */
export function fromWallClock(wall: Date, timezone: string): Date {
  return DateTime.fromObject(
    {
      year: wall.getFullYear(),
      month: wall.getMonth() + 1,
      day: wall.getDate(),
      hour: wall.getHours(),
      minute: wall.getMinutes(),
      second: wall.getSeconds(),
      millisecond: wall.getMilliseconds(),
    },
    { zone: timezone }
  ).toJSDate();
}

/** The salon's current time, as a wall-clock Date. */
export function salonNow(timezone: string, now: Date = new Date()): Date {
  return toWallClock(now, timezone);
}

/** The zone's short name right now, such as "PDT", for labelling times. */
export function zoneName(timezone: string, now: Date = new Date()): string {
  return DateTime.fromJSDate(now).setZone(timezone).toFormat('ZZZZ');
}

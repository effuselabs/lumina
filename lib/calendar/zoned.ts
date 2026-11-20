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

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A salon wall-clock Date back to the real instant it names.
 *
 * Most wall times name one instant. On the night the clocks go back, one hour
 * happens twice; on the night they go forward, one never happens. Luxon
 * settles those by guessing from the zone's offset at the moment the code
 * runs, so the same wall time gave a different instant in summer and in
 * winter. These are settled the same way every time, as Temporal's
 * "compatible" rule does: the first of a repeated time, and a skipped time
 * moved forward by the length of the gap.
 */
export function fromWallClock(wall: Date, timezone: string): Date {
  const fields = {
    year: wall.getFullYear(),
    month: wall.getMonth() + 1,
    day: wall.getDate(),
    hour: wall.getHours(),
    minute: wall.getMinutes(),
    second: wall.getSeconds(),
    millisecond: wall.getMilliseconds(),
  };
  // The wall time read as if it were UTC; each real candidate is this minus
  // an offset the zone uses within a day either side.
  const asUtc = Date.UTC(
    fields.year,
    fields.month - 1,
    fields.day,
    fields.hour,
    fields.minute,
    fields.second,
    fields.millisecond
  );
  const offsetAt = (ms: number) =>
    DateTime.fromMillis(ms, { zone: timezone }).offset;
  const offsets = [
    ...new Set([offsetAt(asUtc - DAY_MS), offsetAt(asUtc + DAY_MS)]),
  ];

  const matches = offsets
    .map(offset => asUtc - offset * 60_000)
    .filter(ms => {
      const back = DateTime.fromMillis(ms, { zone: timezone });
      return (
        back.year === fields.year &&
        back.month === fields.month &&
        back.day === fields.day &&
        back.hour === fields.hour &&
        back.minute === fields.minute
      );
    });
  if (matches.length > 0) return new Date(Math.min(...matches));

  // In the gap: read it with the offset from before the change, which lands
  // the length of the gap later on the clock after it.
  return new Date(asUtc - Math.min(...offsets) * 60_000);
}

/** The salon's current time, as a wall-clock Date. */
export function salonNow(timezone: string, now: Date = new Date()): Date {
  return toWallClock(now, timezone);
}

/** The zone's short name right now, such as "PDT", for labelling times. */
export function zoneName(timezone: string, now: Date = new Date()): string {
  return DateTime.fromJSDate(now).setZone(timezone).toFormat('ZZZZ');
}

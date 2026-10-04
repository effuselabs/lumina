/**
 * A calendar day as the booking API passes it: `YYYY-MM-DD`, with no zone.
 *
 * The calendar builds its cells at the visitor's local midnight, so both
 * directions must read and write in the visitor's zone. The built-ins do not:
 * `toISOString()` writes the UTC day, which rolls back a day for every
 * visitor east of Greenwich, and `new Date('2026-10-12')` reads UTC midnight,
 * which is the evening before for every visitor west of it.
 */

/** A calendar cell as `YYYY-MM-DD`, read in the zone it was built in. */
export function toDateParam(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}

/** `YYYY-MM-DD` as local midnight on that day, matching the calendar's cells. */
export function fromDateParam(param: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(param);
  if (!match) throw new Error(`Not a YYYY-MM-DD date: ${param}`);
  const [, year, month, day] = match;

  return new Date(Number(year), Number(month) - 1, Number(day));
}

/** Minutes after midnight, as [start, end). */
export interface MinuteRange {
  start: number;
  end: number;
}

const DAY = 24 * 60;

const minutesOf = (date: Date) => date.getHours() * 60 + date.getMinutes();

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

/**
 * The span of a day the calendar must show: business hours, widened to every
 * appointment that falls outside them and rounded out to the grid's step.
 *
 * Bounding the grid by business hours alone hid real bookings — one taken at
 * 08:30 for a salon opening at 09:00, a rescheduled one, or any booked before
 * the owner shortened their hours. `extended` says the grid now shows time the
 * salon is closed, so the view can say why.
 *
 * Times are read in the browser's zone, as the rest of the calendar reads them.
 */
export function rangeCovering(
  businessHours: MinuteRange | null,
  appointments: ReadonlyArray<{ startTime: Date; endTime: Date }>,
  step: number
): { range: MinuteRange | null; extended: boolean } {
  let start = businessHours?.start ?? Infinity;
  let end = businessHours?.end ?? -Infinity;

  for (const { startTime, endTime } of appointments) {
    const from = minutesOf(startTime);
    const to = sameDay(startTime, endTime) ? minutesOf(endTime) : DAY;
    start = Math.min(start, Math.floor(from / step) * step);
    end = Math.max(end, Math.ceil(Math.max(to, from + 1) / step) * step);
  }

  if (!Number.isFinite(start)) return { range: null, extended: false };

  const range = { start, end: Math.min(end, DAY) };
  const extended =
    !businessHours ||
    range.start < businessHours.start ||
    range.end > businessHours.end;
  return { range, extended };
}

/** "09:30" as minutes after midnight. */
export function parseClock(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

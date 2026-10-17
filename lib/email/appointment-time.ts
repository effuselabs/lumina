import { DateTime } from 'luxon';

/**
 * An instant as the salon and the client both understand it.
 *
 * `date-fns` `format` renders in the server's zone, so a Railway container in
 * UTC told a Los Angeles salon its 2 PM booking was at 9 PM. The instant in the
 * database was right; every human-readable copy of it was wrong. Anything that
 * writes an appointment time for a person to read goes through here.
 */
export function inBusinessZone(
  instant: Date,
  timezone: string | null,
  format: string
): string {
  return DateTime.fromJSDate(instant)
    .setZone(timezone || 'UTC')
    .toFormat(format);
}

export const DATE_FORMAT = 'cccc, LLLL d, yyyy';
export const TIME_FORMAT = 'h:mm a ZZZZ';

/** "Tuesday, October 20, 2026" and "10:00 AM – 11:00 AM PDT", in salon time. */
export function appointmentWhen(
  appointment: { startTime: Date; endTime: Date },
  timezone: string | null
): { appointmentDate: string; appointmentTime: string } {
  return {
    appointmentDate: inBusinessZone(
      appointment.startTime,
      timezone,
      DATE_FORMAT
    ),
    appointmentTime: `${inBusinessZone(appointment.startTime, timezone, 'h:mm a')} – ${inBusinessZone(appointment.endTime, timezone, TIME_FORMAT)}`,
  };
}

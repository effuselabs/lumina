import { rangeCovering } from '@/lib/calendar/visible-range';

/**
 * The calendar's grid used to span business hours only, so an appointment
 * before opening or after closing had nowhere to render — found on staging, an
 * 08:30 booking at a salon opening 09:00 confirmed and never appeared.
 */
const at = (hhmm: string, day = '2026-10-05') => new Date(`${day}T${hhmm}:00`);
const appt = (start: string, end: string, day?: string) => ({
  startTime: at(start, day),
  endTime: at(end, day),
});
const nineToSix = { start: 9 * 60, end: 18 * 60 };

describe('rangeCovering', () => {
  it('is business hours when every appointment is inside them', () => {
    expect(rangeCovering(nineToSix, [appt('10:00', '11:00')], 30)).toEqual({
      range: nineToSix,
      extended: false,
    });
  });

  it('extends earlier for an appointment before opening', () => {
    expect(rangeCovering(nineToSix, [appt('08:30', '09:15')], 30)).toEqual({
      range: { start: 8 * 60 + 30, end: 18 * 60 },
      extended: true,
    });
  });

  it('extends later for an appointment after closing, rounded to the step', () => {
    expect(rangeCovering(nineToSix, [appt('17:30', '18:45')], 60)).toEqual({
      range: { start: 9 * 60, end: 19 * 60 },
      extended: true,
    });
  });

  it('rounds an early start down to the step', () => {
    expect(
      rangeCovering(nineToSix, [appt('07:45', '08:15')], 60).range
    ).toEqual({ start: 7 * 60, end: 18 * 60 });
  });

  it('covers a closed day that has appointments', () => {
    expect(rangeCovering(null, [appt('11:00', '12:30')], 30)).toEqual({
      range: { start: 11 * 60, end: 12 * 60 + 30 },
      extended: true,
    });
  });

  it('is nothing for a closed day with no appointments', () => {
    expect(rangeCovering(null, [], 30)).toEqual({
      range: null,
      extended: false,
    });
  });

  it('runs to midnight for an appointment that ends the next day', () => {
    expect(
      rangeCovering(
        nineToSix,
        [{ startTime: at('22:00'), endTime: at('00:30', '2026-10-06') }],
        60
      ).range
    ).toEqual({ start: 9 * 60, end: 24 * 60 });
  });
});

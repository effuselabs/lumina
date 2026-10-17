import {
  fromWallClock,
  salonNow,
  toWallClock,
  zoneName,
} from '@/lib/calendar/zoned';

/**
 * The calendar laid appointments out at the viewer's hour, not the salon's
 * (#59). It now works in the salon's wall clock: these convert at its edges.
 */
describe('salon wall clock', () => {
  const LA = 'America/Los_Angeles';

  it("reads an instant as the salon's local date and time", () => {
    // 03:00 UTC on Wednesday is 8 PM Tuesday in Los Angeles.
    const wall = toWallClock(new Date('2026-10-07T03:00:00Z'), LA);

    expect([
      wall.getFullYear(),
      wall.getMonth(),
      wall.getDate(),
      wall.getHours(),
      wall.getMinutes(),
    ]).toEqual([2026, 9, 6, 20, 0]);
  });

  it('round-trips, whatever zone the code runs in', () => {
    for (const iso of [
      '2026-10-07T03:00:00.000Z',
      '2026-11-01T08:30:00.000Z', // 1:30 AM PDT, the hour before falling back
      '2026-11-01T10:30:00.000Z', // 2:30 AM PST, after it
      '2026-03-08T11:00:00.000Z', // 4 AM PDT, after springing forward
    ]) {
      const instant = new Date(iso);
      expect(fromWallClock(toWallClock(instant, LA), LA).toISOString()).toBe(
        iso
      );
    }
  });

  it("gives the salon's now", () => {
    const wall = salonNow('Australia/Sydney', new Date('2026-10-06T20:00:00Z'));

    // 20:00 UTC on the 6th is 7 AM on the 7th in Sydney (AEDT).
    expect([wall.getDate(), wall.getHours()]).toEqual([7, 7]);
  });

  it("names the salon's zone as it stands on the day", () => {
    expect(zoneName(LA, new Date('2026-10-07T03:00:00Z'))).toBe('PDT');
    expect(zoneName(LA, new Date('2026-12-07T03:00:00Z'))).toBe('PST');
  });
});

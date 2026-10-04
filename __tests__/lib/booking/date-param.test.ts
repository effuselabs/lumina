import { fromDateParam, toDateParam } from '@/lib/booking/date-param';

/**
 * The booking page offered "Next available date: Sunday, Oct 11" on Sunday
 * 11 October: it read the API's "2026-10-12" with `new Date()`, which is UTC
 * midnight — the evening before, anywhere west of Greenwich.
 */
describe('booking date params', () => {
  it('reads a day as local midnight on that day, in any zone', () => {
    const date = fromDateParam('2026-10-12');

    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([
      2026, 9, 12,
    ]);
    expect([date.getHours(), date.getMinutes()]).toEqual([0, 0]);
  });

  it('round-trips with toDateParam', () => {
    for (const param of [
      '2026-01-01',
      '2026-03-08',
      '2026-11-01',
      '2026-12-31',
    ]) {
      expect(toDateParam(fromDateParam(param))).toBe(param);
    }
  });

  it('rejects anything that is not a bare date', () => {
    expect(() => fromDateParam('2026-10-12T00:00:00Z')).toThrow();
    expect(() => fromDateParam('12/10/2026')).toThrow();
  });
});

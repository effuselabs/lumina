import {
  appointmentStats,
  statsWindows,
} from '@/lib/services/appointment-stats';
import { prisma } from '@/lib/prisma';
import { asMock } from '@/__tests__/utils/prisma-mock-helpers';
import { readFileSync } from 'fs';
import { join } from 'path';

jest.mock('@/lib/prisma', () => ({
  prisma: { appointment: { count: jest.fn(), groupBy: jest.fn() } },
}));

/**
 * The appointments page showed 8 appointments today, 42 this week and a 3.2%
 * no-show rate to every salon, with invented trends (#102).
 */
describe('statsWindows', () => {
  const LA = 'America/Los_Angeles';

  it("is the salon's day and Sunday-to-Saturday week, not the server's", () => {
    // Tuesday 6 October, 8 PM in Los Angeles — already Wednesday in UTC.
    const windows = statsWindows(new Date('2026-10-07T03:00:00Z'), LA);

    expect(windows.today).toEqual({
      start: new Date('2026-10-06T07:00:00Z'),
      end: new Date('2026-10-07T07:00:00Z'),
    });
    expect(windows.week).toEqual({
      start: new Date('2026-10-04T07:00:00Z'),
      end: new Date('2026-10-11T07:00:00Z'),
    });
  });

  it('keeps a whole day when the clocks change', () => {
    // Sunday 1 November 2026: Los Angeles falls back, a 25-hour day.
    const windows = statsWindows(new Date('2026-11-01T18:00:00Z'), LA);

    expect(windows.today).toEqual({
      start: new Date('2026-11-01T07:00:00Z'),
      end: new Date('2026-11-02T08:00:00Z'),
    });
    expect(windows.week.start).toEqual(new Date('2026-11-01T07:00:00Z'));
  });
});

describe('appointmentStats', () => {
  beforeEach(() => jest.clearAllMocks());

  it("counts this business's booked appointments, not cancelled ones", async () => {
    asMock(prisma.appointment.count)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(9);
    asMock(prisma.appointment.groupBy).mockResolvedValue([
      { status: 'COMPLETED', _count: { _all: 18 } },
      { status: 'NO_SHOW', _count: { _all: 2 } },
    ]);

    const stats = await appointmentStats(
      'business-1',
      'America/Los_Angeles',
      new Date('2026-10-07T03:00:00Z')
    );

    expect(stats).toEqual({ today: 2, thisWeek: 9, noShowRate: 0.1 });
    for (const [query] of asMock(prisma.appointment.count).mock.calls) {
      expect(query.where).toMatchObject({
        businessId: 'business-1',
        status: { not: 'CANCELLED' },
      });
    }
    expect(
      asMock(prisma.appointment.groupBy).mock.calls[0][0].where
    ).toMatchObject({
      businessId: 'business-1',
      status: { in: ['COMPLETED', 'NO_SHOW'] },
    });
  });

  it('has no no-show rate until an appointment has finished', async () => {
    asMock(prisma.appointment.count).mockResolvedValue(0);
    asMock(prisma.appointment.groupBy).mockResolvedValue([]);

    const stats = await appointmentStats('business-1', 'UTC');

    expect(stats.noShowRate).toBeNull();
  });
});

describe('dashboard figures come from data', () => {
  it.each([
    'components/dashboard/dashboard-header.tsx',
    'components/dashboard/sidebar-navigation.tsx',
    'components/appointments/appointments-page-content.tsx',
  ])('%s hardcodes no counts, trends or invented people', path => {
    const source = readFileSync(join(process.cwd(), path), 'utf8');

    expect(source).not.toMatch(/const \w*(Count|Appointments|Payments) = \d/);
    expect(source).not.toMatch(/badge: \d/);
    expect(source).not.toMatch(/value=\{\d|value="[\d.]+%"/);
    expect(source).not.toMatch(/from yesterday|from last (week|month)/);
    expect(source).not.toMatch(/Sarah Johnson|Mike Rodriguez|Emma Chen/);
    expect(source).not.toMatch(/will be implemented next/);
  });
});

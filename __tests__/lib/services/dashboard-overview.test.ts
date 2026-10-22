import { calculateBusinessRevenue } from '@/lib/financial/transaction-service';
import { prisma } from '@/lib/prisma';
import {
  dashboardOverview,
  todaysSchedule,
} from '@/lib/services/dashboard-overview';
import { asMock } from '@/__tests__/utils/prisma-mock-helpers';

/**
 * The overview told the demo salon it had 502 appointments today: "today" was
 * the server's calendar day, counted only up to the current moment, and a 0
 * fell back to the all-time total (#115).
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    appointment: { count: jest.fn(), findMany: jest.fn() },
    client: { count: jest.fn() },
    staff: { count: jest.fn() },
  },
}));
jest.mock('@/lib/financial/transaction-service', () => ({
  calculateBusinessRevenue: jest.fn(),
}));

const LA = 'America/Los_Angeles';
// 09:00 in Los Angeles on Wednesday 21 October: 16:00 UTC.
const NOW = new Date('2026-10-21T16:00:00Z');
const SALON_MIDNIGHT = new Date('2026-10-21T07:00:00Z');
const NEXT_MIDNIGHT = new Date('2026-10-22T07:00:00Z');

describe('dashboardOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    asMock(calculateBusinessRevenue).mockResolvedValue({ netRevenue: 0 });
    asMock(prisma.appointment.count).mockResolvedValue(0);
    asMock(prisma.client.count).mockResolvedValue(0);
    asMock(prisma.staff.count).mockResolvedValue(0);
  });

  it("counts the salon's whole day, not the server's day so far", async () => {
    await dashboardOverview('business-1', LA, NOW);

    expect(prisma.appointment.count).toHaveBeenCalledWith({
      where: {
        businessId: 'business-1',
        status: { not: 'CANCELLED' },
        startTime: { gte: SALON_MIDNIGHT, lt: NEXT_MIDNIGHT },
      },
    });
  });

  it('reports what is still to come today separately', async () => {
    asMock(prisma.appointment.count)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(6);

    const overview = await dashboardOverview('business-1', LA, NOW);

    expect(overview.appointments).toEqual({ today: 10, stillToCome: 6 });
    expect(prisma.appointment.count).toHaveBeenNthCalledWith(2, {
      where: {
        businessId: 'business-1',
        status: { not: 'CANCELLED' },
        startTime: { gte: NOW, lt: NEXT_MIDNIGHT },
      },
    });
  });

  it('shows 0 for an empty day, never some other number', async () => {
    asMock(prisma.appointment.count).mockResolvedValue(0);

    const overview = await dashboardOverview('business-1', LA, NOW);

    expect(overview.appointments.today).toBe(0);
  });

  it('compares revenue over two consecutive 30-day windows', async () => {
    asMock(calculateBusinessRevenue)
      .mockResolvedValueOnce({ netRevenue: 1200 })
      .mockResolvedValueOnce({ netRevenue: 1000 });

    const overview = await dashboardOverview('business-1', LA, NOW);

    expect(overview.revenue).toEqual({
      last30Days: 1200,
      previous30Days: 1000,
    });
    const [[, nowStart, nowEnd], [, beforeStart, beforeEnd]] = asMock(
      calculateBusinessRevenue
    ).mock.calls;
    expect(nowEnd).toEqual(NOW);
    expect(beforeEnd).toEqual(nowStart);
    expect(nowStart.getTime() - beforeStart.getTime()).toBe(30 * 86_400_000);
  });
});

describe('todaysSchedule', () => {
  it("shows times on the salon's clock, with real durations", async () => {
    asMock(prisma.appointment.findMany).mockResolvedValue([
      {
        id: 'a1',
        startTime: new Date('2026-10-21T21:00:00Z'),
        endTime: new Date('2026-10-21T22:30:00Z'),
        status: 'CONFIRMED',
        clientName: null,
        client: { firstName: 'Ada', lastName: 'Client' },
        staff: { displayName: 'Sam', user: { name: 'Sam Stylist' } },
        services: [{ serviceName: 'Cut' }, { serviceName: 'Colour' }],
      },
    ]);

    const [entry] = await todaysSchedule('business-1', LA, NOW);

    expect(entry).toEqual({
      id: 'a1',
      clientName: 'Ada Client',
      services: 'Cut, Colour',
      staffName: 'Sam',
      time: '2:00 PM',
      durationMinutes: 90,
      status: 'CONFIRMED',
    });
  });

  it('names a walk-in by the name taken at the desk', async () => {
    asMock(prisma.appointment.findMany).mockResolvedValue([
      {
        id: 'a2',
        startTime: new Date('2026-10-21T18:00:00Z'),
        endTime: new Date('2026-10-21T18:30:00Z'),
        status: 'SCHEDULED',
        clientName: 'Jo Walkin',
        client: null,
        staff: { displayName: '', user: { name: 'Sam Stylist' } },
        services: [{ serviceName: 'Trim' }],
      },
    ]);

    const [entry] = await todaysSchedule('business-1', LA, NOW);

    expect(entry.clientName).toBe('Jo Walkin');
    expect(entry.staffName).toBe('Sam Stylist');
  });
});

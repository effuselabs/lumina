import { AppointmentFactory } from '@/prisma/factories/appointment-factory';
import type { BookingPatterns } from '@/prisma/factories/types';
import type { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';

/**
 * The seed set appointment times with `setHours`, on the server's clock. The
 * server runs in UTC, so a stylist working 9 to 5 in Los Angeles had their
 * day written as 2 to 10 AM, and the calendar showed the demo salon booking
 * clients in the middle of the night (#134).
 *
 * The salon here is in Tokyo, east of every zone a developer or CI runner is
 * likely to be in, so server-clock hours land outside 9-to-5 there whatever
 * zone this test runs in.
 */

const NINE_TO_FIVE = { startTime: '09:00', endTime: '17:00' };
const WEEK = Object.fromEntries(
  [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ].map(day => [day, NINE_TO_FIVE])
);

const PATTERNS: BookingPatterns = {
  peakHours: [10, 11, 14, 15],
  peakDays: [4, 5, 6],
  seasonalVariations: [],
  statusDistribution: {
    completed: 80,
    cancelled: 10,
    noShow: 5,
    rescheduled: 5,
  },
};

const STAFF = { id: 'staff-1', displayName: 'Sam', workingHours: WEEK };

function fakePrisma() {
  return {
    business: { findUnique: jest.fn(async () => ({ timezone: 'Asia/Tokyo' })) },
    client: {
      findMany: jest.fn(async () => [
        {
          id: 'c1',
          firstName: 'Ada',
          lastName: 'Client',
          email: null,
          phone: null,
        },
      ]),
    },
    staff: { findMany: jest.fn(async () => [STAFF]) },
    service: {
      findMany: jest.fn(async () => [
        { id: 'svc-1', name: 'Cut', duration: 60, price: 45, category: null },
      ]),
    },
  } as unknown as PrismaClient;
}

type WithTimeGenerator = {
  generateAppointmentTime(
    date: Date,
    staff: typeof STAFF
  ): { startTime: Date; endTime: Date };
};

describe('AppointmentFactory times', () => {
  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  it("books within working hours on the salon's clock, not the server's", async () => {
    const factory = new AppointmentFactory(fakePrisma(), 'biz-1', PATTERNS);
    await factory.initialize();
    const generator = factory as unknown as WithTimeGenerator;

    for (let dayOfMonth = 1; dayOfMonth <= 28; dayOfMonth++) {
      const date = new Date(2026, 10, dayOfMonth);
      const { startTime } = generator.generateAppointmentTime(date, STAFF);
      const local = DateTime.fromJSDate(startTime).setZone('Asia/Tokyo');

      expect(local.hour).toBeGreaterThanOrEqual(9);
      expect(local.hour).toBeLessThan(17);
      // And on the day that was asked for, in the salon's calendar.
      expect(local.toFormat('yyyy-MM-dd')).toBe(
        `2026-11-${String(dayOfMonth).padStart(2, '0')}`
      );
    }
  });
});

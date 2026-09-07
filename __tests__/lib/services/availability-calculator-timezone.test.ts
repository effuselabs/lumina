/**
 * The availability calculator must work in the business's timezone.
 *
 * A salon open 09:00–17:00 in America/Los_Angeles is open from 16:00Z to
 * 00:00Z. The calculator instead builds slots with `setHours`, which reads
 * whatever zone the Node process happens to be in, and then labels the result
 * as the business's time. In UTC that produces `09:00Z` — four in the morning
 * to the salon, and 06:00 to a client in Halifax.
 *
 * These tests assert absolute instants, so they fail in every server zone
 * including UTC. That matters: CI runs in UTC, which is exactly why this bug
 * survived. A test that only fails under `TZ=America/Halifax` would gate
 * nothing on the machine that does the gating.
 *
 * The day-of-week test covers the other half — `date.getDay()` on a
 * midnight-UTC Date is the *previous* day anywhere west of Greenwich, so a
 * request for Monday looked up Sunday's business hours and returned nothing.
 */

import { prisma } from '@/lib/prisma';
import { AvailabilityCalculator } from '@/lib/services/availability-calculator';
import { AvailabilityCache } from '@/lib/services/availability-cache';
import { ConflictDetectionEngine } from '@/lib/services/conflict-detection-engine';
import { asMock } from '@/__tests__/utils/prisma-mock-helpers';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    business: { findUnique: jest.fn() },
    staff: { findUnique: jest.fn(), findMany: jest.fn() },
    service: { findUnique: jest.fn() },
    staffService: { findUnique: jest.fn() },
    businessHours: { findUnique: jest.fn() },
    staffAvailability: { findMany: jest.fn() },
    staffAvailabilityOverride: { findUnique: jest.fn() },
    appointment: { findMany: jest.fn() },
    timeOffRequest: { findMany: jest.fn() },
    businessHoliday: { findMany: jest.fn() },
  },
}));

jest.mock('@/lib/services/availability-cache', () => ({
  AvailabilityCache: { get: jest.fn(), set: jest.fn() },
}));

jest.mock('@/lib/services/conflict-detection-engine', () => ({
  ConflictDetectionEngine: { validateAppointmentSlot: jest.fn() },
}));

const mockPrisma = prisma as unknown as typeof prisma;

const BUSINESS_ID = 'business-la';
const STAFF_ID = 'staff-1';
const TIMEZONE = 'America/Los_Angeles';

/** Monday. Midnight UTC, which is how the API parses a `YYYY-MM-DD` query. */
const MONDAY = new Date('2026-09-14T00:00:00.000Z');

describe('AvailabilityCalculator — business timezone', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    asMock(mockPrisma.business.findUnique).mockResolvedValue({
      id: BUSINESS_ID,
      timezone: TIMEZONE,
    });
    asMock(mockPrisma.staff.findUnique).mockResolvedValue({
      isActive: true,
      displayName: 'Nigel Padberg',
    });
    asMock(mockPrisma.staff.findMany).mockResolvedValue([{ id: STAFF_ID }]);
    asMock(mockPrisma.businessHours.findUnique).mockResolvedValue({
      businessId: BUSINESS_ID,
      dayOfWeek: 1,
      isClosed: false,
      openTime: '09:00',
      closeTime: '17:00',
    });
    asMock(mockPrisma.staffAvailabilityOverride.findUnique).mockResolvedValue(
      null
    );
    asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue([
      { startTime: '09:00', endTime: '17:00' },
    ]);
    asMock(mockPrisma.appointment.findMany).mockResolvedValue([]);
    asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue([]);
    asMock(mockPrisma.businessHoliday.findMany).mockResolvedValue([]);
    asMock(AvailabilityCache.get).mockResolvedValue(null);
    asMock(AvailabilityCache.set).mockResolvedValue(undefined);
    asMock(ConflictDetectionEngine.validateAppointmentSlot).mockResolvedValue({
      isValid: true,
      conflicts: [],
    });
  });

  it('opens the first slot at the business opening time, as an instant', async () => {
    const result = await AvailabilityCalculator.calculateAvailability({
      businessId: BUSINESS_ID,
      staffId: STAFF_ID,
      date: MONDAY,
      duration: 60,
      timezone: TIMEZONE,
    });

    expect(result.slots.length).toBeGreaterThan(0);

    // 09:00 PDT on 2026-09-14 is 16:00Z. Not 09:00Z.
    expect(result.slots[0].startTime.toISOString()).toBe(
      '2026-09-14T16:00:00.000Z'
    );
  });

  it('closes the last slot at the business closing time, as an instant', async () => {
    const result = await AvailabilityCalculator.calculateAvailability({
      businessId: BUSINESS_ID,
      staffId: STAFF_ID,
      date: MONDAY,
      duration: 60,
      timezone: TIMEZONE,
    });

    const last = result.slots[result.slots.length - 1];

    // 17:00 PDT is 00:00Z the next day; the last 60-minute slot ends there.
    expect(last.endTime.toISOString()).toBe('2026-09-15T00:00:00.000Z');
  });

  it('reads the business hours of the requested day, not the server’s', async () => {
    await AvailabilityCalculator.calculateAvailability({
      businessId: BUSINESS_ID,
      staffId: STAFF_ID,
      date: MONDAY,
      duration: 60,
      timezone: TIMEZONE,
    });

    // 2026-09-14 is a Monday — dayOfWeek 1. Read as a local Date west of
    // Greenwich, midnight UTC is Sunday evening, and this asks for 0.
    expect(mockPrisma.businessHours.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          businessId_dayOfWeek: { businessId: BUSINESS_ID, dayOfWeek: 1 },
        },
      })
    );
  });

  it('keys the cache by timezone, so old entries cannot be served', async () => {
    await AvailabilityCalculator.calculateAvailability({
      businessId: BUSINESS_ID,
      staffId: STAFF_ID,
      date: MONDAY,
      duration: 60,
      timezone: TIMEZONE,
    });

    // The zone is part of the answer, so it has to be part of the key. It is
    // also what stops every row computed by the pre-fix calculator from being
    // served as though it were still right.
    expect(AvailabilityCache.get).toHaveBeenCalledWith(
      expect.objectContaining({ timezone: TIMEZONE })
    );
    expect(AvailabilityCache.set).toHaveBeenCalledWith(
      expect.objectContaining({ timezone: TIMEZONE }),
      expect.anything()
    );
  });

  it('finds staff by the relation the schema actually declares', async () => {
    await AvailabilityCalculator.calculateAvailability({
      businessId: BUSINESS_ID,
      date: MONDAY,
      duration: 60,
      serviceId: 'service-1',
      timezone: TIMEZONE,
    });

    // Staff.services, not Staff.staffServices. The wrong name made Prisma
    // reject the query outright, and the catch around it turned that into an
    // empty staff list — zero slots, no error, no clue.
    expect(mockPrisma.staff.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          services: { some: { serviceId: 'service-1' } },
        }),
      })
    );
  });

  it('handles a zone whose offset differs from the server’s', async () => {
    asMock(mockPrisma.business.findUnique).mockResolvedValue({
      id: BUSINESS_ID,
      timezone: 'Australia/Sydney',
    });

    const result = await AvailabilityCalculator.calculateAvailability({
      businessId: BUSINESS_ID,
      staffId: STAFF_ID,
      date: MONDAY,
      duration: 60,
      timezone: 'Australia/Sydney',
    });

    // 09:00 on 2026-09-14 in Sydney (AEST, UTC+10) is 23:00Z the day before.
    expect(result.slots[0].startTime.toISOString()).toBe(
      '2026-09-13T23:00:00.000Z'
    );
  });
});

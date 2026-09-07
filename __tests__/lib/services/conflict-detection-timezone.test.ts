/**
 * The conflict engine must judge an appointment on the salon's clock.
 *
 * It is the availability calculator's twin: the calculator proposes slots and
 * this re-validates every one before the API offers it. While both read the
 * wall clock as UTC they agreed — wrongly, but consistently. Once the
 * calculator was fixed they disagreed completely, and the engine rejected
 * every correct slot it was handed:
 *
 *   calculator:  2026-09-14T18:00:00.000Z  (11:00 PDT, inside 09:00–18:00)
 *   engine:      BUSINESS_HOURS_VIOLATION "ends after business closes at 18:00"
 *
 * because `getUTCHours()` of that instant is 18. So the public availability
 * endpoint returned zero slots for a day the salon was open all day.
 *
 * These assert absolute instants against a Los Angeles salon, so they fail
 * under UTC as well — the zone CI runs in, and the reason nobody saw this.
 */

import { prisma } from '@/lib/prisma';
import { ConflictDetectionEngine } from '@/lib/services/conflict-detection-engine';
import { TimeSlotAnalysisEngine } from '@/lib/services/time-slot-analysis-engine';
import { forgetSchedules } from '@/lib/services/schedule-cache';
import { asMock } from '@/__tests__/utils/prisma-mock-helpers';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    business: { findUnique: jest.fn() },
    staff: { findUnique: jest.fn(), findMany: jest.fn() },
    service: { findUnique: jest.fn(), findMany: jest.fn() },
    businessHours: { findUnique: jest.fn(), findMany: jest.fn() },
    staffAvailability: { findMany: jest.fn() },
    staffAvailabilityOverride: { findUnique: jest.fn() },
    appointment: { findMany: jest.fn(), findFirst: jest.fn() },
    timeOffRequest: { findMany: jest.fn() },
    businessHoliday: { findMany: jest.fn() },
  },
}));

const mockPrisma = prisma as unknown as typeof prisma;

const BUSINESS_ID = 'business-la';
const STAFF_ID = 'staff-1';
const TIMEZONE = 'America/Los_Angeles';

// Monday. The salon opens 09:00 and closes 18:00 Pacific — 16:00Z to 01:00Z.
const ELEVEN_AM_PACIFIC = new Date('2026-09-14T18:00:00.000Z');
const NOON_PACIFIC = new Date('2026-09-14T19:00:00.000Z');

describe('ConflictDetectionEngine — business timezone', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // The zone is memoised in-process, so a stale entry would let a test pass
    // on the previous test's business rather than its own mock.
    forgetSchedules();

    asMock(mockPrisma.business.findUnique).mockResolvedValue({
      id: BUSINESS_ID,
      timezone: TIMEZONE,
      operatingHours: null,
    });
    asMock(mockPrisma.businessHours.findUnique).mockResolvedValue({
      businessId: BUSINESS_ID,
      dayOfWeek: 1,
      isClosed: false,
      openTime: '09:00',
      closeTime: '18:00',
    });
    asMock(mockPrisma.businessHours.findMany).mockResolvedValue([]);
    asMock(mockPrisma.staff.findUnique).mockResolvedValue({
      id: STAFF_ID,
      isActive: true,
      displayName: 'Angela Heaney',
    });
    asMock(mockPrisma.staff.findMany).mockResolvedValue([]);
    asMock(mockPrisma.staffAvailabilityOverride.findUnique).mockResolvedValue(
      null
    );
    asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue([
      { startTime: '11:00', endTime: '18:00', dayOfWeek: 1 },
    ]);
    asMock(mockPrisma.appointment.findMany).mockResolvedValue([]);
    asMock(mockPrisma.appointment.findFirst).mockResolvedValue(null);
    asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue([]);
    asMock(mockPrisma.businessHoliday.findMany).mockResolvedValue([]);
    asMock(mockPrisma.service.findMany).mockResolvedValue([]);
  });

  it('accepts an 11am Pacific appointment at a salon open 09:00–18:00', async () => {
    const conflicts = await ConflictDetectionEngine.detectConflicts({
      businessId: BUSINESS_ID,
      staffId: STAFF_ID,
      startTime: ELEVEN_AM_PACIFIC,
      endTime: NOON_PACIFIC,
      serviceIds: [],
    });

    // 18:00Z is 11:00 Pacific — squarely inside both the salon's hours and the
    // staff member's. Read as UTC it looks like closing time.
    expect(
      conflicts.map(conflict => `${conflict.type}: ${conflict.message}`)
    ).toEqual([]);
  });

  it('still rejects an appointment genuinely before the salon opens', async () => {
    // 15:00Z is 08:00 Pacific — an hour before opening. The fix must not turn
    // the check off, only move it onto the right clock.
    const conflicts = await ConflictDetectionEngine.detectConflicts({
      businessId: BUSINESS_ID,
      staffId: STAFF_ID,
      startTime: new Date('2026-09-14T15:00:00.000Z'),
      endTime: new Date('2026-09-14T16:00:00.000Z'),
      serviceIds: [],
    });

    expect(conflicts.map(conflict => conflict.type)).toContain(
      'BUSINESS_HOURS_VIOLATION'
    );
  });

  it('validates business-hours boundaries on the salon clock', async () => {
    const result = await TimeSlotAnalysisEngine.validateBusinessHoursBoundaries(
      { startTime: ELEVEN_AM_PACIFIC, endTime: NOON_PACIFIC },
      BUSINESS_ID
    );

    expect(result.reason).toBeUndefined();
    expect(result.isValid).toBe(true);
  });

  it('reads the salon’s weekday, not the server’s, for a late-evening slot', async () => {
    // 2026-09-15T02:00Z is Monday 19:00 in Los Angeles. A UTC reading calls it
    // Tuesday and fetches the wrong day's hours entirely.
    await ConflictDetectionEngine.detectConflicts({
      businessId: BUSINESS_ID,
      staffId: STAFF_ID,
      startTime: new Date('2026-09-15T02:00:00.000Z'),
      endTime: new Date('2026-09-15T03:00:00.000Z'),
      serviceIds: [],
    });

    expect(mockPrisma.businessHours.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          businessId_dayOfWeek: { businessId: BUSINESS_ID, dayOfWeek: 1 },
        },
      })
    );
  });
});

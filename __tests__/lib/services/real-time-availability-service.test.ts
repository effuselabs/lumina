/**
 * Real-time Availability Service Tests
 *
 * Tests the integration with Calendar Infrastructure (LUM-96) for real-time
 * availability checking with conflict detection and caching.
 *
 * Requirements: 1.3, 6.1, 6.2, 6.3, 6.5, 10.1
 */

import { prisma } from '@/lib/prisma';
import { AvailabilityCalculator } from '@/lib/services/availability-calculator';
import { CalendarIntegration } from '@/lib/services/calendar-integration';
import { RealTimeAvailabilityService } from '@/lib/services/real-time-availability-service';
import { asMock } from '@/__tests__/utils/prisma-mock-helpers';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    business: {
      findUnique: jest.fn(),
    },
    service: {
      findMany: jest.fn(),
    },
    staff: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/services/availability-calculator');
jest.mock('@/lib/services/calendar-integration');

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockAvailabilityCalculator = AvailabilityCalculator as jest.Mocked<
  typeof AvailabilityCalculator
>;
const mockCalendarIntegration = CalendarIntegration as jest.Mocked<
  typeof CalendarIntegration
>;

describe('RealTimeAvailabilityService', () => {
  const businessId = 'test-business-123';
  const serviceIds = ['service-1', 'service-2'];
  const staffId = 'staff-123';
  const testDate = new Date('2024-01-15T00:00:00Z');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAvailableSlots', () => {
    it('should return available slots with real-time validation', async () => {
      // Mock business validation
      asMock(mockPrisma.business.findUnique).mockResolvedValue({
        id: businessId,
        bookingEnabled: true,
        onlineBooking: true,
      } as any);

      // Mock service details
      asMock(mockPrisma.service.findMany).mockResolvedValue([
        {
          id: 'service-1',
          name: 'Haircut',
          duration: 60,
          price: 50,
        },
        {
          id: 'service-2',
          name: 'Styling',
          duration: 30,
          price: 25,
        },
      ] as any);

      // Mock qualified staff
      asMock(mockPrisma.staff.findMany).mockResolvedValue([
        {
          id: staffId,
          displayName: 'John Doe',
          services: [{ serviceId: 'service-1' }, { serviceId: 'service-2' }],
        },
      ] as any);

      // Mock availability calculation
      mockAvailabilityCalculator.calculateAvailability.mockResolvedValue({
        slots: [
          {
            startTime: new Date('2024-01-15T09:00:00Z'),
            endTime: new Date('2024-01-15T10:30:00Z'),
            staffId,
            staffName: 'John Doe',
            isAvailable: true,
          },
          {
            startTime: new Date('2024-01-15T11:00:00Z'),
            endTime: new Date('2024-01-15T12:30:00Z'),
            staffId,
            staffName: 'John Doe',
            isAvailable: true,
          },
        ],
        metadata: {
          totalSlots: 2,
          availableSlots: 2,
          conflictedSlots: 0,
          cacheHit: false,
          calculationTime: 150,
          timezone: 'UTC',
        },
      });

      // Mock real-time validation
      mockCalendarIntegration.checkAvailability.mockResolvedValue({
        isAvailable: true,
        conflicts: [],
        warnings: [],
        metadata: {
          calculationTime: 50,
          cacheHit: false,
          validationResults: [],
        },
      });

      const result = await RealTimeAvailabilityService.getAvailableSlots({
        businessId,
        serviceIds,
        date: testDate,
        staffId,
      });

      expect(result.slots).toHaveLength(2);
      expect(result.slots[0]).toMatchObject({
        startTime: new Date('2024-01-15T09:00:00Z'),
        endTime: new Date('2024-01-15T10:30:00Z'),
        staffId,
        staffName: 'John Doe',
        isAvailable: true,
        totalDuration: 90,
        totalPrice: 75,
      });

      expect(result.metadata).toMatchObject({
        totalSlots: 2,
        availableSlots: 2,
        realTimeValidation: true,
        servicesValidated: serviceIds,
      });

      // Verify Calendar Infrastructure integration
      expect(
        mockAvailabilityCalculator.calculateAvailability
      ).toHaveBeenCalledWith({
        businessId,
        staffId,
        date: testDate,
        duration: 90,
        serviceId: 'service-1',
      });

      expect(mockCalendarIntegration.checkAvailability).toHaveBeenCalledTimes(
        2
      );
    });

    it('should filter out slots that fail real-time validation', async () => {
      // Mock business validation
      asMock(mockPrisma.business.findUnique).mockResolvedValue({
        id: businessId,
        bookingEnabled: true,
        onlineBooking: true,
      } as any);

      // Mock service details
      asMock(mockPrisma.service.findMany).mockResolvedValue([
        {
          id: 'service-1',
          name: 'Haircut',
          duration: 60,
          price: 50,
        },
      ] as any);

      // Mock qualified staff
      asMock(mockPrisma.staff.findMany).mockResolvedValue([
        {
          id: staffId,
          displayName: 'John Doe',
          services: [{ serviceId: 'service-1' }],
        },
      ] as any);

      // Mock availability calculation
      mockAvailabilityCalculator.calculateAvailability.mockResolvedValue({
        slots: [
          {
            startTime: new Date('2024-01-15T09:00:00Z'),
            endTime: new Date('2024-01-15T10:00:00Z'),
            staffId,
            staffName: 'John Doe',
            isAvailable: true,
          },
          {
            startTime: new Date('2024-01-15T11:00:00Z'),
            endTime: new Date('2024-01-15T12:00:00Z'),
            staffId,
            staffName: 'John Doe',
            isAvailable: true,
          },
        ],
        metadata: {
          totalSlots: 2,
          availableSlots: 2,
          conflictedSlots: 0,
          cacheHit: false,
          calculationTime: 150,
          timezone: 'UTC',
        },
      });

      // Mock real-time validation - first slot available, second has conflict
      mockCalendarIntegration.checkAvailability
        .mockResolvedValueOnce({
          isAvailable: true,
          conflicts: [],
          warnings: [],
          metadata: {
            calculationTime: 50,
            cacheHit: false,
            validationResults: [],
          },
        })
        .mockResolvedValueOnce({
          isAvailable: false,
          conflicts: [
            {
              type: 'OVERLAPPING_APPOINTMENT' as any,
              severity: 'ERROR' as any,
              message: 'Slot conflicts with existing appointment',
              details: {},
            },
          ],
          warnings: [],
          metadata: {
            calculationTime: 50,
            cacheHit: false,
            validationResults: [],
          },
        });

      const result = await RealTimeAvailabilityService.getAvailableSlots({
        businessId,
        serviceIds: ['service-1'],
        date: testDate,
        staffId,
      });

      // Should only return the first slot that passed validation
      expect(result.slots).toHaveLength(1);
      expect(result.slots[0].startTime).toEqual(
        new Date('2024-01-15T09:00:00Z')
      );
      expect(result.metadata.availableSlots).toBe(1);
    });

    it('should handle business validation errors', async () => {
      // Mock business not found
      asMock(mockPrisma.business.findUnique).mockResolvedValue(null);

      await expect(
        RealTimeAvailabilityService.getAvailableSlots({
          businessId,
          serviceIds,
          date: testDate,
        })
      ).rejects.toThrow('Business not found');
    });

    it('should handle service validation errors', async () => {
      // Mock business validation
      asMock(mockPrisma.business.findUnique).mockResolvedValue({
        id: businessId,
        bookingEnabled: true,
        onlineBooking: true,
      } as any);

      // Mock no services found
      asMock(mockPrisma.service.findMany).mockResolvedValue([]);

      await expect(
        RealTimeAvailabilityService.getAvailableSlots({
          businessId,
          serviceIds,
          date: testDate,
        })
      ).rejects.toThrow(
        'One or more services are not available for online booking'
      );
    });
  });

  describe('validateSlotRealTime', () => {
    it('should validate slot availability in real-time', async () => {
      const startTime = new Date('2024-01-15T09:00:00Z');
      const endTime = new Date('2024-01-15T10:00:00Z');

      mockCalendarIntegration.checkAvailability.mockResolvedValue({
        isAvailable: true,
        conflicts: [],
        warnings: [
          {
            type: 'BUSINESS_HOURS_VIOLATION' as any,
            severity: 'WARNING' as any,
            message: 'Close to business closing time',
            details: {},
          },
        ],
        metadata: {
          calculationTime: 75,
          cacheHit: false,
          validationResults: [],
        },
      });

      const result = await RealTimeAvailabilityService.validateSlotRealTime({
        businessId,
        staffId,
        startTime,
        endTime,
        serviceIds,
      });

      expect(result).toMatchObject({
        isAvailable: true,
        conflicts: [],
        warnings: ['Close to business closing time'],
      });

      // >= 0, not > 0. validationTime is `Date.now() - startTime`, and a fast
      // path legitimately completes inside the same millisecond. Asserting
      // strictly positive made this depend on the machine being slow — it
      // began failing the moment the service got faster, with nothing broken.
      expect(result.validationTime).toBeGreaterThanOrEqual(0);

      expect(mockCalendarIntegration.checkAvailability).toHaveBeenCalledWith({
        businessId,
        staffId,
        startTime,
        endTime,
        serviceIds,
      });
    });

    it('should handle validation errors gracefully', async () => {
      const startTime = new Date('2024-01-15T09:00:00Z');
      const endTime = new Date('2024-01-15T10:00:00Z');

      mockCalendarIntegration.checkAvailability.mockRejectedValue(
        new Error('Calendar service unavailable')
      );

      const result = await RealTimeAvailabilityService.validateSlotRealTime({
        businessId,
        staffId,
        startTime,
        endTime,
        serviceIds,
      });

      expect(result).toMatchObject({
        isAvailable: false,
        conflicts: ['Validation failed: Calendar service unavailable'],
        warnings: [],
      });

      // >= 0, not > 0. validationTime is `Date.now() - startTime`, and a fast
      // path legitimately completes inside the same millisecond. Asserting
      // strictly positive made this depend on the machine being slow — it
      // began failing the moment the service got faster, with nothing broken.
      expect(result.validationTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('cache management', () => {
    it('should invalidate availability cache', async () => {
      const dateRange = {
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-01-15'),
      };

      mockCalendarIntegration.invalidateAvailabilityCache.mockResolvedValue();

      await RealTimeAvailabilityService.invalidateAvailabilityCache(
        businessId,
        staffId,
        dateRange
      );

      expect(
        mockCalendarIntegration.invalidateAvailabilityCache
      ).toHaveBeenCalledWith({
        businessId,
        staffId,
        dateRange,
        type: 'staff_availability',
      });
    });

    it('should warm availability cache', async () => {
      const staffIds = [staffId];
      const dateRange = {
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-01-20'),
      };

      mockCalendarIntegration.warmAvailabilityCache.mockResolvedValue();

      await RealTimeAvailabilityService.warmAvailabilityCache(
        businessId,
        staffIds,
        dateRange
      );

      expect(
        mockCalendarIntegration.warmAvailabilityCache
      ).toHaveBeenCalledWith(businessId, staffIds, dateRange);
    });

    it('should get cache metrics', () => {
      const mockMetrics = {
        availability: {
          hitRate: 85.5,
          totalRequests: 100,
          totalHits: 85,
          totalMisses: 15,
          averageQueryTime: 120,
        },
        cache: {
          hitRate: 90.0,
          totalRequests: 200,
          totalHits: 180,
          totalMisses: 20,
          averageQueryTime: 50,
        },
        coordination: {
          invalidationCount: 5,
          warmingCount: 2,
          hitRate: 87.5,
          missRate: 12.5,
          averageResponseTime: 85,
        },
      };

      mockCalendarIntegration.getCacheMetrics.mockReturnValue(mockMetrics);

      const result = RealTimeAvailabilityService.getCacheMetrics();

      expect(result).toEqual(mockMetrics);
      expect(mockCalendarIntegration.getCacheMetrics).toHaveBeenCalled();
    });
  });

  /**
   * Regression: the next-available-date lookahead used to recurse without
   * bound.
   *
   * getAvailableSlots calls findNextAvailableDate when a day has no slots.
   * findNextAvailableDate then calls getAvailableSlots for each of the next 14
   * days — and those calls looked ahead too. With no availability anywhere the
   * work grew as 14^depth, so GET /api/public/booking/[id]/availability never
   * returned. Observed: no response after ten minutes against seeded data,
   * which meant the public booking page could not offer a single time slot.
   *
   * It only manifests when a day has ZERO availability, which is why clicking
   * through a working salon never surfaced it.
   */
  describe('next-available-date lookahead', () => {
    /** Counts day-level calculations, so runaway recursion is measurable. */
    function countDayCalculations() {
      let calls = 0;

      asMock(mockPrisma.business.findUnique).mockResolvedValue({
        id: businessId,
        bookingEnabled: true,
        onlineBooking: true,
      } as never);

      asMock(mockPrisma.service.findMany).mockImplementation((async () => {
        calls += 1;
        return [
          { id: 'service-1', duration: 30, price: 25, isActive: true },
          { id: 'service-2', duration: 30, price: 25, isActive: true },
        ];
      }) as never);

      // Staff MUST exist. Zero qualified staff returns early, before the
      // lookahead is even reached — so the runaway recursion only happens
      // when a salon has staff who simply have no free time that day. That
      // is the realistic case, and the one that hung in production.
      asMock(mockPrisma.staff.findMany).mockResolvedValue([
        {
          id: 'staff-1',
          firstName: 'Ada',
          lastName: 'Stylist',
          displayName: 'Ada',
          isActive: true,
          services: serviceIds.map(serviceId => ({ serviceId })),
        },
      ] as never);

      // Staff are available, but the calculator offers no bookable slots.
      mockAvailabilityCalculator.calculateAvailability.mockResolvedValue({
        availableSlots: [],
        totalSlots: 0,
        businessHours: null,
        staffAvailability: [],
        conflicts: [],
      } as never);

      return () => calls;
    }

    const MAX_LOOKAHEAD_DAYS = 14;

    it('does not recurse exponentially when no day has availability', async () => {
      // Measure one day's cost first, then the cost with lookahead enabled,
      // and compare. Asserting a ratio rather than a raw number keeps this
      // meaningful if the per-day query count ever changes — what matters is
      // "bounded by the number of days searched", not any specific total.
      const singleDay = countDayCalculations();
      await RealTimeAvailabilityService.getAvailableSlots({
        businessId,
        serviceIds,
        date: new Date('2026-08-01T00:00:00.000Z'),
        duration: 60,
        includeNextAvailableDate: false,
      });
      const perDayCost = singleDay();
      expect(perDayCost).toBeGreaterThan(0);

      const withLookahead = countDayCalculations();
      const result = await RealTimeAvailabilityService.getAvailableSlots({
        businessId,
        serviceIds,
        date: new Date('2026-08-01T00:00:00.000Z'),
        duration: 60,
      });

      expect(result.slots).toEqual([]);

      // The requested day plus at most 14 lookahead days. Before the fix each
      // searched day searched 14 more, so this grew as 14^depth and the
      // request never returned.
      expect(withLookahead()).toBeLessThanOrEqual(
        perDayCost * (MAX_LOOKAHEAD_DAYS + 1)
      );
    });

    it('performs no lookahead when the caller opts out', async () => {
      const withLookahead = countDayCalculations();
      await RealTimeAvailabilityService.getAvailableSlots({
        businessId,
        serviceIds,
        date: new Date('2026-08-01T00:00:00.000Z'),
        duration: 60,
      });
      const lookaheadCost = withLookahead();

      const optedOut = countDayCalculations();
      await RealTimeAvailabilityService.getAvailableSlots({
        businessId,
        serviceIds,
        date: new Date('2026-08-01T00:00:00.000Z'),
        duration: 60,
        includeNextAvailableDate: false,
      });

      // Opting out must cost strictly less — this is the flag the lookahead
      // sets on its own calls, and it is what breaks the recursion.
      expect(optedOut()).toBeLessThan(lookaheadCost);
    });

    it('returns promptly rather than hanging', async () => {
      countDayCalculations();
      const started = Date.now();

      await RealTimeAvailabilityService.getAvailableSlots({
        businessId,
        serviceIds,
        date: new Date('2026-08-01T00:00:00.000Z'),
        duration: 60,
      });

      // Generous, since this is wall-clock in CI. The point is the difference
      // between "a moment" and "never".
      expect(Date.now() - started).toBeLessThan(5_000);
    });
  });
});

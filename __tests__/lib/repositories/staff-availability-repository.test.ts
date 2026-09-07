import { prisma } from '@/lib/prisma';
import { StaffAvailabilityRepository } from '@/lib/repositories/staff-availability-repository';
import {
  DayOfWeek,
  StaffAvailability,
  StaffAvailabilityOverride,
} from '@prisma/client';
import { asMock } from '@/__tests__/utils/prisma-mock-helpers';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    staffAvailability: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    staffAvailabilityOverride: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('StaffAvailabilityRepository', () => {
  let repository: StaffAvailabilityRepository;
  const staffId = 'staff-123';
  const businessId = 'business-123';

  beforeEach(() => {
    repository = new StaffAvailabilityRepository();
    jest.clearAllMocks();
  });

  describe('getAvailability', () => {
    it('should return staff availability for date range', async () => {
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-01-21');

      const mockAvailability: StaffAvailability[] = [
        {
          id: 'avail-1',
          staffId,
          businessId,
          dayOfWeek: DayOfWeek.MONDAY,
          startTime: '09:00:00',
          endTime: '17:00:00',
          isRecurring: true,
          effectiveDate: null,
          expiryDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue(
        mockAvailability
      );

      const result = await repository.getAvailability(staffId, {
        start: startDate,
        end: endDate,
      });

      expect(mockPrisma.staffAvailability.findMany).toHaveBeenCalledWith({
        where: {
          staffId,
          OR: [
            { isRecurring: true },
            {
              isRecurring: false,
              effectiveDate: { gte: startDate },
              OR: [{ expiryDate: null }, { expiryDate: { lte: endDate } }],
            },
          ],
        },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });
      expect(result).toEqual(mockAvailability);
    });

    it('should return empty array when no availability found', async () => {
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-01-21');

      asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue([]);

      const result = await repository.getStaffAvailability(
        staffId,
        startDate,
        endDate
      );

      expect(result).toEqual([]);
    });
  });

  describe('setStaffAvailability', () => {
    it('should create new staff availability', async () => {
      const availabilityData = {
        dayOfWeek: DayOfWeek.MONDAY,
        startTime: '09:00:00',
        endTime: '17:00:00',
        isRecurring: true,
      };

      const mockCreatedAvailability: StaffAvailability = {
        id: 'avail-1',
        staffId,
        businessId,
        ...availabilityData,
        effectiveDate: null,
        expiryDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      asMock(mockPrisma.staffAvailability.create).mockResolvedValue(
        mockCreatedAvailability
      );

      const result = await repository.setStaffAvailability(
        staffId,
        businessId,
        availabilityData
      );

      expect(mockPrisma.staffAvailability.create).toHaveBeenCalledWith({
        data: {
          staffId,
          businessId,
          ...availabilityData,
        },
      });
      expect(result).toEqual(mockCreatedAvailability);
    });

    it('should handle non-recurring availability with dates', async () => {
      const availabilityData = {
        dayOfWeek: DayOfWeek.FRIDAY,
        startTime: '10:00:00',
        endTime: '16:00:00',
        isRecurring: false,
        effectiveDate: new Date('2024-01-19'),
        expiryDate: new Date('2024-01-19'),
      };

      const mockCreatedAvailability: StaffAvailability = {
        id: 'avail-1',
        staffId,
        businessId,
        ...availabilityData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      asMock(mockPrisma.staffAvailability.create).mockResolvedValue(
        mockCreatedAvailability
      );

      const result = await repository.setStaffAvailability(
        staffId,
        businessId,
        availabilityData
      );

      expect(result.isRecurring).toBe(false);
      expect(result.effectiveDate).toEqual(availabilityData.effectiveDate);
      expect(result.expiryDate).toEqual(availabilityData.expiryDate);
    });
  });

  describe('setRecurringAvailability', () => {
    it('should replace existing recurring availability', async () => {
      const recurringPattern = [
        {
          dayOfWeek: DayOfWeek.MONDAY,
          startTime: '09:00:00',
          endTime: '17:00:00',
        },
        {
          dayOfWeek: DayOfWeek.TUESDAY,
          startTime: '09:00:00',
          endTime: '17:00:00',
        },
      ];

      const mockCreatedAvailability: StaffAvailability[] = recurringPattern.map(
        (pattern, index) => ({
          id: `avail-${index + 1}`,
          staffId,
          businessId,
          ...pattern,
          isRecurring: true,
          effectiveDate: null,
          expiryDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      );

      asMock(mockPrisma.staffAvailability.deleteMany).mockResolvedValue({
        count: 2,
      });
      mockPrisma.staffAvailability.create
        .mockResolvedValueOnce(mockCreatedAvailability[0])
        .mockResolvedValueOnce(mockCreatedAvailability[1]);

      const result = await repository.setRecurringAvailability(
        staffId,
        businessId,
        recurringPattern
      );

      expect(mockPrisma.staffAvailability.deleteMany).toHaveBeenCalledWith({
        where: {
          staffId,
          isRecurring: true,
        },
      });
      expect(mockPrisma.staffAvailability.create).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockCreatedAvailability);
    });
  });

  describe('overrideAvailability', () => {
    it('should create availability override', async () => {
      const overrideData = {
        date: new Date('2024-01-15'),
        startTime: '10:00:00',
        endTime: '16:00:00',
        isAvailable: true,
        reason: 'Late start',
      };

      const mockOverride: StaffAvailabilityOverride = {
        id: 'override-1',
        staffId,
        businessId,
        ...overrideData,
        createdAt: new Date(),
      };

      asMock(mockPrisma.staffAvailabilityOverride.upsert).mockResolvedValue(
        mockOverride
      );

      const result = await repository.overrideAvailability(
        staffId,
        businessId,
        overrideData
      );

      expect(mockPrisma.staffAvailabilityOverride.upsert).toHaveBeenCalledWith({
        where: {
          staffId_date: {
            staffId,
            date: overrideData.date,
          },
        },
        update: {
          startTime: overrideData.startTime,
          endTime: overrideData.endTime,
          isAvailable: overrideData.isAvailable,
          reason: overrideData.reason,
        },
        create: {
          staffId,
          businessId,
          ...overrideData,
        },
      });
      expect(result).toEqual(mockOverride);
    });

    it('should create unavailable override', async () => {
      const overrideData = {
        date: new Date('2024-01-15'),
        startTime: null,
        endTime: null,
        isAvailable: false,
        reason: 'Sick day',
      };

      const mockOverride: StaffAvailabilityOverride = {
        id: 'override-1',
        staffId,
        businessId,
        date: overrideData.date,
        startTime: null,
        endTime: null,
        isAvailable: false,
        reason: 'Sick day',
        createdAt: new Date(),
      };

      asMock(mockPrisma.staffAvailabilityOverride.upsert).mockResolvedValue(
        mockOverride
      );

      const result = await repository.overrideAvailability(
        staffId,
        businessId,
        overrideData
      );

      expect(result.isAvailable).toBe(false);
      expect(result.startTime).toBeNull();
      expect(result.endTime).toBeNull();
    });
  });

  describe('getAvailabilityOverrides', () => {
    it('should return overrides for date range', async () => {
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-01-21');

      const mockOverrides: StaffAvailabilityOverride[] = [
        {
          id: 'override-1',
          staffId,
          businessId,
          date: new Date('2024-01-16'),
          startTime: '10:00:00',
          endTime: '16:00:00',
          isAvailable: true,
          reason: 'Late start',
          createdAt: new Date(),
        },
      ];

      asMock(mockPrisma.staffAvailabilityOverride.findMany).mockResolvedValue(
        mockOverrides
      );

      const result = await repository.getAvailabilityOverrides(
        staffId,
        startDate,
        endDate
      );

      expect(
        mockPrisma.staffAvailabilityOverride.findMany
      ).toHaveBeenCalledWith({
        where: {
          staffId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { date: 'asc' },
      });
      expect(result).toEqual(mockOverrides);
    });
  });

  describe('getAvailableStaff', () => {
    it('should return staff available at specific time', async () => {
      const dateTime = new Date('2024-01-15T10:00:00Z'); // Monday 10 AM
      const serviceDuration = 60; // 1 hour

      const mockAvailability: StaffAvailability[] = [
        {
          id: 'avail-1',
          staffId: 'staff-1',
          businessId,
          dayOfWeek: DayOfWeek.MONDAY,
          startTime: '09:00:00',
          endTime: '17:00:00',
          isRecurring: true,
          effectiveDate: null,
          expiryDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue(
        mockAvailability
      );
      asMock(mockPrisma.staffAvailabilityOverride.findMany).mockResolvedValue(
        []
      );

      const result = await repository.getAvailableStaff(
        businessId,
        dateTime,
        serviceDuration
      );

      expect(result).toHaveLength(1);
      expect(result[0].staffId).toBe('staff-1');
    });

    it('should exclude staff with overrides that make them unavailable', async () => {
      const dateTime = new Date('2024-01-15T10:00:00Z');
      const serviceDuration = 60;

      const mockAvailability: StaffAvailability[] = [
        {
          id: 'avail-1',
          staffId: 'staff-1',
          businessId,
          dayOfWeek: DayOfWeek.MONDAY,
          startTime: '09:00:00',
          endTime: '17:00:00',
          isRecurring: true,
          effectiveDate: null,
          expiryDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockOverrides: StaffAvailabilityOverride[] = [
        {
          id: 'override-1',
          staffId: 'staff-1',
          businessId,
          date: new Date('2024-01-15'),
          startTime: null,
          endTime: null,
          isAvailable: false,
          reason: 'Sick day',
          createdAt: new Date(),
        },
      ];

      asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue(
        mockAvailability
      );
      asMock(mockPrisma.staffAvailabilityOverride.findMany).mockResolvedValue(
        mockOverrides
      );

      const result = await repository.getAvailableStaff(
        businessId,
        dateTime,
        serviceDuration
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('validateAvailability', () => {
    it('should return true for valid availability time', async () => {
      const startTime = new Date('2024-01-15T10:00:00Z');
      const endTime = new Date('2024-01-15T11:00:00Z');

      const mockAvailability: StaffAvailability = {
        id: 'avail-1',
        staffId,
        businessId,
        dayOfWeek: DayOfWeek.MONDAY,
        startTime: '09:00:00',
        endTime: '17:00:00',
        isRecurring: true,
        effectiveDate: null,
        expiryDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      asMock(mockPrisma.staffAvailability.findFirst).mockResolvedValue(
        mockAvailability
      );
      asMock(mockPrisma.staffAvailabilityOverride.findFirst).mockResolvedValue(
        null
      );

      const result = await repository.validateAvailability(
        staffId,
        startTime,
        endTime
      );

      expect(result).toBe(true);
    });

    it('should return false for invalid availability time', async () => {
      const startTime = new Date('2024-01-15T08:00:00Z'); // Before availability
      const endTime = new Date('2024-01-15T09:00:00Z');

      const mockAvailability: StaffAvailability = {
        id: 'avail-1',
        staffId,
        businessId,
        dayOfWeek: DayOfWeek.MONDAY,
        startTime: '09:00:00',
        endTime: '17:00:00',
        isRecurring: true,
        effectiveDate: null,
        expiryDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      asMock(mockPrisma.staffAvailability.findFirst).mockResolvedValue(
        mockAvailability
      );

      const result = await repository.validateAvailability(
        staffId,
        startTime,
        endTime
      );

      expect(result).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-01-21');

      asMock(mockPrisma.staffAvailability.findMany).mockRejectedValue(
        new Error('Database error')
      );

      await expect(
        repository.getStaffAvailability(staffId, startDate, endDate)
      ).rejects.toThrow('Database error');
    });

    it('should validate required parameters', async () => {
      await expect(
        repository.getStaffAvailability('', new Date(), new Date())
      ).rejects.toThrow();
    });

    it('should validate time ranges', async () => {
      const invalidStartDate = new Date('2024-01-21');
      const invalidEndDate = new Date('2024-01-15'); // End before start

      await expect(
        repository.getStaffAvailability(
          staffId,
          invalidStartDate,
          invalidEndDate
        )
      ).rejects.toThrow();
    });
  });
});

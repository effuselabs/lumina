/**
 * Staff Factory Tests
 */

import { PrismaClient } from '@prisma/client';
import { DEFAULT_SEED_CONFIG } from './seed-config';
import { StaffFactory } from './staff-factory';

// Mock faker to avoid ES module issues
jest.mock('@faker-js/faker', () => ({
  faker: {
    person: {
      firstName: () => 'John',
      lastName: () => 'Doe',
    },
    helpers: {
      arrayElement: (arr: any[]) => arr[0],
      arrayElements: (arr: any[], count: number) => arr.slice(0, count),
    },
    number: {
      int: ({ min, max }: { min: number; max: number }) => min,
      float: ({ min, max }: { min: number; max: number }) => min,
    },
    datatype: {
      boolean: (probability?: number) =>
        probability ? probability > 0.5 : true,
    },
    location: {
      streetAddress: () => '123 Main St',
      city: () => 'Test City',
      state: () => 'TS',
      zipCode: () => '12345',
    },
    phone: {
      number: () => '555-0123',
    },
    date: {
      between: () => new Date('2023-01-01'),
    },
  },
}));

// Mock Prisma Client
const mockPrisma = {
  user: {
    create: jest.fn(),
  },
  staff: {
    create: jest.fn(),
  },
} as unknown as PrismaClient;

describe('StaffFactory', () => {
  let staffFactory: StaffFactory;
  const businessId = 'test-business-id';
  const specialties = DEFAULT_SEED_CONFIG.staff.specialties;

  beforeEach(() => {
    staffFactory = new StaffFactory(mockPrisma, businessId, specialties);
    jest.clearAllMocks();
  });

  describe('generate', () => {
    it('should create a staff member with commission employment type', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
      };
      const mockStaff = {
        id: 'staff-1',
        businessId,
        userId: 'user-1',
        displayName: 'Test User',
        employmentType: 'COMMISSION',
        commissionRate: 55,
      };

      (mockPrisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (mockPrisma.staff.create as jest.Mock).mockResolvedValue(mockStaff);

      const result = await staffFactory.generate({
        employmentType: 'COMMISSION',
        experienceLevel: 'SENIOR',
      });

      expect(result).toEqual(mockStaff);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: expect.stringContaining('@'),
          name: expect.any(String),
          role: 'STAFF',
        }),
      });
      expect(mockPrisma.staff.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          businessId,
          userId: 'user-1',
          displayName: expect.any(String),
          title: expect.any(String),
          employmentType: 'COMMISSION',
          commissionRate: expect.any(Number),
          isActive: true,
          acceptsOnlineBookings: true,
        }),
      });
    });

    it('should create a staff member with chair rental employment type', async () => {
      const mockUser = {
        id: 'user-2',
        email: 'test2@example.com',
        name: 'Test User 2',
      };
      const mockStaff = {
        id: 'staff-2',
        businessId,
        userId: 'user-2',
        displayName: 'Test User 2',
        employmentType: 'CHAIR_RENTAL',
        chairRentalAmount: 200,
      };

      (mockPrisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (mockPrisma.staff.create as jest.Mock).mockResolvedValue(mockStaff);

      const result = await staffFactory.generate({
        employmentType: 'CHAIR_RENTAL',
        experienceLevel: 'SENIOR',
      });

      expect(result).toEqual(mockStaff);
      expect(mockPrisma.staff.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          employmentType: 'CHAIR_RENTAL',
          chairRentalAmount: expect.any(Number),
          chairRentalPeriod: expect.any(String),
        }),
      });
    });

    it('should create a staff member with hybrid employment type', async () => {
      const mockUser = {
        id: 'user-3',
        email: 'test3@example.com',
        name: 'Test User 3',
      };
      const mockStaff = {
        id: 'staff-3',
        businessId,
        userId: 'user-3',
        displayName: 'Test User 3',
        employmentType: 'HYBRID',
        commissionRate: 45,
        chairRentalAmount: 150,
      };

      (mockPrisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (mockPrisma.staff.create as jest.Mock).mockResolvedValue(mockStaff);

      const result = await staffFactory.generate({
        employmentType: 'HYBRID',
        experienceLevel: 'MASTER',
      });

      expect(result).toEqual(mockStaff);
      expect(mockPrisma.staff.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          employmentType: 'HYBRID',
          commissionRate: expect.any(Number),
          chairRentalAmount: expect.any(Number),
          chairRentalPeriod: expect.any(String),
        }),
      });
    });

    it('should generate realistic working hours', async () => {
      const mockUser = {
        id: 'user-5',
        email: 'test5@example.com',
        name: 'Test User 5',
      };
      const mockStaff = { id: 'staff-5', businessId, userId: 'user-5' };

      (mockPrisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (mockPrisma.staff.create as jest.Mock).mockResolvedValue(mockStaff);

      await staffFactory.generate();

      const createCall = (mockPrisma.staff.create as jest.Mock).mock
        .calls[0][0];
      const workingHours = createCall.data.workingHours;

      expect(workingHours).toBeDefined();
      expect(typeof workingHours).toBe('object');

      // Should have at least one working day
      const workingDays = Object.keys(workingHours);
      expect(workingDays.length).toBeGreaterThan(0);

      // Each working day should have valid time format
      workingDays.forEach(day => {
        const schedule = workingHours[day];
        expect(schedule.startTime).toMatch(/^\d{2}:\d{2}$/);
        expect(schedule.endTime).toMatch(/^\d{2}:\d{2}$/);
      });
    });

    it('should validate staff data correctly', async () => {
      const mockUser = {
        id: 'user-6',
        email: 'test6@example.com',
        name: 'Test User 6',
      };

      (mockPrisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      // Should throw error for invalid data
      const invalidStaffFactory = new (class extends StaffFactory {
        protected override validate() {
          return {
            isValid: false,
            errors: [{ field: 'test', message: 'Test error', code: 'TEST' }],
            warnings: [],
          };
        }
      })(mockPrisma, businessId, specialties);

      await expect(invalidStaffFactory.generate()).rejects.toThrow(
        'Staff validation failed: Test error'
      );
    });
  });

  describe('generateBatch', () => {
    it('should generate multiple staff members', async () => {
      const mockUser = {
        id: 'user-batch',
        email: 'batch@example.com',
        name: 'Batch User',
      };
      const mockStaff = { id: 'staff-batch', businessId, userId: 'user-batch' };

      (mockPrisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (mockPrisma.staff.create as jest.Mock).mockResolvedValue(mockStaff);

      const results = await staffFactory.generateBatch(3);

      expect(results).toHaveLength(3);
      expect(mockPrisma.user.create).toHaveBeenCalledTimes(3);
      expect(mockPrisma.staff.create).toHaveBeenCalledTimes(3);
    });

    it('should handle batch processing with progress callback', async () => {
      const mockUser = {
        id: 'user-progress',
        email: 'progress@example.com',
        name: 'Progress User',
      };
      const mockStaff = {
        id: 'staff-progress',
        businessId,
        userId: 'user-progress',
      };

      (mockPrisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (mockPrisma.staff.create as jest.Mock).mockResolvedValue(mockStaff);

      const progressCallback = jest.fn();

      await staffFactory.generateBatch(
        2,
        {},
        {
          batchSize: 1,
          maxConcurrency: 1,
          progressCallback,
        }
      );

      expect(progressCallback).toHaveBeenCalledWith(1, 2);
      expect(progressCallback).toHaveBeenCalledWith(2, 2);
    });
  });

  describe('employment type distribution', () => {
    it('should respect specialty employment type preferences', async () => {
      const mockUser = {
        id: 'user-specialty',
        email: 'specialty@example.com',
        name: 'Specialty User',
      };
      const mockStaff = {
        id: 'staff-specialty',
        businessId,
        userId: 'user-specialty',
      };

      (mockPrisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (mockPrisma.staff.create as jest.Mock).mockResolvedValue(mockStaff);

      // Find a chair rental specialty
      const chairRentalSpecialty = specialties.find(
        s => s.employmentType === 'CHAIR_RENTAL'
      );

      if (chairRentalSpecialty) {
        await staffFactory.generate({ specialty: chairRentalSpecialty });

        expect(mockPrisma.staff.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            employmentType: 'CHAIR_RENTAL',
            chairRentalAmount: expect.any(Number),
          }),
        });
      }
    });
  });
});

import { prisma } from '@/lib/prisma';
import {
  MultiServiceBooking,
  ServiceDurationValidator,
  TimeSlot,
} from '@/lib/services/service-duration-validator';
import { asMock } from '@/__tests__/utils/prisma-mock-helpers';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    staffService: {
      findUnique: jest.fn(),
    },
    service: {
      findUnique: jest.fn(),
    },
    businessHours: {
      findUnique: jest.fn(),
    },
    business: {
      findUnique: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('ServiceDurationValidator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateServiceFit', () => {
    it('should validate that a 30-minute service fits in a 60-minute slot', async () => {
      // Mock service duration
      asMock(mockPrisma.service.findUnique).mockResolvedValue({
        id: 'service-1',
        duration: 30,
        name: 'Haircut',
      } as any);

      const timeSlot: TimeSlot = {
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T11:00:00Z'),
        staffId: 'staff-1',
      };

      const result = await ServiceDurationValidator.validateServiceFit(
        'service-1',
        timeSlot,
        'business-1',
        'staff-1'
      );

      expect(result.isValid).toBe(true);
      expect(result.requiredDuration).toBe(30);
      expect(result.availableDuration).toBe(60);
    });

    it('should reject a 120-minute service in a 60-minute slot', async () => {
      asMock(mockPrisma.service.findUnique).mockResolvedValue({
        id: 'service-2',
        duration: 120,
        name: 'Color Treatment',
      } as any);

      const timeSlot: TimeSlot = {
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T11:00:00Z'),
        staffId: 'staff-1',
      };

      const result = await ServiceDurationValidator.validateServiceFit(
        'service-2',
        timeSlot,
        'business-1',
        'staff-1'
      );

      expect(result.isValid).toBe(false);
      expect(result.requiredDuration).toBe(120);
      expect(result.availableDuration).toBe(60);
      expect(result.reason).toContain(
        'Service requires 120 minutes but only 60 minutes available'
      );
    });

    it('should use staff custom duration when available', async () => {
      asMock(mockPrisma.staffService.findUnique).mockResolvedValue({
        staffId: 'staff-1',
        serviceId: 'service-1',
        customDuration: 45,
        service: {
          duration: 30,
          name: 'Haircut',
        },
      } as any);

      const timeSlot: TimeSlot = {
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T11:00:00Z'),
        staffId: 'staff-1',
      };

      const result = await ServiceDurationValidator.validateServiceFit(
        'service-1',
        timeSlot,
        'business-1',
        'staff-1'
      );

      expect(result.isValid).toBe(true);
      expect(result.requiredDuration).toBe(45); // Uses custom duration
    });

    it('should handle service not found', async () => {
      asMock(mockPrisma.staffService.findUnique).mockResolvedValue(null);
      asMock(mockPrisma.service.findUnique).mockResolvedValue(null);

      const timeSlot: TimeSlot = {
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T11:00:00Z'),
        staffId: 'staff-1',
      };

      const result = await ServiceDurationValidator.validateServiceFit(
        'nonexistent-service',
        timeSlot,
        'business-1',
        'staff-1'
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Service not found');
    });
  });

  describe('getMinimumSlotDuration', () => {
    it('should calculate total duration for multiple services', async () => {
      asMock(mockPrisma.service.findUnique)
        .mockResolvedValueOnce({
          id: 'service-1',
          duration: 30,
          name: 'Haircut',
        } as any)
        .mockResolvedValueOnce({
          id: 'service-2',
          duration: 60,
          name: 'Color',
        } as any);

      const services: MultiServiceBooking[] = [
        { serviceId: 'service-1' },
        { serviceId: 'service-2' },
      ];

      const totalDuration =
        await ServiceDurationValidator.getMinimumSlotDuration(
          services,
          'business-1'
        );

      expect(totalDuration).toBe(90); // 30 + 60
    });

    it('should use custom duration when provided', async () => {
      asMock(mockPrisma.service.findUnique).mockResolvedValue({
        id: 'service-1',
        duration: 30,
        name: 'Haircut',
      } as any);

      const services: MultiServiceBooking[] = [
        { serviceId: 'service-1', customDuration: 45 },
      ];

      const totalDuration =
        await ServiceDurationValidator.getMinimumSlotDuration(
          services,
          'business-1'
        );

      expect(totalDuration).toBe(45); // Uses custom duration
    });

    it('should throw error for nonexistent service', async () => {
      asMock(mockPrisma.service.findUnique).mockResolvedValue(null);

      const services: MultiServiceBooking[] = [
        { serviceId: 'nonexistent-service' },
      ];

      await expect(
        ServiceDurationValidator.getMinimumSlotDuration(services, 'business-1')
      ).rejects.toThrow('Service nonexistent-service not found');
    });
  });

  describe('validateMultiServiceBooking', () => {
    it('should validate multi-service booking fits in time slot', async () => {
      asMock(mockPrisma.service.findUnique)
        .mockResolvedValueOnce({
          id: 'service-1',
          duration: 30,
          name: 'Haircut',
        } as any)
        .mockResolvedValueOnce({
          id: 'service-2',
          duration: 45,
          name: 'Styling',
        } as any);

      const services: MultiServiceBooking[] = [
        { serviceId: 'service-1' },
        { serviceId: 'service-2' },
      ];

      const timeSlot: TimeSlot = {
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T12:00:00Z'), // 120 minutes
        staffId: 'staff-1',
      };

      const result = await ServiceDurationValidator.validateMultiServiceBooking(
        services,
        timeSlot,
        'business-1'
      );

      expect(result.isValid).toBe(true);
      expect(result.requiredDuration).toBe(75); // 30 + 45
      expect(result.availableDuration).toBe(120);
    });

    it('should reject multi-service booking that exceeds time slot', async () => {
      asMock(mockPrisma.service.findUnique)
        .mockResolvedValueOnce({
          id: 'service-1',
          duration: 60,
          name: 'Color',
        } as any)
        .mockResolvedValueOnce({
          id: 'service-2',
          duration: 90,
          name: 'Perm',
        } as any);

      const services: MultiServiceBooking[] = [
        { serviceId: 'service-1' },
        { serviceId: 'service-2' },
      ];

      const timeSlot: TimeSlot = {
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T12:00:00Z'), // 120 minutes
        staffId: 'staff-1',
      };

      const result = await ServiceDurationValidator.validateMultiServiceBooking(
        services,
        timeSlot,
        'business-1'
      );

      expect(result.isValid).toBe(false);
      expect(result.requiredDuration).toBe(150); // 60 + 90
      expect(result.availableDuration).toBe(120);
      expect(result.reason).toContain(
        'Multi-service booking requires 150 minutes but only 120 minutes available'
      );
    });
  });

  describe('edge cases', () => {
    it('should handle exact duration match', async () => {
      asMock(mockPrisma.service.findUnique).mockResolvedValue({
        id: 'service-1',
        duration: 60,
        name: 'Haircut',
      } as any);

      const timeSlot: TimeSlot = {
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T11:00:00Z'), // Exactly 60 minutes
        staffId: 'staff-1',
      };

      const result = await ServiceDurationValidator.validateServiceFit(
        'service-1',
        timeSlot,
        'business-1',
        'staff-1'
      );

      expect(result.isValid).toBe(true);
      expect(result.requiredDuration).toBe(60);
      expect(result.availableDuration).toBe(60);
    });

    it('should handle very short time slots', async () => {
      asMock(mockPrisma.service.findUnique).mockResolvedValue({
        id: 'service-1',
        duration: 30,
        name: 'Quick Service',
      } as any);

      const timeSlot: TimeSlot = {
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T10:15:00Z'), // Only 15 minutes
        staffId: 'staff-1',
      };

      const result = await ServiceDurationValidator.validateServiceFit(
        'service-1',
        timeSlot,
        'business-1',
        'staff-1'
      );

      expect(result.isValid).toBe(false);
      expect(result.availableDuration).toBe(15);
    });
  });
});

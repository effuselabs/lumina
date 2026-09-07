/**
 * Time Zone Aware Availability Calculator Tests
 *
 * Tests for timezone-aware availability calculations
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { DateTime } from 'luxon';
import { BusinessHoursRepository } from '../../../lib/repositories/business-hours-repository-enhanced';
import { StaffAvailabilityRepository } from '../../../lib/repositories/staff-availability-repository-enhanced';
import { AvailabilityCalculator } from '../../../lib/services/availability-calculator';
import {
  MultiLocationAvailabilityManager,
  TimeZoneAwareAvailabilityCalculator,
  TimeZoneAwareAvailabilityRequest,
  TimeZoneAwareTimeSlot,
} from '../../../lib/services/timezone-aware-availability';
import { MultiLocationTimeZoneManager } from '../../../lib/services/timezone-handler';

// Mock dependencies
jest.mock('../../../lib/services/availability-calculator');
jest.mock('../../../lib/repositories/business-hours-repository-enhanced');
jest.mock('../../../lib/repositories/staff-availability-repository-enhanced');

const mockAvailabilityCalculator = jest.mocked(AvailabilityCalculator);
const mockBusinessHoursRepo = jest.mocked(BusinessHoursRepository);
const mockStaffAvailabilityRepo = jest.mocked(StaffAvailabilityRepository);

describe('TimeZoneAwareAvailabilityCalculator', () => {
  let calculator: TimeZoneAwareAvailabilityCalculator;
  let mockAvailabilityCalc: jest.Mocked<AvailabilityCalculator>;
  let mockBusinessRepo: jest.Mocked<BusinessHoursRepository>;
  let mockStaffRepo: jest.Mocked<StaffAvailabilityRepository>;

  beforeEach(() => {
    mockAvailabilityCalc =
      new mockAvailabilityCalculator() as jest.Mocked<AvailabilityCalculator>;
    mockBusinessRepo =
      new mockBusinessHoursRepo() as jest.Mocked<BusinessHoursRepository>;
    mockStaffRepo =
      new mockStaffAvailabilityRepo() as jest.Mocked<StaffAvailabilityRepository>;

    calculator = new TimeZoneAwareAvailabilityCalculator(
      mockAvailabilityCalc,
      mockBusinessRepo,
      mockStaffRepo
    );

    // Setup default mocks
    mockBusinessRepo.getBusinessHours.mockResolvedValue({
      id: 'hours-1',
      businessId: 'business-1',
      dayOfWeek: 1,
      openTime: '09:00',
      closeTime: '17:00',
      isClosed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockStaffRepo.getStaffAvailability.mockResolvedValue([
      {
        id: 'avail-1',
        staffId: 'staff-1',
        businessId: 'business-1',
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00',
        isRecurring: true,
        effectiveDate: null,
        expiryDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  });

  describe('getAvailableSlots', () => {
    it('should return timezone-aware slots', async () => {
      const request: TimeZoneAwareAvailabilityRequest = {
        businessId: 'business-1',
        staffId: 'staff-1',
        date: '2024-07-15',
        timezone: 'Europe/London',
      };

      // Mock base availability slots
      mockAvailabilityCalc.getAvailableSlots.mockResolvedValue([
        {
          startTime: '09:00',
          endTime: '10:00',
          staffId: 'staff-1',
          isAvailable: true,
        },
        {
          startTime: '14:00',
          endTime: '15:00',
          staffId: 'staff-1',
          isAvailable: true,
        },
      ]);

      const slots = await calculator.getAvailableSlots(request);

      expect(slots).toHaveLength(2);
      expect(slots[0]).toMatchObject({
        businessTimezone: 'America/New_York',
        displayTimezone: 'Europe/London',
        duration: 60,
      });
      expect(slots[0].utcStart).toBeInstanceOf(DateTime);
      expect(slots[0].utcEnd).toBeInstanceOf(DateTime);
    });

    it('should handle invalid timezone', async () => {
      const request: TimeZoneAwareAvailabilityRequest = {
        businessId: 'business-1',
        date: '2024-07-15',
        timezone: 'Invalid/Timezone',
      };

      await expect(calculator.getAvailableSlots(request)).rejects.toThrow(
        'Invalid timezone: Invalid/Timezone'
      );
    });

    it('should return empty array when business is closed', async () => {
      mockBusinessRepo.getBusinessHours.mockResolvedValue({
        id: 'hours-1',
        businessId: 'business-1',
        dayOfWeek: 1,
        openTime: null,
        closeTime: null,
        isClosed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request: TimeZoneAwareAvailabilityRequest = {
        businessId: 'business-1',
        date: '2024-07-15',
        timezone: 'America/New_York',
      };

      const slots = await calculator.getAvailableSlots(request);
      expect(slots).toHaveLength(0);
    });

    it('should handle DST transitions in slots', async () => {
      const request: TimeZoneAwareAvailabilityRequest = {
        businessId: 'business-1',
        date: '2024-03-10', // DST transition date
        timezone: 'America/New_York',
      };

      mockAvailabilityCalc.getAvailableSlots.mockResolvedValue([
        {
          startTime: '01:30',
          endTime: '03:30',
          staffId: 'staff-1',
          isAvailable: true,
        },
      ]);

      const slots = await calculator.getAvailableSlots(request);

      expect(slots).toHaveLength(1);
      expect(slots[0].isDSTTransition).toBe(true);
      expect(slots[0].dstWarning).toContain('DST transition detected');
    });
  });

  describe('validateAppointmentTime', () => {
    it('should validate appointment time successfully', async () => {
      const result = await calculator.validateAppointmentTime(
        'business-1',
        'staff-1',
        '10:00',
        '11:00',
        '2024-07-15',
        'America/New_York'
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.utcStart).toBeInstanceOf(DateTime);
      expect(result.utcEnd).toBeInstanceOf(DateTime);
    });

    it('should reject invalid client timezone', async () => {
      const result = await calculator.validateAppointmentTime(
        'business-1',
        'staff-1',
        '10:00',
        '11:00',
        '2024-07-15',
        'Invalid/Timezone'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Invalid client timezone: Invalid/Timezone'
      );
    });

    it('should detect appointment outside business hours', async () => {
      const result = await calculator.validateAppointmentTime(
        'business-1',
        'staff-1',
        '08:00', // Before business opens at 09:00
        '09:00',
        '2024-07-15',
        'America/New_York'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Appointment starts before business opens'
      );
    });

    it('should detect appointment when business is closed', async () => {
      mockBusinessRepo.getBusinessHours.mockResolvedValue({
        id: 'hours-1',
        businessId: 'business-1',
        dayOfWeek: 1,
        openTime: null,
        closeTime: null,
        isClosed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await calculator.validateAppointmentTime(
        'business-1',
        'staff-1',
        '10:00',
        '11:00',
        '2024-07-15',
        'America/New_York'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Business is closed on this date');
    });

    it('should detect appointment outside staff availability', async () => {
      mockStaffRepo.getStaffAvailability.mockResolvedValue([]);

      const result = await calculator.validateAppointmentTime(
        'business-1',
        'staff-1',
        '10:00',
        '11:00',
        '2024-07-15',
        'America/New_York'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Staff member is not available on this date'
      );
    });

    it('should warn about DST transitions', async () => {
      const result = await calculator.validateAppointmentTime(
        'business-1',
        'staff-1',
        '01:30',
        '03:30',
        '2024-03-10', // DST transition date
        'America/New_York'
      );

      expect(result.warnings).toContain(
        expect.stringContaining('Appointment time falls on DST transition')
      );
    });

    it('should handle invalid times during DST gap', async () => {
      const result = await calculator.validateAppointmentTime(
        'business-1',
        'staff-1',
        '02:30', // This time doesn't exist on DST transition
        '03:30',
        '2024-03-10',
        'America/New_York'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        expect.stringContaining('Invalid appointment start time in timezone')
      );
    });
  });

  describe('convertToTimeZoneAware', () => {
    it('should convert existing slots to timezone-aware format', async () => {
      const existingSlots = [
        { startTime: '09:00', endTime: '10:00', date: '2024-07-15' },
        { startTime: '14:00', endTime: '15:00', date: '2024-07-15' },
      ];

      const timeZoneAwareSlots = await calculator.convertToTimeZoneAware(
        'business-1',
        existingSlots,
        'Europe/London'
      );

      expect(timeZoneAwareSlots).toHaveLength(2);
      expect(timeZoneAwareSlots[0]).toMatchObject({
        businessTimezone: 'America/New_York',
        displayTimezone: 'Europe/London',
        duration: 60,
      });
    });

    it('should handle conversion errors gracefully', async () => {
      const existingSlots = [
        { startTime: '25:00', endTime: '26:00', date: '2024-07-15' }, // Invalid time
      ];

      const timeZoneAwareSlots = await calculator.convertToTimeZoneAware(
        'business-1',
        existingSlots,
        'Europe/London'
      );

      expect(timeZoneAwareSlots).toHaveLength(0); // Invalid slots should be filtered out
    });
  });
});

describe('MultiLocationAvailabilityManager', () => {
  let manager: MultiLocationAvailabilityManager;
  let mockTimeZoneManager: MultiLocationTimeZoneManager;
  let mockCalculator: TimeZoneAwareAvailabilityCalculator;

  beforeEach(() => {
    const config = {
      businessId: 'business-1',
      timezone: 'America/New_York',
      locations: [
        { id: 'location-1', name: 'NYC', timezone: 'America/New_York' },
        { id: 'location-2', name: 'LA', timezone: 'America/Los_Angeles' },
      ],
    };

    mockTimeZoneManager = new MultiLocationTimeZoneManager(config);
    mockCalculator = {
      getAvailableSlots: jest.fn(),
      validateAppointmentTime: jest.fn(),
      convertToTimeZoneAware: jest.fn(),
    } as any;

    manager = new MultiLocationAvailabilityManager(
      mockTimeZoneManager,
      mockCalculator
    );
  });

  describe('getAvailabilityAllLocations', () => {
    it('should get availability for all locations', async () => {
      const mockSlots: TimeZoneAwareTimeSlot[] = [
        {
          utcStart: DateTime.fromISO('2024-07-15T13:00:00Z'),
          utcEnd: DateTime.fromISO('2024-07-15T14:00:00Z'),
          localStart: '09:00',
          localEnd: '10:00',
          localDate: '2024-07-15',
          businessTimezone: 'America/New_York',
          displayTimezone: 'America/New_York',
          duration: 60,
        },
      ];

      (mockCalculator.getAvailableSlots as jest.Mock).mockResolvedValue(
        mockSlots
      );

      const result = await manager.getAvailabilityAllLocations(
        'business-1',
        '2024-07-15',
        'America/New_York'
      );

      expect(result).toHaveLength(2);
      expect(result[0].locationId).toBe('location-1');
      expect(result[0].locationTimezone).toBe('America/New_York');
      expect(result[0].slots).toEqual(mockSlots);
      expect(result[1].locationId).toBe('location-2');
      expect(result[1].locationTimezone).toBe('America/Los_Angeles');
    });

    it('should handle errors for individual locations', async () => {
      (mockCalculator.getAvailableSlots as jest.Mock)
        .mockResolvedValueOnce([]) // Success for first location
        .mockRejectedValueOnce(new Error('Location error')); // Error for second location

      const result = await manager.getAvailabilityAllLocations(
        'business-1',
        '2024-07-15',
        'America/New_York'
      );

      expect(result).toHaveLength(2);
      expect(result[0].slots).toEqual([]);
      expect(result[1].slots).toEqual([]); // Error should result in empty slots
    });
  });

  describe('findBestTimeAcrossLocations', () => {
    it('should find exact match across locations', async () => {
      const mockSlots: TimeZoneAwareTimeSlot[] = [
        {
          utcStart: DateTime.fromISO('2024-07-15T18:00:00Z'),
          utcEnd: DateTime.fromISO('2024-07-15T19:00:00Z'),
          localStart: '14:00',
          localEnd: '15:00',
          localDate: '2024-07-15',
          businessTimezone: 'America/New_York',
          displayTimezone: 'America/New_York',
          duration: 60,
        },
      ];

      (mockCalculator.getAvailableSlots as jest.Mock)
        .mockResolvedValueOnce([]) // No slots in first location
        .mockResolvedValueOnce(mockSlots); // Matching slot in second location

      const result = await manager.findBestTimeAcrossLocations(
        'business-1',
        '14:00',
        '2024-07-15',
        60,
        'America/New_York'
      );

      expect(result).not.toBeNull();
      expect(result!.locationId).toBe('location-2');
      expect(result!.isExactMatch).toBe(true);
      expect(result!.slot.localStart).toBe('14:00');
    });

    it('should find closest match when no exact match', async () => {
      const mockSlots: TimeZoneAwareTimeSlot[] = [
        {
          utcStart: DateTime.fromISO('2024-07-15T19:00:00Z'),
          utcEnd: DateTime.fromISO('2024-07-15T20:00:00Z'),
          localStart: '15:00', // 1 hour later than preferred 14:00
          localEnd: '16:00',
          localDate: '2024-07-15',
          businessTimezone: 'America/New_York',
          displayTimezone: 'America/New_York',
          duration: 60,
        },
      ];

      (mockCalculator.getAvailableSlots as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(mockSlots);

      const result = await manager.findBestTimeAcrossLocations(
        'business-1',
        '14:00',
        '2024-07-15',
        60,
        'America/New_York'
      );

      expect(result).not.toBeNull();
      expect(result!.isExactMatch).toBe(false);
      expect(result!.slot.localStart).toBe('15:00');
    });

    it('should return null when no suitable slots found', async () => {
      const mockSlots: TimeZoneAwareTimeSlot[] = [
        {
          utcStart: DateTime.fromISO('2024-07-15T18:00:00Z'),
          utcEnd: DateTime.fromISO('2024-07-15T18:30:00Z'),
          localStart: '14:00',
          localEnd: '14:30',
          localDate: '2024-07-15',
          businessTimezone: 'America/New_York',
          displayTimezone: 'America/New_York',
          duration: 30, // Too short for requested 60 minutes
        },
      ];

      (mockCalculator.getAvailableSlots as jest.Mock).mockResolvedValue(
        mockSlots
      );

      const result = await manager.findBestTimeAcrossLocations(
        'business-1',
        '14:00',
        '2024-07-15',
        60, // Need 60 minutes but only 30 available
        'America/New_York'
      );

      expect(result).toBeNull();
    });

    it('should prefer earlier locations for equal time differences', async () => {
      const mockSlotsLocation1: TimeZoneAwareTimeSlot[] = [
        {
          utcStart: DateTime.fromISO('2024-07-15T19:00:00Z'),
          utcEnd: DateTime.fromISO('2024-07-15T20:00:00Z'),
          localStart: '15:00',
          localEnd: '16:00',
          localDate: '2024-07-15',
          businessTimezone: 'America/New_York',
          displayTimezone: 'America/New_York',
          duration: 60,
        },
      ];

      const mockSlotsLocation2: TimeZoneAwareTimeSlot[] = [
        {
          utcStart: DateTime.fromISO('2024-07-15T22:00:00Z'),
          utcEnd: DateTime.fromISO('2024-07-15T23:00:00Z'),
          localStart: '15:00', // Same local time, different UTC
          localEnd: '16:00',
          localDate: '2024-07-15',
          businessTimezone: 'America/Los_Angeles',
          displayTimezone: 'America/New_York',
          duration: 60,
        },
      ];

      (mockCalculator.getAvailableSlots as jest.Mock)
        .mockResolvedValueOnce(mockSlotsLocation1)
        .mockResolvedValueOnce(mockSlotsLocation2);

      const result = await manager.findBestTimeAcrossLocations(
        'business-1',
        '14:00',
        '2024-07-15',
        60,
        'America/New_York'
      );

      expect(result).not.toBeNull();
      expect(result!.locationId).toBe('location-1'); // First location should be preferred
    });
  });
});

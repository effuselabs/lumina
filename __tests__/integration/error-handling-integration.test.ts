/**
 * Integration test for error handling and monitoring system
 */

import {
  AvailabilityErrorFactory,
  BusinessClosedError,
  isAvailabilityError,
  StaffUnavailableError,
} from '@/lib/errors/availability-errors';
import { availabilityLogger } from '@/lib/monitoring/availability-logger';
import { enhancedErrorHandler } from '@/lib/services/enhanced-error-handler';
import { gracefulDegradation } from '@/lib/services/graceful-degradation';

// Mock external dependencies
jest.mock('@/lib/monitoring/availability-logger', () => ({
  availabilityLogger: {
    log: jest.fn(),
    logError: jest.fn(),
    logPerformance: jest.fn(),
    logCache: jest.fn(),
    logBusinessMetric: jest.fn(),
  },
}));

describe('Error Handling and Monitoring Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Error Creation and Handling', () => {
    it('should create and handle business closed errors', () => {
      const requestedTime = new Date('2024-01-01T22:00:00Z');
      const businessHours = { openTime: '09:00', closeTime: '18:00' };

      const error = AvailabilityErrorFactory.createBusinessClosedError(
        requestedTime,
        businessHours,
        []
      );

      expect(error).toBeInstanceOf(BusinessClosedError);
      expect(error.code).toBe('BUSINESS_CLOSED');
      expect(error.userMessage).toContain("We're closed");
      expect(error.userMessage).toContain('09:00 - 18:00');
      expect(isAvailabilityError(error)).toBe(true);
    });

    it('should create staff unavailable errors with alternatives', () => {
      const requestedTime = new Date('2024-01-01T14:00:00Z');
      const alternativeStaff = [
        {
          id: 'staff-2',
          name: 'Jane Doe',
          availableSlots: [
            {
              startTime: new Date('2024-01-01T15:00:00Z'),
              endTime: new Date('2024-01-01T16:00:00Z'),
              duration: 60,
            },
          ],
        },
      ];

      const error = AvailabilityErrorFactory.createStaffUnavailableError(
        'John Doe',
        requestedTime,
        'time_off',
        alternativeStaff
      );

      expect(error).toBeInstanceOf(StaffUnavailableError);
      expect(error.suggestedAlternatives).toHaveLength(1);
      expect(error.suggestedAlternatives[0].type).toBe('staff_member');
      expect(error.suggestedAlternatives[0].data?.staffName).toBe('Jane Doe');
    });
  });

  describe('Business Context Validation', () => {
    it('should validate business context successfully', () => {
      expect(() => {
        enhancedErrorHandler.validateBusinessContext(
          'business-123',
          'test_operation'
        );
      }).not.toThrow();
    });

    it('should throw error for missing business context', () => {
      expect(() => {
        enhancedErrorHandler.validateBusinessContext(
          undefined,
          'test_operation'
        );
      }).toThrow();
    });
  });

  describe('Time Slot Validation', () => {
    it('should validate valid time slots', () => {
      const startTime = new Date(Date.now() + 86400000); // Tomorrow
      const endTime = new Date(startTime.getTime() + 3600000); // 1 hour later

      expect(() => {
        enhancedErrorHandler.validateTimeSlot(
          startTime,
          endTime,
          'test_operation'
        );
      }).not.toThrow();
    });

    it('should throw error for past time slots', () => {
      const pastTime = new Date('2020-01-01T10:00:00Z');
      const endTime = new Date(pastTime.getTime() + 3600000);

      expect(() => {
        enhancedErrorHandler.validateTimeSlot(
          pastTime,
          endTime,
          'test_operation'
        );
      }).toThrow('past_time');
    });

    it('should throw error when end time is before start time', () => {
      const startTime = new Date(Date.now() + 86400000);
      const endTime = new Date(startTime.getTime() - 3600000); // 1 hour before start

      expect(() => {
        enhancedErrorHandler.validateTimeSlot(
          startTime,
          endTime,
          'test_operation'
        );
      }).toThrow('end_before_start');
    });
  });

  describe('Graceful Degradation', () => {
    it('should execute operations successfully', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');

      const result = await gracefulDegradation.executeWithDegradation(
        'test_service',
        mockOperation,
        undefined,
        { businessId: 'business-123', operation: 'test' }
      );

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should use fallback when main operation fails', async () => {
      const mockOperation = jest
        .fn()
        .mockRejectedValue(new Error('Main operation failed'));
      const mockFallback = jest.fn().mockResolvedValue('fallback_success');

      const result = await gracefulDegradation.executeWithDegradation(
        'test_service',
        mockOperation,
        mockFallback,
        { businessId: 'business-123', operation: 'test' }
      );

      expect(result).toBe('fallback_success');
      expect(mockOperation).toHaveBeenCalled();
      expect(mockFallback).toHaveBeenCalled();
    });

    it('should throw error when both main and fallback fail', async () => {
      const mockOperation = jest
        .fn()
        .mockRejectedValue(new Error('Main failed'));
      const mockFallback = jest
        .fn()
        .mockRejectedValue(new Error('Fallback failed'));

      await expect(
        gracefulDegradation.executeWithDegradation(
          'test_service',
          mockOperation,
          mockFallback,
          { businessId: 'business-123', operation: 'test' }
        )
      ).rejects.toThrow();
    });
  });

  describe('Error Serialization', () => {
    it('should serialize errors to JSON properly', () => {
      const error = new BusinessClosedError(new Date('2024-01-01T22:00:00Z'));
      const json = error.toJSON();

      expect(json).toHaveProperty('name', 'BusinessClosedError');
      expect(json).toHaveProperty('code', 'BUSINESS_CLOSED');
      expect(json).toHaveProperty('message');
      expect(json).toHaveProperty('userMessage');
      expect(json).toHaveProperty('timestamp');
      expect(json).toHaveProperty('context');
      expect(json).toHaveProperty('suggestedAlternatives');
    });
  });

  describe('Service Health Tracking', () => {
    it('should track service health', () => {
      const health = gracefulDegradation.getServiceHealth('test_service');
      // Initially no health data
      expect(health).toBeNull();
    });

    it('should reset circuit breaker', () => {
      expect(() => {
        gracefulDegradation.resetCircuitBreaker('test_service');
      }).not.toThrow();
    });
  });
});

describe('Error Handling Workflow', () => {
  it('should handle complete error workflow', async () => {
    // Simulate a business operation that fails
    const businessId = 'business-123';
    const operation = 'availability_check';

    try {
      // This would normally be a real operation
      throw new BusinessClosedError(new Date('2024-01-01T22:00:00Z'));
    } catch (error) {
      // Verify error is properly typed
      expect(isAvailabilityError(error)).toBe(true);

      if (isAvailabilityError(error)) {
        // Log the error (mocked)
        availabilityLogger.logError(error, { businessId, operation });

        // Verify logging was called
        expect(availabilityLogger.logError).toHaveBeenCalledWith(error, {
          businessId,
          operation,
        });

        // Verify error properties
        expect(error.code).toBe('BUSINESS_CLOSED');
        expect(error.userMessage).toContain("We're closed");
        expect(error.timestamp).toBeInstanceOf(Date);
      }
    }
  });
});

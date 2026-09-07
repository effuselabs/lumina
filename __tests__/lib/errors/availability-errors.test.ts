/**
 * Test suite for availability error handling system
 */

import {
  AvailabilityError,
  AvailabilityErrorFactory,
  BusinessClosedError,
  BusinessContextMissingError,
  CacheFailureError,
  ErrorSeverity,
  getErrorSeverity,
  InsufficientDurationError,
  InvalidTimeSlotError,
  isAvailabilityError,
  isBusinessClosedError,
  isStaffUnavailableError,
  SchedulingConflictError,
  StaffUnavailableError,
  TimeOffConflictError,
} from '@/lib/errors/availability-errors';

describe('AvailabilityError', () => {
  it('should create base availability error with all properties', () => {
    const error = new BusinessClosedError(new Date('2024-01-01T10:00:00Z'));

    expect(error).toBeInstanceOf(AvailabilityError);
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe('BUSINESS_CLOSED');
    expect(error.userMessage).toContain("We're closed");
    expect(error.timestamp).toBeInstanceOf(Date);
    expect(error.suggestedAlternatives).toEqual([]);
    expect(error.context).toHaveProperty('requestedTime');
  });

  it('should maintain proper stack trace', () => {
    const error = new BusinessClosedError(new Date());

    expect(error.stack).toBeDefined();
    expect(error.name).toBe('BusinessClosedError');
  });

  it('should serialize to JSON properly', () => {
    const error = new BusinessClosedError(new Date('2024-01-01T10:00:00Z'));
    const json = error.toJSON();

    expect(json).toHaveProperty('name', 'BusinessClosedError');
    expect(json).toHaveProperty('code', 'BUSINESS_CLOSED');
    expect(json).toHaveProperty('message');
    expect(json).toHaveProperty('userMessage');
    expect(json).toHaveProperty('timestamp');
    expect(json).toHaveProperty('context');
  });
});

describe('BusinessClosedError', () => {
  it('should create business closed error with proper message', () => {
    const requestedTime = new Date('2024-01-01T22:00:00Z'); // 10 PM
    const businessHours = { openTime: '09:00', closeTime: '18:00' };

    const error = new BusinessClosedError(requestedTime, businessHours);

    expect(error.code).toBe('BUSINESS_CLOSED');
    expect(error.userMessage).toContain("We're closed");
    expect(error.userMessage).toContain('09:00 - 18:00');
    expect(error.context.requestedTime).toBe(requestedTime);
    expect(error.context.businessHours).toBe(businessHours);
  });

  it('should work without business hours', () => {
    const requestedTime = new Date('2024-01-01T22:00:00Z');

    const error = new BusinessClosedError(requestedTime);

    expect(error.userMessage).toContain("We're closed");
    expect(error.userMessage).not.toContain('Our hours are');
  });
});

describe('StaffUnavailableError', () => {
  it('should create staff unavailable error for time off', () => {
    const requestedTime = new Date('2024-01-01T14:00:00Z');
    const staffName = 'John Doe';

    const error = new StaffUnavailableError(
      staffName,
      requestedTime,
      'time_off'
    );

    expect(error.code).toBe('STAFF_UNAVAILABLE');
    expect(error.userMessage).toContain('John Doe');
    expect(error.userMessage).toContain('taking time off');
    expect(error.context.reason).toBe('time_off');
  });

  it('should create staff unavailable error for not scheduled', () => {
    const requestedTime = new Date('2024-01-01T14:00:00Z');
    const staffName = 'Jane Smith';

    const error = new StaffUnavailableError(
      staffName,
      requestedTime,
      'not_scheduled'
    );

    expect(error.userMessage).toContain('Jane Smith');
    expect(error.userMessage).toContain('not scheduled to work');
  });
});

describe('SchedulingConflictError', () => {
  it('should create scheduling conflict error with existing appointment', () => {
    const conflictDetails = {
      existingAppointment: {
        id: 'apt-123',
        startTime: new Date('2024-01-01T14:00:00Z'),
        endTime: new Date('2024-01-01T15:00:00Z'),
        clientName: 'John Client',
        serviceName: 'Haircut',
      },
    };

    const error = new SchedulingConflictError(
      'overlapping_appointment',
      conflictDetails
    );

    expect(error.code).toBe('SCHEDULING_CONFLICT');
    expect(error.userMessage).toContain(
      'conflicts with an existing appointment'
    );
    expect(error.context.conflictDetails).toBe(conflictDetails);
  });
});

describe('InsufficientDurationError', () => {
  it('should create insufficient duration error with service details', () => {
    const error = new InsufficientDurationError(120, 60, [
      'Haircut',
      'Beard Trim',
    ]);

    expect(error.code).toBe('INSUFFICIENT_DURATION');
    expect(error.userMessage).toContain('Haircut and Beard Trim');
    expect(error.userMessage).toContain('require 120 minutes');
    expect(error.userMessage).toContain('only 60 minutes are available');
    expect(error.context.requiredDuration).toBe(120);
    expect(error.context.availableDuration).toBe(60);
  });

  it('should handle single service name', () => {
    const error = new InsufficientDurationError(90, 60, ['Deep Conditioning']);

    expect(error.userMessage).toContain('Deep Conditioning');
    expect(error.userMessage).not.toContain(' and ');
  });
});

describe('InvalidTimeSlotError', () => {
  it('should create past time error', () => {
    const pastTime = new Date('2020-01-01T10:00:00Z');
    const error = new InvalidTimeSlotError('past_time', pastTime);

    expect(error.code).toBe('INVALID_TIME_SLOT');
    expect(error.userMessage).toContain('cannot book appointments in the past');
    expect(error.context.reason).toBe('past_time');
  });

  it('should create end before start error', () => {
    const error = new InvalidTimeSlotError('end_before_start');

    expect(error.userMessage).toContain(
      'end time cannot be before the start time'
    );
  });

  it('should create too far future error', () => {
    const error = new InvalidTimeSlotError('too_far_future');

    expect(error.userMessage).toContain('6 months in advance');
  });
});

describe('TimeOffConflictError', () => {
  it('should create time off conflict error', () => {
    const timeOffPeriod = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-03'),
      reason: 'Vacation',
    };

    const error = new TimeOffConflictError('Sarah Johnson', timeOffPeriod);

    expect(error.code).toBe('TIME_OFF_CONFLICT');
    expect(error.userMessage).toContain('Sarah Johnson');
    expect(error.userMessage).toContain('approved time off');
    expect(error.context.timeOffPeriod).toBe(timeOffPeriod);
  });
});

describe('CacheFailureError', () => {
  it('should create cache failure error with fallback', () => {
    const error = new CacheFailureError('availability_check', true);

    expect(error.code).toBe('CACHE_FAILURE');
    expect(error.userMessage).toContain(
      'delays, but your request is being processed'
    );
    expect(error.context.fallbackUsed).toBe(true);
  });

  it('should create cache failure error without fallback', () => {
    const error = new CacheFailureError('availability_check', false);

    expect(error.userMessage).toContain('technical difficulties');
    expect(error.context.fallbackUsed).toBe(false);
  });
});

describe('AvailabilityErrorFactory', () => {
  it('should create business closed error with alternatives', () => {
    const requestedTime = new Date('2024-01-01T22:00:00Z');
    const businessHours = { openTime: '09:00', closeTime: '18:00' };
    const alternativeSlots = [
      {
        startTime: new Date('2024-01-02T10:00:00Z'),
        endTime: new Date('2024-01-02T11:00:00Z'),
        duration: 60,
      },
    ];

    const error = AvailabilityErrorFactory.createBusinessClosedError(
      requestedTime,
      businessHours,
      alternativeSlots
    );

    expect(error.suggestedAlternatives).toHaveLength(1);
    expect(error.suggestedAlternatives[0].type).toBe('time_slot');
    expect(error.suggestedAlternatives[0].title).toContain('Available at');
  });

  it('should create staff unavailable error with alternative staff', () => {
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

    expect(error.suggestedAlternatives).toHaveLength(1);
    expect(error.suggestedAlternatives[0].type).toBe('staff_member');
    expect(error.suggestedAlternatives[0].data?.staffName).toBe('Jane Doe');
  });
});

describe('Error Severity', () => {
  it('should return correct severity for different error types', () => {
    expect(getErrorSeverity(new BusinessContextMissingError('test'))).toBe(
      ErrorSeverity.CRITICAL
    );
    expect(getErrorSeverity(new CacheFailureError('test'))).toBe(
      ErrorSeverity.MEDIUM
    );
    expect(getErrorSeverity(new BusinessClosedError(new Date()))).toBe(
      ErrorSeverity.LOW
    );
    expect(getErrorSeverity(new InvalidTimeSlotError('past_time'))).toBe(
      ErrorSeverity.LOW
    );
  });
});

describe('Type Guards', () => {
  it('should correctly identify availability errors', () => {
    const availabilityError = new BusinessClosedError(new Date());
    const regularError = new Error('Regular error');

    expect(isAvailabilityError(availabilityError)).toBe(true);
    expect(isAvailabilityError(regularError)).toBe(false);
  });

  it('should correctly identify specific error types', () => {
    const businessClosedError = new BusinessClosedError(new Date());
    const staffUnavailableError = new StaffUnavailableError(
      'John',
      new Date(),
      'time_off'
    );

    expect(isBusinessClosedError(businessClosedError)).toBe(true);
    expect(isBusinessClosedError(staffUnavailableError)).toBe(false);

    expect(isStaffUnavailableError(staffUnavailableError)).toBe(true);
    expect(isStaffUnavailableError(businessClosedError)).toBe(false);
  });
});

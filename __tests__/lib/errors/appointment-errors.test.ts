/**
 * Unit tests for appointment error handling system
 * Tests error types, factory methods, and error message generation
 */

import {
  AppointmentAlreadyCompletedError,
  AppointmentAlreadyExistsError,
  AppointmentCancellationError,
  AppointmentError,
  AppointmentErrorFactory,
  AppointmentNotFoundError,
  CalendarIntegrationFailureError,
  ClientNotFoundError,
  DatabaseConstraintViolationError,
  InsufficientNoticeError,
  InvalidStatusTransitionError,
  MultiServiceBookingError,
  PastAppointmentModificationError,
  PaymentRequiredError,
  ServiceNotFoundError,
  StaffNotFoundError,
  getAppointmentErrorSeverity,
  isAppointmentError,
  isAppointmentNotFoundError,
  isCalendarIntegrationFailureError,
  isInvalidStatusTransitionError,
  isMultiServiceBookingError,
  isPaymentRequiredError,
} from '@/lib/errors/appointment-errors';
import { ErrorSeverity } from '@/lib/errors/availability-errors';

describe('AppointmentError', () => {
  describe('Base AppointmentError class', () => {
    it('should create appointment error with all properties', () => {
      const error = new AppointmentNotFoundError('apt-123', 'biz-456');

      expect(error).toBeInstanceOf(AppointmentError);
      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe('APPOINTMENT_NOT_FOUND');
      expect(error.appointmentId).toBe('apt-123');
      expect(error.userMessage).toContain('appointment could not be found');
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.context).toEqual({
        appointmentId: 'apt-123',
        businessId: 'biz-456',
      });
    });

    it('should serialize to JSON correctly', () => {
      const error = new AppointmentNotFoundError('apt-123', 'biz-456');
      const json = error.toJSON();

      expect(json).toHaveProperty('name', 'AppointmentNotFoundError');
      expect(json).toHaveProperty('code', 'APPOINTMENT_NOT_FOUND');
      expect(json).toHaveProperty('appointmentId', 'apt-123');
      expect(json).toHaveProperty('timestamp');
      expect(json).toHaveProperty('context');
    });

    it('should maintain proper stack trace', () => {
      const error = new AppointmentNotFoundError('apt-123', 'biz-456');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('AppointmentNotFoundError');
    });
  });

  describe('AppointmentNotFoundError', () => {
    it('should create error with proper message', () => {
      const error = new AppointmentNotFoundError('apt-123', 'biz-456');

      expect(error.code).toBe('APPOINTMENT_NOT_FOUND');
      expect(error.message).toContain('apt-123');
      expect(error.message).toContain('biz-456');
      expect(error.userMessage).toContain('appointment could not be found');
      expect(error.appointmentId).toBe('apt-123');
    });

    it('should include suggested alternatives', () => {
      const alternatives = [
        {
          type: 'action' as const,
          title: 'View other appointments',
          description: 'See your appointment history',
        },
      ];
      const error = new AppointmentNotFoundError(
        'apt-123',
        'biz-456',
        alternatives
      );

      expect(error.suggestedAlternatives).toHaveLength(1);
      expect(error.suggestedAlternatives[0].title).toBe(
        'View other appointments'
      );
    });
  });

  describe('InvalidStatusTransitionError', () => {
    it('should create error with transition details', () => {
      const error = new InvalidStatusTransitionError(
        'apt-123',
        'COMPLETED',
        'SCHEDULED',
        ['CANCELLED']
      );

      expect(error.code).toBe('INVALID_STATUS_TRANSITION');
      expect(error.message).toContain('COMPLETED');
      expect(error.message).toContain('SCHEDULED');
      expect(error.userMessage).toContain('Cannot change appointment status');
      expect(error.userMessage).toContain(
        'Valid transitions from COMPLETED: CANCELLED'
      );
      expect(error.context.validTransitions).toEqual(['CANCELLED']);
    });

    it('should handle empty valid transitions', () => {
      const error = new InvalidStatusTransitionError(
        'apt-123',
        'COMPLETED',
        'SCHEDULED',
        []
      );

      expect(error.userMessage).toContain(
        'No valid transitions available from COMPLETED'
      );
    });
  });

  describe('MultiServiceBookingError', () => {
    const serviceIds = ['svc-1', 'svc-2'];
    const serviceNames = ['Haircut', 'Color Treatment'];

    it('should create service incompatibility error', () => {
      const error = new MultiServiceBookingError(
        'service_incompatibility',
        serviceIds,
        serviceNames,
        { incompatibleServices: ['svc-1', 'svc-2'] }
      );

      expect(error.code).toBe('MULTI_SERVICE_BOOKING_ERROR');
      expect(error.userMessage).toContain('Haircut and Color Treatment');
      expect(error.userMessage).toContain('cannot be booked together');
      expect(error.context.errorType).toBe('service_incompatibility');
    });

    it('should create staff skill mismatch error', () => {
      const error = new MultiServiceBookingError(
        'staff_skill_mismatch',
        serviceIds,
        serviceNames,
        { requiredSkills: ['advanced_color'] }
      );

      expect(error.userMessage).toContain(
        'not qualified to perform all requested services'
      );
    });

    it('should create duration exceeded error', () => {
      const error = new MultiServiceBookingError(
        'duration_exceeded',
        serviceIds,
        serviceNames,
        { maxDuration: 240 }
      );

      expect(error.userMessage).toContain(
        'exceeds the maximum appointment length of 4 hours'
      );
    });

    it('should handle single service name', () => {
      const error = new MultiServiceBookingError(
        'pricing_error',
        ['svc-1'],
        ['Haircut'],
        {}
      );

      expect(error.userMessage).toContain('Haircut');
      expect(error.userMessage).not.toContain(' and ');
    });
  });

  describe('PaymentRequiredError', () => {
    const paymentDetails = {
      amountDue: 5000, // $50.00 in cents
      currency: 'USD',
      paymentType: 'deposit' as const,
    };

    it('should create deposit payment error', () => {
      const error = new PaymentRequiredError(
        'apt-123',
        'confirm',
        paymentDetails
      );

      expect(error.code).toBe('PAYMENT_REQUIRED');
      expect(error.userMessage).toContain('deposit of $50.00');
      expect(error.userMessage).toContain('required to confirm');
      expect(error.context.paymentDetails).toEqual(paymentDetails);
    });

    it('should create full payment error', () => {
      const fullPaymentDetails = {
        ...paymentDetails,
        paymentType: 'full_payment' as const,
      };
      const error = new PaymentRequiredError(
        'apt-123',
        'complete',
        fullPaymentDetails
      );

      expect(error.userMessage).toContain('Payment of $50.00');
      expect(error.userMessage).toContain('required to complete');
    });

    it('should create cancellation fee error', () => {
      const feeDetails = {
        ...paymentDetails,
        paymentType: 'cancellation_fee' as const,
      };
      const error = new PaymentRequiredError(
        'apt-123',
        'reschedule',
        feeDetails
      );

      expect(error.userMessage).toContain('cancellation fee of $50.00');
    });
  });

  describe('AppointmentAlreadyExistsError', () => {
    it('should create error with time formatting', () => {
      const requestedTime = new Date('2024-03-15T14:30:00Z');
      const error = new AppointmentAlreadyExistsError('apt-456', requestedTime);

      expect(error.code).toBe('APPOINTMENT_ALREADY_EXISTS');
      expect(error.userMessage).toContain(
        'already have an appointment scheduled'
      );
      expect(error.context.requestedTime).toBe(requestedTime);
    });
  });

  describe('AppointmentAlreadyCompletedError', () => {
    it('should create error with completion time', () => {
      const completedAt = new Date('2024-03-15T16:00:00Z');
      const error = new AppointmentAlreadyCompletedError(
        'apt-123',
        completedAt
      );

      expect(error.code).toBe('APPOINTMENT_ALREADY_COMPLETED');
      expect(error.userMessage).toContain('already completed');
      expect(error.userMessage).toContain('cannot be modified');
      expect(error.context.completedAt).toBe(completedAt);
    });
  });

  describe('AppointmentCancellationError', () => {
    it('should create too late cancellation error', () => {
      const error = new AppointmentCancellationError('apt-123', 'too_late', {
        minimumNoticeHours: 24,
      });

      expect(error.code).toBe('APPOINTMENT_CANCELLATION_ERROR');
      expect(error.userMessage).toContain(
        'cancelled at least 24 hours in advance'
      );
    });

    it('should create already started error', () => {
      const error = new AppointmentCancellationError(
        'apt-123',
        'already_started'
      );

      expect(error.userMessage).toContain(
        'already started and cannot be cancelled'
      );
    });

    it('should create payment required error', () => {
      const error = new AppointmentCancellationError(
        'apt-123',
        'payment_required'
      );

      expect(error.userMessage).toContain('cancellation fee may apply');
    });
  });

  describe('PastAppointmentModificationError', () => {
    const pastTime = new Date('2024-01-15T14:30:00Z');

    it('should create update error', () => {
      const error = new PastAppointmentModificationError(
        'apt-123',
        pastTime,
        'update'
      );

      expect(error.code).toBe('PAST_APPOINTMENT_MODIFICATION');
      expect(error.userMessage).toContain('Cannot modify past appointments');
    });

    it('should create cancel error', () => {
      const error = new PastAppointmentModificationError(
        'apt-123',
        pastTime,
        'cancel'
      );

      expect(error.userMessage).toContain('Cannot cancel past appointments');
    });

    it('should create reschedule error', () => {
      const error = new PastAppointmentModificationError(
        'apt-123',
        pastTime,
        'reschedule'
      );

      expect(error.userMessage).toContain(
        'Cannot reschedule past appointments'
      );
    });
  });

  describe('InsufficientNoticeError', () => {
    it('should create cancellation notice error', () => {
      const error = new InsufficientNoticeError('apt-123', 'cancel', 24, 12);

      expect(error.code).toBe('INSUFFICIENT_NOTICE');
      expect(error.userMessage).toContain(
        'Cancellations require at least 24 hours notice'
      );
      expect(error.userMessage).toContain('You have 12 hours remaining');
    });

    it('should create reschedule notice error', () => {
      const error = new InsufficientNoticeError(
        'apt-123',
        'reschedule',
        48,
        36
      );

      expect(error.userMessage).toContain(
        'Rescheduling require at least 48 hours notice'
      );
    });

    it('should create modify notice error', () => {
      const error = new InsufficientNoticeError('apt-123', 'modify', 12, 6);

      expect(error.userMessage).toContain(
        'Modifications require at least 12 hours notice'
      );
    });
  });

  describe('Resource not found errors', () => {
    it('should create client not found error', () => {
      const error = new ClientNotFoundError('client-123', 'biz-456');

      expect(error.code).toBe('CLIENT_NOT_FOUND');
      expect(error.clientId).toBe('client-123');
      expect(error.userMessage).toContain('client could not be found');
    });

    it('should create staff not found error', () => {
      const error = new StaffNotFoundError('staff-123', 'biz-456');

      expect(error.code).toBe('STAFF_NOT_FOUND');
      expect(error.staffId).toBe('staff-123');
      expect(error.userMessage).toContain('staff member could not be found');
    });

    it('should create service not found error', () => {
      const error = new ServiceNotFoundError('svc-123', 'biz-456');

      expect(error.code).toBe('SERVICE_NOT_FOUND');
      expect(error.userMessage).toContain('service is no longer available');
    });
  });

  describe('System errors', () => {
    it('should create database constraint violation error', () => {
      const error = new DatabaseConstraintViolationError(
        'create_appointment',
        'unique_constraint',
        { field: 'staffId_startTime' }
      );

      expect(error.code).toBe('DATABASE_CONSTRAINT_VIOLATION');
      expect(error.userMessage).toContain('data integrity issue');
      expect(error.context.constraint).toBe('unique_constraint');
    });

    it('should create calendar integration failure error', () => {
      const error = new CalendarIntegrationFailureError(
        'check_availability',
        'calendar_service',
        true
      );

      expect(error.code).toBe('CALENDAR_INTEGRATION_FAILURE');
      expect(error.userMessage).toContain('experiencing some delays');
      expect(error.context.fallbackUsed).toBe(true);
    });

    it('should create calendar integration failure without fallback', () => {
      const error = new CalendarIntegrationFailureError(
        'check_availability',
        'calendar_service',
        false
      );

      expect(error.userMessage).toContain('temporarily unavailable');
      expect(error.context.fallbackUsed).toBe(false);
    });
  });
});

describe('AppointmentErrorFactory', () => {
  describe('createAppointmentNotFoundError', () => {
    it('should create error with alternative appointments', () => {
      const alternatives = [
        {
          id: 'apt-456',
          startTime: new Date('2024-03-16T10:00:00Z'),
          serviceName: 'Haircut',
        },
      ];

      const error = AppointmentErrorFactory.createAppointmentNotFoundError(
        'apt-123',
        'biz-456',
        alternatives
      );

      expect(error.suggestedAlternatives).toHaveLength(1);
      expect(error.suggestedAlternatives[0].title).toContain(
        'Haircut appointment'
      );
      expect(
        error.suggestedAlternatives[0].data?.actionData.appointmentId
      ).toBe('apt-456');
    });

    it('should create error without alternatives', () => {
      const error = AppointmentErrorFactory.createAppointmentNotFoundError(
        'apt-123',
        'biz-456'
      );

      expect(error.suggestedAlternatives).toHaveLength(0);
    });
  });

  describe('createInvalidStatusTransitionError', () => {
    it('should create error with valid transition suggestions', () => {
      const error = AppointmentErrorFactory.createInvalidStatusTransitionError(
        'apt-123',
        'SCHEDULED',
        'COMPLETED',
        ['CONFIRMED', 'CANCELLED']
      );

      expect(error.suggestedAlternatives).toHaveLength(2);
      expect(error.suggestedAlternatives[0].title).toBe('Change to CONFIRMED');
      expect(error.suggestedAlternatives[1].title).toBe('Change to CANCELLED');
    });
  });

  describe('createMultiServiceBookingError', () => {
    it('should create error with alternative options', () => {
      const alternatives = [
        {
          type: 'separate_bookings' as const,
          title: 'Book separately',
          description: 'Book services in different appointments',
        },
      ];

      const error = AppointmentErrorFactory.createMultiServiceBookingError(
        'service_incompatibility',
        ['svc-1', 'svc-2'],
        ['Haircut', 'Color'],
        {},
        alternatives
      );

      expect(error.suggestedAlternatives).toHaveLength(1);
      expect(error.suggestedAlternatives[0].title).toBe('Book separately');
    });
  });

  describe('createPaymentRequiredError', () => {
    it('should create error with payment suggestion', () => {
      const paymentDetails = {
        amountDue: 2500,
        currency: 'USD',
        paymentType: 'deposit' as const,
      };

      const error = AppointmentErrorFactory.createPaymentRequiredError(
        'apt-123',
        'confirm',
        paymentDetails
      );

      expect(error.suggestedAlternatives).toHaveLength(1);
      expect(error.suggestedAlternatives[0].title).toBe('Make Payment');
      expect(error.suggestedAlternatives[0].description).toContain('$25.00');
    });
  });
});

describe('Type guards', () => {
  it('should identify appointment errors correctly', () => {
    const appointmentError = new AppointmentNotFoundError('apt-123', 'biz-456');
    const regularError = new Error('Regular error');

    expect(isAppointmentError(appointmentError)).toBe(true);
    expect(isAppointmentError(regularError)).toBe(false);
  });

  it('should identify specific error types correctly', () => {
    const notFoundError = new AppointmentNotFoundError('apt-123', 'biz-456');
    const statusError = new InvalidStatusTransitionError(
      'apt-123',
      'COMPLETED',
      'SCHEDULED',
      []
    );
    const multiServiceError = new MultiServiceBookingError(
      'service_incompatibility',
      [],
      [],
      {}
    );
    const paymentError = new PaymentRequiredError('apt-123', 'confirm', {
      amountDue: 1000,
      currency: 'USD',
      paymentType: 'deposit',
    });
    const calendarError = new CalendarIntegrationFailureError(
      'check_availability',
      'calendar_service'
    );

    expect(isAppointmentNotFoundError(notFoundError)).toBe(true);
    expect(isAppointmentNotFoundError(statusError)).toBe(false);

    expect(isInvalidStatusTransitionError(statusError)).toBe(true);
    expect(isInvalidStatusTransitionError(notFoundError)).toBe(false);

    expect(isMultiServiceBookingError(multiServiceError)).toBe(true);
    expect(isMultiServiceBookingError(statusError)).toBe(false);

    expect(isPaymentRequiredError(paymentError)).toBe(true);
    expect(isPaymentRequiredError(multiServiceError)).toBe(false);

    expect(isCalendarIntegrationFailureError(calendarError)).toBe(true);
    expect(isCalendarIntegrationFailureError(paymentError)).toBe(false);
  });
});

describe('Error severity', () => {
  it('should assign correct severity levels', () => {
    const dbError = new DatabaseConstraintViolationError(
      'create',
      'constraint',
      {}
    );
    const calendarError = new CalendarIntegrationFailureError(
      'check',
      'service'
    );
    const notFoundError = new AppointmentNotFoundError('apt-123', 'biz-456');
    const statusError = new InvalidStatusTransitionError(
      'apt-123',
      'COMPLETED',
      'SCHEDULED',
      []
    );

    expect(getAppointmentErrorSeverity(dbError)).toBe(ErrorSeverity.HIGH);
    expect(getAppointmentErrorSeverity(calendarError)).toBe(ErrorSeverity.HIGH);
    expect(getAppointmentErrorSeverity(notFoundError)).toBe(
      ErrorSeverity.MEDIUM
    );
    expect(getAppointmentErrorSeverity(statusError)).toBe(ErrorSeverity.LOW);
  });
});

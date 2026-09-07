/**
 * Unit tests for appointment error handler
 * Tests database error handling, monitoring, and error conversion
 */

import {
  AppointmentError,
  AppointmentErrorContext,
  AppointmentNotFoundError,
  CalendarIntegrationFailureError,
  DatabaseConstraintViolationError,
} from '@/lib/errors/appointment-errors';
import { ErrorSeverity } from '@/lib/errors/availability-errors';
import {
  appointmentErrorHandler,
  withAppointmentErrorHandling,
  withCalendarIntegrationErrorHandling,
} from '@/lib/services/appointment-error-handler';
import { Prisma } from '@prisma/client';

// Mock dependencies
jest.mock('@/lib/monitoring/availability-logger', () => ({
  availabilityLogger: {
    log: jest.fn(),
    logError: jest.fn(),
  },
}));

jest.mock('@/lib/services/graceful-degradation', () => ({
  gracefulDegradation: {
    executeWithDegradation: jest.fn(),
  },
}));

jest.mock('@/lib/services/enhanced-error-handler', () => ({
  withEnhancedErrorHandling: jest.fn(),
  enhancedErrorHandler: {
    validateBusinessContext: jest.fn(),
  },
}));

describe('AppointmentErrorHandler', () => {
  const mockContext: AppointmentErrorContext = {
    businessId: 'biz-123',
    operation: 'create_appointment',
    appointmentId: 'apt-456',
    clientId: 'client-789',
    staffId: 'staff-101',
    serviceIds: ['svc-1', 'svc-2'],
    userId: 'user-202',
    sessionId: 'session-303',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleDatabaseError', () => {
    it('should handle Prisma known request errors', () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '4.0.0',
          meta: { target: ['staffId', 'startTime'] },
        }
      );

      const result = appointmentErrorHandler.handleDatabaseError(
        prismaError,
        mockContext
      );

      expect(result).toBeInstanceOf(AppointmentError);
      expect(result.code).toBe('MULTI_SERVICE_BOOKING_ERROR');
    });

    it('should handle record not found errors', () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        {
          code: 'P2025',
          clientVersion: '4.0.0',
        }
      );

      const contextWithAppointment = {
        ...mockContext,
        appointmentId: 'apt-123',
      };
      const result = appointmentErrorHandler.handleDatabaseError(
        prismaError,
        contextWithAppointment
      );

      expect(result).toBeInstanceOf(AppointmentNotFoundError);
      expect(result.appointmentId).toBe('apt-123');
    });

    it('should handle foreign key constraint violations for client', () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        {
          code: 'P2003',
          clientVersion: '4.0.0',
          meta: { field_name: 'clientId' },
        }
      );

      const result = appointmentErrorHandler.handleDatabaseError(
        prismaError,
        mockContext
      );

      expect(result).toBeInstanceOf(AppointmentError);
      expect(result.code).toBe('CLIENT_NOT_FOUND');
      expect(result.clientId).toBe('client-789');
    });

    it('should handle foreign key constraint violations for staff', () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        {
          code: 'P2003',
          clientVersion: '4.0.0',
          meta: { field_name: 'staffId' },
        }
      );

      const result = appointmentErrorHandler.handleDatabaseError(
        prismaError,
        mockContext
      );

      expect(result).toBeInstanceOf(AppointmentError);
      expect(result.code).toBe('STAFF_NOT_FOUND');
      expect(result.staffId).toBe('staff-101');
    });

    it('should handle unknown Prisma errors', () => {
      const prismaError = new Prisma.PrismaClientUnknownRequestError(
        'Unknown database error',
        { clientVersion: '4.0.0' }
      );

      const result = appointmentErrorHandler.handleDatabaseError(
        prismaError,
        mockContext
      );

      expect(result).toBeInstanceOf(DatabaseConstraintViolationError);
      expect(result.code).toBe('DATABASE_CONSTRAINT_VIOLATION');
    });

    it('should handle Prisma validation errors', () => {
      const prismaError = new Prisma.PrismaClientValidationError(
        'Validation error: invalid field type',
        { clientVersion: '4.0.0' }
      );

      const result = appointmentErrorHandler.handleDatabaseError(
        prismaError,
        mockContext
      );

      expect(result).toBeInstanceOf(DatabaseConstraintViolationError);
      expect(result.context.constraint).toBe('validation_error');
    });

    it('should handle generic errors', () => {
      const genericError = new Error('Generic database error');

      const result = appointmentErrorHandler.handleDatabaseError(
        genericError,
        mockContext
      );

      expect(result).toBeInstanceOf(DatabaseConstraintViolationError);
      expect(result.context.constraint).toBe('unknown_database_error');
    });
  });

  describe('handleCalendarIntegrationError', () => {
    const {
      gracefulDegradation,
    } = require('@/lib/services/graceful-degradation');

    it('should execute calendar operation successfully', async () => {
      const mockResult = { available: true };
      const calendarOperation = jest.fn().mockResolvedValue(mockResult);

      gracefulDegradation.executeWithDegradation.mockResolvedValue(mockResult);

      const result =
        await appointmentErrorHandler.handleCalendarIntegrationError(
          'check_availability',
          mockContext,
          calendarOperation
        );

      expect(result).toBe(mockResult);
      expect(gracefulDegradation.executeWithDegradation).toHaveBeenCalledWith(
        'calendar_integration',
        calendarOperation,
        expect.any(Function),
        mockContext
      );
    });

    it('should handle calendar operation failure with fallback', async () => {
      const mockResult = { available: false, fallback: true };
      const calendarOperation = jest
        .fn()
        .mockRejectedValue(new Error('Calendar service down'));
      const fallbackOperation = jest.fn().mockResolvedValue(mockResult);

      gracefulDegradation.executeWithDegradation.mockResolvedValue(mockResult);

      const result =
        await appointmentErrorHandler.handleCalendarIntegrationError(
          'check_availability',
          mockContext,
          calendarOperation,
          fallbackOperation
        );

      expect(result).toBe(mockResult);
    });

    it('should throw CalendarIntegrationFailureError when no fallback', async () => {
      const calendarOperation = jest
        .fn()
        .mockRejectedValue(new Error('Calendar service down'));

      gracefulDegradation.executeWithDegradation.mockRejectedValue(
        new CalendarIntegrationFailureError(
          'check_availability',
          'calendar_service',
          false
        )
      );

      await expect(
        appointmentErrorHandler.handleCalendarIntegrationError(
          'check_availability',
          mockContext,
          calendarOperation
        )
      ).rejects.toThrow(CalendarIntegrationFailureError);
    });
  });

  describe('generateDetailedErrorMessage', () => {
    it('should generate detailed error message with suggestions', () => {
      const error = new AppointmentNotFoundError('apt-123', 'biz-456');

      const result = appointmentErrorHandler.generateDetailedErrorMessage(
        error,
        mockContext
      );

      expect(result.userMessage).toBe(error.userMessage);
      expect(result.technicalMessage).toBe(error.message);
      expect(result.errorCode).toBe('APPOINTMENT_NOT_FOUND');
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
      expect(result.suggestedActions).toBeInstanceOf(Array);
    });

    it('should add contextual suggestions based on operation', () => {
      const error = new AppointmentNotFoundError('apt-123', 'biz-456');
      const createContext = { ...mockContext, operation: 'create_appointment' };

      const result = appointmentErrorHandler.generateDetailedErrorMessage(
        error,
        createContext
      );

      expect(
        result.suggestedActions.some((s: any) =>
          s.title.includes('available times')
        )
      ).toBe(true);
    });

    it('should limit suggestions to 5 items', () => {
      const manySuggestions = Array.from({ length: 10 }, (_, i) => ({
        type: 'action' as const,
        title: `Suggestion ${i}`,
        description: `Description ${i}`,
      }));

      const error = new AppointmentNotFoundError(
        'apt-123',
        'biz-456',
        manySuggestions
      );

      const result = appointmentErrorHandler.generateDetailedErrorMessage(
        error,
        mockContext
      );

      expect(result.suggestedActions).toHaveLength(5);
    });
  });

  describe('validateContext', () => {
    it('should validate context successfully', () => {
      expect(() => {
        appointmentErrorHandler.validateContext(mockContext);
      }).not.toThrow();
    });

    it('should throw error for missing business ID', () => {
      const invalidContext = { ...mockContext, businessId: '' };

      expect(() => {
        appointmentErrorHandler.validateContext(invalidContext);
      }).toThrow(AppointmentError);
    });

    it('should throw error for missing operation', () => {
      const invalidContext = { ...mockContext, operation: '' };

      expect(() => {
        appointmentErrorHandler.validateContext(invalidContext);
      }).toThrow(AppointmentError);
    });
  });

  describe('error monitoring', () => {
    it('should track error statistics', () => {
      // Simulate some errors
      const error1 = new AppointmentNotFoundError('apt-1', 'biz-1');
      const error2 = new DatabaseConstraintViolationError(
        'create',
        'constraint',
        {}
      );

      appointmentErrorHandler.generateDetailedErrorMessage(error1, mockContext);
      appointmentErrorHandler.generateDetailedErrorMessage(error2, mockContext);

      const stats = appointmentErrorHandler.getErrorStatistics();

      expect(stats).toHaveProperty('totalErrors');
      expect(stats).toHaveProperty('errorsByOperation');
      expect(stats).toHaveProperty('errorsBySeverity');
      expect(stats).toHaveProperty('recentErrors');
    });

    it('should update monitoring configuration', () => {
      const newConfig = {
        enableAlerts: false,
        alertThresholds: {
          errorRate: 20,
          criticalErrors: 10,
        },
      };

      appointmentErrorHandler.updateMonitoringConfig(newConfig);

      // Configuration update should not throw
      expect(() => {
        appointmentErrorHandler.updateMonitoringConfig(newConfig);
      }).not.toThrow();
    });
  });
});

describe('withAppointmentErrorHandling', () => {
  const {
    withEnhancedErrorHandling,
  } = require('@/lib/services/enhanced-error-handler');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should execute operation successfully', async () => {
    const mockResult = { success: true };
    const operation = jest.fn().mockResolvedValue(mockResult);

    withEnhancedErrorHandling.mockResolvedValue(mockResult);

    const result = await withAppointmentErrorHandling(
      'create_appointment',
      mockContext,
      operation
    );

    expect(result).toBe(mockResult);
    expect(withEnhancedErrorHandling).toHaveBeenCalledWith(
      'create_appointment',
      mockContext,
      operation
    );
  });

  it('should handle appointment errors without conversion', async () => {
    const appointmentError = new AppointmentNotFoundError('apt-123', 'biz-456');
    const operation = jest.fn().mockRejectedValue(appointmentError);

    withEnhancedErrorHandling.mockRejectedValue(appointmentError);

    await expect(
      withAppointmentErrorHandling('get_appointment', mockContext, operation)
    ).rejects.toBe(appointmentError);
  });

  it('should convert Prisma errors to appointment errors', async () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError(
      'Record not found',
      {
        code: 'P2025',
        clientVersion: '4.0.0',
      }
    );
    const operation = jest.fn().mockRejectedValue(prismaError);

    withEnhancedErrorHandling.mockRejectedValue(prismaError);

    await expect(
      withAppointmentErrorHandling('get_appointment', mockContext, operation)
    ).rejects.toBeInstanceOf(AppointmentNotFoundError);
  });

  it('should convert unexpected errors to appointment errors', async () => {
    const unexpectedError = new Error('Unexpected error');
    const operation = jest.fn().mockRejectedValue(unexpectedError);

    withEnhancedErrorHandling.mockRejectedValue(unexpectedError);

    await expect(
      withAppointmentErrorHandling('create_appointment', mockContext, operation)
    ).rejects.toBeInstanceOf(AppointmentError);
  });

  it('should validate context before execution', async () => {
    const invalidContext = { ...mockContext, businessId: '' };
    const operation = jest.fn();

    await expect(
      withAppointmentErrorHandling(
        'create_appointment',
        invalidContext,
        operation
      )
    ).rejects.toThrow(AppointmentError);

    expect(operation).not.toHaveBeenCalled();
  });
});

describe('withCalendarIntegrationErrorHandling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should execute calendar operation successfully', async () => {
    const mockResult = { available: true };
    const calendarOperation = jest.fn().mockResolvedValue(mockResult);

    // Mock the handler method
    jest
      .spyOn(appointmentErrorHandler, 'handleCalendarIntegrationError')
      .mockResolvedValue(mockResult);

    const result = await withCalendarIntegrationErrorHandling(
      'check_availability',
      mockContext,
      calendarOperation
    );

    expect(result).toBe(mockResult);
    expect(
      appointmentErrorHandler.handleCalendarIntegrationError
    ).toHaveBeenCalledWith(
      'check_availability',
      mockContext,
      calendarOperation,
      undefined
    );
  });

  it('should execute with fallback operation', async () => {
    const mockResult = { available: false, fallback: true };
    const calendarOperation = jest
      .fn()
      .mockRejectedValue(new Error('Service down'));
    const fallbackOperation = jest.fn().mockResolvedValue(mockResult);

    jest
      .spyOn(appointmentErrorHandler, 'handleCalendarIntegrationError')
      .mockResolvedValue(mockResult);

    const result = await withCalendarIntegrationErrorHandling(
      'check_availability',
      mockContext,
      calendarOperation,
      fallbackOperation
    );

    expect(result).toBe(mockResult);
    expect(
      appointmentErrorHandler.handleCalendarIntegrationError
    ).toHaveBeenCalledWith(
      'check_availability',
      mockContext,
      calendarOperation,
      fallbackOperation
    );
  });
});

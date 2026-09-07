/**
 * Unit tests for AppointmentService
 *
 * Tests the core appointment service layer integration with repository,
 * calendar infrastructure, status management, and multi-service coordination.
 *
 * Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 4.1, 4.2
 */

import {
  AppointmentService,
  CreateAppointmentServiceRequest,
  UpdateAppointmentServiceRequest,
} from '@/lib/services/appointment-service';
import { AppointmentStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Mock dependencies
jest.mock('@/lib/repositories/appointment-repository');
jest.mock('@/lib/services/calendar-integration');
jest.mock('@/lib/services/appointment-status-manager');
jest.mock('@/lib/services/multi-service-coordinator');

describe('AppointmentService', () => {
  let appointmentService: AppointmentService;
  let mockRepository: any;
  let mockStatusManager: any;
  let mockMultiServiceCoordinator: any;
  let mockCalendarIntegration: any;

  const mockBusinessId = 'business-123';
  const mockStaffId = 'staff-123';
  const mockClientId = 'client-123';
  const mockAppointmentId = 'appointment-123';

  const mockServices = [
    {
      serviceId: 'service-1',
      serviceName: 'Haircut',
      price: 50,
      duration: 60,
      serviceOrder: 1,
      startOffset: 0,
    },
    {
      serviceId: 'service-2',
      serviceName: 'Hair Wash',
      price: 20,
      duration: 30,
      serviceOrder: 2,
      startOffset: 60,
    },
  ];

  const mockAppointment = {
    id: mockAppointmentId,
    businessId: mockBusinessId,
    clientId: mockClientId,
    staffId: mockStaffId,
    startTime: new Date('2024-01-15T10:00:00Z'),
    endTime: new Date('2024-01-15T11:30:00Z'),
    status: AppointmentStatus.SCHEDULED,
    totalDuration: 90,
    totalPrice: new Decimal(70),
    services: [
      {
        id: 'as-1',
        serviceId: 'service-1',
        serviceName: 'Haircut',
        price: new Decimal(50),
        duration: 60,
        serviceOrder: 1,
        startOffset: 0,
        service: { id: 'service-1', name: 'Haircut' },
      },
      {
        id: 'as-2',
        serviceId: 'service-2',
        serviceName: 'Hair Wash',
        price: new Decimal(20),
        duration: 30,
        serviceOrder: 2,
        startOffset: 60,
        service: { id: 'service-2', name: 'Hair Wash' },
      },
    ],
    client: {
      id: mockClientId,
      firstName: 'John',
      lastName: 'Doe',
    },
    staff: {
      id: mockStaffId,
      displayName: 'Jane Smith',
      user: { id: 'user-123', name: 'Jane Smith' },
    },
    transactions: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create service instance
    appointmentService = new AppointmentService();

    // Setup mocks
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByBusiness: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateStatus: jest.fn(),
      addServices: jest.fn(),
      removeServices: jest.fn(),
      findByStaff: jest.fn(),
      findByClient: jest.fn(),
      findConflicting: jest.fn(),
      getAppointmentStats: jest.fn(),
      findUpcoming: jest.fn(),
      searchByClient: jest.fn(),
    };

    mockStatusManager = {
      validateStatusTransition: jest.fn(),
      updateStatus: jest.fn(),
      getValidTransitions: jest.fn(),
      triggerStatusEvents: jest.fn(),
      getStatusHistory: jest.fn(),
      validateBusinessContext: jest.fn(),
      getStatusStatistics: jest.fn(),
      bulkUpdateStatus: jest.fn(),
      validateStatusUpdateWithBusinessRules: jest.fn(),
      getAppointmentsNeedingStatusUpdate: jest.fn(),
    };

    mockMultiServiceCoordinator = {
      validateMultiServiceBooking: jest.fn(),
      calculateTotalDuration: jest.fn(),
      calculateTotalPrice: jest.fn(),
      optimizeServiceOrder: jest.fn(),
      handleServiceModification: jest.fn(),
    };

    mockCalendarIntegration = {
      checkAvailability: jest.fn(),
      detectConflicts: jest.fn(),
      validateServiceDuration: jest.fn(),
      invalidateAvailabilityCache: jest.fn(),
    };

    // Replace private instances
    (appointmentService as any).appointmentRepository = mockRepository;
    (appointmentService as any).statusManager = mockStatusManager;
    (appointmentService as any).multiServiceCoordinator =
      mockMultiServiceCoordinator;

    // Mock the CalendarIntegration static methods
    const CalendarIntegration =
      require('@/lib/services/calendar-integration').CalendarIntegration;
    Object.assign(CalendarIntegration, mockCalendarIntegration);
  });

  describe('createAppointment', () => {
    const createRequest: CreateAppointmentServiceRequest = {
      businessId: mockBusinessId,
      clientId: mockClientId,
      staffId: mockStaffId,
      startTime: new Date('2024-01-15T10:00:00Z'),
      endTime: new Date('2024-01-15T11:30:00Z'),
      services: mockServices,
      notes: 'Test appointment',
    };

    it('should create appointment successfully with valid data', async () => {
      // Setup mocks
      mockMultiServiceCoordinator.validateMultiServiceBooking.mockResolvedValue(
        {
          isValid: true,
          errors: [],
          warnings: [],
          totalDuration: 90,
          totalPrice: new Decimal(70),
          optimizedServices: mockServices,
        }
      );

      mockCalendarIntegration.checkAvailability.mockResolvedValue({
        isAvailable: true,
        conflicts: [],
        warnings: [],
        metadata: {
          calculationTime: 100,
          cacheHit: false,
          validationResults: [],
        },
      });

      mockCalendarIntegration.detectConflicts.mockResolvedValue({
        hasConflicts: false,
        conflicts: [],
        warnings: [],
      });

      mockCalendarIntegration.validateServiceDuration.mockResolvedValue({
        isValid: true,
        requiredDuration: 90,
        availableDuration: 90,
      });

      mockMultiServiceCoordinator.calculateTotalPrice.mockResolvedValue(
        new Decimal(70)
      );
      mockRepository.create.mockResolvedValue(mockAppointment);
      mockCalendarIntegration.invalidateAvailabilityCache.mockResolvedValue(
        undefined
      );

      // Execute
      const result = await appointmentService.createAppointment(createRequest);

      // Verify
      expect(result.success).toBe(true);
      expect(result.appointment).toEqual(mockAppointment);
      expect(result.errors).toHaveLength(0);

      expect(
        mockMultiServiceCoordinator.validateMultiServiceBooking
      ).toHaveBeenCalledWith(
        mockServices,
        { startTime: createRequest.startTime, endTime: createRequest.endTime },
        mockStaffId,
        mockBusinessId
      );

      expect(mockCalendarIntegration.checkAvailability).toHaveBeenCalled();
      expect(mockCalendarIntegration.detectConflicts).toHaveBeenCalled();
      expect(
        mockCalendarIntegration.validateServiceDuration
      ).toHaveBeenCalled();
      expect(mockRepository.create).toHaveBeenCalled();
      expect(
        mockCalendarIntegration.invalidateAvailabilityCache
      ).toHaveBeenCalled();
    });

    it('should fail when service validation fails', async () => {
      // Setup mocks
      mockMultiServiceCoordinator.validateMultiServiceBooking.mockResolvedValue(
        {
          isValid: false,
          errors: ['Invalid service combination'],
          warnings: ['Service order warning'],
          totalDuration: 0,
          totalPrice: new Decimal(0),
          optimizedServices: [],
        }
      );

      // Execute
      const result = await appointmentService.createAppointment(createRequest);

      // Verify
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid service combination');
      expect(result.warnings).toContain('Service order warning');
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should fail when time slot is not available', async () => {
      // Setup mocks
      mockMultiServiceCoordinator.validateMultiServiceBooking.mockResolvedValue(
        {
          isValid: true,
          errors: [],
          warnings: [],
          totalDuration: 90,
          totalPrice: new Decimal(70),
          optimizedServices: mockServices,
        }
      );

      mockCalendarIntegration.checkAvailability.mockResolvedValue({
        isAvailable: false,
        conflicts: [
          {
            type: 'STAFF_UNAVAILABLE',
            severity: 'ERROR',
            message: 'Staff not available',
            details: {},
          },
        ],
        warnings: [],
        alternatives: [
          {
            startTime: new Date('2024-01-15T14:00:00Z'),
            endTime: new Date('2024-01-15T15:30:00Z'),
            staffId: mockStaffId,
          },
        ],
        metadata: {
          calculationTime: 100,
          cacheHit: false,
          validationResults: [],
        },
      });

      // Execute
      const result = await appointmentService.createAppointment(createRequest);

      // Verify
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Selected time slot is not available');
      expect(result.warnings).toContain(
        'Alternative times available: 1 options'
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateAppointment', () => {
    const updateRequest: UpdateAppointmentServiceRequest = {
      startTime: new Date('2024-01-15T14:00:00Z'),
      endTime: new Date('2024-01-15T15:30:00Z'),
      notes: 'Updated notes',
    };

    it('should update appointment successfully', async () => {
      // Setup mocks
      mockRepository.findById.mockResolvedValue(mockAppointment);
      mockRepository.update.mockResolvedValue({
        ...mockAppointment,
        ...updateRequest,
      });
      mockCalendarIntegration.invalidateAvailabilityCache.mockResolvedValue(
        undefined
      );

      // Mock validation methods for time/service changes
      mockMultiServiceCoordinator.validateMultiServiceBooking.mockResolvedValue(
        {
          isValid: true,
          errors: [],
          warnings: [],
          totalDuration: 90,
          totalPrice: new Decimal(70),
          optimizedServices: mockServices,
        }
      );

      mockCalendarIntegration.checkAvailability.mockResolvedValue({
        isAvailable: true,
        conflicts: [],
        warnings: [],
        metadata: {
          calculationTime: 100,
          cacheHit: false,
          validationResults: [],
        },
      });

      mockCalendarIntegration.detectConflicts.mockResolvedValue({
        hasConflicts: false,
        conflicts: [],
        warnings: [],
      });

      // Execute
      const result = await appointmentService.updateAppointment(
        mockAppointmentId,
        mockBusinessId,
        updateRequest
      );

      // Verify
      expect(result.success).toBe(true);
      expect(result.appointment?.startTime).toEqual(updateRequest.startTime);
      expect(result.errors).toHaveLength(0);

      expect(mockRepository.findById).toHaveBeenCalledWith(
        mockAppointmentId,
        mockBusinessId
      );
      expect(mockRepository.update).toHaveBeenCalled();
      expect(
        mockCalendarIntegration.invalidateAvailabilityCache
      ).toHaveBeenCalled();
    });

    it('should fail when appointment not found', async () => {
      // Setup mocks
      mockRepository.findById.mockResolvedValue(null);

      // Execute
      const result = await appointmentService.updateAppointment(
        mockAppointmentId,
        mockBusinessId,
        updateRequest
      );

      // Verify
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Appointment not found or access denied');
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('getAppointments', () => {
    const mockAppointments = [mockAppointment];
    const mockPaginatedResult = {
      appointments: mockAppointments,
      total: 1,
      hasMore: false,
    };

    it('should get appointments with basic filtering', async () => {
      // Setup mocks
      mockRepository.findByBusiness.mockResolvedValue(mockPaginatedResult);

      // Execute
      const result = await appointmentService.getAppointments(mockBusinessId, {
        status: AppointmentStatus.SCHEDULED,
        limit: 10,
      });

      // Verify
      expect(result.appointments).toEqual(mockAppointments);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);

      expect(mockRepository.findByBusiness).toHaveBeenCalledWith(
        mockBusinessId,
        {
          status: AppointmentStatus.SCHEDULED,
          limit: 10,
        }
      );
    });
  });

  describe('getAppointmentById', () => {
    it('should get appointment by ID successfully', async () => {
      // Setup mocks
      mockRepository.findById.mockResolvedValue(mockAppointment);

      // Execute
      const result = await appointmentService.getAppointmentById(
        mockAppointmentId,
        mockBusinessId
      );

      // Verify
      expect(result).toEqual(mockAppointment);
      expect(mockRepository.findById).toHaveBeenCalledWith(
        mockAppointmentId,
        mockBusinessId
      );
    });

    it('should return null when appointment not found', async () => {
      // Setup mocks
      mockRepository.findById.mockResolvedValue(null);

      // Execute
      const result = await appointmentService.getAppointmentById(
        mockAppointmentId,
        mockBusinessId
      );

      // Verify
      expect(result).toBeNull();
    });
  });

  describe('cancelAppointment', () => {
    it('should cancel appointment successfully', async () => {
      // Setup mocks
      mockRepository.findById.mockResolvedValue(mockAppointment);
      mockStatusManager.validateStatusUpdateWithBusinessRules.mockResolvedValue(
        {
          isValid: true,
          errors: [],
          warnings: [],
        }
      );
      mockStatusManager.updateStatus.mockResolvedValue({
        success: true,
        appointment: {
          ...mockAppointment,
          status: AppointmentStatus.CANCELLED,
        },
      });
      mockRepository.update.mockResolvedValue({
        ...mockAppointment,
        status: AppointmentStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: 'Client request',
      });
      mockCalendarIntegration.invalidateAvailabilityCache.mockResolvedValue(
        undefined
      );

      // Execute
      const result = await appointmentService.cancelAppointment(
        mockAppointmentId,
        mockBusinessId,
        {
          reason: 'Client request',
          changedBy: 'user-123',
        }
      );

      // Verify
      expect(result.success).toBe(true);
      expect(result.appointment?.status).toBe(AppointmentStatus.CANCELLED);
      expect(result.errors).toHaveLength(0);

      expect(
        mockStatusManager.validateStatusUpdateWithBusinessRules
      ).toHaveBeenCalledWith(
        mockAppointmentId,
        AppointmentStatus.CANCELLED,
        mockBusinessId
      );
      expect(mockStatusManager.updateStatus).toHaveBeenCalledWith(
        mockAppointmentId,
        AppointmentStatus.CANCELLED,
        mockBusinessId,
        { changedBy: 'user-123', reason: 'Client request' }
      );
      expect(
        mockCalendarIntegration.invalidateAvailabilityCache
      ).toHaveBeenCalled();
    });

    it('should fail when appointment not found', async () => {
      // Setup mocks
      mockRepository.findById.mockResolvedValue(null);

      // Execute
      const result = await appointmentService.cancelAppointment(
        mockAppointmentId,
        mockBusinessId
      );

      // Verify
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Appointment not found or access denied');
    });
  });

  describe('error handling', () => {
    it('should handle calendar integration failures gracefully', async () => {
      // Setup mocks
      mockMultiServiceCoordinator.validateMultiServiceBooking.mockResolvedValue(
        {
          isValid: true,
          errors: [],
          warnings: [],
          totalDuration: 90,
          totalPrice: new Decimal(70),
          optimizedServices: mockServices,
        }
      );

      mockCalendarIntegration.checkAvailability.mockRejectedValue(
        new Error('Calendar service unavailable')
      );

      const createRequest: CreateAppointmentServiceRequest = {
        businessId: mockBusinessId,
        clientId: mockClientId,
        staffId: mockStaffId,
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T11:30:00Z'),
        services: mockServices,
      };

      // Execute
      const result = await appointmentService.createAppointment(createRequest);

      // Verify
      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'Failed to create appointment: Calendar service unavailable'
      );
    });

    it('should handle cache invalidation failures silently', async () => {
      // Setup mocks
      mockRepository.findById.mockResolvedValue(mockAppointment);
      mockRepository.update.mockResolvedValue(mockAppointment);
      mockCalendarIntegration.invalidateAvailabilityCache.mockRejectedValue(
        new Error('Cache service unavailable')
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Execute
      const result = await appointmentService.updateAppointment(
        mockAppointmentId,
        mockBusinessId,
        {
          notes: 'Updated notes',
        }
      );

      // Verify
      expect(result.success).toBe(true); // Should still succeed
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to invalidate caches:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});

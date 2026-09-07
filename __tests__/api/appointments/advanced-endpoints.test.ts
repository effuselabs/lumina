/**
 * Advanced Appointment API Integration Tests
 *
 * Tests for multi-service management, conflict checking, and validation endpoints
 * including calendar infrastructure integration and business rules validation.
 *
 * Requirements: 7.1, 7.2, 7.3, 4.1, 4.2, 4.3
 *
 * @version 1.0.0
 * @author Lumina Development Team
 */

import {
  POST as addServices,
  GET as getServices,
  DELETE as removeServices,
} from '@/app/api/appointments/[id]/services/route';
import {
  POST as checkConflicts,
  GET as getConflicts,
} from '@/app/api/appointments/conflicts/route';
import { POST as validateAppointment } from '@/app/api/appointments/validate/route';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { AppointmentStatus } from '@prisma/client';
import { NextRequest } from 'next/server';
import { asMock } from '@/__tests__/utils/prisma-mock-helpers';

// Mock dependencies
jest.mock('@/auth');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    businessUser: {
      findFirst: jest.fn(),
    },
    staff: {
      findFirst: jest.fn(),
    },
    client: {
      findFirst: jest.fn(),
    },
    service: {
      findMany: jest.fn(),
    },
  },
}));

// Mock the services
const mockAppointmentService = {
  getAppointmentById: jest.fn(),
  updateAppointment: jest.fn(),
};

const mockCalendarIntegration = {
  detectConflicts: jest.fn(),
  checkAvailability: jest.fn(),
  validateServiceDuration: jest.fn(),
};

const mockMultiServiceCoordinator = {
  validateMultiServiceBooking: jest.fn(),
};

jest.mock('@/lib/services/appointment-service', () => ({
  AppointmentService: jest.fn(() => mockAppointmentService),
}));

jest.mock('@/lib/services/calendar-integration', () => ({
  CalendarIntegration: mockCalendarIntegration,
}));

jest.mock('@/lib/services/multi-service-coordinator', () => ({
  MultiServiceCoordinator: jest.fn(() => mockMultiServiceCoordinator),
}));

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// Test data
const mockSession = {
  user: {
    id: 'user-123',
    email: 'test@example.com',
  },
};

const mockBusinessUser = {
  id: 'bu-123',
  businessId: 'business-123',
  userId: 'user-123',
  role: 'MANAGER' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockStaff = {
  id: 'staff-123',
  businessId: 'business-123',
  userId: 'user-123',
  displayName: 'John Doe',
  title: null,
  bio: null,
  avatar: null,
  employmentType: 'EMPLOYEE' as const,
  commissionRate: null,
  baseSalary: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  workingHours: {},
  skills: [],
  certifications: [],
  phoneNumber: null,
  emergencyContact: null,
};

const mockClient = {
  id: 'client-123',
  businessId: 'business-123',
  firstName: 'Jane',
  lastName: 'Smith',
  email: 'jane@example.com',
  phone: '+1234567890',
  notes: null,
  address: null,
  dateOfBirth: null,
  preferredStaffId: null,
  emergencyContact: null,
  allergies: null,
  preferences: null,
  loyaltyPoints: 0,
  totalSpent: null,
  lastVisit: null,
  emailMarketing: false,
  smsMarketing: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockServices = [
  {
    id: 'service-123',
    businessId: 'business-123',
    name: 'Haircut',
    price: { toNumber: () => 50 } as any,
    duration: 60,
    category: 'Hair',
    isActive: true,
    description: null,
    isOnline: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'service-456',
    businessId: 'business-123',
    name: 'Styling',
    price: { toNumber: () => 30 } as any,
    duration: 30,
    category: 'Hair',
    isActive: true,
    description: null,
    isOnline: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockAppointment = {
  id: 'appointment-123',
  businessId: 'business-123',
  clientId: 'client-123',
  staffId: 'staff-123',
  startTime: new Date('2024-12-01T10:00:00Z'),
  endTime: new Date('2024-12-01T11:00:00Z'),
  status: AppointmentStatus.SCHEDULED,
  services: [
    {
      id: 'as-123',
      serviceId: 'service-123',
      serviceName: 'Haircut',
      price: { toNumber: () => 50 },
      duration: 60,
      serviceOrder: 1,
      startOffset: 0,
      assignedStaffId: 'staff-123',
    },
  ],
};

describe('Advanced Appointment API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue(mockSession);
    asMock(mockPrisma.businessUser.findFirst).mockResolvedValue(
      mockBusinessUser
    );
    asMock(mockPrisma.staff.findFirst).mockResolvedValue(mockStaff);
    asMock(mockPrisma.client.findFirst).mockResolvedValue(mockClient);
    asMock(mockPrisma.service.findMany).mockResolvedValue(mockServices);
    mockAppointmentService.getAppointmentById.mockResolvedValue(
      mockAppointment
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('POST /api/appointments/[id]/services - Add Services', () => {
    const addServicesData = {
      services: [
        {
          serviceId: 'service-456',
          serviceName: 'Styling',
          price: 30,
          duration: 30,
          serviceOrder: 2,
          startOffset: 60,
        },
      ],
    };

    it('should add services to appointment successfully', async () => {
      const mockResult = {
        success: true,
        appointment: {
          ...mockAppointment,
          services: [...mockAppointment.services, addServicesData.services[0]],
        },
        errors: [],
        warnings: [],
      };
      mockAppointmentService.updateAppointment.mockResolvedValue(mockResult);

      const request = new NextRequest(
        'http://localhost/api/appointments/appointment-123/services?businessId=business-123',
        {
          method: 'POST',
          body: JSON.stringify(addServicesData),
        }
      );

      const response = await addServices(request, {
        params: { id: 'appointment-123' },
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.message).toBe('Services added successfully');
      expect(data.addedServices).toEqual(addServicesData.services);
      expect(mockAppointmentService.updateAppointment).toHaveBeenCalled();
    });

    it('should return 404 when appointment not found', async () => {
      mockAppointmentService.getAppointmentById.mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost/api/appointments/nonexistent/services?businessId=business-123',
        {
          method: 'POST',
          body: JSON.stringify(addServicesData),
        }
      );

      const response = await addServices(request, {
        params: { id: 'nonexistent' },
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Appointment not found');
    });

    it('should return 400 when services not found in business', async () => {
      asMock(mockPrisma.service.findMany).mockResolvedValue([]);

      const request = new NextRequest(
        'http://localhost/api/appointments/appointment-123/services?businessId=business-123',
        {
          method: 'POST',
          body: JSON.stringify(addServicesData),
        }
      );

      const response = await addServices(request, {
        params: { id: 'appointment-123' },
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        'One or more services not found or not active in this business'
      );
    });
  });

  describe('DELETE /api/appointments/[id]/services - Remove Services', () => {
    const removeServicesData = {
      serviceIds: ['service-123'],
    };

    it('should remove services from appointment successfully', async () => {
      const appointmentWithMultipleServices = {
        ...mockAppointment,
        services: [
          ...mockAppointment.services,
          {
            id: 'as-456',
            serviceId: 'service-456',
            serviceName: 'Styling',
            price: { toNumber: () => 30 },
            duration: 30,
            serviceOrder: 2,
            startOffset: 60,
            assignedStaffId: 'staff-123',
          },
        ],
      };
      mockAppointmentService.getAppointmentById.mockResolvedValue(
        appointmentWithMultipleServices
      );

      const mockResult = {
        success: true,
        appointment: {
          ...appointmentWithMultipleServices,
          services: appointmentWithMultipleServices.services.filter(
            (s: any) => s.serviceId !== 'service-123'
          ),
        },
        errors: [],
        warnings: [],
      };
      mockAppointmentService.updateAppointment.mockResolvedValue(mockResult);

      const request = new NextRequest(
        'http://localhost/api/appointments/appointment-123/services?businessId=business-123',
        {
          method: 'DELETE',
          body: JSON.stringify(removeServicesData),
        }
      );

      const response = await removeServices(request, {
        params: { id: 'appointment-123' },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Services removed successfully');
      expect(data.removedServiceIds).toEqual(removeServicesData.serviceIds);
    });

    it('should return 400 when trying to remove all services', async () => {
      const request = new NextRequest(
        'http://localhost/api/appointments/appointment-123/services?businessId=business-123',
        {
          method: 'DELETE',
          body: JSON.stringify(removeServicesData),
        }
      );

      const response = await removeServices(request, {
        params: { id: 'appointment-123' },
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        'Cannot remove all services from appointment. At least one service is required.'
      );
    });
  });

  describe('GET /api/appointments/[id]/services - Get Services', () => {
    it('should return appointment services successfully', async () => {
      const request = new NextRequest(
        'http://localhost/api/appointments/appointment-123/services?businessId=business-123'
      );

      const response = await getServices(request, {
        params: { id: 'appointment-123' },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.appointmentId).toBe('appointment-123');
      expect(data.services).toHaveLength(1);
      expect(data.services[0].serviceName).toBe('Haircut');
      expect(data.totals.duration).toBe(60);
      expect(data.totals.price).toBe(50);
      expect(data.totals.serviceCount).toBe(1);
    });
  });

  describe('GET /api/appointments/conflicts - Check Conflicts', () => {
    it('should check conflicts successfully', async () => {
      const mockConflictResult = {
        hasConflicts: true,
        conflicts: [
          {
            type: 'SCHEDULING_CONFLICT',
            severity: 'HIGH',
            message: 'Overlapping appointment found',
            details: {
              appointmentId: 'other-appointment',
              startTime: new Date('2024-12-01T10:30:00Z'),
              endTime: new Date('2024-12-01T11:30:00Z'),
              clientName: 'Other Client',
              staffName: 'John Doe',
              serviceName: 'Other Service',
            },
          },
        ],
        warnings: [],
      };
      mockCalendarIntegration.detectConflicts.mockResolvedValue(
        mockConflictResult
      );

      const url = new URL(
        'http://localhost/api/appointments/conflicts?businessId=business-123&staffId=staff-123&startDate=2024-12-01T10:00:00Z&endDate=2024-12-01T11:00:00Z'
      );
      const request = new NextRequest(url);

      const response = await getConflicts(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.hasConflicts).toBe(true);
      expect(data.conflictCount).toBe(1);
      expect(data.conflicts).toHaveLength(1);
      expect(data.conflicts[0].type).toBe('SCHEDULING_CONFLICT');
    });
  });

  describe('POST /api/appointments/conflicts - Check Specific Conflicts', () => {
    const conflictCheckData = {
      businessId: 'business-123',
      staffId: 'staff-123',
      startTime: '2024-12-01T10:00:00Z',
      endTime: '2024-12-01T11:00:00Z',
      serviceIds: ['service-123'],
    };

    it('should check conflicts for specific appointment data', async () => {
      const mockConflictResult = {
        hasConflicts: false,
        conflicts: [],
        warnings: [],
      };
      const mockAvailabilityResult = {
        isAvailable: true,
        reason: 'Time slot available',
        alternatives: [],
      };

      mockCalendarIntegration.detectConflicts.mockResolvedValue(
        mockConflictResult
      );
      mockCalendarIntegration.checkAvailability.mockResolvedValue(
        mockAvailabilityResult
      );

      const request = new NextRequest(
        'http://localhost/api/appointments/conflicts',
        {
          method: 'POST',
          body: JSON.stringify(conflictCheckData),
        }
      );

      const response = await checkConflicts(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isAvailable).toBe(true);
      expect(data.hasConflicts).toBe(false);
      expect(data.availability.isAvailable).toBe(true);
      expect(data.conflicts.hasConflicts).toBe(false);
      expect(data.request.staffName).toBe('John Doe');
    });

    it('should return 400 when staff not found', async () => {
      asMock(mockPrisma.staff.findFirst).mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost/api/appointments/conflicts',
        {
          method: 'POST',
          body: JSON.stringify(conflictCheckData),
        }
      );

      const response = await checkConflicts(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        'Staff member not found or not active in this business'
      );
    });
  });

  describe('POST /api/appointments/validate - Validate Appointment', () => {
    const validationData = {
      businessId: 'business-123',
      staffId: 'staff-123',
      startTime: new Date('2024-12-01T10:00:00Z'),
      endTime: new Date('2024-12-01T11:00:00Z'),
      services: ['service-123'],
      clientId: 'client-123',
    };

    it('should validate appointment successfully', async () => {
      // Mock all validation services to return success
      mockMultiServiceCoordinator.validateMultiServiceBooking.mockResolvedValue(
        {
          isValid: true,
          errors: [],
          warnings: [],
          optimizedServices: [
            {
              serviceId: 'service-123',
              serviceName: 'Haircut',
              price: 50,
              duration: 60,
              serviceOrder: 1,
              startOffset: 0,
              assignedStaffId: 'staff-123',
            },
          ],
          totalDuration: 60,
        }
      );

      mockCalendarIntegration.checkAvailability.mockResolvedValue({
        isAvailable: true,
        reason: 'Time slot available',
        alternatives: [],
      });

      mockCalendarIntegration.detectConflicts.mockResolvedValue({
        hasConflicts: false,
        conflicts: [],
        warnings: [],
      });

      mockCalendarIntegration.validateServiceDuration.mockResolvedValue({
        isValid: true,
        reason: 'Duration matches',
      });

      const request = new NextRequest(
        'http://localhost/api/appointments/validate',
        {
          method: 'POST',
          body: JSON.stringify(validationData),
        }
      );

      const response = await validateAppointment(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isValid).toBe(true);
      expect(data.validations.basicValidation.passed).toBe(true);
      expect(data.validations.serviceValidation.passed).toBe(true);
      expect(data.validations.availabilityValidation.passed).toBe(true);
      expect(data.validations.conflictValidation.passed).toBe(true);
      expect(data.validations.durationValidation.passed).toBe(true);
      expect(data.metadata.staff.name).toBe('John Doe');
      expect(data.metadata.client.name).toBe('Jane Smith');
    });

    it('should return validation errors when appointment is invalid', async () => {
      // Mock validation services to return failures
      mockMultiServiceCoordinator.validateMultiServiceBooking.mockResolvedValue(
        {
          isValid: false,
          errors: ['Service duration mismatch'],
          warnings: [],
          optimizedServices: [],
          totalDuration: 0,
        }
      );

      mockCalendarIntegration.checkAvailability.mockResolvedValue({
        isAvailable: false,
        reason: 'Staff not available',
        alternatives: [],
      });

      const request = new NextRequest(
        'http://localhost/api/appointments/validate',
        {
          method: 'POST',
          body: JSON.stringify(validationData),
        }
      );

      const response = await validateAppointment(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isValid).toBe(false);
      expect(data.errors).toContain('Service duration mismatch');
      expect(data.errors).toContain('Selected time slot is not available');
      expect(data.validations.serviceValidation.passed).toBe(false);
      expect(data.validations.availabilityValidation.passed).toBe(false);
    });

    it('should return 400 when staff not found', async () => {
      asMock(mockPrisma.staff.findFirst).mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost/api/appointments/validate',
        {
          method: 'POST',
          body: JSON.stringify(validationData),
        }
      );

      const response = await validateAppointment(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        'Staff member not found or not active in this business'
      );
    });

    it('should return 400 when services not found', async () => {
      asMock(mockPrisma.service.findMany).mockResolvedValue([]);

      const request = new NextRequest(
        'http://localhost/api/appointments/validate',
        {
          method: 'POST',
          body: JSON.stringify(validationData),
        }
      );

      const response = await validateAppointment(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        'One or more services not found or not active in this business'
      );
    });
  });
});

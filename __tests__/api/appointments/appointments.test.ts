/**
 * Appointments API Integration Tests
 *
 * Comprehensive integration tests for appointment CRUD operations,
 * testing business context validation, multi-tenant security,
 * and proper error handling.
 *
 * Requirements: 1.1, 2.1, 3.1, 3.2, 6.1, 6.2
 *
 * @version 1.0.0
 * @author Lumina Development Team
 */

import { DELETE, GET as getById, PUT } from '@/app/api/appointments/[id]/route';
import { GET, POST } from '@/app/api/appointments/route';
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

// Mock the AppointmentService class
const mockAppointmentService = {
  getAppointments: jest.fn(),
  createAppointment: jest.fn(),
  getAppointmentById: jest.fn(),
  updateAppointment: jest.fn(),
  cancelAppointment: jest.fn(),
};

jest.mock('@/lib/services/appointment-service', () => ({
  AppointmentService: jest.fn(() => mockAppointmentService),
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
  role: 'MANAGER',
};

const mockStaff = {
  id: 'staff-123',
  businessId: 'business-123',
  displayName: 'John Doe',
  isActive: true,
};

const mockClient = {
  id: 'client-123',
  businessId: 'business-123',
  firstName: 'Jane',
  lastName: 'Smith',
};

const mockService = {
  id: 'service-123',
  businessId: 'business-123',
  name: 'Haircut',
  price: 50,
  duration: 60,
  isActive: true,
};

const mockAppointment = {
  id: 'appointment-123',
  businessId: 'business-123',
  clientId: 'client-123',
  staffId: 'staff-123',
  startTime: new Date('2024-12-01T10:00:00Z'),
  endTime: new Date('2024-12-01T11:00:00Z'),
  status: AppointmentStatus.SCHEDULED,
  totalDuration: 60,
  totalPrice: 50,
  services: [
    {
      id: 'as-123',
      serviceId: 'service-123',
      serviceName: 'Haircut',
      price: 50,
      duration: 60,
      serviceOrder: 1,
      startOffset: 0,
    },
  ],
  client: mockClient,
  staff: mockStaff,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock AppointmentService
const mockAppointmentService = {
  getAppointments: jest.fn(),
  createAppointment: jest.fn(),
  getAppointmentById: jest.fn(),
  updateAppointment: jest.fn(),
  cancelAppointment: jest.fn(),
};

jest.doMock('@/lib/services/appointment-service', () => ({
  AppointmentService: jest.fn(() => mockAppointmentService),
}));

describe('Appointments API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue(mockSession);
    asMock(mockPrisma.businessUser.findFirst).mockResolvedValue(
      mockBusinessUser
    );
    asMock(mockPrisma.staff.findFirst).mockResolvedValue(mockStaff);
    asMock(mockPrisma.client.findFirst).mockResolvedValue(mockClient);
    asMock(mockPrisma.service.findMany).mockResolvedValue([mockService]);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /api/appointments', () => {
    it('should return appointments with valid business access', async () => {
      const mockResult = {
        appointments: [mockAppointment],
        total: 1,
        hasMore: false,
        nextOffset: undefined,
      };
      mockAppointmentService.getAppointments.mockResolvedValue(mockResult);

      const url = new URL(
        'http://localhost/api/appointments?businessId=business-123&limit=20&offset=0'
      );
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.appointments).toHaveLength(1);
      expect(data.appointments[0].id).toBe('appointment-123');
      expect(data.pagination.total).toBe(1);
      expect(mockPrisma.businessUser.findFirst).toHaveBeenCalledWith({
        where: {
          businessId: 'business-123',
          userId: 'user-123',
        },
      });
    });

    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const url = new URL(
        'http://localhost/api/appointments?businessId=business-123'
      );
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 when businessId is missing', async () => {
      const url = new URL('http://localhost/api/appointments');
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Business ID is required');
    });

    it('should return 403 when user has no access to business', async () => {
      asMock(mockPrisma.businessUser.findFirst).mockResolvedValue(null);

      const url = new URL(
        'http://localhost/api/appointments?businessId=business-123'
      );
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied');
    });

    it('should handle validation errors for query parameters', async () => {
      const url = new URL(
        'http://localhost/api/appointments?businessId=business-123&limit=invalid'
      );
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
      expect(data.details).toBeDefined();
    });
  });

  describe('POST /api/appointments', () => {
    const validAppointmentData = {
      businessId: 'business-123',
      staffId: 'staff-123',
      clientId: 'client-123',
      startTime: '2024-12-01T10:00:00Z',
      endTime: '2024-12-01T11:00:00Z',
      services: [
        {
          serviceId: 'service-123',
          serviceName: 'Haircut',
          price: 50,
          duration: 60,
          serviceOrder: 1,
          startOffset: 0,
        },
      ],
    };

    it('should create appointment with valid data', async () => {
      const mockResult = {
        success: true,
        appointment: mockAppointment,
        errors: [],
        warnings: [],
      };
      mockAppointmentService.createAppointment.mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost/api/appointments', {
        method: 'POST',
        body: JSON.stringify(validAppointmentData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.appointment.id).toBe('appointment-123');
      expect(mockAppointmentService.createAppointment).toHaveBeenCalledWith(
        expect.objectContaining({
          businessId: 'business-123',
          staffId: 'staff-123',
          clientId: 'client-123',
        })
      );
    });

    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/appointments', {
        method: 'POST',
        body: JSON.stringify(validAppointmentData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 when user has no access to business', async () => {
      asMock(mockPrisma.businessUser.findFirst).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/appointments', {
        method: 'POST',
        body: JSON.stringify(validAppointmentData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied');
    });

    it('should return 400 when staff not found in business', async () => {
      asMock(mockPrisma.staff.findFirst).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/appointments', {
        method: 'POST',
        body: JSON.stringify(validAppointmentData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        'Staff member not found or not active in this business'
      );
    });

    it('should return 400 when client not found in business', async () => {
      asMock(mockPrisma.client.findFirst).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/appointments', {
        method: 'POST',
        body: JSON.stringify(validAppointmentData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Client not found in this business');
    });

    it('should return 400 when services not found in business', async () => {
      asMock(mockPrisma.service.findMany).mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/appointments', {
        method: 'POST',
        body: JSON.stringify(validAppointmentData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        'One or more services not found or not active in this business'
      );
    });

    it('should handle validation errors', async () => {
      const invalidData = {
        ...validAppointmentData,
        startTime: 'invalid-date',
      };

      const request = new NextRequest('http://localhost/api/appointments', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
      expect(data.details).toBeDefined();
    });

    it('should handle appointment service errors', async () => {
      const mockResult = {
        success: false,
        errors: ['Slot not available'],
        warnings: ['Peak time booking'],
      };
      mockAppointmentService.createAppointment.mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost/api/appointments', {
        method: 'POST',
        body: JSON.stringify(validAppointmentData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Failed to create appointment');
      expect(data.details).toContain('Slot not available');
      expect(data.warnings).toContain('Peak time booking');
    });

    it('should accept walk-in appointments with client contact info', async () => {
      const walkInData = {
        ...validAppointmentData,
        clientId: undefined,
        clientName: 'Walk-in Client',
        clientEmail: 'walkin@example.com',
        clientPhone: '+1234567890',
      };

      const mockResult = {
        success: true,
        appointment: { ...mockAppointment, clientId: null },
        errors: [],
        warnings: [],
      };
      mockAppointmentService.createAppointment.mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost/api/appointments', {
        method: 'POST',
        body: JSON.stringify(walkInData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(mockAppointmentService.createAppointment).toHaveBeenCalledWith(
        expect.objectContaining({
          clientName: 'Walk-in Client',
          clientEmail: 'walkin@example.com',
          clientPhone: '+1234567890',
        })
      );
    });
  });

  describe('GET /api/appointments/[id]', () => {
    it('should return appointment by ID with valid access', async () => {
      mockAppointmentService.getAppointmentById.mockResolvedValue(
        mockAppointment
      );

      const url = new URL(
        'http://localhost/api/appointments/appointment-123?businessId=business-123'
      );
      const request = new NextRequest(url);

      const response = await getById(request, {
        params: { id: 'appointment-123' },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.appointment.id).toBe('appointment-123');
      expect(mockAppointmentService.getAppointmentById).toHaveBeenCalledWith(
        'appointment-123',
        'business-123',
        { includeConflicts: false, validateAvailability: false }
      );
    });

    it('should return 404 when appointment not found', async () => {
      mockAppointmentService.getAppointmentById.mockResolvedValue(null);

      const url = new URL(
        'http://localhost/api/appointments/nonexistent?businessId=business-123'
      );
      const request = new NextRequest(url);

      const response = await getById(request, {
        params: { id: 'nonexistent' },
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Appointment not found');
    });

    it('should include conflicts and availability when requested', async () => {
      mockAppointmentService.getAppointmentById.mockResolvedValue(
        mockAppointment
      );

      const url = new URL(
        'http://localhost/api/appointments/appointment-123?businessId=business-123&includeConflicts=true&validateAvailability=true'
      );
      const request = new NextRequest(url);

      const response = await getById(request, {
        params: { id: 'appointment-123' },
      });

      expect(response.status).toBe(200);
      expect(mockAppointmentService.getAppointmentById).toHaveBeenCalledWith(
        'appointment-123',
        'business-123',
        { includeConflicts: true, validateAvailability: true }
      );
    });
  });

  describe('PUT /api/appointments/[id]', () => {
    const updateData = {
      businessId: 'business-123',
      notes: 'Updated notes',
      startTime: '2024-12-01T11:00:00Z',
      endTime: '2024-12-01T12:00:00Z',
    };

    it('should update appointment with valid data', async () => {
      const mockResult = {
        success: true,
        appointment: { ...mockAppointment, notes: 'Updated notes' },
        errors: [],
        warnings: [],
      };
      mockAppointmentService.updateAppointment.mockResolvedValue(mockResult);

      const request = new NextRequest(
        'http://localhost/api/appointments/appointment-123',
        {
          method: 'PUT',
          body: JSON.stringify(updateData),
        }
      );

      const response = await PUT(request, {
        params: { id: 'appointment-123' },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.appointment.notes).toBe('Updated notes');
      expect(mockAppointmentService.updateAppointment).toHaveBeenCalledWith(
        'appointment-123',
        'business-123',
        expect.objectContaining({
          notes: 'Updated notes',
        })
      );
    });

    it('should handle update service errors', async () => {
      const mockResult = {
        success: false,
        errors: ['Time slot not available'],
        warnings: [],
      };
      mockAppointmentService.updateAppointment.mockResolvedValue(mockResult);

      const request = new NextRequest(
        'http://localhost/api/appointments/appointment-123',
        {
          method: 'PUT',
          body: JSON.stringify(updateData),
        }
      );

      const response = await PUT(request, {
        params: { id: 'appointment-123' },
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Failed to update appointment');
      expect(data.details).toContain('Time slot not available');
    });
  });

  describe('DELETE /api/appointments/[id]', () => {
    it('should cancel appointment successfully', async () => {
      const mockResult = {
        success: true,
        appointment: {
          ...mockAppointment,
          status: AppointmentStatus.CANCELLED,
        },
        errors: [],
        warnings: [],
      };
      mockAppointmentService.cancelAppointment.mockResolvedValue(mockResult);

      const url = new URL(
        'http://localhost/api/appointments/appointment-123?businessId=business-123'
      );
      const request = new NextRequest(url, { method: 'DELETE' });

      const response = await DELETE(request, {
        params: { id: 'appointment-123' },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.appointment.status).toBe(AppointmentStatus.CANCELLED);
      expect(data.message).toBe('Appointment cancelled successfully');
      expect(mockAppointmentService.cancelAppointment).toHaveBeenCalledWith(
        'appointment-123',
        'business-123',
        expect.objectContaining({
          changedBy: 'user-123',
        })
      );
    });

    it('should handle cancellation with options', async () => {
      const mockResult = {
        success: true,
        appointment: {
          ...mockAppointment,
          status: AppointmentStatus.CANCELLED,
        },
        errors: [],
        warnings: [],
      };
      mockAppointmentService.cancelAppointment.mockResolvedValue(mockResult);

      const cancelOptions = {
        reason: 'Client requested',
        refundAmount: 25,
        notifyClient: true,
      };

      const request = new NextRequest(
        'http://localhost/api/appointments/appointment-123?businessId=business-123',
        {
          method: 'DELETE',
          body: JSON.stringify(cancelOptions),
        }
      );

      const response = await DELETE(request, {
        params: { id: 'appointment-123' },
      });

      expect(response.status).toBe(200);
      expect(mockAppointmentService.cancelAppointment).toHaveBeenCalledWith(
        'appointment-123',
        'business-123',
        expect.objectContaining({
          reason: 'Client requested',
          refundAmount: 25,
          notifyClient: true,
          changedBy: 'user-123',
        })
      );
    });

    it('should handle cancellation service errors', async () => {
      const mockResult = {
        success: false,
        errors: ['Cannot cancel completed appointment'],
        warnings: [],
      };
      mockAppointmentService.cancelAppointment.mockResolvedValue(mockResult);

      const url = new URL(
        'http://localhost/api/appointments/appointment-123?businessId=business-123'
      );
      const request = new NextRequest(url, { method: 'DELETE' });

      const response = await DELETE(request, {
        params: { id: 'appointment-123' },
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Failed to cancel appointment');
      expect(data.details).toContain('Cannot cancel completed appointment');
    });
  });
});

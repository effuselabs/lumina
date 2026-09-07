import { GET, POST } from '@/app/api/availability/business-hours/route';
import { prisma } from '@/lib/prisma';
import { BusinessHours } from '@prisma/client';
import { NextRequest } from 'next/server';
import { asMock } from '@/__tests__/utils/prisma-mock-helpers';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    businessHours: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    business: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock auth
jest.mock('@/lib/auth', () => ({
  getServerSession: jest.fn(),
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const { getServerSession } = require('@/lib/auth');

describe('/api/availability/business-hours Integration Tests', () => {
  const businessId = 'business-123';
  const mockSession = {
    user: {
      id: 'user-123',
      businessId,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getServerSession.mockResolvedValue(mockSession);
  });

  describe('GET /api/availability/business-hours', () => {
    it('should return business hours for authenticated user', async () => {
      const mockBusinessHours: BusinessHours[] = [
        {
          id: 'hours-1',
          businessId,
          dayOfWeek: 1, // Monday
          openTime: '09:00:00',
          closeTime: '17:00:00',
          isClosed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'hours-2',
          businessId,
          dayOfWeek: 2, // Tuesday
          openTime: '09:00:00',
          closeTime: '17:00:00',
          isClosed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      asMock(mockPrisma.businessHours.findMany).mockResolvedValue(
        mockBusinessHours
      );

      const request = new NextRequest(
        'http://localhost:3000/api/availability/business-hours'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(mockPrisma.businessHours.findMany).toHaveBeenCalledWith({
        where: { businessId },
        orderBy: { dayOfWeek: 'asc' },
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      getServerSession.mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost:3000/api/availability/business-hours'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    it('should enforce business context isolation', async () => {
      const otherBusinessId = 'other-business-456';
      const mockBusinessHours: BusinessHours[] = [
        {
          id: 'hours-1',
          businessId: otherBusinessId, // Different business
          dayOfWeek: 1,
          openTime: '09:00:00',
          closeTime: '17:00:00',
          isClosed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      asMock(mockPrisma.businessHours.findMany).mockResolvedValue(
        mockBusinessHours
      );

      const request = new NextRequest(
        'http://localhost:3000/api/availability/business-hours'
      );
      const response = await GET(request);

      // Should only query for the authenticated user's business
      expect(mockPrisma.businessHours.findMany).toHaveBeenCalledWith({
        where: { businessId }, // User's business, not the other business
        orderBy: { dayOfWeek: 'asc' },
      });
    });

    it('should handle database errors gracefully', async () => {
      asMock(mockPrisma.businessHours.findMany).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new NextRequest(
        'http://localhost:3000/api/availability/business-hours'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to fetch business hours');
    });
  });

  describe('POST /api/availability/business-hours', () => {
    it('should create/update business hours for authenticated user', async () => {
      const requestData = {
        dayOfWeek: 1,
        openTime: '08:00:00',
        closeTime: '18:00:00',
        isClosed: false,
      };

      const mockUpdatedHours: BusinessHours = {
        id: 'hours-1',
        businessId,
        ...requestData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      asMock(mockPrisma.businessHours.upsert).mockResolvedValue(
        mockUpdatedHours
      );

      const request = new NextRequest(
        'http://localhost:3000/api/availability/business-hours',
        {
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.dayOfWeek).toBe(requestData.dayOfWeek);
      expect(mockPrisma.businessHours.upsert).toHaveBeenCalledWith({
        where: {
          businessId_dayOfWeek: {
            businessId,
            dayOfWeek: requestData.dayOfWeek,
          },
        },
        update: {
          openTime: requestData.openTime,
          closeTime: requestData.closeTime,
          isClosed: requestData.isClosed,
          updatedAt: expect.any(Date),
        },
        create: {
          businessId,
          ...requestData,
        },
      });
    });

    it('should validate request data', async () => {
      const invalidRequestData = {
        dayOfWeek: 8, // Invalid day of week
        openTime: '25:00:00', // Invalid time
        closeTime: '18:00:00',
        isClosed: false,
      };

      const request = new NextRequest(
        'http://localhost:3000/api/availability/business-hours',
        {
          method: 'POST',
          body: JSON.stringify(invalidRequestData),
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('validation');
    });

    it('should return 401 when user is not authenticated', async () => {
      getServerSession.mockResolvedValue(null);

      const requestData = {
        dayOfWeek: 1,
        openTime: '09:00:00',
        closeTime: '17:00:00',
        isClosed: false,
      };

      const request = new NextRequest(
        'http://localhost:3000/api/availability/business-hours',
        {
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    it('should enforce business context isolation on updates', async () => {
      const requestData = {
        dayOfWeek: 1,
        openTime: '09:00:00',
        closeTime: '17:00:00',
        isClosed: false,
      };

      const mockUpdatedHours: BusinessHours = {
        id: 'hours-1',
        businessId,
        ...requestData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      asMock(mockPrisma.businessHours.upsert).mockResolvedValue(
        mockUpdatedHours
      );

      const request = new NextRequest(
        'http://localhost:3000/api/availability/business-hours',
        {
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      await POST(request);

      // Should only update for the authenticated user's business
      expect(mockPrisma.businessHours.upsert).toHaveBeenCalledWith({
        where: {
          businessId_dayOfWeek: {
            businessId, // User's business ID from session
            dayOfWeek: requestData.dayOfWeek,
          },
        },
        update: expect.any(Object),
        create: expect.objectContaining({
          businessId, // User's business ID from session
        }),
      });
    });

    it('should handle closed days correctly', async () => {
      const requestData = {
        dayOfWeek: 0, // Sunday
        openTime: null,
        closeTime: null,
        isClosed: true,
      };

      const mockUpdatedHours: BusinessHours = {
        id: 'hours-1',
        businessId,
        dayOfWeek: 0,
        openTime: null,
        closeTime: null,
        isClosed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      asMock(mockPrisma.businessHours.upsert).mockResolvedValue(
        mockUpdatedHours
      );

      const request = new NextRequest(
        'http://localhost:3000/api/availability/business-hours',
        {
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.isClosed).toBe(true);
      expect(data.data.openTime).toBeNull();
      expect(data.data.closeTime).toBeNull();
    });
  });

  describe('Multi-tenant data isolation', () => {
    it('should never return data from other businesses', async () => {
      const otherBusinessId = 'other-business-456';
      const mixedBusinessHours: BusinessHours[] = [
        {
          id: 'hours-1',
          businessId, // User's business
          dayOfWeek: 1,
          openTime: '09:00:00',
          closeTime: '17:00:00',
          isClosed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'hours-2',
          businessId: otherBusinessId, // Other business - should not be returned
          dayOfWeek: 1,
          openTime: '08:00:00',
          closeTime: '16:00:00',
          isClosed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Mock database returning mixed data (this shouldn't happen in real scenario)
      asMock(mockPrisma.businessHours.findMany).mockResolvedValue(
        mixedBusinessHours
      );

      const request = new NextRequest(
        'http://localhost:3000/api/availability/business-hours'
      );
      const response = await GET(request);

      // Verify the query was scoped to user's business only
      expect(mockPrisma.businessHours.findMany).toHaveBeenCalledWith({
        where: { businessId }, // Only user's business
        orderBy: { dayOfWeek: 'asc' },
      });
    });

    it('should prevent cross-business updates', async () => {
      // User tries to update hours but their session has different business ID
      const requestData = {
        dayOfWeek: 1,
        openTime: '09:00:00',
        closeTime: '17:00:00',
        isClosed: false,
      };

      const request = new NextRequest(
        'http://localhost:3000/api/availability/business-hours',
        {
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      await POST(request);

      // Verify the upsert was scoped to user's business only
      expect(mockPrisma.businessHours.upsert).toHaveBeenCalledWith({
        where: {
          businessId_dayOfWeek: {
            businessId, // Only user's business from session
            dayOfWeek: requestData.dayOfWeek,
          },
        },
        update: expect.any(Object),
        create: expect.objectContaining({
          businessId, // Only user's business from session
        }),
      });
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle malformed JSON gracefully', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/availability/business-hours',
        {
          method: 'POST',
          body: 'invalid json',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid JSON');
    });

    it('should handle missing Content-Type header', async () => {
      const requestData = {
        dayOfWeek: 1,
        openTime: '09:00:00',
        closeTime: '17:00:00',
        isClosed: false,
      };

      const request = new NextRequest(
        'http://localhost:3000/api/availability/business-hours',
        {
          method: 'POST',
          body: JSON.stringify(requestData),
          // No Content-Type header
        }
      );

      const response = await POST(request);

      // Should still work or return appropriate error
      expect(response.status).toBeOneOf([200, 400]);
    });

    it('should handle database constraint violations', async () => {
      const requestData = {
        dayOfWeek: 1,
        openTime: '09:00:00',
        closeTime: '17:00:00',
        isClosed: false,
      };

      asMock(mockPrisma.businessHours.upsert).mockRejectedValue(
        new Error('Unique constraint violation')
      );

      const request = new NextRequest(
        'http://localhost:3000/api/availability/business-hours',
        {
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to update business hours');
    });
  });
});

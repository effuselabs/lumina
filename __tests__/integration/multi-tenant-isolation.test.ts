import { GET as getBusinessHours } from '@/app/api/availability/business-hours/route';
// import { GET as getStaffAvailability } from '@/app/api/availability/staff/route' // GET not implemented yet
import { GET as getTimeOffRequests } from '@/app/api/availability/time-off/route';
import { prisma } from '@/lib/prisma';
import { BusinessHours, Staff, StaffAvailability } from '@prisma/client';
import { NextRequest } from 'next/server';
import { asMock } from '@/__tests__/utils/prisma-mock-helpers';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    businessHours: {
      findMany: jest.fn(),
    },
    staff: {
      findMany: jest.fn(),
    },
    staffAvailability: {
      findMany: jest.fn(),
    },
    staffAvailabilityOverride: {
      findMany: jest.fn(),
    },
    timeOffRequest: {
      findMany: jest.fn(),
    },
  },
}));

// Mock auth
jest.mock('@/lib/auth', () => ({
  getServerSession: jest.fn(),
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const { getServerSession } = require('@/lib/auth');

describe('Multi-Tenant Data Isolation Integration Tests', () => {
  const businessA = 'business-a-123';
  const businessB = 'business-b-456';
  const businessC = 'business-c-789';

  const staffA1 = 'staff-a1-123';
  const staffA2 = 'staff-a2-456';
  const staffB1 = 'staff-b1-789';
  const staffC1 = 'staff-c1-012';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Business Hours Isolation', () => {
    it('should only return business hours for authenticated business', async () => {
      // Mock session for Business A
      const sessionA = {
        user: { id: 'user-a', businessId: businessA, role: 'OWNER' },
      };
      getServerSession.mockResolvedValue(sessionA);

      // Mock mixed business hours data (simulating database with multiple businesses)
      const mixedBusinessHours: BusinessHours[] = [
        {
          id: 'hours-a1',
          businessId: businessA, // Business A
          dayOfWeek: 1,
          openTime: '09:00:00',
          closeTime: '17:00:00',
          isClosed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'hours-a2',
          businessId: businessA, // Business A
          dayOfWeek: 2,
          openTime: '09:00:00',
          closeTime: '17:00:00',
          isClosed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'hours-b1',
          businessId: businessB, // Business B - should not be accessible
          dayOfWeek: 1,
          openTime: '08:00:00',
          closeTime: '18:00:00',
          isClosed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'hours-c1',
          businessId: businessC, // Business C - should not be accessible
          dayOfWeek: 1,
          openTime: '10:00:00',
          closeTime: '16:00:00',
          isClosed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Database should only return Business A data due to WHERE clause
      const businessAHours = mixedBusinessHours.filter(
        (h: any) => h.businessId === businessA
      );
      asMock(mockPrisma.businessHours.findMany).mockResolvedValue(
        businessAHours
      );

      const request = new NextRequest(
        'http://localhost:3000/api/availability/business-hours'
      );
      const response = await getBusinessHours(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2); // Only Business A hours
      expect(data.data.every((h: any) => h.businessId === businessA)).toBe(
        true
      );

      // Verify query was scoped to Business A only
      expect(mockPrisma.businessHours.findMany).toHaveBeenCalledWith({
        where: { businessId: businessA },
        orderBy: { dayOfWeek: 'asc' },
      });
    });

    it('should isolate business hours across different authenticated users', async () => {
      // Test Business B user
      const sessionB = {
        user: { id: 'user-b', businessId: businessB, role: 'OWNER' },
      };
      getServerSession.mockResolvedValue(sessionB);

      const businessBHours: BusinessHours[] = [
        {
          id: 'hours-b1',
          businessId: businessB,
          dayOfWeek: 1,
          openTime: '08:00:00',
          closeTime: '18:00:00',
          isClosed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      asMock(mockPrisma.businessHours.findMany).mockResolvedValue(
        businessBHours
      );

      const request = new NextRequest(
        'http://localhost:3000/api/availability/business-hours'
      );
      const response = await getBusinessHours(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].businessId).toBe(businessB);
      expect(data.data[0].openTime).toBe('08:00:00'); // Different from Business A

      // Verify query was scoped to Business B only
      expect(mockPrisma.businessHours.findMany).toHaveBeenCalledWith({
        where: { businessId: businessB },
        orderBy: { dayOfWeek: 'asc' },
      });
    });
  });

  describe('Staff Availability Isolation', () => {
    it('should only return staff and availability for authenticated business', async () => {
      const sessionA = {
        user: { id: 'user-a', businessId: businessA, role: 'OWNER' },
      };
      getServerSession.mockResolvedValue(sessionA);

      // Mock mixed staff data
      const mixedStaff: Staff[] = [
        {
          id: staffA1,
          businessId: businessA, // Business A
          name: 'Staff A1',
          email: 'staff-a1@example.com',
          role: 'STAFF',
          isActive: true,
          workingHours: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: staffA2,
          businessId: businessA, // Business A
          name: 'Staff A2',
          email: 'staff-a2@example.com',
          role: 'STAFF',
          isActive: true,
          workingHours: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: staffB1,
          businessId: businessB, // Business B - should not be accessible
          name: 'Staff B1',
          email: 'staff-b1@example.com',
          role: 'STAFF',
          isActive: true,
          workingHours: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Mock mixed availability data
      const mixedAvailability: StaffAvailability[] = [
        {
          id: 'avail-a1-1',
          staffId: staffA1,
          businessId: businessA, // Business A
          dayOfWeek: 1,
          startTime: '09:00:00',
          endTime: '17:00:00',
          isRecurring: true,
          effectiveDate: null,
          expiryDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'avail-b1-1',
          staffId: staffB1,
          businessId: businessB, // Business B - should not be accessible
          dayOfWeek: 1,
          startTime: '08:00:00',
          endTime: '18:00:00',
          isRecurring: true,
          effectiveDate: null,
          expiryDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Database should only return Business A data
      const businessAStaff = mixedStaff.filter(
        (s: any) => s.businessId === businessA
      );
      const businessAAvailability = mixedAvailability.filter(
        (a: any) => a.businessId === businessA
      );

      asMock(mockPrisma.staff.findMany).mockResolvedValue(businessAStaff);
      asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue(
        businessAAvailability
      );
      asMock(mockPrisma.staffAvailabilityOverride.findMany).mockResolvedValue(
        []
      );

      const request = new NextRequest(
        'http://localhost:3000/api/availability/staff'
      );
      const response = await getStaffAvailability(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2); // Only Business A staff
      expect(
        data.data.every((s: any) => s.staff.id.startsWith('staff-a'))
      ).toBe(true);

      // Verify staff query was scoped to Business A only
      expect(mockPrisma.staff.findMany).toHaveBeenCalledWith({
        where: { businessId: businessA, isActive: true },
        select: expect.any(Object),
      });

      // Verify availability queries were scoped to Business A staff only
      expect(mockPrisma.staffAvailability.findMany).toHaveBeenCalledWith({
        where: {
          staffId: { in: [staffA1, staffA2] }, // Only Business A staff IDs
          OR: expect.any(Array),
        },
        orderBy: expect.any(Array),
      });
    });

    it('should prevent cross-business staff data leakage', async () => {
      const sessionB = {
        user: { id: 'user-b', businessId: businessB, role: 'OWNER' },
      };
      getServerSession.mockResolvedValue(sessionB);

      const businessBStaff: Staff[] = [
        {
          id: staffB1,
          businessId: businessB,
          name: 'Staff B1',
          email: 'staff-b1@example.com',
          role: 'STAFF',
          isActive: true,
          workingHours: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const businessBAvailability: StaffAvailability[] = [
        {
          id: 'avail-b1-1',
          staffId: staffB1,
          businessId: businessB,
          dayOfWeek: 1,
          startTime: '08:00:00',
          endTime: '18:00:00',
          isRecurring: true,
          effectiveDate: null,
          expiryDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      asMock(mockPrisma.staff.findMany).mockResolvedValue(businessBStaff);
      asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue(
        businessBAvailability
      );
      asMock(mockPrisma.staffAvailabilityOverride.findMany).mockResolvedValue(
        []
      );

      const request = new NextRequest(
        'http://localhost:3000/api/availability/staff'
      );
      const response = await getStaffAvailability(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].staff.id).toBe(staffB1);
      expect(data.data[0].staff.name).toBe('Staff B1');

      // Verify no Business A data is returned
      expect(
        data.data.every((s: any) => !s.staff.id.startsWith('staff-a'))
      ).toBe(true);

      // Verify query was scoped to Business B only
      expect(mockPrisma.staff.findMany).toHaveBeenCalledWith({
        where: { businessId: businessB, isActive: true },
        select: expect.any(Object),
      });
    });
  });

  describe('Time-Off Request Isolation', () => {
    it('should only return time-off requests for authenticated business', async () => {
      const sessionA = {
        user: { id: 'user-a', businessId: businessA, role: 'OWNER' },
      };
      getServerSession.mockResolvedValue(sessionA);

      // Mock mixed time-off requests
      const mixedTimeOffRequests = [
        {
          id: 'request-a1',
          staffId: staffA1,
          businessId: businessA, // Business A
          startDate: new Date('2024-01-15'),
          endDate: new Date('2024-01-17'),
          reason: 'Vacation A1',
          status: 'PENDING',
          staff: {
            id: staffA1,
            name: 'Staff A1',
            email: 'staff-a1@example.com',
          },
        },
        {
          id: 'request-a2',
          staffId: staffA2,
          businessId: businessA, // Business A
          startDate: new Date('2024-01-20'),
          endDate: new Date('2024-01-22'),
          reason: 'Vacation A2',
          status: 'APPROVED',
          staff: {
            id: staffA2,
            name: 'Staff A2',
            email: 'staff-a2@example.com',
          },
        },
        {
          id: 'request-b1',
          staffId: staffB1,
          businessId: businessB, // Business B - should not be accessible
          startDate: new Date('2024-01-18'),
          endDate: new Date('2024-01-19'),
          reason: 'Vacation B1',
          status: 'PENDING',
          staff: {
            id: staffB1,
            name: 'Staff B1',
            email: 'staff-b1@example.com',
          },
        },
        {
          id: 'request-c1',
          staffId: staffC1,
          businessId: businessC, // Business C - should not be accessible
          startDate: new Date('2024-01-25'),
          endDate: new Date('2024-01-26'),
          reason: 'Vacation C1',
          status: 'DENIED',
          staff: {
            id: staffC1,
            name: 'Staff C1',
            email: 'staff-c1@example.com',
          },
        },
      ];

      // Database should only return Business A data
      const businessARequests = mixedTimeOffRequests.filter(
        (r: any) => r.businessId === businessA
      );
      asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue(
        businessARequests as any
      );

      const request = new NextRequest(
        'http://localhost:3000/api/availability/time-off'
      );
      const response = await getTimeOffRequests(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2); // Only Business A requests
      expect(
        data.data.every((r: any) => r.staff.id.startsWith('staff-a'))
      ).toBe(true);
      expect(data.data.every((r: any) => r.reason.includes('A'))).toBe(true);

      // Verify query was scoped to Business A only
      expect(mockPrisma.timeOffRequest.findMany).toHaveBeenCalledWith({
        where: { businessId: businessA },
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('should maintain isolation with query filters', async () => {
      const sessionA = {
        user: { id: 'user-a', businessId: businessA, role: 'OWNER' },
      };
      getServerSession.mockResolvedValue(sessionA);

      // Mock filtered requests (only pending from Business A)
      const filteredRequests = [
        {
          id: 'request-a1',
          staffId: staffA1,
          businessId: businessA,
          startDate: new Date('2024-01-15'),
          endDate: new Date('2024-01-17'),
          reason: 'Vacation A1',
          status: 'PENDING',
          staff: {
            id: staffA1,
            name: 'Staff A1',
            email: 'staff-a1@example.com',
          },
        },
      ];

      asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue(
        filteredRequests as any
      );

      const request = new NextRequest(
        'http://localhost:3000/api/availability/time-off?status=pending'
      );
      const response = await getTimeOffRequests(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].status).toBe('PENDING');

      // Verify query included both business filter AND status filter
      expect(mockPrisma.timeOffRequest.findMany).toHaveBeenCalledWith({
        where: {
          businessId: businessA, // Business isolation maintained
          status: 'PENDING', // Additional filter applied
        },
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });
  });

  describe('Cross-Business Access Prevention', () => {
    it('should prevent any cross-business data access attempts', async () => {
      // User from Business A tries to access data
      const sessionA = {
        user: { id: 'user-a', businessId: businessA, role: 'OWNER' },
      };
      getServerSession.mockResolvedValue(sessionA);

      // Mock empty responses (as if Business A has no data)
      asMock(mockPrisma.businessHours.findMany).mockResolvedValue([]);
      asMock(mockPrisma.staff.findMany).mockResolvedValue([]);
      asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue([]);

      // Test all endpoints
      const businessHoursRequest = new NextRequest(
        'http://localhost:3000/api/availability/business-hours'
      );
      const staffRequest = new NextRequest(
        'http://localhost:3000/api/availability/staff'
      );
      const timeOffRequest = new NextRequest(
        'http://localhost:3000/api/availability/time-off'
      );

      const [businessHoursResponse, staffResponse, timeOffResponse] =
        await Promise.all([
          getBusinessHours(businessHoursRequest),
          getStaffAvailability(staffRequest),
          getTimeOffRequests(timeOffRequest),
        ]);

      // All should succeed but return empty results for Business A
      expect(businessHoursResponse.status).toBe(200);
      expect(staffResponse.status).toBe(200);
      expect(timeOffResponse.status).toBe(200);

      // Verify all queries were scoped to Business A only
      expect(mockPrisma.businessHours.findMany).toHaveBeenCalledWith({
        where: { businessId: businessA },
        orderBy: { dayOfWeek: 'asc' },
      });

      expect(mockPrisma.staff.findMany).toHaveBeenCalledWith({
        where: { businessId: businessA, isActive: true },
        select: expect.any(Object),
      });

      expect(mockPrisma.timeOffRequest.findMany).toHaveBeenCalledWith({
        where: { businessId: businessA },
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });

      // Verify no queries were made for other businesses
      expect(mockPrisma.businessHours.findMany).not.toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            businessId: businessB,
          }),
        })
      );
    });

    it('should handle session business ID changes correctly', async () => {
      // First request with Business A session
      const sessionA = {
        user: { id: 'user-a', businessId: businessA, role: 'OWNER' },
      };
      getServerSession.mockResolvedValue(sessionA);

      const businessAHours: BusinessHours[] = [
        {
          id: 'hours-a1',
          businessId: businessA,
          dayOfWeek: 1,
          openTime: '09:00:00',
          closeTime: '17:00:00',
          isClosed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      asMock(mockPrisma.businessHours.findMany).mockResolvedValue(
        businessAHours
      );

      const requestA = new NextRequest(
        'http://localhost:3000/api/availability/business-hours'
      );
      const responseA = await getBusinessHours(requestA);
      const dataA = await responseA.json();

      expect(responseA.status).toBe(200);
      expect(dataA.data).toHaveLength(1);
      expect(dataA.data[0].businessId).toBe(businessA);

      // Clear mocks and change session to Business B
      jest.clearAllMocks();
      const sessionB = {
        user: { id: 'user-b', businessId: businessB, role: 'OWNER' },
      };
      getServerSession.mockResolvedValue(sessionB);

      const businessBHours: BusinessHours[] = [
        {
          id: 'hours-b1',
          businessId: businessB,
          dayOfWeek: 1,
          openTime: '08:00:00',
          closeTime: '18:00:00',
          isClosed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      asMock(mockPrisma.businessHours.findMany).mockResolvedValue(
        businessBHours
      );

      const requestB = new NextRequest(
        'http://localhost:3000/api/availability/business-hours'
      );
      const responseB = await getBusinessHours(requestB);
      const dataB = await responseB.json();

      expect(responseB.status).toBe(200);
      expect(dataB.data).toHaveLength(1);
      expect(dataB.data[0].businessId).toBe(businessB);
      expect(dataB.data[0].openTime).toBe('08:00:00'); // Different from Business A

      // Verify the second query was scoped to Business B
      expect(mockPrisma.businessHours.findMany).toHaveBeenCalledWith({
        where: { businessId: businessB },
        orderBy: { dayOfWeek: 'asc' },
      });
    });
  });

  describe('Data Integrity Validation', () => {
    it('should ensure all returned data belongs to the authenticated business', async () => {
      const sessionA = {
        user: { id: 'user-a', businessId: businessA, role: 'OWNER' },
      };
      getServerSession.mockResolvedValue(sessionA);

      // Mock comprehensive data for Business A
      const businessAData = {
        businessHours: [
          {
            id: 'hours-a1',
            businessId: businessA,
            dayOfWeek: 1,
            openTime: '09:00:00',
            closeTime: '17:00:00',
            isClosed: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        staff: [
          {
            id: staffA1,
            businessId: businessA,
            name: 'Staff A1',
            email: 'staff-a1@example.com',
            role: 'STAFF',
            isActive: true,
            workingHours: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        availability: [
          {
            id: 'avail-a1-1',
            staffId: staffA1,
            businessId: businessA,
            dayOfWeek: 1,
            startTime: '09:00:00',
            endTime: '17:00:00',
            isRecurring: true,
            effectiveDate: null,
            expiryDate: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        timeOffRequests: [
          {
            id: 'request-a1',
            staffId: staffA1,
            businessId: businessA,
            startDate: new Date('2024-01-15'),
            endDate: new Date('2024-01-17'),
            reason: 'Vacation A1',
            status: 'PENDING',
            staff: {
              id: staffA1,
              name: 'Staff A1',
              email: 'staff-a1@example.com',
            },
          },
        ],
      };

      asMock(mockPrisma.businessHours.findMany).mockResolvedValue(
        businessAData.businessHours
      );
      asMock(mockPrisma.staff.findMany).mockResolvedValue(businessAData.staff);
      asMock(mockPrisma.staffAvailability.findMany).mockResolvedValue(
        businessAData.availability
      );
      asMock(mockPrisma.staffAvailabilityOverride.findMany).mockResolvedValue(
        []
      );
      asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue(
        businessAData.timeOffRequests as any
      );

      // Test all endpoints
      const businessHoursRequest = new NextRequest(
        'http://localhost:3000/api/availability/business-hours'
      );
      const staffRequest = new NextRequest(
        'http://localhost:3000/api/availability/staff'
      );
      const timeOffRequest = new NextRequest(
        'http://localhost:3000/api/availability/time-off'
      );

      const [businessHoursResponse, staffResponse, timeOffResponse] =
        await Promise.all([
          getBusinessHours(businessHoursRequest),
          getStaffAvailability(staffRequest),
          getTimeOffRequests(timeOffRequest),
        ]);

      const businessHoursData = await businessHoursResponse.json();
      const staffData = await staffResponse.json();
      const timeOffData = await timeOffResponse.json();

      // Verify all responses are successful
      expect(businessHoursResponse.status).toBe(200);
      expect(staffResponse.status).toBe(200);
      expect(timeOffResponse.status).toBe(200);

      // Verify all returned data belongs to Business A
      expect(
        businessHoursData.data.every((h: any) => h.businessId === businessA)
      ).toBe(true);
      expect(staffData.data.every((s: any) => s.staff.id === staffA1)).toBe(
        true
      );
      expect(timeOffData.data.every((r: any) => r.staff.id === staffA1)).toBe(
        true
      );

      // Verify no data from other businesses is present
      expect(
        businessHoursData.data.some((h: any) => h.businessId !== businessA)
      ).toBe(false);
      expect(
        staffData.data.some(
          (s: any) =>
            s.staff.id.startsWith('staff-b') || s.staff.id.startsWith('staff-c')
        )
      ).toBe(false);
      expect(
        timeOffData.data.some(
          (r: any) =>
            r.staff.id.startsWith('staff-b') || r.staff.id.startsWith('staff-c')
        )
      ).toBe(false);
    });
  });
});

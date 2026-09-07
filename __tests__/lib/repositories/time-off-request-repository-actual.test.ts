import { prisma } from '@/lib/prisma';
import { TimeOffRequestRepository } from '@/lib/repositories/time-off-request-repository';
import { Staff, TimeOffRequest, TimeOffStatus } from '@prisma/client';
import { asMock } from '@/__tests__/utils/prisma-mock-helpers';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    staff: {
      findUnique: jest.fn(),
    },
    timeOffRequest: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    appointment: {
      findMany: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('TimeOffRequestRepository', () => {
  let repository: TimeOffRequestRepository;
  const staffId = 'staff-123';
  const businessId = 'business-123';
  const approverId = 'approver-123';

  beforeEach(() => {
    repository = new TimeOffRequestRepository();
    jest.clearAllMocks();
  });

  describe('createTimeOffRequest', () => {
    it('should create a new time-off request', async () => {
      const requestData = {
        staffId,
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-01-17'),
        reason: 'Vacation',
      };

      const mockStaff = { id: staffId, businessId, name: 'John Doe' };
      const mockRequest: TimeOffRequest = {
        id: 'request-1',
        staffId,
        businessId,
        startDate: requestData.startDate,
        endDate: requestData.endDate,
        reason: requestData.reason,
        status: TimeOffStatus.PENDING,
        approvedBy: null,
        approvedAt: null,
        denialReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      asMock(mockPrisma.staff.findUnique).mockResolvedValue(mockStaff as Staff);
      asMock(mockPrisma.timeOffRequest.create).mockResolvedValue(mockRequest);

      const result = await repository.createTimeOffRequest(requestData);

      expect(mockPrisma.staff.findUnique).toHaveBeenCalledWith({
        where: { id: staffId },
        select: { id: true, businessId: true, name: true },
      });
      expect(mockPrisma.timeOffRequest.create).toHaveBeenCalledWith({
        data: {
          staffId,
          businessId,
          startDate: requestData.startDate,
          endDate: requestData.endDate,
          reason: requestData.reason,
          status: TimeOffStatus.PENDING,
        },
      });
      expect(result).toEqual(mockRequest);
    });

    it('should throw error when staff not found', async () => {
      const requestData = {
        staffId: 'nonexistent-staff',
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-01-17'),
        reason: 'Vacation',
      };

      asMock(mockPrisma.staff.findUnique).mockResolvedValue(null);

      await expect(
        repository.createTimeOffRequest(requestData)
      ).rejects.toThrow('Staff member not found');
    });

    it('should handle multi-day requests', async () => {
      const requestData = {
        staffId,
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-01-19'), // 5 days
        reason: 'Extended vacation',
      };

      const mockStaff = { id: staffId, businessId, name: 'John Doe' };
      const mockRequest: TimeOffRequest = {
        id: 'request-1',
        staffId,
        businessId,
        startDate: requestData.startDate,
        endDate: requestData.endDate,
        reason: requestData.reason,
        status: TimeOffStatus.PENDING,
        approvedBy: null,
        approvedAt: null,
        denialReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      asMock(mockPrisma.staff.findUnique).mockResolvedValue(mockStaff as Staff);
      asMock(mockPrisma.timeOffRequest.create).mockResolvedValue(mockRequest);

      const result = await repository.createTimeOffRequest(requestData);

      expect(result.startDate).toEqual(requestData.startDate);
      expect(result.endDate).toEqual(requestData.endDate);
    });
  });

  describe('getTimeOffRequestById', () => {
    it('should return specific time-off request', async () => {
      const requestId = 'request-1';
      const mockRequest = {
        id: requestId,
        staffId,
        businessId,
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-01-17'),
        reason: 'Vacation',
        status: TimeOffStatus.PENDING,
        approvedBy: null,
        approvedAt: null,
        denialReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        staff: {
          id: staffId,
          name: 'John Doe',
          email: 'john@example.com',
        },
        approver: null,
      };

      asMock(mockPrisma.timeOffRequest.findUnique).mockResolvedValue(
        mockRequest as any
      );

      const result = await repository.getTimeOffRequestById(requestId);

      expect(mockPrisma.timeOffRequest.findUnique).toHaveBeenCalledWith({
        where: { id: requestId },
        include: {
          staff: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          approver: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      expect(result).toEqual(mockRequest);
    });

    it('should return null when request not found', async () => {
      const requestId = 'nonexistent-request';

      asMock(mockPrisma.timeOffRequest.findUnique).mockResolvedValue(null);

      const result = await repository.getTimeOffRequestById(requestId);

      expect(result).toBeNull();
    });
  });

  describe('approveTimeOffRequest', () => {
    it('should approve a time-off request', async () => {
      const requestId = 'request-1';
      const approvalDate = new Date();

      const mockApprover = { id: approverId, businessId, name: 'Manager' };
      const mockRequest = {
        id: requestId,
        staffId,
        businessId,
        status: TimeOffStatus.PENDING,
      };
      const mockApprovedRequest: TimeOffRequest = {
        id: requestId,
        staffId,
        businessId,
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-01-17'),
        reason: 'Vacation',
        status: TimeOffStatus.APPROVED,
        approvedBy: approverId,
        approvedAt: approvalDate,
        denialReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      asMock(mockPrisma.staff.findUnique).mockResolvedValue(
        mockApprover as Staff
      );
      asMock(mockPrisma.timeOffRequest.findUnique).mockResolvedValue(
        mockRequest as TimeOffRequest
      );
      asMock(mockPrisma.timeOffRequest.update).mockResolvedValue(
        mockApprovedRequest
      );

      const result = await repository.approveTimeOffRequest(
        requestId,
        approverId
      );

      expect(mockPrisma.timeOffRequest.update).toHaveBeenCalledWith({
        where: { id: requestId },
        data: {
          status: TimeOffStatus.APPROVED,
          approvedBy: approverId,
          approvedAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(mockApprovedRequest);
    });

    it('should throw error when approver not found', async () => {
      const requestId = 'request-1';

      asMock(mockPrisma.staff.findUnique).mockResolvedValue(null);

      await expect(
        repository.approveTimeOffRequest(requestId, 'nonexistent-approver')
      ).rejects.toThrow('Approver not found');
    });

    it('should throw error when request not found', async () => {
      const requestId = 'nonexistent-request';

      const mockApprover = { id: approverId, businessId, name: 'Manager' };
      asMock(mockPrisma.staff.findUnique).mockResolvedValue(
        mockApprover as Staff
      );
      asMock(mockPrisma.timeOffRequest.findUnique).mockResolvedValue(null);

      await expect(
        repository.approveTimeOffRequest(requestId, approverId)
      ).rejects.toThrow('Time-off request not found');
    });
  });

  describe('denyTimeOffRequest', () => {
    it('should deny a time-off request with reason', async () => {
      const requestId = 'request-1';
      const denialReason = 'Insufficient coverage';

      const mockApprover = { id: approverId, businessId, name: 'Manager' };
      const mockRequest = {
        id: requestId,
        staffId,
        businessId,
        status: TimeOffStatus.PENDING,
      };
      const mockDeniedRequest: TimeOffRequest = {
        id: requestId,
        staffId,
        businessId,
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-01-17'),
        reason: 'Vacation',
        status: TimeOffStatus.DENIED,
        approvedBy: null,
        approvedAt: null,
        denialReason,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      asMock(mockPrisma.staff.findUnique).mockResolvedValue(
        mockApprover as Staff
      );
      asMock(mockPrisma.timeOffRequest.findUnique).mockResolvedValue(
        mockRequest as TimeOffRequest
      );
      asMock(mockPrisma.timeOffRequest.update).mockResolvedValue(
        mockDeniedRequest
      );

      const result = await repository.denyTimeOffRequest(
        requestId,
        approverId,
        denialReason
      );

      expect(mockPrisma.timeOffRequest.update).toHaveBeenCalledWith({
        where: { id: requestId },
        data: {
          status: TimeOffStatus.DENIED,
          denialReason,
          updatedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(mockDeniedRequest);
    });
  });

  describe('cancelTimeOffRequest', () => {
    it('should cancel a time-off request', async () => {
      const requestId = 'request-1';

      const mockRequest = {
        id: requestId,
        staffId,
        businessId,
        status: TimeOffStatus.PENDING,
      };
      const mockCancelledRequest: TimeOffRequest = {
        id: requestId,
        staffId,
        businessId,
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-01-17'),
        reason: 'Vacation',
        status: TimeOffStatus.CANCELLED,
        approvedBy: null,
        approvedAt: null,
        denialReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      asMock(mockPrisma.timeOffRequest.findUnique).mockResolvedValue(
        mockRequest as TimeOffRequest
      );
      asMock(mockPrisma.timeOffRequest.update).mockResolvedValue(
        mockCancelledRequest
      );

      const result = await repository.cancelTimeOffRequest(requestId, staffId);

      expect(mockPrisma.timeOffRequest.update).toHaveBeenCalledWith({
        where: { id: requestId },
        data: {
          status: TimeOffStatus.CANCELLED,
          updatedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(mockCancelledRequest);
    });

    it('should throw error when staff does not own the request', async () => {
      const requestId = 'request-1';
      const wrongStaffId = 'wrong-staff';

      const mockRequest = {
        id: requestId,
        staffId,
        businessId,
        status: TimeOffStatus.PENDING,
      };

      asMock(mockPrisma.timeOffRequest.findUnique).mockResolvedValue(
        mockRequest as TimeOffRequest
      );

      await expect(
        repository.cancelTimeOffRequest(requestId, wrongStaffId)
      ).rejects.toThrow('You can only cancel your own time-off requests');
    });
  });

  describe('checkTimeOffConflicts', () => {
    it('should detect conflicts with existing appointments', async () => {
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-01-17');

      const mockConflictingAppointments = [
        {
          id: 'appointment-1',
          staffId,
          startTime: new Date('2024-01-16T10:00:00Z'),
          endTime: new Date('2024-01-16T11:00:00Z'),
          client: { name: 'John Doe' },
          service: { name: 'Haircut' },
        },
      ];

      asMock(mockPrisma.appointment.findMany).mockResolvedValue(
        mockConflictingAppointments
      );
      asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue([]);

      const result = await repository.checkTimeOffConflicts(
        staffId,
        startDate,
        endDate
      );

      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith({
        where: {
          staffId,
          startTime: {
            gte: startDate,
            lte: endDate,
          },
          status: {
            not: 'CANCELLED',
          },
        },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          client: {
            select: {
              name: true,
            },
          },
          service: {
            select: {
              name: true,
            },
          },
        },
      });
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('APPOINTMENT');
    });

    it('should detect conflicts with approved time-off requests', async () => {
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-01-17');

      const mockConflictingTimeOff: TimeOffRequest[] = [
        {
          id: 'request-2',
          staffId,
          businessId,
          startDate: new Date('2024-01-16'),
          endDate: new Date('2024-01-18'),
          reason: 'Personal',
          status: TimeOffStatus.APPROVED,
          approvedBy: approverId,
          approvedAt: new Date(),
          denialReason: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      asMock(mockPrisma.appointment.findMany).mockResolvedValue([]);
      asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue(
        mockConflictingTimeOff
      );

      const result = await repository.checkTimeOffConflicts(
        staffId,
        startDate,
        endDate
      );

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('TIME_OFF');
    });

    it('should return empty array when no conflicts', async () => {
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-01-17');

      asMock(mockPrisma.appointment.findMany).mockResolvedValue([]);
      asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue([]);

      const result = await repository.checkTimeOffConflicts(
        staffId,
        startDate,
        endDate
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('getApprovedTimeOff', () => {
    it('should return approved time-off for staff within date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const mockApprovedTimeOff: TimeOffRequest[] = [
        {
          id: 'request-1',
          staffId,
          businessId,
          startDate: new Date('2024-01-15'),
          endDate: new Date('2024-01-17'),
          reason: 'Vacation',
          status: TimeOffStatus.APPROVED,
          approvedBy: approverId,
          approvedAt: new Date(),
          denialReason: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue(
        mockApprovedTimeOff
      );

      const result = await repository.getApprovedTimeOff(
        staffId,
        startDate,
        endDate
      );

      expect(mockPrisma.timeOffRequest.findMany).toHaveBeenCalledWith({
        where: {
          staffId,
          status: TimeOffStatus.APPROVED,
          OR: [
            {
              startDate: {
                gte: startDate,
                lte: endDate,
              },
            },
            {
              endDate: {
                gte: startDate,
                lte: endDate,
              },
            },
            {
              AND: [
                { startDate: { lte: startDate } },
                { endDate: { gte: endDate } },
              ],
            },
          ],
        },
        orderBy: { startDate: 'asc' },
      });
      expect(result).toEqual(mockApprovedTimeOff);
    });
  });

  describe('hasApprovedTimeOffOnDate', () => {
    it('should return true when staff has approved time-off on date', async () => {
      const testDate = new Date('2024-01-16');

      const mockTimeOffRequests: TimeOffRequest[] = [
        {
          id: 'request-1',
          staffId,
          businessId,
          startDate: new Date('2024-01-15'),
          endDate: new Date('2024-01-17'),
          reason: 'Vacation',
          status: TimeOffStatus.APPROVED,
          approvedBy: approverId,
          approvedAt: new Date(),
          denialReason: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue(
        mockTimeOffRequests
      );

      const result = await repository.hasApprovedTimeOffOnDate(
        staffId,
        testDate
      );

      expect(result).toBe(true);
    });

    it('should return false when staff has no approved time-off on date', async () => {
      const testDate = new Date('2024-01-20');

      asMock(mockPrisma.timeOffRequest.findMany).mockResolvedValue([]);

      const result = await repository.hasApprovedTimeOffOnDate(
        staffId,
        testDate
      );

      expect(result).toBe(false);
    });
  });

  describe('bulkApproveTimeOffRequests', () => {
    it('should approve multiple time-off requests', async () => {
      const requestIds = ['request-1', 'request-2'];

      const mockApprover = { id: approverId, businessId, name: 'Manager' };
      const mockApprovedRequests: TimeOffRequest[] = requestIds.map(
        (id, index) => ({
          id,
          staffId: `staff-${index + 1}`,
          businessId,
          startDate: new Date('2024-01-15'),
          endDate: new Date('2024-01-17'),
          reason: 'Vacation',
          status: TimeOffStatus.APPROVED,
          approvedBy: approverId,
          approvedAt: new Date(),
          denialReason: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      );

      asMock(mockPrisma.staff.findUnique).mockResolvedValue(
        mockApprover as Staff
      );

      // Mock individual approvals
      requestIds.forEach((id, index) => {
        asMock(mockPrisma.timeOffRequest.findUnique).mockResolvedValueOnce({
          id,
          staffId: `staff-${index + 1}`,
          businessId,
          status: TimeOffStatus.PENDING,
        } as TimeOffRequest);
        asMock(mockPrisma.timeOffRequest.update).mockResolvedValueOnce(
          mockApprovedRequests[index]
        );
      });

      const result = await repository.bulkApproveTimeOffRequests(
        requestIds,
        approverId
      );

      expect(result).toHaveLength(2);
      expect(mockPrisma.timeOffRequest.update).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const requestData = {
        staffId,
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-01-17'),
        reason: 'Vacation',
      };

      asMock(mockPrisma.staff.findUnique).mockRejectedValue(
        new Error('Database error')
      );

      await expect(
        repository.createTimeOffRequest(requestData)
      ).rejects.toThrow('Database error');
    });

    it('should validate required parameters', async () => {
      const invalidRequestData = {
        staffId: '',
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-01-17'),
        reason: 'Vacation',
      };

      await expect(
        repository.createTimeOffRequest(invalidRequestData)
      ).rejects.toThrow();
    });

    it('should validate date ranges', async () => {
      const invalidRequestData = {
        staffId,
        startDate: new Date('2024-01-17'),
        endDate: new Date('2024-01-15'), // End before start
        reason: 'Invalid dates',
      };

      const mockStaff = { id: staffId, businessId, name: 'John Doe' };
      asMock(mockPrisma.staff.findUnique).mockResolvedValue(mockStaff as Staff);

      await expect(
        repository.createTimeOffRequest(invalidRequestData)
      ).rejects.toThrow('End date must be after start date');
    });
  });
});

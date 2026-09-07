import { prisma } from '@/lib/prisma';
import { TimeOffRequest, TimeOffStatus } from '@prisma/client';

export interface TimeOffRequestData {
  staffId: string;
  startDate: Date;
  endDate: Date;
  reason?: string;
}

export interface TimeOffApproval {
  requestId: string;
  approverId: string;
  approved: boolean;
  denialReason?: string;
}

export interface TimeOffConflict {
  type: 'APPOINTMENT' | 'EXISTING_TIME_OFF';
  startTime: Date;
  endTime: Date;
  description: string;
  conflictId?: string;
}

export interface TimeOffRequestWithDetails extends TimeOffRequest {
  staff: {
    displayName: string;
    user: {
      name: string | null;
      email: string;
    };
  };
  approver?: {
    displayName: string;
    user: {
      name: string | null;
    };
  } | null;
}

export class TimeOffRequestRepository {
  /**
   * Create a new time-off request
   */
  async createTimeOffRequest(
    requestData: TimeOffRequestData
  ): Promise<TimeOffRequest> {
    // Get staff member to validate and get business ID
    const staff = await prisma.staff.findUnique({
      where: { id: requestData.staffId },
      select: { businessId: true, displayName: true },
    });

    if (!staff) {
      throw new Error('Staff member not found');
    }

    // Validate date range
    if (requestData.startDate > requestData.endDate) {
      throw new Error('Start date must be before or equal to end date');
    }

    // Check for overlapping time-off requests
    const existingRequests = await this.getOverlappingTimeOffRequests(
      requestData.staffId,
      requestData.startDate,
      requestData.endDate
    );

    if (existingRequests.length > 0) {
      throw new Error('Time-off request overlaps with existing request');
    }

    return await prisma.timeOffRequest.create({
      data: {
        staffId: requestData.staffId,
        businessId: staff.businessId,
        startDate: requestData.startDate,
        endDate: requestData.endDate,
        reason: requestData.reason,
        status: TimeOffStatus.PENDING,
      },
    });
  }

  /**
   * Get time-off requests for a business with optional filtering
   */
  async getTimeOffRequests(
    businessId: string,
    filters?: {
      staffId?: string;
      status?: TimeOffStatus;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<TimeOffRequestWithDetails[]> {
    const where: any = { businessId };

    if (filters?.staffId) {
      where.staffId = filters.staffId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.startDate || filters?.endDate) {
      where.OR = [
        // Request starts within the filter range
        {
          startDate: {
            ...(filters.startDate && { gte: filters.startDate }),
            ...(filters.endDate && { lte: filters.endDate }),
          },
        },
        // Request ends within the filter range
        {
          endDate: {
            ...(filters.startDate && { gte: filters.startDate }),
            ...(filters.endDate && { lte: filters.endDate }),
          },
        },
        // Request spans the entire filter range
        {
          AND: [
            { startDate: { lte: filters.startDate || new Date('1900-01-01') } },
            { endDate: { gte: filters.endDate || new Date('2100-01-01') } },
          ],
        },
      ];
    }

    return await prisma.timeOffRequest.findMany({
      where,
      include: {
        staff: {
          select: {
            displayName: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        approver: {
          select: {
            displayName: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: [{ status: 'asc' }, { startDate: 'asc' }],
    });
  }

  /**
   * Get a specific time-off request by ID
   */
  async getTimeOffRequestById(
    requestId: string
  ): Promise<TimeOffRequestWithDetails | null> {
    return await prisma.timeOffRequest.findUnique({
      where: { id: requestId },
      include: {
        staff: {
          select: {
            displayName: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        approver: {
          select: {
            displayName: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Approve a time-off request
   */
  async approveTimeOffRequest(
    requestId: string,
    approverId: string
  ): Promise<TimeOffRequest> {
    // Validate that the approver exists and has permission
    const approver = await prisma.staff.findUnique({
      where: { id: approverId },
      select: { businessId: true },
    });

    if (!approver) {
      throw new Error('Approver not found');
    }

    // Get the request to validate business context
    const request = await prisma.timeOffRequest.findUnique({
      where: { id: requestId },
      select: { businessId: true, status: true },
    });

    if (!request) {
      throw new Error('Time-off request not found');
    }

    if (request.businessId !== approver.businessId) {
      throw new Error('Approver does not have permission for this business');
    }

    if (request.status !== TimeOffStatus.PENDING) {
      throw new Error('Only pending requests can be approved');
    }

    return await prisma.timeOffRequest.update({
      where: { id: requestId },
      data: {
        status: TimeOffStatus.APPROVED,
        approvedBy: approverId,
        approvedAt: new Date(),
      },
    });
  }

  /**
   * Deny a time-off request
   */
  async denyTimeOffRequest(
    requestId: string,
    approverId: string,
    denialReason?: string
  ): Promise<TimeOffRequest> {
    // Validate that the approver exists and has permission
    const approver = await prisma.staff.findUnique({
      where: { id: approverId },
      select: { businessId: true },
    });

    if (!approver) {
      throw new Error('Approver not found');
    }

    // Get the request to validate business context
    const request = await prisma.timeOffRequest.findUnique({
      where: { id: requestId },
      select: { businessId: true, status: true },
    });

    if (!request) {
      throw new Error('Time-off request not found');
    }

    if (request.businessId !== approver.businessId) {
      throw new Error('Approver does not have permission for this business');
    }

    if (request.status !== TimeOffStatus.PENDING) {
      throw new Error('Only pending requests can be denied');
    }

    return await prisma.timeOffRequest.update({
      where: { id: requestId },
      data: {
        status: TimeOffStatus.DENIED,
        approvedBy: approverId,
        approvedAt: new Date(),
        denialReason,
      },
    });
  }

  /**
   * Cancel a time-off request (by the requester)
   */
  async cancelTimeOffRequest(
    requestId: string,
    staffId: string
  ): Promise<TimeOffRequest> {
    // Validate that the staff member owns this request
    const request = await prisma.timeOffRequest.findUnique({
      where: { id: requestId },
      select: { staffId: true, status: true },
    });

    if (!request) {
      throw new Error('Time-off request not found');
    }

    if (request.staffId !== staffId) {
      throw new Error('Staff member can only cancel their own requests');
    }

    if (request.status === TimeOffStatus.CANCELLED) {
      throw new Error('Request is already cancelled');
    }

    return await prisma.timeOffRequest.update({
      where: { id: requestId },
      data: {
        status: TimeOffStatus.CANCELLED,
      },
    });
  }

  /**
   * Check for conflicts with existing appointments
   */
  async checkTimeOffConflicts(
    staffId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TimeOffConflict[]> {
    const conflicts: TimeOffConflict[] = [];

    // Check for existing appointments during the time-off period
    const appointments = await prisma.appointment.findMany({
      where: {
        staffId,
        startTime: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'],
        },
      },
      include: {
        services: {
          select: {
            serviceName: true,
          },
        },
        client: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    for (const appointment of appointments) {
      const clientName = appointment.client
        ? `${appointment.client.firstName} ${appointment.client.lastName}`
        : appointment.clientName || 'Walk-in';

      conflicts.push({
        type: 'APPOINTMENT',
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        description: `Appointment with ${clientName}: ${appointment.services.map(s => s.serviceName).join(', ')}`,
        conflictId: appointment.id,
      });
    }

    // Check for overlapping approved time-off requests
    const overlappingTimeOff = await this.getOverlappingTimeOffRequests(
      staffId,
      startDate,
      endDate,
      [TimeOffStatus.APPROVED]
    );

    for (const timeOff of overlappingTimeOff) {
      conflicts.push({
        type: 'EXISTING_TIME_OFF',
        startTime: timeOff.startDate,
        endTime: timeOff.endDate,
        description: `Existing time off: ${timeOff.reason || 'No reason provided'}`,
        conflictId: timeOff.id,
      });
    }

    return conflicts;
  }

  /**
   * Get overlapping time-off requests
   */
  async getOverlappingTimeOffRequests(
    staffId: string,
    startDate: Date,
    endDate: Date,
    statuses: TimeOffStatus[] = [TimeOffStatus.PENDING, TimeOffStatus.APPROVED]
  ): Promise<TimeOffRequest[]> {
    return await prisma.timeOffRequest.findMany({
      where: {
        staffId,
        status: {
          in: statuses,
        },
        OR: [
          // Request starts during the new period
          {
            startDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          // Request ends during the new period
          {
            endDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          // Request spans the entire new period
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
  }

  /**
   * Get approved time-off for a staff member within a date range
   */
  async getApprovedTimeOff(
    staffId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TimeOffRequest[]> {
    return await prisma.timeOffRequest.findMany({
      where: {
        staffId,
        status: TimeOffStatus.APPROVED,
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      orderBy: { startDate: 'asc' },
    });
  }

  /**
   * Update a time-off request (only if pending)
   */
  async updateTimeOffRequest(
    requestId: string,
    staffId: string,
    updates: {
      startDate?: Date;
      endDate?: Date;
      reason?: string;
    }
  ): Promise<TimeOffRequest> {
    // Validate that the staff member owns this request
    const request = await prisma.timeOffRequest.findUnique({
      where: { id: requestId },
      select: { staffId: true, status: true },
    });

    if (!request) {
      throw new Error('Time-off request not found');
    }

    if (request.staffId !== staffId) {
      throw new Error('Staff member can only update their own requests');
    }

    if (request.status !== TimeOffStatus.PENDING) {
      throw new Error('Only pending requests can be updated');
    }

    // Validate date range if dates are being updated
    if (
      updates.startDate &&
      updates.endDate &&
      updates.startDate > updates.endDate
    ) {
      throw new Error('Start date must be before or equal to end date');
    }

    return await prisma.timeOffRequest.update({
      where: { id: requestId },
      data: {
        ...(updates.startDate && { startDate: updates.startDate }),
        ...(updates.endDate && { endDate: updates.endDate }),
        ...(updates.reason !== undefined && { reason: updates.reason }),
      },
    });
  }

  /**
   * Get time-off requests requiring approval for a business
   */
  async getPendingTimeOffRequests(
    businessId: string
  ): Promise<TimeOffRequestWithDetails[]> {
    return await this.getTimeOffRequests(businessId, {
      status: TimeOffStatus.PENDING,
    });
  }

  /**
   * Get time-off statistics for a business
   */
  async getTimeOffStatistics(
    businessId: string,
    year?: number
  ): Promise<{
    totalRequests: number;
    pendingRequests: number;
    approvedRequests: number;
    deniedRequests: number;
    totalDaysRequested: number;
    totalDaysApproved: number;
  }> {
    const whereClause: any = { businessId };

    if (year) {
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31);
      whereClause.startDate = {
        gte: startOfYear,
        lte: endOfYear,
      };
    }

    const requests = await prisma.timeOffRequest.findMany({
      where: whereClause,
      select: {
        status: true,
        startDate: true,
        endDate: true,
      },
    });

    const stats = {
      totalRequests: requests.length,
      pendingRequests: 0,
      approvedRequests: 0,
      deniedRequests: 0,
      totalDaysRequested: 0,
      totalDaysApproved: 0,
    };

    for (const request of requests) {
      const days =
        Math.ceil(
          (request.endDate.getTime() - request.startDate.getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1;

      stats.totalDaysRequested += days;

      switch (request.status) {
        case TimeOffStatus.PENDING:
          stats.pendingRequests++;
          break;
        case TimeOffStatus.APPROVED:
          stats.approvedRequests++;
          stats.totalDaysApproved += days;
          break;
        case TimeOffStatus.DENIED:
          stats.deniedRequests++;
          break;
      }
    }

    return stats;
  }

  /**
   * Check if a staff member has approved time-off on a specific date
   */
  async hasApprovedTimeOffOnDate(
    staffId: string,
    date: Date
  ): Promise<boolean> {
    const timeOffRequests = await prisma.timeOffRequest.findMany({
      where: {
        staffId,
        status: TimeOffStatus.APPROVED,
        startDate: { lte: date },
        endDate: { gte: date },
      },
    });

    return timeOffRequests.length > 0;
  }

  /**
   * Bulk approve multiple time-off requests
   */
  async bulkApproveTimeOffRequests(
    requestIds: string[],
    approverId: string
  ): Promise<TimeOffRequest[]> {
    const results: TimeOffRequest[] = [];

    for (const requestId of requestIds) {
      try {
        const approved = await this.approveTimeOffRequest(
          requestId,
          approverId
        );
        results.push(approved);
      } catch (error) {
        // Continue with other requests even if one fails
        console.error(`Failed to approve request ${requestId}:`, error);
      }
    }

    return results;
  }
}

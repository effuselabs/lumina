import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

interface RouteParams {
  params: {
    id: string;
  };
}

// Schema for approval/denial
const ApprovalSchema = z.object({
  action: z.enum(['approve', 'deny']),
  denialReason: z.string().optional(),
});

// PUT /api/availability/time-off/:id/approve
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.businessId) {
      return NextResponse.json(
        { error: 'Business context required' },
        { status: 401 }
      );
    }

    const businessId = session.user.businessId;
    const { id } = params;
    const body = await request.json();

    // Validate request body
    const validation = ApprovalSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid approval data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { action, denialReason } = validation.data;

    // Find the time-off request
    const timeOffRequest = await prisma.timeOffRequest.findFirst({
      where: {
        id,
        businessId,
      },
      include: {
        staff: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });

    if (!timeOffRequest) {
      return NextResponse.json(
        { error: 'Time-off request not found' },
        { status: 404 }
      );
    }

    if (timeOffRequest.status !== 'PENDING') {
      return NextResponse.json(
        {
          error: `Time-off request is already ${timeOffRequest.status.toLowerCase()}`,
        },
        { status: 400 }
      );
    }

    // Check if user has permission to approve (business owner or manager)
    const businessUser = await prisma.businessUser.findFirst({
      where: {
        userId: session.user.id,
        businessId,
      },
    });

    if (
      !businessUser ||
      (businessUser.role !== 'OWNER' && businessUser.role !== 'MANAGER')
    ) {
      return NextResponse.json(
        { error: 'Insufficient permissions to approve time-off requests' },
        { status: 403 }
      );
    }

    if (action === 'deny' && !denialReason) {
      return NextResponse.json(
        { error: 'Denial reason is required when denying a request' },
        { status: 400 }
      );
    }

    let conflicts: any[] = [];

    if (action === 'approve') {
      // Check for existing appointments during the approved period
      const existingAppointments = await prisma.appointment.findMany({
        where: {
          staffId: timeOffRequest.staffId,
          businessId,
          startTime: {
            gte: new Date(timeOffRequest.startDate.setHours(0, 0, 0, 0)),
            lte: new Date(timeOffRequest.endDate.setHours(23, 59, 59, 999)),
          },
          status: {
            not: 'CANCELLED',
          },
        },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          services: {
            select: {
              service: {
                select: {
                  name: true,
                },
              },
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

      conflicts = existingAppointments.map(apt => ({
        appointmentId: apt.id,
        startTime: apt.startTime,
        endTime: apt.endTime,
        serviceName: apt.services?.[0]?.service?.name || 'Service',
        clientName: apt.client
          ? `${apt.client.firstName} ${apt.client.lastName}`
          : 'Unknown Client',
      }));
    }

    // Update the time-off request
    const updatedRequest = await prisma.timeOffRequest.update({
      where: { id },
      data: {
        status: action === 'approve' ? 'APPROVED' : 'DENIED',
        approvedBy: businessUser.userId,
        approvedAt: new Date(),
        denialReason: action === 'deny' ? denialReason : null,
      },
      include: {
        staff: {
          select: {
            id: true,
            displayName: true,
          },
        },
        approver: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });

    if (action === 'approve') {
      // Create availability overrides for the approved time-off period
      const startDate = new Date(timeOffRequest.startDate);
      const endDate = new Date(timeOffRequest.endDate);
      const overrides = [];

      for (
        let date = new Date(startDate);
        date <= endDate;
        date.setDate(date.getDate() + 1)
      ) {
        const override = await prisma.staffAvailabilityOverride.upsert({
          where: {
            staffId_date: {
              staffId: timeOffRequest.staffId,
              date: new Date(date),
            },
          },
          update: {
            isAvailable: false,
            reason: `Time off: ${timeOffRequest.reason || 'Personal time'}`,
          },
          create: {
            staffId: timeOffRequest.staffId,
            businessId,
            date: new Date(date),
            isAvailable: false,
            reason: `Time off: ${timeOffRequest.reason || 'Personal time'}`,
          },
        });
        overrides.push(override);
      }
    }

    return NextResponse.json({
      message: `Time-off request ${action}d successfully`,
      timeOffRequest: updatedRequest,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      warning:
        conflicts.length > 0
          ? 'This approval conflicts with existing appointments that need to be rescheduled'
          : undefined,
    });
  } catch (error) {
    console.error('Error processing time-off approval:', error);
    return NextResponse.json(
      { error: 'Failed to process time-off approval' },
      { status: 500 }
    );
  }
}

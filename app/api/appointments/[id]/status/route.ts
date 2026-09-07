/**
 * Appointment Status Management API Route
 *
 * Dedicated endpoint for managing appointment status transitions
 * with proper validation and business rules enforcement.
 *
 * Requirements: 5.1, 5.2, 5.3
 *
 * @version 1.0.0
 * @author Lumina Development Team
 */

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { AppointmentService } from '@/lib/services/appointment-service';
import { AppointmentStatusManager } from '@/lib/services/appointment-status-manager';
import { updateStatusSchema } from '@/lib/validations/appointment';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Initialize services
const appointmentService = new AppointmentService();
const statusManager = new AppointmentStatusManager();

// ============================================================================
// PUT /api/appointments/[id]/status - Update appointment status
// ============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateStatusSchema.parse(body);

    // Verify user has access to this business
    const businessUser = await prisma.businessUser.findFirst({
      where: {
        businessId,
        userId: session.user.id,
      },
    });

    if (!businessUser) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Verify appointment exists and belongs to business
    const appointment = await appointmentService.getAppointmentById(
      params.id,
      businessId
    );
    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Update status using status manager
    const result = await statusManager.updateStatus(
      params.id,
      validatedData.status,
      businessId,
      {
        changedBy: validatedData.changedBy || session.user.id,
        reason: validatedData.reason,
      }
    );

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Failed to update status',
          details: result.error ? [result.error] : ['Unknown error'],
          validTransitions: result.validTransitions,
        },
        { status: 400 }
      );
    }

    // Get updated appointment
    const updatedAppointment = await appointmentService.getAppointmentById(
      params.id,
      businessId
    );

    return NextResponse.json({
      appointment: updatedAppointment,
      message: 'Status updated successfully',
      previousStatus: appointment.status,
      newStatus: validatedData.status,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    console.error('Error updating appointment status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET /api/appointments/[id]/status - Get valid status transitions
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    // Verify user has access to this business
    const businessUser = await prisma.businessUser.findFirst({
      where: {
        businessId,
        userId: session.user.id,
      },
    });

    if (!businessUser) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get appointment to check current status
    const appointment = await appointmentService.getAppointmentById(
      params.id,
      businessId
    );
    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Get valid transitions for current status
    const validTransitions = statusManager.getValidTransitions(
      appointment.status
    );

    return NextResponse.json({
      currentStatus: appointment.status,
      validTransitions,
      statusHistory: appointment.status, // In a full implementation, this would include status history
    });
  } catch (error) {
    console.error('Error getting appointment status info:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Appointment Conflicts API Route
 *
 * Endpoint for checking appointment conflicts and scheduling conflicts
 * using the calendar infrastructure integration.
 *
 * Requirements: 4.1, 4.2, 4.3
 *
 * @version 1.0.0
 * @author Lumina Development Team
 */

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { CalendarIntegration } from '@/lib/services/calendar-integration';
import { conflictCheckSchema } from '@/lib/validations/appointment';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// ============================================================================
// GET /api/appointments/conflicts - Check for appointment conflicts
// ============================================================================

export async function GET(request: NextRequest) {
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

    // Parse and validate query parameters
    const queryParams: Record<string, any> = {};

    // Extract all search parameters
    for (const [key, value] of searchParams.entries()) {
      if (key !== 'businessId') {
        queryParams[key] = value;
      }
    }

    // Convert date strings to Date objects
    if (queryParams.startDate) {
      queryParams.startDate = new Date(queryParams.startDate);
    }
    if (queryParams.endDate) {
      queryParams.endDate = new Date(queryParams.endDate);
    }

    // Validate conflict check parameters
    const conflictRequest = conflictCheckSchema.parse({
      businessId,
      ...queryParams,
    });

    // Check for conflicts using calendar integration
    // If no staffId provided, return no conflicts (general availability check)
    if (!conflictRequest.staffId) {
      return NextResponse.json({
        hasConflicts: false,
        conflictCount: 0,
        conflicts: [],
        message: 'No staff specified - general availability check passed',
      });
    }

    const conflictResult = await CalendarIntegration.detectConflicts({
      businessId: conflictRequest.businessId,
      staffId: conflictRequest.staffId,
      startTime: conflictRequest.startDate,
      endTime: conflictRequest.endDate,
      serviceIds: [], // Not needed for general conflict checking
      excludeAppointmentId: conflictRequest.excludeAppointmentId,
    });

    // Format response
    const response = {
      hasConflicts: conflictResult.hasConflicts,
      conflictCount: conflictResult.conflicts.length,
      conflicts: conflictResult.conflicts.map(conflict => ({
        type: conflict.type,
        severity: conflict.severity,
        message: conflict.message,
        details: {
          appointmentId: conflict.details.conflictingAppointment?.id,
          startTime: conflict.details.conflictingAppointment?.startTime,
          endTime: conflict.details.conflictingAppointment?.endTime,
          clientName: conflict.details.conflictingAppointment?.clientName,
          staffName: conflict.details.conflictingAppointment?.services?.[0], // Use first service as staff name fallback
          serviceName:
            conflict.details.conflictingAppointment?.services?.join(', '),
        },
      })),
      warnings: conflictResult.warnings.map(warning => ({
        type: warning.type,
        message: warning.message,
        details: warning.details,
      })),
      metadata: {
        checkPeriod: {
          startDate: conflictRequest.startDate,
          endDate: conflictRequest.endDate,
        },
        staffId: conflictRequest.staffId,
        excludedAppointmentId: conflictRequest.excludeAppointmentId,
        checkedAt: new Date().toISOString(),
      },
    };

    return NextResponse.json(response);
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

    console.error('Error checking appointment conflicts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/appointments/conflicts - Check conflicts for specific appointment data
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const {
      businessId,
      staffId,
      startTime,
      endTime,
      serviceIds,
      excludeAppointmentId,
    } = body;

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

    // Validate required fields
    if (!staffId || !startTime || !endTime) {
      return NextResponse.json(
        {
          error: 'staffId, startTime, and endTime are required',
        },
        { status: 400 }
      );
    }

    // Verify staff belongs to the business
    const staff = await prisma.staff.findFirst({
      where: {
        id: staffId,
        businessId,
        isActive: true,
      },
    });

    if (!staff) {
      return NextResponse.json(
        {
          error: 'Staff member not found or not active in this business',
        },
        { status: 400 }
      );
    }

    // Verify services belong to the business (if provided)
    if (serviceIds && serviceIds.length > 0) {
      const services = await prisma.service.findMany({
        where: {
          id: { in: serviceIds },
          businessId,
          isActive: true,
        },
      });

      if (services.length !== serviceIds.length) {
        return NextResponse.json(
          {
            error:
              'One or more services not found or not active in this business',
          },
          { status: 400 }
        );
      }
    }

    // Check for conflicts using calendar integration
    const conflictResult = await CalendarIntegration.detectConflicts({
      businessId,
      staffId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      serviceIds: serviceIds || [],
      excludeAppointmentId,
    });

    // Also check availability for the requested time slot
    const availabilityResult = await CalendarIntegration.checkAvailability({
      businessId,
      staffId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      serviceIds: serviceIds || [],
      excludeAppointmentId,
    });

    // Format comprehensive response
    const response = {
      isAvailable: availabilityResult.isAvailable,
      hasConflicts: conflictResult.hasConflicts,

      // Availability information
      availability: {
        isAvailable: availabilityResult.isAvailable,
        reason: availabilityResult.reason,
        alternatives:
          availabilityResult.alternatives?.map(alt => ({
            startTime: alt.startTime,
            endTime: alt.endTime,
            staffId: alt.staffId,
            staffName: alt.staffName,
          })) || [],
      },

      // Conflict information
      conflicts: {
        hasConflicts: conflictResult.hasConflicts,
        count: conflictResult.conflicts.length,
        details: conflictResult.conflicts.map(conflict => ({
          type: conflict.type,
          severity: conflict.severity,
          message: conflict.message,
          appointmentId: conflict.details.conflictingAppointment?.id,
          conflictTime: {
            startTime: conflict.details.conflictingAppointment?.startTime,
            endTime: conflict.details.conflictingAppointment?.endTime,
          },
          clientName: conflict.details.conflictingAppointment?.clientName,
          serviceName:
            conflict.details.conflictingAppointment?.services?.[0] ||
            'Unknown Service',
        })),
      },

      // Warnings and recommendations
      warnings: conflictResult.warnings.map(warning => ({
        type: warning.type,
        message: warning.message,
        details: warning.details,
      })),

      // Request metadata
      request: {
        businessId,
        staffId,
        staffName: staff.displayName,
        timeSlot: {
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          duration: Math.round(
            (new Date(endTime).getTime() - new Date(startTime).getTime()) /
              (1000 * 60)
          ),
        },
        serviceIds: serviceIds || [],
        excludeAppointmentId,
        checkedAt: new Date().toISOString(),
      },
    };

    return NextResponse.json(response);
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

    console.error('Error checking appointment conflicts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

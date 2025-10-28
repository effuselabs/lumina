/**
 * Notification History API Endpoint
 * 
 * GET /api/notifications/history
 * Returns notification history for a business with filtering and pagination
 * Supports filtering by date, type, status, and appointment
 * 
 * Requirements: 10.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notificationRepository } from '@/lib/email/notification-repository';
import { z } from 'zod';

/**
 * Validation schema for history query parameters
 */
const historyQuerySchema = z.object({
  businessId: z.string().min(1, 'Business ID is required'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z.enum(['pending', 'queued', 'processing', 'sending', 'sent', 'delivered', 'failed', 'bounced', 'complained']).optional(),
  templateType: z.enum([
    'booking_confirmation',
    'appointment_reminder_24h',
    'appointment_reminder_2h',
    'cancellation_notification',
    'staff_booking_alert',
    'staff_cancellation_alert',
    'daily_booking_summary',
  ]).optional(),
  appointmentId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * GET /api/notifications/history
 * Get notification history for the authenticated business
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams: Record<string, any> = {};

    for (const [key, value] of searchParams.entries()) {
      queryParams[key] = value;
    }

    const validatedParams = historyQuerySchema.parse(queryParams);

    // Verify user has access to this business
    const businessUser = await prisma.businessUser.findUnique({
      where: {
        businessId_userId: {
          businessId: validatedParams.businessId,
          userId: session.user.id,
        },
      },
    });

    if (!businessUser) {
      return NextResponse.json(
        { error: 'Access denied to this business' },
        { status: 403 }
      );
    }

    // Build filters for repository query
    const filters: any = {
      limit: validatedParams.limit,
      offset: validatedParams.offset,
    };

    if (validatedParams.startDate) {
      filters.startDate = new Date(validatedParams.startDate);
    }

    if (validatedParams.endDate) {
      filters.endDate = new Date(validatedParams.endDate);
    }

    if (validatedParams.status) {
      filters.status = validatedParams.status;
    }

    if (validatedParams.templateType) {
      filters.templateType = validatedParams.templateType;
    }

    if (validatedParams.appointmentId) {
      filters.appointmentId = validatedParams.appointmentId;
    }

    // Get notification history from repository
    const notifications = await notificationRepository.findByBusiness(
      validatedParams.businessId,
      filters
    );

    // Calculate pagination metadata
    const total = notifications.length;
    const hasMore = total === validatedParams.limit;
    const nextOffset = hasMore ? validatedParams.offset + validatedParams.limit : null;

    return NextResponse.json({
      notifications,
      pagination: {
        total,
        limit: validatedParams.limit,
        offset: validatedParams.offset,
        hasMore,
        nextOffset,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    console.error('[NotificationHistory] Error fetching history', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch notification history',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

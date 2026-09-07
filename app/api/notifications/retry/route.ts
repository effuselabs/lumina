/**
 * Retry Failed Notification API Endpoint
 *
 * POST /api/notifications/retry
 * Allows manual retry of failed notifications
 * Validates business ownership before retrying
 *
 * Requirements: 5.1, 5.2, 10.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notificationService } from '@/lib/email/notification-service';
import { z } from 'zod';

/**
 * Validation schema for retry request
 */
const retrySchema = z.object({
  notificationId: z.string().min(1, 'Notification ID is required'),
});

/**
 * POST /api/notifications/retry
 * Retry a failed notification
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = retrySchema.parse(body);

    // Fetch notification to verify business ownership
    const notification = await prisma.emailQueue.findUnique({
      where: { id: validatedData.notificationId },
      select: {
        id: true,
        businessId: true,
        status: true,
        attemptCount: true,
        maxAttempts: true,
      },
    });

    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    // Verify user has access to this business
    const businessUser = await prisma.businessUser.findUnique({
      where: {
        businessId_userId: {
          businessId: notification.businessId,
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

    // Check if notification can be retried
    if (notification.status === 'sent' || notification.status === 'delivered') {
      return NextResponse.json(
        { error: 'Cannot retry a successfully delivered notification' },
        { status: 400 }
      );
    }

    if (notification.attemptCount >= notification.maxAttempts) {
      return NextResponse.json(
        { error: 'Maximum retry attempts reached' },
        { status: 400 }
      );
    }

    // Retry the notification
    const result = await notificationService.retryFailedNotification(
      validatedData.notificationId
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to retry notification',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Notification retry initiated',
      notificationId: result.notificationId,
      deliveryStatus: result.deliveryStatus,
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

    console.error('[NotificationRetry] Error retrying notification', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: 'Failed to retry notification',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

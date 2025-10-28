/**
 * Test Email Notification API Endpoint
 * 
 * POST /api/notifications/test
 * Allows business owners to send test emails to verify configuration
 * Supports all template types for testing purposes
 * 
 * Requirements: 10.1, 10.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notificationService } from '@/lib/email/notification-service';
import { z } from 'zod';

/**
 * Validation schema for test email request
 */
const testEmailSchema = z.object({
  businessId: z.string().min(1, 'Business ID is required'),
  recipientEmail: z.string().email('Valid email address is required'),
  templateType: z.enum([
    'booking_confirmation',
    'appointment_reminder_24h',
    'appointment_reminder_2h',
    'cancellation_notification',
    'staff_booking_alert',
    'staff_cancellation_alert',
    'daily_booking_summary',
  ]),
  testData: z.record(z.any()).optional(),
});

/**
 * POST /api/notifications/test
 * Send a test email to verify notification configuration
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = testEmailSchema.parse(body);

    // Verify user is business owner
    const businessUser = await prisma.businessUser.findUnique({
      where: {
        businessId_userId: {
          businessId: validatedData.businessId,
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

    if (businessUser.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Only business owners can send test emails' },
        { status: 403 }
      );
    }

    // Verify business exists and is active
    const business = await prisma.business.findUnique({
      where: { id: validatedData.businessId },
      select: { id: true, isActive: true, name: true },
    });

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    if (!business.isActive) {
      return NextResponse.json(
        { error: 'Business is not active' },
        { status: 400 }
      );
    }

    // Send test email using notification service
    const result = await notificationService.sendTestEmail(
      validatedData.businessId,
      validatedData.recipientEmail,
      validatedData.templateType
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to send test email',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      notificationId: result.notificationId,
      deliveryStatus: result.deliveryStatus,
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

    console.error('[NotificationTest] Error sending test email', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: 'Failed to send test email',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

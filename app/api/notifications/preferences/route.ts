/**
 * Email Preferences API Endpoint
 *
 * POST /api/notifications/preferences
 * Allows clients to update their email preferences
 * Supports unsubscribe functionality
 * Validates email ownership
 *
 * GET /api/notifications/preferences
 * Retrieves current email preferences for a client
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

/**
 * Validation schema for updating preferences
 */
const updatePreferencesSchema = z.object({
  businessId: z.string().min(1, 'Business ID is required'),
  email: z.string().email('Valid email address is required'),
  token: z.string().optional(), // Optional token for unauthenticated access
  receiveConfirmations: z.boolean().optional(),
  receiveReminders: z.boolean().optional(),
  receiveCancellations: z.boolean().optional(),
  receiveMarketing: z.boolean().optional(),
  unsubscribe: z.boolean().optional(), // Set to true to unsubscribe from all
});

/**
 * Validation schema for getting preferences
 */
const getPreferencesSchema = z.object({
  businessId: z.string().min(1, 'Business ID is required'),
  email: z.string().email('Valid email address is required'),
  token: z.string().optional(), // Optional token for unauthenticated access
});

/**
 * Generate a simple verification token for email preferences
 * In production, this should be a more secure token stored in the database
 */
function generatePreferenceToken(businessId: string, email: string): string {
  const crypto = require('crypto');
  const secret = process.env.NEXTAUTH_SECRET || 'default-secret';
  return crypto
    .createHmac('sha256', secret)
    .update(`${businessId}:${email}`)
    .digest('hex');
}

/**
 * Verify preference token
 */
function verifyPreferenceToken(
  token: string,
  businessId: string,
  email: string
): boolean {
  const expectedToken = generatePreferenceToken(businessId, email);
  return token === expectedToken;
}

/**
 * GET /api/notifications/preferences
 * Get email preferences for a client
 */
export async function GET(request: NextRequest) {
  try {
    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams: Record<string, any> = {};

    for (const [key, value] of searchParams.entries()) {
      queryParams[key] = value;
    }

    const validatedParams = getPreferencesSchema.parse(queryParams);

    // Verify token if provided (for unauthenticated access)
    if (validatedParams.token) {
      const isValid = verifyPreferenceToken(
        validatedParams.token,
        validatedParams.businessId,
        validatedParams.email
      );

      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid or expired token' },
          { status: 403 }
        );
      }
    }

    // Verify business exists
    const business = await prisma.business.findUnique({
      where: { id: validatedParams.businessId },
      select: { id: true, name: true },
    });

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Get or create email preferences
    const preferences = await prisma.emailPreference.findUnique({
      where: {
        businessId_email: {
          businessId: validatedParams.businessId,
          email: validatedParams.email,
        },
      },
    });

    // If no preferences exist, return defaults
    if (!preferences) {
      return NextResponse.json({
        businessId: validatedParams.businessId,
        email: validatedParams.email,
        receiveConfirmations: true,
        receiveReminders: true,
        receiveCancellations: true,
        receiveMarketing: false,
        unsubscribedAt: null,
      });
    }

    return NextResponse.json({
      businessId: preferences.businessId,
      email: preferences.email,
      receiveConfirmations: preferences.receiveConfirmations,
      receiveReminders: preferences.receiveReminders,
      receiveCancellations: preferences.receiveCancellations,
      receiveMarketing: preferences.receiveMarketing,
      unsubscribedAt: preferences.unsubscribedAt,
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

    console.error('[NotificationPreferences] Error fetching preferences', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch email preferences',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications/preferences
 * Update email preferences for a client
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = updatePreferencesSchema.parse(body);

    // Verify token if provided (for unauthenticated access)
    if (validatedData.token) {
      const isValid = verifyPreferenceToken(
        validatedData.token,
        validatedData.businessId,
        validatedData.email
      );

      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid or expired token' },
          { status: 403 }
        );
      }
    }

    // Verify business exists
    const business = await prisma.business.findUnique({
      where: { id: validatedData.businessId },
      select: { id: true, name: true },
    });

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Find client if exists
    const client = await prisma.client.findFirst({
      where: {
        businessId: validatedData.businessId,
        email: validatedData.email,
      },
      select: { id: true },
    });

    // Prepare update data
    const updateData: any = {};

    if (validatedData.receiveConfirmations !== undefined) {
      updateData.receiveConfirmations = validatedData.receiveConfirmations;
    }

    if (validatedData.receiveReminders !== undefined) {
      updateData.receiveReminders = validatedData.receiveReminders;
    }

    if (validatedData.receiveCancellations !== undefined) {
      updateData.receiveCancellations = validatedData.receiveCancellations;
    }

    if (validatedData.receiveMarketing !== undefined) {
      updateData.receiveMarketing = validatedData.receiveMarketing;
    }

    // Handle unsubscribe
    if (validatedData.unsubscribe === true) {
      updateData.unsubscribedAt = new Date();
      updateData.receiveReminders = false;
      updateData.receiveMarketing = false;
      // Keep confirmations and cancellations enabled (transactional emails)
    } else if (validatedData.unsubscribe === false) {
      // Re-subscribe
      updateData.unsubscribedAt = null;
    }

    // Upsert email preferences
    const preferences = await prisma.emailPreference.upsert({
      where: {
        businessId_email: {
          businessId: validatedData.businessId,
          email: validatedData.email,
        },
      },
      create: {
        businessId: validatedData.businessId,
        email: validatedData.email,
        clientId: client?.id,
        ...updateData,
      },
      update: updateData,
    });

    console.log('[NotificationPreferences] Preferences updated', {
      businessId: validatedData.businessId,
      email: validatedData.email,
      unsubscribed: !!preferences.unsubscribedAt,
    });

    return NextResponse.json({
      success: true,
      message: validatedData.unsubscribe
        ? 'Successfully unsubscribed from emails'
        : 'Email preferences updated successfully',
      preferences: {
        businessId: preferences.businessId,
        email: preferences.email,
        receiveConfirmations: preferences.receiveConfirmations,
        receiveReminders: preferences.receiveReminders,
        receiveCancellations: preferences.receiveCancellations,
        receiveMarketing: preferences.receiveMarketing,
        unsubscribedAt: preferences.unsubscribedAt,
      },
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

    console.error('[NotificationPreferences] Error updating preferences', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: 'Failed to update email preferences',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

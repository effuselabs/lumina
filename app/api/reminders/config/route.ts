/**
 * Reminder Configuration API
 * 
 * Endpoints for managing business-specific reminder settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

/**
 * Validation schema for reminder configuration
 */
const reminderConfigSchema = z.object({
  enable24hReminders: z.boolean().optional(),
  enable2hReminders: z.boolean().optional(),
  quietHoursStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().nullable(),
  quietHoursEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().nullable(),
  timezone: z.string().optional(),
});

/**
 * GET /api/reminders/config?businessId=xxx
 * 
 * Get reminder configuration for a business
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

    // Get business ID from query params
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    // Verify user has access to this business
    const businessUser = await prisma.businessUser.findUnique({
      where: {
        businessId_userId: {
          businessId,
          userId: session.user.id,
        },
      },
    });

    if (!businessUser) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get reminder configuration
    let config = await prisma.reminderConfig.findUnique({
      where: { businessId },
    });

    // If no config exists, return defaults
    if (!config) {
      return NextResponse.json({
        businessId,
        enable24hReminders: true,
        enable2hReminders: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        timezone: 'America/New_York',
        isDefault: true,
      });
    }

    return NextResponse.json({
      businessId: config.businessId,
      enable24hReminders: config.enable24hReminders,
      enable2hReminders: config.enable2hReminders,
      quietHoursStart: config.quietHoursStart,
      quietHoursEnd: config.quietHoursEnd,
      timezone: config.timezone,
      isDefault: false,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    });
  } catch (error) {
    console.error('[API:ReminderConfig] Error fetching config', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Failed to fetch reminder configuration' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/reminders/config
 * 
 * Update reminder configuration for a business
 */
export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { businessId, ...configData } = body;

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    // Verify user has access to this business (owner or manager only)
    const businessUser = await prisma.businessUser.findUnique({
      where: {
        businessId_userId: {
          businessId,
          userId: session.user.id,
        },
      },
    });

    if (!businessUser || !['OWNER', 'MANAGER'].includes(businessUser.role)) {
      return NextResponse.json(
        { error: 'Access denied. Owner or manager role required.' },
        { status: 403 }
      );
    }

    // Validate configuration data
    const validatedData = reminderConfigSchema.parse(configData);

    // Upsert reminder configuration
    const config = await prisma.reminderConfig.upsert({
      where: { businessId },
      create: {
        businessId,
        enable24hReminders: validatedData.enable24hReminders ?? true,
        enable2hReminders: validatedData.enable2hReminders ?? false,
        quietHoursStart: validatedData.quietHoursStart ?? '22:00',
        quietHoursEnd: validatedData.quietHoursEnd ?? '08:00',
        timezone: validatedData.timezone ?? 'America/New_York',
      },
      update: {
        ...(validatedData.enable24hReminders !== undefined && {
          enable24hReminders: validatedData.enable24hReminders,
        }),
        ...(validatedData.enable2hReminders !== undefined && {
          enable2hReminders: validatedData.enable2hReminders,
        }),
        ...(validatedData.quietHoursStart !== undefined && {
          quietHoursStart: validatedData.quietHoursStart,
        }),
        ...(validatedData.quietHoursEnd !== undefined && {
          quietHoursEnd: validatedData.quietHoursEnd,
        }),
        ...(validatedData.timezone !== undefined && {
          timezone: validatedData.timezone,
        }),
      },
    });

    console.log('[API:ReminderConfig] Configuration updated', {
      businessId,
      userId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      config: {
        businessId: config.businessId,
        enable24hReminders: config.enable24hReminders,
        enable2hReminders: config.enable2hReminders,
        quietHoursStart: config.quietHoursStart,
        quietHoursEnd: config.quietHoursEnd,
        timezone: config.timezone,
        updatedAt: config.updatedAt,
      },
    });
  } catch (error) {
    console.error('[API:ReminderConfig] Error updating config', {
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid configuration data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update reminder configuration' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reminders/config?businessId=xxx
 * 
 * Reset reminder configuration to defaults
 */
export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get business ID from query params
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    // Verify user has access to this business (owner or manager only)
    const businessUser = await prisma.businessUser.findUnique({
      where: {
        businessId_userId: {
          businessId,
          userId: session.user.id,
        },
      },
    });

    if (!businessUser || !['OWNER', 'MANAGER'].includes(businessUser.role)) {
      return NextResponse.json(
        { error: 'Access denied. Owner or manager role required.' },
        { status: 403 }
      );
    }

    // Delete configuration (will revert to defaults)
    await prisma.reminderConfig.delete({
      where: { businessId },
    });

    console.log('[API:ReminderConfig] Configuration reset to defaults', {
      businessId,
      userId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Reminder configuration reset to defaults',
    });
  } catch (error) {
    console.error('[API:ReminderConfig] Error deleting config', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Failed to reset reminder configuration' },
      { status: 500 }
    );
  }
}

import { authorizePlatformAdmin } from '@/lib/auth/platform-admin';
import { alertingSystem } from '@/lib/monitoring/alerting-system';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const GetAlertsSchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
});

/**
 * Alerts from every salon on this deployment, so only a platform
 * administrator may list or resolve them (#72).
 */
export async function GET(request: NextRequest) {
  try {
    const access = await authorizePlatformAdmin();
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    // An absent parameter is null, which coerces to 0 and failed `min(1)`:
    // the list answered 400 unless a limit was given.
    const params = GetAlertsSchema.parse({
      limit: searchParams.get('limit') ?? undefined,
    });

    // Get active alerts
    const alerts = await alertingSystem.getActiveAlerts(params.limit);

    return NextResponse.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    console.error('Get alerts API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

const ResolveAlertSchema = z.object({
  alertId: z.string(),
});

export async function PUT(request: NextRequest) {
  try {
    const access = await authorizePlatformAdmin();
    if (!access.ok) return access.response;

    const body = await request.json();
    const { alertId } = ResolveAlertSchema.parse(body);

    // Resolve alert
    await alertingSystem.resolveAlert(alertId, access.userId);

    return NextResponse.json({
      success: true,
      message: 'Alert resolved successfully',
    });
  } catch (error) {
    console.error('Resolve alert API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

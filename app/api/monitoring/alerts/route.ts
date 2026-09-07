import { auth } from '@/lib/auth';
import { alertingSystem } from '@/lib/monitoring/alerting-system';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const GetAlertsSchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = GetAlertsSchema.parse({
      limit: searchParams.get('limit'),
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
        { error: 'Invalid parameters', details: error.errors },
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
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { alertId } = ResolveAlertSchema.parse(body);

    // Resolve alert
    await alertingSystem.resolveAlert(alertId, session.user.id);

    return NextResponse.json({
      success: true,
      message: 'Alert resolved successfully',
    });
  } catch (error) {
    console.error('Resolve alert API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

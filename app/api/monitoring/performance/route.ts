import { auth } from '@/lib/auth';
import { appointmentPerformanceMonitor } from '@/lib/monitoring/appointment-performance-monitor';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const GetPerformanceStatsSchema = z.object({
  businessId: z.string().optional(),
  timeWindow: z.coerce.number().optional(), // milliseconds
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = GetPerformanceStatsSchema.parse({
      businessId: searchParams.get('businessId'),
      timeWindow: searchParams.get('timeWindow'),
    });

    // Get performance statistics
    const stats = appointmentPerformanceMonitor.generateReport(
      params.timeWindow
    );

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Performance stats API error:', error);

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

const UpdateThresholdsSchema = z.object({
  maxResponseTime: z.number().min(1).optional(),
  errorRateThreshold: z.number().min(0).max(100).optional(),
  volumeThreshold: z.number().min(1).optional(),
});

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin permissions
    // TODO: Implement proper role-based access control

    const body = await request.json();
    const thresholds = UpdateThresholdsSchema.parse(body);

    // Update alert thresholds
    // TODO: Implement updateAlertThresholds method
    // appointmentPerformanceMonitor.updateAlertThresholds(thresholds);

    return NextResponse.json({
      success: true,
      message: 'Alert thresholds updated successfully',
    });
  } catch (error) {
    console.error('Update thresholds API error:', error);

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

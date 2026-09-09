import { authorizeBusinessAccess } from '@/lib/auth/business-access';
import { appointmentPerformanceMonitor } from '@/lib/monitoring/appointment-performance-monitor';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const GetPerformanceStatsSchema = z.object({
  businessId: z.string().optional(),
  timeWindow: z.coerce.number().optional(), // milliseconds
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = GetPerformanceStatsSchema.parse({
      businessId: searchParams.get('businessId'),
      timeWindow: searchParams.get('timeWindow'),
    });

    const access = await authorizeBusinessAccess(params.businessId);
    if (!access.ok) return access.response;

    /*
     * NOTE: `generateReport` takes only a time window — it does not scope by
     * business, so the numbers below are still application-wide. The check
     * above stops a stranger asking, but does not yet make the answer theirs.
     * Recorded in docs/PLAN.md.
     */

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

/*
 * A PUT handler lived here. It validated a threshold payload, then returned
 * `{ success: true, message: 'Alert thresholds updated successfully' }` with
 * the one line that would have updated anything commented out, beneath two
 * TODOs — one for the update, one for the role check that would have decided
 * who may perform it. An endpoint that reports success for work it did not do
 * is worse than one that is missing, so it is missing.
 */

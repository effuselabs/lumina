import { authorizeBusinessAccess } from '@/lib/auth/business-access';
import { businessMetricsTracker } from '@/lib/monitoring/business-metrics-tracker';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const GetBusinessMetricsSchema = z.object({
  businessId: z.string().cuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = GetBusinessMetricsSchema.parse({
      businessId: searchParams.get('businessId'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    });

    // Replaces `// TODO: Validate user has access to this business`. The
    // businessId comes from the query string, so a session by itself proves
    // only that someone is signed in — not that they are signed in here.
    const access = await authorizeBusinessAccess(params.businessId);
    if (!access.ok) return access.response;

    const [businessMetrics, volumeMetrics] = await Promise.all([
      businessMetricsTracker.getBusinessMetrics(
        params.businessId,
        new Date(params.startDate),
        new Date(params.endDate)
      ),
      businessMetricsTracker.getAppointmentVolumeMetrics(
        params.businessId,
        new Date(params.startDate),
        new Date(params.endDate)
      ),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        businessMetrics,
        volumeMetrics,
      },
    });
  } catch (error) {
    console.error('Business metrics API error:', error);

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

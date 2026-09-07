import { auth } from '@/lib/auth';
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
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = GetBusinessMetricsSchema.parse({
      businessId: searchParams.get('businessId'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    });

    // TODO: Validate user has access to this business

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

import { appointmentAnalyticsService } from '@/lib/analytics/appointment-analytics-service';
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const GetAnalyticsSchema = z.object({
  businessId: z.string().cuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  compareWithPrevious: z.coerce.boolean().optional().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = GetAnalyticsSchema.parse({
      businessId: searchParams.get('businessId'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      compareWithPrevious: searchParams.get('compareWithPrevious'),
    });

    // TODO: Validate user has access to this business

    const analytics = await appointmentAnalyticsService.getAppointmentAnalytics(
      params.businessId,
      new Date(params.startDate),
      new Date(params.endDate),
      params.compareWithPrevious
    );

    return NextResponse.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('Appointment analytics API error:', error);

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

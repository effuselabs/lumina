import { appointmentAnalyticsService } from '@/lib/analytics/appointment-analytics-service';
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const GetStaffEfficiencySchema = z.object({
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
    const params = GetStaffEfficiencySchema.parse({
      businessId: searchParams.get('businessId'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    });

    // TODO: Validate user has access to this business

    const efficiencyReport =
      await appointmentAnalyticsService.getStaffEfficiencyReport(
        params.businessId,
        new Date(params.startDate),
        new Date(params.endDate)
      );

    return NextResponse.json({
      success: true,
      data: efficiencyReport,
    });
  } catch (error) {
    console.error('Staff efficiency API error:', error);

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

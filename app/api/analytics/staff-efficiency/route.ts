import { appointmentAnalyticsService } from '@/lib/analytics/appointment-analytics-service';
import { authorizeBusinessAccess } from '@/lib/auth/business-access';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const GetStaffEfficiencySchema = z.object({
  businessId: z.string().cuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = GetStaffEfficiencySchema.parse({
      businessId: searchParams.get('businessId'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    });

    // Replaces `// TODO: Validate user has access to this business`. The
    // businessId comes from the query string, so a session by itself proves
    // only that someone is signed in — not that they are signed in here.
    const access = await authorizeBusinessAccess(params.businessId);
    if (!access.ok) return access.response;

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

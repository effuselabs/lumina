import { authorizeBusinessAccess } from '@/lib/auth/business-access';
import { DashboardDataService } from '@/lib/dashboard-data';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // A session alone is not authorization: the businessId arrives in the
    // query string, so it must be checked against this user's memberships.
    const access = await authorizeBusinessAccess(
      searchParams.get('businessId')
    );
    if (!access.ok) return access.response;

    if (!from || !to) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const dataService = new DashboardDataService(access.businessId);
    const dateRange = {
      from: new Date(from),
      to: new Date(to),
    };

    const revenueData = await dataService.getRevenueData(dateRange);
    const revenueMetrics = await dataService.getRevenueMetrics(dateRange);

    return NextResponse.json({
      data: revenueData,
      metrics: revenueMetrics,
    });
  } catch {
    // Log error securely (in production, use proper logging service)
    // Error logging handled by monitoring service
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { auth } from '@/auth';
import { DashboardDataService } from '@/lib/dashboard-data';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!businessId || !from || !to) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const dataService = new DashboardDataService(businessId);
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

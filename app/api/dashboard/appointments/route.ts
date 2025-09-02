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
    const limit = searchParams.get('limit');

    if (!businessId) {
      return NextResponse.json(
        { error: 'Missing businessId parameter' },
        { status: 400 }
      );
    }

    const dataService = new DashboardDataService(businessId);
    const appointments = await dataService.getRecentAppointments(
      limit ? parseInt(limit) : 10
    );

    return NextResponse.json(appointments);
  } catch {
    // Log error securely (in production, use proper logging service)
    // Error logging handled by monitoring service
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

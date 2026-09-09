import { authorizeBusinessAccess } from '@/lib/auth/business-access';
import { DashboardDataService } from '@/lib/dashboard-data';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');

    // A session alone is not authorization: the businessId arrives in the
    // query string, so it must be checked against this user's memberships.
    const access = await authorizeBusinessAccess(
      searchParams.get('businessId')
    );
    if (!access.ok) return access.response;

    const dataService = new DashboardDataService(access.businessId);
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

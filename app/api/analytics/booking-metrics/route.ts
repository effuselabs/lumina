import { bookingAnalytics } from '@/lib/analytics/booking-analytics';
import { authorizeBusinessAccess } from '@/lib/auth/business-access';
import { createPerformanceMonitor } from '@/lib/monitoring/booking-performance-monitor';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, startDate, endDate } = body;

    /*
     * This did check access, by comparing against `session.user.businessId` —
     * a single business id carried on the session. That is a fifth variant of
     * the check, and it is wrong for anyone who belongs to more than one
     * business: they would be refused their own second salon. Membership is a
     * relation, so it is read from the relation.
     */
    const access = await authorizeBusinessAccess(businessId);
    if (!access.ok) return access.response;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validate date range
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date range' },
        { status: 400 }
      );
    }

    // Fetch analytics data
    const [conversionMetrics, performanceMetrics] = await Promise.all([
      bookingAnalytics.getConversionMetrics(businessId, start, end),
      bookingAnalytics.getPerformanceMetrics(businessId, start, end),
    ]);

    // Get performance insights
    const performanceMonitor = createPerformanceMonitor(businessId);
    const performanceInsights = await performanceMonitor.getPerformanceInsights(
      businessId,
      start,
      end
    );

    return NextResponse.json({
      conversionMetrics,
      performanceMetrics,
      performanceInsights,
    });
  } catch (error) {
    console.error('Error fetching booking metrics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

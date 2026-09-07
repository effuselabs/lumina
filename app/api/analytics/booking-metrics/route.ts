import { bookingAnalytics } from '@/lib/analytics/booking-analytics';
import { auth } from '@/lib/auth';
import { createPerformanceMonitor } from '@/lib/monitoring/booking-performance-monitor';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { businessId, startDate, endDate } = body;

    // Validate business access
    if (businessId !== session.user.businessId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

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

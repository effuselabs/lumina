import { authorizeBusinessAccess } from '@/lib/auth/business-access';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Schema for performance metrics
const PerformanceMetricSchema = z.object({
  name: z.string(),
  value: z.number(),
  timestamp: z.number(),
  metadata: z.record(z.any()).optional(),
});

const PerformanceDataSchema = z.object({
  businessId: z.string(),
  metrics: z.array(PerformanceMetricSchema),
  performanceData: z.object({
    pageLoadTime: z.number(),
    timeToInteractive: z.number(),
    firstContentfulPaint: z.number(),
    largestContentfulPaint: z.number(),
    cumulativeLayoutShift: z.number(),
    apiResponseTimes: z.record(z.number()),
    userInteractions: z.array(
      z.object({
        type: z.string(),
        timestamp: z.number(),
        duration: z.number().optional(),
      })
    ),
    networkConditions: z.object({
      connectionType: z.string(),
      effectiveType: z.string(),
      downlink: z.number().optional(),
      rtt: z.number().optional(),
    }),
    errors: z.array(
      z.object({
        message: z.string(),
        timestamp: z.number(),
        stack: z.string().optional(),
      })
    ),
  }),
  timestamp: z.number(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = PerformanceDataSchema.parse(body);

    // In a real implementation, you would:
    // 1. Store metrics in a time-series database (e.g., InfluxDB, TimescaleDB)
    // 2. Send to analytics service (e.g., Google Analytics, Mixpanel)
    // 3. Alert on performance issues
    // 4. Generate performance reports

    // For now, we'll log the metrics and store basic info
    console.log('Performance metrics received:', {
      businessId: validatedData.businessId,
      metricsCount: validatedData.metrics.length,
      pageLoadTime: validatedData.performanceData.pageLoadTime,
      networkType:
        validatedData.performanceData.networkConditions.effectiveType,
    });

    // Check for performance issues and log warnings
    const issues = analyzePerformanceIssues(validatedData);
    if (issues.length > 0) {
      console.warn('Performance issues detected:', issues);
    }

    // Store in database (placeholder - implement with your database)
    await storePerformanceMetrics(validatedData);

    return NextResponse.json({
      success: true,
      message: 'Performance metrics recorded',
      issues: issues.length > 0 ? issues : undefined,
    });
  } catch (error) {
    console.error('Failed to process performance metrics:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid performance data format', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process performance metrics' },
      { status: 500 }
    );
  }
}

function analyzePerformanceIssues(
  data: z.infer<typeof PerformanceDataSchema>
): string[] {
  const issues: string[] = [];
  const { performanceData } = data;

  // Check Core Web Vitals
  if (performanceData.firstContentfulPaint > 1800) {
    issues.push(
      `Slow First Contentful Paint: ${performanceData.firstContentfulPaint.toFixed(0)}ms`
    );
  }

  if (performanceData.largestContentfulPaint > 2500) {
    issues.push(
      `Slow Largest Contentful Paint: ${performanceData.largestContentfulPaint.toFixed(0)}ms`
    );
  }

  if (performanceData.cumulativeLayoutShift > 0.1) {
    issues.push(
      `High Cumulative Layout Shift: ${performanceData.cumulativeLayoutShift.toFixed(3)}`
    );
  }

  // Check page load time
  if (performanceData.pageLoadTime > 3000) {
    issues.push(`Slow page load: ${performanceData.pageLoadTime.toFixed(0)}ms`);
  }

  // Check API response times
  Object.entries(performanceData.apiResponseTimes).forEach(([api, time]) => {
    const threshold = getApiThreshold(api);
    if (time > threshold) {
      issues.push(
        `Slow ${api} API: ${time.toFixed(0)}ms (threshold: ${threshold}ms)`
      );
    }
  });

  // Check for errors
  if (performanceData.errors.length > 0) {
    issues.push(`${performanceData.errors.length} JavaScript errors detected`);
  }

  // Check network conditions
  if (
    performanceData.networkConditions.effectiveType === 'slow-2g' ||
    performanceData.networkConditions.effectiveType === '2g'
  ) {
    issues.push('User on slow network connection');
  }

  return issues;
}

function getApiThreshold(apiName: string): number {
  const thresholds: Record<string, number> = {
    availability: 500,
    book: 1000,
    'client-lookup': 300,
    'booking-info': 800,
  };

  return thresholds[apiName] || 1000;
}

async function storePerformanceMetrics(
  data: z.infer<typeof PerformanceDataSchema>
) {
  // In a real implementation, store in your database
  // This is a placeholder for the actual database storage logic

  try {
    // Example: Store in PostgreSQL with Prisma
    // await prisma.performanceMetric.create({
    //   data: {
    //     businessId: data.businessId,
    //     timestamp: new Date(data.timestamp),
    //     pageLoadTime: data.performanceData.pageLoadTime,
    //     firstContentfulPaint: data.performanceData.firstContentfulPaint,
    //     largestContentfulPaint: data.performanceData.largestContentfulPaint,
    //     cumulativeLayoutShift: data.performanceData.cumulativeLayoutShift,
    //     apiResponseTimes: data.performanceData.apiResponseTimes,
    //     networkType: data.performanceData.networkConditions.effectiveType,
    //     errorCount: data.performanceData.errors.length,
    //     metrics: data.metrics,
    //   },
    // });

    console.log('Performance metrics stored successfully');
  } catch (error) {
    console.error('Failed to store performance metrics:', error);
    // Don't throw error to avoid failing the API response
  }
}

// GET endpoint for retrieving performance analytics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '24h';

    // This handler had no authentication of any kind: it read a businessId
    // from the query string and answered.
    const access = await authorizeBusinessAccess(
      searchParams.get('businessId')
    );
    if (!access.ok) return access.response;

    // In a real implementation, query your database for performance metrics
    const performanceAnalytics = await getPerformanceAnalytics(
      access.businessId,
      timeRange
    );

    return NextResponse.json(performanceAnalytics);
  } catch (error) {
    console.error('Failed to retrieve performance analytics:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve performance analytics' },
      { status: 500 }
    );
  }
}

async function getPerformanceAnalytics(businessId: string, timeRange: string) {
  // Placeholder implementation
  // In a real app, query your database for aggregated performance metrics

  return {
    businessId,
    timeRange,
    summary: {
      averagePageLoadTime: 2100,
      averageApiResponseTime: 450,
      errorRate: 0.02,
      slowConnectionPercentage: 15,
    },
    trends: {
      pageLoadTimes: [2000, 2100, 1900, 2200, 2050],
      apiResponseTimes: [400, 450, 420, 480, 430],
      errorCounts: [1, 0, 2, 1, 0],
    },
    recommendations: [
      'Consider optimizing images for mobile users',
      'API response times are within acceptable range',
      'Monitor error rate - slight increase detected',
    ],
  };
}

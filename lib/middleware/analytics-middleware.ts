import { createPerformanceMonitor } from '@/lib/monitoring/booking-performance-monitor';
import { NextRequest, NextResponse } from 'next/server';

export function withAnalyticsTracking(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    const url = new URL(request.url);

    // Extract business ID from request (could be from headers, query params, or body)
    let businessId: string | null = null;

    try {
      // Try to get business ID from various sources
      businessId =
        request.headers.get('x-business-id') ||
        url.searchParams.get('businessId') ||
        null;

      // If not found in headers/query, try to extract from body for POST requests
      if (
        !businessId &&
        (request.method === 'POST' || request.method === 'PUT')
      ) {
        try {
          const body = await request.clone().json();
          businessId = body.businessId;
        } catch {
          // Body is not JSON or doesn't contain businessId
        }
      }
    } catch (error) {
      console.warn('Failed to extract business ID for analytics:', error);
    }

    let response: NextResponse;
    let error: Error | null = null;

    try {
      response = await handler(request);
    } catch (err) {
      error = err instanceof Error ? err : new Error('Unknown error');
      response = NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Track performance metrics if we have a business ID
    if (businessId) {
      try {
        const performanceMonitor = createPerformanceMonitor(businessId);

        await performanceMonitor.trackAPIPerformance({
          endpoint: url.pathname,
          method: request.method,
          duration,
          statusCode: response.status,
          timestamp: new Date(startTime),
          businessId,
        });

        // Track errors if any occurred
        if (error) {
          await performanceMonitor.trackError(businessId, error, {
            endpoint: url.pathname,
            method: request.method,
            statusCode: response.status,
            duration,
          });
        }
      } catch (trackingError) {
        console.error('Failed to track API performance:', trackingError);
      }
    }

    // Add performance headers to response
    response.headers.set('X-Response-Time', `${duration}ms`);
    response.headers.set('X-Timestamp', new Date(startTime).toISOString());

    return response;
  };
}

// Utility function to extract business ID from various request sources
export function extractBusinessId(request: NextRequest): string | null {
  const url = new URL(request.url);

  // Check headers first
  const headerBusinessId = request.headers.get('x-business-id');
  if (headerBusinessId) return headerBusinessId;

  // Check query parameters
  const queryBusinessId = url.searchParams.get('businessId');
  if (queryBusinessId) return queryBusinessId;

  // Check URL path for business ID patterns
  const pathMatch = url.pathname.match(/\/api\/public\/booking\/([^\/]+)/);
  if (pathMatch) return pathMatch[1];

  return null;
}

// Middleware specifically for public booking endpoints
export function withPublicBookingAnalytics(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    const url = new URL(request.url);

    // Extract business ID from URL path for public booking endpoints
    const businessId = extractBusinessId(request);

    if (!businessId) {
      console.warn(
        'No business ID found for public booking analytics tracking'
      );
      return handler(request);
    }

    let response: NextResponse;
    let error: Error | null = null;

    try {
      response = await handler(request);
    } catch (err) {
      error = err instanceof Error ? err : new Error('Unknown error');
      response = NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Track performance metrics
    try {
      const performanceMonitor = createPerformanceMonitor(businessId);

      await performanceMonitor.trackAPIPerformance({
        endpoint: url.pathname,
        method: request.method,
        duration,
        statusCode: response.status,
        timestamp: new Date(startTime),
        businessId,
      });

      // Track errors if any occurred
      if (error) {
        await performanceMonitor.trackError(businessId, error, {
          endpoint: url.pathname,
          method: request.method,
          statusCode: response.status,
          duration,
          userAgent: request.headers.get('user-agent'),
          referer: request.headers.get('referer'),
        });
      }

      // Track slow API responses
      if (duration > 1000) {
        // Responses slower than 1 second
        await performanceMonitor.trackPerformance({
          businessId,
          eventType: 'api_response',
          duration,
          timestamp: new Date(startTime),
          metadata: {
            endpoint: url.pathname,
            method: request.method,
            statusCode: response.status,
            slow: true,
          },
        });
      }
    } catch (trackingError) {
      console.error(
        'Failed to track public booking API performance:',
        trackingError
      );
    }

    // Add performance headers
    response.headers.set('X-Response-Time', `${duration}ms`);
    response.headers.set('X-Business-Id', businessId);

    return response;
  };
}

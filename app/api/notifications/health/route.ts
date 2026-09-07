/**
 * Notification System Health Check API Endpoint
 *
 * GET /api/notifications/health
 * Returns health status of the notification system including:
 * - Queue health
 * - Worker status
 * - Rate limit status
 * - Active alerts
 */

import { NextResponse } from 'next/server';
import { emailQueueMonitor } from '@/lib/email/monitoring';

/**
 * GET /api/notifications/health
 * Get notification system health status
 * Public endpoint for monitoring systems
 */
export async function GET() {
  try {
    // Get health summary
    const healthSummary = await emailQueueMonitor.getHealthSummary();

    // Return health status
    return NextResponse.json({
      status: healthSummary.status,
      healthy: healthSummary.status === 'healthy',
      alerts: healthSummary.alerts,
      timestamp: healthSummary.timestamp,
    });
  } catch (error) {
    console.error('[NotificationHealth] Error checking health', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        status: 'error',
        healthy: false,
        error: 'Failed to check notification system health',
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      },
      { status: 500 }
    );
  }
}

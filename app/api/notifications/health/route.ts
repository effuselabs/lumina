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

import { authorizePlatformAdmin } from '@/lib/auth/platform-admin';
import { emailQueueMonitor } from '@/lib/email/monitoring';
import { NextResponse } from 'next/server';

/**
 * GET /api/notifications/health
 *
 * The email queue across every salon on this deployment, so it answers only
 * a platform administrator (#72). It was described as a public endpoint for
 * monitoring systems, but middleware never listed it as public, so it served
 * any signed-in user of any salon. An uptime monitor wants `/api/health`.
 */
export async function GET() {
  try {
    const access = await authorizePlatformAdmin();
    if (!access.ok) return access.response;

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

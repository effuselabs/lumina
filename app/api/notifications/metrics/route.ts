/**
 * Notification Metrics API Endpoint
 * 
 * GET /api/notifications/metrics
 * Returns notification metrics for a business including:
 * - Queue metrics (depth, processing rate, failure rate)
 * - Rate limit status
 * - Delivery statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { emailQueueManager } from '@/lib/email/queue-manager';
import { emailRateLimiter } from '@/lib/email/rate-limiter';
import { emailQueueWorker } from '@/lib/email/queue-worker';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/notifications/metrics
 * Get notification metrics for the authenticated business
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get business ID from query params or user's primary business
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    // Verify user has access to this business
    const businessUser = await prisma.businessUser.findUnique({
      where: {
        businessId_userId: {
          businessId,
          userId: session.user.id,
        },
      },
    });

    if (!businessUser) {
      return NextResponse.json(
        { error: 'Access denied to this business' },
        { status: 403 }
      );
    }

    // Get queue metrics
    const queueMetrics = await emailQueueManager.getQueueMetrics();

    // Get rate limit status
    const rateLimitStatus = await emailRateLimiter.getRateLimitStatus(businessId);

    // Get worker status
    const workerStatus = emailQueueWorker.getStatus();

    // Get delivery statistics for the business
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalSentLast24h,
      totalFailedLast24h,
      totalSentLastWeek,
      totalFailedLastWeek,
      totalPending,
    ] = await Promise.all([
      prisma.emailQueue.count({
        where: {
          businessId,
          status: 'sent',
          sentAt: { gte: oneDayAgo },
        },
      }),
      prisma.emailQueue.count({
        where: {
          businessId,
          status: 'failed',
          updatedAt: { gte: oneDayAgo },
        },
      }),
      prisma.emailQueue.count({
        where: {
          businessId,
          status: 'sent',
          sentAt: { gte: oneWeekAgo },
        },
      }),
      prisma.emailQueue.count({
        where: {
          businessId,
          status: 'failed',
          updatedAt: { gte: oneWeekAgo },
        },
      }),
      prisma.emailQueue.count({
        where: {
          businessId,
          status: 'pending',
        },
      }),
    ]);

    // Calculate delivery rates
    const deliveryRateLast24h =
      totalSentLast24h + totalFailedLast24h > 0
        ? (totalSentLast24h / (totalSentLast24h + totalFailedLast24h)) * 100
        : 100;

    const deliveryRateLastWeek =
      totalSentLastWeek + totalFailedLastWeek > 0
        ? (totalSentLastWeek / (totalSentLastWeek + totalFailedLastWeek)) * 100
        : 100;

    // Get email breakdown by template type (last 7 days)
    const emailsByType = await prisma.emailQueue.groupBy({
      by: ['templateType'],
      where: {
        businessId,
        createdAt: { gte: oneWeekAgo },
      },
      _count: {
        id: true,
      },
    });

    const metrics = {
      // Queue metrics
      queue: {
        depth: queueMetrics.queueDepth,
        messagesProcessed: queueMetrics.messagesProcessed,
        messagesFailed: queueMetrics.messagesFailed,
        averageProcessingTime: Math.round(queueMetrics.averageProcessingTime / 1000), // Convert to seconds
        oldestMessageAge: Math.round(queueMetrics.oldestMessageAge / 1000), // Convert to seconds
      },

      // Rate limit status
      rateLimit: {
        emailsSentLastHour: rateLimitStatus.emailsSentLastHour,
        emailsSentLastDay: rateLimitStatus.emailsSentLastDay,
        hourlyLimit: rateLimitStatus.hourlyLimit,
        dailyLimit: rateLimitStatus.dailyLimit,
        hourlyLimitReached: rateLimitStatus.hourlyLimitReached,
        dailyLimitReached: rateLimitStatus.dailyLimitReached,
        canSend: rateLimitStatus.canSend,
      },

      // Worker status
      worker: {
        isRunning: workerStatus.isRunning,
        emailsProcessed: workerStatus.emailsProcessed,
        emailsFailed: workerStatus.emailsFailed,
        lastProcessedAt: workerStatus.lastProcessedAt,
        uptime: Math.round(workerStatus.uptime / 1000), // Convert to seconds
      },

      // Business-specific delivery statistics
      delivery: {
        last24h: {
          sent: totalSentLast24h,
          failed: totalFailedLast24h,
          deliveryRate: Math.round(deliveryRateLast24h * 100) / 100,
        },
        lastWeek: {
          sent: totalSentLastWeek,
          failed: totalFailedLastWeek,
          deliveryRate: Math.round(deliveryRateLastWeek * 100) / 100,
        },
        pending: totalPending,
      },

      // Email breakdown by type
      emailsByType: emailsByType.map((item) => ({
        templateType: item.templateType,
        count: item._count.id,
      })),

      // Timestamp
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('[NotificationMetrics] Error fetching metrics', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch notification metrics',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

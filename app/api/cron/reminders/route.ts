/**
 * Reminder Processing Cron Job
 *
 * API endpoint to be called by a cron service (e.g., Vercel Cron, GitHub Actions)
 * Runs every 15 minutes to process appointment reminders.
 *
 * Security: Protected by CRON_SECRET environment variable
 */

import { NextRequest, NextResponse } from 'next/server';
import { reminderScheduler } from '@/lib/email/reminder-scheduler';

/**
 * POST /api/cron/reminders
 *
 * Processes appointment reminders for all businesses
 * Should be called every 15 minutes by a cron service
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('[Cron:Reminders] CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Cron job not configured' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.warn('[Cron:Reminders] Unauthorized cron job attempt', {
        hasAuthHeader: !!authHeader,
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron:Reminders] Starting reminder processing');
    const startTime = Date.now();

    // Schedule reminders for all businesses
    const result = await reminderScheduler.scheduleRemindersForAllBusinesses();

    const duration = Date.now() - startTime;

    console.log('[Cron:Reminders] Reminder processing completed', {
      duration: `${duration}ms`,
      reminders24h: result.reminders24hScheduled,
      reminders2h: result.reminders2hScheduled,
      errors: result.errors.length,
    });

    return NextResponse.json({
      success: true,
      reminders24hScheduled: result.reminders24hScheduled,
      reminders2hScheduled: result.reminders2hScheduled,
      totalScheduled:
        result.reminders24hScheduled + result.reminders2hScheduled,
      errors: result.errors,
      duration,
    });
  } catch (error) {
    console.error('[Cron:Reminders] Error processing reminders', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/reminders
 *
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'reminder-processing',
    description: 'Processes appointment reminders every 15 minutes',
  });
}

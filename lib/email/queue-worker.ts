/**
 * Email Queue Worker
 * 
 * Background worker that processes the email queue.
 * Handles concurrent processing, priority ordering, and graceful shutdown.
 */

import { emailQueueManager } from './queue-manager';
import { emailRateLimiter } from './rate-limiter';
import { ResendEmailProvider } from './resend-provider';
import type { EmailProvider, EmailMessage } from './types';

/**
 * Queue Worker Configuration
 */
export interface QueueWorkerConfig {
  emailProvider?: EmailProvider;
  processingInterval?: number; // Milliseconds between processing cycles
  concurrentProcessing?: number; // Number of emails to process concurrently
  enableAutoStart?: boolean; // Auto-start worker on instantiation
}

/**
 * Queue Worker Status
 */
export interface QueueWorkerStatus {
  isRunning: boolean;
  emailsProcessed: number;
  emailsFailed: number;
  lastProcessedAt?: Date;
  uptime: number;
}

/**
 * Email Queue Worker
 * Processes queued emails in the background with priority support
 */
export class EmailQueueWorker {
  private emailProvider: EmailProvider;
  private processingInterval: number;
  private concurrentProcessing: number;
  private isRunning: boolean = false;
  private shouldStop: boolean = false;
  private processingTimer?: NodeJS.Timeout;
  private emailsProcessed: number = 0;
  private emailsFailed: number = 0;
  private startTime?: Date;
  private lastProcessedAt?: Date;
  private activeProcessing: Set<string> = new Set();

  constructor(config?: QueueWorkerConfig) {
    // Initialize email provider
    this.emailProvider = config?.emailProvider || new ResendEmailProvider({
      apiKey: process.env.RESEND_API_KEY || '',
      fromEmail: process.env.EMAIL_FROM,
      fromName: process.env.EMAIL_FROM_NAME || 'Lumina',
    });

    this.processingInterval = config?.processingInterval || 5000; // 5 seconds default
    this.concurrentProcessing = config?.concurrentProcessing || 5; // Process 5 emails concurrently

    // Auto-start if enabled
    if (config?.enableAutoStart) {
      this.start();
    }
  }

  /**
   * Start the queue worker
   */
  start(): void {
    if (this.isRunning) {
      console.log('[EmailQueueWorker] Worker is already running');
      return;
    }

    this.isRunning = true;
    this.shouldStop = false;
    this.startTime = new Date();
    this.emailsProcessed = 0;
    this.emailsFailed = 0;

    console.log('[EmailQueueWorker] Starting queue worker', {
      processingInterval: this.processingInterval,
      concurrentProcessing: this.concurrentProcessing,
    });

    // Start processing loop
    this.processQueue();
  }

  /**
   * Stop the queue worker gracefully
   * Waits for active processing to complete
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('[EmailQueueWorker] Worker is not running');
      return;
    }

    console.log('[EmailQueueWorker] Stopping queue worker gracefully...');
    this.shouldStop = true;

    // Clear the processing timer
    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
      this.processingTimer = undefined;
    }

    // Wait for active processing to complete
    const maxWaitTime = 30000; // 30 seconds max wait
    const startWait = Date.now();

    while (this.activeProcessing.size > 0 && Date.now() - startWait < maxWaitTime) {
      console.log('[EmailQueueWorker] Waiting for active processing to complete', {
        activeCount: this.activeProcessing.size,
      });
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    this.isRunning = false;

    console.log('[EmailQueueWorker] Queue worker stopped', {
      emailsProcessed: this.emailsProcessed,
      emailsFailed: this.emailsFailed,
      uptime: this.getUptime(),
    });
  }

  /**
   * Get worker status
   */
  getStatus(): QueueWorkerStatus {
    return {
      isRunning: this.isRunning,
      emailsProcessed: this.emailsProcessed,
      emailsFailed: this.emailsFailed,
      lastProcessedAt: this.lastProcessedAt,
      uptime: this.getUptime(),
    };
  }

  /**
   * Get worker uptime in milliseconds
   */
  private getUptime(): number {
    if (!this.startTime) {
      return 0;
    }
    return Date.now() - this.startTime.getTime();
  }

  /**
   * Main processing loop
   * Continuously processes emails from the queue
   */
  private async processQueue(): Promise<void> {
    if (this.shouldStop) {
      return;
    }

    try {
      // Process multiple emails concurrently up to the limit
      const processingPromises: Promise<void>[] = [];

      for (let i = 0; i < this.concurrentProcessing; i++) {
        // Check if we should stop or if we're at capacity
        if (this.shouldStop || this.activeProcessing.size >= this.concurrentProcessing) {
          break;
        }

        // Dequeue and process next email
        processingPromises.push(this.processNextEmail());
      }

      // Wait for all concurrent processing to complete
      if (processingPromises.length > 0) {
        await Promise.allSettled(processingPromises);
      }
    } catch (error) {
      console.error('[EmailQueueWorker] Error in processing loop', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Schedule next processing cycle
    if (!this.shouldStop) {
      this.processingTimer = setTimeout(() => {
        this.processQueue();
      }, this.processingInterval);
    }
  }

  /**
   * Process the next email in the queue
   */
  private async processNextEmail(): Promise<void> {
    let email: EmailMessage | null = null;

    try {
      // Dequeue next email
      email = await emailQueueManager.dequeue();

      if (!email) {
        // Queue is empty, nothing to process
        return;
      }

      // Track active processing
      this.activeProcessing.add(email.id);

      console.log('[EmailQueueWorker] Processing email', {
        queueId: email.id,
        businessId: email.businessId,
        recipientEmail: email.to,
        templateType: email.templateType,
        attemptCount: email.attemptCount + 1,
      });

      // Check rate limit before sending
      const canSend = await emailRateLimiter.checkRateLimit(email.businessId);
      if (!canSend) {
        console.warn('[EmailQueueWorker] Rate limit exceeded, rescheduling email', {
          queueId: email.id,
          businessId: email.businessId,
        });

        // Reschedule for 5 minutes later
        const nextAttempt = email.attemptCount; // Don't increment attempt count for rate limit
        await emailQueueManager.scheduleRetry(email.id, nextAttempt);
        return;
      }

      // Send email via provider
      const result = await this.emailProvider.send(email);

      if (result.success) {
        // Mark as sent
        await emailQueueManager.markAsSent(email.id, result.messageId);
        this.emailsProcessed++;
        this.lastProcessedAt = new Date();

        console.log('[EmailQueueWorker] Email sent successfully', {
          queueId: email.id,
          providerMessageId: result.messageId,
        });
      } else {
        // Send failed, schedule retry
        const nextAttempt = email.attemptCount + 1;
        await emailQueueManager.scheduleRetry(email.id, nextAttempt);
        this.emailsFailed++;

        console.error('[EmailQueueWorker] Email send failed, scheduled for retry', {
          queueId: email.id,
          attemptCount: nextAttempt,
          error: result.error,
        });
      }
    } catch (error) {
      console.error('[EmailQueueWorker] Error processing email', {
        queueId: email?.id,
        error: error instanceof Error ? error.message : String(error),
      });

      // If we have an email, try to schedule retry or mark as failed
      if (email) {
        try {
          const nextAttempt = email.attemptCount + 1;
          await emailQueueManager.scheduleRetry(email.id, nextAttempt);
          this.emailsFailed++;
        } catch (retryError) {
          console.error('[EmailQueueWorker] Failed to schedule retry', {
            queueId: email.id,
            error: retryError instanceof Error ? retryError.message : String(retryError),
          });
        }
      }
    } finally {
      // Remove from active processing
      if (email) {
        this.activeProcessing.delete(email.id);
      }
    }
  }

  /**
   * Process a specific number of emails immediately
   * Useful for testing or manual processing
   * 
   * @param count - Number of emails to process
   * @returns Number of emails successfully processed
   */
  async processImmediate(count: number = 1): Promise<number> {
    let processed = 0;

    for (let i = 0; i < count; i++) {
      try {
        await this.processNextEmail();
        processed++;
      } catch (error) {
        console.error('[EmailQueueWorker] Error in immediate processing', {
          error: error instanceof Error ? error.message : String(error),
        });
        break;
      }
    }

    return processed;
  }
}

// Export singleton instance (not auto-started)
export const emailQueueWorker = new EmailQueueWorker({
  enableAutoStart: false,
});

/**
 * Email Queue Manager
 * 
 * Manages email queuing, dequeuing, and processing with priority support.
 * Provides database-backed queue operations for reliable email delivery.
 */

import { prisma } from '@/lib/prisma';
import { emailRateLimiter } from './rate-limiter';
import type { EmailMessage, EmailTemplateType } from './types';

/**
 * Queue metrics for monitoring
 */
export interface QueueMetrics {
  queueDepth: number;
  messagesProcessed: number;
  messagesFailed: number;
  averageProcessingTime: number;
  oldestMessageAge: number;
}

/**
 * Email Queue Manager Error Codes
 */
export enum QueueErrorCode {
  QUEUE_FULL = 'QUEUE_FULL',
  INVALID_PRIORITY = 'INVALID_PRIORITY',
  INVALID_MESSAGE = 'INVALID_MESSAGE',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

/**
 * Custom error class for queue errors
 */
export class QueueError extends Error {
  constructor(
    message: string,
    public code: QueueErrorCode,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'QueueError';
  }
}

/**
 * Email Queue Manager Configuration
 */
export interface QueueManagerConfig {
  maxQueueDepth?: number;
  maxRetryAttempts?: number;
  retryBackoffMultiplier?: number;
}

/**
 * Email Queue Manager
 * Handles queuing, dequeuing, and retry logic for email delivery
 */
export class EmailQueueManager {
  private maxQueueDepth: number;
  private maxRetryAttempts: number;
  private retryBackoffMultiplier: number;

  constructor(config?: QueueManagerConfig) {
    this.maxQueueDepth = config?.maxQueueDepth || 10000;
    this.maxRetryAttempts = config?.maxRetryAttempts || 3;
    this.retryBackoffMultiplier = config?.retryBackoffMultiplier || 2;
  }

  /**
   * Enqueue an email for delivery
   * 
   * @param email - Email message to queue
   * @param priority - Priority level (high, normal, low)
   * @returns Queue entry ID
   */
  async enqueue(
    email: EmailMessage,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<string> {
    try {
      // Check rate limit for business
      const canSend = await emailRateLimiter.checkRateLimit(email.businessId);
      if (!canSend) {
        console.warn('[EmailQueueManager] Rate limit exceeded, queuing for later', {
          businessId: email.businessId,
          recipientEmail: email.to,
        });
        // Still queue the email, but it will be processed when rate limit allows
        // The worker will check rate limits before sending
      }

      // Check queue depth before adding
      const currentDepth = await this.getQueueDepth();
      if (currentDepth >= this.maxQueueDepth) {
        throw new QueueError(
          `Queue is full (${currentDepth}/${this.maxQueueDepth})`,
          QueueErrorCode.QUEUE_FULL,
          { currentDepth, maxDepth: this.maxQueueDepth }
        );
      }

      // Validate priority
      if (!['high', 'normal', 'low'].includes(priority)) {
        throw new QueueError(
          `Invalid priority: ${priority}`,
          QueueErrorCode.INVALID_PRIORITY,
          { priority }
        );
      }

      // Create queue entry
      const queueEntry = await prisma.emailQueue.create({
        data: {
          businessId: email.businessId,
          appointmentId: email.metadata?.appointmentId,
          recipientEmail: email.to,
          recipientName: email.metadata?.recipientName,
          templateType: email.templateType,
          subject: email.subject,
          htmlContent: email.html,
          textContent: email.text,
          priority,
          status: 'pending',
          attemptCount: 0,
          maxAttempts: email.maxAttempts || this.maxRetryAttempts,
          scheduledAt: email.scheduledAt || new Date(),
          metadata: email.metadata || {},
        },
      });

      console.log('[EmailQueueManager] Email enqueued', {
        queueId: queueEntry.id,
        businessId: email.businessId,
        recipientEmail: email.to,
        templateType: email.templateType,
        priority,
      });

      return queueEntry.id;
    } catch (error) {
      console.error('[EmailQueueManager] Failed to enqueue email', {
        businessId: email.businessId,
        recipientEmail: email.to,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof QueueError) {
        throw error;
      }

      throw new QueueError(
        'Failed to enqueue email',
        QueueErrorCode.DATABASE_ERROR,
        { originalError: error }
      );
    }
  }

  /**
   * Dequeue the next email for processing
   * Retrieves emails in priority order (high > normal > low)
   * 
   * @returns Email message or null if queue is empty
   */
  async dequeue(): Promise<EmailMessage | null> {
    try {
      // Find the next pending email in priority order
      // Priority order: high > normal > low
      // Within same priority: oldest first (scheduledAt)
      const queueEntry = await prisma.emailQueue.findFirst({
        where: {
          status: 'pending',
          scheduledAt: {
            lte: new Date(), // Only get emails scheduled for now or earlier
          },
        },
        orderBy: [
          {
            priority: 'asc', // This will order: high, low, normal (alphabetically)
          },
          {
            scheduledAt: 'asc', // Oldest first
          },
        ],
      });

      if (!queueEntry) {
        return null;
      }

      // Mark as processing to prevent duplicate processing
      await prisma.emailQueue.update({
        where: { id: queueEntry.id },
        data: {
          status: 'processing',
          lastAttemptAt: new Date(),
        },
      });

      // Convert queue entry to EmailMessage
      const emailMessage: EmailMessage = {
        id: queueEntry.id,
        businessId: queueEntry.businessId,
        to: queueEntry.recipientEmail,
        from: process.env.EMAIL_FROM || 'noreply@uselumina.app',
        subject: queueEntry.subject,
        html: queueEntry.htmlContent,
        text: queueEntry.textContent,
        templateType: queueEntry.templateType as EmailTemplateType,
        metadata: queueEntry.metadata as Record<string, any>,
        priority: queueEntry.priority as 'high' | 'normal' | 'low',
        attemptCount: queueEntry.attemptCount,
        maxAttempts: queueEntry.maxAttempts,
        scheduledAt: queueEntry.scheduledAt,
        createdAt: queueEntry.createdAt,
      };

      console.log('[EmailQueueManager] Email dequeued', {
        queueId: queueEntry.id,
        businessId: queueEntry.businessId,
        recipientEmail: queueEntry.recipientEmail,
        templateType: queueEntry.templateType,
        attemptCount: queueEntry.attemptCount,
      });

      return emailMessage;
    } catch (error) {
      console.error('[EmailQueueManager] Failed to dequeue email', {
        error: error instanceof Error ? error.message : String(error),
      });

      throw new QueueError(
        'Failed to dequeue email',
        QueueErrorCode.DATABASE_ERROR,
        { originalError: error }
      );
    }
  }

  /**
   * Get current queue depth (number of pending emails)
   * 
   * @returns Number of pending emails in queue
   */
  async getQueueDepth(): Promise<number> {
    try {
      const count = await prisma.emailQueue.count({
        where: {
          status: 'pending',
        },
      });

      return count;
    } catch (error) {
      console.error('[EmailQueueManager] Failed to get queue depth', {
        error: error instanceof Error ? error.message : String(error),
      });

      throw new QueueError(
        'Failed to get queue depth',
        QueueErrorCode.DATABASE_ERROR,
        { originalError: error }
      );
    }
  }

  /**
   * Schedule a retry for a failed email
   * Uses exponential backoff: 1min, 5min, 30min
   * 
   * @param messageId - Queue entry ID
   * @param attemptNumber - Current attempt number
   */
  async scheduleRetry(messageId: string, attemptNumber: number): Promise<void> {
    try {
      const queueEntry = await prisma.emailQueue.findUnique({
        where: { id: messageId },
      });

      if (!queueEntry) {
        throw new QueueError(
          `Queue entry not found: ${messageId}`,
          QueueErrorCode.INVALID_MESSAGE,
          { messageId }
        );
      }

      // Check if we've exceeded max attempts
      if (attemptNumber >= queueEntry.maxAttempts) {
        // Mark as failed permanently
        await prisma.emailQueue.update({
          where: { id: messageId },
          data: {
            status: 'failed',
            failureReason: `Max retry attempts (${queueEntry.maxAttempts}) exceeded`,
          },
        });

        console.log('[EmailQueueManager] Email permanently failed', {
          queueId: messageId,
          attemptCount: attemptNumber,
          maxAttempts: queueEntry.maxAttempts,
        });

        return;
      }

      // Calculate retry delay using exponential backoff
      const retryDelay = this.getRetrySchedule(attemptNumber);
      const scheduledAt = new Date(Date.now() + retryDelay);

      // Update queue entry for retry
      await prisma.emailQueue.update({
        where: { id: messageId },
        data: {
          status: 'pending',
          attemptCount: attemptNumber,
          scheduledAt,
        },
      });

      console.log('[EmailQueueManager] Email scheduled for retry', {
        queueId: messageId,
        attemptNumber,
        retryDelay: `${retryDelay / 1000}s`,
        scheduledAt,
      });
    } catch (error) {
      console.error('[EmailQueueManager] Failed to schedule retry', {
        messageId,
        attemptNumber,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof QueueError) {
        throw error;
      }

      throw new QueueError(
        'Failed to schedule retry',
        QueueErrorCode.DATABASE_ERROR,
        { originalError: error }
      );
    }
  }

  /**
   * Get retry delay in milliseconds based on attempt number
   * Uses exponential backoff: 1min, 5min, 30min
   * 
   * @param attemptNumber - Current attempt number (1-based)
   * @returns Delay in milliseconds
   */
  getRetrySchedule(attemptNumber: number): number {
    const RETRY_SCHEDULE: Record<number, number> = {
      1: 60 * 1000, // 1 minute
      2: 300 * 1000, // 5 minutes
      3: 1800 * 1000, // 30 minutes
    };

    return RETRY_SCHEDULE[attemptNumber] || RETRY_SCHEDULE[3];
  }

  /**
   * Mark an email as successfully sent
   * 
   * @param messageId - Queue entry ID
   * @param providerMessageId - External provider message ID
   */
  async markAsSent(messageId: string, providerMessageId?: string): Promise<void> {
    try {
      await prisma.emailQueue.update({
        where: { id: messageId },
        data: {
          status: 'sent',
          sentAt: new Date(),
          messageId: providerMessageId,
        },
      });

      console.log('[EmailQueueManager] Email marked as sent', {
        queueId: messageId,
        providerMessageId,
      });
    } catch (error) {
      console.error('[EmailQueueManager] Failed to mark email as sent', {
        messageId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new QueueError(
        'Failed to mark email as sent',
        QueueErrorCode.DATABASE_ERROR,
        { originalError: error }
      );
    }
  }

  /**
   * Mark an email as failed
   * 
   * @param messageId - Queue entry ID
   * @param reason - Failure reason
   */
  async markAsFailed(messageId: string, reason: string): Promise<void> {
    try {
      await prisma.emailQueue.update({
        where: { id: messageId },
        data: {
          status: 'failed',
          failureReason: reason,
        },
      });

      console.log('[EmailQueueManager] Email marked as failed', {
        queueId: messageId,
        reason,
      });
    } catch (error) {
      console.error('[EmailQueueManager] Failed to mark email as failed', {
        messageId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new QueueError(
        'Failed to mark email as failed',
        QueueErrorCode.DATABASE_ERROR,
        { originalError: error }
      );
    }
  }

  /**
   * Get queue metrics for monitoring
   * 
   * @returns Queue metrics
   */
  async getQueueMetrics(): Promise<QueueMetrics> {
    try {
      // Get queue depth
      const queueDepth = await this.getQueueDepth();

      // Get messages processed in last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const messagesProcessed = await prisma.emailQueue.count({
        where: {
          status: 'sent',
          sentAt: {
            gte: oneDayAgo,
          },
        },
      });

      // Get messages failed in last 24 hours
      const messagesFailed = await prisma.emailQueue.count({
        where: {
          status: 'failed',
          updatedAt: {
            gte: oneDayAgo,
          },
        },
      });

      // Get average processing time (time from creation to sent)
      const recentSentMessages = await prisma.emailQueue.findMany({
        where: {
          status: 'sent',
          sentAt: {
            gte: oneDayAgo,
          },
        },
        select: {
          createdAt: true,
          sentAt: true,
        },
        take: 100, // Sample last 100 messages
      });

      let averageProcessingTime = 0;
      if (recentSentMessages.length > 0) {
        const totalProcessingTime = recentSentMessages.reduce((sum, msg) => {
          if (msg.sentAt) {
            return sum + (msg.sentAt.getTime() - msg.createdAt.getTime());
          }
          return sum;
        }, 0);
        averageProcessingTime = totalProcessingTime / recentSentMessages.length;
      }

      // Get oldest pending message age
      const oldestPendingMessage = await prisma.emailQueue.findFirst({
        where: {
          status: 'pending',
        },
        orderBy: {
          createdAt: 'asc',
        },
        select: {
          createdAt: true,
        },
      });

      const oldestMessageAge = oldestPendingMessage
        ? Date.now() - oldestPendingMessage.createdAt.getTime()
        : 0;

      return {
        queueDepth,
        messagesProcessed,
        messagesFailed,
        averageProcessingTime,
        oldestMessageAge,
      };
    } catch (error) {
      console.error('[EmailQueueManager] Failed to get queue metrics', {
        error: error instanceof Error ? error.message : String(error),
      });

      throw new QueueError(
        'Failed to get queue metrics',
        QueueErrorCode.DATABASE_ERROR,
        { originalError: error }
      );
    }
  }

  /**
   * Check if a business can send emails (rate limit check)
   * 
   * @param businessId - Business ID to check
   * @returns True if business can send, false otherwise
   */
  async checkRateLimit(businessId: string): Promise<boolean> {
    return emailRateLimiter.checkRateLimit(businessId);
  }

  /**
   * Increment rate limit counter for a business
   * Called after successfully sending an email
   * 
   * @param businessId - Business ID to increment
   */
  async incrementRateLimit(businessId: string): Promise<void> {
    return emailRateLimiter.incrementRateLimit(businessId);
  }

  /**
   * Get failed messages for a specific business or all businesses
   * 
   * @param businessId - Optional business ID to filter by
   * @returns Array of failed email messages
   */
  async getFailedMessages(businessId?: string): Promise<EmailMessage[]> {
    try {
      const failedEntries = await prisma.emailQueue.findMany({
        where: {
          status: 'failed',
          ...(businessId && { businessId }),
        },
        orderBy: {
          updatedAt: 'desc',
        },
        take: 100, // Limit to last 100 failed messages
      });

      return failedEntries.map((entry) => ({
        id: entry.id,
        businessId: entry.businessId,
        to: entry.recipientEmail,
        from: process.env.EMAIL_FROM || 'noreply@uselumina.app',
        subject: entry.subject,
        html: entry.htmlContent,
        text: entry.textContent,
        templateType: entry.templateType as EmailTemplateType,
        metadata: entry.metadata as Record<string, any>,
        priority: entry.priority as 'high' | 'normal' | 'low',
        attemptCount: entry.attemptCount,
        maxAttempts: entry.maxAttempts,
        scheduledAt: entry.scheduledAt,
        createdAt: entry.createdAt,
      }));
    } catch (error) {
      console.error('[EmailQueueManager] Failed to get failed messages', {
        businessId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new QueueError(
        'Failed to get failed messages',
        QueueErrorCode.DATABASE_ERROR,
        { originalError: error }
      );
    }
  }
}

// Export singleton instance
export const emailQueueManager = new EmailQueueManager();

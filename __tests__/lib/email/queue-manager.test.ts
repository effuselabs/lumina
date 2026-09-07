/**
 * Unit Tests for EmailQueueManager
 *
 * Tests the email queue management system including:
 * - Queue operations (enqueue, dequeue)
 * - Priority handling
 * - Rate limiting
 * - Retry scheduling
 * - Queue metrics
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import {
  EmailQueueManager,
  QueueError,
  QueueErrorCode,
} from '@/lib/email/queue-manager';
import { prisma } from '@/lib/prisma';
import { emailRateLimiter } from '@/lib/email/rate-limiter';
import type { EmailMessage } from '@/lib/email/types';

// Mock dependencies
jest.mock('@/lib/prisma');
jest.mock('@/lib/email/rate-limiter');

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockRateLimiter = emailRateLimiter as jest.Mocked<
  typeof emailRateLimiter
>;

describe('EmailQueueManager', () => {
  let queueManager: EmailQueueManager;

  const mockBusinessId = 'business-123';
  const mockEmailMessage: EmailMessage = {
    id: 'msg-123',
    businessId: mockBusinessId,
    to: 'test@example.com',
    from: 'noreply@uselumina.app',
    subject: 'Test Email',
    html: '<html>Test</html>',
    text: 'Test',
    templateType: 'booking_confirmation',
    metadata: {
      appointmentId: 'appointment-123',
      recipientName: 'John Doe',
    },
    priority: 'normal',
    attemptCount: 0,
    maxAttempts: 3,
    scheduledAt: new Date(),
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    queueManager = new EmailQueueManager({
      maxQueueDepth: 10000,
      maxRetryAttempts: 3,
    });

    // Add emailQueue to mockPrisma if it doesn't exist
    if (!mockPrisma.emailQueue) {
      (mockPrisma as any).emailQueue = {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      };
    }

    // Setup default mocks
    (mockPrisma.emailQueue.count as jest.Mock).mockResolvedValue(0);
    (mockRateLimiter.checkRateLimit as jest.Mock).mockResolvedValue(true);
  });

  describe('enqueue', () => {
    it('should enqueue email successfully with normal priority', async () => {
      const mockQueueEntry = {
        id: 'queue-123',
        businessId: mockBusinessId,
        recipientEmail: mockEmailMessage.to,
        status: 'pending',
        createdAt: new Date(),
      };

      (mockPrisma.emailQueue.create as jest.Mock).mockResolvedValue(
        mockQueueEntry
      );

      const queueId = await queueManager.enqueue(mockEmailMessage, 'normal');

      expect(queueId).toBe('queue-123');
      expect(mockPrisma.emailQueue.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          businessId: mockBusinessId,
          recipientEmail: mockEmailMessage.to,
          subject: mockEmailMessage.subject,
          priority: 'normal',
          status: 'pending',
          attemptCount: 0,
        }),
      });
    });

    it('should enqueue email with high priority', async () => {
      const mockQueueEntry = {
        id: 'queue-456',
        businessId: mockBusinessId,
        recipientEmail: mockEmailMessage.to,
        status: 'pending',
        createdAt: new Date(),
      };

      (mockPrisma.emailQueue.create as jest.Mock).mockResolvedValue(
        mockQueueEntry
      );

      const queueId = await queueManager.enqueue(mockEmailMessage, 'high');

      expect(queueId).toBe('queue-456');
      expect(mockPrisma.emailQueue.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          priority: 'high',
        }),
      });
    });

    it('should enqueue email with low priority', async () => {
      const mockQueueEntry = {
        id: 'queue-789',
        businessId: mockBusinessId,
        recipientEmail: mockEmailMessage.to,
        status: 'pending',
        createdAt: new Date(),
      };

      (mockPrisma.emailQueue.create as jest.Mock).mockResolvedValue(
        mockQueueEntry
      );

      const queueId = await queueManager.enqueue(mockEmailMessage, 'low');

      expect(queueId).toBe('queue-789');
      expect(mockPrisma.emailQueue.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          priority: 'low',
        }),
      });
    });

    it('should check rate limit before enqueuing', async () => {
      const mockQueueEntry = {
        id: 'queue-123',
        businessId: mockBusinessId,
        recipientEmail: mockEmailMessage.to,
        status: 'pending',
        createdAt: new Date(),
      };

      (mockPrisma.emailQueue.create as jest.Mock).mockResolvedValue(
        mockQueueEntry
      );

      await queueManager.enqueue(mockEmailMessage);

      expect(mockRateLimiter.checkRateLimit).toHaveBeenCalledWith(
        mockBusinessId
      );
    });

    it('should still enqueue if rate limit exceeded (for later processing)', async () => {
      (mockRateLimiter.checkRateLimit as jest.Mock).mockResolvedValue(false);

      const mockQueueEntry = {
        id: 'queue-123',
        businessId: mockBusinessId,
        recipientEmail: mockEmailMessage.to,
        status: 'pending',
        createdAt: new Date(),
      };

      (mockPrisma.emailQueue.create as jest.Mock).mockResolvedValue(
        mockQueueEntry
      );

      const queueId = await queueManager.enqueue(mockEmailMessage);

      expect(queueId).toBe('queue-123');
      expect(mockPrisma.emailQueue.create).toHaveBeenCalled();
    });

    it('should throw error when queue is full', async () => {
      (mockPrisma.emailQueue.count as jest.Mock).mockResolvedValue(10000);

      await expect(queueManager.enqueue(mockEmailMessage)).rejects.toThrow(
        QueueError
      );
      await expect(queueManager.enqueue(mockEmailMessage)).rejects.toThrow(
        'Queue is full'
      );
    });

    it('should throw error for invalid priority', async () => {
      await expect(
        queueManager.enqueue(mockEmailMessage, 'invalid' as any)
      ).rejects.toThrow(QueueError);
    });

    it('should handle database errors gracefully', async () => {
      (mockPrisma.emailQueue.create as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(queueManager.enqueue(mockEmailMessage)).rejects.toThrow(
        QueueError
      );
    });
  });

  describe('dequeue', () => {
    it('should dequeue email in priority order', async () => {
      const mockQueueEntry = {
        id: 'queue-123',
        businessId: mockBusinessId,
        recipientEmail: 'test@example.com',
        recipientName: 'John Doe',
        templateType: 'booking_confirmation',
        subject: 'Test Email',
        htmlContent: '<html>Test</html>',
        textContent: 'Test',
        priority: 'high',
        status: 'pending',
        attemptCount: 0,
        maxAttempts: 3,
        scheduledAt: new Date(),
        createdAt: new Date(),
        metadata: {},
      };

      (mockPrisma.emailQueue.findFirst as jest.Mock).mockResolvedValue(
        mockQueueEntry
      );
      (mockPrisma.emailQueue.update as jest.Mock).mockResolvedValue({
        ...mockQueueEntry,
        status: 'processing',
      });

      const email = await queueManager.dequeue();

      expect(email).toBeDefined();
      expect(email?.id).toBe('queue-123');
      expect(email?.priority).toBe('high');

      // Verify it was marked as processing
      expect(mockPrisma.emailQueue.update).toHaveBeenCalledWith({
        where: { id: 'queue-123' },
        data: expect.objectContaining({
          status: 'processing',
        }),
      });
    });

    it('should return null when queue is empty', async () => {
      (mockPrisma.emailQueue.findFirst as jest.Mock).mockResolvedValue(null);

      const email = await queueManager.dequeue();

      expect(email).toBeNull();
    });

    it('should only dequeue emails scheduled for now or earlier', async () => {
      await queueManager.dequeue();

      expect(mockPrisma.emailQueue.findFirst).toHaveBeenCalledWith({
        where: {
          status: 'pending',
          scheduledAt: {
            lte: expect.any(Date),
          },
        },
        orderBy: expect.any(Array),
      });
    });

    it('should handle database errors gracefully', async () => {
      (mockPrisma.emailQueue.findFirst as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await expect(queueManager.dequeue()).rejects.toThrow(QueueError);
    });
  });

  describe('getQueueDepth', () => {
    it('should return current queue depth', async () => {
      (mockPrisma.emailQueue.count as jest.Mock).mockResolvedValue(42);

      const depth = await queueManager.getQueueDepth();

      expect(depth).toBe(42);
      expect(mockPrisma.emailQueue.count).toHaveBeenCalledWith({
        where: {
          status: 'pending',
        },
      });
    });

    it('should return 0 for empty queue', async () => {
      (mockPrisma.emailQueue.count as jest.Mock).mockResolvedValue(0);

      const depth = await queueManager.getQueueDepth();

      expect(depth).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      (mockPrisma.emailQueue.count as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await expect(queueManager.getQueueDepth()).rejects.toThrow(QueueError);
    });
  });

  describe('scheduleRetry', () => {
    const mockQueueEntry = {
      id: 'queue-123',
      businessId: mockBusinessId,
      recipientEmail: 'test@example.com',
      status: 'failed',
      attemptCount: 1,
      maxAttempts: 3,
      createdAt: new Date(),
    };

    it('should schedule retry with exponential backoff', async () => {
      (mockPrisma.emailQueue.findUnique as jest.Mock).mockResolvedValue(
        mockQueueEntry
      );
      (mockPrisma.emailQueue.update as jest.Mock).mockResolvedValue({
        ...mockQueueEntry,
        status: 'pending',
        attemptCount: 1,
      });

      await queueManager.scheduleRetry('queue-123', 1);

      expect(mockPrisma.emailQueue.update).toHaveBeenCalledWith({
        where: { id: 'queue-123' },
        data: expect.objectContaining({
          status: 'pending',
          attemptCount: 1,
          scheduledAt: expect.any(Date),
        }),
      });
    });

    it('should mark as permanently failed after max attempts', async () => {
      (mockPrisma.emailQueue.findUnique as jest.Mock).mockResolvedValue({
        ...mockQueueEntry,
        attemptCount: 3,
      });
      (mockPrisma.emailQueue.update as jest.Mock).mockResolvedValue({
        ...mockQueueEntry,
        status: 'failed',
      });

      await queueManager.scheduleRetry('queue-123', 3);

      expect(mockPrisma.emailQueue.update).toHaveBeenCalledWith({
        where: { id: 'queue-123' },
        data: expect.objectContaining({
          status: 'failed',
          failureReason: expect.stringContaining('Max retry attempts'),
        }),
      });
    });

    it('should throw error for non-existent queue entry', async () => {
      (mockPrisma.emailQueue.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(queueManager.scheduleRetry('invalid-id', 1)).rejects.toThrow(
        QueueError
      );
    });
  });

  describe('getRetrySchedule', () => {
    it('should return 1 minute delay for first retry', () => {
      const delay = queueManager.getRetrySchedule(1);
      expect(delay).toBe(60 * 1000); // 1 minute
    });

    it('should return 5 minutes delay for second retry', () => {
      const delay = queueManager.getRetrySchedule(2);
      expect(delay).toBe(300 * 1000); // 5 minutes
    });

    it('should return 30 minutes delay for third retry', () => {
      const delay = queueManager.getRetrySchedule(3);
      expect(delay).toBe(1800 * 1000); // 30 minutes
    });

    it('should return max delay for attempts beyond 3', () => {
      const delay = queueManager.getRetrySchedule(4);
      expect(delay).toBe(1800 * 1000); // 30 minutes (max)
    });
  });

  describe('markAsSent', () => {
    it('should mark email as sent with provider message ID', async () => {
      (mockPrisma.emailQueue.update as jest.Mock).mockResolvedValue({
        id: 'queue-123',
        status: 'sent',
        sentAt: new Date(),
        messageId: 'provider-msg-123',
      });

      await queueManager.markAsSent('queue-123', 'provider-msg-123');

      expect(mockPrisma.emailQueue.update).toHaveBeenCalledWith({
        where: { id: 'queue-123' },
        data: expect.objectContaining({
          status: 'sent',
          sentAt: expect.any(Date),
          messageId: 'provider-msg-123',
        }),
      });
    });

    it('should mark as sent without provider message ID', async () => {
      (mockPrisma.emailQueue.update as jest.Mock).mockResolvedValue({
        id: 'queue-123',
        status: 'sent',
        sentAt: new Date(),
      });

      await queueManager.markAsSent('queue-123');

      expect(mockPrisma.emailQueue.update).toHaveBeenCalledWith({
        where: { id: 'queue-123' },
        data: expect.objectContaining({
          status: 'sent',
          sentAt: expect.any(Date),
        }),
      });
    });
  });

  describe('markAsFailed', () => {
    it('should mark email as failed with reason', async () => {
      (mockPrisma.emailQueue.update as jest.Mock).mockResolvedValue({
        id: 'queue-123',
        status: 'failed',
        failureReason: 'Invalid email address',
      });

      await queueManager.markAsFailed('queue-123', 'Invalid email address');

      expect(mockPrisma.emailQueue.update).toHaveBeenCalledWith({
        where: { id: 'queue-123' },
        data: expect.objectContaining({
          status: 'failed',
          failureReason: 'Invalid email address',
        }),
      });
    });
  });

  describe('getQueueMetrics', () => {
    it('should return queue metrics', async () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      (mockPrisma.emailQueue.count as jest.Mock)
        .mockResolvedValueOnce(10) // Queue depth
        .mockResolvedValueOnce(50) // Messages processed
        .mockResolvedValueOnce(5); // Messages failed

      (mockPrisma.emailQueue.findMany as jest.Mock).mockResolvedValue([
        {
          createdAt: new Date(Date.now() - 5 * 60 * 1000),
          sentAt: new Date(Date.now() - 3 * 60 * 1000),
        },
        {
          createdAt: new Date(Date.now() - 10 * 60 * 1000),
          sentAt: new Date(Date.now() - 8 * 60 * 1000),
        },
      ]);

      (mockPrisma.emailQueue.findFirst as jest.Mock).mockResolvedValue({
        createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      });

      const metrics = await queueManager.getQueueMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.queueDepth).toBe(10);
      expect(metrics.messagesProcessed).toBe(50);
      expect(metrics.messagesFailed).toBe(5);
      expect(metrics.averageProcessingTime).toBeGreaterThan(0);
      expect(metrics.oldestMessageAge).toBeGreaterThan(0);
    });

    it('should handle empty queue metrics', async () => {
      (mockPrisma.emailQueue.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.emailQueue.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.emailQueue.findFirst as jest.Mock).mockResolvedValue(null);

      const metrics = await queueManager.getQueueMetrics();

      expect(metrics.queueDepth).toBe(0);
      expect(metrics.messagesProcessed).toBe(0);
      expect(metrics.messagesFailed).toBe(0);
      expect(metrics.averageProcessingTime).toBe(0);
      expect(metrics.oldestMessageAge).toBe(0);
    });
  });

  describe('Rate Limiting', () => {
    it('should check rate limit for business', async () => {
      (mockRateLimiter.checkRateLimit as jest.Mock).mockResolvedValue(true);

      const canSend = await queueManager.checkRateLimit(mockBusinessId);

      expect(canSend).toBe(true);
      expect(mockRateLimiter.checkRateLimit).toHaveBeenCalledWith(
        mockBusinessId
      );
    });

    it('should increment rate limit counter', async () => {
      (mockRateLimiter.incrementRateLimit as jest.Mock).mockResolvedValue(
        undefined
      );

      await queueManager.incrementRateLimit(mockBusinessId);

      expect(mockRateLimiter.incrementRateLimit).toHaveBeenCalledWith(
        mockBusinessId
      );
    });
  });

  describe('getFailedMessages', () => {
    it('should return failed messages for all businesses', async () => {
      const mockFailedMessages = [
        {
          id: 'queue-1',
          businessId: 'business-123',
          recipientEmail: 'test1@example.com',
          subject: 'Test 1',
          htmlContent: '<html>Test 1</html>',
          textContent: 'Test 1',
          templateType: 'booking_confirmation',
          priority: 'normal',
          status: 'failed',
          attemptCount: 3,
          maxAttempts: 3,
          scheduledAt: new Date(),
          createdAt: new Date(),
          metadata: {},
        },
      ];

      (mockPrisma.emailQueue.findMany as jest.Mock).mockResolvedValue(
        mockFailedMessages
      );

      const failedMessages = await queueManager.getFailedMessages();

      expect(failedMessages).toHaveLength(1);
      expect(failedMessages[0].id).toBe('queue-1');
      expect(mockPrisma.emailQueue.findMany).toHaveBeenCalledWith({
        where: {
          status: 'failed',
        },
        orderBy: {
          updatedAt: 'desc',
        },
        take: 100,
      });
    });

    it('should return failed messages for specific business', async () => {
      const mockFailedMessages = [
        {
          id: 'queue-1',
          businessId: mockBusinessId,
          recipientEmail: 'test1@example.com',
          subject: 'Test 1',
          htmlContent: '<html>Test 1</html>',
          textContent: 'Test 1',
          templateType: 'booking_confirmation',
          priority: 'normal',
          status: 'failed',
          attemptCount: 3,
          maxAttempts: 3,
          scheduledAt: new Date(),
          createdAt: new Date(),
          metadata: {},
        },
      ];

      (mockPrisma.emailQueue.findMany as jest.Mock).mockResolvedValue(
        mockFailedMessages
      );

      const failedMessages =
        await queueManager.getFailedMessages(mockBusinessId);

      expect(failedMessages).toHaveLength(1);
      expect(mockPrisma.emailQueue.findMany).toHaveBeenCalledWith({
        where: {
          status: 'failed',
          businessId: mockBusinessId,
        },
        orderBy: {
          updatedAt: 'desc',
        },
        take: 100,
      });
    });
  });
});

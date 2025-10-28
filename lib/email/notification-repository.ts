/**
 * Notification Repository
 * Database operations for notification tracking and history
 * 
 * Handles all database operations related to email notifications including:
 * - Creating notification records
 * - Updating notification status
 * - Querying notification history
 * - Analytics and metrics
 */

import { prisma } from '@/lib/prisma';
import type { EmailTemplateType } from './types';

/**
 * Input for creating a new notification record
 */
export interface CreateNotificationInput {
  businessId: string;
  appointmentId?: string;
  recipientEmail: string;
  recipientName?: string;
  templateType: EmailTemplateType;
  subject: string;
  htmlContent: string;
  textContent: string;
  priority?: 'high' | 'normal' | 'low';
  metadata?: Record<string, any>;
}

/**
 * Notification status types
 */
export type NotificationStatus =
  | 'pending'
  | 'queued'
  | 'processing'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'bounced'
  | 'complained';

/**
 * Notification record from database
 */
export interface Notification {
  id: string;
  businessId: string;
  appointmentId?: string;
  recipientEmail: string;
  recipientName?: string;
  templateType: string;
  subject: string;
  status: string;
  attemptCount: number;
  lastAttemptAt?: Date;
  sentAt?: Date;
  failureReason?: string;
  messageId?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Filters for querying notifications
 */
export interface NotificationFilters {
  startDate?: Date;
  endDate?: Date;
  status?: string;
  templateType?: EmailTemplateType;
  appointmentId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Date range for analytics queries
 */
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Delivery statistics for a business
 */
export interface DeliveryStats {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalBounced: number;
  deliveryRate: number;
  bounceRate: number;
}

/**
 * Notification metrics for monitoring
 */
export interface NotificationMetrics {
  totalNotifications: number;
  pendingCount: number;
  sentCount: number;
  failedCount: number;
  averageDeliveryTime: number;
  successRate: number;
  failureRate: number;
  byTemplateType: Record<string, number>;
}

/**
 * Notification Repository Error Codes
 */
export enum NotificationRepositoryErrorCode {
  INVALID_BUSINESS_CONTEXT = 'INVALID_BUSINESS_CONTEXT',
  NOTIFICATION_NOT_FOUND = 'NOTIFICATION_NOT_FOUND',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INVALID_STATUS = 'INVALID_STATUS',
}

/**
 * Custom error class for repository errors
 */
export class NotificationRepositoryError extends Error {
  constructor(
    message: string,
    public code: NotificationRepositoryErrorCode,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'NotificationRepositoryError';
  }
}

/**
 * Notification Repository
 * Handles all database operations for email notifications
 */
export class NotificationRepository {
  /**
   * Validate business context
   * Ensures the business exists and is active
   */
  private async validateBusinessContext(businessId: string): Promise<void> {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, isActive: true },
    });

    if (!business) {
      throw new NotificationRepositoryError(
        `Business not found: ${businessId}`,
        NotificationRepositoryErrorCode.INVALID_BUSINESS_CONTEXT,
        { businessId }
      );
    }

    if (!business.isActive) {
      throw new NotificationRepositoryError(
        `Business is not active: ${businessId}`,
        NotificationRepositoryErrorCode.INVALID_BUSINESS_CONTEXT,
        { businessId, isActive: false }
      );
    }
  }

  /**
   * Create a new notification record
   */
  async create(input: CreateNotificationInput): Promise<Notification> {
    try {
      // Validate business context
      await this.validateBusinessContext(input.businessId);

      // Create notification in EmailQueue table
      const notification = await prisma.emailQueue.create({
        data: {
          businessId: input.businessId,
          appointmentId: input.appointmentId,
          recipientEmail: input.recipientEmail,
          recipientName: input.recipientName,
          templateType: input.templateType,
          subject: input.subject,
          htmlContent: input.htmlContent,
          textContent: input.textContent,
          priority: input.priority || 'normal',
          status: 'pending',
          metadata: input.metadata || {},
        },
      });

      console.log('[NotificationRepository] Notification created', {
        notificationId: notification.id,
        businessId: input.businessId,
        templateType: input.templateType,
      });

      return this.mapToNotification(notification);
    } catch (error) {
      console.error('[NotificationRepository] Failed to create notification', {
        businessId: input.businessId,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof NotificationRepositoryError) {
        throw error;
      }

      throw new NotificationRepositoryError(
        'Failed to create notification',
        NotificationRepositoryErrorCode.DATABASE_ERROR,
        { originalError: error }
      );
    }
  }

  /**
   * Update notification status
   */
  async updateStatus(
    notificationId: string,
    status: NotificationStatus,
    metadata?: Record<string, any>
  ): Promise<Notification> {
    try {
      // Fetch existing notification to validate business context
      const existing = await prisma.emailQueue.findUnique({
        where: { id: notificationId },
        select: { businessId: true },
      });

      if (!existing) {
        throw new NotificationRepositoryError(
          `Notification not found: ${notificationId}`,
          NotificationRepositoryErrorCode.NOTIFICATION_NOT_FOUND,
          { notificationId }
        );
      }

      // Validate business context
      await this.validateBusinessContext(existing.businessId);

      // Prepare update data
      const updateData: any = {
        status,
        updatedAt: new Date(),
      };

      // Update attempt tracking
      if (status === 'processing' || status === 'sending') {
        updateData.lastAttemptAt = new Date();
        updateData.attemptCount = { increment: 1 };
      }

      // Update sent timestamp
      if (status === 'sent' || status === 'delivered') {
        updateData.sentAt = new Date();
      }

      // Update failure reason if provided in metadata
      if (status === 'failed' && metadata?.error) {
        updateData.failureReason = metadata.error;
      }

      // Update message ID if provided in metadata
      if (metadata?.messageId) {
        updateData.messageId = metadata.messageId;
      }

      // Merge metadata
      if (metadata) {
        updateData.metadata = metadata;
      }

      // Update notification
      const notification = await prisma.emailQueue.update({
        where: { id: notificationId },
        data: updateData,
      });

      console.log('[NotificationRepository] Notification status updated', {
        notificationId,
        status,
        attemptCount: notification.attemptCount,
      });

      return this.mapToNotification(notification);
    } catch (error) {
      console.error('[NotificationRepository] Failed to update notification status', {
        notificationId,
        status,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof NotificationRepositoryError) {
        throw error;
      }

      throw new NotificationRepositoryError(
        'Failed to update notification status',
        NotificationRepositoryErrorCode.DATABASE_ERROR,
        { originalError: error }
      );
    }
  }

  /**
   * Find notification by ID
   */
  async findById(notificationId: string): Promise<Notification | null> {
    try {
      const notification = await prisma.emailQueue.findUnique({
        where: { id: notificationId },
      });

      if (!notification) {
        return null;
      }

      // Validate business context
      await this.validateBusinessContext(notification.businessId);

      return this.mapToNotification(notification);
    } catch (error) {
      console.error('[NotificationRepository] Failed to find notification by ID', {
        notificationId,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof NotificationRepositoryError) {
        throw error;
      }

      throw new NotificationRepositoryError(
        'Failed to find notification',
        NotificationRepositoryErrorCode.DATABASE_ERROR,
        { originalError: error }
      );
    }
  }

  /**
   * Find all notifications for an appointment
   */
  async findByAppointment(appointmentId: string): Promise<Notification[]> {
    try {
      const notifications = await prisma.emailQueue.findMany({
        where: { appointmentId },
        orderBy: { createdAt: 'desc' },
      });

      if (notifications.length === 0) {
        return [];
      }

      // Validate business context using first notification
      await this.validateBusinessContext(notifications[0].businessId);

      return notifications.map((n) => this.mapToNotification(n));
    } catch (error) {
      console.error('[NotificationRepository] Failed to find notifications by appointment', {
        appointmentId,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof NotificationRepositoryError) {
        throw error;
      }

      throw new NotificationRepositoryError(
        'Failed to find notifications by appointment',
        NotificationRepositoryErrorCode.DATABASE_ERROR,
        { originalError: error }
      );
    }
  }

  /**
   * Find notifications for a business with optional filters
   */
  async findByBusiness(
    businessId: string,
    filters?: NotificationFilters
  ): Promise<Notification[]> {
    try {
      // Validate business context
      await this.validateBusinessContext(businessId);

      // Build where clause
      const where: any = { businessId };

      if (filters?.startDate || filters?.endDate) {
        where.createdAt = {};
        if (filters.startDate) {
          where.createdAt.gte = filters.startDate;
        }
        if (filters.endDate) {
          where.createdAt.lte = filters.endDate;
        }
      }

      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.templateType) {
        where.templateType = filters.templateType;
      }

      if (filters?.appointmentId) {
        where.appointmentId = filters.appointmentId;
      }

      // Query notifications
      const notifications = await prisma.emailQueue.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters?.limit || 100,
        skip: filters?.offset || 0,
      });

      return notifications.map((n) => this.mapToNotification(n));
    } catch (error) {
      console.error('[NotificationRepository] Failed to find notifications by business', {
        businessId,
        filters,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof NotificationRepositoryError) {
        throw error;
      }

      throw new NotificationRepositoryError(
        'Failed to find notifications by business',
        NotificationRepositoryErrorCode.DATABASE_ERROR,
        { originalError: error }
      );
    }
  }

  /**
   * Find failed notifications that can be retried
   */
  async findFailedNotifications(businessId?: string): Promise<Notification[]> {
    try {
      // Build where clause
      const where: any = {
        status: 'failed',
        attemptCount: { lt: 3 }, // Only notifications with less than 3 attempts
      };

      if (businessId) {
        // Validate business context if businessId provided
        await this.validateBusinessContext(businessId);
        where.businessId = businessId;
      }

      // Query failed notifications
      const notifications = await prisma.emailQueue.findMany({
        where,
        orderBy: { lastAttemptAt: 'asc' }, // Oldest attempts first
        take: 100, // Limit to 100 for safety
      });

      return notifications.map((n) => this.mapToNotification(n));
    } catch (error) {
      console.error('[NotificationRepository] Failed to find failed notifications', {
        businessId,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof NotificationRepositoryError) {
        throw error;
      }

      throw new NotificationRepositoryError(
        'Failed to find failed notifications',
        NotificationRepositoryErrorCode.DATABASE_ERROR,
        { originalError: error }
      );
    }
  }

  /**
   * Get delivery statistics for a business within a date range
   */
  async getDeliveryStats(
    businessId: string,
    dateRange: DateRange
  ): Promise<DeliveryStats> {
    try {
      // Validate business context
      await this.validateBusinessContext(businessId);

      // Query notifications within date range
      const notifications = await prisma.emailQueue.findMany({
        where: {
          businessId,
          createdAt: {
            gte: dateRange.startDate,
            lte: dateRange.endDate,
          },
        },
        select: {
          status: true,
        },
      });

      // Calculate statistics
      const totalSent = notifications.filter((n) =>
        ['sent', 'delivered'].includes(n.status)
      ).length;

      const totalDelivered = notifications.filter((n) => n.status === 'delivered').length;

      const totalFailed = notifications.filter((n) => n.status === 'failed').length;

      const totalBounced = notifications.filter((n) => n.status === 'bounced').length;

      const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;

      const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;

      return {
        totalSent,
        totalDelivered,
        totalFailed,
        totalBounced,
        deliveryRate: Math.round(deliveryRate * 100) / 100, // Round to 2 decimal places
        bounceRate: Math.round(bounceRate * 100) / 100,
      };
    } catch (error) {
      console.error('[NotificationRepository] Failed to get delivery stats', {
        businessId,
        dateRange,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof NotificationRepositoryError) {
        throw error;
      }

      throw new NotificationRepositoryError(
        'Failed to get delivery stats',
        NotificationRepositoryErrorCode.DATABASE_ERROR,
        { originalError: error }
      );
    }
  }

  /**
   * Get notification metrics for monitoring
   */
  async getNotificationMetrics(businessId: string): Promise<NotificationMetrics> {
    try {
      // Validate business context
      await this.validateBusinessContext(businessId);

      // Get all notifications for the business (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const notifications = await prisma.emailQueue.findMany({
        where: {
          businessId,
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
        select: {
          status: true,
          templateType: true,
          createdAt: true,
          sentAt: true,
        },
      });

      // Calculate metrics
      const totalNotifications = notifications.length;

      const pendingCount = notifications.filter((n) => n.status === 'pending').length;

      const sentCount = notifications.filter((n) =>
        ['sent', 'delivered'].includes(n.status)
      ).length;

      const failedCount = notifications.filter((n) => n.status === 'failed').length;

      // Calculate average delivery time (in seconds)
      const deliveredNotifications = notifications.filter(
        (n) => n.sentAt && n.status === 'sent'
      );
      const totalDeliveryTime = deliveredNotifications.reduce((sum, n) => {
        if (n.sentAt) {
          return sum + (n.sentAt.getTime() - n.createdAt.getTime());
        }
        return sum;
      }, 0);
      const averageDeliveryTime =
        deliveredNotifications.length > 0
          ? Math.round(totalDeliveryTime / deliveredNotifications.length / 1000)
          : 0;

      // Calculate success and failure rates
      const successRate =
        totalNotifications > 0 ? (sentCount / totalNotifications) * 100 : 0;

      const failureRate =
        totalNotifications > 0 ? (failedCount / totalNotifications) * 100 : 0;

      // Count by template type
      const byTemplateType: Record<string, number> = {};
      notifications.forEach((n) => {
        byTemplateType[n.templateType] = (byTemplateType[n.templateType] || 0) + 1;
      });

      return {
        totalNotifications,
        pendingCount,
        sentCount,
        failedCount,
        averageDeliveryTime,
        successRate: Math.round(successRate * 100) / 100,
        failureRate: Math.round(failureRate * 100) / 100,
        byTemplateType,
      };
    } catch (error) {
      console.error('[NotificationRepository] Failed to get notification metrics', {
        businessId,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof NotificationRepositoryError) {
        throw error;
      }

      throw new NotificationRepositoryError(
        'Failed to get notification metrics',
        NotificationRepositoryErrorCode.DATABASE_ERROR,
        { originalError: error }
      );
    }
  }

  /**
   * Map database record to Notification interface
   */
  private mapToNotification(record: any): Notification {
    return {
      id: record.id,
      businessId: record.businessId,
      appointmentId: record.appointmentId || undefined,
      recipientEmail: record.recipientEmail,
      recipientName: record.recipientName || undefined,
      templateType: record.templateType,
      subject: record.subject,
      status: record.status,
      attemptCount: record.attemptCount,
      lastAttemptAt: record.lastAttemptAt || undefined,
      sentAt: record.sentAt || undefined,
      failureReason: record.failureReason || undefined,
      messageId: record.messageId || undefined,
      metadata: typeof record.metadata === 'object' ? record.metadata : {},
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}

/**
 * Singleton instance of NotificationRepository
 */
export const notificationRepository = new NotificationRepository();

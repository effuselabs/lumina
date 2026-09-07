/**
 * Email Rate Limiter
 *
 * Implements rate limiting per business to prevent abuse and comply with
 * email provider limits. Tracks hourly and daily send rates.
 */

import { prisma } from '@/lib/prisma';

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxEmailsPerHour?: number;
  maxEmailsPerDay?: number;
}

/**
 * Rate limit status for a business
 */
export interface RateLimitStatus {
  businessId: string;
  emailsSentLastHour: number;
  emailsSentLastDay: number;
  hourlyLimit: number;
  dailyLimit: number;
  hourlyLimitReached: boolean;
  dailyLimitReached: boolean;
  canSend: boolean;
  resetHourlyAt: Date;
  resetDailyAt: Date;
}

/**
 * Rate Limiter Error Codes
 */
export enum RateLimiterErrorCode {
  HOURLY_LIMIT_EXCEEDED = 'HOURLY_LIMIT_EXCEEDED',
  DAILY_LIMIT_EXCEEDED = 'DAILY_LIMIT_EXCEEDED',
  INVALID_BUSINESS = 'INVALID_BUSINESS',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

/**
 * Custom error class for rate limiter errors
 */
export class RateLimiterError extends Error {
  constructor(
    message: string,
    public code: RateLimiterErrorCode,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'RateLimiterError';
  }
}

/**
 * Email Rate Limiter
 * Enforces hourly and daily email sending limits per business
 */
export class EmailRateLimiter {
  private maxEmailsPerHour: number;
  private maxEmailsPerDay: number;

  constructor(config?: RateLimitConfig) {
    // Default limits: 100 per hour, 1000 per day
    this.maxEmailsPerHour = config?.maxEmailsPerHour || 100;
    this.maxEmailsPerDay = config?.maxEmailsPerDay || 1000;
  }

  /**
   * Check if a business can send an email
   * Returns true if within rate limits, false otherwise
   *
   * @param businessId - Business ID to check
   * @returns True if business can send, false otherwise
   */
  async checkRateLimit(businessId: string): Promise<boolean> {
    try {
      const status = await this.getRateLimitStatus(businessId);
      return status.canSend;
    } catch (error) {
      console.error('[EmailRateLimiter] Error checking rate limit', {
        businessId,
        error: error instanceof Error ? error.message : String(error),
      });

      // On error, allow the email (fail open for transactional emails)
      return true;
    }
  }

  /**
   * Get detailed rate limit status for a business
   *
   * @param businessId - Business ID to check
   * @returns Rate limit status
   */
  async getRateLimitStatus(businessId: string): Promise<RateLimitStatus> {
    try {
      // Verify business exists
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { id: true },
      });

      if (!business) {
        throw new RateLimiterError(
          `Business not found: ${businessId}`,
          RateLimiterErrorCode.INVALID_BUSINESS,
          { businessId }
        );
      }

      // Calculate time windows
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Count emails sent in last hour
      const emailsSentLastHour = await prisma.emailQueue.count({
        where: {
          businessId,
          status: 'sent',
          sentAt: {
            gte: oneHourAgo,
          },
        },
      });

      // Count emails sent in last day
      const emailsSentLastDay = await prisma.emailQueue.count({
        where: {
          businessId,
          status: 'sent',
          sentAt: {
            gte: oneDayAgo,
          },
        },
      });

      // Check if limits are reached
      const hourlyLimitReached = emailsSentLastHour >= this.maxEmailsPerHour;
      const dailyLimitReached = emailsSentLastDay >= this.maxEmailsPerDay;
      const canSend = !hourlyLimitReached && !dailyLimitReached;

      // Calculate reset times
      const resetHourlyAt = new Date(now.getTime() + 60 * 60 * 1000);
      const resetDailyAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      return {
        businessId,
        emailsSentLastHour,
        emailsSentLastDay,
        hourlyLimit: this.maxEmailsPerHour,
        dailyLimit: this.maxEmailsPerDay,
        hourlyLimitReached,
        dailyLimitReached,
        canSend,
        resetHourlyAt,
        resetDailyAt,
      };
    } catch (error) {
      console.error('[EmailRateLimiter] Error getting rate limit status', {
        businessId,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof RateLimiterError) {
        throw error;
      }

      throw new RateLimiterError(
        'Failed to get rate limit status',
        RateLimiterErrorCode.DATABASE_ERROR,
        { originalError: error }
      );
    }
  }

  /**
   * Increment rate limit counter for a business
   * Called after successfully sending an email
   *
   * @param businessId - Business ID to increment
   */
  async incrementRateLimit(businessId: string): Promise<void> {
    try {
      // The rate limit is automatically tracked by the emailQueue.sentAt timestamp
      // This method is a no-op but kept for interface compatibility
      console.log('[EmailRateLimiter] Rate limit incremented', {
        businessId,
      });
    } catch (error) {
      console.error('[EmailRateLimiter] Error incrementing rate limit', {
        businessId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Don't throw error - this is not critical
    }
  }

  /**
   * Check rate limit and throw error if exceeded
   * Useful for enforcing rate limits before queuing
   *
   * @param businessId - Business ID to check
   * @throws RateLimiterError if rate limit exceeded
   */
  async enforceRateLimit(businessId: string): Promise<void> {
    const status = await this.getRateLimitStatus(businessId);

    if (status.hourlyLimitReached) {
      throw new RateLimiterError(
        `Hourly rate limit exceeded for business ${businessId}`,
        RateLimiterErrorCode.HOURLY_LIMIT_EXCEEDED,
        {
          businessId,
          emailsSentLastHour: status.emailsSentLastHour,
          hourlyLimit: status.hourlyLimit,
          resetAt: status.resetHourlyAt,
        }
      );
    }

    if (status.dailyLimitReached) {
      throw new RateLimiterError(
        `Daily rate limit exceeded for business ${businessId}`,
        RateLimiterErrorCode.DAILY_LIMIT_EXCEEDED,
        {
          businessId,
          emailsSentLastDay: status.emailsSentLastDay,
          dailyLimit: status.dailyLimit,
          resetAt: status.resetDailyAt,
        }
      );
    }
  }

  /**
   * Get rate limit statistics for all businesses
   * Useful for monitoring and alerting
   *
   * @returns Array of rate limit statuses
   */
  async getAllRateLimitStatuses(): Promise<RateLimitStatus[]> {
    try {
      // Get all active businesses
      const businesses = await prisma.business.findMany({
        where: {
          isActive: true,
        },
        select: {
          id: true,
        },
      });

      // Get rate limit status for each business
      const statuses = await Promise.all(
        businesses.map(business => this.getRateLimitStatus(business.id))
      );

      return statuses;
    } catch (error) {
      console.error(
        '[EmailRateLimiter] Error getting all rate limit statuses',
        {
          error: error instanceof Error ? error.message : String(error),
        }
      );

      throw new RateLimiterError(
        'Failed to get all rate limit statuses',
        RateLimiterErrorCode.DATABASE_ERROR,
        { originalError: error }
      );
    }
  }

  /**
   * Get businesses that are approaching their rate limits
   * Useful for proactive monitoring and alerting
   *
   * @param threshold - Percentage threshold (0-1) for warning
   * @returns Array of businesses approaching limits
   */
  async getBusinessesApproachingLimits(
    threshold: number = 0.8
  ): Promise<RateLimitStatus[]> {
    try {
      const allStatuses = await this.getAllRateLimitStatuses();

      // Filter businesses that have used >= threshold of their limits
      return allStatuses.filter(status => {
        const hourlyUsage = status.emailsSentLastHour / status.hourlyLimit;
        const dailyUsage = status.emailsSentLastDay / status.dailyLimit;
        return hourlyUsage >= threshold || dailyUsage >= threshold;
      });
    } catch (error) {
      console.error(
        '[EmailRateLimiter] Error getting businesses approaching limits',
        {
          threshold,
          error: error instanceof Error ? error.message : String(error),
        }
      );

      throw new RateLimiterError(
        'Failed to get businesses approaching limits',
        RateLimiterErrorCode.DATABASE_ERROR,
        { originalError: error }
      );
    }
  }

  /**
   * Update rate limit configuration
   *
   * @param config - New rate limit configuration
   */
  updateConfig(config: RateLimitConfig): void {
    if (config.maxEmailsPerHour !== undefined) {
      this.maxEmailsPerHour = config.maxEmailsPerHour;
    }
    if (config.maxEmailsPerDay !== undefined) {
      this.maxEmailsPerDay = config.maxEmailsPerDay;
    }

    console.log('[EmailRateLimiter] Configuration updated', {
      maxEmailsPerHour: this.maxEmailsPerHour,
      maxEmailsPerDay: this.maxEmailsPerDay,
    });
  }
}

// Export singleton instance
export const emailRateLimiter = new EmailRateLimiter();

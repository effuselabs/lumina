/**
 * Email Queue Monitoring and Alerting
 * 
 * Provides monitoring utilities and alerting for the email queue system.
 * Tracks queue health, rate limits, and delivery metrics.
 */

import { emailQueueManager } from './queue-manager';
import { emailRateLimiter } from './rate-limiter';
import { emailQueueWorker } from './queue-worker';

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Alert type
 */
export interface Alert {
  severity: AlertSeverity;
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: Date;
  details?: Record<string, any>;
}

/**
 * Monitoring thresholds configuration
 */
export interface MonitoringThresholds {
  queueDepthWarning?: number;
  queueDepthCritical?: number;
  oldestMessageAgeWarning?: number; // Seconds
  oldestMessageAgeCritical?: number; // Seconds
  failureRateWarning?: number; // Percentage
  failureRateCritical?: number; // Percentage
  rateLimitWarning?: number; // Percentage of limit
}

/**
 * Email Queue Monitor
 * Monitors queue health and generates alerts
 */
export class EmailQueueMonitor {
  private thresholds: Required<MonitoringThresholds>;

  constructor(thresholds?: MonitoringThresholds) {
    // Default thresholds
    this.thresholds = {
      queueDepthWarning: thresholds?.queueDepthWarning || 1000,
      queueDepthCritical: thresholds?.queueDepthCritical || 5000,
      oldestMessageAgeWarning: thresholds?.oldestMessageAgeWarning || 300, // 5 minutes
      oldestMessageAgeCritical: thresholds?.oldestMessageAgeCritical || 900, // 15 minutes
      failureRateWarning: thresholds?.failureRateWarning || 5, // 5%
      failureRateCritical: thresholds?.failureRateCritical || 10, // 10%
      rateLimitWarning: thresholds?.rateLimitWarning || 80, // 80% of limit
    };
  }

  /**
   * Check queue health and generate alerts
   * 
   * @returns Array of alerts
   */
  async checkQueueHealth(): Promise<Alert[]> {
    const alerts: Alert[] = [];

    try {
      // Get queue metrics
      const metrics = await emailQueueManager.getQueueMetrics();

      // Check queue depth
      if (metrics.queueDepth >= this.thresholds.queueDepthCritical) {
        alerts.push({
          severity: AlertSeverity.CRITICAL,
          message: `Queue depth critically high: ${metrics.queueDepth}`,
          metric: 'queue_depth',
          value: metrics.queueDepth,
          threshold: this.thresholds.queueDepthCritical,
          timestamp: new Date(),
        });
      } else if (metrics.queueDepth >= this.thresholds.queueDepthWarning) {
        alerts.push({
          severity: AlertSeverity.WARNING,
          message: `Queue depth high: ${metrics.queueDepth}`,
          metric: 'queue_depth',
          value: metrics.queueDepth,
          threshold: this.thresholds.queueDepthWarning,
          timestamp: new Date(),
        });
      }

      // Check oldest message age
      const oldestMessageAgeSeconds = metrics.oldestMessageAge / 1000;
      if (oldestMessageAgeSeconds >= this.thresholds.oldestMessageAgeCritical) {
        alerts.push({
          severity: AlertSeverity.CRITICAL,
          message: `Oldest message age critically high: ${Math.round(oldestMessageAgeSeconds)}s`,
          metric: 'oldest_message_age',
          value: oldestMessageAgeSeconds,
          threshold: this.thresholds.oldestMessageAgeCritical,
          timestamp: new Date(),
        });
      } else if (oldestMessageAgeSeconds >= this.thresholds.oldestMessageAgeWarning) {
        alerts.push({
          severity: AlertSeverity.WARNING,
          message: `Oldest message age high: ${Math.round(oldestMessageAgeSeconds)}s`,
          metric: 'oldest_message_age',
          value: oldestMessageAgeSeconds,
          threshold: this.thresholds.oldestMessageAgeWarning,
          timestamp: new Date(),
        });
      }

      // Check failure rate
      const totalProcessed = metrics.messagesProcessed + metrics.messagesFailed;
      if (totalProcessed > 0) {
        const failureRate = (metrics.messagesFailed / totalProcessed) * 100;

        if (failureRate >= this.thresholds.failureRateCritical) {
          alerts.push({
            severity: AlertSeverity.CRITICAL,
            message: `Failure rate critically high: ${failureRate.toFixed(2)}%`,
            metric: 'failure_rate',
            value: failureRate,
            threshold: this.thresholds.failureRateCritical,
            timestamp: new Date(),
            details: {
              messagesProcessed: metrics.messagesProcessed,
              messagesFailed: metrics.messagesFailed,
            },
          });
        } else if (failureRate >= this.thresholds.failureRateWarning) {
          alerts.push({
            severity: AlertSeverity.WARNING,
            message: `Failure rate high: ${failureRate.toFixed(2)}%`,
            metric: 'failure_rate',
            value: failureRate,
            threshold: this.thresholds.failureRateWarning,
            timestamp: new Date(),
            details: {
              messagesProcessed: metrics.messagesProcessed,
              messagesFailed: metrics.messagesFailed,
            },
          });
        }
      }

      // Check worker status
      const workerStatus = emailQueueWorker.getStatus();
      if (!workerStatus.isRunning && metrics.queueDepth > 0) {
        alerts.push({
          severity: AlertSeverity.ERROR,
          message: 'Queue worker is not running but queue has pending messages',
          metric: 'worker_status',
          value: 0,
          threshold: 1,
          timestamp: new Date(),
          details: {
            queueDepth: metrics.queueDepth,
          },
        });
      }
    } catch (error) {
      console.error('[EmailQueueMonitor] Error checking queue health', {
        error: error instanceof Error ? error.message : String(error),
      });

      alerts.push({
        severity: AlertSeverity.ERROR,
        message: 'Failed to check queue health',
        metric: 'monitoring_error',
        value: 0,
        threshold: 0,
        timestamp: new Date(),
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }

    return alerts;
  }

  /**
   * Check rate limit status for all businesses
   * 
   * @returns Array of alerts for businesses approaching limits
   */
  async checkRateLimits(): Promise<Alert[]> {
    const alerts: Alert[] = [];

    try {
      // Get businesses approaching rate limits
      const threshold = this.thresholds.rateLimitWarning / 100;
      const businessesApproachingLimits =
        await emailRateLimiter.getBusinessesApproachingLimits(threshold);

      for (const status of businessesApproachingLimits) {
        const hourlyUsage = (status.emailsSentLastHour / status.hourlyLimit) * 100;
        const dailyUsage = (status.emailsSentLastDay / status.dailyLimit) * 100;

        if (hourlyUsage >= this.thresholds.rateLimitWarning) {
          alerts.push({
            severity:
              hourlyUsage >= 95 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
            message: `Business ${status.businessId} approaching hourly rate limit: ${hourlyUsage.toFixed(1)}%`,
            metric: 'hourly_rate_limit',
            value: hourlyUsage,
            threshold: this.thresholds.rateLimitWarning,
            timestamp: new Date(),
            details: {
              businessId: status.businessId,
              emailsSent: status.emailsSentLastHour,
              limit: status.hourlyLimit,
            },
          });
        }

        if (dailyUsage >= this.thresholds.rateLimitWarning) {
          alerts.push({
            severity:
              dailyUsage >= 95 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
            message: `Business ${status.businessId} approaching daily rate limit: ${dailyUsage.toFixed(1)}%`,
            metric: 'daily_rate_limit',
            value: dailyUsage,
            threshold: this.thresholds.rateLimitWarning,
            timestamp: new Date(),
            details: {
              businessId: status.businessId,
              emailsSent: status.emailsSentLastDay,
              limit: status.dailyLimit,
            },
          });
        }
      }
    } catch (error) {
      console.error('[EmailQueueMonitor] Error checking rate limits', {
        error: error instanceof Error ? error.message : String(error),
      });

      alerts.push({
        severity: AlertSeverity.ERROR,
        message: 'Failed to check rate limits',
        metric: 'monitoring_error',
        value: 0,
        threshold: 0,
        timestamp: new Date(),
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }

    return alerts;
  }

  /**
   * Run all health checks and return combined alerts
   * 
   * @returns Array of all alerts
   */
  async runHealthChecks(): Promise<Alert[]> {
    const [queueAlerts, rateLimitAlerts] = await Promise.all([
      this.checkQueueHealth(),
      this.checkRateLimits(),
    ]);

    return [...queueAlerts, ...rateLimitAlerts];
  }

  /**
   * Get summary of current system health
   * 
   * @returns Health summary
   */
  async getHealthSummary(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    alerts: Alert[];
    timestamp: Date;
  }> {
    const alerts = await this.runHealthChecks();

    // Determine overall status based on alerts
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    if (alerts.some((alert) => alert.severity === AlertSeverity.CRITICAL)) {
      status = 'critical';
    } else if (
      alerts.some(
        (alert) =>
          alert.severity === AlertSeverity.ERROR ||
          alert.severity === AlertSeverity.WARNING
      )
    ) {
      status = 'warning';
    }

    return {
      status,
      alerts,
      timestamp: new Date(),
    };
  }

  /**
   * Update monitoring thresholds
   * 
   * @param thresholds - New threshold values
   */
  updateThresholds(thresholds: Partial<MonitoringThresholds>): void {
    this.thresholds = {
      ...this.thresholds,
      ...thresholds,
    };

    console.log('[EmailQueueMonitor] Thresholds updated', this.thresholds);
  }
}

// Export singleton instance
export const emailQueueMonitor = new EmailQueueMonitor();

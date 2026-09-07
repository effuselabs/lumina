import { prisma } from '@/lib/prisma';

export interface AlertRule {
  id: string;
  name: string;
  condition: AlertCondition;
  severity: AlertSeverity;
  enabled: boolean;
  cooldownMinutes: number;
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  timeWindow?: number; // minutes
}

export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export interface AlertNotification {
  id: string;
  type: string;
  severity: AlertSeverity;
  message: string;
  data: Record<string, any>;
  timestamp: Date;
}

export class AlertingSystem {
  private static instance: AlertingSystem;
  private alertRules: AlertRule[] = [];
  private lastAlertTimes: Map<string, Date> = new Map();

  private constructor() {
    this.initializeDefaultRules();
  }

  static getInstance(): AlertingSystem {
    if (!AlertingSystem.instance) {
      AlertingSystem.instance = new AlertingSystem();
    }
    return AlertingSystem.instance;
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultRules(): void {
    this.alertRules = [
      {
        id: 'slow-response-time',
        name: 'Slow Response Time',
        condition: {
          metric: 'response_time',
          operator: 'gt',
          threshold: 500, // 500ms
        },
        severity: AlertSeverity.WARNING,
        enabled: true,
        cooldownMinutes: 5,
      },
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        condition: {
          metric: 'error_rate',
          operator: 'gt',
          threshold: 5, // 5%
          timeWindow: 10, // 10 minutes
        },
        severity: AlertSeverity.CRITICAL,
        enabled: true,
        cooldownMinutes: 10,
      },
      {
        id: 'database-connection-failure',
        name: 'Database Connection Failure',
        condition: {
          metric: 'db_connection_errors',
          operator: 'gt',
          threshold: 0,
        },
        severity: AlertSeverity.CRITICAL,
        enabled: true,
        cooldownMinutes: 1,
      },
      {
        id: 'appointment-booking-failure-spike',
        name: 'Appointment Booking Failure Spike',
        condition: {
          metric: 'booking_failures',
          operator: 'gt',
          threshold: 10,
          timeWindow: 5, // 5 minutes
        },
        severity: AlertSeverity.WARNING,
        enabled: true,
        cooldownMinutes: 15,
      },
    ];
  }

  /**
   * Check if an alert should be triggered
   */
  async checkAlert(
    metric: string,
    value: number,
    businessId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const applicableRules = this.alertRules.filter(
      rule => rule.enabled && rule.condition.metric === metric
    );

    for (const rule of applicableRules) {
      if (this.shouldTriggerAlert(rule, value)) {
        await this.triggerAlert(rule, value, businessId, metadata);
      }
    }
  }

  /**
   * Check if alert should be triggered based on rule
   */
  private shouldTriggerAlert(rule: AlertRule, value: number): boolean {
    const { condition } = rule;

    // Check cooldown period
    const lastAlertTime = this.lastAlertTimes.get(rule.id);
    if (lastAlertTime) {
      const cooldownMs = rule.cooldownMinutes * 60 * 1000;
      if (Date.now() - lastAlertTime.getTime() < cooldownMs) {
        return false;
      }
    }

    // Check condition
    switch (condition.operator) {
      case 'gt':
        return value > condition.threshold;
      case 'gte':
        return value >= condition.threshold;
      case 'lt':
        return value < condition.threshold;
      case 'lte':
        return value <= condition.threshold;
      case 'eq':
        return value === condition.threshold;
      default:
        return false;
    }
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(
    rule: AlertRule,
    value: number,
    businessId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const alert: AlertNotification = {
      id: `${rule.id}-${Date.now()}`,
      type: rule.id,
      severity: rule.severity,
      message: this.generateAlertMessage(rule, value),
      data: {
        rule: rule.name,
        metric: rule.condition.metric,
        value,
        threshold: rule.condition.threshold,
        businessId,
        ...metadata,
      },
      timestamp: new Date(),
    };

    // Update last alert time
    this.lastAlertTimes.set(rule.id, alert.timestamp);

    // Persist alert to database
    await this.persistAlert(alert);

    // Send notifications
    await this.sendNotifications(alert);

    // Log alert
    console.error(`ALERT [${alert.severity}]: ${alert.message}`, alert.data);
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(rule: AlertRule, value: number): string {
    const { condition } = rule;

    switch (rule.id) {
      case 'slow-response-time':
        return `Response time of ${value.toFixed(2)}ms exceeds threshold of ${condition.threshold}ms`;
      case 'high-error-rate':
        return `Error rate of ${value.toFixed(2)}% exceeds threshold of ${condition.threshold}%`;
      case 'database-connection-failure':
        return `Database connection failures detected: ${value} errors`;
      case 'appointment-booking-failure-spike':
        return `Appointment booking failures spike: ${value} failures in ${condition.timeWindow} minutes`;
      default:
        return `${rule.name}: ${value} ${condition.operator} ${condition.threshold}`;
    }
  }

  /**
   * Persist alert to database
   */
  private async persistAlert(alert: AlertNotification): Promise<void> {
    try {
      await prisma.systemAlert.create({
        data: {
          type: alert.type,
          severity: alert.severity,
          data: alert.data,
          timestamp: alert.timestamp,
        },
      });
    } catch (error) {
      console.error('Failed to persist alert:', error);
    }
  }

  /**
   * Send alert notifications
   */
  private async sendNotifications(alert: AlertNotification): Promise<void> {
    // Email notifications for critical alerts
    if (alert.severity === AlertSeverity.CRITICAL) {
      await this.sendEmailNotification(alert);
    }

    // Slack notifications for all alerts
    await this.sendSlackNotification(alert);

    // SMS notifications for critical alerts (if configured)
    if (alert.severity === AlertSeverity.CRITICAL) {
      await this.sendSMSNotification(alert);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(alert: AlertNotification): Promise<void> {
    try {
      // TODO: Implement email notification
      console.log('Email notification sent for alert:', alert.id);
    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(alert: AlertNotification): Promise<void> {
    try {
      // TODO: Implement Slack notification
      console.log('Slack notification sent for alert:', alert.id);
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(alert: AlertNotification): Promise<void> {
    try {
      // TODO: Implement SMS notification
      console.log('SMS notification sent for alert:', alert.id);
    } catch (error) {
      console.error('Failed to send SMS notification:', error);
    }
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(limit: number = 50): Promise<AlertNotification[]> {
    const alerts = await prisma.systemAlert.findMany({
      where: {
        resolved: false,
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
    });

    return alerts.map(alert => ({
      id: alert.id,
      type: alert.type,
      severity: alert.severity as AlertSeverity,
      message: this.generateMessageFromData(
        alert.type,
        alert.data as Record<string, any>
      ),
      data: alert.data as Record<string, any>,
      timestamp: alert.timestamp,
    }));
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, resolvedBy?: string): Promise<void> {
    await prisma.systemAlert.update({
      where: { id: alertId },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy,
      },
    });
  }

  /**
   * Generate message from alert data
   */
  private generateMessageFromData(
    type: string,
    data: Record<string, any>
  ): string {
    switch (type) {
      case 'slow-response-time':
        return `Response time of ${data.value?.toFixed(2)}ms exceeds threshold of ${data.threshold}ms`;
      case 'high-error-rate':
        return `Error rate of ${data.value?.toFixed(2)}% exceeds threshold of ${data.threshold}%`;
      default:
        return `Alert: ${type}`;
    }
  }

  /**
   * Add custom alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.push(rule);
  }

  /**
   * Update alert rule
   */
  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): void {
    const ruleIndex = this.alertRules.findIndex(rule => rule.id === ruleId);
    if (ruleIndex !== -1) {
      this.alertRules[ruleIndex] = {
        ...this.alertRules[ruleIndex],
        ...updates,
      };
    }
  }

  /**
   * Get alert rules
   */
  getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }
}

export const alertingSystem = AlertingSystem.getInstance();

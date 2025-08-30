/**
 * Workflow Alerting System
 * 
 * Builds alerting system for workflow failures and compliance violations
 * with multiple notification channels and escalation policies.
 */

import { WorkflowAlert } from './workflow-quality-monitor';

export interface AlertChannel {
    id: string;
    name: string;
    type: 'email' | 'slack' | 'webhook' | 'console';
    config: Record<string, any>;
    enabled: boolean;
}

export interface AlertRule {
    id: string;
    name: string;
    condition: {
        type: 'threshold' | 'pattern' | 'frequency';
        metric: string;
        operator: 'gt' | 'lt' | 'eq' | 'contains';
        value: any;
        timeWindow?: number; // minutes
    };
    severity: 'low' | 'medium' | 'high' | 'critical';
    channels: string[]; // channel IDs
    enabled: boolean;
    cooldown?: number; // minutes to wait before re-alerting
}

export interface AlertNotification {
    id: string;
    alertId: string;
    ruleId: string;
    channelId: string;
    status: 'pending' | 'sent' | 'failed' | 'acknowledged';
    sentAt?: Date;
    acknowledgedAt?: Date;
    acknowledgedBy?: string;
    error?: string;
}

export class WorkflowAlertingSystem {
    private channels: Map<string, AlertChannel> = new Map();
    private rules: Map<string, AlertRule> = new Map();
    private notifications: AlertNotification[] = [];
    private lastAlertTimes: Map<string, Date> = new Map();

    constructor() {
        this.initializeDefaultChannels();
        this.initializeDefaultRules();
    }

    /**
     * Add or update alert channel
     */
    addChannel(channel: AlertChannel): void {
        this.channels.set(channel.id, channel);
    }

    /**
     * Add or update alert rule
     */
    addRule(rule: AlertRule): void {
        this.rules.set(rule.id, rule);
    }

    /**
     * Process workflow alert and trigger notifications
     */
    async processAlert(alert: WorkflowAlert): Promise<void> {
        const matchingRules = this.findMatchingRules(alert);

        for (const rule of matchingRules) {
            if (!rule.enabled) continue;

            // Check cooldown period
            if (this.isInCooldown(rule.id)) continue;

            // Send notifications to all configured channels
            for (const channelId of rule.channels) {
                const channel = this.channels.get(channelId);
                if (!channel || !channel.enabled) continue;

                const notification = await this.sendNotification(alert, rule, channel);
                this.notifications.push(notification);
            }

            // Update last alert time for cooldown
            this.lastAlertTimes.set(rule.id, new Date());
        }
    }

    /**
     * Send test notification to verify channel configuration
     */
    async testChannel(channelId: string): Promise<boolean> {
        const channel = this.channels.get(channelId);
        if (!channel) {
            throw new Error(`Channel ${channelId} not found`);
        }

        const testAlert: WorkflowAlert = {
            id: `test_${Date.now()}`,
            type: 'documentation_sync_failure',
            severity: 'low',
            message: 'Test notification from Workflow Alerting System',
            timestamp: new Date(),
            metadata: { test: true },
        };

        const testRule: AlertRule = {
            id: 'test_rule',
            name: 'Test Rule',
            condition: {
                type: 'threshold',
                metric: 'test',
                operator: 'eq',
                value: true,
            },
            severity: 'low',
            channels: [channelId],
            enabled: true,
        };

        try {
            const notification = await this.sendNotification(testAlert, testRule, channel);
            return notification.status === 'sent';
        } catch (error) {
            console.error(`Test notification failed for channel ${channelId}:`, error);
            return false;
        }
    }

    /**
     * Acknowledge alert to stop further notifications
     */
    acknowledgeAlert(alertId: string, acknowledgedBy: string): void {
        const notifications = this.notifications.filter(n => n.alertId === alertId);

        for (const notification of notifications) {
            if (notification.status === 'sent') {
                notification.status = 'acknowledged';
                notification.acknowledgedAt = new Date();
                notification.acknowledgedBy = acknowledgedBy;
            }
        }
    }

    /**
     * Get notification history
     */
    getNotificationHistory(limit: number = 100): AlertNotification[] {
        return this.notifications
            .sort((a, b) => (b.sentAt?.getTime() || 0) - (a.sentAt?.getTime() || 0))
            .slice(0, limit);
    }

    /**
     * Get channel statistics
     */
    getChannelStats(): Array<{
        channelId: string;
        channelName: string;
        totalNotifications: number;
        successfulNotifications: number;
        failedNotifications: number;
        successRate: number;
    }> {
        const stats = new Map<string, {
            channelId: string;
            channelName: string;
            total: number;
            successful: number;
            failed: number;
        }>();

        for (const notification of this.notifications) {
            const channel = this.channels.get(notification.channelId);
            if (!channel) continue;

            if (!stats.has(notification.channelId)) {
                stats.set(notification.channelId, {
                    channelId: notification.channelId,
                    channelName: channel.name,
                    total: 0,
                    successful: 0,
                    failed: 0,
                });
            }

            const stat = stats.get(notification.channelId)!;
            stat.total++;

            if (notification.status === 'sent' || notification.status === 'acknowledged') {
                stat.successful++;
            } else if (notification.status === 'failed') {
                stat.failed++;
            }
        }

        return Array.from(stats.values()).map(stat => ({
            channelId: stat.channelId,
            channelName: stat.channelName,
            totalNotifications: stat.total,
            successfulNotifications: stat.successful,
            failedNotifications: stat.failed,
            successRate: stat.total > 0 ? (stat.successful / stat.total) * 100 : 0,
        }));
    }

    /**
     * Update channel configuration
     */
    updateChannelConfig(channelId: string, config: Partial<AlertChannel>): void {
        const channel = this.channels.get(channelId);
        if (!channel) {
            throw new Error(`Channel ${channelId} not found`);
        }

        Object.assign(channel, config);
        this.channels.set(channelId, channel);
    }

    /**
     * Disable/enable alert rule
     */
    toggleRule(ruleId: string, enabled: boolean): void {
        const rule = this.rules.get(ruleId);
        if (!rule) {
            throw new Error(`Rule ${ruleId} not found`);
        }

        rule.enabled = enabled;
        this.rules.set(ruleId, rule);
    }

    private initializeDefaultChannels(): void {
        // Console channel for development
        this.addChannel({
            id: 'console',
            name: 'Console Output',
            type: 'console',
            config: {},
            enabled: true,
        });

        // Webhook channel for integration with external systems
        this.addChannel({
            id: 'webhook',
            name: 'Webhook Notifications',
            type: 'webhook',
            config: {
                url: process.env.WORKFLOW_WEBHOOK_URL || '',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.WORKFLOW_WEBHOOK_TOKEN || ''}`,
                },
            },
            enabled: !!process.env.WORKFLOW_WEBHOOK_URL,
        });

        // Email channel (would require email service configuration)
        this.addChannel({
            id: 'email',
            name: 'Email Notifications',
            type: 'email',
            config: {
                recipients: process.env.WORKFLOW_ALERT_EMAILS?.split(',') || [],
                smtpConfig: {
                    host: process.env.SMTP_HOST,
                    port: process.env.SMTP_PORT,
                    secure: process.env.SMTP_SECURE === 'true',
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS,
                    },
                },
            },
            enabled: !!process.env.SMTP_HOST && !!process.env.WORKFLOW_ALERT_EMAILS,
        });
    }

    private initializeDefaultRules(): void {
        // High failure rate rule
        this.addRule({
            id: 'high_failure_rate',
            name: 'High Agent Hook Failure Rate',
            condition: {
                type: 'threshold',
                metric: 'failure_rate',
                operator: 'gt',
                value: 10, // More than 10% failure rate
                timeWindow: 60, // In the last hour
            },
            severity: 'high',
            channels: ['console', 'webhook', 'email'],
            enabled: true,
            cooldown: 30, // 30 minutes
        });

        // Documentation compliance rule
        this.addRule({
            id: 'low_documentation_compliance',
            name: 'Low Documentation Compliance',
            condition: {
                type: 'threshold',
                metric: 'documentation_compliance',
                operator: 'lt',
                value: 85, // Less than 85% compliance
            },
            severity: 'medium',
            channels: ['console', 'webhook'],
            enabled: true,
            cooldown: 120, // 2 hours
        });

        // Performance degradation rule
        this.addRule({
            id: 'performance_degradation',
            name: 'Agent Hook Performance Degradation',
            condition: {
                type: 'threshold',
                metric: 'average_execution_time',
                operator: 'gt',
                value: 30000, // More than 30 seconds
            },
            severity: 'medium',
            channels: ['console', 'webhook'],
            enabled: true,
            cooldown: 60, // 1 hour
        });

        // Critical system failure rule
        this.addRule({
            id: 'critical_system_failure',
            name: 'Critical System Failure',
            condition: {
                type: 'pattern',
                metric: 'alert_type',
                operator: 'contains',
                value: 'critical',
            },
            severity: 'critical',
            channels: ['console', 'webhook', 'email'],
            enabled: true,
            cooldown: 15, // 15 minutes
        });
    }

    private findMatchingRules(alert: WorkflowAlert): AlertRule[] {
        const matchingRules: AlertRule[] = [];

        for (const rule of this.rules.values()) {
            if (this.evaluateRuleCondition(alert, rule)) {
                matchingRules.push(rule);
            }
        }

        return matchingRules;
    }

    private evaluateRuleCondition(alert: WorkflowAlert, rule: AlertRule): boolean {
        const { condition } = rule;

        switch (condition.type) {
            case 'pattern':
                if (condition.metric === 'alert_type') {
                    return alert.type.includes(condition.value);
                }
                if (condition.metric === 'severity') {
                    return alert.severity === condition.value;
                }
                break;

            case 'threshold':
                // These would be evaluated against current metrics
                // For now, we'll match based on alert severity
                if (condition.metric === 'severity_level') {
                    const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
                    const alertLevel = severityLevels[alert.severity];
                    const thresholdLevel = severityLevels[condition.value as keyof typeof severityLevels];

                    switch (condition.operator) {
                        case 'gt': return alertLevel > thresholdLevel;
                        case 'lt': return alertLevel < thresholdLevel;
                        case 'eq': return alertLevel === thresholdLevel;
                    }
                }
                break;

            case 'frequency':
                // Would require tracking alert frequency over time
                // For now, we'll always match frequency rules
                return true;
        }

        return false;
    }

    private async sendNotification(
        alert: WorkflowAlert,
        rule: AlertRule,
        channel: AlertChannel
    ): Promise<AlertNotification> {
        const notification: AlertNotification = {
            id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            alertId: alert.id,
            ruleId: rule.id,
            channelId: channel.id,
            status: 'pending',
        };

        try {
            await this.sendToChannel(alert, rule, channel);
            notification.status = 'sent';
            notification.sentAt = new Date();
        } catch (error) {
            notification.status = 'failed';
            notification.error = error instanceof Error ? error.message : 'Unknown error';
            console.error(`Failed to send notification to ${channel.name}:`, error);
        }

        return notification;
    }

    private async sendToChannel(
        alert: WorkflowAlert,
        rule: AlertRule,
        channel: AlertChannel
    ): Promise<void> {
        const message = this.formatAlertMessage(alert, rule);

        switch (channel.type) {
            case 'console':
                console.log(`🚨 WORKFLOW ALERT [${alert.severity.toUpperCase()}]: ${message}`);
                break;

            case 'webhook':
                if (channel.config.url) {
                    const response = await fetch(channel.config.url, {
                        method: 'POST',
                        headers: channel.config.headers || {},
                        body: JSON.stringify({
                            alert,
                            rule,
                            message,
                            timestamp: new Date().toISOString(),
                        }),
                    });

                    if (!response.ok) {
                        throw new Error(`Webhook request failed: ${response.status} ${response.statusText}`);
                    }
                }
                break;

            case 'email':
                // Email implementation would go here
                // For now, we'll just log that an email would be sent
                console.log(`📧 EMAIL ALERT to ${channel.config.recipients?.join(', ')}: ${message}`);
                break;

            case 'slack':
                // Slack implementation would go here
                console.log(`💬 SLACK ALERT: ${message}`);
                break;

            default:
                throw new Error(`Unsupported channel type: ${channel.type}`);
        }
    }

    private formatAlertMessage(alert: WorkflowAlert, rule: AlertRule): string {
        const timestamp = alert.timestamp.toISOString();
        return `[${timestamp}] ${rule.name}: ${alert.message}`;
    }

    private isInCooldown(ruleId: string): boolean {
        const rule = this.rules.get(ruleId);
        if (!rule || !rule.cooldown) return false;

        const lastAlertTime = this.lastAlertTimes.get(ruleId);
        if (!lastAlertTime) return false;

        const cooldownMs = rule.cooldown * 60 * 1000; // Convert minutes to milliseconds
        const timeSinceLastAlert = Date.now() - lastAlertTime.getTime();

        return timeSinceLastAlert < cooldownMs;
    }
}

// Singleton instance for global use
export const workflowAlertingSystem = new WorkflowAlertingSystem();
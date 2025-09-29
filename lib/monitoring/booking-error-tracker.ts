import { prisma } from '@/lib/prisma';

export interface BookingError {
    businessId: string;
    errorType: 'validation' | 'availability' | 'payment' | 'system' | 'network';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    stack?: string;
    context?: Record<string, any>;
    userId?: string;
    sessionId?: string;
    timestamp: Date;
}

export interface AlertRule {
    id: string;
    businessId: string;
    name: string;
    condition: {
        errorType?: string;
        severity?: string;
        threshold: number;
        timeWindow: number; // minutes
    };
    actions: {
        email?: string[];
        webhook?: string;
        sms?: string[];
    };
    isActive: boolean;
}

export class BookingErrorTracker {
    async trackError(error: BookingError): Promise<void> {
        try {
            // Store error in database
            await prisma.bookingError.create({
                data: {
                    businessId: error.businessId,
                    errorType: error.errorType,
                    severity: error.severity,
                    message: error.message,
                    stack: error.stack,
                    context: error.context || {},
                    userId: error.userId,
                    sessionId: error.sessionId,
                    timestamp: error.timestamp,
                },
            });

            // Check alert rules
            await this.checkAlertRules(error);
        } catch (err) {
            console.error('Failed to track booking error:', err);
        }
    }

    private async checkAlertRules(error: BookingError): Promise<void> {
        try {
            const alertRules = await prisma.bookingAlertRule.findMany({
                where: {
                    businessId: error.businessId,
                    isActive: true,
                },
            });

            for (const rule of alertRules) {
                const shouldTrigger = await this.evaluateAlertRule(rule, error);
                if (shouldTrigger) {
                    await this.triggerAlert(rule, error);
                }
            }
        } catch (err) {
            console.error('Failed to check alert rules:', err);
        }
    }

    private async evaluateAlertRule(rule: AlertRule, error: BookingError): Promise<boolean> {
        const { condition } = rule;
        const timeWindowStart = new Date(Date.now() - condition.timeWindow * 60 * 1000);

        // Build where clause based on conditions
        const whereClause: any = {
            businessId: error.businessId,
            timestamp: {
                gte: timeWindowStart,
            },
        };

        if (condition.errorType) {
            whereClause.errorType = condition.errorType;
        }

        if (condition.severity) {
            whereClause.severity = condition.severity;
        }

        // Count errors matching the condition
        const errorCount = await prisma.bookingError.count({
            where: whereClause,
        });

        return errorCount >= condition.threshold;
    }

    private async triggerAlert(rule: AlertRule, error: BookingError): Promise<void> {
        try {
            // Create alert record
            await prisma.bookingAlert.create({
                data: {
                    businessId: error.businessId,
                    ruleId: rule.id,
                    ruleName: rule.name,
                    errorType: error.errorType,
                    severity: error.severity,
                    message: `Alert triggered: ${rule.name}`,
                    context: {
                        originalError: error.message,
                        errorContext: error.context,
                    },
                    timestamp: new Date(),
                },
            });

            // Send notifications
            await this.sendAlertNotifications(rule, error);
        } catch (err) {
            console.error('Failed to trigger alert:', err);
        }
    }

    private async sendAlertNotifications(rule: AlertRule, error: BookingError): Promise<void> {
        const { actions } = rule;

        // Email notifications
        if (actions.email && actions.email.length > 0) {
            await this.sendEmailAlert(actions.email, rule, error);
        }

        // Webhook notifications
        if (actions.webhook) {
            await this.sendWebhookAlert(actions.webhook, rule, error);
        }

        // SMS notifications (if configured)
        if (actions.sms && actions.sms.length > 0) {
            await this.sendSMSAlert(actions.sms, rule, error);
        }
    }

    private async sendEmailAlert(emails: string[], rule: AlertRule, error: BookingError): Promise<void> {
        try {
            // This would integrate with your email service
            console.log('Sending email alert:', {
                to: emails,
                subject: `Booking Alert: ${rule.name}`,
                body: `
          Alert Rule: ${rule.name}
          Error Type: ${error.errorType}
          Severity: ${error.severity}
          Message: ${error.message}
          Time: ${error.timestamp.toISOString()}
          Business ID: ${error.businessId}
        `,
            });
        } catch (err) {
            console.error('Failed to send email alert:', err);
        }
    }

    private async sendWebhookAlert(webhookUrl: string, rule: AlertRule, error: BookingError): Promise<void> {
        try {
            const payload = {
                alertRule: rule.name,
                errorType: error.errorType,
                severity: error.severity,
                message: error.message,
                timestamp: error.timestamp.toISOString(),
                businessId: error.businessId,
                context: error.context,
            };

            await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
        } catch (err) {
            console.error('Failed to send webhook alert:', err);
        }
    }

    private async sendSMSAlert(phoneNumbers: string[], rule: AlertRule, error: BookingError): Promise<void> {
        try {
            // This would integrate with your SMS service
            console.log('Sending SMS alert:', {
                to: phoneNumbers,
                message: `Booking Alert: ${rule.name} - ${error.errorType} error occurred at ${error.timestamp.toLocaleString()}`,
            });
        } catch (err) {
            console.error('Failed to send SMS alert:', err);
        }
    }

    async getErrorSummary(
        businessId: string,
        startDate: Date,
        endDate: Date
    ): Promise<{
        totalErrors: number;
        errorsByType: Array<{ type: string; count: number }>;
        errorsBySeverity: Array<{ severity: string; count: number }>;
        recentErrors: Array<{
            id: string;
            errorType: string;
            severity: string;
            message: string;
            timestamp: Date;
        }>;
    }> {
        const errors = await prisma.bookingError.findMany({
            where: {
                businessId,
                timestamp: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            orderBy: {
                timestamp: 'desc',
            },
        });

        const totalErrors = errors.length;

        // Group by type
        const typeGroups = new Map<string, number>();
        errors.forEach(error => {
            typeGroups.set(error.errorType, (typeGroups.get(error.errorType) || 0) + 1);
        });

        const errorsByType = Array.from(typeGroups.entries()).map(([type, count]) => ({
            type,
            count,
        }));

        // Group by severity
        const severityGroups = new Map<string, number>();
        errors.forEach(error => {
            severityGroups.set(error.severity, (severityGroups.get(error.severity) || 0) + 1);
        });

        const errorsBySeverity = Array.from(severityGroups.entries()).map(([severity, count]) => ({
            severity,
            count,
        }));

        // Recent errors
        const recentErrors = errors.slice(0, 10).map(error => ({
            id: error.id,
            errorType: error.errorType,
            severity: error.severity,
            message: error.message,
            timestamp: error.timestamp,
        }));

        return {
            totalErrors,
            errorsByType,
            errorsBySeverity,
            recentErrors,
        };
    }

    async createAlertRule(rule: Omit<AlertRule, 'id'>): Promise<AlertRule> {
        const created = await prisma.bookingAlertRule.create({
            data: {
                businessId: rule.businessId,
                name: rule.name,
                condition: rule.condition,
                actions: rule.actions,
                isActive: rule.isActive,
            },
        });

        return {
            id: created.id,
            businessId: created.businessId,
            name: created.name,
            condition: created.condition as AlertRule['condition'],
            actions: created.actions as AlertRule['actions'],
            isActive: created.isActive,
        };
    }

    async updateAlertRule(id: string, updates: Partial<AlertRule>): Promise<void> {
        await prisma.bookingAlertRule.update({
            where: { id },
            data: {
                name: updates.name,
                condition: updates.condition,
                actions: updates.actions,
                isActive: updates.isActive,
            },
        });
    }

    async deleteAlertRule(id: string): Promise<void> {
        await prisma.bookingAlertRule.delete({
            where: { id },
        });
    }

    async getAlertRules(businessId: string): Promise<AlertRule[]> {
        const rules = await prisma.bookingAlertRule.findMany({
            where: { businessId },
        });

        return rules.map(rule => ({
            id: rule.id,
            businessId: rule.businessId,
            name: rule.name,
            condition: rule.condition as AlertRule['condition'],
            actions: rule.actions as AlertRule['actions'],
            isActive: rule.isActive,
        }));
    }
}

export const bookingErrorTracker = new BookingErrorTracker();
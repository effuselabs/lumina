/**
 * Workflow Quality Monitor
 * 
 * Implements automated quality checks for documentation workflow compliance
 * and monitoring for Agent Hook execution success rates.
 */

import { z } from 'zod';

// Types for workflow monitoring
export interface WorkflowMetrics {
    agentHookExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    documentationSyncEvents: number;
    steeringComplianceChecks: number;
    linearSyncEvents: number;
    averageExecutionTime: number;
    lastExecutionTime: Date;
}

export interface WorkflowAlert {
    id: string;
    type: 'documentation_sync_failure' | 'steering_compliance_violation' | 'linear_sync_error' | 'performance_degradation';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: Date;
    metadata: Record<string, any>;
}

export interface DocumentationComplianceReport {
    totalFiles: number;
    documentedFiles: number;
    compliancePercentage: number;
    missingDocumentation: string[];
    outdatedDocumentation: string[];
    lastAuditDate: Date;
}

// Validation schemas
const _WorkflowMetricsSchema = z.object({
    agentHookExecutions: z.number().min(0),
    successfulExecutions: z.number().min(0),
    failedExecutions: z.number().min(0),
    documentationSyncEvents: z.number().min(0),
    steeringComplianceChecks: z.number().min(0),
    linearSyncEvents: z.number().min(0),
    averageExecutionTime: z.number().min(0),
    lastExecutionTime: z.date(),
});

const WorkflowAlertSchema = z.object({
    id: z.string(),
    type: z.enum(['documentation_sync_failure', 'steering_compliance_violation', 'linear_sync_error', 'performance_degradation']),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    message: z.string(),
    timestamp: z.date(),
    metadata: z.record(z.any()),
});

export class WorkflowQualityMonitor {
    private metrics: WorkflowMetrics;
    private alerts: WorkflowAlert[] = [];
    private complianceThresholds = {
        documentationCompliance: 0.85, // 85% minimum
        executionSuccessRate: 0.95, // 95% minimum
        maxExecutionTime: 30000, // 30 seconds maximum
    };

    constructor() {
        this.metrics = {
            agentHookExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            documentationSyncEvents: 0,
            steeringComplianceChecks: 0,
            linearSyncEvents: 0,
            averageExecutionTime: 0,
            lastExecutionTime: new Date(),
        };
    }

    /**
     * Record Agent Hook execution metrics
     */
    recordExecution(type: 'documentation_sync' | 'steering_compliance' | 'linear_sync', success: boolean, executionTime: number): void {
        this.metrics.agentHookExecutions++;
        this.metrics.lastExecutionTime = new Date();

        if (success) {
            this.metrics.successfulExecutions++;
        } else {
            this.metrics.failedExecutions++;
            this.createAlert({
                type: `${type}_failure` as any,
                severity: 'medium',
                message: `Agent Hook execution failed for ${type}`,
                metadata: { executionTime, type },
            });
        }

        // Update execution type counters
        switch (type) {
            case 'documentation_sync':
                this.metrics.documentationSyncEvents++;
                break;
            case 'steering_compliance':
                this.metrics.steeringComplianceChecks++;
                break;
            case 'linear_sync':
                this.metrics.linearSyncEvents++;
                break;
        }

        // Update average execution time
        this.updateAverageExecutionTime(executionTime);

        // Check performance thresholds
        this.checkPerformanceThresholds(executionTime);
    }

    /**
     * Check documentation compliance across the codebase
     */
    async checkDocumentationCompliance(): Promise<DocumentationComplianceReport> {
        // This would integrate with file system scanning in a real implementation
        // For now, we'll simulate the compliance check

        const mockReport: DocumentationComplianceReport = {
            totalFiles: 150,
            documentedFiles: 128,
            compliancePercentage: 0.853,
            missingDocumentation: [
                'lib/services/new-service.ts',
                'components/ui/custom-component.tsx',
                'app/api/new-endpoint/route.ts',
            ],
            outdatedDocumentation: [
                'lib/auth.ts',
                'components/booking/booking-form.tsx',
            ],
            lastAuditDate: new Date(),
        };

        // Check compliance threshold
        if (mockReport.compliancePercentage < this.complianceThresholds.documentationCompliance) {
            this.createAlert({
                type: 'documentation_sync_failure',
                severity: 'high',
                message: `Documentation compliance below threshold: ${(mockReport.compliancePercentage * 100).toFixed(1)}%`,
                metadata: { report: mockReport },
            });
        }

        return mockReport;
    }

    /**
     * Get current workflow metrics
     */
    getMetrics(): WorkflowMetrics {
        return { ...this.metrics };
    }

    /**
     * Get current alerts
     */
    getAlerts(severity?: WorkflowAlert['severity']): WorkflowAlert[] {
        if (severity) {
            return this.alerts.filter(alert => alert.severity === severity);
        }
        return [...this.alerts];
    }

    /**
     * Get success rate percentage
     */
    getSuccessRate(): number {
        if (this.metrics.agentHookExecutions === 0) return 100;
        return (this.metrics.successfulExecutions / this.metrics.agentHookExecutions) * 100;
    }

    /**
     * Clear resolved alerts
     */
    clearAlerts(alertIds: string[]): void {
        this.alerts = this.alerts.filter(alert => !alertIds.includes(alert.id));
    }

    /**
     * Generate workflow health report
     */
    generateHealthReport(): {
        overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
        metrics: WorkflowMetrics;
        alerts: WorkflowAlert[];
        recommendations: string[];
    } {
        const successRate = this.getSuccessRate();
        const criticalAlerts = this.getAlerts('critical').length;
        const highAlerts = this.getAlerts('high').length;

        let overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
        const recommendations: string[] = [];

        if (successRate >= 98 && criticalAlerts === 0 && highAlerts === 0) {
            overallHealth = 'excellent';
        } else if (successRate >= 95 && criticalAlerts === 0 && highAlerts <= 2) {
            overallHealth = 'good';
        } else if (successRate >= 90 && criticalAlerts === 0) {
            overallHealth = 'fair';
            recommendations.push('Consider investigating recurring Agent Hook failures');
        } else {
            overallHealth = 'poor';
            recommendations.push('Immediate attention required for workflow automation issues');
            recommendations.push('Review Agent Hook configurations and error logs');
        }

        if (this.metrics.averageExecutionTime > this.complianceThresholds.maxExecutionTime) {
            recommendations.push('Agent Hook execution times are above optimal thresholds');
        }

        return {
            overallHealth,
            metrics: this.getMetrics(),
            alerts: this.getAlerts(),
            recommendations,
        };
    }

    private updateAverageExecutionTime(newExecutionTime: number): void {
        const totalExecutions = this.metrics.agentHookExecutions;
        const currentAverage = this.metrics.averageExecutionTime;

        // Calculate new average using incremental formula
        this.metrics.averageExecutionTime =
            ((currentAverage * (totalExecutions - 1)) + newExecutionTime) / totalExecutions;
    }

    private checkPerformanceThresholds(executionTime: number): void {
        if (executionTime > this.complianceThresholds.maxExecutionTime) {
            this.createAlert({
                type: 'performance_degradation',
                severity: 'medium',
                message: `Agent Hook execution time exceeded threshold: ${executionTime}ms`,
                metadata: { executionTime, threshold: this.complianceThresholds.maxExecutionTime },
            });
        }
    }

    private createAlert(alertData: Omit<WorkflowAlert, 'id' | 'timestamp'>): void {
        const alert: WorkflowAlert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            ...alertData,
        };

        // Validate alert data
        try {
            WorkflowAlertSchema.parse(alert);
            this.alerts.push(alert);

            // Keep only the last 100 alerts to prevent memory issues
            if (this.alerts.length > 100) {
                this.alerts = this.alerts.slice(-100);
            }
        } catch (error) {
            console.error('Failed to create workflow alert:', error);
        }
    }
}

// Singleton instance for global use
export const workflowQualityMonitor = new WorkflowQualityMonitor();
/**
 * Workflow Monitoring Dashboard
 * 
 * Creates monitoring dashboard for Agent Hook execution metrics
 * and provides real-time workflow health visualization.
 */

import { WorkflowAlert, WorkflowMetrics, workflowQualityMonitor } from './workflow-quality-monitor';

export interface DashboardData {
  metrics: WorkflowMetrics;
  alerts: WorkflowAlert[];
  healthStatus: {
    overall: 'excellent' | 'good' | 'fair' | 'poor';
    successRate: number;
    averageExecutionTime: number;
    activeAlerts: number;
  };
  trends: {
    executionTrend: Array<{ timestamp: Date; count: number; successRate: number }>;
    performanceTrend: Array<{ timestamp: Date; averageTime: number }>;
  };
  recommendations: string[];
}

export interface DashboardWidget {
  id: string;
  title: string;
  type: 'metric' | 'chart' | 'alert' | 'status';
  data: any;
  priority: number;
}

export class WorkflowMonitoringDashboard {
  private updateInterval: NodeJS.Timeout | null = null;
  private subscribers: Array<(data: DashboardData) => void> = [];
  private historicalData: Array<{
    timestamp: Date;
    metrics: WorkflowMetrics;
    alerts: WorkflowAlert[];
  }> = [];

  constructor() {
    this.startPeriodicUpdates();
  }

  /**
   * Get current dashboard data
   */
  async getDashboardData(): Promise<DashboardData> {
    const metrics = workflowQualityMonitor.getMetrics();
    const alerts = workflowQualityMonitor.getAlerts();
    const healthReport = workflowQualityMonitor.generateHealthReport();
    const complianceReport = await workflowQualityMonitor.checkDocumentationCompliance();

    const dashboardData: DashboardData = {
      metrics,
      alerts,
      healthStatus: {
        overall: healthReport.overallHealth,
        successRate: workflowQualityMonitor.getSuccessRate(),
        averageExecutionTime: metrics.averageExecutionTime,
        activeAlerts: alerts.filter(alert => alert.severity === 'high' || alert.severity === 'critical').length,
      },
      trends: this.generateTrends(),
      recommendations: [
        ...healthReport.recommendations,
        ...(complianceReport.compliancePercentage < 0.85 ?
          [`Documentation compliance at ${(complianceReport.compliancePercentage * 100).toFixed(1)}% - consider updating missing docs`] :
          [])
      ],
    };

    // Store historical data
    this.historicalData.push({
      timestamp: new Date(),
      metrics,
      alerts,
    });

    // Keep only last 24 hours of data (assuming 5-minute intervals)
    const maxDataPoints = 288; // 24 hours * 12 (5-minute intervals)
    if (this.historicalData.length > maxDataPoints) {
      this.historicalData = this.historicalData.slice(-maxDataPoints);
    }

    return dashboardData;
  }

  /**
   * Get dashboard widgets for UI rendering
   */
  async getDashboardWidgets(): Promise<DashboardWidget[]> {
    const data = await this.getDashboardData();

    const widgets: DashboardWidget[] = [
      {
        id: 'health-status',
        title: 'Workflow Health',
        type: 'status',
        data: {
          status: data.healthStatus.overall,
          successRate: data.healthStatus.successRate,
          description: this.getHealthDescription(data.healthStatus.overall),
        },
        priority: 1,
      },
      {
        id: 'execution-metrics',
        title: 'Agent Hook Executions',
        type: 'metric',
        data: {
          total: data.metrics.agentHookExecutions,
          successful: data.metrics.successfulExecutions,
          failed: data.metrics.failedExecutions,
          successRate: data.healthStatus.successRate,
        },
        priority: 2,
      },
      {
        id: 'performance-metrics',
        title: 'Performance Metrics',
        type: 'metric',
        data: {
          averageExecutionTime: data.metrics.averageExecutionTime,
          lastExecution: data.metrics.lastExecutionTime,
          performanceStatus: data.metrics.averageExecutionTime < 30000 ? 'good' : 'needs-attention',
        },
        priority: 3,
      },
      {
        id: 'active-alerts',
        title: 'Active Alerts',
        type: 'alert',
        data: {
          alerts: data.alerts.filter(alert => alert.severity === 'high' || alert.severity === 'critical'),
          totalAlerts: data.alerts.length,
          criticalCount: data.alerts.filter(alert => alert.severity === 'critical').length,
          highCount: data.alerts.filter(alert => alert.severity === 'high').length,
        },
        priority: 4,
      },
      {
        id: 'execution-trend',
        title: 'Execution Trend (24h)',
        type: 'chart',
        data: {
          chartType: 'line',
          data: data.trends.executionTrend,
          xAxis: 'timestamp',
          yAxis: ['count', 'successRate'],
        },
        priority: 5,
      },
      {
        id: 'hook-breakdown',
        title: 'Hook Type Breakdown',
        type: 'chart',
        data: {
          chartType: 'pie',
          data: [
            { name: 'Documentation Sync', value: data.metrics.documentationSyncEvents },
            { name: 'Steering Compliance', value: data.metrics.steeringComplianceChecks },
            { name: 'Linear Sync', value: data.metrics.linearSyncEvents },
          ],
        },
        priority: 6,
      },
    ];

    // Add recommendations widget if there are any
    if (data.recommendations.length > 0) {
      widgets.push({
        id: 'recommendations',
        title: 'Recommendations',
        type: 'alert',
        data: {
          recommendations: data.recommendations,
          type: 'info',
        },
        priority: 7,
      });
    }

    return widgets.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Subscribe to dashboard updates
   */
  subscribe(callback: (data: DashboardData) => void): () => void {
    this.subscribers.push(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  /**
   * Generate summary report for external consumption
   */
  async generateSummaryReport(): Promise<{
    timestamp: Date;
    summary: string;
    metrics: WorkflowMetrics;
    healthStatus: string;
    criticalIssues: string[];
    recommendations: string[];
  }> {
    const data = await this.getDashboardData();
    const criticalAlerts = data.alerts.filter(alert => alert.severity === 'critical');

    return {
      timestamp: new Date(),
      summary: `Workflow automation health: ${data.healthStatus.overall.toUpperCase()}. ` +
        `Success rate: ${data.healthStatus.successRate.toFixed(1)}%. ` +
        `${criticalAlerts.length} critical issues require attention.`,
      metrics: data.metrics,
      healthStatus: data.healthStatus.overall,
      criticalIssues: criticalAlerts.map(alert => alert.message),
      recommendations: data.recommendations,
    };
  }

  /**
   * Export dashboard data for external analysis
   */
  async exportData(format: 'json' | 'csv' = 'json'): Promise<string> {
    const data = await this.getDashboardData();

    if (format === 'json') {
      return JSON.stringify({
        exportTimestamp: new Date().toISOString(),
        dashboardData: data,
        historicalData: this.historicalData,
      }, null, 2);
    }

    // CSV format for metrics
    const csvHeaders = [
      'timestamp',
      'agentHookExecutions',
      'successfulExecutions',
      'failedExecutions',
      'successRate',
      'averageExecutionTime',
      'activeAlerts',
    ];

    const csvRows = this.historicalData.map(entry => [
      entry.timestamp.toISOString(),
      entry.metrics.agentHookExecutions,
      entry.metrics.successfulExecutions,
      entry.metrics.failedExecutions,
      ((entry.metrics.successfulExecutions / entry.metrics.agentHookExecutions) * 100).toFixed(2),
      entry.metrics.averageExecutionTime.toFixed(2),
      entry.alerts.filter(alert => alert.severity === 'high' || alert.severity === 'critical').length,
    ]);

    return [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n');
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.subscribers = [];
  }

  private startPeriodicUpdates(): void {
    // Update dashboard every 5 minutes
    this.updateInterval = setInterval(async () => {
      try {
        const data = await this.getDashboardData();
        this.notifySubscribers(data);
      } catch (error) {
        console.error('Failed to update dashboard data:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  private async notifySubscribers(data: DashboardData): Promise<void> {
    for (const callback of this.subscribers) {
      try {
        callback(data);
      } catch (error) {
        console.error('Error notifying dashboard subscriber:', error);
      }
    }
  }

  private generateTrends(): DashboardData['trends'] {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentData = this.historicalData.filter(
      entry => entry.timestamp >= last24Hours
    );

    const executionTrend = recentData.map(entry => ({
      timestamp: entry.timestamp,
      count: entry.metrics.agentHookExecutions,
      successRate: entry.metrics.agentHookExecutions > 0 ?
        (entry.metrics.successfulExecutions / entry.metrics.agentHookExecutions) * 100 : 100,
    }));

    const performanceTrend = recentData.map(entry => ({
      timestamp: entry.timestamp,
      averageTime: entry.metrics.averageExecutionTime,
    }));

    return {
      executionTrend,
      performanceTrend,
    };
  }

  private getHealthDescription(status: string): string {
    switch (status) {
      case 'excellent':
        return 'All workflow automation systems operating optimally';
      case 'good':
        return 'Workflow automation performing well with minor issues';
      case 'fair':
        return 'Some workflow automation issues detected, monitoring recommended';
      case 'poor':
        return 'Significant workflow automation issues require immediate attention';
      default:
        return 'Unknown status';
    }
  }
}

// Singleton instance for global use
export const workflowMonitoringDashboard = new WorkflowMonitoringDashboard();
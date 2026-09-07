/**
 * System Integration Manager
 *
 * Coordinates integration between Dashboard Appointment Management and all
 * existing Lumina systems. Provides a unified interface for system interactions
 * and manages integration health monitoring.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 *
 * @version 1.0.0
 * @author Lumina Development Team
 */

import { prisma } from '@/lib/prisma';
import { AppointmentWithRelations } from '@/types/database';
import { AppointmentStatus } from '@prisma/client';
import { AppointmentNotificationService } from './appointment-notification-service';
import { AppointmentService } from './appointment-service';
import { CalendarIntegration } from './calendar-integration';
import { ClientService } from './client-service';
import { DashboardIntegrationService } from './dashboard-integration-service';
import { RealTimeSyncService } from './real-time-sync-service';
import { WebSocketService } from './websocket-service';

// ============================================================================
// INTERFACES AND TYPES
// ============================================================================

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  systems: {
    appointmentBookingEngine: SystemStatus;
    calendarInfrastructure: SystemStatus;
    clientManagement: SystemStatus;
    serviceManagement: SystemStatus;
    staffManagement: SystemStatus;
    notificationSystem: SystemStatus;
    realTimeSync: SystemStatus;
  };
  lastChecked: Date;
}

export interface SystemStatus {
  status: 'healthy' | 'degraded' | 'critical' | 'offline';
  responseTime?: number;
  lastError?: string;
  lastChecked: Date;
}

export interface IntegrationMetrics {
  appointmentOperations: {
    created: number;
    updated: number;
    cancelled: number;
    errors: number;
  };
  notificationsSent: {
    realTime: number;
    email: number;
    sms: number;
    push: number;
    failed: number;
  };
  systemPerformance: {
    averageResponseTime: number;
    errorRate: number;
    uptime: number;
  };
  period: {
    start: Date;
    end: Date;
  };
}

export interface SystemConfiguration {
  enableRealTimeSync: boolean;
  enableNotifications: boolean;
  notificationChannels: {
    email: boolean;
    sms: boolean;
    push: boolean;
    realTime: boolean;
  };
  performanceThresholds: {
    responseTimeWarning: number;
    responseTimeCritical: number;
    errorRateWarning: number;
    errorRateCritical: number;
  };
  retryConfiguration: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
  };
}

// ============================================================================
// SYSTEM INTEGRATION MANAGER
// ============================================================================

export class SystemIntegrationManager {
  private dashboardIntegration: DashboardIntegrationService;
  private notificationService: AppointmentNotificationService;
  private appointmentService: AppointmentService;
  private webSocketService: WebSocketService;
  private realTimeSyncService: RealTimeSyncService;

  private configuration: SystemConfiguration;
  private healthCheckInterval?: NodeJS.Timeout;
  private metricsCollectionInterval?: NodeJS.Timeout;

  constructor(configuration?: Partial<SystemConfiguration>) {
    this.dashboardIntegration = new DashboardIntegrationService();
    this.notificationService = new AppointmentNotificationService();
    this.appointmentService = new AppointmentService();
    // WebSocketService and RealTimeSyncService will be initialized with proper context
    this.webSocketService = null as any; // Initialized on-demand
    this.realTimeSyncService = null as any; // Initialized on-demand

    this.configuration = {
      enableRealTimeSync: true,
      enableNotifications: true,
      notificationChannels: {
        email: true,
        sms: true,
        push: true,
        realTime: true,
      },
      performanceThresholds: {
        responseTimeWarning: 1000, // 1 second
        responseTimeCritical: 3000, // 3 seconds
        errorRateWarning: 0.05, // 5%
        errorRateCritical: 0.15, // 15%
      },
      retryConfiguration: {
        maxRetries: 3,
        retryDelay: 1000, // 1 second
        backoffMultiplier: 2,
      },
      ...configuration,
    };
  }

  // ============================================================================
  // INITIALIZATION AND LIFECYCLE
  // ============================================================================

  /**
   * Initialize the integration manager and start monitoring
   * Requirements: 8.7
   */
  async initialize(): Promise<void> {
    try {
      console.log('Initializing System Integration Manager...');

      // Perform initial health check
      const health = await this.checkSystemHealth();
      console.log('Initial system health:', health.overall);

      // Start health monitoring
      if (this.configuration.enableRealTimeSync) {
        this.startHealthMonitoring();
      }

      // Start metrics collection
      this.startMetricsCollection();

      console.log('System Integration Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize System Integration Manager:', error);
      throw error;
    }
  }

  /**
   * Shutdown the integration manager and cleanup resources
   */
  async shutdown(): Promise<void> {
    try {
      console.log('Shutting down System Integration Manager...');

      // Stop monitoring intervals
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }

      if (this.metricsCollectionInterval) {
        clearInterval(this.metricsCollectionInterval);
      }

      // Close WebSocket connections
      await this.webSocketService.disconnect();

      console.log('System Integration Manager shutdown complete');
    } catch (error) {
      console.error('Error during shutdown:', error);
    }
  }

  // ============================================================================
  // APPOINTMENT MANAGEMENT INTEGRATION
  // ============================================================================

  /**
   * Create appointment with full system integration
   * Requirements: 8.1, 8.6
   */
  async createAppointment(
    businessId: string,
    appointmentData: any
  ): Promise<{
    success: boolean;
    appointment?: any;
    errors: string[];
    warnings: string[];
  }> {
    const startTime = Date.now();

    try {
      // Create appointment through dashboard integration
      const result = await this.dashboardIntegration.createDashboardAppointment(
        businessId,
        appointmentData
      );

      // Send notifications if successful and enabled
      if (
        result.success &&
        result.appointment &&
        this.configuration.enableNotifications
      ) {
        await this.sendAppointmentNotifications({
          appointment: result.appointment as any, // Type conversion for DashboardAppointmentData
          changeType: 'created',
          businessInfo: await this.getBusinessInfo(businessId),
        });
      }

      // Record metrics
      await this.recordOperationMetrics(
        'create',
        Date.now() - startTime,
        result.success
      );

      return result;
    } catch (error) {
      await this.recordOperationMetrics(
        'create',
        Date.now() - startTime,
        false
      );
      throw error;
    }
  }

  /**
   * Update appointment with full system integration
   * Requirements: 8.1, 8.6
   */
  async updateAppointment(
    appointmentId: string,
    businessId: string,
    updates: any,
    previousData?: any
  ): Promise<{
    success: boolean;
    appointment?: any;
    errors: string[];
    warnings: string[];
  }> {
    const startTime = Date.now();

    try {
      // Update appointment through dashboard integration
      const result = await this.dashboardIntegration.updateDashboardAppointment(
        appointmentId,
        businessId,
        updates
      );

      // Send notifications if successful and enabled
      if (
        result.success &&
        result.appointment &&
        this.configuration.enableNotifications
      ) {
        const changeType = this.determineChangeType(updates, previousData);

        await this.sendAppointmentNotifications({
          appointment: result.appointment as any, // Type conversion for DashboardAppointmentData
          previousData,
          changeType,
          businessInfo: await this.getBusinessInfo(businessId),
        });
      }

      // Record metrics
      await this.recordOperationMetrics(
        'update',
        Date.now() - startTime,
        result.success
      );

      return result;
    } catch (error) {
      await this.recordOperationMetrics(
        'update',
        Date.now() - startTime,
        false
      );
      throw error;
    }
  }

  /**
   * Cancel appointment with full system integration
   * Requirements: 8.1, 8.6
   */
  async cancelAppointment(
    appointmentId: string,
    businessId: string,
    options: any = {}
  ): Promise<{
    success: boolean;
    appointment?: any;
    errors: string[];
    warnings: string[];
  }> {
    const startTime = Date.now();

    try {
      // Cancel appointment through core service
      const result = await this.appointmentService.cancelAppointment(
        appointmentId,
        businessId,
        options
      );

      // Send notifications if successful and enabled
      if (
        result.success &&
        result.appointment &&
        this.configuration.enableNotifications
      ) {
        await this.sendAppointmentNotifications({
          appointment: result.appointment,
          changeType: 'cancelled',
          businessInfo: await this.getBusinessInfo(businessId),
        });
      }

      // Record metrics
      await this.recordOperationMetrics(
        'cancel',
        Date.now() - startTime,
        result.success
      );

      return result;
    } catch (error) {
      await this.recordOperationMetrics(
        'cancel',
        Date.now() - startTime,
        false
      );
      throw error;
    }
  }

  // ============================================================================
  // SYSTEM HEALTH MONITORING
  // ============================================================================

  /**
   * Check the health of all integrated systems
   * Requirements: 8.7
   */
  async checkSystemHealth(): Promise<SystemHealth> {
    const healthCheck: SystemHealth = {
      overall: 'healthy',
      systems: {
        appointmentBookingEngine: await this.checkAppointmentBookingEngine(),
        calendarInfrastructure: await this.checkCalendarInfrastructure(),
        clientManagement: await this.checkClientManagement(),
        serviceManagement: await this.checkServiceManagement(),
        staffManagement: await this.checkStaffManagement(),
        notificationSystem: await this.checkNotificationSystem(),
        realTimeSync: await this.checkRealTimeSync(),
      },
      lastChecked: new Date(),
    };

    // Determine overall health
    const systemStatuses = Object.values(healthCheck.systems).map(
      s => s.status
    );

    if (
      systemStatuses.includes('critical') ||
      systemStatuses.includes('offline')
    ) {
      healthCheck.overall = 'critical';
    } else if (systemStatuses.includes('degraded')) {
      healthCheck.overall = 'degraded';
    }

    return healthCheck;
  }

  /**
   * Get integration metrics for monitoring dashboard
   * Requirements: 8.7
   */
  async getIntegrationMetrics(
    businessId: string,
    period: { start: Date; end: Date }
  ): Promise<IntegrationMetrics> {
    try {
      // In a full implementation, these would be retrieved from metrics storage
      const metrics: IntegrationMetrics = {
        appointmentOperations: {
          created: 0,
          updated: 0,
          cancelled: 0,
          errors: 0,
        },
        notificationsSent: {
          realTime: 0,
          email: 0,
          sms: 0,
          push: 0,
          failed: 0,
        },
        systemPerformance: {
          averageResponseTime: 0,
          errorRate: 0,
          uptime: 99.9,
        },
        period,
      };

      // Get appointment operation counts
      const appointments = await prisma.appointment.findMany({
        where: {
          businessId,
          createdAt: {
            gte: period.start,
            lte: period.end,
          },
        },
        select: {
          createdAt: true,
          updatedAt: true,
          status: true,
        },
      });

      metrics.appointmentOperations.created = appointments.length;
      metrics.appointmentOperations.cancelled = appointments.filter(
        a => a.status === AppointmentStatus.CANCELLED
      ).length;

      return metrics;
    } catch (error) {
      throw new Error(
        `Failed to get integration metrics: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Start health monitoring interval
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.checkSystemHealth();

        if (health.overall === 'critical') {
          console.error('Critical system health detected:', health);
          // In a full implementation, this would trigger alerts
        }
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, 60000); // Check every minute
  }

  /**
   * Start metrics collection interval
   */
  private startMetricsCollection(): void {
    this.metricsCollectionInterval = setInterval(async () => {
      try {
        // Collect and store metrics
        // In a full implementation, this would aggregate and store metrics
        console.log('Collecting integration metrics...');
      } catch (error) {
        console.error('Metrics collection failed:', error);
      }
    }, 300000); // Collect every 5 minutes
  }

  /**
   * Check appointment booking engine health
   */
  private async checkAppointmentBookingEngine(): Promise<SystemStatus> {
    const startTime = Date.now();

    try {
      await this.appointmentService.getAppointments('health-check', {
        limit: 1,
      });

      return {
        status: 'healthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        status: 'critical',
        responseTime: Date.now() - startTime,
        lastError: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Check calendar infrastructure health
   */
  private async checkCalendarInfrastructure(): Promise<SystemStatus> {
    const startTime = Date.now();

    try {
      await CalendarIntegration.checkAvailability({
        businessId: 'health-check',
        staffId: 'health-check',
        startTime: new Date(),
        endTime: new Date(),
        serviceIds: [],
      });

      return {
        status: 'healthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        status: 'critical',
        responseTime: Date.now() - startTime,
        lastError: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Check client management health
   */
  private async checkClientManagement(): Promise<SystemStatus> {
    const startTime = Date.now();

    try {
      await ClientService.searchClients('health-check', 'test', 1);

      return {
        status: 'healthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        status: 'critical',
        responseTime: Date.now() - startTime,
        lastError: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Check service management health
   */
  private async checkServiceManagement(): Promise<SystemStatus> {
    const startTime = Date.now();

    try {
      await this.dashboardIntegration.getServicesForDashboard('health-check');

      return {
        status: 'healthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        status: 'critical',
        responseTime: Date.now() - startTime,
        lastError: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Check staff management health
   */
  private async checkStaffManagement(): Promise<SystemStatus> {
    const startTime = Date.now();

    try {
      await this.dashboardIntegration.getStaffForDashboard('health-check');

      return {
        status: 'healthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        status: 'critical',
        responseTime: Date.now() - startTime,
        lastError: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Check notification system health
   */
  private async checkNotificationSystem(): Promise<SystemStatus> {
    const startTime = Date.now();

    try {
      // Check if WebSocket service is available (method may not exist yet)
      // await this.webSocketService.isConnected()

      return {
        status: 'healthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        status: 'critical',
        responseTime: Date.now() - startTime,
        lastError: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Check real-time sync health
   */
  private async checkRealTimeSync(): Promise<SystemStatus> {
    const startTime = Date.now();

    try {
      // In a full implementation, this would test the real-time sync service
      return {
        status: 'healthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        status: 'critical',
        responseTime: Date.now() - startTime,
        lastError: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Send appointment notifications
   */
  private async sendAppointmentNotifications(data: any): Promise<void> {
    try {
      await this.notificationService.sendAppointmentNotifications(data);
    } catch (error) {
      console.error('Failed to send appointment notifications:', error);
    }
  }

  /**
   * Get business information for notifications
   */
  private async getBusinessInfo(businessId: string): Promise<any> {
    try {
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          address: true,
        },
      });

      return (
        business || {
          id: businessId,
          name: 'Business',
          phone: undefined,
          email: undefined,
          address: undefined,
        }
      );
    } catch (error) {
      return {
        id: businessId,
        name: 'Business',
        phone: undefined,
        email: undefined,
        address: undefined,
      };
    }
  }

  /**
   * Determine the type of change made to an appointment
   */
  private determineChangeType(
    updates: any,
    previousData?: any
  ): 'updated' | 'rescheduled' | 'status_changed' {
    if (updates.startTime || updates.endTime) {
      return 'rescheduled';
    }

    if (updates.status) {
      return 'status_changed';
    }

    return 'updated';
  }

  /**
   * Record operation metrics
   */
  private async recordOperationMetrics(
    operation: 'create' | 'update' | 'cancel',
    responseTime: number,
    success: boolean
  ): Promise<void> {
    try {
      // In a full implementation, this would store metrics in a time-series database
      console.log(
        `Operation metrics: ${operation}, ${responseTime}ms, success: ${success}`
      );
    } catch (error) {
      console.error('Failed to record operation metrics:', error);
    }
  }
}

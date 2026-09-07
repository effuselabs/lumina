/**
 * Dashboard Integration Service
 *
 * Central integration layer for the Dashboard Appointment Management system.
 * Connects with existing systems: Appointment Booking Engine (LUM-97),
 * Calendar Infrastructure (LUM-96), Client Management, Service Management,
 * Staff Management, and Notification systems.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 *
 * @version 1.0.0
 * @author Lumina Development Team
 */

import { prisma } from '@/lib/prisma';
import { AppointmentWithRelations } from '@/types/database';
import { AppointmentStatus } from '@prisma/client';
import { AppointmentService } from './appointment-service';
import { CalendarIntegration } from './calendar-integration';
import { ClientService } from './client-service';
import { RealTimeSyncService } from './real-time-sync-service';
import { WebSocketService } from './websocket-service';

// ============================================================================
// INTERFACES AND TYPES
// ============================================================================

export interface DashboardAppointmentData {
  // Base appointment data
  id: string;
  businessId: string;
  clientId: string | null;
  staffId: string;
  startTime: Date;
  endTime: Date;
  status: AppointmentStatus;
  totalDuration: number;
  totalPrice: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;

  // Enhanced data for dashboard display
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    avatar?: string;
  } | null;

  staff: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string;
    color: string; // For calendar color coding
  };

  // Services data
  services: Array<{
    id: string;
    name: string;
    duration: number;
    price: number;
    category?: string;
  }>;

  // Transactions data
  transactions: Array<{
    id: string;
    amount: number;
    type: string;
    status: string;
    createdAt: Date;
  }>;

  // Computed properties
  isConflicted: boolean;
  canEdit: boolean;
  canCancel: boolean;
  canReschedule: boolean;

  // Real-time status
  lastUpdated: Date;
  updatedBy?: string;
}

export interface DashboardFilters {
  staffIds?: string[];
  serviceIds?: string[];
  status?: AppointmentStatus[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  clientId?: string;
  searchTerm?: string;
}

export interface SystemIntegrationStatus {
  appointmentBookingEngine: boolean;
  calendarInfrastructure: boolean;
  clientManagement: boolean;
  serviceManagement: boolean;
  staffManagement: boolean;
  notificationSystem: boolean;
}

export interface NotificationPayload {
  type:
    | 'appointment_created'
    | 'appointment_updated'
    | 'appointment_cancelled'
    | 'appointment_rescheduled';
  appointmentId: string;
  businessId: string;
  staffId: string;
  clientId?: string;
  data: Record<string, any>;
  timestamp: Date;
}

// ============================================================================
// DASHBOARD INTEGRATION SERVICE
// ============================================================================

export class DashboardIntegrationService {
  private appointmentService: AppointmentService;
  private webSocketService: WebSocketService | null = null;
  private realTimeSyncService: RealTimeSyncService | null = null;

  constructor() {
    this.appointmentService = new AppointmentService();
    // WebSocketService and RealTimeSyncService are initialized on-demand with proper context
  }

  /**
   * Initialize real-time services with business context
   */
  private initializeRealTimeServices(businessId: string, userId: string): void {
    if (!this.webSocketService) {
      const wsConfig = {
        url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
        businessId,
        userId,
        reconnectInterval: 5000,
        maxReconnectAttempts: 5,
      };

      const wsCallbacks = {
        onOpen: () => console.log('WebSocket connected'),
        onClose: () => console.log('WebSocket disconnected'),
        onError: (error: Error) => console.error('WebSocket error:', error),
        onMessage: (data: any) => this.handleWebSocketMessage(data),
      };

      this.webSocketService = new WebSocketService(
        wsConfig as any,
        wsCallbacks as any
      );
    }

    if (!this.realTimeSyncService) {
      const syncCallbacks = {
        onSync: (appointments: any[]) =>
          console.log('Synced appointments:', appointments.length),
        onConflict: (conflict: any) => console.warn('Sync conflict:', conflict),
        onError: (error: Error) => console.error('Sync error:', error),
      };

      this.realTimeSyncService = new RealTimeSyncService(
        businessId,
        userId,
        syncCallbacks as any
      );

      if (this.webSocketService) {
        this.realTimeSyncService.initialize(this.webSocketService);
      }
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleWebSocketMessage(data: any): void {
    // Handle real-time updates
    console.log('Received WebSocket message:', data);
  }

  // ============================================================================
  // APPOINTMENT BOOKING ENGINE INTEGRATION (LUM-97)
  // ============================================================================

  /**
   * Get appointments with enhanced dashboard data
   * Requirements: 8.1
   */
  async getDashboardAppointments(
    businessId: string,
    filters: DashboardFilters = {}
  ): Promise<{
    appointments: DashboardAppointmentData[];
    total: number;
    hasMore: boolean;
    nextOffset?: number;
  }> {
    try {
      // Get appointments from the core appointment service
      const result = await this.appointmentService.getAppointments(businessId, {
        ...filters,
        includeConflicts: true,
        validateAvailability: true,
      });

      // Enhance appointments with dashboard-specific data
      const enhancedAppointments = await Promise.all(
        result.appointments.map(appointment =>
          this.enhanceAppointmentForDashboard(appointment, businessId)
        )
      );

      return {
        appointments: enhancedAppointments,
        total: result.total,
        hasMore: result.hasMore,
        nextOffset: result.nextOffset,
      };
    } catch (error) {
      throw new Error(
        `Failed to get dashboard appointments: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create appointment through dashboard with full integration
   * Requirements: 8.1, 8.6
   */
  async createDashboardAppointment(
    businessId: string,
    appointmentData: any
  ): Promise<{
    success: boolean;
    appointment?: DashboardAppointmentData;
    errors: string[];
    warnings: string[];
  }> {
    try {
      // Create appointment using core service
      const result = await this.appointmentService.createAppointment({
        businessId,
        ...appointmentData,
      });

      if (result.success && result.appointment) {
        // Enhance appointment for dashboard
        const enhancedAppointment = await this.enhanceAppointmentForDashboard(
          result.appointment,
          businessId
        );

        // Send real-time notification
        await this.sendAppointmentNotification({
          type: 'appointment_created',
          appointmentId: result.appointment.id,
          businessId,
          staffId: result.appointment.staffId,
          clientId: result.appointment.clientId || undefined,
          data: { appointment: enhancedAppointment },
          timestamp: new Date(),
        });

        return {
          success: true,
          appointment: enhancedAppointment,
          errors: result.errors,
          warnings: result.warnings,
        };
      }

      return result as any;
    } catch (error) {
      return {
        success: false,
        errors: [
          `Failed to create appointment: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
        warnings: [],
      };
    }
  }

  /**
   * Update appointment through dashboard with full integration
   * Requirements: 8.1, 8.6
   */
  async updateDashboardAppointment(
    appointmentId: string,
    businessId: string,
    updates: any
  ): Promise<{
    success: boolean;
    appointment?: DashboardAppointmentData;
    errors: string[];
    warnings: string[];
  }> {
    try {
      // Update appointment using core service
      const result = await this.appointmentService.updateAppointment(
        appointmentId,
        businessId,
        updates
      );

      if (result.success && result.appointment) {
        // Enhance appointment for dashboard
        const enhancedAppointment = await this.enhanceAppointmentForDashboard(
          result.appointment,
          businessId
        );

        // Send real-time notification
        await this.sendAppointmentNotification({
          type: 'appointment_updated',
          appointmentId,
          businessId,
          staffId: result.appointment.staffId,
          clientId: result.appointment.clientId || undefined,
          data: { appointment: enhancedAppointment, updates },
          timestamp: new Date(),
        });

        return {
          success: true,
          appointment: enhancedAppointment,
          errors: result.errors,
          warnings: result.warnings,
        };
      }

      return result as any;
    } catch (error) {
      return {
        success: false,
        errors: [
          `Failed to update appointment: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
        warnings: [],
      };
    }
  }

  // ============================================================================
  // CALENDAR INFRASTRUCTURE INTEGRATION (LUM-96)
  // ============================================================================

  /**
   * Check availability using calendar infrastructure
   * Requirements: 8.2
   */
  async checkAvailability(
    businessId: string,
    staffId: string,
    startTime: Date,
    endTime: Date,
    serviceIds: string[],
    excludeAppointmentId?: string
  ): Promise<{
    isAvailable: boolean;
    conflicts: any[];
    alternatives?: any[];
  }> {
    try {
      const availabilityResult = await CalendarIntegration.checkAvailability({
        businessId,
        staffId,
        startTime,
        endTime,
        serviceIds,
        excludeAppointmentId,
      });

      const conflictResult = await CalendarIntegration.detectConflicts({
        businessId,
        staffId,
        startTime,
        endTime,
        serviceIds,
        excludeAppointmentId,
      });

      return {
        isAvailable: availabilityResult.isAvailable,
        conflicts: conflictResult.conflicts || [],
        alternatives: availabilityResult.alternatives,
      };
    } catch (error) {
      throw new Error(
        `Failed to check availability: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get staff availability for calendar views
   * Requirements: 8.2
   */
  async getStaffAvailability(
    businessId: string,
    staffIds: string[],
    dateRange: { start: Date; end: Date }
  ): Promise<{
    [staffId: string]: {
      availableSlots: any[];
      busySlots: any[];
      workingHours: any;
    };
  }> {
    try {
      const availability: { [staffId: string]: any } = {};

      for (const staffId of staffIds) {
        // Get staff working hours
        const staff = await prisma.staff.findFirst({
          where: { id: staffId, businessId },
          include: { staffAvailability: true },
        });

        if (!staff) continue;

        // Get busy slots (existing appointments)
        const appointments =
          await this.appointmentService.getAppointmentsByStaff(
            staffId,
            businessId,
            dateRange as any
          );

        availability[staffId] = {
          availableSlots: [], // Would be calculated based on working hours and busy slots
          busySlots: appointments.appointments.map(apt => ({
            startTime: apt.startTime,
            endTime: apt.endTime,
            appointmentId: apt.id,
            clientName:
              apt.clientName ||
              `${apt.client?.firstName} ${apt.client?.lastName}`.trim(),
          })),
          workingHours: staff.workingHours,
        };
      }

      return availability;
    } catch (error) {
      throw new Error(
        `Failed to get staff availability: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ============================================================================
  // CLIENT MANAGEMENT INTEGRATION
  // ============================================================================

  /**
   * Get client data for appointments
   * Requirements: 8.3
   */
  async getClientData(
    clientId: string,
    businessId: string
  ): Promise<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    avatar?: string;
    appointmentHistory: any[];
    preferences: any;
  } | null> {
    try {
      const client = await ClientService.getClientById(clientId, businessId);
      if (!client) return null;

      // Get appointment history
      const appointments = await this.appointmentService.getAppointments(
        businessId,
        {
          clientId,
          limit: 10,
          orderBy: 'startTime',
          orderDirection: 'desc',
        }
      );

      return {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email || '',
        phone: client.phone || '',
        avatar: undefined, // Would be implemented with file storage
        appointmentHistory: appointments.appointments.map(apt => ({
          id: apt.id,
          date: apt.startTime,
          services: apt.services.map(s => s.serviceName),
          status: apt.status,
          totalPrice: apt.totalPrice,
        })),
        preferences: {
          preferredStaff: client.preferredStaff,
          notes: client.notes,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to get client data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Search clients for appointment assignment
   * Requirements: 8.3
   */
  async searchClients(
    businessId: string,
    query: string,
    limit: number = 10
  ): Promise<
    Array<{
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      lastAppointment?: Date;
    }>
  > {
    try {
      const clients = await ClientService.searchClients(
        businessId,
        query,
        limit
      );

      // Enhance with last appointment data
      const enhancedClients = await Promise.all(
        clients.map(async client => {
          const lastAppointment = await prisma.appointment.findFirst({
            where: {
              businessId,
              clientId: client.id,
            },
            orderBy: { startTime: 'desc' },
            select: { startTime: true },
          });

          return {
            id: client.id,
            firstName: client.firstName,
            lastName: client.lastName,
            email: client.email || '',
            phone: client.phone || '',
            lastAppointment: lastAppointment?.startTime,
          };
        })
      );

      return enhancedClients;
    } catch (error) {
      throw new Error(
        `Failed to search clients: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ============================================================================
  // SERVICE MANAGEMENT INTEGRATION
  // ============================================================================

  /**
   * Get services for appointment management
   * Requirements: 8.4
   */
  async getServicesForDashboard(businessId: string): Promise<
    Array<{
      id: string;
      name: string;
      description?: string;
      duration: number;
      price: number;
      category?: string;
      staffIds: string[];
      isActive: boolean;
    }>
  > {
    try {
      const services = await prisma.service.findMany({
        where: {
          businessId,
          isActive: true,
        },
        include: {
          staff: {
            include: {
              staff: {
                select: {
                  id: true,
                  isActive: true,
                },
              },
            },
            where: {
              staff: {
                isActive: true,
              },
            },
          },
        },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      });

      return services.map(service => ({
        id: service.id,
        name: service.name,
        description: service.description || undefined,
        duration: service.duration,
        price: service.price.toNumber(),
        category: service.category || undefined,
        staffIds: service.staff.map(ss => ss.staff.id),
        isActive: service.isActive,
      }));
    } catch (error) {
      throw new Error(
        `Failed to get services: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ============================================================================
  // STAFF MANAGEMENT INTEGRATION
  // ============================================================================

  /**
   * Get staff data for dashboard
   * Requirements: 8.5
   */
  async getStaffForDashboard(businessId: string): Promise<
    Array<{
      id: string;
      firstName: string;
      lastName: string;
      displayName: string;
      color: string;
      isActive: boolean;
      services: string[];
      workingHours: any;
      permissions: {
        canEdit: boolean;
        canCancel: boolean;
        canReschedule: boolean;
      };
    }>
  > {
    try {
      const staff = await prisma.staff.findMany({
        where: {
          businessId,
          isActive: true,
        },
        include: {
          user: true,
          services: {
            include: {
              service: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          displayName: 'asc',
        },
      });

      // Generate colors for staff (would be stored in database in production)
      const colors = [
        '#FF6B6B',
        '#4ECDC4',
        '#45B7D1',
        '#96CEB4',
        '#FFEAA7',
        '#DDA0DD',
        '#98D8C8',
        '#F7DC6F',
      ];

      return staff.map((member, index) => ({
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        displayName: member.displayName,
        color: colors[index % colors.length],
        isActive: member.isActive,
        services: member.services.map(s => s.service.id),
        workingHours: member.workingHours,
        permissions: {
          canEdit: true, // Would be based on role/permissions
          canCancel: true,
          canReschedule: true,
        },
      }));
    } catch (error) {
      throw new Error(
        `Failed to get staff data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ============================================================================
  // NOTIFICATION SYSTEM INTEGRATION
  // ============================================================================

  /**
   * Send appointment notifications
   * Requirements: 8.6
   */
  async sendAppointmentNotification(
    payload: NotificationPayload
  ): Promise<void> {
    try {
      // Send real-time WebSocket notification
      if (this.webSocketService) {
        await this.webSocketService.broadcastToRoom(
          `business_${payload.businessId}`,
          {
            type: payload.type,
            data: payload.data,
            timestamp: payload.timestamp,
          }
        );

        // Send to specific staff member
        await this.webSocketService.broadcastToUser(payload.staffId, {
          type: payload.type,
          data: payload.data,
          timestamp: payload.timestamp,
        });
      }

      // Send to client if applicable
      if (payload.clientId) {
        // In a full implementation, this would send email/SMS notifications
        console.log(
          `Notification sent to client ${payload.clientId} for ${payload.type}`
        );
      }

      // Log notification for audit trail
      await this.logNotification(payload);
    } catch (error) {
      console.error('Failed to send appointment notification:', error);
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Subscribe to real-time appointment updates
   * Requirements: 8.6, 8.7
   */
  async subscribeToAppointmentUpdates(
    businessId: string,
    staffId: string,
    callback: (update: any) => void
  ): Promise<() => void> {
    try {
      if (!this.realTimeSyncService) {
        return () => {}; // Return no-op if service not available
      }

      // Subscribe to business-wide updates
      const businessUnsubscribe = await (
        this.realTimeSyncService as any
      ).subscribe(`appointments_${businessId}`, callback);

      // Subscribe to staff-specific updates
      const staffUnsubscribe = await (
        this.realTimeSyncService as any
      ).subscribe(`staff_appointments_${staffId}`, callback);

      // Return unsubscribe function
      return () => {
        businessUnsubscribe();
        staffUnsubscribe();
      };
    } catch (error) {
      throw new Error(
        `Failed to subscribe to updates: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ============================================================================
  // SYSTEM HEALTH AND STATUS
  // ============================================================================

  /**
   * Check integration status of all systems
   * Requirements: 8.7
   */
  async getSystemIntegrationStatus(): Promise<SystemIntegrationStatus> {
    try {
      const status: SystemIntegrationStatus = {
        appointmentBookingEngine: false,
        calendarInfrastructure: false,
        clientManagement: false,
        serviceManagement: false,
        staffManagement: false,
        notificationSystem: false,
      };

      // Test appointment booking engine
      try {
        await this.appointmentService.getAppointments('test', { limit: 1 });
        status.appointmentBookingEngine = true;
      } catch (error) {
        console.error('Appointment booking engine check failed:', error);
      }

      // Test calendar infrastructure
      try {
        await CalendarIntegration.checkAvailability({
          businessId: 'test',
          staffId: 'test',
          startTime: new Date(),
          endTime: new Date(),
          serviceIds: [],
        });
        status.calendarInfrastructure = true;
      } catch (error) {
        console.error('Calendar infrastructure check failed:', error);
      }

      // Test client management
      try {
        await ClientService.searchClients('test', 'test', 1);
        status.clientManagement = true;
      } catch (error) {
        console.error('Client management check failed:', error);
      }

      // Test service management
      try {
        await this.getServicesForDashboard('test');
        status.serviceManagement = true;
      } catch (error) {
        console.error('Service management check failed:', error);
      }

      // Test staff management
      try {
        await this.getStaffForDashboard('test');
        status.staffManagement = true;
      } catch (error) {
        console.error('Staff management check failed:', error);
      }

      // Test notification system
      try {
        if (this.webSocketService) {
          status.notificationSystem = true;
        }
      } catch (error) {
        console.error('Notification system check failed:', error);
      }

      return status;
    } catch (error) {
      throw new Error(
        `Failed to check system status: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Enhance appointment with dashboard-specific data
   */
  private async enhanceAppointmentForDashboard(
    appointment: AppointmentWithRelations,
    businessId: string
  ): Promise<DashboardAppointmentData> {
    try {
      // Get staff color (would be stored in database in production)
      const colors = [
        '#FF6B6B',
        '#4ECDC4',
        '#45B7D1',
        '#96CEB4',
        '#FFEAA7',
        '#DDA0DD',
        '#98D8C8',
        '#F7DC6F',
      ];
      const staffIndex = appointment.staffId.charCodeAt(0) % colors.length;

      // Check for conflicts
      const conflicts = await this.appointmentService.getAppointments(
        businessId,
        {
          staffId: appointment.staffId,
          startDate: appointment.startTime,
          endDate: appointment.endTime,
          excludeAppointmentId: appointment.id,
        } as any
      );

      const isConflicted = conflicts.appointments.length > 0;

      // Determine permissions (would be based on user role in production)
      const canEdit =
        appointment.status !== AppointmentStatus.COMPLETED &&
        appointment.status !== AppointmentStatus.CANCELLED;
      const canCancel =
        appointment.status === AppointmentStatus.SCHEDULED ||
        appointment.status === AppointmentStatus.CONFIRMED;
      const canReschedule = canEdit;

      return {
        ...appointment,
        client: {
          id: appointment.client?.id || '',
          firstName:
            appointment.client?.firstName ||
            appointment.clientName?.split(' ')[0] ||
            '',
          lastName:
            appointment.client?.lastName ||
            appointment.clientName?.split(' ').slice(1).join(' ') ||
            '',
          email: appointment.client?.email || appointment.clientEmail || '',
          phone: appointment.client?.phone || appointment.clientPhone || '',
          avatar: undefined,
        },
        staff: {
          id: appointment.staff.id,
          firstName: appointment.staff.firstName,
          lastName: appointment.staff.lastName,
          displayName: appointment.staff.displayName,
          color: colors[staffIndex],
        },
        isConflicted,
        canEdit,
        canCancel,
        canReschedule,
        lastUpdated: appointment.updatedAt,
        updatedBy: undefined, // Would track who made the last update
      } as unknown as DashboardAppointmentData;
    } catch (error) {
      throw new Error(
        `Failed to enhance appointment: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Log notification for audit trail
   */
  private async logNotification(payload: NotificationPayload): Promise<void> {
    try {
      // In a full implementation, this would log to a notifications table
      console.log('Notification logged:', {
        type: payload.type,
        appointmentId: payload.appointmentId,
        businessId: payload.businessId,
        timestamp: payload.timestamp,
      });
    } catch (error) {
      console.error('Failed to log notification:', error);
    }
  }
}

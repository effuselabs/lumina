/**
 * Core Appointment Service Layer
 *
 * This service integrates the appointment repository with calendar infrastructure
 * to provide comprehensive appointment CRUD operations, status management,
 * and multi-service booking support with real-time availability checking.
 *
 * Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 4.1, 4.2
 *
 * @version 1.0.0
 * @author Lumina Development Team
 */

import {
  AppointmentFilters,
  AppointmentRepository,
  CreateAppointmentRequest,
  DateRange,
  UpdateAppointmentRequest,
} from '@/lib/repositories/appointment-repository';
import { AppointmentStatusManager } from '@/lib/services/appointment-status-manager';
import {
  AvailabilityCheckRequest,
  CacheInvalidationRequest,
  CalendarIntegration,
  ConflictCheckRequest,
  DurationValidationRequest,
} from '@/lib/services/calendar-integration';
import {
  MultiServiceCoordinator,
  ServiceBookingRequest,
} from '@/lib/services/multi-service-coordinator';
import { notificationService } from '@/lib/email';
import { AppointmentWithRelations } from '@/types/database';
import { AppointmentStatus } from '@prisma/client';

// ============================================================================
// INTERFACES AND TYPES
// ============================================================================

export interface CreateAppointmentServiceRequest {
  businessId: string;
  clientId?: string;
  staffId: string;
  userId?: string;
  startTime: Date;
  endTime: Date;
  services: ServiceBookingRequest[];
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  notes?: string;
  internalNotes?: string;
  depositAmount?: number;
  depositPaid?: boolean;
}

export interface UpdateAppointmentServiceRequest {
  startTime?: Date;
  endTime?: Date;
  services?: ServiceBookingRequest[];
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  notes?: string;
  internalNotes?: string;
  depositAmount?: number;
  depositPaid?: boolean;
  status?: AppointmentStatus;
}

export interface AppointmentServiceResult {
  success: boolean;
  appointment?: AppointmentWithRelations;
  errors: string[];
  warnings: string[];
}

export interface AppointmentQueryOptions extends AppointmentFilters {
  includeConflicts?: boolean;
  validateAvailability?: boolean;
}

export interface CancelAppointmentOptions {
  reason?: string;
  refundAmount?: number;
  notifyClient?: boolean;
  changedBy?: string;
}

export interface AppointmentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  conflicts: Array<{
    appointmentId: string;
    startTime: Date;
    endTime: Date;
    clientName?: string;
  }>;
  alternatives?: Array<{
    startTime: Date;
    endTime: Date;
    staffId: string;
  }>;
}

// ============================================================================
// APPOINTMENT SERVICE
// ============================================================================

export class AppointmentService {
  private appointmentRepository: AppointmentRepository;
  private statusManager: AppointmentStatusManager;
  private multiServiceCoordinator: MultiServiceCoordinator;

  constructor() {
    this.appointmentRepository = new AppointmentRepository();
    this.statusManager = new AppointmentStatusManager();
    this.multiServiceCoordinator = new MultiServiceCoordinator();
  }

  /**
   * Creates a new appointment with full validation and conflict checking
   * Requirements: 1.1, 1.2, 1.3, 4.1, 4.2
   */
  async createAppointment(
    request: CreateAppointmentServiceRequest
  ): Promise<AppointmentServiceResult> {
    const result: AppointmentServiceResult = {
      success: false,
      errors: [],
      warnings: [],
    };

    try {
      // 1. Validate multi-service booking
      const serviceValidation =
        await this.multiServiceCoordinator.validateMultiServiceBooking(
          request.services,
          { startTime: request.startTime, endTime: request.endTime },
          request.staffId,
          request.businessId
        );

      if (!serviceValidation.isValid) {
        result.errors.push(...serviceValidation.errors);
        result.warnings.push(...serviceValidation.warnings);
        return result;
      }

      // 2. Check availability using calendar infrastructure
      const availabilityCheck: AvailabilityCheckRequest = {
        businessId: request.businessId,
        staffId: request.staffId,
        startTime: request.startTime,
        endTime: request.endTime,
        serviceIds: request.services.map(s => s.serviceId),
      };

      const availabilityResult =
        await CalendarIntegration.checkAvailability(availabilityCheck);

      if (!availabilityResult.isAvailable) {
        result.errors.push('Selected time slot is not available');
        if (availabilityResult.alternatives) {
          result.warnings.push(
            `Alternative times available: ${availabilityResult.alternatives.length} options`
          );
        }
        return result;
      }

      // 3. Detect conflicts using calendar infrastructure
      const conflictCheck: ConflictCheckRequest = {
        businessId: request.businessId,
        staffId: request.staffId,
        startTime: request.startTime,
        endTime: request.endTime,
        serviceIds: request.services.map(s => s.serviceId),
        clientId: request.clientId,
      };

      const conflictResult =
        await CalendarIntegration.detectConflicts(conflictCheck);

      if (conflictResult.hasConflicts) {
        result.errors.push('Appointment conflicts with existing bookings');
        result.errors.push(...conflictResult.conflicts.map(c => c.message));
        return result;
      }

      // Add warnings if any
      if (conflictResult.warnings.length > 0) {
        result.warnings.push(...conflictResult.warnings.map(w => w.message));
      }

      // 4. Validate service duration
      const durationValidation: DurationValidationRequest = {
        serviceIds: request.services.map(s => s.serviceId),
        timeSlot: { startTime: request.startTime, endTime: request.endTime },
        businessId: request.businessId,
        staffId: request.staffId,
      };

      const durationResult =
        await CalendarIntegration.validateServiceDuration(durationValidation);

      if (!durationResult.isValid) {
        result.errors.push(
          `Service duration validation failed: ${durationResult.reason}`
        );
        return result;
      }

      // 5. Calculate totals using optimized services
      const totalPrice = await this.multiServiceCoordinator.calculateTotalPrice(
        serviceValidation.optimizedServices,
        request.businessId,
        request.clientId
      );

      // 6. Create appointment using repository
      const createRequest: CreateAppointmentRequest = {
        businessId: request.businessId,
        clientId: request.clientId,
        staffId: request.staffId,
        userId: request.userId,
        startTime: request.startTime,
        endTime: request.endTime,
        totalDuration: serviceValidation.totalDuration,
        totalPrice: totalPrice.toNumber(),
        clientName: request.clientName,
        clientEmail: request.clientEmail,
        clientPhone: request.clientPhone,
        notes: request.notes,
        internalNotes: request.internalNotes,
        depositAmount: request.depositAmount,
        depositPaid: request.depositPaid,
        services: serviceValidation.optimizedServices.map(service => ({
          serviceId: service.serviceId,
          serviceName: service.serviceName,
          price: service.price,
          duration: service.duration,
          serviceOrder: service.serviceOrder,
          startOffset: service.startOffset,
          assignedStaffId: service.assignedStaffId,
        })),
      };

      const appointment =
        await this.appointmentRepository.create(createRequest);

      // 7. Invalidate availability cache
      await this.invalidateRelatedCaches(
        appointment.businessId,
        appointment.staffId,
        {
          startDate: appointment.startTime,
          endDate: appointment.endTime,
        }
      );

      // 8. Send notification emails (non-blocking)
      // Send booking confirmation to client
      if (appointment.clientEmail) {
        notificationService
          .sendBookingConfirmation(appointment.id, appointment.businessId)
          .catch(error => {
            console.error('Failed to send booking confirmation:', error);
            // Don't fail the appointment creation if notification fails
          });
      }

      // Send staff booking alert
      notificationService
        .sendStaffBookingAlert(
          appointment.id,
          appointment.staffId,
          appointment.businessId
        )
        .catch(error => {
          console.error('Failed to send staff booking alert:', error);
          // Don't fail the appointment creation if notification fails
        });

      result.success = true;
      result.appointment = appointment;
      result.warnings.push(...serviceValidation.warnings);

      return result;
    } catch (error) {
      result.errors.push(
        `Failed to create appointment: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return result;
    }
  }

  /**
   * Updates an existing appointment with status management and cache invalidation
   * Requirements: 2.2, 4.1, 4.2
   */
  async updateAppointment(
    appointmentId: string,
    businessId: string,
    updates: UpdateAppointmentServiceRequest
  ): Promise<AppointmentServiceResult> {
    const result: AppointmentServiceResult = {
      success: false,
      errors: [],
      warnings: [],
    };

    try {
      // 1. Get existing appointment
      const existingAppointment = await this.appointmentRepository.findById(
        appointmentId,
        businessId
      );
      if (!existingAppointment) {
        result.errors.push('Appointment not found or access denied');
        return result;
      }

      // 2. Handle status updates separately if provided
      if (updates.status && updates.status !== existingAppointment.status) {
        const statusResult = await this.statusManager.updateStatus(
          appointmentId,
          updates.status,
          businessId
        );

        if (!statusResult.success) {
          result.errors.push(statusResult.error || 'Failed to update status');
          return result;
        }
      }

      // 3. Validate time/service changes if provided
      if (updates.startTime || updates.endTime || updates.services) {
        const newStartTime = updates.startTime || existingAppointment.startTime;
        const newEndTime = updates.endTime || existingAppointment.endTime;
        const newServices =
          updates.services ||
          existingAppointment.services.map(s => ({
            serviceId: s.serviceId,
            serviceName: s.serviceName,
            price: s.price.toNumber(),
            duration: s.duration,
            serviceOrder: s.serviceOrder,
            startOffset: s.startOffset,
            assignedStaffId: s.assignedStaffId || undefined,
          }));

        // Validate the changes
        const validation = await this.validateAppointmentChanges(
          appointmentId,
          businessId,
          existingAppointment.staffId,
          newStartTime,
          newEndTime,
          newServices
        );

        if (!validation.isValid) {
          result.errors.push(...validation.errors);
          result.warnings.push(...validation.warnings);
          return result;
        }

        // Calculate new totals if services changed
        if (updates.services) {
          const totalPrice =
            await this.multiServiceCoordinator.calculateTotalPrice(
              newServices,
              businessId,
              existingAppointment.clientId || undefined
            );

          const totalDuration =
            await this.multiServiceCoordinator.calculateTotalDuration(
              newServices.map(s => s.serviceId),
              businessId
            );

          updates = {
            ...updates,
            endTime: new Date(newStartTime.getTime() + totalDuration * 60000),
          };

          // Update services in repository
          await this.updateAppointmentServices(
            appointmentId,
            businessId,
            newServices
          );
        }
      }

      // 4. Update appointment using repository
      const repositoryUpdates: UpdateAppointmentRequest = {
        startTime: updates.startTime,
        endTime: updates.endTime,
        clientName: updates.clientName,
        clientEmail: updates.clientEmail,
        clientPhone: updates.clientPhone,
        notes: updates.notes,
        internalNotes: updates.internalNotes,
        depositAmount: updates.depositAmount,
        depositPaid: updates.depositPaid,
      };

      const updatedAppointment = await this.appointmentRepository.update(
        appointmentId,
        businessId,
        repositoryUpdates
      );

      // 5. Invalidate availability cache
      await this.invalidateRelatedCaches(
        businessId,
        updatedAppointment.staffId,
        {
          startDate: updatedAppointment.startTime,
          endDate: updatedAppointment.endTime,
        }
      );

      // 6. Send modification notification if significant changes occurred (non-blocking)
      const hasSignificantChanges =
        updates.startTime ||
        updates.endTime ||
        updates.services ||
        updates.status;

      if (hasSignificantChanges && updatedAppointment.clientEmail) {
        // Build changes object for notification
        const changes: Record<string, any> = {};
        if (updates.startTime)
          changes.startTime = {
            old: existingAppointment.startTime,
            new: updates.startTime,
          };
        if (updates.endTime)
          changes.endTime = {
            old: existingAppointment.endTime,
            new: updates.endTime,
          };
        if (updates.services) changes.services = 'updated';
        if (updates.status)
          changes.status = {
            old: existingAppointment.status,
            new: updates.status,
          };

        notificationService
          .sendModificationNotification(
            updatedAppointment.id,
            businessId,
            changes
          )
          .catch(error => {
            console.error('Failed to send modification notification:', error);
            // Don't fail the appointment update if notification fails
          });
      }

      result.success = true;
      result.appointment = updatedAppointment;

      return result;
    } catch (error) {
      result.errors.push(
        `Failed to update appointment: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return result;
    }
  }

  /**
   * Gets appointments with filtering and business scoping
   * Requirements: 2.1, 2.2, 3.1, 3.2, 3.3
   */
  async getAppointments(
    businessId: string,
    options: AppointmentQueryOptions = {}
  ): Promise<{
    appointments: AppointmentWithRelations[];
    total: number;
    hasMore: boolean;
    nextOffset?: number;
  }> {
    try {
      // Extract query options
      const { includeConflicts, validateAvailability, ...filters } = options;

      // Get appointments from repository
      const result = await this.appointmentRepository.findByBusiness(
        businessId,
        filters
      );

      // Enhance with additional data if requested
      if (includeConflicts || validateAvailability) {
        for (const appointment of result.appointments) {
          if (includeConflicts) {
            // Add conflict information
            const conflicts = await this.appointmentRepository.findConflicting(
              appointment.staffId,
              {
                startTime: appointment.startTime,
                endTime: appointment.endTime,
              },
              businessId,
              appointment.id
            );
            // Note: In a full implementation, we'd extend the type to include conflicts
            // For now, we'll add it as a property
            (appointment as any).conflicts = conflicts;
          }

          if (validateAvailability) {
            // Validate current availability
            const availabilityCheck: AvailabilityCheckRequest = {
              businessId,
              staffId: appointment.staffId,
              startTime: appointment.startTime,
              endTime: appointment.endTime,
              serviceIds: appointment.services.map(s => s.serviceId),
              excludeAppointmentId: appointment.id,
            };

            const availabilityResult =
              await CalendarIntegration.checkAvailability(availabilityCheck);
            (appointment as any).isCurrentlyAvailable =
              availabilityResult.isAvailable;
          }
        }
      }

      return result;
    } catch (error) {
      throw new Error(
        `Failed to get appointments: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets a single appointment by ID with security validation
   * Requirements: 2.1, 3.1, 3.2, 3.3
   */
  async getAppointmentById(
    appointmentId: string,
    businessId: string,
    options: { includeConflicts?: boolean; validateAvailability?: boolean } = {}
  ): Promise<AppointmentWithRelations | null> {
    try {
      const appointment = await this.appointmentRepository.findById(
        appointmentId,
        businessId
      );

      if (!appointment) {
        return null;
      }

      // Enhance with additional data if requested
      if (options.includeConflicts) {
        const conflicts = await this.appointmentRepository.findConflicting(
          appointment.staffId,
          { startTime: appointment.startTime, endTime: appointment.endTime },
          businessId,
          appointment.id
        );
        (appointment as any).conflicts = conflicts;
      }

      if (options.validateAvailability) {
        const availabilityCheck: AvailabilityCheckRequest = {
          businessId,
          staffId: appointment.staffId,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          serviceIds: appointment.services.map(s => s.serviceId),
          excludeAppointmentId: appointment.id,
        };

        const availabilityResult =
          await CalendarIntegration.checkAvailability(availabilityCheck);
        (appointment as any).isCurrentlyAvailable =
          availabilityResult.isAvailable;
      }

      return appointment;
    } catch (error) {
      throw new Error(
        `Failed to get appointment: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Cancels an appointment with proper status transitions and notifications
   * Requirements: 2.3, 3.1, 3.2, 3.3
   */
  async cancelAppointment(
    appointmentId: string,
    businessId: string,
    options: CancelAppointmentOptions = {}
  ): Promise<AppointmentServiceResult> {
    const result: AppointmentServiceResult = {
      success: false,
      errors: [],
      warnings: [],
    };

    try {
      // 1. Get existing appointment
      const existingAppointment = await this.appointmentRepository.findById(
        appointmentId,
        businessId
      );
      if (!existingAppointment) {
        result.errors.push('Appointment not found or access denied');
        return result;
      }

      // 2. Validate cancellation is allowed
      const validation =
        await this.statusManager.validateStatusUpdateWithBusinessRules(
          appointmentId,
          AppointmentStatus.CANCELLED,
          businessId
        );

      if (!validation.isValid) {
        result.errors.push(...validation.errors);
        result.warnings.push(...validation.warnings);
        return result;
      }

      // 3. Update status to cancelled
      const statusResult = await this.statusManager.updateStatus(
        appointmentId,
        AppointmentStatus.CANCELLED,
        businessId,
        {
          changedBy: options.changedBy,
          reason: options.reason,
        }
      );

      if (!statusResult.success) {
        result.errors.push(
          statusResult.error || 'Failed to cancel appointment'
        );
        return result;
      }

      // 4. Update cancellation details
      const updateRequest: UpdateAppointmentRequest = {
        cancelledAt: new Date(),
        cancellationReason: options.reason,
      };

      const cancelledAppointment = await this.appointmentRepository.update(
        appointmentId,
        businessId,
        updateRequest
      );

      // 5. Invalidate availability cache to free up the slot
      await this.invalidateRelatedCaches(
        businessId,
        cancelledAppointment.staffId,
        {
          startDate: cancelledAppointment.startTime,
          endDate: cancelledAppointment.endTime,
        }
      );

      // 6. Handle refunds if specified
      if (options.refundAmount && options.refundAmount > 0) {
        // Note: In a full implementation, this would integrate with payment processing
        result.warnings.push(
          `Refund of $${options.refundAmount} needs to be processed manually`
        );
      }

      // 7. Send cancellation notifications (non-blocking)
      // Send cancellation notification to client
      if (cancelledAppointment.clientEmail) {
        notificationService
          .sendCancellationNotification(
            cancelledAppointment.id,
            businessId,
            options.reason
          )
          .catch(error => {
            console.error('Failed to send cancellation notification:', error);
            // Don't fail the cancellation if notification fails
          });
      }

      // Send staff cancellation alert
      notificationService
        .sendStaffCancellationAlert(
          cancelledAppointment.id,
          cancelledAppointment.staffId,
          businessId
        )
        .catch(error => {
          console.error('Failed to send staff cancellation alert:', error);
          // Don't fail the cancellation if notification fails
        });

      result.success = true;
      result.appointment = cancelledAppointment;
      result.warnings.push(...validation.warnings);

      return result;
    } catch (error) {
      result.errors.push(
        `Failed to cancel appointment: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return result;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Validates appointment changes against availability and conflicts
   */
  private async validateAppointmentChanges(
    appointmentId: string,
    businessId: string,
    staffId: string,
    startTime: Date,
    endTime: Date,
    services: ServiceBookingRequest[]
  ): Promise<AppointmentValidationResult> {
    const result: AppointmentValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      conflicts: [],
    };

    try {
      // 1. Validate multi-service booking
      const serviceValidation =
        await this.multiServiceCoordinator.validateMultiServiceBooking(
          services,
          { startTime, endTime },
          staffId,
          businessId
        );

      if (!serviceValidation.isValid) {
        result.isValid = false;
        result.errors.push(...serviceValidation.errors);
      }
      result.warnings.push(...serviceValidation.warnings);

      // 2. Check availability
      const availabilityCheck: AvailabilityCheckRequest = {
        businessId,
        staffId,
        startTime,
        endTime,
        serviceIds: services.map(s => s.serviceId),
        excludeAppointmentId: appointmentId,
      };

      const availabilityResult =
        await CalendarIntegration.checkAvailability(availabilityCheck);

      if (!availabilityResult.isAvailable) {
        result.isValid = false;
        result.errors.push('Updated time slot is not available');
        result.alternatives = availabilityResult.alternatives?.filter(
          alt => alt.staffId
        ) as { startTime: Date; endTime: Date; staffId: string }[] | undefined;
      }

      // 3. Check for conflicts
      const conflictCheck: ConflictCheckRequest = {
        businessId,
        staffId,
        startTime,
        endTime,
        serviceIds: services.map(s => s.serviceId),
        excludeAppointmentId: appointmentId,
      };

      const conflictResult =
        await CalendarIntegration.detectConflicts(conflictCheck);

      if (conflictResult.hasConflicts) {
        result.isValid = false;
        result.errors.push(
          'Updated appointment conflicts with existing bookings'
        );
        result.conflicts = conflictResult.conflicts.map(c => ({
          appointmentId: c.details.conflictingAppointment?.id || 'unknown',
          startTime: c.details.conflictingAppointment?.startTime || startTime,
          endTime: c.details.conflictingAppointment?.endTime || endTime,
          clientName: c.details.conflictingAppointment?.clientName || 'Unknown',
        }));
      }

      return result;
    } catch (error) {
      result.isValid = false;
      result.errors.push(
        `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return result;
    }
  }

  /**
   * Updates appointment services
   */
  private async updateAppointmentServices(
    appointmentId: string,
    businessId: string,
    services: ServiceBookingRequest[]
  ): Promise<void> {
    try {
      // Remove existing services
      const existingAppointment = await this.appointmentRepository.findById(
        appointmentId,
        businessId
      );
      if (!existingAppointment) {
        throw new Error('Appointment not found');
      }

      const existingServiceIds = existingAppointment.services.map(
        s => s.serviceId
      );
      if (existingServiceIds.length > 0) {
        await this.appointmentRepository.removeServices(
          appointmentId,
          businessId,
          existingServiceIds
        );
      }

      // Add new services
      const serviceRequests = services.map(service => ({
        serviceId: service.serviceId,
        serviceName: service.serviceName,
        price: service.price,
        duration: service.duration,
        serviceOrder: service.serviceOrder,
        startOffset: service.startOffset,
        assignedStaffId: service.assignedStaffId,
      }));

      await this.appointmentRepository.addServices(
        appointmentId,
        businessId,
        serviceRequests
      );
    } catch (error) {
      throw new Error(
        `Failed to update appointment services: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Invalidates related caches after appointment changes
   */
  private async invalidateRelatedCaches(
    businessId: string,
    staffId: string,
    dateRange: DateRange
  ): Promise<void> {
    try {
      const cacheInvalidation: CacheInvalidationRequest = {
        businessId,
        staffId,
        dateRange,
        type: 'appointments',
      };

      await CalendarIntegration.invalidateAvailabilityCache(cacheInvalidation);
    } catch (error) {
      // Log error but don't fail the operation
      console.error('Failed to invalidate caches:', error);
    }
  }
  // ============================================================================
  // ADDITIONAL QUERY AND MANAGEMENT METHODS
  // ============================================================================

  /**
   * Gets appointments by staff with date range filtering
   * Requirements: 2.1, 2.2, 3.1, 3.2
   */
  async getAppointmentsByStaff(
    staffId: string,
    businessId: string,
    dateRange?: DateRange,
    options: Omit<AppointmentQueryOptions, 'staffId'> = {}
  ): Promise<{
    appointments: AppointmentWithRelations[];
    total: number;
    hasMore: boolean;
    nextOffset?: number;
  }> {
    try {
      const { includeConflicts, validateAvailability, ...filters } = options;

      const result = await this.appointmentRepository.findByStaff(
        staffId,
        businessId,
        dateRange,
        filters
      );

      // Enhance with additional data if requested
      if (includeConflicts || validateAvailability) {
        for (const appointment of result.appointments) {
          if (includeConflicts) {
            const conflicts = await this.appointmentRepository.findConflicting(
              appointment.staffId,
              {
                startTime: appointment.startTime,
                endTime: appointment.endTime,
              },
              businessId,
              appointment.id
            );
            (appointment as any).conflicts = conflicts;
          }

          if (validateAvailability) {
            const availabilityCheck: AvailabilityCheckRequest = {
              businessId,
              staffId: appointment.staffId,
              startTime: appointment.startTime,
              endTime: appointment.endTime,
              serviceIds: appointment.services.map(s => s.serviceId),
              excludeAppointmentId: appointment.id,
            };

            const availabilityResult =
              await CalendarIntegration.checkAvailability(availabilityCheck);
            (appointment as any).isCurrentlyAvailable =
              availabilityResult.isAvailable;
          }
        }
      }

      return result;
    } catch (error) {
      throw new Error(
        `Failed to get appointments by staff: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets appointments by client with business scoping
   * Requirements: 2.1, 2.2, 3.1, 3.2
   */
  async getAppointmentsByClient(
    clientId: string,
    businessId: string,
    options: Omit<AppointmentQueryOptions, 'clientId'> = {}
  ): Promise<{
    appointments: AppointmentWithRelations[];
    total: number;
    hasMore: boolean;
    nextOffset?: number;
  }> {
    try {
      const { includeConflicts, validateAvailability, ...filters } = options;

      const result = await this.appointmentRepository.findByClient(
        clientId,
        businessId,
        filters
      );

      // Enhance with additional data if requested
      if (includeConflicts || validateAvailability) {
        for (const appointment of result.appointments) {
          if (includeConflicts) {
            const conflicts = await this.appointmentRepository.findConflicting(
              appointment.staffId,
              {
                startTime: appointment.startTime,
                endTime: appointment.endTime,
              },
              businessId,
              appointment.id
            );
            (appointment as any).conflicts = conflicts;
          }

          if (validateAvailability) {
            const availabilityCheck: AvailabilityCheckRequest = {
              businessId,
              staffId: appointment.staffId,
              startTime: appointment.startTime,
              endTime: appointment.endTime,
              serviceIds: appointment.services.map(s => s.serviceId),
              excludeAppointmentId: appointment.id,
            };

            const availabilityResult =
              await CalendarIntegration.checkAvailability(availabilityCheck);
            (appointment as any).isCurrentlyAvailable =
              availabilityResult.isAvailable;
          }
        }
      }

      return result;
    } catch (error) {
      throw new Error(
        `Failed to get appointments by client: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Searches appointments by client information
   * Requirements: 2.1, 2.2, 3.1, 3.2
   */
  async searchAppointmentsByClient(
    businessId: string,
    searchTerm: string,
    options: AppointmentQueryOptions = {}
  ): Promise<{
    appointments: AppointmentWithRelations[];
    total: number;
    hasMore: boolean;
    nextOffset?: number;
  }> {
    try {
      const { includeConflicts, validateAvailability, ...filters } = options;

      const result = await this.appointmentRepository.searchByClient(
        businessId,
        searchTerm,
        filters
      );

      // Enhance with additional data if requested
      if (includeConflicts || validateAvailability) {
        for (const appointment of result.appointments) {
          if (includeConflicts) {
            const conflicts = await this.appointmentRepository.findConflicting(
              appointment.staffId,
              {
                startTime: appointment.startTime,
                endTime: appointment.endTime,
              },
              businessId,
              appointment.id
            );
            (appointment as any).conflicts = conflicts;
          }

          if (validateAvailability) {
            const availabilityCheck: AvailabilityCheckRequest = {
              businessId,
              staffId: appointment.staffId,
              startTime: appointment.startTime,
              endTime: appointment.endTime,
              serviceIds: appointment.services.map(s => s.serviceId),
              excludeAppointmentId: appointment.id,
            };

            const availabilityResult =
              await CalendarIntegration.checkAvailability(availabilityCheck);
            (appointment as any).isCurrentlyAvailable =
              availabilityResult.isAvailable;
          }
        }
      }

      return result;
    } catch (error) {
      throw new Error(
        `Failed to search appointments by client: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets upcoming appointments for a business
   * Requirements: 2.1, 2.2, 3.1, 3.2
   */
  async getUpcomingAppointments(
    businessId: string,
    days: number = 7,
    options: AppointmentQueryOptions = {}
  ): Promise<{
    appointments: AppointmentWithRelations[];
    total: number;
    hasMore: boolean;
    nextOffset?: number;
  }> {
    try {
      const { includeConflicts, validateAvailability, ...filters } = options;

      const result = await this.appointmentRepository.findUpcoming(
        businessId,
        days,
        filters
      );

      // Enhance with additional data if requested
      if (includeConflicts || validateAvailability) {
        for (const appointment of result.appointments) {
          if (includeConflicts) {
            const conflicts = await this.appointmentRepository.findConflicting(
              appointment.staffId,
              {
                startTime: appointment.startTime,
                endTime: appointment.endTime,
              },
              businessId,
              appointment.id
            );
            (appointment as any).conflicts = conflicts;
          }

          if (validateAvailability) {
            const availabilityCheck: AvailabilityCheckRequest = {
              businessId,
              staffId: appointment.staffId,
              startTime: appointment.startTime,
              endTime: appointment.endTime,
              serviceIds: appointment.services.map(s => s.serviceId),
              excludeAppointmentId: appointment.id,
            };

            const availabilityResult =
              await CalendarIntegration.checkAvailability(availabilityCheck);
            (appointment as any).isCurrentlyAvailable =
              availabilityResult.isAvailable;
          }
        }
      }

      return result;
    } catch (error) {
      throw new Error(
        `Failed to get upcoming appointments: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets appointment statistics for a business
   * Requirements: 2.1, 2.2, 3.1, 3.2
   */
  async getAppointmentStatistics(
    businessId: string,
    dateRange: DateRange
  ): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byStaff: Array<{ staffId: string; staffName: string; count: number }>;
    revenue: number;
  }> {
    try {
      return await this.appointmentRepository.getAppointmentStats(
        businessId,
        dateRange
      );
    } catch (error) {
      throw new Error(
        `Failed to get appointment statistics: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Finds conflicting appointments for a time slot
   * Requirements: 2.1, 2.2, 4.1, 4.2
   */
  async findConflictingAppointments(
    staffId: string,
    timeSlot: { startTime: Date; endTime: Date },
    businessId: string,
    excludeAppointmentId?: string
  ): Promise<
    Array<{
      appointmentId: string;
      startTime: Date;
      endTime: Date;
      clientName?: string;
      services: string[];
    }>
  > {
    try {
      return await this.appointmentRepository.findConflicting(
        staffId,
        timeSlot,
        businessId,
        excludeAppointmentId
      );
    } catch (error) {
      throw new Error(
        `Failed to find conflicting appointments: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validates appointment availability without creating
   * Requirements: 4.1, 4.2, 4.3
   */
  async validateAppointmentAvailability(
    businessId: string,
    staffId: string,
    startTime: Date,
    endTime: Date,
    serviceIds: string[],
    excludeAppointmentId?: string
  ): Promise<AppointmentValidationResult> {
    try {
      const result: AppointmentValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        conflicts: [],
      };

      // 1. Check availability using calendar infrastructure
      const availabilityCheck: AvailabilityCheckRequest = {
        businessId,
        staffId,
        startTime,
        endTime,
        serviceIds,
        excludeAppointmentId,
      };

      const availabilityResult =
        await CalendarIntegration.checkAvailability(availabilityCheck);

      if (!availabilityResult.isAvailable) {
        result.isValid = false;
        result.errors.push('Time slot is not available');
        result.alternatives = availabilityResult.alternatives?.filter(
          alt => alt.staffId
        ) as { startTime: Date; endTime: Date; staffId: string }[] | undefined;
      }

      // 2. Detect conflicts
      const conflictCheck: ConflictCheckRequest = {
        businessId,
        staffId,
        startTime,
        endTime,
        serviceIds,
        excludeAppointmentId,
      };

      const conflictResult =
        await CalendarIntegration.detectConflicts(conflictCheck);

      if (conflictResult.hasConflicts) {
        result.isValid = false;
        result.errors.push('Appointment conflicts with existing bookings');
        result.conflicts = conflictResult.conflicts.map(c => ({
          appointmentId: c.details.conflictingAppointment?.id || 'unknown',
          startTime: c.details.conflictingAppointment?.startTime || startTime,
          endTime: c.details.conflictingAppointment?.endTime || endTime,
          clientName: c.details.conflictingAppointment?.clientName || 'Unknown',
        }));
      }

      // Add warnings
      if (conflictResult.warnings.length > 0) {
        result.warnings.push(...conflictResult.warnings.map(w => w.message));
      }

      // 3. Validate service duration
      const durationValidation: DurationValidationRequest = {
        serviceIds,
        timeSlot: { startTime, endTime },
        businessId,
        staffId,
      };

      const durationResult =
        await CalendarIntegration.validateServiceDuration(durationValidation);

      if (!durationResult.isValid) {
        result.isValid = false;
        result.errors.push(
          `Service duration validation failed: ${durationResult.reason}`
        );
        if (durationResult.suggestedAlternatives) {
          result.alternatives = durationResult.suggestedAlternatives.filter(
            alt => alt.staffId
          ) as { startTime: Date; endTime: Date; staffId: string }[];
        }
      }

      return result;
    } catch (error) {
      return {
        isValid: false,
        errors: [
          `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
        warnings: [],
        conflicts: [],
      };
    }
  }

  /**
   * Reschedules an appointment to a new time slot
   * Requirements: 2.2, 2.3, 4.1, 4.2
   */
  async rescheduleAppointment(
    appointmentId: string,
    businessId: string,
    newStartTime: Date,
    newEndTime: Date,
    options: {
      reason?: string;
      changedBy?: string;
      notifyClient?: boolean;
    } = {}
  ): Promise<AppointmentServiceResult> {
    const result: AppointmentServiceResult = {
      success: false,
      errors: [],
      warnings: [],
    };

    try {
      // 1. Get existing appointment
      const existingAppointment = await this.appointmentRepository.findById(
        appointmentId,
        businessId
      );
      if (!existingAppointment) {
        result.errors.push('Appointment not found or access denied');
        return result;
      }

      // 2. Validate new time slot
      const validation = await this.validateAppointmentAvailability(
        businessId,
        existingAppointment.staffId,
        newStartTime,
        newEndTime,
        existingAppointment.services.map(s => s.serviceId),
        appointmentId
      );

      if (!validation.isValid) {
        result.errors.push(...validation.errors);
        result.warnings.push(...validation.warnings);
        return result;
      }

      // 3. Update appointment with new time
      const updateResult = await this.updateAppointment(
        appointmentId,
        businessId,
        {
          startTime: newStartTime,
          endTime: newEndTime,
        }
      );

      if (!updateResult.success) {
        result.errors.push(...updateResult.errors);
        return result;
      }

      // 4. Log the reschedule reason if provided
      if (options.reason) {
        // In a full implementation, this would create an audit log entry
        console.log(
          `Appointment ${appointmentId} rescheduled: ${options.reason}`
        );
      }

      result.success = true;
      result.appointment = updateResult.appointment;
      result.warnings.push(...validation.warnings);

      return result;
    } catch (error) {
      result.errors.push(
        `Failed to reschedule appointment: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return result;
    }
  }

  /**
   * Bulk updates appointment status for multiple appointments
   * Requirements: 2.3, 3.1, 3.2
   */
  async bulkUpdateAppointmentStatus(
    appointmentIds: string[],
    newStatus: AppointmentStatus,
    businessId: string,
    options: {
      changedBy?: string;
      reason?: string;
      skipValidation?: boolean;
    } = {}
  ): Promise<{
    successful: string[];
    failed: Array<{ appointmentId: string; error: string }>;
  }> {
    try {
      return await this.statusManager.bulkUpdateStatus(
        appointmentIds,
        newStatus,
        businessId,
        options
      );
    } catch (error) {
      throw new Error(
        `Failed to bulk update appointment status: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets appointments that need status updates (auto-processing)
   * Requirements: 2.3, 3.1, 3.2
   */
  async getAppointmentsNeedingStatusUpdate(businessId: string): Promise<{
    needConfirmation: Array<{ id: string; startTime: Date }>;
    needCompletion: Array<{ id: string; endTime: Date }>;
    missedAppointments: Array<{ id: string; startTime: Date }>;
  }> {
    try {
      return await this.statusManager.getAppointmentsNeedingStatusUpdate(
        businessId
      );
    } catch (error) {
      throw new Error(
        `Failed to get appointments needing status update: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

// Export singleton instance
export const appointmentService = new AppointmentService();

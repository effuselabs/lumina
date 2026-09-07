import { prisma } from '@/lib/prisma';
import { AppointmentStatus, Prisma } from '@prisma/client';

/**
 * Result of a status update operation
 */
export interface StatusUpdateResult {
  success: boolean;
  appointment?: {
    id: string;
    status: AppointmentStatus;
    confirmedAt?: Date | null;
    startedAt?: Date | null;
    completedAt?: Date | null;
    cancelledAt?: Date | null;
  };
  error?: string;
  validTransitions?: AppointmentStatus[];
}

/**
 * Event data for status change notifications
 */
export interface StatusChangeEvent {
  appointmentId: string;
  businessId: string;
  oldStatus: AppointmentStatus | null;
  newStatus: AppointmentStatus;
  changedBy?: string;
  reason?: string;
  timestamp: Date;
}

/**
 * Manages appointment status transitions and workflow validation
 */
export class AppointmentStatusManager {
  /**
   * Valid status transitions mapping
   */
  private static readonly STATUS_TRANSITIONS: Record<
    AppointmentStatus,
    AppointmentStatus[]
  > = {
    SCHEDULED: [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED],
    CONFIRMED: [
      AppointmentStatus.IN_PROGRESS,
      AppointmentStatus.CANCELLED,
      AppointmentStatus.NO_SHOW,
    ],
    IN_PROGRESS: [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED],
    COMPLETED: [], // Final state - no transitions allowed
    CANCELLED: [AppointmentStatus.SCHEDULED], // Allow rescheduling as new appointment
    NO_SHOW: [AppointmentStatus.SCHEDULED], // Allow rescheduling as new appointment
  };

  /**
   * Validates if a status transition is allowed
   */
  async validateStatusTransition(
    currentStatus: AppointmentStatus,
    newStatus: AppointmentStatus
  ): Promise<boolean> {
    const validTransitions = this.getValidTransitions(currentStatus);
    return validTransitions.includes(newStatus);
  }

  /**
   * Gets valid status transitions for the current status
   */
  getValidTransitions(currentStatus: AppointmentStatus): AppointmentStatus[] {
    return AppointmentStatusManager.STATUS_TRANSITIONS[currentStatus] || [];
  }

  /**
   * Updates appointment status with validation and audit trail
   */
  async updateStatus(
    appointmentId: string,
    newStatus: AppointmentStatus,
    businessId: string,
    options: {
      changedBy?: string;
      reason?: string;
      skipValidation?: boolean;
    } = {}
  ): Promise<StatusUpdateResult> {
    const { changedBy, reason, skipValidation = false } = options;

    try {
      // Get current appointment with business context validation
      const currentAppointment = await prisma.appointment.findFirst({
        where: {
          id: appointmentId,
          businessId,
        },
        select: {
          id: true,
          status: true,
          confirmedAt: true,
          startedAt: true,
          completedAt: true,
          cancelledAt: true,
        },
      });

      if (!currentAppointment) {
        return {
          success: false,
          error: 'Appointment not found or access denied',
        };
      }

      const currentStatus = currentAppointment.status;

      // Skip validation if explicitly requested (for system operations)
      if (!skipValidation) {
        const isValidTransition = await this.validateStatusTransition(
          currentStatus,
          newStatus
        );

        if (!isValidTransition) {
          return {
            success: false,
            error: `Invalid status transition from ${currentStatus} to ${newStatus}`,
            validTransitions: this.getValidTransitions(currentStatus),
          };
        }
      }

      // Prepare status-specific timestamp updates
      const timestampUpdates = this.getTimestampUpdates(newStatus);

      // Use transaction to ensure atomicity
      const result = await prisma.$transaction(async tx => {
        // Update appointment status and timestamps
        const updatedAppointment = await tx.appointment.update({
          where: { id: appointmentId },
          data: {
            status: newStatus,
            ...timestampUpdates,
          },
          select: {
            id: true,
            status: true,
            confirmedAt: true,
            startedAt: true,
            completedAt: true,
            cancelledAt: true,
          },
        });

        // Create status history record
        await tx.appointmentStatusHistory.create({
          data: {
            appointmentId,
            businessId,
            oldStatus: currentStatus,
            newStatus,
            changedBy,
            reason,
          },
        });

        return updatedAppointment;
      });

      // Trigger status change events (async, don't wait)
      this.triggerStatusEvents({
        appointmentId,
        businessId,
        oldStatus: currentStatus,
        newStatus,
        changedBy,
        reason,
        timestamp: new Date(),
      }).catch(error => {
        console.error('Failed to trigger status change events:', error);
      });

      return {
        success: true,
        appointment: result,
      };
    } catch (error) {
      console.error('Error updating appointment status:', error);
      return {
        success: false,
        error: 'Failed to update appointment status',
      };
    }
  }

  /**
   * Gets timestamp updates based on the new status
   */
  private getTimestampUpdates(
    newStatus: AppointmentStatus
  ): Record<string, Date | null> {
    const now = new Date();

    switch (newStatus) {
      case AppointmentStatus.CONFIRMED:
        return { confirmedAt: now };
      case AppointmentStatus.IN_PROGRESS:
        return { startedAt: now };
      case AppointmentStatus.COMPLETED:
        return { completedAt: now };
      case AppointmentStatus.CANCELLED:
      case AppointmentStatus.NO_SHOW:
        return { cancelledAt: now };
      default:
        return {};
    }
  }

  /**
   * Triggers status change events for notifications and integrations
   */
  async triggerStatusEvents(event: StatusChangeEvent): Promise<void> {
    try {
      // Log the status change event
      console.log('Status change event triggered:', {
        appointmentId: event.appointmentId,
        transition: `${event.oldStatus} -> ${event.newStatus}`,
        timestamp: event.timestamp,
      });

      // Trigger different events based on status change
      await this.handleStatusSpecificEvents(event);

      // Future implementation would include:
      // - Email/SMS notifications
      // - Webhook triggers
      // - Analytics events
      // - Integration with notification system
    } catch (error) {
      console.error('Failed to trigger status change events:', error);
      // Don't throw error to avoid breaking the main status update flow
    }
  }

  /**
   * Handles status-specific event triggers
   */
  private async handleStatusSpecificEvents(
    event: StatusChangeEvent
  ): Promise<void> {
    switch (event.newStatus) {
      case AppointmentStatus.CONFIRMED:
        await this.handleConfirmationEvents(event);
        break;
      case AppointmentStatus.IN_PROGRESS:
        await this.handleStartEvents(event);
        break;
      case AppointmentStatus.COMPLETED:
        await this.handleCompletionEvents(event);
        break;
      case AppointmentStatus.CANCELLED:
      case AppointmentStatus.NO_SHOW:
        await this.handleCancellationEvents(event);
        break;
      default:
        // No specific events for other statuses
        break;
    }
  }

  /**
   * Handles events when appointment is confirmed
   */
  private async handleConfirmationEvents(
    event: StatusChangeEvent
  ): Promise<void> {
    // Placeholder for confirmation-specific events
    console.log(
      `Appointment ${event.appointmentId} confirmed - triggering confirmation events`
    );

    // Future implementation:
    // - Send confirmation email/SMS to client
    // - Notify staff of confirmation
    // - Update calendar integrations
    // - Trigger reminder scheduling
  }

  /**
   * Handles events when appointment starts
   */
  private async handleStartEvents(event: StatusChangeEvent): Promise<void> {
    // Placeholder for start-specific events
    console.log(
      `Appointment ${event.appointmentId} started - triggering start events`
    );

    // Future implementation:
    // - Notify client that service has started
    // - Update staff dashboard
    // - Start time tracking
    // - Trigger payment preparation
  }

  /**
   * Handles events when appointment is completed
   */
  private async handleCompletionEvents(
    event: StatusChangeEvent
  ): Promise<void> {
    // Placeholder for completion-specific events
    console.log(
      `Appointment ${event.appointmentId} completed - triggering completion events`
    );

    // Future implementation:
    // - Trigger payment processing
    // - Send completion notification
    // - Request client feedback/review
    // - Update staff performance metrics
    // - Generate receipt
  }

  /**
   * Handles events when appointment is cancelled or no-show
   */
  private async handleCancellationEvents(
    event: StatusChangeEvent
  ): Promise<void> {
    // Placeholder for cancellation-specific events
    console.log(
      `Appointment ${event.appointmentId} cancelled/no-show - triggering cancellation events`
    );

    // Future implementation:
    // - Send cancellation notification
    // - Process refunds if applicable
    // - Update availability calendar
    // - Apply cancellation policies
    // - Offer rescheduling options
  }

  /**
   * Gets appointment status history for audit purposes
   */
  async getStatusHistory(
    appointmentId: string,
    businessId: string
  ): Promise<
    Array<{
      id: string;
      oldStatus: AppointmentStatus | null;
      newStatus: AppointmentStatus;
      changedBy: string | null;
      reason: string | null;
      createdAt: Date;
    }>
  > {
    return await prisma.appointmentStatusHistory.findMany({
      where: {
        appointmentId,
        businessId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        oldStatus: true,
        newStatus: true,
        changedBy: true,
        reason: true,
        createdAt: true,
      },
    });
  }

  /**
   * Validates business context for appointment access
   */
  async validateBusinessContext(
    appointmentId: string,
    businessId: string
  ): Promise<boolean> {
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        businessId,
      },
      select: { id: true },
    });

    return !!appointment;
  }

  /**
   * Gets appointment status statistics for a business
   */
  async getStatusStatistics(
    businessId: string,
    dateRange?: {
      startDate: Date;
      endDate: Date;
    }
  ): Promise<Record<AppointmentStatus, number>> {
    const whereClause: Prisma.AppointmentWhereInput = {
      businessId,
    };

    if (dateRange) {
      whereClause.startTime = {
        gte: dateRange.startDate,
        lte: dateRange.endDate,
      };
    }

    const statusCounts = await prisma.appointment.groupBy({
      by: ['status'],
      where: whereClause,
      _count: {
        status: true,
      },
    });

    // Initialize all statuses with 0
    const result: Record<AppointmentStatus, number> = {
      SCHEDULED: 0,
      CONFIRMED: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      NO_SHOW: 0,
    };

    // Fill in actual counts
    statusCounts.forEach(item => {
      result[item.status] = item._count.status;
    });

    return result;
  }

  /**
   * Updates multiple appointments to a new status (bulk operation)
   */
  async bulkUpdateStatus(
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
    const successful: string[] = [];
    const failed: Array<{ appointmentId: string; error: string }> = [];

    // Process appointments in batches to avoid overwhelming the database
    const batchSize = 10;
    for (let i = 0; i < appointmentIds.length; i += batchSize) {
      const batch = appointmentIds.slice(i, i + batchSize);

      const batchPromises = batch.map(async appointmentId => {
        try {
          const result = await this.updateStatus(
            appointmentId,
            newStatus,
            businessId,
            options
          );

          if (result.success) {
            successful.push(appointmentId);
          } else {
            failed.push({
              appointmentId,
              error: result.error || 'Unknown error',
            });
          }
        } catch (error) {
          failed.push({
            appointmentId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      await Promise.all(batchPromises);
    }

    return { successful, failed };
  }

  /**
   * Validates if a status update is allowed based on business rules
   */
  async validateStatusUpdateWithBusinessRules(
    appointmentId: string,
    newStatus: AppointmentStatus,
    businessId: string
  ): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Get appointment details
      const appointment = await prisma.appointment.findFirst({
        where: {
          id: appointmentId,
          businessId,
        },
        select: {
          id: true,
          status: true,
          startTime: true,
          endTime: true,
          business: {
            select: {
              cancellationPolicy: true,
            },
          },
        },
      });

      if (!appointment) {
        errors.push('Appointment not found or access denied');
        return { isValid: false, errors, warnings };
      }

      // Check basic status transition validity
      const isValidTransition = await this.validateStatusTransition(
        appointment.status,
        newStatus
      );

      if (!isValidTransition) {
        errors.push(
          `Invalid status transition from ${appointment.status} to ${newStatus}`
        );
      }

      // Business rule validations
      const now = new Date();

      // Check if trying to modify past appointments
      if (
        appointment.startTime < now &&
        newStatus !== AppointmentStatus.COMPLETED
      ) {
        if (newStatus === AppointmentStatus.CANCELLED) {
          warnings.push(
            'Cancelling a past appointment - consider marking as NO_SHOW instead'
          );
        } else {
          errors.push(
            'Cannot modify past appointments except to mark as completed'
          );
        }
      }

      // Check cancellation timing
      if (newStatus === AppointmentStatus.CANCELLED) {
        const hoursUntilAppointment =
          (appointment.startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntilAppointment < 24) {
          warnings.push(
            'Cancellation within 24 hours - cancellation policy may apply'
          );
        }
      }

      // Check if appointment is already in progress
      if (
        appointment.status === AppointmentStatus.IN_PROGRESS &&
        newStatus === AppointmentStatus.CANCELLED
      ) {
        warnings.push(
          'Cancelling an in-progress appointment - ensure proper handling'
        );
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      console.error('Error validating status update:', error);
      errors.push('Failed to validate status update');
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Gets appointments that need status updates (e.g., auto-confirm, auto-complete)
   */
  async getAppointmentsNeedingStatusUpdate(businessId: string): Promise<{
    needConfirmation: Array<{ id: string; startTime: Date }>;
    needCompletion: Array<{ id: string; endTime: Date }>;
    missedAppointments: Array<{ id: string; startTime: Date }>;
  }> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get appointments that might need status updates
    const appointments = await prisma.appointment.findMany({
      where: {
        businessId,
        OR: [
          // Scheduled appointments that started more than 15 minutes ago
          {
            status: AppointmentStatus.SCHEDULED,
            startTime: {
              lt: new Date(now.getTime() - 15 * 60 * 1000),
            },
          },
          // In-progress appointments that should have ended
          {
            status: AppointmentStatus.IN_PROGRESS,
            endTime: {
              lt: now,
            },
          },
          // Confirmed appointments that started but weren't marked in progress
          {
            status: AppointmentStatus.CONFIRMED,
            startTime: {
              lt: new Date(now.getTime() - 15 * 60 * 1000),
            },
          },
        ],
      },
      select: {
        id: true,
        status: true,
        startTime: true,
        endTime: true,
      },
    });

    const needConfirmation: Array<{ id: string; startTime: Date }> = [];
    const needCompletion: Array<{ id: string; endTime: Date }> = [];
    const missedAppointments: Array<{ id: string; startTime: Date }> = [];

    appointments.forEach(appointment => {
      if (appointment.status === AppointmentStatus.SCHEDULED) {
        // Check if it's a missed appointment (started more than 30 minutes ago)
        const minutesSinceStart =
          (now.getTime() - appointment.startTime.getTime()) / (1000 * 60);

        if (minutesSinceStart > 30) {
          missedAppointments.push({
            id: appointment.id,
            startTime: appointment.startTime,
          });
        }
      } else if (appointment.status === AppointmentStatus.CONFIRMED) {
        needConfirmation.push({
          id: appointment.id,
          startTime: appointment.startTime,
        });
      } else if (appointment.status === AppointmentStatus.IN_PROGRESS) {
        needCompletion.push({
          id: appointment.id,
          endTime: appointment.endTime,
        });
      }
    });

    return {
      needConfirmation,
      needCompletion,
      missedAppointments,
    };
  }
}

// Export singleton instance
export const appointmentStatusManager = new AppointmentStatusManager();

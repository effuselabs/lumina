/**
 * Availability Cache Invalidation Service
 *
 * Provides cache invalidation coordination for real-time availability updates
 * when appointments are created, updated, or cancelled. Ensures that the public
 * booking interface always shows accurate availability.
 *
 * Requirements: 6.5, 10.1
 *
 * @version 1.0.0
 * @author Lumina Development Team
 */

import { CalendarIntegration } from './calendar-integration';
import { RealTimeAvailabilityService } from './real-time-availability-service';

export interface CacheInvalidationEvent {
  type:
    | 'appointment_created'
    | 'appointment_updated'
    | 'appointment_cancelled'
    | 'staff_schedule_changed'
    | 'business_hours_changed';
  businessId: string;
  staffId?: string;
  clientId?: string;
  appointmentId?: string;
  affectedDate?: Date;
  affectedDateRange?: {
    startDate: Date;
    endDate: Date;
  };
  metadata?: {
    previousStartTime?: Date;
    previousEndTime?: Date;
    newStartTime?: Date;
    newEndTime?: Date;
    serviceIds?: string[];
  };
}

export interface InvalidationResult {
  success: boolean;
  invalidatedCaches: string[];
  errors: string[];
  executionTime: number;
}

/**
 * Availability Cache Invalidation Service
 *
 * Coordinates cache invalidation across all availability-related caches
 * to ensure real-time accuracy for public booking interface
 */
export class AvailabilityCacheInvalidation {
  private static readonly INVALIDATION_TIMEOUT_MS = 10000; // 10 seconds
  private static readonly BATCH_INVALIDATION_SIZE = 50;

  /**
   * Handle cache invalidation for appointment-related events
   * Requirements: 6.5, 10.1
   */
  static async handleAppointmentEvent(
    event: CacheInvalidationEvent
  ): Promise<InvalidationResult> {
    const startTime = Date.now();
    const invalidatedCaches: string[] = [];
    const errors: string[] = [];

    try {
      switch (event.type) {
        case 'appointment_created':
          await this.invalidateForAppointmentCreated(
            event,
            invalidatedCaches,
            errors
          );
          break;

        case 'appointment_updated':
          await this.invalidateForAppointmentUpdated(
            event,
            invalidatedCaches,
            errors
          );
          break;

        case 'appointment_cancelled':
          await this.invalidateForAppointmentCancelled(
            event,
            invalidatedCaches,
            errors
          );
          break;

        case 'staff_schedule_changed':
          await this.invalidateForStaffScheduleChanged(
            event,
            invalidatedCaches,
            errors
          );
          break;

        case 'business_hours_changed':
          await this.invalidateForBusinessHoursChanged(
            event,
            invalidatedCaches,
            errors
          );
          break;

        default:
          errors.push(`Unknown event type: ${event.type}`);
      }

      return {
        success: errors.length === 0,
        invalidatedCaches,
        errors,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Cache invalidation failed: ${errorMessage}`);

      return {
        success: false,
        invalidatedCaches,
        errors,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Batch invalidate cache for multiple events
   * Requirements: 6.5, 10.1
   */
  static async batchInvalidate(
    events: CacheInvalidationEvent[]
  ): Promise<InvalidationResult[]> {
    const results: InvalidationResult[] = [];
    const batches = this.createBatches(events, this.BATCH_INVALIDATION_SIZE);

    for (const batch of batches) {
      const batchPromises = batch.map(event =>
        this.handleAppointmentEvent(event)
      );
      const batchResults = await Promise.allSettled(batchPromises);

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            invalidatedCaches: [],
            errors: [`Batch invalidation failed: ${result.reason}`],
            executionTime: 0,
          });
        }
      }
    }

    return results;
  }

  /**
   * Warm cache for upcoming dates after invalidation
   * Requirements: 6.5, 10.1
   */
  static async warmCacheAfterInvalidation(
    businessId: string,
    staffIds: string[],
    dateRange: { startDate: Date; endDate: Date }
  ): Promise<void> {
    try {
      await RealTimeAvailabilityService.warmAvailabilityCache(
        businessId,
        staffIds,
        dateRange
      );
    } catch (error) {
      console.error('Error warming cache after invalidation:', error);
      // Don't throw - cache warming failures shouldn't break the application
    }
  }

  /**
   * Get cache invalidation metrics
   * Requirements: 10.1
   */
  static getCacheInvalidationMetrics() {
    return RealTimeAvailabilityService.getCacheMetrics();
  }

  // Private helper methods for specific event types

  /**
   * Handle cache invalidation for appointment creation
   */
  private static async invalidateForAppointmentCreated(
    event: CacheInvalidationEvent,
    invalidatedCaches: string[],
    errors: string[]
  ): Promise<void> {
    try {
      if (!event.staffId || !event.affectedDate) {
        errors.push(
          'Staff ID and affected date are required for appointment creation'
        );
        return;
      }

      // Invalidate availability cache for the affected staff and date
      await RealTimeAvailabilityService.invalidateAvailabilityCache(
        event.businessId,
        event.staffId,
        {
          startDate: event.affectedDate,
          endDate: event.affectedDate,
        }
      );

      invalidatedCaches.push(
        `staff_availability:${event.staffId}:${event.affectedDate.toISOString().split('T')[0]}`
      );

      // Also invalidate appointment-specific cache
      await CalendarIntegration.invalidateAvailabilityCache({
        businessId: event.businessId,
        staffId: event.staffId,
        appointmentId: event.appointmentId,
        type: 'appointments',
      });

      invalidatedCaches.push(
        `appointments:${event.staffId}:${event.businessId}`
      );
    } catch (error) {
      errors.push(
        `Failed to invalidate cache for appointment creation: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Handle cache invalidation for appointment updates
   */
  private static async invalidateForAppointmentUpdated(
    event: CacheInvalidationEvent,
    invalidatedCaches: string[],
    errors: string[]
  ): Promise<void> {
    try {
      if (!event.staffId) {
        errors.push('Staff ID is required for appointment updates');
        return;
      }

      const datesToInvalidate = new Set<string>();

      // Add current affected date
      if (event.affectedDate) {
        datesToInvalidate.add(event.affectedDate.toISOString().split('T')[0]);
      }

      // Add previous date if appointment was moved
      if (event.metadata?.previousStartTime) {
        datesToInvalidate.add(
          event.metadata.previousStartTime.toISOString().split('T')[0]
        );
      }

      // Add new date if appointment was moved
      if (event.metadata?.newStartTime) {
        datesToInvalidate.add(
          event.metadata.newStartTime.toISOString().split('T')[0]
        );
      }

      // Invalidate cache for all affected dates
      for (const dateStr of datesToInvalidate) {
        const date = new Date(dateStr);
        await RealTimeAvailabilityService.invalidateAvailabilityCache(
          event.businessId,
          event.staffId,
          { startDate: date, endDate: date }
        );

        invalidatedCaches.push(
          `staff_availability:${event.staffId}:${dateStr}`
        );
      }

      // Invalidate appointment-specific cache
      await CalendarIntegration.invalidateAvailabilityCache({
        businessId: event.businessId,
        staffId: event.staffId,
        appointmentId: event.appointmentId,
        type: 'appointment_details',
      });

      invalidatedCaches.push(`appointment_details:${event.appointmentId}`);
    } catch (error) {
      errors.push(
        `Failed to invalidate cache for appointment update: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Handle cache invalidation for appointment cancellation
   */
  private static async invalidateForAppointmentCancelled(
    event: CacheInvalidationEvent,
    invalidatedCaches: string[],
    errors: string[]
  ): Promise<void> {
    try {
      if (!event.staffId || !event.affectedDate) {
        errors.push(
          'Staff ID and affected date are required for appointment cancellation'
        );
        return;
      }

      // Invalidate availability cache for the affected staff and date
      await RealTimeAvailabilityService.invalidateAvailabilityCache(
        event.businessId,
        event.staffId,
        {
          startDate: event.affectedDate,
          endDate: event.affectedDate,
        }
      );

      invalidatedCaches.push(
        `staff_availability:${event.staffId}:${event.affectedDate.toISOString().split('T')[0]}`
      );

      // Invalidate appointment-specific cache
      await CalendarIntegration.invalidateAvailabilityCache({
        businessId: event.businessId,
        staffId: event.staffId,
        appointmentId: event.appointmentId,
        type: 'appointment_details',
      });

      invalidatedCaches.push(`appointment_details:${event.appointmentId}`);
    } catch (error) {
      errors.push(
        `Failed to invalidate cache for appointment cancellation: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Handle cache invalidation for staff schedule changes
   */
  private static async invalidateForStaffScheduleChanged(
    event: CacheInvalidationEvent,
    invalidatedCaches: string[],
    errors: string[]
  ): Promise<void> {
    try {
      if (!event.staffId) {
        errors.push('Staff ID is required for staff schedule changes');
        return;
      }

      // Invalidate all availability cache for the staff member
      await RealTimeAvailabilityService.invalidateAvailabilityCache(
        event.businessId,
        event.staffId,
        event.affectedDateRange
      );

      const dateRangeStr = event.affectedDateRange
        ? `${event.affectedDateRange.startDate.toISOString().split('T')[0]}_to_${event.affectedDateRange.endDate.toISOString().split('T')[0]}`
        : 'all_dates';

      invalidatedCaches.push(`staff_schedule:${event.staffId}:${dateRangeStr}`);

      // Also invalidate staff availability cache
      await CalendarIntegration.invalidateAvailabilityCache({
        businessId: event.businessId,
        staffId: event.staffId,
        dateRange: event.affectedDateRange,
        type: 'staff_availability',
      });

      invalidatedCaches.push(`staff_availability_cache:${event.staffId}`);
    } catch (error) {
      errors.push(
        `Failed to invalidate cache for staff schedule change: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Handle cache invalidation for business hours changes
   */
  private static async invalidateForBusinessHoursChanged(
    event: CacheInvalidationEvent,
    invalidatedCaches: string[],
    errors: string[]
  ): Promise<void> {
    try {
      // Invalidate all availability cache for the business
      await RealTimeAvailabilityService.invalidateAvailabilityCache(
        event.businessId,
        undefined, // All staff
        event.affectedDateRange
      );

      invalidatedCaches.push(`business_hours:${event.businessId}`);

      // Invalidate business hours cache
      await CalendarIntegration.invalidateAvailabilityCache({
        businessId: event.businessId,
        dateRange: event.affectedDateRange,
        type: 'business_hours',
      });

      invalidatedCaches.push(`business_hours_cache:${event.businessId}`);
    } catch (error) {
      errors.push(
        `Failed to invalidate cache for business hours change: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create batches from array of events
   */
  private static createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }
}

/**
 * Calendar Infrastructure Integration Layer
 *
 * This service provides a unified interface for the Appointment Booking Engine
 * to interact with the LUM-96 Calendar Infrastructure components:
 * - Availability Calculator
 * - Conflict Detection Engine
 * - Service Duration Validator
 * - Availability Cache
 *
 * Requirements: 4.1, 4.2, 4.3, 1.2, 1.3
 *
 * @version 1.0.0
 * @author Lumina Development Team
 */

import { AvailabilityCache } from './availability-cache';
import {
  AvailabilityCalculator,
  AvailabilityQuery,
  AvailabilitySlot,
} from './availability-calculator';
import {
  AppointmentRequest,
  Conflict,
  ConflictDetectionEngine,
  ValidationResult,
} from './conflict-detection-engine';
import {
  MultiServiceBooking,
  ServiceDurationValidator,
  TimeSlot,
} from './service-duration-validator';

// Integration-specific types
export interface AvailabilityCheckRequest {
  businessId: string;
  staffId: string;
  startTime: Date;
  endTime: Date;
  serviceIds: string[];
  excludeAppointmentId?: string;
}

export interface AvailabilityCheckResult {
  isAvailable: boolean;
  conflicts: Conflict[];
  warnings: Conflict[];
  alternatives?: TimeSlot[];
  reason?: string;
  metadata: {
    calculationTime: number;
    cacheHit: boolean;
    validationResults: ValidationResult[];
  };
}

export interface ConflictCheckRequest {
  businessId: string;
  staffId: string;
  startTime: Date;
  endTime: Date;
  serviceIds: string[];
  clientId?: string;
  excludeAppointmentId?: string;
}

export interface ConflictCheckResult {
  hasConflicts: boolean;
  conflicts: Conflict[];
  warnings: Conflict[];
  suggestedResolutions?: Array<{
    type: string;
    description: string;
    alternativeSlots?: TimeSlot[];
    alternativeStaff?: Array<{
      staffId: string;
      staffName: string;
      availableSlots: TimeSlot[];
    }>;
  }>;
}

export interface DurationValidationRequest {
  serviceIds: string[];
  timeSlot: TimeSlot;
  businessId: string;
  staffId?: string;
}

export interface DurationValidationResult {
  isValid: boolean;
  requiredDuration: number;
  availableDuration: number;
  reason?: string;
  suggestedAlternatives?: TimeSlot[];
}

export interface CacheInvalidationRequest {
  businessId: string;
  staffId?: string;
  clientId?: string;
  appointmentId?: string;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  type:
    | 'staff_availability'
    | 'business_hours'
    | 'appointments'
    | 'client_appointments'
    | 'appointment_details'
    | 'all';
}

export interface CacheWarmingRequest {
  businessId: string;
  staffIds?: string[];
  clientIds?: string[];
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  priority: 'high' | 'medium' | 'low';
  warmingType: 'availability' | 'appointments' | 'client_history' | 'all';
}

export interface CacheCoordinationMetrics {
  invalidationCount: number;
  warmingCount: number;
  hitRate: number;
  missRate: number;
  averageResponseTime: number;
  lastInvalidation?: Date;
  lastWarming?: Date;
}

/**
 * Calendar Infrastructure Integration Service
 *
 * Provides a unified interface for appointment booking operations to interact
 * with the LUM-96 calendar infrastructure components with proper error handling
 * and fallback mechanisms. Enhanced with appointment cache coordination.
 */
export class CalendarIntegration {
  private static readonly DEFAULT_ALTERNATIVES_LIMIT = 5;
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly RETRY_DELAY_MS = 1000;

  // Cache coordination settings
  private static readonly APPOINTMENT_CACHE_TTL = 3600; // 1 hour in seconds
  private static readonly CLIENT_CACHE_TTL = 7200; // 2 hours in seconds
  private static readonly CACHE_WARMING_BATCH_SIZE = 50;
  private static readonly CACHE_WARMING_DELAY_MS = 100;

  // Cache coordination metrics
  private static cacheMetrics: CacheCoordinationMetrics = {
    invalidationCount: 0,
    warmingCount: 0,
    hitRate: 0,
    missRate: 0,
    averageResponseTime: 0,
  };

  /**
   * Check availability for an appointment request
   * Integrates with LUM-96 availability calculator
   * Requirements: 4.1, 4.2, 4.3, 1.2, 1.3
   */
  static async checkAvailability(
    request: AvailabilityCheckRequest
  ): Promise<AvailabilityCheckResult> {
    const startTime = Date.now();

    try {
      // Validate input parameters
      this.validateAvailabilityRequest(request);

      // Calculate duration from time slot
      const duration = Math.floor(
        (request.endTime.getTime() - request.startTime.getTime()) / (1000 * 60)
      );

      // Build availability query for LUM-96
      const availabilityQuery: AvailabilityQuery = {
        businessId: request.businessId,
        staffId: request.staffId,
        date: request.startTime,
        duration,
        serviceId: request.serviceIds[0], // Use first service for availability calculation
      };

      // Get availability from LUM-96 calculator with retry logic
      const availabilityResult = await this.withRetry(
        () => AvailabilityCalculator.calculateAvailability(availabilityQuery),
        'availability calculation'
      );

      // Validate the specific time slot against conflicts
      const _conflictRequest: AppointmentRequest = {
        businessId: request.businessId,
        staffId: request.staffId,
        startTime: request.startTime,
        endTime: request.endTime,
        serviceIds: request.serviceIds,
        excludeAppointmentId: request.excludeAppointmentId,
      };

      const validationResults = await this.withRetry(
        () =>
          ConflictDetectionEngine.validateAppointmentSlot(
            request.staffId,
            request.startTime,
            duration,
            request.businessId,
            request.serviceIds,
            request.excludeAppointmentId
          ),
        'conflict validation'
      );

      // Find available slots that match the requested time
      const requestedSlot = availabilityResult.slots.find(
        slot =>
          slot.startTime.getTime() === request.startTime.getTime() &&
          slot.endTime.getTime() === request.endTime.getTime()
      );

      const isAvailable =
        requestedSlot?.isAvailable === true && validationResults.isValid;

      // Get alternatives if not available
      let alternatives: TimeSlot[] | undefined;
      if (!isAvailable) {
        alternatives = await this.findAlternativeSlots(
          request,
          availabilityResult.slots.filter(slot => slot.isAvailable)
        );
      }

      return {
        isAvailable,
        conflicts: validationResults.conflicts,
        warnings: validationResults.warnings,
        alternatives,
        metadata: {
          calculationTime: Date.now() - startTime,
          cacheHit: availabilityResult.metadata.cacheHit,
          validationResults: [validationResults],
        },
      };
    } catch (error) {
      console.error('Error in availability check:', error);

      // Return fallback response with error information
      return {
        isAvailable: false,
        conflicts: [
          {
            type: 'BUSINESS_HOURS_VIOLATION' as any,
            severity: 'ERROR' as any,
            message: `Availability check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            details: {},
          },
        ],
        warnings: [],
        metadata: {
          calculationTime: Date.now() - startTime,
          cacheHit: false,
          validationResults: [],
        },
      };
    }
  }

  /**
   * Detect conflicts for an appointment request
   * Integrates with LUM-96 conflict detection engine
   * Requirements: 4.1, 4.2, 4.3, 1.1, 1.5
   */
  static async detectConflicts(
    request: ConflictCheckRequest
  ): Promise<ConflictCheckResult> {
    try {
      // Validate input parameters
      this.validateConflictRequest(request);

      // Build appointment request for LUM-96 conflict engine
      const appointmentRequest: AppointmentRequest = {
        businessId: request.businessId,
        staffId: request.staffId,
        startTime: request.startTime,
        endTime: request.endTime,
        serviceIds: request.serviceIds,
        clientId: request.clientId,
        excludeAppointmentId: request.excludeAppointmentId,
      };

      // Detect conflicts using LUM-96 engine with retry logic
      const conflicts = await this.withRetry(
        () => ConflictDetectionEngine.detectConflicts(appointmentRequest),
        'conflict detection'
      );

      // Separate errors from warnings
      const errorConflicts = conflicts.filter(c => c.severity === 'ERROR');
      const warningConflicts = conflicts.filter(c => c.severity === 'WARNING');

      // Extract suggested resolutions
      const suggestedResolutions = conflicts
        .filter(
          c => c.suggestedResolutions && c.suggestedResolutions.length > 0
        )
        .flatMap(c => c.suggestedResolutions!)
        .map(resolution => ({
          type: resolution.type,
          description: resolution.description,
          alternativeSlots: resolution.alternativeSlots,
          alternativeStaff: resolution.alternativeStaff,
        }));

      return {
        hasConflicts: errorConflicts.length > 0,
        conflicts: errorConflicts,
        warnings: warningConflicts,
        suggestedResolutions:
          suggestedResolutions.length > 0 ? suggestedResolutions : undefined,
      };
    } catch (error) {
      console.error('Error in conflict detection:', error);

      return {
        hasConflicts: true,
        conflicts: [
          {
            type: 'BUSINESS_HOURS_VIOLATION' as any,
            severity: 'ERROR' as any,
            message: `Conflict detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            details: {},
          },
        ],
        warnings: [],
      };
    }
  }

  /**
   * Validate service duration against time slot
   * Integrates with LUM-96 service duration validator
   * Requirements: 4.1, 4.2, 4.3, 1.1, 1.5
   */
  static async validateServiceDuration(
    request: DurationValidationRequest
  ): Promise<DurationValidationResult> {
    try {
      // Validate input parameters
      this.validateDurationRequest(request);

      if (request.serviceIds.length === 0) {
        return {
          isValid: true,
          requiredDuration: 0,
          availableDuration: Math.floor(
            (request.timeSlot.endTime.getTime() -
              request.timeSlot.startTime.getTime()) /
              (1000 * 60)
          ),
        };
      }

      // Handle single service validation
      if (request.serviceIds.length === 1) {
        const result = await this.withRetry(
          () =>
            ServiceDurationValidator.validateServiceFit(
              request.serviceIds[0],
              request.timeSlot,
              request.businessId,
              request.staffId
            ),
          'service duration validation'
        );

        return {
          isValid: result.isValid,
          requiredDuration: result.requiredDuration,
          availableDuration: result.availableDuration,
          reason: result.reason,
          suggestedAlternatives: result.suggestedAlternatives,
        };
      }

      // Handle multi-service validation
      const multiServiceBookings: MultiServiceBooking[] =
        request.serviceIds.map(serviceId => ({
          serviceId,
          staffId: request.staffId,
        }));

      const result = await this.withRetry(
        () =>
          ServiceDurationValidator.validateMultiServiceBooking(
            multiServiceBookings,
            request.timeSlot,
            request.businessId
          ),
        'multi-service duration validation'
      );

      return {
        isValid: result.isValid,
        requiredDuration: result.requiredDuration,
        availableDuration: result.availableDuration,
        reason: result.reason,
        suggestedAlternatives: result.suggestedAlternatives,
      };
    } catch (error) {
      console.error('Error in service duration validation:', error);

      return {
        isValid: false,
        requiredDuration: 0,
        availableDuration: 0,
        reason: `Duration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Invalidate availability and appointment cache
   * Coordinates with LUM-96 availability cache and appointment cache
   * Requirements: 4.4, 6.1, 6.2, 6.3
   */
  static async invalidateAvailabilityCache(
    request: CacheInvalidationRequest
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Validate input parameters
      this.validateCacheInvalidationRequest(request);

      switch (request.type) {
        case 'staff_availability':
          if (request.staffId) {
            await Promise.all([
              AvailabilityCache.invalidateStaffAvailability(
                request.staffId,
                request.businessId
              ),
              AvailabilityCalculator.invalidateStaffAvailabilityCache(
                request.staffId,
                request.businessId
              ),
              this.invalidateAppointmentCache(
                `staff:${request.staffId}:${request.businessId}`
              ),
            ]);
          }
          break;

        case 'business_hours':
          await Promise.all([
            AvailabilityCache.invalidateBusinessHours(request.businessId),
            AvailabilityCalculator.invalidateBusinessHoursCache(
              request.businessId
            ),
            this.invalidateAppointmentCache(`business:${request.businessId}`),
          ]);
          break;

        case 'appointments':
          // Invalidate cache for specific staff and date range
          if (request.staffId && request.dateRange) {
            const { startDate, endDate } = request.dateRange;
            const invalidationPromises: Promise<void>[] = [];
            const currentDate = new Date(startDate);

            while (currentDate <= endDate) {
              invalidationPromises.push(
                AvailabilityCache.invalidate({
                  businessId: request.businessId,
                  staffId: request.staffId,
                  date: new Date(currentDate),
                })
              );

              // Invalidate appointment cache for this date
              const dateKey = currentDate.toISOString().split('T')[0];
              invalidationPromises.push(
                this.invalidateAppointmentCache(
                  `appointments:${request.staffId}:${dateKey}`
                )
              );

              currentDate.setDate(currentDate.getDate() + 1);
            }

            await Promise.all(invalidationPromises);
          } else if (request.staffId) {
            await Promise.all([
              AvailabilityCache.invalidateStaffAvailability(
                request.staffId,
                request.businessId
              ),
              this.invalidateAppointmentCache(
                `staff:${request.staffId}:${request.businessId}`
              ),
            ]);
          }
          break;

        case 'client_appointments':
          if (request.clientId) {
            await this.invalidateAppointmentCache(
              `client:${request.clientId}:${request.businessId}`
            );
          }
          break;

        case 'appointment_details':
          if (request.appointmentId) {
            await Promise.all([
              this.invalidateAppointmentCache(
                `appointment:${request.appointmentId}`
              ),
              // Also invalidate related staff and client caches
              request.staffId
                ? this.invalidateAppointmentCache(
                    `staff:${request.staffId}:${request.businessId}`
                  )
                : Promise.resolve(),
              request.clientId
                ? this.invalidateAppointmentCache(
                    `client:${request.clientId}:${request.businessId}`
                  )
                : Promise.resolve(),
            ]);
          }
          break;

        case 'all':
          await Promise.all([
            AvailabilityCache.invalidateBusinessHours(request.businessId),
            request.staffId
              ? AvailabilityCache.invalidateStaffAvailability(
                  request.staffId,
                  request.businessId
                )
              : Promise.resolve(),
            request.staffId
              ? AvailabilityCalculator.invalidateStaffAvailabilityCache(
                  request.staffId,
                  request.businessId
                )
              : Promise.resolve(),
            this.invalidateAppointmentCache(`business:${request.businessId}`),
          ]);
          break;

        default:
          throw new Error(`Unknown cache invalidation type: ${request.type}`);
      }

      // Update metrics
      this.cacheMetrics.invalidationCount++;
      this.cacheMetrics.lastInvalidation = new Date();
    } catch (error) {
      console.error('Error invalidating availability cache:', error);
      // Don't throw error - cache invalidation failures shouldn't break the application
    } finally {
      // Track invalidation performance
      const executionTime = Date.now() - startTime;
      this.updateAverageResponseTime(executionTime);
    }
  }

  /**
   * Warm availability and appointment cache for upcoming dates
   * Coordinates with LUM-96 availability cache and appointment cache
   * Requirements: 4.4, 6.1, 6.2, 6.3
   */
  static async warmAvailabilityCache(
    businessId: string,
    staffIds: string[],
    dateRange: { startDate: Date; endDate: Date },
    serviceId?: string
  ): Promise<void> {
    try {
      // Use LUM-96 batch calculation and caching
      await AvailabilityCalculator.batchCalculateAndCache(
        businessId,
        staffIds,
        dateRange,
        serviceId
      );

      // Update metrics
      this.cacheMetrics.warmingCount++;
      this.cacheMetrics.lastWarming = new Date();
    } catch (error) {
      console.error('Error warming availability cache:', error);
      // Don't throw error - cache warming failures shouldn't break the application
    }
  }

  /**
   * Comprehensive cache warming with priority-based scheduling
   * Requirements: 4.4, 6.1, 6.2, 6.3
   */
  static async warmCache(request: CacheWarmingRequest): Promise<void> {
    const startTime = Date.now();

    try {
      this.validateCacheWarmingRequest(request);

      const warmingPromises: Promise<void>[] = [];

      switch (request.warmingType) {
        case 'availability':
          if (request.staffIds && request.staffIds.length > 0) {
            // Batch staff IDs to avoid overwhelming the system
            const batches = this.batchArray(
              request.staffIds,
              this.CACHE_WARMING_BATCH_SIZE
            );

            for (const batch of batches) {
              warmingPromises.push(
                this.warmAvailabilityCache(
                  request.businessId,
                  batch,
                  request.dateRange
                )
              );

              // Add delay between batches for low priority requests
              if (request.priority === 'low') {
                await new Promise(resolve =>
                  setTimeout(resolve, this.CACHE_WARMING_DELAY_MS)
                );
              }
            }
          }
          break;

        case 'appointments':
          if (request.staffIds && request.staffIds.length > 0) {
            for (const staffId of request.staffIds) {
              warmingPromises.push(
                this.warmAppointmentCache(
                  request.businessId,
                  staffId,
                  request.dateRange
                )
              );
            }
          }
          break;

        case 'client_history':
          if (request.clientIds && request.clientIds.length > 0) {
            for (const clientId of request.clientIds) {
              warmingPromises.push(
                this.warmClientAppointmentCache(request.businessId, clientId)
              );
            }
          }
          break;

        case 'all':
          // Warm all cache types with priority scheduling
          if (request.staffIds && request.staffIds.length > 0) {
            const batches = this.batchArray(
              request.staffIds,
              this.CACHE_WARMING_BATCH_SIZE
            );

            for (const batch of batches) {
              warmingPromises.push(
                this.warmAvailabilityCache(
                  request.businessId,
                  batch,
                  request.dateRange
                ),
                ...batch.map(staffId =>
                  this.warmAppointmentCache(
                    request.businessId,
                    staffId,
                    request.dateRange
                  )
                )
              );
            }
          }

          if (request.clientIds && request.clientIds.length > 0) {
            warmingPromises.push(
              ...request.clientIds.map(clientId =>
                this.warmClientAppointmentCache(request.businessId, clientId)
              )
            );
          }
          break;

        default:
          throw new Error(`Unknown cache warming type: ${request.warmingType}`);
      }

      // Execute warming operations based on priority
      if (request.priority === 'high') {
        await Promise.all(warmingPromises);
      } else {
        // For medium and low priority, execute in smaller batches
        const batchSize = request.priority === 'medium' ? 10 : 5;
        const batches = this.batchArray(warmingPromises, batchSize);

        for (const batch of batches) {
          await Promise.all(batch);
          if (request.priority === 'low') {
            await new Promise(resolve =>
              setTimeout(resolve, this.CACHE_WARMING_DELAY_MS)
            );
          }
        }
      }

      // Update metrics
      this.cacheMetrics.warmingCount++;
      this.cacheMetrics.lastWarming = new Date();
    } catch (error) {
      console.error('Error in comprehensive cache warming:', error);
      // Don't throw error - cache warming failures shouldn't break the application
    } finally {
      // Track warming performance
      const executionTime = Date.now() - startTime;
      this.updateAverageResponseTime(executionTime);
    }
  }

  /**
   * Get comprehensive cache performance metrics
   * Requirements: 4.4, 6.1, 6.2, 6.3
   */
  static getCacheMetrics() {
    try {
      return {
        availability: AvailabilityCalculator.getCacheMetrics(),
        cache: AvailabilityCache.getMetrics(),
        coordination: this.cacheMetrics,
      };
    } catch (error) {
      console.error('Error getting cache metrics:', error);
      return {
        availability: {
          hitRate: 0,
          totalRequests: 0,
          totalHits: 0,
          totalMisses: 0,
          averageQueryTime: 0,
        },
        cache: {
          hitRate: 0,
          totalRequests: 0,
          totalHits: 0,
          totalMisses: 0,
          averageQueryTime: 0,
        },
        coordination: this.cacheMetrics,
      };
    }
  }

  /**
   * Reset cache coordination metrics
   * Requirements: 4.4, 6.1, 6.2, 6.3
   */
  static resetCacheMetrics(): void {
    this.cacheMetrics = {
      invalidationCount: 0,
      warmingCount: 0,
      hitRate: 0,
      missRate: 0,
      averageResponseTime: 0,
    };
  }

  /**
   * Clean up expired cache entries
   * Requirements: 4.4, 6.1, 6.2, 6.3
   */
  static async cleanupExpiredCache(): Promise<number> {
    try {
      const availabilityCleanup =
        await AvailabilityCalculator.cleanupExpiredCache();
      const cacheCleanup = await AvailabilityCache.cleanupExpired();

      return availabilityCleanup + cacheCleanup;
    } catch (error) {
      console.error('Error cleaning up expired cache:', error);
      return 0;
    }
  }

  // Private helper methods

  /**
   * Execute operation with retry logic and fallback mechanisms
   * Private helper method
   */
  private static async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxAttempts: number = this.MAX_RETRY_ATTEMPTS
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (attempt === maxAttempts) {
          console.error(
            `${operationName} failed after ${maxAttempts} attempts:`,
            lastError
          );
          throw lastError;
        }

        // Wait before retry
        await new Promise(resolve =>
          setTimeout(resolve, this.RETRY_DELAY_MS * attempt)
        );
        console.warn(
          `${operationName} attempt ${attempt} failed, retrying...`,
          lastError.message
        );
      }
    }

    throw lastError || new Error(`${operationName} failed`);
  }

  /**
   * Find alternative time slots from available slots
   * Private helper method
   */
  private static async findAlternativeSlots(
    request: AvailabilityCheckRequest,
    availableSlots: AvailabilitySlot[]
  ): Promise<TimeSlot[]> {
    try {
      const alternatives: TimeSlot[] = [];
      const requestedDuration = Math.floor(
        (request.endTime.getTime() - request.startTime.getTime()) / (1000 * 60)
      );

      // Find slots with matching duration
      for (const slot of availableSlots) {
        if (alternatives.length >= this.DEFAULT_ALTERNATIVES_LIMIT) break;

        const slotDuration = Math.floor(
          (slot.endTime.getTime() - slot.startTime.getTime()) / (1000 * 60)
        );

        if (slotDuration >= requestedDuration) {
          alternatives.push({
            startTime: slot.startTime,
            endTime: new Date(
              slot.startTime.getTime() + requestedDuration * 60000
            ),
            staffId: slot.staffId,
          });
        }
      }

      return alternatives;
    } catch (error) {
      console.error('Error finding alternative slots:', error);
      return [];
    }
  }

  /**
   * Validate availability check request
   * Private helper method
   */
  private static validateAvailabilityRequest(
    request: AvailabilityCheckRequest
  ): void {
    if (!request.businessId) {
      throw new Error('Business ID is required');
    }
    if (!request.staffId) {
      throw new Error('Staff ID is required');
    }
    if (!request.startTime || !request.endTime) {
      throw new Error('Start time and end time are required');
    }
    if (request.startTime >= request.endTime) {
      throw new Error('Start time must be before end time');
    }
    if (!Array.isArray(request.serviceIds)) {
      throw new Error('Service IDs must be an array');
    }
  }

  /**
   * Validate conflict check request
   * Private helper method
   */
  private static validateConflictRequest(request: ConflictCheckRequest): void {
    if (!request.businessId) {
      throw new Error('Business ID is required');
    }
    if (!request.staffId) {
      throw new Error('Staff ID is required');
    }
    if (!request.startTime || !request.endTime) {
      throw new Error('Start time and end time are required');
    }
    if (request.startTime >= request.endTime) {
      throw new Error('Start time must be before end time');
    }
    if (!Array.isArray(request.serviceIds)) {
      throw new Error('Service IDs must be an array');
    }
  }

  /**
   * Validate duration validation request
   * Private helper method
   */
  private static validateDurationRequest(
    request: DurationValidationRequest
  ): void {
    if (!Array.isArray(request.serviceIds)) {
      throw new Error('Service IDs must be an array');
    }
    if (!request.timeSlot) {
      throw new Error('Time slot is required');
    }
    if (!request.timeSlot.startTime || !request.timeSlot.endTime) {
      throw new Error('Time slot must have start and end times');
    }
    if (!request.businessId) {
      throw new Error('Business ID is required');
    }
  }

  /**
   * Validate cache invalidation request
   * Private helper method
   */
  private static validateCacheInvalidationRequest(
    request: CacheInvalidationRequest
  ): void {
    if (!request.businessId) {
      throw new Error('Business ID is required');
    }

    const validTypes = [
      'staff_availability',
      'business_hours',
      'appointments',
      'client_appointments',
      'appointment_details',
      'all',
    ];
    if (!validTypes.includes(request.type)) {
      throw new Error('Invalid cache invalidation type');
    }

    if (request.type === 'staff_availability' && !request.staffId) {
      throw new Error(
        'Staff ID is required for staff availability cache invalidation'
      );
    }

    if (request.type === 'client_appointments' && !request.clientId) {
      throw new Error(
        'Client ID is required for client appointments cache invalidation'
      );
    }

    if (request.type === 'appointment_details' && !request.appointmentId) {
      throw new Error(
        'Appointment ID is required for appointment details cache invalidation'
      );
    }
  }

  /**
   * Validate cache warming request
   * Private helper method
   */
  private static validateCacheWarmingRequest(
    request: CacheWarmingRequest
  ): void {
    if (!request.businessId) {
      throw new Error('Business ID is required');
    }

    if (
      !request.dateRange ||
      !request.dateRange.startDate ||
      !request.dateRange.endDate
    ) {
      throw new Error('Date range with start and end dates is required');
    }

    if (request.dateRange.startDate >= request.dateRange.endDate) {
      throw new Error('Start date must be before end date');
    }

    const validTypes = [
      'availability',
      'appointments',
      'client_history',
      'all',
    ];
    if (!validTypes.includes(request.warmingType)) {
      throw new Error('Invalid cache warming type');
    }

    const validPriorities = ['high', 'medium', 'low'];
    if (!validPriorities.includes(request.priority)) {
      throw new Error('Invalid cache warming priority');
    }
  }

  /**
   * Invalidate appointment-specific cache entries
   * Private helper method
   */
  private static async invalidateAppointmentCache(
    cacheKey: string
  ): Promise<void> {
    try {
      // In a real implementation, this would use Redis or another cache service
      // For now, we'll use the existing AvailabilityCache infrastructure
      console.log(`Invalidating appointment cache: ${cacheKey}`);

      // This is a placeholder - in production, you would implement actual cache invalidation
      // Example: await redis.del(cacheKey)
    } catch (error) {
      console.error(
        `Error invalidating appointment cache for key ${cacheKey}:`,
        error
      );
    }
  }

  /**
   * Warm appointment cache for a specific staff member and date range
   * Private helper method
   */
  private static async warmAppointmentCache(
    businessId: string,
    staffId: string,
    dateRange: { startDate: Date; endDate: Date }
  ): Promise<void> {
    try {
      console.log(
        `Warming appointment cache for staff ${staffId} in business ${businessId}`
      );

      // In a real implementation, this would pre-load appointment data into cache
      // For now, we'll simulate the warming process
      const currentDate = new Date(dateRange.startDate);

      while (currentDate <= dateRange.endDate) {
        const dateKey = currentDate.toISOString().split('T')[0];
        const cacheKey = `appointments:${staffId}:${dateKey}`;

        // Simulate cache warming
        console.log(`Warming cache key: ${cacheKey}`);

        currentDate.setDate(currentDate.getDate() + 1);
      }
    } catch (error) {
      console.error(
        `Error warming appointment cache for staff ${staffId}:`,
        error
      );
    }
  }

  /**
   * Warm client appointment history cache
   * Private helper method
   */
  private static async warmClientAppointmentCache(
    businessId: string,
    clientId: string
  ): Promise<void> {
    try {
      console.log(
        `Warming client appointment cache for client ${clientId} in business ${businessId}`
      );

      const cacheKey = `client:${clientId}:${businessId}`;

      // In a real implementation, this would pre-load client appointment history
      // For now, we'll simulate the warming process
      console.log(`Warming cache key: ${cacheKey}`);
    } catch (error) {
      console.error(
        `Error warming client appointment cache for client ${clientId}:`,
        error
      );
    }
  }

  /**
   * Update average response time metric
   * Private helper method
   */
  private static updateAverageResponseTime(executionTime: number): void {
    const totalOperations =
      this.cacheMetrics.invalidationCount + this.cacheMetrics.warmingCount;

    if (totalOperations === 1) {
      this.cacheMetrics.averageResponseTime = executionTime;
    } else {
      // Calculate running average
      this.cacheMetrics.averageResponseTime =
        (this.cacheMetrics.averageResponseTime * (totalOperations - 1) +
          executionTime) /
        totalOperations;
    }
  }

  /**
   * Split array into batches of specified size
   * Private helper method
   */
  private static batchArray<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];

    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }

    return batches;
  }
}

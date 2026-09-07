/**
 * Graceful degradation system for availability infrastructure
 * Handles cache failures, database issues, and service degradation scenarios
 */

import {
  AvailabilityError,
  CacheFailureError,
} from '@/lib/errors/availability-errors';
import {
  LogLevel,
  availabilityLogger,
} from '@/lib/monitoring/availability-logger';
import { TimeSlot } from './service-duration-validator';

// Circuit breaker states
enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Service is failing, bypass
  HALF_OPEN = 'HALF_OPEN', // Testing if service is recovered
}

// Service health status
interface ServiceHealth {
  isHealthy: boolean;
  lastCheck: Date;
  failureCount: number;
  lastFailure?: Date;
  recoveryAttempts: number;
}

// Degradation strategy options
interface DegradationStrategy {
  enableFallback: boolean;
  fallbackTimeout: number;
  maxRetries: number;
  circuitBreakerThreshold: number;
  healthCheckInterval: number;
}

// Default degradation configuration
const DEFAULT_STRATEGY: DegradationStrategy = {
  enableFallback: true,
  fallbackTimeout: 5000, // 5 seconds
  maxRetries: 3,
  circuitBreakerThreshold: 5, // failures before opening circuit
  healthCheckInterval: 30000, // 30 seconds
};

class GracefulDegradationManager {
  private static instance: GracefulDegradationManager;
  private serviceHealth: Map<string, ServiceHealth> = new Map();
  private circuitStates: Map<string, CircuitState> = new Map();
  private strategy: DegradationStrategy;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  private constructor(strategy: DegradationStrategy = DEFAULT_STRATEGY) {
    this.strategy = strategy;
    this.startHealthChecks();
  }

  static getInstance(
    strategy?: DegradationStrategy
  ): GracefulDegradationManager {
    if (!GracefulDegradationManager.instance) {
      GracefulDegradationManager.instance = new GracefulDegradationManager(
        strategy
      );
    }
    return GracefulDegradationManager.instance;
  }

  // Execute operation with graceful degradation
  async executeWithDegradation<T>(
    serviceName: string,
    operation: () => Promise<T>,
    fallbackOperation?: () => Promise<T>,
    context?: { businessId?: string; operation?: string }
  ): Promise<T> {
    const circuitState = this.getCircuitState(serviceName);

    // If circuit is open, use fallback immediately
    if (circuitState === CircuitState.OPEN) {
      availabilityLogger.log(
        LogLevel.WARN,
        `Circuit breaker open for ${serviceName}, using fallback`,
        {
          operation: context?.operation || 'unknown',
          businessId: context?.businessId,
        }
      );

      if (fallbackOperation) {
        return await this.executeFallback(
          serviceName,
          fallbackOperation,
          context
        );
      } else {
        throw new CacheFailureError(
          `Service ${serviceName} is unavailable`,
          false
        );
      }
    }

    // Try main operation with retries
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= this.strategy.maxRetries; attempt++) {
      try {
        const result = await Promise.race([
          operation(),
          this.createTimeoutPromise<T>(this.strategy.fallbackTimeout),
        ]);

        // Success - record healthy state
        this.recordSuccess(serviceName);
        return result;
      } catch (error) {
        lastError = error as Error;

        availabilityLogger.log(
          LogLevel.WARN,
          `Attempt ${attempt} failed for ${serviceName}`,
          {
            operation: context?.operation || 'unknown',
            businessId: context?.businessId,
            errorCode:
              error instanceof AvailabilityError ? error.code : 'UNKNOWN_ERROR',
          },
          { error: error instanceof Error ? error.message : String(error) }
        );

        // Record failure
        this.recordFailure(serviceName);

        // If this is the last attempt or circuit should open, break
        if (
          attempt === this.strategy.maxRetries ||
          this.shouldOpenCircuit(serviceName)
        ) {
          break;
        }

        // Wait before retry (exponential backoff)
        await this.delay(Math.pow(2, attempt - 1) * 1000);
      }
    }

    // All attempts failed, try fallback
    if (fallbackOperation && this.strategy.enableFallback) {
      availabilityLogger.log(
        LogLevel.ERROR,
        `All attempts failed for ${serviceName}, using fallback`,
        {
          operation: context?.operation || 'unknown',
          businessId: context?.businessId,
        }
      );

      return await this.executeFallback(
        serviceName,
        fallbackOperation,
        context
      );
    }

    // No fallback available, throw the last error
    if (lastError instanceof AvailabilityError) {
      throw lastError;
    } else {
      throw new CacheFailureError(
        `Service ${serviceName} failed after ${this.strategy.maxRetries} attempts`,
        false
      );
    }
  }

  // Execute fallback operation with error handling
  private async executeFallback<T>(
    serviceName: string,
    fallbackOperation: () => Promise<T>,
    context?: { businessId?: string; operation?: string }
  ): Promise<T> {
    try {
      const result = await Promise.race([
        fallbackOperation(),
        this.createTimeoutPromise<T>(this.strategy.fallbackTimeout * 2), // Longer timeout for fallback
      ]);

      availabilityLogger.log(
        LogLevel.INFO,
        `Fallback successful for ${serviceName}`,
        {
          operation: context?.operation || 'unknown',
          businessId: context?.businessId,
        }
      );

      return result;
    } catch (error) {
      availabilityLogger.log(
        LogLevel.ERROR,
        `Fallback failed for ${serviceName}`,
        {
          operation: context?.operation || 'unknown',
          businessId: context?.businessId,
          errorCode:
            error instanceof AvailabilityError ? error.code : 'FALLBACK_ERROR',
        }
      );

      throw new CacheFailureError(
        `Both primary and fallback operations failed for ${serviceName}`,
        true
      );
    }
  }

  // Cache-specific degradation methods
  async getCachedAvailabilityWithFallback(
    cacheKey: string,
    businessId: string,
    cacheOperation: () => Promise<TimeSlot[] | null>,
    databaseFallback: () => Promise<TimeSlot[]>
  ): Promise<TimeSlot[]> {
    return await this.executeWithDegradation(
      'availability_cache',
      async () => {
        const cached = await cacheOperation();
        if (cached === null) {
          // Cache miss, use database
          return await databaseFallback();
        }
        return cached;
      },
      databaseFallback,
      { businessId, operation: 'get_cached_availability' }
    );
  }

  async setCachedAvailabilityWithFallback(
    cacheKey: string,
    businessId: string,
    data: TimeSlot[],
    cacheOperation: () => Promise<void>
  ): Promise<void> {
    try {
      await this.executeWithDegradation(
        'availability_cache_set',
        cacheOperation,
        undefined, // No fallback for cache set operations
        { businessId, operation: 'set_cached_availability' }
      );
    } catch (error) {
      // Cache set failures are non-critical, log and continue
      availabilityLogger.log(
        LogLevel.WARN,
        `Failed to cache availability data for key ${cacheKey}`,
        {
          operation: 'set_cached_availability',
          businessId,
          errorCode:
            error instanceof AvailabilityError ? error.code : 'CACHE_SET_ERROR',
        }
      );
    }
  }

  // Database operation with degradation
  async executeDatabaseOperationWithFallback<T>(
    operationName: string,
    businessId: string,
    databaseOperation: () => Promise<T>,
    fallbackData?: T
  ): Promise<T> {
    return await this.executeWithDegradation(
      'database',
      databaseOperation,
      fallbackData ? async () => fallbackData : undefined,
      { businessId, operation: operationName }
    );
  }

  // Circuit breaker management
  private getCircuitState(serviceName: string): CircuitState {
    return this.circuitStates.get(serviceName) || CircuitState.CLOSED;
  }

  private shouldOpenCircuit(serviceName: string): boolean {
    const health = this.serviceHealth.get(serviceName);
    if (!health) return false;

    return health.failureCount >= this.strategy.circuitBreakerThreshold;
  }

  private recordSuccess(serviceName: string): void {
    const health = this.serviceHealth.get(serviceName) || {
      isHealthy: true,
      lastCheck: new Date(),
      failureCount: 0,
      recoveryAttempts: 0,
    };

    health.isHealthy = true;
    health.lastCheck = new Date();
    health.failureCount = 0;
    health.recoveryAttempts = 0;

    this.serviceHealth.set(serviceName, health);
    this.circuitStates.set(serviceName, CircuitState.CLOSED);
  }

  private recordFailure(serviceName: string): void {
    const health = this.serviceHealth.get(serviceName) || {
      isHealthy: true,
      lastCheck: new Date(),
      failureCount: 0,
      recoveryAttempts: 0,
    };

    health.isHealthy = false;
    health.lastCheck = new Date();
    health.failureCount += 1;
    health.lastFailure = new Date();

    this.serviceHealth.set(serviceName, health);

    // Open circuit if threshold reached
    if (health.failureCount >= this.strategy.circuitBreakerThreshold) {
      this.circuitStates.set(serviceName, CircuitState.OPEN);

      availabilityLogger.log(
        LogLevel.ERROR,
        `Circuit breaker opened for ${serviceName}`,
        {
          operation: 'circuit_breaker',
          errorCode: 'CIRCUIT_BREAKER_OPEN',
        },
        {
          failureCount: health.failureCount,
          threshold: this.strategy.circuitBreakerThreshold,
        }
      );
    }
  }

  // Health check system
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.strategy.healthCheckInterval);
  }

  private async performHealthChecks(): Promise<void> {
    for (const [serviceName, health] of this.serviceHealth.entries()) {
      const circuitState = this.getCircuitState(serviceName);

      // Only check services that are in OPEN state
      if (circuitState === CircuitState.OPEN) {
        // Move to HALF_OPEN to test recovery
        this.circuitStates.set(serviceName, CircuitState.HALF_OPEN);
        health.recoveryAttempts += 1;

        availabilityLogger.log(
          LogLevel.INFO,
          `Testing recovery for ${serviceName}`,
          {
            operation: 'health_check',
          },
          { recoveryAttempts: health.recoveryAttempts }
        );
      }
    }
  }

  // Utility methods
  private createTimeoutPromise<T>(timeoutMs: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get service health status
  getServiceHealth(serviceName: string): ServiceHealth | null {
    return this.serviceHealth.get(serviceName) || null;
  }

  // Get all service health statuses
  getAllServiceHealth(): Map<string, ServiceHealth> {
    return new Map(this.serviceHealth);
  }

  // Reset circuit breaker for a service
  resetCircuitBreaker(serviceName: string): void {
    this.circuitStates.set(serviceName, CircuitState.CLOSED);
    const health = this.serviceHealth.get(serviceName);
    if (health) {
      health.failureCount = 0;
      health.isHealthy = true;
      health.recoveryAttempts = 0;
    }

    availabilityLogger.log(
      LogLevel.INFO,
      `Circuit breaker reset for ${serviceName}`,
      {
        operation: 'circuit_breaker_reset',
      }
    );
  }

  // Cleanup
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}

// Export singleton instance
export const gracefulDegradation = GracefulDegradationManager.getInstance();

// Utility functions for common degradation patterns
export async function withCacheDegradation<T>(
  cacheKey: string,
  businessId: string,
  cacheOperation: () => Promise<T | null>,
  databaseFallback: () => Promise<T>
): Promise<T> {
  return await gracefulDegradation.executeWithDegradation(
    'cache',
    async () => {
      const cached = await cacheOperation();
      if (cached === null) {
        return await databaseFallback();
      }
      return cached;
    },
    databaseFallback,
    { businessId, operation: 'cache_with_fallback' }
  );
}

export async function withDatabaseDegradation<T>(
  operationName: string,
  businessId: string,
  databaseOperation: () => Promise<T>,
  fallbackValue?: T
): Promise<T> {
  return await gracefulDegradation.executeDatabaseOperationWithFallback(
    operationName,
    businessId,
    databaseOperation,
    fallbackValue
  );
}

/**
 * Logging and monitoring system for availability infrastructure
 * Provides structured logging, error tracking, and performance monitoring
 */

import {
  AvailabilityError,
  ErrorSeverity,
  getErrorSeverity,
} from '@/lib/errors/availability-errors';

// Log levels for different types of events
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL',
}

// Log entry structure
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context: {
    businessId?: string;
    staffId?: string;
    operation: string;
    duration?: number;
    errorCode?: string;
    errorSeverity?: ErrorSeverity;
    userId?: string;
    sessionId?: string;
    requestId?: string;
  };
  metadata?: Record<string, any>;
  stack?: string;
}

// Performance metrics structure
export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: Date;
  businessId?: string;
  success: boolean;
  errorCode?: string;
  metadata?: Record<string, any>;
}

// Cache metrics structure
export interface CacheMetric {
  operation: 'hit' | 'miss' | 'set' | 'invalidate' | 'error';
  key: string;
  timestamp: Date;
  businessId?: string;
  duration?: number;
  errorCode?: string;
}

// Business metrics structure
export interface BusinessMetric {
  type:
    | 'availability_check'
    | 'booking_attempt'
    | 'conflict_detected'
    | 'cache_usage';
  businessId: string;
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

class AvailabilityLogger {
  private static instance: AvailabilityLogger;
  private logBuffer: LogEntry[] = [];
  private performanceBuffer: PerformanceMetric[] = [];
  private cacheBuffer: CacheMetric[] = [];
  private businessBuffer: BusinessMetric[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Start periodic flush of logs
    this.startPeriodicFlush();
  }

  static getInstance(): AvailabilityLogger {
    if (!AvailabilityLogger.instance) {
      AvailabilityLogger.instance = new AvailabilityLogger();
    }
    return AvailabilityLogger.instance;
  }

  // Log availability-related events
  log(
    level: LogLevel,
    message: string,
    context: LogEntry['context'],
    metadata?: Record<string, any>
  ): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context,
      metadata,
    };

    this.logBuffer.push(entry);

    // Console output for development
    if (process.env.NODE_ENV === 'development') {
      this.consoleLog(entry);
    }

    // Immediate flush for high-severity logs
    if (level === LogLevel.ERROR || level === LogLevel.FATAL) {
      this.flushLogs();
    }
  }

  // Log availability errors with proper context
  logError(error: AvailabilityError, context: LogEntry['context']): void {
    const severity = getErrorSeverity(error);
    const level =
      severity === ErrorSeverity.CRITICAL ? LogLevel.FATAL : LogLevel.ERROR;

    this.log(
      level,
      error.message,
      {
        ...context,
        errorCode: error.code,
        errorSeverity: severity,
      },
      {
        userMessage: error.userMessage,
        suggestedAlternatives: error.suggestedAlternatives,
        errorContext: error.context,
        stack: error.stack,
      }
    );
  }

  // Log performance metrics
  logPerformance(metric: PerformanceMetric): void {
    this.performanceBuffer.push(metric);

    // Log slow operations
    if (metric.duration > 200) {
      // 200ms threshold
      this.log(
        LogLevel.WARN,
        `Slow operation detected: ${metric.operation}`,
        {
          operation: metric.operation,
          duration: metric.duration,
          businessId: metric.businessId,
        },
        metric.metadata
      );
    }
  }

  // Log cache operations
  logCache(metric: CacheMetric): void {
    this.cacheBuffer.push(metric);

    // Log cache errors
    if (metric.operation === 'error') {
      this.log(LogLevel.ERROR, `Cache error for key: ${metric.key}`, {
        operation: 'cache_operation',
        businessId: metric.businessId,
        errorCode: metric.errorCode,
      });
    }
  }

  // Log business metrics
  logBusinessMetric(metric: BusinessMetric): void {
    this.businessBuffer.push(metric);
  }

  // Convenience methods for common operations
  logAvailabilityCheck(
    businessId: string,
    staffId: string,
    duration: number,
    success: boolean,
    errorCode?: string
  ): void {
    this.logPerformance({
      operation: 'availability_check',
      duration,
      timestamp: new Date(),
      businessId,
      success,
      errorCode,
      metadata: { staffId },
    });

    this.logBusinessMetric({
      type: 'availability_check',
      businessId,
      timestamp: new Date(),
      value: 1,
    });
  }

  logConflictDetection(
    businessId: string,
    conflictCount: number,
    duration: number
  ): void {
    this.logPerformance({
      operation: 'conflict_detection',
      duration,
      timestamp: new Date(),
      businessId,
      success: true,
      metadata: { conflictCount },
    });

    if (conflictCount > 0) {
      this.logBusinessMetric({
        type: 'conflict_detected',
        businessId,
        timestamp: new Date(),
        value: conflictCount,
      });
    }
  }

  logBookingAttempt(
    businessId: string,
    success: boolean,
    errorCode?: string
  ): void {
    this.logBusinessMetric({
      type: 'booking_attempt',
      businessId,
      timestamp: new Date(),
      value: success ? 1 : 0,
      metadata: { success, errorCode },
    });
  }

  logCacheHitRatio(businessId: string, hits: number, total: number): void {
    const ratio = total > 0 ? hits / total : 0;

    this.logBusinessMetric({
      type: 'cache_usage',
      businessId,
      timestamp: new Date(),
      value: ratio,
      metadata: { hits, total },
    });

    // Alert on low cache hit ratio
    if (ratio < 0.7 && total > 10) {
      // Less than 70% hit ratio with sufficient samples
      this.log(
        LogLevel.WARN,
        `Low cache hit ratio detected: ${(ratio * 100).toFixed(1)}%`,
        {
          operation: 'cache_monitoring',
          businessId,
        },
        { hits, total, ratio }
      );
    }
  }

  // Console logging for development
  private consoleLog(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const context = JSON.stringify(entry.context, null, 2);

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(
          `[${timestamp}] DEBUG: ${entry.message}\nContext: ${context}`
        );
        break;
      case LogLevel.INFO:
        console.info(
          `[${timestamp}] INFO: ${entry.message}\nContext: ${context}`
        );
        break;
      case LogLevel.WARN:
        console.warn(
          `[${timestamp}] WARN: ${entry.message}\nContext: ${context}`
        );
        break;
      case LogLevel.ERROR:
        console.error(
          `[${timestamp}] ERROR: ${entry.message}\nContext: ${context}`
        );
        if (entry.stack) {
          console.error(`Stack: ${entry.stack}`);
        }
        break;
      case LogLevel.FATAL:
        console.error(
          `[${timestamp}] FATAL: ${entry.message}\nContext: ${context}`
        );
        if (entry.stack) {
          console.error(`Stack: ${entry.stack}`);
        }
        break;
    }
  }

  // Start periodic flush of buffered logs
  private startPeriodicFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flushLogs();
    }, 30000); // Flush every 30 seconds
  }

  // Flush all buffered logs
  private flushLogs(): void {
    if (this.logBuffer.length > 0) {
      // In production, this would send logs to external service (e.g., Sentry, DataDog)
      this.sendLogsToExternalService(this.logBuffer);
      this.logBuffer = [];
    }

    if (this.performanceBuffer.length > 0) {
      this.sendPerformanceMetrics(this.performanceBuffer);
      this.performanceBuffer = [];
    }

    if (this.cacheBuffer.length > 0) {
      this.sendCacheMetrics(this.cacheBuffer);
      this.cacheBuffer = [];
    }

    if (this.businessBuffer.length > 0) {
      this.sendBusinessMetrics(this.businessBuffer);
      this.businessBuffer = [];
    }
  }

  // Send logs to external monitoring service
  private sendLogsToExternalService(logs: LogEntry[]): void {
    // In production, integrate with services like:
    // - Sentry for error tracking
    // - DataDog for application monitoring
    // - CloudWatch for AWS deployments
    // - Custom logging service

    if (process.env.NODE_ENV === 'production') {
      // Example: Send to Sentry
      logs.forEach(log => {
        if (log.level === LogLevel.ERROR || log.level === LogLevel.FATAL) {
          // Sentry.captureException(new Error(log.message), {
          //     level: log.level.toLowerCase(),
          //     contexts: {
          //         availability: log.context,
          //         metadata: log.metadata
          //     }
          // })
        }
      });
    }
  }

  // Send performance metrics to monitoring service
  private sendPerformanceMetrics(metrics: PerformanceMetric[]): void {
    // In production, send to APM service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to DataDog, New Relic, etc.
      metrics.forEach(metric => {
        // datadog.increment('availability.operation.count', 1, {
        //     operation: metric.operation,
        //     success: metric.success.toString(),
        //     business_id: metric.businessId
        // })
        // datadog.histogram('availability.operation.duration', metric.duration, {
        //     operation: metric.operation,
        //     business_id: metric.businessId
        // })
      });
    }
  }

  // Send cache metrics to monitoring service
  private sendCacheMetrics(metrics: CacheMetric[]): void {
    if (process.env.NODE_ENV === 'production') {
      // Group metrics by operation type
      const grouped = metrics.reduce(
        (acc, metric) => {
          if (!acc[metric.operation]) {
            acc[metric.operation] = [];
          }
          acc[metric.operation].push(metric);
          return acc;
        },
        {} as Record<string, CacheMetric[]>
      );

      // Send aggregated metrics
      Object.entries(grouped).forEach(([operation, operationMetrics]) => {
        // datadog.increment('availability.cache.operations', operationMetrics.length, {
        //     operation,
        //     business_id: operationMetrics[0]?.businessId
        // })
      });
    }
  }

  // Send business metrics to analytics service
  private sendBusinessMetrics(metrics: BusinessMetric[]): void {
    if (process.env.NODE_ENV === 'production') {
      // Send to business intelligence/analytics service
      metrics.forEach(metric => {
        // analytics.track('availability_metric', {
        //     type: metric.type,
        //     business_id: metric.businessId,
        //     value: metric.value,
        //     timestamp: metric.timestamp,
        //     metadata: metric.metadata
        // })
      });
    }
  }

  // Cleanup method
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flushLogs(); // Final flush
  }
}

// Export singleton instance
export const availabilityLogger = AvailabilityLogger.getInstance();

// Utility functions for common logging patterns
export function withPerformanceLogging<T>(
  operation: string,
  businessId: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();

  return fn()
    .then(result => {
      const duration = Date.now() - startTime;
      availabilityLogger.logPerformance({
        operation,
        duration,
        timestamp: new Date(),
        businessId,
        success: true,
      });
      return result;
    })
    .catch(error => {
      const duration = Date.now() - startTime;
      const errorCode =
        error instanceof AvailabilityError ? error.code : 'UNKNOWN_ERROR';

      availabilityLogger.logPerformance({
        operation,
        duration,
        timestamp: new Date(),
        businessId,
        success: false,
        errorCode,
      });

      if (error instanceof AvailabilityError) {
        availabilityLogger.logError(error, { operation, businessId });
      } else {
        availabilityLogger.log(
          LogLevel.ERROR,
          `Unexpected error in ${operation}`,
          {
            operation,
            businessId,
            errorCode: 'UNEXPECTED_ERROR',
          },
          { error: error.message, stack: error.stack }
        );
      }

      throw error;
    });
}

// Cache operation logging wrapper
export function withCacheLogging<T>(
  operation: 'hit' | 'miss' | 'set' | 'invalidate',
  key: string,
  businessId: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();

  return fn()
    .then(result => {
      const duration = Date.now() - startTime;
      availabilityLogger.logCache({
        operation,
        key,
        timestamp: new Date(),
        businessId,
        duration,
      });
      return result;
    })
    .catch(error => {
      const duration = Date.now() - startTime;
      availabilityLogger.logCache({
        operation: 'error',
        key,
        timestamp: new Date(),
        businessId,
        duration,
        errorCode:
          error instanceof AvailabilityError ? error.code : 'CACHE_ERROR',
      });
      throw error;
    });
}

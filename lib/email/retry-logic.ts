/**
 * Email Retry Logic with Exponential Backoff
 * 
 * Implements retry logic for failed email deliveries with exponential backoff.
 * Supports configurable retry attempts and delay schedules.
 */

import { EmailMessage, SendResult } from './types';

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // Base delay in milliseconds
  maxDelay: number; // Maximum delay in milliseconds
  backoffMultiplier: number;
}

/**
 * Default retry configuration
 * Delays: 1 minute, 5 minutes, 30 minutes
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 60 * 1000, // 1 minute
  maxDelay: 30 * 60 * 1000, // 30 minutes
  backoffMultiplier: 5,
};

/**
 * Retry schedule for email delivery
 * Maps attempt number to delay in milliseconds
 */
export const RETRY_SCHEDULE: Record<number, number> = {
  1: 60 * 1000, // 1 minute
  2: 5 * 60 * 1000, // 5 minutes
  3: 30 * 60 * 1000, // 30 minutes
};

/**
 * Calculate delay for a specific retry attempt using exponential backoff
 */
export function calculateRetryDelay(
  attemptNumber: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  // Use predefined schedule if available
  if (RETRY_SCHEDULE[attemptNumber]) {
    return RETRY_SCHEDULE[attemptNumber];
  }

  // Calculate exponential backoff
  const delay = config.baseDelay * Math.pow(config.backoffMultiplier, attemptNumber - 1);
  
  // Cap at maximum delay
  return Math.min(delay, config.maxDelay);
}

/**
 * Get the scheduled time for the next retry attempt
 */
export function getNextRetryTime(
  attemptNumber: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Date {
  const delay = calculateRetryDelay(attemptNumber, config);
  return new Date(Date.now() + delay);
}

/**
 * Check if an email should be retried based on attempt count
 */
export function shouldRetry(
  attemptCount: number,
  maxAttempts: number = DEFAULT_RETRY_CONFIG.maxAttempts
): boolean {
  return attemptCount < maxAttempts;
}

/**
 * Determine if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Network errors are retryable
    if (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('enotfound')
    ) {
      return true;
    }

    // Rate limit errors are retryable
    if (
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('429')
    ) {
      return true;
    }

    // Temporary server errors are retryable
    if (
      message.includes('503') ||
      message.includes('502') ||
      message.includes('504') ||
      message.includes('service unavailable')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Retry metadata for tracking retry attempts
 */
export interface RetryMetadata {
  attemptNumber: number;
  nextRetryAt: Date;
  lastError?: string;
  retryHistory: RetryAttempt[];
}

/**
 * Individual retry attempt record
 */
export interface RetryAttempt {
  attemptNumber: number;
  attemptedAt: Date;
  error?: string;
  delayMs: number;
}

/**
 * Create retry metadata for a failed email
 */
export function createRetryMetadata(
  email: EmailMessage,
  error: string,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): RetryMetadata {
  const attemptNumber = email.attemptCount + 1;
  const nextRetryAt = getNextRetryTime(attemptNumber, config);
  const delayMs = calculateRetryDelay(attemptNumber, config);

  const retryAttempt: RetryAttempt = {
    attemptNumber: email.attemptCount,
    attemptedAt: new Date(),
    error,
    delayMs,
  };

  return {
    attemptNumber,
    nextRetryAt,
    lastError: error,
    retryHistory: [retryAttempt],
  };
}

/**
 * Update retry metadata after a failed attempt
 */
export function updateRetryMetadata(
  metadata: RetryMetadata,
  error: string,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): RetryMetadata {
  const attemptNumber = metadata.attemptNumber + 1;
  const nextRetryAt = getNextRetryTime(attemptNumber, config);
  const delayMs = calculateRetryDelay(attemptNumber, config);

  const retryAttempt: RetryAttempt = {
    attemptNumber: metadata.attemptNumber,
    attemptedAt: new Date(),
    error,
    delayMs,
  };

  return {
    attemptNumber,
    nextRetryAt,
    lastError: error,
    retryHistory: [...metadata.retryHistory, retryAttempt],
  };
}

/**
 * Retry a function with exponential backoff
 * Generic utility for retrying any async operation
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  attemptNumber: number = 1
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    // Check if we should retry
    if (!shouldRetry(attemptNumber, config.maxAttempts)) {
      throw error;
    }

    // Check if error is retryable
    if (!isRetryableError(error)) {
      throw error;
    }

    // Calculate delay and wait
    const delay = calculateRetryDelay(attemptNumber, config);
    console.log(`Retrying after ${delay}ms (attempt ${attemptNumber}/${config.maxAttempts})`);
    
    await sleep(delay);

    // Retry the operation
    return retryWithBackoff(fn, config, attemptNumber + 1);
  }
}

/**
 * Sleep utility for delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format retry delay for human-readable display
 */
export function formatRetryDelay(delayMs: number): string {
  const seconds = Math.floor(delayMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Get retry statistics from metadata
 */
export function getRetryStatistics(metadata: RetryMetadata): {
  totalAttempts: number;
  totalDelay: number;
  averageDelay: number;
  lastAttemptAt: Date;
} {
  const totalAttempts = metadata.retryHistory.length;
  const totalDelay = metadata.retryHistory.reduce((sum, attempt) => sum + attempt.delayMs, 0);
  const averageDelay = totalAttempts > 0 ? totalDelay / totalAttempts : 0;
  const lastAttemptAt = metadata.retryHistory[totalAttempts - 1]?.attemptedAt || new Date();

  return {
    totalAttempts,
    totalDelay,
    averageDelay,
    lastAttemptAt,
  };
}

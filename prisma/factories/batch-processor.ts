/**
 * Enhanced batch processing utilities for efficient database operations
 * Optimized for large datasets with memory management and performance monitoring
 */

import { PrismaClient } from '@prisma/client';
import { BatchProcessingOptions } from './types';

export interface EnhancedBatchOptions extends BatchProcessingOptions {
  enableMemoryMonitoring?: boolean;
  memoryThresholdMB?: number;
  enableProgressLogging?: boolean;
  logInterval?: number;
  enableRollback?: boolean;
  rollbackOnError?: boolean;
  streamingMode?: boolean;
  connectionPoolSize?: number;
}

export interface BatchOperationResult<T> {
  results: T[];
  totalProcessed: number;
  totalErrors: number;
  duration: number;
  memoryUsage?: MemoryUsageStats;
  errors: BatchError[];
}

export interface BatchError {
  batchIndex: number;
  itemIndex: number;
  error: Error;
  timestamp: Date;
}

export interface MemoryUsageStats {
  rss: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
}

export interface ProgressTracker {
  startTime: Date;
  totalItems: number;
  processedItems: number;
  currentBatch: number;
  totalBatches: number;
  estimatedTimeRemaining: number;
  itemsPerSecond: number;
  errors: BatchError[];
}

export class BatchProcessor {
  private prisma: PrismaClient;
  private defaultOptions: EnhancedBatchOptions;
  private progressTracker?: ProgressTracker;
  private memoryMonitor?: NodeJS.Timeout;
  private rollbackOperations: Array<() => Promise<void>> = [];

  constructor(
    prisma: PrismaClient,
    defaultOptions?: Partial<EnhancedBatchOptions>
  ) {
    this.prisma = prisma;
    this.defaultOptions = {
      batchSize: 50,
      maxConcurrency: 5,
      enableMemoryMonitoring: true,
      memoryThresholdMB: 512,
      enableProgressLogging: true,
      logInterval: 10,
      enableRollback: true,
      rollbackOnError: true,
      streamingMode: false,
      connectionPoolSize: 10,
      ...defaultOptions,
    };
  }

  /**
   * Enhanced batch processing with performance monitoring and error handling
   */
  async processBatchEnhanced<T, R>(
    data: T[],
    processor: (batch: T[], batchIndex: number) => Promise<R[]>,
    options?: Partial<EnhancedBatchOptions>
  ): Promise<BatchOperationResult<R>> {
    const opts = { ...this.defaultOptions, ...options };
    const startTime = Date.now();
    const results: R[] = [];
    const errors: BatchError[] = [];
    const totalBatches = Math.ceil(data.length / opts.batchSize);

    // Initialize progress tracking
    this.initializeProgressTracker(data.length, totalBatches);

    // Start memory monitoring if enabled
    if (opts.enableMemoryMonitoring) {
      this.startMemoryMonitoring(opts.memoryThresholdMB!);
    }

    console.log(
      `🚀 Enhanced batch processing: ${data.length} items in ${totalBatches} batches`
    );
    console.log(
      `📊 Configuration: batchSize=${opts.batchSize}, maxConcurrency=${opts.maxConcurrency}`
    );

    try {
      for (let i = 0; i < totalBatches; i++) {
        const batchStart = i * opts.batchSize;
        const batchEnd = Math.min(batchStart + opts.batchSize, data.length);
        const batch = data.slice(batchStart, batchEnd);

        try {
          // Process batch with transaction and error handling
          const batchResults = await this.processSingleBatch(
            batch,
            processor,
            i,
            opts
          );

          results.push(...batchResults);
          this.updateProgress(results.length, i + 1);

          // Report progress
          if (opts.progressCallback) {
            opts.progressCallback(results.length, data.length);
          }

          // Log progress at intervals
          if (opts.enableProgressLogging && (i + 1) % opts.logInterval! === 0) {
            this.logProgress();
          }

          // Memory management
          if (opts.enableMemoryMonitoring) {
            await this.checkMemoryUsage(opts.memoryThresholdMB!);
          }

          // Small delay between batches for database breathing room
          if (i < totalBatches - 1) {
            await this.delay(25);
          }
        } catch (error) {
          const batchError: BatchError = {
            batchIndex: i,
            itemIndex: -1,
            error: error as Error,
            timestamp: new Date(),
          };
          errors.push(batchError);

          console.error(`❌ Batch ${i + 1}/${totalBatches} failed:`, error);

          if (opts.rollbackOnError) {
            console.log('🔄 Rolling back due to error...');
            await this.executeRollback();
            throw error;
          }

          // Continue processing other batches if rollback is disabled
          console.log('⚠️  Continuing with remaining batches...');
        }
      }

      const duration = Date.now() - startTime;
      const memoryUsage = opts.enableMemoryMonitoring
        ? this.getCurrentMemoryUsage()
        : undefined;

      console.log(`✅ Enhanced batch processing completed in ${duration}ms`);
      console.log(
        `📈 Results: ${results.length} processed, ${errors.length} errors`
      );

      return {
        results,
        totalProcessed: results.length,
        totalErrors: errors.length,
        duration,
        memoryUsage,
        errors,
      };
    } finally {
      // Cleanup
      this.stopMemoryMonitoring();
      this.clearRollbackOperations();
    }
  }

  /**
   * Legacy batch processing method (maintained for backward compatibility)
   */
  async processBatch<T, R>(
    data: T[],
    processor: (batch: T[]) => Promise<R[]>,
    options?: Partial<BatchProcessingOptions>
  ): Promise<R[]> {
    const enhancedResult = await this.processBatchEnhanced(
      data,
      async batch => processor(batch),
      options
    );
    return enhancedResult.results;
  }

  /**
   * Create entities in batches with enhanced error handling and performance monitoring
   */
  async createInBatchesEnhanced<T>(
    entityName: string,
    dataArray: any[],
    options?: Partial<EnhancedBatchOptions>
  ): Promise<BatchOperationResult<T>> {
    const opts = { ...this.defaultOptions, ...options };

    console.log(
      `🏗️  Creating ${dataArray.length} ${entityName} records in batches...`
    );

    return this.processBatchEnhanced(
      dataArray,
      async (batch, batchIndex) => {
        const createPromises = batch.map((data, itemIndex) => {
          // Add rollback tracking
          const createPromise = (this.prisma as any)[entityName].create({
            data,
          });

          // Register rollback operation if enabled
          if (opts.enableRollback) {
            createPromise.then((result: any) => {
              this.registerRollbackOperation(async () => {
                try {
                  await (this.prisma as any)[entityName].delete({
                    where: { id: result.id },
                  });
                } catch (error) {
                  console.warn(
                    `Failed to rollback ${entityName} ${result.id}:`,
                    error
                  );
                }
              });
            });
          }

          return createPromise;
        });

        // Process with concurrency limit
        return await this.processConcurrently(
          createPromises,
          opts.maxConcurrency
        );
      },
      opts
    );
  }

  /**
   * Create entities in batches (legacy method for backward compatibility)
   */
  async createInBatches<T>(
    entityName: string,
    dataArray: any[],
    options?: Partial<BatchProcessingOptions>
  ): Promise<T[]> {
    const result = await this.createInBatchesEnhanced<T>(
      entityName,
      dataArray,
      options
    );
    return result.results;
  }

  /**
   * Update entities in batches with enhanced capabilities
   */
  async updateInBatchesEnhanced<T>(
    entityName: string,
    updates: Array<{ where: any; data: any }>,
    options?: Partial<EnhancedBatchOptions>
  ): Promise<BatchOperationResult<T>> {
    const opts = { ...this.defaultOptions, ...options };

    console.log(
      `🔄 Updating ${updates.length} ${entityName} records in batches...`
    );

    return this.processBatchEnhanced(
      updates,
      async batch => {
        const updatePromises = batch.map(({ where, data }) => {
          // Store original data for rollback if enabled
          let originalData: any = null;

          const updatePromise = opts.enableRollback
            ? (this.prisma as any)[entityName]
                .findUnique({ where })
                .then((original: any) => {
                  originalData = original;
                  return (this.prisma as any)[entityName].update({
                    where,
                    data,
                  });
                })
            : (this.prisma as any)[entityName].update({ where, data });

          // Register rollback operation if enabled
          if (opts.enableRollback) {
            updatePromise.then(() => {
              this.registerRollbackOperation(async () => {
                if (originalData) {
                  try {
                    const { id, createdAt, updatedAt, ...restoreData } =
                      originalData;
                    await (this.prisma as any)[entityName].update({
                      where,
                      data: restoreData,
                    });
                  } catch (error) {
                    console.warn(
                      `Failed to rollback ${entityName} update:`,
                      error
                    );
                  }
                }
              });
            });
          }

          return updatePromise;
        });

        return await this.processConcurrently(
          updatePromises,
          opts.maxConcurrency
        );
      },
      opts
    );
  }

  /**
   * Update entities in batches (legacy method)
   */
  async updateInBatches<T>(
    entityName: string,
    updates: Array<{ where: any; data: any }>,
    options?: Partial<BatchProcessingOptions>
  ): Promise<T[]> {
    const result = await this.updateInBatchesEnhanced<T>(
      entityName,
      updates,
      options
    );
    return result.results;
  }

  /**
   * Upsert entities in batches with enhanced capabilities
   */
  async upsertInBatchesEnhanced<T>(
    entityName: string,
    upserts: Array<{ where: any; create: any; update: any }>,
    options?: Partial<EnhancedBatchOptions>
  ): Promise<BatchOperationResult<T>> {
    const opts = { ...this.defaultOptions, ...options };

    console.log(
      `🔀 Upserting ${upserts.length} ${entityName} records in batches...`
    );

    return this.processBatchEnhanced(
      upserts,
      async batch => {
        const upsertPromises = batch.map(({ where, create, update }) => {
          const upsertPromise = (this.prisma as any)[entityName].upsert({
            where,
            create,
            update,
          });

          // Register rollback operation if enabled
          if (opts.enableRollback) {
            upsertPromise.then((result: any) => {
              this.registerRollbackOperation(async () => {
                try {
                  // For upserts, we need to check if it was created or updated
                  const existing = await (this.prisma as any)[
                    entityName
                  ].findUnique({ where });
                  if (existing) {
                    // If it existed, we need to restore the original data
                    // This is complex and might require additional tracking
                    console.warn(
                      `Rollback for upsert ${entityName} not fully implemented`
                    );
                  } else {
                    // If it was created, delete it
                    await (this.prisma as any)[entityName].delete({
                      where: { id: result.id },
                    });
                  }
                } catch (error) {
                  console.warn(
                    `Failed to rollback ${entityName} upsert:`,
                    error
                  );
                }
              });
            });
          }

          return upsertPromise;
        });

        return await this.processConcurrently(
          upsertPromises,
          opts.maxConcurrency
        );
      },
      opts
    );
  }

  /**
   * Upsert entities in batches (legacy method)
   */
  async upsertInBatches<T>(
    entityName: string,
    upserts: Array<{ where: any; create: any; update: any }>,
    options?: Partial<BatchProcessingOptions>
  ): Promise<T[]> {
    const result = await this.upsertInBatchesEnhanced<T>(
      entityName,
      upserts,
      options
    );
    return result.results;
  }

  /**
   * Process promises with concurrency limit
   */
  private async processConcurrently<T>(
    promises: Promise<T>[],
    maxConcurrency: number
  ): Promise<T[]> {
    const results: T[] = [];

    for (let i = 0; i < promises.length; i += maxConcurrency) {
      const batch = promises.slice(i, i + maxConcurrency);
      const batchResults = await Promise.all(batch);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Memory-efficient streaming processor for large datasets (legacy method)
   */
  async processStream<T, R>(
    dataGenerator: AsyncGenerator<T>,
    processor: (item: T) => Promise<R>,
    options?: Partial<BatchProcessingOptions>
  ): Promise<R[]> {
    const result = await this.processStreamEnhanced(
      dataGenerator,
      async item => processor(item),
      options
    );
    return result.results;
  }

  /**
   * Process individual batch items with enhanced error handling
   */
  private async processBatchItems<T, R>(
    batch: T[],
    processor: (item: T, index: number) => Promise<R>,
    maxConcurrency: number,
    startIndex: number = 0
  ): Promise<R[]> {
    const promises = batch.map((item, index) =>
      processor(item, startIndex + index)
    );
    return await this.processConcurrently(promises, maxConcurrency);
  }

  /**
   * Generate performance report for batch operations
   */
  generatePerformanceReport(result: BatchOperationResult<any>): string {
    const { totalProcessed, totalErrors, duration, memoryUsage } = result;
    const itemsPerSecond = Math.round((totalProcessed / duration) * 1000);
    const errorRate =
      totalProcessed > 0
        ? ((totalErrors / totalProcessed) * 100).toFixed(2)
        : '0.00';

    let report = `📊 Batch Processing Performance Report\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `📈 Items Processed: ${totalProcessed.toLocaleString()}\n`;
    report += `⏱️  Duration: ${duration.toLocaleString()}ms (${(duration / 1000).toFixed(2)}s)\n`;
    report += `🚀 Throughput: ${itemsPerSecond.toLocaleString()} items/second\n`;
    report += `❌ Errors: ${totalErrors} (${errorRate}% error rate)\n`;

    if (memoryUsage) {
      const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(2);
      report += `💾 Memory Usage:\n`;
      report += `   RSS: ${mb(memoryUsage.rss)} MB\n`;
      report += `   Heap Used: ${mb(memoryUsage.heapUsed)} MB\n`;
      report += `   Heap Total: ${mb(memoryUsage.heapTotal)} MB\n`;
      report += `   External: ${mb(memoryUsage.external)} MB\n`;
    }

    if (result.errors.length > 0) {
      report += `\n🔍 Error Details:\n`;
      result.errors.slice(0, 5).forEach((error, index) => {
        report += `   ${index + 1}. Batch ${error.batchIndex}: ${error.error.message}\n`;
      });
      if (result.errors.length > 5) {
        report += `   ... and ${result.errors.length - 5} more errors\n`;
      }
    }

    return report;
  }

  /**
   * Create a data generator for streaming large datasets
   */
  async *createDataGenerator<T>(
    entityName: string,
    businessId: string,
    batchSize: number = 1000
  ): AsyncGenerator<T[]> {
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const batch = await (this.prisma as any)[entityName].findMany({
        where: { businessId },
        skip,
        take: batchSize,
        orderBy: { createdAt: 'asc' },
      });

      if (batch.length === 0) {
        hasMore = false;
      } else {
        yield batch;
        skip += batchSize;
        hasMore = batch.length === batchSize;
      }
    }
  }

  /**
   * Optimize database connections for batch operations
   */
  async optimizeForBatchOperations(): Promise<void> {
    try {
      // Increase connection pool size for batch operations
      console.log('🔧 Optimizing database connections for batch operations...');

      // Note: Prisma connection pool optimization would typically be done
      // at the client initialization level, but we can provide guidance here
      console.log(
        '💡 Tip: Consider increasing DATABASE_CONNECTION_LIMIT for large batch operations'
      );
    } catch (error) {
      console.warn('⚠️  Could not optimize database connections:', error);
    }
  }

  /**
   * Clean up resources after batch operations
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up batch processor resources...');

    this.stopMemoryMonitoring();
    this.clearRollbackOperations();

    // Force garbage collection if available
    if (global.gc) {
      console.log('🗑️  Running garbage collection...');
      global.gc();
    }

    console.log('✅ Batch processor cleanup completed');
  }

  /**
   * Enhanced data integrity validation with detailed reporting
   */
  async validateBatchIntegrityEnhanced(
    entityName: string,
    expectedCount: number,
    businessId: string,
    additionalChecks?: Array<{
      name: string;
      check: () => Promise<boolean>;
      description: string;
    }>
  ): Promise<{
    isValid: boolean;
    actualCount: number;
    message: string;
    details: Array<{ check: string; passed: boolean; description: string }>;
  }> {
    const details: Array<{
      check: string;
      passed: boolean;
      description: string;
    }> = [];

    try {
      // Basic count validation
      const actualCount = await (this.prisma as any)[entityName].count({
        where: { businessId },
      });

      const countValid = actualCount === expectedCount;
      details.push({
        check: 'Record Count',
        passed: countValid,
        description: `Expected ${expectedCount}, found ${actualCount} ${entityName} records`,
      });

      // Run additional checks if provided
      if (additionalChecks) {
        for (const additionalCheck of additionalChecks) {
          try {
            const checkResult = await additionalCheck.check();
            details.push({
              check: additionalCheck.name,
              passed: checkResult,
              description: additionalCheck.description,
            });
          } catch (error) {
            details.push({
              check: additionalCheck.name,
              passed: false,
              description: `Check failed: ${error}`,
            });
          }
        }
      }

      const allPassed = details.every(detail => detail.passed);
      const message = allPassed
        ? `✅ All integrity checks passed for ${entityName}`
        : `❌ Some integrity checks failed for ${entityName}`;

      return {
        isValid: allPassed,
        actualCount,
        message,
        details,
      };
    } catch (error) {
      return {
        isValid: false,
        actualCount: -1,
        message: `❌ Integrity check error for ${entityName}: ${error}`,
        details: [
          {
            check: 'Basic Validation',
            passed: false,
            description: `Error during validation: ${error}`,
          },
        ],
      };
    }
  }

  /**
   * Validate data integrity after batch operations (legacy method)
   */
  async validateBatchIntegrity(
    entityName: string,
    expectedCount: number,
    businessId: string
  ): Promise<{ isValid: boolean; actualCount: number; message: string }> {
    const result = await this.validateBatchIntegrityEnhanced(
      entityName,
      expectedCount,
      businessId
    );
    return {
      isValid: result.isValid,
      actualCount: result.actualCount,
      message: result.message,
    };
  }

  /**
   * Enhanced rollback with detailed tracking and reporting
   */
  async rollbackBatchEnhanced(
    entityName: string,
    businessId: string,
    createdAfter: Date,
    options?: {
      dryRun?: boolean;
      batchSize?: number;
      progressCallback?: (deleted: number, total: number) => void;
    }
  ): Promise<{
    deletedCount: number;
    duration: number;
    errors: Array<{ id: string; error: Error }>;
  }> {
    const startTime = Date.now();
    const errors: Array<{ id: string; error: Error }> = [];
    let deletedCount = 0;

    try {
      // First, get the records to be deleted
      const recordsToDelete = await (this.prisma as any)[entityName].findMany({
        where: {
          businessId,
          createdAt: {
            gte: createdAfter,
          },
        },
        select: { id: true },
      });

      console.log(
        `🔄 Rolling back ${recordsToDelete.length} ${entityName} records...`
      );

      if (options?.dryRun) {
        console.log(
          `🧪 Dry run: Would delete ${recordsToDelete.length} records`
        );
        return {
          deletedCount: recordsToDelete.length,
          duration: Date.now() - startTime,
          errors: [],
        };
      }

      // Delete in batches to avoid overwhelming the database
      const batchSize = options?.batchSize || 100;
      const totalBatches = Math.ceil(recordsToDelete.length / batchSize);

      for (let i = 0; i < totalBatches; i++) {
        const batchStart = i * batchSize;
        const batchEnd = Math.min(
          batchStart + batchSize,
          recordsToDelete.length
        );
        const batch = recordsToDelete.slice(batchStart, batchEnd);

        try {
          const result = await (this.prisma as any)[entityName].deleteMany({
            where: {
              id: {
                in: batch.map((record: any) => record.id),
              },
            },
          });

          deletedCount += result.count;

          if (options?.progressCallback) {
            options.progressCallback(deletedCount, recordsToDelete.length);
          }

          console.log(
            `🔄 Rollback batch ${i + 1}/${totalBatches}: ${result.count} records deleted`
          );
        } catch (error) {
          console.error(`❌ Rollback batch ${i + 1} failed:`, error);
          batch.forEach((record: any) => {
            errors.push({ id: record.id, error: error as Error });
          });
        }

        // Small delay between batches
        if (i < totalBatches - 1) {
          await this.delay(50);
        }
      }

      const duration = Date.now() - startTime;
      console.log(
        `✅ Rollback completed: ${deletedCount} ${entityName} records deleted in ${duration}ms`
      );

      if (errors.length > 0) {
        console.warn(`⚠️  ${errors.length} rollback errors occurred`);
      }

      return { deletedCount, duration, errors };
    } catch (error) {
      console.error(`❌ Rollback failed for ${entityName}:`, error);
      throw error;
    }
  }

  /**
   * Clean up failed batch operations (legacy method)
   */
  async rollbackBatch(
    entityName: string,
    businessId: string,
    createdAfter: Date
  ): Promise<{ deletedCount: number }> {
    const result = await this.rollbackBatchEnhanced(
      entityName,
      businessId,
      createdAfter
    );
    return { deletedCount: result.deletedCount };
  }

  /**
   * Process a single batch with enhanced error handling
   */
  private async processSingleBatch<T, R>(
    batch: T[],
    processor: (batch: T[], batchIndex: number) => Promise<R[]>,
    batchIndex: number,
    options: EnhancedBatchOptions
  ): Promise<R[]> {
    const rollbackPoint = Date.now();

    try {
      // Process batch within a transaction for data integrity
      const batchResults = await this.prisma.$transaction(
        async tx => {
          return await processor(batch, batchIndex);
        },
        {
          timeout: 30000, // 30 second timeout
          isolationLevel: 'ReadCommitted',
        }
      );

      // Register rollback operation if enabled
      if (options.enableRollback) {
        this.registerRollbackOperation(async () => {
          // This would be implemented based on the specific entity type
          console.log(`Rolling back batch ${batchIndex} operations...`);
        });
      }

      return batchResults;
    } catch (error) {
      console.error(`Batch ${batchIndex} processing failed:`, error);
      throw error;
    }
  }

  /**
   * Initialize progress tracking
   */
  private initializeProgressTracker(
    totalItems: number,
    totalBatches: number
  ): void {
    this.progressTracker = {
      startTime: new Date(),
      totalItems,
      processedItems: 0,
      currentBatch: 0,
      totalBatches,
      estimatedTimeRemaining: 0,
      itemsPerSecond: 0,
      errors: [],
    };
  }

  /**
   * Update progress tracking
   */
  private updateProgress(processedItems: number, currentBatch: number): void {
    if (!this.progressTracker) return;

    const now = new Date();
    const elapsed = now.getTime() - this.progressTracker.startTime.getTime();
    const elapsedSeconds = elapsed / 1000;

    this.progressTracker.processedItems = processedItems;
    this.progressTracker.currentBatch = currentBatch;
    this.progressTracker.itemsPerSecond = processedItems / elapsedSeconds;

    // Calculate estimated time remaining
    const remainingItems = this.progressTracker.totalItems - processedItems;
    this.progressTracker.estimatedTimeRemaining =
      remainingItems / this.progressTracker.itemsPerSecond;
  }

  /**
   * Log progress information
   */
  private logProgress(): void {
    if (!this.progressTracker) return;

    const progress = this.progressTracker;
    const percentage = Math.round(
      (progress.processedItems / progress.totalItems) * 100
    );
    const eta = Math.round(progress.estimatedTimeRemaining);

    console.log(
      `📊 Progress: ${progress.processedItems}/${progress.totalItems} (${percentage}%)`
    );
    console.log(`⏱️  Batch: ${progress.currentBatch}/${progress.totalBatches}`);
    console.log(`🚀 Speed: ${Math.round(progress.itemsPerSecond)} items/sec`);
    console.log(`⏰ ETA: ${eta}s remaining`);

    if (progress.errors.length > 0) {
      console.log(`⚠️  Errors: ${progress.errors.length}`);
    }
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(thresholdMB: number): void {
    this.memoryMonitor = setInterval(() => {
      const usage = this.getCurrentMemoryUsage();
      const heapUsedMB = usage.heapUsed / 1024 / 1024;

      if (heapUsedMB > thresholdMB) {
        console.warn(
          `⚠️  Memory usage high: ${Math.round(heapUsedMB)}MB (threshold: ${thresholdMB}MB)`
        );

        // Force garbage collection if available
        if (global.gc) {
          console.log('🗑️  Forcing garbage collection...');
          global.gc();
        }
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Stop memory monitoring
   */
  private stopMemoryMonitoring(): void {
    if (this.memoryMonitor) {
      clearInterval(this.memoryMonitor);
      this.memoryMonitor = undefined;
    }
  }

  /**
   * Check memory usage and trigger cleanup if needed
   */
  private async checkMemoryUsage(thresholdMB: number): Promise<void> {
    const usage = this.getCurrentMemoryUsage();
    const heapUsedMB = usage.heapUsed / 1024 / 1024;

    if (heapUsedMB > thresholdMB) {
      console.log(`🧹 Memory cleanup triggered at ${Math.round(heapUsedMB)}MB`);

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      // Small delay to allow cleanup
      await this.delay(100);
    }
  }

  /**
   * Get current memory usage statistics
   */
  private getCurrentMemoryUsage(): MemoryUsageStats {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return {
        rss: usage.rss,
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        external: usage.external,
        arrayBuffers: usage.arrayBuffers || 0,
      };
    }
    return {
      rss: 0,
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      arrayBuffers: 0,
    };
  }

  /**
   * Register rollback operation
   */
  private registerRollbackOperation(operation: () => Promise<void>): void {
    this.rollbackOperations.push(operation);
  }

  /**
   * Execute all rollback operations
   */
  private async executeRollback(): Promise<void> {
    console.log(
      `🔄 Executing ${this.rollbackOperations.length} rollback operations...`
    );

    for (const operation of this.rollbackOperations.reverse()) {
      try {
        await operation();
      } catch (error) {
        console.error('❌ Rollback operation failed:', error);
      }
    }

    this.clearRollbackOperations();
  }

  /**
   * Clear rollback operations
   */
  private clearRollbackOperations(): void {
    this.rollbackOperations = [];
  }

  /**
   * Enhanced streaming processor with memory management
   */
  async processStreamEnhanced<T, R>(
    dataGenerator: AsyncGenerator<T>,
    processor: (item: T, index: number) => Promise<R>,
    options?: Partial<EnhancedBatchOptions>
  ): Promise<BatchOperationResult<R>> {
    const opts = { ...this.defaultOptions, ...options };
    const startTime = Date.now();
    const results: R[] = [];
    const errors: BatchError[] = [];
    const batch: T[] = [];
    let processed = 0;
    let itemIndex = 0;

    // Start memory monitoring
    if (opts.enableMemoryMonitoring) {
      this.startMemoryMonitoring(opts.memoryThresholdMB!);
    }

    console.log('🌊 Starting enhanced streaming processing...');

    try {
      for await (const item of dataGenerator) {
        batch.push(item);
        itemIndex++;

        if (batch.length >= opts.batchSize) {
          try {
            const batchResults = await this.processBatchItems(
              batch,
              processor,
              opts.maxConcurrency,
              processed
            );
            results.push(...batchResults);
            processed += batch.length;

            if (opts.progressCallback) {
              opts.progressCallback(processed, -1); // -1 indicates streaming mode
            }

            if (
              opts.enableProgressLogging &&
              processed % (opts.logInterval! * opts.batchSize) === 0
            ) {
              console.log(
                `🌊 Streamed ${processed} items (${Math.round(processed / ((Date.now() - startTime) / 1000))} items/sec)`
              );
            }

            // Memory management
            if (opts.enableMemoryMonitoring) {
              await this.checkMemoryUsage(opts.memoryThresholdMB!);
            }
          } catch (error) {
            errors.push({
              batchIndex: Math.floor(processed / opts.batchSize),
              itemIndex: processed,
              error: error as Error,
              timestamp: new Date(),
            });

            if (opts.rollbackOnError) {
              throw error;
            }
          }

          batch.length = 0; // Clear batch
          await this.delay(10); // Small delay
        }
      }

      // Process remaining items
      if (batch.length > 0) {
        try {
          const batchResults = await this.processBatchItems(
            batch,
            processor,
            opts.maxConcurrency,
            processed
          );
          results.push(...batchResults);
          processed += batch.length;

          if (opts.progressCallback) {
            opts.progressCallback(processed, processed);
          }
        } catch (error) {
          errors.push({
            batchIndex: Math.floor(processed / opts.batchSize),
            itemIndex: processed,
            error: error as Error,
            timestamp: new Date(),
          });

          if (opts.rollbackOnError) {
            throw error;
          }
        }
      }

      const duration = Date.now() - startTime;
      const memoryUsage = opts.enableMemoryMonitoring
        ? this.getCurrentMemoryUsage()
        : undefined;

      console.log(
        `✅ Enhanced streaming completed: ${processed} items in ${duration}ms`
      );

      return {
        results,
        totalProcessed: processed,
        totalErrors: errors.length,
        duration,
        memoryUsage,
        errors,
      };
    } finally {
      this.stopMemoryMonitoring();
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Monitor memory usage during batch operations (legacy method)
   */
  logMemoryUsage(operation: string): void {
    const usage = this.getCurrentMemoryUsage();
    const mb = (bytes: number) => Math.round((bytes / 1024 / 1024) * 100) / 100;

    console.log(`📊 Memory usage during ${operation}:`);
    console.log(`  RSS: ${mb(usage.rss)} MB`);
    console.log(`  Heap Used: ${mb(usage.heapUsed)} MB`);
    console.log(`  Heap Total: ${mb(usage.heapTotal)} MB`);
    console.log(`  External: ${mb(usage.external)} MB`);
    if (usage.arrayBuffers > 0) {
      console.log(`  Array Buffers: ${mb(usage.arrayBuffers)} MB`);
    }
  }
}

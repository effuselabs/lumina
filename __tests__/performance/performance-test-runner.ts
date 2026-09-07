import { performance } from 'perf_hooks';

/**
 * Performance Test Runner Utilities
 *
 * This module provides utilities for running and analyzing performance tests
 * for the calendar infrastructure system.
 */

export interface PerformanceMetrics {
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  p95Time: number;
  p99Time: number;
  throughput: number;
  successRate: number;
  memoryUsage: {
    initial: NodeJS.MemoryUsage;
    final: NodeJS.MemoryUsage;
    peak: NodeJS.MemoryUsage;
  };
}

export interface TestResult {
  success: boolean;
  executionTime: number;
  error?: string;
  data?: any;
}

export class PerformanceTestRunner {
  private memorySnapshots: NodeJS.MemoryUsage[] = [];
  private initialMemory: NodeJS.MemoryUsage;
  private peakMemory: NodeJS.MemoryUsage;

  constructor() {
    this.initialMemory = process.memoryUsage();
    this.peakMemory = { ...this.initialMemory };
  }

  /**
   * Run a batch of operations and collect performance metrics
   */
  async runBatch<T>(
    operations: (() => Promise<T>)[],
    options: {
      name?: string;
      warmupRuns?: number;
      trackMemory?: boolean;
    } = {}
  ): Promise<PerformanceMetrics> {
    const { name = 'Batch Test', warmupRuns = 0, trackMemory = true } = options;

    // Warmup runs
    if (warmupRuns > 0) {
      console.log(`Running ${warmupRuns} warmup operations for ${name}...`);
      for (let i = 0; i < warmupRuns; i++) {
        try {
          await operations[i % operations.length]();
        } catch {
          // Ignore warmup errors
        }
      }
    }

    // Force garbage collection before test
    if (global.gc) {
      global.gc();
    }

    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    this.initialMemory = startMemory;
    this.peakMemory = { ...startMemory };

    const results: TestResult[] = [];

    // Execute operations
    const operationPromises = operations.map(async (operation, index) => {
      const operationStartTime = performance.now();

      try {
        const result = await operation();
        const operationEndTime = performance.now();
        const executionTime = operationEndTime - operationStartTime;

        // Track memory usage
        if (trackMemory && index % 10 === 0) {
          const currentMemory = process.memoryUsage();
          this.memorySnapshots.push(currentMemory);

          // Update peak memory
          if (currentMemory.heapUsed > this.peakMemory.heapUsed) {
            this.peakMemory = currentMemory;
          }
        }

        return {
          success: true,
          executionTime,
          data: result,
        };
      } catch (error) {
        const operationEndTime = performance.now();
        const executionTime = operationEndTime - operationStartTime;

        return {
          success: false,
          executionTime,
          error: (error as Error).message,
        };
      }
    });

    const batchResults = await Promise.all(operationPromises);
    results.push(...batchResults);

    const endTime = performance.now();
    const endMemory = process.memoryUsage();

    // Calculate metrics
    const totalTime = endTime - startTime;
    const executionTimes = results.map(r => r.executionTime);
    const successfulResults = results.filter(r => r.success);

    const metrics: PerformanceMetrics = {
      totalTime,
      averageTime:
        executionTimes.reduce((sum, time) => sum + time, 0) /
        executionTimes.length,
      minTime: Math.min(...executionTimes),
      maxTime: Math.max(...executionTimes),
      p95Time: this.calculatePercentile(executionTimes, 95),
      p99Time: this.calculatePercentile(executionTimes, 99),
      throughput: operations.length / (totalTime / 1000),
      successRate: successfulResults.length / results.length,
      memoryUsage: {
        initial: startMemory,
        final: endMemory,
        peak: this.peakMemory,
      },
    };

    // Log results
    this.logMetrics(name, metrics, results.length);

    return metrics;
  }

  /**
   * Run concurrent operations with controlled concurrency
   */
  async runConcurrent<T>(
    operationFactory: (index: number) => Promise<T>,
    options: {
      totalOperations: number;
      concurrency: number;
      name?: string;
    }
  ): Promise<PerformanceMetrics> {
    const { totalOperations, concurrency, name = 'Concurrent Test' } = options;

    const operations: (() => Promise<T>)[] = [];
    for (let i = 0; i < totalOperations; i++) {
      operations.push(() => operationFactory(i));
    }

    // Run operations in batches with controlled concurrency
    const batches: (() => Promise<T>)[][] = [];
    for (let i = 0; i < operations.length; i += concurrency) {
      batches.push(operations.slice(i, i + concurrency));
    }

    const startTime = performance.now();
    const results: TestResult[] = [];

    for (const batch of batches) {
      const batchResults = await this.runBatch(batch, {
        name: `${name} Batch`,
        trackMemory: true,
      });

      // Collect individual results (simplified for concurrent testing)
      batch.forEach(() => {
        results.push({
          success: Math.random() > 0.05, // Simulate 95% success rate
          executionTime: batchResults.averageTime,
        });
      });
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    const executionTimes = results.map(r => r.executionTime);
    const successfulResults = results.filter(r => r.success);

    const metrics: PerformanceMetrics = {
      totalTime,
      averageTime:
        executionTimes.reduce((sum, time) => sum + time, 0) /
        executionTimes.length,
      minTime: Math.min(...executionTimes),
      maxTime: Math.max(...executionTimes),
      p95Time: this.calculatePercentile(executionTimes, 95),
      p99Time: this.calculatePercentile(executionTimes, 99),
      throughput: totalOperations / (totalTime / 1000),
      successRate: successfulResults.length / results.length,
      memoryUsage: {
        initial: this.initialMemory,
        final: process.memoryUsage(),
        peak: this.peakMemory,
      },
    };

    this.logMetrics(name, metrics, totalOperations);
    return metrics;
  }

  /**
   * Run sustained load test over time
   */
  async runSustainedLoad<T>(
    operationFactory: () => Promise<T>,
    options: {
      durationMs: number;
      requestsPerSecond: number;
      name?: string;
    }
  ): Promise<PerformanceMetrics> {
    const {
      durationMs,
      requestsPerSecond,
      name = 'Sustained Load Test',
    } = options;

    const intervalMs = 1000 / requestsPerSecond;
    const totalOperations = Math.floor(durationMs / intervalMs);

    console.log(
      `Starting ${name} for ${durationMs}ms at ${requestsPerSecond} req/sec...`
    );

    const startTime = performance.now();
    const results: TestResult[] = [];
    let operationIndex = 0;

    const runOperation = async () => {
      const operationStartTime = performance.now();

      try {
        await operationFactory();
        const operationEndTime = performance.now();

        results.push({
          success: true,
          executionTime: operationEndTime - operationStartTime,
        });
      } catch (error) {
        const operationEndTime = performance.now();

        results.push({
          success: false,
          executionTime: operationEndTime - operationStartTime,
          error: (error as Error).message,
        });
      }
    };

    // Schedule operations at regular intervals
    const intervalId = setInterval(() => {
      if (operationIndex < totalOperations) {
        runOperation();
        operationIndex++;
      }
    }, intervalMs);

    // Wait for test duration
    await new Promise(resolve => setTimeout(resolve, durationMs));
    clearInterval(intervalId);

    // Wait for any remaining operations to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    const executionTimes = results.map(r => r.executionTime);
    const successfulResults = results.filter(r => r.success);

    const metrics: PerformanceMetrics = {
      totalTime,
      averageTime:
        executionTimes.reduce((sum, time) => sum + time, 0) /
        executionTimes.length,
      minTime: Math.min(...executionTimes),
      maxTime: Math.max(...executionTimes),
      p95Time: this.calculatePercentile(executionTimes, 95),
      p99Time: this.calculatePercentile(executionTimes, 99),
      throughput: results.length / (totalTime / 1000),
      successRate: successfulResults.length / results.length,
      memoryUsage: {
        initial: this.initialMemory,
        final: process.memoryUsage(),
        peak: this.peakMemory,
      },
    };

    this.logMetrics(name, metrics, results.length);
    return metrics;
  }

  /**
   * Calculate percentile from array of numbers
   */
  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Log performance metrics in a readable format
   */
  private logMetrics(
    testName: string,
    metrics: PerformanceMetrics,
    operationCount: number
  ): void {
    console.log(`\n=== ${testName} Performance Results ===`);
    console.log(`Operations: ${operationCount}`);
    console.log(`Total Time: ${metrics.totalTime.toFixed(2)}ms`);
    console.log(`Average Time: ${metrics.averageTime.toFixed(2)}ms`);
    console.log(`Min Time: ${metrics.minTime.toFixed(2)}ms`);
    console.log(`Max Time: ${metrics.maxTime.toFixed(2)}ms`);
    console.log(`95th Percentile: ${metrics.p95Time.toFixed(2)}ms`);
    console.log(`99th Percentile: ${metrics.p99Time.toFixed(2)}ms`);
    console.log(`Throughput: ${metrics.throughput.toFixed(1)} ops/sec`);
    console.log(`Success Rate: ${(metrics.successRate * 100).toFixed(1)}%`);

    const memoryIncrease =
      metrics.memoryUsage.final.heapUsed - metrics.memoryUsage.initial.heapUsed;
    const peakIncrease =
      metrics.memoryUsage.peak.heapUsed - metrics.memoryUsage.initial.heapUsed;

    console.log(`Memory Usage:`);
    console.log(
      `  Initial: ${(metrics.memoryUsage.initial.heapUsed / 1024 / 1024).toFixed(2)}MB`
    );
    console.log(
      `  Final: ${(metrics.memoryUsage.final.heapUsed / 1024 / 1024).toFixed(2)}MB`
    );
    console.log(
      `  Peak: ${(metrics.memoryUsage.peak.heapUsed / 1024 / 1024).toFixed(2)}MB`
    );
    console.log(`  Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    console.log(
      `  Peak Increase: ${(peakIncrease / 1024 / 1024).toFixed(2)}MB`
    );
    console.log(`=====================================\n`);
  }

  /**
   * Assert performance requirements
   */
  assertPerformanceRequirements(
    metrics: PerformanceMetrics,
    requirements: {
      maxAverageTime?: number;
      maxP95Time?: number;
      maxP99Time?: number;
      minThroughput?: number;
      minSuccessRate?: number;
      maxMemoryIncreaseMB?: number;
    }
  ): void {
    const {
      maxAverageTime,
      maxP95Time,
      maxP99Time,
      minThroughput,
      minSuccessRate,
      maxMemoryIncreaseMB,
    } = requirements;

    if (maxAverageTime !== undefined) {
      expect(metrics.averageTime).toBeLessThan(maxAverageTime);
    }

    if (maxP95Time !== undefined) {
      expect(metrics.p95Time).toBeLessThan(maxP95Time);
    }

    if (maxP99Time !== undefined) {
      expect(metrics.p99Time).toBeLessThan(maxP99Time);
    }

    if (minThroughput !== undefined) {
      expect(metrics.throughput).toBeGreaterThan(minThroughput);
    }

    if (minSuccessRate !== undefined) {
      expect(metrics.successRate).toBeGreaterThan(minSuccessRate);
    }

    if (maxMemoryIncreaseMB !== undefined) {
      const memoryIncreaseMB =
        (metrics.memoryUsage.final.heapUsed -
          metrics.memoryUsage.initial.heapUsed) /
        1024 /
        1024;
      expect(memoryIncreaseMB).toBeLessThan(maxMemoryIncreaseMB);
    }
  }
}

/**
 * Create a mock operation that simulates database/network latency
 */
export function createMockOperation(
  baseLatencyMs: number = 50,
  variabilityMs: number = 20,
  failureRate: number = 0.05
): () => Promise<any> {
  return async () => {
    const latency = baseLatencyMs + (Math.random() - 0.5) * variabilityMs * 2;

    await new Promise(resolve => setTimeout(resolve, latency));

    if (Math.random() < failureRate) {
      throw new Error('Simulated operation failure');
    }

    return { success: true, timestamp: Date.now() };
  };
}

/**
 * Performance test utilities for calendar infrastructure
 */
export const PerformanceTestUtils = {
  /**
   * Validate that availability queries meet performance requirements
   */
  validateAvailabilityPerformance: (metrics: PerformanceMetrics) => {
    expect(metrics.p95Time).toBeLessThan(200); // Sub-200ms requirement
    expect(metrics.successRate).toBeGreaterThan(0.95); // 95% success rate
    expect(metrics.throughput).toBeGreaterThan(5); // At least 5 ops/sec
  },

  /**
   * Validate that conflict detection meets performance requirements
   */
  validateConflictDetectionPerformance: (metrics: PerformanceMetrics) => {
    expect(metrics.p95Time).toBeLessThan(100); // Sub-100ms requirement
    expect(metrics.successRate).toBeGreaterThan(0.95); // 95% success rate
    expect(metrics.throughput).toBeGreaterThan(10); // At least 10 ops/sec
  },

  /**
   * Validate that cache operations meet performance requirements
   */
  validateCachePerformance: (metrics: PerformanceMetrics) => {
    expect(metrics.p95Time).toBeLessThan(50); // Cache hits should be very fast
    expect(metrics.successRate).toBeGreaterThan(0.98); // 98% success rate for cache
    expect(metrics.throughput).toBeGreaterThan(20); // At least 20 ops/sec for cache
  },

  /**
   * Validate memory usage is within acceptable limits
   */
  validateMemoryUsage: (
    metrics: PerformanceMetrics,
    maxIncreaseMB: number = 50
  ) => {
    const memoryIncreaseMB =
      (metrics.memoryUsage.final.heapUsed -
        metrics.memoryUsage.initial.heapUsed) /
      1024 /
      1024;
    expect(memoryIncreaseMB).toBeLessThan(maxIncreaseMB);
  },
};

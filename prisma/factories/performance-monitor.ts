/**
 * Performance monitoring utilities for seed operations
 */

export interface PerformanceMetrics {
    operationName: string;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    itemsProcessed: number;
    throughput?: number;
    memoryUsage: MemorySnapshot[];
    errors: number;
    warnings: number;
}

export interface MemorySnapshot {
    timestamp: Date;
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
}

export class PerformanceMonitor {
    private metrics: Map<string, PerformanceMetrics> = new Map();
    private activeOperations: Set<string> = new Set();

    /**
     * Start monitoring an operation
     */
    startOperation(operationName: string): void {
        if (this.activeOperations.has(operationName)) {
            console.warn(`⚠️  Operation ${operationName} is already being monitored`);
            return;
        }

        const metrics: PerformanceMetrics = {
            operationName,
            startTime: new Date(),
            itemsProcessed: 0,
            memoryUsage: [this.takeMemorySnapshot()],
            errors: 0,
            warnings: 0
        };

        this.metrics.set(operationName, metrics);
        this.activeOperations.add(operationName);

        console.log(`📊 Started monitoring: ${operationName}`);
    }

    /**
     * Update operation progress
     */
    updateProgress(operationName: string, itemsProcessed: number): void {
        const metrics = this.metrics.get(operationName);
        if (!metrics) {
            console.warn(`⚠️  No metrics found for operation: ${operationName}`);
            return;
        }

        metrics.itemsProcessed = itemsProcessed;

        // Take memory snapshot every 100 items or every 10 seconds
        const lastSnapshot = metrics.memoryUsage[metrics.memoryUsage.length - 1];
        const timeSinceLastSnapshot = Date.now() - lastSnapshot.timestamp.getTime();

        if (itemsProcessed % 100 === 0 || timeSinceLastSnapshot > 10000) {
            metrics.memoryUsage.push(this.takeMemorySnapshot());
        }
    }    /**
  
   * Record an error for an operation
     */
    recordError(operationName: string): void {
        const metrics = this.metrics.get(operationName);
        if (metrics) {
            metrics.errors++;
        }
    }

    /**
     * Record a warning for an operation
     */
    recordWarning(operationName: string): void {
        const metrics = this.metrics.get(operationName);
        if (metrics) {
            metrics.warnings++;
        }
    }

    /**
     * End monitoring an operation
     */
    endOperation(operationName: string): PerformanceMetrics | null {
        const metrics = this.metrics.get(operationName);
        if (!metrics) {
            console.warn(`⚠️  No metrics found for operation: ${operationName}`);
            return null;
        }

        metrics.endTime = new Date();
        metrics.duration = metrics.endTime.getTime() - metrics.startTime.getTime();

        if (metrics.itemsProcessed > 0 && metrics.duration > 0) {
            metrics.throughput = (metrics.itemsProcessed / metrics.duration) * 1000; // items per second
        }

        // Take final memory snapshot
        metrics.memoryUsage.push(this.takeMemorySnapshot());

        this.activeOperations.delete(operationName);

        console.log(`✅ Completed monitoring: ${operationName}`);
        this.logOperationSummary(metrics);

        return metrics;
    }

    /**
     * Take a memory snapshot
     */
    private takeMemorySnapshot(): MemorySnapshot {
        if (typeof process !== 'undefined' && process.memoryUsage) {
            const usage = process.memoryUsage();
            return {
                timestamp: new Date(),
                rss: usage.rss,
                heapUsed: usage.heapUsed,
                heapTotal: usage.heapTotal,
                external: usage.external
            };
        }

        return {
            timestamp: new Date(),
            rss: 0,
            heapUsed: 0,
            heapTotal: 0,
            external: 0
        };
    }

    /**
     * Log operation summary
     */
    private logOperationSummary(metrics: PerformanceMetrics): void {
        const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(2);

        console.log(`📈 ${metrics.operationName} Summary:`);
        console.log(`   Duration: ${metrics.duration}ms`);
        console.log(`   Items: ${metrics.itemsProcessed.toLocaleString()}`);

        if (metrics.throughput) {
            console.log(`   Throughput: ${Math.round(metrics.throughput).toLocaleString()} items/sec`);
        }

        if (metrics.errors > 0) {
            console.log(`   Errors: ${metrics.errors}`);
        }

        if (metrics.warnings > 0) {
            console.log(`   Warnings: ${metrics.warnings}`);
        }

        // Memory usage summary
        const firstSnapshot = metrics.memoryUsage[0];
        const lastSnapshot = metrics.memoryUsage[metrics.memoryUsage.length - 1];
        const memoryDelta = lastSnapshot.heapUsed - firstSnapshot.heapUsed;

        console.log(`   Memory: ${mb(lastSnapshot.heapUsed)}MB (Δ${mb(memoryDelta)}MB)`);
    }

    /**
     * Get all metrics
     */
    getAllMetrics(): PerformanceMetrics[] {
        return Array.from(this.metrics.values());
    }

    /**
     * Generate comprehensive performance report
     */
    generateReport(): string {
        const allMetrics = this.getAllMetrics();

        if (allMetrics.length === 0) {
            return '📊 No performance metrics available';
        }

        let report = '📊 Seed Performance Report\n';
        report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

        const totalDuration = allMetrics.reduce((sum, m) => sum + (m.duration || 0), 0);
        const totalItems = allMetrics.reduce((sum, m) => sum + m.itemsProcessed, 0);
        const totalErrors = allMetrics.reduce((sum, m) => sum + m.errors, 0);

        report += `🎯 Overall Summary:\n`;
        report += `   Total Duration: ${totalDuration.toLocaleString()}ms (${(totalDuration / 1000).toFixed(2)}s)\n`;
        report += `   Total Items: ${totalItems.toLocaleString()}\n`;
        report += `   Total Errors: ${totalErrors}\n`;
        report += `   Average Throughput: ${Math.round((totalItems / totalDuration) * 1000).toLocaleString()} items/sec\n\n`;

        report += `📋 Operation Details:\n`;
        allMetrics.forEach(metrics => {
            report += `\n🔹 ${metrics.operationName}:\n`;
            report += `   Duration: ${metrics.duration?.toLocaleString()}ms\n`;
            report += `   Items: ${metrics.itemsProcessed.toLocaleString()}\n`;

            if (metrics.throughput) {
                report += `   Throughput: ${Math.round(metrics.throughput).toLocaleString()} items/sec\n`;
            }

            if (metrics.errors > 0) {
                report += `   Errors: ${metrics.errors}\n`;
            }
        });

        return report;
    }

    /**
     * Clear all metrics
     */
    clear(): void {
        this.metrics.clear();
        this.activeOperations.clear();
        console.log('🧹 Performance metrics cleared');
    }
}
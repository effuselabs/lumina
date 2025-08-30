/**
 * Hybrid Model Performance Monitor
 * 
 * Adds performance monitoring for hybrid business model calculations
 * and tracks financial calculation accuracy and performance.
 */

import { workflowAlertingSystem } from './workflow-alerting-system';

export interface CalculationPerformanceMetrics {
    totalCalculations: number;
    successfulCalculations: number;
    failedCalculations: number;
    averageCalculationTime: number;
    maxCalculationTime: number;
    minCalculationTime: number;
    lastCalculationTime: Date;
    calculationsByType: {
        commission: number;
        chairRental: number;
        hybrid: number;
    };
}

export interface CalculationAccuracyMetrics {
    totalValidations: number;
    accurateCalculations: number;
    inaccurateCalculations: number;
    accuracyPercentage: number;
    commonErrors: Array<{
        errorType: string;
        count: number;
        lastOccurrence: Date;
    }>;
}

export interface PerformanceAlert {
    id: string;
    type: 'performance_degradation' | 'accuracy_issue' | 'calculation_failure';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: Date;
    metadata: Record<string, any>;
}

export class HybridModelPerformanceMonitor {
    private performanceMetrics: CalculationPerformanceMetrics;
    private accuracyMetrics: CalculationAccuracyMetrics;
    private calculationTimes: number[] = [];
    private performanceThresholds = {
        maxCalculationTime: 5000, // 5 seconds
        minAccuracyPercentage: 99.5, // 99.5% accuracy required
        maxFailureRate: 1, // 1% maximum failure rate
    };

    constructor() {
        this.performanceMetrics = {
            totalCalculations: 0,
            successfulCalculations: 0,
            failedCalculations: 0,
            averageCalculationTime: 0,
            maxCalculationTime: 0,
            minCalculationTime: Infinity,
            lastCalculationTime: new Date(),
            calculationsByType: {
                commission: 0,
                chairRental: 0,
                hybrid: 0,
            },
        };

        this.accuracyMetrics = {
            totalValidations: 0,
            accurateCalculations: 0,
            inaccurateCalculations: 0,
            accuracyPercentage: 100,
            commonErrors: [],
        };
    }

    /**
     * Monitor a calculation operation
     */
    async monitorCalculation<T>(
        calculationType: 'commission' | 'chairRental' | 'hybrid',
        calculationFn: () => Promise<T> | T,
        validationFn?: (result: T) => boolean
    ): Promise<T> {
        const startTime = Date.now();
        let result: T;
        let success = false;
        let validationResult = true;

        try {
            result = await calculationFn();
            success = true;

            // Run validation if provided
            if (validationFn) {
                validationResult = validationFn(result);
                this.recordValidation(validationResult);
            }

            return result;
        } catch (error) {
            this.recordCalculationError(error, calculationType);
            throw error;
        } finally {
            const executionTime = Date.now() - startTime;
            this.recordCalculationMetrics(calculationType, success, executionTime);

            // Check performance thresholds
            this.checkPerformanceThresholds(executionTime, success, validationResult);
        }
    }

    /**
     * Record calculation performance metrics
     */
    private recordCalculationMetrics(
        type: 'commission' | 'chairRental' | 'hybrid',
        success: boolean,
        executionTime: number
    ): void {
        this.performanceMetrics.totalCalculations++;
        this.performanceMetrics.lastCalculationTime = new Date();
        this.performanceMetrics.calculationsByType[type]++;

        if (success) {
            this.performanceMetrics.successfulCalculations++;
        } else {
            this.performanceMetrics.failedCalculations++;
        }

        // Update execution time metrics
        this.calculationTimes.push(executionTime);

        // Keep only last 1000 calculation times for memory efficiency
        if (this.calculationTimes.length > 1000) {
            this.calculationTimes = this.calculationTimes.slice(-1000);
        }

        this.updateExecutionTimeMetrics();
    }

    /**
     * Record validation results
     */
    private recordValidation(accurate: boolean): void {
        this.accuracyMetrics.totalValidations++;

        if (accurate) {
            this.accuracyMetrics.accurateCalculations++;
        } else {
            this.accuracyMetrics.inaccurateCalculations++;
        }

        // Update accuracy percentage
        this.accuracyMetrics.accuracyPercentage =
            (this.accuracyMetrics.accurateCalculations / this.accuracyMetrics.totalValidations) * 100;
    }

    /**
     * Record calculation errors
     */
    private recordCalculationError(error: any, calculationType: string): void {
        const errorType = error instanceof Error ? error.constructor.name : 'UnknownError';
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Update common errors tracking
        const existingError = this.accuracyMetrics.commonErrors.find(e => e.errorType === errorType);

        if (existingError) {
            existingError.count++;
            existingError.lastOccurrence = new Date();
        } else {
            this.accuracyMetrics.commonErrors.push({
                errorType,
                count: 1,
                lastOccurrence: new Date(),
            });
        }

        // Sort by count and keep only top 10 errors
        this.accuracyMetrics.commonErrors.sort((a, b) => b.count - a.count);
        this.accuracyMetrics.commonErrors = this.accuracyMetrics.commonErrors.slice(0, 10);

        // Create alert for calculation failure
        this.createPerformanceAlert({
            type: 'calculation_failure',
            severity: 'high',
            message: `${calculationType} calculation failed: ${errorMessage}`,
            metadata: { errorType, calculationType, errorMessage },
        });
    }

    /**
     * Check performance thresholds and create alerts
     */
    private checkPerformanceThresholds(
        executionTime: number,
        _success: boolean,
        _validationResult: boolean
    ): void {
        // Check execution time threshold
        if (executionTime > this.performanceThresholds.maxCalculationTime) {
            this.createPerformanceAlert({
                type: 'performance_degradation',
                severity: 'medium',
                message: `Calculation execution time exceeded threshold: ${executionTime}ms`,
                metadata: { executionTime, threshold: this.performanceThresholds.maxCalculationTime },
            });
        }

        // Check accuracy threshold
        if (this.accuracyMetrics.totalValidations > 0 &&
            this.accuracyMetrics.accuracyPercentage < this.performanceThresholds.minAccuracyPercentage) {
            this.createPerformanceAlert({
                type: 'accuracy_issue',
                severity: 'high',
                message: `Calculation accuracy below threshold: ${this.accuracyMetrics.accuracyPercentage.toFixed(2)}%`,
                metadata: {
                    accuracyPercentage: this.accuracyMetrics.accuracyPercentage,
                    threshold: this.performanceThresholds.minAccuracyPercentage
                },
            });
        }

        // Check failure rate threshold
        const failureRate = (this.performanceMetrics.failedCalculations / this.performanceMetrics.totalCalculations) * 100;
        if (failureRate > this.performanceThresholds.maxFailureRate) {
            this.createPerformanceAlert({
                type: 'calculation_failure',
                severity: 'critical',
                message: `Calculation failure rate exceeded threshold: ${failureRate.toFixed(2)}%`,
                metadata: { failureRate, threshold: this.performanceThresholds.maxFailureRate },
            });
        }
    }

    /**
     * Update execution time metrics
     */
    private updateExecutionTimeMetrics(): void {
        if (this.calculationTimes.length === 0) return;

        const sum = this.calculationTimes.reduce((a, b) => a + b, 0);
        this.performanceMetrics.averageCalculationTime = sum / this.calculationTimes.length;
        this.performanceMetrics.maxCalculationTime = Math.max(...this.calculationTimes);
        this.performanceMetrics.minCalculationTime = Math.min(...this.calculationTimes);
    }

    /**
     * Create performance alert
     */
    private createPerformanceAlert(alertData: Omit<PerformanceAlert, 'id' | 'timestamp'>): void {
        const alert: PerformanceAlert = {
            id: `perf_alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            ...alertData,
        };

        // Convert to workflow alert format and send to alerting system
        const workflowAlert = {
            id: alert.id,
            type: alert.type as any,
            severity: alert.severity,
            message: alert.message,
            timestamp: alert.timestamp,
            metadata: alert.metadata,
        };

        workflowAlertingSystem.processAlert(workflowAlert);
    }

    /**
     * Get current performance metrics
     */
    getPerformanceMetrics(): CalculationPerformanceMetrics {
        return { ...this.performanceMetrics };
    }

    /**
     * Get current accuracy metrics
     */
    getAccuracyMetrics(): CalculationAccuracyMetrics {
        return { ...this.accuracyMetrics };
    }

    /**
     * Get performance summary
     */
    getPerformanceSummary(): {
        overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
        successRate: number;
        accuracyRate: number;
        averageExecutionTime: number;
        recommendations: string[];
    } {
        const successRate = this.performanceMetrics.totalCalculations > 0 ?
            (this.performanceMetrics.successfulCalculations / this.performanceMetrics.totalCalculations) * 100 : 100;

        const recommendations: string[] = [];
        let overallHealth: 'excellent' | 'good' | 'fair' | 'poor';

        if (successRate >= 99.5 &&
            this.accuracyMetrics.accuracyPercentage >= 99.5 &&
            this.performanceMetrics.averageCalculationTime < 1000) {
            overallHealth = 'excellent';
        } else if (successRate >= 99 &&
            this.accuracyMetrics.accuracyPercentage >= 99 &&
            this.performanceMetrics.averageCalculationTime < 3000) {
            overallHealth = 'good';
        } else if (successRate >= 95 &&
            this.accuracyMetrics.accuracyPercentage >= 95) {
            overallHealth = 'fair';
            recommendations.push('Consider optimizing calculation performance');
        } else {
            overallHealth = 'poor';
            recommendations.push('Immediate attention required for calculation system');
        }

        if (this.performanceMetrics.averageCalculationTime > 3000) {
            recommendations.push('Calculation execution times are above optimal thresholds');
        }

        if (this.accuracyMetrics.accuracyPercentage < 99) {
            recommendations.push('Review calculation logic for accuracy improvements');
        }

        if (this.accuracyMetrics.commonErrors.length > 0) {
            recommendations.push(`Address common calculation errors: ${this.accuracyMetrics.commonErrors[0].errorType}`);
        }

        return {
            overallHealth,
            successRate,
            accuracyRate: this.accuracyMetrics.accuracyPercentage,
            averageExecutionTime: this.performanceMetrics.averageCalculationTime,
            recommendations,
        };
    }

    /**
     * Reset metrics (useful for testing or periodic resets)
     */
    resetMetrics(): void {
        this.performanceMetrics = {
            totalCalculations: 0,
            successfulCalculations: 0,
            failedCalculations: 0,
            averageCalculationTime: 0,
            maxCalculationTime: 0,
            minCalculationTime: Infinity,
            lastCalculationTime: new Date(),
            calculationsByType: {
                commission: 0,
                chairRental: 0,
                hybrid: 0,
            },
        };

        this.accuracyMetrics = {
            totalValidations: 0,
            accurateCalculations: 0,
            inaccurateCalculations: 0,
            accuracyPercentage: 100,
            commonErrors: [],
        };

        this.calculationTimes = [];
    }

    /**
     * Export performance data for analysis
     */
    exportPerformanceData(): {
        timestamp: Date;
        performanceMetrics: CalculationPerformanceMetrics;
        accuracyMetrics: CalculationAccuracyMetrics;
        summary: ReturnType<typeof this.getPerformanceSummary>;
    } {
        return {
            timestamp: new Date(),
            performanceMetrics: this.getPerformanceMetrics(),
            accuracyMetrics: this.getAccuracyMetrics(),
            summary: this.getPerformanceSummary(),
        };
    }
}

// Singleton instance for global use
export const hybridModelPerformanceMonitor = new HybridModelPerformanceMonitor();
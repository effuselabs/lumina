/**
 * Database Query Optimizer
 * 
 * Utility for optimizing database queries, analyzing performance,
 * and providing query optimization recommendations for appointment operations.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4
 * 
 * @version 1.0.0
 * @author Lumina Development Team
 */

import { PrismaClient } from '@prisma/client'
import { performance } from 'perf_hooks'

// ============================================================================
// QUERY ANALYSIS TYPES
// ============================================================================

interface QueryAnalysis {
    query: string
    duration: number
    rowsReturned: number
    indexesUsed: string[]
    recommendations: QueryRecommendation[]
    executionPlan?: any
    timestamp: Date
}

interface QueryRecommendation {
    type: 'INDEX' | 'QUERY_STRUCTURE' | 'PAGINATION' | 'CACHING' | 'BUSINESS_LOGIC'
    priority: 'HIGH' | 'MEDIUM' | 'LOW'
    description: string
    suggestedAction: string
    estimatedImprovement: string
}

interface IndexUsageStats {
    indexName: string
    tableName: string
    usageCount: number
    lastUsed: Date
    effectiveness: 'HIGH' | 'MEDIUM' | 'LOW'
}

// ============================================================================
// QUERY OPTIMIZER CLASS
// ============================================================================

export class QueryOptimizer {
    private static instance: QueryOptimizer
    private queryHistory: QueryAnalysis[] = []
    private readonly MAX_HISTORY = 1000
    private readonly SLOW_QUERY_THRESHOLD = 500 // ms

    static getInstance(): QueryOptimizer {
        if (!QueryOptimizer.instance) {
            QueryOptimizer.instance = new QueryOptimizer()
        }
        return QueryOptimizer.instance
    }

    /**
     * Analyze and optimize a Prisma query
     */
    async analyzeQuery<T>(
        prisma: PrismaClient,
        queryName: string,
        queryFn: () => Promise<T>
    ): Promise<{ result: T; analysis: QueryAnalysis }> {
        const startTime = performance.now()

        try {
            const result = await queryFn()
            const duration = performance.now() - startTime

            // Determine rows returned
            let rowsReturned = 0
            if (Array.isArray(result)) {
                rowsReturned = result.length
            } else if (result && typeof result === 'object' && 'appointments' in result) {
                rowsReturned = (result as any).appointments?.length || 0
            } else if (result) {
                rowsReturned = 1
            }

            // Create analysis
            const analysis: QueryAnalysis = {
                query: queryName,
                duration,
                rowsReturned,
                indexesUsed: [], // Would need to be populated from EXPLAIN output
                recommendations: this.generateRecommendations(queryName, duration, rowsReturned),
                timestamp: new Date()
            }

            // Store in history
            this.addToHistory(analysis)

            return { result, analysis }
        } catch (error) {
            const duration = performance.now() - startTime

            const analysis: QueryAnalysis = {
                query: queryName,
                duration,
                rowsReturned: 0,
                indexesUsed: [],
                recommendations: [{
                    type: 'QUERY_STRUCTURE',
                    priority: 'HIGH',
                    description: 'Query failed to execute',
                    suggestedAction: 'Review query structure and error handling',
                    estimatedImprovement: 'N/A'
                }],
                timestamp: new Date()
            }

            this.addToHistory(analysis)
            throw error
        }
    }

    /**
     * Generate optimization recommendations based on query performance
     */
    private generateRecommendations(
        queryName: string,
        duration: number,
        rowsReturned: number
    ): QueryRecommendation[] {
        const recommendations: QueryRecommendation[] = []

        // Slow query recommendations
        if (duration > this.SLOW_QUERY_THRESHOLD) {
            recommendations.push({
                type: 'INDEX',
                priority: 'HIGH',
                description: `Query ${queryName} is slow (${duration.toFixed(2)}ms)`,
                suggestedAction: 'Review and optimize database indexes for this query pattern',
                estimatedImprovement: '50-80% performance improvement'
            })
        }

        // Large result set recommendations
        if (rowsReturned > 100) {
            recommendations.push({
                type: 'PAGINATION',
                priority: 'MEDIUM',
                description: `Query returns large result set (${rowsReturned} rows)`,
                suggestedAction: 'Implement cursor-based pagination to reduce memory usage',
                estimatedImprovement: '30-50% memory reduction'
            })
        }

        // Query-specific recommendations
        if (queryName.includes('find_appointments_by_business')) {
            if (duration > 300) {
                recommendations.push({
                    type: 'INDEX',
                    priority: 'HIGH',
                    description: 'Business appointment queries should use composite index',
                    suggestedAction: 'Ensure (business_id, start_time) index exists and is being used',
                    estimatedImprovement: '60-70% performance improvement'
                })
            }
        }

        if (queryName.includes('conflict_detection')) {
            if (duration > 250) {
                recommendations.push({
                    type: 'INDEX',
                    priority: 'HIGH',
                    description: 'Conflict detection queries need time-range optimization',
                    suggestedAction: 'Use partial index on active appointments with time columns',
                    estimatedImprovement: '70-80% performance improvement'
                })
            }
        }

        if (queryName.includes('statistics') || queryName.includes('aggregate')) {
            if (duration > 400) {
                recommendations.push({
                    type: 'CACHING',
                    priority: 'MEDIUM',
                    description: 'Statistics queries are expensive and should be cached',
                    suggestedAction: 'Implement Redis caching for aggregated statistics',
                    estimatedImprovement: '90%+ performance improvement for repeated queries'
                })
            }
        }

        return recommendations
    }

    /**
     * Add query analysis to history
     */
    private addToHistory(analysis: QueryAnalysis): void {
        this.queryHistory.push(analysis)

        // Keep only recent history
        if (this.queryHistory.length > this.MAX_HISTORY) {
            this.queryHistory = this.queryHistory.slice(-this.MAX_HISTORY)
        }
    }

    /**
     * Get performance statistics for all queries
     */
    getPerformanceStats(): {
        totalQueries: number
        slowQueries: number
        averageDuration: number
        queryBreakdown: Record<string, {
            count: number
            averageDuration: number
            slowestDuration: number
            recommendations: number
        }>
        topRecommendations: QueryRecommendation[]
    } {
        if (this.queryHistory.length === 0) {
            return {
                totalQueries: 0,
                slowQueries: 0,
                averageDuration: 0,
                queryBreakdown: {},
                topRecommendations: []
            }
        }

        const totalQueries = this.queryHistory.length
        const slowQueries = this.queryHistory.filter(q => q.duration > this.SLOW_QUERY_THRESHOLD).length
        const totalDuration = this.queryHistory.reduce((sum, q) => sum + q.duration, 0)
        const averageDuration = totalDuration / totalQueries

        // Group by query type
        const queryBreakdown: Record<string, {
            count: number
            averageDuration: number
            slowestDuration: number
            recommendations: number
        }> = {}

        for (const query of this.queryHistory) {
            if (!queryBreakdown[query.query]) {
                queryBreakdown[query.query] = {
                    count: 0,
                    averageDuration: 0,
                    slowestDuration: 0,
                    recommendations: 0
                }
            }

            const breakdown = queryBreakdown[query.query]
            breakdown.count++
            breakdown.averageDuration = ((breakdown.averageDuration * (breakdown.count - 1)) + query.duration) / breakdown.count
            breakdown.slowestDuration = Math.max(breakdown.slowestDuration, query.duration)
            breakdown.recommendations += query.recommendations.length
        }

        // Get top recommendations
        const allRecommendations = this.queryHistory.flatMap(q => q.recommendations)
        const recommendationCounts = new Map<string, { recommendation: QueryRecommendation; count: number }>()

        for (const rec of allRecommendations) {
            const key = `${rec.type}_${rec.description}`
            if (recommendationCounts.has(key)) {
                recommendationCounts.get(key)!.count++
            } else {
                recommendationCounts.set(key, { recommendation: rec, count: 1 })
            }
        }

        const topRecommendations = Array.from(recommendationCounts.values())
            .sort((a, b) => {
                // Sort by priority first, then by count
                const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 }
                const priorityDiff = priorityOrder[b.recommendation.priority] - priorityOrder[a.recommendation.priority]
                return priorityDiff !== 0 ? priorityDiff : b.count - a.count
            })
            .slice(0, 10)
            .map(item => item.recommendation)

        return {
            totalQueries,
            slowQueries,
            averageDuration,
            queryBreakdown,
            topRecommendations
        }
    }

    /**
     * Get optimization recommendations for a specific query pattern
     */
    getQueryOptimizationTips(queryPattern: string): QueryRecommendation[] {
        const recommendations: QueryRecommendation[] = []

        switch (queryPattern.toLowerCase()) {
            case 'appointment_creation':
                recommendations.push(
                    {
                        type: 'INDEX',
                        priority: 'HIGH',
                        description: 'Optimize appointment creation with proper foreign key indexes',
                        suggestedAction: 'Ensure indexes exist on business_id, staff_id, client_id columns',
                        estimatedImprovement: '40-60% faster inserts'
                    },
                    {
                        type: 'BUSINESS_LOGIC',
                        priority: 'MEDIUM',
                        description: 'Batch validation operations to reduce database roundtrips',
                        suggestedAction: 'Validate business context, staff, and client in single query',
                        estimatedImprovement: '30-50% reduction in query count'
                    }
                )
                break

            case 'appointment_search':
                recommendations.push(
                    {
                        type: 'INDEX',
                        priority: 'HIGH',
                        description: 'Use composite indexes for multi-column searches',
                        suggestedAction: 'Create index on (business_id, start_time, status) for common search patterns',
                        estimatedImprovement: '60-80% faster searches'
                    },
                    {
                        type: 'PAGINATION',
                        priority: 'MEDIUM',
                        description: 'Implement cursor-based pagination for large result sets',
                        suggestedAction: 'Use cursor pagination instead of offset-based pagination',
                        estimatedImprovement: 'Consistent performance regardless of page number'
                    }
                )
                break

            case 'conflict_detection':
                recommendations.push(
                    {
                        type: 'INDEX',
                        priority: 'HIGH',
                        description: 'Optimize time-range queries with specialized indexes',
                        suggestedAction: 'Create partial index on active appointments with time columns',
                        estimatedImprovement: '70-90% faster conflict detection'
                    },
                    {
                        type: 'QUERY_STRUCTURE',
                        priority: 'MEDIUM',
                        description: 'Use efficient time overlap detection logic',
                        suggestedAction: 'Structure time range queries to utilize index scans',
                        estimatedImprovement: '50-70% performance improvement'
                    }
                )
                break

            case 'statistics_aggregation':
                recommendations.push(
                    {
                        type: 'CACHING',
                        priority: 'HIGH',
                        description: 'Cache expensive aggregation queries',
                        suggestedAction: 'Implement Redis caching for statistics with appropriate TTL',
                        estimatedImprovement: '90%+ improvement for repeated queries'
                    },
                    {
                        type: 'INDEX',
                        priority: 'MEDIUM',
                        description: 'Use covering indexes for aggregation queries',
                        suggestedAction: 'Create indexes that include all columns needed for aggregation',
                        estimatedImprovement: '40-60% faster aggregations'
                    }
                )
                break

            default:
                recommendations.push({
                    type: 'QUERY_STRUCTURE',
                    priority: 'MEDIUM',
                    description: 'General query optimization principles',
                    suggestedAction: 'Ensure proper indexing, limit result sets, and use efficient joins',
                    estimatedImprovement: 'Varies based on specific optimizations'
                })
        }

        return recommendations
    }

    /**
     * Generate index usage report
     */
    async generateIndexUsageReport(prisma: PrismaClient): Promise<IndexUsageStats[]> {
        try {
            // This would require database-specific queries to get index usage statistics
            // For PostgreSQL, you would query pg_stat_user_indexes
            const indexStats = await prisma.$queryRaw<any[]>`
                SELECT 
                    schemaname,
                    tablename,
                    indexname,
                    idx_tup_read,
                    idx_tup_fetch,
                    idx_scan
                FROM pg_stat_user_indexes 
                WHERE schemaname = 'public' 
                  AND tablename IN ('appointments', 'appointment_services', 'appointment_status_history')
                ORDER BY idx_scan DESC
            `

            return indexStats.map(stat => ({
                indexName: stat.indexname,
                tableName: stat.tablename,
                usageCount: stat.idx_scan || 0,
                lastUsed: new Date(), // Would need to be tracked separately
                effectiveness: stat.idx_scan > 1000 ? 'HIGH' : stat.idx_scan > 100 ? 'MEDIUM' : 'LOW'
            }))
        } catch (error) {
            console.warn('Could not generate index usage report:', error)
            return []
        }
    }

    /**
     * Clear query history (useful for testing or periodic cleanup)
     */
    clearHistory(): void {
        this.queryHistory = []
    }

    /**
     * Export query analysis data for external analysis
     */
    exportAnalysisData(this: QueryOptimizer): {
        queries: QueryAnalysis[]
        summary: ReturnType<QueryOptimizer['getPerformanceStats']>
        exportDate: Date
    } {
        return {
            queries: [...this.queryHistory],
            summary: this.getPerformanceStats(),
            exportDate: new Date()
        }
    }
}

// ============================================================================
// QUERY OPTIMIZATION UTILITIES
// ============================================================================

/**
 * Utility function to wrap queries with optimization analysis
 */
export async function withQueryOptimization<T>(
    prisma: PrismaClient,
    queryName: string,
    queryFn: () => Promise<T>
): Promise<T> {
    const optimizer = QueryOptimizer.getInstance()
    const { result, analysis } = await optimizer.analyzeQuery(prisma, queryName, queryFn)

    // Log slow queries with recommendations
    if (analysis.duration > 500) {
        console.warn(`Slow query detected: ${queryName} (${analysis.duration.toFixed(2)}ms)`)
        if (analysis.recommendations.length > 0) {
            console.warn('Optimization recommendations:', analysis.recommendations)
        }
    }

    return result
}

/**
 * Get query optimization instance for manual analysis
 */
export const queryOptimizer = QueryOptimizer.getInstance()

/**
 * Utility to check if indexes are being used effectively
 */
export async function validateIndexUsage(prisma: PrismaClient): Promise<{
    indexesAnalyzed: number
    underutilizedIndexes: string[]
    recommendations: string[]
}> {
    const optimizer = QueryOptimizer.getInstance()
    const indexStats = await optimizer.generateIndexUsageReport(prisma)

    const underutilizedIndexes = indexStats
        .filter(stat => stat.effectiveness === 'LOW' && stat.usageCount < 10)
        .map(stat => stat.indexName)

    const recommendations = [
        ...(underutilizedIndexes.length > 0 ?
            [`Consider removing underutilized indexes: ${underutilizedIndexes.join(', ')}`] : []),
        'Monitor query patterns to identify missing indexes',
        'Use EXPLAIN ANALYZE to validate index usage in production queries',
        'Consider partial indexes for frequently filtered columns'
    ]

    return {
        indexesAnalyzed: indexStats.length,
        underutilizedIndexes,
        recommendations
    }
}
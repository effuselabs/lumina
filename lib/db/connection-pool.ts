/**
 * Database Connection Pool Configuration
 * 
 * Optimized database connection pooling for high-performance appointment operations.
 * Includes connection monitoring, health checks, and performance optimization.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4
 * 
 * @version 1.0.0
 * @author Lumina Development Team
 */

import { PrismaClient } from '@prisma/client'

// ============================================================================
// CONNECTION POOL CONFIGURATION
// ============================================================================

interface ConnectionPoolConfig {
    // Connection limits
    maxConnections: number
    minConnections: number
    connectionTimeoutMs: number
    idleTimeoutMs: number

    // Query optimization
    queryTimeoutMs: number
    statementTimeoutMs: number

    // Health monitoring
    healthCheckIntervalMs: number
    maxRetries: number

    // Performance settings
    enableQueryLogging: boolean
    slowQueryThresholdMs: number
    enableMetrics: boolean
}

const getConnectionPoolConfig = (): ConnectionPoolConfig => {
    const isProduction = process.env.NODE_ENV === 'production'

    return {
        // Production: Higher limits for scalability
        // Development: Lower limits for resource conservation
        maxConnections: isProduction ? 20 : 5,
        minConnections: isProduction ? 5 : 1,
        connectionTimeoutMs: 10000, // 10 seconds
        idleTimeoutMs: 300000, // 5 minutes

        // Query timeouts aligned with performance targets
        queryTimeoutMs: 30000, // 30 seconds max
        statementTimeoutMs: 5000, // 5 seconds for individual statements

        // Health monitoring
        healthCheckIntervalMs: 30000, // 30 seconds
        maxRetries: 3,

        // Performance monitoring
        enableQueryLogging: !isProduction || process.env.ENABLE_QUERY_LOGGING === 'true',
        slowQueryThresholdMs: 500, // Log queries slower than 500ms
        enableMetrics: true
    }
}

// ============================================================================
// CONNECTION POOL MANAGER
// ============================================================================

class ConnectionPoolManager {
    private static instance: ConnectionPoolManager
    private config: ConnectionPoolConfig
    private healthCheckInterval?: NodeJS.Timeout
    private connectionMetrics: {
        activeConnections: number
        totalQueries: number
        slowQueries: number
        errors: number
        lastHealthCheck: Date | null
        averageQueryTime: number
    }

    private constructor() {
        this.config = getConnectionPoolConfig()
        this.connectionMetrics = {
            activeConnections: 0,
            totalQueries: 0,
            slowQueries: 0,
            errors: 0,
            lastHealthCheck: null,
            averageQueryTime: 0
        }

        this.startHealthMonitoring()
    }

    static getInstance(): ConnectionPoolManager {
        if (!ConnectionPoolManager.instance) {
            ConnectionPoolManager.instance = new ConnectionPoolManager()
        }
        return ConnectionPoolManager.instance
    }

    /**
     * Create optimized Prisma client with connection pooling
     */
    createOptimizedClient(): PrismaClient {
        const client = new PrismaClient({
            datasources: {
                db: {
                    url: this.buildOptimizedConnectionString()
                }
            },
            log: this.config.enableQueryLogging ? [
                { emit: 'event', level: 'query' },
                { emit: 'event', level: 'error' },
                { emit: 'event', level: 'warn' }
            ] : ['error'],
            errorFormat: 'pretty'
        })

        // Set up query monitoring
        if (this.config.enableMetrics) {
            this.setupQueryMonitoring(client)
        }

        return client
    }

    /**
     * Build optimized connection string with pooling parameters
     */
    private buildOptimizedConnectionString(): string {
        const baseUrl = process.env.DATABASE_URL
        if (!baseUrl) {
            throw new Error('DATABASE_URL environment variable is required')
        }

        // Parse existing URL to preserve credentials and database info
        const url = new URL(baseUrl)

        // Add connection pooling parameters
        const poolParams = new URLSearchParams({
            // Connection pool settings
            'connection_limit': this.config.maxConnections.toString(),
            'pool_timeout': Math.floor(this.config.connectionTimeoutMs / 1000).toString(),

            // Query optimization
            'statement_timeout': Math.floor(this.config.statementTimeoutMs / 1000).toString() + 's',
            'idle_in_transaction_session_timeout': Math.floor(this.config.idleTimeoutMs / 1000).toString() + 's',

            // Performance settings
            'application_name': 'lumina_appointment_engine',
            'connect_timeout': '10',
            'tcp_keepalives_idle': '300',
            'tcp_keepalives_interval': '30',
            'tcp_keepalives_count': '3'
        })

        // Merge with existing search params
        for (const [key, value] of poolParams.entries()) {
            url.searchParams.set(key, value)
        }

        return url.toString()
    }

    /**
     * Set up query monitoring and performance tracking
     */
    private setupQueryMonitoring(client: PrismaClient): void {
        client.$on('query', (event) => {
            this.connectionMetrics.totalQueries++

            const queryTime = event.duration
            this.updateAverageQueryTime(queryTime)

            // Log slow queries
            if (queryTime > this.config.slowQueryThresholdMs) {
                this.connectionMetrics.slowQueries++

                if (this.config.enableQueryLogging) {
                    console.warn(`Slow query detected (${queryTime}ms):`, {
                        query: event.query,
                        params: event.params,
                        duration: queryTime,
                        timestamp: event.timestamp
                    })
                }
            }
        })

        client.$on('error', (event) => {
            this.connectionMetrics.errors++
            console.error('Database error:', event)
        })

        client.$on('warn', (event) => {
            console.warn('Database warning:', event)
        })
    }

    /**
     * Update rolling average query time
     */
    private updateAverageQueryTime(newQueryTime: number): void {
        const totalQueries = this.connectionMetrics.totalQueries
        const currentAverage = this.connectionMetrics.averageQueryTime

        // Calculate rolling average (weighted towards recent queries)
        this.connectionMetrics.averageQueryTime =
            ((currentAverage * (totalQueries - 1)) + newQueryTime) / totalQueries
    }

    /**
     * Start health monitoring
     */
    private startHealthMonitoring(): void {
        this.healthCheckInterval = setInterval(
            () => this.performHealthCheck(),
            this.config.healthCheckIntervalMs
        )
    }

    /**
     * Perform database health check
     */
    private async performHealthCheck(): Promise<void> {
        try {
            const client = this.createOptimizedClient()

            const startTime = Date.now()
            await client.$queryRaw`SELECT 1 as health_check`
            const responseTime = Date.now() - startTime

            this.connectionMetrics.lastHealthCheck = new Date()

            if (responseTime > this.config.slowQueryThresholdMs) {
                console.warn(`Database health check slow: ${responseTime}ms`)
            }

            await client.$disconnect()
        } catch (error) {
            console.error('Database health check failed:', error)
            this.connectionMetrics.errors++
        }
    }

    /**
     * Get connection pool metrics
     */
    getMetrics(): {
        config: ConnectionPoolConfig
        metrics: typeof this.connectionMetrics
        performance: {
            queriesPerSecond: number
            errorRate: number
            slowQueryRate: number
        }
    } {
        const now = Date.now()
        const lastHealthCheck = this.connectionMetrics.lastHealthCheck?.getTime() || now
        const timeDiffSeconds = (now - lastHealthCheck) / 1000

        return {
            config: this.config,
            metrics: { ...this.connectionMetrics },
            performance: {
                queriesPerSecond: timeDiffSeconds > 0 ? this.connectionMetrics.totalQueries / timeDiffSeconds : 0,
                errorRate: this.connectionMetrics.totalQueries > 0
                    ? this.connectionMetrics.errors / this.connectionMetrics.totalQueries
                    : 0,
                slowQueryRate: this.connectionMetrics.totalQueries > 0
                    ? this.connectionMetrics.slowQueries / this.connectionMetrics.totalQueries
                    : 0
            }
        }
    }

    /**
     * Reset metrics (useful for testing or periodic resets)
     */
    resetMetrics(): void {
        this.connectionMetrics = {
            activeConnections: 0,
            totalQueries: 0,
            slowQueries: 0,
            errors: 0,
            lastHealthCheck: null,
            averageQueryTime: 0
        }
    }

    /**
     * Shutdown connection pool manager
     */
    shutdown(): void {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval)
            this.healthCheckInterval = undefined
        }
    }
}

// ============================================================================
// OPTIMIZED PRISMA CLIENT FACTORY
// ============================================================================

class OptimizedPrismaClientFactory {
    private static client: PrismaClient | null = null
    private static connectionManager = ConnectionPoolManager.getInstance()

    /**
     * Get singleton Prisma client with optimized connection pooling
     */
    static getClient(): PrismaClient {
        if (!OptimizedPrismaClientFactory.client) {
            OptimizedPrismaClientFactory.client =
                OptimizedPrismaClientFactory.connectionManager.createOptimizedClient()
        }
        return OptimizedPrismaClientFactory.client
    }

    /**
     * Create new client instance (for testing or special use cases)
     */
    static createNewClient(): PrismaClient {
        return OptimizedPrismaClientFactory.connectionManager.createOptimizedClient()
    }

    /**
     * Get connection pool metrics
     */
    static getMetrics() {
        return OptimizedPrismaClientFactory.connectionManager.getMetrics()
    }

    /**
     * Reset connection pool metrics
     */
    static resetMetrics(): void {
        OptimizedPrismaClientFactory.connectionManager.resetMetrics()
    }

    /**
     * Gracefully shutdown all connections
     */
    static async shutdown(): Promise<void> {
        if (OptimizedPrismaClientFactory.client) {
            await OptimizedPrismaClientFactory.client.$disconnect()
            OptimizedPrismaClientFactory.client = null
        }
        OptimizedPrismaClientFactory.connectionManager.shutdown()
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
    ConnectionPoolManager,
    OptimizedPrismaClientFactory,
    type ConnectionPoolConfig
}

// Export optimized client as default
export const optimizedPrisma = OptimizedPrismaClientFactory.getClient()

// Export metrics function for monitoring
export const getConnectionMetrics = () => OptimizedPrismaClientFactory.getMetrics()

// Export shutdown function for graceful cleanup
export const shutdownConnections = () => OptimizedPrismaClientFactory.shutdown()
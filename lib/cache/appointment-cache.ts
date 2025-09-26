/**
 * Appointment Caching Strategy Implementation
 * 
 * Redis-based caching system for appointment data with intelligent invalidation
 * strategies coordinated with calendar infrastructure for optimal performance.
 * 
 * Requirements: 6.3, 6.4, 4.4
 * 
 * @version 1.0.0
 * @author Lumina Development Team
 */

import { AppointmentWithRelations } from '@/types/database'
import Redis from 'ioredis'

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

interface CacheConfig {
    // Redis connection
    redisUrl: string
    keyPrefix: string

    // TTL settings (in seconds)
    appointmentTTL: number
    appointmentListTTL: number
    statisticsTTL: number
    conflictCheckTTL: number

    // Cache warming settings
    enableCacheWarming: boolean
    warmingBatchSize: number

    // Invalidation settings
    enableSmartInvalidation: boolean
    invalidationDelay: number // ms

    // Performance settings
    maxCacheSize: number // MB
    compressionEnabled: boolean
}

const getCacheConfig = (): CacheConfig => {
    const isProduction = process.env.NODE_ENV === 'production'

    return {
        redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
        keyPrefix: 'lumina:appointments:',

        // TTL settings - shorter in development for testing
        appointmentTTL: isProduction ? 3600 : 300, // 1 hour / 5 minutes
        appointmentListTTL: isProduction ? 1800 : 180, // 30 minutes / 3 minutes
        statisticsTTL: isProduction ? 7200 : 600, // 2 hours / 10 minutes
        conflictCheckTTL: isProduction ? 300 : 60, // 5 minutes / 1 minute

        // Cache warming
        enableCacheWarming: isProduction,
        warmingBatchSize: 50,

        // Invalidation
        enableSmartInvalidation: true,
        invalidationDelay: 100, // 100ms delay for batch invalidation

        // Performance
        maxCacheSize: isProduction ? 512 : 64, // MB
        compressionEnabled: isProduction
    }
}

// ============================================================================
// CACHE KEY GENERATORS
// ============================================================================

class CacheKeyGenerator {
    private static prefix = getCacheConfig().keyPrefix

    static appointmentById(appointmentId: string, businessId: string): string {
        return `${this.prefix}appointment:${businessId}:${appointmentId}`
    }

    static appointmentsByBusiness(
        businessId: string,
        filters: Record<string, any> = {},
        cursor?: string,
        limit?: number
    ): string {
        const filterHash = this.hashFilters(filters)
        const paginationKey = cursor ? `cursor:${cursor}:${limit}` : `limit:${limit}`
        return `${this.prefix}business:${businessId}:appointments:${filterHash}:${paginationKey}`
    }

    static appointmentsByStaff(
        staffId: string,
        businessId: string,
        dateRange?: { startDate: Date; endDate: Date },
        filters: Record<string, any> = {}
    ): string {
        const filterHash = this.hashFilters(filters)
        const dateKey = dateRange
            ? `${dateRange.startDate.toISOString()}:${dateRange.endDate.toISOString()}`
            : 'all'
        return `${this.prefix}staff:${businessId}:${staffId}:${dateKey}:${filterHash}`
    }

    static appointmentConflicts(
        staffId: string,
        businessId: string,
        timeSlot: { startTime: Date; endTime: Date },
        excludeId?: string
    ): string {
        const timeKey = `${timeSlot.startTime.toISOString()}:${timeSlot.endTime.toISOString()}`
        const excludeKey = excludeId ? `:exclude:${excludeId}` : ''
        return `${this.prefix}conflicts:${businessId}:${staffId}:${timeKey}${excludeKey}`
    }

    static appointmentStatistics(
        businessId: string,
        dateRange: { startDate: Date; endDate: Date }
    ): string {
        const dateKey = `${dateRange.startDate.toISOString()}:${dateRange.endDate.toISOString()}`
        return `${this.prefix}stats:${businessId}:${dateKey}`
    }

    static businessAppointmentList(businessId: string): string {
        return `${this.prefix}business:${businessId}:list:*`
    }

    static staffAppointmentList(staffId: string, businessId: string): string {
        return `${this.prefix}staff:${businessId}:${staffId}:*`
    }

    static appointmentRelatedKeys(appointmentId: string, businessId: string, staffId: string): string[] {
        return [
            `${this.prefix}appointment:${businessId}:${appointmentId}`,
            `${this.prefix}business:${businessId}:*`,
            `${this.prefix}staff:${businessId}:${staffId}:*`,
            `${this.prefix}conflicts:${businessId}:${staffId}:*`,
            `${this.prefix}stats:${businessId}:*`
        ]
    }

    private static hashFilters(filters: Record<string, any>): string {
        // Create a consistent hash of filter parameters
        const sortedKeys = Object.keys(filters).sort()
        const filterString = sortedKeys
            .map(key => `${key}:${JSON.stringify(filters[key])}`)
            .join('|')

        // Simple hash function (in production, consider using crypto.createHash)
        let hash = 0
        for (let i = 0; i < filterString.length; i++) {
            const char = filterString.charCodeAt(i)
            hash = ((hash << 5) - hash) + char
            hash = hash & hash // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36)
    }
}

// ============================================================================
// CACHE MANAGER
// ============================================================================

export class AppointmentCacheManager {
    private static instance: AppointmentCacheManager
    private redis: Redis
    private config: CacheConfig
    private invalidationQueue: Set<string> = new Set()
    private invalidationTimer?: NodeJS.Timeout

    private constructor() {
        this.config = getCacheConfig()
        this.redis = new Redis(this.config.redisUrl, {
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3,
            lazyConnect: true,
            keyPrefix: this.config.keyPrefix
        })

        this.setupEventHandlers()
    }

    static getInstance(): AppointmentCacheManager {
        if (!AppointmentCacheManager.instance) {
            AppointmentCacheManager.instance = new AppointmentCacheManager()
        }
        return AppointmentCacheManager.instance
    }

    private setupEventHandlers(): void {
        this.redis.on('error', (error) => {
            console.error('Redis connection error:', error)
        })

        this.redis.on('connect', () => {
            console.log('Redis connected successfully')
        })

        this.redis.on('ready', () => {
            console.log('Redis ready for operations')
        })
    }

    // ============================================================================
    // CACHE OPERATIONS
    // ============================================================================

    /**
     * Get appointment by ID from cache
     */
    async getAppointment(appointmentId: string, businessId: string): Promise<AppointmentWithRelations | null> {
        try {
            const key = CacheKeyGenerator.appointmentById(appointmentId, businessId)
            const cached = await this.redis.get(key)

            if (cached) {
                return JSON.parse(cached)
            }

            return null
        } catch (error) {
            console.warn('Cache get error:', error)
            return null
        }
    }

    /**
     * Set appointment in cache
     */
    async setAppointment(appointment: AppointmentWithRelations): Promise<void> {
        try {
            const key = CacheKeyGenerator.appointmentById(appointment.id, appointment.businessId)
            const serialized = JSON.stringify(appointment)

            await this.redis.setex(key, this.config.appointmentTTL, serialized)
        } catch (error) {
            console.warn('Cache set error:', error)
        }
    }

    /**
     * Get appointment list from cache
     */
    async getAppointmentList<T>(cacheKey: string): Promise<T | null> {
        try {
            const cached = await this.redis.get(cacheKey)

            if (cached) {
                return JSON.parse(cached)
            }

            return null
        } catch (error) {
            console.warn('Cache get list error:', error)
            return null
        }
    }

    /**
     * Set appointment list in cache
     */
    async setAppointmentList<T>(cacheKey: string, data: T, ttl?: number): Promise<void> {
        try {
            const serialized = JSON.stringify(data)
            const cacheTTL = ttl || this.config.appointmentListTTL

            await this.redis.setex(cacheKey, cacheTTL, serialized)
        } catch (error) {
            console.warn('Cache set list error:', error)
        }
    }

    /**
     * Get appointment statistics from cache
     */
    async getStatistics(businessId: string, dateRange: { startDate: Date; endDate: Date }): Promise<any | null> {
        try {
            const key = CacheKeyGenerator.appointmentStatistics(businessId, dateRange)
            const cached = await this.redis.get(key)

            if (cached) {
                return JSON.parse(cached)
            }

            return null
        } catch (error) {
            console.warn('Cache get statistics error:', error)
            return null
        }
    }

    /**
     * Set appointment statistics in cache
     */
    async setStatistics(
        businessId: string,
        dateRange: { startDate: Date; endDate: Date },
        statistics: any
    ): Promise<void> {
        try {
            const key = CacheKeyGenerator.appointmentStatistics(businessId, dateRange)
            const serialized = JSON.stringify(statistics)

            await this.redis.setex(key, this.config.statisticsTTL, serialized)
        } catch (error) {
            console.warn('Cache set statistics error:', error)
        }
    }

    /**
     * Get conflict check results from cache
     */
    async getConflictCheck(
        staffId: string,
        businessId: string,
        timeSlot: { startTime: Date; endTime: Date },
        excludeId?: string
    ): Promise<any[] | null> {
        try {
            const key = CacheKeyGenerator.appointmentConflicts(staffId, businessId, timeSlot, excludeId)
            const cached = await this.redis.get(key)

            if (cached) {
                return JSON.parse(cached)
            }

            return null
        } catch (error) {
            console.warn('Cache get conflict check error:', error)
            return null
        }
    }

    /**
     * Set conflict check results in cache
     */
    async setConflictCheck(
        staffId: string,
        businessId: string,
        timeSlot: { startTime: Date; endTime: Date },
        conflicts: any[],
        excludeId?: string
    ): Promise<void> {
        try {
            const key = CacheKeyGenerator.appointmentConflicts(staffId, businessId, timeSlot, excludeId)
            const serialized = JSON.stringify(conflicts)

            await this.redis.setex(key, this.config.conflictCheckTTL, serialized)
        } catch (error) {
            console.warn('Cache set conflict check error:', error)
        }
    }

    // ============================================================================
    // CACHE INVALIDATION
    // ============================================================================

    /**
     * Invalidate appointment-related cache entries
     */
    async invalidateAppointment(
        appointmentId: string,
        businessId: string,
        staffId: string,
        immediate: boolean = false
    ): Promise<void> {
        const keysToInvalidate = CacheKeyGenerator.appointmentRelatedKeys(appointmentId, businessId, staffId)

        if (immediate || !this.config.enableSmartInvalidation) {
            await this.executeInvalidation(keysToInvalidate)
        } else {
            // Queue for batch invalidation
            keysToInvalidate.forEach(key => this.invalidationQueue.add(key))
            this.scheduleInvalidation()
        }
    }

    /**
     * Invalidate business-wide appointment cache
     */
    async invalidateBusinessAppointments(businessId: string): Promise<void> {
        try {
            const pattern = CacheKeyGenerator.businessAppointmentList(businessId)
            await this.invalidateByPattern(pattern)
        } catch (error) {
            console.warn('Cache invalidation error:', error)
        }
    }

    /**
     * Invalidate staff appointment cache
     */
    async invalidateStaffAppointments(staffId: string, businessId: string): Promise<void> {
        try {
            const pattern = CacheKeyGenerator.staffAppointmentList(staffId, businessId)
            await this.invalidateByPattern(pattern)
        } catch (error) {
            console.warn('Cache invalidation error:', error)
        }
    }

    /**
     * Schedule batch invalidation
     */
    private scheduleInvalidation(): void {
        if (this.invalidationTimer) {
            return // Already scheduled
        }

        this.invalidationTimer = setTimeout(async () => {
            const keysToInvalidate = Array.from(this.invalidationQueue)
            this.invalidationQueue.clear()
            this.invalidationTimer = undefined

            if (keysToInvalidate.length > 0) {
                await this.executeInvalidation(keysToInvalidate)
            }
        }, this.config.invalidationDelay)
    }

    /**
     * Execute cache invalidation
     */
    private async executeInvalidation(keys: string[]): Promise<void> {
        try {
            if (keys.length === 0) return

            // Expand pattern keys
            const expandedKeys: string[] = []
            for (const key of keys) {
                if (key.includes('*')) {
                    const matchingKeys = await this.redis.keys(key)
                    expandedKeys.push(...matchingKeys)
                } else {
                    expandedKeys.push(key)
                }
            }

            // Remove duplicates
            const uniqueKeys = [...new Set(expandedKeys)]

            if (uniqueKeys.length > 0) {
                await this.redis.del(...uniqueKeys)
                console.log(`Invalidated ${uniqueKeys.length} cache entries`)
            }
        } catch (error) {
            console.warn('Cache invalidation execution error:', error)
        }
    }

    /**
     * Invalidate cache entries by pattern
     */
    private async invalidateByPattern(pattern: string): Promise<void> {
        try {
            const keys = await this.redis.keys(pattern)
            if (keys.length > 0) {
                await this.redis.del(...keys)
            }
        } catch (error) {
            console.warn('Pattern invalidation error:', error)
        }
    }

    // ============================================================================
    // CACHE WARMING
    // ============================================================================

    /**
     * Warm cache with frequently accessed appointment data
     */
    async warmCache(businessId: string, staffIds: string[]): Promise<void> {
        if (!this.config.enableCacheWarming) {
            return
        }

        try {
            console.log(`Starting cache warming for business ${businessId}`)

            // Warm upcoming appointments for each staff member
            const warmingPromises = staffIds.map(staffId =>
                this.warmStaffAppointments(staffId, businessId)
            )

            await Promise.all(warmingPromises)

            console.log(`Cache warming completed for business ${businessId}`)
        } catch (error) {
            console.warn('Cache warming error:', error)
        }
    }

    /**
     * Warm staff appointment cache
     */
    private async warmStaffAppointments(staffId: string, businessId: string): Promise<void> {
        // This would typically fetch data from the database and populate cache
        // For now, we'll just create the cache keys that would be populated
        const dateRange = {
            startDate: new Date(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
        }

        const cacheKey = CacheKeyGenerator.appointmentsByStaff(staffId, businessId, dateRange)

        // In a real implementation, you would:
        // 1. Fetch the data from the database
        // 2. Store it in cache with appropriate TTL
        // For now, we'll just log the warming activity
        console.log(`Would warm cache for key: ${cacheKey}`)
    }

    // ============================================================================
    // CACHE MONITORING AND MAINTENANCE
    // ============================================================================

    /**
     * Get cache statistics
     */
    async getCacheStats(): Promise<{
        memoryUsage: number
        keyCount: number
        hitRate: number
        missRate: number
        evictions: number
    }> {
        try {
            const info = await this.redis.info('memory')
            const stats = await this.redis.info('stats')

            // Parse Redis info output
            const memoryMatch = info.match(/used_memory:(\d+)/)
            const memoryUsage = memoryMatch ? parseInt(memoryMatch[1]) : 0

            const keyCountMatch = await this.redis.dbsize()

            // Parse hit/miss stats (simplified)
            const hitsMatch = stats.match(/keyspace_hits:(\d+)/)
            const missesMatch = stats.match(/keyspace_misses:(\d+)/)
            const evictionsMatch = stats.match(/evicted_keys:(\d+)/)

            const hits = hitsMatch ? parseInt(hitsMatch[1]) : 0
            const misses = missesMatch ? parseInt(missesMatch[1]) : 0
            const evictions = evictionsMatch ? parseInt(evictionsMatch[1]) : 0

            const total = hits + misses
            const hitRate = total > 0 ? hits / total : 0
            const missRate = total > 0 ? misses / total : 0

            return {
                memoryUsage: Math.round(memoryUsage / 1024 / 1024), // MB
                keyCount: keyCountMatch,
                hitRate,
                missRate,
                evictions
            }
        } catch (error) {
            console.warn('Error getting cache stats:', error)
            return {
                memoryUsage: 0,
                keyCount: 0,
                hitRate: 0,
                missRate: 0,
                evictions: 0
            }
        }
    }

    /**
     * Clear all appointment cache
     */
    async clearCache(): Promise<void> {
        try {
            const pattern = `${this.config.keyPrefix}*`
            const keys = await this.redis.keys(pattern)

            if (keys.length > 0) {
                await this.redis.del(...keys)
                console.log(`Cleared ${keys.length} cache entries`)
            }
        } catch (error) {
            console.warn('Cache clear error:', error)
        }
    }

    /**
     * Disconnect from Redis
     */
    async disconnect(): Promise<void> {
        if (this.invalidationTimer) {
            clearTimeout(this.invalidationTimer)
        }
        await this.redis.disconnect()
    }
}

// ============================================================================
// CACHE WRAPPER UTILITIES
// ============================================================================

/**
 * Utility function to wrap database operations with caching
 */
export async function withAppointmentCache<T>(
    cacheKey: string,
    fetchFn: () => Promise<T>,
    ttl?: number
): Promise<T> {
    const cache = AppointmentCacheManager.getInstance()

    // Try to get from cache first
    const cached = await cache.getAppointmentList<T>(cacheKey)
    if (cached !== null) {
        return cached
    }

    // Fetch from database
    const result = await fetchFn()

    // Store in cache
    await cache.setAppointmentList(cacheKey, result, ttl)

    return result
}

/**
 * Cache invalidation utility for appointment operations
 */
export async function invalidateAppointmentCache(
    appointmentId: string,
    businessId: string,
    staffId: string,
    immediate: boolean = false
): Promise<void> {
    const cache = AppointmentCacheManager.getInstance()
    await cache.invalidateAppointment(appointmentId, businessId, staffId, immediate)
}

// ============================================================================
// EXPORTS
// ============================================================================

export { CacheKeyGenerator }
export const appointmentCache = AppointmentCacheManager.getInstance()
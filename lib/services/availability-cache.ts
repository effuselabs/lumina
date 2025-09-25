import { prisma } from '@/lib/prisma'
import { AvailabilitySlot } from './availability-calculator'

export interface CacheOptions {
    businessId: string
    staffId?: string
    date: Date
    serviceId?: string
    duration?: number
}

export interface CacheEntry {
    id: string
    businessId: string
    staffId?: string
    date: Date
    availableSlots: AvailabilitySlot[]
    cacheKey: string
    expiresAt: Date
    createdAt: Date
}

export interface CacheMetrics {
    hitRate: number
    totalRequests: number
    totalHits: number
    totalMisses: number
    averageQueryTime: number
}

/**
 * Availability Cache Service
 * Implements Redis-like caching for availability calculations
 * Requirements: 6.5, 7.1, 7.2
 */
export class AvailabilityCache {
    private static readonly DEFAULT_TTL = 15 * 60 * 1000 // 15 minutes in milliseconds
    private static readonly BATCH_SIZE = 100
    private static readonly MAX_CACHE_ENTRIES = 10000

    // Performance monitoring
    private static metrics = {
        totalRequests: 0,
        totalHits: 0,
        totalMisses: 0,
        queryTimes: [] as number[]
    }

    /**
     * Get cached availability slots
     * Requirements: 6.5
     */
    static async get(options: CacheOptions): Promise<AvailabilitySlot[] | null> {
        const startTime = Date.now()
        this.metrics.totalRequests++

        try {
            const cacheKey = this.generateCacheKey(options)

            const cacheEntry = await prisma.availabilityCache.findUnique({
                where: { cacheKey },
                select: {
                    availableSlots: true,
                    expiresAt: true
                }
            })

            const queryTime = Date.now() - startTime
            this.metrics.queryTimes.push(queryTime)

            if (!cacheEntry || cacheEntry.expiresAt < new Date()) {
                this.metrics.totalMisses++

                // Clean up expired entry if it exists
                if (cacheEntry) {
                    await this.delete(cacheKey)
                }

                return null
            }

            this.metrics.totalHits++
            return cacheEntry.availableSlots as AvailabilitySlot[]
        } catch (error) {
            console.error('Error getting from availability cache:', error)
            this.metrics.totalMisses++
            return null
        }
    }

    /**
     * Set cached availability slots
     * Requirements: 6.5
     */
    static async set(
        options: CacheOptions,
        slots: AvailabilitySlot[],
        ttl: number = this.DEFAULT_TTL
    ): Promise<void> {
        try {
            const cacheKey = this.generateCacheKey(options)
            const expiresAt = new Date(Date.now() + ttl)

            // Clean up old entries if we're approaching the limit
            await this.cleanupIfNeeded()

            await prisma.availabilityCache.upsert({
                where: { cacheKey },
                update: {
                    availableSlots: slots as any,
                    expiresAt,
                    updatedAt: new Date()
                },
                create: {
                    businessId: options.businessId,
                    staffId: options.staffId,
                    date: options.date,
                    availableSlots: slots as any,
                    cacheKey,
                    expiresAt
                }
            })
        } catch (error) {
            console.error('Error setting availability cache:', error)
            // Don't throw error - caching failures shouldn't break the application
        }
    }

    /**
     * Invalidate cache entries
     * Requirements: 6.5
     */
    static async invalidate(options: Partial<CacheOptions>): Promise<void> {
        try {
            const whereClause: any = {}

            if (options.businessId) {
                whereClause.businessId = options.businessId
            }

            if (options.staffId) {
                whereClause.staffId = options.staffId
            }

            if (options.date) {
                whereClause.date = options.date
            }

            await prisma.availabilityCache.deleteMany({
                where: whereClause
            })
        } catch (error) {
            console.error('Error invalidating availability cache:', error)
        }
    }

    /**
     * Invalidate cache for staff availability changes
     * Requirements: 6.5
     */
    static async invalidateStaffAvailability(staffId: string, businessId: string): Promise<void> {
        try {
            // Invalidate all cache entries for this staff member
            await prisma.availabilityCache.deleteMany({
                where: {
                    staffId,
                    businessId
                }
            })
        } catch (error) {
            console.error('Error invalidating staff availability cache:', error)
        }
    }

    /**
     * Invalidate cache for business hours changes
     * Requirements: 6.5
     */
    static async invalidateBusinessHours(businessId: string): Promise<void> {
        try {
            // Invalidate all cache entries for this business
            await prisma.availabilityCache.deleteMany({
                where: { businessId }
            })
        } catch (error) {
            console.error('Error invalidating business hours cache:', error)
        }
    }

    /**
     * Batch calculate and cache availability for multiple days
     * Requirements: 7.1, 7.2
     */
    static async batchCalculateAndCache(
        businessId: string,
        staffIds: string[],
        dateRange: { startDate: Date; endDate: Date },
        serviceId?: string,
        calculator?: (options: any) => Promise<AvailabilitySlot[]>
    ): Promise<void> {
        if (!calculator) {
            console.warn('No calculator provided for batch caching')
            return
        }

        try {
            const currentDate = new Date(dateRange.startDate)
            const batches: Array<{ options: CacheOptions; slots: AvailabilitySlot[] }> = []

            while (currentDate <= dateRange.endDate) {
                for (const staffId of staffIds) {
                    const options: CacheOptions = {
                        businessId,
                        staffId,
                        date: new Date(currentDate),
                        serviceId
                    }

                    // Check if already cached and not expired
                    const cached = await this.get(options)
                    if (cached) {
                        continue // Skip if already cached
                    }

                    // Calculate availability
                    const slots = await calculator({
                        businessId,
                        staffId,
                        date: new Date(currentDate),
                        serviceId
                    })

                    batches.push({ options, slots })

                    // Process in batches to avoid overwhelming the database
                    if (batches.length >= this.BATCH_SIZE) {
                        await this.processBatch(batches)
                        batches.length = 0
                    }
                }

                currentDate.setDate(currentDate.getDate() + 1)
            }

            // Process remaining batch
            if (batches.length > 0) {
                await this.processBatch(batches)
            }
        } catch (error) {
            console.error('Error in batch calculate and cache:', error)
        }
    }

    /**
     * Get cache performance metrics
     * Requirements: 7.1, 7.2
     */
    static getMetrics(): CacheMetrics {
        const hitRate = this.metrics.totalRequests > 0
            ? (this.metrics.totalHits / this.metrics.totalRequests) * 100
            : 0

        const averageQueryTime = this.metrics.queryTimes.length > 0
            ? this.metrics.queryTimes.reduce((sum, time) => sum + time, 0) / this.metrics.queryTimes.length
            : 0

        return {
            hitRate: Math.round(hitRate * 100) / 100,
            totalRequests: this.metrics.totalRequests,
            totalHits: this.metrics.totalHits,
            totalMisses: this.metrics.totalMisses,
            averageQueryTime: Math.round(averageQueryTime * 100) / 100
        }
    }

    /**
     * Reset cache metrics
     * Requirements: 7.1, 7.2
     */
    static resetMetrics(): void {
        this.metrics = {
            totalRequests: 0,
            totalHits: 0,
            totalMisses: 0,
            queryTimes: []
        }
    }

    /**
     * Clean up expired cache entries
     * Requirements: 6.5
     */
    static async cleanupExpired(): Promise<number> {
        try {
            const result = await prisma.availabilityCache.deleteMany({
                where: {
                    expiresAt: {
                        lt: new Date()
                    }
                }
            })

            return result.count
        } catch (error) {
            console.error('Error cleaning up expired cache entries:', error)
            return 0
        }
    }

    /**
     * Get cache statistics
     * Requirements: 7.1, 7.2
     */
    static async getCacheStats(): Promise<{
        totalEntries: number
        expiredEntries: number
        entriesByBusiness: Record<string, number>
        oldestEntry?: Date
        newestEntry?: Date
    }> {
        try {
            const [totalEntries, expiredEntries, businessStats, oldestEntry, newestEntry] = await Promise.all([
                prisma.availabilityCache.count(),
                prisma.availabilityCache.count({
                    where: {
                        expiresAt: { lt: new Date() }
                    }
                }),
                prisma.availabilityCache.groupBy({
                    by: ['businessId'],
                    _count: { businessId: true }
                }),
                prisma.availabilityCache.findFirst({
                    orderBy: { createdAt: 'asc' },
                    select: { createdAt: true }
                }),
                prisma.availabilityCache.findFirst({
                    orderBy: { createdAt: 'desc' },
                    select: { createdAt: true }
                })
            ])

            const entriesByBusiness: Record<string, number> = {}
            businessStats.forEach(stat => {
                entriesByBusiness[stat.businessId] = stat._count.businessId
            })

            return {
                totalEntries,
                expiredEntries,
                entriesByBusiness,
                oldestEntry: oldestEntry?.createdAt,
                newestEntry: newestEntry?.createdAt
            }
        } catch (error) {
            console.error('Error getting cache stats:', error)
            return {
                totalEntries: 0,
                expiredEntries: 0,
                entriesByBusiness: {}
            }
        }
    }

    /**
     * Generate cache key from options
     * Private helper method
     */
    private static generateCacheKey(options: CacheOptions): string {
        const parts = [
            'avail',
            options.businessId,
            options.staffId || 'all',
            options.date.toISOString().split('T')[0], // YYYY-MM-DD format
            options.serviceId || 'any',
            options.duration?.toString() || 'default'
        ]

        return parts.join(':')
    }

    /**
     * Delete cache entry by key
     * Private helper method
     */
    private static async delete(cacheKey: string): Promise<void> {
        try {
            await prisma.availabilityCache.delete({
                where: { cacheKey }
            })
        } catch (error) {
            // Ignore errors - entry might already be deleted
        }
    }

    /**
     * Process a batch of cache entries
     * Private helper method
     */
    private static async processBatch(
        batches: Array<{ options: CacheOptions; slots: AvailabilitySlot[] }>
    ): Promise<void> {
        try {
            const operations = batches.map(({ options, slots }) => {
                const cacheKey = this.generateCacheKey(options)
                const expiresAt = new Date(Date.now() + this.DEFAULT_TTL)

                return prisma.availabilityCache.upsert({
                    where: { cacheKey },
                    update: {
                        availableSlots: slots as any,
                        expiresAt,
                        updatedAt: new Date()
                    },
                    create: {
                        businessId: options.businessId,
                        staffId: options.staffId,
                        date: options.date,
                        availableSlots: slots as any,
                        cacheKey,
                        expiresAt
                    }
                })
            })

            await prisma.$transaction(operations)
        } catch (error) {
            console.error('Error processing cache batch:', error)
        }
    }

    /**
     * Clean up cache if approaching limits
     * Private helper method
     */
    private static async cleanupIfNeeded(): Promise<void> {
        try {
            const totalEntries = await prisma.availabilityCache.count()

            if (totalEntries >= this.MAX_CACHE_ENTRIES) {
                // Delete oldest 10% of entries
                const deleteCount = Math.floor(this.MAX_CACHE_ENTRIES * 0.1)

                const oldestEntries = await prisma.availabilityCache.findMany({
                    orderBy: { createdAt: 'asc' },
                    take: deleteCount,
                    select: { id: true }
                })

                if (oldestEntries.length > 0) {
                    await prisma.availabilityCache.deleteMany({
                        where: {
                            id: {
                                in: oldestEntries.map(entry => entry.id)
                            }
                        }
                    })
                }
            }
        } catch (error) {
            console.error('Error in cache cleanup:', error)
        }
    }
}
/**
 * Appointment Data Caching System
 * Implements intelligent caching with invalidation for appointment data
 */

import { DashboardAppointment } from '@/types/dashboard-appointments';

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
    version: number;
}

interface AppointmentCacheKey {
    businessId: string;
    dateRange: {
        start: string;
        end: string;
    };
    filters?: {
        staffIds?: string[];
        serviceIds?: string[];
        status?: string[];
    };
}

class AppointmentCache {
    private cache = new Map<string, CacheEntry<DashboardAppointment[]>>();
    private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
    private readonly MAX_CACHE_SIZE = 100;
    private version = 1;

    /**
     * Generate cache key from appointment query parameters
     */
    private generateKey(key: AppointmentCacheKey): string {
        const filterKey = key.filters
            ? JSON.stringify(key.filters)
            : 'no-filters';

        return `${key.businessId}:${key.dateRange.start}:${key.dateRange.end}:${filterKey}`;
    }

    /**
     * Get cached appointments if valid
     */
    get(key: AppointmentCacheKey): DashboardAppointment[] | null {
        const cacheKey = this.generateKey(key);
        const entry = this.cache.get(cacheKey);

        if (!entry) {
            return null;
        }

        // Check if entry is expired
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(cacheKey);
            return null;
        }

        // Check if entry is outdated (version mismatch)
        if (entry.version < this.version) {
            this.cache.delete(cacheKey);
            return null;
        }

        return entry.data;
    }

    /**
     * Store appointments in cache
     */
    set(
        key: AppointmentCacheKey,
        data: DashboardAppointment[],
        ttl: number = this.DEFAULT_TTL
    ): void {
        const cacheKey = this.generateKey(key);

        // Implement LRU eviction if cache is full
        if (this.cache.size >= this.MAX_CACHE_SIZE) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) {
                this.cache.delete(firstKey);
            }
        }

        this.cache.set(cacheKey, {
            data,
            timestamp: Date.now(),
            ttl,
            version: this.version
        });
    }

    /**
     * Invalidate cache entries for specific business
     */
    invalidateForBusiness(businessId: string): void {
        const keysToDelete: string[] = [];

        for (const [key] of this.cache) {
            if (key.startsWith(`${businessId}:`)) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => this.cache.delete(key));
    }

    /**
     * Invalidate cache entries that include specific appointment
     */
    invalidateForAppointment(appointmentId: string, businessId: string): void {
        const keysToDelete: string[] = [];

        for (const [key, entry] of this.cache) {
            if (key.startsWith(`${businessId}:`) &&
                entry.data.some(apt => apt.id === appointmentId)) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => this.cache.delete(key));
    }

    /**
     * Invalidate all cache entries (global cache clear)
     */
    invalidateAll(): void {
        this.version++;
        this.cache.clear();
    }

    /**
     * Get cache statistics for monitoring
     */
    getStats() {
        const now = Date.now();
        let validEntries = 0;
        let expiredEntries = 0;
        let totalSize = 0;

        for (const [, entry] of this.cache) {
            totalSize += entry.data.length;

            if (now - entry.timestamp > entry.ttl || entry.version < this.version) {
                expiredEntries++;
            } else {
                validEntries++;
            }
        }

        return {
            totalEntries: this.cache.size,
            validEntries,
            expiredEntries,
            totalAppointments: totalSize,
            hitRate: this.hitCount / (this.hitCount + this.missCount) || 0,
            version: this.version
        };
    }

    private hitCount = 0;
    private missCount = 0;

    /**
     * Track cache hit for metrics
     */
    private trackHit(): void {
        this.hitCount++;
    }

    /**
     * Track cache miss for metrics
     */
    private trackMiss(): void {
        this.missCount++;
    }

    /**
     * Enhanced get method with metrics tracking
     */
    getWithMetrics(key: AppointmentCacheKey): DashboardAppointment[] | null {
        const result = this.get(key);

        if (result) {
            this.trackHit();
        } else {
            this.trackMiss();
        }

        return result;
    }
}

// Singleton instance
export const appointmentCache = new AppointmentCache();

/**
 * Hook for using appointment cache in React components
 */
export function useAppointmentCache() {
    return {
        get: (key: AppointmentCacheKey) => appointmentCache.getWithMetrics(key),
        set: (key: AppointmentCacheKey, data: DashboardAppointment[], ttl?: number) =>
            appointmentCache.set(key, data, ttl),
        invalidateForBusiness: (businessId: string) =>
            appointmentCache.invalidateForBusiness(businessId),
        invalidateForAppointment: (appointmentId: string, businessId: string) =>
            appointmentCache.invalidateForAppointment(appointmentId, businessId),
        invalidateAll: () => appointmentCache.invalidateAll(),
        getStats: () => appointmentCache.getStats()
    };
}
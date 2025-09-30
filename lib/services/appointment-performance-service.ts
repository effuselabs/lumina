/**
 * Appointment Performance Service
 * Orchestrates all performance optimization features
 */

import { useAppointmentCache } from '@/lib/cache/appointment-cache';
import { usePerformanceMonitoring } from '@/lib/monitoring/appointment-performance-monitor';
import { useAppointmentSearch } from '@/lib/search/appointment-search-index';
import { DashboardAppointment } from '@/types/dashboard-appointments';

interface PerformanceConfig {
    caching: {
        enabled: boolean;
        defaultTTL: number;
        maxCacheSize: number;
    };
    virtualScrolling: {
        enabled: boolean;
        itemHeight: number;
        overscan: number;
        threshold: number; // Minimum items to enable virtual scrolling
    };
    search: {
        enabled: boolean;
        indexingEnabled: boolean;
        debounceMs: number;
        maxSuggestions: number;
    };
    progressiveLoading: {
        enabled: boolean;
        chunkSize: number;
        preloadChunks: number;
        maxConcurrentLoads: number;
    };
    monitoring: {
        enabled: boolean;
        reportInterval: number;
        alertThresholds: {
            loadTime: number;
            searchTime: number;
            memoryUsage: number;
        };
    };
}

class AppointmentPerformanceService {
    private config: PerformanceConfig;
    private cache = useAppointmentCache();
    private search = useAppointmentSearch();
    private monitoring = usePerformanceMonitoring();

    constructor(config?: Partial<PerformanceConfig>) {
        this.config = {
            caching: {
                enabled: true,
                defaultTTL: 5 * 60 * 1000, // 5 minutes
                maxCacheSize: 100
            },
            virtualScrolling: {
                enabled: true,
                itemHeight: 80,
                overscan: 5,
                threshold: 50
            },
            search: {
                enabled: true,
                indexingEnabled: true,
                debounceMs: 300,
                maxSuggestions: 5
            },
            progressiveLoading: {
                enabled: true,
                chunkSize: 7,
                preloadChunks: 2,
                maxConcurrentLoads: 3
            },
            monitoring: {
                enabled: true,
                reportInterval: 60000, // 1 minute
                alertThresholds: {
                    loadTime: 1000,
                    searchTime: 500,
                    memoryUsage: 100
                }
            },
            ...config
        };
    }

    /**
     * Initialize performance optimizations
     */
    async initialize(businessId: string): Promise<void> {
        const stopTiming = this.monitoring.startTiming('appointment-performance-init');

        try {
            // Initialize search index if enabled
            if (this.config.search.indexingEnabled) {
                await this.initializeSearchIndex(businessId);
            }

            // Start monitoring if enabled
            if (this.config.monitoring.enabled) {
                this.startPerformanceMonitoring();
            }

            this.monitoring.recordMetric('appointment-performance-init-success', 1);
        } catch (error) {
            this.monitoring.recordMetric('appointment-performance-init-error', 1);
            throw error;
        } finally {
            stopTiming();
        }
    }

    /**
     * Load appointments with all performance optimizations
     */
    async loadAppointments(
        businessId: string,
        dateRange: { start: Date; end: Date },
        filters?: any
    ): Promise<DashboardAppointment[]> {
        const stopTiming = this.monitoring.startTiming('appointment-calendar-load');

        try {
            // Check cache first if enabled
            if (this.config.caching.enabled) {
                const cacheKey = {
                    businessId,
                    dateRange: {
                        start: dateRange.start.toISOString(),
                        end: dateRange.end.toISOString()
                    },
                    filters
                };

                const cached = this.cache.get(cacheKey);
                if (cached) {
                    this.monitoring.recordMetric('appointment-cache-hit', 1);
                    return cached;
                }

                this.monitoring.recordMetric('appointment-cache-miss', 1);
            }

            // Load from API
            const appointments = await this.fetchAppointmentsFromAPI(businessId, dateRange, filters);

            // Cache results if enabled
            if (this.config.caching.enabled) {
                const cacheKey = {
                    businessId,
                    dateRange: {
                        start: dateRange.start.toISOString(),
                        end: dateRange.end.toISOString()
                    },
                    filters
                };

                this.cache.set(cacheKey, appointments, this.config.caching.defaultTTL);
            }

            // Update search index if enabled
            if (this.config.search.indexingEnabled) {
                this.search.addAppointments(appointments);
            }

            return appointments;

        } catch (error) {
            this.monitoring.recordMetric('appointment-load-error', 1);
            throw error;
        } finally {
            stopTiming();
        }
    }

    /**
     * Search appointments with performance optimizations
     */
    async searchAppointments(
        businessId: string,
        query: string,
        filters: any,
        appointments: DashboardAppointment[]
    ): Promise<DashboardAppointment[]> {
        const stopTiming = this.monitoring.startTiming('appointment-search');

        try {
            if (!this.config.search.enabled) {
                // Fallback to simple filtering
                return this.simpleSearch(appointments, query, filters);
            }

            // Use optimized search index
            const searchResults = this.search.search(businessId, { query, ...filters }, appointments);
            return searchResults.map(result => result.appointment);

        } catch (error) {
            this.monitoring.recordMetric('appointment-search-error', 1);
            // Fallback to simple search
            return this.simpleSearch(appointments, query, filters);
        } finally {
            stopTiming();
        }
    }

    /**
     * Update appointment with cache invalidation
     */
    async updateAppointment(
        businessId: string,
        appointmentId: string,
        updates: Partial<DashboardAppointment>
    ): Promise<DashboardAppointment> {
        const stopTiming = this.monitoring.startTiming('appointment-update');

        try {
            // Update via API
            const updatedAppointment = await this.updateAppointmentAPI(appointmentId, updates);

            // Invalidate cache
            if (this.config.caching.enabled) {
                this.cache.invalidateForAppointment(appointmentId, businessId);
            }

            // Update search index
            if (this.config.search.indexingEnabled) {
                this.search.updateAppointment(updatedAppointment);
            }

            return updatedAppointment;

        } catch (error) {
            this.monitoring.recordMetric('appointment-update-error', 1);
            throw error;
        } finally {
            stopTiming();
        }
    }

    /**
     * Delete appointment with cleanup
     */
    async deleteAppointment(businessId: string, appointmentId: string): Promise<void> {
        const stopTiming = this.monitoring.startTiming('appointment-delete');

        try {
            // Delete via API
            await this.deleteAppointmentAPI(appointmentId);

            // Clean up cache
            if (this.config.caching.enabled) {
                this.cache.invalidateForAppointment(appointmentId, businessId);
            }

            // Clean up search index
            if (this.config.search.indexingEnabled) {
                this.search.removeAppointment(appointmentId);
            }

        } catch (error) {
            this.monitoring.recordMetric('appointment-delete-error', 1);
            throw error;
        } finally {
            stopTiming();
        }
    }

    /**
     * Get search suggestions with performance optimization
     */
    getSearchSuggestions(businessId: string, query: string): string[] {
        if (!this.config.search.enabled || !query.trim()) {
            return [];
        }

        return this.search.getSuggestions(
            businessId,
            query,
            this.config.search.maxSuggestions
        );
    }

    /**
     * Check if virtual scrolling should be enabled
     */
    shouldUseVirtualScrolling(itemCount: number): boolean {
        return this.config.virtualScrolling.enabled &&
            itemCount >= this.config.virtualScrolling.threshold;
    }

    /**
     * Get virtual scrolling configuration
     */
    getVirtualScrollingConfig() {
        return {
            itemHeight: this.config.virtualScrolling.itemHeight,
            overscan: this.config.virtualScrolling.overscan,
            enabled: this.config.virtualScrolling.enabled
        };
    }

    /**
     * Get progressive loading configuration
     */
    getProgressiveLoadingConfig() {
        return {
            chunkSize: this.config.progressiveLoading.chunkSize,
            preloadChunks: this.config.progressiveLoading.preloadChunks,
            maxConcurrentLoads: this.config.progressiveLoading.maxConcurrentLoads,
            enabled: this.config.progressiveLoading.enabled
        };
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        return {
            cache: this.cache.getStats(),
            search: this.search.getStats(),
            monitoring: this.monitoring.generateReport()
        };
    }

    /**
     * Clear all performance caches
     */
    clearCaches(businessId?: string): void {
        if (businessId) {
            this.cache.invalidateForBusiness(businessId);
            this.search.clearBusiness(businessId);
        } else {
            this.cache.invalidateAll();
        }
    }

    /**
     * Update performance configuration
     */
    updateConfig(newConfig: Partial<PerformanceConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }

    // Private helper methods

    private async initializeSearchIndex(businessId: string): Promise<void> {
        // Load initial appointments for indexing
        const now = new Date();
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        try {
            const appointments = await this.fetchAppointmentsFromAPI(
                businessId,
                { start: oneMonthAgo, end: now }
            );

            this.search.addAppointments(appointments);
        } catch (error) {
            console.warn('Failed to initialize search index:', error);
        }
    }

    private startPerformanceMonitoring(): void {
        // Set up periodic performance reporting
        setInterval(() => {
            const report = this.monitoring.generateReport();

            // Check for performance issues
            if (report.violations.length > 0) {
                console.warn('Performance violations detected:', report.violations);
            }

            // Log performance metrics
            console.log('Performance metrics:', report.metrics);
        }, this.config.monitoring.reportInterval);
    }

    private async fetchAppointmentsFromAPI(
        businessId: string,
        dateRange: { start: Date; end: Date },
        filters?: any
    ): Promise<DashboardAppointment[]> {
        const params = new URLSearchParams({
            businessId,
            start: dateRange.start.toISOString(),
            end: dateRange.end.toISOString(),
            ...(filters && { filters: JSON.stringify(filters) })
        });

        const response = await fetch(`/api/appointments?${params}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch appointments: ${response.statusText}`);
        }

        const data = await response.json();
        return data.appointments || [];
    }

    private async updateAppointmentAPI(
        appointmentId: string,
        updates: Partial<DashboardAppointment>
    ): Promise<DashboardAppointment> {
        const response = await fetch(`/api/appointments/${appointmentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });

        if (!response.ok) {
            throw new Error(`Failed to update appointment: ${response.statusText}`);
        }

        return response.json();
    }

    private async deleteAppointmentAPI(appointmentId: string): Promise<void> {
        const response = await fetch(`/api/appointments/${appointmentId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`Failed to delete appointment: ${response.statusText}`);
        }
    }

    private simpleSearch(
        appointments: DashboardAppointment[],
        query: string,
        filters: any
    ): DashboardAppointment[] {
        const queryLower = query.toLowerCase();

        return appointments.filter(appointment => {
            // Text search
            const searchText = [
                appointment.client.firstName,
                appointment.client.lastName,
                appointment.client.email,
                appointment.staff.displayName,
                ...appointment.services.map(s => s.name),
                appointment.notes || ''
            ].join(' ').toLowerCase();

            const matchesQuery = !query || searchText.includes(queryLower);

            // Apply filters
            const matchesFilters = Object.entries(filters || {}).every(([key, value]) => {
                if (!value) return true;

                switch (key) {
                    case 'staffIds':
                        return Array.isArray(value) ? value.includes(appointment.staffId) : true;
                    case 'serviceIds':
                        return Array.isArray(value) ?
                            appointment.services.some(s => value.includes(s.id)) : true;
                    case 'status':
                        return Array.isArray(value) ? value.includes(appointment.status) : true;
                    default:
                        return true;
                }
            });

            return matchesQuery && matchesFilters;
        });
    }
}

// Export singleton instance
export const appointmentPerformanceService = new AppointmentPerformanceService();

/**
 * React hook for using appointment performance service
 */
export function useAppointmentPerformance() {
    return appointmentPerformanceService;
}
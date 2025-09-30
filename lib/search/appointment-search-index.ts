/**
 * Efficient Search Indexing and Filtering for Appointments
 * Implements in-memory search index with fuzzy matching and filtering
 */

import { DashboardAppointment } from '@/types/dashboard-appointments';

interface SearchableAppointment {
    id: string;
    businessId: string;
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    staffName: string;
    serviceNames: string[];
    status: string;
    startTime: Date;
    endTime: Date;
    notes: string;
    searchText: string; // Combined searchable text
}

interface SearchFilters {
    query?: string;
    staffIds?: string[];
    serviceIds?: string[];
    status?: string[];
    dateRange?: {
        start: Date;
        end: Date;
    };
    clientId?: string;
}

interface SearchResult {
    appointment: DashboardAppointment;
    score: number;
    matches: string[];
}

class AppointmentSearchIndex {
    private index = new Map<string, SearchableAppointment>();
    private businessIndexes = new Map<string, Set<string>>();
    private staffIndex = new Map<string, Set<string>>();
    private serviceIndex = new Map<string, Set<string>>();
    private statusIndex = new Map<string, Set<string>>();
    private dateIndex = new Map<string, Set<string>>();

    /**
     * Convert appointment to searchable format
     */
    private toSearchableAppointment(appointment: DashboardAppointment): SearchableAppointment {
        const clientName = `${appointment.client.firstName} ${appointment.client.lastName}`;
        const serviceNames = appointment.services.map(s => s.name);

        const searchText = [
            clientName,
            appointment.client.email,
            appointment.client.phone,
            appointment.staff.displayName,
            ...serviceNames,
            appointment.status,
            appointment.notes || ''
        ].join(' ').toLowerCase();

        return {
            id: appointment.id,
            businessId: appointment.businessId,
            clientName,
            clientEmail: appointment.client.email,
            clientPhone: appointment.client.phone,
            staffName: appointment.staff.displayName,
            serviceNames,
            status: appointment.status,
            startTime: appointment.startTime,
            endTime: appointment.endTime,
            notes: appointment.notes || '',
            searchText
        };
    }

    /**
     * Add appointment to search index
     */
    addAppointment(appointment: DashboardAppointment): void {
        const searchable = this.toSearchableAppointment(appointment);
        this.index.set(appointment.id, searchable);

        // Update business index
        if (!this.businessIndexes.has(appointment.businessId)) {
            this.businessIndexes.set(appointment.businessId, new Set());
        }
        this.businessIndexes.get(appointment.businessId)!.add(appointment.id);

        // Update staff index
        if (!this.staffIndex.has(appointment.staffId)) {
            this.staffIndex.set(appointment.staffId, new Set());
        }
        this.staffIndex.get(appointment.staffId)!.add(appointment.id);

        // Update service index
        appointment.services.forEach(service => {
            if (!this.serviceIndex.has(service.id)) {
                this.serviceIndex.set(service.id, new Set());
            }
            this.serviceIndex.get(service.id)!.add(appointment.id);
        });

        // Update status index
        if (!this.statusIndex.has(appointment.status)) {
            this.statusIndex.set(appointment.status, new Set());
        }
        this.statusIndex.get(appointment.status)!.add(appointment.id);

        // Update date index (by day)
        const dateKey = appointment.startTime.toDateString();
        if (!this.dateIndex.has(dateKey)) {
            this.dateIndex.set(dateKey, new Set());
        }
        this.dateIndex.get(dateKey)!.add(appointment.id);
    }

    /**
     * Remove appointment from search index
     */
    removeAppointment(appointmentId: string): void {
        const searchable = this.index.get(appointmentId);
        if (!searchable) return;

        this.index.delete(appointmentId);

        // Remove from business index
        this.businessIndexes.get(searchable.businessId)?.delete(appointmentId);

        // Remove from all other indexes
        for (const [, appointmentIds] of this.staffIndex) {
            appointmentIds.delete(appointmentId);
        }
        for (const [, appointmentIds] of this.serviceIndex) {
            appointmentIds.delete(appointmentId);
        }
        for (const [, appointmentIds] of this.statusIndex) {
            appointmentIds.delete(appointmentId);
        }
        for (const [, appointmentIds] of this.dateIndex) {
            appointmentIds.delete(appointmentId);
        }
    }

    /**
     * Update appointment in search index
     */
    updateAppointment(appointment: DashboardAppointment): void {
        this.removeAppointment(appointment.id);
        this.addAppointment(appointment);
    }

    /**
     * Bulk add appointments to index
     */
    addAppointments(appointments: DashboardAppointment[]): void {
        appointments.forEach(appointment => this.addAppointment(appointment));
    }

    /**
     * Clear index for specific business
     */
    clearBusiness(businessId: string): void {
        const appointmentIds = this.businessIndexes.get(businessId);
        if (appointmentIds) {
            appointmentIds.forEach(id => this.removeAppointment(id));
            this.businessIndexes.delete(businessId);
        }
    }

    /**
     * Calculate search score for text matching
     */
    private calculateScore(searchable: SearchableAppointment, query: string): number {
        const queryLower = query.toLowerCase();
        const searchText = searchable.searchText;

        // Exact match gets highest score
        if (searchText.includes(queryLower)) {
            const exactMatch = searchText === queryLower;
            const startsWithMatch = searchText.startsWith(queryLower);
            const wordBoundaryMatch = new RegExp(`\\b${queryLower}\\b`).test(searchText);

            if (exactMatch) return 100;
            if (startsWithMatch) return 90;
            if (wordBoundaryMatch) return 80;
            return 70;
        }

        // Fuzzy matching for partial matches
        let score = 0;
        const queryWords = queryLower.split(' ').filter(word => word.length > 0);

        queryWords.forEach(word => {
            if (searchText.includes(word)) {
                score += 10;
            }
        });

        return score;
    }

    /**
     * Search appointments with filters
     */
    search(
        businessId: string,
        filters: SearchFilters,
        appointments: DashboardAppointment[]
    ): SearchResult[] {
        // Get business-scoped appointment IDs
        const businessAppointmentIds = this.businessIndexes.get(businessId) || new Set();

        // Start with all business appointments
        let candidateIds = new Set(businessAppointmentIds);

        // Apply filters to narrow down candidates
        if (filters.staffIds && filters.staffIds.length > 0) {
            const staffFilteredIds = new Set<string>();
            filters.staffIds.forEach(staffId => {
                const staffAppointments = this.staffIndex.get(staffId) || new Set();
                staffAppointments.forEach(id => {
                    if (candidateIds.has(id)) {
                        staffFilteredIds.add(id);
                    }
                });
            });
            candidateIds = staffFilteredIds;
        }

        if (filters.serviceIds && filters.serviceIds.length > 0) {
            const serviceFilteredIds = new Set<string>();
            filters.serviceIds.forEach(serviceId => {
                const serviceAppointments = this.serviceIndex.get(serviceId) || new Set();
                serviceAppointments.forEach(id => {
                    if (candidateIds.has(id)) {
                        serviceFilteredIds.add(id);
                    }
                });
            });
            candidateIds = serviceFilteredIds;
        }

        if (filters.status && filters.status.length > 0) {
            const statusFilteredIds = new Set<string>();
            filters.status.forEach(status => {
                const statusAppointments = this.statusIndex.get(status) || new Set();
                statusAppointments.forEach(id => {
                    if (candidateIds.has(id)) {
                        statusFilteredIds.add(id);
                    }
                });
            });
            candidateIds = statusFilteredIds;
        }

        // Apply date range filter
        if (filters.dateRange) {
            const dateFilteredIds = new Set<string>();
            const currentDate = new Date(filters.dateRange.start);

            while (currentDate <= filters.dateRange.end) {
                const dateKey = currentDate.toDateString();
                const dateAppointments = this.dateIndex.get(dateKey) || new Set();

                dateAppointments.forEach(id => {
                    if (candidateIds.has(id)) {
                        dateFilteredIds.add(id);
                    }
                });

                currentDate.setDate(currentDate.getDate() + 1);
            }
            candidateIds = dateFilteredIds;
        }

        // Convert candidate IDs to appointments and apply text search
        const results: SearchResult[] = [];
        const appointmentMap = new Map(appointments.map(apt => [apt.id, apt]));

        candidateIds.forEach(id => {
            const searchable = this.index.get(id);
            const appointment = appointmentMap.get(id);

            if (searchable && appointment) {
                let score = 50; // Base score for matching filters
                const matches: string[] = [];

                // Apply text search if query provided
                if (filters.query && filters.query.trim()) {
                    const textScore = this.calculateScore(searchable, filters.query);
                    if (textScore > 0) {
                        score += textScore;
                        matches.push('text');
                    } else {
                        return; // Skip if text doesn't match
                    }
                }

                results.push({
                    appointment,
                    score,
                    matches
                });
            }
        });

        // Sort by score (highest first)
        return results.sort((a, b) => b.score - a.score);
    }

    /**
     * Get search suggestions based on partial query
     */
    getSuggestions(businessId: string, query: string, limit: number = 5): string[] {
        const queryLower = query.toLowerCase();
        const suggestions = new Set<string>();
        const businessAppointmentIds = this.businessIndexes.get(businessId) || new Set();

        businessAppointmentIds.forEach(id => {
            const searchable = this.index.get(id);
            if (searchable) {
                // Extract potential suggestions from searchable text
                const words = searchable.searchText.split(' ');
                words.forEach(word => {
                    if (word.startsWith(queryLower) && word.length > queryLower.length) {
                        suggestions.add(word);
                    }
                });

                // Add client names that start with query
                if (searchable.clientName.toLowerCase().startsWith(queryLower)) {
                    suggestions.add(searchable.clientName);
                }

                // Add service names that start with query
                searchable.serviceNames.forEach(serviceName => {
                    if (serviceName.toLowerCase().startsWith(queryLower)) {
                        suggestions.add(serviceName);
                    }
                });
            }
        });

        return Array.from(suggestions).slice(0, limit);
    }

    /**
     * Get index statistics
     */
    getStats() {
        return {
            totalAppointments: this.index.size,
            businessCount: this.businessIndexes.size,
            staffCount: this.staffIndex.size,
            serviceCount: this.serviceIndex.size,
            statusCount: this.statusIndex.size,
            dateCount: this.dateIndex.size
        };
    }
}

// Singleton instance
export const appointmentSearchIndex = new AppointmentSearchIndex();

/**
 * Hook for using appointment search in React components
 */
export function useAppointmentSearch() {
    return {
        addAppointment: (appointment: DashboardAppointment) =>
            appointmentSearchIndex.addAppointment(appointment),
        removeAppointment: (appointmentId: string) =>
            appointmentSearchIndex.removeAppointment(appointmentId),
        updateAppointment: (appointment: DashboardAppointment) =>
            appointmentSearchIndex.updateAppointment(appointment),
        addAppointments: (appointments: DashboardAppointment[]) =>
            appointmentSearchIndex.addAppointments(appointments),
        search: (businessId: string, filters: SearchFilters, appointments: DashboardAppointment[]) =>
            appointmentSearchIndex.search(businessId, filters, appointments),
        getSuggestions: (businessId: string, query: string, limit?: number) =>
            appointmentSearchIndex.getSuggestions(businessId, query, limit),
        clearBusiness: (businessId: string) =>
            appointmentSearchIndex.clearBusiness(businessId),
        getStats: () => appointmentSearchIndex.getStats()
    };
}
'use client';

import {
  createSearchResult,
  extractHighlightTerms,
  filterAppointments,
  sortByRelevance,
  validateFilters,
} from '@/lib/search-utils';
import {
  AppointmentFilters,
  FilterState,
  SearchResult,
} from '@/types/appointment-filters';
import { DashboardAppointment } from '@/types/dashboard-appointments';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface UseAppointmentSearchOptions {
  appointments: DashboardAppointment[];
  initialFilters?: AppointmentFilters;
  maxResults?: number;
  debounceMs?: number;
}

interface UseAppointmentSearchReturn {
  // State
  filters: AppointmentFilters;
  searchResult: SearchResult;
  isLoading: boolean;
  error: string | null;

  // Actions
  updateFilters: (updates: Partial<AppointmentFilters>) => void;
  setFilters: (filters: AppointmentFilters) => void;
  clearFilters: () => void;

  // Computed
  hasActiveFilters: boolean;
  filterValidation: ReturnType<typeof validateFilters>;
}

export function useAppointmentSearch({
  appointments,
  initialFilters = {},
  maxResults = 100,
  debounceMs = 300,
}: UseAppointmentSearchOptions): UseAppointmentSearchReturn {
  const [filterState, setFilterState] = useState<FilterState>({
    filters: initialFilters,
    isLoading: false,
    lastUpdated: new Date(),
  });

  const [debouncedFilters, setDebouncedFilters] = useState(initialFilters);

  // Debounce filter updates
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filterState.filters);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [filterState.filters, debounceMs]);

  // Update filters
  const updateFilters = useCallback((updates: Partial<AppointmentFilters>) => {
    setFilterState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...updates },
      lastUpdated: new Date(),
    }));
  }, []);

  // Set filters completely
  const setFilters = useCallback((filters: AppointmentFilters) => {
    setFilterState(prev => ({
      ...prev,
      filters,
      lastUpdated: new Date(),
    }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilterState(prev => ({
      ...prev,
      filters: {},
      lastUpdated: new Date(),
    }));
  }, []);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    const filters = debouncedFilters;
    return !!(
      filters.searchTerm ||
      filters.staffIds?.length ||
      filters.serviceIds?.length ||
      filters.status?.length ||
      filters.dateRange ||
      filters.clientName ||
      filters.clientId
    );
  }, [debouncedFilters]);

  // Validate filters
  const filterValidation = useMemo(() => {
    return validateFilters(debouncedFilters);
  }, [debouncedFilters]);

  // Create search result
  const searchResult = useMemo(() => {
    try {
      setFilterState(prev => ({ ...prev, isLoading: true, error: undefined }));

      // Validate filters first
      const validation = validateFilters(debouncedFilters);
      if (!validation.isValid) {
        setFilterState(prev => ({
          ...prev,
          isLoading: false,
          error: validation.errors.join(', '),
        }));
        return createSearchResult([], debouncedFilters, 0, false);
      }

      // Filter appointments
      const filtered = filterAppointments(appointments, debouncedFilters);

      // Extract highlight terms
      const highlightTerms = extractHighlightTerms(debouncedFilters);

      // Sort by relevance
      const sorted = sortByRelevance(filtered, highlightTerms);

      // Limit results
      const limited = sorted.slice(0, maxResults);

      // Create result
      const result = createSearchResult(
        limited,
        debouncedFilters,
        filtered.length,
        filtered.length > maxResults
      );

      setFilterState(prev => ({ ...prev, isLoading: false, error: undefined }));
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Search failed';
      setFilterState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return createSearchResult([], debouncedFilters, 0, false);
    }
  }, [appointments, debouncedFilters, maxResults]);

  return {
    // State
    filters: filterState.filters,
    searchResult,
    isLoading: filterState.isLoading,
    error: filterState.error || null,

    // Actions
    updateFilters,
    setFilters,
    clearFilters,

    // Computed
    hasActiveFilters,
    filterValidation,
  };
}

// Hook for managing search history
export function useSearchHistory(maxHistory: number = 10) {
  const [searchHistory, setSearchHistory] = useState<AppointmentFilters[]>([]);

  const addToHistory = useCallback(
    (filters: AppointmentFilters) => {
      // Only add to history if filters are not empty
      const hasFilters = !!(
        filters.searchTerm ||
        filters.staffIds?.length ||
        filters.serviceIds?.length ||
        filters.status?.length ||
        filters.dateRange ||
        filters.clientName ||
        filters.clientId
      );

      if (!hasFilters) return;

      setSearchHistory(prev => {
        // Remove duplicate if exists
        const filtered = prev.filter(
          item => JSON.stringify(item) !== JSON.stringify(filters)
        );

        // Add to beginning and limit size
        return [filters, ...filtered].slice(0, maxHistory);
      });
    },
    [maxHistory]
  );

  const clearHistory = useCallback(() => {
    setSearchHistory([]);
  }, []);

  return {
    searchHistory,
    addToHistory,
    clearHistory,
  };
}

// Hook for search analytics
export function useSearchAnalytics() {
  const [analytics, setAnalytics] = useState({
    totalSearches: 0,
    popularFilters: {} as Record<string, number>,
    averageResultCount: 0,
    searchTimes: [] as number[],
  });

  const recordSearch = useCallback(
    (filters: AppointmentFilters, resultCount: number, searchTime: number) => {
      setAnalytics(prev => {
        const newAnalytics = { ...prev };

        // Increment total searches
        newAnalytics.totalSearches += 1;

        // Track popular filters
        Object.keys(filters).forEach(filterType => {
          if (filters[filterType as keyof AppointmentFilters]) {
            newAnalytics.popularFilters[filterType] =
              (newAnalytics.popularFilters[filterType] || 0) + 1;
          }
        });

        // Update average result count
        const totalResults =
          prev.averageResultCount * (prev.totalSearches - 1) + resultCount;
        newAnalytics.averageResultCount =
          totalResults / newAnalytics.totalSearches;

        // Track search times (keep last 100)
        newAnalytics.searchTimes = [...prev.searchTimes, searchTime].slice(
          -100
        );

        return newAnalytics;
      });
    },
    []
  );

  const getAverageSearchTime = useCallback(() => {
    if (analytics.searchTimes.length === 0) return 0;
    return (
      analytics.searchTimes.reduce((sum, time) => sum + time, 0) /
      analytics.searchTimes.length
    );
  }, [analytics.searchTimes]);

  return {
    analytics,
    recordSearch,
    getAverageSearchTime,
  };
}

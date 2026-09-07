/**
 * Progressive Loading Hook for Calendar Views
 * Implements progressive data loading with skeleton states
 */

import { useAppointmentCache } from '@/lib/cache/appointment-cache';
import { DashboardAppointment } from '@/types/dashboard-appointments';
import { useCallback, useEffect, useRef, useState } from 'react';

interface ProgressiveLoadingState {
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  progress: number;
}

interface LoadingChunk {
  dateRange: {
    start: Date;
    end: Date;
  };
  priority: number;
  loaded: boolean;
}

interface UseProgressiveLoadingOptions {
  businessId: string;
  initialDate: Date;
  view: 'day' | 'week' | 'month';
  chunkSize?: number;
  preloadChunks?: number;
  maxConcurrentLoads?: number;
}

interface UseProgressiveLoadingReturn {
  appointments: DashboardAppointment[];
  loadingState: ProgressiveLoadingState;
  loadMore: () => void;
  refresh: () => void;
  loadDateRange: (start: Date, end: Date) => Promise<void>;
}

export function useProgressiveLoading({
  businessId,
  initialDate,
  view,
  chunkSize = 7, // days
  preloadChunks = 2,
  maxConcurrentLoads = 3,
}: UseProgressiveLoadingOptions): UseProgressiveLoadingReturn {
  const [appointments, setAppointments] = useState<DashboardAppointment[]>([]);
  const [loadingState, setLoadingState] = useState<ProgressiveLoadingState>({
    isLoading: true,
    isLoadingMore: false,
    hasMore: true,
    error: null,
    progress: 0,
  });

  const cache = useAppointmentCache();
  const loadingChunks = useRef<LoadingChunk[]>([]);
  const activeLoads = useRef<Set<string>>(new Set());
  const loadedRanges = useRef<Set<string>>(new Set());

  /**
   * Generate date chunks for progressive loading
   */
  const generateChunks = useCallback(
    (centerDate: Date, totalChunks: number): LoadingChunk[] => {
      const chunks: LoadingChunk[] = [];
      const chunkDays = chunkSize;

      for (
        let i = -Math.floor(totalChunks / 2);
        i <= Math.floor(totalChunks / 2);
        i++
      ) {
        const start = new Date(centerDate);
        start.setDate(start.getDate() + i * chunkDays);
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setDate(end.getDate() + chunkDays - 1);
        end.setHours(23, 59, 59, 999);

        chunks.push({
          dateRange: { start, end },
          priority: Math.abs(i), // Center chunks have higher priority (lower number)
          loaded: false,
        });
      }

      return chunks.sort((a, b) => a.priority - b.priority);
    },
    [chunkSize]
  );

  /**
   * Load appointments for a specific date range
   */
  const loadAppointmentsForRange = useCallback(
    async (start: Date, end: Date): Promise<DashboardAppointment[]> => {
      const cacheKey = {
        businessId,
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      };

      // Check cache first
      const cached = cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Simulate API call (replace with actual API call)
      const response = await fetch(
        `/api/appointments?businessId=${businessId}&start=${start.toISOString()}&end=${end.toISOString()}`
      );

      if (!response.ok) {
        throw new Error(`Failed to load appointments: ${response.statusText}`);
      }

      const data = await response.json();
      const appointmentData = data.appointments || [];

      // Cache the results
      cache.set(cacheKey, appointmentData);

      return appointmentData;
    },
    [businessId, cache]
  );

  /**
   * Load a single chunk
   */
  const loadChunk = useCallback(
    async (chunk: LoadingChunk): Promise<void> => {
      const rangeKey = `${chunk.dateRange.start.getTime()}-${chunk.dateRange.end.getTime()}`;

      if (
        activeLoads.current.has(rangeKey) ||
        loadedRanges.current.has(rangeKey)
      ) {
        return;
      }

      activeLoads.current.add(rangeKey);

      try {
        const chunkAppointments = await loadAppointmentsForRange(
          chunk.dateRange.start,
          chunk.dateRange.end
        );

        setAppointments(prev => {
          // Merge new appointments, avoiding duplicates
          const existingIds = new Set(prev.map(apt => apt.id));
          const newAppointments = chunkAppointments.filter(
            apt => !existingIds.has(apt.id)
          );

          return [...prev, ...newAppointments].sort(
            (a, b) => a.startTime.getTime() - b.startTime.getTime()
          );
        });

        chunk.loaded = true;
        loadedRanges.current.add(rangeKey);
      } catch (error) {
        setLoadingState(prev => ({
          ...prev,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to load appointments',
        }));
      } finally {
        activeLoads.current.delete(rangeKey);
      }
    },
    [loadAppointmentsForRange]
  );

  /**
   * Load multiple chunks with concurrency control
   */
  const loadChunks = useCallback(
    async (chunks: LoadingChunk[]): Promise<void> => {
      const unloadedChunks = chunks.filter(chunk => !chunk.loaded);

      if (unloadedChunks.length === 0) {
        return;
      }

      setLoadingState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
        progress: 0,
      }));

      let completed = 0;
      const total = unloadedChunks.length;

      // Load chunks in batches to respect concurrency limit
      for (let i = 0; i < unloadedChunks.length; i += maxConcurrentLoads) {
        const batch = unloadedChunks.slice(i, i + maxConcurrentLoads);

        await Promise.all(
          batch.map(async chunk => {
            await loadChunk(chunk);
            completed++;

            setLoadingState(prev => ({
              ...prev,
              progress: (completed / total) * 100,
            }));
          })
        );
      }

      setLoadingState(prev => ({
        ...prev,
        isLoading: false,
        progress: 100,
      }));
    },
    [loadChunk, maxConcurrentLoads]
  );

  /**
   * Initialize loading for current view
   */
  const initializeLoading = useCallback(async () => {
    const totalChunks = preloadChunks * 2 + 1; // Center chunk + preload chunks on each side
    const chunks = generateChunks(initialDate, totalChunks);

    loadingChunks.current = chunks;
    await loadChunks(chunks);
  }, [initialDate, preloadChunks, generateChunks, loadChunks]);

  /**
   * Load more data (for infinite scrolling)
   */
  const loadMore = useCallback(async () => {
    if (loadingState.isLoadingMore || !loadingState.hasMore) {
      return;
    }

    setLoadingState(prev => ({ ...prev, isLoadingMore: true }));

    try {
      // Generate additional chunks
      const currentChunks = loadingChunks.current.length;
      const additionalChunks = generateChunks(initialDate, currentChunks + 4);
      const newChunks = additionalChunks.slice(currentChunks);

      loadingChunks.current = [...loadingChunks.current, ...newChunks];
      await loadChunks(newChunks);
    } catch (error) {
      setLoadingState(prev => ({
        ...prev,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load more appointments',
      }));
    } finally {
      setLoadingState(prev => ({ ...prev, isLoadingMore: false }));
    }
  }, [
    loadingState.isLoadingMore,
    loadingState.hasMore,
    initialDate,
    generateChunks,
    loadChunks,
  ]);

  /**
   * Refresh all data
   */
  const refresh = useCallback(async () => {
    // Clear cache and loaded ranges
    cache.invalidateForBusiness(businessId);
    loadedRanges.current.clear();
    activeLoads.current.clear();

    // Reset appointments
    setAppointments([]);

    // Mark all chunks as unloaded
    loadingChunks.current.forEach(chunk => {
      chunk.loaded = false;
    });

    // Reload
    await initializeLoading();
  }, [businessId, cache, initializeLoading]);

  /**
   * Load specific date range
   */
  const loadDateRange = useCallback(
    async (start: Date, end: Date): Promise<void> => {
      try {
        const appointments = await loadAppointmentsForRange(start, end);

        setAppointments(prev => {
          // Replace appointments in the date range
          const filtered = prev.filter(
            apt => apt.startTime < start || apt.startTime > end
          );

          return [...filtered, ...appointments].sort(
            (a, b) => a.startTime.getTime() - b.startTime.getTime()
          );
        });
      } catch (error) {
        setLoadingState(prev => ({
          ...prev,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to load date range',
        }));
      }
    },
    [loadAppointmentsForRange]
  );

  // Initialize loading on mount
  useEffect(() => {
    initializeLoading();
  }, [initializeLoading]);

  // Update loading when view or date changes
  useEffect(() => {
    const newChunks = generateChunks(initialDate, preloadChunks * 2 + 1);
    const unloadedChunks = newChunks.filter(
      newChunk =>
        !loadingChunks.current.some(
          existingChunk =>
            existingChunk.dateRange.start.getTime() ===
            newChunk.dateRange.start.getTime()
        )
    );

    if (unloadedChunks.length > 0) {
      loadingChunks.current = [...loadingChunks.current, ...unloadedChunks];
      loadChunks(unloadedChunks);
    }
  }, [initialDate, view, preloadChunks, generateChunks, loadChunks]);

  return {
    appointments,
    loadingState,
    loadMore,
    refresh,
    loadDateRange,
  };
}

/**
 * Hook for skeleton loading states
 */
export function useSkeletonLoading(isLoading: boolean, itemCount: number = 10) {
  const skeletonItems = Array.from({ length: itemCount }, (_, index) => ({
    id: `skeleton-${index}`,
    height: Math.random() * 40 + 60, // Random height between 60-100px
    width: Math.random() * 20 + 80, // Random width between 80-100%
  }));

  return {
    showSkeleton: isLoading,
    skeletonItems,
  };
}

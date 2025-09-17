'use client';

import { DashboardMetrics } from '@/app/api/dashboard/metrics/route';
import { useQuery } from '@tanstack/react-query';

interface UseDashboardDataOptions {
  businessId: string;
  refreshInterval?: number;
  enabled?: boolean;
}

export function useDashboardData({
  businessId,
  refreshInterval = 30000, // 30 seconds
  enabled = true,
}: UseDashboardDataOptions) {
  return useQuery({
    queryKey: ['dashboard-metrics', businessId],
    queryFn: async (): Promise<DashboardMetrics> => {
      const response = await fetch(
        `/api/dashboard/metrics?businessId=${businessId}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard metrics');
      }

      const data = await response.json();
      return data.metrics;
    },
    refetchInterval: refreshInterval,
    staleTime: 15000, // Consider data stale after 15 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
    enabled,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// Hook for real-time dashboard updates
export function useRealtimeDashboard(businessId: string) {
  return useDashboardData({
    businessId,
    refreshInterval: 10000, // 10 seconds for real-time feel
  });
}

// Hook for dashboard data with manual refresh
export function useDashboardDataManual(businessId: string) {
  return useDashboardData({
    businessId,
    refreshInterval: undefined, // No automatic refresh
  });
}

// Hook for dashboard charts data
export function useDashboardCharts(businessId: string, period: string = 'weekly') {
  return useQuery({
    queryKey: ['dashboard-charts', businessId, period],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/charts?businessId=${businessId}&period=${period}`);

      if (!response.ok) {
        throw new Error('Failed to fetch chart data');
      }

      const data = await response.json();
      return data.charts;
    },
    staleTime: 60000, // Consider data stale after 1 minute
    gcTime: 300000, // Keep in cache for 5 minutes
    retry: 2,
  });
}

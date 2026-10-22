'use client';

import { useQuery } from '@tanstack/react-query';

// Hook for dashboard charts data
export function useDashboardCharts(
  businessId: string,
  period: string = 'weekly'
) {
  return useQuery({
    queryKey: ['dashboard-charts', businessId, period],
    queryFn: async () => {
      const response = await fetch(
        `/api/dashboard/charts?businessId=${businessId}&period=${period}`
      );

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

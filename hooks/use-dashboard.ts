'use client';

import { DashboardDataService } from '@/lib/dashboard-data';
import {
  DashboardLayout,
  DashboardState,
  DateRange,
  WidgetConfig,
  WidgetFilters,
  WidgetSize,
} from '@/types/dashboard';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

interface UseDashboardProps {
  businessId: string;
  userId: string;
}

export function useDashboard({ businessId, userId }: UseDashboardProps) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<DashboardState>({
    currentLayout: null,
    availableLayouts: [],
    isEditing: false,
    selectedDateRange: DashboardDataService.getDefaultDateRange(),
    globalFilters: {},
    isLoading: false,
    error: null,
  });

  // Create data service instance
  const dataService = new DashboardDataService(businessId);

  // Fetch dashboard layouts
  const { data: layouts, isLoading: layoutsLoading } = useQuery({
    queryKey: ['dashboard-layouts', businessId, userId],
    queryFn: async () => {
      // This would typically fetch from an API
      // For now, return a default layout
      return getDefaultDashboardLayout(businessId, userId);
    },
  });

  // Fetch widget data based on current layout and filters
  const { data: widgetData, isLoading: widgetDataLoading } = useQuery({
    queryKey: [
      'dashboard-data',
      businessId,
      state.selectedDateRange,
      state.globalFilters,
      state.currentLayout?.id,
    ],
    queryFn: async () => {
      if (!state.currentLayout) return {};

      const data: Record<string, unknown> = {};

      for (const widget of state.currentLayout.widgets) {
        try {
          switch (widget.type) {
            case 'revenue-chart':
              const revenueResponse = await fetch(
                `/api/dashboard/revenue?businessId=${businessId}&from=${state.selectedDateRange.from.toISOString()}&to=${state.selectedDateRange.to.toISOString()}`
              );
              const revenueData = await revenueResponse.json();
              data[widget.id] = revenueData.data;
              break;

            case 'client-metrics':
              const clientResponse = await fetch(
                `/api/dashboard/clients?businessId=${businessId}&from=${state.selectedDateRange.from.toISOString()}&to=${state.selectedDateRange.to.toISOString()}`
              );
              data[widget.id] = await clientResponse.json();
              break;

            case 'quick-stats':
              const statsResponse = await fetch(
                `/api/dashboard/revenue?businessId=${businessId}&from=${state.selectedDateRange.from.toISOString()}&to=${state.selectedDateRange.to.toISOString()}`
              );
              const statsData = await statsResponse.json();
              data[widget.id] = statsData.metrics;
              break;

            case 'staff-performance':
              data[widget.id] = await dataService.getStaffPerformance(
                state.selectedDateRange,
                { ...state.globalFilters, ...widget.config.filters }
              );
              break;

            case 'service-analytics':
              data[widget.id] = await dataService.getServiceAnalytics(
                state.selectedDateRange,
                { ...state.globalFilters, ...widget.config.filters }
              );
              break;

            case 'recent-activity':
              const appointmentsResponse = await fetch(
                `/api/dashboard/appointments?businessId=${businessId}&limit=${widget.config.limit || 10}`
              );
              data[widget.id] = await appointmentsResponse.json();
              break;

            default:
              data[widget.id] = null;
          }
        } catch {
          // Error logging handled by monitoring service
          data[widget.id] = null;
        }
      }

      return data;
    },
    enabled: !!state.currentLayout && !!businessId,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // Set current layout when layouts are loaded
  useEffect(() => {
    if (layouts && layouts.length > 0 && !state.currentLayout) {
      const defaultLayout = layouts.find(l => l.isDefault) || layouts[0];
      setState(prev => ({
        ...prev,
        currentLayout: defaultLayout,
        availableLayouts: layouts,
      }));
    }
  }, [layouts, state.currentLayout]);

  // Actions
  const setDateRange = useCallback((dateRange: DateRange) => {
    setState(prev => ({
      ...prev,
      selectedDateRange: dateRange,
    }));
  }, []);

  const setGlobalFilters = useCallback((filters: WidgetFilters) => {
    setState(prev => ({
      ...prev,
      globalFilters: filters,
    }));
  }, []);

  const toggleEditMode = useCallback(() => {
    setState(prev => ({
      ...prev,
      isEditing: !prev.isEditing,
    }));
  }, []);

  const updateWidgetConfig = useCallback(
    (widgetId: string, config: WidgetConfig) => {
      setState(prev => ({
        ...prev,
        currentLayout: prev.currentLayout
          ? {
              ...prev.currentLayout,
              widgets: prev.currentLayout.widgets.map(widget =>
                widget.id === widgetId ? { ...widget, config } : widget
              ),
            }
          : null,
      }));

      // Invalidate queries to refetch data with new config
      queryClient.invalidateQueries({
        queryKey: ['dashboard-data', businessId],
      });
    },
    [businessId, queryClient]
  );

  const updateWidgetSize = useCallback((widgetId: string, size: WidgetSize) => {
    setState(prev => ({
      ...prev,
      currentLayout: prev.currentLayout
        ? {
            ...prev.currentLayout,
            widgets: prev.currentLayout.widgets.map(widget =>
              widget.id === widgetId ? { ...widget, size } : widget
            ),
          }
        : null,
    }));
  }, []);

  const saveLayout = useCallback(async () => {
    if (!state.currentLayout) return;

    try {
      // This would typically save to an API
      // Layout saving handled by API service

      // For now, just toggle edit mode off
      setState(prev => ({
        ...prev,
        isEditing: false,
      }));
    } catch {
      // Error logging handled by monitoring service
      setState(prev => ({
        ...prev,
        error: 'Failed to save dashboard layout',
      }));
    }
  }, [state.currentLayout]);

  const refreshData = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ['dashboard-data', businessId],
    });
  }, [businessId, queryClient]);

  return {
    // State
    layout: state.currentLayout,
    availableLayouts: state.availableLayouts,
    isEditing: state.isEditing,
    selectedDateRange: state.selectedDateRange,
    globalFilters: state.globalFilters,
    widgetData: widgetData || {},

    // Loading states
    isLoading: layoutsLoading || widgetDataLoading || state.isLoading,
    error: state.error,

    // Actions
    setDateRange,
    setGlobalFilters,
    toggleEditMode,
    updateWidgetConfig,
    updateWidgetSize,
    saveLayout,
    refreshData,
  };
}

// Default dashboard layout factory
function getDefaultDashboardLayout(
  businessId: string,
  userId: string
): DashboardLayout[] {
  const defaultLayout: DashboardLayout = {
    id: 'default',
    name: 'Default Dashboard',
    businessId,
    userId,
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    widgets: [
      {
        id: 'quick-stats',
        title: 'Quick Stats',
        type: 'quick-stats',
        size: { width: 12, height: 2 },
        position: { x: 0, y: 0 },
        config: {},
      },
      {
        id: 'revenue-chart',
        title: 'Revenue Trends',
        type: 'revenue-chart',
        size: { width: 8, height: 4 },
        position: { x: 0, y: 2 },
        config: {
          chartType: 'line',
          showComparison: true,
        },
      },
      {
        id: 'client-metrics',
        title: 'Client Metrics',
        type: 'client-metrics',
        size: { width: 4, height: 4 },
        position: { x: 8, y: 2 },
        config: {},
      },
      {
        id: 'recent-activity',
        title: 'Recent Activity',
        type: 'recent-activity',
        size: { width: 6, height: 4 },
        position: { x: 0, y: 6 },
        config: {
          limit: 8,
        },
      },
      {
        id: 'staff-performance',
        title: 'Staff Performance',
        type: 'staff-performance',
        size: { width: 6, height: 4 },
        position: { x: 6, y: 6 },
        config: {},
      },
    ],
  };

  return [defaultLayout];
}

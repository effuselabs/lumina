'use client';

import { useDashboard } from '@/hooks/use-dashboard';
import { cn } from '@/lib/utils';
import {
  AppointmentSummary,
  ClientMetrics,
  DashboardWidget,
  RevenueData,
  RevenueMetrics,
  WidgetConfig,
} from '@/types/dashboard';
import { useState } from 'react';
import { Layout, Responsive, WidthProvider } from 'react-grid-layout';

// Widget Components
import { WidgetSkeleton } from './widget-base';
import { ClientMetricsWidget } from './widgets/client-metrics-widget';
import { QuickStatsWidget } from './widgets/quick-stats-widget';
import { RecentActivityWidget } from './widgets/recent-activity-widget';
import { RevenueChartWidget } from './widgets/revenue-chart-widget';

// Import CSS for react-grid-layout
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardLayoutProps {
  businessId: string;
  userId: string;
  className?: string;
}

export function DashboardLayout({
  businessId,
  userId,
  className,
}: DashboardLayoutProps) {
  const {
    layout,
    isEditing,
    widgetData,
    isLoading,
    error,
    updateWidgetConfig,
    updateWidgetSize,
  } = useDashboard({ businessId, userId });

  const [layouts, setLayouts] = useState<{ [key: string]: Layout[] }>({});

  // Convert dashboard widgets to grid layout format (for future use)
  // const gridLayouts = layout?.widgets.map(widget => ({
  //     i: widget.id,
  //     x: widget.position.x,
  //     y: widget.position.y,
  //     w: widget.size.width,
  //     h: widget.size.height,
  //     minW: widget.size.minWidth || 2,
  //     minH: widget.size.minHeight || 2,
  //     maxW: widget.size.maxWidth || 12,
  //     maxH: widget.size.maxHeight || 8,
  // })) || [];

  const handleLayoutChange = (
    currentLayout: Layout[],
    allLayouts: { [key: string]: Layout[] }
  ) => {
    if (!isEditing) return;

    setLayouts(allLayouts);

    // Update widget positions and sizes
    currentLayout.forEach(layoutItem => {
      const widget = layout?.widgets.find(w => w.id === layoutItem.i);
      if (widget) {
        updateWidgetSize(widget.id, {
          width: layoutItem.w,
          height: layoutItem.h,
        });
      }
    });
  };

  const renderWidget = (widget: DashboardWidget) => {
    const data = widgetData[widget.id];
    const widgetIsLoading = isLoading && !data;
    const widgetError = error;

    const commonProps = {
      widget,
      data,
      isLoading: widgetIsLoading,
      error: widgetError || undefined,
      onConfigChange: (config: WidgetConfig) =>
        updateWidgetConfig(widget.id, config),
      businessId,
    };

    switch (widget.type) {
      case 'quick-stats':
        return (
          <QuickStatsWidget {...commonProps} data={data as RevenueMetrics} />
        );

      case 'revenue-chart':
        return (
          <RevenueChartWidget {...commonProps} data={data as RevenueData[]} />
        );

      case 'client-metrics':
        return (
          <ClientMetricsWidget {...commonProps} data={data as ClientMetrics} />
        );

      case 'recent-activity':
        return (
          <RecentActivityWidget
            {...commonProps}
            data={data as AppointmentSummary[]}
          />
        );

      default:
        return (
          <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-gray-500">
            <p className="text-sm">
              Widget type &quot;{widget.type}&quot; not implemented
            </p>
          </div>
        );
    }
  };

  if (!layout) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <WidgetSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <WidgetSkeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        onLayoutChange={handleLayoutChange}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={60}
        isDraggable={isEditing}
        isResizable={isEditing}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        useCSSTransforms={true}
        preventCollision={false}
        compactType="vertical"
      >
        {layout.widgets.map(widget => (
          <div key={widget.id} className="widget-container">
            {renderWidget(widget)}
          </div>
        ))}
      </ResponsiveGridLayout>

      {/* Custom CSS for grid layout */}
      <style jsx global>{`
        .react-grid-layout {
          position: relative;
        }

        .react-grid-item {
          transition: all 200ms ease;
          transition-property: left, top;
        }

        .react-grid-item.cssTransforms {
          transition-property: transform;
        }

        .react-grid-item > .react-resizable-handle {
          position: absolute;
          width: 20px;
          height: 20px;
          bottom: 0;
          right: 0;
          background: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNiIgaGVpZ2h0PSI2IiB2aWV3Qm94PSIwIDAgNiA2IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8ZG90cyBmaWxsPSIjOTk5IiBkPSJtMTUgMTJjMCAuNTUyLS40NDggMS0xIDFzLTEtLjQ0OC0xLTEgLjQ0OC0xIDEtMSAxIC40NDggMSAxem0wIDRjMCAuNTUyLS40NDggMS0xIDFzLTEtLjQ0OC0xLTEgLjQ0OC0xIDEtMSAxIC40NDggMSAxem0wIDRjMCAuNTUyLS40NDggMS0xIDFzLTEtLjQ0OC0xLTEgLjQ0OC0xIDEtMSAxIC40NDggMSAxem0tNS00YzAtLjU1Mi40NDgtMSAxLTFzMSAuNDQ4IDEgMS0uNDQ4IDEtMSAxLTEtLjQ0OC0xLTF6bTAgNGMwLS41NTIuNDQ4LTEgMS0xczEgLjQ0OCAxIDEtLjQ0OCAxLTEgMS0xLS40NDgtMS0xem0wLThjMC0uNTUyLjQ0OC0xIDEtMXMxIC40NDggMSAxLS40NDggMS0xIDEtMS0uNDQ4LTEtMXptNC00YzAtLjU1Mi40NDgtMSAxLTFzMSAuNDQ4IDEgMS0uNDQ4IDEtMSAxLTEtLjQ0OC0xLTF6bTAgNGMwLS41NTIuNDQ4LTEgMS0xczEgLjQ0OCAxIDEtLjQ0OCAxLTEgMS0xLS40NDgtMS0xeiIvPgo8L3N2Zz4K');
          background-position: bottom right;
          padding: 0 3px 3px 0;
          background-repeat: no-repeat;
          background-origin: content-box;
          box-sizing: border-box;
          cursor: se-resize;
        }

        .react-grid-item.react-grid-placeholder {
          background: #ffd25a;
          opacity: 0.2;
          transition-duration: 100ms;
          z-index: 2;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          -o-user-select: none;
          user-select: none;
        }

        .widget-container {
          height: 100%;
          width: 100%;
        }

        .widget-container > * {
          height: 100%;
        }
      `}</style>
    </div>
  );
}

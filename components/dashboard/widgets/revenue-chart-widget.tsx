'use client';

import { RevenueChart } from '@/components/charts/revenue-chart';
import { Button } from '@/components/ui/button';
import { RevenueData, WidgetComponentProps } from '@/types/dashboard';
import { BarChart3, TrendingUp } from 'lucide-react';
import { WidgetBase } from '../widget-base';

type RevenueChartWidgetProps = WidgetComponentProps<RevenueData[]>;

export function RevenueChartWidget({
  widget,
  data,
  isLoading,
  error,
  onConfigChange,
  businessId: _businessId,
}: RevenueChartWidgetProps) {
  const chartType = widget.config.chartType || 'line';
  const showComparison = widget.config.showComparison || false;

  const toggleChartType = () => {
    const newType = chartType === 'line' ? 'area' : 'line';
    onConfigChange?.({
      ...widget.config,
      chartType: newType,
    });
  };

  const toggleComparison = () => {
    onConfigChange?.({
      ...widget.config,
      showComparison: !showComparison,
    });
  };

  const totalRevenue = data?.reduce((sum, item) => sum + item.revenue, 0) || 0;
  const averageRevenue = data?.length ? totalRevenue / data.length : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <WidgetBase
      widget={widget}
      isLoading={isLoading}
      error={error}
      onConfigChange={onConfigChange}
    >
      <div className="space-y-4">
        {/* Chart Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Total: </span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(totalRevenue)}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">Avg: </span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(averageRevenue)}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleChartType}
              className="h-8 px-3"
            >
              <BarChart3 className="mr-1 h-3 w-3" />
              {chartType === 'line' ? 'Area' : 'Line'}
            </Button>

            <Button
              variant={showComparison ? 'primary' : 'outline'}
              size="sm"
              onClick={toggleComparison}
              className="h-8 px-3"
            >
              <TrendingUp className="mr-1 h-3 w-3" />
              Compare
            </Button>
          </div>
        </div>

        {/* Chart */}
        <div className="h-64">
          {data && data.length > 0 ? (
            <RevenueChart
              data={data}
              type={chartType as 'line' | 'area'}
              showComparison={showComparison}
              height={256}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-500">
              <div className="text-center">
                <BarChart3 className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                <p className="text-sm">No revenue data available</p>
                <p className="text-xs text-gray-400">
                  Complete some appointments to see revenue trends
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        {showComparison && data && data.length > 0 && (
          <div className="flex items-center justify-center space-x-6 text-xs">
            <div className="flex items-center space-x-2">
              <div className="h-3 w-3 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500" />
              <span className="text-gray-600">Total Revenue</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-3 w-3 rounded-full bg-gradient-to-r from-orange-400 to-red-500" />
              <span className="text-gray-600">Commission Earnings</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-3 w-3 rounded-full bg-gray-800" />
              <span className="text-gray-600">Business Retention</span>
            </div>
          </div>
        )}
      </div>
    </WidgetBase>
  );
}

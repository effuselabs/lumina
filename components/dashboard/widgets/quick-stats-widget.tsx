'use client';

import { cn } from '@/lib/utils';
import { RevenueMetrics, WidgetComponentProps } from '@/types/dashboard';
import {
  Calendar,
  DollarSign,
  Percent,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { WidgetBase } from '../widget-base';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface QuickStatsWidgetProps extends WidgetComponentProps<RevenueMetrics> {}

export function QuickStatsWidget({
  widget,
  data,
  isLoading,
  error,
  onConfigChange,
  businessId: _businessId,
}: QuickStatsWidgetProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const stats = [
    {
      id: 'revenue',
      title: 'Total Revenue',
      value: data?.totalRevenue || 0,
      change: data?.revenueGrowth || 0,
      icon: DollarSign,
      format: 'currency',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      id: 'appointments',
      title: 'Appointments',
      value: data?.appointmentCount || 0,
      change: data?.appointmentGrowth || 0,
      icon: Calendar,
      format: 'number',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      id: 'averageTicket',
      title: 'Avg. Ticket',
      value: data?.averageTicket || 0,
      change: data?.ticketGrowth || 0,
      icon: DollarSign,
      format: 'currency',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      id: 'conversion',
      title: 'Conversion Rate',
      value: data?.conversionRate || 0,
      change: 0, // Placeholder
      icon: Percent,
      format: 'percentage',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  const formatValue = (value: number, format: string) => {
    switch (format) {
      case 'currency':
        return formatCurrency(value);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      default:
        return value.toLocaleString();
    }
  };

  return (
    <WidgetBase
      widget={widget}
      isLoading={isLoading}
      error={error}
      onConfigChange={onConfigChange}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(stat => {
          const Icon = stat.icon;
          const isPositive = stat.change >= 0;
          const TrendIcon = isPositive ? TrendingUp : TrendingDown;

          return (
            <div key={stat.id} className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className={cn('rounded-lg p-2', stat.bgColor)}>
                  <Icon className={cn('h-4 w-4', stat.color)} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-gray-500">
                    {stat.title}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-lg font-bold text-gray-900">
                  {formatValue(stat.value, stat.format)}
                </p>

                {stat.change !== 0 && (
                  <div className="flex items-center space-x-1">
                    <TrendIcon
                      className={cn(
                        'h-3 w-3',
                        isPositive ? 'text-green-500' : 'text-red-500'
                      )}
                    />
                    <span
                      className={cn(
                        'text-xs font-medium',
                        isPositive ? 'text-green-600' : 'text-red-600'
                      )}
                    >
                      {formatPercentage(stat.change)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </WidgetBase>
  );
}

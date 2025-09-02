'use client';

import { cn } from '@/lib/utils';
import { ClientMetrics, WidgetComponentProps } from '@/types/dashboard';
import {
  Crown,
  DollarSign,
  Repeat,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';
import { WidgetBase } from '../widget-base';

type ClientMetricsWidgetProps = WidgetComponentProps<ClientMetrics>;

export function ClientMetricsWidget({
  widget,
  data,
  isLoading,
  error,
  onConfigChange,
  businessId: _businessId,
}: ClientMetricsWidgetProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const metrics = [
    {
      id: 'total',
      title: 'Total Clients',
      value: data?.totalClients || 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      format: 'number',
    },
    {
      id: 'new',
      title: 'New Clients',
      value: data?.newClients || 0,
      icon: UserPlus,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      format: 'number',
    },
    {
      id: 'returning',
      title: 'Returning',
      value: data?.returningClients || 0,
      icon: Repeat,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      format: 'number',
    },
    {
      id: 'retention',
      title: 'Retention Rate',
      value: data?.clientRetentionRate || 0,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      format: 'percentage',
    },
  ];

  const formatValue = (value: number, format: string) => {
    switch (format) {
      case 'currency':
        return formatCurrency(value);
      case 'percentage':
        return formatPercentage(value);
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
      <div className="space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          {metrics.map(metric => {
            const Icon = metric.icon;

            return (
              <div key={metric.id} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className={cn('rounded-lg p-2', metric.bgColor)}>
                    <Icon className={cn('h-4 w-4', metric.color)} />
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-lg font-bold text-gray-900">
                    {formatValue(metric.value, metric.format)}
                  </p>
                  <p className="text-xs font-medium text-gray-500">
                    {metric.title}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Lifetime Value */}
        <div className="border-t pt-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="flex items-center text-sm font-medium text-gray-900">
              <DollarSign className="mr-1 h-4 w-4 text-green-600" />
              Average Lifetime Value
            </h4>
            <span className="text-lg font-bold text-green-600">
              {formatCurrency(data?.averageLifetimeValue || 0)}
            </span>
          </div>

          <div className="text-xs text-gray-500">
            <span className="font-medium">Growth Rate: </span>
            <span className="font-medium text-green-600">
              +{formatPercentage(data?.clientGrowthRate || 0)}
            </span>
          </div>
        </div>

        {/* Top Clients Preview */}
        {data?.topClients && data.topClients.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="mb-3 flex items-center text-sm font-medium text-gray-900">
              <Crown className="mr-1 h-4 w-4 text-yellow-600" />
              Top Clients
            </h4>

            <div className="space-y-2">
              {data.topClients.slice(0, 3).map((client, index) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2">
                    <div className="flex-shrink-0">
                      <div
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                          index === 0
                            ? 'bg-yellow-100 text-yellow-800'
                            : index === 1
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-orange-100 text-orange-800'
                        )}
                      >
                        {index + 1}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {client.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {client.appointmentCount} appointments
                      </p>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {formatCurrency(client.totalSpent)}
                  </div>
                </div>
              ))}
            </div>

            {data.topClients.length > 3 && (
              <div className="mt-3 text-center">
                <button className="text-xs font-medium text-lumina-coral hover:text-lumina-gold">
                  View all {data.topClients.length} clients
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </WidgetBase>
  );
}

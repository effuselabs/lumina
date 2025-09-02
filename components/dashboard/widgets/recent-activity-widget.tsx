'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AppointmentSummary, WidgetComponentProps } from '@/types/dashboard';
import { format, isToday, isTomorrow, isYesterday } from 'date-fns';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  User,
  XCircle,
} from 'lucide-react';
import { WidgetBase } from '../widget-base';

type RecentActivityWidgetProps = WidgetComponentProps<AppointmentSummary[]>;

export function RecentActivityWidget({
  widget,
  data,
  isLoading,
  error,
  onConfigChange,
  businessId: _businessId,
}: RecentActivityWidgetProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM dd');
  };

  const formatTime = (date: Date) => {
    return format(date, 'h:mm a');
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'no-show':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: {
        variant: 'default' as const,
        className: 'bg-green-100 text-green-800',
      },
      scheduled: {
        variant: 'secondary' as const,
        className: 'bg-blue-100 text-blue-800',
      },
      cancelled: {
        variant: 'destructive' as const,
        className: 'bg-red-100 text-red-800',
      },
      'no-show': {
        variant: 'outline' as const,
        className: 'bg-orange-100 text-orange-800',
      },
    };

    const config =
      statusConfig[status.toLowerCase() as keyof typeof statusConfig] ||
      statusConfig.scheduled;

    return (
      <Badge
        variant={config.variant}
        className={cn('text-xs', config.className)}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <WidgetBase
      widget={widget}
      isLoading={isLoading}
      error={error}
      onConfigChange={onConfigChange}
    >
      <div className="space-y-4">
        {data && data.length > 0 ? (
          <>
            {/* Activity List */}
            <div className="space-y-3">
              {data.map(appointment => (
                <div
                  key={appointment.id}
                  className="flex items-start space-x-3 rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50"
                >
                  {/* Status Icon */}
                  <div className="mt-0.5 flex-shrink-0">
                    {getStatusIcon(appointment.status)}
                  </div>

                  {/* Appointment Details */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {appointment.clientName}
                      </p>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(appointment.status)}
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(appointment.totalAmount)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(appointment.startTime)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatTime(appointment.startTime)} -{' '}
                          {formatTime(appointment.endTime)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span>{appointment.staffName}</span>
                      </div>
                    </div>

                    <p className="truncate text-xs text-gray-600">
                      {appointment.serviceName}
                    </p>

                    {appointment.notes && (
                      <p className="truncate text-xs italic text-gray-500">
                        &quot;{appointment.notes}&quot;
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Stats */}
            <div className="border-t pt-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-bold text-gray-900">
                    {data.length}
                  </p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-600">
                    {data.filter(apt => apt.status === 'completed').length}
                  </p>
                  <p className="text-xs text-gray-500">Completed</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(
                      data
                        .filter(apt => apt.status === 'completed')
                        .reduce((sum, apt) => sum + apt.totalAmount, 0)
                    )}
                  </p>
                  <p className="text-xs text-gray-500">Revenue</p>
                </div>
              </div>
            </div>

            {/* View All Link */}
            <div className="border-t pt-3 text-center">
              <button className="text-sm font-medium text-lumina-coral transition-colors hover:text-lumina-gold">
                View all appointments
              </button>
            </div>
          </>
        ) : (
          <div className="py-8 text-center">
            <Calendar className="mx-auto mb-3 h-8 w-8 text-gray-300" />
            <p className="mb-1 text-sm text-gray-500">No recent activity</p>
            <p className="text-xs text-gray-400">
              Appointments will appear here once they&apos;re booked
            </p>
          </div>
        )}
      </div>
    </WidgetBase>
  );
}

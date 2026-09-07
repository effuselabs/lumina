'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Service } from '@/hooks/useServices';
import { cn } from '@/lib/utils';
import {
  Clock,
  DollarSign,
  Edit,
  Eye,
  EyeOff,
  MoreVertical,
  Power,
  PowerOff,
  Trash2,
  Users,
} from 'lucide-react';

interface ServiceCardProps {
  service: Service;
  onEdit: (service: Service) => void;
  onToggleActive: (service: Service) => void;
  onToggleOnline: (service: Service) => void;
  onDelete: (service: Service) => void;
  className?: string;
}

export function ServiceCard({
  service,
  onEdit,
  onToggleActive,
  onToggleOnline,
  onDelete,
  className,
}: ServiceCardProps) {
  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  return (
    <div
      className={cn(
        'group relative rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md',
        !service.isActive && 'opacity-60',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <h3 className="truncate text-lg font-semibold text-gray-900">
              {service.name}
            </h3>
            <div className="flex gap-1">
              {!service.isActive && (
                <Badge variant="secondary" className="text-xs">
                  Inactive
                </Badge>
              )}
              {!service.isOnline && (
                <Badge variant="outline" className="text-xs">
                  Offline
                </Badge>
              )}
            </div>
          </div>

          {service.category && (
            <p className="mb-2 text-sm text-gray-500">{service.category}</p>
          )}

          {service.description && (
            <p className="mb-4 line-clamp-2 text-sm text-gray-600">
              {service.description}
            </p>
          )}
        </div>

        {/* Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onEdit(service)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Service
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => onToggleActive(service)}>
              {service.isActive ? (
                <>
                  <PowerOff className="mr-2 h-4 w-4" />
                  Deactivate
                </>
              ) : (
                <>
                  <Power className="mr-2 h-4 w-4" />
                  Activate
                </>
              )}
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => onToggleOnline(service)}>
              {service.isOnline ? (
                <>
                  <EyeOff className="mr-2 h-4 w-4" />
                  Hide from Online
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Show Online
                </>
              )}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => onDelete(service)}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Service
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Service Details */}
      <div className="mb-4 grid grid-cols-2 gap-4">
        <div className="flex items-center text-sm text-gray-600">
          <DollarSign className="mr-2 h-4 w-4 text-green-600" />
          <span className="font-medium">{formatPrice(service.price)}</span>
        </div>

        <div className="flex items-center text-sm text-gray-600">
          <Clock className="mr-2 h-4 w-4 text-blue-600" />
          <span>{formatDuration(service.duration)}</span>
        </div>
      </div>

      {/* Staff and Appointments Count */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center">
          <Users className="mr-1 h-4 w-4" />
          <span>
            {service.staff?.length || 0} staff member
            {service.staff?.length !== 1 ? 's' : ''}
          </span>
        </div>

        {service._count && (
          <span>
            {service._count.appointments} appointment
            {service._count.appointments !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Staff Avatars */}
      {service.staff && service.staff.length > 0 && (
        <div className="mt-3 flex items-center border-t border-gray-100 pt-3">
          <div className="flex -space-x-2">
            {service.staff.slice(0, 3).map(staffService => (
              <div
                key={staffService.staff.id}
                className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gradient-to-r from-orange-400 to-orange-500 text-xs font-medium text-white"
                title={staffService.staff.displayName}
              >
                {staffService.staff.displayName.charAt(0).toUpperCase()}
              </div>
            ))}
            {service.staff.length > 3 && (
              <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-xs font-medium text-gray-600">
                +{service.staff.length - 3}
              </div>
            )}
          </div>
          <span className="ml-2 text-xs text-gray-500">Available staff</span>
        </div>
      )}
    </div>
  );
}

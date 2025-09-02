'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { DateRange } from '@/types/dashboard';
import { format } from 'date-fns';
import {
  Calendar,
  Download,
  Edit3,
  Filter,
  Plus,
  RefreshCw,
  Save,
  Settings,
  X,
} from 'lucide-react';
import { useState } from 'react';

interface DashboardHeaderProps {
  businessName: string;
  userRole: string;
  userName: string;
  businessSlug: string;
  selectedDateRange?: DateRange;
  isEditing?: boolean;
  onDateRangeChange?: (range: DateRange) => void;
  onToggleEdit?: () => void;
  onSaveLayout?: () => void;
  onRefresh?: () => void;
  className?: string;
}

export function DashboardHeader({
  businessName,
  userRole,
  userName,
  businessSlug: _businessSlug,
  selectedDateRange,
  isEditing = false,
  onDateRangeChange,
  onToggleEdit,
  onSaveLayout,
  onRefresh,
  className,
}: DashboardHeaderProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatDateRange = (range?: DateRange) => {
    if (!range) return 'Last 30 days';

    const { from, to } = range;
    const fromStr = format(from, 'MMM dd');
    const toStr = format(to, 'MMM dd, yyyy');

    return `${fromStr} - ${toStr}`;
  };

  const quickDateRanges = [
    {
      label: 'Last 7 days',
      getValue: () => ({
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        to: new Date(),
      }),
    },
    {
      label: 'Last 30 days',
      getValue: () => ({
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: new Date(),
      }),
    },
    {
      label: 'Last 90 days',
      getValue: () => ({
        from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        to: new Date(),
      }),
    },
    {
      label: 'This month',
      getValue: () => {
        const now = new Date();
        return {
          from: new Date(now.getFullYear(), now.getMonth(), 1),
          to: now,
        };
      },
    },
    {
      label: 'Last month',
      getValue: () => {
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayOfLastMonth = new Date(
          now.getFullYear(),
          now.getMonth(),
          0
        );
        return {
          from: lastMonth,
          to: lastDayOfLastMonth,
        };
      },
    },
  ];

  return (
    <div className={cn('border-b border-gray-200 bg-white', className)}>
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Title and breadcrumb */}
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>{businessName}</span>
                <span>•</span>
                <span className="capitalize">{userRole}</span>
                <span>•</span>
                <span>Welcome back, {userName}</span>
              </div>
            </div>
          </div>

          {/* Right side - Controls */}
          <div className="flex items-center space-x-3">
            {/* Date Range Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9">
                  <Calendar className="mr-2 h-4 w-4" />
                  {formatDateRange(selectedDateRange)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {quickDateRanges.map(range => (
                  <DropdownMenuItem
                    key={range.label}
                    onClick={() => onDateRangeChange?.(range.getValue())}
                  >
                    {range.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Calendar className="mr-2 h-4 w-4" />
                  Custom range...
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Filters */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem>
                  <span>All Staff</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <span>All Services</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <span>All Employment Types</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Advanced Filters
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-9"
            >
              <RefreshCw
                className={cn('mr-2 h-4 w-4', isRefreshing && 'animate-spin')}
              />
              Refresh
            </Button>

            {/* Edit Mode Toggle */}
            {isEditing ? (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onToggleEdit}
                  className="h-9"
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={onSaveLayout}
                  className="h-9 bg-gradient-to-r from-lumina-gold to-lumina-coral text-white"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Layout
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleEdit}
                className="h-9"
              >
                <Edit3 className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}

            {/* More Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Widget
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="mr-2 h-4 w-4" />
                  Export Data
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Dashboard Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Edit Mode Banner */}
        {isEditing && (
          <div className="mt-4 rounded-lg border border-lumina-gold border-opacity-30 bg-lumina-gold bg-opacity-10 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Edit3 className="h-4 w-4 text-lumina-coral" />
                <span className="text-sm font-medium text-gray-900">
                  Edit Mode Active
                </span>
                <span className="text-sm text-gray-600">
                  Drag widgets to rearrange, resize by dragging corners
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { DashboardWidget, WidgetConfig } from '@/types/dashboard';
import {
  AlertCircle,
  Maximize2,
  MoreHorizontal,
  RefreshCw,
  Settings,
} from 'lucide-react';
import { ReactNode } from 'react';

interface WidgetBaseProps {
  widget: DashboardWidget;
  children: ReactNode;
  isLoading?: boolean;
  error?: string;
  isEditing?: boolean;
  onConfigChange?: (config: WidgetConfig) => void;
  onRefresh?: () => void;
  onRemove?: () => void;
  className?: string;
}

export function WidgetBase({
  widget,
  children,
  isLoading = false,
  error,
  isEditing = false,
  onConfigChange: _onConfigChange,
  onRefresh,
  onRemove,
  className,
}: WidgetBaseProps) {
  const handleRefresh = () => {
    onRefresh?.();
  };

  const handleConfigure = () => {
    // This would open a configuration modal
    // TODO: Implement widget configuration modal
  };

  const handleMaximize = () => {
    // This would open the widget in a modal or full-screen view
    // TODO: Implement widget maximization
  };

  const handleRemove = () => {
    onRemove?.();
  };

  return (
    <Card
      className={cn(
        'relative transition-all duration-200',
        isEditing && 'ring-2 ring-lumina-gold ring-opacity-50',
        error && 'border-red-200 bg-red-50',
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-900">
          {widget.title}
        </CardTitle>

        <div className="flex items-center space-x-1">
          {isLoading && (
            <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
          )}

          {error && <AlertCircle className="h-4 w-4 text-red-500" />}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-gray-100"
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Widget options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleMaximize}>
                <Maximize2 className="mr-2 h-4 w-4" />
                Expand
              </DropdownMenuItem>
              {isEditing && (
                <>
                  <DropdownMenuItem onClick={handleConfigure}>
                    <Settings className="mr-2 h-4 w-4" />
                    Configure
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleRemove}
                    className="text-red-600 focus:text-red-600"
                  >
                    Remove
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {error ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="mb-2 h-8 w-8 text-red-500" />
            <p className="mb-2 text-sm text-red-600">
              Failed to load widget data
            </p>
            <p className="mb-4 text-xs text-gray-500">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <RefreshCw className="mr-2 h-3 w-3" />
              Try Again
            </Button>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center space-y-2">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-lumina-gold" />
              <p className="text-xs text-gray-500">Loading...</p>
            </div>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

// Widget skeleton for loading states
export function WidgetSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('animate-pulse', className)}>
      <CardHeader className="pb-2">
        <div className="h-4 w-32 rounded bg-gray-200" />
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="h-4 w-full rounded bg-gray-200" />
          <div className="h-4 w-3/4 rounded bg-gray-200" />
          <div className="h-4 w-1/2 rounded bg-gray-200" />
        </div>
      </CardContent>
    </Card>
  );
}

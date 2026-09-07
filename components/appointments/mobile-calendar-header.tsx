'use client';

import { Button } from '@/components/ui/button';
import { useMobileDetection } from '@/hooks/use-mobile-detection';
import { useTouchGestures } from '@/hooks/use-touch-gestures';
import { cn } from '@/lib/utils';
import {
  CalendarHeaderProps,
  CalendarView,
} from '@/types/dashboard-appointments';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  Rows3,
  Square,
} from 'lucide-react';
import { useRef } from 'react';

/**
 * Mobile-optimized Calendar Header Component
 *
 * Provides touch-friendly navigation and view controls optimized for mobile devices.
 * Features swipe gestures for date navigation and responsive layout.
 *
 * Requirements: 6.1, 6.2, 6.4, 6.5
 */
export function MobileCalendarHeader({
  view,
  currentDate,
  onViewChange,
  onDateChange,
  onNavigate,
  onToday,
}: CalendarHeaderProps) {
  const { isMobile, isTablet, orientation } = useMobileDetection();
  const headerRef = useRef<HTMLDivElement>(null);

  // Touch gestures for date navigation
  const { attachToElement } = useTouchGestures({
    onSwipeLeft: () => onNavigate('next'),
    onSwipeRight: () => onNavigate('prev'),
    threshold: 50,
    preventScroll: false,
  });

  // Attach gestures to header
  const headerRefCallback = (element: HTMLDivElement | null) => {
    if (element && (isMobile || isTablet)) {
      attachToElement(element);
    }
  };

  const formatDateForView = (date: Date, currentView: CalendarView): string => {
    if (isMobile) {
      // Shorter format for mobile
      if (currentView === 'day') {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          weekday: 'short',
        });
      } else if (currentView === 'week') {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        return `${startOfWeek.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })} - ${endOfWeek.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })}`;
      } else {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
        });
      }
    } else {
      // Full format for tablet and desktop
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
      };

      if (currentView === 'day') {
        return date.toLocaleDateString('en-US', {
          ...options,
          day: 'numeric',
          weekday: 'long',
        });
      } else if (currentView === 'week') {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        return `${startOfWeek.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })} - ${endOfWeek.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}`;
      } else {
        return date.toLocaleDateString('en-US', options);
      }
    }
  };

  const getViewIcon = (viewType: CalendarView) => {
    switch (viewType) {
      case 'day':
        return <Rows3 className="h-4 w-4" />;
      case 'week':
        return <Grid3X3 className="h-4 w-4" />;
      case 'month':
        return <Square className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  if (isMobile) {
    return (
      <div
        ref={headerRefCallback}
        className="bg-color-background border-color-border flex flex-col space-y-3 border-b p-4"
      >
        {/* Top row: Date navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('prev')}
            className="h-10 w-10 touch-manipulation p-0"
            aria-label="Previous period"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="flex-1 text-center">
            <h2 className="text-color-secondary truncate text-lg font-semibold">
              {formatDateForView(currentDate, view)}
            </h2>
            <p className="text-color-foreground-muted text-xs">
              Swipe to navigate
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('next')}
            className="h-10 w-10 touch-manipulation p-0"
            aria-label="Next period"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Bottom row: View controls and Today button */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={onToday}
            className="touch-manipulation px-4"
          >
            Today
          </Button>

          <div className="border-color-border flex overflow-hidden rounded-lg border">
            {(['day', 'week', 'month'] as CalendarView[]).map(viewType => (
              <Button
                key={viewType}
                variant={view === viewType ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => onViewChange(viewType)}
                className={cn(
                  'border-color-border touch-manipulation rounded-none border-r px-3 py-2 last:border-r-0',
                  'flex min-w-[3rem] items-center justify-center'
                )}
                aria-label={`${viewType} view`}
              >
                {getViewIcon(viewType)}
                <span className="ml-1 text-xs capitalize">{viewType}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isTablet) {
    return (
      <div
        ref={headerRefCallback}
        className={cn(
          'bg-color-background border-color-border flex items-center justify-between border-b p-4',
          orientation === 'portrait' ? 'flex-col space-y-3' : 'flex-row'
        )}
      >
        {/* Date Navigation */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('prev')}
              className="h-9 w-9 touch-manipulation p-0"
              aria-label="Previous period"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onToday}
              className="touch-manipulation px-4"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('next')}
              className="h-9 w-9 touch-manipulation p-0"
              aria-label="Next period"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-color-secondary text-lg font-semibold">
            {formatDateForView(currentDate, view)}
          </div>
        </div>

        {/* View Controls */}
        <div className="border-color-border flex overflow-hidden rounded-lg border">
          {(['day', 'week', 'month'] as CalendarView[]).map(viewType => (
            <Button
              key={viewType}
              variant={view === viewType ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => onViewChange(viewType)}
              className={cn(
                'border-color-border touch-manipulation rounded-none border-r px-4 py-2 last:border-r-0',
                'flex min-w-[4rem] items-center justify-center'
              )}
              aria-label={`${viewType} view`}
            >
              {getViewIcon(viewType)}
              <span className="ml-2 capitalize">{viewType}</span>
            </Button>
          ))}
        </div>
      </div>
    );
  }

  // Desktop fallback - use original header
  return (
    <div className="flex flex-col space-y-4 p-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
      {/* Date Navigation */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('prev')}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onToday}
            className="px-3"
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('next')}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-color-secondary text-lg font-semibold">
          {formatDateForView(currentDate, view)}
        </div>
      </div>

      {/* View Controls */}
      <div className="flex items-center space-x-2">
        <div className="border-color-border flex overflow-hidden rounded-lg border">
          <Button
            variant={view === 'day' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('day')}
            className="border-color-border rounded-none border-r first:rounded-l-lg last:rounded-r-lg last:border-r-0"
          >
            Day
          </Button>
          <Button
            variant={view === 'week' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('week')}
            className="border-color-border rounded-none border-r first:rounded-l-lg last:rounded-r-lg last:border-r-0"
          >
            Week
          </Button>
          <Button
            variant={view === 'month' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('month')}
            className="border-color-border rounded-none border-r first:rounded-l-lg last:rounded-r-lg last:border-r-0"
          >
            Month
          </Button>
        </div>
      </div>
    </div>
  );
}

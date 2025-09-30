'use client';

import { Button } from '@/components/ui/button';
import { CalendarHeaderProps, CalendarView } from '@/types/dashboard-appointments';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * CalendarHeader Component
 * 
 * Provides date navigation and view controls for the calendar.
 * Includes previous/next navigation, today button, and view switching.
 * 
 * Requirements: 1.1, 1.6
 */
export function CalendarHeader({
    view,
    currentDate,
    onViewChange,
    onDateChange,
    onNavigate,
    onToday,
}: CalendarHeaderProps) {
    const formatDateForView = (date: Date, currentView: CalendarView): string => {
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
                day: 'numeric'
            })} - ${endOfWeek.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            })}`;
        } else {
            return date.toLocaleDateString('en-US', options);
        }
    };

    return (
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
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
                <div className="text-lg font-semibold text-color-secondary">
                    {formatDateForView(currentDate, view)}
                </div>
            </div>

            {/* View Controls */}
            <div className="flex items-center space-x-2">
                <div className="flex rounded-lg border border-color-border overflow-hidden">
                    <Button
                        variant={view === 'day' ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => onViewChange('day')}
                        className="rounded-none border-r border-color-border first:rounded-l-lg last:rounded-r-lg last:border-r-0"
                    >
                        Day
                    </Button>
                    <Button
                        variant={view === 'week' ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => onViewChange('week')}
                        className="rounded-none border-r border-color-border first:rounded-l-lg last:rounded-r-lg last:border-r-0"
                    >
                        Week
                    </Button>
                    <Button
                        variant={view === 'month' ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => onViewChange('month')}
                        className="rounded-none border-r border-color-border first:rounded-l-lg last:rounded-r-lg last:border-r-0"
                    >
                        Month
                    </Button>
                </div>
            </div>
        </div>
    );
}
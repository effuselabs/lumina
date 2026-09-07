'use client';

import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import type { DateRange as CalendarDateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from 'date-fns';
import { Calendar, X } from 'lucide-react';
import { useState } from 'react';

interface DateRange {
  start: Date;
  end: Date;
}

interface DateRangePickerProps {
  value?: DateRange;
  onChange: (dateRange?: DateRange) => void;
  className?: string;
}

interface QuickDateRange {
  label: string;
  getValue: () => DateRange;
}

export function DateRangePicker({
  value,
  onChange,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [tempRange, setTempRange] = useState<{ from?: Date; to?: Date }>({
    from: value?.start,
    to: value?.end,
  });

  // Quick date range options
  const quickRanges: QuickDateRange[] = [
    {
      label: 'Today',
      getValue: () => ({
        start: startOfDay(new Date()),
        end: endOfDay(new Date()),
      }),
    },
    {
      label: 'Yesterday',
      getValue: () => {
        const yesterday = subDays(new Date(), 1);
        return {
          start: startOfDay(yesterday),
          end: endOfDay(yesterday),
        };
      },
    },
    {
      label: 'This Week',
      getValue: () => ({
        start: startOfWeek(new Date(), { weekStartsOn: 1 }),
        end: endOfWeek(new Date(), { weekStartsOn: 1 }),
      }),
    },
    {
      label: 'Last Week',
      getValue: () => {
        const lastWeek = subDays(new Date(), 7);
        return {
          start: startOfWeek(lastWeek, { weekStartsOn: 1 }),
          end: endOfWeek(lastWeek, { weekStartsOn: 1 }),
        };
      },
    },
    {
      label: 'This Month',
      getValue: () => ({
        start: startOfMonth(new Date()),
        end: endOfMonth(new Date()),
      }),
    },
    {
      label: 'Last 7 Days',
      getValue: () => ({
        start: startOfDay(subDays(new Date(), 6)),
        end: endOfDay(new Date()),
      }),
    },
    {
      label: 'Last 30 Days',
      getValue: () => ({
        start: startOfDay(subDays(new Date(), 29)),
        end: endOfDay(new Date()),
      }),
    },
    {
      label: 'Next 7 Days',
      getValue: () => ({
        start: startOfDay(new Date()),
        end: endOfDay(addDays(new Date(), 6)),
      }),
    },
  ];

  // Apply quick range
  const applyQuickRange = (range: DateRange) => {
    setTempRange({ from: range.start, to: range.end });
    onChange(range);
    setOpen(false);
  };

  // Apply custom range
  const applyCustomRange = () => {
    if (tempRange.from && tempRange.to) {
      onChange({
        start: startOfDay(tempRange.from),
        end: endOfDay(tempRange.to),
      });
      setOpen(false);
    }
  };

  // Clear range
  const clearRange = () => {
    setTempRange({ from: undefined, to: undefined });
    onChange(undefined);
    setOpen(false);
  };

  // Handle calendar selection
  const handleCalendarSelect = (range: CalendarDateRange | undefined) => {
    if (!range) {
      setTempRange({ from: undefined, to: undefined });
      return;
    }

    const newTempRange: { from?: Date; to?: Date } = {
      from: range.from,
      to: range.to,
    };
    setTempRange(newTempRange);

    // Auto-apply if both dates are selected
    if (range.from && range.to) {
      onChange({
        start: startOfDay(range.from),
        end: endOfDay(range.to),
      });
      setOpen(false);
    }
  };

  // Format display text
  const getDisplayText = () => {
    if (!value) return 'Select date range';

    const { start, end } = value;
    const startStr = format(start, 'MMM d');
    const endStr = format(end, 'MMM d, yyyy');

    if (format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')) {
      return format(start, 'MMM d, yyyy');
    }

    if (start.getFullYear() === end.getFullYear()) {
      return `${startStr} - ${endStr}`;
    }

    return `${format(start, 'MMM d, yyyy')} - ${endStr}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {getDisplayText()}
          {value && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-4 w-4 p-0 hover:bg-transparent"
              onClick={e => {
                e.stopPropagation();
                clearRange();
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {/* Quick ranges */}
          <div className="space-y-1 border-r p-3">
            <div className="mb-2 text-sm font-medium">Quick ranges</div>
            {quickRanges.map(range => (
              <Button
                key={range.label}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm font-normal"
                onClick={() => applyQuickRange(range.getValue())}
              >
                {range.label}
              </Button>
            ))}
            <Separator className="my-2" />
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sm font-normal text-muted-foreground hover:text-foreground"
              onClick={clearRange}
            >
              <X className="mr-2 h-3 w-3" />
              Clear
            </Button>
          </div>

          {/* Calendar */}
          <div className="p-3">
            <CalendarComponent
              mode="range"
              selected={tempRange as CalendarDateRange}
              onSelect={handleCalendarSelect}
              numberOfMonths={2}
              className="rounded-md border-0"
            />
            {tempRange.from && tempRange.to && (
              <div className="mt-3 flex justify-end border-t pt-3">
                <Button size="sm" onClick={applyCustomRange}>
                  Apply
                </Button>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

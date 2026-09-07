'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { AlertTriangle, CalendarIcon, Clock, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BookingAnalyticsDashboardProps {
  businessId: string;
}

interface AnalyticsData {
  conversionMetrics: {
    totalSessions: number;
    completedBookings: number;
    conversionRate: number;
    averageTimeToComplete: number;
    abandonmentPoints: {
      serviceSelection: number;
      timeSelection: number;
      formSubmission: number;
    };
  };
  performanceMetrics: {
    averagePageLoadTime: number;
    averageApiResponseTime: number;
    errorRate: number;
    mobileUsagePercentage: number;
    peakBookingHours: Array<{ hour: number; count: number }>;
  };
  performanceInsights: {
    averagePageLoadTime: number;
    averageApiResponseTime: number;
    errorRate: number;
    slowestEndpoints: Array<{ endpoint: string; averageTime: number }>;
    errorBreakdown: Array<{ error: string; count: number }>;
  };
}

export default function BookingAnalyticsDashboard({
  businessId,
}: BookingAnalyticsDashboardProps) {
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    to: new Date(),
  });

  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalyticsData();
  }, [businessId, dateRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/analytics/booking-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId,
          startDate: dateRange.from.toISOString(),
          endDate: dateRange.to.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const data = await response.json();
      setAnalyticsData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (milliseconds: number): string => {
    if (milliseconds < 1000) {
      return `${Math.round(milliseconds)}ms`;
    }
    return `${(milliseconds / 1000).toFixed(1)}s`;
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Booking Analytics</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 w-3/4 rounded bg-gray-200"></div>
                <div className="h-6 w-1/2 rounded bg-gray-200"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Error Loading Analytics
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={fetchAnalyticsData}
              variant="outline"
              className="w-full"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analyticsData) {
    return null;
  }

  const { conversionMetrics, performanceMetrics, performanceInsights } =
    analyticsData;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Booking Analytics</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-[280px] justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, 'LLL dd, y')} -{' '}
                    {format(dateRange.to, 'LLL dd, y')}
                  </>
                ) : (
                  format(dateRange.from, 'LLL dd, y')
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange.from}
              selected={dateRange}
              onSelect={range => {
                if (range?.from && range?.to) {
                  setDateRange({ from: range.from, to: range.to });
                }
              }}
              numberOfMonths={2}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Conversion Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Sessions
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {conversionMetrics.totalSessions}
            </div>
            <p className="text-xs text-muted-foreground">
              Unique booking sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completed Bookings
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {conversionMetrics.completedBookings}
            </div>
            <p className="text-xs text-muted-foreground">
              Successful appointments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Conversion Rate
            </CardTitle>
            <TrendingUp
              className={cn(
                'h-4 w-4',
                conversionMetrics.conversionRate >= 20
                  ? 'text-green-600'
                  : 'text-yellow-600'
              )}
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(conversionMetrics.conversionRate)}
            </div>
            <p className="text-xs text-muted-foreground">
              Sessions to bookings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg. Completion Time
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTime(conversionMetrics.averageTimeToComplete)}
            </div>
            <p className="text-xs text-muted-foreground">
              Time to complete booking
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Page Load Time
            </CardTitle>
            <Clock
              className={cn(
                'h-4 w-4',
                performanceMetrics.averagePageLoadTime <= 2000
                  ? 'text-green-600'
                  : 'text-red-600'
              )}
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTime(performanceMetrics.averagePageLoadTime)}
            </div>
            <p className="text-xs text-muted-foreground">Average load time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              API Response Time
            </CardTitle>
            <Clock
              className={cn(
                'h-4 w-4',
                performanceMetrics.averageApiResponseTime <= 500
                  ? 'text-green-600'
                  : 'text-red-600'
              )}
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTime(performanceMetrics.averageApiResponseTime)}
            </div>
            <p className="text-xs text-muted-foreground">
              Average API response
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle
              className={cn(
                'h-4 w-4',
                performanceMetrics.errorRate <= 1
                  ? 'text-green-600'
                  : 'text-red-600'
              )}
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(performanceMetrics.errorRate)}
            </div>
            <p className="text-xs text-muted-foreground">
              Error occurrence rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mobile Usage</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(performanceMetrics.mobileUsagePercentage)}
            </div>
            <p className="text-xs text-muted-foreground">Mobile device usage</p>
          </CardContent>
        </Card>
      </div>

      {/* Abandonment Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Abandonment Analysis</CardTitle>
          <CardDescription>
            Where users are dropping off in the booking process
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Service Selection</span>
              <span className="text-sm text-muted-foreground">
                {conversionMetrics.abandonmentPoints.serviceSelection}{' '}
                abandonments
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Time Selection</span>
              <span className="text-sm text-muted-foreground">
                {conversionMetrics.abandonmentPoints.timeSelection} abandonments
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Form Submission</span>
              <span className="text-sm text-muted-foreground">
                {conversionMetrics.abandonmentPoints.formSubmission}{' '}
                abandonments
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Peak Hours */}
      <Card>
        <CardHeader>
          <CardTitle>Peak Booking Hours</CardTitle>
          <CardDescription>
            Most popular times for booking appointments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {performanceMetrics.peakBookingHours.map(({ hour, count }) => (
              <div key={hour} className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {hour === 0
                    ? '12 AM'
                    : hour <= 12
                      ? `${hour} AM`
                      : `${hour - 12} PM`}
                </span>
                <span className="text-sm text-muted-foreground">
                  {count} bookings
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Error Breakdown */}
      {performanceInsights.errorBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Error Analysis</CardTitle>
            <CardDescription>Most common errors encountered</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {performanceInsights.errorBreakdown
                .slice(0, 5)
                .map(({ error, count }) => (
                  <div
                    key={error}
                    className="flex items-center justify-between"
                  >
                    <span className="truncate text-sm font-medium">
                      {error}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {count} occurrences
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

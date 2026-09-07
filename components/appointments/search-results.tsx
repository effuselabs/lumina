'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Calendar, Search } from 'lucide-react';
import { useMemo } from 'react';

import {
  createSearchResult,
  extractHighlightTerms,
  filterAppointments,
  sortByRelevance,
} from '@/lib/search-utils';
import { AppointmentFilters, SearchResult } from '@/types/appointment-filters';
import { DashboardAppointment } from '@/types/dashboard-appointments';
import { AppointmentSearchResult } from './search-result-highlight';

interface SearchResultsProps {
  appointments: DashboardAppointment[];
  filters: AppointmentFilters;
  onAppointmentClick: (appointment: DashboardAppointment) => void;
  onClearFilters?: () => void;
  className?: string;
  maxResults?: number;
  showStats?: boolean;
}

export function SearchResults({
  appointments,
  filters,
  onAppointmentClick,
  onClearFilters,
  className,
  maxResults = 100,
  showStats = true,
}: SearchResultsProps) {
  // Filter and sort appointments
  const searchResult = useMemo(() => {
    const filtered = filterAppointments(appointments, filters);
    const highlightTerms = extractHighlightTerms(filters);
    const sorted = sortByRelevance(filtered, highlightTerms);
    const limited = sorted.slice(0, maxResults);

    return createSearchResult(
      limited,
      filters,
      filtered.length,
      filtered.length > maxResults
    );
  }, [appointments, filters, maxResults]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.searchTerm ||
      filters.staffIds?.length ||
      filters.serviceIds?.length ||
      filters.status?.length ||
      filters.dateRange ||
      filters.clientName ||
      filters.clientId
    );
  }, [filters]);

  // Group appointments by date for better organization
  const groupedAppointments = useMemo(() => {
    const groups: Record<string, DashboardAppointment[]> = {};

    searchResult.appointments.forEach(appointment => {
      const dateKey = appointment.startTime.toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(appointment);
    });

    return Object.entries(groups).sort(
      ([a], [b]) => new Date(a).getTime() - new Date(b).getTime()
    );
  }, [searchResult.appointments]);

  // No results state
  if (!hasActiveFilters) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-12 text-center',
          className
        )}
      >
        <Search className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="mb-2 text-lg font-medium">Search Appointments</h3>
        <p className="max-w-md text-muted-foreground">
          Use the search bar and filters above to find specific appointments,
          clients, or services.
        </p>
      </div>
    );
  }

  if (searchResult.totalCount === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-12 text-center',
          className
        )}
      >
        <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="mb-2 text-lg font-medium">No appointments found</h3>
        <p className="mb-4 max-w-md text-muted-foreground">
          No appointments match your current search criteria. Try adjusting your
          filters or search terms.
        </p>
        {onClearFilters && (
          <Button variant="outline" onClick={onClearFilters}>
            Clear all filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search Stats */}
      {showStats && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {searchResult.totalCount} appointment
              {searchResult.totalCount !== 1 ? 's' : ''}
            </div>
            {searchResult.hasMore && (
              <Badge variant="secondary" className="text-xs">
                Showing first {searchResult.appointments.length}
              </Badge>
            )}
          </div>

          {onClearFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              Clear filters
            </Button>
          )}
        </div>
      )}

      {/* Results */}
      <ScrollArea className="h-[600px]">
        <div className="space-y-6">
          {groupedAppointments.map(([dateString, dayAppointments]) => (
            <div key={dateString}>
              {/* Date Header */}
              <div className="mb-3 flex items-center gap-2">
                <h4 className="text-sm font-medium">
                  {new Date(dateString).toLocaleDateString(undefined, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </h4>
                <Badge variant="outline" className="text-xs">
                  {dayAppointments.length}
                </Badge>
              </div>

              {/* Appointments for this date */}
              <div className="space-y-2">
                {dayAppointments.map(appointment => (
                  <AppointmentSearchResult
                    key={appointment.id}
                    appointment={appointment}
                    searchTerms={searchResult.highlightedTerms}
                    onClick={() => onAppointmentClick(appointment)}
                  />
                ))}
              </div>

              <Separator className="mt-4" />
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Load More */}
      {searchResult.hasMore && (
        <div className="pt-4 text-center">
          <p className="mb-2 text-sm text-muted-foreground">
            Showing {searchResult.appointments.length} of{' '}
            {searchResult.totalCount} results
          </p>
          <Button variant="outline" size="sm">
            Load more results
          </Button>
        </div>
      )}
    </div>
  );
}

// Quick stats component for search results
interface SearchStatsProps {
  searchResult: SearchResult;
  className?: string;
}

export function SearchStats({ searchResult, className }: SearchStatsProps) {
  const stats = useMemo(() => {
    const appointments = searchResult.appointments;
    const statusCounts = appointments.reduce(
      (acc, appointment) => {
        acc[appointment.status] = (acc[appointment.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const staffCounts = appointments.reduce(
      (acc, appointment) => {
        const staffName = appointment.staff.displayName;
        acc[staffName] = (acc[staffName] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      total: appointments.length,
      statusCounts,
      staffCounts,
      totalRevenue: appointments.reduce((sum, apt) => sum + apt.totalPrice, 0),
    };
  }, [searchResult]);

  return (
    <div className={cn('grid grid-cols-2 gap-4 md:grid-cols-4', className)}>
      <div className="text-center">
        <div className="text-2xl font-bold">{stats.total}</div>
        <div className="text-sm text-muted-foreground">Total</div>
      </div>

      <div className="text-center">
        <div className="text-2xl font-bold">
          ${(stats.totalRevenue / 100).toFixed(0)}
        </div>
        <div className="text-sm text-muted-foreground">Revenue</div>
      </div>

      <div className="text-center">
        <div className="text-2xl font-bold">
          {Object.keys(stats.staffCounts).length}
        </div>
        <div className="text-sm text-muted-foreground">Staff</div>
      </div>

      <div className="text-center">
        <div className="text-2xl font-bold">
          {Object.keys(stats.statusCounts).length}
        </div>
        <div className="text-sm text-muted-foreground">Statuses</div>
      </div>
    </div>
  );
}

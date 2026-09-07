'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useMobileDetection } from '@/hooks/use-mobile-detection';
import { cn } from '@/lib/utils';
import {
  AppointmentFilters,
  FilterPreset,
  SearchFiltersProps,
} from '@/types/appointment-filters';
import { AppointmentStatus } from '@/types/dashboard-appointments';
import {
  Briefcase,
  Calendar,
  Clock,
  Filter,
  Search,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Mobile-optimized Search and Filter Component
 *
 * Uses drawer interface on mobile devices with touch-friendly controls.
 * Provides simplified filter interface optimized for small screens.
 *
 * Requirements: 6.1, 6.2, 6.5, 6.6
 */
export function MobileSearchFilters({
  onFilterChange,
  staffMembers,
  services,
  initialFilters = {},
  className,
}: SearchFiltersProps) {
  const { isMobile, isTablet } = useMobileDetection();
  const [filters, setFilters] = useState<AppointmentFilters>(initialFilters);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(initialFilters.searchTerm || '');

  // Debounced search term update
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== filters.searchTerm) {
        const newFilters = { ...filters, searchTerm: searchTerm || undefined };
        setFilters(newFilters);
        onFilterChange(newFilters);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, filters, onFilterChange]);

  // Handle filter updates
  const updateFilters = useCallback(
    (updates: Partial<AppointmentFilters>) => {
      const newFilters = { ...filters, ...updates };
      setFilters(newFilters);
      onFilterChange(newFilters);
    },
    [filters, onFilterChange]
  );

  // Clear all filters
  const clearFilters = useCallback(() => {
    const emptyFilters: AppointmentFilters = {};
    setFilters(emptyFilters);
    setSearchTerm('');
    onFilterChange(emptyFilters);
    setIsOpen(false);
  }, [onFilterChange]);

  // Apply preset filters
  const applyPreset = useCallback(
    (preset: FilterPreset) => {
      setFilters(preset.filters);
      setSearchTerm(preset.filters.searchTerm || '');
      onFilterChange(preset.filters);
      setIsOpen(false);
    },
    [onFilterChange]
  );

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.searchTerm) count++;
    if (filters.staffIds?.length) count++;
    if (filters.serviceIds?.length) count++;
    if (filters.status?.length) count++;
    if (filters.dateRange) count++;
    if (filters.clientName) count++;
    return count;
  }, [filters]);

  // Status options
  const statusOptions = useMemo(
    () => [
      { value: AppointmentStatus.SCHEDULED, label: 'Scheduled' },
      { value: AppointmentStatus.CONFIRMED, label: 'Confirmed' },
      { value: AppointmentStatus.IN_PROGRESS, label: 'In Progress' },
      { value: AppointmentStatus.COMPLETED, label: 'Completed' },
      { value: AppointmentStatus.CANCELLED, label: 'Cancelled' },
      { value: AppointmentStatus.NO_SHOW, label: 'No Show' },
    ],
    []
  );

  // Staff options
  const staffOptions = useMemo(
    () =>
      staffMembers
        .filter(staff => staff.isActive)
        .map(staff => ({
          value: staff.id,
          label: staff.displayName,
          color: staff.color,
        })),
    [staffMembers]
  );

  // Service options
  const serviceOptions = useMemo(
    () =>
      services
        .filter(service => service.isActive)
        .map(service => ({
          value: service.id,
          label: service.name,
          category: service.category,
        })),
    [services]
  );

  // Quick filter presets for mobile
  const quickPresets: FilterPreset[] = [
    {
      id: 'today',
      name: 'Today',
      filters: {
        dateRange: {
          start: new Date(),
          end: new Date(),
        },
      },
    },
    {
      id: 'this-week',
      name: 'This Week',
      filters: {
        dateRange: {
          start: new Date(),
          end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    },
    {
      id: 'confirmed',
      name: 'Confirmed',
      filters: {
        status: [AppointmentStatus.CONFIRMED],
      },
    },
    {
      id: 'in-progress',
      name: 'In Progress',
      filters: {
        status: [AppointmentStatus.IN_PROGRESS],
      },
    },
  ];

  const filterContent = (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-color-border flex-shrink-0 border-b p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Filter Appointments</h3>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-color-foreground-muted hover:text-color-foreground touch-manipulation"
            >
              Clear all
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="space-y-6 p-4">
          {/* Quick Presets */}
          {isMobile && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Quick Filters</Label>
              <div className="grid grid-cols-2 gap-2">
                {quickPresets.map(preset => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset(preset)}
                    className="h-12 touch-manipulation text-sm"
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Date Range Filter */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-base font-medium">
              <Calendar className="h-5 w-5" />
              Date Range
            </Label>
            <div className="text-color-foreground-muted bg-color-background-muted rounded-lg p-4 text-center">
              <p>Date range picker would be implemented here</p>
              <p className="mt-1 text-sm">Touch-optimized date selection</p>
            </div>
          </div>

          {/* Staff Filter */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-base font-medium">
              <Users className="h-5 w-5" />
              Staff Members
            </Label>
            <div className="space-y-2">
              {staffOptions.map(staff => (
                <div
                  key={staff.value}
                  className={cn(
                    'border-color-border flex touch-manipulation items-center justify-between rounded-lg border p-3 transition-colors',
                    filters.staffIds?.includes(staff.value)
                      ? 'bg-lumina-radiant/10 border-lumina-coral'
                      : 'bg-color-background hover:bg-color-background-muted'
                  )}
                  onClick={() => {
                    const currentStaffIds = filters.staffIds || [];
                    const newStaffIds = currentStaffIds.includes(staff.value)
                      ? currentStaffIds.filter(id => id !== staff.value)
                      : [...currentStaffIds, staff.value];
                    updateFilters({
                      staffIds:
                        newStaffIds.length > 0 ? newStaffIds : undefined,
                    });
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="h-4 w-4 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: staff.color }}
                    />
                    <span className="font-medium">{staff.label}</span>
                  </div>
                  {filters.staffIds?.includes(staff.value) && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-lumina-coral">
                      <div className="h-2 w-2 rounded-full bg-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Service Filter */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-base font-medium">
              <Briefcase className="h-5 w-5" />
              Services
            </Label>
            <div className="space-y-2">
              {serviceOptions.map(service => (
                <div
                  key={service.value}
                  className={cn(
                    'border-color-border flex touch-manipulation items-center justify-between rounded-lg border p-3 transition-colors',
                    filters.serviceIds?.includes(service.value)
                      ? 'bg-lumina-radiant/10 border-lumina-coral'
                      : 'bg-color-background hover:bg-color-background-muted'
                  )}
                  onClick={() => {
                    const currentServiceIds = filters.serviceIds || [];
                    const newServiceIds = currentServiceIds.includes(
                      service.value
                    )
                      ? currentServiceIds.filter(id => id !== service.value)
                      : [...currentServiceIds, service.value];
                    updateFilters({
                      serviceIds:
                        newServiceIds.length > 0 ? newServiceIds : undefined,
                    });
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-medium">{service.label}</span>
                  </div>
                  {filters.serviceIds?.includes(service.value) && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-lumina-coral">
                      <div className="h-2 w-2 rounded-full bg-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-base font-medium">
              <Clock className="h-5 w-5" />
              Status
            </Label>
            <div className="space-y-2">
              {statusOptions.map(status => (
                <div
                  key={status.value}
                  className={cn(
                    'border-color-border flex touch-manipulation items-center justify-between rounded-lg border p-3 transition-colors',
                    filters.status?.includes(status.value)
                      ? 'bg-lumina-radiant/10 border-lumina-coral'
                      : 'bg-color-background hover:bg-color-background-muted'
                  )}
                  onClick={() => {
                    const currentStatus = filters.status || [];
                    const newStatus = currentStatus.includes(status.value)
                      ? currentStatus.filter(s => s !== status.value)
                      : [...currentStatus, status.value];
                    updateFilters({
                      status: newStatus.length > 0 ? newStatus : undefined,
                    });
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-medium">{status.label}</span>
                  </div>
                  {filters.status?.includes(status.value) && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-lumina-coral">
                      <div className="h-2 w-2 rounded-full bg-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-color-border flex-shrink-0 border-t p-4">
        <Button
          onClick={() => setIsOpen(false)}
          className="h-12 w-full touch-manipulation"
        >
          Apply Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div className={cn('flex flex-col space-y-3', className)}>
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-muted-foreground" />
          <Input
            placeholder="Search appointments..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="h-12 touch-manipulation pl-10 pr-4 text-base"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 transform touch-manipulation p-0"
              onClick={() => setSearchTerm('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Filter Button and Active Filters */}
        <div className="flex items-center space-x-2">
          <Drawer open={isOpen} onOpenChange={setIsOpen}>
            <DrawerTrigger asChild>
              <Button
                variant="outline"
                className="relative h-12 touch-manipulation px-4"
              >
                <Filter className="mr-2 h-5 w-5" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-2 flex h-6 w-6 items-center justify-center p-0 text-xs"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </DrawerTrigger>
            <DrawerContent className="flex h-[85vh] flex-col">
              <DrawerHeader className="text-left">
                <DrawerTitle>Filter Appointments</DrawerTitle>
              </DrawerHeader>
              {filterContent}
            </DrawerContent>
          </Drawer>

          {/* Active Filter Badges */}
          {activeFilterCount > 0 && (
            <div className="flex-1 overflow-x-auto">
              <div className="flex space-x-2 pb-2">
                {filters.dateRange && (
                  <Badge variant="secondary" className="whitespace-nowrap">
                    Date Range
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-1 h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => updateFilters({ dateRange: undefined })}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                {filters.staffIds?.length && (
                  <Badge variant="secondary" className="whitespace-nowrap">
                    Staff ({filters.staffIds.length})
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-1 h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => updateFilters({ staffIds: undefined })}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                {filters.serviceIds?.length && (
                  <Badge variant="secondary" className="whitespace-nowrap">
                    Services ({filters.serviceIds.length})
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-1 h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => updateFilters({ serviceIds: undefined })}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                {filters.status?.length && (
                  <Badge variant="secondary" className="whitespace-nowrap">
                    Status ({filters.status.length})
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-1 h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => updateFilters({ status: undefined })}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Tablet/Desktop version - simplified from original
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Search Input */}
      <div className="relative max-w-md flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
        <Input
          placeholder="Search appointments, clients, services..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="touch-manipulation pl-10 pr-4"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 transform touch-manipulation p-0"
            onClick={() => setSearchTerm('')}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Filter Button */}
      <Button variant="outline" className="relative touch-manipulation">
        <Filter className="mr-2 h-4 w-4" />
        Filters
        {activeFilterCount > 0 && (
          <Badge
            variant="secondary"
            className="ml-2 flex h-5 w-5 items-center justify-center p-0 text-xs"
          >
            {activeFilterCount}
          </Badge>
        )}
      </Button>

      {/* Active Filter Badges */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {filters.dateRange && (
            <Badge variant="secondary" className="gap-1">
              Date Range
              <Button
                variant="ghost"
                size="sm"
                className="h-3 w-3 p-0 hover:bg-transparent"
                onClick={() => updateFilters({ dateRange: undefined })}
              >
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          )}
          {filters.staffIds?.length && (
            <Badge variant="secondary" className="gap-1">
              Staff ({filters.staffIds.length})
              <Button
                variant="ghost"
                size="sm"
                className="h-3 w-3 p-0 hover:bg-transparent"
                onClick={() => updateFilters({ staffIds: undefined })}
              >
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          )}
          {filters.serviceIds?.length && (
            <Badge variant="secondary" className="gap-1">
              Services ({filters.serviceIds.length})
              <Button
                variant="ghost"
                size="sm"
                className="h-3 w-3 p-0 hover:bg-transparent"
                onClick={() => updateFilters({ serviceIds: undefined })}
              >
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          )}
          {filters.status?.length && (
            <Badge variant="secondary" className="gap-1">
              Status ({filters.status.length})
              <Button
                variant="ghost"
                size="sm"
                className="h-3 w-3 p-0 hover:bg-transparent"
                onClick={() => updateFilters({ status: undefined })}
              >
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

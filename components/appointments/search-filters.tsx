'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Briefcase, Calendar, Clock, Filter, Search, Users, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { AppointmentFilters, FilterPreset, SearchFiltersProps } from '@/types/appointment-filters';
import { AppointmentStatus } from '@/types/dashboard-appointments';
import { DateRangePicker } from './date-range-picker';
import { FilterPresets } from './filter-presets';
import { MultiSelectFilter } from './multi-select-filter';

export function SearchFilters({
    onFilterChange,
    staffMembers,
    services,
    initialFilters = {},
    className
}: SearchFiltersProps) {
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
    const updateFilters = useCallback((updates: Partial<AppointmentFilters>) => {
        const newFilters = { ...filters, ...updates };
        setFilters(newFilters);
        onFilterChange(newFilters);
    }, [filters, onFilterChange]);

    // Clear all filters
    const clearFilters = useCallback(() => {
        const emptyFilters: AppointmentFilters = {};
        setFilters(emptyFilters);
        setSearchTerm('');
        onFilterChange(emptyFilters);
    }, [onFilterChange]);

    // Apply preset filters
    const applyPreset = useCallback((preset: FilterPreset) => {
        setFilters(preset.filters);
        setSearchTerm(preset.filters.searchTerm || '');
        onFilterChange(preset.filters);
        setIsOpen(false);
    }, [onFilterChange]);

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
    const statusOptions = useMemo(() => [
        { value: AppointmentStatus.SCHEDULED, label: 'Scheduled' },
        { value: AppointmentStatus.CONFIRMED, label: 'Confirmed' },
        { value: AppointmentStatus.IN_PROGRESS, label: 'In Progress' },
        { value: AppointmentStatus.COMPLETED, label: 'Completed' },
        { value: AppointmentStatus.CANCELLED, label: 'Cancelled' },
        { value: AppointmentStatus.NO_SHOW, label: 'No Show' },
        { value: AppointmentStatus.RESCHEDULED, label: 'Rescheduled' },
    ], []);

    // Staff options
    const staffOptions = useMemo(() =>
        staffMembers
            .filter(staff => staff.isActive)
            .map(staff => ({
                value: staff.id,
                label: staff.displayName,
                color: staff.color
            }))
        , [staffMembers]);

    // Service options
    const serviceOptions = useMemo(() =>
        services
            .filter(service => service.isActive)
            .map(service => ({
                value: service.id,
                label: service.name,
                category: service.category
            }))
        , [services]);

    return (
        <div className={cn('flex items-center gap-2', className)}>
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                    placeholder="Search appointments, clients, services..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4"
                />
                {searchTerm && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                        onClick={() => setSearchTerm('')}
                    >
                        <X className="h-3 w-3" />
                    </Button>
                )}
            </div>

            {/* Filter Popover */}
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="relative">
                        <Filter className="h-4 w-4 mr-2" />
                        Filters
                        {activeFilterCount > 0 && (
                            <Badge
                                variant="secondary"
                                className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                            >
                                {activeFilterCount}
                            </Badge>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96 p-0" align="end">
                    <div className="p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-medium">Filter Appointments</h4>
                            {activeFilterCount > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearFilters}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    Clear all
                                </Button>
                            )}
                        </div>

                        <div className="space-y-4">
                            {/* Filter Presets */}
                            <FilterPresets onApplyPreset={applyPreset} />

                            <Separator />

                            {/* Date Range Filter */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    Date Range
                                </Label>
                                <DateRangePicker
                                    value={filters.dateRange}
                                    onChange={(dateRange) => updateFilters({ dateRange })}
                                />
                            </div>

                            {/* Staff Filter */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    Staff Members
                                </Label>
                                <MultiSelectFilter
                                    options={staffOptions}
                                    value={filters.staffIds || []}
                                    onChange={(staffIds) => updateFilters({ staffIds })}
                                    placeholder="Select staff members..."
                                    showColors
                                />
                            </div>

                            {/* Service Filter */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Briefcase className="h-4 w-4" />
                                    Services
                                </Label>
                                <MultiSelectFilter
                                    options={serviceOptions}
                                    value={filters.serviceIds || []}
                                    onChange={(serviceIds) => updateFilters({ serviceIds })}
                                    placeholder="Select services..."
                                    groupBy="category"
                                />
                            </div>

                            {/* Status Filter */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    Status
                                </Label>
                                <MultiSelectFilter
                                    options={statusOptions}
                                    value={filters.status || []}
                                    onChange={(status) => updateFilters({ status })}
                                    placeholder="Select status..."
                                />
                            </div>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>

            {/* Active Filter Badges */}
            {activeFilterCount > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
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
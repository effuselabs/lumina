import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Filter, Search, X } from 'lucide-react';
import { ReactNode } from 'react';

export interface FilterOption {
  key: string;
  label: string;
  type: 'select' | 'search' | 'date' | 'custom';
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  component?: ReactNode;
}

interface FilterBarProps {
  filters: FilterOption[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  onClear?: () => void;
  className?: string;
  showClearAll?: boolean;
}

/**
 * FilterBar Component
 *
 * Consistent search and filter UI with multiple filter types support.
 * Provides a unified interface for filtering data across different pages.
 *
 * @example
 * <FilterBar
 *   filters={[
 *     { key: 'search', label: 'Search', type: 'search', placeholder: 'Search clients...' },
 *     { key: 'status', label: 'Status', type: 'select', options: [
 *       { value: 'active', label: 'Active' },
 *       { value: 'inactive', label: 'Inactive' }
 *     ]},
 *     { key: 'date', label: 'Date Range', type: 'date' }
 *   ]}
 *   values={filterValues}
 *   onChange={handleFilterChange}
 *   onClear={handleClearFilters}
 * />
 */
export function FilterBar({
  filters,
  values,
  onChange,
  onClear,
  className,
  showClearAll = true,
}: FilterBarProps) {
  const hasActiveFilters = Object.values(values).some(
    value => value !== undefined && value !== null && value !== ''
  );

  const renderFilter = (filter: FilterOption) => {
    const value = values[filter.key];

    switch (filter.type) {
      case 'search':
        return (
          <div key={filter.key} className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
            <Input
              placeholder={
                filter.placeholder || `Search ${filter.label.toLowerCase()}...`
              }
              value={value || ''}
              onChange={e => onChange(filter.key, e.target.value)}
              className="lumina-form-input pl-10"
            />
          </div>
        );

      case 'select':
        return (
          <div key={filter.key} className="min-w-[150px]">
            <Select
              value={value || ''}
              onValueChange={newValue => onChange(filter.key, newValue)}
            >
              <SelectTrigger className="lumina-form-input">
                <SelectValue
                  placeholder={
                    filter.placeholder || `Select ${filter.label.toLowerCase()}`
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {filter.options?.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'date':
        return (
          <div key={filter.key} className="min-w-[150px]">
            <Input
              type="date"
              value={value || ''}
              onChange={e => onChange(filter.key, e.target.value)}
              placeholder={filter.placeholder}
              className="lumina-form-input"
            />
          </div>
        );

      case 'custom':
        return (
          <div key={filter.key} className="min-w-[150px]">
            {filter.component}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-4 rounded-lg border bg-muted/30 p-4',
        className
      )}
    >
      {/* Filter Icon */}
      <div className="flex items-center space-x-2">
        <Filter className="text-lumina-secondary h-4 w-4" />
        <span className="text-lumina-secondary text-sm font-medium">
          Filters:
        </span>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-1 flex-wrap items-center gap-3">
        {filters.map(renderFilter)}
      </div>

      {/* Clear All Button */}
      {showClearAll && hasActiveFilters && onClear && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-lumina-secondary hover:text-lumina-primary hover:bg-lumina-peach/20"
        >
          <X className="mr-1 h-4 w-4" />
          Clear All
        </Button>
      )}
    </div>
  );
}

/**
 * FilterChips Component
 *
 * Displays active filters as removable chips below the filter bar.
 */
interface FilterChipsProps {
  filters: FilterOption[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  className?: string;
}

export function FilterChips({
  filters,
  values,
  onChange,
  className,
}: FilterChipsProps) {
  const activeFilters = filters.filter(filter => {
    const value = values[filter.key];
    return value !== undefined && value !== null && value !== '';
  });

  if (activeFilters.length === 0) {
    return null;
  }

  const getDisplayValue = (filter: FilterOption, value: unknown) => {
    if (filter.type === 'select' && filter.options) {
      const option = filter.options.find(opt => opt.value === value);
      return option ? option.label : value;
    }
    return value;
  };

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {activeFilters.map(filter => {
        const value = values[filter.key];
        const displayValue = getDisplayValue(filter, value);

        return (
          <div
            key={filter.key}
            className="text-lumina-primary inline-flex items-center gap-1 rounded-md border bg-lumina-gold/10 px-2 py-1 text-sm"
          >
            <span className="font-medium">{filter.label}:</span>
            <span>{displayValue}</span>
            <button
              onClick={() => onChange(filter.key, '')}
              className="ml-1 rounded p-0.5 transition-colors hover:bg-lumina-gold/20"
              aria-label={`Remove ${filter.label} filter`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

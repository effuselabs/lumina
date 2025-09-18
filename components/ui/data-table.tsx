import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { ReactNode, useState } from 'react';

export interface Column<T> {
  key: keyof T | string;
  title: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  searchPlaceholder?: string;
  onRowClick?: (row: T) => void;
  className?: string;
  emptyState?: ReactNode;
  loading?: boolean;
}

/**
 * DataTable Component
 *
 * Professional table with search/filter capabilities and consistent styling.
 * Supports sorting, searching, custom rendering, and empty states.
 *
 * @example
 * <DataTable
 *   data={clients}
 *   columns={[
 *     { key: 'name', title: 'Name', sortable: true },
 *     { key: 'email', title: 'Email' },
 *     { key: 'status', title: 'Status', render: (value) => <StatusBadge variant={value}>{value}</StatusBadge> }
 *   ]}
 *   searchable
 *   searchPlaceholder="Search clients..."
 *   onRowClick={handleRowClick}
 * />
 */
export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  searchable = false,
  searchPlaceholder = 'Search...',
  onRowClick,
  className,
  emptyState,
  loading = false,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  // Filter data based on search term
  const filteredData = searchable
    ? data.filter(row =>
        Object.values(row).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : data;

  // Sort data
  const sortedData = sortConfig
    ? [...filteredData].sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      })
    : filteredData;

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return {
          key,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key, direction: 'asc' };
    });
  };

  const getValue = (row: T, key: string) => {
    return key.includes('.')
      ? key.split('.').reduce((obj, k) => obj?.[k], row)
      : row[key];
  };

  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        {searchable && (
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <div className="h-10 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
        )}
        <div className="rounded-lg border">
          <div className="animate-pulse">
            {/* Header */}
            <div className="border-b p-4">
              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
                }}
              >
                {columns.map((_, i) => (
                  <div key={i} className="h-4 rounded bg-gray-200" />
                ))}
              </div>
            </div>
            {/* Rows */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="border-b p-4">
                <div
                  className="grid gap-4"
                  style={{
                    gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
                  }}
                >
                  {columns.map((_, j) => (
                    <div key={j} className="h-4 rounded bg-gray-200" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search */}
      {searchable && (
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="lumina-form-input pl-10"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(column => (
                <TableHead
                  key={String(column.key)}
                  className={cn(
                    'text-lumina-primary font-medium',
                    column.sortable && 'cursor-pointer hover:bg-muted/50',
                    column.className
                  )}
                  onClick={() =>
                    column.sortable && handleSort(String(column.key))
                  }
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.title}</span>
                    {column.sortable && (
                      <div className="flex flex-col">
                        <ChevronUp
                          className={cn(
                            'h-3 w-3',
                            sortConfig?.key === column.key &&
                              sortConfig.direction === 'asc'
                              ? 'text-lumina-primary'
                              : 'text-muted-foreground'
                          )}
                        />
                        <ChevronDown
                          className={cn(
                            '-mt-1 h-3 w-3',
                            sortConfig?.key === column.key &&
                              sortConfig.direction === 'desc'
                              ? 'text-lumina-primary'
                              : 'text-muted-foreground'
                          )}
                        />
                      </div>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="py-8 text-center"
                >
                  {emptyState || (
                    <div className="text-lumina-secondary">
                      {searchTerm ? 'No results found' : 'No data available'}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map((row, index) => (
                <TableRow
                  key={index}
                  className={cn(
                    'transition-colors hover:bg-muted/50',
                    onRowClick && 'cursor-pointer'
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map(column => {
                    const value = getValue(row, String(column.key));
                    return (
                      <TableCell
                        key={String(column.key)}
                        className={cn('text-lumina-primary', column.className)}
                      >
                        {column.render
                          ? column.render(value, row)
                          : String(value || '')}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Results Info */}
      {searchable && searchTerm && (
        <div className="text-lumina-secondary text-sm">
          Showing {sortedData.length} of {data.length} results
        </div>
      )}
    </div>
  );
}

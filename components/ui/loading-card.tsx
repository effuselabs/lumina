import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface LoadingCardProps {
  title?: boolean;
  lines?: number;
  avatar?: boolean;
  actions?: boolean;
  className?: string;
}

/**
 * LoadingCard Component
 *
 * Unified loading states with skeleton animations.
 * Provides consistent loading patterns across all dashboard components.
 *
 * @example
 * <LoadingCard title lines={3} avatar />
 * <LoadingCard lines={2} actions />
 */
export function LoadingCard({
  title = true,
  lines = 2,
  avatar = false,
  actions = false,
  className,
}: LoadingCardProps) {
  return (
    <Card className={cn('animate-pulse', className)}>
      {title && (
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-3">
            {avatar && (
              <div className="bg-color-background-muted h-10 w-10 rounded-full" />
            )}
            <div className="flex-1 space-y-2">
              <div className="bg-color-background-muted h-4 w-1/3 rounded" />
              <div className="bg-color-background-muted h-3 w-1/2 rounded" />
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className="space-y-3">
        {/* Content Lines */}
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="bg-color-background-muted h-4 w-full rounded" />
            <div className="bg-color-background-muted h-3 w-3/4 rounded" />
          </div>
        ))}

        {/* Actions */}
        {actions && (
          <div className="flex space-x-2 pt-4">
            <div className="bg-color-background-muted h-8 w-20 rounded" />
            <div className="bg-color-background-muted h-8 w-16 rounded" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * LoadingTable Component
 *
 * Skeleton loading state for data tables.
 */
export function LoadingTable({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="animate-pulse space-y-4">
      {/* Table Header */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            className="bg-color-background-muted h-4 w-3/4 rounded"
          />
        ))}
      </div>

      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={colIndex}
              className="bg-color-background-muted h-4 w-full rounded"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * LoadingList Component
 *
 * Skeleton loading state for list items.
 */
export function LoadingList({ items = 3 }: { items?: number }) {
  return (
    <div className="animate-pulse space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center space-x-4 rounded-lg border p-4"
        >
          <div className="bg-color-background-muted h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="bg-color-background-muted h-4 w-1/3 rounded" />
            <div className="bg-color-background-muted h-3 w-1/2 rounded" />
          </div>
          <div className="bg-color-background-muted h-8 w-16 rounded" />
        </div>
      ))}
    </div>
  );
}

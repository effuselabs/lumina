import { cn } from '@/lib/utils';
import { type VariantProps, cva } from 'class-variance-authority';

const statusBadgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-color-background-muted text-color-foreground',
        success: 'bg-green-100 text-green-800',
        warning: 'bg-yellow-100 text-yellow-800',
        error: 'bg-red-100 text-red-800',
        info: 'bg-blue-100 text-blue-800',
        pending: 'bg-orange-100 text-orange-800',
        active: 'bg-green-100 text-green-800',
        inactive: 'bg-color-background-muted text-color-foreground-muted',
        scheduled: 'bg-blue-100 text-blue-800',
        confirmed: 'bg-green-100 text-green-800',
        'in-progress': 'bg-orange-100 text-orange-800',
        completed: 'bg-green-100 text-green-800',
        cancelled: 'bg-red-100 text-red-800',
        'no-show': 'bg-color-background-muted text-color-foreground-muted',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  children: React.ReactNode;
}

/**
 * StatusBadge Component
 *
 * Unified status indicators with consistent styling across the application.
 * Supports various status types commonly used in business management.
 *
 * @example
 * <StatusBadge variant="confirmed">Confirmed</StatusBadge>
 * <StatusBadge variant="pending" size="sm">Pending</StatusBadge>
 * <StatusBadge variant="active">Active</StatusBadge>
 */
export function StatusBadge({
  className,
  variant,
  size,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cn(statusBadgeVariants({ variant, size }), className)}
      {...props}
    >
      {children}
    </span>
  );
}

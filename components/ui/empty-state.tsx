import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
    variant?: 'default' | 'outline' | 'ghost';
  };
  className?: string;
  children?: ReactNode;
}

/**
 * EmptyState Component
 *
 * Consistent empty state displays with optional call-to-action.
 * Provides contextual messaging and guidance for users when no data is available.
 *
 * @example
 * <EmptyState
 *   icon={Calendar}
 *   title="No appointments scheduled"
 *   description="Your schedule is clear for today"
 *   action={{
 *     label: 'Add Appointment',
 *     onClick: handleAddAppointment,
 *     variant: 'default'
 *   }}
 * />
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div className={cn('py-12 text-center', className)}>
      {/* Icon */}
      {Icon && (
        <Icon
          className="mx-auto mb-4 h-12 w-12"
          style={{ color: 'rgba(128, 130, 133, 0.4)' }}
        />
      )}

      {/* Content */}
      <div className="mb-6 space-y-2">
        <h3 className="lumina-body-large font-medium text-foreground">
          {title}
        </h3>
        {description && (
          <p
            className="lumina-body-small"
            style={{ color: 'rgba(128, 130, 133, 0.7)' }}
          >
            {description}
          </p>
        )}
      </div>

      {/* Action */}
      {action && (
        <div className="flex justify-center">
          {action.href ? (
            <Button
              asChild
              variant={action.variant || 'default'}
              className={
                action.variant === 'default'
                  ? 'bg-lumina-radiant text-white hover:bg-lumina-radiant-hover'
                  : undefined
              }
            >
              <a href={action.href}>{action.label}</a>
            </Button>
          ) : (
            <Button
              onClick={action.onClick}
              variant={action.variant || 'default'}
              className={
                action.variant === 'default'
                  ? 'bg-lumina-radiant text-white hover:bg-lumina-radiant-hover'
                  : undefined
              }
            >
              {action.label}
            </Button>
          )}
        </div>
      )}

      {/* Additional Content */}
      {children}
    </div>
  );
}

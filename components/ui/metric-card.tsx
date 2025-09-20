import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon, TrendingDown, TrendingUp } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
    period?: string;
  };
  icon?: LucideIcon;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
  loading?: boolean;
}

/**
 * MetricCard Component
 *
 * Reusable metric displays with consistent styling, trend indicators, and optional actions.
 * Extends the EnhancedStatCard pattern for broader use across the application.
 *
 * @example
 * <MetricCard
 *   title="Total Revenue"
 *   value="$12,450"
 *   change={{ value: 12, type: 'increase', period: 'this month' }}
 *   icon={DollarSign}
 *   action={{ label: 'View Reports', href: '/reports' }}
 * />
 */
export function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  description,
  action,
  className,
  loading = false,
}: MetricCardProps) {
  if (loading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="bg-color-background-muted h-4 w-1/3 rounded" />
          <div className="bg-color-background-muted h-4 w-4 rounded" />
        </CardHeader>
        <CardContent>
          <div className="bg-color-background-muted mb-2 h-8 w-1/2 rounded" />
          <div className="bg-color-background-muted h-3 w-2/3 rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>

      <CardContent>
        <div className="mb-1 text-2xl font-bold text-foreground">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>

        {/* Change Indicator */}
        {change && (
          <div className="flex items-center space-x-1">
            {change.type === 'increase' && (
              <TrendingUp className="h-3 w-3 text-green-600" />
            )}
            {change.type === 'decrease' && (
              <TrendingDown className="h-3 w-3 text-red-600" />
            )}
            <span
              className={cn('text-xs font-medium', {
                'text-green-600': change.type === 'increase',
                'text-red-600': change.type === 'decrease',
                'text-muted-foreground': change.type === 'neutral',
              })}
            >
              {change.type === 'increase' && '+'}
              {change.value}%{change.period && ` ${change.period}`}
            </span>
          </div>
        )}

        {/* Description */}
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}

        {/* Action */}
        {action && (
          <div className="mt-3">
            {action.href ? (
              <a
                href={action.href}
                className="text-xs text-lumina-coral transition-colors hover:text-lumina-gold"
              >
                {action.label} →
              </a>
            ) : (
              <button
                onClick={action.onClick}
                className="text-xs text-lumina-coral transition-colors hover:text-lumina-gold"
              >
                {action.label} →
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

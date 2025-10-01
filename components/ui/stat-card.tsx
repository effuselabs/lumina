'use client';

import { currencyFormatter, useCountUp } from '@/hooks/use-count-up';
import { useStatCardIntersectionObserver } from '@/hooks/use-intersection-observer';
import { cn } from '@/lib/utils';
import {
  Activity as ActivityIcon,
  BarChart3 as BarChartIcon,
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  DollarSign as DollarSignIcon,
  type LucideIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  Users as UsersIcon,
} from 'lucide-react';
import Link from 'next/link';
import { forwardRef, memo, useEffect, useMemo } from 'react';

// Icon mapping for server-client component compatibility
const iconMap = {
  'trending-up': TrendingUpIcon,
  calendar: CalendarIcon,
  users: UsersIcon,
  'dollar-sign': DollarSignIcon,
  clock: ClockIcon,
  star: StarIcon,
  'bar-chart': BarChartIcon,
  activity: ActivityIcon,
} as const;

type IconName = keyof typeof iconMap;

interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
    period: string;
  };
  icon: IconName | LucideIcon;
  action?: {
    label: string;
    href: string;
  };
  size?: 'compact' | 'default' | 'large';
  loading?: boolean;
  className?: string;
  // Animation capabilities
  animated?: boolean;
  countUp?: boolean;
  animationDelay?: number;
  formatter?: (value: number) => string;
}

/**
 * StatCard Component - Lumina Design System v2.2
 *
 * Enhanced stat card following UI standards:
 * - Proper semantic HTML and ARIA labels
 * - Size variants with consistent spacing
 * - Loading skeleton states
 * - Lumina brand color integration
 * - Performance optimized with memoization
 * - Keyboard accessible
 *
 * @param title - Card title (e.g., "Total Revenue")
 * @param value - Main metric value
 * @param change - Optional change indicator with percentage
 * @param icon - Icon name string or Lucide icon component
 * @param action - Optional action link
 * @param size - Card size variant: 'compact' | 'default' | 'large'
 * @param loading - Show loading skeleton state
 * @param className - Additional CSS classes
 */
const StatCard = memo(
  forwardRef<HTMLDivElement, StatCardProps>(function StatCard(
    {
      title,
      value,
      change,
      icon,
      action,
      size = 'default',
      loading = false,
      className,
      animated = false,
      countUp = false,
      animationDelay = 0,
      formatter,
    },
    ref
  ) {
    // Resolve icon component from string or use directly if it's already a component
    const Icon = useMemo(() => {
      if (typeof icon === 'string') {
        return iconMap[icon] || TrendingUpIcon; // fallback to TrendingUpIcon
      }
      return icon;
    }, [icon]);

    // Animation hooks
    const { ref: intersectionRef, isIntersecting } = useStatCardIntersectionObserver(animationDelay);

    // Count-up animation for numeric values
    const numericValue = typeof value === 'number' ? value : 0;
    const shouldUseCountUp = countUp && typeof value === 'number' && !loading;

    const { value: animatedValue, start: startCountUp } = useCountUp({
      end: numericValue,
      duration: 2000,
      formatter: formatter || (shouldUseCountUp && title.toLowerCase().includes('revenue') ? currencyFormatter : undefined),
      preserveValue: false,
    });

    // Start count-up animation when element comes into view
    useEffect(() => {
      if (shouldUseCountUp && isIntersecting && !loading) {
        startCountUp();
      }
    }, [shouldUseCountUp, isIntersecting, loading, startCountUp]);
    // Memoize expensive calculations
    const formattedValue = useMemo(() => {
      // Use animated value if count-up is enabled and animation is active
      if (shouldUseCountUp) {
        return animatedValue;
      }

      if (typeof value === 'string') return value;

      // Format numbers based on context
      if (
        title.toLowerCase().includes('revenue') ||
        title.toLowerCase().includes('payment')
      ) {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value);
      }

      return value.toLocaleString();
    }, [value, title, shouldUseCountUp, animatedValue]);

    const trendIcon = useMemo(() => {
      if (!change) return null;
      switch (change.type) {
        case 'increase':
          return '↗';
        case 'decrease':
          return '↘';
        default:
          return '→';
      }
    }, [change]);

    const sizeClasses = {
      compact: 'stat-card-compact',
      default: 'stat-card-default',
      large: 'stat-card-large',
    };

    if (loading) {
      return (
        <div
          ref={ref}
          className={cn(
            'stat-card',
            sizeClasses[size],
            'stat-card-loading',
            className
          )}
          role="status"
          aria-label="Loading statistics"
          aria-live="polite"
        >
          <div className="stat-card-header">
            <div className="stat-card-content">
              <div className="stat-card-skeleton-title" aria-hidden="true" />
              <div className="stat-card-skeleton-value" aria-hidden="true" />
              <div className="stat-card-skeleton-change" aria-hidden="true" />
            </div>
            <div className="stat-card-icon-container">
              <div className="stat-card-skeleton-icon" aria-hidden="true" />
            </div>
          </div>
          {action && (
            <div className="stat-card-footer">
              <div className="stat-card-skeleton-action" aria-hidden="true" />
            </div>
          )}
          <span className="sr-only">Loading {title} statistics</span>
        </div>
      );
    }

    // Combine refs for both forwarded ref and intersection observer
    const combinedRef = (element: HTMLDivElement | null) => {
      if (ref) {
        if (typeof ref === 'function') {
          ref(element);
        } else {
          ref.current = element;
        }
      }
      if (intersectionRef) {
        intersectionRef.current = element;
      }
    };

    return (
      <article
        ref={combinedRef}
        className={cn(
          'stat-card hover-lumina-lift-subtle transition-card',
          sizeClasses[size],
          {
            'stat-card-animated': animated,
            'in-view': animated && isIntersecting,
            'stat-card-progress': animated && isIntersecting,
          },
          className
        )}
        role="article"
        aria-labelledby={`stat-title-${title.replace(/\s+/g, '-').toLowerCase()}`}
      >
        {/* Header with Icon */}
        <div className="stat-card-header">
          <div className="stat-card-content">
            <h3
              id={`stat-title-${title.replace(/\s+/g, '-').toLowerCase()}`}
              className="stat-card-title"
            >
              {title}
            </h3>
            <p
              className={cn(
                'stat-card-value',
                {
                  'stat-card-value-counting': shouldUseCountUp,
                  'stat-card-value-enhanced': animated,
                }
              )}
              aria-label={`Value: ${formattedValue}`}
              role="text"
            >
              <span aria-hidden="true">{formattedValue}</span>
              <span className="sr-only">
                {typeof value === 'number' &&
                  title.toLowerCase().includes('revenue')
                  ? `${value} dollars`
                  : formattedValue}
              </span>
            </p>
            {change ? (
              <div
                className="stat-card-change"
                aria-label={`Change: ${change.type === 'increase' ? 'increased' : change.type === 'decrease' ? 'decreased' : 'no change'} by ${Math.abs(change.value)}% ${change.period}`}
              >
                <span
                  className={cn('stat-card-change-indicator', {
                    'stat-card-change-increase': change.type === 'increase',
                    'stat-card-change-decrease': change.type === 'decrease',
                    'stat-card-change-neutral': change.type === 'neutral',
                  })}
                >
                  {trendIcon} {Math.abs(change.value)}% {change.period}
                </span>
              </div>
            ) : (
              <div
                className="stat-card-change-placeholder"
                aria-hidden="true"
              />
            )}
          </div>
          <div className="stat-card-icon-container" aria-hidden="true">
            <Icon className="stat-card-icon" />
          </div>
        </div>

        {/* Action Footer */}
        {action && (
          <div className="stat-card-footer">
            <Link
              href={action.href}
              className="link-stat-card-action"
              aria-label={`${action.label} for ${title}`}
            >
              {action.label}
              <span className="stat-card-action-icon" aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        )}
      </article>
    );
  })
);

StatCard.displayName = 'StatCard';

export { StatCard };
export type { StatCardProps };


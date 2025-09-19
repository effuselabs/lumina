'use client';

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { forwardRef } from 'react';

interface StatCardProps {
    title: string;
    value: string | number;
    change?: {
        value: number;
        type: 'increase' | 'decrease' | 'neutral';
        period: string;
    };
    icon: LucideIcon;
    action?: {
        label: string;
        href: string;
    };
    size?: 'compact' | 'default' | 'large';
    loading?: boolean;
    className?: string;
}

/**
 * Optimized StatCard Component
 *
 * Enhanced stat card with size variants and improved design:
 * - Compact variant: 20% smaller height while maintaining readability
 * - Enhanced typography hierarchy with improved contrast
 * - Subtle gradient backgrounds using Lumina brand colors
 * - Smooth hover effects and micro-interactions
 * - Loading skeleton state for data fetching
 * - Proper semantic markup for screen readers
 *
 * @param title - Card title (e.g., "Total Revenue")
 * @param value - Main metric value
 * @param change - Optional change indicator with percentage
 * @param icon - Lucide icon component
 * @param action - Optional action link
 * @param size - Card size variant: 'compact' | 'default' | 'large'
 * @param loading - Show loading skeleton state
 * @param className - Additional CSS classes
 */
const StatCard = forwardRef<HTMLDivElement, StatCardProps>(
    ({ title, value, change, icon: Icon, action, size = 'default', loading = false, className }, ref) => {
        const formatValue = (val: string | number): string => {
            if (typeof val === 'string') return val;

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
                }).format(val);
            }

            return val.toLocaleString();
        };

        const getTrendIcon = (type: 'increase' | 'decrease' | 'neutral') => {
            switch (type) {
                case 'increase':
                    return '↗';
                case 'decrease':
                    return '↘';
                default:
                    return '→';
            }
        };

        const sizeClasses = {
            compact: 'stat-card-compact',
            default: 'stat-card-default',
            large: 'stat-card-large',
        };

        if (loading) {
            return (
                <div
                    ref={ref}
                    className={cn('stat-card', sizeClasses[size], 'stat-card-loading', className)}
                    role="status"
                    aria-label="Loading statistics"
                >
                    <div className="stat-card-header">
                        <div className="stat-card-content">
                            <div className="stat-card-skeleton-title" />
                            <div className="stat-card-skeleton-value" />
                            <div className="stat-card-skeleton-change" />
                        </div>
                        <div className="stat-card-icon-container">
                            <div className="stat-card-skeleton-icon" />
                        </div>
                    </div>
                    {action && (
                        <div className="stat-card-footer">
                            <div className="stat-card-skeleton-action" />
                        </div>
                    )}
                </div>
            );
        }

        return (
            <article
                ref={ref}
                className={cn('stat-card', sizeClasses[size], className)}
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
                        <p className="stat-card-value" aria-label={`Value: ${formatValue(value)}`}>
                            {formatValue(value)}
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
                                    {getTrendIcon(change.type)} {Math.abs(change.value)}% {change.period}
                                </span>
                            </div>
                        ) : (
                            <div className="stat-card-change-placeholder" aria-hidden="true" />
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
                            <span className="stat-card-action-icon" aria-hidden="true">→</span>
                        </Link>
                    </div>
                )}
            </article>
        );
    }
);

StatCard.displayName = 'StatCard';

export { StatCard };
export type { StatCardProps };

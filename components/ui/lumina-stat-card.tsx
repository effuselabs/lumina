'use client';

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { forwardRef } from 'react';

interface LuminaStatCardProps {
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
  className?: string;
}

/**
 * Lumina Stat Card Component
 *
 * Professional stat card following Lumina Design System v2.0:
 * - Perfect alignment of all elements
 * - Clear visual hierarchy with proper typography
 * - Professional action links with gradient accents
 * - Accessible color contrast throughout
 *
 * @param title - Card title (e.g., "Total Revenue")
 * @param value - Main metric value
 * @param change - Optional change indicator with percentage
 * @param icon - Lucide icon component
 * @param action - Optional action link
 * @param className - Additional CSS classes
 */
const LuminaStatCard = forwardRef<HTMLDivElement, LuminaStatCardProps>(
  ({ title, value, change, icon: Icon, action, className }, ref) => {
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

    return (
      <div ref={ref} className={cn('stat-card', className)}>
        {/* Header with Icon */}
        <div className="stat-card-header">
          <div className="stat-card-content">
            <h3 className="stat-card-title">{title}</h3>
            <p className="stat-card-value">{formatValue(value)}</p>
            {change ? (
              <div className="stat-card-change">
                <span
                  style={{
                    color:
                      change.type === 'increase'
                        ? '#22c58b'
                        : change.type === 'decrease'
                          ? '#e5484d'
                          : '#808285',
                  }}
                >
                  {getTrendIcon(change.type)} {Math.abs(change.value)}%{' '}
                  {change.period}
                </span>
              </div>
            ) : (
              <div className="stat-card-change-placeholder" />
            )}
          </div>
          <div className="stat-card-icon-container">
            <Icon className="stat-card-icon" />
          </div>
        </div>

        {/* Action Footer */}
        {action && (
          <div className="stat-card-footer">
            <Link href={action.href} className="link-stat-card-action">
              {action.label}
              <span className="stat-card-action-icon">→</span>
            </Link>
          </div>
        )}
      </div>
    );
  }
);

LuminaStatCard.displayName = 'LuminaStatCard';

export { LuminaStatCard };
export type { LuminaStatCardProps };

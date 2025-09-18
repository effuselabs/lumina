'use client';

import { cn } from '@/lib/utils';
import { LucideIcon, Zap } from 'lucide-react';
import Link from 'next/link';
import { forwardRef } from 'react';

interface QuickActionLink {
  title: string;
  href: string;
  icon: LucideIcon;
}

interface LuminaQuickActionsProps {
  title?: string;
  children: React.ReactNode;
  secondaryActions?: QuickActionLink[];
  className?: string;
}

/**
 * Lumina Quick Actions Container Component
 *
 * Professional container for quick action cards:
 * - Consistent header with title and icon
 * - Grid layout for action cards
 * - Optional secondary actions section
 * - Matches stat card styling and spacing
 *
 * @param title - Section title (defaults to "Quick Actions")
 * @param children - Quick action cards
 * @param secondaryActions - Optional array of secondary action links
 * @param className - Additional CSS classes
 */
const LuminaQuickActions = forwardRef<HTMLDivElement, LuminaQuickActionsProps>(
  ({ title = 'Quick Actions', children, secondaryActions, className }, ref) => {
    return (
      <div ref={ref} className={cn('quick-actions-container', className)}>
        {/* Header */}
        <div className="quick-actions-header">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" style={{ color: '#ff7a5a' }} />
            <h3 className="stat-card-title">{title}</h3>
          </div>
        </div>

        {/* Main Actions Grid */}
        <div className="quick-actions-grid">{children}</div>

        {/* Secondary Actions */}
        {secondaryActions && secondaryActions.length > 0 && (
          <div className="quick-actions-secondary">
            {secondaryActions.map((action, index) => (
              <Link
                key={index}
                href={action.href}
                className="quick-action-link"
              >
                <div className="quick-action-link-content">
                  <action.icon className="quick-action-link-icon" />
                  <span className="quick-action-link-text">{action.title}</span>
                </div>
                <svg
                  className="quick-action-link-arrow"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }
);

LuminaQuickActions.displayName = 'LuminaQuickActions';

export { LuminaQuickActions };
export type { LuminaQuickActionsProps, QuickActionLink };

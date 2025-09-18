'use client';

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { forwardRef } from 'react';

interface LuminaQuickActionCardProps {
  title: string;
  description?: string;
  href: string;
  icon: LucideIcon;
  variant?: 'primary' | 'secondary';
  className?: string;
}

/**
 * Lumina Quick Action Card Component
 *
 * Professional action card following Lumina Design System v2.0:
 * - Primary variant for main actions (gradient background)
 * - Secondary variant for supporting actions (white background)
 * - Consistent hover animations and micro-interactions
 * - Perfect alignment with stat cards
 *
 * @param title - Action title (e.g., "Book Appointment")
 * @param description - Optional description text
 * @param href - Link destination
 * @param icon - Lucide icon component
 * @param variant - 'primary' for main actions, 'secondary' for others
 * @param className - Additional CSS classes
 */
const LuminaQuickActionCard = forwardRef<
  HTMLAnchorElement,
  LuminaQuickActionCardProps
>(
  (
    { title, description, href, icon: Icon, variant = 'secondary', className },
    ref
  ) => {
    return (
      <Link
        ref={ref}
        href={href}
        className={cn(
          'quick-action-card',
          {
            'quick-action-card-primary': variant === 'primary',
          },
          className
        )}
      >
        <div className="quick-action-icon-container">
          <Icon className="quick-action-icon" />
        </div>
        <div className="quick-action-content">
          <div className="quick-action-title">{title}</div>
          {description && (
            <div className="quick-action-description">{description}</div>
          )}
        </div>
      </Link>
    );
  }
);

LuminaQuickActionCard.displayName = 'LuminaQuickActionCard';

export { LuminaQuickActionCard };
export type { LuminaQuickActionCardProps };

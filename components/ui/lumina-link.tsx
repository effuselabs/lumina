'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { forwardRef } from 'react';

interface LuminaLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: 'action' | 'text';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

/**
 * Lumina Link Component
 *
 * Follows the official Lumina Product Design System v2.0 specifications:
 * - Action links: Lumina Gold color, transforms to Coral on hover
 * - Text links: Standard text color with underline on hover
 *
 * @param variant - 'action' for clickable actions, 'text' for inline text links
 * @param size - Link size following typography system
 * @param href - Link destination
 * @param children - Link content
 * @param className - Additional CSS classes
 */
const LuminaLink = forwardRef<HTMLAnchorElement, LuminaLinkProps>(
  (
    { variant = 'action', size = 'md', href, children, className, ...props },
    ref
  ) => {
    return (
      <Link
        ref={ref}
        href={href}
        className={cn(
          // Base styles
          'transition-all duration-200 ease-in-out',
          // Typography
          {
            'lumina-caption': size === 'sm',
            'lumina-body-small': size === 'md',
            'lumina-body-large': size === 'lg',
          },
          // Variant styles
          {
            'link-lumina-action': variant === 'action',
            'text-lumina-primary hover:text-lumina-coral hover:underline':
              variant === 'text',
          },
          className
        )}
        {...props}
      >
        {children}
      </Link>
    );
  }
);

LuminaLink.displayName = 'LuminaLink';

export { LuminaLink };
export type { LuminaLinkProps };

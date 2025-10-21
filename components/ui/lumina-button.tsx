'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface LuminaButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
}

/**
 * Lumina Button Component
 *
 * Follows the official Lumina Product Design System v2.0 specifications:
 * - Primary Button: Lumina Gold background with Deep Teal text, transforms to Coral on hover
 * - Secondary Button: White background with Deep Teal border, Soft Peach background on hover
 *
 * @param variant - 'primary' for main actions, 'secondary' for supporting actions
 * @param size - Button size following 8px spacing system
 * @param children - Button content
 * @param className - Additional CSS classes
 */
const LuminaButton = forwardRef<HTMLButtonElement, LuminaButtonProps>(
  (
    { variant = 'primary', size = 'md', children, className, asChild, ...props },
    ref
  ) => {
    return (
      <Button
        ref={ref}
        asChild={asChild}
        className={cn(
          // Base styles
          'font-semibold transition-all duration-200 ease-in-out',
          // Typography
          {
            'lumina-caption': size === 'sm',
            'lumina-body-small': size === 'md',
            'lumina-body-large': size === 'lg',
          },
          // Variant styles
          {
            'btn-lumina-primary': variant === 'primary',
            'btn-lumina-secondary': variant === 'secondary',
          },
          // Size styles
          {
            'px-3 py-1.5 text-xs': size === 'sm',
            'px-4 py-2 text-sm': size === 'md',
            'px-6 py-3 text-base': size === 'lg',
          },
          className
        )}
        {...(props as any)}
      >
        {children}
      </Button>
    );
  }
);

LuminaButton.displayName = 'LuminaButton';

export { LuminaButton };
export type { LuminaButtonProps };

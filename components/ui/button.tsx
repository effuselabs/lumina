import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';
import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';
import { Spinner } from './spinner';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100',
  {
    variants: {
      variant: {
        // Primary - Lumina Radiant Gradient matching dashboard
        primary: [
          'bg-gradient-to-r from-lumina-gold to-lumina-coral text-white shadow-md',
          'hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] motion-reduce:hover:scale-100 motion-reduce:active:scale-100',
          'focus-visible:ring-lumina-gold focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:from-neutral-400 disabled:to-neutral-400 disabled:shadow-none disabled:scale-100',
          // High contrast mode support
          'contrast-more:border-2 contrast-more:border-white',
        ],
        // Secondary - Deep Teal
        secondary: [
          'bg-deep-teal text-white shadow-md',
          'hover:bg-deep-teal/90 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] motion-reduce:hover:scale-100 motion-reduce:active:scale-100',
          'focus-visible:ring-deep-teal focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:bg-neutral-400 disabled:shadow-none disabled:scale-100',
          // High contrast mode support
          'contrast-more:border-2 contrast-more:border-white',
        ],
        // Outline - Lumina Gold border
        outline: [
          'border-2 border-lumina-gold bg-transparent text-lumina-gold',
          'hover:bg-lumina-gold hover:text-white hover:shadow-md hover:scale-[1.02] active:scale-[0.98] motion-reduce:hover:scale-100 motion-reduce:active:scale-100',
          'focus-visible:ring-lumina-gold focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:border-neutral-400 disabled:text-neutral-400 disabled:hover:bg-transparent disabled:hover:text-neutral-400 disabled:scale-100',
          // High contrast mode support
          'contrast-more:border-4',
        ],
        // Ghost - Subtle hover with Lumina colors
        ghost: [
          'bg-transparent text-neutral-700 dark:text-neutral-300',
          'hover:bg-lumina-gold/10 hover:text-lumina-gold hover:scale-[1.02] active:scale-[0.98] motion-reduce:hover:scale-100 motion-reduce:active:scale-100',
          'focus-visible:ring-lumina-gold focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:text-neutral-400 disabled:hover:bg-transparent disabled:hover:text-neutral-400 disabled:scale-100',
          // High contrast mode support
          'contrast-more:border-2 contrast-more:border-current',
        ],
        // Destructive - Error color
        destructive: [
          'bg-red-600 text-white shadow-md',
          'hover:bg-red-700 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] motion-reduce:hover:scale-100 motion-reduce:active:scale-100',
          'focus-visible:ring-red-600 focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:bg-neutral-400 disabled:shadow-none disabled:scale-100',
          // High contrast mode support
          'contrast-more:border-2 contrast-more:border-white',
        ],
        // Link - Text-only style
        link: [
          'text-lumina-gold underline-offset-4 bg-transparent shadow-none p-0 h-auto',
          'hover:underline hover:text-lumina-coral',
          'focus-visible:ring-lumina-gold focus-visible:ring-2 focus-visible:ring-offset-1',
          'disabled:text-neutral-400 disabled:no-underline',
          // High contrast mode support
          'contrast-more:underline',
        ],
      },
      size: {
        sm: 'h-8 px-3 text-xs rounded-md min-w-[2rem]',
        default: 'h-10 px-4 text-sm rounded-md min-w-[2.5rem]',
        lg: 'h-12 px-6 text-base rounded-lg min-w-[3rem]',
        icon: 'h-10 w-10 p-0 min-w-[2.5rem]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-haspopup'?: boolean | 'false' | 'true' | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant,
    size,
    asChild = false,
    loading = false,
    icon,
    children,
    disabled,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    'aria-expanded': ariaExpanded,
    'aria-haspopup': ariaHasPopup,
    ...props
  }, ref) => {
    const Comp = asChild ? Slot : 'button';
    const isDisabled = disabled || loading;

    // Generate accessible label for icon-only buttons
    const accessibleLabel = ariaLabel || (size === 'icon' && !children ? 'Button' : undefined);

    // Determine if we need to announce loading state
    const loadingAnnouncement = loading ? 'Loading' : undefined;

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-label={accessibleLabel}
        aria-describedby={ariaDescribedBy}
        aria-expanded={ariaExpanded}
        aria-haspopup={ariaHasPopup}
        aria-busy={loading}
        role={asChild ? undefined : 'button'}
        tabIndex={isDisabled ? -1 : 0}
        {...props}
      >
        {loading ? (
          <>
            <Spinner
              size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'default'}
              className="text-current"
              aria-hidden="true"
            />
            <span className="opacity-70" aria-live="polite" aria-atomic="true">
              {children}
            </span>
            {loadingAnnouncement && (
              <span className="sr-only" aria-live="assertive">
                {loadingAnnouncement}
              </span>
            )}
          </>
        ) : (
          <>
            {icon && (
              <span className="flex-shrink-0" aria-hidden="true">
                {icon}
              </span>
            )}
            {children}
          </>
        )}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };


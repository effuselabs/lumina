'use client';

// Removed design-system-error-handling imports as they were causing interference
import { Slot, Slottable } from '@radix-ui/react-slot';
import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';
import { shallowEqual } from '../../lib/performance-utils';
import { cn } from '../../lib/utils';
import { Spinner } from './spinner';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden contain-layout',
  {
    variants: {
      variant: {
        // Primary - Lumina Radiant Gradient using CSS custom properties.
        // Deep teal text, never white: white on the gradient's coral end is
        // 2.57:1, the prohibited pair in lib/design/tokens.ts. Deep teal is
        // 5.81:1 there and higher on gold. __tests__/components/button.test.ts
        // holds this.
        primary: [
          'bg-lumina-radiant text-primary-foreground font-semibold shadow-md',
          'hover:bg-lumina-radiant-hover hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200',
          'focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:bg-neutral-400 dark:disabled:bg-neutral-600 disabled:shadow-none disabled:scale-100 disabled:cursor-not-allowed disabled:hover:bg-neutral-400 dark:disabled:hover:bg-neutral-600',
          // High contrast mode support
          'contrast-more:border-2 contrast-more:border-white',
          // Performance optimizations
          'gpu-accelerated optimize-repaint',
        ],
        // Secondary - Deep Teal using CSS custom properties
        secondary: [
          'bg-secondary text-secondary-foreground shadow-md',
          'hover:bg-secondary/90 hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200',
          'focus-visible:ring-secondary focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:bg-neutral-400 dark:disabled:bg-neutral-600 disabled:text-neutral-500 dark:disabled:text-neutral-400 disabled:shadow-none disabled:scale-100 disabled:cursor-not-allowed',
          // High contrast mode support
          'contrast-more:border-2 contrast-more:border-white',
          // Performance optimizations
          'gpu-accelerated optimize-repaint',
        ],
        // Outline - Fixed visibility with proper contrast
        outline: [
          'border-2 bg-transparent shadow-sm',
          'border-foreground text-foreground',
          'hover:bg-foreground hover:text-background',
          'hover:shadow-md hover:scale-105 active:scale-95',
          'focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:border-muted-foreground disabled:text-muted-foreground disabled:hover:bg-transparent disabled:scale-100 disabled:cursor-not-allowed',
        ],
        // Ghost - Fixed visibility with proper contrast
        ghost: [
          'bg-transparent shadow-none',
          'text-foreground',
          'hover:bg-foreground/10',
          'hover:scale-105 active:scale-95',
          'focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:text-muted-foreground disabled:hover:bg-transparent disabled:scale-100 disabled:cursor-not-allowed',
        ],
        // Destructive - Error color using CSS custom properties
        destructive: [
          'bg-destructive text-destructive-foreground shadow-md',
          'hover:bg-destructive/90 hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200',
          'focus-visible:ring-destructive focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:bg-neutral-400 dark:disabled:bg-neutral-600 disabled:text-neutral-500 dark:disabled:text-neutral-400 disabled:shadow-none disabled:scale-100 disabled:cursor-not-allowed',
          // High contrast mode support
          'contrast-more:border-2 contrast-more:border-white',
          // Performance optimizations
          'gpu-accelerated optimize-repaint',
        ],
        // Link - Fixed visibility with proper contrast
        link: [
          'underline-offset-4 bg-transparent shadow-none p-0 h-auto underline decoration-2',
          'text-foreground hover:text-foreground/80',
          // Gold reads well on dark (about 12:1); on white it is 1.44:1.
          'dark:text-brand-gold dark:hover:text-brand-gold/80',
          'hover:decoration-4',
          'focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-1',
          'disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed',
        ],
        // Premium Glass - Glassmorphism effect with theme-aware styling
        'premium-glass': [
          'bg-transparent backdrop-blur-md border-2 shadow-lg',
          'border-white/20 text-white dark:border-white/30 dark:text-white',
          'hover:bg-white/10 hover:border-white/30 dark:hover:bg-white/20 dark:hover:border-white/40',
          'hover:shadow-xl hover:scale-105 active:scale-95',
          'focus-visible:ring-white/50 focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:bg-transparent disabled:border-white/10 disabled:text-white/50 disabled:backdrop-blur-none disabled:scale-100 disabled:cursor-not-allowed',
          // Performance optimizations
          'gpu-accelerated optimize-repaint transition-all-smooth',
        ],
        // Premium Glow - Enhanced glow effect with theme-specific colors
        'premium-glow': [
          'bg-lumina-radiant text-primary-foreground shadow-lg border-0',
          'hover:shadow-xl hover:scale-105 active:scale-95',
          'focus-visible:ring-lumina-gold focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:bg-neutral-400 dark:disabled:bg-neutral-600 disabled:shadow-none disabled:scale-100 disabled:cursor-not-allowed',
          // Performance optimizations
          'gpu-accelerated optimize-repaint transition-all-smooth',
          // Theme-aware glow effects (handled by CSS classes)
          'btn-premium-glow',
        ],
        // Premium Floating - Elevated floating effect
        'premium-floating': [
          'bg-surface text-ink-brand shadow-xl border border-white/20',
          'dark:bg-neutral-900 dark:text-white dark:border-neutral-700',
          'hover:shadow-2xl hover:scale-105 active:scale-95',
          'focus-visible:ring-lumina-gold focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:bg-neutral-100 disabled:text-neutral-400 disabled:shadow-md disabled:scale-100 disabled:cursor-not-allowed',
          'dark:disabled:bg-neutral-800 dark:disabled:text-neutral-600',
          // Performance optimizations
          'gpu-accelerated optimize-repaint transition-all-smooth',
          // Floating effect (handled by CSS classes)
          'btn-premium-floating',
        ],
      },
      size: {
        sm: 'h-8 px-3 text-xs rounded-md min-w-[2rem]',
        default: 'h-10 px-4 text-sm rounded-md min-w-[2.5rem]',
        lg: 'h-12 px-6 text-base rounded-lg min-w-[3rem]',
        xl: 'h-14 px-8 text-lg rounded-lg min-w-[3.5rem]',
        icon: 'h-10 w-10 p-0 min-w-[2.5rem]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
);

interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render as a child component using Radix Slot */
  asChild?: boolean;
  /** Show loading state with spinner */
  loading?: boolean;
  /** Icon to display alongside button text */
  icon?: React.ReactNode;
  /** Animation type for hover interactions */
  animation?: 'hover-lift' | 'hover-glow' | 'hover-scale' | 'none';
  /** Accessible label for screen readers */
  'aria-label'?: string;
  /** ID of element that describes this button */
  'aria-describedby'?: string;
  /** Whether the button controls an expanded element */
  'aria-expanded'?: boolean;
  /** Type of popup controlled by this button */
  'aria-haspopup'?:
    | boolean
    | 'false'
    | 'true'
    | 'menu'
    | 'listbox'
    | 'tree'
    | 'grid'
    | 'dialog';
  /** Whether the button controls a pressed state */
  'aria-pressed'?: boolean | 'false' | 'true' | 'mixed';
  /** Whether the button is currently selected */
  'aria-selected'?: boolean;
  /** Position in a set of buttons */
  'aria-posinset'?: number;
  /** Total number of buttons in the set */
  'aria-setsize'?: number;
}

const ButtonComponent = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      icon,
      animation,
      children,
      disabled,
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
      'aria-expanded': ariaExpanded,
      'aria-haspopup': ariaHasPopup,
      'aria-pressed': ariaPressed,
      'aria-selected': ariaSelected,
      'aria-posinset': ariaPosInSet,
      'aria-setsize': ariaSetSize,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';
    const isDisabled = disabled || loading;

    // Generate accessible label for icon-only buttons
    const accessibleLabel =
      ariaLabel || (size === 'icon' && !children ? 'Button' : undefined);

    // Determine if we need to announce loading state
    const loadingAnnouncement = loading ? 'Loading' : undefined;

    // Build class names with proper fallbacks
    const animationClass =
      animation && animation !== 'none'
        ? `btn-animation-${animation.replace('hover-', '')}`
        : '';
    const buttonClassName = cn(
      buttonVariants({ variant, size }),
      animationClass,
      className
    );

    // Removed design token validation that was causing interference with styling

    // Performance optimization: Mark animation start/end
    React.useEffect(() => {
      if (typeof window !== 'undefined' && typeof performance !== 'undefined') {
        performance.mark('button-render-start');

        return () => {
          performance.mark('button-render-end');
          try {
            performance.measure(
              'button-render',
              'button-render-start',
              'button-render-end'
            );
          } catch {
            // Ignore measurement errors
          }
        };
      }
      return undefined;
    }, []);

    return (
      <Comp
        className={buttonClassName}
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-label={accessibleLabel}
        aria-describedby={ariaDescribedBy}
        aria-expanded={ariaExpanded}
        aria-haspopup={ariaHasPopup}
        aria-pressed={ariaPressed}
        aria-selected={ariaSelected}
        aria-posinset={ariaPosInSet}
        aria-setsize={ariaSetSize}
        aria-busy={loading}
        role={asChild ? undefined : 'button'}
        tabIndex={isDisabled ? -1 : 0}
        data-variant={variant}
        data-size={size}
        data-loading={loading}
        {...props}
      >
        {asChild ? (
          // Slot merges these props into its one child. Wrapped in a
          // fragment, the child was the fragment, which cannot take a
          // className, so every link styled as a button rendered as plain
          // text (#97). The children reach Slot as an array, with Slottable
          // marking the real child; the icon renders inside it.
          [
            icon && (
              <span key="icon" className="flex-shrink-0" aria-hidden="true">
                {icon}
              </span>
            ),
            <Slottable key="child">{children}</Slottable>,
          ]
        ) : loading ? (
          <>
            <Spinner
              size={
                size === 'sm'
                  ? 'sm'
                  : size === 'lg'
                    ? 'lg'
                    : size === 'xl'
                      ? 'xl'
                      : 'default'
              }
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

ButtonComponent.displayName = 'ButtonComponent';

// Memoized version with custom comparison
const MemoizedButton = React.memo(ButtonComponent, (prevProps, nextProps) => {
  const result = shallowEqual(
    {
      variant: prevProps.variant,
      size: prevProps.size,
      loading: prevProps.loading,
      disabled: prevProps.disabled,
      className: prevProps.className,
      children: prevProps.children,
    },
    {
      variant: nextProps.variant,
      size: nextProps.size,
      loading: nextProps.loading,
      disabled: nextProps.disabled,
      className: nextProps.className,
      children: nextProps.children,
    }
  );
  return result;
});

MemoizedButton.displayName = 'MemoizedButton';

// Export the memoized button directly without wrapper
const Button = MemoizedButton;

export { Button, buttonVariants };

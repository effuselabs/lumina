'use client';

import {
  designTokenValidator,
  developmentWarnings
} from '@/lib/design-system-error-handling';
import { Slot } from '@radix-ui/react-slot';
import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';
import { shallowEqual } from '../../lib/performance-utils';
import { cn } from '../../lib/utils';
import { SafeComponentWrapper } from './safe-component-wrapper';
import { Spinner } from './spinner';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden contain-layout',
  {
    variants: {
      variant: {
        // Primary - Lumina Radiant Gradient using CSS custom properties
        primary: [
          'bg-lumina-radiant text-white shadow-md',
          'hover:bg-lumina-radiant-hover hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200',
          'focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:bg-neutral-400 disabled:shadow-none disabled:scale-100 disabled:cursor-not-allowed disabled:hover:bg-neutral-400',
          // Enhanced text readability with shadow
          '[text-shadow:0_1px_2px_rgba(0,0,0,0.3)]',
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
          'disabled:bg-neutral-400 disabled:text-neutral-500 disabled:shadow-none disabled:scale-100 disabled:cursor-not-allowed',
          // High contrast mode support
          'contrast-more:border-2 contrast-more:border-white',
          // Performance optimizations
          'gpu-accelerated optimize-repaint',
        ],
        // Outline - Primary color border using CSS custom properties
        outline: [
          'border-2 border-primary bg-transparent text-primary',
          'hover:bg-primary hover:text-primary-foreground hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200',
          'focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:border-neutral-400 disabled:text-neutral-400 disabled:hover:bg-transparent disabled:hover:text-neutral-400 disabled:scale-100 disabled:cursor-not-allowed',
          // High contrast mode support
          'contrast-more:border-4',
          // Performance optimizations
          'gpu-accelerated optimize-repaint',
        ],
        // Ghost - Subtle hover with primary colors
        ghost: [
          'bg-transparent text-secondary',
          'hover:bg-primary/10 hover:text-primary active:bg-primary/20 hover:scale-105 active:scale-95 transition-all duration-200',
          'focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:text-neutral-500 disabled:hover:bg-transparent disabled:hover:text-neutral-500 disabled:scale-100 disabled:cursor-not-allowed',
          // High contrast mode support
          'contrast-more:border-2 contrast-more:border-current',
          // Performance optimizations
          'gpu-accelerated optimize-repaint',
        ],
        // Destructive - Error color using CSS custom properties
        destructive: [
          'bg-destructive text-destructive-foreground shadow-md',
          'hover:bg-destructive/90 hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200',
          'focus-visible:ring-destructive focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:bg-neutral-400 disabled:text-neutral-500 disabled:shadow-none disabled:scale-100 disabled:cursor-not-allowed',
          // High contrast mode support
          'contrast-more:border-2 contrast-more:border-white',
          // Performance optimizations
          'gpu-accelerated optimize-repaint',
        ],
        // Link - Text-only style using secondary colors for better contrast
        link: [
          'text-secondary underline-offset-4 bg-transparent shadow-none p-0 h-auto',
          'hover:underline hover:text-secondary/80 transition-colors duration-200',
          'focus-visible:ring-secondary focus-visible:ring-2 focus-visible:ring-offset-1',
          'disabled:text-neutral-400 disabled:no-underline disabled:cursor-not-allowed',
          // High contrast mode support
          'contrast-more:underline',
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

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  /** Render as a child component using Radix Slot */
  asChild?: boolean;
  /** Show loading state with spinner */
  loading?: boolean;
  /** Icon to display alongside button text */
  icon?: React.ReactNode;
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
    const buttonClassName = cn(
      buttonVariants({ variant, size }),
      className
    );

    // Validate required design tokens and accessibility in development
    React.useEffect(() => {
      if (process.env.NODE_ENV === 'development') {
        const requiredTokens = [
          '--color-primary',
          '--color-primary-foreground',
          '--lumina-radiant-gradient',
        ];
        designTokenValidator.warnMissingTokens(requiredTokens, 'Button');

        // Warn about accessibility issues
        if (size === 'icon' && !ariaLabel && !children) {
          developmentWarnings.warnMissingAccessibility(
            'Button',
            'Icon buttons should have an aria-label for accessibility'
          );
        }
      }
    }, [size, ariaLabel, children]);

    // Performance optimization: Mark animation start/end
    React.useEffect(() => {
      if (typeof window !== 'undefined' && typeof performance !== 'undefined') {
        performance.mark('button-render-start');

        return () => {
          performance.mark('button-render-end');
          try {
            performance.measure('button-render', 'button-render-start', 'button-render-end');
          } catch {
            // Ignore measurement errors
          }
        };
      }
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
        data-testid="button"
        data-variant={variant}
        data-size={size}
        data-loading={loading}
        {...props}
      >
        {loading ? (
          <>
            <Spinner
              size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : size === 'xl' ? 'xl' : 'default'}
              className="text-current"
              aria-hidden="true"
            />
            <span
              className="opacity-70"
              aria-live="polite"
              aria-atomic="true"
            >
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
  return shallowEqual(
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
});

MemoizedButton.displayName = 'MemoizedButton';

// Safe Button with error boundary
const Button = (props: ButtonProps) => {
  const fallbackButton = (
    <button
      className="ds-fallback-button"
      disabled={props.disabled || props.loading}
      aria-label={props['aria-label'] || 'Button (fallback)'}
      data-testid="button-fallback"
    >
      {props.children || 'Button'}
    </button>
  );

  return (
    <SafeComponentWrapper
      componentName="Button"
      requiredTokens={[
        '--color-primary',
        '--color-primary-foreground',
        '--lumina-radiant-gradient',
        '--color-secondary',
        '--color-secondary-foreground',
      ]}
      fallback={fallbackButton}
    >
      <MemoizedButton {...props} />
    </SafeComponentWrapper>
  );
};

Button.displayName = 'Button';

export { Button, buttonVariants };


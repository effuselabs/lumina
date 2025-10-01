'use client';

// Removed design-system-error-handling imports as they were causing interference
import { Slot } from '@radix-ui/react-slot';
import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';
import { shallowEqual } from '../../lib/performance-utils';
import { cn } from '../../lib/utils';
import { Spinner } from './spinner';

// CRITICAL: Add CSS-in-JS styles for problematic variants
const buttonStyles = `
  /* Force Outline Button visibility on light theme - MAXIMUM SPECIFICITY */
  button[data-variant="outline"][data-testid="button"] {
    border: 2px solid #000000 !important;
    border-color: #000000 !important;
    border-style: solid !important;
    border-width: 2px !important;
    color: #000000 !important;
    background-color: transparent !important;
    background: transparent !important;
  }
  button[data-variant="outline"][data-testid="button"]:hover {
    background-color: #000000 !important;
    background: #000000 !important;
    color: #ffffff !important;
    border-color: #000000 !important;
  }
  
  /* Additional specificity - try multiple selectors */
  .lumina-component button[data-variant="outline"][data-testid="button"] {
    border: 2px solid #000000 !important;
    color: #000000 !important;
    background-color: transparent !important;
  }
  
  /* Even more specific - target the exact component */
  [data-testid="button"][data-variant="outline"] {
    border: 2px solid #000000 !important;
    color: #000000 !important;
    background-color: transparent !important;
  }

  /* Force Ghost Button visibility on light theme */
  button[data-variant="ghost"][data-testid="button"] {
    color: #000000 !important;
  }
  button[data-variant="ghost"][data-testid="button"]:hover {
    background-color: rgba(0, 0, 0, 0.1) !important;
    color: #000000 !important;
  }
  
  /* Force Link Button visibility on light theme */
  button[data-variant="link"][data-testid="button"] {
    color: #1d4ed8 !important;
    text-decoration: underline !important;
    text-decoration-color: #1d4ed8 !important;
  }
  button[data-variant="link"][data-testid="button"]:hover {
    color: #1e40af !important;
    text-decoration-color: #1e40af !important;
  }
  
  /* Dark theme overrides */
  .dark button[data-variant="outline"][data-testid="button"] {
    border-color: #ffffff !important;
    color: #ffffff !important;
  }
  .dark button[data-variant="outline"][data-testid="button"]:hover {
    background-color: #ffffff !important;
    color: #000000 !important;
    border-color: #ffffff !important;
  }
  .dark button[data-variant="ghost"][data-testid="button"] {
    color: #ffffff !important;
  }
  .dark button[data-variant="ghost"][data-testid="button"]:hover {
    background-color: rgba(255, 255, 255, 0.1) !important;
    color: #ffffff !important;
  }
  .dark button[data-variant="link"][data-testid="button"] {
    color: #FFD25A !important;
    text-decoration-color: #FFD25A !important;
  }
  .dark button[data-variant="link"][data-testid="button"]:hover {
    color: #FFD25ACC !important;
    text-decoration-color: #FFD25ACC !important;
  }
  
  /* REFINED Primary Button text - Elegant white text with subtle shadow */
  /* Multiple selectors to catch all primary button instances */
  button[data-variant="primary"][data-testid="button"],
  button[data-testid="button"]:not([data-variant]),
  button[data-testid="button"][data-variant="primary"] {
    color: #ffffff !important;  /* Clean white text - classic and elegant */
    text-shadow: 
      0 1px 2px rgba(0, 0, 0, 0.4),     /* Subtle dark shadow for definition */
      0 2px 4px rgba(0, 0, 0, 0.2) !important;  /* Light depth shadow */
    font-weight: 600 !important;  /* Medium-bold for clarity without heaviness */
    -webkit-font-smoothing: antialiased !important;
    -moz-osx-font-smoothing: grayscale !important;
    letter-spacing: 0.015em !important; /* Subtle spacing for elegance */
  }
  
  /* Refined hover state with slightly enhanced shadow */
  button[data-variant="primary"][data-testid="button"]:hover,
  button[data-testid="button"]:not([data-variant]):hover,
  button[data-testid="button"][data-variant="primary"]:hover {
    color: #ffffff !important;  /* Keep white text on hover */
    text-shadow: 
      0 1px 3px rgba(0, 0, 0, 0.5),     /* Slightly stronger shadow on hover */
      0 2px 6px rgba(0, 0, 0, 0.25) !important;  /* Enhanced depth */
  }
  
  /* Additional catch-all for any primary buttons with gradient background */
  button[data-testid="button"].bg-lumina-radiant,
  button[data-testid="button"][class*="bg-lumina-radiant"] {
    color: #ffffff !important;
    text-shadow: 
      0 1px 2px rgba(0, 0, 0, 0.4),
      0 2px 4px rgba(0, 0, 0, 0.2) !important;
    font-weight: 600 !important;
    -webkit-font-smoothing: antialiased !important;
    -moz-osx-font-smoothing: grayscale !important;
    letter-spacing: 0.015em !important;
  }
`;

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
        // Outline - Fixed visibility with proper contrast
        outline: [
          'border-2 bg-transparent shadow-sm',
          'border-foreground/30 text-foreground',
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
          'disabled:bg-neutral-400 disabled:text-neutral-500 disabled:shadow-none disabled:scale-100 disabled:cursor-not-allowed',
          // High contrast mode support
          'contrast-more:border-2 contrast-more:border-white',
          // Performance optimizations
          'gpu-accelerated optimize-repaint',
        ],
        // Link - Fixed visibility with proper contrast
        link: [
          'underline-offset-4 bg-transparent shadow-none p-0 h-auto underline decoration-2',
          'text-primary hover:text-primary/80',
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
          'bg-lumina-radiant text-white shadow-lg border-0',
          'hover:shadow-xl hover:scale-105 active:scale-95',
          'focus-visible:ring-lumina-gold focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:bg-neutral-400 disabled:shadow-none disabled:scale-100 disabled:cursor-not-allowed',
          // Enhanced text readability
          '[text-shadow:0_1px_2px_rgba(0,0,0,0.4)]',
          // Performance optimizations
          'gpu-accelerated optimize-repaint transition-all-smooth',
          // Theme-aware glow effects (handled by CSS classes)
          'btn-premium-glow',
        ],
        // Premium Floating - Elevated floating effect
        'premium-floating': [
          'bg-white text-deep-teal shadow-xl border border-white/20',
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

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
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
    // Inject CSS styles for problematic variants
    React.useEffect(() => {
      if (typeof window !== 'undefined') {
        const styleId = 'button-variant-fixes';
        let styleElement = document.getElementById(styleId) as HTMLStyleElement;

        if (!styleElement) {
          styleElement = document.createElement('style');
          styleElement.id = styleId;
          styleElement.textContent = buttonStyles;
          document.head.appendChild(styleElement);
        }
      }
    }, []);
    const Comp = asChild ? Slot : 'button';
    const isDisabled = disabled || loading;

    // Generate accessible label for icon-only buttons
    const accessibleLabel =
      ariaLabel || (size === 'icon' && !children ? 'Button' : undefined);

    // Determine if we need to announce loading state
    const loadingAnnouncement = loading ? 'Loading' : undefined;

    // Build class names with proper fallbacks
    const animationClass = animation && animation !== 'none' ? `btn-animation-${animation.replace('hover-', '')}` : '';
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

// Export the memoized button directly without wrapper
const Button = MemoizedButton;

export { Button, buttonVariants };


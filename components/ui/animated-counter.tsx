'use client';

import {
  easingFunctions,
  useCountUp,
  useCurrencyCountUp,
  useIntegerCountUp,
  usePercentageCountUp,
} from '@/hooks/use-count-up';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';
import { cn } from '@/lib/utils';
import * as React from 'react';

export interface AnimatedCounterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The target number to count up to */
  value: number;
  /** Starting value (default: 0) */
  startValue?: number;
  /** Animation duration in milliseconds (default: 2000) */
  duration?: number;
  /** Number format type */
  format?: 'integer' | 'currency' | 'percentage' | 'decimal' | 'custom';
  /** Number of decimal places (for decimal format) */
  decimals?: number;
  /** Custom prefix (e.g., '$', '+') */
  prefix?: string;
  /** Custom suffix (e.g., '%', 'K', 'M') */
  suffix?: string;
  /** Thousands separator (default: ',') */
  separator?: string;
  /** Custom formatter function */
  formatter?: (value: number) => string;
  /** Easing function type */
  easing?: 'linear' | 'easeOut' | 'easeInOut' | 'easeOutQuart' | 'easeOutExpo';
  /** Icon to display alongside the counter */
  icon?: React.ReactNode;
  /** Icon position */
  iconPosition?: 'left' | 'right' | 'top' | 'bottom';
  /** Label text */
  label?: string;
  /** Label position */
  labelPosition?: 'top' | 'bottom' | 'left' | 'right';
  /** Size variant */
  size?: 'sm' | 'default' | 'lg' | 'xl';
  /** Color variant */
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  /** Enable scroll-triggered animation */
  triggerOnScroll?: boolean;
  /** Animation delay in milliseconds */
  delay?: number;
  /** Show visual progress indicator */
  showProgress?: boolean;
  /** Progress bar color */
  progressColor?: string;
  /** Callback when animation completes */
  onComplete?: () => void;
  /** Whether to preserve value on re-render */
  preserveValue?: boolean;
}

const AnimatedCounter = React.forwardRef<HTMLDivElement, AnimatedCounterProps>(
  (
    {
      className,
      value,
      startValue = 0,
      duration = 2000,
      format = 'integer',
      decimals = 0,
      prefix = '',
      suffix = '',
      separator = ',',
      formatter,
      easing = 'easeOut',
      icon,
      iconPosition = 'left',
      label,
      labelPosition = 'bottom',
      size = 'default',
      variant = 'default',
      triggerOnScroll = true,
      delay = 0,
      showProgress = false,
      progressColor,
      onComplete,
      preserveValue = false,
      ...props
    },
    ref
  ) => {
    // Intersection observer for scroll-triggered animation
    const { ref: intersectionRef, isIntersecting } = useIntersectionObserver({
      threshold: 0.1,
      triggerOnce: true,
      delay,
    });

    // Combine refs
    const combinedRef = React.useCallback(
      (node: HTMLDivElement) => {
        if (ref) {
          if (typeof ref === 'function') {
            ref(node);
          } else {
            (ref as React.MutableRefObject<HTMLDivElement | null>).current =
              node;
          }
        }
        if (intersectionRef) {
          (
            intersectionRef as React.MutableRefObject<HTMLElement | null>
          ).current = node;
        }
      },
      [ref, intersectionRef]
    );

    // Select appropriate count-up hook based on format
    const countUpOptions = React.useMemo(
      () => ({
        start: startValue,
        end: value,
        duration,
        decimals,
        prefix,
        suffix,
        separator,
        formatter,
        easing: easingFunctions[easing],
        onComplete,
        preserveValue,
      }),
      [
        startValue,
        value,
        duration,
        decimals,
        prefix,
        suffix,
        separator,
        formatter,
        easing,
        onComplete,
        preserveValue,
      ]
    );

    const currencyCountUp = useCurrencyCountUp(value, {
      start: startValue,
      duration,
      easing: easingFunctions[easing],
      onComplete,
      preserveValue,
    });

    const percentageCountUp = usePercentageCountUp(value, {
      start: startValue,
      duration,
      decimals,
      easing: easingFunctions[easing],
      onComplete,
      preserveValue,
    });

    const integerCountUp = useIntegerCountUp(value, {
      start: startValue,
      duration,
      prefix,
      suffix,
      separator,
      easing: easingFunctions[easing],
      onComplete,
      preserveValue,
    });

    const customCountUp = useCountUp(countUpOptions);

    // Select the appropriate counter based on format
    const counter = React.useMemo(() => {
      switch (format) {
        case 'currency':
          return currencyCountUp;
        case 'percentage':
          return percentageCountUp;
        case 'integer':
          return integerCountUp;
        case 'decimal':
        case 'custom':
        default:
          return customCountUp;
      }
    }, [
      format,
      currencyCountUp,
      percentageCountUp,
      integerCountUp,
      customCountUp,
    ]);

    // Start animation when in view or immediately if not scroll-triggered
    const [hasStarted, setHasStarted] = React.useState(false);

    React.useEffect(() => {
      if (hasStarted) return; // Prevent multiple starts

      if (triggerOnScroll) {
        if (isIntersecting) {
          counter.start();
          setHasStarted(true);
        }
      } else {
        counter.start();
        setHasStarted(true);
      }
    }, [isIntersecting, triggerOnScroll, counter, hasStarted]);

    // Calculate progress for progress bar
    const progress = React.useMemo(() => {
      if (!showProgress) return 0;

      const currentNumericValue = parseFloat(
        counter.value.replace(/[^0-9.-]/g, '')
      );
      const range = value - startValue;
      const currentProgress =
        ((currentNumericValue - startValue) / range) * 100;

      return Math.min(Math.max(currentProgress, 0), 100);
    }, [counter.value, value, startValue, showProgress]);

    // Size classes
    const sizeClasses = {
      sm: 'text-lg',
      default: 'text-2xl',
      lg: 'text-3xl',
      xl: 'text-4xl',
    };

    // Variant classes
    const variantClasses = {
      default: 'text-foreground',
      primary: 'text-lumina-gold',
      success: 'text-success',
      warning: 'text-warning',
      error: 'text-error',
      info: 'text-info',
    };

    // Label size classes
    const labelSizeClasses = {
      sm: 'text-xs',
      default: 'text-sm',
      lg: 'text-base',
      xl: 'text-lg',
    };

    // Icon size classes
    const iconSizeClasses = {
      sm: 'w-4 h-4',
      default: 'w-5 h-5',
      lg: 'w-6 h-6',
      xl: 'w-8 h-8',
    };

    const renderIcon = () => {
      if (!icon) return null;

      return (
        <div
          className={cn(
            'animated-counter-icon flex-shrink-0',
            iconSizeClasses[size],
            variantClasses[variant]
          )}
        >
          {icon}
        </div>
      );
    };

    const renderLabel = () => {
      if (!label) return null;

      return (
        <div
          className={cn(
            'animated-counter-label font-medium text-muted-foreground',
            labelSizeClasses[size]
          )}
        >
          {label}
        </div>
      );
    };

    const renderProgress = () => {
      if (!showProgress) return null;

      return (
        <div className="animated-counter-progress mt-2 h-1 w-full rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className={cn(
              'h-1 rounded-full transition-all duration-300 ease-out',
              progressColor || 'bg-lumina-radiant'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      );
    };

    const renderContent = () => {
      const counterValue = (
        <span
          className={cn(
            'animated-counter-value font-bold tabular-nums',
            sizeClasses[size],
            variantClasses[variant],
            counter.isAnimating && 'stat-card-value-counting'
          )}
        >
          {counter.value}
        </span>
      );

      // Arrange icon and counter based on iconPosition
      if (iconPosition === 'left') {
        return (
          <div className="flex items-center space-x-2">
            {renderIcon()}
            {counterValue}
          </div>
        );
      }

      if (iconPosition === 'right') {
        return (
          <div className="flex items-center space-x-2">
            {counterValue}
            {renderIcon()}
          </div>
        );
      }

      if (iconPosition === 'top') {
        return (
          <div className="flex flex-col items-center space-y-1">
            {renderIcon()}
            {counterValue}
          </div>
        );
      }

      if (iconPosition === 'bottom') {
        return (
          <div className="flex flex-col items-center space-y-1">
            {counterValue}
            {renderIcon()}
          </div>
        );
      }

      return counterValue;
    };

    return (
      <div
        ref={combinedRef}
        className={cn(
          // Base styles
          'animated-counter',
          'flex flex-col items-center justify-center',
          'transition-all duration-300 ease-out',
          // Performance optimizations
          'gpu-accelerated optimize-repaint',
          // Animation state
          counter.isAnimating && 'animating',
          className
        )}
        data-testid="animated-counter"
        data-format={format}
        data-size={size}
        data-variant={variant}
        data-animating={counter.isAnimating}
        {...props}
      >
        {/* Label (top position) */}
        {labelPosition === 'top' && renderLabel()}

        {/* Main content area */}
        <div
          className={cn(
            'animated-counter-content',
            labelPosition === 'left' && 'flex items-center space-x-3',
            labelPosition === 'right' &&
              'flex flex-row-reverse items-center space-x-3'
          )}
        >
          {/* Label (left position) */}
          {labelPosition === 'left' && renderLabel()}

          {/* Counter and icon */}
          {renderContent()}

          {/* Label (right position) */}
          {labelPosition === 'right' && renderLabel()}
        </div>

        {/* Progress bar */}
        {renderProgress()}

        {/* Label (bottom position) */}
        {labelPosition === 'bottom' && renderLabel()}
      </div>
    );
  }
);

AnimatedCounter.displayName = 'AnimatedCounter';

export { AnimatedCounter };

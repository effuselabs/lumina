import { cn } from '@/lib/utils';
import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';
import { shallowEqual, usePerformanceMonitor } from '../../lib/performance-utils';

const spinnerVariants = cva(
    'animate-lumina-spin rounded-full border-solid border-current border-r-transparent motion-reduce:animate-lumina-pulse-subtle',
    {
        variants: {
            size: {
                sm: 'h-4 w-4 border-2',
                default: 'h-5 w-5 border-2',
                lg: 'h-6 w-6 border-2',
                xl: 'h-8 w-8 border-3',
            },
            variant: {
                default: '',
                slow: 'animate-lumina-spin-slow motion-reduce:animate-lumina-pulse-subtle',
                pulse: 'animate-lumina-pulse border-transparent bg-current rounded-full',
                dots: 'animate-lumina-typing border-transparent bg-current rounded-full',
            },
        },
        defaultVariants: {
            size: 'default',
            variant: 'default',
        },
    }
);

export interface SpinnerProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
    'aria-label'?: string;
}

const Spinner = React.memo(React.forwardRef<HTMLDivElement, SpinnerProps>(
    ({ className, size, variant, 'aria-label': ariaLabel = 'Loading', ...props }, ref) => {
        // Performance monitoring
        const { trackPropsChange } = usePerformanceMonitor('Spinner');
        trackPropsChange({ size, variant, className });
        // For dots variant, render three dots
        if (variant === 'dots') {
            return (
                <div
                    ref={ref}
                    className="flex items-center gap-1"
                    aria-label={ariaLabel}
                    role="status"
                    {...props}
                >
                    <div className={cn(spinnerVariants({ size, variant, className }))} />
                    <div className={cn(spinnerVariants({ size, variant, className }), 'animation-delay-150')} />
                    <div className={cn(spinnerVariants({ size, variant, className }), 'animation-delay-300')} />
                </div>
            );
        }

        return (
            <div
                ref={ref}
                className={cn(spinnerVariants({ size, variant, className }))}
                aria-label={ariaLabel}
                role="status"
                {...props}
            />
        );
    }
), (prevProps, nextProps) => {
    // Custom comparison for memoization
    return shallowEqual(
        {
            size: prevProps.size,
            variant: prevProps.variant,
            className: prevProps.className,
        },
        {
            size: nextProps.size,
            variant: nextProps.variant,
            className: nextProps.className,
        }
    );
});
Spinner.displayName = 'Spinner';

export { Spinner, spinnerVariants };


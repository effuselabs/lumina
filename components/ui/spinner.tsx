import { cn } from '@/lib/utils';
import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';

const spinnerVariants = cva(
    'animate-spin rounded-full border-solid border-current border-r-transparent',
    {
        variants: {
            size: {
                sm: 'h-4 w-4 border-2',
                default: 'h-5 w-5 border-2',
                lg: 'h-6 w-6 border-2',
                xl: 'h-8 w-8 border-3',
            },
        },
        defaultVariants: {
            size: 'default',
        },
    }
);

export interface SpinnerProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> { }

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
    ({ className, size, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(spinnerVariants({ size, className }))}
                aria-label="Loading"
                {...props}
            />
        );
    }
);
Spinner.displayName = 'Spinner';

export { Spinner, spinnerVariants };


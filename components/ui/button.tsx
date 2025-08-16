import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { type VariantProps, cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumina-gold focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        // Primary Lumina Radiant Gradient
        default:
          'bg-lumina-radiant text-white hover:bg-lumina-radiant-hover shadow-lumina hover:shadow-lumina-lg',
        // Deep Teal Secondary
        secondary:
          'bg-deep-teal text-white hover:bg-deep-teal-700 shadow-md hover:shadow-lg',
        // Outline with Lumina colors
        outline:
          'border-2 border-lumina-gold bg-transparent text-lumina-gold hover:bg-lumina-gold hover:text-white',
        // Ghost with Lumina hover
        ghost:
          'text-neutral-off-black hover:bg-lumina-gold/10 hover:text-lumina-gold',
        // Destructive with Lumina error color
        destructive:
          'bg-error text-white hover:bg-error-600 shadow-md hover:shadow-lg',
        // Link style
        link: 'text-lumina-gold underline-offset-4 hover:underline hover:text-lumina-coral',
        // Success variant
        success:
          'bg-success text-white hover:bg-success-600 shadow-md hover:shadow-lg',
        // Warning variant
        warning:
          'bg-warning text-white hover:bg-warning-600 shadow-md hover:shadow-lg',
      },
      size: {
        sm: 'h-8 rounded-md px-3 text-xs',
        default: 'h-10 px-4 py-2',
        lg: 'h-12 rounded-md px-8 text-base',
        xl: 'h-14 rounded-lg px-10 text-lg',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };

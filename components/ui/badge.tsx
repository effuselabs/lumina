import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:scale-105 hover:shadow-md',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/90 badge-glow-primary',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 badge-glow-secondary',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80 badge-glow-destructive',
        outline:
          'border-2 bg-transparent border-foreground text-foreground hover:bg-foreground hover:text-background hover:shadow-lg',
        success:
          'border-transparent bg-success text-success-foreground hover:bg-success/80 badge-glow-success',
        warning:
          'border-transparent bg-warning text-warning-foreground hover:bg-warning/80 badge-glow-warning',
        info: 'border-transparent bg-info text-info-foreground hover:bg-info/80 badge-glow-info',
        feature:
          'border-transparent bg-lumina-coral text-primary-foreground hover:bg-lumina-coral/80 badge-glow-lumina-coral',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge };

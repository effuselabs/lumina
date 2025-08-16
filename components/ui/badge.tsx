import * as React from 'react';
import { type VariantProps, cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-lumina-gold text-white shadow hover:bg-lumina-gold/80',
        secondary:
          'border-transparent bg-deep-teal text-white hover:bg-deep-teal/80',
        destructive:
          'border-transparent bg-error text-white shadow hover:bg-error/80',
        success:
          'border-transparent bg-success text-white shadow hover:bg-success/80',
        warning:
          'border-transparent bg-warning text-white shadow hover:bg-warning/80',
        outline:
          'border-lumina-gold text-lumina-gold hover:bg-lumina-gold hover:text-white',
        ghost:
          'border-transparent bg-neutral-light-grey text-neutral-off-black hover:bg-neutral-medium-grey/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

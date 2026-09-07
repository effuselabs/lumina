import { cn } from '@/lib/utils';
import * as React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'gradient-border' | 'floating' | 'premium';
  hover?: 'lift' | 'glow' | 'scale' | 'none';
  animated?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = 'default',
      hover = 'none',
      animated = false,
      ...props
    },
    ref
  ) => (
    <div
      ref={ref}
      className={cn(
        // Base card styles
        'rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-200',
        // Default hover effect
        hover === 'none' && 'hover:shadow-md',
        // Variant styles
        variant === 'glass' && 'card-glass',
        variant === 'gradient-border' && 'card-gradient-border',
        variant === 'floating' && 'card-floating',
        variant === 'premium' && 'card-premium',
        // Hover effect styles
        hover === 'lift' && 'card-hover-lift',
        hover === 'glow' && 'card-hover-glow',
        hover === 'scale' && 'card-hover-scale',
        // Animation styles
        animated && 'card-animated',
        // Dark theme border
        'dark:border-border',
        className
      )}
      {...props}
    />
  )
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-2xl font-semibold leading-none tracking-tight text-card-foreground',
      className
    )}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center p-6 pt-0', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};

import { ThemeProvider } from '@/components/theme-provider';
import { cn } from '@/lib/utils';
import * as React from 'react';

// Container component with responsive max-widths
const Container = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  }
>(({ className, size = 'xl', ...props }, ref) => {
  const sizeClasses = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    full: 'max-w-full',
  };

  return (
    <div
      ref={ref}
      className={cn(
        'mx-auto w-full px-4 sm:px-6 lg:px-8',
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
});
Container.displayName = 'Container';

// Grid component with responsive columns
const Grid = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    cols?: 1 | 2 | 3 | 4 | 6 | 12;
    gap?: 'sm' | 'md' | 'lg' | 'xl';
  }
>(({ className, cols = 1, gap = 'md', ...props }, ref) => {
  const colClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
    12: 'grid-cols-4 md:grid-cols-6 lg:grid-cols-12',
  };

  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  };

  return (
    <div
      ref={ref}
      className={cn('grid', colClasses[cols], gapClasses[gap], className)}
      {...props}
    />
  );
});
Grid.displayName = 'Grid';

// Flex component with responsive utilities
const Flex = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    direction?: 'row' | 'col' | 'row-reverse' | 'col-reverse';
    align?: 'start' | 'center' | 'end' | 'stretch';
    justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
    wrap?: boolean;
    gap?: 'sm' | 'md' | 'lg' | 'xl';
  }
>(
  (
    {
      className,
      direction = 'row',
      align = 'start',
      justify = 'start',
      wrap = false,
      gap = 'md',
      ...props
    },
    ref
  ) => {
    const directionClasses = {
      row: 'flex-row',
      col: 'flex-col',
      'row-reverse': 'flex-row-reverse',
      'col-reverse': 'flex-col-reverse',
    };

    const alignClasses = {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
    };

    const justifyClasses = {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
      around: 'justify-around',
      evenly: 'justify-evenly',
    };

    const gapClasses = {
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex',
          directionClasses[direction],
          alignClasses[align],
          justifyClasses[justify],
          wrap && 'flex-wrap',
          gapClasses[gap],
          className
        )}
        {...props}
      />
    );
  }
);
Flex.displayName = 'Flex';

// Stack component for vertical layouts
const Stack = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    spacing?: 'sm' | 'md' | 'lg' | 'xl';
  }
>(({ className, spacing = 'md', ...props }, ref) => {
  const spacingClasses = {
    sm: 'space-y-2',
    md: 'space-y-4',
    lg: 'space-y-6',
    xl: 'space-y-8',
  };

  return (
    <div
      ref={ref}
      className={cn('flex flex-col', spacingClasses[spacing], className)}
      {...props}
    />
  );
});
Stack.displayName = 'Stack';

// Responsive breakpoint utilities
const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Show/Hide components for responsive design
const Show = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    above?: keyof typeof breakpoints;
    below?: keyof typeof breakpoints;
  }
>(({ className, above, below, ...props }, ref) => {
  let responsiveClasses = '';

  if (above) {
    const breakpointClasses = {
      sm: 'hidden sm:block',
      md: 'hidden md:block',
      lg: 'hidden lg:block',
      xl: 'hidden xl:block',
      '2xl': 'hidden 2xl:block',
    };
    responsiveClasses = breakpointClasses[above];
  }

  if (below) {
    const breakpointClasses = {
      sm: 'block sm:hidden',
      md: 'block md:hidden',
      lg: 'block lg:hidden',
      xl: 'block xl:hidden',
      '2xl': 'block 2xl:hidden',
    };
    responsiveClasses = breakpointClasses[below];
  }

  return (
    <div ref={ref} className={cn(responsiveClasses, className)} {...props} />
  );
});
Show.displayName = 'Show';

// Layout component with ThemeProvider integration
const Layout = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    enableTheme?: boolean;
    defaultTheme?: 'light' | 'dark' | 'system';
    storageKey?: string;
  }
>(
  (
    {
      className,
      enableTheme = true,
      defaultTheme = 'system',
      storageKey = 'lumina-theme',
      children,
      ...props
    },
    ref
  ) => {
    if (enableTheme) {
      return (
        <ThemeProvider defaultTheme={defaultTheme} storageKey={storageKey}>
          <div
            ref={ref}
            className={cn(
              'min-h-screen bg-background text-foreground',
              className
            )}
            {...props}
          >
            {children}
          </div>
        </ThemeProvider>
      );
    }

    return (
      <div
        ref={ref}
        className={cn('min-h-screen bg-background text-foreground', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Layout.displayName = 'Layout';

export { breakpoints, Container, Flex, Grid, Layout, Show, Stack };

'use client';

import * as React from 'react';
import { usePerformanceMonitor } from '../../lib/performance-hooks';
import { Button, type ButtonProps } from './button';

/**
 * Button component with performance monitoring enabled
 * This is a client-side wrapper around the base Button component
 * Use this when you need performance monitoring, otherwise use the base Button
 */
export const ButtonWithMonitoring = React.forwardRef<
  HTMLButtonElement,
  ButtonProps
>(({ variant, size, loading, disabled, children, ...props }, ref) => {
  // Performance monitoring (client-side only)
  const { trackPropsChange } = usePerformanceMonitor('Button');

  React.useEffect(() => {
    trackPropsChange({ variant, size, loading, disabled, children });
  }, [trackPropsChange, variant, size, loading, disabled, children]);

  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      loading={loading}
      disabled={disabled}
      {...props}
    >
      {children}
    </Button>
  );
});

ButtonWithMonitoring.displayName = 'ButtonWithMonitoring';

'use client';

/**
 * Client-side performance hooks for React components
 * These hooks can only be used in Client Components
 */

import { useCallback, useEffect, useRef } from 'react';
import { performanceMonitor } from './performance-utils';

// Hook for monitoring component performance
export function usePerformanceMonitor(componentName: string) {
  const propsRef = useRef<any>(null);
  const renderCountRef = useRef(0);

  useEffect(() => {
    performanceMonitor.startRender(componentName);

    return () => {
      const propsChanged = propsRef.current !== null;
      performanceMonitor.endRender(componentName, propsChanged);
    };
  });

  const trackPropsChange = useCallback((props: any) => {
    const propsChanged =
      JSON.stringify(props) !== JSON.stringify(propsRef.current);
    propsRef.current = props;
    renderCountRef.current++;

    return propsChanged;
  }, []);

  return { trackPropsChange };
}

'use client';

/**
 * Client-side performance hooks for React components
 * These hooks can only be used in Client Components
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { performanceMonitor, shallowEqual } from './performance-utils';

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

// Memoization helper for expensive calculations
export function useMemoizedValue<T>(
  factory: () => T,
  deps: React.DependencyList,
  compareFn: (
    prev: React.DependencyList,
    next: React.DependencyList
  ) => boolean = shallowEqual
): T {
  const ref = useRef<{ deps: React.DependencyList; value: T } | null>(null);

  if (!ref.current || !compareFn(ref.current.deps, deps)) {
    ref.current = {
      deps: [...deps],
      value: factory(),
    };
  }

  return ref.current.value;
}

// Hook for debouncing expensive operations
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Hook for throttling expensive operations
export function useThrottle<T>(value: T, limit: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef<number>(Date.now());

  useEffect(() => {
    const handler = setTimeout(
      () => {
        if (Date.now() - lastRan.current >= limit) {
          setThrottledValue(value);
          lastRan.current = Date.now();
        }
      },
      limit - (Date.now() - lastRan.current)
    );

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
}

// Memory usage monitoring
export function useMemoryMonitor(componentName: string) {
  useEffect(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      console.log(`${componentName} memory usage:`, {
        used: Math.round(memory.usedJSHeapSize / 1048576) + ' MB',
        total: Math.round(memory.totalJSHeapSize / 1048576) + ' MB',
        limit: Math.round(memory.jsHeapSizeLimit / 1048576) + ' MB',
      });
    }
  }, [componentName]);
}

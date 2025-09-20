/**
 * Performance utilities for component rendering and bundle optimization
 * Provides monitoring, memoization helpers, and bundle analysis tools
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// Performance metrics interface
export interface ComponentMetrics {
    componentName: string;
    renderCount: number;
    averageRenderTime: number;
    lastRenderTime: number;
    totalRenderTime: number;
    propsChanges: number;
    unnecessaryRenders: number;
}

// Global performance monitor
class ComponentPerformanceMonitor {
    private metrics: Map<string, ComponentMetrics> = new Map();
    private renderStartTimes: Map<string, number> = new Map();

    startRender(componentName: string): void {
        this.renderStartTimes.set(componentName, performance.now());
    }

    endRender(componentName: string, propsChanged: boolean = true): void {
        const startTime = this.renderStartTimes.get(componentName);
        if (!startTime) return;

        const renderTime = performance.now() - startTime;
        const existing = this.metrics.get(componentName) || {
            componentName,
            renderCount: 0,
            averageRenderTime: 0,
            lastRenderTime: 0,
            totalRenderTime: 0,
            propsChanges: 0,
            unnecessaryRenders: 0,
        };

        const newMetrics: ComponentMetrics = {
            ...existing,
            renderCount: existing.renderCount + 1,
            lastRenderTime: renderTime,
            totalRenderTime: existing.totalRenderTime + renderTime,
            propsChanges: propsChanged ? existing.propsChanges + 1 : existing.propsChanges,
            unnecessaryRenders: !propsChanged ? existing.unnecessaryRenders + 1 : existing.unnecessaryRenders,
        };

        newMetrics.averageRenderTime = newMetrics.totalRenderTime / newMetrics.renderCount;

        this.metrics.set(componentName, newMetrics);
        this.renderStartTimes.delete(componentName);

        // Log performance warnings
        if (renderTime > 16) {
            console.warn(`Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`);
        }

        if (newMetrics.unnecessaryRenders > 5) {
            console.warn(`Excessive re-renders: ${componentName} has ${newMetrics.unnecessaryRenders} unnecessary renders`);
        }
    }

    getMetrics(componentName: string): ComponentMetrics | null {
        return this.metrics.get(componentName) || null;
    }

    getAllMetrics(): ComponentMetrics[] {
        return Array.from(this.metrics.values());
    }

    getSlowComponents(threshold: number = 10): ComponentMetrics[] {
        return this.getAllMetrics().filter(m => m.averageRenderTime > threshold);
    }

    getComponentsWithExcessiveRenders(threshold: number = 10): ComponentMetrics[] {
        return this.getAllMetrics().filter(m => m.unnecessaryRenders > threshold);
    }

    reset(): void {
        this.metrics.clear();
        this.renderStartTimes.clear();
    }
}

// Global monitor instance
export const performanceMonitor = new ComponentPerformanceMonitor();

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
        const propsChanged = JSON.stringify(props) !== JSON.stringify(propsRef.current);
        propsRef.current = props;
        renderCountRef.current++;

        return propsChanged;
    }, []);

    return { trackPropsChange };
}

// Shallow comparison for props
export function shallowEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true;

    if (obj1 == null || obj2 == null) return false;

    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    for (const key of keys1) {
        if (!keys2.includes(key) || obj1[key] !== obj2[key]) {
            return false;
        }
    }

    return true;
}

// Deep comparison for complex props (use sparingly)
export function deepEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true;

    if (obj1 == null || obj2 == null) return false;

    if (typeof obj1 !== typeof obj2) return false;

    if (typeof obj1 !== 'object') return obj1 === obj2;

    if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;

    if (Array.isArray(obj1)) {
        if (obj1.length !== obj2.length) return false;
        return obj1.every((item, index) => deepEqual(item, obj2[index]));
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    return keys1.every(key => keys2.includes(key) && deepEqual(obj1[key], obj2[key]));
}

// Memoization helper for expensive calculations
export function useMemoizedValue<T>(
    factory: () => T,
    deps: React.DependencyList,
    compareFn: (prev: React.DependencyList, next: React.DependencyList) => boolean = shallowEqual
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
        const handler = setTimeout(() => {
            if (Date.now() - lastRan.current >= limit) {
                setThrottledValue(value);
                lastRan.current = Date.now();
            }
        }, limit - (Date.now() - lastRan.current));

        return () => {
            clearTimeout(handler);
        };
    }, [value, limit]);

    return throttledValue;
}

// Bundle size analysis utilities
export interface BundleAnalysis {
    totalSize: number;
    gzippedSize: number;
    components: {
        name: string;
        size: number;
        imports: string[];
    }[];
    unusedExports: string[];
    duplicateModules: string[];
}

// Tree-shaking helper for conditional imports
export function createLazyComponent<T extends React.ComponentType<any>>(
    importFn: () => Promise<{ default: T }>,
    fallback?: React.ComponentType
): React.LazyExoticComponent<T> {
    const LazyComponent = React.lazy(importFn);

    if (fallback) {
        return React.lazy(async () => {
            try {
                return await importFn();
            } catch (error) {
                console.warn('Failed to load component, using fallback:', error);
                return { default: fallback as T };
            }
        });
    }

    return LazyComponent;
}

// CSS optimization utilities
export function removeUnusedCSS(usedClasses: Set<string>): void {
    if (typeof document === 'undefined') return;

    const styleSheets = Array.from(document.styleSheets);

    styleSheets.forEach(sheet => {
        try {
            const rules = Array.from(sheet.cssRules || sheet.rules || []);

            rules.forEach((rule, index) => {
                if (rule.type === CSSRule.STYLE_RULE) {
                    const styleRule = rule as CSSStyleRule;
                    const selector = styleRule.selectorText;

                    // Check if any class in the selector is used
                    const classMatches = selector.match(/\.[a-zA-Z0-9_-]+/g);
                    if (classMatches) {
                        const hasUsedClass = classMatches.some(cls =>
                            usedClasses.has(cls.substring(1)) // Remove the dot
                        );

                        if (!hasUsedClass) {
                            sheet.deleteRule(index);
                        }
                    }
                }
            });
        } catch (error) {
            // Cross-origin stylesheets can't be accessed
            console.warn('Could not access stylesheet:', error);
        }
    });
}

// Performance measurement utilities
export function measureRenderTime<T extends (...args: any[]) => any>(
    fn: T,
    componentName: string
): T {
    return ((...args: Parameters<T>) => {
        const start = performance.now();
        const result = fn(...args);
        const end = performance.now();

        console.log(`${componentName} render time: ${(end - start).toFixed(2)}ms`);

        return result;
    }) as T;
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

// Component size estimation
export function estimateComponentSize(component: React.ComponentType): number {
    const componentString = component.toString();
    return new Blob([componentString]).size;
}

// Export performance constants
export const PERFORMANCE_THRESHOLDS = {
    RENDER_TIME_WARNING: 16, // 60fps budget
    RENDER_TIME_ERROR: 33, // 30fps budget
    MEMORY_WARNING: 50, // 50MB
    MEMORY_ERROR: 100, // 100MB
    BUNDLE_SIZE_WARNING: 250000, // 250KB
    BUNDLE_SIZE_ERROR: 500000, // 500KB
} as const;

// Performance optimization recommendations
export function getPerformanceRecommendations(): string[] {
    const recommendations: string[] = [];
    const slowComponents = performanceMonitor.getSlowComponents();
    const excessiveRenderComponents = performanceMonitor.getComponentsWithExcessiveRenders();

    if (slowComponents.length > 0) {
        recommendations.push(
            `Consider optimizing these slow components: ${slowComponents.map(c => c.componentName).join(', ')}`
        );
    }

    if (excessiveRenderComponents.length > 0) {
        recommendations.push(
            `Consider memoizing these components with excessive re-renders: ${excessiveRenderComponents.map(c => c.componentName).join(', ')}`
        );
    }

    if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usedMB = memory.usedJSHeapSize / 1048576;

        if (usedMB > PERFORMANCE_THRESHOLDS.MEMORY_WARNING) {
            recommendations.push('Consider reducing memory usage by cleaning up unused references');
        }
    }

    return recommendations;
}
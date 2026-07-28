'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNetworkResilience } from './use-network-resilience';

interface PerformanceMetrics {
    pageLoadTime: number;
    stepTransitionTime: number;
    apiResponseTime: number;
    renderTime: number;
    interactionDelay: number;
}

interface PerformanceOptimizations {
    shouldPreloadImages: boolean;
    shouldUseWebP: boolean;
    shouldLazyLoad: boolean;
    imageQuality: number;
    cacheStrategy: 'aggressive' | 'moderate' | 'minimal';
}

export function useBookingPerformance() {
    const { networkState } = useNetworkResilience();
    const [metrics, setMetrics] = useState<Partial<PerformanceMetrics>>({});
    const [optimizations, setOptimizations] = useState<PerformanceOptimizations>({
        shouldPreloadImages: true,
        shouldUseWebP: true,
        shouldLazyLoad: false,
        imageQuality: 80,
        cacheStrategy: 'moderate',
    });

    const measurementRefs = useRef<Map<string, number>>(new Map());
    const performanceObserver = useRef<PerformanceObserver | null>(null);

    // Adjust optimizations based on network conditions
    useEffect(() => {
        const newOptimizations: PerformanceOptimizations = {
            shouldPreloadImages: !networkState.isSlowConnection,
            shouldUseWebP: !networkState.isSlowConnection,
            shouldLazyLoad: networkState.isSlowConnection,
            imageQuality: networkState.isSlowConnection ? 60 : 80,
            cacheStrategy: networkState.isSlowConnection ? 'aggressive' : 'moderate',
        };

        setOptimizations(newOptimizations);
    }, [networkState.isSlowConnection, networkState.connectionType]);

    // Initialize performance monitoring
    useEffect(() => {
        if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
            return;
        }

        try {
            performanceObserver.current = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.entryType === 'navigation') {
                        const navEntry = entry as PerformanceNavigationTiming;
                        setMetrics(prev => ({
                            ...prev,
                            // Navigation Timing L2: entry times are relative to
                            // startTime (0 for navigation entries), not the removed
                            // navigationStart of the legacy PerformanceTiming API.
                            pageLoadTime: navEntry.loadEventEnd - navEntry.startTime,
                        }));
                    }

                    if (entry.entryType === 'measure') {
                        const measureEntry = entry as PerformanceMeasure;
                        if (measureEntry.name.startsWith('booking-')) {
                            setMetrics(prev => ({
                                ...prev,
                                [measureEntry.name.replace('booking-', '')]: measureEntry.duration,
                            }));
                        }
                    }
                }
            });

            performanceObserver.current.observe({
                entryTypes: ['navigation', 'measure', 'paint']
            });
        } catch (error) {
            console.warn('Performance monitoring not available:', error);
        }

        return () => {
            if (performanceObserver.current) {
                performanceObserver.current.disconnect();
            }
        };
    }, []);

    // Start performance measurement
    const startMeasurement = useCallback((name: string) => {
        const startTime = performance.now();
        measurementRefs.current.set(name, startTime);

        if ('mark' in performance) {
            performance.mark(`booking-${name}-start`);
        }
    }, []);

    // End performance measurement
    const endMeasurement = useCallback((name: string) => {
        const startTime = measurementRefs.current.get(name);
        if (!startTime) return 0;

        const duration = performance.now() - startTime;
        measurementRefs.current.delete(name);

        if ('mark' in performance && 'measure' in performance) {
            try {
                performance.mark(`booking-${name}-end`);
                performance.measure(
                    `booking-${name}`,
                    `booking-${name}-start`,
                    `booking-${name}-end`
                );
            } catch (error) {
                // Marks might not exist, ignore error
            }
        }

        // Update metrics
        setMetrics(prev => ({
            ...prev,
            [name]: duration,
        }));

        // Log slow operations
        if (duration > 1000) {
            console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
        }

        return duration;
    }, []);

    // Measure async operations
    const measureAsync = useCallback(async <T>(
        name: string,
        operation: () => Promise<T>
    ): Promise<T> => {
        startMeasurement(name);

        try {
            const result = await operation();
            endMeasurement(name);
            return result;
        } catch (error) {
            endMeasurement(name);
            throw error;
        }
    }, [startMeasurement, endMeasurement]);

    // Optimize image loading based on network conditions
    const optimizeImageSrc = useCallback((src: string, width?: number): string => {
        if (!src) return src;

        let optimizedSrc = src;

        // Add width parameter if provided
        if (width) {
            const separator = src.includes('?') ? '&' : '?';
            optimizedSrc += `${separator}w=${width}`;
        }

        // Adjust quality based on network conditions
        const separator = optimizedSrc.includes('?') ? '&' : '?';
        optimizedSrc += `${separator}q=${optimizations.imageQuality}`;

        // Convert to WebP if supported and network allows
        if (optimizations.shouldUseWebP && supportsWebP()) {
            optimizedSrc += '&f=webp';
        }

        return optimizedSrc;
    }, [optimizations.imageQuality, optimizations.shouldUseWebP]);

    // Check WebP support
    const supportsWebP = useCallback((): boolean => {
        if (typeof window === 'undefined') return false;

        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;

        return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    }, []);

    // Preload critical resources
    const preloadResource = useCallback((href: string, as: string) => {
        if (!optimizations.shouldPreloadImages && as === 'image') return;
        if (typeof document === 'undefined') return;

        // Check if already preloaded
        const existing = document.querySelector(`link[href="${href}"]`);
        if (existing) return;

        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = href;
        link.as = as;

        if (as === 'image') {
            link.crossOrigin = 'anonymous';
        }

        document.head.appendChild(link);
    }, [optimizations.shouldPreloadImages]);

    // Prefetch next page resources
    const prefetchResource = useCallback((href: string) => {
        if (networkState.isSlowConnection) return; // Skip prefetch on slow connections
        if (typeof document === 'undefined') return;

        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = href;
        document.head.appendChild(link);
    }, [networkState.isSlowConnection]);

    // Get performance recommendations
    const getRecommendations = useCallback((): string[] => {
        const recommendations: string[] = [];

        if (metrics.pageLoadTime && metrics.pageLoadTime > 3000) {
            recommendations.push('Page load time is slow. Consider optimizing images and reducing bundle size.');
        }

        if (metrics.stepTransitionTime && metrics.stepTransitionTime > 500) {
            recommendations.push('Step transitions are slow. Consider lazy loading or code splitting.');
        }

        if (metrics.apiResponseTime && metrics.apiResponseTime > 1000) {
            recommendations.push('API responses are slow. Consider caching or optimizing backend.');
        }

        if (networkState.isSlowConnection) {
            recommendations.push('Slow network detected. Using optimized images and aggressive caching.');
        }

        if (metrics.renderTime && metrics.renderTime > 16) {
            recommendations.push('Rendering is slow. Consider memoization or virtualization.');
        }

        return recommendations;
    }, [metrics, networkState.isSlowConnection]);

    // Monitor Core Web Vitals
    const [webVitals, setWebVitals] = useState<{
        fcp?: number;
        lcp?: number;
        fid?: number;
        cls?: number;
    }>({});

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Monitor First Contentful Paint
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.name === 'first-contentful-paint') {
                    setWebVitals(prev => ({ ...prev, fcp: entry.startTime }));
                }
            }
        });

        try {
            observer.observe({ entryTypes: ['paint'] });
        } catch (error) {
            console.warn('Paint observer not supported:', error);
        }

        // Monitor Largest Contentful Paint
        const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            setWebVitals(prev => ({ ...prev, lcp: lastEntry.startTime }));
        });

        try {
            lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        } catch (error) {
            console.warn('LCP observer not supported:', error);
        }

        // Monitor Cumulative Layout Shift
        const clsObserver = new PerformanceObserver((list) => {
            let clsValue = 0;
            for (const entry of list.getEntries()) {
                if (!(entry as any).hadRecentInput) {
                    clsValue += (entry as any).value;
                }
            }
            setWebVitals(prev => ({ ...prev, cls: clsValue }));
        });

        try {
            clsObserver.observe({ entryTypes: ['layout-shift'] });
        } catch (error) {
            console.warn('CLS observer not supported:', error);
        }

        return () => {
            observer.disconnect();
            lcpObserver.disconnect();
            clsObserver.disconnect();
        };
    }, []);

    // Calculate performance score
    const getPerformanceScore = useCallback((): number => {
        let score = 100;

        // Deduct points for slow metrics
        if (webVitals.fcp && webVitals.fcp > 1800) score -= 10;
        if (webVitals.lcp && webVitals.lcp > 2500) score -= 15;
        if (webVitals.cls && webVitals.cls > 0.1) score -= 10;
        if (metrics.pageLoadTime && metrics.pageLoadTime > 3000) score -= 15;
        if (metrics.apiResponseTime && metrics.apiResponseTime > 1000) score -= 10;

        return Math.max(0, score);
    }, [webVitals, metrics]);

    return {
        metrics,
        webVitals,
        optimizations,
        startMeasurement,
        endMeasurement,
        measureAsync,
        optimizeImageSrc,
        preloadResource,
        prefetchResource,
        getRecommendations,
        getPerformanceScore,
        isSlowConnection: networkState.isSlowConnection,
        connectionType: networkState.connectionType,
    };
}
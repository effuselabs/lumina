'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseCountUpOptions {
    start?: number;
    end: number;
    duration?: number;
    decimals?: number;
    prefix?: string;
    suffix?: string;
    separator?: string;
    formatter?: (value: number) => string;
    easing?: (t: number) => number;
    onComplete?: () => void;
    preserveValue?: boolean;
}

interface UseCountUpReturn {
    value: string;
    reset: () => void;
    start: () => void;
    pause: () => void;
    resume: () => void;
    isAnimating: boolean;
}

/**
 * Easing functions for smooth count-up animations
 */
const easingFunctions = {
    linear: (t: number) => t,
    easeOut: (t: number) => 1 - Math.pow(1 - t, 3),
    easeInOut: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    easeOutQuart: (t: number) => 1 - Math.pow(1 - t, 4),
    easeOutExpo: (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
};

/**
 * Default number formatter with locale support
 */
const defaultFormatter = (value: number, decimals: number = 0, separator: string = ','): string => {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping: separator !== '',
    }).format(value);
};

/**
 * Currency formatter
 */
const currencyFormatter = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

/**
 * Percentage formatter
 */
const percentageFormatter = (value: number, decimals: number = 1): string => {
    return new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value / 100);
};

/**
 * Custom hook for smooth count-up animations with easing functions
 * 
 * Optimized for StatCard components with proper performance considerations,
 * reduced motion support, and flexible formatting options.
 * 
 * @param options - Configuration options for the count-up animation
 * @returns Object containing current value, control functions, and animation state
 * 
 * @example
 * ```tsx
 * const { value, start } = useCountUp({
 *   end: 1250,
 *   duration: 2000,
 *   formatter: currencyFormatter,
 *   easing: easingFunctions.easeOut
 * });
 * 
 * useEffect(() => {
 *   if (isIntersecting) {
 *     start();
 *   }
 * }, [isIntersecting, start]);
 * 
 * return <span className="stat-card-value-counting">{value}</span>;
 * ```
 */
export function useCountUp(options: UseCountUpOptions): UseCountUpReturn {
    const {
        start: startValue = 0,
        end,
        duration = 2000,
        decimals = 0,
        prefix = '',
        suffix = '',
        separator = ',',
        formatter,
        easing = easingFunctions.easeOut,
        onComplete,
        preserveValue = false,
    } = options;

    const [currentValue, setCurrentValue] = useState(preserveValue ? end : startValue);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    const animationRef = useRef<number>();
    const startTimeRef = useRef<number>();
    const pausedTimeRef = useRef<number>(0);
    const hasCompletedRef = useRef(false);

    // Format the current value
    const formatValue = useCallback((value: number): string => {
        let formattedValue: string;

        if (formatter) {
            formattedValue = formatter(value);
        } else {
            formattedValue = defaultFormatter(value, decimals, separator);
        }

        return `${prefix}${formattedValue}${suffix}`;
    }, [formatter, decimals, separator, prefix, suffix]);

    // Animation function
    const animate = useCallback((timestamp: number) => {
        if (!startTimeRef.current) {
            startTimeRef.current = timestamp;
        }

        const elapsed = timestamp - startTimeRef.current - pausedTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easing(progress);

        const currentAnimatedValue = startValue + (end - startValue) * easedProgress;
        setCurrentValue(currentAnimatedValue);

        if (progress < 1 && !isPaused) {
            animationRef.current = requestAnimationFrame(animate);
        } else if (progress >= 1) {
            setCurrentValue(end);
            setIsAnimating(false);
            hasCompletedRef.current = true;
            onComplete?.();
        }
    }, [startValue, end, duration, easing, onComplete, isPaused]);

    // Start animation
    const start = useCallback(() => {
        // Check for reduced motion preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (prefersReducedMotion) {
            setCurrentValue(end);
            onComplete?.();
            return;
        }

        if (hasCompletedRef.current && !preserveValue) {
            return; // Don't restart if already completed
        }

        setIsAnimating(true);
        setIsPaused(false);
        startTimeRef.current = undefined;
        pausedTimeRef.current = 0;
        hasCompletedRef.current = false;

        if (!preserveValue) {
            setCurrentValue(startValue);
        }

        animationRef.current = requestAnimationFrame(animate);
    }, [animate, end, onComplete, preserveValue, startValue]);

    // Reset animation
    const reset = useCallback(() => {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }

        setCurrentValue(startValue);
        setIsAnimating(false);
        setIsPaused(false);
        startTimeRef.current = undefined;
        pausedTimeRef.current = 0;
        hasCompletedRef.current = false;
    }, [startValue]);

    // Pause animation
    const pause = useCallback(() => {
        if (isAnimating && !isPaused) {
            setIsPaused(true);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        }
    }, [isAnimating, isPaused]);

    // Resume animation
    const resume = useCallback(() => {
        if (isAnimating && isPaused) {
            setIsPaused(false);
            animationRef.current = requestAnimationFrame(animate);
        }
    }, [isAnimating, isPaused, animate]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    return {
        value: formatValue(currentValue),
        reset,
        start,
        pause,
        resume,
        isAnimating,
    };
}

/**
 * Pre-configured hook for currency count-up animations
 */
export function useCurrencyCountUp(
    end: number,
    options: Omit<UseCountUpOptions, 'end' | 'formatter'> = {}
): UseCountUpReturn {
    return useCountUp({
        ...options,
        end,
        formatter: currencyFormatter,
    });
}

/**
 * Pre-configured hook for percentage count-up animations
 */
export function usePercentageCountUp(
    end: number,
    options: Omit<UseCountUpOptions, 'end' | 'formatter'> = {}
): UseCountUpReturn {
    return useCountUp({
        ...options,
        end,
        formatter: (value) => percentageFormatter(value, options.decimals || 1),
    });
}

/**
 * Pre-configured hook for integer count-up animations
 */
export function useIntegerCountUp(
    end: number,
    options: Omit<UseCountUpOptions, 'end' | 'decimals'> = {}
): UseCountUpReturn {
    return useCountUp({
        ...options,
        end,
        decimals: 0,
    });
}

// Export easing functions for external use
export { currencyFormatter, defaultFormatter, easingFunctions, percentageFormatter };

'use client';

import { useEffect, useRef, useState } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  root?: Element | null;
  rootMargin?: string;
  triggerOnce?: boolean;
  delay?: number;
}

interface UseIntersectionObserverReturn {
  ref: React.RefObject<HTMLElement | null>;
  isIntersecting: boolean;
  entry: IntersectionObserverEntry | null;
}

/**
 * Custom hook for Intersection Observer API with animation triggers
 *
 * Optimized for scroll-triggered animations with proper cleanup and performance considerations.
 * Supports staggered animations, custom thresholds, and reduced motion preferences.
 *
 * @param options - Configuration options for the intersection observer
 * @returns Object containing ref, intersection state, and entry details
 *
 * @example
 * ```tsx
 * const { ref, isIntersecting } = useIntersectionObserver({
 *   threshold: 0.1,
 *   triggerOnce: true,
 *   delay: 100
 * });
 *
 * return (
 *   <div
 *     ref={ref}
 *     className={`stat-card-animated ${isIntersecting ? 'in-view' : ''}`}
 *   >
 *     Content
 *   </div>
 * );
 * ```
 */
export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
): UseIntersectionObserverReturn {
  const {
    threshold = 0.1,
    root = null,
    rootMargin = '0px',
    triggerOnce = true,
    delay = 0,
  } = options;

  const ref = useRef<HTMLElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    // If reduced motion is preferred, immediately set as intersecting
    if (prefersReducedMotion) {
      setIsIntersecting(true);
      setHasTriggered(true);
      return;
    }

    // Skip if already triggered and triggerOnce is true
    if (triggerOnce && hasTriggered) {
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        const [observerEntry] = entries;
        setEntry(observerEntry);

        if (observerEntry.isIntersecting) {
          // Apply delay if specified
          if (delay > 0) {
            setTimeout(() => {
              setIsIntersecting(true);
              if (triggerOnce) {
                setHasTriggered(true);
              }
            }, delay);
          } else {
            setIsIntersecting(true);
            if (triggerOnce) {
              setHasTriggered(true);
            }
          }
        } else if (!triggerOnce) {
          // Only update if not triggerOnce mode
          setIsIntersecting(false);
        }
      },
      {
        threshold,
        root,
        rootMargin,
      }
    );

    observer.observe(element);

    // Cleanup function
    return () => {
      observer.unobserve(element);
      observer.disconnect();
    };
  }, [threshold, root, rootMargin, triggerOnce, delay, hasTriggered]);

  return { ref, isIntersecting, entry };
}

/**
 * Performance-optimized hook for StatCard animations
 *
 * Pre-configured with optimal settings for StatCard components:
 * - Lower threshold for earlier trigger
 * - Trigger once for performance
 * - Optimized root margin for smooth animations
 *
 * @param delay - Optional delay override
 * @returns Intersection observer result optimized for StatCards
 */
export function useStatCardIntersectionObserver(
  delay?: number
): UseIntersectionObserverReturn {
  return useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '50px 0px -50px 0px', // Trigger slightly before entering viewport
    triggerOnce: true,
    delay,
  });
}

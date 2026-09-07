/**
 * React hook for performance-optimized animations with monitoring
 * Provides 60fps animations with reduced motion support
 */

import {
  ANIMATION_DURATIONS,
  animationMonitor,
  createFocusAnimation,
  createHoverAnimation,
  createLoadingAnimation,
  EASING_FUNCTIONS,
  getAnimationDuration,
  getEasingFunction,
  prefersReducedMotion,
  type AnimationMetrics,
} from '@/lib/animation-utils';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseAnimationOptions {
  duration?: number;
  easing?: string;
  delay?: number;
  iterations?: number;
  fill?: FillMode;
  respectReducedMotion?: boolean;
  monitorPerformance?: boolean;
}

export interface AnimationControls {
  play: () => void;
  pause: () => void;
  cancel: () => void;
  finish: () => void;
  reverse: () => void;
  isPlaying: boolean;
  isPaused: boolean;
  isFinished: boolean;
  metrics?: AnimationMetrics;
}

/**
 * Hook for creating and managing Web Animations API animations
 */
export function useAnimation(
  keyframes: Keyframe[],
  options: UseAnimationOptions = {}
): [React.RefObject<HTMLElement>, AnimationControls] {
  const elementRef = useRef<HTMLElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const animationIdRef = useRef<string>('');

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [metrics, setMetrics] = useState<AnimationMetrics | undefined>();

  const {
    duration = ANIMATION_DURATIONS.NORMAL,
    easing = EASING_FUNCTIONS.LUMINA,
    delay = 0,
    iterations = 1,
    fill = 'forwards',
    respectReducedMotion = true,
    monitorPerformance = false,
  } = options;

  const createAnimation = useCallback(() => {
    if (!elementRef.current) return null;

    const actualDuration = respectReducedMotion
      ? getAnimationDuration(duration)
      : duration;
    const actualEasing = respectReducedMotion
      ? getEasingFunction(easing)
      : easing;

    const animation = elementRef.current.animate(keyframes, {
      duration: actualDuration,
      easing: actualEasing,
      delay,
      iterations,
      fill,
    });

    // Set up performance monitoring
    if (monitorPerformance) {
      animationIdRef.current = `animation-${Date.now()}`;
      animationMonitor.startMonitoring(animationIdRef.current, actualDuration);
    }

    // Set up event listeners
    animation.addEventListener('play', () => setIsPlaying(true));
    animation.addEventListener('pause', () => setIsPaused(true));
    animation.addEventListener('finish', () => {
      setIsFinished(true);
      setIsPlaying(false);

      if (monitorPerformance && animationIdRef.current) {
        const finalMetrics = animationMonitor.stopMonitoring(
          animationIdRef.current
        );
        setMetrics(finalMetrics || undefined);
      }
    });
    animation.addEventListener('cancel', () => {
      setIsPlaying(false);
      setIsPaused(false);
      setIsFinished(false);
    });

    return animation;
  }, [
    keyframes,
    duration,
    easing,
    delay,
    iterations,
    fill,
    respectReducedMotion,
    monitorPerformance,
  ]);

  const controls: AnimationControls = {
    play: useCallback(() => {
      if (!animationRef.current) {
        animationRef.current = createAnimation();
      }
      animationRef.current?.play();
      setIsPaused(false);
    }, [createAnimation]),

    pause: useCallback(() => {
      animationRef.current?.pause();
      setIsPaused(true);
    }, []),

    cancel: useCallback(() => {
      animationRef.current?.cancel();
      animationRef.current = null;
      setIsPlaying(false);
      setIsPaused(false);
      setIsFinished(false);
    }, []),

    finish: useCallback(() => {
      animationRef.current?.finish();
    }, []),

    reverse: useCallback(() => {
      if (animationRef.current) {
        animationRef.current.reverse();
      }
    }, []),

    isPlaying,
    isPaused,
    isFinished,
    metrics,
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        animationRef.current.cancel();
      }
    };
  }, []);

  return [elementRef, controls];
}

/**
 * Hook for hover animations with enter/leave states
 */
export function useHoverAnimation(
  hoverTransform: string = 'translateY(-2px) scale(1.02)',
  options: UseAnimationOptions = {}
): [
  React.RefObject<HTMLElement>,
  { onMouseEnter: () => void; onMouseLeave: () => void },
] {
  const elementRef = useRef<HTMLElement>(null);
  const hoverAnimationRef = useRef<{
    enter: () => Animation;
    leave: () => Animation;
  } | null>(null);

  const { duration = ANIMATION_DURATIONS.FAST } = options;

  useEffect(() => {
    if (elementRef.current) {
      hoverAnimationRef.current = createHoverAnimation(
        elementRef.current,
        hoverTransform,
        duration
      );
    }
  }, [hoverTransform, duration]);

  const handlers = {
    onMouseEnter: useCallback(() => {
      if (prefersReducedMotion()) return;
      hoverAnimationRef.current?.enter();
    }, []),

    onMouseLeave: useCallback(() => {
      if (prefersReducedMotion()) return;
      hoverAnimationRef.current?.leave();
    }, []),
  };

  return [elementRef, handlers];
}

/**
 * Hook for loading animations
 */
export function useLoadingAnimation(
  type: 'spin' | 'pulse' | 'bounce' = 'spin',
  options: UseAnimationOptions = {}
): [
  React.RefObject<HTMLElement>,
  { start: () => void; stop: () => void; isLoading: boolean },
] {
  const elementRef = useRef<HTMLElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { duration = ANIMATION_DURATIONS.SLOWER } = options;

  const controls = {
    start: useCallback(() => {
      if (!elementRef.current || isLoading) return;

      animationRef.current = createLoadingAnimation(
        elementRef.current,
        type,
        duration
      );
      setIsLoading(true);
    }, [type, duration, isLoading]),

    stop: useCallback(() => {
      if (animationRef.current) {
        animationRef.current.cancel();
        animationRef.current = null;
      }
      setIsLoading(false);
    }, []),

    isLoading,
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        animationRef.current.cancel();
      }
    };
  }, []);

  return [elementRef, controls];
}

/**
 * Hook for focus animations with accessibility support
 */
export function useFocusAnimation(
  options: UseAnimationOptions = {}
): [React.RefObject<HTMLElement>, { onFocus: () => void; onBlur: () => void }] {
  const elementRef = useRef<HTMLElement>(null);
  const focusAnimationRef = useRef<Animation | null>(null);

  const { duration = ANIMATION_DURATIONS.FAST } = options;

  const handlers = {
    onFocus: useCallback(() => {
      if (!elementRef.current || prefersReducedMotion()) return;

      focusAnimationRef.current = createFocusAnimation(
        elementRef.current,
        duration
      );
    }, [duration]),

    onBlur: useCallback(() => {
      if (focusAnimationRef.current) {
        focusAnimationRef.current.cancel();
        focusAnimationRef.current = null;
      }
    }, []),
  };

  return [elementRef, handlers];
}

/**
 * Hook for staggered list animations
 */
export function useStaggerAnimation(
  itemCount: number,
  baseDelay: number = 50,
  animationType: 'fade' | 'slide' | 'scale' = 'fade'
): [React.RefObject<HTMLElement>, { trigger: () => void }] {
  const containerRef = useRef<HTMLElement>(null);
  const [hasTriggered, setHasTriggered] = useState(false);

  const getKeyframes = useCallback((type: string): Keyframe[] => {
    switch (type) {
      case 'slide':
        return [
          { opacity: 0, transform: 'translateY(20px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ];
      case 'scale':
        return [
          { opacity: 0, transform: 'scale(0.9)' },
          { opacity: 1, transform: 'scale(1)' },
        ];
      default: // fade
        return [{ opacity: 0 }, { opacity: 1 }];
    }
  }, []);

  const trigger = useCallback(() => {
    if (!containerRef.current || hasTriggered || prefersReducedMotion()) return;

    const children = Array.from(containerRef.current.children) as HTMLElement[];
    const keyframes = getKeyframes(animationType);
    const actualBaseDelay = getAnimationDuration(baseDelay);

    children.forEach((child, index) => {
      setTimeout(() => {
        child.animate(keyframes, {
          duration: getAnimationDuration(ANIMATION_DURATIONS.NORMAL),
          easing: getEasingFunction(EASING_FUNCTIONS.LUMINA),
          fill: 'forwards',
        });
      }, actualBaseDelay * index);
    });

    setHasTriggered(true);
  }, [hasTriggered, baseDelay, animationType, getKeyframes]);

  return [containerRef, { trigger }];
}

/**
 * Hook for monitoring animation performance across the app
 */
export function useAnimationMetrics(): {
  getAllMetrics: () => Map<string, AnimationMetrics>;
  getAverageFPS: () => number;
  getSlowAnimations: () => AnimationMetrics[];
} {
  const getAllMetrics = useCallback(() => {
    return animationMonitor.getAllMetrics();
  }, []);

  const getAverageFPS = useCallback(() => {
    const metrics = animationMonitor.getAllMetrics();
    const fpsValues = Array.from(metrics.values())
      .map(m => m.averageFPS)
      .filter(fps => fps > 0);

    if (fpsValues.length === 0) return 60; // Default to 60 if no data

    return fpsValues.reduce((sum, fps) => sum + fps, 0) / fpsValues.length;
  }, []);

  const getSlowAnimations = useCallback(() => {
    const metrics = animationMonitor.getAllMetrics();
    return Array.from(metrics.values()).filter(
      m => m.averageFPS < 55 && m.averageFPS > 0
    );
  }, []);

  return {
    getAllMetrics,
    getAverageFPS,
    getSlowAnimations,
  };
}

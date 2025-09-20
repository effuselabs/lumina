/**
 * Performance-optimized animation utilities for Lumina Design System
 * Implements 60fps animations with reduced motion support
 */

// Animation performance monitoring
export interface AnimationMetrics {
    startTime: number;
    endTime?: number;
    duration: number;
    frameCount: number;
    averageFPS: number;
}

// Animation performance monitor
class AnimationPerformanceMonitor {
    private metrics: Map<string, AnimationMetrics> = new Map();
    private frameCallbacks: Map<string, () => void> = new Map();

    startMonitoring(animationId: string, duration: number): void {
        const startTime = performance.now();
        this.metrics.set(animationId, {
            startTime,
            duration,
            frameCount: 0,
            averageFPS: 0,
        });

        // Monitor frame rate
        const frameCallback = () => {
            const metric = this.metrics.get(animationId);
            if (metric && !metric.endTime) {
                metric.frameCount++;
                requestAnimationFrame(frameCallback);
            }
        };

        this.frameCallbacks.set(animationId, frameCallback);
        requestAnimationFrame(frameCallback);
    }

    stopMonitoring(animationId: string): AnimationMetrics | null {
        const metric = this.metrics.get(animationId);
        if (!metric) return null;

        const endTime = performance.now();
        const actualDuration = endTime - metric.startTime;
        const averageFPS = (metric.frameCount / actualDuration) * 1000;

        const finalMetric: AnimationMetrics = {
            ...metric,
            endTime,
            averageFPS,
        };

        this.metrics.set(animationId, finalMetric);
        this.frameCallbacks.delete(animationId);

        // Log performance warnings
        if (averageFPS < 55) {
            console.warn(`Animation ${animationId} running at ${averageFPS.toFixed(1)} FPS`);
        }

        return finalMetric;
    }

    getMetrics(animationId: string): AnimationMetrics | null {
        return this.metrics.get(animationId) || null;
    }

    getAllMetrics(): Map<string, AnimationMetrics> {
        return new Map(this.metrics);
    }
}

// Global animation monitor instance
export const animationMonitor = new AnimationPerformanceMonitor();

// Reduced motion detection
export const prefersReducedMotion = (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// High contrast detection
export const prefersHighContrast = (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-contrast: high)').matches;
};

// Animation duration calculator based on user preferences
export const getAnimationDuration = (baseDuration: number): number => {
    if (prefersReducedMotion()) {
        return Math.min(baseDuration * 0.3, 100); // Reduce to 30% or max 100ms
    }
    return baseDuration;
};

// Easing function calculator
export const getEasingFunction = (baseEasing: string): string => {
    if (prefersReducedMotion()) {
        return 'linear'; // Use linear easing for reduced motion
    }
    return baseEasing;
};

// CSS transform-based animation helpers
export const createTransformAnimation = (
    element: HTMLElement,
    transforms: string[],
    duration: number,
    easing: string = 'cubic-bezier(0.4, 0, 0.2, 1)'
): Animation => {
    const actualDuration = getAnimationDuration(duration);
    const actualEasing = getEasingFunction(easing);

    const keyframes = transforms.map((transform, index) => ({
        transform,
        offset: index / (transforms.length - 1),
    }));

    return element.animate(keyframes, {
        duration: actualDuration,
        easing: actualEasing,
        fill: 'forwards',
    });
};

// Optimized hover animation
export const createHoverAnimation = (
    element: HTMLElement,
    hoverTransform: string = 'translateY(-2px) scale(1.02)',
    duration: number = 200
): {
    enter: () => Animation;
    leave: () => Animation;
} => {
    const actualDuration = getAnimationDuration(duration);
    const actualEasing = getEasingFunction('cubic-bezier(0.4, 0, 0.2, 1)');

    return {
        enter: () =>
            element.animate(
                [
                    { transform: 'translateY(0) scale(1)' },
                    { transform: hoverTransform },
                ],
                {
                    duration: actualDuration,
                    easing: actualEasing,
                    fill: 'forwards',
                }
            ),
        leave: () =>
            element.animate(
                [
                    { transform: hoverTransform },
                    { transform: 'translateY(0) scale(1)' },
                ],
                {
                    duration: actualDuration,
                    easing: actualEasing,
                    fill: 'forwards',
                }
            ),
    };
};

// Loading animation with performance monitoring
export const createLoadingAnimation = (
    element: HTMLElement,
    type: 'spin' | 'pulse' | 'bounce' = 'spin',
    duration: number = 1000
): Animation => {
    const animationId = `loading-${Date.now()}`;
    animationMonitor.startMonitoring(animationId, duration);

    let keyframes: Keyframe[];

    switch (type) {
        case 'spin':
            keyframes = [
                { transform: 'rotate(0deg)' },
                { transform: 'rotate(360deg)' },
            ];
            break;
        case 'pulse':
            keyframes = [
                { opacity: '1', transform: 'scale(1)' },
                { opacity: '0.7', transform: 'scale(0.95)' },
                { opacity: '1', transform: 'scale(1)' },
            ];
            break;
        case 'bounce':
            keyframes = [
                { transform: 'translateY(0)' },
                { transform: 'translateY(-10px)' },
                { transform: 'translateY(0)' },
            ];
            break;
    }

    const actualDuration = getAnimationDuration(duration);
    const animation = element.animate(keyframes, {
        duration: actualDuration,
        easing: 'ease-in-out',
        iterations: Infinity,
    });

    // Stop monitoring when animation ends
    animation.addEventListener('finish', () => {
        animationMonitor.stopMonitoring(animationId);
    });

    return animation;
};

// Stagger animation for lists
export const createStaggerAnimation = (
    elements: HTMLElement[],
    baseDelay: number = 50,
    animationFn: (element: HTMLElement, index: number) => Animation
): Animation[] => {
    const actualBaseDelay = getAnimationDuration(baseDelay);

    return elements.map((element, index) => {
        const delay = actualBaseDelay * index;

        // Add delay before starting animation
        setTimeout(() => {
            animationFn(element, index);
        }, delay);

        // Return a placeholder animation for consistency
        return element.animate([], { duration: 0 });
    });
};

// Intersection Observer for scroll-triggered animations
export const createScrollAnimation = (
    element: HTMLElement,
    animationFn: () => Animation,
    options: IntersectionObserverInit = { threshold: 0.1 }
): IntersectionObserver => {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                animationFn();
                observer.unobserve(element);
            }
        });
    }, options);

    observer.observe(element);
    return observer;
};

// Theme transition animation
export const createThemeTransition = (
    elements: HTMLElement[],
    duration: number = 300
): Promise<void> => {
    const actualDuration = getAnimationDuration(duration);

    if (prefersReducedMotion()) {
        return Promise.resolve();
    }

    const animations = elements.map((element) =>
        element.animate(
            [
                { opacity: '1' },
                { opacity: '0.8' },
                { opacity: '1' },
            ],
            {
                duration: actualDuration,
                easing: 'ease-in-out',
            }
        )
    );

    return Promise.all(animations.map((anim) => anim.finished)).then(() => { });
};

// Focus animation for accessibility
export const createFocusAnimation = (
    element: HTMLElement,
    duration: number = 150
): Animation => {
    const actualDuration = getAnimationDuration(duration);

    return element.animate(
        [
            {
                boxShadow: '0 0 0 0 rgba(255, 210, 90, 0.5)',
                transform: 'scale(1)',
            },
            {
                boxShadow: '0 0 0 3px rgba(255, 210, 90, 0.5)',
                transform: 'scale(1.02)',
            },
        ],
        {
            duration: actualDuration,
            easing: 'ease-out',
            fill: 'forwards',
        }
    );
};

// Performance-optimized CSS class toggler
export const toggleAnimationClass = (
    element: HTMLElement,
    className: string,
    duration: number
): Promise<void> => {
    return new Promise((resolve) => {
        const actualDuration = getAnimationDuration(duration);

        element.classList.add(className);

        setTimeout(() => {
            element.classList.remove(className);
            resolve();
        }, actualDuration);
    });
};

// Animation cleanup utility
export const cleanupAnimations = (animations: Animation[]): void => {
    animations.forEach((animation) => {
        if (animation.playState !== 'finished') {
            animation.cancel();
        }
    });
};

// Export animation constants
export const ANIMATION_DURATIONS = {
    INSTANT: 0,
    FAST: 150,
    NORMAL: 250,
    SLOW: 350,
    SLOWER: 500,
    SLOWEST: 750,
} as const;

export const EASING_FUNCTIONS = {
    LINEAR: 'linear',
    EASE: 'ease',
    EASE_IN: 'ease-in',
    EASE_OUT: 'ease-out',
    EASE_IN_OUT: 'ease-in-out',
    LUMINA: 'cubic-bezier(0.4, 0, 0.2, 1)',
    LUMINA_BOUNCE: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    LUMINA_SHARP: 'cubic-bezier(0.4, 0, 1, 1)',
    LUMINA_GENTLE: 'cubic-bezier(0, 0, 0.2, 1)',
} as const;
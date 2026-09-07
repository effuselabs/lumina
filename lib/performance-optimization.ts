/**
 * Performance Optimization Utilities for Design System
 * Implements CSS bundle size optimization and rendering performance improvements
 */

// CSS Containment utilities for component isolation
export const containmentClasses = {
  layout: 'contain-layout',
  style: 'contain-style',
  paint: 'contain-paint',
  size: 'contain-size',
  strict: 'contain-strict',
  content: 'contain-content',
} as const;

// Performance optimization class utilities
export const performanceClasses = {
  gpuAccelerated: 'gpu-accelerated',
  optimizeRepaint: 'optimize-repaint',
  optimizeAnimation: 'optimize-animation',
  optimizeAnimationComplete: 'optimize-animation-complete',
  preventLayoutShift: 'prevent-layout-shift',
  optimizeFontRendering: 'optimize-font-rendering',
  lazyLoad: 'lazy-load',
  reducePaintComplexity: 'reduce-paint-complexity',
} as const;

// Font loading optimization utilities
export const fontOptimizationClasses = {
  fontLoading: 'font-loading',
  fontLoaded: 'font-loaded',
  preloadFont: 'preload-font',
} as const;

/**
 * Apply CSS containment to improve rendering performance
 */
export function applyContainment(
  element: HTMLElement,
  containment: keyof typeof containmentClasses
): void {
  element.classList.add(containmentClasses[containment]);
}

/**
 * Remove CSS containment when no longer needed
 */
export function removeContainment(
  element: HTMLElement,
  containment: keyof typeof containmentClasses
): void {
  element.classList.remove(containmentClasses[containment]);
}

/**
 * Optimize element for animations
 */
export function optimizeForAnimation(element: HTMLElement): void {
  element.classList.add(performanceClasses.optimizeAnimation);
}

/**
 * Clean up animation optimizations after animation completes
 */
export function cleanupAnimationOptimization(element: HTMLElement): void {
  element.classList.remove(performanceClasses.optimizeAnimation);
  element.classList.add(performanceClasses.optimizeAnimationComplete);

  // Remove will-change after a short delay to ensure animation is complete
  setTimeout(() => {
    element.classList.remove(performanceClasses.optimizeAnimationComplete);
  }, 100);
}

/**
 * Apply performance optimizations to a component container
 */
export function optimizeComponentContainer(element: HTMLElement): void {
  element.classList.add(
    containmentClasses.layout,
    containmentClasses.style,
    performanceClasses.optimizeRepaint
  );
}

/**
 * Font loading state management
 */
export class FontLoadingManager {
  private static instance: FontLoadingManager;
  private loadedFonts = new Set<string>();
  private loadingPromises = new Map<string, Promise<void>>();

  static getInstance(): FontLoadingManager {
    if (!FontLoadingManager.instance) {
      FontLoadingManager.instance = new FontLoadingManager();
    }
    return FontLoadingManager.instance;
  }

  /**
   * Check if a font is loaded
   */
  isFontLoaded(fontFamily: string): boolean {
    return this.loadedFonts.has(fontFamily);
  }

  /**
   * Load a font and return a promise that resolves when loaded
   */
  async loadFont(fontFamily: string): Promise<void> {
    if (this.loadedFonts.has(fontFamily)) {
      return Promise.resolve();
    }

    if (this.loadingPromises.has(fontFamily)) {
      return this.loadingPromises.get(fontFamily)!;
    }

    const loadingPromise = this.loadFontInternal(fontFamily);
    this.loadingPromises.set(fontFamily, loadingPromise);

    try {
      await loadingPromise;
      this.loadedFonts.add(fontFamily);
    } finally {
      this.loadingPromises.delete(fontFamily);
    }
  }

  private async loadFontInternal(fontFamily: string): Promise<void> {
    if (typeof document === 'undefined') {
      return; // SSR environment
    }

    // Use Font Loading API if available
    if ('fonts' in document) {
      try {
        await document.fonts.load(`1rem ${fontFamily}`);
        return;
      } catch (error) {
        console.warn(`Failed to load font ${fontFamily}:`, error);
      }
    }

    // Fallback: Create a test element to trigger font loading
    return new Promise(resolve => {
      const testElement = document.createElement('div');
      testElement.style.fontFamily = fontFamily;
      testElement.style.fontSize = '1rem';
      testElement.style.position = 'absolute';
      testElement.style.left = '-9999px';
      testElement.style.top = '-9999px';
      testElement.textContent = 'Test';

      document.body.appendChild(testElement);

      // Check if font is loaded by measuring text width
      const fallbackWidth = testElement.offsetWidth;

      const checkFont = () => {
        const currentWidth = testElement.offsetWidth;
        if (currentWidth !== fallbackWidth) {
          document.body.removeChild(testElement);
          resolve();
        } else {
          requestAnimationFrame(checkFont);
        }
      };

      requestAnimationFrame(checkFont);

      // Timeout after 3 seconds
      setTimeout(() => {
        if (document.body.contains(testElement)) {
          document.body.removeChild(testElement);
          resolve();
        }
      }, 3000);
    });
  }

  /**
   * Apply font loading state to an element
   */
  applyFontLoadingState(element: HTMLElement, fontFamily: string): void {
    element.classList.add(fontOptimizationClasses.fontLoading);

    this.loadFont(fontFamily).then(() => {
      element.classList.remove(fontOptimizationClasses.fontLoading);
      element.classList.add(fontOptimizationClasses.fontLoaded);
    });
  }
}

/**
 * Intersection Observer for lazy loading optimization
 */
export class LazyLoadManager {
  private static instance: LazyLoadManager;
  private observer: IntersectionObserver | null = null;
  private observedElements = new WeakSet<Element>();

  static getInstance(): LazyLoadManager {
    if (!LazyLoadManager.instance) {
      LazyLoadManager.instance = new LazyLoadManager();
    }
    return LazyLoadManager.instance;
  }

  constructor() {
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const element = entry.target as HTMLElement;
              element.classList.remove(performanceClasses.lazyLoad);
              this.observer?.unobserve(element);
            }
          });
        },
        {
          rootMargin: '50px',
          threshold: 0.1,
        }
      );
    }
  }

  /**
   * Observe an element for lazy loading
   */
  observe(element: HTMLElement): void {
    if (this.observer && !this.observedElements.has(element)) {
      element.classList.add(performanceClasses.lazyLoad);
      this.observer.observe(element);
      this.observedElements.add(element);
    }
  }

  /**
   * Stop observing an element
   */
  unobserve(element: HTMLElement): void {
    if (this.observer && this.observedElements.has(element)) {
      this.observer.unobserve(element);
      this.observedElements.delete(element);
    }
  }
}

/**
 * CSS Custom Properties optimization
 */
export class CSSCustomPropertiesManager {
  private static instance: CSSCustomPropertiesManager;
  private propertyCache = new Map<string, string>();

  static getInstance(): CSSCustomPropertiesManager {
    if (!CSSCustomPropertiesManager.instance) {
      CSSCustomPropertiesManager.instance = new CSSCustomPropertiesManager();
    }
    return CSSCustomPropertiesManager.instance;
  }

  /**
   * Get a CSS custom property value with caching
   */
  getProperty(propertyName: string, element?: HTMLElement): string {
    const cacheKey = `${propertyName}-${element?.tagName || 'root'}`;

    if (this.propertyCache.has(cacheKey)) {
      return this.propertyCache.get(cacheKey)!;
    }

    if (typeof window === 'undefined') {
      return ''; // SSR environment
    }

    const computedStyle = getComputedStyle(element || document.documentElement);
    const value = computedStyle.getPropertyValue(propertyName).trim();

    this.propertyCache.set(cacheKey, value);
    return value;
  }

  /**
   * Set a CSS custom property
   */
  setProperty(
    propertyName: string,
    value: string,
    element?: HTMLElement
  ): void {
    const target = element || document.documentElement;
    target.style.setProperty(propertyName, value);

    // Update cache
    const cacheKey = `${propertyName}-${target.tagName}`;
    this.propertyCache.set(cacheKey, value);
  }

  /**
   * Clear property cache
   */
  clearCache(): void {
    this.propertyCache.clear();
  }
}

/**
 * Bundle size optimization utilities
 */
export const bundleOptimization = {
  /**
   * Dynamically import a component to enable code splitting
   */
  async loadComponent<T>(importFn: () => Promise<{ default: T }>): Promise<T> {
    try {
      const module = await importFn();
      return module.default;
    } catch (error) {
      console.error('Failed to load component:', error);
      throw error;
    }
  },

  /**
   * Preload a component for better performance
   */
  preloadComponent(importFn: () => Promise<any>): void {
    // Use requestIdleCallback if available, otherwise use setTimeout
    if (typeof window !== 'undefined') {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => {
          importFn().catch(() => {
            // Ignore preload errors
          });
        });
      } else {
        setTimeout(() => {
          importFn().catch(() => {
            // Ignore preload errors
          });
        }, 100);
      }
    }
  },
};

/**
 * Performance monitoring utilities
 */
export const performanceMonitoring = {
  /**
   * Measure component render time
   */
  measureRenderTime(componentName: string, renderFn: () => void): void {
    if (typeof performance === 'undefined') {
      renderFn();
      return;
    }

    const startTime = performance.now();
    renderFn();
    const endTime = performance.now();

    const renderTime = endTime - startTime;

    // Log slow renders (>16ms for 60fps)
    if (renderTime > 16) {
      console.warn(
        `Slow render detected for ${componentName}: ${renderTime.toFixed(2)}ms`
      );
    }
  },

  /**
   * Mark performance milestones
   */
  mark(name: string): void {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(name);
    }
  },

  /**
   * Measure performance between two marks
   */
  measure(name: string, startMark: string, endMark: string): void {
    if (typeof performance !== 'undefined' && performance.measure) {
      try {
        performance.measure(name, startMark, endMark);
      } catch (error) {
        console.warn(`Failed to measure performance for ${name}:`, error);
      }
    }
  },
};

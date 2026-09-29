/**
 * Performance utilities for component rendering and bundle optimization
 * Provides monitoring, memoization helpers, and bundle analysis tools
 *
 * This file contains server-safe utilities only.
 * Client-side hooks are in performance-hooks.ts
 */

// Performance metrics interface
interface ComponentMetrics {
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
      propsChanges: propsChanged
        ? existing.propsChanges + 1
        : existing.propsChanges,
      unnecessaryRenders: !propsChanged
        ? existing.unnecessaryRenders + 1
        : existing.unnecessaryRenders,
    };

    newMetrics.averageRenderTime =
      newMetrics.totalRenderTime / newMetrics.renderCount;

    this.metrics.set(componentName, newMetrics);
    this.renderStartTimes.delete(componentName);

    // Log performance warnings
    if (renderTime > 16) {
      console.warn(
        `Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`
      );
    }

    if (newMetrics.unnecessaryRenders > 5) {
      console.warn(
        `Excessive re-renders: ${componentName} has ${newMetrics.unnecessaryRenders} unnecessary renders`
      );
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

  getComponentsWithExcessiveRenders(
    threshold: number = 10
  ): ComponentMetrics[] {
    return this.getAllMetrics().filter(m => m.unnecessaryRenders > threshold);
  }

  reset(): void {
    this.metrics.clear();
    this.renderStartTimes.clear();
  }
}

// Global monitor instance
export const performanceMonitor = new ComponentPerformanceMonitor();

// React hooks have been moved to performance-hooks.ts for client-side usage

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

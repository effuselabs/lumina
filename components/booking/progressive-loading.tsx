'use client';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useNetworkResilience } from '@/hooks/use-network-resilience';
import { usePerformanceMonitor } from '@/lib/performance-hooks';
import { cn } from '@/lib/utils';
import { Loader2, WifiOff } from 'lucide-react';
import { ReactNode, Suspense, useEffect, useRef, useState } from 'react';

interface ProgressiveLoadingProps {
  children: ReactNode;
  fallback?: ReactNode;
  priority?: 'high' | 'medium' | 'low';
  loadingMessage?: string;
  className?: string;
}

export function ProgressiveLoading({
  children,
  fallback,
  priority = 'medium',
  loadingMessage = 'Loading...',
  className,
}: ProgressiveLoadingProps) {
  const { trackPropsChange } = usePerformanceMonitor('ProgressiveLoading');
  const { networkState } = useNetworkResilience();
  const containerRef = useRef<HTMLDivElement>(null);
  // `priority: 'high'` means the caller is rendering this immediately, above
  // the fold — deferring it behind an intersection check only delays content
  // the user is already looking at.
  const [isVisible, setIsVisible] = useState(priority === 'high');

  // Track props for performance monitoring
  useEffect(() => {
    trackPropsChange({ priority, loadingMessage });
  }, [priority, loadingMessage, trackPropsChange]);

  // Intersection Observer for lazy loading
  /*
   * Reveal the content once it scrolls into view.
   *
   * This previously looked the element up with
   * `document.getElementById(`progressive-${Math.random()}`)`, while the
   * container rendered with a DIFFERENT `Math.random()` id. The two could
   * never match, so `element` was always null, the observer never observed
   * anything, `isVisible` stayed false forever, and DelayedContent returned
   * a skeleton permanently.
   *
   * Every lazily-loaded step of the booking flow sits inside this component,
   * so the booking form was unreachable: a skeleton that never resolved, no
   * network request, and no error to explain it. Observing a ref removes the
   * id lookup entirely.
   */
  useEffect(() => {
    // Already revealed (high priority, or a previous intersection).
    if (isVisible) return undefined;

    const element = containerRef.current;
    if (!element) return undefined;

    // Environments without IntersectionObserver must still show content.
    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Start loading just before it comes into view
        threshold: 0.1,
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [isVisible]);

  // Adjust loading behavior based on network conditions
  const getLoadingDelay = () => {
    if (!networkState.isOnline) return 0;
    if (networkState.isSlowConnection) {
      return priority === 'high' ? 0 : priority === 'medium' ? 500 : 1000;
    }
    return priority === 'high' ? 0 : priority === 'medium' ? 100 : 300;
  };

  const defaultFallback = (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          {networkState.isOnline ? (
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-500" />
          ) : (
            <WifiOff className="mx-auto h-8 w-8 text-gray-400" />
          )}
          <p className="mt-2 text-sm text-gray-600">
            {networkState.isOnline
              ? loadingMessage
              : 'Offline - content unavailable'}
          </p>
          {networkState.isSlowConnection && (
            <p className="mt-1 text-xs text-gray-500">
              Slow connection detected - optimizing loading...
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className={className}>
      <Suspense fallback={fallback || defaultFallback}>
        <DelayedContent delay={getLoadingDelay()} isVisible={isVisible}>
          {children}
        </DelayedContent>
      </Suspense>
    </div>
  );
}

interface DelayedContentProps {
  children: ReactNode;
  delay: number;
  isVisible: boolean;
}

function DelayedContent({ children, delay, isVisible }: DelayedContentProps) {
  const [shouldRender, setShouldRender] = useState(delay === 0);

  useEffect(() => {
    if (!isVisible) return undefined;

    if (delay > 0) {
      const timer = setTimeout(() => setShouldRender(true), delay);
      return () => clearTimeout(timer);
    } else {
      setShouldRender(true);
      return undefined;
    }
  }, [delay, isVisible]);

  if (!shouldRender || !isVisible) {
    return <ContentSkeleton />;
  }

  return <>{children}</>;
}

// Adaptive skeleton based on content type
function ContentSkeleton() {
  return (
    <Card className="p-4">
      <div className="space-y-4">
        <Skeleton className="h-6 w-3/4" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    </Card>
  );
}

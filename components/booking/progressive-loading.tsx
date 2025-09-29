'use client';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useNetworkResilience } from '@/hooks/use-network-resilience';
import { usePerformanceMonitor } from '@/lib/performance-hooks';
import { cn } from '@/lib/utils';
import { Loader2, WifiOff } from 'lucide-react';
import { ReactNode, Suspense, useEffect, useState } from 'react';

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
    const [isVisible, setIsVisible] = useState(false);

    // Track props for performance monitoring
    useEffect(() => {
        trackPropsChange({ priority, loadingMessage });
    }, [priority, loadingMessage, trackPropsChange]);

    // Intersection Observer for lazy loading
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            {
                rootMargin: '50px', // Start loading 50px before element is visible
                threshold: 0.1,
            }
        );

        const element = document.getElementById(`progressive-${Math.random()}`);
        if (element) {
            observer.observe(element);
        }

        return () => observer.disconnect();
    }, []);

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
                        {networkState.isOnline ? loadingMessage : 'Offline - content unavailable'}
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
        <div id={`progressive-${Math.random()}`} className={className}>
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
        if (!isVisible) return;

        if (delay > 0) {
            const timer = setTimeout(() => setShouldRender(true), delay);
            return () => clearTimeout(timer);
        } else {
            setShouldRender(true);
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

// Code splitting utility for dynamic imports
export function createProgressiveComponent<T extends React.ComponentType<any>>(
    importFn: () => Promise<{ default: T }>,
    fallback?: ReactNode
) {
    return function ProgressiveComponent(props: React.ComponentProps<T>) {
        const [Component, setComponent] = useState<T | null>(null);
        const [error, setError] = useState<Error | null>(null);
        const { networkState, resilientFetch } = useNetworkResilience();

        useEffect(() => {
            let isMounted = true;

            const loadComponent = async () => {
                try {
                    // Use resilient fetch for better network handling
                    const module = await importFn();
                    if (isMounted) {
                        setComponent(() => module.default);
                    }
                } catch (err) {
                    if (isMounted) {
                        setError(err as Error);
                    }
                }
            };

            // Delay loading on slow connections for non-critical components
            const delay = networkState.isSlowConnection ? 500 : 0;
            const timer = setTimeout(loadComponent, delay);

            return () => {
                isMounted = false;
                clearTimeout(timer);
            };
        }, [networkState.isSlowConnection]);

        if (error) {
            return (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <p className="text-sm text-red-700">
                        Failed to load component. Please refresh the page.
                    </p>
                </div>
            );
        }

        if (!Component) {
            return fallback || <ContentSkeleton />;
        }

        return <Component {...props} />;
    };
}

// Image progressive loading with WebP support
interface ProgressiveImageProps {
    src: string;
    alt: string;
    className?: string;
    priority?: boolean;
    sizes?: string;
}

export function ProgressiveImage({
    src,
    alt,
    className,
    priority = false,
    sizes,
}: ProgressiveImageProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [imageSrc, setImageSrc] = useState<string>('');
    const { networkState } = useNetworkResilience();

    useEffect(() => {
        // Choose image format based on browser support and network conditions
        const supportsWebP = () => {
            const canvas = document.createElement('canvas');
            return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
        };

        const getOptimizedSrc = () => {
            if (networkState.isSlowConnection) {
                // Use lower quality for slow connections
                return src.includes('?') ? `${src}&q=60` : `${src}?q=60`;
            }

            if (supportsWebP() && !src.includes('.webp')) {
                // Convert to WebP if supported
                return src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
            }

            return src;
        };

        setImageSrc(getOptimizedSrc());
    }, [src, networkState.isSlowConnection]);

    return (
        <div className={cn('relative overflow-hidden', className)}>
            {!isLoaded && (
                <div className="absolute inset-0 animate-pulse bg-gray-200" />
            )}
            <img
                src={imageSrc}
                alt={alt}
                sizes={sizes}
                loading={priority ? 'eager' : 'lazy'}
                onLoad={() => setIsLoaded(true)}
                className={cn(
                    'transition-opacity duration-300',
                    isLoaded ? 'opacity-100' : 'opacity-0',
                    className
                )}
            />
        </div>
    );
}

// Network-aware content loading
interface NetworkAwareContentProps {
    children: ReactNode;
    fallback?: ReactNode;
    offlineContent?: ReactNode;
    slowConnectionContent?: ReactNode;
}

export function NetworkAwareContent({
    children,
    fallback,
    offlineContent,
    slowConnectionContent,
}: NetworkAwareContentProps) {
    const { networkState, shouldShowOfflineMessage } = useNetworkResilience();

    if (!networkState.isOnline && offlineContent) {
        return <>{offlineContent}</>;
    }

    if (networkState.isSlowConnection && slowConnectionContent) {
        return <>{slowConnectionContent}</>;
    }

    if (shouldShowOfflineMessage() && fallback) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}

// Performance-optimized list rendering
interface VirtualizedListProps<T> {
    items: T[];
    renderItem: (item: T, index: number) => ReactNode;
    itemHeight: number;
    containerHeight: number;
    className?: string;
}

export function VirtualizedList<T>({
    items,
    renderItem,
    itemHeight,
    containerHeight,
    className,
}: VirtualizedListProps<T>) {
    const [scrollTop, setScrollTop] = useState(0);

    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.min(
        visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
        items.length
    );

    const visibleItems = items.slice(visibleStart, visibleEnd);
    const totalHeight = items.length * itemHeight;
    const offsetY = visibleStart * itemHeight;

    return (
        <div
            className={cn('overflow-auto', className)}
            style={{ height: containerHeight }}
            onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        >
            <div style={{ height: totalHeight, position: 'relative' }}>
                <div style={{ transform: `translateY(${offsetY}px)` }}>
                    {visibleItems.map((item, index) =>
                        renderItem(item, visibleStart + index)
                    )}
                </div>
            </div>
        </div>
    );
}
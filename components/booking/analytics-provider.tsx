'use client';

import { useBookingAnalytics } from '@/hooks/use-booking-analytics';
import { createContext, ReactNode, useContext, useEffect } from 'react';

interface AnalyticsContextType {
    trackBookingStarted: (metadata?: Record<string, any>) => Promise<void>;
    trackServiceSelected: (serviceId: string, serviceName: string) => Promise<void>;
    trackTimeSelected: (timeSlot: string, staffId: string) => Promise<void>;
    trackFormSubmitted: (formData: Record<string, any>) => Promise<void>;
    trackBookingCompleted: (appointmentId: string, totalPrice: number) => Promise<void>;
    trackBookingAbandoned: (lastStep: string, reason?: string) => Promise<void>;
    trackError: (error: Error, errorType?: any, severity?: any, context?: Record<string, any>) => Promise<void>;
    trackPageLoad: (loadTime: number) => Promise<void>;
    trackAPICall: (endpoint: string, method: string, duration: number, statusCode: number) => Promise<void>;
    sessionId: string;
}

const AnalyticsContext = createContext<AnalyticsContextType | null>(null);

interface AnalyticsProviderProps {
    businessId: string;
    userId?: string;
    clientId?: string;
    children: ReactNode;
}

export function AnalyticsProvider({
    businessId,
    userId,
    clientId,
    children
}: AnalyticsProviderProps) {
    const analytics = useBookingAnalytics({
        businessId,
        userId,
        clientId,
    });

    // Track page load performance
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const handleLoad = () => {
                // Use Navigation Timing API to get accurate load time
                const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
                if (navigation) {
                    const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
                    analytics.trackPageLoad(loadTime);
                }
            };

            if (document.readyState === 'complete') {
                handleLoad();
                return undefined;
            } else {
                window.addEventListener('load', handleLoad);
                return () => window.removeEventListener('load', handleLoad);
            }
        }
        return undefined;
    }, [analytics]);

    // Track page visibility changes (for abandonment tracking)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const handleVisibilityChange = () => {
                if (document.hidden) {
                    // User switched away from the page - potential abandonment
                    analytics.trackEvent('booking_abandoned', {
                        reason: 'page_hidden',
                        url: window.location.href,
                    });
                }
            };

            document.addEventListener('visibilitychange', handleVisibilityChange);
            return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
        }
        return undefined;
    }, [analytics]);

    // Track unload events (for abandonment tracking)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const handleBeforeUnload = () => {
                // User is leaving the page - potential abandonment
                navigator.sendBeacon('/api/analytics/track-event', JSON.stringify({
                    businessId,
                    eventType: 'booking_abandoned',
                    sessionId: analytics.sessionId,
                    metadata: {
                        reason: 'page_unload',
                        url: window.location.href,
                    },
                }));
            };

            window.addEventListener('beforeunload', handleBeforeUnload);
            return () => window.removeEventListener('beforeunload', handleBeforeUnload);
        }
        return undefined;
    }, [businessId, analytics.sessionId]);

    const contextValue: AnalyticsContextType = {
        trackBookingStarted: analytics.trackBookingStarted,
        trackServiceSelected: analytics.trackServiceSelected,
        trackTimeSelected: analytics.trackTimeSelected,
        trackFormSubmitted: analytics.trackFormSubmitted,
        trackBookingCompleted: analytics.trackBookingCompleted,
        trackBookingAbandoned: analytics.trackBookingAbandoned,
        trackError: analytics.trackError,
        trackPageLoad: analytics.trackPageLoad,
        trackAPICall: analytics.trackAPICall,
        sessionId: analytics.sessionId,
    };

    return (
        <AnalyticsContext.Provider value={contextValue}>
            {children}
        </AnalyticsContext.Provider>
    );
}

export function useAnalytics(): AnalyticsContextType {
    const context = useContext(AnalyticsContext);
    if (!context) {
        throw new Error('useAnalytics must be used within an AnalyticsProvider');
    }
    return context;
}

// Higher-order component for automatic error tracking
export function withErrorTracking<T extends Record<string, any>>(
    Component: React.ComponentType<T>
): React.ComponentType<T> {
    return function WrappedComponent(props: T) {
        const analytics = useAnalytics();

        useEffect(() => {
            const handleError = (event: ErrorEvent) => {
                analytics.trackError(
                    new Error(event.message),
                    'system',
                    'high',
                    {
                        filename: event.filename,
                        lineno: event.lineno,
                        colno: event.colno,
                        url: window.location.href,
                    }
                );
            };

            const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
                analytics.trackError(
                    new Error(event.reason?.message || 'Unhandled promise rejection'),
                    'system',
                    'high',
                    {
                        reason: event.reason,
                        url: window.location.href,
                    }
                );
            };

            window.addEventListener('error', handleError);
            window.addEventListener('unhandledrejection', handleUnhandledRejection);

            return () => {
                window.removeEventListener('error', handleError);
                window.removeEventListener('unhandledrejection', handleUnhandledRejection);
            };
        }, [analytics]);

        return <Component {...props} />;
    };
}
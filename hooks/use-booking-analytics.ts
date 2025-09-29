'use client';

import { bookingAnalytics, BookingAnalyticsEvent } from '@/lib/analytics/booking-analytics';
import { BookingError, bookingErrorTracker } from '@/lib/monitoring/booking-error-tracker';
import { createPerformanceMonitor } from '@/lib/monitoring/booking-performance-monitor';
import { useCallback, useEffect, useRef } from 'react';

interface UseBookingAnalyticsOptions {
    businessId: string;
    sessionId?: string;
    userId?: string;
    clientId?: string;
}

export function useBookingAnalytics({
    businessId,
    sessionId,
    userId,
    clientId,
}: UseBookingAnalyticsOptions) {
    const performanceMonitor = useRef(createPerformanceMonitor(businessId));
    const sessionIdRef = useRef(sessionId || generateSessionId());

    useEffect(() => {
        // Initialize performance monitoring
        const monitor = performanceMonitor.current;

        return () => {
            monitor.destroy();
        };
    }, []);

    const trackEvent = useCallback(async (
        eventType: BookingAnalyticsEvent['eventType'],
        metadata?: Record<string, any>
    ) => {
        try {
            await bookingAnalytics.trackEvent({
                businessId,
                eventType,
                sessionId: sessionIdRef.current,
                timestamp: new Date(),
                metadata,
                userId,
                clientId,
            });
        } catch (error) {
            console.error('Failed to track analytics event:', error);
        }
    }, [businessId, userId, clientId]);

    const trackError = useCallback(async (
        error: Error,
        errorType: BookingError['errorType'] = 'system',
        severity: BookingError['severity'] = 'medium',
        context?: Record<string, any>
    ) => {
        try {
            await bookingErrorTracker.trackError({
                businessId,
                errorType,
                severity,
                message: error.message,
                stack: error.stack,
                context,
                userId,
                sessionId: sessionIdRef.current,
                timestamp: new Date(),
            });
        } catch (err) {
            console.error('Failed to track error:', err);
        }
    }, [businessId, userId]);

    const trackPerformance = useCallback(async (
        eventType: 'page_load' | 'api_response' | 'user_interaction',
        duration?: number,
        metadata?: Record<string, any>
    ) => {
        try {
            await performanceMonitor.current.trackPerformance({
                businessId,
                eventType,
                duration,
                timestamp: new Date(),
                metadata,
            });
        } catch (error) {
            console.error('Failed to track performance:', error);
        }
    }, [businessId]);

    // Convenience methods for common events
    const trackBookingStarted = useCallback((metadata?: Record<string, any>) => {
        return trackEvent('booking_started', metadata);
    }, [trackEvent]);

    const trackServiceSelected = useCallback((serviceId: string, serviceName: string) => {
        return trackEvent('service_selected', { serviceId, serviceName });
    }, [trackEvent]);

    const trackTimeSelected = useCallback((timeSlot: string, staffId: string) => {
        return trackEvent('time_selected', { timeSlot, staffId });
    }, [trackEvent]);

    const trackFormSubmitted = useCallback((formData: Record<string, any>) => {
        return trackEvent('form_submitted', { formData });
    }, [trackEvent]);

    const trackBookingCompleted = useCallback((appointmentId: string, totalPrice: number) => {
        return trackEvent('booking_completed', { appointmentId, totalPrice });
    }, [trackEvent]);

    const trackBookingAbandoned = useCallback((lastStep: string, reason?: string) => {
        return trackEvent('booking_abandoned', { lastStep, reason });
    }, [trackEvent]);

    // Performance tracking helpers
    const trackPageLoad = useCallback((loadTime: number) => {
        return trackPerformance('page_load', loadTime, {
            url: typeof window !== 'undefined' ? window.location.href : undefined,
            userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        });
    }, [trackPerformance]);

    const trackAPICall = useCallback(async (
        endpoint: string,
        method: string,
        duration: number,
        statusCode: number
    ) => {
        return trackPerformance('api_response', duration, {
            endpoint,
            method,
            statusCode,
        });
    }, [trackPerformance]);

    // Error tracking helpers
    const trackValidationError = useCallback((field: string, message: string) => {
        const error = new Error(`Validation error: ${message}`);
        return trackError(error, 'validation', 'low', { field });
    }, [trackError]);

    const trackAvailabilityError = useCallback((message: string, context?: Record<string, any>) => {
        const error = new Error(`Availability error: ${message}`);
        return trackError(error, 'availability', 'medium', context);
    }, [trackError]);

    const trackPaymentError = useCallback((message: string, context?: Record<string, any>) => {
        const error = new Error(`Payment error: ${message}`);
        return trackError(error, 'payment', 'high', context);
    }, [trackError]);

    const trackSystemError = useCallback((error: Error, context?: Record<string, any>) => {
        return trackError(error, 'system', 'high', context);
    }, [trackError]);

    const trackNetworkError = useCallback((message: string, context?: Record<string, any>) => {
        const error = new Error(`Network error: ${message}`);
        return trackError(error, 'network', 'medium', context);
    }, [trackError]);

    return {
        sessionId: sessionIdRef.current,

        // Event tracking
        trackEvent,
        trackBookingStarted,
        trackServiceSelected,
        trackTimeSelected,
        trackFormSubmitted,
        trackBookingCompleted,
        trackBookingAbandoned,

        // Performance tracking
        trackPerformance,
        trackPageLoad,
        trackAPICall,

        // Error tracking
        trackError,
        trackValidationError,
        trackAvailabilityError,
        trackPaymentError,
        trackSystemError,
        trackNetworkError,
    };
}

function generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
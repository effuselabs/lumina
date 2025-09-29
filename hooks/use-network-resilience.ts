'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface NetworkState {
    isOnline: boolean;
    connectionType: string;
    isSlowConnection: boolean;
    retryCount: number;
    lastFailedAt?: Date;
}

interface RetryConfig {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    backoffFactor: number;
}

interface UseNetworkResilienceOptions {
    retryConfig?: Partial<RetryConfig>;
    onConnectionChange?: (isOnline: boolean) => void;
    onSlowConnection?: (isSlowConnection: boolean) => void;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
};

export function useNetworkResilience(options: UseNetworkResilienceOptions = {}) {
    const { retryConfig = {}, onConnectionChange, onSlowConnection } = options;
    const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };

    const [networkState, setNetworkState] = useState<NetworkState>({
        isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
        connectionType: 'unknown',
        isSlowConnection: false,
        retryCount: 0,
    });

    const retryTimeoutRef = useRef<NodeJS.Timeout>();
    const requestCacheRef = useRef<Map<string, Promise<any>>>(new Map());

    // Monitor network connectivity
    useEffect(() => {
        const handleOnline = () => {
            setNetworkState(prev => ({ ...prev, isOnline: true, retryCount: 0 }));
            onConnectionChange?.(true);
        };

        const handleOffline = () => {
            setNetworkState(prev => ({ ...prev, isOnline: false }));
            onConnectionChange?.(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Monitor connection quality if available
        if ('connection' in navigator) {
            const connection = (navigator as any).connection;

            const updateConnectionInfo = () => {
                const effectiveType = connection?.effectiveType || 'unknown';
                const isSlowConnection = ['slow-2g', '2g'].includes(effectiveType);

                setNetworkState(prev => ({
                    ...prev,
                    connectionType: effectiveType,
                    isSlowConnection,
                }));

                onSlowConnection?.(isSlowConnection);
            };

            updateConnectionInfo();
            connection?.addEventListener('change', updateConnectionInfo);

            return () => {
                window.removeEventListener('online', handleOnline);
                window.removeEventListener('offline', handleOffline);
                connection?.removeEventListener('change', updateConnectionInfo);
            };
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [onConnectionChange, onSlowConnection]);

    // Calculate retry delay with exponential backoff
    const calculateRetryDelay = useCallback((retryCount: number): number => {
        const delay = Math.min(
            config.baseDelay * Math.pow(config.backoffFactor, retryCount),
            config.maxDelay
        );
        // Add jitter to prevent thundering herd
        return delay + Math.random() * 1000;
    }, [config]);

    // Enhanced fetch with retry logic and caching
    const resilientFetch = useCallback(
        async <T>(
            url: string,
            options: RequestInit = {},
            cacheKey?: string
        ): Promise<T> => {
            // Check cache first
            if (cacheKey && requestCacheRef.current.has(cacheKey)) {
                return requestCacheRef.current.get(cacheKey);
            }

            const fetchWithRetry = async (attempt: number = 0): Promise<T> => {
                try {
                    // Check if we're offline
                    if (!networkState.isOnline) {
                        throw new Error('No internet connection');
                    }

                    // Add timeout for slow connections
                    const timeoutMs = networkState.isSlowConnection ? 15000 : 8000;
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

                    const response = await fetch(url, {
                        ...options,
                        signal: controller.signal,
                        headers: {
                            ...options.headers,
                            'Cache-Control': networkState.isSlowConnection
                                ? 'max-age=300'
                                : 'no-cache',
                        },
                    });

                    clearTimeout(timeoutId);

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    const data = await response.json();

                    // Update retry count on success
                    setNetworkState(prev => ({ ...prev, retryCount: 0 }));

                    return data;
                } catch (error) {
                    const isNetworkError =
                        error instanceof TypeError ||
                        error.name === 'AbortError' ||
                        error.message.includes('Failed to fetch') ||
                        error.message.includes('No internet connection');

                    // Only retry on network errors, not on HTTP errors like 400, 404, etc.
                    if (isNetworkError && attempt < config.maxRetries) {
                        setNetworkState(prev => ({
                            ...prev,
                            retryCount: attempt + 1,
                            lastFailedAt: new Date(),
                        }));

                        const delay = calculateRetryDelay(attempt);

                        return new Promise((resolve, reject) => {
                            retryTimeoutRef.current = setTimeout(async () => {
                                try {
                                    const result = await fetchWithRetry(attempt + 1);
                                    resolve(result);
                                } catch (retryError) {
                                    reject(retryError);
                                }
                            }, delay);
                        });
                    }

                    throw error;
                }
            };

            const promise = fetchWithRetry();

            // Cache the promise if cacheKey is provided
            if (cacheKey) {
                requestCacheRef.current.set(cacheKey, promise);

                // Remove from cache after completion (success or failure)
                promise.finally(() => {
                    requestCacheRef.current.delete(cacheKey);
                });
            }

            return promise;
        },
        [networkState, config, calculateRetryDelay]
    );

    // Clear retry timeout
    const cancelRetry = useCallback(() => {
        if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = undefined;
        }
    }, []);

    // Reset retry state
    const resetRetryState = useCallback(() => {
        setNetworkState(prev => ({ ...prev, retryCount: 0, lastFailedAt: undefined }));
        cancelRetry();
    }, [cancelRetry]);

    // Check if we should show offline message
    const shouldShowOfflineMessage = useCallback(() => {
        return !networkState.isOnline ||
            (networkState.retryCount >= config.maxRetries && networkState.lastFailedAt);
    }, [networkState, config.maxRetries]);

    // Get user-friendly error message
    const getNetworkErrorMessage = useCallback((error: Error) => {
        if (!networkState.isOnline) {
            return 'No internet connection. Please check your network and try again.';
        }

        if (networkState.isSlowConnection) {
            return 'Your connection is slow. This may take a moment...';
        }

        if (error.name === 'AbortError') {
            return 'Request timed out. Please try again.';
        }

        if (error.message.includes('Failed to fetch')) {
            return 'Unable to connect to the server. Please try again.';
        }

        return 'Network error occurred. Please try again.';
    }, [networkState]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cancelRetry();
            requestCacheRef.current.clear();
        };
    }, [cancelRetry]);

    return {
        networkState,
        resilientFetch,
        cancelRetry,
        resetRetryState,
        shouldShowOfflineMessage,
        getNetworkErrorMessage,
        isRetrying: networkState.retryCount > 0,
        canRetry: networkState.retryCount < config.maxRetries,
    };
}
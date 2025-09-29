'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useNetworkResilience } from '@/hooks/use-network-resilience';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle, RefreshCw, WifiOff } from 'lucide-react';
import { ReactNode, useCallback, useEffect, useState } from 'react';

interface OfflineSupportProps {
    children: ReactNode;
    fallback?: ReactNode;
    enableOfflineMode?: boolean;
    className?: string;
}

export function OfflineSupport({
    children,
    fallback,
    enableOfflineMode = true,
    className,
}: OfflineSupportProps) {
    const { networkState, shouldShowOfflineMessage, resetRetryState } = useNetworkResilience();
    const [offlineData, setOfflineData] = useState<any>(null);
    const [pendingActions, setPendingActions] = useState<any[]>([]);

    // Load cached data when offline
    useEffect(() => {
        if (!networkState.isOnline && enableOfflineMode) {
            loadOfflineData();
        }
    }, [networkState.isOnline, enableOfflineMode]);

    const loadOfflineData = useCallback(async () => {
        try {
            const cached = localStorage.getItem('booking-offline-data');
            if (cached) {
                setOfflineData(JSON.parse(cached));
            }
        } catch (error) {
            console.warn('Failed to load offline data:', error);
        }
    }, []);

    const saveOfflineData = useCallback((data: any) => {
        try {
            localStorage.setItem('booking-offline-data', JSON.stringify(data));
            setOfflineData(data);
        } catch (error) {
            console.warn('Failed to save offline data:', error);
        }
    }, []);

    const addPendingAction = useCallback((action: any) => {
        setPendingActions(prev => [...prev, { ...action, timestamp: Date.now() }]);

        // Save to localStorage for persistence
        try {
            const updated = [...pendingActions, { ...action, timestamp: Date.now() }];
            localStorage.setItem('booking-pending-actions', JSON.stringify(updated));
        } catch (error) {
            console.warn('Failed to save pending action:', error);
        }
    }, [pendingActions]);

    const processPendingActions = useCallback(async () => {
        if (pendingActions.length === 0) return;

        for (const action of pendingActions) {
            try {
                // Process each pending action
                await processAction(action);
            } catch (error) {
                console.warn('Failed to process pending action:', error);
            }
        }

        // Clear processed actions
        setPendingActions([]);
        localStorage.removeItem('booking-pending-actions');
    }, [pendingActions]);

    const processAction = async (action: any) => {
        // Implementation would depend on the specific action type
        // This is a placeholder for the actual action processing logic
        console.log('Processing action:', action);
    };

    // Process pending actions when coming back online
    useEffect(() => {
        if (networkState.isOnline && pendingActions.length > 0) {
            processPendingActions();
        }
    }, [networkState.isOnline, pendingActions.length, processPendingActions]);

    // Load pending actions from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem('booking-pending-actions');
            if (saved) {
                setPendingActions(JSON.parse(saved));
            }
        } catch (error) {
            console.warn('Failed to load pending actions:', error);
        }
    }, []);

    if (!networkState.isOnline && !enableOfflineMode) {
        return (
            <OfflineMessage
                onRetry={() => {
                    resetRetryState();
                    window.location.reload();
                }}
                className={className}
            />
        );
    }

    if (!networkState.isOnline && enableOfflineMode) {
        return (
            <OfflineModeWrapper
                offlineData={offlineData}
                pendingActions={pendingActions}
                onAddPendingAction={addPendingAction}
                className={className}
            >
                {fallback || children}
            </OfflineModeWrapper>
        );
    }

    return <div className={className}>{children}</div>;
}

interface OfflineMessageProps {
    onRetry: () => void;
    className?: string;
}

function OfflineMessage({ onRetry, className }: OfflineMessageProps) {
    return (
        <div className={cn('flex min-h-[400px] items-center justify-center', className)}>
            <Card className="max-w-md p-6 text-center">
                <WifiOff className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                    No Internet Connection
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                    Please check your internet connection and try again. Your booking progress
                    has been saved and will be restored when you reconnect.
                </p>
                <Button onClick={onRetry} className="mt-4 flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                </Button>
            </Card>
        </div>
    );
}

interface OfflineModeWrapperProps {
    children: ReactNode;
    offlineData: any;
    pendingActions: any[];
    onAddPendingAction: (action: any) => void;
    className?: string;
}

function OfflineModeWrapper({
    children,
    offlineData,
    pendingActions,
    onAddPendingAction,
    className,
}: OfflineModeWrapperProps) {
    return (
        <div className={cn('relative', className)}>
            {/* Offline Status Banner */}
            <div className="sticky top-0 z-50 bg-yellow-50 border-b border-yellow-200 px-4 py-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-yellow-800">
                        <WifiOff className="h-4 w-4" />
                        <span>Offline Mode - Limited functionality available</span>
                    </div>
                    {pendingActions.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-yellow-700">
                            <AlertCircle className="h-4 w-4" />
                            <span>{pendingActions.length} actions pending</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Offline Content */}
            <div className="p-4">
                {offlineData ? (
                    <OfflineBookingInterface
                        data={offlineData}
                        onAddPendingAction={onAddPendingAction}
                    />
                ) : (
                    <div className="text-center py-8">
                        <AlertCircle className="mx-auto h-8 w-8 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-600">
                            No offline data available. Please connect to the internet to continue.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

interface OfflineBookingInterfaceProps {
    data: any;
    onAddPendingAction: (action: any) => void;
}

function OfflineBookingInterface({ data, onAddPendingAction }: OfflineBookingInterfaceProps) {
    const [formData, setFormData] = useState<any>({});

    const handleFormSubmit = (bookingData: any) => {
        // Add booking to pending actions
        onAddPendingAction({
            type: 'CREATE_BOOKING',
            data: bookingData,
            id: `booking-${Date.now()}`,
        });

        // Show success message
        alert('Booking saved! It will be processed when you reconnect to the internet.');
    };

    return (
        <Card className="p-6">
            <div className="mb-4 flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Offline Mode Active</span>
            </div>

            <p className="mb-6 text-sm text-gray-600">
                You can continue browsing services and preparing your booking.
                Your selections will be saved and processed when you reconnect.
            </p>

            {/* Simplified offline booking form */}
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Service Selection
                    </label>
                    <div className="space-y-2">
                        {data.services?.map((service: any) => (
                            <div key={service.id} className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id={service.id}
                                    className="rounded border-gray-300"
                                    onChange={(e) => {
                                        setFormData((prev: any) => ({
                                            ...prev,
                                            services: e.target.checked
                                                ? [...(prev.services || []), service.id]
                                                : (prev.services || []).filter((id: string) => id !== service.id)
                                        }));
                                    }}
                                />
                                <label htmlFor={service.id} className="text-sm">
                                    {service.name} - ${service.price}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Preferred Date & Time
                    </label>
                    <input
                        type="datetime-local"
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                        onChange={(e) => {
                            setFormData((prev: any) => ({
                                ...prev,
                                preferredDateTime: e.target.value
                            }));
                        }}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notes
                    </label>
                    <textarea
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                        rows={3}
                        placeholder="Any special requests or notes..."
                        onChange={(e) => {
                            setFormData((prev: any) => ({
                                ...prev,
                                notes: e.target.value
                            }));
                        }}
                    />
                </div>

                <Button
                    onClick={() => handleFormSubmit(formData)}
                    className="w-full"
                    disabled={!formData.services?.length}
                >
                    Save Booking (Will Process When Online)
                </Button>
            </div>
        </Card>
    );
}

// Service Worker registration for offline support
export function registerServiceWorker() {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        window.addEventListener('load', async () => {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered:', registration);
            } catch (error) {
                console.warn('Service Worker registration failed:', error);
            }
        });
    }
}

// Cache management utilities
export const cacheManager = {
    async cacheBookingData(businessId: string, data: any) {
        try {
            const cache = await caches.open(`booking-${businessId}`);
            await cache.put(
                `/api/booking/${businessId}/data`,
                new Response(JSON.stringify(data))
            );
        } catch (error) {
            console.warn('Failed to cache booking data:', error);
        }
    },

    async getCachedBookingData(businessId: string) {
        try {
            const cache = await caches.open(`booking-${businessId}`);
            const response = await cache.match(`/api/booking/${businessId}/data`);
            if (response) {
                return await response.json();
            }
        } catch (error) {
            console.warn('Failed to get cached booking data:', error);
        }
        return null;
    },

    async clearCache(businessId?: string) {
        try {
            if (businessId) {
                await caches.delete(`booking-${businessId}`);
            } else {
                const cacheNames = await caches.keys();
                await Promise.all(
                    cacheNames
                        .filter(name => name.startsWith('booking-'))
                        .map(name => caches.delete(name))
                );
            }
        } catch (error) {
            console.warn('Failed to clear cache:', error);
        }
    }
};
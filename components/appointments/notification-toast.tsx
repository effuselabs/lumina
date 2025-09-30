/**
 * Notification Toast Component
 * 
 * Toast notifications for real-time appointment updates and system messages.
 */

'use client';

import { NotificationMessage } from '@/hooks/use-real-time-appointments';
import {
    AlertCircle,
    CheckCircle,
    Clock,
    Info,
    RefreshCw,
    Wifi,
    WifiOff
} from 'lucide-react';
import { useEffect } from 'react';
import { toast } from 'sonner';

export interface NotificationToastProps {
    notifications: NotificationMessage[];
    onDismiss: (id: string) => void;
}

export function NotificationToast({ notifications, onDismiss }: NotificationToastProps) {
    useEffect(() => {
        notifications.forEach(notification => {
            if (notification.dismissed) return;

            const { id, message, type } = notification;

            // Get appropriate icon and styling
            const getToastConfig = () => {
                switch (type) {
                    case 'info':
                        return {
                            icon: <Info className="h-4 w-4" />,
                            duration: 4000,
                        };
                    case 'warning':
                        return {
                            icon: <AlertCircle className="h-4 w-4" />,
                            duration: 6000,
                        };
                    case 'error':
                        return {
                            icon: <AlertCircle className="h-4 w-4" />,
                            duration: 8000,
                        };
                    default:
                        return {
                            icon: <CheckCircle className="h-4 w-4" />,
                            duration: 4000,
                        };
                }
            };

            const config = getToastConfig();

            // Show toast based on type
            switch (type) {
                case 'info':
                    toast.info(message, {
                        id,
                        icon: config.icon,
                        duration: config.duration,
                        action: {
                            label: 'Dismiss',
                            onClick: () => onDismiss(id),
                        },
                    });
                    break;

                case 'warning':
                    toast.warning(message, {
                        id,
                        icon: config.icon,
                        duration: config.duration,
                        action: {
                            label: 'Dismiss',
                            onClick: () => onDismiss(id),
                        },
                    });
                    break;

                case 'error':
                    toast.error(message, {
                        id,
                        icon: config.icon,
                        duration: config.duration,
                        action: {
                            label: 'Dismiss',
                            onClick: () => onDismiss(id),
                        },
                    });
                    break;

                default:
                    toast.success(message, {
                        id,
                        icon: config.icon,
                        duration: config.duration,
                        action: {
                            label: 'Dismiss',
                            onClick: () => onDismiss(id),
                        },
                    });
                    break;
            }
        });
    }, [notifications, onDismiss]);

    return null; // This component only manages toasts, no UI to render
}

/**
 * Specialized toast functions for common real-time scenarios
 */
export const realTimeToasts = {
    /**
     * Connection status toasts
     */
    connection: {
        connected: () => toast.success('Real-time updates connected', {
            icon: <Wifi className="h-4 w-4" />,
            duration: 3000,
        }),

        disconnected: () => toast.warning('Real-time updates disconnected', {
            icon: <WifiOff className="h-4 w-4" />,
            duration: 5000,
        }),

        reconnecting: (attempt: number) => toast.info(`Reconnecting... (attempt ${attempt})`, {
            icon: <RefreshCw className="h-4 w-4 animate-spin" />,
            duration: 3000,
        }),

        error: () => toast.error('Connection error occurred', {
            icon: <AlertCircle className="h-4 w-4" />,
            duration: 6000,
        }),
    },

    /**
     * Sync status toasts
     */
    sync: {
        started: () => toast.info('Syncing changes...', {
            icon: <RefreshCw className="h-4 w-4 animate-spin" />,
            duration: 2000,
        }),

        completed: () => toast.success('All changes synced', {
            icon: <CheckCircle className="h-4 w-4" />,
            duration: 3000,
        }),

        failed: () => toast.error('Sync failed - changes saved locally', {
            icon: <AlertCircle className="h-4 w-4" />,
            duration: 6000,
        }),

        pending: (count: number) => toast.warning(`${count} changes pending sync`, {
            icon: <Clock className="h-4 w-4" />,
            duration: 4000,
        }),
    },

    /**
     * Appointment update toasts
     */
    appointment: {
        created: (clientName: string) => toast.success(`Appointment created for ${clientName}`, {
            icon: <CheckCircle className="h-4 w-4" />,
            duration: 4000,
        }),

        updated: (clientName: string) => toast.info(`Appointment updated for ${clientName}`, {
            icon: <Info className="h-4 w-4" />,
            duration: 3000,
        }),

        deleted: (clientName: string) => toast.info(`Appointment cancelled for ${clientName}`, {
            icon: <Info className="h-4 w-4" />,
            duration: 4000,
        }),

        conflict: (clientName: string) => toast.warning(`Conflict detected for ${clientName}'s appointment`, {
            icon: <AlertCircle className="h-4 w-4" />,
            duration: 6000,
            action: {
                label: 'Resolve',
                onClick: () => {
                    // This would typically open the conflict resolution modal
                    // The parent component should handle this
                },
            },
        }),
    },

    /**
     * Network status toasts
     */
    network: {
        online: () => toast.success('Connection restored', {
            icon: <Wifi className="h-4 w-4" />,
            duration: 3000,
        }),

        offline: () => toast.warning('Working offline - changes will sync when connected', {
            icon: <WifiOff className="h-4 w-4" />,
            duration: 5000,
        }),
    },

    /**
     * Optimistic update toasts
     */
    optimistic: {
        applied: (action: string) => toast.info(`${action} applied - syncing...`, {
            icon: <RefreshCw className="h-4 w-4 animate-spin" />,
            duration: 2000,
        }),

        confirmed: (action: string) => toast.success(`${action} confirmed`, {
            icon: <CheckCircle className="h-4 w-4" />,
            duration: 3000,
        }),

        failed: (action: string) => toast.error(`${action} failed - changes reverted`, {
            icon: <AlertCircle className="h-4 w-4" />,
            duration: 5000,
            action: {
                label: 'Retry',
                onClick: () => {
                    // Parent component should handle retry logic
                },
            },
        }),
    },
};
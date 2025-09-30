/**
 * Real-Time Status Component
 * 
 * Displays connection status, sync state, and provides controls for
 * real-time appointment updates.
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from '@/components/ui/tooltip';
import { SyncState } from '@/lib/services/real-time-sync-service';
import {
    AlertCircle,
    CheckCircle,
    Clock,
    Loader2,
    RefreshCw,
    Settings,
    Wifi,
    WifiOff,
} from 'lucide-react';
import { useState } from 'react';

export interface RealTimeStatusProps {
    connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
    syncState: SyncState;
    onConnect: () => void;
    onDisconnect: () => void;
    onForceSync: () => Promise<void>;
    className?: string;
}

export function RealTimeStatus({
    connectionStatus,
    syncState,
    onConnect,
    onDisconnect,
    onForceSync,
    className = '',
}: RealTimeStatusProps) {
    const [isSyncing, setIsSyncing] = useState(false);

    /**
     * Handle force sync
     */
    const handleForceSync = async () => {
        setIsSyncing(true);
        try {
            await onForceSync();
        } finally {
            setIsSyncing(false);
        }
    };

    /**
     * Get connection status display
     */
    const getConnectionDisplay = () => {
        switch (connectionStatus) {
            case 'connected':
                return {
                    icon: <CheckCircle className="h-4 w-4" />,
                    label: 'Connected',
                    variant: 'default' as const,
                    color: 'text-green-600',
                };
            case 'connecting':
                return {
                    icon: <Loader2 className="h-4 w-4 animate-spin" />,
                    label: 'Connecting',
                    variant: 'secondary' as const,
                    color: 'text-yellow-600',
                };
            case 'disconnected':
                return {
                    icon: <WifiOff className="h-4 w-4" />,
                    label: 'Disconnected',
                    variant: 'outline' as const,
                    color: 'text-gray-600',
                };
            case 'error':
                return {
                    icon: <AlertCircle className="h-4 w-4" />,
                    label: 'Error',
                    variant: 'destructive' as const,
                    color: 'text-red-600',
                };
        }
    };

    /**
     * Get sync status display
     */
    const getSyncDisplay = () => {
        if (syncState.syncInProgress) {
            return {
                icon: <RefreshCw className="h-4 w-4 animate-spin" />,
                label: 'Syncing',
                color: 'text-blue-600',
            };
        }

        if (syncState.pendingUpdates.length > 0) {
            return {
                icon: <Clock className="h-4 w-4" />,
                label: `${syncState.pendingUpdates.length} pending`,
                color: 'text-orange-600',
            };
        }

        if (syncState.conflicts.length > 0) {
            return {
                icon: <AlertCircle className="h-4 w-4" />,
                label: `${syncState.conflicts.length} conflicts`,
                color: 'text-red-600',
            };
        }

        return {
            icon: <CheckCircle className="h-4 w-4" />,
            label: 'Up to date',
            color: 'text-green-600',
        };
    };

    const connectionDisplay = getConnectionDisplay();
    const syncDisplay = getSyncDisplay();

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            {/* Network Status */}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex items-center gap-1">
                            {syncState.isOnline ? (
                                <Wifi className="h-4 w-4 text-green-600" />
                            ) : (
                                <WifiOff className="h-4 w-4 text-red-600" />
                            )}
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{syncState.isOnline ? 'Online' : 'Offline'}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {/* Connection Status */}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Badge variant={connectionDisplay.variant} className="gap-1">
                            <span className={connectionDisplay.color}>
                                {connectionDisplay.icon}
                            </span>
                            <span className="text-xs">{connectionDisplay.label}</span>
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                        <div className="space-y-1">
                            <p>Real-time connection: {connectionDisplay.label}</p>
                            {syncState.lastSyncTime && (
                                <p className="text-xs text-muted-foreground">
                                    Last sync: {syncState.lastSyncTime.toLocaleTimeString()}
                                </p>
                            )}
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {/* Sync Status */}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className={`flex items-center gap-1 ${syncDisplay.color}`}>
                            {syncDisplay.icon}
                            <span className="text-xs">{syncDisplay.label}</span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <div className="space-y-1">
                            <p>Sync status: {syncDisplay.label}</p>
                            {syncState.pendingUpdates.length > 0 && (
                                <p className="text-xs text-muted-foreground">
                                    {syncState.pendingUpdates.length} updates waiting to sync
                                </p>
                            )}
                            {syncState.conflicts.length > 0 && (
                                <p className="text-xs text-muted-foreground">
                                    {syncState.conflicts.length} conflicts need resolution
                                </p>
                            )}
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {/* Controls Menu */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Settings className="h-4 w-4" />
                        <span className="sr-only">Real-time settings</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    {/* Connection Controls */}
                    {connectionStatus === 'connected' ? (
                        <DropdownMenuItem onClick={onDisconnect}>
                            <WifiOff className="mr-2 h-4 w-4" />
                            Disconnect
                        </DropdownMenuItem>
                    ) : (
                        <DropdownMenuItem onClick={onConnect}>
                            <Wifi className="mr-2 h-4 w-4" />
                            Connect
                        </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />

                    {/* Sync Controls */}
                    <DropdownMenuItem
                        onClick={handleForceSync}
                        disabled={isSyncing || !syncState.isOnline}
                    >
                        <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        Force Sync
                    </DropdownMenuItem>

                    {syncState.pendingUpdates.length > 0 && (
                        <DropdownMenuItem disabled>
                            <Clock className="mr-2 h-4 w-4" />
                            {syncState.pendingUpdates.length} Pending Updates
                        </DropdownMenuItem>
                    )}

                    {syncState.conflicts.length > 0 && (
                        <DropdownMenuItem disabled>
                            <AlertCircle className="mr-2 h-4 w-4" />
                            {syncState.conflicts.length} Conflicts
                        </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />

                    {/* Status Information */}
                    <DropdownMenuItem disabled>
                        <div className="flex flex-col gap-1 text-xs">
                            <span>Network: {syncState.isOnline ? 'Online' : 'Offline'}</span>
                            <span>Connection: {connectionDisplay.label}</span>
                            {syncState.lastSyncTime && (
                                <span>
                                    Last sync: {syncState.lastSyncTime.toLocaleTimeString()}
                                </span>
                            )}
                        </div>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
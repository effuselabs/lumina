/**
 * Real-Time Synchronization Service
 * 
 * Manages optimistic updates, conflict resolution, and data synchronization
 * for appointment management dashboard.
 */

import { DashboardAppointment } from '@/types/dashboard-appointments';
import { WebSocketMessage, WebSocketService } from './websocket-service';

export interface OptimisticUpdate {
    id: string;
    type: 'create' | 'update' | 'delete';
    appointmentId: string;
    originalData?: DashboardAppointment;
    optimisticData: Partial<DashboardAppointment>;
    timestamp: Date;
    userId: string;
}

export interface ConflictResolution {
    conflictId: string;
    appointmentId: string;
    localVersion: DashboardAppointment;
    serverVersion: DashboardAppointment;
    resolution: 'accept_server' | 'accept_local' | 'merge' | 'manual';
    mergedData?: DashboardAppointment;
}

export interface SyncState {
    isOnline: boolean;
    lastSyncTime: Date | null;
    pendingUpdates: OptimisticUpdate[];
    conflicts: ConflictResolution[];
    syncInProgress: boolean;
}

export interface RealTimeSyncCallbacks {
    onAppointmentUpdate: (appointment: DashboardAppointment, isOptimistic?: boolean) => void;
    onAppointmentDelete: (appointmentId: string, isOptimistic?: boolean) => void;
    onConflictDetected: (conflict: ConflictResolution) => void;
    onSyncStateChange: (state: SyncState) => void;
    onNotification: (message: string, type: 'info' | 'warning' | 'error') => void;
}

export class RealTimeSyncService {
    private wsService: WebSocketService | null = null;
    private callbacks: RealTimeSyncCallbacks;
    private syncState: SyncState;
    private businessId: string;
    private userId: string;
    private appointments: Map<string, DashboardAppointment> = new Map();
    private updateQueue: OptimisticUpdate[] = [];
    private syncTimer: NodeJS.Timeout | null = null;

    constructor(businessId: string, userId: string, callbacks: RealTimeSyncCallbacks) {
        this.businessId = businessId;
        this.userId = userId;
        this.callbacks = callbacks;
        this.syncState = {
            isOnline: navigator.onLine,
            lastSyncTime: null,
            pendingUpdates: [],
            conflicts: [],
            syncInProgress: false,
        };

        this.setupNetworkListeners();
        this.startPeriodicSync();
    }

    /**
     * Initialize WebSocket connection
     */
    initialize(wsService: WebSocketService): void {
        this.wsService = wsService;
        this.setupWebSocketHandlers();
    }

    /**
     * Apply optimistic update to appointment
     */
    applyOptimisticUpdate(
        appointmentId: string,
        updates: Partial<DashboardAppointment>,
        type: 'create' | 'update' | 'delete' = 'update'
    ): string {
        const updateId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const currentAppointment = this.appointments.get(appointmentId);

        const optimisticUpdate: OptimisticUpdate = {
            id: updateId,
            type,
            appointmentId,
            originalData: currentAppointment ? { ...currentAppointment } : undefined,
            optimisticData: updates,
            timestamp: new Date(),
            userId: this.userId,
        };

        // Apply optimistic update locally
        if (type === 'delete') {
            this.appointments.delete(appointmentId);
            this.callbacks.onAppointmentDelete(appointmentId, true);
        } else {
            const updatedAppointment = currentAppointment
                ? { ...currentAppointment, ...updates }
                : updates as DashboardAppointment;

            this.appointments.set(appointmentId, updatedAppointment);
            this.callbacks.onAppointmentUpdate(updatedAppointment, true);
        }

        // Queue for server sync
        this.updateQueue.push(optimisticUpdate);
        this.syncState.pendingUpdates.push(optimisticUpdate);
        this.notifySyncStateChange();

        // Attempt immediate sync if online
        if (this.syncState.isOnline) {
            this.syncPendingUpdates();
        }

        return updateId;
    }

    /**
     * Rollback optimistic update
     */
    rollbackOptimisticUpdate(updateId: string): void {
        const updateIndex = this.updateQueue.findIndex(update => update.id === updateId);
        if (updateIndex === -1) return;

        const update = this.updateQueue[updateIndex];

        // Restore original data
        if (update.type === 'delete' && update.originalData) {
            this.appointments.set(update.appointmentId, update.originalData);
            this.callbacks.onAppointmentUpdate(update.originalData);
        } else if (update.originalData) {
            this.appointments.set(update.appointmentId, update.originalData);
            this.callbacks.onAppointmentUpdate(update.originalData);
        } else {
            this.appointments.delete(update.appointmentId);
            this.callbacks.onAppointmentDelete(update.appointmentId);
        }

        // Remove from queues
        this.updateQueue.splice(updateIndex, 1);
        const pendingIndex = this.syncState.pendingUpdates.findIndex(u => u.id === updateId);
        if (pendingIndex !== -1) {
            this.syncState.pendingUpdates.splice(pendingIndex, 1);
        }

        this.notifySyncStateChange();
    }

    /**
     * Handle server appointment update
     */
    handleServerUpdate(appointment: DashboardAppointment): void {
        const existingAppointment = this.appointments.get(appointment.id);

        // Check for conflicts with pending optimistic updates
        const conflictingUpdate = this.updateQueue.find(
            update => update.appointmentId === appointment.id
        );

        if (conflictingUpdate && existingAppointment) {
            this.handleConflict(appointment, existingAppointment, conflictingUpdate);
        } else {
            // No conflict, apply server update
            this.appointments.set(appointment.id, appointment);
            this.callbacks.onAppointmentUpdate(appointment, false);
        }
    }

    /**
     * Handle server appointment deletion
     */
    handleServerDelete(appointmentId: string): void {
        const conflictingUpdate = this.updateQueue.find(
            update => update.appointmentId === appointmentId && update.type !== 'delete'
        );

        if (conflictingUpdate) {
            // Conflict: server deleted but we have local changes
            const existingAppointment = this.appointments.get(appointmentId);
            if (existingAppointment) {
                this.handleDeleteConflict(appointmentId, existingAppointment, conflictingUpdate);
            }
        } else {
            // No conflict, apply deletion
            this.appointments.delete(appointmentId);
            this.callbacks.onAppointmentDelete(appointmentId, false);
        }
    }

    /**
     * Resolve conflict manually
     */
    resolveConflict(conflictId: string, resolution: ConflictResolution['resolution']): void {
        const conflictIndex = this.syncState.conflicts.findIndex(c => c.conflictId === conflictId);
        if (conflictIndex === -1) return;

        const conflict = this.syncState.conflicts[conflictIndex];

        switch (resolution) {
            case 'accept_server':
                this.appointments.set(conflict.appointmentId, conflict.serverVersion);
                this.callbacks.onAppointmentUpdate(conflict.serverVersion);
                break;

            case 'accept_local':
                // Keep local version, will sync to server
                break;

            case 'merge':
                if (conflict.mergedData) {
                    this.appointments.set(conflict.appointmentId, conflict.mergedData);
                    this.callbacks.onAppointmentUpdate(conflict.mergedData);
                }
                break;
        }

        // Remove resolved conflict
        this.syncState.conflicts.splice(conflictIndex, 1);
        this.notifySyncStateChange();
    }

    /**
     * Get current sync state
     */
    getSyncState(): SyncState {
        return { ...this.syncState };
    }

    /**
     * Force sync with server
     */
    async forceSync(): Promise<void> {
        if (this.syncState.syncInProgress) return;

        this.syncState.syncInProgress = true;
        this.notifySyncStateChange();

        try {
            await this.syncPendingUpdates();
            this.syncState.lastSyncTime = new Date();
            this.callbacks.onNotification('Sync completed successfully', 'info');
        } catch (error) {
            console.error('Force sync failed:', error);
            this.callbacks.onNotification('Sync failed', 'error');
        } finally {
            this.syncState.syncInProgress = false;
            this.notifySyncStateChange();
        }
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
        }

        window.removeEventListener('online', this.handleOnline);
        window.removeEventListener('offline', this.handleOffline);
    }

    /**
     * Setup WebSocket event handlers
     */
    private setupWebSocketHandlers(): void {
        if (!this.wsService) return;

        // Handle incoming WebSocket messages
        const originalOnMessage = this.wsService['callbacks'].onMessage;
        this.wsService['callbacks'].onMessage = (message: WebSocketMessage) => {
            this.handleWebSocketMessage(message);
            originalOnMessage(message);
        };
    }

    /**
     * Handle WebSocket messages
     */
    private handleWebSocketMessage(message: WebSocketMessage): void {
        switch (message.type) {
            case 'appointment_created':
            case 'appointment_updated':
                if (message.data.appointment) {
                    this.handleServerUpdate(message.data.appointment);
                }
                break;

            case 'appointment_deleted':
                this.handleServerDelete(message.data.appointmentId);
                break;

            case 'appointment_status_changed':
                if (message.data.appointment) {
                    this.handleServerUpdate(message.data.appointment);
                }
                break;
        }
    }

    /**
     * Setup network connectivity listeners
     */
    private setupNetworkListeners(): void {
        this.handleOnline = this.handleOnline.bind(this);
        this.handleOffline = this.handleOffline.bind(this);

        window.addEventListener('online', this.handleOnline);
        window.addEventListener('offline', this.handleOffline);
    }

    /**
     * Handle network online event
     */
    private handleOnline(): void {
        this.syncState.isOnline = true;
        this.notifySyncStateChange();
        this.callbacks.onNotification('Connection restored', 'info');

        // Sync pending updates
        this.syncPendingUpdates();
    }

    /**
     * Handle network offline event
     */
    private handleOffline(): void {
        this.syncState.isOnline = false;
        this.notifySyncStateChange();
        this.callbacks.onNotification('Working offline', 'warning');
    }

    /**
     * Sync pending updates to server
     */
    private async syncPendingUpdates(): Promise<void> {
        if (!this.syncState.isOnline || this.updateQueue.length === 0) return;

        const updates = [...this.updateQueue];
        this.updateQueue = [];

        for (const update of updates) {
            try {
                await this.syncSingleUpdate(update);

                // Remove from pending updates
                const pendingIndex = this.syncState.pendingUpdates.findIndex(u => u.id === update.id);
                if (pendingIndex !== -1) {
                    this.syncState.pendingUpdates.splice(pendingIndex, 1);
                }
            } catch (error) {
                console.error('Failed to sync update:', error);
                // Re-queue failed update
                this.updateQueue.push(update);
            }
        }

        this.notifySyncStateChange();
    }

    /**
     * Sync single update to server
     */
    private async syncSingleUpdate(update: OptimisticUpdate): Promise<void> {
        const endpoint = `/api/appointments${update.type === 'create' ? '' : `/${update.appointmentId}`}`;
        const method = update.type === 'delete' ? 'DELETE' :
            update.type === 'create' ? 'POST' : 'PUT';

        const response = await fetch(endpoint, {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: update.type !== 'delete' ? JSON.stringify(update.optimisticData) : undefined,
        });

        if (!response.ok) {
            throw new Error(`Sync failed: ${response.statusText}`);
        }

        if (update.type !== 'delete') {
            const serverData = await response.json();
            this.appointments.set(update.appointmentId, serverData);
            this.callbacks.onAppointmentUpdate(serverData, false);
        }
    }

    /**
     * Handle conflict between local and server data
     */
    private handleConflict(
        serverVersion: DashboardAppointment,
        localVersion: DashboardAppointment,
        conflictingUpdate: OptimisticUpdate
    ): void {
        const conflictId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const conflict: ConflictResolution = {
            conflictId,
            appointmentId: serverVersion.id,
            localVersion,
            serverVersion,
            resolution: 'manual', // Default to manual resolution
        };

        // Attempt automatic merge for simple conflicts
        const mergedData = this.attemptAutoMerge(localVersion, serverVersion);
        if (mergedData) {
            conflict.resolution = 'merge';
            conflict.mergedData = mergedData;
            this.appointments.set(serverVersion.id, mergedData);
            this.callbacks.onAppointmentUpdate(mergedData);
        } else {
            this.syncState.conflicts.push(conflict);
            this.callbacks.onConflictDetected(conflict);
        }

        this.notifySyncStateChange();
    }

    /**
     * Handle delete conflict
     */
    private handleDeleteConflict(
        appointmentId: string,
        localVersion: DashboardAppointment,
        conflictingUpdate: OptimisticUpdate
    ): void {
        const conflictId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const conflict: ConflictResolution = {
            conflictId,
            appointmentId,
            localVersion,
            serverVersion: {} as DashboardAppointment, // Deleted on server
            resolution: 'manual',
        };

        this.syncState.conflicts.push(conflict);
        this.callbacks.onConflictDetected(conflict);
        this.notifySyncStateChange();
    }

    /**
     * Attempt automatic merge of conflicting data
     */
    private attemptAutoMerge(
        local: DashboardAppointment,
        server: DashboardAppointment
    ): DashboardAppointment | null {
        // Simple merge strategy: prefer server for system fields, local for user fields
        const systemFields = ['id', 'businessId', 'createdAt', 'updatedAt'];
        const merged = { ...server };

        // Check if changes are compatible
        const hasConflictingChanges = systemFields.some(field => {
            return local[field as keyof DashboardAppointment] !== server[field as keyof DashboardAppointment];
        });

        if (hasConflictingChanges) {
            return null; // Requires manual resolution
        }

        // Merge non-conflicting user changes
        const userFields = ['notes', 'status'] as const;
        userFields.forEach(field => {
            if (local[field] !== server[field]) {
                // Prefer local changes (optimistic updates)
                merged[field] = local[field];
            }
        });

        return merged;
    }

    /**
     * Start periodic sync timer
     */
    private startPeriodicSync(): void {
        this.syncTimer = setInterval(() => {
            if (this.syncState.isOnline && this.updateQueue.length > 0) {
                this.syncPendingUpdates();
            }
        }, 30000); // Sync every 30 seconds
    }

    /**
     * Notify callbacks of sync state change
     */
    private notifySyncStateChange(): void {
        this.callbacks.onSyncStateChange({ ...this.syncState });
    }
}
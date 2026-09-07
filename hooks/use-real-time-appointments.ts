/**
 * Real-Time Appointments Hook
 *
 * React hook for managing real-time appointment updates, optimistic updates,
 * and conflict resolution in the appointment dashboard.
 */

import {
  ConflictResolution,
  RealTimeSyncCallbacks,
  RealTimeSyncService,
  SyncState,
} from '@/lib/services/real-time-sync-service';
import {
  WebSocketService,
  WebSocketServiceCallbacks,
  createWebSocketService,
} from '@/lib/services/websocket-service';
import { DashboardAppointment } from '@/types/dashboard-appointments';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseRealTimeAppointmentsOptions {
  businessId: string;
  userId: string;
  initialAppointments?: DashboardAppointment[];
  enableOptimisticUpdates?: boolean;
  enableWebSocket?: boolean;
}

export interface UseRealTimeAppointmentsReturn {
  appointments: DashboardAppointment[];
  syncState: SyncState;
  conflicts: ConflictResolution[];
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';

  // Actions
  updateAppointment: (
    appointmentId: string,
    updates: Partial<DashboardAppointment>
  ) => Promise<string>;
  deleteAppointment: (appointmentId: string) => Promise<string>;
  createAppointment: (
    appointment: Omit<DashboardAppointment, 'id'>
  ) => Promise<string>;
  rollbackUpdate: (updateId: string) => void;
  resolveConflict: (
    conflictId: string,
    resolution: ConflictResolution['resolution']
  ) => void;
  forceSync: () => Promise<void>;

  // Connection management
  connect: () => void;
  disconnect: () => void;

  // Notifications
  notifications: NotificationMessage[];
  dismissNotification: (id: string) => void;
}

export interface NotificationMessage {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'error';
  timestamp: Date;
  dismissed?: boolean;
}

export function useRealTimeAppointments(
  options: UseRealTimeAppointmentsOptions
): UseRealTimeAppointmentsReturn {
  const {
    businessId,
    userId,
    initialAppointments = [],
    enableOptimisticUpdates = true,
    enableWebSocket = true,
  } = options;

  // State
  const [appointments, setAppointments] =
    useState<DashboardAppointment[]>(initialAppointments);
  const [syncState, setSyncState] = useState<SyncState>({
    isOnline: navigator.onLine,
    lastSyncTime: null,
    pendingUpdates: [],
    conflicts: [],
    syncInProgress: false,
  });
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('disconnected');
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);

  // Services
  const syncServiceRef = useRef<RealTimeSyncService | null>(null);
  const wsServiceRef = useRef<WebSocketService | null>(null);

  /**
   * Add notification
   */
  const addNotification = useCallback(
    (message: string, type: NotificationMessage['type']) => {
      const notification: NotificationMessage = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        message,
        type,
        timestamp: new Date(),
      };

      setNotifications(prev => [...prev, notification]);

      // Auto-dismiss info notifications after 5 seconds
      if (type === 'info') {
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== notification.id));
        }, 5000);
      }
    },
    []
  );

  /**
   * Dismiss notification
   */
  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  /**
   * Update appointments list
   */
  const updateAppointmentsList = useCallback(
    (appointment: DashboardAppointment, isOptimistic = false) => {
      setAppointments(prev => {
        const index = prev.findIndex(apt => apt.id === appointment.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = appointment;
          return updated;
        } else {
          return [...prev, appointment];
        }
      });
    },
    []
  );

  /**
   * Remove appointment from list
   */
  const removeAppointmentFromList = useCallback(
    (appointmentId: string, isOptimistic = false) => {
      setAppointments(prev => prev.filter(apt => apt.id !== appointmentId));
    },
    []
  );

  /**
   * Handle conflict detection
   */
  const handleConflictDetected = useCallback(
    (conflict: ConflictResolution) => {
      addNotification(
        `Conflict detected for appointment. Please resolve manually.`,
        'warning'
      );
    },
    [addNotification]
  );

  /**
   * Setup sync service callbacks
   */
  const syncCallbacks: RealTimeSyncCallbacks = {
    onAppointmentUpdate: updateAppointmentsList,
    onAppointmentDelete: removeAppointmentFromList,
    onConflictDetected: handleConflictDetected,
    onSyncStateChange: setSyncState,
    onNotification: addNotification,
  };

  /**
   * Setup WebSocket service callbacks
   */
  const wsCallbacks: WebSocketServiceCallbacks = {
    onConnect: () => {
      setConnectionStatus('connected');
      addNotification('Real-time updates connected', 'info');
    },
    onDisconnect: () => {
      setConnectionStatus('disconnected');
      addNotification('Real-time updates disconnected', 'warning');
    },
    onError: error => {
      setConnectionStatus('error');
      addNotification('Connection error occurred', 'error');
    },
    onReconnect: attempt => {
      setConnectionStatus('connecting');
      addNotification(`Reconnecting... (attempt ${attempt})`, 'info');
    },
    onMessage: () => {}, // Handled by sync service
  };

  /**
   * Initialize services
   */
  useEffect(() => {
    // Initialize sync service
    syncServiceRef.current = new RealTimeSyncService(
      businessId,
      userId,
      syncCallbacks
    );

    // Initialize WebSocket service if enabled
    if (enableWebSocket) {
      wsServiceRef.current = createWebSocketService(
        businessId,
        userId,
        wsCallbacks
      );
      syncServiceRef.current.initialize(wsServiceRef.current);
    }

    return () => {
      syncServiceRef.current?.destroy();
      wsServiceRef.current?.disconnect();
    };
  }, [businessId, userId, enableWebSocket]);

  /**
   * Connect to real-time updates
   */
  const connect = useCallback(() => {
    if (wsServiceRef.current) {
      setConnectionStatus('connecting');
      wsServiceRef.current.connect();
    }
  }, []);

  /**
   * Disconnect from real-time updates
   */
  const disconnect = useCallback(() => {
    if (wsServiceRef.current) {
      wsServiceRef.current.disconnect();
      setConnectionStatus('disconnected');
    }
  }, []);

  /**
   * Update appointment with optimistic updates
   */
  const updateAppointment = useCallback(
    async (
      appointmentId: string,
      updates: Partial<DashboardAppointment>
    ): Promise<string> => {
      if (!syncServiceRef.current) {
        throw new Error('Sync service not initialized');
      }

      if (enableOptimisticUpdates) {
        return syncServiceRef.current.applyOptimisticUpdate(
          appointmentId,
          updates,
          'update'
        );
      } else {
        // Direct API call without optimistic updates
        const response = await fetch(`/api/appointments/${appointmentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          throw new Error('Failed to update appointment');
        }

        const updatedAppointment = await response.json();
        updateAppointmentsList(updatedAppointment);
        return updatedAppointment.id;
      }
    },
    [enableOptimisticUpdates, updateAppointmentsList]
  );

  /**
   * Delete appointment with optimistic updates
   */
  const deleteAppointment = useCallback(
    async (appointmentId: string): Promise<string> => {
      if (!syncServiceRef.current) {
        throw new Error('Sync service not initialized');
      }

      if (enableOptimisticUpdates) {
        return syncServiceRef.current.applyOptimisticUpdate(
          appointmentId,
          {},
          'delete'
        );
      } else {
        // Direct API call without optimistic updates
        const response = await fetch(`/api/appointments/${appointmentId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete appointment');
        }

        removeAppointmentFromList(appointmentId);
        return appointmentId;
      }
    },
    [enableOptimisticUpdates, removeAppointmentFromList]
  );

  /**
   * Create appointment with optimistic updates
   */
  const createAppointment = useCallback(
    async (appointment: Omit<DashboardAppointment, 'id'>): Promise<string> => {
      if (!syncServiceRef.current) {
        throw new Error('Sync service not initialized');
      }

      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const appointmentWithId = {
        ...appointment,
        id: tempId,
      } as DashboardAppointment;

      if (enableOptimisticUpdates) {
        return syncServiceRef.current.applyOptimisticUpdate(
          tempId,
          appointmentWithId,
          'create'
        );
      } else {
        // Direct API call without optimistic updates
        const response = await fetch('/api/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(appointment),
        });

        if (!response.ok) {
          throw new Error('Failed to create appointment');
        }

        const createdAppointment = await response.json();
        updateAppointmentsList(createdAppointment);
        return createdAppointment.id;
      }
    },
    [enableOptimisticUpdates, updateAppointmentsList]
  );

  /**
   * Rollback optimistic update
   */
  const rollbackUpdate = useCallback((updateId: string) => {
    if (syncServiceRef.current) {
      syncServiceRef.current.rollbackOptimisticUpdate(updateId);
    }
  }, []);

  /**
   * Resolve conflict
   */
  const resolveConflict = useCallback(
    (conflictId: string, resolution: ConflictResolution['resolution']) => {
      if (syncServiceRef.current) {
        syncServiceRef.current.resolveConflict(conflictId, resolution);
      }
    },
    []
  );

  /**
   * Force sync with server
   */
  const forceSync = useCallback(async () => {
    if (syncServiceRef.current) {
      await syncServiceRef.current.forceSync();
    }
  }, []);

  /**
   * Auto-connect on mount if WebSocket is enabled
   */
  useEffect(() => {
    if (enableWebSocket) {
      connect();
    }
  }, [enableWebSocket, connect]);

  /**
   * Update connection status based on WebSocket state
   */
  useEffect(() => {
    if (!wsServiceRef.current) return;

    const checkStatus = () => {
      const status = wsServiceRef.current?.getConnectionStatus();
      if (status) {
        setConnectionStatus(status);
      }
    };

    const interval = setInterval(checkStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    appointments,
    syncState,
    conflicts: syncState.conflicts,
    connectionStatus,

    // Actions
    updateAppointment,
    deleteAppointment,
    createAppointment,
    rollbackUpdate,
    resolveConflict,
    forceSync,

    // Connection management
    connect,
    disconnect,

    // Notifications
    notifications,
    dismissNotification,
  };
}

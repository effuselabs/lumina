/**
 * Real-Time Sync Service Tests
 *
 * Tests for optimistic updates, conflict resolution, and data synchronization.
 */

import {
  RealTimeSyncCallbacks,
  RealTimeSyncService,
} from '@/lib/services/real-time-sync-service';
import { DashboardAppointment } from '@/types/dashboard-appointments';

// Mock fetch
global.fetch = jest.fn();

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

describe('RealTimeSyncService', () => {
  let service: RealTimeSyncService;
  let callbacks: RealTimeSyncCallbacks;
  const businessId = 'business-1';
  const userId = 'user-1';

  const mockAppointment: DashboardAppointment = {
    id: 'apt-1',
    businessId,
    clientId: 'client-1',
    staffId: 'staff-1',
    startTime: new Date('2024-01-15T10:00:00Z'),
    endTime: new Date('2024-01-15T11:00:00Z'),
    status: 'confirmed',
    services: [],
    totalPrice: 100,
    totalDuration: 60,
    notes: 'Test appointment',
    client: {
      id: 'client-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '555-0123',
    },
    staff: {
      id: 'staff-1',
      firstName: 'Jane',
      lastName: 'Smith',
      displayName: 'Jane Smith',
      color: '#3B82F6',
    },
    isConflicted: false,
    canEdit: true,
    canCancel: true,
    canReschedule: true,
    lastUpdated: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    callbacks = {
      onAppointmentUpdate: jest.fn(),
      onAppointmentDelete: jest.fn(),
      onConflictDetected: jest.fn(),
      onSyncStateChange: jest.fn(),
      onNotification: jest.fn(),
    };

    service = new RealTimeSyncService(businessId, userId, callbacks);

    // Mock successful fetch responses
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAppointment),
    });
  });

  afterEach(() => {
    service.destroy();
    jest.clearAllMocks();
  });

  describe('Optimistic Updates', () => {
    it('should apply optimistic update for appointment modification', () => {
      const updates = { notes: 'Updated notes' };

      const updateId = service.applyOptimisticUpdate(
        'apt-1',
        updates,
        'update'
      );

      expect(updateId).toBeDefined();
      expect(callbacks.onAppointmentUpdate).toHaveBeenCalledWith(
        expect.objectContaining(updates),
        true
      );
      expect(callbacks.onSyncStateChange).toHaveBeenCalled();
    });

    it('should apply optimistic update for appointment deletion', () => {
      const updateId = service.applyOptimisticUpdate('apt-1', {}, 'delete');

      expect(updateId).toBeDefined();
      expect(callbacks.onAppointmentDelete).toHaveBeenCalledWith('apt-1', true);
      expect(callbacks.onSyncStateChange).toHaveBeenCalled();
    });

    it('should rollback optimistic update', () => {
      // First apply an update
      const updates = { notes: 'Updated notes' };
      const updateId = service.applyOptimisticUpdate(
        'apt-1',
        updates,
        'update'
      );

      // Then rollback
      service.rollbackOptimisticUpdate(updateId);

      expect(callbacks.onAppointmentDelete).toHaveBeenCalledWith('apt-1');
      expect(callbacks.onSyncStateChange).toHaveBeenCalled();
    });

    it('should sync pending updates when online', async () => {
      const updates = { notes: 'Updated notes' };
      service.applyOptimisticUpdate('apt-1', updates, 'update');

      // Wait for sync to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(fetch).toHaveBeenCalledWith('/api/appointments/apt-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    });
  });

  describe('Server Update Handling', () => {
    it('should handle server update without conflicts', () => {
      const updatedAppointment = { ...mockAppointment, notes: 'Server update' };

      service.handleServerUpdate(updatedAppointment);

      expect(callbacks.onAppointmentUpdate).toHaveBeenCalledWith(
        updatedAppointment,
        false
      );
    });

    it('should detect conflicts with pending optimistic updates', () => {
      // Apply optimistic update first
      service.applyOptimisticUpdate(
        'apt-1',
        { notes: 'Local update' },
        'update'
      );

      // Then receive server update
      const serverUpdate = { ...mockAppointment, notes: 'Server update' };
      service.handleServerUpdate(serverUpdate);

      expect(callbacks.onConflictDetected).toHaveBeenCalled();
    });

    it('should handle server appointment deletion', () => {
      service.handleServerDelete('apt-1');

      expect(callbacks.onAppointmentDelete).toHaveBeenCalledWith(
        'apt-1',
        false
      );
    });

    it('should detect delete conflicts', () => {
      // Apply optimistic update first
      service.applyOptimisticUpdate(
        'apt-1',
        { notes: 'Local update' },
        'update'
      );

      // Then receive server deletion
      service.handleServerDelete('apt-1');

      expect(callbacks.onConflictDetected).toHaveBeenCalled();
    });
  });

  describe('Conflict Resolution', () => {
    it('should resolve conflict by accepting server version', () => {
      // Create a conflict
      service.applyOptimisticUpdate(
        'apt-1',
        { notes: 'Local update' },
        'update'
      );
      const serverUpdate = { ...mockAppointment, notes: 'Server update' };
      service.handleServerUpdate(serverUpdate);

      // Get the conflict ID from the callback
      const conflictCall = (callbacks.onConflictDetected as jest.Mock).mock
        .calls[0][0];
      const conflictId = conflictCall.conflictId;

      // Resolve conflict
      service.resolveConflict(conflictId, 'accept_server');

      expect(callbacks.onAppointmentUpdate).toHaveBeenCalledWith(serverUpdate);
    });

    it('should resolve conflict by accepting local version', () => {
      // Create a conflict
      service.applyOptimisticUpdate(
        'apt-1',
        { notes: 'Local update' },
        'update'
      );
      const serverUpdate = { ...mockAppointment, notes: 'Server update' };
      service.handleServerUpdate(serverUpdate);

      // Get the conflict ID from the callback
      const conflictCall = (callbacks.onConflictDetected as jest.Mock).mock
        .calls[0][0];
      const conflictId = conflictCall.conflictId;

      // Resolve conflict
      service.resolveConflict(conflictId, 'accept_local');

      // Local version should be kept (no additional update call)
      expect(callbacks.onSyncStateChange).toHaveBeenCalled();
    });

    it('should resolve conflict by merging versions', () => {
      // Create a conflict with merged data
      service.applyOptimisticUpdate(
        'apt-1',
        { notes: 'Local update' },
        'update'
      );
      const serverUpdate = { ...mockAppointment, notes: 'Server update' };
      service.handleServerUpdate(serverUpdate);

      // Get the conflict and add merged data
      const conflictCall = (callbacks.onConflictDetected as jest.Mock).mock
        .calls[0][0];
      const conflictId = conflictCall.conflictId;

      // Manually set merged data for test
      const syncState = service.getSyncState();
      const conflict = syncState.conflicts.find(
        (c: any) => c.conflictId === conflictId
      );
      if (conflict) {
        conflict.mergedData = { ...mockAppointment, notes: 'Merged update' };
      }

      // Resolve conflict
      service.resolveConflict(conflictId, 'merge');

      expect(callbacks.onAppointmentUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ notes: 'Merged update' })
      );
    });
  });

  describe('Network State Management', () => {
    it('should handle online/offline state changes', () => {
      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', { value: false });
      window.dispatchEvent(new Event('offline'));

      expect(callbacks.onNotification).toHaveBeenCalledWith(
        'Working offline',
        'warning'
      );

      // Simulate going online
      Object.defineProperty(navigator, 'onLine', { value: true });
      window.dispatchEvent(new Event('online'));

      expect(callbacks.onNotification).toHaveBeenCalledWith(
        'Connection restored',
        'info'
      );
    });

    it('should queue updates when offline', () => {
      // Go offline
      Object.defineProperty(navigator, 'onLine', { value: false });

      const updates = { notes: 'Offline update' };
      service.applyOptimisticUpdate('apt-1', updates, 'update');

      // Should not attempt to sync immediately
      expect(fetch).not.toHaveBeenCalled();

      // Should have pending updates
      const syncState = service.getSyncState();
      expect(syncState.pendingUpdates).toHaveLength(1);
    });
  });

  describe('Force Sync', () => {
    it('should force sync all pending updates', async () => {
      const updates1 = { notes: 'Update 1' };
      const updates2 = { notes: 'Update 2' };

      service.applyOptimisticUpdate('apt-1', updates1, 'update');
      service.applyOptimisticUpdate('apt-2', updates2, 'update');

      await service.forceSync();

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(callbacks.onNotification).toHaveBeenCalledWith(
        'Sync completed successfully',
        'info'
      );
    });

    it('should handle sync failures gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const updates = { notes: 'Failed update' };
      service.applyOptimisticUpdate('apt-1', updates, 'update');

      await service.forceSync();

      expect(callbacks.onNotification).toHaveBeenCalledWith(
        'Sync failed',
        'error'
      );
    });

    it('should not sync when already in progress', async () => {
      const updates = { notes: 'Update' };
      service.applyOptimisticUpdate('apt-1', updates, 'update');

      // Start two syncs simultaneously
      const sync1 = service.forceSync();
      const sync2 = service.forceSync();

      await Promise.all([sync1, sync2]);

      // Should only sync once
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Sync State', () => {
    it('should provide current sync state', () => {
      const syncState = service.getSyncState();

      expect(syncState).toEqual({
        isOnline: true,
        lastSyncTime: null,
        pendingUpdates: [],
        conflicts: [],
        syncInProgress: false,
      });
    });

    it('should update sync state after operations', () => {
      const updates = { notes: 'Update' };
      service.applyOptimisticUpdate('apt-1', updates, 'update');

      const syncState = service.getSyncState();
      expect(syncState.pendingUpdates).toHaveLength(1);
    });
  });

  describe('Cleanup', () => {
    it('should clean up resources on destroy', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      service.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'online',
        expect.any(Function)
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'offline',
        expect.any(Function)
      );
    });
  });
});

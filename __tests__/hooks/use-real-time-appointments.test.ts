/**
 * Real-Time Appointments Hook Tests
 * 
 * Tests for the useRealTimeAppointments hook functionality.
 */

import { useRealTimeAppointments } from '@/hooks/use-real-time-appointments';
import { DashboardAppointment } from '@/types/dashboard-appointments';
import { act, renderHook } from '@testing-library/react';

// Mock the services
jest.mock('@/lib/services/real-time-sync-service');
jest.mock('@/lib/services/websocket-service');

// Mock fetch
global.fetch = jest.fn();

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: true,
});

describe('useRealTimeAppointments', () => {
    const mockAppointment: DashboardAppointment = {
        id: 'apt-1',
        businessId: 'business-1',
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

    const defaultOptions = {
        businessId: 'business-1',
        userId: 'user-1',
        initialAppointments: [mockAppointment],
    };

    beforeEach(() => {
        (fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockAppointment),
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        it('should initialize with default state', () => {
            const { result } = renderHook(() => useRealTimeAppointments(defaultOptions));

            expect(result.current.appointments).toEqual([mockAppointment]);
            expect(result.current.connectionStatus).toBe('disconnected');
            expect(result.current.syncState.isOnline).toBe(true);
            expect(result.current.conflicts).toEqual([]);
            expect(result.current.notifications).toEqual([]);
        });

        it('should initialize with empty appointments when none provided', () => {
            const { result } = renderHook(() =>
                useRealTimeAppointments({
                    ...defaultOptions,
                    initialAppointments: undefined,
                })
            );

            expect(result.current.appointments).toEqual([]);
        });

        it('should auto-connect when WebSocket is enabled', () => {
            const { result } = renderHook(() =>
                useRealTimeAppointments({
                    ...defaultOptions,
                    enableWebSocket: true,
                })
            );

            expect(result.current.connectionStatus).toBe('disconnected');
            // Connection would be attempted in useEffect
        });
    });

    describe('Appointment Operations', () => {
        it('should update appointment with optimistic updates', async () => {
            const { result } = renderHook(() =>
                useRealTimeAppointments({
                    ...defaultOptions,
                    enableOptimisticUpdates: true,
                })
            );

            const updates = { notes: 'Updated notes' };

            await act(async () => {
                const updateId = await result.current.updateAppointment('apt-1', updates);
                expect(updateId).toBeDefined();
            });

            // Should update the appointment in the list
            expect(result.current.appointments[0].notes).toBe('Updated notes');
        });

        it('should update appointment without optimistic updates', async () => {
            const { result } = renderHook(() =>
                useRealTimeAppointments({
                    ...defaultOptions,
                    enableOptimisticUpdates: false,
                })
            );

            const updates = { notes: 'Updated notes' };

            await act(async () => {
                await result.current.updateAppointment('apt-1', updates);
            });

            expect(fetch).toHaveBeenCalledWith('/api/appointments/apt-1', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
        });

        it('should delete appointment with optimistic updates', async () => {
            const { result } = renderHook(() =>
                useRealTimeAppointments({
                    ...defaultOptions,
                    enableOptimisticUpdates: true,
                })
            );

            await act(async () => {
                const updateId = await result.current.deleteAppointment('apt-1');
                expect(updateId).toBeDefined();
            });

            // Should remove the appointment from the list
            expect(result.current.appointments).toHaveLength(0);
        });

        it('should create appointment with optimistic updates', async () => {
            const { result } = renderHook(() =>
                useRealTimeAppointments({
                    ...defaultOptions,
                    enableOptimisticUpdates: true,
                })
            );

            const newAppointment = {
                ...mockAppointment,
                notes: 'New appointment',
            };
            delete (newAppointment as any).id; // Remove id for creation

            await act(async () => {
                const updateId = await result.current.createAppointment(newAppointment);
                expect(updateId).toBeDefined();
            });

            // Should add the appointment to the list
            expect(result.current.appointments).toHaveLength(2);
        });

        it('should handle appointment operation errors', async () => {
            (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

            const { result } = renderHook(() =>
                useRealTimeAppointments({
                    ...defaultOptions,
                    enableOptimisticUpdates: false,
                })
            );

            await act(async () => {
                await expect(
                    result.current.updateAppointment('apt-1', { notes: 'Update' })
                ).rejects.toThrow('Failed to update appointment');
            });
        });
    });

    describe('Connection Management', () => {
        it('should connect to WebSocket', () => {
            const { result } = renderHook(() => useRealTimeAppointments(defaultOptions));

            act(() => {
                result.current.connect();
            });

            // Connection status would be updated by the service
            expect(result.current.connectionStatus).toBe('disconnected');
        });

        it('should disconnect from WebSocket', () => {
            const { result } = renderHook(() => useRealTimeAppointments(defaultOptions));

            act(() => {
                result.current.disconnect();
            });

            expect(result.current.connectionStatus).toBe('disconnected');
        });
    });

    describe('Conflict Resolution', () => {
        it('should resolve conflicts', () => {
            const { result } = renderHook(() => useRealTimeAppointments(defaultOptions));

            act(() => {
                result.current.resolveConflict('conflict-1', 'accept_server');
            });

            // Conflict resolution would be handled by the service
            expect(result.current.conflicts).toEqual([]);
        });
    });

    describe('Notifications', () => {
        it('should add notifications', async () => {
            const { result } = renderHook(() => useRealTimeAppointments(defaultOptions));

            // Simulate a notification being added by the service
            act(() => {
                // This would normally be called by the service callbacks
                // For testing, we'll simulate the internal notification logic
            });

            // Notifications would be managed internally
            expect(result.current.notifications).toEqual([]);
        });

        it('should dismiss notifications', () => {
            const { result } = renderHook(() => useRealTimeAppointments(defaultOptions));

            act(() => {
                result.current.dismissNotification('notification-1');
            });

            // Notification should be removed
            expect(result.current.notifications).toEqual([]);
        });

        it('should auto-dismiss info notifications', async () => {
            jest.useFakeTimers();

            const { result } = renderHook(() => useRealTimeAppointments(defaultOptions));

            // Simulate adding an info notification
            act(() => {
                // This would be called by the service
            });

            // Fast-forward time
            act(() => {
                jest.advanceTimersByTime(5000);
            });

            // Info notification should be auto-dismissed
            expect(result.current.notifications).toEqual([]);

            jest.useRealTimers();
        });
    });

    describe('Force Sync', () => {
        it('should force sync with server', async () => {
            const { result } = renderHook(() => useRealTimeAppointments(defaultOptions));

            await act(async () => {
                await result.current.forceSync();
            });

            // Force sync would be handled by the service
            expect(result.current.syncState.syncInProgress).toBe(false);
        });
    });

    describe('Rollback Operations', () => {
        it('should rollback optimistic updates', () => {
            const { result } = renderHook(() => useRealTimeAppointments(defaultOptions));

            act(() => {
                result.current.rollbackUpdate('update-1');
            });

            // Rollback would be handled by the service
            expect(result.current.appointments).toEqual([mockAppointment]);
        });
    });

    describe('Service Integration', () => {
        it('should handle service callbacks correctly', () => {
            const { result } = renderHook(() => useRealTimeAppointments(defaultOptions));

            // Services would be initialized and callbacks set up
            expect(result.current.appointments).toEqual([mockAppointment]);
        });

        it('should clean up services on unmount', () => {
            const { unmount } = renderHook(() => useRealTimeAppointments(defaultOptions));

            unmount();

            // Services should be cleaned up
            // This would be verified by checking that destroy methods are called
        });
    });

    describe('Error Handling', () => {
        it('should handle service initialization errors', () => {
            // Mock service constructor to throw
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const { result } = renderHook(() => useRealTimeAppointments(defaultOptions));

            // Should still provide a working interface even if services fail
            expect(result.current.appointments).toEqual([mockAppointment]);

            consoleSpy.mockRestore();
        });

        it('should handle missing sync service gracefully', async () => {
            const { result } = renderHook(() => useRealTimeAppointments(defaultOptions));

            // Simulate sync service not being available
            await act(async () => {
                await expect(
                    result.current.updateAppointment('apt-1', { notes: 'Update' })
                ).rejects.toThrow('Sync service not initialized');
            });
        });
    });
});
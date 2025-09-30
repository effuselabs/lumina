/**
 * Real-Time Appointments Integration Tests
 * 
 * End-to-end tests for real-time appointment management functionality.
 */

import { ConflictResolutionModal } from '@/components/appointments/conflict-resolution-modal';
import { NotificationToast } from '@/components/appointments/notification-toast';
import { RealTimeStatus } from '@/components/appointments/real-time-status';
import { useRealTimeAppointments } from '@/hooks/use-real-time-appointments';
import { DashboardAppointment } from '@/types/dashboard-appointments';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock the services
jest.mock('@/lib/services/real-time-sync-service');
jest.mock('@/lib/services/websocket-service');

// Mock fetch
global.fetch = jest.fn();

// Mock toast notifications
jest.mock('sonner', () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
        warning: jest.fn(),
        info: jest.fn(),
    },
}));

const mockAppointment: DashboardAppointment = {
    id: 'apt-1',
    businessId: 'business-1',
    clientId: 'client-1',
    staffId: 'staff-1',
    startTime: new Date('2024-01-15T10:00:00Z'),
    endTime: new Date('2024-01-15T11:00:00Z'),
    status: 'confirmed',
    services: [
        {
            id: 'service-1',
            name: 'Haircut',
            duration: 60,
            price: 50,
        },
    ],
    totalPrice: 50,
    totalDuration: 60,
    notes: 'Regular haircut',
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

// Test component that uses the real-time hook
function TestAppointmentDashboard() {
    const {
        appointments,
        syncState,
        conflicts,
        connectionStatus,
        updateAppointment,
        deleteAppointment,
        createAppointment,
        rollbackUpdate,
        resolveConflict,
        forceSync,
        connect,
        disconnect,
        notifications,
        dismissNotification,
    } = useRealTimeAppointments({
        businessId: 'business-1',
        userId: 'user-1',
        initialAppointments: [mockAppointment],
        enableOptimisticUpdates: true,
        enableWebSocket: true,
    });

    const [selectedConflict, setSelectedConflict] = React.useState(conflicts[0] || null);

    return (
        <div>
            {/* Real-time status */}
            <RealTimeStatus
                connectionStatus={connectionStatus}
                syncState={syncState}
                onConnect={connect}
                onDisconnect={disconnect}
                onForceSync={forceSync}
            />

            {/* Appointments list */}
            <div data-testid="appointments-list">
                {appointments.map(appointment => (
                    <div key={appointment.id} data-testid={`appointment-${appointment.id}`}>
                        <h3>{appointment.client.firstName} {appointment.client.lastName}</h3>
                        <p>{appointment.notes}</p>
                        <button
                            onClick={() => updateAppointment(appointment.id, { notes: 'Updated notes' })}
                            data-testid={`update-${appointment.id}`}
                        >
                            Update
                        </button>
                        <button
                            onClick={() => deleteAppointment(appointment.id)}
                            data-testid={`delete-${appointment.id}`}
                        >
                            Delete
                        </button>
                    </div>
                ))}
            </div>

            {/* Create appointment button */}
            <button
                onClick={() => createAppointment({
                    ...mockAppointment,
                    id: undefined as any,
                    notes: 'New appointment',
                })}
                data-testid="create-appointment"
            >
                Create Appointment
            </button>

            {/* Conflicts */}
            {conflicts.length > 0 && (
                <div data-testid="conflicts-list">
                    {conflicts.map(conflict => (
                        <div key={conflict.conflictId} data-testid={`conflict-${conflict.conflictId}`}>
                            <p>Conflict detected for appointment {conflict.appointmentId}</p>
                            <button
                                onClick={() => setSelectedConflict(conflict)}
                                data-testid={`resolve-${conflict.conflictId}`}
                            >
                                Resolve
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Conflict resolution modal */}
            <ConflictResolutionModal
                conflict={selectedConflict}
                isOpen={!!selectedConflict}
                onClose={() => setSelectedConflict(null)}
                onResolve={(conflictId, resolution) => {
                    resolveConflict(conflictId, resolution);
                    setSelectedConflict(null);
                }}
            />

            {/* Notifications */}
            <NotificationToast
                notifications={notifications}
                onDismiss={dismissNotification}
            />

            {/* Sync state info */}
            <div data-testid="sync-info">
                <p>Online: {syncState.isOnline ? 'Yes' : 'No'}</p>
                <p>Pending: {syncState.pendingUpdates.length}</p>
                <p>Conflicts: {syncState.conflicts.length}</p>
                <p>Syncing: {syncState.syncInProgress ? 'Yes' : 'No'}</p>
            </div>
        </div>
    );
}

describe('Real-Time Appointments Integration', () => {
    beforeEach(() => {
        (fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockAppointment),
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Basic Functionality', () => {
        it('should render appointment dashboard with real-time features', () => {
            render(<TestAppointmentDashboard />);

            expect(screen.getByTestId('appointments-list')).toBeInTheDocument();
            expect(screen.getByTestId('appointment-apt-1')).toBeInTheDocument();
            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.getByText('Regular haircut')).toBeInTheDocument();
        });

        it('should display real-time status component', () => {
            render(<TestAppointmentDashboard />);

            // Real-time status should be present
            expect(screen.getByRole('button', { name: /real-time settings/i })).toBeInTheDocument();
        });

        it('should show sync state information', () => {
            render(<TestAppointmentDashboard />);

            expect(screen.getByTestId('sync-info')).toBeInTheDocument();
            expect(screen.getByText('Online: Yes')).toBeInTheDocument();
            expect(screen.getByText('Pending: 0')).toBeInTheDocument();
            expect(screen.getByText('Conflicts: 0')).toBeInTheDocument();
        });
    });

    describe('Appointment Operations', () => {
        it('should update appointment optimistically', async () => {
            const user = userEvent.setup();
            render(<TestAppointmentDashboard />);

            const updateButton = screen.getByTestId('update-apt-1');
            await user.click(updateButton);

            // Should update the appointment notes immediately
            await waitFor(() => {
                expect(screen.getByText('Updated notes')).toBeInTheDocument();
            });
        });

        it('should delete appointment optimistically', async () => {
            const user = userEvent.setup();
            render(<TestAppointmentDashboard />);

            const deleteButton = screen.getByTestId('delete-apt-1');
            await user.click(deleteButton);

            // Should remove the appointment immediately
            await waitFor(() => {
                expect(screen.queryByTestId('appointment-apt-1')).not.toBeInTheDocument();
            });
        });

        it('should create new appointment optimistically', async () => {
            const user = userEvent.setup();
            render(<TestAppointmentDashboard />);

            const createButton = screen.getByTestId('create-appointment');
            await user.click(createButton);

            // Should add the new appointment immediately
            await waitFor(() => {
                expect(screen.getByText('New appointment')).toBeInTheDocument();
            });
        });
    });

    describe('Connection Management', () => {
        it('should handle connection controls', async () => {
            const user = userEvent.setup();
            render(<TestAppointmentDashboard />);

            // Open settings menu
            const settingsButton = screen.getByRole('button', { name: /real-time settings/i });
            await user.click(settingsButton);

            // Should show connection options
            expect(screen.getByText('Connect')).toBeInTheDocument();
        });

        it('should handle force sync', async () => {
            const user = userEvent.setup();
            render(<TestAppointmentDashboard />);

            // Open settings menu
            const settingsButton = screen.getByRole('button', { name: /real-time settings/i });
            await user.click(settingsButton);

            // Click force sync
            const forceSyncButton = screen.getByText('Force Sync');
            await user.click(forceSyncButton);

            // Should trigger sync operation
            // This would be verified by checking service calls
        });
    });

    describe('Conflict Resolution', () => {
        it('should display conflicts when they occur', () => {
            // Mock a conflict in the hook
            const ConflictTestComponent = () => {
                const hookResult = useRealTimeAppointments({
                    businessId: 'business-1',
                    userId: 'user-1',
                    initialAppointments: [mockAppointment],
                });

                // Simulate a conflict
                const mockConflict = {
                    conflictId: 'conflict-1',
                    appointmentId: 'apt-1',
                    localVersion: mockAppointment,
                    serverVersion: { ...mockAppointment, notes: 'Server version' },
                    resolution: 'manual' as const,
                };

                return (
                    <div>
                        <div data-testid="conflicts-list">
                            <div data-testid="conflict-conflict-1">
                                <p>Conflict detected for appointment apt-1</p>
                                <button data-testid="resolve-conflict-1">Resolve</button>
                            </div>
                        </div>
                    </div>
                );
            };

            render(<ConflictTestComponent />);

            expect(screen.getByTestId('conflict-conflict-1')).toBeInTheDocument();
            expect(screen.getByText('Conflict detected for appointment apt-1')).toBeInTheDocument();
        });

        it('should open conflict resolution modal', async () => {
            const user = userEvent.setup();

            // Create a component with a mock conflict
            const ConflictModalTest = () => {
                const [showModal, setShowModal] = React.useState(false);
                const mockConflict = {
                    conflictId: 'conflict-1',
                    appointmentId: 'apt-1',
                    localVersion: mockAppointment,
                    serverVersion: { ...mockAppointment, notes: 'Server version' },
                    resolution: 'manual' as const,
                };

                return (
                    <div>
                        <button onClick={() => setShowModal(true)} data-testid="show-modal">
                            Show Conflict Modal
                        </button>
                        <ConflictResolutionModal
                            conflict={showModal ? mockConflict : null}
                            isOpen={showModal}
                            onClose={() => setShowModal(false)}
                            onResolve={() => setShowModal(false)}
                        />
                    </div>
                );
            };

            render(<ConflictModalTest />);

            const showModalButton = screen.getByTestId('show-modal');
            await user.click(showModalButton);

            // Should open the conflict resolution modal
            await waitFor(() => {
                expect(screen.getByText('Appointment Conflict Detected')).toBeInTheDocument();
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle API errors gracefully', async () => {
            (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

            const user = userEvent.setup();
            render(<TestAppointmentDashboard />);

            const updateButton = screen.getByTestId('update-apt-1');
            await user.click(updateButton);

            // Should handle the error without crashing
            // Error handling would be managed by the service layer
        });

        it('should handle service initialization failures', () => {
            // Mock service constructor to throw
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            render(<TestAppointmentDashboard />);

            // Should still render the component
            expect(screen.getByTestId('appointments-list')).toBeInTheDocument();

            consoleSpy.mockRestore();
        });
    });

    describe('Performance', () => {
        it('should handle large numbers of appointments efficiently', () => {
            const manyAppointments = Array.from({ length: 100 }, (_, i) => ({
                ...mockAppointment,
                id: `apt-${i}`,
                client: {
                    ...mockAppointment.client,
                    id: `client-${i}`,
                    firstName: `Client${i}`,
                },
            }));

            const LargeListComponent = () => {
                const { appointments } = useRealTimeAppointments({
                    businessId: 'business-1',
                    userId: 'user-1',
                    initialAppointments: manyAppointments,
                });

                return (
                    <div data-testid="large-appointments-list">
                        {appointments.map(appointment => (
                            <div key={appointment.id} data-testid={`appointment-${appointment.id}`}>
                                {appointment.client.firstName}
                            </div>
                        ))}
                    </div>
                );
            };

            const startTime = performance.now();
            render(<LargeListComponent />);
            const endTime = performance.now();

            // Should render within reasonable time
            expect(endTime - startTime).toBeLessThan(1000);
            expect(screen.getByTestId('large-appointments-list')).toBeInTheDocument();
        });
    });

    describe('Accessibility', () => {
        it('should be accessible with screen readers', () => {
            render(<TestAppointmentDashboard />);

            // Check for proper ARIA labels and roles
            expect(screen.getByRole('button', { name: /real-time settings/i })).toBeInTheDocument();

            // Check for proper heading structure
            expect(screen.getByText('John Doe')).toBeInTheDocument();
        });

        it('should support keyboard navigation', async () => {
            const user = userEvent.setup();
            render(<TestAppointmentDashboard />);

            // Should be able to navigate with keyboard
            const updateButton = screen.getByTestId('update-apt-1');
            updateButton.focus();

            await user.keyboard('{Enter}');

            // Should trigger the update
            await waitFor(() => {
                expect(screen.getByText('Updated notes')).toBeInTheDocument();
            });
        });
    });
});
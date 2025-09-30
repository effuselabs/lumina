/**
 * Drag and Drop Functionality Tests
 * 
 * Tests the core drag-and-drop functionality for appointment management
 * including validation, conflict detection, and undo operations.
 * 
 * Requirements: 2.2, 2.3, 3.2, 3.6, 7.3
 */

import { describe, expect, it, jest } from '@jest/globals';
import {
    createDragData,
    createUndoOperation,
    findAlternativeSlots,
    parseDragData,
    validateAppointmentDrop
} from '../../../lib/drag-drop-utils';
import { AppointmentStatus, CalendarSlot, DashboardAppointment } from '../../../types/dashboard-appointments';

// Mock appointment data
const mockAppointment: DashboardAppointment = {
    id: 'apt-1',
    businessId: 'business-1',
    clientId: 'client-1',
    staffId: 'staff-1',
    startTime: new Date('2024-01-15T10:00:00Z'),
    endTime: new Date('2024-01-15T11:00:00Z'),
    status: AppointmentStatus.SCHEDULED,
    services: [{ id: 'service-1', name: 'Haircut', duration: 60, price: 50 }],
    totalPrice: 50,
    totalDuration: 60,
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
        color: '#FF7A5A',
    },
    isConflicted: false,
    canEdit: true,
    canCancel: true,
    canReschedule: true,
    lastUpdated: new Date(),
};

const mockSlot: CalendarSlot = {
    startTime: new Date('2024-01-15T14:00:00Z'),
    endTime: new Date('2024-01-15T15:00:00Z'),
    staffId: 'staff-1',
    isAvailable: true,
    appointments: [],
    conflicts: [],
};

describe('Drag and Drop Utils', () => {
    describe('validateAppointmentDrop', () => {
        it('should validate a valid appointment drop', () => {
            const result = validateAppointmentDrop(mockAppointment, mockSlot, []);

            expect(result.isValid).toBe(true);
            expect(result.conflicts).toHaveLength(0);
            expect(result.warnings).toHaveLength(0);
        });

        it('should detect conflicts with existing appointments', () => {
            const conflictingAppointment: DashboardAppointment = {
                ...mockAppointment,
                id: 'apt-2',
                startTime: new Date('2024-01-15T14:30:00Z'),
                endTime: new Date('2024-01-15T15:30:00Z'),
            };

            const result = validateAppointmentDrop(
                mockAppointment,
                mockSlot,
                [conflictingAppointment]
            );

            expect(result.isValid).toBe(false);
            expect(result.conflicts).toHaveLength(1);
            expect(result.conflicts[0].type).toBe('overlap');
        });

        it('should prevent rescheduling non-reschedulable appointments', () => {
            const nonReschedulableAppointment = {
                ...mockAppointment,
                canReschedule: false,
            };

            const result = validateAppointmentDrop(
                nonReschedulableAppointment,
                mockSlot,
                []
            );

            expect(result.isValid).toBe(false);
            expect(result.conflicts).toHaveLength(1);
            expect(result.conflicts[0].type).toBe('staff_unavailable');
        });

        it('should detect unavailable time slots', () => {
            const unavailableSlot = {
                ...mockSlot,
                isAvailable: false,
            };

            const result = validateAppointmentDrop(
                mockAppointment,
                unavailableSlot,
                []
            );

            expect(result.isValid).toBe(false);
            expect(result.conflicts).toHaveLength(1);
            expect(result.conflicts[0].type).toBe('business_closed');
        });

        it('should warn about staff reassignment', () => {
            const differentStaffSlot = {
                ...mockSlot,
                staffId: 'staff-2',
            };

            const result = validateAppointmentDrop(
                mockAppointment,
                differentStaffSlot,
                []
            );

            expect(result.isValid).toBe(true);
            expect(result.warnings).toContain('This will reassign the appointment to a different staff member');
        });
    });

    describe('findAlternativeSlots', () => {
        it('should find alternative time slots', () => {
            const allSlots: CalendarSlot[] = [
                mockSlot,
                {
                    ...mockSlot,
                    startTime: new Date('2024-01-15T15:00:00Z'),
                    endTime: new Date('2024-01-15T16:00:00Z'),
                },
                {
                    ...mockSlot,
                    startTime: new Date('2024-01-15T16:00:00Z'),
                    endTime: new Date('2024-01-15T17:00:00Z'),
                },
            ];

            const alternatives = findAlternativeSlots(
                mockAppointment,
                new Date('2024-01-15'),
                allSlots,
                []
            );

            expect(alternatives.length).toBeGreaterThan(0);
            expect(alternatives.length).toBeLessThanOrEqual(5);
        });

        it('should sort alternatives by proximity to original time', () => {
            const originalTime = new Date('2024-01-15T12:00:00Z');
            const appointmentWithTime = {
                ...mockAppointment,
                startTime: originalTime,
            };

            const allSlots: CalendarSlot[] = [
                {
                    ...mockSlot,
                    startTime: new Date('2024-01-15T11:00:00Z'),
                    endTime: new Date('2024-01-15T12:00:00Z'),
                },
                {
                    ...mockSlot,
                    startTime: new Date('2024-01-15T15:00:00Z'),
                    endTime: new Date('2024-01-15T16:00:00Z'),
                },
                {
                    ...mockSlot,
                    startTime: new Date('2024-01-15T12:30:00Z'),
                    endTime: new Date('2024-01-15T13:30:00Z'),
                },
            ];

            const alternatives = findAlternativeSlots(
                appointmentWithTime,
                new Date('2024-01-15'),
                allSlots,
                []
            );

            // Should be sorted by proximity to 12:00
            expect(alternatives[0].startTime.getHours()).toBe(12); // 12:30 is closest
        });
    });

    describe('createUndoOperation', () => {
        it('should create a move undo operation', () => {
            const originalSlot = {
                ...mockSlot,
                startTime: new Date('2024-01-15T10:00:00Z'),
                endTime: new Date('2024-01-15T11:00:00Z'),
            };

            const newSlot = {
                ...mockSlot,
                startTime: new Date('2024-01-15T14:00:00Z'),
                endTime: new Date('2024-01-15T15:00:00Z'),
            };

            const operation = createUndoOperation(
                mockAppointment.id,
                originalSlot,
                newSlot
            );

            expect(operation.type).toBe('move');
            expect(operation.appointmentId).toBe(mockAppointment.id);
            expect(operation.originalSlot).toBe(originalSlot);
            expect(operation.newSlot).toBe(newSlot);
            expect(operation.description).toContain('Moved appointment');
        });

        it('should create a reassign undo operation', () => {
            const originalSlot = {
                ...mockSlot,
                staffId: 'staff-1',
            };

            const newSlot = {
                ...mockSlot,
                staffId: 'staff-2',
            };

            const operation = createUndoOperation(
                mockAppointment.id,
                originalSlot,
                newSlot,
                'reassign'
            );

            expect(operation.type).toBe('reassign');
            expect(operation.description).toContain('Reassigned appointment');
        });
    });

    describe('Drag Data Handling', () => {
        it('should create and parse drag data correctly', () => {
            const dragData = createDragData(mockAppointment);
            expect(dragData).toBeDefined();

            // Create a mock DataTransfer object
            const mockDataTransfer = {
                getData: jest.fn((format: string) => {
                    if (format === 'application/json') {
                        return dragData;
                    }
                    if (format === 'text/plain') {
                        return mockAppointment.id;
                    }
                    return '';
                }),
            } as unknown as DataTransfer;

            const parsed = parseDragData(mockDataTransfer);

            expect(parsed).toBeDefined();
            expect(parsed?.appointmentId).toBe(mockAppointment.id);
            expect(parsed?.staffId).toBe(mockAppointment.staffId);
            expect(parsed?.duration).toBe(mockAppointment.totalDuration);
        });

        it('should fallback to plain text when JSON parsing fails', () => {
            const mockDataTransfer = {
                getData: jest.fn((format: string) => {
                    if (format === 'application/json') {
                        return '';
                    }
                    if (format === 'text/plain') {
                        return mockAppointment.id;
                    }
                    return '';
                }),
            } as unknown as DataTransfer;

            const parsed = parseDragData(mockDataTransfer);

            expect(parsed).toBeDefined();
            expect(parsed?.appointmentId).toBe(mockAppointment.id);
        });

        it('should return null for invalid drag data', () => {
            const mockDataTransfer = {
                getData: jest.fn(() => ''),
            } as unknown as DataTransfer;

            const parsed = parseDragData(mockDataTransfer);

            expect(parsed).toBeNull();
        });
    });
});

describe('Drag and Drop Integration', () => {
    it('should handle complete drag-and-drop workflow', () => {
        // 1. Create drag data
        const dragData = createDragData(mockAppointment);
        expect(dragData).toBeDefined();

        // 2. Validate drop
        const validation = validateAppointmentDrop(mockAppointment, mockSlot, []);
        expect(validation.isValid).toBe(true);

        // 3. Create undo operation
        const originalSlot = {
            ...mockSlot,
            startTime: mockAppointment.startTime,
            endTime: mockAppointment.endTime,
        };

        const undoOperation = createUndoOperation(
            mockAppointment.id,
            originalSlot,
            mockSlot
        );

        expect(undoOperation.type).toBe('move');
        expect(undoOperation.appointmentId).toBe(mockAppointment.id);
    });

    it('should handle conflict resolution workflow', () => {
        const conflictingAppointment: DashboardAppointment = {
            ...mockAppointment,
            id: 'apt-conflict',
            startTime: new Date('2024-01-15T14:30:00Z'),
            endTime: new Date('2024-01-15T15:30:00Z'),
        };

        // 1. Validate and detect conflict
        const validation = validateAppointmentDrop(
            mockAppointment,
            mockSlot,
            [conflictingAppointment]
        );

        expect(validation.isValid).toBe(false);
        expect(validation.conflicts).toHaveLength(1);

        // 2. Find alternatives
        const allSlots: CalendarSlot[] = [
            mockSlot,
            {
                ...mockSlot,
                startTime: new Date('2024-01-15T16:00:00Z'),
                endTime: new Date('2024-01-15T17:00:00Z'),
            },
        ];

        const alternatives = findAlternativeSlots(
            mockAppointment,
            new Date('2024-01-15'),
            allSlots,
            [conflictingAppointment]
        );

        expect(alternatives.length).toBeGreaterThan(0);
    });
});
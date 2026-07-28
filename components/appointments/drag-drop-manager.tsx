'use client';

import {
    UndoOperation,
    createUndoOperation,
    findAlternativeSlots,
    validateAppointmentDrop
} from '@/lib/drag-drop-utils';
import { CalendarSlot, DashboardAppointment } from '@/types/dashboard-appointments';
import React, { useCallback, useState } from 'react';
import { AppointmentMoveConfirmation } from './appointment-move-confirmation';
import { DragDropProvider, useDragDrop } from './drag-drop-context';
import { UndoNotification, useUndoNotification } from './undo-notification';

/**
 * Drag and Drop Manager Component
 * 
 * Orchestrates the entire drag-and-drop workflow including:
 * - Confirmation dialogs for moves
 * - Conflict resolution
 * - Undo functionality
 * - Integration with appointment API
 * 
 * Requirements: 2.2, 2.3, 3.2, 3.6, 7.3
 */

interface DragDropManagerProps {
    children: React.ReactNode;
    appointments: DashboardAppointment[];
    allSlots: CalendarSlot[];
    onAppointmentMove: (appointmentId: string, newSlot: CalendarSlot) => Promise<void>;
    onAppointmentUpdate?: (appointment: DashboardAppointment) => Promise<void>;
}

function DragDropManagerInner({
    children,
    appointments,
    allSlots,
    onAppointmentMove,
    onAppointmentUpdate,
}: DragDropManagerProps) {
    const { state, undoHistory, onAppointmentMove: contextOnMove } = useDragDrop();
    const { currentOperation, showNotification, hideNotification } = useUndoNotification();

    const [confirmationState, setConfirmationState] = useState<{
        isOpen: boolean;
        appointment: DashboardAppointment | null;
        fromSlot: CalendarSlot | null;
        toSlot: CalendarSlot | null;
        validation: any;
        alternatives: CalendarSlot[];
    }>({
        isOpen: false,
        appointment: null,
        fromSlot: null,
        toSlot: null,
        validation: null,
        alternatives: [],
    });

    const [isMoving, setIsMoving] = useState(false);

    // Handle appointment drop with validation and confirmation
    const handleAppointmentDrop = useCallback(async (appointmentId: string, newSlot: CalendarSlot) => {
        const appointment = appointments.find(apt => apt.id === appointmentId);
        if (!appointment) return;

        // Find the original slot
        const originalSlot: CalendarSlot = {
            id: `${appointment.staffId}-${appointment.startTime.getTime()}`,
            startTime: appointment.startTime,
            endTime: appointment.endTime,
            staffId: appointment.staffId,
            isAvailable: true,
            appointments: [appointment],
            conflicts: [],
        };

        // Validate the drop
        const validation = validateAppointmentDrop(appointment, newSlot, appointments);

        // Find alternatives if there are conflicts
        const alternatives = validation.isValid ? [] : findAlternativeSlots(
            appointment,
            newSlot.startTime,
            allSlots,
            appointments
        );

        // If valid and no warnings, move directly
        if (validation.isValid && validation.warnings.length === 0) {
            await performMove(appointmentId, newSlot, originalSlot);
            return;
        }

        // Otherwise, show confirmation dialog
        setConfirmationState({
            isOpen: true,
            appointment,
            fromSlot: originalSlot,
            toSlot: newSlot,
            validation,
            alternatives,
        });
    }, [appointments, allSlots]);

    // Perform the actual appointment move
    const performMove = useCallback(async (
        appointmentId: string,
        newSlot: CalendarSlot,
        originalSlot: CalendarSlot
    ) => {
        setIsMoving(true);
        try {
            await onAppointmentMove(appointmentId, newSlot);

            // Create and show undo operation
            const operation = createUndoOperation(appointmentId, originalSlot, newSlot);
            showNotification(operation);

        } catch (error) {
            console.error('Failed to move appointment:', error);
            throw error;
        } finally {
            setIsMoving(false);
        }
    }, [onAppointmentMove, showNotification]);

    // Handle confirmation dialog actions
    const handleConfirmMove = useCallback(async () => {
        if (!confirmationState.appointment || !confirmationState.toSlot || !confirmationState.fromSlot) {
            return;
        }

        try {
            await performMove(
                confirmationState.appointment.id,
                confirmationState.toSlot,
                confirmationState.fromSlot
            );

            setConfirmationState(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
            // Error handling is done in performMove
        }
    }, [confirmationState, performMove]);

    const handleCancelMove = useCallback(() => {
        setConfirmationState(prev => ({ ...prev, isOpen: false }));
    }, []);

    const handleSelectAlternative = useCallback((slot: CalendarSlot) => {
        setConfirmationState(prev => ({
            ...prev,
            toSlot: slot,
            validation: validateAppointmentDrop(
                prev.appointment!,
                slot,
                appointments
            ),
        }));
    }, [appointments]);

    // Handle undo operations
    const handleUndo = useCallback(async () => {
        if (!currentOperation) return;

        try {
            await onAppointmentMove(currentOperation.appointmentId, currentOperation.originalSlot);
            hideNotification();
        } catch (error) {
            console.error('Failed to undo appointment move:', error);
            throw error;
        }
    }, [currentOperation, onAppointmentMove, hideNotification]);

    // Create the context value with our handler
    const contextValue = React.useMemo(() => ({
        onAppointmentMove: handleAppointmentDrop,
    }), [handleAppointmentDrop]);

    return (
        <>
            {/* Wrap children with context that includes our drop handler */}
            {React.cloneElement(children as React.ReactElement, {
                onAppointmentDrop: handleAppointmentDrop,
            })}

            {/* Confirmation Dialog */}
            <AppointmentMoveConfirmation
                isOpen={confirmationState.isOpen}
                onClose={handleCancelMove}
                onConfirm={handleConfirmMove}
                onCancel={handleCancelMove}
                appointment={confirmationState.appointment}
                fromSlot={confirmationState.fromSlot}
                toSlot={confirmationState.toSlot}
                validation={confirmationState.validation}
                suggestedAlternatives={confirmationState.alternatives}
                onSelectAlternative={handleSelectAlternative}
                isLoading={isMoving}
            />

            {/* Undo Notification */}
            <UndoNotification
                operation={currentOperation}
                onUndo={handleUndo}
                onDismiss={hideNotification}
            />
        </>
    );
}

export function DragDropManager(props: DragDropManagerProps) {
    const handleUndoOperation = async (operation: UndoOperation) => {
        await props.onAppointmentMove(operation.appointmentId, operation.originalSlot);
    };

    return (
        <DragDropProvider onAppointmentMove={handleUndoOperation}>
            <DragDropManagerInner {...props} />
        </DragDropProvider>
    );
}

/**
 * Hook for integrating with the drag-drop system
 */
export function useDragDropIntegration() {
    const dragDrop = useDragDrop();

    return {
        isDragging: dragDrop.state.isDragging,
        draggedAppointment: dragDrop.state.draggedAppointment,
        canUndo: dragDrop.canUndo,
        undoHistory: dragDrop.undoHistory,
        clearUndoHistory: dragDrop.clearUndoHistory,
    };
}
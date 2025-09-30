'use client';

import { DragDropState, UndoOperation, createUndoOperation } from '@/lib/drag-drop-utils';
import { CalendarSlot, DashboardAppointment } from '@/types/dashboard-appointments';
import React, { createContext, useCallback, useContext, useReducer } from 'react';

/**
 * Drag and Drop Context for Appointment Management
 * 
 * Provides global state management for drag-and-drop operations,
 * including visual feedback, conflict detection, and undo functionality.
 * 
 * Requirements: 2.2, 2.3, 3.2, 3.6, 7.3
 */

interface DragDropContextValue {
    state: DragDropState;
    undoHistory: UndoOperation[];
    startDrag: (appointment: DashboardAppointment, fromSlot: CalendarSlot) => void;
    endDrag: () => void;
    setHoveredSlot: (slot: CalendarSlot | null) => void;
    canUndo: boolean;
    undo: () => Promise<void>;
    clearUndoHistory: () => void;
    onAppointmentMove?: (operation: UndoOperation) => Promise<void>;
}

type DragDropAction =
    | { type: 'START_DRAG'; appointment: DashboardAppointment; fromSlot: CalendarSlot }
    | { type: 'END_DRAG' }
    | { type: 'SET_HOVERED_SLOT'; slot: CalendarSlot | null }
    | { type: 'ADD_UNDO_OPERATION'; operation: UndoOperation }
    | { type: 'REMOVE_LAST_UNDO' }
    | { type: 'CLEAR_UNDO_HISTORY' };

const initialState: DragDropState = {
    isDragging: false,
    draggedAppointment: null,
    draggedFrom: null,
    hoveredSlot: null,
    conflicts: [],
};

function dragDropReducer(state: DragDropState, action: DragDropAction): DragDropState {
    switch (action.type) {
        case 'START_DRAG':
            return {
                ...state,
                isDragging: true,
                draggedAppointment: action.appointment,
                draggedFrom: action.fromSlot,
                hoveredSlot: null,
                conflicts: [],
            };

        case 'END_DRAG':
            return {
                ...state,
                isDragging: false,
                draggedAppointment: null,
                draggedFrom: null,
                hoveredSlot: null,
                conflicts: [],
            };

        case 'SET_HOVERED_SLOT':
            return {
                ...state,
                hoveredSlot: action.slot,
            };

        default:
            return state;
    }
}

interface UndoState {
    history: UndoOperation[];
}

function undoReducer(state: UndoState, action: DragDropAction): UndoState {
    switch (action.type) {
        case 'ADD_UNDO_OPERATION':
            return {
                ...state,
                history: [...state.history, action.operation].slice(-10), // Keep last 10 operations
            };

        case 'REMOVE_LAST_UNDO':
            return {
                ...state,
                history: state.history.slice(0, -1),
            };

        case 'CLEAR_UNDO_HISTORY':
            return {
                ...state,
                history: [],
            };

        default:
            return state;
    }
}

const DragDropContext = createContext<DragDropContextValue | null>(null);

interface DragDropProviderProps {
    children: React.ReactNode;
    onAppointmentMove?: (operation: UndoOperation) => Promise<void>;
}

export function DragDropProvider({ children, onAppointmentMove }: DragDropProviderProps) {
    const [dragState, dragDispatch] = useReducer(dragDropReducer, initialState);
    const [undoState, undoDispatch] = useReducer(undoReducer, { history: [] });

    const startDrag = useCallback((appointment: DashboardAppointment, fromSlot: CalendarSlot) => {
        dragDispatch({ type: 'START_DRAG', appointment, fromSlot });
    }, []);

    const endDrag = useCallback(() => {
        dragDispatch({ type: 'END_DRAG' });
    }, []);

    const setHoveredSlot = useCallback((slot: CalendarSlot | null) => {
        dragDispatch({ type: 'SET_HOVERED_SLOT', slot });
    }, []);

    const addUndoOperation = useCallback((operation: UndoOperation) => {
        undoDispatch({ type: 'ADD_UNDO_OPERATION', operation });
    }, []);

    const undo = useCallback(async () => {
        const lastOperation = undoState.history[undoState.history.length - 1];
        if (!lastOperation || !onAppointmentMove) return;

        try {
            // Create reverse operation
            const reverseOperation = createUndoOperation(
                lastOperation.appointmentId,
                lastOperation.newSlot,
                lastOperation.originalSlot,
                lastOperation.type
            );

            // Execute the reverse operation
            await onAppointmentMove(reverseOperation);

            // Remove the operation from history
            undoDispatch({ type: 'REMOVE_LAST_UNDO' });
        } catch (error) {
            console.error('Failed to undo operation:', error);
            throw error;
        }
    }, [undoState.history, onAppointmentMove]);

    const clearUndoHistory = useCallback(() => {
        undoDispatch({ type: 'CLEAR_UNDO_HISTORY' });
    }, []);

    const value: DragDropContextValue = {
        state: dragState,
        undoHistory: undoState.history,
        startDrag,
        endDrag,
        setHoveredSlot,
        canUndo: undoState.history.length > 0,
        undo,
        clearUndoHistory,
        onAppointmentMove,
    };

    // Add undo operation when appointment is moved
    React.useEffect(() => {
        if (!dragState.isDragging && dragState.draggedFrom && dragState.hoveredSlot) {
            const operation = createUndoOperation(
                dragState.draggedAppointment?.id || '',
                dragState.draggedFrom,
                dragState.hoveredSlot
            );
            addUndoOperation(operation);
        }
    }, [dragState.isDragging, dragState.draggedFrom, dragState.hoveredSlot, dragState.draggedAppointment, addUndoOperation]);

    return (
        <DragDropContext.Provider value={value}>
            {children}
        </DragDropContext.Provider>
    );
}

export function useDragDrop() {
    const context = useContext(DragDropContext);
    if (!context) {
        throw new Error('useDragDrop must be used within a DragDropProvider');
    }
    return context;
}

export function useDragDropState() {
    const { state } = useDragDrop();
    return state;
}

export function useDragDropActions() {
    const { startDrag, endDrag, setHoveredSlot } = useDragDrop();
    return { startDrag, endDrag, setHoveredSlot };
}

export function useUndoActions() {
    const { canUndo, undo, clearUndoHistory, undoHistory } = useDragDrop();
    return { canUndo, undo, clearUndoHistory, undoHistory };
}
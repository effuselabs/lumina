/**
 * Drag and Drop Utilities for Appointment Management
 * 
 * Provides utilities for handling appointment drag-and-drop operations,
 * including conflict detection, validation, and visual feedback.
 * 
 * Requirements: 2.2, 2.3, 3.2, 3.6, 7.3
 */

import { CalendarSlot, ConflictInfo, DashboardAppointment } from '@/types/dashboard-appointments';

export interface DragDropState {
    isDragging: boolean;
    draggedAppointment: DashboardAppointment | null;
    draggedFrom: CalendarSlot | null;
    hoveredSlot: CalendarSlot | null;
    conflicts: ConflictInfo[];
}

export interface DropValidationResult {
    isValid: boolean;
    conflicts: ConflictInfo[];
    warnings: string[];
    suggestedAlternatives?: CalendarSlot[];
}

/**
 * Validates if an appointment can be dropped into a specific time slot
 */
export function validateAppointmentDrop(
    appointment: DashboardAppointment,
    targetSlot: CalendarSlot,
    allAppointments: DashboardAppointment[]
): DropValidationResult {
    const conflicts: ConflictInfo[] = [];
    const warnings: string[] = [];

    // Check if appointment can be rescheduled
    if (!appointment.canReschedule) {
        conflicts.push({
            type: 'staff_unavailable',
            severity: 'error',
            message: 'This appointment cannot be rescheduled',
            affectedAppointments: [appointment.id],
        });
    }

    // Check if target slot is available
    if (!targetSlot.isAvailable) {
        conflicts.push({
            type: 'business_closed',
            severity: 'error',
            message: 'Target time slot is not available',
            affectedAppointments: [appointment.id],
        });
    }

    // Check for time conflicts with existing appointments
    const appointmentDuration = appointment.totalDuration;
    const appointmentEndTime = new Date(targetSlot.startTime);
    appointmentEndTime.setMinutes(appointmentEndTime.getMinutes() + appointmentDuration);

    // Find conflicting appointments (excluding the one being moved)
    const conflictingAppointments = allAppointments.filter(apt => {
        if (apt.id === appointment.id) return false;
        if (apt.staffId !== targetSlot.staffId && targetSlot.staffId !== '') return false;

        // Check for time overlap
        return (
            apt.startTime < appointmentEndTime &&
            apt.endTime > targetSlot.startTime
        );
    });

    if (conflictingAppointments.length > 0) {
        conflicts.push({
            type: 'overlap',
            severity: 'error',
            message: `Conflicts with ${conflictingAppointments.length} existing appointment${conflictingAppointments.length > 1 ? 's' : ''}`,
            affectedAppointments: [appointment.id, ...conflictingAppointments.map(apt => apt.id)],
        });
    }

    // Check if appointment extends beyond slot end time
    if (appointmentEndTime > targetSlot.endTime) {
        warnings.push('Appointment extends beyond the selected time slot');
    }

    // Check for staff reassignment
    if (appointment.staffId !== targetSlot.staffId && targetSlot.staffId !== '') {
        warnings.push('This will reassign the appointment to a different staff member');
    }

    return {
        isValid: conflicts.length === 0,
        conflicts,
        warnings,
    };
}

/**
 * Finds alternative time slots when a drop is invalid
 */
export function findAlternativeSlots(
    appointment: DashboardAppointment,
    targetDate: Date,
    allSlots: CalendarSlot[],
    allAppointments: DashboardAppointment[]
): CalendarSlot[] {
    const alternatives: CalendarSlot[] = [];
    const appointmentDuration = appointment.totalDuration;

    // Filter slots for the target date
    const daySlots = allSlots.filter(slot =>
        slot.startTime.toDateString() === targetDate.toDateString()
    );

    for (const slot of daySlots) {
        // Check if slot can accommodate the appointment duration
        const slotDuration = (slot.endTime.getTime() - slot.startTime.getTime()) / (1000 * 60);
        if (slotDuration < appointmentDuration) continue;

        // Validate the slot
        const validation = validateAppointmentDrop(appointment, slot, allAppointments);
        if (validation.isValid) {
            alternatives.push(slot);
        }
    }

    // Sort by proximity to original time
    alternatives.sort((a, b) => {
        const aDistance = Math.abs(a.startTime.getTime() - appointment.startTime.getTime());
        const bDistance = Math.abs(b.startTime.getTime() - appointment.startTime.getTime());
        return aDistance - bDistance;
    });

    return alternatives.slice(0, 5); // Return top 5 alternatives
}

/**
 * Creates drag data for HTML5 drag and drop
 */
export function createDragData(appointment: DashboardAppointment): string {
    return JSON.stringify({
        appointmentId: appointment.id,
        staffId: appointment.staffId,
        startTime: appointment.startTime.toISOString(),
        endTime: appointment.endTime.toISOString(),
        duration: appointment.totalDuration,
    });
}

/**
 * Parses drag data from HTML5 drag and drop
 */
export function parseDragData(dataTransfer: DataTransfer): {
    appointmentId: string;
    staffId: string;
    startTime: Date;
    endTime: Date;
    duration: number;
} | null {
    try {
        const data = dataTransfer.getData('application/json');
        if (!data) {
            // Fallback to plain text
            const appointmentId = dataTransfer.getData('text/plain');
            if (appointmentId) {
                return { appointmentId, staffId: '', startTime: new Date(), endTime: new Date(), duration: 0 };
            }
            return null;
        }

        const parsed = JSON.parse(data);
        return {
            appointmentId: parsed.appointmentId,
            staffId: parsed.staffId,
            startTime: new Date(parsed.startTime),
            endTime: new Date(parsed.endTime),
            duration: parsed.duration,
        };
    } catch (error) {
        console.error('Failed to parse drag data:', error);
        return null;
    }
}

/**
 * Calculates visual feedback styles for drag operations
 */
export function getDragFeedbackStyles(
    isValidDrop: boolean,
    isDragOver: boolean,
    hasConflicts: boolean
): {
    className: string;
    style: React.CSSProperties;
} {
    let className = 'transition-all duration-200';
    let style: React.CSSProperties = {};

    if (isDragOver) {
        if (isValidDrop && !hasConflicts) {
            className += ' bg-green-100 border-green-300 border-2 border-dashed';
            style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
        } else {
            className += ' bg-red-100 border-red-300 border-2 border-dashed';
            style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
        }
    }

    return { className, style };
}

/**
 * Generates a unique key for undo operations
 */
export function generateUndoKey(): string {
    return `undo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Creates an undo operation record
 */
export interface UndoOperation {
    id: string;
    type: 'move' | 'reassign';
    appointmentId: string;
    originalSlot: CalendarSlot;
    newSlot: CalendarSlot;
    timestamp: Date;
    description: string;
}

export function createUndoOperation(
    appointmentId: string,
    originalSlot: CalendarSlot,
    newSlot: CalendarSlot,
    type: 'move' | 'reassign' = 'move'
): UndoOperation {
    const isReassignment = originalSlot.staffId !== newSlot.staffId;
    const operationType = isReassignment ? 'reassign' : 'move';

    let description = `${operationType === 'reassign' ? 'Reassigned' : 'Moved'} appointment`;
    if (operationType === 'reassign') {
        description += ` to different staff member`;
    }
    description += ` from ${originalSlot.startTime.toLocaleTimeString()} to ${newSlot.startTime.toLocaleTimeString()}`;

    return {
        id: generateUndoKey(),
        type: operationType,
        appointmentId,
        originalSlot,
        newSlot,
        timestamp: new Date(),
        description,
    };
}
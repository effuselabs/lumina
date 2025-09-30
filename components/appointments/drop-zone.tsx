'use client';

import {
    DropValidationResult,
    getDragFeedbackStyles,
    parseDragData,
    validateAppointmentDrop
} from '@/lib/drag-drop-utils';
import { cn } from '@/lib/utils';
import { CalendarSlot, DashboardAppointment } from '@/types/dashboard-appointments';
import React, { useCallback, useState } from 'react';
import { useDragDropState } from './drag-drop-context';

/**
 * Drop Zone Component
 * 
 * Provides visual feedback and validation for appointment drop operations.
 * Handles drag over states, conflict detection, and visual indicators.
 * 
 * Requirements: 2.2, 2.3, 3.2, 7.3
 */

interface DropZoneProps {
    slot: CalendarSlot;
    appointments: DashboardAppointment[];
    onDrop: (appointmentId: string, slot: CalendarSlot) => void;
    children: React.ReactNode;
    className?: string;
    disabled?: boolean;
    showFeedback?: boolean;
}

export function DropZone({
    slot,
    appointments,
    onDrop,
    children,
    className,
    disabled = false,
    showFeedback = true,
}: DropZoneProps) {
    const [isDragOver, setIsDragOver] = useState(false);
    const [validation, setValidation] = useState<DropValidationResult | null>(null);
    const dragState = useDragDropState();

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (disabled) return;

        setIsDragOver(true);

        // Validate the drop if we have drag data
        if (dragState.draggedAppointment) {
            const validationResult = validateAppointmentDrop(
                dragState.draggedAppointment,
                slot,
                appointments
            );
            setValidation(validationResult);
        }
    }, [disabled, dragState.draggedAppointment, slot, appointments]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();

        // Only hide feedback if we're actually leaving the drop zone
        // (not just moving to a child element)
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;

        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
            setIsDragOver(false);
            setValidation(null);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (disabled) return;

        // Set the drop effect based on validation
        if (validation?.isValid) {
            e.dataTransfer.dropEffect = 'move';
        } else {
            e.dataTransfer.dropEffect = 'none';
        }
    }, [disabled, validation]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        setValidation(null);

        if (disabled) return;

        // Try to get appointment ID from drag data
        let appointmentId: string | null = null;

        // First try to parse structured data
        const dragData = parseDragData(e.dataTransfer);
        if (dragData) {
            appointmentId = dragData.appointmentId;
        } else {
            // Fallback to plain text
            appointmentId = e.dataTransfer.getData('text/plain');
        }

        if (appointmentId) {
            onDrop(appointmentId, slot);
        }
    }, [disabled, slot, onDrop]);

    // Get visual feedback styles
    const feedbackStyles = showFeedback ? getDragFeedbackStyles(
        validation?.isValid ?? false,
        isDragOver,
        validation?.conflicts.length > 0 ?? false
    ) : { className: '', style: {} };

    return (
        <div
            className={cn(
                'relative',
                feedbackStyles.className,
                {
                    'cursor-not-allowed': disabled,
                    'cursor-pointer': !disabled,
                },
                className
            )}
            style={feedbackStyles.style}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {children}

            {/* Drop feedback overlay */}
            {isDragOver && showFeedback && (
                <div className="absolute inset-0 pointer-events-none z-10">
                    {validation?.isValid ? (
                        <div className="absolute inset-0 bg-green-500/10 border-2 border-green-500 border-dashed rounded flex items-center justify-center">
                            <div className="bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
                                Drop here
                            </div>
                        </div>
                    ) : (
                        <div className="absolute inset-0 bg-red-500/10 border-2 border-red-500 border-dashed rounded flex items-center justify-center">
                            <div className="bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">
                                {validation?.conflicts[0]?.message || 'Cannot drop here'}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Conflict indicators */}
            {isDragOver && validation && validation.conflicts.length > 0 && showFeedback && (
                <div className="absolute top-1 right-1 z-20">
                    <div className="bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold">
                        !
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Simple Drop Zone for basic drop functionality
 */
interface SimpleDropZoneProps {
    onDrop: (appointmentId: string) => void;
    children: React.ReactNode;
    className?: string;
    disabled?: boolean;
}

export function SimpleDropZone({
    onDrop,
    children,
    className,
    disabled = false,
}: SimpleDropZoneProps) {
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (!disabled) {
            setIsDragOver(true);
        }
    }, [disabled]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;

        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
            setIsDragOver(false);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (!disabled) {
            e.dataTransfer.dropEffect = 'move';
        }
    }, [disabled]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        if (disabled) return;

        const appointmentId = e.dataTransfer.getData('text/plain');
        if (appointmentId) {
            onDrop(appointmentId);
        }
    }, [disabled, onDrop]);

    return (
        <div
            className={cn(
                'relative transition-colors',
                {
                    'bg-green-50 border-green-300 border-2 border-dashed': isDragOver && !disabled,
                    'cursor-not-allowed opacity-50': disabled,
                },
                className
            )}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {children}
        </div>
    );
}
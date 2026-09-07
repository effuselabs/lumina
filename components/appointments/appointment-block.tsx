'use client';

import { cn } from '@/lib/utils';
import {
  AppointmentBlockProps,
  AppointmentStatus,
} from '@/types/dashboard-appointments';
import { Checkbox } from '@radix-ui/react-checkbox';
import { Clock, GripVertical, User } from 'lucide-react';
import React, { useState } from 'react';
import { createDragData } from '../../lib/drag-drop-utils';
import { useBulkSelection } from './bulk-selection-provider';
import { useDragDropActions } from './drag-drop-context';

/**
 * AppointmentBlock Component
 *
 * Displays an individual appointment within a calendar time slot.
 * Shows client name, service, time, and status with appropriate styling.
 * Enhanced with drag-and-drop functionality for rescheduling.
 *
 * Requirements: 1.1, 1.5, 2.2, 2.3
 */
export function AppointmentBlock({
  appointment,
  view,
  onClick,
  onDragStart,
  onDragEnd,
  isDragging = false,
  className,
  enableSelection = false,
}: AppointmentBlockProps & { enableSelection?: boolean }) {
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  const getStatusColor = (status: AppointmentStatus): string => {
    switch (status) {
      case AppointmentStatus.SCHEDULED:
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case AppointmentStatus.CONFIRMED:
        return 'bg-green-100 border-green-300 text-green-800';
      case AppointmentStatus.IN_PROGRESS:
        return 'bg-lumina-radiant/20 border-lumina-coral text-lumina-coral';
      case AppointmentStatus.COMPLETED:
        return 'bg-gray-100 border-gray-300 text-gray-600';
      case AppointmentStatus.CANCELLED:
        return 'bg-red-100 border-red-300 text-red-800';
      case AppointmentStatus.NO_SHOW:
        return 'bg-orange-100 border-orange-300 text-orange-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-600';
    }
  };

  const getBlockSize = (): string => {
    switch (view) {
      case 'day':
        return 'min-h-[3rem] p-2'; // Larger for detailed day view
      case 'week':
        return 'min-h-[2rem] p-1.5'; // Medium for week view
      case 'month':
        return 'min-h-[1.5rem] p-1'; // Compact for month view
      default:
        return 'min-h-[2rem] p-1.5';
    }
  };

  const showDetails = view === 'day' || view === 'week';
  const showMinimalInfo = view === 'month';

  const [isHovered, setIsHovered] = useState(false);
  const { startDrag, endDrag } = useDragDropActions();
  const { selectedAppointments, isSelectionMode, toggleAppointment } =
    useBulkSelection();

  const isSelected = selectedAppointments.has(appointment.id);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isSelectionMode && enableSelection) {
      toggleAppointment(appointment.id);
    } else {
      onClick?.(appointment);
    }
  };

  const handleCheckboxChange = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleAppointment(appointment.id);
  };

  const handleDragStart = (e: React.DragEvent) => {
    // Set both structured and fallback data
    const dragData = createDragData(appointment);
    e.dataTransfer.setData('application/json', dragData);
    e.dataTransfer.setData('text/plain', appointment.id);

    // Set drag effect
    e.dataTransfer.effectAllowed = 'move';

    // Create a custom drag image
    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
    dragImage.style.transform = 'rotate(5deg)';
    dragImage.style.opacity = '0.8';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);

    // Clean up drag image after a short delay
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);

    // Notify context and parent
    const currentSlot = {
      id: `slot-${appointment.id}`,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      staffId: appointment.staffId,
      isAvailable: true,
      appointments: [appointment],
      conflicts: [],
    };

    startDrag(appointment, currentSlot);

    if (onDragStart) {
      onDragStart(appointment);
    }
  };

  const handleDragEnd = () => {
    endDrag();

    if (onDragEnd) {
      onDragEnd();
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div
      className={cn(
        'group relative cursor-pointer rounded border-l-4 transition-all hover:shadow-sm',
        getStatusColor(appointment.status),
        getBlockSize(),
        {
          'scale-95 opacity-50': isDragging,
          'ring-lumina-coral/20 shadow-lg ring-2': isDragging,
          'shadow-md': isHovered && appointment.canReschedule,
          'cursor-grab':
            appointment.canReschedule && !isDragging && !isSelectionMode,
          'cursor-grabbing': appointment.canReschedule && isDragging,
          'ring-2 ring-blue-500 ring-offset-1': isSelected,
          'hover:ring-1 hover:ring-blue-300':
            isSelectionMode && enableSelection,
        },
        className
      )}
      onClick={handleClick}
      draggable={appointment.canReschedule && !isSelectionMode}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        borderLeftColor: appointment.staff.color,
      }}
    >
      <div className="flex min-w-0 flex-col space-y-1">
        {/* Selection Mode Header */}
        {isSelectionMode && enableSelection && showDetails && (
          <div className="mb-1 flex items-center justify-between">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => toggleAppointment(appointment.id)}
              onClick={handleCheckboxChange}
              className="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600"
            />
            <div className="text-xs opacity-75">{appointment.status}</div>
          </div>
        )}

        {/* Drag Handle */}
        {appointment.canReschedule && showDetails && !isSelectionMode && (
          <div className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100">
            <GripVertical className="text-color-foreground-muted h-3 w-3" />
          </div>
        )}

        {/* Selection checkbox for compact views */}
        {isSelectionMode && enableSelection && !showDetails && (
          <div className="absolute left-1 top-1">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => toggleAppointment(appointment.id)}
              onClick={handleCheckboxChange}
              className="h-3 w-3 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600"
            />
          </div>
        )}

        {/* Client Name */}
        <div className="truncate text-sm font-medium">
          {appointment.client.firstName} {appointment.client.lastName}
        </div>

        {/* Service and Time Info */}
        {showDetails && (
          <>
            <div className="truncate text-xs opacity-90">
              {appointment.services.map(s => s.name).join(', ')}
            </div>
            <div className="flex items-center space-x-2 text-xs opacity-75">
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>{formatTime(appointment.startTime)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <User className="h-3 w-3" />
                <span className="truncate">
                  {appointment.staff.displayName}
                </span>
              </div>
            </div>
          </>
        )}

        {/* Minimal info for month view */}
        {showMinimalInfo && (
          <div className="truncate text-xs opacity-90">
            {formatTime(appointment.startTime)} •{' '}
            {appointment.staff.displayName}
          </div>
        )}

        {/* Duration indicator */}
        {showDetails && (
          <div className="text-xs opacity-75">
            {formatDuration(appointment.totalDuration)}
          </div>
        )}
      </div>

      {/* Conflict indicator */}
      {appointment.isConflicted && (
        <div className="absolute left-1 top-1">
          <div className="h-2 w-2 rounded-full bg-red-500" />
        </div>
      )}

      {/* Draggable indicator */}
      {appointment.canReschedule && !showDetails && !isSelectionMode && (
        <div className="absolute bottom-1 right-1 opacity-0 transition-opacity group-hover:opacity-100">
          <GripVertical className="text-color-foreground-muted h-2 w-2" />
        </div>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute right-1 top-1 h-2 w-2 rounded-full bg-blue-600"></div>
      )}
    </div>
  );
}

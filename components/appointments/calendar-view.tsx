'use client';

import { CalendarViewProps } from '@/types/dashboard-appointments';
import { DayView } from './day-view';
import { DragDropManager } from './drag-drop-manager';
import { MonthView } from './month-view';
import { WeekView } from './week-view';

/**
 * Calendar View Component
 *
 * Main calendar component that renders the appropriate view (day/week/month)
 * and integrates drag-and-drop functionality for appointment management.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.2, 2.3
 */

interface CalendarViewComponentProps extends CalendarViewProps {
  onAppointmentMove?: (appointmentId: string, newSlot: any) => Promise<void>;
}

export function CalendarView({
  view,
  currentDate,
  appointments,
  staffMembers,
  businessHours,
  onAppointmentClick,
  onAppointmentDrop,
  onTimeSlotClick,
  onAppointmentMove,
}: CalendarViewComponentProps) {
  // Generate all possible slots for alternatives
  const generateAllSlots = () => {
    // This would typically come from a service or be calculated
    // For now, return empty array - will be implemented when integrating with real data
    return [];
  };

  const allSlots = generateAllSlots();

  // Default appointment move handler
  const handleAppointmentMove = async (appointmentId: string, newSlot: any) => {
    if (onAppointmentMove) {
      await onAppointmentMove(appointmentId, newSlot);
    } else {
      console.log('Moving appointment:', appointmentId, 'to slot:', newSlot);
      // Default implementation - would integrate with API
    }
  };

  const renderView = () => {
    const commonProps = {
      currentDate,
      appointments,
      staffMembers,
      businessHours,
      onAppointmentClick,
      onAppointmentDrop,
      onTimeSlotClick,
    };

    switch (view) {
      case 'day':
        return <DayView {...commonProps} />;
      case 'week':
        return <WeekView {...commonProps} />;
      case 'month':
        return <MonthView {...commonProps} />;
      default:
        return <WeekView {...commonProps} />;
    }
  };

  return (
    <DragDropManager
      appointments={appointments}
      allSlots={allSlots}
      onAppointmentMove={handleAppointmentMove}
    >
      {renderView()}
    </DragDropManager>
  );
}

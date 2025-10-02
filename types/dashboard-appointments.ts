/**
 * Dashboard Appointment Types
 * Enhanced appointment types for dashboard management
 */

import { AppointmentStatus } from '@prisma/client';
import { StaffMember } from './booking';

// Re-export StaffMember for backward compatibility
export { StaffMember } from './booking';

// Re-export for components
export { AppointmentStatus };

// Calendar view types
export type CalendarView = 'day' | 'week' | 'month';

export interface CalendarViewProps {
  view: CalendarView;
  currentDate: Date;
  appointments: DashboardAppointment[];
  staffMembers: StaffMember[];
  businessHours: BusinessHours;
  onAppointmentClick?: (appointment: DashboardAppointment) => void;
  onAppointmentDrop?: (appointmentId: string, newSlot: unknown) => Promise<void>;
  onTimeSlotClick?: (date: Date, staffId?: string) => void;
}

export interface BusinessHours {
  [key: string]: {
    isOpen: boolean;
    openTime: string;
    closeTime: string;
  };
}

// StaffMember imported from booking types to avoid duplication

export interface AppointmentBlockProps {
  appointment: DashboardAppointment;
  view: CalendarView;
  onClick?: (appointment: DashboardAppointment) => void;
  onDragStart?: (appointment: DashboardAppointment) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  className?: string;
}

export interface CalendarHeaderProps {
  view: CalendarView;
  currentDate: Date;
  onViewChange: (view: CalendarView) => void;
  onDateChange: (date: Date) => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  onToday: () => void;
}

export interface TimeSlotProps {
  slot: CalendarSlot;
  view: CalendarView;
  isSelected?: boolean;
  onClick?: (slot: CalendarSlot) => void;
  className?: string;
}

export interface DashboardAppointment {
  // Core appointment data
  id: string;
  businessId: string;
  clientId: string;
  staffId: string;
  startTime: Date;
  endTime: Date;
  status: AppointmentStatus;
  services: Array<{
    id: string;
    name: string;
    duration: number;
    price: number;
  }>;
  totalPrice: number;
  totalDuration: number;
  notes?: string;

  // Enhanced data for dashboard
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    avatar?: string;
  };

  staff: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string;
    color: string; // For calendar color coding
  };

  // Computed properties
  isConflicted: boolean;
  canEdit: boolean;
  canCancel: boolean;
  canReschedule: boolean;

  // Real-time status
  lastUpdated: Date;
  updatedBy?: string;
}

export interface CalendarSlot {
  id: string;
  startTime: Date;
  endTime: Date;
  staffId: string;
  isAvailable: boolean;
  appointment?: DashboardAppointment;
}

export interface ConflictInfo {
  type:
    | 'time_overlap'
    | 'staff_unavailable'
    | 'business_hours'
    | 'service_conflict';
  message: string;
  conflictingAppointments?: DashboardAppointment[];
  suggestedTimes?: Date[];
}

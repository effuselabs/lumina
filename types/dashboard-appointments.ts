/**
 * Dashboard Appointment Types
 * Enhanced appointment types for dashboard management
 */

import { AppointmentStatus } from '@prisma/client';

// Re-export for components
export { AppointmentStatus };

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

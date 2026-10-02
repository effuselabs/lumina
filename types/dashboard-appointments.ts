/**
 * Dashboard Appointment Types
 * Enhanced appointment types for dashboard management
 */

// StaffMember interface (duplicated to avoid circular dependency)
interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  avatar?: string;
  specialties?: string[];
  color: string;
  isActive: boolean;
  role?: string;
}

/**
 * Prisma's `AppointmentStatus`, mirrored rather than imported: client
 * components read this file, and importing `@prisma/client` shipped Prisma's
 * browser stub to the calendar page. `appointment-status.test.ts` keeps the
 * two identical.
 */
export const AppointmentStatus = {
  SCHEDULED: 'SCHEDULED',
  CONFIRMED: 'CONFIRMED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
} as const;
export type AppointmentStatus =
  (typeof AppointmentStatus)[keyof typeof AppointmentStatus];

// Calendar view types
export type CalendarView = 'day' | 'week' | 'month';

export interface CalendarViewProps {
  view: CalendarView;
  currentDate: Date;
  appointments: DashboardAppointment[];
  staffMembers: StaffMember[];
  businessHours: BusinessHoursEntry[];
  onAppointmentClick?: (appointment: DashboardAppointment) => void;
  onAppointmentDrop?: (
    appointmentId: string,
    newSlot: unknown
  ) => Promise<void>;
  onTimeSlotClick?: (date: Date, staffId?: string) => void;
}

export interface BusinessHoursEntry {
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
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
  appointments: DashboardAppointment[]; // Support both singular and plural for compatibility
  conflicts: ConflictInfo[];
}

export interface ConflictInfo {
  type:
    | 'time_overlap'
    | 'staff_unavailable'
    | 'business_hours'
    | 'service_conflict'
    | 'overlap'
    | 'business_closed';
  severity: 'warning' | 'error';
  message: string;
  affectedAppointments: string[];
  conflictingAppointments?: DashboardAppointment[];
  suggestedTimes?: Date[];
  suggestedAlternatives?: TimeSlotAlternative[];
}

interface TimeSlotAlternative {
  startTime: Date;
  endTime: Date;
  staffId: string;
  staffName: string;
  confidence: number; // 0-1 score for how good this alternative is
}

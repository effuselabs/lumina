/**
 * Centralized Type Export Hub
 * 
 * This file serves as the single source of truth for type exports across the application.
 * Import types from here rather than directly from individual files to maintain consistency.
 */

// Prisma-generated types - Core types that are commonly used
export type { 
  AppointmentStatus,
  BusinessRole,
  EmploymentType,
  RentalPeriod,
  CommunicationType,
  AutomationType,
  CommunicationStatus
} from '@prisma/client';

// Dashboard and Appointment types - Only export types that actually exist
export type {
  DashboardAppointment,
  CalendarSlot,
  ConflictInfo
} from './dashboard-appointments';

// Re-export AppointmentStatus for convenience
export { AppointmentStatus } from './dashboard-appointments';

// Booking types
export type {
  BusinessInfo,
  BusinessHours,
  BrandingConfig,
  BusinessPolicies,
  Service,
  StaffMember,
  TimeSlot,
  ClientBookingData,
  CreatedAppointment,
  ClientInfo,
  PublicBookingConfig,
  PublicBookingError,
  PublicBookingErrorType
} from './booking';

export { DayOfWeek } from './booking';

// Employment types
export type {
  CommissionStructure,
  ChairRentalStructure,
  HybridStructure,
  EmploymentDetails
} from './employment';

// Booking component types
export type { BookingStep } from '../components/booking/booking-progress';
export { defaultBookingSteps } from '../components/booking/booking-progress';

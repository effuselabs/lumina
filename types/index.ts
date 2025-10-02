/**
 * Centralized Type Export Hub
 * 
 * This file provides a single point of import for all commonly used types
 * across the Lumina application, improving developer experience and
 * maintaining consistency in type usage.
 */

// Prisma generated types
export type { 
  AppointmentStatus, 
  BusinessRole, 
  EmploymentType,
  TimeOffStatus,
  AppointmentService,
  Business,
  Client,
  Staff,
  User
} from '@prisma/client';

// Dashboard and appointment types
export type { 
  DashboardAppointment,
  CalendarSlot,
  ConflictInfo,
  CalendarView,
  CalendarViewProps,
  BusinessHours,
  AppointmentBlockProps,
  CalendarHeaderProps
} from './dashboard-appointments';

// Re-export AppointmentStatus for convenience
export { AppointmentStatus } from './dashboard-appointments';

// Booking system types
export type {
  BookingStep,
  StaffMember,
  ServiceOption,
  TimeSlot,
  AvailabilitySlot
} from './booking';

// Authentication and user types
export type {
  BusinessUser,
  UserRole,
  Permission
} from './auth';

// Database relationship types
export type {
  AppointmentWithRelations,
  BusinessWithRelations,
  StaffWithRelations,
  ClientWithRelations
} from './database';

// Form and validation types
export type {
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
  AppointmentFilters,
  ConflictCheckRequest
} from '../lib/validations/appointment';

// Service layer types
export type {
  AvailabilityQuery,
  AvailabilityResult,
  AvailabilityConstraints
} from '../lib/services/availability-calculator';

export type {
  ValidationResult,
  Conflict,
  ConflictDetails
} from '../lib/services/conflict-detection-engine';

// Booking progress types
export { defaultBookingSteps } from '../components/booking/booking-progress';
export type { BookingStep } from '../components/booking/booking-progress';
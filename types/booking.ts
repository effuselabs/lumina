// Public Booking Interface Types

export interface BusinessInfo {
  id: string;
  name: string;
  logo?: string;
  address?: string;
  phone?: string;
  email?: string;
  businessHours: BusinessHours[];
  branding?: BrandingConfig;
  policies?: BusinessPolicies;
  isActive: boolean;
  publicBookingEnabled: boolean;
}

export interface BusinessHours {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  openTime: string | null; // HH:MM format
  closeTime: string | null; // HH:MM format
  isClosed: boolean;
}

export enum DayOfWeek {
  SUNDAY = 0,
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
}

export interface BrandingConfig {
  brandColors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  customDomain?: string;
}

export interface BusinessPolicies {
  cancellationPolicy?: string;
  noShowPolicy?: string;
  preparationInstructions?: string;
  advanceBookingDays?: number;
  minimumNoticeHours?: number;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  duration: number; // minutes
  price: number; // in cents
  category: string;
  staffIds: string[]; // qualified staff
  isActive: boolean;
  prerequisites?: string;
  recommendations?: string;
}

export interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  avatar?: string;
  specialties: string[];
  isActive: boolean;
}

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  staffId: string;
  staffName: string;
  isAvailable: boolean;
  totalDuration: number;
  totalPrice: number;
}

export interface ClientBookingData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes?: string;
  isNewClient: boolean;
  marketingOptIn: boolean;
}

export interface CreatedAppointment {
  id: string;
  confirmationNumber: string;
  dateTime: Date;
  services: Service[];
  staff: StaffMember;
  client: ClientInfo;
  totalDuration: number;
  totalPrice: number;
  notes?: string;
}

export interface ClientInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

// Public Booking Configuration
export interface PublicBookingConfig {
  businessId: string;
  isEnabled: boolean;
  advanceBookingDays: number;
  minimumNoticeHours: number;
  maxServicesPerBooking: number;
  requirePhone: boolean;
  requireEmail: boolean;
  allowNotes: boolean;
  customDomain?: string;
  brandColors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  sendConfirmationEmail: boolean;
  sendReminderEmail: boolean;
  reminderHours: number;
}

// Error Types
export enum PublicBookingErrorType {
  BUSINESS_NOT_FOUND = 'BUSINESS_NOT_FOUND',
  BUSINESS_INACTIVE = 'BUSINESS_INACTIVE',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  SLOT_UNAVAILABLE = 'SLOT_UNAVAILABLE',
  INVALID_CLIENT_DATA = 'INVALID_CLIENT_DATA',
  BOOKING_CONFLICT = 'BOOKING_CONFLICT',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
}

export interface PublicBookingError {
  type: PublicBookingErrorType;
  message: string;
  userMessage: string;
  suggestions?: string[];
  alternativeSlots?: TimeSlot[];
}

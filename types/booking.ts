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

interface BusinessHours {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  openTime: string | null; // HH:MM format
  closeTime: string | null; // HH:MM format
  isClosed: boolean;
}

interface BrandingConfig {
  brandColors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  customDomain?: string;
}

interface BusinessPolicies {
  cancellationPolicy?: string;
  noShowPolicy?: string;
  preparationInstructions?: string;
  advanceBookingDays?: number;
  minimumNoticeHours?: number;
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

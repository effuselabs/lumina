export interface Service {
  id: string;
  name: string;
  description?: string;
  category?: string;
  price: number;
  duration: number;
  prerequisites?: string;
  recommendations?: string;
  staffIds: string[];
  availableStaff: Array<{
    id: string;
    displayName: string;
    title?: string;
    bio?: string;
    avatar?: string;
    customPrice?: number;
    customDuration?: number;
  }>;
}

export interface ServicesByCategory {
  [category: string]: Service[];
}

export interface BusinessInfo {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country: string;
  timezone: string;
  requireDeposit: boolean;
  depositAmount?: number;
  cancellationPolicy?: string;
  logo?: string;
  primaryColor?: string;
  operatingHours?: any;
}

export interface BookingConfig {
  requireDeposit: boolean;
  depositAmount?: number;
  advanceBookingDays: number;
  minimumNoticeHours: number;
  maxServicesPerBooking: number;
}

export interface ServiceSelectionProps {
  businessId: string;
  onServicesSelect: (services: Service[]) => void;
  selectedServices?: Service[];
  onNext?: () => void;
}

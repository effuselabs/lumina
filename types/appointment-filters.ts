// Appointment Search and Filter Types

import { AppointmentStatus } from '@prisma/client';

export interface AppointmentFilters {
  searchTerm?: string;
  staffIds?: string[];
  serviceIds?: string[];
  status?: AppointmentStatus[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  clientId?: string;
  clientName?: string;
}

export interface FilterPreset {
  id: string;
  name: string;
  filters: AppointmentFilters;
  icon?: string;
}

export interface SearchFiltersProps {
  onFilterChange: (filters: AppointmentFilters) => void;
  staffMembers: StaffMember[];
  services: Service[];
  initialFilters?: AppointmentFilters;
  className?: string;
}

export interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  color: string;
  isActive: boolean;
}

export interface Service {
  id: string;
  name: string;
  category?: string;
  duration: number;
  price: number;
  isActive: boolean;
}

export interface SearchResult {
  appointments: DashboardAppointment[];
  totalCount: number;
  highlightedTerms: string[];
  hasMore: boolean;
}

export interface SearchHighlight {
  text: string;
  isHighlighted: boolean;
}

// Filter validation and utility types
export interface FilterValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FilterState {
  filters: AppointmentFilters;
  isLoading: boolean;
  error?: string;
  lastUpdated: Date;
}

// Import the DashboardAppointment type
import { DashboardAppointment } from './dashboard-appointments';

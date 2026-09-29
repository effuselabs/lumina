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

// Import the DashboardAppointment type
import { DashboardAppointment } from './dashboard-appointments';

// Search and Filter Utilities

import {
  AppointmentFilters,
  SearchHighlight,
  SearchResult,
} from '@/types/appointment-filters';
import { DashboardAppointment } from '@/types/dashboard-appointments';
import { endOfDay, isWithinInterval, startOfDay } from 'date-fns';

/**
 * Filter appointments based on the provided filters
 */
export function filterAppointments(
  appointments: DashboardAppointment[],
  filters: AppointmentFilters
): DashboardAppointment[] {
  let filtered = [...appointments];

  // Search term filter
  if (filters.searchTerm) {
    const searchTerm = filters.searchTerm.toLowerCase();
    filtered = filtered.filter(appointment => {
      const searchableText = [
        appointment.client.firstName,
        appointment.client.lastName,
        appointment.client.email,
        appointment.client.phone,
        appointment.staff.displayName,
        appointment.staff.firstName,
        appointment.staff.lastName,
        ...appointment.services.map(s => s.name),
        appointment.notes,
        appointment.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(searchTerm);
    });
  }

  // Staff filter
  if (filters.staffIds?.length) {
    filtered = filtered.filter(appointment =>
      filters.staffIds!.includes(appointment.staffId)
    );
  }

  // Service filter
  if (filters.serviceIds?.length) {
    filtered = filtered.filter(appointment =>
      appointment.services.some(service =>
        filters.serviceIds!.includes(service.id)
      )
    );
  }

  // Status filter
  if (filters.status?.length) {
    filtered = filtered.filter(appointment =>
      filters.status!.includes(appointment.status)
    );
  }

  // Date range filter
  if (filters.dateRange) {
    const { start, end } = filters.dateRange;
    filtered = filtered.filter(appointment =>
      isWithinInterval(appointment.startTime, {
        start: startOfDay(start),
        end: endOfDay(end),
      })
    );
  }

  // Client name filter
  if (filters.clientName) {
    const clientName = filters.clientName.toLowerCase();
    filtered = filtered.filter(appointment => {
      const fullName =
        `${appointment.client.firstName} ${appointment.client.lastName}`.toLowerCase();
      return fullName.includes(clientName);
    });
  }

  // Client ID filter
  if (filters.clientId) {
    filtered = filtered.filter(
      appointment => appointment.clientId === filters.clientId
    );
  }

  return filtered;
}

/**
 * Create search result with highlighting information
 */
export function createSearchResult(
  appointments: DashboardAppointment[],
  filters: AppointmentFilters,
  totalCount: number,
  hasMore: boolean = false
): SearchResult {
  const highlightedTerms = extractHighlightTerms(filters);

  return {
    appointments,
    totalCount,
    highlightedTerms,
    hasMore,
  };
}

/**
 * Extract terms that should be highlighted from filters
 */
export function extractHighlightTerms(filters: AppointmentFilters): string[] {
  const terms: string[] = [];

  if (filters.searchTerm) {
    // Split search term into individual words
    terms.push(
      ...filters.searchTerm.split(/\s+/).filter(term => term.length > 0)
    );
  }

  if (filters.clientName) {
    terms.push(
      ...filters.clientName.split(/\s+/).filter(term => term.length > 0)
    );
  }

  return terms;
}

/**
 * Highlight search terms in text
 */
export function highlightText(
  text: string,
  searchTerms: string[]
): SearchHighlight[] {
  if (!searchTerms.length || !text) {
    return [{ text, isHighlighted: false }];
  }

  // Create a regex pattern for all search terms
  const pattern = new RegExp(
    `(${searchTerms.map(term => escapeRegExp(term)).join('|')})`,
    'gi'
  );

  const parts = text.split(pattern);
  const highlights: SearchHighlight[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    const isHighlighted = searchTerms.some(
      term => part.toLowerCase() === term.toLowerCase()
    );

    highlights.push({
      text: part,
      isHighlighted,
    });
  }

  return highlights;
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Sort appointments by relevance to search terms
 */
export function sortByRelevance(
  appointments: DashboardAppointment[],
  searchTerms: string[]
): DashboardAppointment[] {
  if (!searchTerms.length) {
    return appointments.sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime()
    );
  }

  return appointments.sort((a, b) => {
    const scoreA = calculateRelevanceScore(a, searchTerms);
    const scoreB = calculateRelevanceScore(b, searchTerms);

    if (scoreA !== scoreB) {
      return scoreB - scoreA; // Higher score first
    }

    // If same relevance, sort by date
    return a.startTime.getTime() - b.startTime.getTime();
  });
}

/**
 * Calculate relevance score for an appointment
 */
function calculateRelevanceScore(
  appointment: DashboardAppointment,
  searchTerms: string[]
): number {
  let score = 0;
  const searchText = [
    appointment.client.firstName,
    appointment.client.lastName,
    appointment.client.email,
    appointment.staff.displayName,
    ...appointment.services.map(s => s.name),
    appointment.notes || '',
  ]
    .join(' ')
    .toLowerCase();

  searchTerms.forEach(term => {
    const termLower = term.toLowerCase();

    // Exact matches in client name get highest score
    if (
      appointment.client.firstName.toLowerCase().includes(termLower) ||
      appointment.client.lastName.toLowerCase().includes(termLower)
    ) {
      score += 10;
    }

    // Staff name matches
    if (appointment.staff.displayName.toLowerCase().includes(termLower)) {
      score += 8;
    }

    // Service name matches
    if (
      appointment.services.some(s => s.name.toLowerCase().includes(termLower))
    ) {
      score += 6;
    }

    // Email matches
    if (appointment.client.email.toLowerCase().includes(termLower)) {
      score += 4;
    }

    // Notes matches
    if (appointment.notes?.toLowerCase().includes(termLower)) {
      score += 2;
    }

    // General text matches
    if (searchText.includes(termLower)) {
      score += 1;
    }
  });

  return score;
}

/**
 * Validate filter configuration
 */
export function validateFilters(filters: AppointmentFilters): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate date range
  if (filters.dateRange) {
    const { start, end } = filters.dateRange;

    if (start > end) {
      errors.push('Start date must be before end date');
    }

    const daysDiff = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysDiff > 365) {
      warnings.push('Date range spans more than a year, results may be slow');
    }
  }

  // Validate search term
  if (filters.searchTerm) {
    if (filters.searchTerm.length < 2) {
      warnings.push(
        'Search term is very short, consider using more specific terms'
      );
    }

    if (filters.searchTerm.length > 100) {
      errors.push('Search term is too long');
    }
  }

  // Validate array filters
  if (filters.staffIds && filters.staffIds.length > 20) {
    warnings.push(
      'Many staff members selected, consider narrowing the selection'
    );
  }

  if (filters.serviceIds && filters.serviceIds.length > 50) {
    warnings.push('Many services selected, consider narrowing the selection');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

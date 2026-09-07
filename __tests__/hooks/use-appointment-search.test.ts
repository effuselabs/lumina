import {
  useAppointmentSearch,
  useSearchHistory,
} from '@/hooks/use-appointment-search';
import { AppointmentFilters } from '@/types/appointment-filters';
import {
  AppointmentStatus,
  DashboardAppointment,
} from '@/types/dashboard-appointments';
import { act, renderHook, waitFor } from '@testing-library/react';

// Mock the search utils
jest.mock('@/lib/search-utils', () => ({
  filterAppointments: jest.fn((appointments, filters) => {
    // Simple mock implementation
    if (filters.searchTerm) {
      return appointments.filter((apt: any) =>
        apt.client.firstName
          .toLowerCase()
          .includes(filters.searchTerm.toLowerCase())
      );
    }
    return appointments;
  }),
  createSearchResult: jest.fn((appointments, filters, totalCount, hasMore) => ({
    appointments,
    totalCount,
    highlightedTerms: filters.searchTerm ? [filters.searchTerm] : [],
    hasMore,
  })),
  extractHighlightTerms: jest.fn(filters =>
    filters.searchTerm ? [filters.searchTerm] : []
  ),
  sortByRelevance: jest.fn(appointments => appointments),
  validateFilters: jest.fn(() => ({
    isValid: true,
    errors: [],
    warnings: [],
  })),
}));

const mockAppointments: DashboardAppointment[] = [
  {
    id: '1',
    businessId: 'business-1',
    clientId: 'client-1',
    staffId: 'staff-1',
    startTime: new Date('2024-01-15T10:00:00Z'),
    endTime: new Date('2024-01-15T11:00:00Z'),
    status: AppointmentStatus.CONFIRMED,
    services: [{ id: 'service-1', name: 'Haircut', duration: 60, price: 5000 }],
    totalPrice: 5000,
    totalDuration: 60,
    client: {
      id: 'client-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '(555) 123-4567',
    },
    staff: {
      id: 'staff-1',
      firstName: 'Sarah',
      lastName: 'Johnson',
      displayName: 'Sarah J.',
      color: '#FF6B6B',
    },
    isConflicted: false,
    canEdit: true,
    canCancel: true,
    canReschedule: true,
    lastUpdated: new Date(),
    updatedBy: undefined,
  },
  {
    id: '2',
    businessId: 'business-1',
    clientId: 'client-2',
    staffId: 'staff-2',
    startTime: new Date('2024-01-16T14:00:00Z'),
    endTime: new Date('2024-01-16T15:30:00Z'),
    status: AppointmentStatus.SCHEDULED,
    services: [
      { id: 'service-2', name: 'Hair Color', duration: 90, price: 8500 },
    ],
    totalPrice: 8500,
    totalDuration: 90,
    client: {
      id: 'client-2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      phone: '(555) 987-6543',
    },
    staff: {
      id: 'staff-2',
      firstName: 'Mike',
      lastName: 'Chen',
      displayName: 'Mike C.',
      color: '#4ECDC4',
    },
    isConflicted: false,
    canEdit: true,
    canCancel: true,
    canReschedule: true,
    lastUpdated: new Date(),
    updatedBy: undefined,
  },
];

describe('useAppointmentSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with default values', () => {
    const { result } = renderHook(() =>
      useAppointmentSearch({ appointments: mockAppointments })
    );

    expect(result.current.filters).toEqual({});
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it('initializes with provided initial filters', () => {
    const initialFilters: AppointmentFilters = { searchTerm: 'test' };

    const { result } = renderHook(() =>
      useAppointmentSearch({
        appointments: mockAppointments,
        initialFilters,
      })
    );

    expect(result.current.filters).toEqual(initialFilters);
  });

  it('updates filters correctly', () => {
    const { result } = renderHook(() =>
      useAppointmentSearch({ appointments: mockAppointments })
    );

    act(() => {
      result.current.updateFilters({ searchTerm: 'john' });
    });

    expect(result.current.filters).toEqual({ searchTerm: 'john' });
    expect(result.current.hasActiveFilters).toBe(true);
  });

  it('sets filters completely', () => {
    const { result } = renderHook(() =>
      useAppointmentSearch({
        appointments: mockAppointments,
        initialFilters: { searchTerm: 'initial' },
      })
    );

    const newFilters: AppointmentFilters = {
      searchTerm: 'new search',
      staffIds: ['staff-1'],
    };

    act(() => {
      result.current.setFilters(newFilters);
    });

    expect(result.current.filters).toEqual(newFilters);
  });

  it('clears filters', () => {
    const { result } = renderHook(() =>
      useAppointmentSearch({
        appointments: mockAppointments,
        initialFilters: { searchTerm: 'test', staffIds: ['staff-1'] },
      })
    );

    act(() => {
      result.current.clearFilters();
    });

    expect(result.current.filters).toEqual({});
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it('debounces filter updates', async () => {
    const { result } = renderHook(() =>
      useAppointmentSearch({
        appointments: mockAppointments,
        debounceMs: 100,
      })
    );

    // Update filters multiple times quickly
    act(() => {
      result.current.updateFilters({ searchTerm: 'j' });
    });

    act(() => {
      result.current.updateFilters({ searchTerm: 'jo' });
    });

    act(() => {
      result.current.updateFilters({ searchTerm: 'john' });
    });

    // Should still show the last update immediately in filters
    expect(result.current.filters.searchTerm).toBe('john');

    // Wait for debounce to complete
    await waitFor(
      () => {
        expect(result.current.searchResult.highlightedTerms).toContain('john');
      },
      { timeout: 200 }
    );
  });

  it('detects active filters correctly', () => {
    const { result } = renderHook(() =>
      useAppointmentSearch({ appointments: mockAppointments })
    );

    // No filters initially
    expect(result.current.hasActiveFilters).toBe(false);

    // Add search term
    act(() => {
      result.current.updateFilters({ searchTerm: 'john' });
    });
    expect(result.current.hasActiveFilters).toBe(true);

    // Add staff filter
    act(() => {
      result.current.updateFilters({ staffIds: ['staff-1'] });
    });
    expect(result.current.hasActiveFilters).toBe(true);

    // Clear all
    act(() => {
      result.current.clearFilters();
    });
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it('validates filters and shows errors', async () => {
    const mockValidateFilters = require('@/lib/search-utils').validateFilters;
    mockValidateFilters.mockReturnValue({
      isValid: false,
      errors: ['Invalid date range'],
      warnings: [],
    });

    const { result } = renderHook(() =>
      useAppointmentSearch({ appointments: mockAppointments })
    );

    act(() => {
      result.current.updateFilters({ searchTerm: 'test' });
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Invalid date range');
    });
  });

  it('handles search errors gracefully', async () => {
    const mockFilterAppointments =
      require('@/lib/search-utils').filterAppointments;
    mockFilterAppointments.mockImplementation(() => {
      throw new Error('Search failed');
    });

    const { result } = renderHook(() =>
      useAppointmentSearch({ appointments: mockAppointments })
    );

    act(() => {
      result.current.updateFilters({ searchTerm: 'test' });
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Search failed');
      expect(result.current.searchResult.appointments).toHaveLength(0);
    });
  });
});

describe('useSearchHistory', () => {
  it('initializes with empty history', () => {
    const { result } = renderHook(() => useSearchHistory());

    expect(result.current.searchHistory).toEqual([]);
  });

  it('adds filters to history', () => {
    const { result } = renderHook(() => useSearchHistory());

    const filters: AppointmentFilters = { searchTerm: 'john' };

    act(() => {
      result.current.addToHistory(filters);
    });

    expect(result.current.searchHistory).toHaveLength(1);
    expect(result.current.searchHistory[0]).toEqual(filters);
  });

  it('does not add empty filters to history', () => {
    const { result } = renderHook(() => useSearchHistory());

    act(() => {
      result.current.addToHistory({});
    });

    expect(result.current.searchHistory).toHaveLength(0);
  });

  it('removes duplicates from history', () => {
    const { result } = renderHook(() => useSearchHistory());

    const filters: AppointmentFilters = { searchTerm: 'john' };

    act(() => {
      result.current.addToHistory(filters);
    });

    act(() => {
      result.current.addToHistory({ searchTerm: 'jane' });
    });

    act(() => {
      result.current.addToHistory(filters); // Duplicate
    });

    expect(result.current.searchHistory).toHaveLength(2);
    expect(result.current.searchHistory[0]).toEqual(filters); // Should be first
  });

  it('limits history size', () => {
    const { result } = renderHook(() => useSearchHistory(3));

    // Add 5 items
    for (let i = 1; i <= 5; i++) {
      act(() => {
        result.current.addToHistory({ searchTerm: `search-${i}` });
      });
    }

    expect(result.current.searchHistory).toHaveLength(3);
    expect(result.current.searchHistory[0].searchTerm).toBe('search-5'); // Most recent first
    expect(result.current.searchHistory[2].searchTerm).toBe('search-3'); // Oldest kept
  });

  it('clears history', () => {
    const { result } = renderHook(() => useSearchHistory());

    act(() => {
      result.current.addToHistory({ searchTerm: 'john' });
    });

    expect(result.current.searchHistory).toHaveLength(1);

    act(() => {
      result.current.clearHistory();
    });

    expect(result.current.searchHistory).toHaveLength(0);
  });
});

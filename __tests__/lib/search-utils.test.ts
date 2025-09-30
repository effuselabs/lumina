import {
    createSearchResult,
    extractHighlightTerms,
    filterAppointments,
    highlightText,
    sortByRelevance,
    validateFilters
} from '@/lib/search-utils';
import { AppointmentFilters } from '@/types/appointment-filters';
import { AppointmentStatus, DashboardAppointment } from '@/types/dashboard-appointments';

// Mock appointment data
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
        notes: 'Regular client, prefers short hair',
        client: {
            id: 'client-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            phone: '(555) 123-4567'
        },
        staff: {
            id: 'staff-1',
            firstName: 'Sarah',
            lastName: 'Johnson',
            displayName: 'Sarah J.',
            color: '#FF6B6B'
        },
        isConflicted: false,
        canEdit: true,
        canCancel: true,
        canReschedule: true,
        lastUpdated: new Date(),
        updatedBy: undefined
    },
    {
        id: '2',
        businessId: 'business-1',
        clientId: 'client-2',
        staffId: 'staff-2',
        startTime: new Date('2024-01-16T14:00:00Z'),
        endTime: new Date('2024-01-16T15:30:00Z'),
        status: AppointmentStatus.SCHEDULED,
        services: [{ id: 'service-2', name: 'Hair Color', duration: 90, price: 8500 }],
        totalPrice: 8500,
        totalDuration: 90,
        notes: 'First time client',
        client: {
            id: 'client-2',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@example.com',
            phone: '(555) 987-6543'
        },
        staff: {
            id: 'staff-2',
            firstName: 'Mike',
            lastName: 'Chen',
            displayName: 'Mike C.',
            color: '#4ECDC4'
        },
        isConflicted: false,
        canEdit: true,
        canCancel: true,
        canReschedule: true,
        lastUpdated: new Date(),
        updatedBy: undefined
    },
    {
        id: '3',
        businessId: 'business-1',
        clientId: 'client-3',
        staffId: 'staff-1',
        startTime: new Date('2024-01-17T09:00:00Z'),
        endTime: new Date('2024-01-17T10:00:00Z'),
        status: AppointmentStatus.COMPLETED,
        services: [{ id: 'service-3', name: 'Manicure', duration: 60, price: 3500 }],
        totalPrice: 3500,
        totalDuration: 60,
        client: {
            id: 'client-3',
            firstName: 'Alice',
            lastName: 'Johnson',
            email: 'alice.johnson@example.com',
            phone: '(555) 456-7890'
        },
        staff: {
            id: 'staff-1',
            firstName: 'Sarah',
            lastName: 'Johnson',
            displayName: 'Sarah J.',
            color: '#FF6B6B'
        },
        isConflicted: false,
        canEdit: true,
        canCancel: true,
        canReschedule: true,
        lastUpdated: new Date(),
        updatedBy: undefined
    }
];

describe('filterAppointments', () => {
    it('returns all appointments when no filters are applied', () => {
        const result = filterAppointments(mockAppointments, {});
        expect(result).toHaveLength(3);
        expect(result).toEqual(mockAppointments);
    });

    it('filters by search term', () => {
        const filters: AppointmentFilters = { searchTerm: 'john' };
        const result = filterAppointments(mockAppointments, filters);

        expect(result).toHaveLength(2); // John Doe and Alice Johnson
        expect(result.map(a => a.id)).toEqual(['1', '3']);
    });

    it('filters by staff IDs', () => {
        const filters: AppointmentFilters = { staffIds: ['staff-1'] };
        const result = filterAppointments(mockAppointments, filters);

        expect(result).toHaveLength(2); // Appointments with staff-1
        expect(result.map(a => a.id)).toEqual(['1', '3']);
    });

    it('filters by service IDs', () => {
        const filters: AppointmentFilters = { serviceIds: ['service-1'] };
        const result = filterAppointments(mockAppointments, filters);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('1');
    });

    it('filters by status', () => {
        const filters: AppointmentFilters = {
            status: [AppointmentStatus.CONFIRMED, AppointmentStatus.SCHEDULED]
        };
        const result = filterAppointments(mockAppointments, filters);

        expect(result).toHaveLength(2);
        expect(result.map(a => a.id)).toEqual(['1', '2']);
    });

    it('filters by date range', () => {
        const filters: AppointmentFilters = {
            dateRange: {
                start: new Date('2024-01-15T00:00:00Z'),
                end: new Date('2024-01-15T23:59:59Z')
            }
        };
        const result = filterAppointments(mockAppointments, filters);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('1');
    });

    it('filters by client name', () => {
        const filters: AppointmentFilters = { clientName: 'jane' };
        const result = filterAppointments(mockAppointments, filters);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('2');
    });

    it('applies multiple filters', () => {
        const filters: AppointmentFilters = {
            staffIds: ['staff-1'],
            status: [AppointmentStatus.CONFIRMED]
        };
        const result = filterAppointments(mockAppointments, filters);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('1');
    });
});

describe('extractHighlightTerms', () => {
    it('extracts terms from search term', () => {
        const filters: AppointmentFilters = { searchTerm: 'john doe haircut' };
        const result = extractHighlightTerms(filters);

        expect(result).toEqual(['john', 'doe', 'haircut']);
    });

    it('extracts terms from client name', () => {
        const filters: AppointmentFilters = { clientName: 'jane smith' };
        const result = extractHighlightTerms(filters);

        expect(result).toEqual(['jane', 'smith']);
    });

    it('combines terms from multiple sources', () => {
        const filters: AppointmentFilters = {
            searchTerm: 'haircut',
            clientName: 'john doe'
        };
        const result = extractHighlightTerms(filters);

        expect(result).toEqual(['haircut', 'john', 'doe']);
    });

    it('returns empty array when no terms', () => {
        const filters: AppointmentFilters = {};
        const result = extractHighlightTerms(filters);

        expect(result).toEqual([]);
    });
});

describe('highlightText', () => {
    it('highlights matching terms', () => {
        const result = highlightText('John Doe loves haircuts', ['john', 'haircuts']);

        expect(result).toEqual([
            { text: 'John', isHighlighted: true },
            { text: ' Doe loves ', isHighlighted: false },
            { text: 'haircuts', isHighlighted: true }
        ]);
    });

    it('handles case insensitive matching', () => {
        const result = highlightText('JOHN doe', ['john', 'DOE']);

        expect(result).toEqual([
            { text: 'JOHN', isHighlighted: true },
            { text: ' ', isHighlighted: false },
            { text: 'doe', isHighlighted: true }
        ]);
    });

    it('returns original text when no search terms', () => {
        const result = highlightText('John Doe', []);

        expect(result).toEqual([
            { text: 'John Doe', isHighlighted: false }
        ]);
    });

    it('handles empty text', () => {
        const result = highlightText('', ['john']);

        expect(result).toEqual([
            { text: '', isHighlighted: false }
        ]);
    });
});

describe('sortByRelevance', () => {
    it('sorts by date when no search terms', () => {
        const result = sortByRelevance(mockAppointments, []);

        expect(result.map(a => a.id)).toEqual(['1', '2', '3']); // Chronological order
    });

    it('sorts by relevance score', () => {
        const result = sortByRelevance(mockAppointments, ['sarah']);

        // Appointments with Sarah as staff should come first
        expect(result[0].staff.firstName).toBe('Sarah');
        expect(result[1].staff.firstName).toBe('Sarah');
        expect(result[2].staff.firstName).toBe('Mike');
    });

    it('maintains date order for equal relevance', () => {
        const result = sortByRelevance(mockAppointments, ['client']);

        // All have equal relevance (notes mention "client"), so should be in date order
        expect(result.map(a => a.id)).toEqual(['1', '2', '3']);
    });
});

describe('validateFilters', () => {
    it('validates correct filters', () => {
        const filters: AppointmentFilters = {
            searchTerm: 'john',
            staffIds: ['staff-1'],
            dateRange: {
                start: new Date('2024-01-01'),
                end: new Date('2024-01-31')
            }
        };

        const result = validateFilters(filters);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('detects invalid date range', () => {
        const filters: AppointmentFilters = {
            dateRange: {
                start: new Date('2024-01-31'),
                end: new Date('2024-01-01') // End before start
            }
        };

        const result = validateFilters(filters);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Start date must be before end date');
    });

    it('warns about long date ranges', () => {
        const filters: AppointmentFilters = {
            dateRange: {
                start: new Date('2024-01-01'),
                end: new Date('2025-12-31') // More than a year
            }
        };

        const result = validateFilters(filters);

        expect(result.isValid).toBe(true);
        expect(result.warnings).toContain('Date range spans more than a year, results may be slow');
    });

    it('warns about short search terms', () => {
        const filters: AppointmentFilters = { searchTerm: 'a' };

        const result = validateFilters(filters);

        expect(result.isValid).toBe(true);
        expect(result.warnings).toContain('Search term is very short, consider using more specific terms');
    });

    it('detects search term too long', () => {
        const filters: AppointmentFilters = {
            searchTerm: 'a'.repeat(101) // 101 characters
        };

        const result = validateFilters(filters);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Search term is too long');
    });

    it('warns about too many selections', () => {
        const filters: AppointmentFilters = {
            staffIds: Array.from({ length: 25 }, (_, i) => `staff-${i}`),
            serviceIds: Array.from({ length: 55 }, (_, i) => `service-${i}`)
        };

        const result = validateFilters(filters);

        expect(result.isValid).toBe(true);
        expect(result.warnings).toContain('Many staff members selected, consider narrowing the selection');
        expect(result.warnings).toContain('Many services selected, consider narrowing the selection');
    });
});

describe('createSearchResult', () => {
    it('creates search result with correct structure', () => {
        const filters: AppointmentFilters = { searchTerm: 'john' };
        const result = createSearchResult(mockAppointments, filters, 10, true);

        expect(result).toEqual({
            appointments: mockAppointments,
            totalCount: 10,
            highlightedTerms: ['john'],
            hasMore: true
        });
    });

    it('extracts highlight terms correctly', () => {
        const filters: AppointmentFilters = {
            searchTerm: 'john doe',
            clientName: 'jane smith'
        };
        const result = createSearchResult([], filters, 0, false);

        expect(result.highlightedTerms).toEqual(['john', 'doe', 'jane', 'smith']);
    });
});
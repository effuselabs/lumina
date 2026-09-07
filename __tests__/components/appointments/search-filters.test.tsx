import { SearchFilters } from '@/components/appointments/search-filters';
import { AppointmentStatus } from '@/types/dashboard-appointments';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ onChange, ...props }: any) => (
    <input onChange={onChange} {...props} />
  ),
}));

jest.mock('@/components/ui/popover', () => ({
  Popover: ({ children, open }: any) => (open ? <div>{children}</div> : null),
  PopoverTrigger: ({ children }: any) => <div>{children}</div>,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span data-testid="badge">{children}</span>,
}));

// Mock child components
jest.mock('@/components/appointments/multi-select-filter', () => ({
  MultiSelectFilter: ({ onChange, placeholder, value }: any) => (
    <div data-testid="multi-select-filter">
      <span>{placeholder}</span>
      <button onClick={() => onChange(['test-id'])}>Select</button>
      <span>Selected: {value?.length || 0}</span>
    </div>
  ),
}));

jest.mock('@/components/appointments/date-range-picker', () => ({
  DateRangePicker: ({ onChange }: any) => (
    <button
      data-testid="date-range-picker"
      onClick={() => onChange({ start: new Date(), end: new Date() })}
    >
      Select Date Range
    </button>
  ),
}));

jest.mock('@/components/appointments/filter-presets', () => ({
  FilterPresets: ({ onApplyPreset }: any) => (
    <button
      data-testid="filter-presets"
      onClick={() =>
        onApplyPreset({
          id: 'today',
          name: 'Today',
          filters: { searchTerm: 'test' },
        })
      }
    >
      Apply Preset
    </button>
  ),
}));

const mockStaffMembers = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    displayName: 'John D.',
    color: '#FF0000',
    isActive: true,
  },
  {
    id: '2',
    firstName: 'Jane',
    lastName: 'Smith',
    displayName: 'Jane S.',
    color: '#00FF00',
    isActive: true,
  },
];

const mockServices = [
  {
    id: '1',
    name: 'Haircut',
    category: 'Hair',
    duration: 60,
    price: 5000,
    isActive: true,
  },
  {
    id: '2',
    name: 'Manicure',
    category: 'Nails',
    duration: 45,
    price: 3500,
    isActive: true,
  },
];

describe('SearchFilters', () => {
  const mockOnFilterChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders search input', () => {
    render(
      <SearchFilters
        onFilterChange={mockOnFilterChange}
        staffMembers={mockStaffMembers}
        services={mockServices}
      />
    );

    expect(
      screen.getByPlaceholderText('Search appointments, clients, services...')
    ).toBeInTheDocument();
  });

  it('renders filter button', () => {
    render(
      <SearchFilters
        onFilterChange={mockOnFilterChange}
        staffMembers={mockStaffMembers}
        services={mockServices}
      />
    );

    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('calls onFilterChange when search term changes', async () => {
    const user = userEvent.setup();

    render(
      <SearchFilters
        onFilterChange={mockOnFilterChange}
        staffMembers={mockStaffMembers}
        services={mockServices}
      />
    );

    const searchInput = screen.getByPlaceholderText(
      'Search appointments, clients, services...'
    );
    await user.type(searchInput, 'test search');

    // Wait for debounced update
    await waitFor(
      () => {
        expect(mockOnFilterChange).toHaveBeenCalledWith(
          expect.objectContaining({
            searchTerm: 'test search',
          })
        );
      },
      { timeout: 500 }
    );
  });

  it('shows active filter count badge', () => {
    render(
      <SearchFilters
        onFilterChange={mockOnFilterChange}
        staffMembers={mockStaffMembers}
        services={mockServices}
        initialFilters={{
          searchTerm: 'test',
          staffIds: ['1'],
          status: [AppointmentStatus.CONFIRMED],
        }}
      />
    );

    const badges = screen.getAllByTestId('badge');
    expect(badges).toHaveLength(4); // Filter count badge + 3 active filter badges
  });

  it('clears search term when X button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <SearchFilters
        onFilterChange={mockOnFilterChange}
        staffMembers={mockStaffMembers}
        services={mockServices}
        initialFilters={{ searchTerm: 'test' }}
      />
    );

    const searchInput = screen.getByDisplayValue('test');
    expect(searchInput).toBeInTheDocument();

    // Find and click the clear button (X)
    const clearButton = screen.getByRole('button', { name: '' }); // X button has no text
    await user.click(clearButton);

    expect(searchInput).toHaveValue('');
  });

  it('applies preset filters', async () => {
    const user = userEvent.setup();

    render(
      <SearchFilters
        onFilterChange={mockOnFilterChange}
        staffMembers={mockStaffMembers}
        services={mockServices}
      />
    );

    // Click filter button to open popover
    const filterButton = screen.getByText('Filters');
    await user.click(filterButton);

    // Click preset button
    const presetButton = screen.getByTestId('filter-presets');
    await user.click(presetButton);

    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        searchTerm: 'test',
      })
    );
  });

  it('handles multi-select filter changes', async () => {
    const user = userEvent.setup();

    render(
      <SearchFilters
        onFilterChange={mockOnFilterChange}
        staffMembers={mockStaffMembers}
        services={mockServices}
      />
    );

    // Click filter button to open popover
    const filterButton = screen.getByText('Filters');
    await user.click(filterButton);

    // Find and click multi-select filter
    const multiSelectButtons = screen.getAllByText('Select');
    await user.click(multiSelectButtons[0]); // First multi-select (staff)

    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        staffIds: ['test-id'],
      })
    );
  });

  it('handles date range changes', async () => {
    const user = userEvent.setup();

    render(
      <SearchFilters
        onFilterChange={mockOnFilterChange}
        staffMembers={mockStaffMembers}
        services={mockServices}
      />
    );

    // Click filter button to open popover
    const filterButton = screen.getByText('Filters');
    await user.click(filterButton);

    // Click date range picker
    const dateRangePicker = screen.getByTestId('date-range-picker');
    await user.click(dateRangePicker);

    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        dateRange: expect.objectContaining({
          start: expect.any(Date),
          end: expect.any(Date),
        }),
      })
    );
  });

  it('clears all filters when clear all is clicked', async () => {
    const user = userEvent.setup();

    render(
      <SearchFilters
        onFilterChange={mockOnFilterChange}
        staffMembers={mockStaffMembers}
        services={mockServices}
        initialFilters={{
          searchTerm: 'test',
          staffIds: ['1'],
        }}
      />
    );

    // Click filter button to open popover
    const filterButton = screen.getByText('Filters');
    await user.click(filterButton);

    // Click clear all button
    const clearAllButton = screen.getByText('Clear all');
    await user.click(clearAllButton);

    expect(mockOnFilterChange).toHaveBeenCalledWith({});
  });

  it('removes individual filter badges', async () => {
    const user = userEvent.setup();

    render(
      <SearchFilters
        onFilterChange={mockOnFilterChange}
        staffMembers={mockStaffMembers}
        services={mockServices}
        initialFilters={{
          staffIds: ['1'],
          serviceIds: ['1'],
        }}
      />
    );

    // Find and click X button on staff filter badge
    const staffBadge = screen.getByText('Staff (1)');
    expect(staffBadge).toBeInTheDocument();

    // The X button should be a child of the badge
    const xButtons = screen.getAllByRole('button');
    const staffXButton = xButtons.find(button =>
      button.parentElement?.textContent?.includes('Staff (1)')
    );

    if (staffXButton) {
      await user.click(staffXButton);

      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          staffIds: undefined,
          serviceIds: ['1'], // Should keep other filters
        })
      );
    }
  });

  it('handles initial filters correctly', () => {
    const initialFilters = {
      searchTerm: 'initial search',
      staffIds: ['1', '2'],
      status: [AppointmentStatus.CONFIRMED, AppointmentStatus.SCHEDULED],
    };

    render(
      <SearchFilters
        onFilterChange={mockOnFilterChange}
        staffMembers={mockStaffMembers}
        services={mockServices}
        initialFilters={initialFilters}
      />
    );

    // Check that search input has initial value
    expect(screen.getByDisplayValue('initial search')).toBeInTheDocument();

    // Check that filter count badge shows correct number
    const badges = screen.getAllByTestId('badge');
    expect(badges[0]).toHaveTextContent('3'); // 3 active filters
  });
});

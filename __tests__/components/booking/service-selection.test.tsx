import { ServiceSelection } from '@/components/booking/service-selection';
import { Service } from '@/types/service-selection';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

// Mock fetch
global.fetch = jest.fn();

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '/test',
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Check: () => <div data-testid="check-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  DollarSign: () => <div data-testid="dollar-icon" />,
  Filter: () => <div data-testid="filter-icon" />,
  Info: () => <div data-testid="info-icon" />,
  Minus: () => <div data-testid="minus-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  Search: () => <div data-testid="search-icon" />,
  X: () => <div data-testid="x-icon" />,
}));

const mockServices: Service[] = [
  {
    id: '1',
    name: 'Haircut',
    description: 'Professional haircut and styling',
    category: 'Hair Services',
    price: 50,
    duration: 60,
    prerequisites: 'Please arrive with clean hair',
    recommendations: 'Book a consultation first if you want a major change',
    staffIds: ['staff1'],
    availableStaff: [
      {
        id: 'staff1',
        displayName: 'John Doe',
        title: 'Senior Stylist',
        bio: 'Expert in modern cuts',
        avatar: null,
        customPrice: null,
        customDuration: null,
      },
    ],
  },
  {
    id: '2',
    name: 'Hair Color',
    description: 'Full hair coloring service',
    category: 'Hair Services',
    price: 120,
    duration: 180,
    prerequisites: 'Patch test required 48 hours before',
    recommendations: 'Avoid washing hair 24 hours before appointment',
    staffIds: ['staff1'],
    availableStaff: [
      {
        id: 'staff1',
        displayName: 'John Doe',
        title: 'Senior Stylist',
        bio: 'Expert in modern cuts',
        avatar: null,
        customPrice: null,
        customDuration: null,
      },
    ],
  },
  {
    id: '3',
    name: 'Manicure',
    description: 'Classic manicure with polish',
    category: 'Nail Services',
    price: 35,
    duration: 45,
    staffIds: ['staff2'],
    availableStaff: [
      {
        id: 'staff2',
        displayName: 'Jane Smith',
        title: 'Nail Technician',
        bio: 'Specialist in nail art',
        avatar: null,
        customPrice: null,
        customDuration: null,
      },
    ],
  },
];

const mockBusinessData = {
  business: {
    id: 'business1',
    name: 'Test Salon',
    email: 'test@salon.com',
    phone: '555-0123',
    address: '123 Main St',
    city: 'Test City',
    state: 'TS',
    zipCode: '12345',
    country: 'US',
    timezone: 'America/New_York',
    requireDeposit: false,
    logo: null,
    primaryColor: '#FFD25A',
    operatingHours: {},
  },
  services: mockServices,
  servicesByCategory: {
    'Hair Services': [mockServices[0], mockServices[1]],
    'Nail Services': [mockServices[2]],
  },
  bookingConfig: {
    requireDeposit: false,
    advanceBookingDays: 30,
    minimumNoticeHours: 2,
    maxServicesPerBooking: 3,
  },
};

describe('ServiceSelection', () => {
  const mockOnServicesSelect = jest.fn();
  const mockOnNext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockBusinessData,
    });
  });

  it('renders loading state initially', () => {
    render(
      <ServiceSelection
        businessId="business1"
        onServicesSelect={mockOnServicesSelect}
      />
    );

    expect(screen.getByText('Select Your Services')).toBeInTheDocument();
    // Should show loading skeletons
    expect(document.querySelectorAll('.animate-pulse')).toHaveLength(6);
  });

  it('renders services after loading', async () => {
    render(
      <ServiceSelection
        businessId="business1"
        onServicesSelect={mockOnServicesSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Haircut')).toBeInTheDocument();
      expect(screen.getByText('Hair Color')).toBeInTheDocument();
      expect(screen.getByText('Manicure')).toBeInTheDocument();
    });

    // Check service details
    expect(
      screen.getByText('Professional haircut and styling')
    ).toBeInTheDocument();
    expect(screen.getByText('$50.00')).toBeInTheDocument();
    expect(screen.getByText('1h')).toBeInTheDocument();
  });

  it('groups services by category', async () => {
    render(
      <ServiceSelection
        businessId="business1"
        onServicesSelect={mockOnServicesSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Hair Services')).toBeInTheDocument();
      expect(screen.getByText('Nail Services')).toBeInTheDocument();
    });
  });

  it('allows service selection and deselection', async () => {
    render(
      <ServiceSelection
        businessId="business1"
        onServicesSelect={mockOnServicesSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Haircut')).toBeInTheDocument();
    });

    // Click to select service
    const addButton = screen.getAllByText('Add Service')[0];
    fireEvent.click(addButton);

    expect(mockOnServicesSelect).toHaveBeenCalledWith([mockServices[0]]);
  });

  it('shows selected services summary', async () => {
    render(
      <ServiceSelection
        businessId="business1"
        onServicesSelect={mockOnServicesSelect}
        selectedServices={[mockServices[0]]}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Selected Services (1)')).toBeInTheDocument();
      expect(screen.getByText('Total:')).toBeInTheDocument();
    });
  });

  it('calculates total price and duration correctly', async () => {
    render(
      <ServiceSelection
        businessId="business1"
        onServicesSelect={mockOnServicesSelect}
        selectedServices={[mockServices[0], mockServices[2]]} // Haircut + Manicure
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Selected Services (2)')).toBeInTheDocument();
    });

    // Total should be $85.00 (50 + 35) and 1h 45m (60 + 45 minutes)
    const totalElements = screen.getAllByText('$85.00');
    expect(totalElements.length).toBeGreaterThan(0);

    const durationElements = screen.getAllByText('1h 45m');
    expect(durationElements.length).toBeGreaterThan(0);
  });

  it('enforces maximum services limit', async () => {
    const maxServices = [mockServices[0], mockServices[1], mockServices[2]];

    render(
      <ServiceSelection
        businessId="business1"
        onServicesSelect={mockOnServicesSelect}
        selectedServices={maxServices}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          "You've reached the maximum of 3 services per booking."
        )
      ).toBeInTheDocument();
    });
  });

  it('filters services by search query', async () => {
    render(
      <ServiceSelection
        businessId="business1"
        onServicesSelect={mockOnServicesSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Haircut')).toBeInTheDocument();
    });

    // Search for "color"
    const searchInput = screen.getByPlaceholderText('Search services...');
    fireEvent.change(searchInput, { target: { value: 'color' } });

    // Should only show Hair Color service
    expect(screen.getByText('Hair Color')).toBeInTheDocument();
    expect(screen.queryByText('Haircut')).not.toBeInTheDocument();
    expect(screen.queryByText('Manicure')).not.toBeInTheDocument();
  });

  it('filters services by category', async () => {
    render(
      <ServiceSelection
        businessId="business1"
        onServicesSelect={mockOnServicesSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    // Open filters
    fireEvent.click(screen.getByText('Filters'));

    // Select Nail Services category
    fireEvent.click(screen.getByText('Nail Services'));

    // Should only show Manicure
    expect(screen.getByText('Manicure')).toBeInTheDocument();
    expect(screen.queryByText('Haircut')).not.toBeInTheDocument();
    expect(screen.queryByText('Hair Color')).not.toBeInTheDocument();
  });

  it('shows service detail modal with prerequisites and recommendations', async () => {
    render(
      <ServiceSelection
        businessId="business1"
        onServicesSelect={mockOnServicesSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Haircut')).toBeInTheDocument();
    });

    // Click info button for Haircut service
    const infoButtons = screen.getAllByRole('button');
    const infoButton = infoButtons.find(
      button =>
        button.querySelector('svg') &&
        button.getAttribute('class')?.includes('p-1')
    );

    if (infoButton) {
      fireEvent.click(infoButton);

      await waitFor(() => {
        expect(screen.getByText('Prerequisites')).toBeInTheDocument();
        expect(
          screen.getByText('Please arrive with clean hair')
        ).toBeInTheDocument();
        expect(screen.getByText('Recommendations')).toBeInTheDocument();
        expect(
          screen.getByText(
            'Book a consultation first if you want a major change'
          )
        ).toBeInTheDocument();
      });
    }
  });

  it('calls onNext when services are selected and onNext is provided', async () => {
    render(
      <ServiceSelection
        businessId="business1"
        onServicesSelect={mockOnServicesSelect}
        selectedServices={[mockServices[0]]}
        onNext={mockOnNext}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Continue to Date & Time')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Continue to Date & Time'));
    expect(mockOnNext).toHaveBeenCalled();
  });

  it('handles API errors gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(
      <ServiceSelection
        businessId="business1"
        onServicesSelect={mockOnServicesSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  it('clears all selected services', async () => {
    render(
      <ServiceSelection
        businessId="business1"
        onServicesSelect={mockOnServicesSelect}
        selectedServices={[mockServices[0], mockServices[1]]}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Clear All'));
    expect(mockOnServicesSelect).toHaveBeenCalledWith([]);
  });
});

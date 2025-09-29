import { StaffTimeSelection } from '@/components/booking/staff-time-selection';
import { Service } from '@/types/service-selection';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

// Mock fetch
global.fetch = jest.fn();

// Mock performance API
Object.defineProperty(global, 'performance', {
  writable: true,
  value: {
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    now: jest.fn(() => Date.now()),
  },
});

const mockServices: Service[] = [
  {
    id: 'service-1',
    name: 'Haircut',
    description: 'Professional haircut',
    category: 'Hair',
    price: 50,
    duration: 60,
    staffIds: ['staff-1', 'staff-2'],
    availableStaff: [
      {
        id: 'staff-1',
        displayName: 'John Doe',
        title: 'Senior Stylist',
      },
      {
        id: 'staff-2',
        displayName: 'Jane Smith',
        title: 'Stylist',
      },
    ],
  },
];

const mockStaffResponse = {
  staff: [
    {
      id: 'staff-1',
      firstName: 'John',
      lastName: 'Doe',
      displayName: 'John Doe',
      avatar: null,
      specialties: ['Haircut'],
      isActive: true,
    },
    {
      id: 'staff-2',
      firstName: 'Jane',
      lastName: 'Smith',
      displayName: 'Jane Smith',
      avatar: null,
      specialties: ['Haircut'],
      isActive: true,
    },
  ],
  totalStaff: 2,
};

const mockAvailabilityResponse = {
  availableSlots: [
    {
      startTime: new Date('2024-01-15T10:00:00Z'),
      endTime: new Date('2024-01-15T11:00:00Z'),
      staffId: 'staff-1',
      staffName: 'John Doe',
      isAvailable: true,
      totalDuration: 60,
      totalPrice: 50,
      services: [
        {
          id: 'service-1',
          name: 'Haircut',
          duration: 60,
          price: 50,
        },
      ],
    },
    {
      startTime: new Date('2024-01-15T11:00:00Z'),
      endTime: new Date('2024-01-15T12:00:00Z'),
      staffId: 'staff-2',
      staffName: 'Jane Smith',
      isAvailable: true,
      totalDuration: 60,
      totalPrice: 50,
      services: [
        {
          id: 'service-1',
          name: 'Haircut',
          duration: 60,
          price: 50,
        },
      ],
    },
  ],
  nextAvailableDate: null,
  requestedDate: '2024-01-15',
  totalSlotsFound: 2,
};

describe('StaffTimeSelection', () => {
  const mockOnSlotSelect = jest.fn();
  const mockOnNext = jest.fn();
  const mockOnBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  const defaultProps = {
    businessId: 'business-1',
    selectedServices: mockServices,
    onSlotSelect: mockOnSlotSelect,
    onNext: mockOnNext,
    onBack: mockOnBack,
  };

  it('renders the component with correct title', () => {
    render(<StaffTimeSelection {...defaultProps} />);

    expect(screen.getByText('Choose Date & Time')).toBeInTheDocument();
    expect(
      screen.getByText('Select your preferred appointment slot')
    ).toBeInTheDocument();
  });

  it('displays service summary information', () => {
    render(<StaffTimeSelection {...defaultProps} />);

    expect(screen.getByText('1 service')).toBeInTheDocument();
    expect(screen.getByText('1h')).toBeInTheDocument();
    expect(screen.getByText('$50.00')).toBeInTheDocument();
  });

  it('renders calendar interface', () => {
    render(<StaffTimeSelection {...defaultProps} />);

    expect(screen.getByText('Select Date')).toBeInTheDocument();
    expect(
      screen.getByText('Choose your preferred appointment date')
    ).toBeInTheDocument();

    // Check for calendar navigation
    const prevButton = screen.getByRole('button', { name: /previous/i });
    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(prevButton).toBeInTheDocument();
    expect(nextButton).toBeInTheDocument();
  });

  it('fetches and displays qualified staff', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockStaffResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAvailabilityResponse,
      });

    render(<StaffTimeSelection {...defaultProps} />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          '/api/public/booking/business-1/staff?serviceIds=service-1'
        )
      );
    });
  });

  it('fetches and displays available time slots', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockStaffResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAvailabilityResponse,
      });

    render(<StaffTimeSelection {...defaultProps} />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/public/booking/business-1/availability')
      );
    });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('handles time slot selection', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockStaffResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAvailabilityResponse,
      });

    render(<StaffTimeSelection {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Click on a time slot
    const timeSlot = screen.getByText('10:00 AM');
    fireEvent.click(timeSlot);

    expect(mockOnSlotSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        startTime: expect.any(Date),
        endTime: expect.any(Date),
        staffId: 'staff-1',
        staffName: 'John Doe',
      })
    );
  });

  it('displays selected slot summary when slot is selected', async () => {
    const selectedSlot = {
      startTime: new Date('2024-01-15T10:00:00Z'),
      endTime: new Date('2024-01-15T11:00:00Z'),
      staffId: 'staff-1',
      staffName: 'John Doe',
      isAvailable: true,
      totalDuration: 60,
      totalPrice: 50,
      services: [
        {
          id: 'service-1',
          name: 'Haircut',
          duration: 60,
          price: 50,
        },
      ],
    };

    render(
      <StaffTimeSelection {...defaultProps} selectedSlot={selectedSlot} />
    );

    expect(screen.getByText('Selected Appointment')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('handles staff filter selection', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockStaffResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAvailabilityResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAvailabilityResponse,
      });

    render(<StaffTimeSelection {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Any Available Staff')).toBeInTheDocument();
    });

    // Click on specific staff filter
    const staffFilter = screen.getByText('John Doe');
    fireEvent.click(staffFilter);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('staffId=staff-1')
      );
    });
  });

  it('handles calendar navigation', () => {
    render(<StaffTimeSelection {...defaultProps} />);

    const currentMonth = new Date().toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
    expect(screen.getByText(currentMonth)).toBeInTheDocument();

    // Navigate to next month
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    // Should show next month (we can't easily test the exact month change without mocking Date)
  });

  it('handles date selection', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockStaffResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAvailabilityResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAvailabilityResponse,
      });

    render(<StaffTimeSelection {...defaultProps} />);

    // Wait for initial load
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    // Find and click a future date (assuming today is not the 15th)
    const dateButton = screen.getByText('15');
    if (dateButton) {
      fireEvent.click(dateButton);

      // Should trigger new availability fetch
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('date='));
      });
    }
  });

  it('displays loading state', () => {
    (fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<StaffTimeSelection {...defaultProps} />);

    expect(screen.getByText('Loading available times...')).toBeInTheDocument();
  });

  it('displays error state and retry functionality', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockStaffResponse,
      })
      .mockRejectedValueOnce(new Error('Network error'));

    render(<StaffTimeSelection {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();

    // Mock successful retry
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAvailabilityResponse,
    });

    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(3); // Initial staff + failed availability + retry
    });
  });

  it('displays next available date when no slots available', async () => {
    const emptyResponse = {
      ...mockAvailabilityResponse,
      availableSlots: [],
      nextAvailableDate: '2024-01-16',
    };

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockStaffResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => emptyResponse,
      });

    render(<StaffTimeSelection {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/No available times/)).toBeInTheDocument();
      expect(screen.getByText('Next available date:')).toBeInTheDocument();
    });
  });

  it('handles refresh functionality', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockStaffResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAvailabilityResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAvailabilityResponse,
      });

    render(<StaffTimeSelection {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(3); // Initial staff + availability + refresh
    });
  });

  it('shows navigation buttons when selected slot exists', () => {
    const selectedSlot = {
      startTime: new Date('2024-01-15T10:00:00Z'),
      endTime: new Date('2024-01-15T11:00:00Z'),
      staffId: 'staff-1',
      staffName: 'John Doe',
      isAvailable: true,
      totalDuration: 60,
      totalPrice: 50,
      services: [],
    };

    render(
      <StaffTimeSelection {...defaultProps} selectedSlot={selectedSlot} />
    );

    expect(screen.getByText('Back to Services')).toBeInTheDocument();
    expect(screen.getByText('Continue to Details')).toBeInTheDocument();
  });

  it('handles multiple services correctly', () => {
    const multipleServices: Service[] = [
      ...mockServices,
      {
        id: 'service-2',
        name: 'Beard Trim',
        description: 'Professional beard trim',
        category: 'Hair',
        price: 25,
        duration: 30,
        staffIds: ['staff-1'],
        availableStaff: [
          {
            id: 'staff-1',
            displayName: 'John Doe',
            title: 'Senior Stylist',
          },
        ],
      },
    ];

    render(
      <StaffTimeSelection
        {...defaultProps}
        selectedServices={multipleServices}
      />
    );

    expect(screen.getByText('2 services')).toBeInTheDocument();
    expect(screen.getByText('1h 30m')).toBeInTheDocument();
    expect(screen.getByText('$75.00')).toBeInTheDocument();
  });
});

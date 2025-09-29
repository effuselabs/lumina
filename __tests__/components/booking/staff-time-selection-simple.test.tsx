import { StaffTimeSelection } from '@/components/booking/staff-time-selection';
import { Service } from '@/types/service-selection';
import { render, screen } from '@testing-library/react';

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
  ],
  totalStaff: 1,
};

const mockAvailabilityResponse = {
  availableSlots: [],
  nextAvailableDate: null,
  requestedDate: '2024-01-15',
  totalSlotsFound: 0,
};

describe('StaffTimeSelection', () => {
  const mockOnSlotSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  const defaultProps = {
    businessId: 'business-1',
    selectedServices: mockServices,
    onSlotSelect: mockOnSlotSelect,
  };

  it('renders the component with correct title', () => {
    // Mock the fetch calls to prevent network requests
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

    expect(screen.getByText('Choose Date & Time')).toBeInTheDocument();
    expect(
      screen.getByText('Select your preferred appointment slot')
    ).toBeInTheDocument();
  });

  it('displays service summary information', () => {
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

    expect(screen.getByText('1 service')).toBeInTheDocument();
    expect(screen.getByText('1h')).toBeInTheDocument();
    expect(screen.getByText('$50.00')).toBeInTheDocument();
  });
});

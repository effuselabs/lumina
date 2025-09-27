import { ServiceSelection } from '@/components/booking/service-selection';
import { render, screen } from '@testing-library/react';

// Mock fetch
global.fetch = jest.fn();

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

describe('ServiceSelection Basic', () => {
  const mockOnServicesSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        business: {
          id: 'business1',
          name: 'Test Salon',
          country: 'US',
          timezone: 'America/New_York',
          requireDeposit: false,
        },
        services: [],
        servicesByCategory: {},
        bookingConfig: {
          requireDeposit: false,
          advanceBookingDays: 30,
          minimumNoticeHours: 2,
          maxServicesPerBooking: 3,
        },
      }),
    });
  });

  it('renders the component', () => {
    render(
      <ServiceSelection
        businessId="business1"
        onServicesSelect={mockOnServicesSelect}
      />
    );

    expect(screen.getByText('Select Your Services')).toBeInTheDocument();
  });
});

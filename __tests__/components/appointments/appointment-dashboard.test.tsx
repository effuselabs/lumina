import AppointmentDashboard from '@/components/appointments/appointment-dashboard';
import {
  mockAppointments,
  mockStaffMembers,
} from '@/test-utils/appointment-mocks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';

// Mock the hooks
jest.mock('@/hooks/use-dashboard-data', () => ({
  useDashboardData: jest.fn(() => ({
    appointments: mockAppointments,
    staffMembers: mockStaffMembers,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  })),
}));

jest.mock('@/hooks/use-real-time-appointments', () => ({
  useRealTimeAppointments: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    isConnected: true,
  })),
}));

const mockSession = {
  user: {
    id: 'user-1',
    businessId: 'business-1',
    role: 'manager',
  },
};

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <SessionProvider session={mockSession}>{component}</SessionProvider>
    </QueryClientProvider>
  );
};

describe('AppointmentDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Calendar View Switching', () => {
    it('should render with default day view', () => {
      renderWithProviders(<AppointmentDashboard businessId="business-1" />);

      expect(screen.getByTestId('calendar-view')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /day/i })).toHaveAttribute(
        'aria-pressed',
        'true'
      );
    });

    it('should switch between day, week, and month views', async () => {
      renderWithProviders(<AppointmentDashboard businessId="business-1" />);

      // Switch to week view
      fireEvent.click(screen.getByRole('button', { name: /week/i }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /week/i })).toHaveAttribute(
          'aria-pressed',
          'true'
        );
      });

      // Switch to month view
      fireEvent.click(screen.getByRole('button', { name: /month/i }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /month/i })).toHaveAttribute(
          'aria-pressed',
          'true'
        );
      });
    });

    it('should maintain selected date when switching views', async () => {
      renderWithProviders(
        <AppointmentDashboard
          businessId="business-1"
          initialDate={new Date('2024-01-15')}
        />
      );

      const dateDisplay = screen.getByTestId('current-date');
      const initialDate = dateDisplay.textContent;

      // Switch views
      fireEvent.click(screen.getByRole('button', { name: /week/i }));
      await waitFor(() => {
        expect(dateDisplay.textContent).toBe(initialDate);
      });
    });
  });

  describe('Appointment Management', () => {
    it('should open appointment modal on appointment click', async () => {
      renderWithProviders(<AppointmentDashboard businessId="business-1" />);

      const appointmentBlock = screen.getByTestId('appointment-block-1');
      fireEvent.click(appointmentBlock);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Appointment Details')).toBeInTheDocument();
      });
    });

    it('should handle appointment updates correctly', async () => {
      const mockRefetch = jest.fn();
      require('@/hooks/use-dashboard-data').useDashboardData.mockReturnValue({
        appointments: mockAppointments,
        staffMembers: mockStaffMembers,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      renderWithProviders(<AppointmentDashboard businessId="business-1" />);

      // Open appointment modal
      fireEvent.click(screen.getByTestId('appointment-block-1'));

      // Edit appointment
      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /edit/i }));
      });

      // Save changes
      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should connect to real-time updates on mount', () => {
      const mockConnect = jest.fn();
      require('@/hooks/use-real-time-appointments').useRealTimeAppointments.mockReturnValue(
        {
          connect: mockConnect,
          disconnect: jest.fn(),
          isConnected: false,
        }
      );

      renderWithProviders(<AppointmentDashboard businessId="business-1" />);

      expect(mockConnect).toHaveBeenCalled();
    });

    it('should display connection status', () => {
      require('@/hooks/use-real-time-appointments').useRealTimeAppointments.mockReturnValue(
        {
          connect: jest.fn(),
          disconnect: jest.fn(),
          isConnected: true,
        }
      );

      renderWithProviders(<AppointmentDashboard businessId="business-1" />);

      expect(screen.getByTestId('connection-status')).toHaveTextContent(
        'Connected'
      );
    });
  });

  describe('Search and Filter', () => {
    it('should filter appointments by search term', async () => {
      renderWithProviders(<AppointmentDashboard businessId="business-1" />);

      const searchInput = screen.getByPlaceholderText(/search appointments/i);
      fireEvent.change(searchInput, { target: { value: 'John Doe' } });

      await waitFor(() => {
        expect(screen.getByTestId('appointment-block-1')).toBeInTheDocument();
        expect(
          screen.queryByTestId('appointment-block-2')
        ).not.toBeInTheDocument();
      });
    });

    it('should filter appointments by staff member', async () => {
      renderWithProviders(<AppointmentDashboard businessId="business-1" />);

      const staffFilter = screen.getByTestId('staff-filter');
      fireEvent.change(staffFilter, { target: { value: 'staff-1' } });

      await waitFor(() => {
        const visibleAppointments = screen.getAllByTestId(/appointment-block/);
        expect(visibleAppointments).toHaveLength(1);
      });
    });
  });

  describe('Accessibility', () => {
    it('should support keyboard navigation', () => {
      renderWithProviders(<AppointmentDashboard businessId="business-1" />);

      const firstAppointment = screen.getByTestId('appointment-block-1');
      firstAppointment.focus();

      expect(document.activeElement).toBe(firstAppointment);

      // Test arrow key navigation
      fireEvent.keyDown(firstAppointment, { key: 'ArrowRight' });
      expect(document.activeElement).toBe(
        screen.getByTestId('appointment-block-2')
      );
    });

    it('should have proper ARIA labels', () => {
      renderWithProviders(<AppointmentDashboard businessId="business-1" />);

      expect(screen.getByRole('main')).toHaveAttribute(
        'aria-label',
        'Appointment Dashboard'
      );
      expect(screen.getByRole('tablist')).toHaveAttribute(
        'aria-label',
        'Calendar Views'
      );
      expect(screen.getByRole('grid')).toHaveAttribute(
        'aria-label',
        'Calendar Grid'
      );
    });
  });

  describe('Error Handling', () => {
    it('should display error message when data loading fails', () => {
      require('@/hooks/use-dashboard-data').useDashboardData.mockReturnValue({
        appointments: [],
        staffMembers: [],
        isLoading: false,
        error: new Error('Failed to load appointments'),
        refetch: jest.fn(),
      });

      renderWithProviders(<AppointmentDashboard businessId="business-1" />);

      expect(
        screen.getByText(/failed to load appointments/i)
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /retry/i })
      ).toBeInTheDocument();
    });

    it('should show loading state', () => {
      require('@/hooks/use-dashboard-data').useDashboardData.mockReturnValue({
        appointments: [],
        staffMembers: [],
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      renderWithProviders(<AppointmentDashboard businessId="business-1" />);

      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
    });
  });
});

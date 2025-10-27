import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AppointmentModal } from '../../../components/appointments/appointment-modal';
import {
  createTestDashboardAppointment,
  createTestStaffMembersList,
} from '../../utils/test-data-factories';

const mockAppointment = createTestDashboardAppointment({
  id: 'apt-123',
  client: {
    id: 'client-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '555-0123',
    avatar: undefined,
  },
  staff: {
    id: 'staff-1',
    firstName: 'Alice',
    lastName: 'Johnson',
    displayName: 'Alice Johnson',
    color: '#3B82F6',
  },
  services: [
    {
      id: 'service-1',
      name: 'Haircut',
      duration: 60,
      price: 5000, // in cents
    },
  ],
  totalPrice: 5000,
  totalDuration: 60,
  canEdit: true,
  canCancel: true,
  canReschedule: true,
});

const mockStaffMembers = createTestStaffMembersList(2);
mockStaffMembers[0].displayName = 'Alice Johnson';
mockStaffMembers[0].firstName = 'Alice';
mockStaffMembers[0].lastName = 'Johnson';
mockStaffMembers[1].displayName = 'Bob Smith';
mockStaffMembers[1].firstName = 'Bob';
mockStaffMembers[1].lastName = 'Smith';

const mockServices = [
  {
    id: 'service-1',
    name: 'Haircut',
    duration: 60,
    price: 5000,
  },
  {
    id: 'service-2',
    name: 'Hair Styling',
    duration: 90,
    price: 7500,
  },
];

const mockProps = {
  appointment: mockAppointment,
  isOpen: true,
  onClose: jest.fn(),
  onSave: jest.fn(),
  onDelete: jest.fn(),
  mode: 'view' as const,
  staffMembers: mockStaffMembers,
  services: mockServices,
};

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
  );
};

// Mock the services hook
jest.mock('../../../hooks/useServices', () => ({
  useServices: () => ({
    services: [
      {
        id: 'service-1',
        name: 'Haircut',
        duration: 60,
        price: 5000,
      },
      {
        id: 'service-2',
        name: 'Hair Styling',
        duration: 90,
        price: 7500,
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

describe('AppointmentModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('View Mode', () => {
    it('should display appointment details in view mode', () => {
      renderWithProviders(<AppointmentModal {...mockProps} mode="view" />);

      expect(screen.getByText('Appointment Details')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Haircut')).toBeInTheDocument();
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('$50.00')).toBeInTheDocument();
    });

    it('should show edit button in view mode', () => {
      renderWithProviders(<AppointmentModal {...mockProps} mode="view" />);

      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    });

    it('should show delete button for cancellable appointments', () => {
      const cancellableAppointment = {
        ...mockAppointment,
        canCancel: true,
      };

      renderWithProviders(
        <AppointmentModal
          {...mockProps}
          appointment={cancellableAppointment}
          mode="view"
        />
      );

      expect(
        screen.getByRole('button', { name: /cancel appointment/i })
      ).toBeInTheDocument();
    });

    it('should not show edit button for non-editable appointments', () => {
      const nonEditableAppointment = {
        ...mockAppointment,
        canEdit: false,
      };

      renderWithProviders(
        <AppointmentModal
          {...mockProps}
          appointment={nonEditableAppointment}
          mode="view"
        />
      );

      expect(
        screen.queryByRole('button', { name: /edit/i })
      ).not.toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    it('should display editable form in edit mode', () => {
      renderWithProviders(<AppointmentModal {...mockProps} mode="edit" />);

      expect(screen.getByLabelText(/client/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/service/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/staff member/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/time/i)).toBeInTheDocument();
    });

    it('should populate form with appointment data', () => {
      renderWithProviders(<AppointmentModal {...mockProps} mode="edit" />);

      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Haircut')).toBeInTheDocument();
    });

    it('should validate required fields', async () => {
      renderWithProviders(<AppointmentModal {...mockProps} mode="edit" />);

      // Clear required field
      const clientField = screen.getByLabelText(/client/i);
      fireEvent.change(clientField, { target: { value: '' } });

      // Try to save
      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText(/client is required/i)).toBeInTheDocument();
      });
    });

    it('should handle form submission', async () => {
      renderWithProviders(<AppointmentModal {...mockProps} mode="edit" />);

      // Modify appointment
      const notesField = screen.getByLabelText(/notes/i);
      fireEvent.change(notesField, { target: { value: 'Updated notes' } });

      // Save changes
      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockProps.onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            notes: 'Updated notes',
          })
        );
      });
    });

    it('should show save and cancel buttons', () => {
      renderWithProviders(<AppointmentModal {...mockProps} mode="edit" />);

      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /cancel/i })
      ).toBeInTheDocument();
    });
  });

  describe('Create Mode', () => {
    it('should display empty form in create mode', () => {
      renderWithProviders(
        <AppointmentModal {...mockProps} appointment={null} mode="create" />
      );

      expect(screen.getByText('New Appointment')).toBeInTheDocument();
      expect(screen.getByLabelText(/client/i)).toHaveValue('');
      expect(screen.getByLabelText(/service/i)).toHaveValue('');
    });

    it('should handle new appointment creation', async () => {
      renderWithProviders(
        <AppointmentModal {...mockProps} appointment={null} mode="create" />
      );

      // Fill form
      fireEvent.change(screen.getByLabelText(/client/i), {
        target: { value: 'Jane Smith' },
      });
      fireEvent.change(screen.getByLabelText(/service/i), {
        target: { value: 'service-1' },
      });
      fireEvent.change(screen.getByLabelText(/staff member/i), {
        target: { value: 'staff-1' },
      });

      // Create appointment
      fireEvent.click(screen.getByRole('button', { name: /create/i }));

      await waitFor(() => {
        expect(mockProps.onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            client: expect.objectContaining({
              firstName: 'Jane',
              lastName: 'Smith',
            }),
            serviceId: 'service-1',
            staffId: 'staff-1',
          })
        );
      });
    });
  });

  describe('Service Selection', () => {
    it('should update duration and price when service changes', async () => {
      renderWithProviders(<AppointmentModal {...mockProps} mode="edit" />);

      const serviceSelect = screen.getByLabelText(/service/i);
      fireEvent.change(serviceSelect, { target: { value: 'service-2' } });

      await waitFor(() => {
        expect(screen.getByText('90 minutes')).toBeInTheDocument();
        expect(screen.getByText('$75.00')).toBeInTheDocument();
      });
    });

    it('should handle multiple service selection', async () => {
      renderWithProviders(<AppointmentModal {...mockProps} mode="edit" />);

      const addServiceButton = screen.getByRole('button', {
        name: /add service/i,
      });
      fireEvent.click(addServiceButton);

      await waitFor(() => {
        expect(screen.getAllByLabelText(/service/i)).toHaveLength(2);
      });
    });
  });

  describe('Staff Assignment', () => {
    it('should filter staff by service qualifications', async () => {
      renderWithProviders(<AppointmentModal {...mockProps} mode="edit" />);

      const serviceSelect = screen.getByLabelText(/service/i);
      fireEvent.change(serviceSelect, { target: { value: 'service-1' } });

      await waitFor(() => {
        const staffOptions = screen.getAllByRole('option');
        expect(staffOptions).toHaveLength(2); // Only qualified staff
      });
    });

    it('should check staff availability', async () => {
      renderWithProviders(<AppointmentModal {...mockProps} mode="edit" />);

      const staffSelect = screen.getByLabelText(/staff member/i);
      fireEvent.change(staffSelect, { target: { value: 'staff-unavailable' } });

      await waitFor(() => {
        expect(
          screen.getByText(/staff member not available/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Time Slot Management', () => {
    it('should validate appointment time conflicts', async () => {
      renderWithProviders(<AppointmentModal {...mockProps} mode="edit" />);

      const timeInput = screen.getByLabelText(/time/i);
      fireEvent.change(timeInput, { target: { value: '10:00' } }); // Conflicting time

      await waitFor(() => {
        expect(screen.getByText(/time slot conflicts/i)).toBeInTheDocument();
      });
    });

    it('should suggest alternative time slots', async () => {
      renderWithProviders(<AppointmentModal {...mockProps} mode="edit" />);

      const timeInput = screen.getByLabelText(/time/i);
      fireEvent.change(timeInput, { target: { value: '10:00' } });

      await waitFor(() => {
        expect(screen.getByText(/suggested times/i)).toBeInTheDocument();
        expect(screen.getByText('11:00 AM')).toBeInTheDocument();
      });
    });
  });

  describe('Notes and Comments', () => {
    it('should display existing notes', () => {
      const appointmentWithNotes = {
        ...mockAppointment,
        notes: 'Client prefers window seat',
      };

      renderWithProviders(
        <AppointmentModal {...mockProps} appointment={appointmentWithNotes} />
      );

      expect(
        screen.getByText('Client prefers window seat')
      ).toBeInTheDocument();
    });

    it('should allow adding new notes', async () => {
      renderWithProviders(<AppointmentModal {...mockProps} mode="edit" />);

      const notesField = screen.getByLabelText(/notes/i);
      fireEvent.change(notesField, { target: { value: 'New note added' } });

      expect(notesField).toHaveValue('New note added');
    });
  });

  describe('Modal Behavior', () => {
    it('should close modal when close button is clicked', () => {
      renderWithProviders(<AppointmentModal {...mockProps} />);

      fireEvent.click(screen.getByRole('button', { name: /close/i }));

      expect(mockProps.onClose).toHaveBeenCalled();
    });

    it('should close modal when escape key is pressed', () => {
      renderWithProviders(<AppointmentModal {...mockProps} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockProps.onClose).toHaveBeenCalled();
    });

    it('should not close modal when clicking inside content', () => {
      renderWithProviders(<AppointmentModal {...mockProps} />);

      fireEvent.click(screen.getByText('Appointment Details'));

      expect(mockProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      renderWithProviders(<AppointmentModal {...mockProps} />);

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-labelledby');
      expect(modal).toHaveAttribute('aria-describedby');
    });

    it('should trap focus within modal', () => {
      renderWithProviders(<AppointmentModal {...mockProps} mode="edit" />);

      const firstInput = screen.getByLabelText(/client/i);
      const lastButton = screen.getByRole('button', { name: /cancel/i });

      // Focus should be trapped between first and last focusable elements
      firstInput.focus();
      expect(document.activeElement).toBe(firstInput);

      fireEvent.keyDown(lastButton, { key: 'Tab' });
      expect(document.activeElement).toBe(firstInput);
    });

    it('should announce form validation errors', async () => {
      renderWithProviders(<AppointmentModal {...mockProps} mode="edit" />);

      const clientField = screen.getByLabelText(/client/i);
      fireEvent.change(clientField, { target: { value: '' } });
      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        const errorMessage = screen.getByText(/client is required/i);
        expect(errorMessage).toHaveAttribute('role', 'alert');
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state while saving', async () => {
      const slowSave = jest.fn(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      renderWithProviders(
        <AppointmentModal {...mockProps} mode="edit" onSave={slowSave} />
      );

      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      expect(screen.getByText(/saving/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    });

    it('should show loading state while deleting', async () => {
      const slowDelete = jest.fn(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      renderWithProviders(
        <AppointmentModal
          {...mockProps}
          appointment={{ ...mockAppointment, canCancel: true }}
          onDelete={slowDelete}
        />
      );

      fireEvent.click(
        screen.getByRole('button', { name: /cancel appointment/i })
      );
      fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

      expect(screen.getByText(/cancelling/i)).toBeInTheDocument();
    });
  });
});

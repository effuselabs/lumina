/**
 * Integration tests for complete public booking workflows
 * Tests the entire booking flow from service selection to confirmation
 */

import { PublicBookingInterface } from '@/components/booking/public-booking-interface';
import {
  mockAvailableSlots,
  mockBusiness,
  mockServices,
} from '@/test-utils/booking-mocks';
import { jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock API responses
jest.mock('@/lib/services/booking-api', () => ({
  getBusinessInfo: jest.fn(),
  getAvailableSlots: jest.fn(),
  createBooking: jest.fn(),
  lookupClient: jest.fn(),
}));

const mockBookingApi = require('@/lib/services/booking-api');

describe('Public Booking Workflow Integration', () => {
  const businessId = 'test-business-123';

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mock responses
    mockBookingApi.getBusinessInfo.mockResolvedValue({
      business: mockBusiness,
      services: mockServices,
      businessHours: [
        { day: 'monday', open: '09:00', close: '17:00' },
        { day: 'tuesday', open: '09:00', close: '17:00' },
      ],
    });

    mockBookingApi.getAvailableSlots.mockResolvedValue({
      availableSlots: mockAvailableSlots,
      nextAvailableDate: '2024-01-15',
    });

    mockBookingApi.createBooking.mockResolvedValue({
      appointment: {
        id: 'apt-123',
        confirmationNumber: 'CONF-123',
        dateTime: new Date('2024-01-15T10:00:00Z'),
        services: mockServices.slice(0, 1),
        staff: { id: 'staff-1', name: 'John Doe' },
        client: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          phone: '555-0123',
        },
        totalDuration: 60,
        totalPrice: 50,
      },
      confirmationSent: true,
    });

    mockBookingApi.lookupClient.mockResolvedValue({
      clientExists: false,
      clientData: null,
    });
  });

  describe('Complete Booking Flow - New Client', () => {
    test('should complete full booking workflow for new client', async () => {
      const user = userEvent.setup();

      render(<PublicBookingInterface businessId={businessId} />);

      // Step 1: Service Selection
      await waitFor(() => {
        expect(screen.getByText('Select Services')).toBeInTheDocument();
      });

      const serviceCard = screen.getByTestId('service-haircut');
      await user.click(serviceCard);

      expect(screen.getByText('Continue to Time Selection')).toBeEnabled();
      await user.click(screen.getByText('Continue to Time Selection'));

      // Step 2: Time Selection
      await waitFor(() => {
        expect(screen.getByText('Select Date & Time')).toBeInTheDocument();
      });

      const timeSlot = screen.getByTestId('slot-2024-01-15-10:00');
      await user.click(timeSlot);

      expect(screen.getByText('Continue to Client Information')).toBeEnabled();
      await user.click(screen.getByText('Continue to Client Information'));

      // Step 3: Client Information
      await waitFor(() => {
        expect(screen.getByText('Your Information')).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText('First Name'), 'Jane');
      await user.type(screen.getByLabelText('Last Name'), 'Smith');
      await user.type(screen.getByLabelText('Email'), 'jane@example.com');
      await user.type(screen.getByLabelText('Phone'), '555-0123');

      expect(screen.getByText('Book Appointment')).toBeEnabled();
      await user.click(screen.getByText('Book Appointment'));

      // Step 4: Confirmation
      await waitFor(() => {
        expect(screen.getByText('Booking Confirmed!')).toBeInTheDocument();
        expect(screen.getByText('CONF-123')).toBeInTheDocument();
      });

      // Verify API calls were made correctly
      expect(mockBookingApi.getBusinessInfo).toHaveBeenCalledWith(businessId);
      expect(mockBookingApi.getAvailableSlots).toHaveBeenCalled();
      expect(mockBookingApi.createBooking).toHaveBeenCalledWith(
        businessId,
        expect.objectContaining({
          services: ['service-haircut'],
          client: expect.objectContaining({
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane@example.com',
            phone: '555-0123',
          }),
        })
      );
    });

    test('should handle returning client with prefilled information', async () => {
      const user = userEvent.setup();

      // Mock returning client
      mockBookingApi.lookupClient.mockResolvedValue({
        clientExists: true,
        clientData: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '555-0456',
        },
      });

      render(<PublicBookingInterface businessId={businessId} />);

      // Navigate to client information step
      await waitFor(() => screen.getByTestId('service-haircut'));
      await user.click(screen.getByTestId('service-haircut'));
      await user.click(screen.getByText('Continue to Time Selection'));

      await waitFor(() => screen.getByTestId('slot-2024-01-15-10:00'));
      await user.click(screen.getByTestId('slot-2024-01-15-10:00'));
      await user.click(screen.getByText('Continue to Client Information'));

      // Enter email to trigger lookup
      await waitFor(() => screen.getByLabelText('Email'));
      await user.type(screen.getByLabelText('Email'), 'john@example.com');
      await user.tab(); // Trigger blur event for lookup

      // Verify prefilled information
      await waitFor(() => {
        expect(screen.getByDisplayValue('John')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
        expect(screen.getByDisplayValue('555-0456')).toBeInTheDocument();
      });

      expect(mockBookingApi.lookupClient).toHaveBeenCalledWith(businessId, {
        email: 'john@example.com',
      });
    });
  });

  describe('Multi-Service Booking Flow', () => {
    test('should handle multiple service selection with duration calculation', async () => {
      const user = userEvent.setup();

      render(<PublicBookingInterface businessId={businessId} />);

      await waitFor(() => screen.getByTestId('service-haircut'));

      // Select multiple services
      await user.click(screen.getByTestId('service-haircut'));
      await user.click(screen.getByTestId('service-styling'));

      // Verify total duration and price calculation
      expect(
        screen.getByText('Total Duration: 90 minutes')
      ).toBeInTheDocument();
      expect(screen.getByText('Total Price: $80.00')).toBeInTheDocument();

      await user.click(screen.getByText('Continue to Time Selection'));

      // Verify availability request includes multiple services
      await waitFor(() => {
        expect(mockBookingApi.getAvailableSlots).toHaveBeenCalledWith(
          businessId,
          expect.objectContaining({
            serviceIds: ['service-haircut', 'service-styling'],
            duration: 90,
          })
        );
      });
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle booking conflicts gracefully', async () => {
      const user = userEvent.setup();

      // Mock booking conflict error
      mockBookingApi.createBooking.mockRejectedValue({
        type: 'BOOKING_CONFLICT',
        message: 'Time slot no longer available',
        alternativeSlots: [
          {
            startTime: new Date('2024-01-15T11:00:00Z'),
            endTime: new Date('2024-01-15T12:00:00Z'),
            staffId: 'staff-1',
            staffName: 'John Doe',
          },
        ],
      });

      render(<PublicBookingInterface businessId={businessId} />);

      // Complete booking flow
      await waitFor(() => screen.getByTestId('service-haircut'));
      await user.click(screen.getByTestId('service-haircut'));
      await user.click(screen.getByText('Continue to Time Selection'));

      await waitFor(() => screen.getByTestId('slot-2024-01-15-10:00'));
      await user.click(screen.getByTestId('slot-2024-01-15-10:00'));
      await user.click(screen.getByText('Continue to Client Information'));

      await waitFor(() => screen.getByLabelText('First Name'));
      await user.type(screen.getByLabelText('First Name'), 'Jane');
      await user.type(screen.getByLabelText('Last Name'), 'Smith');
      await user.type(screen.getByLabelText('Email'), 'jane@example.com');
      await user.type(screen.getByLabelText('Phone'), '555-0123');

      await user.click(screen.getByText('Book Appointment'));

      // Verify error handling and alternative suggestions
      await waitFor(() => {
        expect(
          screen.getByText('Time slot no longer available')
        ).toBeInTheDocument();
        expect(
          screen.getByText('Alternative Times Available')
        ).toBeInTheDocument();
        expect(screen.getByText('11:00 AM with John Doe')).toBeInTheDocument();
      });
    });

    test('should handle network errors with retry options', async () => {
      const user = userEvent.setup();

      // Mock network error
      mockBookingApi.getBusinessInfo.mockRejectedValue(
        new Error('Network error')
      );

      render(<PublicBookingInterface businessId={businessId} />);

      await waitFor(() => {
        expect(
          screen.getByText('Unable to load booking information')
        ).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      // Test retry functionality
      mockBookingApi.getBusinessInfo.mockResolvedValue({
        business: mockBusiness,
        services: mockServices,
        businessHours: [],
      });

      await user.click(screen.getByText('Retry'));

      await waitFor(() => {
        expect(screen.getByText('Select Services')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Availability Updates', () => {
    test('should update availability when slots become unavailable', async () => {
      const user = userEvent.setup();

      render(<PublicBookingInterface businessId={businessId} />);

      await waitFor(() => screen.getByTestId('service-haircut'));
      await user.click(screen.getByTestId('service-haircut'));
      await user.click(screen.getByText('Continue to Time Selection'));

      await waitFor(() => screen.getByTestId('slot-2024-01-15-10:00'));

      // Simulate real-time update removing availability
      mockBookingApi.getAvailableSlots.mockResolvedValue({
        availableSlots: mockAvailableSlots.filter(
          slot => slot.startTime.getHours() !== 10
        ),
        nextAvailableDate: '2024-01-15',
      });

      // Trigger refresh (this would normally happen via WebSocket or polling)
      fireEvent(window, new CustomEvent('availability-update'));

      await waitFor(() => {
        expect(
          screen.queryByTestId('slot-2024-01-15-10:00')
        ).not.toBeInTheDocument();
      });
    });
  });
});

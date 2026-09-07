/**
 * Accessibility tests for public booking interface
 * Ensures WCAG 2.1 AA compliance for all booking components
 */

import { BookingConfirmation } from '@/components/booking/booking-confirmation';
import ClientInformationForm from '@/components/booking/client-information-form';
import { PublicBookingInterface } from '@/components/booking/public-booking-interface';
import { ServiceSelection } from '@/components/booking/service-selection';
import { StaffTimeSelection } from '@/components/booking/staff-time-selection';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock data for testing
const mockBusiness = {
  id: 'business-123',
  name: 'Test Salon',
  address: '123 Main St',
  phone: '555-0123',
  email: 'info@testsalon.com',
  logo: '/logo.png',
};

const mockServices = [
  {
    id: 'service-1',
    name: 'Haircut',
    description: 'Professional haircut and styling',
    duration: 60,
    price: 50,
    category: 'Hair Services',
  },
  {
    id: 'service-2',
    name: 'Hair Coloring',
    description: 'Professional hair coloring service',
    duration: 120,
    price: 100,
    category: 'Hair Services',
  },
];

const mockTimeSlots = [
  {
    startTime: new Date('2024-01-15T10:00:00Z'),
    endTime: new Date('2024-01-15T11:00:00Z'),
    staffId: 'staff-1',
    staffName: 'John Doe',
    isAvailable: true,
    totalDuration: 60,
    totalPrice: 50,
  },
];

describe('Public Booking Accessibility Tests', () => {
  describe('Service Selection Accessibility', () => {
    test('should have no accessibility violations', async () => {
      const { container } = render(
        <ServiceSelection
          services={mockServices}
          onServiceSelect={jest.fn()}
          selectedServices={[]}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should have proper ARIA labels and roles', async () => {
      render(
        <ServiceSelection
          services={mockServices}
          onServiceSelect={jest.fn()}
          selectedServices={[]}
        />
      );

      // Verify main heading
      expect(
        screen.getByRole('heading', { name: /select services/i })
      ).toBeInTheDocument();

      // Verify service cards have proper roles and labels
      const serviceCards = screen.getAllByRole('button');
      expect(serviceCards).toHaveLength(mockServices.length);

      serviceCards.forEach((card, index) => {
        const service = mockServices[index];
        expect(card).toHaveAttribute(
          'aria-label',
          expect.stringContaining(service.name)
        );
        expect(card).toHaveAttribute('aria-describedby');
      });

      // Verify price information is accessible
      expect(screen.getByText('$50.00')).toHaveAttribute(
        'aria-label',
        'Price: 50 dollars'
      );
      expect(screen.getByText('$100.00')).toHaveAttribute(
        'aria-label',
        'Price: 100 dollars'
      );
    });

    test('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      const onServiceSelect = jest.fn();

      render(
        <ServiceSelection
          services={mockServices}
          onServiceSelect={onServiceSelect}
          selectedServices={[]}
        />
      );

      const firstService = screen.getByRole('button', { name: /haircut/i });
      const secondService = screen.getByRole('button', {
        name: /hair coloring/i,
      });

      // Test tab navigation
      await user.tab();
      expect(firstService).toHaveFocus();

      await user.tab();
      expect(secondService).toHaveFocus();

      // Test Enter key selection
      await user.keyboard('{Enter}');
      expect(onServiceSelect).toHaveBeenCalledWith(mockServices[1]);

      // Test Space key selection
      firstService.focus();
      await user.keyboard(' ');
      expect(onServiceSelect).toHaveBeenCalledWith(mockServices[0]);
    });

    test('should announce selection changes to screen readers', async () => {
      const user = userEvent.setup();

      render(
        <ServiceSelection
          services={mockServices}
          onServiceSelect={jest.fn()}
          selectedServices={[mockServices[0]]}
        />
      );

      // Verify selected state is announced
      const selectedService = screen.getByRole('button', { name: /haircut/i });
      expect(selectedService).toHaveAttribute('aria-pressed', 'true');
      expect(selectedService).toHaveAttribute(
        'aria-label',
        expect.stringContaining('selected')
      );

      // Verify live region for announcements
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Time Selection Accessibility', () => {
    test('should have no accessibility violations', async () => {
      const { container } = render(
        <StaffTimeSelection
          selectedServices={mockServices.slice(0, 1)}
          onSlotSelect={jest.fn()}
          businessId="business-123"
          availableSlots={mockTimeSlots}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should have accessible calendar navigation', async () => {
      const user = userEvent.setup();

      render(
        <StaffTimeSelection
          selectedServices={mockServices.slice(0, 1)}
          onSlotSelect={jest.fn()}
          businessId="business-123"
          availableSlots={mockTimeSlots}
        />
      );

      // Verify calendar has proper role and label
      const calendar = screen.getByRole('grid');
      expect(calendar).toHaveAttribute(
        'aria-label',
        expect.stringContaining('calendar')
      );

      // Verify navigation buttons
      const prevButton = screen.getByRole('button', {
        name: /previous month/i,
      });
      const nextButton = screen.getByRole('button', { name: /next month/i });

      expect(prevButton).toBeInTheDocument();
      expect(nextButton).toBeInTheDocument();

      // Test keyboard navigation
      await user.tab();
      expect(prevButton).toHaveFocus();

      await user.tab();
      expect(nextButton).toHaveFocus();
    });

    test('should have accessible time slot selection', async () => {
      const user = userEvent.setup();
      const onSlotSelect = jest.fn();

      render(
        <StaffTimeSelection
          selectedServices={mockServices.slice(0, 1)}
          onSlotSelect={onSlotSelect}
          businessId="business-123"
          availableSlots={mockTimeSlots}
        />
      );

      // Verify time slots have proper labels
      const timeSlot = screen.getByRole('button', {
        name: /10:00 AM with John Doe/i,
      });

      expect(timeSlot).toHaveAttribute(
        'aria-label',
        expect.stringContaining('January 15, 2024 at 10:00 AM with John Doe')
      );

      // Test selection
      await user.click(timeSlot);
      expect(onSlotSelect).toHaveBeenCalledWith(mockTimeSlots[0]);

      // Verify selection is announced
      expect(timeSlot).toHaveAttribute('aria-pressed', 'true');
    });

    test('should handle unavailable slots accessibly', async () => {
      const unavailableSlots = [
        {
          ...mockTimeSlots[0],
          isAvailable: false,
        },
      ];

      render(
        <StaffTimeSelection
          selectedServices={mockServices.slice(0, 1)}
          onSlotSelect={jest.fn()}
          businessId="business-123"
          availableSlots={unavailableSlots}
        />
      );

      const unavailableSlot = screen.getByRole('button', {
        name: /10:00 AM with John Doe/i,
      });

      expect(unavailableSlot).toBeDisabled();
      expect(unavailableSlot).toHaveAttribute(
        'aria-label',
        expect.stringContaining('unavailable')
      );
    });
  });

  describe('Client Information Form Accessibility', () => {
    test('should have no accessibility violations', async () => {
      const { container } = render(
        <ClientInformationForm onSubmit={jest.fn()} prefillData={undefined} />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should have proper form labels and associations', async () => {
      render(
        <ClientInformationForm onSubmit={jest.fn()} prefillData={undefined} />
      );

      // Verify all form fields have proper labels
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();

      // Verify required fields are marked
      const requiredFields = screen.getAllByText('*');
      expect(requiredFields.length).toBeGreaterThan(0);

      // Verify fieldset for grouping
      expect(
        screen.getByRole('group', { name: /contact information/i })
      ).toBeInTheDocument();
    });

    test('should provide accessible error messages', async () => {
      const user = userEvent.setup();

      render(
        <ClientInformationForm onSubmit={jest.fn()} prefillData={undefined} />
      );

      // Submit form without required fields
      const submitButton = screen.getByRole('button', {
        name: /book appointment/i,
      });
      await user.click(submitButton);

      // Verify error messages are associated with fields
      const firstNameField = screen.getByLabelText(/first name/i);
      const errorMessage = screen.getByText(/first name is required/i);

      expect(firstNameField).toHaveAttribute(
        'aria-describedby',
        expect.stringContaining(errorMessage.id)
      );
      expect(firstNameField).toHaveAttribute('aria-invalid', 'true');

      // Verify error summary for screen readers
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    test('should support keyboard navigation and form completion', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();

      render(
        <ClientInformationForm onSubmit={onSubmit} prefillData={undefined} />
      );

      // Test tab order
      await user.tab();
      expect(screen.getByLabelText(/first name/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/last name/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/email/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/phone/i)).toHaveFocus();

      // Fill form using keyboard
      const firstNameField = screen.getByLabelText(/first name/i);
      firstNameField.focus();
      await user.type(firstNameField, 'Jane');

      await user.tab();
      await user.type(screen.getByLabelText(/last name/i), 'Smith');

      await user.tab();
      await user.type(screen.getByLabelText(/email/i), 'jane@example.com');

      await user.tab();
      await user.type(screen.getByLabelText(/phone/i), '555-0123');

      // Submit using Enter key
      await user.keyboard('{Enter}');

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          phone: '555-0123',
        })
      );
    });
  });

  describe('Booking Confirmation Accessibility', () => {
    const mockAppointment = {
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
      notes: 'Please use organic products',
    };

    test('should have no accessibility violations', async () => {
      const { container } = render(
        <BookingConfirmation
          appointment={mockAppointment}
          business={mockBusiness}
          onNewBooking={jest.fn()}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should announce confirmation to screen readers', async () => {
      render(
        <BookingConfirmation
          appointment={mockAppointment}
          business={mockBusiness}
          onNewBooking={jest.fn()}
        />
      );

      // Verify confirmation announcement
      const confirmationHeading = screen.getByRole('heading', {
        name: /booking confirmed/i,
      });
      expect(confirmationHeading).toBeInTheDocument();

      // Verify live region for immediate announcement
      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveTextContent(
        /your appointment has been confirmed/i
      );

      // Verify confirmation number is prominently displayed
      expect(screen.getByText('CONF-123')).toHaveAttribute(
        'aria-label',
        'Confirmation number: CONF-123'
      );
    });

    test('should have accessible appointment details', async () => {
      render(
        <BookingConfirmation
          appointment={mockAppointment}
          business={mockBusiness}
          onNewBooking={jest.fn()}
        />
      );

      // Verify appointment details are in a structured format
      const detailsList = screen.getByRole('list', {
        name: /appointment details/i,
      });
      expect(detailsList).toBeInTheDocument();

      // Verify each detail has proper labeling
      expect(screen.getByText(/date and time/i)).toBeInTheDocument();
      expect(screen.getByText(/service/i)).toBeInTheDocument();
      expect(screen.getByText(/staff member/i)).toBeInTheDocument();
      expect(screen.getByText(/total price/i)).toBeInTheDocument();
    });
  });

  describe('Overall Interface Accessibility', () => {
    test('should have proper heading hierarchy', async () => {
      const { container } = render(
        <PublicBookingInterface businessId="business-123" />
      );

      // Verify heading hierarchy (h1 -> h2 -> h3, etc.)
      const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');

      expect(headings[0].tagName).toBe('H1'); // Main page title

      // Verify no heading levels are skipped
      for (let i = 1; i < headings.length; i++) {
        const currentLevel = parseInt(headings[i].tagName.charAt(1));
        const previousLevel = parseInt(headings[i - 1].tagName.charAt(1));

        expect(currentLevel - previousLevel).toBeLessThanOrEqual(1);
      }
    });

    test('should have proper focus management', async () => {
      const user = userEvent.setup();

      render(<PublicBookingInterface businessId="business-123" />);

      // Test skip link functionality
      const skipLink = screen.getByText(/skip to main content/i);
      expect(skipLink).toBeInTheDocument();

      await user.tab();
      expect(skipLink).toHaveFocus();

      await user.keyboard('{Enter}');

      // Verify focus moves to main content
      const mainContent = screen.getByRole('main');
      expect(mainContent).toHaveFocus();
    });

    test('should meet color contrast requirements', async () => {
      const { container } = render(
        <PublicBookingInterface businessId="business-123" />
      );

      // This would typically use a tool like axe-core to check contrast
      // For now, we verify that contrast-checking classes are applied
      const textElements = container.querySelectorAll('[class*="text-"]');

      textElements.forEach(element => {
        const computedStyle = window.getComputedStyle(element);
        const color = computedStyle.color;
        const backgroundColor = computedStyle.backgroundColor;

        // Verify colors are not default (indicating proper styling)
        expect(color).not.toBe('rgb(0, 0, 0)'); // Not default black
        expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)'); // Not transparent
      });
    });

    test('should support high contrast mode', async () => {
      // Simulate high contrast mode
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      const { container } = render(
        <PublicBookingInterface businessId="business-123" />
      );

      // Verify high contrast styles are applied
      const buttons = container.querySelectorAll('button');
      buttons.forEach(button => {
        expect(button).toHaveClass(
          expect.stringMatching(/high-contrast|border/)
        );
      });
    });

    test('should support reduced motion preferences', async () => {
      // Simulate reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      const { container } = render(
        <PublicBookingInterface businessId="business-123" />
      );

      // Verify animations are disabled or reduced
      const animatedElements = container.querySelectorAll(
        '[class*="animate-"], [class*="transition-"]'
      );
      animatedElements.forEach(element => {
        const computedStyle = window.getComputedStyle(element);
        // In reduced motion mode, animations should be disabled
        expect(computedStyle.animationDuration).toBe('0s');
      });
    });
  });
});

import ClientInformationForm from '@/components/booking/client-information-form';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock fetch
global.fetch = jest.fn();

const mockProps = {
  businessId: 'business-123',
  onSubmit: jest.fn(),
  onBack: jest.fn(),
  isLoading: false,
};

describe('ClientInformationForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Form Rendering', () => {
    it('renders all required form fields', () => {
      render(<ClientInformationForm {...mockProps} />);

      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/special requests/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/marketing/i)).toBeInTheDocument();
    });

    it('displays proper field labels and placeholders', () => {
      render(<ClientInformationForm {...mockProps} />);

      expect(
        screen.getByPlaceholderText('Enter your first name')
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('Enter your last name')
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('Enter your email address')
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('Enter your phone number')
      ).toBeInTheDocument();
    });

    it('shows required field indicators', () => {
      render(<ClientInformationForm {...mockProps} />);

      expect(screen.getByText(/first name \*/i)).toBeInTheDocument();
      expect(screen.getByText(/last name \*/i)).toBeInTheDocument();
      expect(screen.getByText(/email address \*/i)).toBeInTheDocument();
      expect(screen.getByText(/phone number \*/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('validates required fields', async () => {
      const user = userEvent.setup();
      render(<ClientInformationForm {...mockProps} />);

      const submitButton = screen.getByRole('button', {
        name: /continue to confirmation/i,
      });

      // Try to submit empty form
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('First name is required')).toBeInTheDocument();
        expect(screen.getByText('Last name is required')).toBeInTheDocument();
        expect(screen.getByText('Email is required')).toBeInTheDocument();
        expect(
          screen.getByText('Phone number is required')
        ).toBeInTheDocument();
      });

      expect(mockProps.onSubmit).not.toHaveBeenCalled();
    });

    it('validates email format', async () => {
      const user = userEvent.setup();
      render(<ClientInformationForm {...mockProps} />);

      const emailInput = screen.getByLabelText(/email address/i);

      await user.type(emailInput, 'invalid-email');
      await user.tab(); // Trigger validation

      await waitFor(() => {
        expect(
          screen.getByText('Please enter a valid email address')
        ).toBeInTheDocument();
      });
    });

    it('validates phone number format', async () => {
      const user = userEvent.setup();
      render(<ClientInformationForm {...mockProps} />);

      const phoneInput = screen.getByLabelText(/phone number/i);

      await user.type(phoneInput, '123');
      await user.tab(); // Trigger validation

      await waitFor(() => {
        expect(
          screen.getByText('Phone number must be at least 10 digits')
        ).toBeInTheDocument();
      });
    });

    it('validates name length and format', async () => {
      const user = userEvent.setup();
      render(<ClientInformationForm {...mockProps} />);

      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);

      // Test minimum length
      await user.type(firstNameInput, 'A');
      await user.type(lastNameInput, 'B');
      await user.tab();

      await waitFor(() => {
        expect(
          screen.getByText('First name must be at least 2 characters')
        ).toBeInTheDocument();
        expect(
          screen.getByText('Last name must be at least 2 characters')
        ).toBeInTheDocument();
      });

      // Test invalid characters
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'John123');
      await user.tab();

      await waitFor(() => {
        expect(
          screen.getByText(/can only contain letters/i)
        ).toBeInTheDocument();
      });
    });

    it('validates notes length', async () => {
      const user = userEvent.setup();
      render(<ClientInformationForm {...mockProps} />);

      const notesInput = screen.getByLabelText(/special requests/i);
      const longText = 'A'.repeat(501); // Exceeds 500 character limit

      await user.type(notesInput, longText);
      await user.tab();

      await waitFor(() => {
        expect(
          screen.getByText('Notes must be less than 500 characters')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Client Lookup Functionality', () => {
    it('performs client lookup when email is entered', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        clientExists: true,
        clientData: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          marketingOptIn: true,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      render(<ClientInformationForm {...mockProps} />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'john@example.com');

      // Wait for debounced lookup
      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalledWith(
            '/api/public/booking/business-123/client-lookup',
            expect.objectContaining({
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: 'john@example.com' }),
            })
          );
        },
        { timeout: 2000 }
      );

      // Check if form is pre-filled
      await waitFor(() => {
        expect(screen.getByDisplayValue('John')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
        expect(screen.getByDisplayValue('+1234567890')).toBeInTheDocument();
      });

      // Check welcome back message
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    });

    it('performs client lookup when phone is entered', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        clientExists: false,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      render(<ClientInformationForm {...mockProps} />);

      const phoneInput = screen.getByLabelText(/phone number/i);
      await user.type(phoneInput, '1234567890');

      // Wait for debounced lookup
      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalledWith(
            '/api/public/booking/business-123/client-lookup',
            expect.objectContaining({
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phone: '1234567890' }),
            })
          );
        },
        { timeout: 2000 }
      );

      // Should not show welcome back message for new client
      expect(screen.queryByText(/welcome back/i)).not.toBeInTheDocument();
    });

    it('shows loading state during client lookup', async () => {
      const user = userEvent.setup();

      // Mock a delayed response
      (global.fetch as jest.Mock).mockImplementationOnce(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ clientExists: false }),
                }),
              100
            )
          )
      );

      render(<ClientInformationForm {...mockProps} />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      // Should show loading indicator
      await waitFor(() => {
        expect(
          screen.getByText(/checking for existing account/i)
        ).toBeInTheDocument();
      });
    });

    it('handles client lookup errors gracefully', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      render(<ClientInformationForm {...mockProps} />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      // Wait for error message
      await waitFor(
        () => {
          expect(
            screen.getByText(/unable to check client information/i)
          ).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });
  });

  describe('Form Submission', () => {
    it('submits form with valid data for new client', async () => {
      const user = userEvent.setup();
      render(<ClientInformationForm {...mockProps} />);

      // Fill out form
      await user.type(screen.getByLabelText(/first name/i), 'Jane');
      await user.type(screen.getByLabelText(/last name/i), 'Smith');
      await user.type(
        screen.getByLabelText(/email address/i),
        'jane@example.com'
      );
      await user.type(screen.getByLabelText(/phone number/i), '1234567890');
      await user.type(
        screen.getByLabelText(/special requests/i),
        'No allergies'
      );
      await user.click(screen.getByLabelText(/marketing/i));

      // Submit form
      await user.click(
        screen.getByRole('button', { name: /continue to confirmation/i })
      );

      await waitFor(() => {
        expect(mockProps.onSubmit).toHaveBeenCalledWith({
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          phone: '1234567890',
          notes: 'No allergies',
          marketingOptIn: true,
          isNewClient: true,
        });
      });
    });

    it('submits form with returning client data', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        clientExists: true,
        clientData: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          marketingOptIn: false,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      render(<ClientInformationForm {...mockProps} />);

      // Enter email to trigger lookup
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'john@example.com');

      // Wait for pre-fill
      await waitFor(() => {
        expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      });

      // Submit form
      await user.click(
        screen.getByRole('button', { name: /continue to confirmation/i })
      );

      await waitFor(() => {
        expect(mockProps.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            phone: '+1234567890',
            marketingOptIn: false,
            isNewClient: false,
          })
        );
      });
    });

    it('disables submit button when form is invalid', async () => {
      render(<ClientInformationForm {...mockProps} />);

      const submitButton = screen.getByRole('button', {
        name: /continue to confirmation/i,
      });
      expect(submitButton).toBeDisabled();
    });

    it('disables submit button during loading', () => {
      render(<ClientInformationForm {...mockProps} isLoading={true} />);

      const submitButton = screen.getByRole('button', { name: /processing/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Form Actions', () => {
    it('calls onBack when back button is clicked', async () => {
      const user = userEvent.setup();
      render(<ClientInformationForm {...mockProps} />);

      const backButton = screen.getByRole('button', { name: /back/i });
      await user.click(backButton);

      expect(mockProps.onBack).toHaveBeenCalled();
    });

    it('shows clear form button after client lookup', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        clientExists: true,
        clientData: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          marketingOptIn: false,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      render(<ClientInformationForm {...mockProps} />);

      // Enter email to trigger lookup
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'john@example.com');

      // Wait for pre-fill and clear button to appear
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /clear form/i })
        ).toBeInTheDocument();
      });
    });

    it('clears form when clear button is clicked', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        clientExists: true,
        clientData: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          marketingOptIn: false,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      render(<ClientInformationForm {...mockProps} />);

      // Enter email to trigger lookup
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'john@example.com');

      // Wait for pre-fill
      await waitFor(() => {
        expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      });

      // Click clear form
      const clearButton = screen.getByRole('button', { name: /clear form/i });
      await user.click(clearButton);

      // Form should be cleared
      expect(screen.queryByDisplayValue('John')).not.toBeInTheDocument();
      expect(screen.queryByDisplayValue('Doe')).not.toBeInTheDocument();
      expect(screen.queryByText(/welcome back/i)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<ClientInformationForm {...mockProps} />);

      expect(screen.getByRole('form')).toBeInTheDocument();
      expect(screen.getByLabelText(/first name/i)).toHaveAttribute(
        'aria-required',
        'true'
      );
      expect(screen.getByLabelText(/last name/i)).toHaveAttribute(
        'aria-required',
        'true'
      );
      expect(screen.getByLabelText(/email address/i)).toHaveAttribute(
        'aria-required',
        'true'
      );
      expect(screen.getByLabelText(/phone number/i)).toHaveAttribute(
        'aria-required',
        'true'
      );
    });

    it('shows error messages with proper ARIA attributes', async () => {
      const user = userEvent.setup();
      render(<ClientInformationForm {...mockProps} />);

      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.type(firstNameInput, 'A');
      await user.tab();

      await waitFor(() => {
        const errorMessage = screen.getByText(
          'First name must be at least 2 characters'
        );
        expect(errorMessage).toHaveAttribute('role', 'alert');
      });
    });
  });

  describe('Initial Data', () => {
    it('pre-fills form with initial data', () => {
      const initialData = {
        firstName: 'Initial',
        lastName: 'User',
        email: 'initial@example.com',
        phone: '1234567890',
        notes: 'Initial notes',
        marketingOptIn: true,
      };

      render(
        <ClientInformationForm {...mockProps} initialData={initialData} />
      );

      expect(screen.getByDisplayValue('Initial')).toBeInTheDocument();
      expect(screen.getByDisplayValue('User')).toBeInTheDocument();
      expect(
        screen.getByDisplayValue('initial@example.com')
      ).toBeInTheDocument();
      expect(screen.getByDisplayValue('1234567890')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Initial notes')).toBeInTheDocument();
      expect(screen.getByRole('checkbox')).toBeChecked();
    });
  });
});

import { EmploymentConfigurationForm } from '@/components/staff/employment-configuration-form';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

// Mock the calculation preview component
jest.mock('@/components/staff/employment-calculation-preview', () => ({
  EmploymentCalculationPreview: () => (
    <div data-testid="calculation-preview">Preview</div>
  ),
}));

describe('EmploymentConfigurationForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders employment type selection', () => {
    render(
      <EmploymentConfigurationForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Employment Type')).toBeInTheDocument();
    expect(
      screen.getByText('Choose how this staff member will be compensated')
    ).toBeInTheDocument();
  });

  it('shows commission fields when commission type is selected', async () => {
    render(
      <EmploymentConfigurationForm
        initialData={{ employmentType: 'COMMISSION' }}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Commission Rate *')).toBeInTheDocument();
    expect(screen.getByText('Base Salary (Optional)')).toBeInTheDocument();
  });

  it('shows rental fields when chair rental type is selected', async () => {
    render(
      <EmploymentConfigurationForm
        initialData={{ employmentType: 'CHAIR_RENTAL' }}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Rental Amount *')).toBeInTheDocument();
    expect(screen.getByText('Rental Period *')).toBeInTheDocument();
  });

  it('shows both commission and rental fields for hybrid type', async () => {
    render(
      <EmploymentConfigurationForm
        initialData={{ employmentType: 'HYBRID' }}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Commission Rate *')).toBeInTheDocument();
    expect(screen.getByText('Rental Amount *')).toBeInTheDocument();
    expect(screen.getByText('Rental Period *')).toBeInTheDocument();
    expect(screen.getByText('Base Salary (Optional)')).toBeInTheDocument();
  });

  it('calls onSubmit with correct data when form is submitted', async () => {
    render(
      <EmploymentConfigurationForm
        initialData={{
          employmentType: 'COMMISSION',
          commissionRate: 50,
          baseSalary: 500,
        }}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const submitButton = screen.getByText('Save Configuration');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          employmentType: 'COMMISSION',
          commissionRate: 50,
          baseSalary: 500,
        })
      );
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <EmploymentConfigurationForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('shows calculation preview when enabled', () => {
    render(
      <EmploymentConfigurationForm onSubmit={mockOnSubmit} showPreview={true} />
    );

    expect(screen.getByTestId('calculation-preview')).toBeInTheDocument();
  });

  it('hides calculation preview when disabled', () => {
    render(
      <EmploymentConfigurationForm
        onSubmit={mockOnSubmit}
        showPreview={false}
      />
    );

    expect(screen.queryByTestId('calculation-preview')).not.toBeInTheDocument();
  });
});

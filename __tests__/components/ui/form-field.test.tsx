import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { render, screen } from '@testing-library/react';
import React from 'react';

describe('FormField Component', () => {
    it('renders with label and input', () => {
        render(
            <FormField label="Email Address">
                <Input placeholder="Enter email" />
            </FormField>
        );

        expect(screen.getByText('Email Address')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter email')).toBeInTheDocument();
    });

    it('shows required indicator when required', () => {
        render(
            <FormField label="Required Field" required>
                <Input />
            </FormField>
        );

        const requiredIndicator = screen.getByText('*');
        expect(requiredIndicator).toBeInTheDocument();
        expect(requiredIndicator).toHaveAttribute('aria-label', 'required');
    });

    it('displays hint text when provided', () => {
        render(
            <FormField label="Password" hint="Must be at least 8 characters">
                <Input type="password" />
            </FormField>
        );

        expect(screen.getByText('Must be at least 8 characters')).toBeInTheDocument();
    });

    it('displays error message and hides hint', () => {
        render(
            <FormField
                label="Email"
                hint="Enter a valid email"
                error="Email is required"
            >
                <Input />
            </FormField>
        );

        expect(screen.getByText('Email is required')).toBeInTheDocument();
        expect(screen.queryByText('Enter a valid email')).not.toBeInTheDocument();
    });

    it('applies error styling to label when error exists', () => {
        render(
            <FormField label="Email" error="Email is required">
                <Input />
            </FormField>
        );

        const label = screen.getByText('Email');
        expect(label).toHaveClass('text-red-600');
    });

    it('connects label to input with htmlFor', () => {
        render(
            <FormField label="Custom Field" htmlFor="custom-input">
                <Input id="custom-input" />
            </FormField>
        );

        const label = screen.getByText('Custom Field');
        const input = screen.getByRole('textbox');

        expect(label).toHaveAttribute('for', 'custom-input');
        expect(input).toHaveAttribute('id', 'custom-input');
    });

    it('sets up proper ARIA relationships', () => {
        render(
            <FormField
                label="Description"
                hint="Optional description"
                error="Description is too long"
            >
                <Input />
            </FormField>
        );

        const input = screen.getByRole('textbox');
        const errorMessage = screen.getByText('Description is too long');

        expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(input).toHaveAttribute('aria-describedby');
        expect(errorMessage).toHaveAttribute('role', 'alert');
        expect(errorMessage).toHaveAttribute('aria-live', 'polite');
    });

    it('renders different sizes correctly', () => {
        const { rerender } = render(
            <FormField label="Small Field" size="sm">
                <Input />
            </FormField>
        );

        let container = screen.getByText('Small Field').closest('div');
        expect(container).toHaveClass('space-y-1.5');

        rerender(
            <FormField label="Large Field" size="lg">
                <Input />
            </FormField>
        );

        container = screen.getByText('Large Field').closest('div');
        expect(container).toHaveClass('space-y-3');
    });

    it('works without label', () => {
        render(
            <FormField hint="Just a hint">
                <Input placeholder="No label input" />
            </FormField>
        );

        expect(screen.getByPlaceholderText('No label input')).toBeInTheDocument();
        expect(screen.getByText('Just a hint')).toBeInTheDocument();
    });

    it('applies custom className', () => {
        render(
            <FormField className="custom-form-field" label="Test">
                <Input />
            </FormField>
        );

        const container = screen.getByText('Test').closest('div');
        expect(container).toHaveClass('custom-form-field');
    });

    it('forwards ref correctly', () => {
        const ref = React.createRef<HTMLDivElement>();
        render(
            <FormField ref={ref} label="Test">
                <Input />
            </FormField>
        );

        expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
});
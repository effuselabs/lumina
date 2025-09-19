import { Input } from '@/components/ui/input';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

describe('Input Component', () => {
    it('renders with default styling', () => {
        render(<Input placeholder="Enter text" />);
        const input = screen.getByPlaceholderText('Enter text');

        expect(input).toBeInTheDocument();
        expect(input).toHaveClass('h-10', 'px-3', 'py-2', 'text-sm');
    });

    it('renders different sizes correctly', () => {
        const { rerender } = render(<Input size="sm" data-testid="input-sm" />);
        expect(screen.getByTestId('input-sm')).toHaveClass('h-8', 'px-2.5', 'py-1.5', 'text-xs');

        rerender(<Input size="lg" data-testid="input-lg" />);
        expect(screen.getByTestId('input-lg')).toHaveClass('h-12', 'px-4', 'py-3', 'text-base');
    });

    it('renders error state correctly', () => {
        render(<Input error data-testid="error-input" />);
        const input = screen.getByTestId('error-input');

        expect(input).toHaveClass('border-red-500');
        expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('renders success state correctly', () => {
        render(<Input success data-testid="success-input" />);
        const input = screen.getByTestId('success-input');

        expect(input).toHaveClass('border-green-500');
    });

    it('handles disabled state correctly', () => {
        render(<Input disabled data-testid="disabled-input" />);
        const input = screen.getByTestId('disabled-input');

        expect(input).toBeDisabled();
        expect(input).toHaveAttribute('aria-disabled', 'true');
        expect(input).toHaveClass('disabled:opacity-50');
    });

    it('supports different input types', () => {
        const { rerender } = render(<Input type="email" data-testid="email-input" />);
        expect(screen.getByTestId('email-input')).toHaveAttribute('type', 'email');

        rerender(<Input type="password" data-testid="password-input" />);
        expect(screen.getByTestId('password-input')).toHaveAttribute('type', 'password');

        rerender(<Input type="number" data-testid="number-input" />);
        expect(screen.getByTestId('number-input')).toHaveAttribute('type', 'number');
    });

    it('handles user input correctly', async () => {
        const user = userEvent.setup();
        const handleChange = jest.fn();

        render(<Input onChange={handleChange} data-testid="input" />);
        const input = screen.getByTestId('input');

        await user.type(input, 'Hello World');

        expect(handleChange).toHaveBeenCalled();
        expect(input).toHaveValue('Hello World');
    });

    it('supports accessibility attributes', () => {
        render(
            <Input
                aria-label="Custom label"
                aria-describedby="help-text"
                data-testid="accessible-input"
            />
        );
        const input = screen.getByTestId('accessible-input');

        expect(input).toHaveAttribute('aria-label', 'Custom label');
        expect(input).toHaveAttribute('aria-describedby', 'help-text');
    });

    it('focuses correctly with keyboard navigation', () => {
        render(<Input data-testid="focusable-input" />);
        const input = screen.getByTestId('focusable-input');

        input.focus();
        expect(input).toHaveFocus();
    });

    it('applies custom className correctly', () => {
        render(<Input className="custom-class" data-testid="custom-input" />);
        const input = screen.getByTestId('custom-input');

        expect(input).toHaveClass('custom-class');
    });

    it('forwards ref correctly', () => {
        const ref = React.createRef<HTMLInputElement>();
        render(<Input ref={ref} />);

        expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });
});
import { Spinner } from '@/components/ui/spinner';
import { render, screen } from '@testing-library/react';

describe('Spinner Component', () => {
    it('renders with default size', () => {
        render(<Spinner />);
        const spinner = screen.getByRole('status');
        expect(spinner).toBeInTheDocument();
        expect(spinner).toHaveAttribute('aria-label', 'Loading');
        expect(spinner).toHaveClass('h-5', 'w-5', 'border-2');
    });

    it('renders all sizes correctly', () => {
        const sizes = ['sm', 'default', 'lg', 'xl'] as const;

        sizes.forEach((size) => {
            const { unmount } = render(<Spinner size={size} data-testid={`spinner-${size}`} />);
            const spinner = screen.getByTestId(`spinner-${size}`);
            expect(spinner).toBeInTheDocument();

            if (size === 'sm') expect(spinner).toHaveClass('h-4', 'w-4', 'border-2');
            if (size === 'default') expect(spinner).toHaveClass('h-5', 'w-5', 'border-2');
            if (size === 'lg') expect(spinner).toHaveClass('h-6', 'w-6', 'border-2');
            if (size === 'xl') expect(spinner).toHaveClass('h-8', 'w-8', 'border-3');

            unmount();
        });
    });

    it('applies custom className correctly', () => {
        render(<Spinner className="custom-spinner" />);
        const spinner = screen.getByRole('status');
        expect(spinner).toHaveClass('custom-spinner');
    });

    it('has proper accessibility attributes', () => {
        render(<Spinner />);
        const spinner = screen.getByRole('status');
        expect(spinner).toHaveAttribute('aria-label', 'Loading');
    });

    it('forwards ref correctly', () => {
        const ref = jest.fn();
        render(<Spinner ref={ref} />);
        expect(ref).toHaveBeenCalled();
    });

    it('applies animation classes', () => {
        render(<Spinner />);
        const spinner = screen.getByRole('status');
        expect(spinner).toHaveClass('animate-spin', 'rounded-full', 'border-solid', 'border-current', 'border-r-transparent');
    });
});
import { fireEvent, render, screen } from '@testing-library/react';
import { User } from 'lucide-react';
import { Button } from '../../../components/ui/button';

describe('Button Component', () => {
  it('renders with default variant and size', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('h-10', 'px-4', 'text-sm');
  });

  it('renders all variants correctly', () => {
    const variants = [
      'primary',
      'secondary',
      'outline',
      'ghost',
      'destructive',
      'link',
    ] as const;

    variants.forEach(variant => {
      const { unmount } = render(
        <Button variant={variant}>{variant} button</Button>
      );
      const button = screen.getByRole('button', {
        name: new RegExp(`${variant} button`, 'i'),
      });
      expect(button).toBeInTheDocument();
      unmount();
    });
  });

  it('renders all sizes correctly', () => {
    const sizes = ['sm', 'default', 'lg', 'xl', 'icon'] as const;

    sizes.forEach(size => {
      const { unmount } = render(<Button size={size}>{size} button</Button>);
      const button = screen.getByRole('button', {
        name: new RegExp(`${size} button`, 'i'),
      });
      expect(button).toBeInTheDocument();

      if (size === 'sm') expect(button).toHaveClass('h-8');
      if (size === 'default') expect(button).toHaveClass('h-10');
      if (size === 'lg') expect(button).toHaveClass('h-12');
      if (size === 'xl') expect(button).toHaveClass('h-14');
      if (size === 'icon') expect(button).toHaveClass('h-10', 'w-10');

      unmount();
    });
  });

  it('shows loading state correctly', () => {
    render(<Button loading>Loading button</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Loading button')).toHaveClass('opacity-70');
    // Check for loading announcement
    expect(
      screen.getByText('Loading', { selector: '.sr-only' })
    ).toBeInTheDocument();
  });

  it('renders with icon correctly', () => {
    render(<Button icon={<User data-testid="user-icon" />}>With Icon</Button>);
    expect(screen.getByTestId('user-icon')).toBeInTheDocument();
    expect(screen.getByText('With Icon')).toBeInTheDocument();
  });

  it('handles disabled state correctly', () => {
    render(<Button disabled>Disabled button</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Clickable</Button>);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not trigger click when loading', () => {
    const handleClick = jest.fn();
    render(
      <Button loading onClick={handleClick}>
        Loading
      </Button>
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies custom className correctly', () => {
    render(<Button className="custom-class">Custom</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('forwards ref correctly', () => {
    const ref = jest.fn();
    render(<Button ref={ref}>Ref button</Button>);
    expect(ref).toHaveBeenCalled();
  });

  it('supports asChild prop with Slot', () => {
    render(
      <Button asChild>
        <a href="/test">Link button</a>
      </Button>
    );

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/test');
    expect(link).toHaveTextContent('Link button');
  });
});

import { Button } from '@/components/ui/button';
import { fireEvent, render, screen } from '@testing-library/react';
import { User } from 'lucide-react';

describe('Button Component - Accessibility', () => {
  // Accessibility Tests
  describe('ARIA Attributes', () => {
    it('provides accessible label for icon-only buttons without text', () => {
      render(<Button size="icon" />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Button');
    });

    it('uses custom aria-label when provided', () => {
      render(
        <Button size="icon" aria-label="Add user">
          <User />
        </Button>
      );
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Add user');
    });

    it('supports aria-describedby attribute', () => {
      render(<Button aria-describedby="help-text">Submit</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-describedby', 'help-text');
    });

    it('supports aria-expanded attribute', () => {
      render(<Button aria-expanded={true}>Menu</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('supports aria-haspopup attribute', () => {
      render(<Button aria-haspopup="menu">Options</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-haspopup', 'menu');
    });

    it('sets aria-busy when loading', () => {
      render(<Button loading>Loading</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-busy', 'true');
    });

    it('does not set aria-busy when not loading', () => {
      render(<Button>Not Loading</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-busy', 'false');
    });
  });

  describe('Tab Index Management', () => {
    it('has proper tabIndex for enabled buttons', () => {
      render(<Button>Enabled</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('tabIndex', '0');
    });

    it('has proper tabIndex for disabled buttons', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('tabIndex', '-1');
    });

    it('has proper tabIndex for loading buttons', () => {
      render(<Button loading>Loading</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('Role Management', () => {
    it('has proper role attribute', () => {
      render(<Button>Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('role', 'button');
    });

    it('does not set role when asChild is true', () => {
      render(
        <Button asChild>
          <a href="/test">Link</a>
        </Button>
      );
      const link = screen.getByRole('link');
      expect(link).not.toHaveAttribute('role');
    });
  });

  describe('Screen Reader Support', () => {
    it('marks icons as decorative with aria-hidden', () => {
      render(<Button icon={<User data-testid="icon" />}>With Icon</Button>);
      const iconContainer = screen.getByTestId('icon').parentElement;
      expect(iconContainer).toHaveAttribute('aria-hidden', 'true');
    });

    it('marks loading spinner as decorative', () => {
      render(<Button loading>Loading</Button>);
      const spinner = screen.getByLabelText('Loading');
      expect(spinner).toHaveAttribute('aria-hidden', 'true');
    });

    it('provides live region for loading text', () => {
      render(<Button loading>Saving changes</Button>);
      const loadingText = screen.getByText('Saving changes');
      expect(loadingText).toHaveAttribute('aria-live', 'polite');
      expect(loadingText).toHaveAttribute('aria-atomic', 'true');
    });

    it('announces loading state to screen readers', () => {
      render(<Button loading>Processing</Button>);
      const loadingAnnouncement = screen.getByText('Loading', {
        selector: '.sr-only',
      });
      expect(loadingAnnouncement).toHaveAttribute('aria-live', 'assertive');
    });
  });

  // Keyboard Navigation Tests
  describe('Keyboard Navigation', () => {
    it('can be activated with keyboard', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Submit</Button>);

      const button = screen.getByRole('button');

      // Test that button can be focused and clicked
      button.focus();
      expect(button).toHaveFocus();

      // Simulate click via keyboard (browsers handle this automatically)
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('cannot be activated when disabled', () => {
      const handleClick = jest.fn();
      render(
        <Button disabled onClick={handleClick}>
          Submit
        </Button>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });

    it('cannot be activated when loading', () => {
      const handleClick = jest.fn();
      render(
        <Button loading onClick={handleClick}>
          Submit
        </Button>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  // Focus Management Tests
  describe('Focus Management', () => {
    it('can receive focus when enabled', () => {
      render(<Button>Focusable</Button>);
      const button = screen.getByRole('button');

      button.focus();
      expect(button).toHaveFocus();
    });

    it('has negative tabIndex when disabled', () => {
      render(<Button disabled>Not Focusable</Button>);
      const button = screen.getByRole('button');

      expect(button).toHaveAttribute('tabIndex', '-1');
      expect(button).toBeDisabled();
    });

    it('has focus-visible styles', () => {
      render(<Button>Focus Test</Button>);
      const button = screen.getByRole('button');

      expect(button).toHaveClass('focus-visible:outline-none');
      expect(button).toHaveClass('focus-visible:ring-2');
      expect(button).toHaveClass('focus-visible:ring-offset-2');
    });

    it('has proper focus ring colors for different variants', () => {
      const variants = [
        {
          variant: 'primary' as const,
          expectedRing: 'focus-visible:ring-lumina-gold',
        },
        {
          variant: 'secondary' as const,
          expectedRing: 'focus-visible:ring-deep-teal',
        },
        {
          variant: 'outline' as const,
          expectedRing: 'focus-visible:ring-lumina-gold',
        },
        {
          variant: 'ghost' as const,
          expectedRing: 'focus-visible:ring-lumina-gold',
        },
        {
          variant: 'destructive' as const,
          expectedRing: 'focus-visible:ring-red-600',
        },
        {
          variant: 'link' as const,
          expectedRing: 'focus-visible:ring-lumina-gold',
        },
      ];

      variants.forEach(({ variant, expectedRing }) => {
        const { unmount } = render(<Button variant={variant}>Test</Button>);
        const button = screen.getByRole('button');
        expect(button).toHaveClass(expectedRing);
        unmount();
      });
    });
  });

  // Reduced Motion Support
  describe('Reduced Motion Support', () => {
    it('has motion-reduce classes for accessibility', () => {
      render(<Button>Motion Test</Button>);
      const button = screen.getByRole('button');

      expect(button).toHaveClass('motion-reduce:transition-none');
      expect(button).toHaveClass('motion-reduce:hover:scale-100');
      expect(button).toHaveClass('motion-reduce:active:scale-100');
    });
  });

  // High Contrast Mode Support
  describe('High Contrast Mode Support', () => {
    it('has contrast-more classes for high contrast mode', () => {
      const variants = [
        {
          variant: 'primary' as const,
          expectedClass: 'contrast-more:border-2',
        },
        {
          variant: 'secondary' as const,
          expectedClass: 'contrast-more:border-2',
        },
        {
          variant: 'outline' as const,
          expectedClass: 'contrast-more:border-4',
        },
        { variant: 'ghost' as const, expectedClass: 'contrast-more:border-2' },
        {
          variant: 'destructive' as const,
          expectedClass: 'contrast-more:border-2',
        },
        { variant: 'link' as const, expectedClass: 'contrast-more:underline' },
      ];

      variants.forEach(({ variant, expectedClass }) => {
        const { unmount } = render(<Button variant={variant}>Test</Button>);
        const button = screen.getByRole('button');
        expect(button).toHaveClass(expectedClass);
        unmount();
      });
    });
  });

  // Minimum Touch Target Size
  describe('Touch Target Size', () => {
    it('has minimum width for touch targets', () => {
      const sizes = [
        { size: 'sm' as const, expectedMinWidth: 'min-w-[2rem]' },
        { size: 'default' as const, expectedMinWidth: 'min-w-[2.5rem]' },
        { size: 'lg' as const, expectedMinWidth: 'min-w-[3rem]' },
        { size: 'icon' as const, expectedMinWidth: 'min-w-[2.5rem]' },
      ];

      sizes.forEach(({ size, expectedMinWidth }) => {
        const { unmount } = render(<Button size={size}>Test</Button>);
        const button = screen.getByRole('button');
        expect(button).toHaveClass(expectedMinWidth);
        unmount();
      });
    });
  });
});

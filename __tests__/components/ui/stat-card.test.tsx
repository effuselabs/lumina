import { StatCard } from '@/components/ui/stat-card';
import { render, screen } from '@testing-library/react';
import { TrendingUp } from 'lucide-react';

describe('StatCard Component', () => {
  const defaultProps = {
    title: 'Total Revenue',
    value: 25000,
    icon: TrendingUp,
  };

  describe('Basic Rendering', () => {
    it('renders with required props', () => {
      render(<StatCard {...defaultProps} />);

      expect(screen.getByRole('article')).toBeInTheDocument();
      expect(screen.getByText('Total Revenue')).toBeInTheDocument();
      expect(screen.getByText('$25,000')).toBeInTheDocument();
    });

    it('formats currency values correctly', () => {
      render(<StatCard {...defaultProps} value={12345.67} />);
      expect(screen.getByText('$12,346')).toBeInTheDocument();
    });

    it('formats non-currency values correctly', () => {
      render(<StatCard {...defaultProps} title="Total Clients" value={1234} />);
      expect(screen.getByText('1,234')).toBeInTheDocument();
    });

    it('handles string values', () => {
      render(<StatCard {...defaultProps} value="Custom Value" />);
      expect(screen.getByText('Custom Value')).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('applies compact size class', () => {
      render(<StatCard {...defaultProps} size="compact" />);
      const card = screen.getByRole('article');
      expect(card).toHaveClass('stat-card-compact');
    });

    it('applies default size class', () => {
      render(<StatCard {...defaultProps} size="default" />);
      const card = screen.getByRole('article');
      expect(card).toHaveClass('stat-card-default');
    });

    it('applies large size class', () => {
      render(<StatCard {...defaultProps} size="large" />);
      const card = screen.getByRole('article');
      expect(card).toHaveClass('stat-card-large');
    });

    it('defaults to default size when not specified', () => {
      render(<StatCard {...defaultProps} />);
      const card = screen.getByRole('article');
      expect(card).toHaveClass('stat-card-default');
    });
  });

  describe('Change Indicators', () => {
    it('renders increase change indicator', () => {
      const change = {
        value: 12,
        type: 'increase' as const,
        period: 'this month',
      };
      render(<StatCard {...defaultProps} change={change} />);

      const changeElement = screen.getByLabelText(
        /increased by 12% this month/i
      );
      expect(changeElement).toBeInTheDocument();
      expect(screen.getByText(/↗ 12% this month/)).toBeInTheDocument();
    });

    it('renders decrease change indicator', () => {
      const change = {
        value: 8,
        type: 'decrease' as const,
        period: 'this week',
      };
      render(<StatCard {...defaultProps} change={change} />);

      const changeElement = screen.getByLabelText(/decreased by 8% this week/i);
      expect(changeElement).toBeInTheDocument();
      expect(screen.getByText(/↘ 8% this week/)).toBeInTheDocument();
    });

    it('renders neutral change indicator', () => {
      const change = { value: 0, type: 'neutral' as const, period: 'today' };
      render(<StatCard {...defaultProps} change={change} />);

      const changeElement = screen.getByLabelText(/no change by 0% today/i);
      expect(changeElement).toBeInTheDocument();
      expect(screen.getByText(/→ 0% today/)).toBeInTheDocument();
    });

    it('renders placeholder when no change provided', () => {
      render(<StatCard {...defaultProps} />);
      const placeholder = screen
        .getByRole('article')
        .querySelector('.stat-card-change-placeholder');
      expect(placeholder).toBeInTheDocument();
      expect(placeholder).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Action Links', () => {
    const action = { label: 'View Details', href: '/details' };

    it('renders action link when provided', () => {
      render(<StatCard {...defaultProps} action={action} />);

      const link = screen.getByRole('link', {
        name: /view details for total revenue/i,
      });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/details');
    });

    it('does not render action section when no action provided', () => {
      render(<StatCard {...defaultProps} />);
      const footer = screen
        .getByRole('article')
        .querySelector('.stat-card-footer');
      expect(footer).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('renders loading skeleton when loading is true', () => {
      render(<StatCard {...defaultProps} loading={true} />);

      const loadingCard = screen.getByRole('status');
      expect(loadingCard).toBeInTheDocument();
      expect(loadingCard).toHaveAttribute('aria-label', 'Loading statistics');
      expect(loadingCard).toHaveClass('stat-card-loading');
    });

    it('renders loading skeleton with action when action is provided', () => {
      const action = { label: 'View Details', href: '/details' };
      render(<StatCard {...defaultProps} action={action} loading={true} />);

      const skeletonAction = screen
        .getByRole('status')
        .querySelector('.stat-card-skeleton-action');
      expect(skeletonAction).toBeInTheDocument();
    });

    it('does not render actual content when loading', () => {
      render(<StatCard {...defaultProps} loading={true} />);

      expect(screen.queryByText('Total Revenue')).not.toBeInTheDocument();
      expect(screen.queryByText('$25,000')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper semantic markup', () => {
      render(<StatCard {...defaultProps} />);

      const article = screen.getByRole('article');
      expect(article).toHaveAttribute(
        'aria-labelledby',
        'stat-title-total-revenue'
      );

      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toHaveAttribute('id', 'stat-title-total-revenue');
    });

    it('has proper aria-label for value', () => {
      render(<StatCard {...defaultProps} />);
      const value = screen.getByLabelText('Value: $25,000');
      expect(value).toBeInTheDocument();
    });

    it('hides decorative elements from screen readers', () => {
      const action = { label: 'View Details', href: '/details' };
      render(<StatCard {...defaultProps} action={action} />);

      const iconContainer = screen
        .getByRole('article')
        .querySelector('.stat-card-icon-container');
      expect(iconContainer).toHaveAttribute('aria-hidden', 'true');

      const actionIcon = screen
        .getByRole('article')
        .querySelector('.stat-card-action-icon');
      expect(actionIcon).toHaveAttribute('aria-hidden', 'true');
    });

    it('generates unique IDs for multiple cards', () => {
      const { rerender } = render(
        <StatCard {...defaultProps} title="Revenue" />
      );
      const firstTitle = screen.getByRole('heading', { level: 3 });
      expect(firstTitle).toHaveAttribute('id', 'stat-title-revenue');

      rerender(<StatCard {...defaultProps} title="Total Clients" />);
      const secondTitle = screen.getByRole('heading', { level: 3 });
      expect(secondTitle).toHaveAttribute('id', 'stat-title-total-clients');
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      render(<StatCard {...defaultProps} className="custom-class" />);
      const card = screen.getByRole('article');
      expect(card).toHaveClass('custom-class');
    });

    it('maintains base classes with custom className', () => {
      render(
        <StatCard {...defaultProps} className="custom-class" size="compact" />
      );
      const card = screen.getByRole('article');
      expect(card).toHaveClass(
        'stat-card',
        'stat-card-compact',
        'custom-class'
      );
    });
  });

  describe('Edge Cases', () => {
    it('handles zero values correctly', () => {
      render(<StatCard {...defaultProps} value={0} />);
      expect(screen.getByText('$0')).toBeInTheDocument();
    });

    it('handles negative values correctly', () => {
      render(<StatCard {...defaultProps} value={-1000} />);
      expect(screen.getByText('-$1,000')).toBeInTheDocument();
    });

    it('handles very large numbers', () => {
      render(<StatCard {...defaultProps} value={1234567890} />);
      expect(screen.getByText('$1,234,567,890')).toBeInTheDocument();
    });

    it('handles titles with special characters', () => {
      render(<StatCard {...defaultProps} title="Revenue & Profit" />);
      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toHaveAttribute('id', 'stat-title-revenue-&-profit');
    });
  });
});

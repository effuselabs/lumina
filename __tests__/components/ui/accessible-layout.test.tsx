import { AccessibleLayout } from '@/components/ui/accessible-layout';
import { render, screen } from '@testing-library/react';

// Mock the ThemeProvider to avoid complex setup
jest.mock('@/components/theme-provider', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="theme-provider">{children}</div>
  ),
}));

describe('AccessibleLayout', () => {
  it('renders with ThemeProvider by default', () => {
    render(
      <AccessibleLayout>
        <div>Test content</div>
      </AccessibleLayout>
    );

    expect(screen.getByTestId('theme-provider')).toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders without ThemeProvider when disabled', () => {
    render(
      <AccessibleLayout enableThemeProvider={false}>
        <div>Test content</div>
      </AccessibleLayout>
    );

    expect(screen.queryByTestId('theme-provider')).not.toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders with custom theme configuration', () => {
    render(
      <AccessibleLayout defaultTheme="dark" themeStorageKey="custom-theme-key">
        <div>Test content</div>
      </AccessibleLayout>
    );

    // Verify the component renders with ThemeProvider
    expect(screen.getByTestId('theme-provider')).toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });
});

/**
 * @jest-environment jsdom
 */

import { ThemeProvider } from '@/components/theme-provider';
import { ThemeSwitcher } from '@/components/ui/theme-switcher';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe('Theme Switching Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);

    // Reset document classes
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = '';
  });

  it('should apply theme classes to document when switching themes', async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider defaultTheme="light">
        <ThemeSwitcher />
      </ThemeProvider>
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByLabelText('Switch to dark theme')).toBeInTheDocument();
    });

    // Verify initial light theme is applied
    await waitFor(() => {
      expect(document.documentElement).toHaveClass('light');
      expect(document.documentElement).toHaveAttribute('data-theme', 'light');
      expect(document.documentElement.style.colorScheme).toBe('light');
    });

    // Switch to dark theme
    await user.click(screen.getByLabelText('Switch to dark theme'));

    // Verify dark theme is applied
    await waitFor(() => {
      expect(document.documentElement).toHaveClass('dark');
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
      expect(document.documentElement.style.colorScheme).toBe('dark');
    });

    // Verify localStorage was called
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'lumina-theme',
      'dark'
    );
  });

  it('should handle system theme preference', async () => {
    // Mock system dark theme preference
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    render(
      <ThemeProvider defaultTheme="system">
        <ThemeSwitcher />
      </ThemeProvider>
    );

    // Wait for system theme to be detected and applied
    await waitFor(() => {
      expect(document.documentElement).toHaveClass('dark');
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    });
  });

  it('should persist theme preference across sessions', async () => {
    // Mock saved theme in localStorage
    localStorageMock.getItem.mockReturnValue('dark');

    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>
    );

    // Should load saved theme
    await waitFor(() => {
      expect(document.documentElement).toHaveClass('dark');
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    });
  });

  it('should handle compact theme switcher toggle', async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider defaultTheme="light">
        <ThemeSwitcher variant="compact" />
      </ThemeProvider>
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByLabelText('Switch to dark theme')).toBeInTheDocument();
    });

    // Toggle to dark
    await user.click(screen.getByLabelText('Switch to dark theme'));

    await waitFor(() => {
      expect(document.documentElement).toHaveClass('dark');
      expect(
        screen.getByLabelText('Switch to light theme')
      ).toBeInTheDocument();
    });

    // Toggle back to light
    await user.click(screen.getByLabelText('Switch to light theme'));

    await waitFor(() => {
      expect(document.documentElement).toHaveClass('light');
      expect(screen.getByLabelText('Switch to dark theme')).toBeInTheDocument();
    });
  });

  it('should prevent flash of unstyled content', () => {
    const { container } = render(
      <ThemeProvider>
        <div>Content</div>
      </ThemeProvider>
    );

    // Should render hidden content initially to prevent FOUC
    const hiddenDiv = container.querySelector(
      'div[style*="visibility: hidden"]'
    );
    expect(hiddenDiv).toBeInTheDocument();
  });

  it('should handle theme transitions smoothly', async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider defaultTheme="light" enableTransitions={true}>
        <ThemeSwitcher />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Switch to dark theme')).toBeInTheDocument();
    });

    // Switch theme and check for transition class
    await user.click(screen.getByLabelText('Switch to dark theme'));

    // Should briefly have transition class
    expect(document.documentElement).toHaveClass('theme-transitioning');

    // Should remove transition class after animation
    await waitFor(
      () => {
        expect(document.documentElement).not.toHaveClass('theme-transitioning');
      },
      { timeout: 300 }
    );
  });
});

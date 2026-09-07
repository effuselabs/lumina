/**
 * @jest-environment jsdom
 */

import { ThemeProvider } from '@/components/theme-provider';
import { useThemeSwitcher } from '@/hooks/use-theme-switcher';
import { act, renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';

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

function createWrapper(
  props: { defaultTheme?: 'light' | 'dark' | 'system' } = {}
) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ThemeProvider defaultTheme={props.defaultTheme || 'system'}>
        {children}
      </ThemeProvider>
    );
  };
}

describe('useThemeSwitcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);

    // Reset document classes
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = '';
  });

  describe('Basic Functionality', () => {
    it('should return correct initial state', async () => {
      const { result } = renderHook(() => useThemeSwitcher(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.theme).toBe('system');
        expect(result.current.resolvedTheme).toBe('light');
        expect(result.current.isDark).toBe(false);
        expect(result.current.isLight).toBe(true);
        expect(result.current.isSystem).toBe(true);
        expect(result.current.isTransitioning).toBe(false);
      });
    });

    it('should return correct state for dark theme', async () => {
      const { result } = renderHook(() => useThemeSwitcher(), {
        wrapper: createWrapper({ defaultTheme: 'dark' }),
      });

      await waitFor(() => {
        expect(result.current.theme).toBe('dark');
        expect(result.current.resolvedTheme).toBe('dark');
        expect(result.current.isDark).toBe(true);
        expect(result.current.isLight).toBe(false);
        expect(result.current.isSystem).toBe(false);
      });
    });
  });

  describe('Theme Switching Functions', () => {
    it('should switch to light theme', async () => {
      const { result } = renderHook(() => useThemeSwitcher(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.theme).toBe('system');
      });

      act(() => {
        result.current.setLightTheme();
      });

      await waitFor(() => {
        expect(result.current.theme).toBe('light');
        expect(result.current.resolvedTheme).toBe('light');
        expect(result.current.isLight).toBe(true);
        expect(result.current.isDark).toBe(false);
        expect(result.current.isSystem).toBe(false);
      });
    });

    it('should switch to dark theme', async () => {
      const { result } = renderHook(() => useThemeSwitcher(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.theme).toBe('system');
      });

      act(() => {
        result.current.setDarkTheme();
      });

      await waitFor(() => {
        expect(result.current.theme).toBe('dark');
        expect(result.current.resolvedTheme).toBe('dark');
        expect(result.current.isDark).toBe(true);
        expect(result.current.isLight).toBe(false);
        expect(result.current.isSystem).toBe(false);
      });
    });

    it('should switch to system theme', async () => {
      const { result } = renderHook(() => useThemeSwitcher(), {
        wrapper: createWrapper({ defaultTheme: 'light' }),
      });

      await waitFor(() => {
        expect(result.current.theme).toBe('light');
      });

      act(() => {
        result.current.setSystemTheme();
      });

      await waitFor(() => {
        expect(result.current.theme).toBe('system');
        expect(result.current.isSystem).toBe(true);
      });
    });

    it('should toggle theme correctly', async () => {
      const { result } = renderHook(() => useThemeSwitcher(), {
        wrapper: createWrapper({ defaultTheme: 'light' }),
      });

      await waitFor(() => {
        expect(result.current.theme).toBe('light');
      });

      // Toggle from light to dark
      act(() => {
        result.current.toggleTheme();
      });

      await waitFor(() => {
        expect(result.current.theme).toBe('dark');
        expect(result.current.isDark).toBe(true);
      });

      // Toggle from dark to light
      act(() => {
        result.current.toggleTheme();
      });

      await waitFor(() => {
        expect(result.current.theme).toBe('light');
        expect(result.current.isLight).toBe(true);
      });
    });

    it('should toggle from system theme to opposite of resolved theme', async () => {
      // Mock system preference as light
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: false, // light theme
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      const { result } = renderHook(() => useThemeSwitcher(), {
        wrapper: createWrapper({ defaultTheme: 'system' }),
      });

      await waitFor(() => {
        expect(result.current.theme).toBe('system');
        expect(result.current.resolvedTheme).toBe('light');
      });

      // Toggle should switch to dark (opposite of resolved light)
      act(() => {
        result.current.toggleTheme();
      });

      await waitFor(() => {
        expect(result.current.theme).toBe('dark');
        expect(result.current.isDark).toBe(true);
      });
    });
  });

  describe('Transition State', () => {
    it('should handle transition state correctly', async () => {
      const { result } = renderHook(() => useThemeSwitcher(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isTransitioning).toBe(false);
      });

      act(() => {
        result.current.setDarkTheme();
      });

      // Should be transitioning immediately after theme change
      expect(result.current.isTransitioning).toBe(true);

      // Should return to false after transition duration
      await waitFor(
        () => {
          expect(result.current.isTransitioning).toBe(false);
        },
        { timeout: 300 }
      );
    });

    it('should prevent rapid theme switching during transition', async () => {
      const { result } = renderHook(() => useThemeSwitcher(), {
        wrapper: createWrapper({ defaultTheme: 'light' }),
      });

      await waitFor(() => {
        expect(result.current.theme).toBe('light');
      });

      // Start first transition
      act(() => {
        result.current.setDarkTheme();
      });

      expect(result.current.isTransitioning).toBe(true);

      // Try to switch again during transition - should be ignored
      act(() => {
        result.current.setLightTheme();
      });

      // Should still be dark (second call ignored)
      await waitFor(
        () => {
          expect(result.current.theme).toBe('dark');
          expect(result.current.isTransitioning).toBe(false);
        },
        { timeout: 300 }
      );
    });
  });

  describe('Persistence', () => {
    it('should persist theme changes to localStorage', async () => {
      const { result } = renderHook(() => useThemeSwitcher(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setDarkTheme();
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'lumina-theme',
        'dark'
      );
    });
  });

  describe('System Theme Detection', () => {
    it('should detect system dark theme preference', async () => {
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

      const { result } = renderHook(() => useThemeSwitcher(), {
        wrapper: createWrapper({ defaultTheme: 'system' }),
      });

      await waitFor(() => {
        expect(result.current.theme).toBe('system');
        expect(result.current.resolvedTheme).toBe('dark');
        expect(result.current.isDark).toBe(true);
        expect(result.current.isSystem).toBe(true);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple rapid toggle calls', async () => {
      const { result } = renderHook(() => useThemeSwitcher(), {
        wrapper: createWrapper({ defaultTheme: 'light' }),
      });

      await waitFor(() => {
        expect(result.current.theme).toBe('light');
      });

      // Rapid toggle calls
      act(() => {
        result.current.toggleTheme();
        result.current.toggleTheme();
        result.current.toggleTheme();
      });

      // Should only process the first toggle due to transition protection
      await waitFor(
        () => {
          expect(result.current.theme).toBe('dark');
          expect(result.current.isTransitioning).toBe(false);
        },
        { timeout: 300 }
      );
    });

    it('should handle setting same theme multiple times', async () => {
      const { result } = renderHook(() => useThemeSwitcher(), {
        wrapper: createWrapper({ defaultTheme: 'light' }),
      });

      await waitFor(() => {
        expect(result.current.theme).toBe('light');
      });

      // Set same theme multiple times
      act(() => {
        result.current.setLightTheme();
        result.current.setLightTheme();
        result.current.setLightTheme();
      });

      // Should remain light and not trigger unnecessary transitions
      expect(result.current.theme).toBe('light');
      expect(result.current.isTransitioning).toBe(false);
    });
  });
});

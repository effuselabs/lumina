'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: ResolvedTheme;
  isTransitioning: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  enableTransitions?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'lumina-theme',
  enableTransitions = true,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
  const [mounted, setMounted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Get system theme preference
  const getSystemTheme = (): ResolvedTheme => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  };

  // Resolve theme based on current theme setting
  const resolveTheme = useCallback((currentTheme: Theme): ResolvedTheme => {
    if (currentTheme === 'system') {
      return getSystemTheme();
    }
    return currentTheme;
  }, []);

  // Apply theme to document with smooth transitions
  const applyTheme = useCallback(
    (resolvedTheme: ResolvedTheme, withTransition = true) => {
      const root = document.documentElement;

      // Start transition if enabled
      if (enableTransitions && withTransition && mounted) {
        setIsTransitioning(true);
        root.classList.add('theme-transitioning');
      }

      // Remove existing theme classes
      root.classList.remove('light', 'dark');
      root.removeAttribute('data-theme');

      // Apply new theme
      root.classList.add(resolvedTheme);
      root.setAttribute('data-theme', resolvedTheme);

      // Update color-scheme for better browser integration
      root.style.colorScheme = resolvedTheme;

      // Force CSS custom properties update
      if (resolvedTheme === 'dark') {
        root.style.setProperty('--color-background', '#0a0a0a');
        root.style.setProperty('--color-foreground', '#fafafa');
        root.style.setProperty('--color-surface', '#171717');
        root.style.setProperty('--color-border', '#27272a');
      } else {
        root.style.setProperty('--color-background', '#ffffff');
        root.style.setProperty('--color-foreground', '#0B2B33');
        root.style.setProperty('--color-surface', '#ffffff');
        root.style.setProperty('--color-border', '#e5e7eb');
      }

      // Update meta theme-color for mobile browsers
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute(
          'content',
          resolvedTheme === 'dark' ? '#0A0A0A' : '#F7F5F0'
        );
      }

      // End transition after animation duration
      if (enableTransitions && withTransition && mounted) {
        setTimeout(() => {
          setIsTransitioning(false);
          root.classList.remove('theme-transitioning');
        }, 200);
      }
    },
    [enableTransitions, mounted]
  );

  // Set theme with persistence and validation
  const setTheme = (newTheme: Theme) => {
    // Validate theme value
    if (!['light', 'dark', 'system'].includes(newTheme)) {
      return;
    }

    setThemeState(newTheme);

    // Persist theme preference
    try {
      localStorage.setItem(storageKey, newTheme);
    } catch {
      // Silently handle storage error
    }

    const resolved = resolveTheme(newTheme);
    setResolvedTheme(resolved);
    applyTheme(resolved, true);

    // Dispatch custom event for theme change
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('themeChange', {
          detail: { theme: newTheme, resolvedTheme: resolved },
        })
      );
    }
  };

  // Initialize theme on mount with improved error handling
  useEffect(() => {
    // Prevent flash of unstyled content by setting initial theme immediately
    const initializeTheme = () => {
      try {
        // Try to get saved theme from localStorage
        const savedTheme = localStorage.getItem(storageKey) as Theme | null;

        // Validate saved theme
        const isValidSavedTheme =
          savedTheme && ['light', 'dark', 'system'].includes(savedTheme);
        const initialTheme = isValidSavedTheme ? savedTheme : defaultTheme;

        setThemeState(initialTheme);
        const resolved = resolveTheme(initialTheme);
        setResolvedTheme(resolved);

        // Apply theme without transition on initial load
        applyTheme(resolved, false);
      } catch {
        // Fallback to default theme
        const resolved = resolveTheme(defaultTheme);
        setResolvedTheme(resolved);
        applyTheme(resolved, false);
      }
    };

    initializeTheme();
    setMounted(true);
  }, [defaultTheme, storageKey, applyTheme, resolveTheme]);

  // Listen for system theme changes with improved handling
  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        const resolved = e.matches ? 'dark' : 'light';
        setResolvedTheme(resolved);
        applyTheme(resolved, true);
      }
    };

    // Set initial system theme if theme is 'system'
    if (theme === 'system') {
      const resolved = getSystemTheme();
      if (resolved !== resolvedTheme) {
        setResolvedTheme(resolved);
        applyTheme(resolved, false);
      }
    }

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () =>
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [theme, mounted, resolvedTheme, applyTheme]);

  // Handle visibility change to sync theme when tab becomes active
  useEffect(() => {
    if (!mounted) return;

    const handleVisibilityChange = () => {
      if (!document.hidden && theme === 'system') {
        const currentSystemTheme = getSystemTheme();
        if (currentSystemTheme !== resolvedTheme) {
          setResolvedTheme(currentSystemTheme);
          applyTheme(currentSystemTheme, false);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [mounted, theme, resolvedTheme, applyTheme]);

  const contextValue: ThemeContextValue = {
    theme,
    setTheme,
    resolvedTheme,
    isTransitioning,
  };

  // Always provide context, but handle mounting state in the wrapper
  return (
    <ThemeContext.Provider value={contextValue}>
      {!mounted ? (
        <div
          style={{
            visibility: 'hidden',
            // Prevent layout shift during hydration
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
        >
          {children}
        </div>
      ) : (
        children
      )}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}

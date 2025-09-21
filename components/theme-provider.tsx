'use client';

import { createContext, useContext, useEffect, useState } from 'react';

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
    const resolveTheme = (currentTheme: Theme): ResolvedTheme => {
        if (currentTheme === 'system') {
            return getSystemTheme();
        }
        return currentTheme;
    };

    // Apply theme to document with smooth transitions
    const applyTheme = (resolvedTheme: ResolvedTheme, withTransition = true) => {
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
    };

    // Set theme with persistence and validation
    const setTheme = (newTheme: Theme) => {
        // Validate theme value
        if (!['light', 'dark', 'system'].includes(newTheme)) {
            console.warn('Invalid theme value:', newTheme);
            return;
        }

        setThemeState(newTheme);

        // Persist theme preference
        try {
            localStorage.setItem(storageKey, newTheme);
        } catch (error) {
            console.warn('Failed to save theme preference:', error);
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
                const isValidSavedTheme = savedTheme && ['light', 'dark', 'system'].includes(savedTheme);
                const initialTheme = isValidSavedTheme ? savedTheme : defaultTheme;

                setThemeState(initialTheme);
                const resolved = resolveTheme(initialTheme);
                setResolvedTheme(resolved);

                // Apply theme without transition on initial load
                applyTheme(resolved, false);
            } catch (error) {
                console.warn('Failed to load theme preference:', error);
                // Fallback to default theme
                const resolved = resolveTheme(defaultTheme);
                setResolvedTheme(resolved);
                applyTheme(resolved, false);
            }
        };

        initializeTheme();
        setMounted(true);
    }, [defaultTheme, storageKey]);

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
        return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    }, [theme, mounted, resolvedTheme]);

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
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [mounted, theme, resolvedTheme]);

    // Prevent hydration mismatch by not rendering until mounted
    if (!mounted) {
        return (
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
        );
    }

    const contextValue: ThemeContextValue = {
        theme,
        setTheme,
        resolvedTheme,
        isTransitioning,
    };

    return (
        <ThemeContext.Provider value={contextValue}>
            {children}
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
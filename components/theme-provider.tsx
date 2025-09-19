'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    resolvedTheme: ResolvedTheme;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
    children: React.ReactNode;
    defaultTheme?: Theme;
    storageKey?: string;
}

export function ThemeProvider({
    children,
    defaultTheme = 'system',
    storageKey = 'lumina-theme',
}: ThemeProviderProps) {
    const [theme, setThemeState] = useState<Theme>(defaultTheme);
    const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
    const [mounted, setMounted] = useState(false);

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

    // Apply theme to document
    const applyTheme = (resolvedTheme: ResolvedTheme) => {
        const root = document.documentElement;

        // Remove existing theme classes
        root.classList.remove('light', 'dark');
        root.removeAttribute('data-theme');

        // Apply new theme
        root.classList.add(resolvedTheme);
        root.setAttribute('data-theme', resolvedTheme);

        // Update color-scheme for better browser integration
        root.style.colorScheme = resolvedTheme;
    };

    // Set theme with persistence
    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);

        try {
            localStorage.setItem(storageKey, newTheme);
        } catch (error) {
            console.warn('Failed to save theme preference:', error);
        }

        const resolved = resolveTheme(newTheme);
        setResolvedTheme(resolved);
        applyTheme(resolved);
    };

    // Initialize theme on mount
    useEffect(() => {
        try {
            // Try to get saved theme from localStorage
            const savedTheme = localStorage.getItem(storageKey) as Theme | null;
            const initialTheme = savedTheme || defaultTheme;

            setThemeState(initialTheme);
            const resolved = resolveTheme(initialTheme);
            setResolvedTheme(resolved);
            applyTheme(resolved);
        } catch (error) {
            console.warn('Failed to load theme preference:', error);
            // Fallback to default theme
            const resolved = resolveTheme(defaultTheme);
            setResolvedTheme(resolved);
            applyTheme(resolved);
        }

        setMounted(true);
    }, [defaultTheme, storageKey]);

    // Listen for system theme changes
    useEffect(() => {
        if (!mounted) return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleSystemThemeChange = () => {
            if (theme === 'system') {
                const resolved = getSystemTheme();
                setResolvedTheme(resolved);
                applyTheme(resolved);
            }
        };

        mediaQuery.addEventListener('change', handleSystemThemeChange);
        return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    }, [theme, mounted]);

    // Prevent hydration mismatch by not rendering until mounted
    if (!mounted) {
        return (
            <div style={{ visibility: 'hidden' }}>
                {children}
            </div>
        );
    }

    const contextValue: ThemeContextValue = {
        theme,
        setTheme,
        resolvedTheme,
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
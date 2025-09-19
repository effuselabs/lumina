'use client';

import { useTheme } from '@/components/theme-provider';
import { getOppositeTheme, type ResolvedTheme } from '@/lib/theme-utils';
import { useCallback, useEffect, useState } from 'react';

/**
 * Enhanced theme switching hook with additional utilities
 */
export function useThemeSwitcher() {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [isTransitioning, setIsTransitioning] = useState(false);

    /**
     * Toggle between light and dark themes
     * If current theme is 'system', it toggles to the opposite of the resolved theme
     */
    const toggleTheme = useCallback(() => {
        setIsTransitioning(true);

        if (theme === 'system') {
            // If system theme, switch to opposite of current resolved theme
            const opposite = getOppositeTheme(resolvedTheme);
            setTheme(opposite);
        } else {
            // If explicit theme, toggle to opposite
            const opposite = getOppositeTheme(theme as ResolvedTheme);
            setTheme(opposite);
        }

        // Reset transition state after animation
        setTimeout(() => setIsTransitioning(false), 200);
    }, [theme, resolvedTheme, setTheme]);

    /**
     * Set theme to light mode
     */
    const setLightTheme = useCallback(() => {
        setIsTransitioning(true);
        setTheme('light');
        setTimeout(() => setIsTransitioning(false), 200);
    }, [setTheme]);

    /**
     * Set theme to dark mode
     */
    const setDarkTheme = useCallback(() => {
        setIsTransitioning(true);
        setTheme('dark');
        setTimeout(() => setIsTransitioning(false), 200);
    }, [setTheme]);

    /**
     * Set theme to system preference
     */
    const setSystemTheme = useCallback(() => {
        setIsTransitioning(true);
        setTheme('system');
        setTimeout(() => setIsTransitioning(false), 200);
    }, [setTheme]);

    /**
     * Check if current theme is dark
     */
    const isDark = resolvedTheme === 'dark';

    /**
     * Check if current theme is light
     */
    const isLight = resolvedTheme === 'light';

    /**
     * Check if theme is set to system preference
     */
    const isSystem = theme === 'system';

    return {
        // Current theme state
        theme,
        resolvedTheme,
        isDark,
        isLight,
        isSystem,
        isTransitioning,

        // Theme setters
        setTheme,
        setLightTheme,
        setDarkTheme,
        setSystemTheme,
        toggleTheme,
    };
}

/**
 * Hook for detecting system theme changes
 */
export function useSystemTheme() {
    const [systemTheme, setSystemTheme] = useState<ResolvedTheme>('light');

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Set initial system theme
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

        // Listen for changes
        const handleChange = (e: MediaQueryListEvent) => {
            setSystemTheme(e.matches ? 'dark' : 'light');
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    return systemTheme;
}

/**
 * Hook for theme-aware CSS classes
 */
export function useThemeClasses() {
    const { resolvedTheme, isDark, isLight } = useThemeSwitcher();

    return {
        theme: resolvedTheme,
        themeClass: resolvedTheme,
        isDark,
        isLight,
        // Utility classes for conditional styling
        lightClass: isLight ? 'theme-light' : '',
        darkClass: isDark ? 'theme-dark' : '',
        themeSpecificClass: `theme-${resolvedTheme}`,
    };
}

/**
 * Hook for theme transition animations
 */
export function useThemeTransition() {
    const [isTransitioning, setIsTransitioning] = useState(false);
    const { theme } = useTheme();

    useEffect(() => {
        setIsTransitioning(true);
        const timer = setTimeout(() => setIsTransitioning(false), 200);
        return () => clearTimeout(timer);
    }, [theme]);

    return {
        isTransitioning,
        transitionClass: isTransitioning ? 'theme-transitioning' : '',
    };
}
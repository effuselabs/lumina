/**
 * Theme utility functions for Lumina design system
 * Provides helper functions for theme detection, validation, and manipulation
 */

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

/**
 * Detects the user's system theme preference
 */
export function getSystemTheme(): ResolvedTheme {
    if (typeof window === 'undefined') {
        return 'light'; // Default for SSR
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
}

/**
 * Resolves a theme setting to an actual theme
 */
export function resolveTheme(theme: Theme): ResolvedTheme {
    if (theme === 'system') {
        return getSystemTheme();
    }
    return theme;
}

/**
 * Validates if a string is a valid theme value
 */
export function isValidTheme(value: string): value is Theme {
    return ['light', 'dark', 'system'].includes(value);
}

/**
 * Gets the stored theme from localStorage with fallback
 */
export function getStoredTheme(
    storageKey: string = 'lumina-theme',
    fallback: Theme = 'system'
): Theme {
    if (typeof window === 'undefined') {
        return fallback;
    }

    try {
        const stored = localStorage.getItem(storageKey);
        if (stored && isValidTheme(stored)) {
            return stored;
        }
    } catch (error) {
        console.warn('Failed to read theme from localStorage:', error);
    }

    return fallback;
}

/**
 * Stores theme preference in localStorage
 */
export function setStoredTheme(
    theme: Theme,
    storageKey: string = 'lumina-theme'
): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        localStorage.setItem(storageKey, theme);
    } catch (error) {
        console.warn('Failed to save theme to localStorage:', error);
    }
}

/**
 * Applies theme classes and attributes to the document
 */
export function applyThemeToDocument(resolvedTheme: ResolvedTheme): void {
    if (typeof document === 'undefined') {
        return;
    }

    const root = document.documentElement;

    // Remove existing theme classes and attributes
    root.classList.remove('light', 'dark');
    root.removeAttribute('data-theme');

    // Apply new theme
    root.classList.add(resolvedTheme);
    root.setAttribute('data-theme', resolvedTheme);

    // Update color-scheme for better browser integration
    root.style.colorScheme = resolvedTheme;
}

/**
 * Creates a media query listener for system theme changes
 */
export function createSystemThemeListener(
    callback: (isDark: boolean) => void
): () => void {
    if (typeof window === 'undefined') {
        return () => { }; // No-op for SSR
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
        callback(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    // Return cleanup function
    return () => {
        mediaQuery.removeEventListener('change', handleChange);
    };
}

/**
 * Gets the opposite theme for toggle functionality
 */
export function getOppositeTheme(theme: ResolvedTheme): ResolvedTheme {
    return theme === 'light' ? 'dark' : 'light';
}

/**
 * Theme configuration for different contexts
 */
export const THEME_CONFIG = {
    STORAGE_KEY: 'lumina-theme',
    DEFAULT_THEME: 'system' as Theme,
    TRANSITION_DURATION: 200, // milliseconds
    MEDIA_QUERY: '(prefers-color-scheme: dark)',
} as const;

/**
 * CSS custom properties that change with theme
 */
export const THEME_CSS_VARIABLES = [
    '--color-background',
    '--color-foreground',
    '--color-surface',
    '--color-border',
    '--color-primary',
    '--color-secondary',
    '--dashboard-background',
    '--sidebar-background',
] as const;

/**
 * Validates theme transition performance
 */
export function validateThemeTransition(): Promise<boolean> {
    return new Promise((resolve) => {
        if (typeof window === 'undefined') {
            resolve(true);
            return;
        }

        const startTime = performance.now();

        // Trigger a theme change and measure performance
        requestAnimationFrame(() => {
            const endTime = performance.now();
            const duration = endTime - startTime;

            // Theme transition should be under 100ms for smooth UX
            resolve(duration < 100);
        });
    });
}
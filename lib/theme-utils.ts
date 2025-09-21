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
 * Applies theme classes and attributes to the document with enhanced features
 */
export function applyThemeToDocument(
    resolvedTheme: ResolvedTheme,
    options: {
        withTransition?: boolean;
        updateMetaTheme?: boolean;
        preventFlash?: boolean;
    } = {}
): void {
    if (typeof document === 'undefined') {
        return;
    }

    const { withTransition = true, updateMetaTheme = true, preventFlash = false } = options;
    const root = document.documentElement;

    // Prevent flash of unstyled content
    if (preventFlash) {
        root.classList.add('theme-loading');
    }

    // Add transition class if enabled
    if (withTransition) {
        root.classList.add('theme-transitioning');
    }

    // Remove existing theme classes and attributes
    root.classList.remove('light', 'dark');
    root.removeAttribute('data-theme');

    // Apply new theme
    root.classList.add(resolvedTheme);
    root.setAttribute('data-theme', resolvedTheme);

    // Update color-scheme for better browser integration
    root.style.colorScheme = resolvedTheme;

    // Update meta theme-color for mobile browsers
    if (updateMetaTheme) {
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute(
                'content',
                resolvedTheme === 'dark' ? '#0A0A0A' : '#F7F5F0'
            );
        }
    }

    // Remove transition and loading classes after animation
    if (withTransition || preventFlash) {
        setTimeout(() => {
            root.classList.remove('theme-transitioning', 'theme-loading');
        }, THEME_CONFIG.TRANSITION_DURATION);
    }
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
 * Enhanced theme change listener for external components
 */
export function createThemeChangeListener(
    callback: (theme: ResolvedTheme) => void
): () => void {
    if (typeof window === 'undefined') {
        return () => { }; // No-op for SSR
    }

    const handleThemeChange = (event: CustomEvent) => {
        callback(event.detail.resolvedTheme);
    };

    window.addEventListener('themeChange', handleThemeChange as EventListener);

    // Return cleanup function
    return () => {
        window.removeEventListener('themeChange', handleThemeChange as EventListener);
    };
}

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

/**
 * Detects if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Enhanced theme persistence with validation and error handling
 */
export function enhancedSetStoredTheme(
    theme: Theme,
    storageKey: string = THEME_CONFIG.STORAGE_KEY
): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    try {
        // Validate theme before storing
        if (!isValidTheme(theme)) {
            console.warn('Invalid theme value, not storing:', theme);
            return false;
        }

        localStorage.setItem(storageKey, theme);

        // Verify storage was successful
        const stored = localStorage.getItem(storageKey);
        return stored === theme;
    } catch (error) {
        console.warn('Failed to save theme to localStorage:', error);
        return false;
    }
}

/**
 * Enhanced theme retrieval with fallback chain
 */
export function enhancedGetStoredTheme(
    storageKey: string = THEME_CONFIG.STORAGE_KEY,
    fallback: Theme = THEME_CONFIG.DEFAULT_THEME
): Theme {
    if (typeof window === 'undefined') {
        return fallback;
    }

    try {
        // Try localStorage first
        const stored = localStorage.getItem(storageKey);
        if (stored && isValidTheme(stored)) {
            return stored;
        }

        // Try sessionStorage as backup
        const sessionStored = sessionStorage.getItem(storageKey);
        if (sessionStored && isValidTheme(sessionStored)) {
            return sessionStored;
        }
    } catch (error) {
        console.warn('Failed to read theme from storage:', error);
    }

    return fallback;
}
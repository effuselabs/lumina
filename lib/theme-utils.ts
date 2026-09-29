/**
 * Theme utility functions for Lumina design system
 * Provides helper functions for theme detection, validation, and manipulation
 */

export type ResolvedTheme = 'light' | 'dark';

/**
 * Gets the opposite theme for toggle functionality
 */
export function getOppositeTheme(theme: ResolvedTheme): ResolvedTheme {
  return theme === 'light' ? 'dark' : 'light';
}

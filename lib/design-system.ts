/**
 * Lumina Design System Utilities
 * Based on Lumina Product Design System v2.0
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Lumina Design System Colors
 * Matches the official design system v2.0
 */
export const luminaColors = {
  // Primary Brand Colors
  gold: '#FFD25A',
  coral: '#FF7A5A',
  deepTeal: '#0B2B33',

  // UI Colors
  textPrimary: '#1D2D35', // Off-Black
  textSecondary: '#808285', // Medium Grey
  backgroundPrimary: '#FFFFFF',
  backgroundSecondary: '#F1F3F5', // Light Grey
  borderPrimary: '#E4E6E7', // Light Neutral

  // Functional Colors
  success: '#22C58B',
  warning: '#FFB800',
  error: '#E5484D',

  // Tertiary Colors
  clarityBlue: '#89CFF0',
  softPeach: '#FFE5B4',
} as const;

/**
 * Lumina Typography Classes
 * Based on the design system typography scale
 */
export const luminaTypography = {
  h1: 'text-lumina-h1 text-lumina-primary', // 32px, Bold, 40px line height
  h2: 'text-lumina-h2 text-lumina-primary', // 24px, SemiBold, 32px line height
  h3: 'text-lumina-h3 text-lumina-primary', // 20px, SemiBold, 28px line height
  bodyLarge: 'text-lumina-body-lg text-lumina-primary', // 16px, Regular, 24px line height
  bodySmall: 'text-lumina-body-sm text-lumina-primary', // 14px, Regular, 20px line height
  caption: 'text-lumina-caption text-lumina-secondary', // 12px, Medium, 16px line height
} as const;

/**
 * Lumina Component Classes
 * Consistent styling for common UI patterns
 */
export const luminaComponents = {
  // Form Components
  formLabel: 'lumina-form-label',
  formInput: 'lumina-form-input',
  formDescription: 'text-sm text-lumina-secondary',
  formError: 'text-sm text-error',

  // Dialog Components
  dialogTitle: 'lumina-dialog-title',
  dialogDescription: 'lumina-dialog-description',

  // Button Variants
  buttonPrimary:
    'bg-lumina-radiant hover:bg-lumina-radiant-hover text-white font-medium',
  buttonSecondary:
    'bg-white hover:bg-soft-peach text-deep-teal border border-deep-teal font-medium',
  buttonOutline:
    'border border-border-primary hover:bg-background-secondary text-lumina-primary',

  // Card Components
  card: 'bg-white border border-border-primary rounded-lg shadow-sm',
  cardHeader: 'p-6 pb-4',
  cardContent: 'p-6 pt-0',
  cardTitle: 'text-lg font-semibold text-lumina-primary',
  cardDescription: 'text-sm text-lumina-secondary',
} as const;

/**
 * Lumina Spacing System
 * Based on 8px grid system
 */
export const luminaSpacing = {
  xs: '8px', // 0.5rem
  sm: '16px', // 1rem
  md: '24px', // 1.5rem
  lg: '32px', // 2rem
  xl: '48px', // 3rem
} as const;

/**
 * Helper function to get consistent Lumina styling
 */
export function getLuminaStyles(component: keyof typeof luminaComponents) {
  return luminaComponents[component];
}

/**
 * Helper function to get consistent Lumina typography
 */
export function getLuminaTypography(variant: keyof typeof luminaTypography) {
  return luminaTypography[variant];
}

/**
 * Utility to create consistent form field styling
 */
export function createFormFieldClasses(hasError = false) {
  return cn(
    luminaComponents.formInput,
    hasError && 'border-error focus:ring-error'
  );
}

/**
 * Utility to create consistent button styling
 */
export function createButtonClasses(
  variant: 'primary' | 'secondary' | 'outline' = 'primary'
) {
  const baseClasses =
    'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50';

  switch (variant) {
    case 'primary':
      return cn(baseClasses, luminaComponents.buttonPrimary);
    case 'secondary':
      return cn(baseClasses, luminaComponents.buttonSecondary);
    case 'outline':
      return cn(baseClasses, luminaComponents.buttonOutline);
    default:
      return cn(baseClasses, luminaComponents.buttonPrimary);
  }
}

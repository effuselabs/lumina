/**
 * Tree-shakeable component exports for optimal bundle size
 * Only import what you need to reduce bundle size
 */

// Core UI Components - Most commonly used
export { Button, buttonVariants } from './button';
export type { ButtonProps } from './button';

// Performance monitoring variant (client-side only)

export { Spinner, spinnerVariants } from './spinner';
export type { SpinnerProps } from './spinner';

export { StatCard } from './stat-card';
export type { StatCardProps } from './stat-card';

// Form Components - Lazy loaded for better code splitting
export const Input = () => import('./input').then(m => m.Input);
export const Select = () => import('./select').then(m => m.Select);
export const Textarea = () => import('./textarea').then(m => m.Textarea);
export const FormField = () => import('./form-field').then(m => m.FormField);

// Layout Components - Lazy loaded
export const PageHeader = () => import('./page-header').then(m => m.PageHeader);
export const Card = () => import('./card').then(m => m.Card);

// Navigation Components - Lazy loaded
export const NavigationMenu = () =>
  import('./navigation-menu').then(m => m.NavigationMenu);

// Overlay Components - Lazy loaded for better performance
export const Dialog = () => import('./dialog').then(m => m.Dialog);
export const Tooltip = () => import('./tooltip').then(m => m.Tooltip);

// Data Display Components - Lazy loaded
export const Table = () => import('./table').then(m => m.Table);
export const Badge = () => import('./badge').then(m => m.Badge);
export const Avatar = () => import('./avatar').then(m => m.Avatar);

// Feedback Components - Lazy loaded
export const Alert = () => import('./alert').then(m => m.Alert);
export const Toast = () => import('./toast').then(m => m.Toast);
export const Progress = () => import('./progress').then(m => m.Progress);

// Utility function for dynamic imports with error handling
export async function loadComponent<T>(
  importFn: () => Promise<{ [key: string]: T }>,
  componentName: string
): Promise<T> {
  try {
    const moduleResult = await importFn();
    return moduleResult[componentName];
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to load component ${componentName}:`, error);
    throw error;
  }
}

// Bundle analysis helpers
export const COMPONENT_SIZES = {
  // Core components (always loaded)
  Button: 'small', // ~2KB
  Spinner: 'small', // ~1KB
  StatCard: 'medium', // ~4KB

  // Form components
  Input: 'small', // ~2KB
  Select: 'medium', // ~5KB
  Textarea: 'small', // ~2KB
  FormField: 'medium', // ~3KB

  // Layout components
  PageHeader: 'medium', // ~3KB
  Card: 'small', // ~2KB

  // Navigation components
  NavigationMenu: 'large', // ~8KB

  // Overlay components
  Dialog: 'large', // ~10KB
  Tooltip: 'medium', // ~4KB

  // Data display components
  Table: 'large', // ~8KB
  Badge: 'small', // ~1KB
  Avatar: 'small', // ~2KB

  // Feedback components
  Alert: 'medium', // ~3KB
  Toast: 'medium', // ~4KB
  Progress: 'small', // ~2KB
} as const;

// Component loading priorities
export const LOADING_PRIORITIES = {
  critical: ['Button', 'Spinner', 'StatCard'],
  high: ['Input', 'FormField', 'PageHeader', 'Card'],
  medium: ['Select', 'Textarea', 'Badge', 'Avatar', 'Alert'],
  low: ['NavigationMenu', 'Dialog', 'Table', 'Toast', 'Progress'],
  lazy: ['Tooltip'],
} as const;

// Performance recommendations
export function getComponentLoadingRecommendations(usedComponents: string[]): {
  preload: string[];
  lazy: string[];
  critical: string[];
} {
  const critical = usedComponents.filter(comp =>
    (LOADING_PRIORITIES.critical as readonly string[]).includes(comp)
  );

  const preload = usedComponents.filter(comp =>
    (LOADING_PRIORITIES.high as readonly string[]).includes(comp)
  );

  const lazy = usedComponents.filter(
    comp =>
      (LOADING_PRIORITIES.low as readonly string[]).includes(comp) ||
      (LOADING_PRIORITIES.lazy as readonly string[]).includes(comp)
  );

  return { preload, lazy, critical };
}

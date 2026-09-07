import { test } from '@playwright/test';
import { runComponentVisualTests } from '../utils/visual-test-helpers';

/**
 * Button Component Visual Regression Tests
 *
 * Tests all button variants, sizes, and states across themes and breakpoints
 */

test.describe('Button Visual Tests', () => {
  test('Button component variants and states', async ({ page }) => {
    await runComponentVisualTests(page, {
      componentName: 'button',
      route: '/design-system/buttons',
      variants: ['primary', 'secondary', 'outline', 'ghost', 'destructive'],
      sizes: ['sm', 'md', 'lg'],
      states: ['default', 'hover', 'focus', 'active'],
      testLoading: true,
      testError: false,
      testAccessibility: true,
    });
  });

  test('Button with icons', async ({ page }) => {
    await runComponentVisualTests(page, {
      componentName: 'button-icon',
      route: '/design-system/buttons',
      variants: ['primary', 'secondary', 'outline'],
      sizes: ['sm', 'md', 'lg'],
      testLoading: false,
      testError: false,
      testAccessibility: true,
    });
  });

  test('Button loading states', async ({ page }) => {
    await runComponentVisualTests(page, {
      componentName: 'button-loading',
      route: '/design-system/buttons',
      variants: ['primary', 'secondary'],
      sizes: ['md'],
      states: ['default'],
      testLoading: true,
      testError: false,
      testAccessibility: false,
    });
  });

  test('Button disabled states', async ({ page }) => {
    await runComponentVisualTests(page, {
      componentName: 'button-disabled',
      route: '/design-system/buttons',
      variants: ['primary', 'secondary', 'outline', 'ghost', 'destructive'],
      sizes: ['md'],
      states: ['default'],
      testLoading: false,
      testError: false,
      testAccessibility: true,
    });
  });
});

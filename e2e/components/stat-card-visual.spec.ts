import { test } from '@playwright/test';
import { runComponentVisualTests } from '../utils/visual-test-helpers';

/**
 * StatCard Component Visual Regression Tests
 * 
 * Tests stat card variants, sizes, and states across themes and breakpoints
 */

test.describe('StatCard Visual Tests', () => {
    test('StatCard component variants', async ({ page }) => {
        await runComponentVisualTests(page, {
            componentName: 'stat-card',
            route: '/design-system/stat-cards',
            variants: ['default', 'compact', 'large'],
            states: ['default', 'hover'],
            testLoading: true,
            testError: false,
            testAccessibility: true
        });
    });

    test('StatCard with trends', async ({ page }) => {
        await runComponentVisualTests(page, {
            componentName: 'stat-card-trend',
            route: '/design-system/stat-cards',
            variants: ['increase', 'decrease', 'neutral'],
            states: ['default', 'hover'],
            testLoading: false,
            testError: false,
            testAccessibility: true
        });
    });

    test('StatCard loading states', async ({ page }) => {
        await runComponentVisualTests(page, {
            componentName: 'stat-card-loading',
            route: '/design-system/stat-cards',
            variants: ['skeleton'],
            states: ['default'],
            testLoading: true,
            testError: false,
            testAccessibility: false
        });
    });

    test('StatCard with icons', async ({ page }) => {
        await runComponentVisualTests(page, {
            componentName: 'stat-card-icon',
            route: '/design-system/stat-cards',
            variants: ['revenue', 'appointments', 'clients'],
            states: ['default', 'hover'],
            testLoading: false,
            testError: false,
            testAccessibility: true
        });
    });
});
import { test } from '@playwright/test';
import { runComponentVisualTests } from '../utils/visual-test-helpers';

/**
 * Form Components Visual Regression Tests
 * 
 * Tests all form components (Input, Select, Textarea, FormField) across themes and breakpoints
 */

test.describe('Form Components Visual Tests', () => {
    test('Input component variants and states', async ({ page }) => {
        await runComponentVisualTests(page, {
            componentName: 'input',
            route: '/design-system/forms',
            variants: ['default', 'error', 'success'],
            states: ['default', 'focus', 'hover'],
            testLoading: false,
            testError: true,
            testAccessibility: true
        });
    });

    test('Input disabled states', async ({ page }) => {
        await runComponentVisualTests(page, {
            componentName: 'input-disabled',
            route: '/design-system/forms',
            variants: ['default'],
            states: ['default'],
            testLoading: false,
            testError: false,
            testAccessibility: true
        });
    });

    test('Select component variants and states', async ({ page }) => {
        await runComponentVisualTests(page, {
            componentName: 'select',
            route: '/design-system/forms',
            variants: ['default', 'error'],
            states: ['default', 'focus', 'hover'],
            testLoading: false,
            testError: true,
            testAccessibility: true
        });
    });

    test('Select open state', async ({ page }) => {
        await page.goto('/design-system/forms');
        await page.waitForLoadState('networkidle');

        // Test select dropdown in both themes
        const themes = ['light', 'dark'];
        const breakpoints = [
            { name: 'mobile', width: 375, height: 667 },
            { name: 'desktop', width: 1440, height: 900 }
        ];

        for (const theme of themes) {
            for (const breakpoint of breakpoints) {
                await page.setViewportSize(breakpoint);
                await page.evaluate((themeValue) => {
                    document.documentElement.setAttribute('data-theme', themeValue);
                }, theme);
                await page.waitForTimeout(500);

                const selectTrigger = page.locator('[data-testid="select-default"]');
                if (await selectTrigger.count() > 0) {
                    await selectTrigger.click();
                    await page.waitForTimeout(300);

                    const selectContent = page.locator('[data-testid="select-content"]');
                    if (await selectContent.count() > 0) {
                        await page.screenshot({
                            path: `test-results/select-open-${theme}-${breakpoint.name}.png`,
                            clip: await selectContent.boundingBox() || undefined
                        });
                    }

                    // Close dropdown
                    await page.keyboard.press('Escape');
                    await page.waitForTimeout(300);
                }
            }
        }
    });

    test('Textarea component variants and states', async ({ page }) => {
        await runComponentVisualTests(page, {
            componentName: 'textarea',
            route: '/design-system/forms',
            variants: ['default', 'error'],
            states: ['default', 'focus', 'hover'],
            testLoading: false,
            testError: true,
            testAccessibility: true
        });
    });

    test('FormField component with labels and errors', async ({ page }) => {
        await runComponentVisualTests(page, {
            componentName: 'form-field',
            route: '/design-system/forms',
            variants: ['default', 'required', 'error', 'success'],
            states: ['default'],
            testLoading: false,
            testError: true,
            testAccessibility: true
        });
    });

    test('Form validation states', async ({ page }) => {
        await runComponentVisualTests(page, {
            componentName: 'form-validation',
            route: '/design-system/forms',
            variants: ['valid', 'invalid', 'pending'],
            states: ['default'],
            testLoading: true,
            testError: true,
            testAccessibility: true
        });
    });

    test('Complex form layouts', async ({ page }) => {
        await runComponentVisualTests(page, {
            componentName: 'form-layout',
            route: '/design-system/forms',
            variants: ['single-column', 'two-column', 'inline'],
            states: ['default'],
            testLoading: false,
            testError: false,
            testAccessibility: true
        });
    });
});
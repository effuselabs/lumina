import { test } from '@playwright/test';
import { runComponentVisualTests } from '../utils/visual-test-helpers';

/**
 * Layout Components Visual Regression Tests
 * 
 * Tests page headers, grid systems, and layout components across themes and breakpoints
 */

test.describe('Layout Components Visual Tests', () => {
    test('PageHeader component variants', async ({ page }) => {
        await runComponentVisualTests(page, {
            componentName: 'page-header',
            route: '/design-system/page-header',
            variants: ['default', 'compact', 'with-breadcrumbs', 'with-actions'],
            states: ['default'],
            testLoading: false,
            testError: false,
            testAccessibility: true
        });
    });

    test('Grid system layouts', async ({ page }) => {
        await runComponentVisualTests(page, {
            componentName: 'grid',
            route: '/design-system/grid-system',
            variants: ['auto-fit', 'fixed-columns', 'compact'],
            states: ['default'],
            testLoading: false,
            testError: false,
            testAccessibility: true
        });
    });

    test('Card layouts in grid', async ({ page }) => {
        await runComponentVisualTests(page, {
            componentName: 'card-grid',
            route: '/design-system/grid-component',
            variants: ['default', 'compact', 'large'],
            states: ['default'],
            testLoading: false,
            testError: false,
            testAccessibility: true
        });
    });

    test('Responsive grid behavior', async ({ page }) => {
        await page.goto('/design-system/grid-system');
        await page.waitForLoadState('networkidle');

        const themes = ['light', 'dark'];
        const breakpoints = [
            { name: 'mobile', width: 375, height: 667 },
            { name: 'tablet', width: 768, height: 1024 },
            { name: 'desktop', width: 1440, height: 900 },
            { name: 'wide', width: 1920, height: 1080 }
        ];

        for (const theme of themes) {
            await page.evaluate((themeValue) => {
                document.documentElement.setAttribute('data-theme', themeValue);
            }, theme);
            await page.waitForTimeout(500);

            for (const breakpoint of breakpoints) {
                await page.setViewportSize(breakpoint);
                await page.waitForTimeout(300);

                const gridContainer = page.locator('[data-testid="responsive-grid"]');
                if (await gridContainer.count() > 0) {
                    await page.screenshot({
                        path: `test-results/responsive-grid-${theme}-${breakpoint.name}.png`,
                        fullPage: false,
                        clip: await gridContainer.boundingBox() || undefined
                    });
                }
            }
        }
    });

    test('Navigation components', async ({ page }) => {
        // Test navigation in dashboard context
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        await runComponentVisualTests(page, {
            componentName: 'navigation',
            route: '/dashboard',
            variants: ['sidebar', 'mobile-menu'],
            states: ['default', 'hover'],
            testLoading: false,
            testError: false,
            testAccessibility: true
        });
    });

    test('Skip links and accessibility navigation', async ({ page }) => {
        await runComponentVisualTests(page, {
            componentName: 'skip-links',
            route: '/design-system',
            variants: ['default'],
            states: ['default', 'focus'],
            testLoading: false,
            testError: false,
            testAccessibility: true
        });
    });

    test('Layout with sidebar', async ({ page }) => {
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        const themes = ['light', 'dark'];
        const breakpoints = [
            { name: 'mobile', width: 375, height: 667 },
            { name: 'tablet', width: 768, height: 1024 },
            { name: 'desktop', width: 1440, height: 900 }
        ];

        for (const theme of themes) {
            await page.evaluate((themeValue) => {
                document.documentElement.setAttribute('data-theme', themeValue);
            }, theme);
            await page.waitForTimeout(500);

            for (const breakpoint of breakpoints) {
                await page.setViewportSize(breakpoint);
                await page.waitForTimeout(300);

                // Test main layout
                const layout = page.locator('[data-testid="main-layout"]');
                if (await layout.count() > 0) {
                    await page.screenshot({
                        path: `test-results/main-layout-${theme}-${breakpoint.name}.png`,
                        fullPage: true
                    });
                }

                // Test sidebar on mobile (if collapsed/expanded)
                if (breakpoint.name === 'mobile') {
                    const mobileMenuButton = page.locator('[data-testid="mobile-menu-button"]');
                    if (await mobileMenuButton.count() > 0) {
                        await mobileMenuButton.click();
                        await page.waitForTimeout(300);

                        await page.screenshot({
                            path: `test-results/mobile-menu-open-${theme}.png`,
                            fullPage: true
                        });

                        // Close menu
                        await page.keyboard.press('Escape');
                        await page.waitForTimeout(300);
                    }
                }
            }
        }
    });
});
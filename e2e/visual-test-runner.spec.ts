import { expect, test } from '@playwright/test';
import {
    defaultVisualConfig,
    setupVisualTest,
    VisualTestReporter
} from './utils/visual-test-helpers';

/**
 * Comprehensive Visual Test Runner
 * 
 * Orchestrates all visual regression tests and generates reports
 */

const reporter = new VisualTestReporter();

test.describe('Comprehensive Visual Regression Suite', () => {
    test.beforeEach(async ({ page }) => {
        // Set up consistent testing environment
        await page.addInitScript(() => {
            // Disable animations for consistent screenshots
            const style = document.createElement('style');
            style.textContent = `
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-delay: 0.01ms !important;
          transition-duration: 0.01ms !important;
          transition-delay: 0.01ms !important;
        }
      `;
            document.head.appendChild(style);
        });
    });

    // Test all components systematically
    const componentTests = [
        {
            name: 'button',
            route: '/design-system/buttons',
            variants: ['primary', 'secondary', 'outline', 'ghost', 'destructive'],
            sizes: ['sm', 'md', 'lg'],
            states: ['default', 'hover', 'focus', 'disabled', 'loading']
        },
        {
            name: 'stat-card',
            route: '/design-system/stat-cards',
            variants: ['default', 'compact', 'large'],
            states: ['default', 'hover', 'loading']
        },
        {
            name: 'input',
            route: '/design-system/forms',
            variants: ['default', 'error', 'success'],
            states: ['default', 'focus', 'disabled']
        },
        {
            name: 'select',
            route: '/design-system/forms',
            variants: ['default', 'error'],
            states: ['default', 'focus', 'disabled', 'open']
        },
        {
            name: 'textarea',
            route: '/design-system/forms',
            variants: ['default', 'error'],
            states: ['default', 'focus', 'disabled']
        },
        {
            name: 'page-header',
            route: '/design-system/page-header',
            variants: ['default', 'compact', 'with-breadcrumbs'],
            states: ['default']
        },
        {
            name: 'card',
            route: '/design-system',
            variants: ['default', 'elevated', 'interactive'],
            states: ['default', 'hover']
        }
    ];

    componentTests.forEach(component => {
        test(`${component.name} component visual regression`, async ({ page }) => {
            await page.goto(component.route);
            await page.waitForLoadState('networkidle');

            for (const theme of defaultVisualConfig.themes) {
                for (const breakpoint of defaultVisualConfig.breakpoints) {
                    await setupVisualTest(page, theme, breakpoint);

                    for (const variant of component.variants) {
                        for (const size of component.sizes || ['default']) {
                            for (const state of component.states) {
                                try {
                                    const sizeSelector = size === 'default' ? '' : `-${size}`;
                                    const selector = `[data-testid="${component.name}-${variant}${sizeSelector}"]`;
                                    const element = page.locator(selector);

                                    if (await element.count() > 0) {
                                        // Apply state
                                        switch (state) {
                                            case 'hover':
                                                await element.hover();
                                                break;
                                            case 'focus':
                                                await element.focus();
                                                break;
                                            case 'disabled':
                                                // Look for disabled variant
                                                const disabledSelector = `[data-testid="${component.name}-${variant}${sizeSelector}-disabled"]`;
                                                const disabledElement = page.locator(disabledSelector);
                                                if (await disabledElement.count() > 0) {
                                                    await expect(disabledElement).toHaveScreenshot(
                                                        `${component.name}-${variant}${sizeSelector}-${state}-${theme}-${breakpoint.name}.png`
                                                    );
                                                }
                                                continue;
                                            case 'loading':
                                                // Look for loading variant
                                                const loadingSelector = `[data-testid="${component.name}-${variant}${sizeSelector}-loading"]`;
                                                const loadingElement = page.locator(loadingSelector);
                                                if (await loadingElement.count() > 0) {
                                                    await expect(loadingElement).toHaveScreenshot(
                                                        `${component.name}-${variant}${sizeSelector}-${state}-${theme}-${breakpoint.name}.png`
                                                    );
                                                }
                                                continue;
                                            case 'open':
                                                if (component.name === 'select') {
                                                    await element.click();
                                                    await page.waitForTimeout(300);
                                                    const content = page.locator('[data-testid="select-content"]');
                                                    if (await content.count() > 0) {
                                                        await expect(content).toHaveScreenshot(
                                                            `${component.name}-${variant}-${state}-${theme}-${breakpoint.name}.png`
                                                        );
                                                    }
                                                    await page.keyboard.press('Escape');
                                                    await page.waitForTimeout(300);
                                                }
                                                continue;
                                        }

                                        // Take screenshot
                                        await expect(element).toHaveScreenshot(
                                            `${component.name}-${variant}${sizeSelector}-${state}-${theme}-${breakpoint.name}.png`
                                        );

                                        reporter.addResult({
                                            component: component.name,
                                            theme,
                                            breakpoint: breakpoint.name,
                                            state: `${variant}${sizeSelector}-${state}`,
                                            passed: true
                                        });
                                    }
                                } catch (error) {
                                    reporter.addResult({
                                        component: component.name,
                                        theme,
                                        breakpoint: breakpoint.name,
                                        state: `${variant}-${state}`,
                                        passed: false,
                                        error: error instanceof Error ? error.message : String(error)
                                    });
                                }
                            }
                        }
                    }
                }
            }
        });
    });

    test('Theme switching visual consistency', async ({ page }) => {
        const routes = [
            '/design-system',
            '/design-system/buttons',
            '/design-system/stat-cards',
            '/design-system/forms'
        ];

        for (const route of routes) {
            await page.goto(route);
            await page.waitForLoadState('networkidle');

            // Test theme switching animation
            await page.evaluate(() => {
                document.documentElement.setAttribute('data-theme', 'light');
            });
            await page.waitForTimeout(100);

            // Capture before transition
            await expect(page.locator('body')).toHaveScreenshot(
                `theme-transition-before-${route.replace(/\//g, '-')}.png`
            );

            // Switch theme
            await page.evaluate(() => {
                document.documentElement.setAttribute('data-theme', 'dark');
            });
            await page.waitForTimeout(500);

            // Capture after transition
            await expect(page.locator('body')).toHaveScreenshot(
                `theme-transition-after-${route.replace(/\//g, '-')}.png`
            );
        }
    });

    test('Responsive layout consistency', async ({ page }) => {
        const routes = ['/dashboard', '/design-system'];

        for (const route of routes) {
            await page.goto(route);
            await page.waitForLoadState('networkidle');

            for (const theme of defaultVisualConfig.themes) {
                await page.evaluate((themeValue) => {
                    document.documentElement.setAttribute('data-theme', themeValue);
                }, theme);
                await page.waitForTimeout(500);

                for (const breakpoint of defaultVisualConfig.breakpoints) {
                    await page.setViewportSize(breakpoint);
                    await page.waitForTimeout(300);

                    // Full page screenshot
                    await expect(page).toHaveScreenshot(
                        `full-page-${route.replace(/\//g, '-')}-${theme}-${breakpoint.name}.png`,
                        { fullPage: true }
                    );

                    // Above the fold screenshot
                    await expect(page).toHaveScreenshot(
                        `above-fold-${route.replace(/\//g, '-')}-${theme}-${breakpoint.name}.png`,
                        { fullPage: false }
                    );
                }
            }
        }
    });

    test('Accessibility visual states', async ({ page }) => {
        await page.goto('/design-system');
        await page.waitForLoadState('networkidle');

        // Test with reduced motion
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await expect(page.locator('body')).toHaveScreenshot('reduced-motion-light.png');

        // Test with dark theme and reduced motion
        await page.evaluate(() => {
            document.documentElement.setAttribute('data-theme', 'dark');
        });
        await page.waitForTimeout(500);
        await expect(page.locator('body')).toHaveScreenshot('reduced-motion-dark.png');

        // Test focus indicators
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        const focusableElements = page.locator('button, input, select, textarea, a[href]');
        const count = await focusableElements.count();

        for (let i = 0; i < Math.min(count, 10); i++) { // Test first 10 focusable elements
            const element = focusableElements.nth(i);
            await element.focus();
            await page.waitForTimeout(100);

            const testId = await element.getAttribute('data-testid') || `focusable-${i}`;
            await expect(element).toHaveScreenshot(`focus-${testId}-dark.png`);
        }
    });

    test.afterAll(async () => {
        // Generate and save test report
        const report = reporter.generateReport();
        const summary = reporter.getSummary();

        console.log('\n=== Visual Regression Test Summary ===');
        console.log(`Total Tests: ${summary.total}`);
        console.log(`Passed: ${summary.passed}`);
        console.log(`Failed: ${summary.failed}`);
        console.log(`Pass Rate: ${summary.passRate.toFixed(2)}%`);

        if (summary.failed > 0) {
            console.log('\nFailed tests detected. Check the generated report for details.');
        }

        // Save report to file
        const fs = require('fs');
        fs.writeFileSync('test-results/visual-regression-report.md', report);
    });
});
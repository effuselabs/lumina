import { expect, test } from '@playwright/test';
import {
    defaultVisualConfig,
    runComponentVisualTests,
    setupVisualTest,
    testErrorStates,
    testLoadingStates,
    VisualTestReporter
} from './utils/visual-test-helpers';

/**
 * Design System Visual Regression Tests
 * 
 * Comprehensive visual testing for all Lumina design system components
 * Tests components in both light and dark themes across multiple breakpoints
 */

const reporter = new VisualTestReporter();

test.describe('Design System Visual Regression', () => {
    test.beforeEach(async ({ page }) => {
        // Disable animations for consistent screenshots
        await page.addInitScript(() => {
            const style = document.createElement('style');
            style.textContent = `
                *, *::before, *::after {
                    animation-duration: 0.01ms !important;
                    animation-delay: 0.01ms !important;
                    transition-duration: 0.01ms !important;
                    transition-delay: 0.01ms !important;
                }
                
                /* Ensure fonts are loaded */
                @font-face {
                    font-family: 'Inter';
                    font-display: block;
                }
            `;
            document.head.appendChild(style);
        });

        // Wait for fonts to load
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
    });

    test('Button component visual regression', async ({ page }) => {
        await runComponentVisualTests(page, {
            componentName: 'button',
            route: '/design-system',
            variants: ['primary', 'secondary', 'outline', 'ghost', 'destructive', 'link'],
            sizes: ['sm', 'default', 'lg', 'xl'],
            states: ['default', 'hover', 'focus', 'disabled'],
            testLoading: true,
            testError: false,
            testAccessibility: true
        });
    });

    test('Color palette visual regression', async ({ page }) => {
        await page.goto('/design-system');
        await page.waitForLoadState('networkidle');

        for (const theme of defaultVisualConfig.themes) {
            for (const breakpoint of defaultVisualConfig.breakpoints) {
                await setupVisualTest(page, theme, breakpoint);

                // Test brand colors section
                const brandColors = page.locator('[data-testid="brand-colors"]');
                if (await brandColors.count() > 0) {
                    await expect(brandColors).toHaveScreenshot(
                        `brand-colors-${theme}-${breakpoint.name}.png`
                    );
                }

                // Test complementary colors section
                const complementaryColors = page.locator('[data-testid="complementary-colors"]');
                if (await complementaryColors.count() > 0) {
                    await expect(complementaryColors).toHaveScreenshot(
                        `complementary-colors-${theme}-${breakpoint.name}.png`
                    );
                }

                // Test semantic colors section
                const semanticColors = page.locator('[data-testid="semantic-colors"]');
                if (await semanticColors.count() > 0) {
                    await expect(semanticColors).toHaveScreenshot(
                        `semantic-colors-${theme}-${breakpoint.name}.png`
                    );
                }

                // Test neutral colors section
                const neutralColors = page.locator('[data-testid="neutral-colors"]');
                if (await neutralColors.count() > 0) {
                    await expect(neutralColors).toHaveScreenshot(
                        `neutral-colors-${theme}-${breakpoint.name}.png`
                    );
                }
            }
        }
    });

    test('Typography visual regression', async ({ page }) => {
        await page.goto('/design-system');
        await page.waitForLoadState('networkidle');

        for (const theme of defaultVisualConfig.themes) {
            for (const breakpoint of defaultVisualConfig.breakpoints) {
                await setupVisualTest(page, theme, breakpoint);

                // Test typography scale
                const typographySection = page.locator('[data-testid="typography-scale"]');
                if (await typographySection.count() > 0) {
                    await expect(typographySection).toHaveScreenshot(
                        `typography-scale-${theme}-${breakpoint.name}.png`
                    );
                }

                // Test individual typography elements
                const typographyElements = [
                    'heading-1',
                    'heading-2',
                    'heading-3',
                    'body-large',
                    'body-small',
                    'caption'
                ];

                for (const element of typographyElements) {
                    const typographyElement = page.locator(`[data-testid="typography-${element}"]`);
                    if (await typographyElement.count() > 0) {
                        await expect(typographyElement).toHaveScreenshot(
                            `typography-${element}-${theme}-${breakpoint.name}.png`
                        );
                    }
                }
            }
        }
    });

    test('Form elements visual regression', async ({ page }) => {
        await page.goto('/design-system');
        await page.waitForLoadState('networkidle');

        const formElements = [
            { name: 'input', variants: ['default', 'error', 'success'], states: ['default', 'focus', 'disabled'] },
            { name: 'textarea', variants: ['default', 'error'], states: ['default', 'focus', 'disabled'] },
            { name: 'select', variants: ['default', 'error'], states: ['default', 'focus', 'disabled', 'open'] },
            { name: 'checkbox', variants: ['default'], states: ['default', 'checked', 'indeterminate', 'disabled'] },
            { name: 'radio', variants: ['default'], states: ['default', 'checked', 'disabled'] },
            { name: 'switch', variants: ['default'], states: ['default', 'checked', 'disabled'] }
        ];

        for (const element of formElements) {
            for (const theme of defaultVisualConfig.themes) {
                for (const breakpoint of defaultVisualConfig.breakpoints) {
                    await setupVisualTest(page, theme, breakpoint);

                    for (const variant of element.variants) {
                        for (const state of element.states) {
                            const selector = `[data-testid="${element.name}-${variant}-${state}"]`;
                            const formElement = page.locator(selector);

                            if (await formElement.count() > 0) {
                                // Apply state-specific interactions
                                switch (state) {
                                    case 'focus':
                                        await formElement.focus();
                                        break;
                                    case 'hover':
                                        await formElement.hover();
                                        break;
                                    case 'open':
                                        if (element.name === 'select') {
                                            await formElement.click();
                                            await page.waitForTimeout(300);
                                        }
                                        break;
                                }

                                await expect(formElement).toHaveScreenshot(
                                    `${element.name}-${variant}-${state}-${theme}-${breakpoint.name}.png`
                                );

                                // Close select if it was opened
                                if (state === 'open' && element.name === 'select') {
                                    await page.keyboard.press('Escape');
                                    await page.waitForTimeout(300);
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    test('Card components visual regression', async ({ page }) => {
        await page.goto('/design-system');
        await page.waitForLoadState('networkidle');

        const cardVariants = ['default', 'elevated', 'interactive', 'outline'];
        const cardStates = ['default', 'hover', 'focus'];

        for (const theme of defaultVisualConfig.themes) {
            for (const breakpoint of defaultVisualConfig.breakpoints) {
                await setupVisualTest(page, theme, breakpoint);

                for (const variant of cardVariants) {
                    for (const state of cardStates) {
                        const selector = `[data-testid="card-${variant}"]`;
                        const cardElement = page.locator(selector);

                        if (await cardElement.count() > 0) {
                            // Apply state
                            switch (state) {
                                case 'hover':
                                    await cardElement.hover();
                                    break;
                                case 'focus':
                                    await cardElement.focus();
                                    break;
                            }

                            await expect(cardElement).toHaveScreenshot(
                                `card-${variant}-${state}-${theme}-${breakpoint.name}.png`
                            );
                        }
                    }
                }
            }
        }
    });

    test('Badge components visual regression', async ({ page }) => {
        await page.goto('/design-system');
        await page.waitForLoadState('networkidle');

        const badgeVariants = ['default', 'secondary', 'destructive', 'outline', 'success', 'warning'];
        const badgeSizes = ['sm', 'default', 'lg'];

        for (const theme of defaultVisualConfig.themes) {
            for (const breakpoint of defaultVisualConfig.breakpoints) {
                await setupVisualTest(page, theme, breakpoint);

                for (const variant of badgeVariants) {
                    for (const size of badgeSizes) {
                        const selector = size === 'default'
                            ? `[data-testid="badge-${variant}"]`
                            : `[data-testid="badge-${variant}-${size}"]`;
                        const badgeElement = page.locator(selector);

                        if (await badgeElement.count() > 0) {
                            await expect(badgeElement).toHaveScreenshot(
                                `badge-${variant}-${size}-${theme}-${breakpoint.name}.png`
                            );
                        }
                    }
                }
            }
        }
    });

    test('Theme switching visual consistency', async ({ page }) => {
        const routes = ['/design-system'];

        for (const route of routes) {
            await page.goto(route);
            await page.waitForLoadState('networkidle');

            // Test theme switching without flash
            for (const breakpoint of defaultVisualConfig.breakpoints) {
                await page.setViewportSize(breakpoint);

                // Start with light theme
                await page.evaluate(() => {
                    document.documentElement.setAttribute('data-theme', 'light');
                });
                await page.waitForTimeout(500);

                // Capture light theme
                await expect(page.locator('body')).toHaveScreenshot(
                    `theme-light-${route.replace(/\//g, '-')}-${breakpoint.name}.png`
                );

                // Switch to dark theme
                await page.evaluate(() => {
                    document.documentElement.setAttribute('data-theme', 'dark');
                });
                await page.waitForTimeout(500);

                // Capture dark theme
                await expect(page.locator('body')).toHaveScreenshot(
                    `theme-dark-${route.replace(/\//g, '-')}-${breakpoint.name}.png`
                );

                // Test theme toggle component if present
                const themeToggle = page.locator('[data-testid="theme-toggle"]');
                if (await themeToggle.count() > 0) {
                    await expect(themeToggle).toHaveScreenshot(
                        `theme-toggle-dark-${breakpoint.name}.png`
                    );

                    // Switch back to light
                    await themeToggle.click();
                    await page.waitForTimeout(500);

                    await expect(themeToggle).toHaveScreenshot(
                        `theme-toggle-light-${breakpoint.name}.png`
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

        for (const theme of defaultVisualConfig.themes) {
            await page.evaluate((themeValue) => {
                document.documentElement.setAttribute('data-theme', themeValue);
            }, theme);
            await page.waitForTimeout(500);

            await expect(page.locator('body')).toHaveScreenshot(
                `reduced-motion-${theme}.png`
            );

            // Test focus indicators on interactive elements
            const focusableElements = page.locator('button:visible, input:visible, select:visible, textarea:visible, a[href]:visible');
            const count = await focusableElements.count();

            for (let i = 0; i < Math.min(count, 5); i++) {
                const element = focusableElements.nth(i);
                await element.focus();
                await page.waitForTimeout(100);

                const testId = await element.getAttribute('data-testid') || `focusable-${i}`;
                await expect(element).toHaveScreenshot(
                    `focus-${testId}-${theme}.png`
                );
            }
        }

        // Reset media preferences
        await page.emulateMedia({ reducedMotion: 'no-preference' });
    });

    test('Loading and error states visual regression', async ({ page }) => {
        await page.goto('/design-system');
        await page.waitForLoadState('networkidle');

        const componentsWithStates = [
            'button',
            'card',
            'form',
            'data-table'
        ];

        for (const component of componentsWithStates) {
            for (const theme of defaultVisualConfig.themes) {
                for (const breakpoint of defaultVisualConfig.breakpoints) {
                    await setupVisualTest(page, theme, breakpoint);

                    // Test loading states
                    await testLoadingStates(page, component, theme, breakpoint.name);

                    // Test error states
                    await testErrorStates(page, component, theme, breakpoint.name);
                }
            }
        }
    });

    test('Responsive layout consistency', async ({ page }) => {
        const routes = ['/design-system'];

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
                        `responsive-full-${route.replace(/\//g, '-')}-${theme}-${breakpoint.name}.png`,
                        { fullPage: true }
                    );

                    // Above the fold screenshot
                    await expect(page).toHaveScreenshot(
                        `responsive-fold-${route.replace(/\//g, '-')}-${theme}-${breakpoint.name}.png`,
                        { fullPage: false }
                    );

                    // Test specific responsive components
                    const responsiveComponents = [
                        'navigation',
                        'header',
                        'sidebar',
                        'main-content',
                        'footer'
                    ];

                    for (const component of responsiveComponents) {
                        const element = page.locator(`[data-testid="${component}"]`);
                        if (await element.count() > 0) {
                            await expect(element).toHaveScreenshot(
                                `responsive-${component}-${theme}-${breakpoint.name}.png`
                            );
                        }
                    }
                }
            }
        }
    });

    test.afterAll(async () => {
        // Generate comprehensive test report
        const report = reporter.generateReport();
        const summary = reporter.getSummary();

        console.log('\n=== Design System Visual Regression Test Summary ===');
        console.log(`Total Tests: ${summary.total}`);
        console.log(`Passed: ${summary.passed}`);
        console.log(`Failed: ${summary.failed}`);
        console.log(`Pass Rate: ${summary.passRate.toFixed(2)}%`);

        if (summary.failed > 0) {
            console.log('\nFailed tests detected. Review the screenshots in test-results/');
            console.log('Run with --update-snapshots to update baseline images if changes are intentional.');
        }

        // Save detailed report
        const fs = require('fs');
        const path = require('path');

        // Ensure directory exists
        const reportDir = 'test-results/visual';
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }

        fs.writeFileSync(
            path.join(reportDir, 'design-system-visual-regression-report.md'),
            report
        );

        console.log(`\nDetailed report saved to: ${reportDir}/design-system-visual-regression-report.md`);
    });
});
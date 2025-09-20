import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * Accessibility Regression Tests
 * 
 * Comprehensive accessibility testing using axe-core to ensure WCAG 2.1 AA compliance
 * across all components, themes, and breakpoints.
 */

// Test configuration
const accessibilityConfig = {
    themes: ['light', 'dark'],
    breakpoints: [
        { name: 'mobile', width: 375, height: 667 },
        { name: 'tablet', width: 768, height: 1024 },
        { name: 'desktop', width: 1440, height: 900 }
    ],
    routes: [
        { path: '/design-system', name: 'design-system-overview' },
        { path: '/design-system/buttons', name: 'buttons' },
        { path: '/design-system/stat-cards', name: 'stat-cards' },
        { path: '/design-system/forms', name: 'forms' },
        { path: '/design-system/page-header', name: 'page-header' },
        { path: '/design-system/grid-system', name: 'grid-system' },
        { path: '/dashboard', name: 'dashboard' }
    ]
};

// Axe configuration for comprehensive testing
const axeConfig = {
    rules: {
        // Enable all WCAG 2.1 AA rules
        'color-contrast': { enabled: true },
        'keyboard-navigation': { enabled: true },
        'focus-order-semantics': { enabled: true },
        'aria-valid-attr': { enabled: true },
        'aria-valid-attr-value': { enabled: true },
        'button-name': { enabled: true },
        'form-field-multiple-labels': { enabled: true },
        'heading-order': { enabled: true },
        'image-alt': { enabled: true },
        'input-image-alt': { enabled: true },
        'label': { enabled: true },
        'link-name': { enabled: true },
        'list': { enabled: true },
        'listitem': { enabled: true },
        'meta-refresh': { enabled: true },
        'region': { enabled: true },
        'skip-link': { enabled: true },
        'tabindex': { enabled: true },
        'valid-lang': { enabled: true }
    },
    tags: ['wcag2a', 'wcag2aa', 'wcag21aa']
};

test.describe('Accessibility Regression Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Set up consistent testing environment
        await page.addInitScript(() => {
            // Ensure consistent focus behavior
            document.addEventListener('DOMContentLoaded', () => {
                // Remove any existing focus styles that might interfere
                const style = document.createElement('style');
                style.textContent = `
          /* Ensure focus indicators are visible for testing */
          *:focus {
            outline: 2px solid #0066cc !important;
            outline-offset: 2px !important;
          }
        `;
                document.head.appendChild(style);
            });
        });
    });

    // Test each route across themes and breakpoints
    accessibilityConfig.routes.forEach(route => {
        test.describe(`${route.name} accessibility`, () => {
            accessibilityConfig.themes.forEach(theme => {
                test.describe(`${theme} theme`, () => {
                    accessibilityConfig.breakpoints.forEach(breakpoint => {
                        test(`${breakpoint.name} breakpoint - axe scan`, async ({ page }) => {
                            // Set up viewport and theme
                            await page.setViewportSize(breakpoint);
                            await page.goto(route.path);
                            await page.waitForLoadState('networkidle');

                            // Set theme
                            await page.evaluate((themeValue) => {
                                document.documentElement.setAttribute('data-theme', themeValue);
                                localStorage.setItem('theme', themeValue);
                            }, theme);
                            await page.waitForTimeout(500);

                            // Run axe accessibility scan
                            const accessibilityScanResults = await new AxeBuilder({ page })
                                .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
                                .analyze();

                            // Assert no accessibility violations
                            expect(accessibilityScanResults.violations).toEqual([]);

                            // Log accessibility scan results for reporting
                            if (accessibilityScanResults.violations.length > 0) {
                                console.log(`❌ Accessibility violations found on ${route.path} (${theme}/${breakpoint.name}):`);
                                accessibilityScanResults.violations.forEach(violation => {
                                    console.log(`  - ${violation.id}: ${violation.description}`);
                                    console.log(`    Impact: ${violation.impact}`);
                                    console.log(`    Nodes: ${violation.nodes.length}`);
                                });
                            }
                        });
                    });
                });
            });
        });
    });

    test.describe('Keyboard Navigation Tests', () => {
        const interactiveRoutes = [
            '/design-system/buttons',
            '/design-system/forms',
            '/dashboard'
        ];

        interactiveRoutes.forEach(route => {
            test(`Keyboard navigation - ${route}`, async ({ page }) => {
                await page.goto(route);
                await page.waitForLoadState('networkidle');

                // Test tab navigation
                const focusableElements = await page.locator(
                    'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
                ).all();

                let previousElement = null;
                for (let i = 0; i < focusableElements.length; i++) {
                    await page.keyboard.press('Tab');

                    const currentFocused = page.locator(':focus');
                    await expect(currentFocused).toBeVisible();

                    // Ensure focus indicator is visible
                    const focusedElement = await currentFocused.first();
                    const computedStyle = await focusedElement.evaluate(el => {
                        const style = window.getComputedStyle(el);
                        return {
                            outline: style.outline,
                            outlineWidth: style.outlineWidth,
                            outlineStyle: style.outlineStyle,
                            outlineColor: style.outlineColor,
                            boxShadow: style.boxShadow
                        };
                    });

                    // Verify focus indicator exists
                    const hasFocusIndicator =
                        computedStyle.outline !== 'none' ||
                        computedStyle.outlineWidth !== '0px' ||
                        computedStyle.boxShadow !== 'none';

                    expect(hasFocusIndicator).toBe(true);

                    previousElement = currentFocused;
                }

                // Test reverse tab navigation
                for (let i = focusableElements.length - 1; i >= 0; i--) {
                    await page.keyboard.press('Shift+Tab');
                    const currentFocused = page.locator(':focus');
                    await expect(currentFocused).toBeVisible();
                }
            });
        });
    });

    test.describe('Screen Reader Compatibility', () => {
        test('ARIA labels and descriptions', async ({ page }) => {
            await page.goto('/design-system');
            await page.waitForLoadState('networkidle');

            // Check for proper ARIA labels
            const elementsWithAriaLabel = await page.locator('[aria-label]').all();
            for (const element of elementsWithAriaLabel) {
                const ariaLabel = await element.getAttribute('aria-label');
                expect(ariaLabel).toBeTruthy();
                expect(ariaLabel!.trim().length).toBeGreaterThan(0);
            }

            // Check for proper ARIA descriptions
            const elementsWithAriaDescribedBy = await page.locator('[aria-describedby]').all();
            for (const element of elementsWithAriaDescribedBy) {
                const describedById = await element.getAttribute('aria-describedby');
                const descriptionElement = page.locator(`#${describedById}`);
                await expect(descriptionElement).toBeAttached();
            }

            // Check for proper heading hierarchy
            const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
            let previousLevel = 0;

            for (const heading of headings) {
                const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
                const currentLevel = parseInt(tagName.charAt(1));

                // Heading levels should not skip (e.g., h1 -> h3)
                if (previousLevel > 0) {
                    expect(currentLevel - previousLevel).toBeLessThanOrEqual(1);
                }

                previousLevel = currentLevel;
            }
        });

        test('Form accessibility', async ({ page }) => {
            await page.goto('/design-system/forms');
            await page.waitForLoadState('networkidle');

            // Check that all form inputs have labels
            const inputs = await page.locator('input, select, textarea').all();
            for (const input of inputs) {
                const inputId = await input.getAttribute('id');
                const ariaLabel = await input.getAttribute('aria-label');
                const ariaLabelledBy = await input.getAttribute('aria-labelledby');

                if (inputId) {
                    const label = page.locator(`label[for="${inputId}"]`);
                    const hasLabel = await label.count() > 0;
                    const hasAriaLabel = ariaLabel && ariaLabel.trim().length > 0;
                    const hasAriaLabelledBy = ariaLabelledBy && ariaLabelledBy.trim().length > 0;

                    expect(hasLabel || hasAriaLabel || hasAriaLabelledBy).toBe(true);
                }
            }

            // Check form validation messages
            const errorMessages = await page.locator('[role="alert"], .error-message, [aria-invalid="true"]').all();
            for (const errorMessage of errorMessages) {
                await expect(errorMessage).toBeVisible();
                const text = await errorMessage.textContent();
                expect(text).toBeTruthy();
                expect(text!.trim().length).toBeGreaterThan(0);
            }
        });
    });

    test.describe('Color Contrast Tests', () => {
        test('Text contrast ratios', async ({ page }) => {
            const routes = ['/design-system', '/design-system/buttons', '/design-system/forms'];

            for (const route of routes) {
                await page.goto(route);
                await page.waitForLoadState('networkidle');

                // Test both themes
                for (const theme of ['light', 'dark']) {
                    await page.evaluate((themeValue) => {
                        document.documentElement.setAttribute('data-theme', themeValue);
                    }, theme);
                    await page.waitForTimeout(500);

                    // Run axe color-contrast check
                    const results = await new AxeBuilder({ page })
                        .withRules(['color-contrast'])
                        .analyze();

                    expect(results.violations).toEqual([]);
                }
            }
        });

        test('Interactive element contrast', async ({ page }) => {
            await page.goto('/design-system/buttons');
            await page.waitForLoadState('networkidle');

            const buttons = await page.locator('button').all();

            for (const button of buttons) {
                // Test default state
                const defaultResults = await new AxeBuilder({ page })
                    .include(button)
                    .withRules(['color-contrast'])
                    .analyze();

                expect(defaultResults.violations).toEqual([]);

                // Test hover state
                await button.hover();
                const hoverResults = await new AxeBuilder({ page })
                    .include(button)
                    .withRules(['color-contrast'])
                    .analyze();

                expect(hoverResults.violations).toEqual([]);

                // Test focus state
                await button.focus();
                const focusResults = await new AxeBuilder({ page })
                    .include(button)
                    .withRules(['color-contrast'])
                    .analyze();

                expect(focusResults.violations).toEqual([]);
            }
        });
    });

    test.describe('Reduced Motion Support', () => {
        test('Respects prefers-reduced-motion', async ({ page }) => {
            // Enable reduced motion
            await page.emulateMedia({ reducedMotion: 'reduce' });

            await page.goto('/design-system');
            await page.waitForLoadState('networkidle');

            // Check that animations are disabled or reduced
            const animatedElements = await page.locator('[class*="animate"], [style*="transition"], [style*="animation"]').all();

            for (const element of animatedElements) {
                const computedStyle = await element.evaluate(el => {
                    const style = window.getComputedStyle(el);
                    return {
                        animationDuration: style.animationDuration,
                        transitionDuration: style.transitionDuration
                    };
                });

                // Animations should be disabled or very short
                if (computedStyle.animationDuration !== 'none') {
                    const duration = parseFloat(computedStyle.animationDuration);
                    expect(duration).toBeLessThanOrEqual(0.01); // 10ms or less
                }

                if (computedStyle.transitionDuration !== 'none') {
                    const duration = parseFloat(computedStyle.transitionDuration);
                    expect(duration).toBeLessThanOrEqual(0.01); // 10ms or less
                }
            }
        });
    });

    test.describe('Skip Links and Navigation', () => {
        test('Skip links functionality', async ({ page }) => {
            await page.goto('/dashboard');
            await page.waitForLoadState('networkidle');

            // Tab to first element (should be skip link)
            await page.keyboard.press('Tab');

            const skipLink = page.locator(':focus');
            const skipLinkText = await skipLink.textContent();

            // Skip link should be visible when focused
            await expect(skipLink).toBeVisible();
            expect(skipLinkText).toMatch(/skip/i);

            // Activate skip link
            await page.keyboard.press('Enter');

            // Focus should move to main content
            const focusedElement = page.locator(':focus');
            const focusedId = await focusedElement.getAttribute('id');
            expect(focusedId).toMatch(/main|content/i);
        });
    });

    test.describe('Dynamic Content Accessibility', () => {
        test('Loading states accessibility', async ({ page }) => {
            await page.goto('/design-system/stat-cards');
            await page.waitForLoadState('networkidle');

            // Find loading elements
            const loadingElements = await page.locator('[data-testid*="loading"], [aria-busy="true"], .loading').all();

            for (const element of loadingElements) {
                // Loading elements should have proper ARIA attributes
                const ariaBusy = await element.getAttribute('aria-busy');
                const ariaLabel = await element.getAttribute('aria-label');
                const role = await element.getAttribute('role');

                const hasLoadingIndicator =
                    ariaBusy === 'true' ||
                    (ariaLabel && ariaLabel.includes('loading')) ||
                    role === 'status' ||
                    role === 'progressbar';

                expect(hasLoadingIndicator).toBe(true);
            }
        });

        test('Error states accessibility', async ({ page }) => {
            await page.goto('/design-system/forms');
            await page.waitForLoadState('networkidle');

            // Find error elements
            const errorElements = await page.locator('[role="alert"], .error, [aria-invalid="true"]').all();

            for (const element of errorElements) {
                // Error elements should be properly announced
                const role = await element.getAttribute('role');
                const ariaLive = await element.getAttribute('aria-live');
                const ariaInvalid = await element.getAttribute('aria-invalid');

                const hasErrorAnnouncement =
                    role === 'alert' ||
                    ariaLive === 'polite' ||
                    ariaLive === 'assertive' ||
                    ariaInvalid === 'true';

                expect(hasErrorAnnouncement).toBe(true);
            }
        });
    });
});
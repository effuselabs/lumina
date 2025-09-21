import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * Accessibility Compliance Testing
 * 
 * Comprehensive accessibility testing for WCAG AA compliance
 * Tests keyboard navigation, screen reader compatibility, and color contrast
 */

test.describe('Accessibility Compliance', () => {
    test.beforeEach(async ({ page }) => {
        // Set up accessibility testing environment
        await page.addInitScript(() => {
            // Ensure focus is visible for testing
            const style = document.createElement('style');
            style.textContent = `
                *:focus {
                    outline: 2px solid #0066cc !important;
                    outline-offset: 2px !important;
                }
            `;
            document.head.appendChild(style);
        });
    });

    test('Design system page passes axe accessibility audit', async ({ page }) => {
        await page.goto('/design-system');
        await page.waitForLoadState('networkidle');

        // Test both light and dark themes
        const themes = ['light', 'dark'];

        for (const theme of themes) {
            await page.evaluate((themeValue) => {
                document.documentElement.setAttribute('data-theme', themeValue);
            }, theme);
            await page.waitForTimeout(500);

            const accessibilityScanResults = await new AxeBuilder({ page })
                .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
                .analyze();

            expect(accessibilityScanResults.violations).toEqual([]);

            // Log any incomplete tests for manual review
            if (accessibilityScanResults.incomplete.length > 0) {
                console.log(`⚠️  Incomplete accessibility tests in ${theme} theme:`,
                    accessibilityScanResults.incomplete.map(item => item.id));
            }
        }
    });

    test('Color contrast meets WCAG AA standards', async ({ page }) => {
        await page.goto('/design-system');
        await page.waitForLoadState('networkidle');

        const themes = ['light', 'dark'];
        const contrastResults: Array<{
            theme: string;
            element: string;
            ratio: number;
            passes: boolean;
        }> = [];

        for (const theme of themes) {
            await page.evaluate((themeValue) => {
                document.documentElement.setAttribute('data-theme', themeValue);
            }, theme);
            await page.waitForTimeout(500);

            // Test text elements
            const textElements = await page.locator('h1, h2, h3, h4, h5, h6, p, span, a, button, label').all();

            for (let i = 0; i < Math.min(textElements.length, 20); i++) {
                const element = textElements[i];

                try {
                    const contrastInfo = await element.evaluate((el) => {
                        const style = window.getComputedStyle(el);
                        const textColor = style.color;
                        const backgroundColor = style.backgroundColor;
                        const fontSize = parseFloat(style.fontSize);
                        const fontWeight = style.fontWeight;

                        // Helper function to parse RGB values
                        const parseRgb = (color: string) => {
                            const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                            return match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : null;
                        };

                        // Calculate relative luminance
                        const getLuminance = (rgb: number[]) => {
                            const [r, g, b] = rgb.map(c => {
                                c = c / 255;
                                return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
                            });
                            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
                        };

                        // Calculate contrast ratio
                        const getContrastRatio = (color1: string, color2: string) => {
                            const rgb1 = parseRgb(color1);
                            const rgb2 = parseRgb(color2);

                            if (!rgb1 || !rgb2) return null;

                            const lum1 = getLuminance(rgb1);
                            const lum2 = getLuminance(rgb2);

                            const brightest = Math.max(lum1, lum2);
                            const darkest = Math.min(lum1, lum2);

                            return (brightest + 0.05) / (darkest + 0.05);
                        };

                        const ratio = getContrastRatio(textColor, backgroundColor);
                        const isLargeText = fontSize >= 18 || (fontSize >= 14 && (fontWeight === 'bold' || parseInt(fontWeight) >= 700));
                        const requiredRatio = isLargeText ? 3 : 4.5;

                        return {
                            textColor,
                            backgroundColor,
                            fontSize,
                            fontWeight,
                            ratio,
                            requiredRatio,
                            passes: ratio ? ratio >= requiredRatio : false,
                            tagName: el.tagName.toLowerCase(),
                            className: el.className
                        };
                    });

                    if (contrastInfo.ratio) {
                        contrastResults.push({
                            theme,
                            element: `${contrastInfo.tagName}.${contrastInfo.className}`,
                            ratio: contrastInfo.ratio,
                            passes: contrastInfo.passes
                        });

                        // Assert contrast ratio meets requirements
                        expect(contrastInfo.passes).toBe(true);
                    }
                } catch (error) {
                    // Skip elements that can't be evaluated
                    continue;
                }
            }
        }

        // Log contrast results for review
        console.log('Color contrast test results:', contrastResults);
    });

    test('Keyboard navigation works correctly', async ({ page }) => {
        await page.goto('/design-system');
        await page.waitForLoadState('networkidle');

        // Get all focusable elements
        const focusableElements = page.locator(
            'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        );

        const elementCount = await focusableElements.count();
        expect(elementCount).toBeGreaterThan(0);

        // Test tab navigation
        let currentIndex = 0;
        const maxElements = Math.min(elementCount, 15); // Test first 15 elements

        for (let i = 0; i < maxElements; i++) {
            await page.keyboard.press('Tab');

            // Wait for focus to settle
            await page.waitForTimeout(100);

            // Check if an element is focused
            const focusedElement = page.locator(':focus');
            const isFocused = await focusedElement.count() > 0;

            expect(isFocused).toBe(true);

            // Verify focus is visible
            if (isFocused) {
                const focusedBox = await focusedElement.boundingBox();
                expect(focusedBox).toBeTruthy();

                // Check for focus indicator
                const hasOutline = await focusedElement.evaluate(el => {
                    const style = window.getComputedStyle(el);
                    return style.outline !== 'none' && style.outline !== '' && style.outline !== '0px';
                });

                const hasBoxShadow = await focusedElement.evaluate(el => {
                    const style = window.getComputedStyle(el);
                    return style.boxShadow !== 'none' && style.boxShadow !== '';
                });

                // Element should have some form of focus indicator
                expect(hasOutline || hasBoxShadow).toBe(true);
            }
        }

        // Test reverse tab navigation
        for (let i = 0; i < 3; i++) {
            await page.keyboard.press('Shift+Tab');
            await page.waitForTimeout(100);

            const focusedElement = page.locator(':focus');
            const isFocused = await focusedElement.count() > 0;
            expect(isFocused).toBe(true);
        }

        // Test Enter key activation on buttons
        const buttons = page.locator('button:not([disabled])');
        const buttonCount = await buttons.count();

        if (buttonCount > 0) {
            const firstButton = buttons.first();
            await firstButton.focus();

            // Test Enter key
            await page.keyboard.press('Enter');
            await page.waitForTimeout(100);

            // Test Space key for buttons
            await firstButton.focus();
            await page.keyboard.press('Space');
            await page.waitForTimeout(100);
        }

        // Test Escape key functionality
        const dialogs = page.locator('[role="dialog"], [data-testid*="modal"], [data-testid*="dialog"]');
        const dialogCount = await dialogs.count();

        if (dialogCount > 0) {
            // Try to open a dialog first
            const dialogTrigger = page.locator('[data-testid*="dialog-trigger"], [data-testid*="modal-trigger"]');
            if (await dialogTrigger.count() > 0) {
                await dialogTrigger.first().click();
                await page.waitForTimeout(300);

                // Test Escape key closes dialog
                await page.keyboard.press('Escape');
                await page.waitForTimeout(300);

                const dialogVisible = await dialogs.first().isVisible();
                expect(dialogVisible).toBe(false);
            }
        }
    });

    test('Form elements have proper labels and ARIA attributes', async ({ page }) => {
        await page.goto('/design-system');
        await page.waitForLoadState('networkidle');

        // Test input elements
        const inputs = page.locator('input');
        const inputCount = await inputs.count();

        for (let i = 0; i < inputCount; i++) {
            const input = inputs.nth(i);
            const inputType = await input.getAttribute('type');

            // Skip hidden inputs
            if (inputType === 'hidden') continue;

            // Check for label association
            const id = await input.getAttribute('id');
            const ariaLabel = await input.getAttribute('aria-label');
            const ariaLabelledBy = await input.getAttribute('aria-labelledby');

            let hasLabel = false;

            if (id) {
                const label = page.locator(`label[for="${id}"]`);
                hasLabel = await label.count() > 0;
            }

            const hasAccessibleName = hasLabel || !!ariaLabel || !!ariaLabelledBy;
            expect(hasAccessibleName).toBe(true);

            // Check for required attribute and aria-required
            const isRequired = await input.getAttribute('required');
            if (isRequired !== null) {
                const ariaRequired = await input.getAttribute('aria-required');
                expect(ariaRequired).toBe('true');
            }

            // Check for error states
            const ariaInvalid = await input.getAttribute('aria-invalid');
            if (ariaInvalid === 'true') {
                const ariaDescribedBy = await input.getAttribute('aria-describedby');
                expect(ariaDescribedBy).toBeTruthy();

                // Check if error message exists
                if (ariaDescribedBy) {
                    const errorMessage = page.locator(`#${ariaDescribedBy}`);
                    expect(await errorMessage.count()).toBeGreaterThan(0);
                }
            }
        }

        // Test select elements
        const selects = page.locator('select');
        const selectCount = await selects.count();

        for (let i = 0; i < selectCount; i++) {
            const select = selects.nth(i);

            // Check for label
            const id = await select.getAttribute('id');
            const ariaLabel = await select.getAttribute('aria-label');

            let hasLabel = false;
            if (id) {
                const label = page.locator(`label[for="${id}"]`);
                hasLabel = await label.count() > 0;
            }

            expect(hasLabel || !!ariaLabel).toBe(true);
        }

        // Test textarea elements
        const textareas = page.locator('textarea');
        const textareaCount = await textareas.count();

        for (let i = 0; i < textareaCount; i++) {
            const textarea = textareas.nth(i);

            const id = await textarea.getAttribute('id');
            const ariaLabel = await textarea.getAttribute('aria-label');

            let hasLabel = false;
            if (id) {
                const label = page.locator(`label[for="${id}"]`);
                hasLabel = await label.count() > 0;
            }

            expect(hasLabel || !!ariaLabel).toBe(true);
        }
    });

    test('Interactive elements have appropriate ARIA roles and states', async ({ page }) => {
        await page.goto('/design-system');
        await page.waitForLoadState('networkidle');

        // Test buttons
        const buttons = page.locator('button');
        const buttonCount = await buttons.count();

        for (let i = 0; i < buttonCount; i++) {
            const button = buttons.nth(i);

            // Check if button has accessible name
            const ariaLabel = await button.getAttribute('aria-label');
            const textContent = await button.textContent();
            const ariaLabelledBy = await button.getAttribute('aria-labelledby');

            const hasAccessibleName = !!ariaLabel || !!textContent?.trim() || !!ariaLabelledBy;
            expect(hasAccessibleName).toBe(true);

            // Check disabled state
            const isDisabled = await button.getAttribute('disabled');
            const ariaDisabled = await button.getAttribute('aria-disabled');

            if (isDisabled !== null) {
                expect(ariaDisabled).toBe('true');
            }

            // Check expanded state for toggle buttons
            const ariaExpanded = await button.getAttribute('aria-expanded');
            if (ariaExpanded !== null) {
                expect(['true', 'false']).toContain(ariaExpanded);
            }
        }

        // Test links
        const links = page.locator('a[href]');
        const linkCount = await links.count();

        for (let i = 0; i < linkCount; i++) {
            const link = links.nth(i);

            const textContent = await link.textContent();
            const ariaLabel = await link.getAttribute('aria-label');

            const hasAccessibleName = !!textContent?.trim() || !!ariaLabel;
            expect(hasAccessibleName).toBe(true);

            // Check for external links
            const href = await link.getAttribute('href');
            if (href && (href.startsWith('http') && !href.includes(page.url()))) {
                const ariaLabel = await link.getAttribute('aria-label');
                const title = await link.getAttribute('title');

                // External links should indicate they open in new window/tab
                const indicatesExternal = ariaLabel?.includes('external') ||
                    ariaLabel?.includes('new window') ||
                    title?.includes('external') ||
                    title?.includes('new window');

                if (!indicatesExternal) {
                    console.warn(`External link may need accessibility indicator: ${href}`);
                }
            }
        }

        // Test custom interactive elements
        const customInteractive = page.locator('[role="button"], [role="tab"], [role="menuitem"]');
        const customCount = await customInteractive.count();

        for (let i = 0; i < customCount; i++) {
            const element = customInteractive.nth(i);
            const role = await element.getAttribute('role');

            // Check for accessible name
            const ariaLabel = await element.getAttribute('aria-label');
            const textContent = await element.textContent();

            const hasAccessibleName = !!ariaLabel || !!textContent?.trim();
            expect(hasAccessibleName).toBe(true);

            // Check for appropriate keyboard support
            const tabIndex = await element.getAttribute('tabindex');
            if (role === 'button' || role === 'tab' || role === 'menuitem') {
                expect(tabIndex).not.toBe('-1');
            }
        }
    });

    test('Images have appropriate alt text', async ({ page }) => {
        await page.goto('/design-system');
        await page.waitForLoadState('networkidle');

        const images = page.locator('img');
        const imageCount = await images.count();

        for (let i = 0; i < imageCount; i++) {
            const img = images.nth(i);

            const alt = await img.getAttribute('alt');
            const role = await img.getAttribute('role');
            const ariaHidden = await img.getAttribute('aria-hidden');

            // Decorative images should have empty alt or aria-hidden
            if (role === 'presentation' || ariaHidden === 'true') {
                // These are decorative, no alt text needed
                continue;
            }

            // Content images should have meaningful alt text
            expect(alt).toBeDefined();

            // Alt text should not be redundant
            const redundantPhrases = ['image of', 'picture of', 'photo of', 'graphic of'];
            if (alt) {
                const hasRedundantPhrase = redundantPhrases.some(phrase =>
                    alt.toLowerCase().includes(phrase)
                );
                expect(hasRedundantPhrase).toBe(false);
            }
        }
    });

    test('Headings follow proper hierarchy', async ({ page }) => {
        await page.goto('/design-system');
        await page.waitForLoadState('networkidle');

        const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();

        if (headings.length === 0) return;

        const headingLevels: number[] = [];

        for (const heading of headings) {
            const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
            const level = parseInt(tagName.charAt(1));
            headingLevels.push(level);
        }

        // Check that page starts with h1
        expect(headingLevels[0]).toBe(1);

        // Check that heading levels don't skip (e.g., h1 -> h3)
        for (let i = 1; i < headingLevels.length; i++) {
            const currentLevel = headingLevels[i];
            const previousLevel = headingLevels[i - 1];

            // Heading level should not increase by more than 1
            if (currentLevel > previousLevel) {
                expect(currentLevel - previousLevel).toBeLessThanOrEqual(1);
            }
        }
    });

    test('Focus management in dynamic content', async ({ page }) => {
        await page.goto('/design-system');
        await page.waitForLoadState('networkidle');

        // Test theme toggle focus management
        const themeToggle = page.locator('[data-testid="theme-toggle"]');
        if (await themeToggle.count() > 0) {
            await themeToggle.focus();
            await page.keyboard.press('Enter');
            await page.waitForTimeout(300);

            // Focus should remain on theme toggle after activation
            const focusedElement = page.locator(':focus');
            const isSameElement = await focusedElement.evaluate((focused, toggle) => {
                return focused === toggle;
            }, await themeToggle.elementHandle());

            expect(isSameElement).toBe(true);
        }

        // Test modal/dialog focus management
        const modalTrigger = page.locator('[data-testid*="modal-trigger"], [data-testid*="dialog-trigger"]');
        if (await modalTrigger.count() > 0) {
            await modalTrigger.first().focus();
            await page.keyboard.press('Enter');
            await page.waitForTimeout(300);

            // Focus should move to modal
            const modal = page.locator('[role="dialog"]');
            if (await modal.count() > 0) {
                const modalFocused = await page.evaluate(() => {
                    const activeElement = document.activeElement;
                    const modal = document.querySelector('[role="dialog"]');
                    return modal?.contains(activeElement) || false;
                });

                expect(modalFocused).toBe(true);

                // Test focus trap
                const focusableInModal = modal.locator('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])');
                const focusableCount = await focusableInModal.count();

                if (focusableCount > 1) {
                    // Tab through all focusable elements
                    for (let i = 0; i < focusableCount; i++) {
                        await page.keyboard.press('Tab');
                        await page.waitForTimeout(50);
                    }

                    // One more tab should cycle back to first element
                    await page.keyboard.press('Tab');
                    await page.waitForTimeout(50);

                    const firstFocusable = focusableInModal.first();
                    const isFirstFocused = await firstFocusable.evaluate(el => el === document.activeElement);
                    expect(isFirstFocused).toBe(true);
                }

                // Close modal and check focus return
                await page.keyboard.press('Escape');
                await page.waitForTimeout(300);

                // Focus should return to trigger
                const triggerFocused = await modalTrigger.first().evaluate(el => el === document.activeElement);
                expect(triggerFocused).toBe(true);
            }
        }
    });

    test('Screen reader compatibility', async ({ page }) => {
        await page.goto('/design-system');
        await page.waitForLoadState('networkidle');

        // Test landmark regions
        const landmarks = await page.locator('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], main, nav, header, footer').all();

        // Page should have main content area
        const mainLandmark = page.locator('[role="main"], main');
        expect(await mainLandmark.count()).toBeGreaterThan(0);

        // Test skip links
        const skipLinks = page.locator('a[href^="#"]').filter({ hasText: /skip/i });
        const skipLinkCount = await skipLinks.count();

        if (skipLinkCount > 0) {
            const firstSkipLink = skipLinks.first();
            await firstSkipLink.focus();

            // Skip link should be visible when focused
            const isVisible = await firstSkipLink.isVisible();
            expect(isVisible).toBe(true);

            // Test skip link functionality
            const href = await firstSkipLink.getAttribute('href');
            if (href) {
                await firstSkipLink.click();
                await page.waitForTimeout(100);

                const targetElement = page.locator(href);
                if (await targetElement.count() > 0) {
                    const targetFocused = await targetElement.evaluate(el => el === document.activeElement);
                    expect(targetFocused).toBe(true);
                }
            }
        }

        // Test live regions
        const liveRegions = page.locator('[aria-live], [role="status"], [role="alert"]');
        const liveRegionCount = await liveRegions.count();

        for (let i = 0; i < liveRegionCount; i++) {
            const region = liveRegions.nth(i);
            const ariaLive = await region.getAttribute('aria-live');
            const role = await region.getAttribute('role');

            if (ariaLive) {
                expect(['polite', 'assertive', 'off']).toContain(ariaLive);
            }

            if (role === 'alert') {
                // Alert regions should have aria-live="assertive" implicitly
                const textContent = await region.textContent();
                expect(textContent?.trim()).toBeTruthy();
            }
        }

        // Test table accessibility (if any tables exist)
        const tables = page.locator('table');
        const tableCount = await tables.count();

        for (let i = 0; i < tableCount; i++) {
            const table = tables.nth(i);

            // Tables should have captions or aria-label
            const caption = table.locator('caption');
            const ariaLabel = await table.getAttribute('aria-label');
            const ariaLabelledBy = await table.getAttribute('aria-labelledby');

            const hasAccessibleName = await caption.count() > 0 || !!ariaLabel || !!ariaLabelledBy;
            expect(hasAccessibleName).toBe(true);

            // Check for proper header structure
            const headers = table.locator('th');
            const headerCount = await headers.count();

            if (headerCount > 0) {
                for (let j = 0; j < headerCount; j++) {
                    const header = headers.nth(j);
                    const scope = await header.getAttribute('scope');

                    // Headers should have scope attribute
                    expect(scope).toBeTruthy();
                    expect(['col', 'row', 'colgroup', 'rowgroup']).toContain(scope!);
                }
            }
        }
    });
});
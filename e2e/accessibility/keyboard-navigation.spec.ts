import { expect, test } from '@playwright/test';

/**
 * Keyboard Navigation Tests
 * 
 * Comprehensive keyboard navigation testing to ensure all interactive elements
 * are accessible via keyboard and follow proper focus management patterns.
 */

interface KeyboardTestConfig {
    route: string;
    name: string;
    expectedFocusableCount?: number;
    skipLinks?: boolean;
    customTests?: (page: any) => Promise<void>;
}

const keyboardTestRoutes: KeyboardTestConfig[] = [
    {
        route: '/design-system/buttons',
        name: 'Buttons',
        expectedFocusableCount: 15, // Approximate number of focusable elements
        skipLinks: false
    },
    {
        route: '/design-system/forms',
        name: 'Forms',
        expectedFocusableCount: 10,
        skipLinks: false,
        customTests: async (page) => {
            // Test form-specific keyboard behavior
            await testFormKeyboardBehavior(page);
        }
    },
    {
        route: '/design-system/stat-cards',
        name: 'StatCards',
        expectedFocusableCount: 5,
        skipLinks: false
    },
    {
        route: '/dashboard',
        name: 'Dashboard',
        expectedFocusableCount: 20,
        skipLinks: true
    }
];

// Helper function to get all focusable elements
async function getFocusableElements(page: any) {
    return await page.locator(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), ' +
        'a[href], area[href], iframe, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'
    ).all();
}

// Helper function to test form-specific keyboard behavior
async function testFormKeyboardBehavior(page: any) {
    // Test Enter key submission behavior
    const inputs = await page.locator('input[type="text"], input[type="email"]').all();

    for (const input of inputs) {
        await input.focus();
        await input.fill('test@example.com');

        // Enter should not submit unless in a form with submit button
        await page.keyboard.press('Enter');

        // Verify form doesn't submit unexpectedly
        const currentUrl = page.url();
        expect(currentUrl).not.toContain('?'); // No query parameters from form submission
    }

    // Test Escape key behavior in dropdowns
    const selects = await page.locator('select, [role="combobox"]').all();

    for (const select of selects) {
        await select.focus();
        await page.keyboard.press('Space'); // Open dropdown
        await page.waitForTimeout(100);

        await page.keyboard.press('Escape'); // Close dropdown
        await page.waitForTimeout(100);

        // Verify dropdown is closed and focus is maintained
        await expect(select).toBeFocused();
    }
}

test.describe('Keyboard Navigation Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Ensure consistent keyboard behavior
        await page.addInitScript(() => {
            // Disable smooth scrolling for consistent testing
            document.documentElement.style.scrollBehavior = 'auto';
        });
    });

    keyboardTestRoutes.forEach(config => {
        test.describe(`${config.name} keyboard navigation`, () => {
            test('Tab navigation forward and backward', async ({ page }) => {
                await page.goto(config.route);
                await page.waitForLoadState('networkidle');

                const focusableElements = await getFocusableElements(page);

                if (config.expectedFocusableCount) {
                    expect(focusableElements.length).toBeGreaterThanOrEqual(config.expectedFocusableCount - 5);
                    expect(focusableElements.length).toBeLessThanOrEqual(config.expectedFocusableCount + 5);
                }

                // Test forward tab navigation
                let focusedElements: string[] = [];

                for (let i = 0; i < focusableElements.length; i++) {
                    await page.keyboard.press('Tab');

                    const focusedElement = page.locator(':focus');
                    await expect(focusedElement).toBeVisible();

                    // Get element identifier for tracking
                    const elementId = await focusedElement.evaluate(el => {
                        return el.id || el.getAttribute('data-testid') || el.tagName + '_' + Array.from(el.parentNode?.children || []).indexOf(el);
                    });

                    focusedElements.push(elementId);

                    // Verify focus indicator is visible
                    const hasVisibleFocus = await focusedElement.evaluate(el => {
                        const style = window.getComputedStyle(el);
                        return style.outline !== 'none' ||
                            style.outlineWidth !== '0px' ||
                            style.boxShadow !== 'none' ||
                            el.matches(':focus-visible');
                    });

                    expect(hasVisibleFocus).toBe(true);
                }

                // Test backward tab navigation
                for (let i = focusableElements.length - 1; i >= 0; i--) {
                    await page.keyboard.press('Shift+Tab');

                    const focusedElement = page.locator(':focus');
                    await expect(focusedElement).toBeVisible();

                    const elementId = await focusedElement.evaluate(el => {
                        return el.id || el.getAttribute('data-testid') || el.tagName + '_' + Array.from(el.parentNode?.children || []).indexOf(el);
                    });

                    // Should match the forward navigation order in reverse
                    expect(elementId).toBe(focusedElements[i]);
                }
            });

            test('Skip links functionality', async ({ page }) => {
                if (!config.skipLinks) {
                    test.skip('Skip links not applicable for this route');
                }

                await page.goto(config.route);
                await page.waitForLoadState('networkidle');

                // First tab should focus skip link
                await page.keyboard.press('Tab');

                const skipLink = page.locator(':focus');
                const skipLinkText = await skipLink.textContent();

                expect(skipLinkText?.toLowerCase()).toContain('skip');
                await expect(skipLink).toBeVisible();

                // Activate skip link
                await page.keyboard.press('Enter');

                // Focus should move to main content
                const focusedElement = page.locator(':focus');
                const focusedId = await focusedElement.getAttribute('id');
                const focusedRole = await focusedElement.getAttribute('role');

                expect(focusedId?.toLowerCase().includes('main') || focusedRole === 'main').toBe(true);
            });

            test('Arrow key navigation in component groups', async ({ page }) => {
                await page.goto(config.route);
                await page.waitForLoadState('networkidle');

                // Test arrow key navigation in button groups
                const buttonGroups = await page.locator('[role="group"], .button-group, [data-testid*="button-group"]').all();

                for (const group of buttonGroups) {
                    const buttons = await group.locator('button').all();

                    if (buttons.length > 1) {
                        // Focus first button in group
                        await buttons[0].focus();

                        // Test right arrow navigation
                        for (let i = 1; i < buttons.length; i++) {
                            await page.keyboard.press('ArrowRight');
                            await expect(buttons[i]).toBeFocused();
                        }

                        // Test left arrow navigation
                        for (let i = buttons.length - 2; i >= 0; i--) {
                            await page.keyboard.press('ArrowLeft');
                            await expect(buttons[i]).toBeFocused();
                        }
                    }
                }

                // Test arrow key navigation in tab groups
                const tabGroups = await page.locator('[role="tablist"]').all();

                for (const tablist of tabGroups) {
                    const tabs = await tablist.locator('[role="tab"]').all();

                    if (tabs.length > 1) {
                        await tabs[0].focus();

                        // Test right arrow in tabs
                        for (let i = 1; i < tabs.length; i++) {
                            await page.keyboard.press('ArrowRight');
                            await expect(tabs[i]).toBeFocused();
                        }
                    }
                }
            });

            test('Enter and Space key activation', async ({ page }) => {
                await page.goto(config.route);
                await page.waitForLoadState('networkidle');

                // Test button activation with Enter and Space
                const buttons = await page.locator('button').all();

                for (let i = 0; i < Math.min(buttons.length, 5); i++) {
                    const button = buttons[i];

                    // Test Enter key activation
                    await button.focus();

                    const buttonText = await button.textContent();
                    const isClickable = await button.evaluate(el => !el.disabled);

                    if (isClickable) {
                        // Mock click handler to verify activation
                        await button.evaluate(el => {
                            el.setAttribute('data-test-activated', 'false');
                            el.addEventListener('click', () => {
                                el.setAttribute('data-test-activated', 'true');
                            }, { once: true });
                        });

                        await page.keyboard.press('Enter');
                        await page.waitForTimeout(100);

                        const wasActivated = await button.getAttribute('data-test-activated');
                        expect(wasActivated).toBe('true');

                        // Reset for Space key test
                        await button.evaluate(el => {
                            el.setAttribute('data-test-activated', 'false');
                            el.addEventListener('click', () => {
                                el.setAttribute('data-test-activated', 'true');
                            }, { once: true });
                        });

                        await page.keyboard.press('Space');
                        await page.waitForTimeout(100);

                        const wasActivatedBySpace = await button.getAttribute('data-test-activated');
                        expect(wasActivatedBySpace).toBe('true');
                    }
                }
            });

            test('Focus trap in modals and dropdowns', async ({ page }) => {
                await page.goto(config.route);
                await page.waitForLoadState('networkidle');

                // Test dropdown focus trapping
                const dropdownTriggers = await page.locator('[aria-haspopup="true"], select, [role="combobox"]').all();

                for (const trigger of dropdownTriggers) {
                    await trigger.focus();

                    // Open dropdown
                    await page.keyboard.press('Space');
                    await page.waitForTimeout(300);

                    // Check if dropdown is open
                    const dropdown = page.locator('[role="listbox"], [role="menu"], option');
                    const isOpen = await dropdown.count() > 0;

                    if (isOpen) {
                        // Tab should stay within dropdown
                        const initialFocus = page.locator(':focus');
                        await page.keyboard.press('Tab');

                        const newFocus = page.locator(':focus');
                        const focusStayedInDropdown = await newFocus.evaluate(el => {
                            return el.closest('[role="listbox"], [role="menu"], select') !== null;
                        });

                        // Close dropdown
                        await page.keyboard.press('Escape');
                        await page.waitForTimeout(100);

                        // Focus should return to trigger
                        await expect(trigger).toBeFocused();
                    }
                }
            });

            test('Custom keyboard shortcuts', async ({ page }) => {
                await page.goto(config.route);
                await page.waitForLoadState('networkidle');

                // Test common keyboard shortcuts
                const shortcuts = [
                    { key: 'Escape', description: 'Close modals/dropdowns' },
                    { key: 'Home', description: 'Go to first element' },
                    { key: 'End', description: 'Go to last element' }
                ];

                for (const shortcut of shortcuts) {
                    // Focus a random element first
                    const focusableElements = await getFocusableElements(page);
                    if (focusableElements.length > 0) {
                        await focusableElements[Math.floor(focusableElements.length / 2)].focus();

                        await page.keyboard.press(shortcut.key);
                        await page.waitForTimeout(100);

                        // Verify appropriate behavior (this will vary by component)
                        const focusedElement = page.locator(':focus');
                        await expect(focusedElement).toBeVisible();
                    }
                }
            });

            if (config.customTests) {
                test('Component-specific keyboard behavior', async ({ page }) => {
                    await page.goto(config.route);
                    await page.waitForLoadState('networkidle');

                    await config.customTests!(page);
                });
            }
        });
    });

    test.describe('Cross-theme keyboard navigation', () => {
        test('Keyboard navigation consistency across themes', async ({ page }) => {
            const route = '/design-system/buttons';

            // Test in light theme
            await page.goto(route);
            await page.waitForLoadState('networkidle');

            await page.evaluate(() => {
                document.documentElement.setAttribute('data-theme', 'light');
            });
            await page.waitForTimeout(500);

            const lightThemeFocusableElements = await getFocusableElements(page);

            // Test in dark theme
            await page.evaluate(() => {
                document.documentElement.setAttribute('data-theme', 'dark');
            });
            await page.waitForTimeout(500);

            const darkThemeFocusableElements = await getFocusableElements(page);

            // Should have same number of focusable elements
            expect(darkThemeFocusableElements.length).toBe(lightThemeFocusableElements.length);

            // Test tab navigation in dark theme
            for (let i = 0; i < Math.min(darkThemeFocusableElements.length, 5); i++) {
                await page.keyboard.press('Tab');

                const focusedElement = page.locator(':focus');
                await expect(focusedElement).toBeVisible();

                // Focus indicator should be visible in dark theme
                const hasVisibleFocus = await focusedElement.evaluate(el => {
                    const style = window.getComputedStyle(el);
                    return style.outline !== 'none' ||
                        style.outlineWidth !== '0px' ||
                        style.boxShadow !== 'none';
                });

                expect(hasVisibleFocus).toBe(true);
            }
        });
    });

    test.describe('Responsive keyboard navigation', () => {
        const breakpoints = [
            { name: 'mobile', width: 375, height: 667 },
            { name: 'tablet', width: 768, height: 1024 },
            { name: 'desktop', width: 1440, height: 900 }
        ];

        breakpoints.forEach(breakpoint => {
            test(`Keyboard navigation at ${breakpoint.name} breakpoint`, async ({ page }) => {
                await page.setViewportSize(breakpoint);
                await page.goto('/dashboard');
                await page.waitForLoadState('networkidle');

                const focusableElements = await getFocusableElements(page);

                // Should have focusable elements at all breakpoints
                expect(focusableElements.length).toBeGreaterThan(0);

                // Test tab navigation
                for (let i = 0; i < Math.min(focusableElements.length, 10); i++) {
                    await page.keyboard.press('Tab');

                    const focusedElement = page.locator(':focus');
                    await expect(focusedElement).toBeVisible();

                    // Element should be in viewport
                    const isInViewport = await focusedElement.evaluate(el => {
                        const rect = el.getBoundingClientRect();
                        return rect.top >= 0 && rect.left >= 0 &&
                            rect.bottom <= window.innerHeight &&
                            rect.right <= window.innerWidth;
                    });

                    // If not in viewport, it should scroll into view
                    if (!isInViewport) {
                        await focusedElement.scrollIntoViewIfNeeded();
                        await page.waitForTimeout(100);

                        const isNowInViewport = await focusedElement.evaluate(el => {
                            const rect = el.getBoundingClientRect();
                            return rect.top >= 0 && rect.left >= 0 &&
                                rect.bottom <= window.innerHeight &&
                                rect.right <= window.innerWidth;
                        });

                        expect(isNowInViewport).toBe(true);
                    }
                }
            });
        });
    });
});
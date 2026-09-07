import { expect, test } from '@playwright/test';

/**
 * Visual Regression Tests for Design System Components
 *
 * This test suite captures screenshots of all UI components in both light and dark themes
 * across different responsive breakpoints to detect visual regressions.
 */

// Test data for components
const componentTestData = {
  button: {
    variants: ['primary', 'secondary', 'outline', 'ghost', 'destructive'],
    sizes: ['sm', 'md', 'lg'],
    states: ['default', 'hover', 'focus', 'disabled', 'loading'],
  },
  statCard: {
    variants: ['default', 'compact', 'large'],
    states: ['default', 'loading'],
  },
  input: {
    variants: ['default', 'error', 'success'],
    states: ['default', 'focus', 'disabled'],
  },
  select: {
    variants: ['default', 'error'],
    states: ['default', 'focus', 'disabled', 'open'],
  },
  card: {
    variants: ['default', 'elevated'],
    states: ['default', 'hover'],
  },
};

// Responsive breakpoints to test
const breakpoints = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

// Themes to test
const themes = ['light', 'dark'];

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to design system showcase page
    await page.goto('/design-system');

    // Wait for fonts and styles to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Additional wait for font rendering
  });

  themes.forEach(theme => {
    test.describe(`${theme} theme`, () => {
      test.beforeEach(async ({ page }) => {
        // Set theme
        await page.evaluate(themeValue => {
          document.documentElement.setAttribute('data-theme', themeValue);
          localStorage.setItem('theme', themeValue);
        }, theme);

        // Wait for theme transition
        await page.waitForTimeout(500);
      });

      breakpoints.forEach(breakpoint => {
        test.describe(`${breakpoint.name} breakpoint`, () => {
          test.beforeEach(async ({ page }) => {
            await page.setViewportSize({
              width: breakpoint.width,
              height: breakpoint.height,
            });
          });

          test('Button component variants and states', async ({ page }) => {
            await page.goto('/design-system/buttons');
            await page.waitForLoadState('networkidle');

            // Test each button variant
            for (const variant of componentTestData.button.variants) {
              for (const size of componentTestData.button.sizes) {
                const selector = `[data-testid="button-${variant}-${size}"]`;
                const element = page.locator(selector);

                if ((await element.count()) > 0) {
                  // Default state
                  await expect(element).toHaveScreenshot(
                    `button-${variant}-${size}-${theme}-${breakpoint.name}.png`
                  );

                  // Hover state
                  await element.hover();
                  await expect(element).toHaveScreenshot(
                    `button-${variant}-${size}-hover-${theme}-${breakpoint.name}.png`
                  );

                  // Focus state
                  await element.focus();
                  await expect(element).toHaveScreenshot(
                    `button-${variant}-${size}-focus-${theme}-${breakpoint.name}.png`
                  );
                }
              }
            }

            // Test loading state
            const loadingButton = page.locator(
              '[data-testid="button-loading"]'
            );
            if ((await loadingButton.count()) > 0) {
              await expect(loadingButton).toHaveScreenshot(
                `button-loading-${theme}-${breakpoint.name}.png`
              );
            }

            // Test disabled state
            const disabledButton = page.locator(
              '[data-testid="button-disabled"]'
            );
            if ((await disabledButton.count()) > 0) {
              await expect(disabledButton).toHaveScreenshot(
                `button-disabled-${theme}-${breakpoint.name}.png`
              );
            }
          });

          test('StatCard component variants and states', async ({ page }) => {
            await page.goto('/design-system/stat-cards');
            await page.waitForLoadState('networkidle');

            // Test each stat card variant
            for (const variant of componentTestData.statCard.variants) {
              const selector = `[data-testid="stat-card-${variant}"]`;
              const element = page.locator(selector);

              if ((await element.count()) > 0) {
                // Default state
                await expect(element).toHaveScreenshot(
                  `stat-card-${variant}-${theme}-${breakpoint.name}.png`
                );

                // Hover state
                await element.hover();
                await expect(element).toHaveScreenshot(
                  `stat-card-${variant}-hover-${theme}-${breakpoint.name}.png`
                );
              }
            }

            // Test loading state
            const loadingCard = page.locator(
              '[data-testid="stat-card-loading"]'
            );
            if ((await loadingCard.count()) > 0) {
              await expect(loadingCard).toHaveScreenshot(
                `stat-card-loading-${theme}-${breakpoint.name}.png`
              );
            }
          });

          test('Form components', async ({ page }) => {
            await page.goto('/design-system/forms');
            await page.waitForLoadState('networkidle');

            // Test input variants
            for (const variant of componentTestData.input.variants) {
              const selector = `[data-testid="input-${variant}"]`;
              const element = page.locator(selector);

              if ((await element.count()) > 0) {
                // Default state
                await expect(element).toHaveScreenshot(
                  `input-${variant}-${theme}-${breakpoint.name}.png`
                );

                // Focus state
                await element.focus();
                await expect(element).toHaveScreenshot(
                  `input-${variant}-focus-${theme}-${breakpoint.name}.png`
                );
              }
            }

            // Test select component
            const selectElement = page.locator(
              '[data-testid="select-default"]'
            );
            if ((await selectElement.count()) > 0) {
              await expect(selectElement).toHaveScreenshot(
                `select-default-${theme}-${breakpoint.name}.png`
              );

              // Open dropdown
              await selectElement.click();
              await page.waitForTimeout(300); // Wait for animation
              await expect(
                page.locator('[data-testid="select-content"]')
              ).toHaveScreenshot(`select-open-${theme}-${breakpoint.name}.png`);
            }

            // Test textarea
            const textareaElement = page.locator(
              '[data-testid="textarea-default"]'
            );
            if ((await textareaElement.count()) > 0) {
              await expect(textareaElement).toHaveScreenshot(
                `textarea-default-${theme}-${breakpoint.name}.png`
              );
            }
          });

          test('Page layout components', async ({ page }) => {
            await page.goto('/design-system/page-header');
            await page.waitForLoadState('networkidle');

            // Test page header variants
            const pageHeader = page.locator(
              '[data-testid="page-header-default"]'
            );
            if ((await pageHeader.count()) > 0) {
              await expect(pageHeader).toHaveScreenshot(
                `page-header-default-${theme}-${breakpoint.name}.png`
              );
            }

            const compactHeader = page.locator(
              '[data-testid="page-header-compact"]'
            );
            if ((await compactHeader.count()) > 0) {
              await expect(compactHeader).toHaveScreenshot(
                `page-header-compact-${theme}-${breakpoint.name}.png`
              );
            }
          });

          test('Grid system', async ({ page }) => {
            await page.goto('/design-system/grid-system');
            await page.waitForLoadState('networkidle');

            // Test grid layouts
            const gridContainer = page.locator(
              '[data-testid="grid-container"]'
            );
            if ((await gridContainer.count()) > 0) {
              await expect(gridContainer).toHaveScreenshot(
                `grid-system-${theme}-${breakpoint.name}.png`
              );
            }

            const compactGrid = page.locator('[data-testid="grid-compact"]');
            if ((await compactGrid.count()) > 0) {
              await expect(compactGrid).toHaveScreenshot(
                `grid-compact-${theme}-${breakpoint.name}.png`
              );
            }
          });

          test('Card components', async ({ page }) => {
            await page.goto('/design-system');
            await page.waitForLoadState('networkidle');

            // Find card examples
            const cards = page.locator('[data-testid^="card-"]');
            const cardCount = await cards.count();

            for (let i = 0; i < cardCount; i++) {
              const card = cards.nth(i);
              const testId = await card.getAttribute('data-testid');

              if (testId) {
                // Default state
                await expect(card).toHaveScreenshot(
                  `${testId}-${theme}-${breakpoint.name}.png`
                );

                // Hover state if interactive
                const isInteractive = await card.evaluate(el =>
                  el.matches(':hover, [role="button"], button, a')
                );

                if (isInteractive) {
                  await card.hover();
                  await expect(card).toHaveScreenshot(
                    `${testId}-hover-${theme}-${breakpoint.name}.png`
                  );
                }
              }
            }
          });

          test('Navigation components', async ({ page }) => {
            // Test navigation in a page that has it
            await page.goto('/dashboard');
            await page.waitForLoadState('networkidle');

            const navbar = page.locator('[data-testid="navbar"]');
            if ((await navbar.count()) > 0) {
              await expect(navbar).toHaveScreenshot(
                `navbar-${theme}-${breakpoint.name}.png`
              );
            }

            const navigation = page.locator('[data-testid="navigation"]');
            if ((await navigation.count()) > 0) {
              await expect(navigation).toHaveScreenshot(
                `navigation-${theme}-${breakpoint.name}.png`
              );
            }
          });

          test('Loading and skeleton states', async ({ page }) => {
            await page.goto('/design-system');
            await page.waitForLoadState('networkidle');

            // Test skeleton components
            const skeletons = page.locator('[data-testid^="skeleton-"]');
            const skeletonCount = await skeletons.count();

            for (let i = 0; i < skeletonCount; i++) {
              const skeleton = skeletons.nth(i);
              const testId = await skeleton.getAttribute('data-testid');

              if (testId) {
                await expect(skeleton).toHaveScreenshot(
                  `${testId}-${theme}-${breakpoint.name}.png`
                );
              }
            }

            // Test spinner component
            const spinner = page.locator('[data-testid="spinner"]');
            if ((await spinner.count()) > 0) {
              await expect(spinner).toHaveScreenshot(
                `spinner-${theme}-${breakpoint.name}.png`
              );
            }
          });

          test('Status and feedback components', async ({ page }) => {
            await page.goto('/design-system');
            await page.waitForLoadState('networkidle');

            // Test badges
            const badges = page.locator('[data-testid^="badge-"]');
            const badgeCount = await badges.count();

            for (let i = 0; i < badgeCount; i++) {
              const badge = badges.nth(i);
              const testId = await badge.getAttribute('data-testid');

              if (testId) {
                await expect(badge).toHaveScreenshot(
                  `${testId}-${theme}-${breakpoint.name}.png`
                );
              }
            }

            // Test alerts
            const alerts = page.locator('[data-testid^="alert-"]');
            const alertCount = await alerts.count();

            for (let i = 0; i < alertCount; i++) {
              const alert = alerts.nth(i);
              const testId = await alert.getAttribute('data-testid');

              if (testId) {
                await expect(alert).toHaveScreenshot(
                  `${testId}-${theme}-${breakpoint.name}.png`
                );
              }
            }
          });
        });
      });
    });
  });

  test.describe('Theme switching animation', () => {
    test('Theme transition is smooth', async ({ page }) => {
      await page.goto('/design-system');
      await page.waitForLoadState('networkidle');

      // Start with light theme
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'light');
      });
      await page.waitForTimeout(100);

      // Capture before transition
      await expect(page.locator('body')).toHaveScreenshot(
        'theme-before-transition.png'
      );

      // Switch to dark theme
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });

      // Wait for transition to complete
      await page.waitForTimeout(500);

      // Capture after transition
      await expect(page.locator('body')).toHaveScreenshot(
        'theme-after-transition.png'
      );
    });
  });

  test.describe('Component composition', () => {
    test('Complex component layouts', async ({ page }) => {
      // Test complex layouts that combine multiple components
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Dashboard layout
      await expect(
        page.locator('[data-testid="dashboard-layout"]')
      ).toHaveScreenshot('dashboard-layout-light-desktop.png');

      // Switch to dark theme
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(500);

      await expect(
        page.locator('[data-testid="dashboard-layout"]')
      ).toHaveScreenshot('dashboard-layout-dark-desktop.png');
    });
  });
});

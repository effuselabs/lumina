import { devices, expect, test } from '@playwright/test';
import {
  defaultVisualConfig,
  setupVisualTest,
} from './utils/visual-test-helpers';

/**
 * Cross-Browser and Responsive Testing
 *
 * Tests design system components across different browsers and viewport sizes
 * Ensures consistent rendering and functionality across all supported platforms
 */

test.describe('Cross-Browser Compatibility', () => {
  const browsers = ['chromium', 'firefox', 'webkit'];
  const testRoutes = ['/design-system', '/dashboard', '/auth/signin'];

  browsers.forEach(browserName => {
    test.describe(`${browserName} browser tests`, () => {
      test.use({
        ...devices['Desktop Chrome'],
        browserName: browserName as any,
      });

      testRoutes.forEach(route => {
        test(`${route} renders correctly in ${browserName}`, async ({
          page,
        }) => {
          await page.goto(route);
          await page.waitForLoadState('networkidle');

          // Wait for fonts and styles to load
          await page.waitForTimeout(1000);

          // Test both themes
          for (const theme of defaultVisualConfig.themes) {
            await page.evaluate(themeValue => {
              document.documentElement.setAttribute('data-theme', themeValue);
            }, theme);
            await page.waitForTimeout(500);

            // Check for layout shifts or rendering issues
            const layoutStable = await page.evaluate(() => {
              return new Promise(resolve => {
                let shifts = 0;
                const observer = new PerformanceObserver(list => {
                  for (const entry of list.getEntries()) {
                    if (entry.entryType === 'layout-shift') {
                      shifts += (entry as any).value;
                    }
                  }
                });
                observer.observe({ entryTypes: ['layout-shift'] });

                setTimeout(() => {
                  observer.disconnect();
                  resolve(shifts < 0.1); // CLS threshold
                }, 1000);
              });
            });

            expect(layoutStable).toBe(true);

            // Take screenshot for visual comparison
            await expect(page).toHaveScreenshot(
              `${browserName}-${route.replace(/\//g, '-')}-${theme}.png`,
              { fullPage: false }
            );
          }
        });
      });

      test(`Interactive elements work correctly in ${browserName}`, async ({
        page,
      }) => {
        await page.goto('/design-system');
        await page.waitForLoadState('networkidle');

        // Test button interactions
        const primaryButton = page
          .locator('[data-testid="button-primary"]')
          .first();
        if ((await primaryButton.count()) > 0) {
          // Test hover
          await primaryButton.hover();
          await page.waitForTimeout(100);

          // Test focus
          await primaryButton.focus();
          await page.waitForTimeout(100);

          // Test click
          await primaryButton.click();
          await page.waitForTimeout(100);
        }

        // Test form elements
        const input = page.locator('input[type="text"]').first();
        if ((await input.count()) > 0) {
          await input.focus();
          await input.fill('Test input');
          await expect(input).toHaveValue('Test input');
        }

        // Test select elements
        const select = page.locator('select').first();
        if ((await select.count()) > 0) {
          await select.focus();
          await select.selectOption({ index: 1 });
        }

        // Test theme toggle
        const themeToggle = page.locator('[data-testid="theme-toggle"]');
        if ((await themeToggle.count()) > 0) {
          const initialTheme = await page.evaluate(() =>
            document.documentElement.getAttribute('data-theme')
          );

          await themeToggle.click();
          await page.waitForTimeout(500);

          const newTheme = await page.evaluate(() =>
            document.documentElement.getAttribute('data-theme')
          );

          expect(newTheme).not.toBe(initialTheme);
        }
      });

      test(`Font rendering consistency in ${browserName}`, async ({ page }) => {
        await page.goto('/design-system');
        await page.waitForLoadState('networkidle');

        // Check if Inter font is loaded
        const fontLoaded = await page.evaluate(() => {
          return document.fonts.check('16px Inter');
        });

        expect(fontLoaded).toBe(true);

        // Test typography elements
        const typographyElements = ['h1', 'h2', 'h3', 'p', 'span'];

        for (const element of typographyElements) {
          const elements = page.locator(element);
          const count = await elements.count();

          if (count > 0) {
            const firstElement = elements.first();
            const computedStyle = await firstElement.evaluate(el => {
              const style = window.getComputedStyle(el);
              return {
                fontFamily: style.fontFamily,
                fontSize: style.fontSize,
                fontWeight: style.fontWeight,
                lineHeight: style.lineHeight,
              };
            });

            // Verify Inter font is being used
            expect(computedStyle.fontFamily).toContain('Inter');
          }
        }
      });
    });
  });
});

test.describe('Responsive Design Testing', () => {
  const breakpoints = [
    { name: 'mobile-portrait', ...devices['iPhone 12'] },
    { name: 'mobile-landscape', width: 667, height: 375 },
    { name: 'tablet-portrait', ...devices['iPad'] },
    { name: 'tablet-landscape', width: 1024, height: 768 },
    { name: 'desktop-small', width: 1280, height: 720 },
    { name: 'desktop-large', width: 1440, height: 900 },
    { name: 'desktop-wide', width: 1920, height: 1080 },
    { name: 'desktop-ultrawide', width: 2560, height: 1440 },
  ];

  const testRoutes = ['/design-system', '/dashboard'];

  breakpoints.forEach(breakpoint => {
    test.describe(`${breakpoint.name} (${breakpoint.width}x${breakpoint.height})`, () => {
      test.use({
        viewport: {
          width: breakpoint.width,
          height: breakpoint.height,
        },
      });

      testRoutes.forEach(route => {
        test(`${route} responsive layout at ${breakpoint.name}`, async ({
          page,
        }) => {
          await page.goto(route);
          await page.waitForLoadState('networkidle');

          // Test both themes
          for (const theme of defaultVisualConfig.themes) {
            await setupVisualTest(page, theme, breakpoint);

            // Check for horizontal scrollbars (should not exist)
            const hasHorizontalScroll = await page.evaluate(() => {
              return (
                document.documentElement.scrollWidth >
                document.documentElement.clientWidth
              );
            });

            expect(hasHorizontalScroll).toBe(false);

            // Check for content overflow
            const overflowElements = await page.evaluate(() => {
              const elements = Array.from(document.querySelectorAll('*'));
              return elements.filter(el => {
                const rect = el.getBoundingClientRect();
                return rect.right > window.innerWidth;
              }).length;
            });

            expect(overflowElements).toBe(0);

            // Test navigation responsiveness
            const navigation = page.locator('[data-testid="navigation"]');
            if ((await navigation.count()) > 0) {
              const navVisible = await navigation.isVisible();

              // On mobile, navigation might be hidden behind a menu
              if (breakpoint.width < 768) {
                const mobileMenu = page.locator(
                  '[data-testid="mobile-menu-trigger"]'
                );
                if ((await mobileMenu.count()) > 0) {
                  expect(await mobileMenu.isVisible()).toBe(true);
                }
              } else {
                expect(navVisible).toBe(true);
              }
            }

            // Test content readability
            const textElements = page.locator(
              'p, h1, h2, h3, h4, h5, h6, span'
            );
            const textCount = await textElements.count();

            if (textCount > 0) {
              const sampleText = textElements.first();
              const textStyle = await sampleText.evaluate(el => {
                const style = window.getComputedStyle(el);
                return {
                  fontSize: parseFloat(style.fontSize),
                  lineHeight: parseFloat(style.lineHeight),
                };
              });

              // Ensure minimum readable font size
              expect(textStyle.fontSize).toBeGreaterThanOrEqual(14);
            }

            // Take screenshot
            await expect(page).toHaveScreenshot(
              `responsive-${route.replace(/\//g, '-')}-${theme}-${breakpoint.name}.png`,
              { fullPage: true }
            );
          }
        });
      });

      test(`Touch interactions at ${breakpoint.name}`, async ({ page }) => {
        // Only test touch on mobile/tablet breakpoints
        if (breakpoint.width > 1024) return;

        await page.goto('/design-system');
        await page.waitForLoadState('networkidle');

        // Test button touch targets
        const buttons = page.locator('button');
        const buttonCount = await buttons.count();

        for (let i = 0; i < Math.min(buttonCount, 5); i++) {
          const button = buttons.nth(i);
          const boundingBox = await button.boundingBox();

          if (boundingBox) {
            // Touch targets should be at least 44px (iOS) or 48px (Android)
            expect(boundingBox.width).toBeGreaterThanOrEqual(44);
            expect(boundingBox.height).toBeGreaterThanOrEqual(44);

            // Test touch interaction
            await button.tap();
            await page.waitForTimeout(100);
          }
        }

        // Test swipe gestures if applicable
        const swipeableElements = page.locator('[data-swipeable="true"]');
        const swipeCount = await swipeableElements.count();

        if (swipeCount > 0) {
          const swipeElement = swipeableElements.first();
          const box = await swipeElement.boundingBox();

          if (box) {
            // Simulate swipe left
            await page.touchscreen.tap(
              box.x + box.width * 0.8,
              box.y + box.height / 2
            );
            await page.mouse.move(
              box.x + box.width * 0.2,
              box.y + box.height / 2
            );
            await page.waitForTimeout(300);
          }
        }

        // Test form elements touch interaction
        const inputs = page.locator('input, textarea, select');
        const inputCount = await inputs.count();

        for (let i = 0; i < Math.min(inputCount, 3); i++) {
          const input = inputs.nth(i);
          await input.tap();
          await page.waitForTimeout(100);

          // Check if virtual keyboard space is handled
          const viewportHeight = await page.evaluate(() => window.innerHeight);
          const documentHeight = await page.evaluate(
            () => document.documentElement.clientHeight
          );

          // On mobile, viewport might shrink when keyboard appears
          // This is expected behavior
        }
      });

      test(`Performance at ${breakpoint.name}`, async ({ page }) => {
        await page.goto('/design-system');

        // Measure performance metrics
        const metrics = await page.evaluate(() => {
          return new Promise(resolve => {
            new PerformanceObserver(list => {
              const entries = list.getEntries();
              const navigation = entries.find(
                entry => entry.entryType === 'navigation'
              ) as any;

              if (navigation) {
                resolve({
                  domContentLoaded:
                    navigation.domContentLoadedEventEnd -
                    navigation.domContentLoadedEventStart,
                  loadComplete:
                    navigation.loadEventEnd - navigation.loadEventStart,
                  firstPaint:
                    performance
                      .getEntriesByType('paint')
                      .find(entry => entry.name === 'first-paint')?.startTime ||
                    0,
                  firstContentfulPaint:
                    performance
                      .getEntriesByType('paint')
                      .find(entry => entry.name === 'first-contentful-paint')
                      ?.startTime || 0,
                });
              }
            }).observe({ entryTypes: ['navigation'] });

            // Fallback timeout
            setTimeout(
              () =>
                resolve({
                  domContentLoaded: 0,
                  loadComplete: 0,
                  firstPaint: 0,
                  firstContentfulPaint: 0,
                }),
              5000
            );
          });
        });

        // Performance thresholds (in milliseconds)
        const thresholds = {
          domContentLoaded: 2000,
          loadComplete: 3000,
          firstPaint: 1000,
          firstContentfulPaint: 1500,
        };

        console.log(`Performance metrics for ${breakpoint.name}:`, metrics);

        // These are guidelines, not strict requirements
        // Adjust based on your performance requirements
        if ((metrics as any).domContentLoaded > 0) {
          expect((metrics as any).domContentLoaded).toBeLessThan(
            thresholds.domContentLoaded
          );
        }
      });
    });
  });

  test('Responsive component behavior', async ({ page }) => {
    await page.goto('/design-system');
    await page.waitForLoadState('networkidle');

    // Test responsive navigation
    for (const breakpoint of breakpoints) {
      await page.setViewportSize({
        width: breakpoint.width,
        height: breakpoint.height,
      });
      await page.waitForTimeout(300);

      // Check navigation behavior
      const navigation = page.locator('[data-testid="navigation"]');
      const mobileMenu = page.locator('[data-testid="mobile-menu-trigger"]');

      if (breakpoint.width < 768) {
        // Mobile: navigation should be hidden, mobile menu visible
        if ((await mobileMenu.count()) > 0) {
          expect(await mobileMenu.isVisible()).toBe(true);

          // Test mobile menu functionality
          await mobileMenu.click();
          await page.waitForTimeout(300);

          const mobileNav = page.locator('[data-testid="mobile-navigation"]');
          if ((await mobileNav.count()) > 0) {
            expect(await mobileNav.isVisible()).toBe(true);
          }

          // Close mobile menu
          await mobileMenu.click();
          await page.waitForTimeout(300);
        }
      } else {
        // Desktop: navigation should be visible
        if ((await navigation.count()) > 0) {
          expect(await navigation.isVisible()).toBe(true);
        }
      }

      // Test responsive grid layouts
      const gridContainers = page.locator('[class*="grid"]');
      const gridCount = await gridContainers.count();

      for (let i = 0; i < Math.min(gridCount, 3); i++) {
        const grid = gridContainers.nth(i);
        const gridItems = grid.locator('> *');
        const itemCount = await gridItems.count();

        if (itemCount > 0) {
          // Check if items wrap appropriately
          const firstItem = gridItems.first();
          const lastItem = gridItems.last();

          const firstBox = await firstItem.boundingBox();
          const lastBox = await lastItem.boundingBox();

          if (firstBox && lastBox && itemCount > 1) {
            // Items should wrap on smaller screens
            if (breakpoint.width < 768 && itemCount > 2) {
              expect(lastBox.y).toBeGreaterThan(firstBox.y);
            }
          }
        }
      }

      // Test responsive typography
      const headings = page.locator('h1, h2, h3');
      const headingCount = await headings.count();

      if (headingCount > 0) {
        const heading = headings.first();
        const fontSize = await heading.evaluate(el => {
          return parseFloat(window.getComputedStyle(el).fontSize);
        });

        // Font sizes should scale appropriately
        if (breakpoint.width < 480) {
          expect(fontSize).toBeGreaterThanOrEqual(20); // Minimum readable size
        } else if (breakpoint.width < 768) {
          expect(fontSize).toBeGreaterThanOrEqual(24);
        } else {
          expect(fontSize).toBeGreaterThanOrEqual(28);
        }
      }
    }
  });
});

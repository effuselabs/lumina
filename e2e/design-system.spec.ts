import { expect, test } from '@playwright/test';

test.describe('Design System Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/design-system');
  });

  test('should display the design system showcase', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1')).toContainText('Design System');

    // Check that color palette is displayed
    await expect(page.locator('text=Color Palette')).toBeVisible();

    // Check that typography section is displayed
    await expect(page.locator('text=Typography')).toBeVisible();

    // Check that components section is displayed
    await expect(page.locator('text=Components')).toBeVisible();
  });

  test('should display interactive button examples', async ({ page }) => {
    // Find the button section
    const buttonSection = page.locator('text=Button').first();
    await expect(buttonSection).toBeVisible();

    // Check for different button variants
    await expect(page.locator('button:has-text("Primary")')).toBeVisible();
    await expect(page.locator('button:has-text("Secondary")')).toBeVisible();
    await expect(page.locator('button:has-text("Outline")')).toBeVisible();
  });

  test('should have working interactive elements', async ({ page }) => {
    // Test button interactions
    const primaryButton = page.locator('button:has-text("Primary")').first();
    if (await primaryButton.isVisible()) {
      await primaryButton.click();
    }

    // Test input interactions
    const input = page.locator('input[placeholder*="Enter"]').first();
    if (await input.isVisible()) {
      await input.fill('Test input');
      await expect(input).toHaveValue('Test input');
    }
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check that content is still accessible
    await expect(page.locator('h1')).toBeVisible();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('h1')).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.locator('h1')).toBeVisible();
  });
});

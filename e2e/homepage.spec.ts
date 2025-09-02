import { expect, test } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load the homepage successfully', async ({ page }) => {
    await page.goto('/');

    // Check that the page loads
    await expect(page).toHaveTitle(/Lumina/);

    // Check for main navigation or key elements
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have working navigation', async ({ page }) => {
    await page.goto('/');

    // Test navigation to design system page
    const designSystemLink = page.locator('a[href="/design-system"]');
    if (await designSystemLink.isVisible()) {
      await designSystemLink.click();
      await expect(page).toHaveURL('/design-system');

      // Check that design system page loads
      await expect(page.locator('h1')).toContainText('Design System');
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Check that page is still functional on mobile
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have proper meta tags', async ({ page }) => {
    await page.goto('/');

    // Check for essential meta tags
    const title = await page.locator('title').textContent();
    expect(title).toBeTruthy();

    const description = await page
      .locator('meta[name="description"]')
      .getAttribute('content');
    expect(description).toBeTruthy();
  });
});

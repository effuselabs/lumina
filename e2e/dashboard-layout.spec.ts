import { expect, test } from '@playwright/test';

/**
 * The dashboard's content sits against the sidebar, not 280px past it.
 *
 * From 1024px the sidebar becomes part of the grid's first column, and the
 * content column also carried a 280px left margin for it — the sidebar's
 * width counted twice. Content started 560px from the left, and the header,
 * left with too little width, stacked its contents (#98).
 */
test('dashboard content starts where the sidebar ends', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/auth/signin');
  await page.locator('#email').fill('owner@lumina-demo.com');
  await page.locator('#password').fill('demo123');
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await page.waitForURL(/\/dashboard\/[^/]+/, { timeout: 30_000 });

  const main = page.locator('.dashboard-main');
  await expect(main).toBeVisible({ timeout: 20_000 });
  const mainBox = await main.boundingBox();
  const viewport = page.viewportSize();
  expect(mainBox && viewport).toBeTruthy();

  if (viewport!.width >= 1024) {
    // Desktop: the sidebar is in the layout, and the content meets it.
    const sidebarBox = await page.locator('.dashboard-sidebar').boundingBox();
    expect(sidebarBox).toBeTruthy();
    expect(
      Math.abs(mainBox!.x - (sidebarBox!.x + sidebarBox!.width)),
      `content starts at ${mainBox!.x}px; sidebar ends at ${sidebarBox!.x + sidebarBox!.width}px`
    ).toBeLessThanOrEqual(1);
  } else {
    // Phone: the sidebar is an overlay, so the content takes the full width.
    expect(mainBox!.x).toBeLessThanOrEqual(1);
  }
  expect(mainBox!.x + mainBox!.width).toBeLessThanOrEqual(viewport!.width + 1);
});

import { expect, test } from '@playwright/test';
import { signInAsOwner } from './support/sign-in';

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
  await signInAsOwner(page);

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

/**
 * On a page taller than the window, the sidebar's background stopped one
 * screen down: at desktop width it is a grid column, but it kept the 100vh
 * height of the phone drawer (#125). It now runs the full height of the
 * page, and its navigation stays in view while the content scrolls.
 */
test('the sidebar runs the full height of a long page', async ({ page }) => {
  test.setTimeout(60_000);
  const viewport = page.viewportSize();
  test.skip(viewport!.width < 1024, 'the sidebar is a drawer below 1024px');

  await signInAsOwner(page);
  await expect(page.locator('.dashboard-main')).toBeVisible({
    timeout: 20_000,
  });
  // Staff lists every member, so it is taller than the window.
  await page.goto(`${new URL(page.url()).pathname.replace(/\/$/, '')}/staff`);
  const main = page.locator('.dashboard-main');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({
    timeout: 20_000,
  });

  const mainBox = await main.boundingBox();
  const sidebarBox = await page.locator('.dashboard-sidebar').boundingBox();
  expect(
    mainBox!.height,
    'the page should be taller than the window'
  ).toBeGreaterThan(viewport!.height);
  expect(sidebarBox!.height).toBeGreaterThanOrEqual(mainBox!.height - 1);

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const navBox = await page.locator('.sidebar-nav').boundingBox();
  expect(
    Math.abs(navBox!.y),
    'the navigation stays at the top of the window'
  ).toBeLessThanOrEqual(1);
});

import { expect, test } from '@playwright/test';

/*
 * A smoke test, and deliberately only that.
 *
 * What this used to contain: an assertion that `body` is visible, a
 * viewport resize followed by another assertion that `body` is visible, and a
 * navigation test wrapped in `if (await link.isVisible())` — which passes by
 * doing nothing when the link is absent, so it could not fail. The page it
 * navigated to, `/design-system`, is Phase 5 work.
 *
 * The homepage has no behaviour to test yet. It renders, and it carries the
 * metadata search engines and link previews read. Those are worth one check
 * each; everything beyond that belongs with the marketing page.
 */
test.describe('Homepage', () => {
  test('renders and is titled', async ({ page }) => {
    const response = await page.goto('/');

    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/Lumina/);
  });

  test('carries a meta description', async ({ page }) => {
    await page.goto('/');

    const description = await page
      .locator('meta[name="description"]')
      .getAttribute('content');

    expect(description?.trim()).toBeTruthy();
  });
});

/*
 * The home page offered "Watch Demo", promising a three-minute video. It
 * linked to `/book/demo`, which was never a page — booking pages are keyed by
 * a salon's id — so the visitor most curious about the product got a 404.
 */
test('every link on the home page leads somewhere', async ({ page }) => {
  await page.goto('/');

  const hrefs = await page
    .locator('a[href^="/"]')
    .evaluateAll(links => [
      ...new Set(links.map(link => link.getAttribute('href') ?? '')),
    ]);
  expect(hrefs.length).toBeGreaterThan(0);

  const broken: string[] = [];
  for (const href of hrefs) {
    const path = href.split('#')[0] || '/';
    const response = await page.request.get(path);
    if (response.status() >= 400) broken.push(`${href} → ${response.status()}`);
  }
  expect(broken).toEqual([]);
});

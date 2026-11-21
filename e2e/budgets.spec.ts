import { expect, test } from '@playwright/test';
import { seededBusiness } from './support/seeded-business';

/**
 * The public booking page is the one a salon's clients open on whatever
 * phone they have, so it may preload at most one font (#152,
 * docs/visual-language.md): every preload competes with the page itself.
 * Next sends font preloads as an HTTP Link header, React can also emit
 * <link> tags, so both count. The JavaScript and CSS budgets are checked
 * after the build by scripts/check-budgets.ts.
 */
test('/book preloads at most one font', async ({ page }) => {
  const business = await seededBusiness();
  const response = await page.goto(`/book/${business.id}`);
  expect(response?.ok()).toBe(true);

  const fromHeader = (response!.headers()['link'] ?? '')
    .split(/,(?=\s*<)/)
    .filter(entry => /rel=preload/.test(entry) && /as="?font/.test(entry));
  const fromMarkup = await page
    .locator('link[rel="preload"][as="font"]')
    .evaluateAll(links => links.map(link => link.getAttribute('href')));
  const fonts = new Set([
    ...fromHeader.map(entry => entry.match(/<([^>]+)>/)?.[1]),
    ...fromMarkup,
  ]);

  expect([...fonts].length).toBeLessThanOrEqual(1);
});

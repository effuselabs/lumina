import { type Page, expect, test } from '@playwright/test';
import { seededBusiness } from './support/seeded-business';
import { signInAsOwner } from './support/sign-in';

/*
 * What the main pages look like, in both themes, at desktop and phone width.
 *
 * A changed screenshot is not a failure of the code — it is a question: did
 * you mean to change this? Every colour, radius and shadow here comes from
 * `lib/design/tokens.ts`, so a token edit shows up as a diff on every page it
 * reaches, and a diff with no token edit behind it is a regression. Updating
 * the baselines is documented in docs/visual-tests.md.
 *
 * The booking page is drawn from the seed, which is the same salon every time
 * it runs (#112). The dashboard's figures depend on the day as well as the
 * seed, so its cards are compared with the numbers masked (#115).
 */

const THEMES = ['light', 'dark'] as const;
const WIDTHS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'phone', width: 390, height: 844 },
] as const;

const PUBLIC_PAGES = [
  { name: 'home', path: '/' },
  { name: 'sign-in', path: '/auth/signin' },
  { name: 'sign-up', path: '/auth/signup' },
] as const;

/** Load a page and wait until nothing about it is still arriving. */
async function settle(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
}

for (const theme of THEMES) {
  for (const size of WIDTHS) {
    test.describe(`${theme}, ${size.name}`, () => {
      test.beforeEach(async ({ page }) => {
        await page.clock.setFixedTime(new Date('2026-06-15T10:00:00-07:00'));
        await page.emulateMedia({ colorScheme: theme });
        await page.setViewportSize({ width: size.width, height: size.height });
      });

      for (const { name, path } of PUBLIC_PAGES) {
        test(name, async ({ page }) => {
          await settle(page, path);
          await expect(page).toHaveScreenshot(
            `${name}-${theme}-${size.name}.png`,
            { fullPage: true }
          );
        });
      }

      test('booking', async ({ page }) => {
        const business = await seededBusiness();
        await settle(page, `/book/${business.id}`);
        await expect(page).toHaveScreenshot(
          `booking-${theme}-${size.name}.png`,
          { fullPage: true }
        );
      });

      test('dashboard', async ({ page }) => {
        test.setTimeout(60_000);
        await signInAsOwner(page);
        await expect(page.locator('.dashboard-main')).toBeVisible();
        await page.evaluate(() => document.fonts.ready);

        // Element shots, not the page: today's schedule grows and shrinks with
        // the time of day CI happens to run, and its figures with the date.
        // The cards' layout, type and colour are what is compared; the
        // numbers are masked, and asserted by dashboard-overview's tests.
        const figures = [
          page.locator('.stat-card-value'),
          page.locator('.stat-card-change'),
        ];
        await expect(page.locator('.dashboard-stats-grid')).toHaveScreenshot(
          `dashboard-figures-${theme}-${size.name}.png`,
          { mask: figures }
        );
        await expect(page.locator('.quick-actions-container')).toHaveScreenshot(
          `dashboard-actions-${theme}-${size.name}.png`
        );
      });

      test('design system', async ({ page }) => {
        test.setTimeout(60_000);
        await signInAsOwner(page);
        await settle(page, '/design-system');
        await expect(page).toHaveScreenshot(
          `design-system-${theme}-${size.name}.png`,
          {
            fullPage: true,
            // The count-up demo animates on its own timer and is caught at a
            // different frame each run. Everything around it is compared.
            mask: [page.getByTestId('animated-counter')],
          }
        );
      });
    });
  }
}

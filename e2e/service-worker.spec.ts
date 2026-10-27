import { expect, test } from '@playwright/test';
import { seededBusiness } from './support/seeded-business';

/*
 * The booking page used to register an offline worker scoped to the whole
 * site, which kept a copy of every page it loaded, signed-in pages included
 * (#150). Its replacement at /sw.js exists only to remove it from browsers
 * that installed it, so what has to be proven is that a browser fetching the
 * new file, signed out, ends with no worker and no caches.
 */
test.describe('the retired offline worker', () => {
  test('is served without a session, as a script', async ({ request }) => {
    const response = await request.get('/sw.js', { maxRedirects: 0 });

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(/javascript/);
  });

  test('removes itself and every cache the old worker left', async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName !== 'chromium',
      'Playwright drives service workers in Chromium only'
    );
    await page.goto('/');

    // What a browser that ran the old worker holds: its caches, and the
    // registration it updates from /sw.js.
    await page.evaluate(async () => {
      const cache = await caches.open('lumina-booking-v1');
      await cache.put('/dashboard/demo', new Response('a signed-in page'));
      await navigator.serviceWorker.register('/sw.js');
    });

    await expect
      .poll(
        () =>
          page.evaluate(async () => ({
            caches: (await caches.keys()).length,
            workers: (await navigator.serviceWorker.getRegistrations()).length,
          })),
        { timeout: 10_000 }
      )
      .toEqual({ caches: 0, workers: 0 });
  });

  test('is not registered by the booking page', async ({ page }) => {
    const registered: string[] = [];
    await page.exposeFunction('recordRegistration', (url: string) => {
      registered.push(url);
    });
    await page.addInitScript(() => {
      const worker = navigator.serviceWorker;
      if (!worker) return;
      const register = worker.register.bind(worker);
      worker.register = (url, options) => {
        (
          window as unknown as { recordRegistration: (u: string) => void }
        ).recordRegistration(String(url));
        return register(url, options);
      };
    });

    const business = await seededBusiness();
    await page.goto(`/book/${business.id}`);
    await expect(page.getByRole('heading').first()).toBeVisible();

    expect(registered).toEqual([]);
  });
});

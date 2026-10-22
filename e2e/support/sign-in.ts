import type { Page } from '@playwright/test';

/** The seeded demo owner (prisma/seed.ts). */
export const DEMO_OWNER = {
  email: 'owner@lumina-demo.com',
  password: 'demo123',
} as const;

/** Sign in as the seeded owner and wait for the dashboard. */
export async function signInAsOwner(page: Page): Promise<void> {
  await page.goto('/auth/signin');
  await page.locator('#email').fill(DEMO_OWNER.email);
  await page.locator('#password').fill(DEMO_OWNER.password);
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await page.waitForURL(/\/dashboard\/[^/]+/, { timeout: 30_000 });
}

import { expect, test } from '@playwright/test';

test.describe('Health Check API', () => {
  test('should return healthy status', async ({ request }) => {
    const response = await request.get('/api/health');

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('healthy');
    expect(data.checks.database).toBe('healthy');

    /*
     * Not `toBe('healthy')`. The route downgrades memory to 'warning' above a
     * 512MB heap and deliberately keeps returning 200 — memory pressure means
     * degraded, not down. Asserting 'healthy' made this test a function of how
     * busy the machine was: it passed alone and failed inside the full suite,
     * where the dev server is compiling nine specs across two browsers.
     *
     * What the endpoint promises is that it can measure memory at all.
     */
    expect(data.checks.memory).not.toBe('unhealthy');
    expect(data.checks.memory).not.toBe('unknown');
    expect(data.timestamp).toBeTruthy();
    expect(data.environment).toBeTruthy();
  });

  test('should return proper headers', async ({ request }) => {
    const response = await request.get('/api/health');

    expect(response.headers()['cache-control']).toBe(
      'no-cache, no-store, must-revalidate'
    );
    expect(response.headers()['pragma']).toBe('no-cache');
    expect(response.headers()['expires']).toBe('0');
  });

  test('should support HEAD requests', async ({ request }) => {
    const response = await request.head('/api/health');

    expect(response.status()).toBe(200);

    const text = await response.text();
    expect(text).toBe('');
  });
});

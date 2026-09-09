import { expect, test } from '@playwright/test';

test.describe('Health Check API', () => {
  test('reports a reachable database and complete measurements', async ({
    request,
  }) => {
    const response = await request.get('/api/health');

    expect(response.status()).toBe(200);

    const data = await response.json();
    /*
     * Not `toBe('healthy')`, for either field.
     *
     * The route downgrades memory to 'warning' above a 512MB heap, and that
     * takes the top-level status to 'degraded' — while deliberately still
     * returning 200, because memory pressure means degraded, not down. A dev
     * server compiling three specs across two browsers goes over 512MB
     * routinely, so asserting 'healthy' made this test a function of how busy
     * the machine was. It passed locally and failed on the CI runner.
     *
     * What the endpoint actually promises is that it reached the database and
     * could take every measurement. 'unhealthy' is the state that matters:
     * it returns 503, and Railway refuses to promote the release.
     */
    expect(data.status).not.toBe('unhealthy');
    expect(data.checks.database).toBe('healthy');
    expect(data.checks.memory).not.toBe('unhealthy');
    expect(data.checks.memory).not.toBe('unknown');
    expect(data.checks.configuration).not.toBe('unhealthy');
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

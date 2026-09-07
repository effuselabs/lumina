import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : 2,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['junit', { outputFile: 'playwright-report/results.xml' }],
  ],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video on failure */
    video: 'retain-on-failure',

    /*
     * The browser runs in a third zone, different from both the server's and
     * the salon's.
     *
     * Three distinct zones is the whole point. The availability bug was
     * invisible for months because CI ran in UTC and the seeded salon is in
     * America/Los_Angeles, so every naive `setHours` and `getDay` agreed with
     * itself. Any two of the three matching hides a class of this bug, so:
     * salon in Los Angeles (prisma/seed.ts), server in Halifax (webServer.env
     * below), browser in Sydney — and Sydney is across the date line from both,
     * which is where day-shifting errors show up rather than hour-shifting ones.
     */
    timezoneId: 'Australia/Sydney',
  },

  /*
   * Two projects, not seven.
   *
   * This previously ran every spec against Chromium, Firefox, WebKit, Mobile
   * Chrome, Mobile Safari, Edge and Chrome — seven multiples of a suite that
   * has never once completed. Edge and Chrome are also branded channels that
   * must be installed separately, so they fail outright on a clean CI runner.
   *
   * Chromium is the workhorse. Mobile Safari is kept because clients book on
   * phones and iOS Safari is where layout and date-input behaviour actually
   * diverges. The rest come back one at a time, once the suite is green and
   * fast — see docs/environments.md.
   */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      /*
       * The server half of the gate, and the half that actually matters.
       *
       * `timezoneId` above only moves the browser. Every naive date conversion
       * this suite is meant to catch happens in Node — in the availability
       * calculator, in the confirmation email — so a browser-only zone would
       * report green while the server bug survived untouched. Halifax because
       * it is an hour off Eastern and observes DST, so an offset hardcoded
       * anywhere shows up here as a wrong answer rather than a lucky one.
       */
      TZ: 'America/Halifax',
    },
  },

  /* Global setup and teardown */
  globalSetup: require.resolve('./e2e/global-setup'),
  globalTeardown: require.resolve('./e2e/global-teardown'),

  /* Test timeout */
  timeout: 30 * 1000,

  /* Expect timeout */
  expect: {
    timeout: 5 * 1000,
  },

  /* Output directory for test results */
  outputDir: 'test-results/',
});

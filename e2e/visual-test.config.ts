import { PlaywrightTestConfig } from '@playwright/test';

/**
 * Visual Testing Configuration
 *
 * Specialized Playwright configuration for visual regression testing
 */

const visualTestConfig: PlaywrightTestConfig = {
  testDir: './e2e',
  testMatch: [
    '**/*visual*.spec.ts',
    '**/visual-test-runner.spec.ts',
    '**/accessibility-regression.spec.ts',
    '**/performance-regression.spec.ts',
    '**/keyboard-navigation.spec.ts',
  ],

  /* Run tests in files in parallel */
  fullyParallel: false, // Sequential for consistent screenshots

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 1 : 0,

  /* Single worker for consistent visual results */
  workers: 1,

  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'playwright-report/visual' }],
    ['json', { outputFile: 'playwright-report/visual-results.json' }],
    ['list'],
  ],

  /* Shared settings for all projects */
  use: {
    /* Base URL */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test */
    trace: 'retain-on-failure',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video on failure */
    video: 'retain-on-failure',
  },

  /* Visual comparison settings — top-level, not under `use` */
  expect: {
    toHaveScreenshot: {
      threshold: 0.1,
      maxDiffPixels: 1000,
      animations: 'disabled',
    },
  },

  /* Configure projects for visual testing */
  projects: [
    {
      name: 'visual-chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 1440, height: 900 },

        // Consistent font rendering
        fontFamily: 'Inter, system-ui, sans-serif',

        // Disable animations for consistent screenshots
        reducedMotion: 'reduce',
      },
    },

    // Uncomment for cross-browser visual testing
    // {
    //   name: 'visual-firefox',
    //   use: {
    //     browserName: 'firefox',
    //     viewport: { width: 1440, height: 900 },
    //   },
    // },

    // {
    //   name: 'visual-webkit',
    //   use: {
    //     browserName: 'webkit',
    //     viewport: { width: 1440, height: 900 },
    //   },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  /* Global setup and teardown */
  globalSetup: require.resolve('./e2e/global-setup'),
  globalTeardown: require.resolve('./e2e/global-teardown'),

  /* Test timeout - longer for visual tests */
  timeout: 60 * 1000,

  /* Expect timeout */
  expect: {
    timeout: 10 * 1000,
    toHaveScreenshot: {
      threshold: 0.1,
      maxDiffPixels: 1000,
      animations: 'disabled',
    },
  },

  /* Output directory for test results */
  outputDir: 'test-results/visual',
};

export default visualTestConfig;

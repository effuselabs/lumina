import { Locator, Page, expect } from '@playwright/test';

/**
 * Visual Testing Utilities
 *
 * Helper functions for consistent visual regression testing across components
 */

export interface VisualTestConfig {
  themes: string[];
  breakpoints: Array<{
    name: string;
    width: number;
    height: number;
  }>;
  animationTimeout: number;
  fontLoadTimeout: number;
}

export const defaultVisualConfig: VisualTestConfig = {
  themes: ['light', 'dark'],
  breakpoints: [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'wide', width: 1920, height: 1080 },
  ],
  animationTimeout: 500,
  fontLoadTimeout: 1000,
};

/**
 * Set up page for visual testing with proper theme and viewport
 */
export async function setupVisualTest(
  page: Page,
  theme: string,
  breakpoint: { width: number; height: number }
): Promise<void> {
  // Set viewport
  await page.setViewportSize(breakpoint);

  // Set theme
  await page.evaluate(themeValue => {
    document.documentElement.setAttribute('data-theme', themeValue);
    localStorage.setItem('theme', themeValue);
  }, theme);

  // Wait for theme transition and font loading
  await page.waitForTimeout(defaultVisualConfig.animationTimeout);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(defaultVisualConfig.fontLoadTimeout);
}

/**
 * Test component in all states (default, hover, focus, disabled)
 */
export async function testComponentStates(
  element: Locator,
  baseName: string,
  theme: string,
  breakpoint: string,
  states: string[] = ['default', 'hover', 'focus']
): Promise<void> {
  // Default state
  if (states.includes('default')) {
    await expect(element).toHaveScreenshot(
      `${baseName}-default-${theme}-${breakpoint}.png`
    );
  }

  // Hover state
  if (states.includes('hover')) {
    await element.hover();
    await expect(element).toHaveScreenshot(
      `${baseName}-hover-${theme}-${breakpoint}.png`
    );
  }

  // Focus state
  if (states.includes('focus')) {
    await element.focus();
    await expect(element).toHaveScreenshot(
      `${baseName}-focus-${theme}-${breakpoint}.png`
    );
  }

  // Active state
  if (states.includes('active')) {
    await element.dispatchEvent('mousedown');
    await expect(element).toHaveScreenshot(
      `${baseName}-active-${theme}-${breakpoint}.png`
    );
    await element.dispatchEvent('mouseup');
  }
}

/**
 * Test component variants systematically
 */
export async function testComponentVariants(
  page: Page,
  componentName: string,
  variants: string[],
  sizes: string[] = ['default'],
  theme: string,
  breakpoint: string
): Promise<void> {
  for (const variant of variants) {
    for (const size of sizes) {
      const selector =
        size === 'default'
          ? `[data-testid="${componentName}-${variant}"]`
          : `[data-testid="${componentName}-${variant}-${size}"]`;

      const element = page.locator(selector);

      if ((await element.count()) > 0) {
        const baseName =
          size === 'default'
            ? `${componentName}-${variant}`
            : `${componentName}-${variant}-${size}`;

        await testComponentStates(element, baseName, theme, breakpoint);
      }
    }
  }
}

/**
 * Wait for animations to complete
 */
export async function waitForAnimations(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const animations = document.getAnimations();
    return animations.every(
      animation =>
        animation.playState === 'finished' || animation.playState === 'idle'
    );
  });
}

/**
 * Disable animations for consistent screenshots
 */
export async function disableAnimations(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `,
  });
}

/**
 * Enable reduced motion for accessibility testing
 */
export async function enableReducedMotion(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
}

/**
 * Test component accessibility states
 */
export async function testAccessibilityStates(
  element: Locator,
  baseName: string,
  theme: string,
  breakpoint: string
): Promise<void> {
  // Test with reduced motion
  await element.page().emulateMedia({ reducedMotion: 'reduce' });
  await expect(element).toHaveScreenshot(
    `${baseName}-reduced-motion-${theme}-${breakpoint}.png`
  );

  // Test with high contrast (if supported)
  await element
    .page()
    .emulateMedia({ colorScheme: 'dark', reducedMotion: 'no-preference' });
  await expect(element).toHaveScreenshot(
    `${baseName}-high-contrast-${theme}-${breakpoint}.png`
  );
}

/**
 * Test loading states with proper timing
 */
export async function testLoadingStates(
  page: Page,
  componentName: string,
  theme: string,
  breakpoint: string
): Promise<void> {
  // Test skeleton loading
  const skeleton = page.locator(`[data-testid="${componentName}-skeleton"]`);
  if ((await skeleton.count()) > 0) {
    await expect(skeleton).toHaveScreenshot(
      `${componentName}-skeleton-${theme}-${breakpoint}.png`
    );
  }

  // Test spinner loading
  const spinner = page.locator(`[data-testid="${componentName}-loading"]`);
  if ((await spinner.count()) > 0) {
    await expect(spinner).toHaveScreenshot(
      `${componentName}-loading-${theme}-${breakpoint}.png`
    );
  }

  // Test empty state
  const emptyState = page.locator(`[data-testid="${componentName}-empty"]`);
  if ((await emptyState.count()) > 0) {
    await expect(emptyState).toHaveScreenshot(
      `${componentName}-empty-${theme}-${breakpoint}.png`
    );
  }
}

/**
 * Test error states
 */
export async function testErrorStates(
  page: Page,
  componentName: string,
  theme: string,
  breakpoint: string
): Promise<void> {
  const errorState = page.locator(`[data-testid="${componentName}-error"]`);
  if ((await errorState.count()) > 0) {
    await expect(errorState).toHaveScreenshot(
      `${componentName}-error-${theme}-${breakpoint}.png`
    );
  }
}

/**
 * Comprehensive component test suite
 */
export async function runComponentVisualTests(
  page: Page,
  config: {
    componentName: string;
    route: string;
    variants?: string[];
    sizes?: string[];
    states?: string[];
    testLoading?: boolean;
    testError?: boolean;
    testAccessibility?: boolean;
  }
): Promise<void> {
  const {
    componentName,
    route,
    variants = ['default'],
    sizes = ['default'],
    states = ['default', 'hover', 'focus'],
    testLoading = true,
    testError = true,
    testAccessibility = true,
  } = config;

  await page.goto(route);
  await page.waitForLoadState('networkidle');

  for (const theme of defaultVisualConfig.themes) {
    for (const breakpoint of defaultVisualConfig.breakpoints) {
      await setupVisualTest(page, theme, breakpoint);

      // Test component variants
      await testComponentVariants(
        page,
        componentName,
        variants,
        sizes,
        theme,
        breakpoint.name
      );

      // Test loading states
      if (testLoading) {
        await testLoadingStates(page, componentName, theme, breakpoint.name);
      }

      // Test error states
      if (testError) {
        await testErrorStates(page, componentName, theme, breakpoint.name);
      }

      // Test accessibility states
      if (testAccessibility) {
        const element = page.locator(
          `[data-testid="${componentName}-default"]`
        );
        if ((await element.count()) > 0) {
          await testAccessibilityStates(
            element,
            componentName,
            theme,
            breakpoint.name
          );
        }
      }
    }
  }
}

/**
 * Generate visual test report
 */
export interface VisualTestResult {
  component: string;
  theme: string;
  breakpoint: string;
  state: string;
  passed: boolean;
  screenshotPath?: string;
  error?: string;
}

export class VisualTestReporter {
  private results: VisualTestResult[] = [];

  addResult(result: VisualTestResult): void {
    this.results.push(result);
  }

  getResults(): VisualTestResult[] {
    return this.results;
  }

  getSummary(): {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
  } {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;
    const passRate = total > 0 ? (passed / total) * 100 : 0;

    return { total, passed, failed, passRate };
  }

  generateReport(): string {
    const summary = this.getSummary();
    const failedTests = this.results.filter(r => !r.passed);

    let report = `# Visual Regression Test Report\n\n`;
    report += `## Summary\n`;
    report += `- Total Tests: ${summary.total}\n`;
    report += `- Passed: ${summary.passed}\n`;
    report += `- Failed: ${summary.failed}\n`;
    report += `- Pass Rate: ${summary.passRate.toFixed(2)}%\n\n`;

    if (failedTests.length > 0) {
      report += `## Failed Tests\n\n`;
      failedTests.forEach(test => {
        report += `- **${test.component}** (${test.theme}/${test.breakpoint}/${test.state})\n`;
        if (test.error) {
          report += `  - Error: ${test.error}\n`;
        }
        report += `\n`;
      });
    }

    return report;
  }
}

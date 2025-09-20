import { expect, test } from '@playwright/test';

/**
 * Performance Regression Tests
 * 
 * Tests component rendering performance, theme switching speed, and animation smoothness
 * to ensure the design system maintains optimal performance standards.
 */

interface PerformanceMetrics {
    renderTime: number;
    paintTime: number;
    layoutTime: number;
    scriptTime: number;
    memoryUsage: number;
}

interface ThemeSwitchMetrics {
    switchTime: number;
    animationFrames: number;
    droppedFrames: number;
    smoothness: number;
}

// Performance thresholds (in milliseconds)
const PERFORMANCE_THRESHOLDS = {
    componentRender: 100,      // Component should render within 100ms
    themeSwitch: 300,          // Theme switch should complete within 300ms
    animationFrame: 16.67,     // 60fps = 16.67ms per frame
    memoryUsage: 50 * 1024 * 1024, // 50MB memory limit
    paintTime: 50,             // First paint within 50ms
    layoutTime: 30,            // Layout calculations within 30ms
    scriptTime: 100            // Script execution within 100ms
};

class PerformanceTestRunner {
    private page: any;
    private metrics: PerformanceMetrics[] = [];

    constructor(page: any) {
        this.page = page;
    }

    async measureComponentRender(selector: string): Promise<PerformanceMetrics> {
        const startTime = Date.now();

        // Start performance monitoring
        await this.page.evaluate(() => {
            performance.mark('component-render-start');
        });

        // Wait for component to be visible
        await this.page.waitForSelector(selector, { state: 'visible' });

        await this.page.evaluate(() => {
            performance.mark('component-render-end');
            performance.measure('component-render', 'component-render-start', 'component-render-end');
        });

        const endTime = Date.now();
        const renderTime = endTime - startTime;

        // Get detailed performance metrics
        const performanceMetrics = await this.page.evaluate(() => {
            const entries = performance.getEntriesByType('measure');
            const paintEntries = performance.getEntriesByType('paint');
            const navigationEntries = performance.getEntriesByType('navigation');

            return {
                renderTime: entries.find(e => e.name === 'component-render')?.duration || 0,
                paintTime: paintEntries.find(e => e.name === 'first-contentful-paint')?.startTime || 0,
                layoutTime: navigationEntries[0]?.domContentLoadedEventEnd - navigationEntries[0]?.domContentLoadedEventStart || 0,
                scriptTime: navigationEntries[0]?.loadEventEnd - navigationEntries[0]?.loadEventStart || 0
            };
        });

        // Get memory usage
        const memoryInfo = await this.page.evaluate(() => {
            return (performance as any).memory ? {
                usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
                totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
                jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
            } : { usedJSHeapSize: 0, totalJSHeapSize: 0, jsHeapSizeLimit: 0 };
        });

        const metrics: PerformanceMetrics = {
            renderTime: performanceMetrics.renderTime || renderTime,
            paintTime: performanceMetrics.paintTime,
            layoutTime: performanceMetrics.layoutTime,
            scriptTime: performanceMetrics.scriptTime,
            memoryUsage: memoryInfo.usedJSHeapSize
        };

        this.metrics.push(metrics);
        return metrics;
    }

    async measureThemeSwitch(): Promise<ThemeSwitchMetrics> {
        const startTime = performance.now();
        let frameCount = 0;
        let droppedFrames = 0;

        // Monitor animation frames during theme switch
        const frameMonitor = await this.page.evaluateHandle(() => {
            const frames: number[] = [];
            let animationId: number;
            let lastFrameTime = performance.now();

            const measureFrame = (currentTime: number) => {
                const frameDuration = currentTime - lastFrameTime;
                frames.push(frameDuration);
                lastFrameTime = currentTime;
                animationId = requestAnimationFrame(measureFrame);
            };

            animationId = requestAnimationFrame(measureFrame);

            return {
                stop: () => {
                    cancelAnimationFrame(animationId);
                    return frames;
                }
            };
        });

        // Switch theme
        await this.page.evaluate(() => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
        });

        // Wait for theme transition to complete
        await this.page.waitForTimeout(500);

        // Stop frame monitoring and get results
        const frames = await this.page.evaluate((monitor) => {
            return monitor.stop();
        }, frameMonitor);

        const endTime = performance.now();
        const switchTime = endTime - startTime;

        // Calculate performance metrics
        frameCount = frames.length;
        droppedFrames = frames.filter((duration: number) => duration > PERFORMANCE_THRESHOLDS.animationFrame * 1.5).length;
        const smoothness = ((frameCount - droppedFrames) / frameCount) * 100;

        return {
            switchTime,
            animationFrames: frameCount,
            droppedFrames,
            smoothness
        };
    }

    getAverageMetrics(): PerformanceMetrics {
        if (this.metrics.length === 0) {
            return {
                renderTime: 0,
                paintTime: 0,
                layoutTime: 0,
                scriptTime: 0,
                memoryUsage: 0
            };
        }

        return {
            renderTime: this.metrics.reduce((sum, m) => sum + m.renderTime, 0) / this.metrics.length,
            paintTime: this.metrics.reduce((sum, m) => sum + m.paintTime, 0) / this.metrics.length,
            layoutTime: this.metrics.reduce((sum, m) => sum + m.layoutTime, 0) / this.metrics.length,
            scriptTime: this.metrics.reduce((sum, m) => sum + m.scriptTime, 0) / this.metrics.length,
            memoryUsage: this.metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / this.metrics.length
        };
    }
}

test.describe('Performance Regression Tests', () => {
    let performanceRunner: PerformanceTestRunner;

    test.beforeEach(async ({ page }) => {
        performanceRunner = new PerformanceTestRunner(page);

        // Enable performance monitoring
        await page.addInitScript(() => {
            // Clear any existing performance marks
            performance.clearMarks();
            performance.clearMeasures();
        });
    });

    test.describe('Component Rendering Performance', () => {
        const components = [
            { name: 'Button', route: '/design-system/buttons', selector: '[data-testid="button-primary-md"]' },
            { name: 'StatCard', route: '/design-system/stat-cards', selector: '[data-testid="stat-card-default"]' },
            { name: 'Input', route: '/design-system/forms', selector: '[data-testid="input-default"]' },
            { name: 'Select', route: '/design-system/forms', selector: '[data-testid="select-default"]' },
            { name: 'PageHeader', route: '/design-system/page-header', selector: '[data-testid="page-header-default"]' }
        ];

        components.forEach(component => {
            test(`${component.name} rendering performance`, async ({ page }) => {
                await page.goto(component.route);
                await page.waitForLoadState('networkidle');

                // Measure component rendering performance
                const metrics = await performanceRunner.measureComponentRender(component.selector);

                // Assert performance thresholds
                expect(metrics.renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.componentRender);
                expect(metrics.paintTime).toBeLessThan(PERFORMANCE_THRESHOLDS.paintTime);
                expect(metrics.layoutTime).toBeLessThan(PERFORMANCE_THRESHOLDS.layoutTime);
                expect(metrics.scriptTime).toBeLessThan(PERFORMANCE_THRESHOLDS.scriptTime);
                expect(metrics.memoryUsage).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryUsage);

                console.log(`${component.name} Performance Metrics:`, {
                    renderTime: `${metrics.renderTime.toFixed(2)}ms`,
                    paintTime: `${metrics.paintTime.toFixed(2)}ms`,
                    layoutTime: `${metrics.layoutTime.toFixed(2)}ms`,
                    scriptTime: `${metrics.scriptTime.toFixed(2)}ms`,
                    memoryUsage: `${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`
                });
            });
        });

        test('Multiple component rendering performance', async ({ page }) => {
            await page.goto('/design-system');
            await page.waitForLoadState('networkidle');

            // Measure rendering of multiple components on the same page
            const componentSelectors = [
                '[data-testid^="button-"]',
                '[data-testid^="stat-card-"]',
                '[data-testid^="card-"]'
            ];

            for (const selector of componentSelectors) {
                const elements = await page.locator(selector).all();

                for (let i = 0; i < Math.min(elements.length, 5); i++) {
                    const element = elements[i];
                    const testId = await element.getAttribute('data-testid');

                    if (testId) {
                        const metrics = await performanceRunner.measureComponentRender(`[data-testid="${testId}"]`);
                        expect(metrics.renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.componentRender);
                    }
                }
            }

            // Check average performance across all components
            const averageMetrics = performanceRunner.getAverageMetrics();
            expect(averageMetrics.renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.componentRender);
        });
    });

    test.describe('Theme Switching Performance', () => {
        const routes = [
            '/design-system',
            '/design-system/buttons',
            '/design-system/stat-cards',
            '/design-system/forms',
            '/dashboard'
        ];

        routes.forEach(route => {
            test(`Theme switching performance - ${route}`, async ({ page }) => {
                await page.goto(route);
                await page.waitForLoadState('networkidle');

                // Set initial theme
                await page.evaluate(() => {
                    document.documentElement.setAttribute('data-theme', 'light');
                });
                await page.waitForTimeout(100);

                // Measure theme switch performance
                const metrics = await performanceRunner.measureThemeSwitch();

                // Assert performance thresholds
                expect(metrics.switchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.themeSwitch);
                expect(metrics.smoothness).toBeGreaterThan(90); // 90% smooth animation
                expect(metrics.droppedFrames).toBeLessThan(5); // Less than 5 dropped frames

                console.log(`Theme Switch Performance (${route}):`, {
                    switchTime: `${metrics.switchTime.toFixed(2)}ms`,
                    animationFrames: metrics.animationFrames,
                    droppedFrames: metrics.droppedFrames,
                    smoothness: `${metrics.smoothness.toFixed(2)}%`
                });
            });
        });

        test('Rapid theme switching performance', async ({ page }) => {
            await page.goto('/design-system');
            await page.waitForLoadState('networkidle');

            // Perform rapid theme switches
            const switchCount = 5;
            const switchTimes: number[] = [];

            for (let i = 0; i < switchCount; i++) {
                const startTime = performance.now();

                await page.evaluate((index) => {
                    const theme = index % 2 === 0 ? 'dark' : 'light';
                    document.documentElement.setAttribute('data-theme', theme);
                }, i);

                await page.waitForTimeout(100); // Minimal wait between switches

                const endTime = performance.now();
                switchTimes.push(endTime - startTime);
            }

            // All switches should be fast
            switchTimes.forEach((time, index) => {
                expect(time).toBeLessThan(PERFORMANCE_THRESHOLDS.themeSwitch);
            });

            const averageSwitchTime = switchTimes.reduce((sum, time) => sum + time, 0) / switchTimes.length;
            expect(averageSwitchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.themeSwitch / 2); // Even faster for rapid switches
        });
    });

    test.describe('Animation Performance', () => {
        test('Button hover animation performance', async ({ page }) => {
            await page.goto('/design-system/buttons');
            await page.waitForLoadState('networkidle');

            const buttons = await page.locator('button').all();

            for (let i = 0; i < Math.min(buttons.length, 5); i++) {
                const button = buttons[i];

                // Measure hover animation performance
                const startTime = performance.now();

                await button.hover();
                await page.waitForTimeout(300); // Wait for animation to complete

                const endTime = performance.now();
                const animationTime = endTime - startTime;

                expect(animationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.themeSwitch);
            }
        });

        test('StatCard hover animation performance', async ({ page }) => {
            await page.goto('/design-system/stat-cards');
            await page.waitForLoadState('networkidle');

            const cards = await page.locator('[data-testid^="stat-card-"]').all();

            for (let i = 0; i < Math.min(cards.length, 3); i++) {
                const card = cards[i];

                const startTime = performance.now();

                await card.hover();
                await page.waitForTimeout(300);

                const endTime = performance.now();
                const animationTime = endTime - startTime;

                expect(animationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.themeSwitch);
            }
        });

        test('Loading animation performance', async ({ page }) => {
            await page.goto('/design-system/stat-cards');
            await page.waitForLoadState('networkidle');

            // Find loading elements
            const loadingElements = await page.locator('[data-testid*="loading"]').all();

            for (const element of loadingElements) {
                // Monitor animation frame rate
                const frameRates = await page.evaluate((el) => {
                    return new Promise((resolve) => {
                        const frames: number[] = [];
                        let lastTime = performance.now();
                        let frameCount = 0;
                        const maxFrames = 60; // Monitor for 1 second at 60fps

                        const measureFrame = (currentTime: number) => {
                            const frameDuration = currentTime - lastTime;
                            frames.push(frameDuration);
                            lastTime = currentTime;
                            frameCount++;

                            if (frameCount < maxFrames) {
                                requestAnimationFrame(measureFrame);
                            } else {
                                resolve(frames);
                            }
                        };

                        requestAnimationFrame(measureFrame);
                    });
                }, element);

                // Check that most frames are within the 60fps threshold
                const goodFrames = (frameRates as number[]).filter(duration => duration <= PERFORMANCE_THRESHOLDS.animationFrame * 1.2);
                const framePerformance = (goodFrames.length / (frameRates as number[]).length) * 100;

                expect(framePerformance).toBeGreaterThan(85); // 85% of frames should be smooth
            }
        });
    });

    test.describe('Memory Usage Performance', () => {
        test('Component memory usage', async ({ page }) => {
            await page.goto('/design-system');
            await page.waitForLoadState('networkidle');

            // Get initial memory usage
            const initialMemory = await page.evaluate(() => {
                return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
            });

            // Navigate through different component pages
            const routes = [
                '/design-system/buttons',
                '/design-system/stat-cards',
                '/design-system/forms',
                '/design-system/page-header'
            ];

            for (const route of routes) {
                await page.goto(route);
                await page.waitForLoadState('networkidle');

                const currentMemory = await page.evaluate(() => {
                    return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
                });

                // Memory usage shouldn't increase dramatically
                const memoryIncrease = currentMemory - initialMemory;
                expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryUsage);
            }
        });

        test('Theme switching memory usage', async ({ page }) => {
            await page.goto('/design-system');
            await page.waitForLoadState('networkidle');

            const initialMemory = await page.evaluate(() => {
                return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
            });

            // Perform multiple theme switches
            for (let i = 0; i < 10; i++) {
                await page.evaluate((index) => {
                    const theme = index % 2 === 0 ? 'dark' : 'light';
                    document.documentElement.setAttribute('data-theme', theme);
                }, i);
                await page.waitForTimeout(100);
            }

            const finalMemory = await page.evaluate(() => {
                return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
            });

            // Memory usage shouldn't increase significantly from theme switching
            const memoryIncrease = finalMemory - initialMemory;
            expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryUsage / 4); // 25% of threshold
        });
    });

    test.describe('Responsive Performance', () => {
        const breakpoints = [
            { name: 'mobile', width: 375, height: 667 },
            { name: 'tablet', width: 768, height: 1024 },
            { name: 'desktop', width: 1440, height: 900 }
        ];

        breakpoints.forEach(breakpoint => {
            test(`Responsive layout performance - ${breakpoint.name}`, async ({ page }) => {
                await page.setViewportSize(breakpoint);
                await page.goto('/design-system');
                await page.waitForLoadState('networkidle');

                // Measure layout performance at this breakpoint
                const metrics = await performanceRunner.measureComponentRender('body');

                expect(metrics.renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.componentRender);
                expect(metrics.layoutTime).toBeLessThan(PERFORMANCE_THRESHOLDS.layoutTime);

                // Test viewport resize performance
                const resizeStartTime = performance.now();

                await page.setViewportSize({
                    width: breakpoint.width + 100,
                    height: breakpoint.height + 100
                });
                await page.waitForTimeout(100);

                const resizeEndTime = performance.now();
                const resizeTime = resizeEndTime - resizeStartTime;

                expect(resizeTime).toBeLessThan(PERFORMANCE_THRESHOLDS.layoutTime * 2);
            });
        });
    });
});
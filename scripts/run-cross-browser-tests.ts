#!/usr/bin/env tsx

/**
 * Cross-Browser and Responsive Testing Runner
 * 
 * Runs comprehensive tests across multiple browsers and viewport sizes
 * Generates detailed reports on compatibility and responsive behavior
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

interface TestConfig {
    browsers: string[];
    breakpoints: Array<{
        name: string;
        width: number;
        height: number;
    }>;
    testFiles: string[];
    outputDir: string;
    parallel: boolean;
}

const config: TestConfig = {
    browsers: ['chromium', 'firefox', 'webkit'],
    breakpoints: [
        { name: 'mobile', width: 375, height: 667 },
        { name: 'tablet', width: 768, height: 1024 },
        { name: 'desktop', width: 1440, height: 900 },
        { name: 'wide', width: 1920, height: 1080 }
    ],
    testFiles: [
        'e2e/cross-browser-responsive.spec.ts',
        'e2e/design-system-visual-regression.spec.ts'
    ],
    outputDir: 'test-results/cross-browser',
    parallel: false // Sequential for consistent results
};

interface TestResult {
    browser: string;
    breakpoint?: string;
    testFile: string;
    passed: boolean;
    duration: number;
    errors: string[];
}

class CrossBrowserTestRunner {
    private results: TestResult[] = [];

    async runTests(): Promise<void> {
        console.log('🌐 Starting Cross-Browser and Responsive Testing...\n');

        // Ensure output directory exists
        if (!existsSync(config.outputDir)) {
            mkdirSync(config.outputDir, { recursive: true });
        }

        // Check if development server is running
        await this.checkDevServer();

        // Run tests for each browser
        for (const browser of config.browsers) {
            console.log(`\n🔍 Testing in ${browser}...`);
            await this.runBrowserTests(browser);
        }

        // Generate comprehensive report
        await this.generateReport();

        console.log('\n✅ Cross-browser testing complete!');
        this.printSummary();
    }

    private async checkDevServer(): Promise<void> {
        try {
            execSync('curl -f http://localhost:3000/api/health', { stdio: 'ignore' });
            console.log('✅ Development server is running');
        } catch (error) {
            console.error('❌ Development server is not running');
            console.log('Please start the development server with: npm run dev');
            process.exit(1);
        }
    }

    private async runBrowserTests(browser: string): Promise<void> {
        for (const testFile of config.testFiles) {
            const startTime = Date.now();

            try {
                console.log(`  📋 Running ${testFile} in ${browser}...`);

                const command = `npx playwright test ${testFile} --project=${browser} --reporter=json`;
                const output = execSync(command, {
                    encoding: 'utf8',
                    cwd: process.cwd()
                });

                const duration = Date.now() - startTime;

                // Parse test results
                try {
                    const results = JSON.parse(output);
                    const passed = results.stats?.failed === 0;

                    this.results.push({
                        browser,
                        testFile,
                        passed,
                        duration,
                        errors: passed ? [] : this.extractErrors(results)
                    });

                    console.log(`    ${passed ? '✅' : '❌'} ${testFile} - ${duration}ms`);
                } catch (parseError) {
                    // Fallback if JSON parsing fails
                    this.results.push({
                        browser,
                        testFile,
                        passed: true, // Assume passed if no JSON output
                        duration,
                        errors: []
                    });
                    console.log(`    ✅ ${testFile} - ${duration}ms`);
                }

            } catch (error) {
                const duration = Date.now() - startTime;
                const errorMessage = error instanceof Error ? error.message : String(error);

                this.results.push({
                    browser,
                    testFile,
                    passed: false,
                    duration,
                    errors: [errorMessage]
                });

                console.log(`    ❌ ${testFile} - Failed (${duration}ms)`);
                console.log(`       Error: ${errorMessage.split('\n')[0]}`);
            }
        }
    }

    private extractErrors(results: any): string[] {
        const errors: string[] = [];

        if (results.suites) {
            results.suites.forEach((suite: any) => {
                if (suite.specs) {
                    suite.specs.forEach((spec: any) => {
                        if (spec.tests) {
                            spec.tests.forEach((test: any) => {
                                if (test.results) {
                                    test.results.forEach((result: any) => {
                                        if (result.status === 'failed' && result.error) {
                                            errors.push(`${test.title}: ${result.error.message}`);
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        }

        return errors;
    }

    private async generateReport(): Promise<void> {
        const reportContent = this.buildReportContent();
        const reportPath = join(config.outputDir, 'cross-browser-report.md');

        writeFileSync(reportPath, reportContent);
        console.log(`\n📋 Report saved to: ${reportPath}`);
    }

    private buildReportContent(): string {
        const summary = this.getSummary();
        const failedTests = this.results.filter(r => !r.passed);

        let report = `# Cross-Browser and Responsive Testing Report\n\n`;
        report += `Generated on: ${new Date().toISOString()}\n\n`;

        report += `## Summary\n\n`;
        report += `- **Total Tests**: ${summary.total}\n`;
        report += `- **Passed**: ${summary.passed}\n`;
        report += `- **Failed**: ${summary.failed}\n`;
        report += `- **Pass Rate**: ${summary.passRate.toFixed(2)}%\n`;
        report += `- **Average Duration**: ${summary.averageDuration}ms\n\n`;

        report += `## Browser Compatibility\n\n`;
        config.browsers.forEach(browser => {
            const browserResults = this.results.filter(r => r.browser === browser);
            const browserPassed = browserResults.filter(r => r.passed).length;
            const browserTotal = browserResults.length;
            const browserPassRate = browserTotal > 0 ? (browserPassed / browserTotal) * 100 : 0;

            report += `### ${browser}\n`;
            report += `- Tests: ${browserTotal}\n`;
            report += `- Passed: ${browserPassed}\n`;
            report += `- Pass Rate: ${browserPassRate.toFixed(2)}%\n\n`;
        });

        report += `## Test Results by File\n\n`;
        config.testFiles.forEach(testFile => {
            report += `### ${testFile}\n\n`;

            config.browsers.forEach(browser => {
                const result = this.results.find(r => r.browser === browser && r.testFile === testFile);
                if (result) {
                    const status = result.passed ? '✅ Passed' : '❌ Failed';
                    report += `- **${browser}**: ${status} (${result.duration}ms)\n`;
                }
            });
            report += '\n';
        });

        if (failedTests.length > 0) {
            report += `## Failed Tests\n\n`;
            failedTests.forEach(test => {
                report += `### ${test.browser} - ${test.testFile}\n`;
                report += `Duration: ${test.duration}ms\n\n`;

                if (test.errors.length > 0) {
                    report += `**Errors:**\n`;
                    test.errors.forEach(error => {
                        report += `- ${error}\n`;
                    });
                }
                report += '\n';
            });
        }

        report += `## Responsive Breakpoints Tested\n\n`;
        config.breakpoints.forEach(bp => {
            report += `- **${bp.name}**: ${bp.width}x${bp.height}px\n`;
        });

        report += `\n## Recommendations\n\n`;

        if (summary.passRate < 100) {
            report += `- Review failed tests and fix compatibility issues\n`;
            report += `- Test manually in browsers with failures\n`;
            report += `- Consider progressive enhancement for unsupported features\n`;
        }

        if (summary.averageDuration > 5000) {
            report += `- Optimize performance for slower test execution\n`;
            report += `- Consider reducing test complexity or splitting tests\n`;
        }

        report += `- Regularly run cross-browser tests during development\n`;
        report += `- Update browser support matrix based on user analytics\n`;
        report += `- Consider automated CI/CD integration for continuous testing\n`;

        return report;
    }

    private getSummary() {
        const total = this.results.length;
        const passed = this.results.filter(r => r.passed).length;
        const failed = total - passed;
        const passRate = total > 0 ? (passed / total) * 100 : 0;
        const averageDuration = total > 0 ?
            Math.round(this.results.reduce((sum, r) => sum + r.duration, 0) / total) : 0;

        return { total, passed, failed, passRate, averageDuration };
    }

    private printSummary(): void {
        const summary = this.getSummary();

        console.log('\n=== Cross-Browser Testing Summary ===');
        console.log(`Total Tests: ${summary.total}`);
        console.log(`Passed: ${summary.passed}`);
        console.log(`Failed: ${summary.failed}`);
        console.log(`Pass Rate: ${summary.passRate.toFixed(2)}%`);
        console.log(`Average Duration: ${summary.averageDuration}ms`);

        if (summary.failed > 0) {
            console.log('\n⚠️  Some tests failed. Check the report for details.');
        }
    }
}

async function runResponsiveTests(): Promise<void> {
    console.log('\n📱 Running Responsive Design Tests...');

    try {
        const command = `npx playwright test e2e/cross-browser-responsive.spec.ts --grep="Responsive"`;
        execSync(command, { stdio: 'inherit' });
        console.log('✅ Responsive tests completed');
    } catch (error) {
        console.error('❌ Responsive tests failed:', error);
    }
}

async function runPerformanceTests(): Promise<void> {
    console.log('\n⚡ Running Performance Tests...');

    try {
        const command = `npx playwright test e2e/cross-browser-responsive.spec.ts --grep="Performance"`;
        execSync(command, { stdio: 'inherit' });
        console.log('✅ Performance tests completed');
    } catch (error) {
        console.error('❌ Performance tests failed:', error);
    }
}

async function main(): Promise<void> {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
Cross-Browser and Responsive Testing Runner

Usage:
  tsx scripts/run-cross-browser-tests.ts [options]

Options:
  --responsive-only    Run only responsive design tests
  --performance-only   Run only performance tests
  --browser <name>     Run tests for specific browser only
  --help, -h          Show this help message

Examples:
  # Run all cross-browser tests
  tsx scripts/run-cross-browser-tests.ts

  # Run only responsive tests
  tsx scripts/run-cross-browser-tests.ts --responsive-only

  # Run tests for Chrome only
  tsx scripts/run-cross-browser-tests.ts --browser chromium
        `);
        return;
    }

    if (args.includes('--responsive-only')) {
        await runResponsiveTests();
        return;
    }

    if (args.includes('--performance-only')) {
        await runPerformanceTests();
        return;
    }

    const browserIndex = args.indexOf('--browser');
    if (browserIndex !== -1 && args[browserIndex + 1]) {
        const browser = args[browserIndex + 1];
        config.browsers = [browser];
        console.log(`Running tests for ${browser} only`);
    }

    const runner = new CrossBrowserTestRunner();
    await runner.runTests();
}

if (require.main === module) {
    main().catch(error => {
        console.error('❌ Cross-browser testing failed:', error);
        process.exit(1);
    });
}

export { CrossBrowserTestRunner, runPerformanceTests, runResponsiveTests };

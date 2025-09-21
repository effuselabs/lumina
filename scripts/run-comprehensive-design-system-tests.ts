#!/usr/bin/env tsx

/**
 * Comprehensive Design System Testing Suite
 * 
 * Orchestrates all design system tests including visual regression,
 * cross-browser compatibility, responsive design, and accessibility compliance
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

interface TestSuite {
    name: string;
    description: string;
    script: string;
    required: boolean;
    estimatedTime: string;
}

const testSuites: TestSuite[] = [
    {
        name: 'Visual Regression',
        description: 'Screenshot-based testing for visual consistency across themes and breakpoints',
        script: 'npm run test:visual',
        required: true,
        estimatedTime: '5-10 minutes'
    },
    {
        name: 'Cross-Browser Compatibility',
        description: 'Testing across Chrome, Firefox, Safari, and Edge browsers',
        script: 'tsx scripts/run-cross-browser-tests.ts',
        required: true,
        estimatedTime: '10-15 minutes'
    },
    {
        name: 'Responsive Design',
        description: 'Testing layout and functionality across different viewport sizes',
        script: 'tsx scripts/run-cross-browser-tests.ts --responsive-only',
        required: true,
        estimatedTime: '5-8 minutes'
    },
    {
        name: 'Accessibility Compliance',
        description: 'WCAG AA compliance testing with automated and manual checks',
        script: 'tsx scripts/run-accessibility-tests.ts',
        required: true,
        estimatedTime: '3-5 minutes'
    },
    {
        name: 'Performance Testing',
        description: 'Component render performance and loading time validation',
        script: 'tsx scripts/run-cross-browser-tests.ts --performance-only',
        required: false,
        estimatedTime: '3-5 minutes'
    }
];

interface TestResult {
    suite: string;
    passed: boolean;
    duration: number;
    errors: string[];
    warnings: string[];
}

class ComprehensiveTestRunner {
    private results: TestResult[] = [];
    private startTime: number = 0;

    async runAllTests(): Promise<void> {
        this.startTime = Date.now();

        console.log('🧪 Starting Comprehensive Design System Testing Suite\n');

        // Display test plan
        this.displayTestPlan();

        // Check prerequisites
        await this.checkPrerequisites();

        // Run each test suite
        for (const suite of testSuites) {
            await this.runTestSuite(suite);
        }

        // Generate comprehensive report
        await this.generateComprehensiveReport();

        // Display summary
        this.displaySummary();
    }

    private displayTestPlan(): void {
        console.log('📋 Test Plan Overview:\n');

        testSuites.forEach((suite, index) => {
            const status = suite.required ? '🔴 Required' : '🟡 Optional';
            console.log(`${index + 1}. ${suite.name} - ${status}`);
            console.log(`   ${suite.description}`);
            console.log(`   Estimated time: ${suite.estimatedTime}\n`);
        });

        const totalEstimatedTime = testSuites
            .filter(s => s.required)
            .reduce((total, suite) => {
                const max = parseInt(suite.estimatedTime.split('-')[1] || suite.estimatedTime);
                return total + max;
            }, 0);

        console.log(`Total estimated time: ${totalEstimatedTime}-${totalEstimatedTime + 10} minutes\n`);
    }

    private async checkPrerequisites(): Promise<void> {
        console.log('🔍 Checking prerequisites...\n');

        // Check if development server is running
        try {
            execSync('curl -f http://localhost:3000/api/health', { stdio: 'ignore' });
            console.log('✅ Development server is running');
        } catch (error) {
            console.error('❌ Development server is not running');
            console.log('Please start the development server with: npm run dev');
            process.exit(1);
        }

        // Check if required directories exist
        const requiredDirs = [
            'test-results',
            'test-results/visual',
            'test-results/cross-browser',
            'test-results/accessibility'
        ];

        requiredDirs.forEach(dir => {
            if (!existsSync(dir)) {
                mkdirSync(dir, { recursive: true });
                console.log(`📁 Created directory: ${dir}`);
            }
        });

        // Check if Playwright browsers are installed
        try {
            execSync('npx playwright --version', { stdio: 'ignore' });
            console.log('✅ Playwright is installed');
        } catch (error) {
            console.error('❌ Playwright is not installed');
            console.log('Please install Playwright with: npx playwright install');
            process.exit(1);
        }

        console.log('✅ All prerequisites met\n');
    }

    private async runTestSuite(suite: TestSuite): Promise<void> {
        console.log(`🧪 Running ${suite.name}...`);
        console.log(`   ${suite.description}`);

        const startTime = Date.now();
        const errors: string[] = [];
        const warnings: string[] = [];
        let passed = false;

        try {
            // Run the test suite
            execSync(suite.script, {
                stdio: 'inherit',
                cwd: process.cwd()
            });

            passed = true;
            console.log(`✅ ${suite.name} completed successfully`);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            errors.push(errorMessage);

            if (suite.required) {
                console.log(`❌ ${suite.name} failed (required)`);
                console.log(`   Error: ${errorMessage.split('\n')[0]}`);
            } else {
                console.log(`⚠️  ${suite.name} failed (optional)`);
                warnings.push(`Optional test suite failed: ${suite.name}`);
            }
        }

        const duration = Date.now() - startTime;

        this.results.push({
            suite: suite.name,
            passed,
            duration,
            errors,
            warnings
        });

        console.log(`   Duration: ${Math.round(duration / 1000)}s\n`);
    }

    private async generateComprehensiveReport(): Promise<void> {
        console.log('📊 Generating comprehensive test report...');

        const reportContent = this.buildComprehensiveReport();
        const reportPath = join('test-results', 'comprehensive-design-system-report.md');

        writeFileSync(reportPath, reportContent);
        console.log(`📋 Comprehensive report saved to: ${reportPath}`);

        // Generate executive summary
        await this.generateExecutiveSummary();
    }

    private buildComprehensiveReport(): string {
        const totalDuration = Date.now() - this.startTime;
        const summary = this.getTestSummary();

        let report = `# Comprehensive Design System Test Report\n\n`;
        report += `Generated on: ${new Date().toISOString()}\n`;
        report += `Total Duration: ${Math.round(totalDuration / 1000)}s (${Math.round(totalDuration / 60000)}m)\n\n`;

        report += `## Executive Summary\n\n`;
        report += `This report provides a comprehensive assessment of the Lumina design system quality,\n`;
        report += `covering visual consistency, cross-browser compatibility, responsive design, and accessibility compliance.\n\n`;

        report += `### Overall Results\n`;
        report += `- **Total Test Suites**: ${summary.total}\n`;
        report += `- **Passed**: ${summary.passed}\n`;
        report += `- **Failed**: ${summary.failed}\n`;
        report += `- **Success Rate**: ${summary.successRate.toFixed(1)}%\n`;
        report += `- **Required Tests Passed**: ${summary.requiredPassed}/${summary.requiredTotal}\n\n`;

        if (summary.successRate >= 90) {
            report += `🎉 **Excellent**: Design system meets high quality standards\n\n`;
        } else if (summary.successRate >= 75) {
            report += `✅ **Good**: Design system meets acceptable quality standards with minor issues\n\n`;
        } else {
            report += `⚠️  **Needs Improvement**: Design system requires attention to meet quality standards\n\n`;
        }

        report += `## Test Suite Results\n\n`;

        this.results.forEach(result => {
            const suite = testSuites.find(s => s.name === result.suite);
            const status = result.passed ? '✅ Passed' : '❌ Failed';
            const required = suite?.required ? 'Required' : 'Optional';

            report += `### ${result.suite} (${required})\n`;
            report += `- **Status**: ${status}\n`;
            report += `- **Duration**: ${Math.round(result.duration / 1000)}s\n`;

            if (suite) {
                report += `- **Description**: ${suite.description}\n`;
            }

            if (result.errors.length > 0) {
                report += `- **Errors**:\n`;
                result.errors.forEach(error => {
                    report += `  - ${error.split('\n')[0]}\n`;
                });
            }

            if (result.warnings.length > 0) {
                report += `- **Warnings**:\n`;
                result.warnings.forEach(warning => {
                    report += `  - ${warning}\n`;
                });
            }

            report += '\n';
        });

        report += `## Quality Metrics\n\n`;
        report += `### Visual Consistency\n`;
        const visualResult = this.results.find(r => r.suite === 'Visual Regression');
        if (visualResult) {
            report += visualResult.passed ?
                `✅ All components render consistently across themes and breakpoints\n` :
                `❌ Visual inconsistencies detected - review screenshots in test-results/visual/\n`;
        }

        report += `\n### Cross-Browser Compatibility\n`;
        const browserResult = this.results.find(r => r.suite === 'Cross-Browser Compatibility');
        if (browserResult) {
            report += browserResult.passed ?
                `✅ Components work correctly across all supported browsers\n` :
                `❌ Browser compatibility issues detected - review cross-browser report\n`;
        }

        report += `\n### Responsive Design\n`;
        const responsiveResult = this.results.find(r => r.suite === 'Responsive Design');
        if (responsiveResult) {
            report += responsiveResult.passed ?
                `✅ Layout adapts correctly across all viewport sizes\n` :
                `❌ Responsive design issues detected - review responsive test results\n`;
        }

        report += `\n### Accessibility Compliance\n`;
        const a11yResult = this.results.find(r => r.suite === 'Accessibility Compliance');
        if (a11yResult) {
            report += a11yResult.passed ?
                `✅ Meets WCAG AA accessibility standards\n` :
                `❌ Accessibility issues detected - review accessibility report\n`;
        }

        report += `\n## Recommendations\n\n`;

        if (summary.successRate >= 90) {
            report += `### Maintenance\n`;
            report += `- Continue regular testing as part of CI/CD pipeline\n`;
            report += `- Monitor for regressions with new feature development\n`;
            report += `- Consider implementing automated visual regression testing\n`;
        } else {
            report += `### Immediate Actions Required\n`;
            const failedRequired = this.results.filter(r => !r.passed && testSuites.find(s => s.name === r.suite)?.required);

            if (failedRequired.length > 0) {
                report += `- Address failed required test suites:\n`;
                failedRequired.forEach(result => {
                    report += `  - ${result.suite}\n`;
                });
            }

            report += `- Review detailed reports for each failed test suite\n`;
            report += `- Fix identified issues before production deployment\n`;
        }

        report += `\n### Long-term Improvements\n`;
        report += `- Integrate testing into development workflow\n`;
        report += `- Set up automated testing in CI/CD pipeline\n`;
        report += `- Regular design system audits and updates\n`;
        report += `- User testing with real users and use cases\n\n`;

        report += `## Related Reports\n\n`;
        report += `- [Visual Regression Report](./visual/design-system-visual-regression-report.md)\n`;
        report += `- [Cross-Browser Report](./cross-browser/cross-browser-report.md)\n`;
        report += `- [Accessibility Report](./accessibility/accessibility-compliance-report.md)\n`;
        report += `- [WCAG Compliance Checklist](./accessibility/wcag-compliance-checklist.md)\n\n`;

        return report;
    }

    private async generateExecutiveSummary(): Promise<void> {
        const summary = this.getTestSummary();

        const executiveSummary = `# Design System Quality Executive Summary

## Overall Assessment: ${summary.successRate >= 90 ? 'EXCELLENT' : summary.successRate >= 75 ? 'GOOD' : 'NEEDS IMPROVEMENT'}

### Key Metrics
- **Success Rate**: ${summary.successRate.toFixed(1)}%
- **Required Tests**: ${summary.requiredPassed}/${summary.requiredTotal} passed
- **Total Duration**: ${Math.round((Date.now() - this.startTime) / 60000)} minutes

### Quality Status
${this.results.map(result => {
            const suite = testSuites.find(s => s.name === result.suite);
            const status = result.passed ? '✅' : '❌';
            const required = suite?.required ? '(Required)' : '(Optional)';
            return `- ${status} ${result.suite} ${required}`;
        }).join('\n')}

### Immediate Actions
${summary.successRate < 90 ?
                this.results
                    .filter(r => !r.passed && testSuites.find(s => s.name === r.suite)?.required)
                    .map(r => `- Fix issues in ${r.suite}`)
                    .join('\n') || '- Review optional test failures'
                : '- Continue monitoring and maintenance'
            }

### Production Readiness
${summary.requiredPassed === summary.requiredTotal ?
                '✅ Ready for production deployment' :
                '❌ Not ready - address required test failures'
            }

Generated: ${new Date().toISOString()}
`;

        const summaryPath = join('test-results', 'executive-summary.md');
        writeFileSync(summaryPath, executiveSummary);
        console.log(`📋 Executive summary saved to: ${summaryPath}`);
    }

    private getTestSummary() {
        const total = this.results.length;
        const passed = this.results.filter(r => r.passed).length;
        const failed = total - passed;
        const successRate = total > 0 ? (passed / total) * 100 : 0;

        const requiredSuites = testSuites.filter(s => s.required);
        const requiredTotal = requiredSuites.length;
        const requiredPassed = this.results.filter(r =>
            r.passed && testSuites.find(s => s.name === r.suite)?.required
        ).length;

        return {
            total,
            passed,
            failed,
            successRate,
            requiredTotal,
            requiredPassed
        };
    }

    private displaySummary(): void {
        const summary = this.getTestSummary();
        const totalDuration = Date.now() - this.startTime;

        console.log('\n' + '='.repeat(60));
        console.log('🎯 COMPREHENSIVE DESIGN SYSTEM TEST SUMMARY');
        console.log('='.repeat(60));

        console.log(`\n📊 Results:`);
        console.log(`   Total Test Suites: ${summary.total}`);
        console.log(`   Passed: ${summary.passed}`);
        console.log(`   Failed: ${summary.failed}`);
        console.log(`   Success Rate: ${summary.successRate.toFixed(1)}%`);
        console.log(`   Required Tests: ${summary.requiredPassed}/${summary.requiredTotal} passed`);

        console.log(`\n⏱️  Performance:`);
        console.log(`   Total Duration: ${Math.round(totalDuration / 1000)}s (${Math.round(totalDuration / 60000)}m)`);

        console.log(`\n🎯 Overall Assessment:`);
        if (summary.successRate >= 90) {
            console.log('   🎉 EXCELLENT - Design system meets high quality standards');
        } else if (summary.successRate >= 75) {
            console.log('   ✅ GOOD - Design system meets acceptable standards with minor issues');
        } else {
            console.log('   ⚠️  NEEDS IMPROVEMENT - Design system requires attention');
        }

        console.log(`\n🚀 Production Readiness:`);
        if (summary.requiredPassed === summary.requiredTotal) {
            console.log('   ✅ Ready for production deployment');
        } else {
            console.log('   ❌ Not ready - address required test failures first');
        }

        console.log(`\n📋 Reports Generated:`);
        console.log('   - test-results/comprehensive-design-system-report.md');
        console.log('   - test-results/executive-summary.md');
        console.log('   - Individual test suite reports in respective directories');

        console.log('\n' + '='.repeat(60));
    }
}

async function main(): Promise<void> {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
Comprehensive Design System Testing Suite

Usage:
  tsx scripts/run-comprehensive-design-system-tests.ts [options]

Options:
  --required-only    Run only required test suites
  --help, -h        Show this help message

Test Suites:
${testSuites.map((suite, i) =>
            `  ${i + 1}. ${suite.name} ${suite.required ? '(Required)' : '(Optional)'}\n     ${suite.description}`
        ).join('\n')}

Examples:
  # Run all test suites
  tsx scripts/run-comprehensive-design-system-tests.ts

  # Run only required tests
  tsx scripts/run-comprehensive-design-system-tests.ts --required-only
        `);
        return;
    }

    // Filter to required tests only if requested
    if (args.includes('--required-only')) {
        testSuites.splice(0, testSuites.length, ...testSuites.filter(s => s.required));
        console.log('Running required test suites only\n');
    }

    const runner = new ComprehensiveTestRunner();
    await runner.runAllTests();
}

if (require.main === module) {
    main().catch(error => {
        console.error('❌ Comprehensive testing failed:', error);
        process.exit(1);
    });
}

export { ComprehensiveTestRunner };

#!/usr/bin/env tsx

/**
 * Comprehensive Test Runner
 *
 * Runs all design system tests including visual regression, accessibility, and performance tests
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

interface TestSuite {
  name: string;
  command: string;
  description: string;
  required: boolean;
}

interface TestResults {
  suite: string;
  passed: boolean;
  duration: number;
  output: string;
  error?: string;
}

class ComprehensiveTestRunner {
  private results: TestResults[] = [];
  private verbose: boolean;
  private skipOptional: boolean;

  constructor(options: { verbose?: boolean; skipOptional?: boolean } = {}) {
    this.verbose = options.verbose || false;
    this.skipOptional = options.skipOptional || false;
  }

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Comprehensive Design System Tests\n');

    const testSuites: TestSuite[] = [
      {
        name: 'Unit Tests',
        command: 'npm run test:unit',
        description: 'Component unit tests with Jest',
        required: true,
      },
      {
        name: 'Visual Regression',
        command: 'npm run test:visual',
        description: 'Visual regression tests across themes and breakpoints',
        required: true,
      },
      {
        name: 'Accessibility',
        command:
          'playwright test e2e/accessibility/accessibility-regression.spec.ts',
        description: 'WCAG 2.1 AA compliance testing with axe-core',
        required: true,
      },
      {
        name: 'Keyboard Navigation',
        command:
          'playwright test e2e/accessibility/keyboard-navigation.spec.ts',
        description: 'Comprehensive keyboard navigation testing',
        required: true,
      },
      {
        name: 'Performance',
        command:
          'playwright test e2e/performance/performance-regression.spec.ts',
        description: 'Component rendering and animation performance',
        required: false,
      },
      {
        name: 'E2E Integration',
        command: 'npm run test:e2e',
        description: 'End-to-end integration tests',
        required: false,
      },
    ];

    // Ensure output directories exist
    this.ensureDirectories();

    // Run each test suite
    for (const suite of testSuites) {
      if (this.skipOptional && !suite.required) {
        console.log(`⏭️  Skipping optional test suite: ${suite.name}`);
        continue;
      }

      await this.runTestSuite(suite);
    }

    // Generate comprehensive report
    this.generateReport();
    this.printSummary();
  }

  private ensureDirectories(): void {
    const directories = [
      'test-results',
      'test-results/comprehensive',
      'playwright-report',
      'coverage',
    ];

    directories.forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }

  private async runTestSuite(suite: TestSuite): Promise<void> {
    console.log(`🔄 Running ${suite.name}...`);
    console.log(`   ${suite.description}`);

    const startTime = Date.now();
    let passed = false;
    let output = '';
    let error = '';

    try {
      output = execSync(suite.command, {
        encoding: 'utf8',
        stdio: this.verbose ? 'inherit' : 'pipe',
        timeout: 300000, // 5 minute timeout
      });
      passed = true;
      console.log(`✅ ${suite.name} completed successfully`);
    } catch (err: any) {
      passed = false;
      error = err.message;
      output = err.stdout || '';
      console.log(`❌ ${suite.name} failed`);

      if (this.verbose) {
        console.log(`Error: ${error}`);
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    this.results.push({
      suite: suite.name,
      passed,
      duration,
      output,
      error,
    });

    console.log(`   Duration: ${(duration / 1000).toFixed(2)}s\n`);
  }

  private generateReport(): void {
    const report = this.createMarkdownReport();
    const jsonReport = this.createJsonReport();

    // Save reports
    writeFileSync('test-results/comprehensive/test-report.md', report);
    writeFileSync(
      'test-results/comprehensive/test-results.json',
      JSON.stringify(jsonReport, null, 2)
    );

    if (this.verbose) {
      console.log('📄 Reports saved to test-results/comprehensive/');
    }
  }

  private createMarkdownReport(): string {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    let report = `# Comprehensive Design System Test Report

Generated: ${new Date().toISOString()}

## Summary

- **Total Test Suites**: ${totalTests}
- **Passed**: ${passedTests}
- **Failed**: ${failedTests}
- **Success Rate**: ${((passedTests / totalTests) * 100).toFixed(2)}%
- **Total Duration**: ${(totalDuration / 1000).toFixed(2)}s

## Test Results

`;

    this.results.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      const duration = (result.duration / 1000).toFixed(2);

      report += `### ${result.suite} ${status}

**Duration**: ${duration}s

`;

      if (!result.passed && result.error) {
        report += `**Error**:
\`\`\`
${result.error}
\`\`\`

`;
      }

      if (result.output && this.verbose) {
        report += `**Output**:
\`\`\`
${result.output.slice(0, 1000)}${result.output.length > 1000 ? '...' : ''}
\`\`\`

`;
      }
    });

    // Add recommendations
    report += `## Recommendations

`;

    const failedSuites = this.results.filter(r => !r.passed);
    if (failedSuites.length > 0) {
      report += `### Failed Tests

`;
      failedSuites.forEach(suite => {
        report += `- **${suite.suite}**: Review the error output and fix failing tests before deployment
`;
      });
    } else {
      report += `### All Tests Passed ✅

Your design system is ready for deployment! All tests are passing across:
- Visual consistency
- Accessibility compliance
- Performance standards
- Keyboard navigation
- Component functionality

`;
    }

    report += `### Next Steps

1. **Review Reports**: Check detailed reports in \`test-results/\` and \`playwright-report/\`
2. **Update Baselines**: If visual changes are intentional, update baselines with \`npm run test:visual:update\`
3. **Fix Issues**: Address any failing tests before merging changes
4. **Monitor Performance**: Keep an eye on performance metrics over time
5. **Accessibility**: Ensure new components maintain WCAG 2.1 AA compliance

`;

    return report;
  }

  private createJsonReport(): any {
    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalSuites: this.results.length,
        passed: this.results.filter(r => r.passed).length,
        failed: this.results.filter(r => !r.passed).length,
        successRate:
          (this.results.filter(r => r.passed).length / this.results.length) *
          100,
        totalDuration: this.results.reduce((sum, r) => sum + r.duration, 0),
      },
      results: this.results.map(result => ({
        suite: result.suite,
        passed: result.passed,
        duration: result.duration,
        error: result.error || null,
      })),
    };
  }

  private printSummary(): void {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const successRate = ((passedTests / totalTests) * 100).toFixed(2);
    const totalDuration = (
      this.results.reduce((sum, r) => sum + r.duration, 0) / 1000
    ).toFixed(2);

    console.log('\n' + '='.repeat(60));
    console.log('🎯 COMPREHENSIVE TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Test Suites: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${successRate}%`);
    console.log(`Total Duration: ${totalDuration}s`);
    console.log('='.repeat(60));

    if (failedTests > 0) {
      console.log('\n❌ FAILED TEST SUITES:');
      this.results
        .filter(r => !r.passed)
        .forEach(result => {
          console.log(`   - ${result.suite}`);
        });
      console.log(
        '\n📋 Check test-results/comprehensive/test-report.md for details'
      );
    } else {
      console.log('\n🎉 ALL TESTS PASSED!');
      console.log('Your design system is ready for deployment.');
    }

    console.log('\n📊 Reports available at:');
    console.log('   - test-results/comprehensive/test-report.md');
    console.log('   - test-results/comprehensive/test-results.json');
    console.log('   - playwright-report/index.html');
  }
}

// CLI Interface
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const options = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    skipOptional: args.includes('--required-only'),
  };

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Comprehensive Design System Test Runner

Usage: tsx scripts/run-comprehensive-tests.ts [options]

Options:
  --verbose, -v        Show detailed output from all test suites
  --required-only      Run only required test suites (skip performance and e2e)
  --help, -h          Show this help message

Test Suites:
  - Unit Tests         Component unit tests with Jest
  - Visual Regression  Screenshot comparison across themes/breakpoints
  - Accessibility      WCAG 2.1 AA compliance with axe-core
  - Keyboard Navigation Comprehensive keyboard accessibility
  - Performance        Component rendering and animation performance
  - E2E Integration    End-to-end integration tests

Reports:
  - Markdown report: test-results/comprehensive/test-report.md
  - JSON results: test-results/comprehensive/test-results.json
  - HTML reports: playwright-report/index.html
`);
    return;
  }

  const runner = new ComprehensiveTestRunner(options);
  await runner.runAllTests();
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

export { ComprehensiveTestRunner };

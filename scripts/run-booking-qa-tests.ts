#!/usr/bin/env tsx

/**
 * Comprehensive test runner for public booking interface quality assurance
 * Executes integration, performance, accessibility, and e2e tests
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  duration: number;
  coverage?: number;
}

interface QAReport {
  timestamp: string;
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  totalDuration: number;
  overallPassRate: number;
  suites: TestResult[];
  recommendations: string[];
}

class BookingQARunner {
  private results: TestResult[] = [];
  private startTime: number = 0;

  async runAllTests(): Promise<QAReport> {
    console.log(
      '🚀 Starting Public Booking Interface Quality Assurance Tests\n'
    );
    this.startTime = performance.now();

    try {
      // Run test suites in order
      await this.runIntegrationTests();
      await this.runPerformanceTests();
      await this.runAccessibilityTests();
      await this.runE2ETests();
      await this.runCrossCompatibilityTests();

      // Generate final report
      const report = this.generateReport();
      await this.saveReport(report);
      this.printSummary(report);

      return report;
    } catch (error) {
      console.error('❌ QA test run failed:', error);
      throw error;
    }
  }

  private async runIntegrationTests(): Promise<void> {
    console.log('📋 Running Integration Tests...');

    try {
      const result = await this.executeTestSuite(
        'Integration Tests',
        'npm test -- __tests__/integration/public-booking-workflow.test.tsx --coverage --verbose'
      );

      this.results.push(result);
      console.log(
        `✅ Integration Tests: ${result.passed}/${result.passed + result.failed} passed\n`
      );
    } catch (error) {
      console.error('❌ Integration tests failed:', error);
      this.results.push({
        suite: 'Integration Tests',
        passed: 0,
        failed: 1,
        duration: 0,
      });
    }
  }

  private async runPerformanceTests(): Promise<void> {
    console.log('⚡ Running Performance Tests...');

    try {
      const result = await this.executeTestSuite(
        'Performance Tests',
        'npm test -- __tests__/performance/concurrent-booking.test.ts --verbose'
      );

      this.results.push(result);
      console.log(
        `✅ Performance Tests: ${result.passed}/${result.passed + result.failed} passed\n`
      );
    } catch (error) {
      console.error('❌ Performance tests failed:', error);
      this.results.push({
        suite: 'Performance Tests',
        passed: 0,
        failed: 1,
        duration: 0,
      });
    }
  }

  private async runAccessibilityTests(): Promise<void> {
    console.log('♿ Running Accessibility Tests...');

    try {
      const result = await this.executeTestSuite(
        'Accessibility Tests',
        'npm test -- __tests__/accessibility/public-booking-a11y.test.tsx --verbose'
      );

      this.results.push(result);
      console.log(
        `✅ Accessibility Tests: ${result.passed}/${result.passed + result.failed} passed\n`
      );
    } catch (error) {
      console.error('❌ Accessibility tests failed:', error);
      this.results.push({
        suite: 'Accessibility Tests',
        passed: 0,
        failed: 1,
        duration: 0,
      });
    }
  }

  private async runE2ETests(): Promise<void> {
    console.log('🌐 Running End-to-End Tests...');

    try {
      // Check if Playwright is available
      const playwrightAvailable = this.checkPlaywrightAvailable();

      if (!playwrightAvailable) {
        console.log('⚠️  Playwright not available, skipping E2E tests');
        this.results.push({
          suite: 'E2E Tests',
          passed: 0,
          failed: 0,
          duration: 0,
        });
        return;
      }

      const result = await this.executeTestSuite(
        'E2E Tests',
        'npx playwright test e2e/public-booking-e2e.spec.ts --reporter=json'
      );

      this.results.push(result);
      console.log(
        `✅ E2E Tests: ${result.passed}/${result.passed + result.failed} passed\n`
      );
    } catch (error) {
      console.error('❌ E2E tests failed:', error);
      this.results.push({
        suite: 'E2E Tests',
        passed: 0,
        failed: 1,
        duration: 0,
      });
    }
  }

  private async runCrossCompatibilityTests(): Promise<void> {
    console.log('🔄 Running Cross-Browser Compatibility Tests...');

    try {
      // Run basic compatibility checks
      const result = await this.executeTestSuite(
        'Cross-Browser Tests',
        'npm test -- __tests__/integration/public-booking-workflow.test.tsx --testNamePattern="Cross Browser" --verbose'
      );

      this.results.push(result);
      console.log(
        `✅ Cross-Browser Tests: ${result.passed}/${result.passed + result.failed} passed\n`
      );
    } catch (error) {
      console.error('❌ Cross-browser tests failed:', error);
      this.results.push({
        suite: 'Cross-Browser Tests',
        passed: 0,
        failed: 1,
        duration: 0,
      });
    }
  }

  private async executeTestSuite(
    suiteName: string,
    command: string
  ): Promise<TestResult> {
    const startTime = performance.now();

    try {
      const output = execSync(command, {
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 300000, // 5 minute timeout
      });

      const duration = performance.now() - startTime;
      const result = this.parseTestOutput(output, suiteName, duration);

      return result;
    } catch (error: any) {
      const duration = performance.now() - startTime;

      // Try to parse error output for test results
      const errorOutput = error.stdout || error.stderr || '';
      const result = this.parseTestOutput(errorOutput, suiteName, duration);

      // If no results found, assume all failed
      if (result.passed === 0 && result.failed === 0) {
        result.failed = 1;
      }

      return result;
    }
  }

  private parseTestOutput(
    output: string,
    suiteName: string,
    duration: number
  ): TestResult {
    // Parse Jest output for test results
    const passedMatch = output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);
    const coverageMatch = output.match(/All files\s+\|\s+([\d.]+)/);

    return {
      suite: suiteName,
      passed: passedMatch ? parseInt(passedMatch[1]) : 0,
      failed: failedMatch ? parseInt(failedMatch[1]) : 0,
      duration,
      coverage: coverageMatch ? parseFloat(coverageMatch[1]) : undefined,
    };
  }

  private checkPlaywrightAvailable(): boolean {
    try {
      execSync('npx playwright --version', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  private generateReport(): QAReport {
    const totalDuration = performance.now() - this.startTime;
    const totalTests = this.results.reduce(
      (sum, result) => sum + result.passed + result.failed,
      0
    );
    const totalPassed = this.results.reduce(
      (sum, result) => sum + result.passed,
      0
    );
    const totalFailed = this.results.reduce(
      (sum, result) => sum + result.failed,
      0
    );
    const overallPassRate =
      totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;

    const recommendations = this.generateRecommendations();

    return {
      timestamp: new Date().toISOString(),
      totalTests,
      totalPassed,
      totalFailed,
      totalDuration,
      overallPassRate,
      suites: this.results,
      recommendations,
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    // Check overall pass rate
    const totalTests = this.results.reduce(
      (sum, result) => sum + result.passed + result.failed,
      0
    );
    const totalPassed = this.results.reduce(
      (sum, result) => sum + result.passed,
      0
    );
    const passRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;

    if (passRate < 95) {
      recommendations.push(
        'Overall pass rate is below 95%. Review failed tests and fix issues.'
      );
    }

    // Check individual suites
    this.results.forEach(result => {
      const suitePassRate =
        result.passed + result.failed > 0
          ? (result.passed / (result.passed + result.failed)) * 100
          : 0;

      if (suitePassRate < 90) {
        recommendations.push(
          `${result.suite} has low pass rate (${suitePassRate.toFixed(1)}%). Investigate failures.`
        );
      }

      if (result.duration > 60000) {
        // 1 minute
        recommendations.push(
          `${result.suite} took ${(result.duration / 1000).toFixed(1)}s. Consider optimizing test performance.`
        );
      }
    });

    // Check coverage
    const coverageResults = this.results.filter(r => r.coverage !== undefined);
    if (coverageResults.length > 0) {
      const avgCoverage =
        coverageResults.reduce((sum, r) => sum + (r.coverage || 0), 0) /
        coverageResults.length;
      if (avgCoverage < 80) {
        recommendations.push(
          `Test coverage is ${avgCoverage.toFixed(1)}%. Aim for at least 80% coverage.`
        );
      }
    }

    if (recommendations.length === 0) {
      recommendations.push(
        'All tests passed successfully! Consider adding more edge case tests.'
      );
    }

    return recommendations;
  }

  private async saveReport(report: QAReport): Promise<void> {
    const reportsDir = path.join(process.cwd(), 'test-results');

    // Create reports directory if it doesn't exist
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportPath = path.join(
      reportsDir,
      `booking-qa-report-${Date.now()}.json`
    );
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`📊 Report saved to: ${reportPath}`);
  }

  private printSummary(report: QAReport): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 PUBLIC BOOKING INTERFACE QA SUMMARY');
    console.log('='.repeat(60));
    console.log(
      `⏱️  Total Duration: ${(report.totalDuration / 1000).toFixed(1)}s`
    );
    console.log(`📈 Total Tests: ${report.totalTests}`);
    console.log(`✅ Passed: ${report.totalPassed}`);
    console.log(`❌ Failed: ${report.totalFailed}`);
    console.log(`📊 Pass Rate: ${report.overallPassRate.toFixed(1)}%`);

    console.log('\n📋 Suite Breakdown:');
    report.suites.forEach(suite => {
      const suitePassRate =
        suite.passed + suite.failed > 0
          ? (suite.passed / (suite.passed + suite.failed)) * 100
          : 0;

      console.log(
        `  ${suite.suite}: ${suite.passed}/${suite.passed + suite.failed} (${suitePassRate.toFixed(1)}%)`
      );

      if (suite.coverage) {
        console.log(`    Coverage: ${suite.coverage.toFixed(1)}%`);
      }
    });

    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach(rec => {
        console.log(`  • ${rec}`);
      });
    }

    console.log('\n' + '='.repeat(60));

    if (report.overallPassRate >= 95) {
      console.log('🎉 Quality Assurance: PASSED');
    } else {
      console.log('⚠️  Quality Assurance: NEEDS ATTENTION');
    }

    console.log('='.repeat(60) + '\n');
  }
}

// Main execution
async function main() {
  const runner = new BookingQARunner();

  try {
    const report = await runner.runAllTests();

    // Exit with appropriate code
    process.exit(report.overallPassRate >= 95 ? 0 : 1);
  } catch (error) {
    console.error('QA test run failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { BookingQARunner };

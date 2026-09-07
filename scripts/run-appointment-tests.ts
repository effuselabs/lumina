#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync } from 'fs';

interface TestSuite {
  name: string;
  pattern: string;
  description: string;
  timeout?: number;
}

const testSuites: TestSuite[] = [
  {
    name: 'unit',
    pattern: '__tests__/components/appointments/**/*.test.tsx',
    description: 'Unit tests for appointment dashboard components',
    timeout: 30000,
  },
  {
    name: 'integration',
    pattern: '__tests__/integration/appointment-management-workflows.test.tsx',
    description: 'Integration tests for appointment management workflows',
    timeout: 60000,
  },
  {
    name: 'performance',
    pattern: '__tests__/performance/calendar-performance.test.ts',
    description:
      'Performance tests for calendar rendering and real-time updates',
    timeout: 120000,
  },
  {
    name: 'accessibility',
    pattern: '__tests__/accessibility/appointment-accessibility.test.tsx',
    description:
      'Accessibility tests for keyboard navigation and screen readers',
    timeout: 45000,
  },
  {
    name: 'e2e',
    pattern: 'e2e/appointment-management.spec.ts',
    description:
      'End-to-end tests for complete appointment management scenarios',
    timeout: 300000,
  },
  {
    name: 'mobile-e2e',
    pattern: 'e2e/mobile-appointment-management.spec.ts',
    description:
      'Mobile device testing for touch interactions and responsive design',
    timeout: 300000,
  },
];

interface TestOptions {
  suite?: string;
  watch?: boolean;
  coverage?: boolean;
  verbose?: boolean;
  updateSnapshots?: boolean;
  bail?: boolean;
  parallel?: boolean;
  maxWorkers?: number;
}

class AppointmentTestRunner {
  private options: TestOptions;

  constructor(options: TestOptions = {}) {
    this.options = options;
  }

  async runTests(): Promise<void> {
    console.log('🧪 Appointment Management Test Suite Runner');
    console.log('==========================================\n');

    if (this.options.suite) {
      await this.runSpecificSuite(this.options.suite);
    } else {
      await this.runAllSuites();
    }
  }

  private async runSpecificSuite(suiteName: string): Promise<void> {
    const suite = testSuites.find(s => s.name === suiteName);
    if (!suite) {
      console.error(`❌ Test suite '${suiteName}' not found`);
      console.log('Available suites:', testSuites.map(s => s.name).join(', '));
      process.exit(1);
    }

    console.log(`🏃 Running ${suite.name} tests...`);
    console.log(`📝 ${suite.description}\n`);

    await this.executeSuite(suite);
  }

  private async runAllSuites(): Promise<void> {
    console.log('🏃 Running all test suites...\n');

    const results: Array<{
      suite: string;
      success: boolean;
      duration: number;
    }> = [];

    for (const suite of testSuites) {
      console.log(`\n📋 ${suite.name.toUpperCase()} TESTS`);
      console.log('='.repeat(50));
      console.log(`📝 ${suite.description}`);

      const startTime = Date.now();
      const success = await this.executeSuite(suite);
      const duration = Date.now() - startTime;

      results.push({ suite: suite.name, success, duration });

      if (!success && this.options.bail) {
        console.log('\n🛑 Stopping test execution due to failure (--bail)');
        break;
      }
    }

    this.printSummary(results);
  }

  private async executeSuite(suite: TestSuite): Promise<boolean> {
    try {
      const command = this.buildCommand(suite);
      console.log(`🔧 Command: ${command}\n`);

      execSync(command, {
        stdio: 'inherit',
        timeout: suite.timeout || 60000,
        env: {
          ...process.env,
          NODE_ENV: 'test',
          JEST_TIMEOUT: (suite.timeout || 60000).toString(),
        },
      });

      console.log(`✅ ${suite.name} tests passed`);
      return true;
    } catch (error) {
      console.error(`❌ ${suite.name} tests failed`);
      if (this.options.verbose) {
        console.error(error);
      }
      return false;
    }
  }

  private buildCommand(suite: TestSuite): string {
    const isE2E = suite.name.includes('e2e');
    const baseCommand = isE2E ? 'npx playwright test' : 'npx jest';

    let command = `${baseCommand} "${suite.pattern}"`;

    if (!isE2E) {
      // Jest-specific options
      if (this.options.watch) {
        command += ' --watch';
      }

      if (this.options.coverage) {
        command += ' --coverage';
      }

      if (this.options.verbose) {
        command += ' --verbose';
      }

      if (this.options.updateSnapshots) {
        command += ' --updateSnapshot';
      }

      if (this.options.maxWorkers) {
        command += ` --maxWorkers=${this.options.maxWorkers}`;
      } else if (this.options.parallel) {
        command += ' --maxWorkers=50%';
      }

      // Add timeout
      command += ` --testTimeout=${suite.timeout || 30000}`;
    } else {
      // Playwright-specific options
      if (this.options.verbose) {
        command += ' --reporter=list';
      }

      if (suite.name === 'mobile-e2e') {
        command += ' --project="Mobile Chrome" --project="Mobile Safari"';
      }
    }

    return command;
  }

  private printSummary(
    results: Array<{ suite: string; success: boolean; duration: number }>
  ): void {
    console.log('\n📊 TEST SUMMARY');
    console.log('='.repeat(50));

    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const duration = (result.duration / 1000).toFixed(2);
      console.log(`${status} ${result.suite.padEnd(15)} (${duration}s)`);
    });

    console.log('\n' + '='.repeat(50));
    console.log(`📈 Total: ${results.length} suites`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏱️  Total time: ${(totalDuration / 1000).toFixed(2)}s`);

    if (failed > 0) {
      console.log(
        '\n❌ Some tests failed. Check the output above for details.'
      );
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed!');
    }
  }
}

// CLI argument parsing
function parseArgs(): TestOptions {
  const args = process.argv.slice(2);
  const options: TestOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--suite':
      case '-s':
        options.suite = args[++i];
        break;
      case '--watch':
      case '-w':
        options.watch = true;
        break;
      case '--coverage':
      case '-c':
        options.coverage = true;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--updateSnapshots':
      case '-u':
        options.updateSnapshots = true;
        break;
      case '--bail':
      case '-b':
        options.bail = true;
        break;
      case '--parallel':
      case '-p':
        options.parallel = true;
        break;
      case '--maxWorkers':
        options.maxWorkers = parseInt(args[++i]);
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
🧪 Appointment Management Test Suite Runner

Usage: npm run test:appointments [options]

Options:
  -s, --suite <name>        Run specific test suite (unit, integration, performance, accessibility, e2e, mobile-e2e)
  -w, --watch              Watch mode for Jest tests
  -c, --coverage           Generate coverage report
  -v, --verbose            Verbose output
  -u, --updateSnapshots    Update Jest snapshots
  -b, --bail               Stop on first test failure
  -p, --parallel           Run tests in parallel
  --maxWorkers <number>    Maximum number of worker processes
  -h, --help               Show this help message

Examples:
  npm run test:appointments                    # Run all test suites
  npm run test:appointments -s unit           # Run only unit tests
  npm run test:appointments -s e2e -v         # Run E2E tests with verbose output
  npm run test:appointments -c -p             # Run all tests with coverage in parallel
  npm run test:appointments -w -s unit        # Watch unit tests

Available test suites:
${testSuites.map(s => `  ${s.name.padEnd(15)} - ${s.description}`).join('\n')}
`);
}

// Validation
function validateEnvironment(): void {
  const requiredFiles = [
    'jest.config.js',
    'playwright.config.ts',
    '__tests__/setup/appointment-test-setup.ts',
  ];

  const missingFiles = requiredFiles.filter(file => !existsSync(file));

  if (missingFiles.length > 0) {
    console.error('❌ Missing required files:');
    missingFiles.forEach(file => console.error(`   - ${file}`));
    console.error('\nPlease ensure all test configuration files are present.');
    process.exit(1);
  }

  // Check if test databases/services are available
  if (process.env.NODE_ENV !== 'test') {
    console.warn('⚠️  NODE_ENV is not set to "test". Some tests may fail.');
  }
}

// Main execution
async function main(): Promise<void> {
  try {
    validateEnvironment();

    const options = parseArgs();
    const runner = new AppointmentTestRunner(options);

    await runner.runTests();
  } catch (error) {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { AppointmentTestRunner };
export type { TestOptions, TestSuite };

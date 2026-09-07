#!/usr/bin/env tsx

/**
 * Test Setup Validation Script
 *
 * Validates that all testing infrastructure is properly configured and working
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';

interface ValidationResult {
  category: string;
  test: string;
  passed: boolean;
  message: string;
}

class TestSetupValidator {
  private results: ValidationResult[] = [];
  private verbose: boolean;

  constructor(verbose: boolean = false) {
    this.verbose = verbose;
  }

  async validateSetup(): Promise<void> {
    console.log('🔍 Validating Test Setup Configuration\n');

    // Validate dependencies
    await this.validateDependencies();

    // Validate configuration files
    await this.validateConfigFiles();

    // Validate test files
    await this.validateTestFiles();

    // Validate scripts
    await this.validateScripts();

    // Validate directories
    await this.validateDirectories();

    // Run basic test validation
    await this.validateBasicTests();

    // Print results
    this.printResults();
  }

  private async validateDependencies(): Promise<void> {
    const requiredDeps = [
      '@playwright/test',
      '@axe-core/playwright',
      'axe-core',
      'jest',
      '@testing-library/react',
      '@testing-library/jest-dom',
    ];

    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    requiredDeps.forEach(dep => {
      const isInstalled = dep in allDeps;
      this.addResult(
        'Dependencies',
        `${dep} installed`,
        isInstalled,
        isInstalled ? `Version: ${allDeps[dep]}` : 'Missing dependency'
      );
    });
  }

  private async validateConfigFiles(): Promise<void> {
    const configFiles = [
      { path: 'jest.config.js', description: 'Jest configuration' },
      { path: 'playwright.config.ts', description: 'Playwright configuration' },
      {
        path: 'e2e/visual-test.config.ts',
        description: 'Visual test configuration',
      },
      { path: 'tsconfig.json', description: 'TypeScript configuration' },
    ];

    configFiles.forEach(config => {
      const exists = existsSync(config.path);
      this.addResult(
        'Configuration',
        config.description,
        exists,
        exists ? 'Configuration file exists' : `Missing: ${config.path}`
      );
    });
  }

  private async validateTestFiles(): Promise<void> {
    const testFiles = [
      {
        path: 'e2e/visual-regression.spec.ts',
        description: 'Visual regression tests',
      },
      {
        path: 'e2e/accessibility/accessibility-regression.spec.ts',
        description: 'Accessibility tests',
      },
      {
        path: 'e2e/performance/performance-regression.spec.ts',
        description: 'Performance tests',
      },
      {
        path: 'e2e/accessibility/keyboard-navigation.spec.ts',
        description: 'Keyboard navigation tests',
      },
      {
        path: 'e2e/utils/visual-test-helpers.ts',
        description: 'Visual test utilities',
      },
    ];

    testFiles.forEach(testFile => {
      const exists = existsSync(testFile.path);
      this.addResult(
        'Test Files',
        testFile.description,
        exists,
        exists ? 'Test file exists' : `Missing: ${testFile.path}`
      );
    });
  }

  private async validateScripts(): Promise<void> {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    const scripts = packageJson.scripts || {};

    const requiredScripts = [
      'test:visual',
      'test:accessibility',
      'test:performance',
      'test:comprehensive',
      'test:visual:update',
      'test:visual:setup',
    ];

    requiredScripts.forEach(script => {
      const exists = script in scripts;
      this.addResult(
        'Scripts',
        `npm run ${script}`,
        exists,
        exists ? `Command: ${scripts[script]}` : 'Missing script'
      );
    });
  }

  private async validateDirectories(): Promise<void> {
    const requiredDirs = [
      'e2e',
      'e2e/components',
      'e2e/accessibility',
      'e2e/performance',
      'e2e/utils',
      '__tests__',
      'test-utils',
      'docs/testing',
    ];

    requiredDirs.forEach(dir => {
      const exists = existsSync(dir);
      this.addResult(
        'Directories',
        dir,
        exists,
        exists ? 'Directory exists' : `Missing directory: ${dir}`
      );
    });
  }

  private async validateBasicTests(): Promise<void> {
    // Test Jest configuration
    try {
      execSync('npm run test -- --passWithNoTests --silent', { stdio: 'pipe' });
      this.addResult(
        'Basic Tests',
        'Jest configuration',
        true,
        'Jest runs successfully'
      );
    } catch (error) {
      this.addResult(
        'Basic Tests',
        'Jest configuration',
        false,
        'Jest configuration error'
      );
    }

    // Test Playwright installation
    try {
      execSync('npx playwright --version', { stdio: 'pipe' });
      this.addResult(
        'Basic Tests',
        'Playwright installation',
        true,
        'Playwright is installed'
      );
    } catch (error) {
      this.addResult(
        'Basic Tests',
        'Playwright installation',
        false,
        'Playwright not installed'
      );
    }

    // Test TypeScript compilation
    try {
      execSync('npm run type-check', { stdio: 'pipe' });
      this.addResult(
        'Basic Tests',
        'TypeScript compilation',
        true,
        'TypeScript compiles successfully'
      );
    } catch (error) {
      this.addResult(
        'Basic Tests',
        'TypeScript compilation',
        false,
        'TypeScript compilation errors'
      );
    }
  }

  private addResult(
    category: string,
    test: string,
    passed: boolean,
    message: string
  ): void {
    this.results.push({ category, test, passed, message });

    if (this.verbose) {
      const status = passed ? '✅' : '❌';
      console.log(`${status} ${category}: ${test} - ${message}`);
    }
  }

  private printResults(): void {
    const categories = [...new Set(this.results.map(r => r.category))];
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    console.log('\n' + '='.repeat(60));
    console.log('🧪 TEST SETUP VALIDATION RESULTS');
    console.log('='.repeat(60));

    categories.forEach(category => {
      const categoryResults = this.results.filter(r => r.category === category);
      const categoryPassed = categoryResults.filter(r => r.passed).length;
      const categoryTotal = categoryResults.length;

      console.log(
        `\n📋 ${category}: ${categoryPassed}/${categoryTotal} passed`
      );

      categoryResults.forEach(result => {
        const status = result.passed ? '✅' : '❌';
        console.log(`   ${status} ${result.test}`);

        if (!result.passed || this.verbose) {
          console.log(`      ${result.message}`);
        }
      });
    });

    console.log('\n' + '='.repeat(60));
    console.log(
      `📊 OVERALL: ${passedTests}/${totalTests} tests passed (${((passedTests / totalTests) * 100).toFixed(1)}%)`
    );
    console.log('='.repeat(60));

    if (failedTests > 0) {
      console.log('\n❌ SETUP ISSUES DETECTED');
      console.log('\nFailed validations:');

      this.results
        .filter(r => !r.passed)
        .forEach(result => {
          console.log(`   - ${result.category}: ${result.test}`);
          console.log(`     ${result.message}`);
        });

      console.log('\n🔧 RECOMMENDED ACTIONS:');
      console.log('1. Install missing dependencies: npm install');
      console.log('2. Install Playwright browsers: npx playwright install');
      console.log('3. Create missing directories and files');
      console.log('4. Run setup script: npm run test:visual:setup');
      console.log('5. Validate again: tsx scripts/validate-test-setup.ts');
    } else {
      console.log('\n🎉 ALL VALIDATIONS PASSED!');
      console.log('\nYour test setup is complete and ready to use:');
      console.log('- Run comprehensive tests: npm run test:comprehensive');
      console.log('- Run visual tests: npm run test:visual');
      console.log('- Run accessibility tests: npm run test:accessibility');
      console.log('- Run performance tests: npm run test:performance');
    }

    console.log('\n📚 Documentation:');
    console.log('- Visual Testing: docs/testing/visual-regression-testing.md');
    console.log(
      '- Comprehensive Guide: docs/testing/comprehensive-testing-guide.md'
    );
    console.log('- Test Reports: test-results/comprehensive/');
  }

  getResults(): ValidationResult[] {
    return this.results;
  }

  isValid(): boolean {
    return this.results.every(r => r.passed);
  }
}

// CLI Interface
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose') || args.includes('-v');

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Test Setup Validation Script

Usage: tsx scripts/validate-test-setup.ts [options]

Options:
  --verbose, -v    Show detailed validation results
  --help, -h      Show this help message

This script validates:
  - Required dependencies are installed
  - Configuration files exist and are valid
  - Test files are present
  - npm scripts are configured
  - Directory structure is correct
  - Basic test functionality works
`);
    return;
  }

  const validator = new TestSetupValidator(verbose);
  await validator.validateSetup();

  // Exit with error code if validation fails
  if (!validator.isValid()) {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });
}

export { TestSetupValidator };

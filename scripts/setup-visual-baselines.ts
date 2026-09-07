#!/usr/bin/env tsx

/**
 * Visual Testing Baseline Setup Script
 *
 * Sets up baseline screenshots for visual regression testing
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

interface VisualTestSetup {
  setupBaselines: boolean;
  updateExisting: boolean;
  componentsOnly: boolean;
  verbose: boolean;
}

class VisualTestSetupManager {
  private config: VisualTestSetup;

  constructor(config: VisualTestSetup) {
    this.config = config;
  }

  async setupVisualTesting(): Promise<void> {
    console.log('🎨 Setting up visual regression testing...\n');

    // Ensure test directories exist
    this.ensureDirectories();

    // Generate baseline screenshots
    if (this.config.setupBaselines) {
      await this.generateBaselines();
    }

    // Create visual test documentation
    this.createDocumentation();

    console.log('✅ Visual testing setup complete!\n');
    this.printUsageInstructions();
  }

  private ensureDirectories(): void {
    const directories = [
      'test-results/visual',
      'playwright-report/visual',
      'e2e/components',
      'e2e/utils',
    ];

    directories.forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
        if (this.config.verbose) {
          console.log(`📁 Created directory: ${dir}`);
        }
      }
    });
  }

  private async generateBaselines(): Promise<void> {
    console.log('📸 Generating baseline screenshots...');

    try {
      const command = this.config.updateExisting
        ? 'npm run test:visual:update'
        : 'npm run test:visual';

      if (this.config.componentsOnly) {
        execSync(`${command} -- --grep "component visual"`, {
          stdio: this.config.verbose ? 'inherit' : 'pipe',
        });
      } else {
        execSync(command, {
          stdio: this.config.verbose ? 'inherit' : 'pipe',
        });
      }

      console.log('✅ Baseline screenshots generated successfully');
    } catch (error) {
      console.error('❌ Failed to generate baseline screenshots:', error);
      throw error;
    }
  }

  private createDocumentation(): void {
    const visualTestingGuide = `# Visual Regression Testing Guide

## Overview

This project uses Playwright for visual regression testing to ensure design system consistency across:
- Light and dark themes
- Multiple responsive breakpoints (mobile, tablet, desktop, wide)
- All component variants and states
- Interactive states (hover, focus, active, disabled)

## Running Visual Tests

### Basic Commands

\`\`\`bash
# Run all visual tests
npm run test:visual

# Run visual tests with UI
npm run test:visual:ui

# Update baseline screenshots
npm run test:visual:update

# Run specific component tests
npm run test:visual -- --grep "Button"
\`\`\`

### Test Structure

Visual tests are organized by component:
- \`e2e/components/button-visual.spec.ts\` - Button component tests
- \`e2e/components/stat-card-visual.spec.ts\` - StatCard component tests
- \`e2e/components/form-visual.spec.ts\` - Form component tests
- \`e2e/components/layout-visual.spec.ts\` - Layout component tests

### Test Coverage

Each component is tested across:
- **Themes**: Light and dark modes
- **Breakpoints**: Mobile (375px), Tablet (768px), Desktop (1440px), Wide (1920px)
- **Variants**: All component variants (primary, secondary, etc.)
- **States**: Default, hover, focus, active, disabled, loading
- **Accessibility**: Reduced motion, high contrast, focus indicators

## Adding New Visual Tests

### 1. Create Component Test File

\`\`\`typescript
// e2e/components/my-component-visual.spec.ts
import { test } from '@playwright/test';
import { runComponentVisualTests } from '../utils/visual-test-helpers';

test.describe('MyComponent Visual Tests', () => {
  test('MyComponent variants and states', async ({ page }) => {
    await runComponentVisualTests(page, {
      componentName: 'my-component',
      route: '/design-system/my-component',
      variants: ['primary', 'secondary'],
      sizes: ['sm', 'md', 'lg'],
      states: ['default', 'hover', 'focus'],
      testLoading: true,
      testError: true,
      testAccessibility: true
    });
  });
});
\`\`\`

### 2. Add Test Data Attributes

Ensure your components have proper test IDs:

\`\`\`tsx
<Button 
  data-testid="button-primary-md"
  variant="primary" 
  size="md"
>
  Click me
</Button>
\`\`\`

### 3. Update Visual Test Runner

Add your component to the \`componentTests\` array in \`e2e/visual-test-runner.spec.ts\`.

## Troubleshooting

### Screenshot Differences

If tests fail due to minor differences:
1. Review the diff images in \`test-results/visual\`
2. If changes are intentional, update baselines: \`npm run test:visual:update\`
3. Adjust threshold in \`e2e/visual-test.config.ts\` if needed

### Flaky Tests

Common causes and solutions:
- **Font loading**: Ensure fonts are loaded before screenshots
- **Animations**: Disable animations in test setup
- **Timing**: Add appropriate waits for dynamic content
- **Viewport**: Ensure consistent viewport sizes

### Performance

Visual tests can be slow. To optimize:
- Run specific component tests during development
- Use \`--workers=1\` for consistent results
- Consider running full suite only in CI

## Best Practices

1. **Consistent Test Data**: Use the same test data across runs
2. **Stable Selectors**: Use \`data-testid\` attributes for reliable element selection
3. **Minimal Screenshots**: Focus on specific components rather than full pages
4. **Descriptive Names**: Use clear, descriptive screenshot names
5. **Regular Updates**: Update baselines when design changes are intentional

## CI Integration

Visual tests run automatically in CI and will fail if:
- Screenshots don't match baselines
- New components lack visual tests
- Accessibility standards aren't met

To update baselines in CI, create a PR with updated screenshots using:
\`npm run test:visual:update\`
`;

    writeFileSync(
      'docs/testing/visual-regression-guide.md',
      visualTestingGuide
    );

    const visualTestChecklist = `# Visual Testing Checklist

## Before Committing Design Changes

- [ ] Run visual tests locally: \`npm run test:visual\`
- [ ] Review any screenshot differences
- [ ] Update baselines if changes are intentional: \`npm run test:visual:update\`
- [ ] Test in both light and dark themes
- [ ] Test across all breakpoints (mobile, tablet, desktop)
- [ ] Verify accessibility states (focus, reduced motion)

## Adding New Components

- [ ] Add \`data-testid\` attributes to component
- [ ] Create visual test file in \`e2e/components/\`
- [ ] Test all component variants and sizes
- [ ] Test interactive states (hover, focus, disabled)
- [ ] Test loading and error states
- [ ] Add component to visual test runner
- [ ] Generate baseline screenshots
- [ ] Document component-specific test considerations

## Reviewing Visual Test Failures

- [ ] Check diff images in \`test-results/visual\`
- [ ] Verify changes are intentional
- [ ] Consider impact on accessibility
- [ ] Update baselines if approved
- [ ] Re-run tests to confirm fixes

## Performance Considerations

- [ ] Keep screenshot scope minimal
- [ ] Use specific selectors, not full page captures
- [ ] Disable animations for consistency
- [ ] Consider test execution time in CI
`;

    writeFileSync(
      'docs/testing/visual-testing-checklist.md',
      visualTestChecklist
    );

    if (this.config.verbose) {
      console.log('📝 Created visual testing documentation');
    }
  }

  private printUsageInstructions(): void {
    console.log('📋 Visual Testing Setup Complete!\n');
    console.log('Next steps:');
    console.log('1. Run visual tests: npm run test:visual');
    console.log('2. View results: npm run test:visual:ui');
    console.log('3. Update baselines: npm run test:visual:update');
    console.log('4. Read the guide: docs/testing/visual-regression-guide.md\n');
  }
}

// CLI Interface
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const config: VisualTestSetup = {
    setupBaselines: !args.includes('--no-baselines'),
    updateExisting: args.includes('--update'),
    componentsOnly: args.includes('--components-only'),
    verbose: args.includes('--verbose'),
  };

  if (args.includes('--help')) {
    console.log(`
Visual Testing Setup Script

Usage: tsx scripts/setup-visual-baselines.ts [options]

Options:
  --no-baselines     Skip generating baseline screenshots
  --update          Update existing baseline screenshots
  --components-only Generate baselines for components only
  --verbose         Show detailed output
  --help           Show this help message
`);
    return;
  }

  const manager = new VisualTestSetupManager(config);
  await manager.setupVisualTesting();
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });
}

export { VisualTestSetupManager };

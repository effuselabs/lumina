#!/usr/bin/env tsx

/**
 * Setup Design System Visual Baselines
 *
 * Creates baseline screenshots for all design system components
 * Run this after implementing new components or making visual changes
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

interface BaselineConfig {
  testFiles: string[];
  outputDir: string;
  browsers: string[];
  themes: string[];
  breakpoints: string[];
}

const config: BaselineConfig = {
  testFiles: ['e2e/design-system-visual-regression.spec.ts'],
  outputDir: 'test-results/visual/baselines',
  browsers: ['chromium', 'firefox', 'webkit'],
  themes: ['light', 'dark'],
  breakpoints: ['mobile', 'tablet', 'desktop', 'wide'],
};

async function setupBaselines(): Promise<void> {
  console.log('🎨 Setting up Design System Visual Baselines...\n');

  // Ensure output directory exists
  if (!existsSync(config.outputDir)) {
    mkdirSync(config.outputDir, { recursive: true });
    console.log(`✅ Created baseline directory: ${config.outputDir}`);
  }

  // Check if development server is running
  try {
    execSync('curl -f http://localhost:3000/api/health', { stdio: 'ignore' });
    console.log('✅ Development server is running');
  } catch (error) {
    console.error('❌ Development server is not running');
    console.log('Please start the development server with: npm run dev');
    process.exit(1);
  }

  // Run visual tests to generate baselines
  console.log('\n📸 Generating baseline screenshots...');

  try {
    // Run tests with update snapshots flag
    const command = `npx playwright test ${config.testFiles.join(' ')} --config=e2e/visual-test.config.ts --update-snapshots`;

    console.log(`Running: ${command}\n`);
    execSync(command, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    console.log('\n✅ Baseline screenshots generated successfully!');

    // Generate baseline report
    await generateBaselineReport();
  } catch (error) {
    console.error('\n❌ Failed to generate baseline screenshots');
    console.error(error);
    process.exit(1);
  }
}

async function generateBaselineReport(): Promise<void> {
  const reportContent = `# Design System Visual Baselines Report

Generated on: ${new Date().toISOString()}

## Configuration

- **Test Files**: ${config.testFiles.join(', ')}
- **Browsers**: ${config.browsers.join(', ')}
- **Themes**: ${config.themes.join(', ')}
- **Breakpoints**: ${config.breakpoints.join(', ')}

## Components Tested

### Buttons
- Variants: primary, secondary, outline, ghost, destructive, link
- Sizes: sm, default, lg, xl
- States: default, hover, focus, disabled, loading

### Colors
- Brand colors (Lumina Gold, Coral, Deep Teal)
- Complementary colors (Sage Green, Warm Gray, Lavender Mist, Cream)
- Semantic colors (success, warning, error, info)
- Neutral colors (grays, borders, backgrounds)

### Typography
- Heading levels (H1, H2, H3)
- Body text (large, small)
- Caption text
- Font weights and line heights

### Form Elements
- Input fields (text, email, password)
- Textarea
- Select dropdowns
- Checkboxes and radio buttons
- Switches
- Validation states (error, success)

### Cards
- Variants: default, elevated, interactive, outline
- States: default, hover, focus

### Badges
- Variants: default, secondary, destructive, outline, success, warning
- Sizes: sm, default, lg

### Layout Components
- Navigation
- Headers
- Sidebars
- Main content areas
- Footers

## Theme Testing

All components are tested in both light and dark themes to ensure:
- Proper color contrast ratios
- Consistent visual hierarchy
- Smooth theme transitions
- No visual artifacts during theme switching

## Responsive Testing

Components are tested across multiple breakpoints:
- Mobile (375px)
- Tablet (768px) 
- Desktop (1440px)
- Wide (1920px)

## Accessibility Testing

Visual baselines include:
- Focus indicators for all interactive elements
- Reduced motion preferences
- High contrast mode compatibility
- Screen reader compatible layouts

## Usage

To run visual regression tests against these baselines:

\`\`\`bash
# Run all visual tests
npm run test:visual

# Run with UI for debugging
npm run test:visual:ui

# Update baselines after intentional changes
npm run test:visual:update
\`\`\`

## Maintenance

Baselines should be updated when:
- New components are added
- Visual design changes are made
- Brand colors or typography are updated
- Layout or spacing changes occur

Always review visual diffs carefully before updating baselines to ensure changes are intentional.
`;

  const reportPath = join(config.outputDir, 'baseline-report.md');
  writeFileSync(reportPath, reportContent);

  console.log(`📋 Baseline report saved to: ${reportPath}`);
}

async function validateBaselines(): Promise<void> {
  console.log('\n🔍 Validating baseline screenshots...');

  const requiredComponents = [
    'button',
    'brand-colors',
    'typography-scale',
    'input',
    'card',
    'badge',
  ];

  const requiredThemes = config.themes;
  const requiredBreakpoints = config.breakpoints;

  let missingBaselines: string[] = [];

  for (const component of requiredComponents) {
    for (const theme of requiredThemes) {
      for (const breakpoint of requiredBreakpoints) {
        const baselinePath = join(
          'test-results',
          `${component}-default-${theme}-${breakpoint}.png`
        );

        if (!existsSync(baselinePath)) {
          missingBaselines.push(baselinePath);
        }
      }
    }
  }

  if (missingBaselines.length > 0) {
    console.log(`⚠️  Missing ${missingBaselines.length} baseline screenshots:`);
    missingBaselines.slice(0, 10).forEach(path => {
      console.log(`   - ${path}`);
    });

    if (missingBaselines.length > 10) {
      console.log(`   ... and ${missingBaselines.length - 10} more`);
    }

    console.log(
      '\nRun the baseline generation again to create missing screenshots.'
    );
  } else {
    console.log('✅ All required baseline screenshots are present');
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Design System Visual Baselines Setup

Usage:
  tsx scripts/setup-design-system-visual-baselines.ts [options]

Options:
  --validate    Validate existing baselines without regenerating
  --help, -h    Show this help message

Examples:
  # Generate new baselines
  tsx scripts/setup-design-system-visual-baselines.ts

  # Validate existing baselines
  tsx scripts/setup-design-system-visual-baselines.ts --validate
        `);
    return;
  }

  if (args.includes('--validate')) {
    await validateBaselines();
    return;
  }

  await setupBaselines();
  await validateBaselines();

  console.log('\n🎉 Design System Visual Baselines setup complete!');
  console.log('\nNext steps:');
  console.log('1. Review the generated screenshots in test-results/');
  console.log('2. Run "npm run test:visual" to test against baselines');
  console.log('3. Use "npm run test:visual:ui" for interactive debugging');
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });
}

export { generateBaselineReport, setupBaselines, validateBaselines };

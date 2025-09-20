# Visual Regression Testing

## Overview

Our visual regression testing system ensures design system consistency across themes, breakpoints, and component states using Playwright's visual comparison capabilities.

## Architecture

### Test Structure

```
e2e/
├── components/                 # Component-specific visual tests
│   ├── button-visual.spec.ts
│   ├── stat-card-visual.spec.ts
│   ├── form-visual.spec.ts
│   └── layout-visual.spec.ts
├── utils/
│   └── visual-test-helpers.ts  # Shared testing utilities
├── visual-regression.spec.ts   # Comprehensive test suite
├── visual-test-runner.spec.ts  # Test orchestration
└── visual-test.config.ts       # Visual testing configuration
```

### Coverage Matrix

| Component | Light Theme | Dark Theme | Mobile | Tablet | Desktop | States Tested |
|-----------|-------------|------------|---------|---------|---------|---------------|
| Button | ✅ | ✅ | ✅ | ✅ | ✅ | default, hover, focus, disabled, loading |
| StatCard | ✅ | ✅ | ✅ | ✅ | ✅ | default, hover, loading |
| Input | ✅ | ✅ | ✅ | ✅ | ✅ | default, focus, error, disabled |
| Select | ✅ | ✅ | ✅ | ✅ | ✅ | default, focus, open, disabled |
| PageHeader | ✅ | ✅ | ✅ | ✅ | ✅ | default, compact, with-breadcrumbs |
| Grid | ✅ | ✅ | ✅ | ✅ | ✅ | auto-fit, fixed-columns, compact |

## Test Categories

### 1. Component Visual Tests

Tests individual components across all variants, sizes, and states:

```typescript
await runComponentVisualTests(page, {
  componentName: 'button',
  route: '/design-system/buttons',
  variants: ['primary', 'secondary', 'outline', 'ghost', 'destructive'],
  sizes: ['sm', 'md', 'lg'],
  states: ['default', 'hover', 'focus', 'disabled', 'loading'],
  testLoading: true,
  testError: false,
  testAccessibility: true
});
```

### 2. Theme Consistency Tests

Verifies smooth theme transitions and consistent appearance:

```typescript
test('Theme switching visual consistency', async ({ page }) => {
  // Test theme transition animations
  // Verify color consistency across themes
  // Check component appearance in both themes
});
```

### 3. Responsive Layout Tests

Tests layout behavior across breakpoints:

```typescript
const breakpoints = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'wide', width: 1920, height: 1080 }
];
```

### 4. Accessibility Visual Tests

Tests accessibility features and states:

```typescript
test('Accessibility visual states', async ({ page }) => {
  // Test with reduced motion
  await page.emulateMedia({ reducedMotion: 'reduce' });
  
  // Test focus indicators
  // Test high contrast mode
  // Test keyboard navigation states
});
```

## Running Tests

### Development Workflow

```bash
# Run all visual tests
npm run test:visual

# Run with UI for debugging
npm run test:visual:ui

# Run specific component tests
npm run test:visual -- --grep "Button"

# Update baseline screenshots
npm run test:visual:update

# Setup visual testing (first time)
npm run test:visual:setup
```

### CI/CD Integration

Visual tests run automatically in CI and will:
- Compare screenshots against baselines
- Generate diff images for failures
- Create detailed reports
- Block deployment if critical visual regressions are detected

## Configuration

### Visual Test Settings

```typescript
// e2e/visual-test.config.ts
use: {
  expect: {
    threshold: 0.1,           // 10% pixel difference tolerance
    maxDiffPixels: 1000,      // Maximum different pixels allowed
    animations: 'disabled'    // Disable animations for consistency
  }
}
```

### Screenshot Naming Convention

Screenshots follow a consistent naming pattern:
```
{component}-{variant}-{size}-{state}-{theme}-{breakpoint}.png

Examples:
- button-primary-md-default-light-desktop.png
- stat-card-compact-hover-dark-mobile.png
- input-error-focus-light-tablet.png
```

## Best Practices

### 1. Consistent Test Data

Use stable, predictable test data:

```typescript
const testData = {
  statCard: {
    title: "Total Revenue",
    value: "$12,345",
    change: { value: 12.5, type: 'increase', period: 'vs last month' }
  }
};
```

### 2. Reliable Selectors

Use `data-testid` attributes for element selection:

```tsx
<Button 
  data-testid="button-primary-md"
  variant="primary" 
  size="md"
>
  Click me
</Button>
```

### 3. Animation Handling

Disable animations for consistent screenshots:

```typescript
await page.addStyleTag({
  content: `
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  `
});
```

### 4. Font Loading

Ensure fonts are loaded before taking screenshots:

```typescript
await page.waitForLoadState('networkidle');
await page.waitForTimeout(1000); // Additional wait for font rendering
```

## Troubleshooting

### Common Issues

#### 1. Screenshot Differences

**Symptoms**: Tests fail with pixel differences
**Solutions**:
- Check if changes are intentional
- Update baselines if design changes are approved
- Adjust threshold if differences are minor
- Ensure consistent test environment

#### 2. Flaky Tests

**Symptoms**: Tests pass/fail inconsistently
**Solutions**:
- Add proper waits for dynamic content
- Disable animations completely
- Use stable test data
- Ensure fonts are loaded

#### 3. Performance Issues

**Symptoms**: Tests are slow or timeout
**Solutions**:
- Use single worker for visual tests
- Focus screenshots on specific components
- Avoid full-page captures when possible
- Optimize test data loading

### Debugging Visual Tests

1. **Use UI Mode**: `npm run test:visual:ui`
2. **Check Diff Images**: Located in `test-results/visual/`
3. **Review Test Reports**: HTML reports in `playwright-report/visual/`
4. **Enable Verbose Logging**: Add `--verbose` flag

## Maintenance

### Regular Tasks

1. **Update Baselines**: When design changes are approved
2. **Review Failures**: Investigate and fix flaky tests
3. **Add New Tests**: For new components or variants
4. **Performance Monitoring**: Keep test execution time reasonable

### Baseline Management

```bash
# Update all baselines
npm run test:visual:update

# Update specific component baselines
npm run test:visual:update -- --grep "Button"

# Review changes before committing
git diff test-results/
```

## Metrics and Reporting

### Test Coverage Metrics

- **Component Coverage**: Percentage of UI components with visual tests
- **State Coverage**: Percentage of component states tested
- **Theme Coverage**: Consistency across light/dark themes
- **Breakpoint Coverage**: Responsive behavior validation

### Performance Metrics

- **Test Execution Time**: Total time for visual test suite
- **Screenshot Generation Time**: Time to capture individual screenshots
- **Comparison Time**: Time to compare against baselines
- **Storage Usage**: Disk space used by screenshot baselines

### Quality Metrics

- **Pass Rate**: Percentage of visual tests passing
- **Regression Detection**: Number of visual regressions caught
- **False Positives**: Tests failing due to environmental differences
- **Coverage Gaps**: Components or states without visual tests

## Integration with Design System

Visual regression testing is integrated with our design system workflow:

1. **Component Development**: Visual tests created alongside new components
2. **Design Reviews**: Screenshots used in design review process
3. **Documentation**: Visual examples generated from test screenshots
4. **Quality Gates**: Visual tests block releases with regressions

This ensures our design system maintains visual consistency and quality across all components and use cases.
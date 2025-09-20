# Comprehensive Testing Guide

## Overview

Our comprehensive testing system ensures design system quality across multiple dimensions:

- **Visual Regression**: Screenshot comparison across themes and breakpoints
- **Accessibility**: WCAG 2.1 AA compliance testing
- **Performance**: Component rendering and animation performance
- **Keyboard Navigation**: Complete keyboard accessibility testing
- **Unit Testing**: Component functionality and logic
- **Integration Testing**: End-to-end user workflows

## Test Architecture

```
testing/
├── unit/                           # Jest unit tests
│   └── __tests__/
├── visual/                         # Playwright visual regression
│   ├── e2e/components/
│   ├── e2e/utils/
│   └── e2e/visual-regression.spec.ts
├── accessibility/                  # Accessibility testing
│   ├── e2e/accessibility/
│   └── axe-core integration
├── performance/                    # Performance testing
│   └── e2e/performance/
└── integration/                    # E2E integration tests
    └── e2e/
```

## Running Tests

### Quick Commands

```bash
# Run all comprehensive tests
npm run test:comprehensive

# Run with detailed output
npm run test:comprehensive:verbose

# Run only required tests (skip performance/e2e)
npm run test:comprehensive:required

# Run specific test categories
npm run test:visual
npm run test:accessibility
npm run test:performance
npm run test:unit
```

### Development Workflow

```bash
# During development - run relevant tests
npm run test:unit -- --watch
npm run test:visual -- --grep "Button"

# Before committing - run comprehensive tests
npm run test:comprehensive:required

# Before deployment - full test suite
npm run test:comprehensive
```

## Test Categories

### 1. Visual Regression Testing

**Purpose**: Ensure visual consistency across themes, breakpoints, and component states

**Coverage**:
- All UI components in light/dark themes
- Mobile, tablet, desktop, and wide breakpoints
- Component states: default, hover, focus, disabled, loading
- Theme switching animations
- Responsive layout behavior

**Commands**:
```bash
npm run test:visual              # Run all visual tests
npm run test:visual:update       # Update baseline screenshots
npm run test:visual:ui           # Interactive test runner
```

**Thresholds**:
- Pixel difference tolerance: 10%
- Maximum different pixels: 1000
- Animation consistency: Required

### 2. Accessibility Testing

**Purpose**: Ensure WCAG 2.1 AA compliance and keyboard accessibility

**Coverage**:
- Automated axe-core scanning
- Keyboard navigation patterns
- Screen reader compatibility
- Color contrast ratios
- Focus management
- ARIA attributes and semantic markup

**Commands**:
```bash
npm run test:accessibility       # Run all accessibility tests
playwright test e2e/accessibility/accessibility-regression.spec.ts
playwright test e2e/accessibility/keyboard-navigation.spec.ts
```

**Standards**:
- WCAG 2.1 AA compliance: Required
- Keyboard navigation: All interactive elements
- Color contrast: Minimum 4.5:1 ratio
- Focus indicators: Visible and consistent

### 3. Performance Testing

**Purpose**: Ensure optimal rendering performance and smooth animations

**Coverage**:
- Component rendering time
- Theme switching performance
- Animation frame rates
- Memory usage monitoring
- Responsive layout performance

**Commands**:
```bash
npm run test:performance         # Run performance tests
```

**Thresholds**:
- Component render time: < 100ms
- Theme switch time: < 300ms
- Animation frame rate: 60fps (16.67ms per frame)
- Memory usage: < 50MB increase
- Layout calculation: < 30ms

### 4. Unit Testing

**Purpose**: Test component functionality, props, and logic

**Coverage**:
- Component rendering with different props
- Event handling and callbacks
- State management
- Utility functions
- Error boundaries

**Commands**:
```bash
npm run test:unit               # Run unit tests
npm run test:unit:watch         # Watch mode
npm run test:unit:coverage      # With coverage report
```

**Coverage Requirements**:
- Overall coverage: 70%
- Critical components: 80%
- Utility functions: 80%

## Test Configuration

### Visual Testing Configuration

```typescript
// e2e/visual-test.config.ts
export default {
  use: {
    expect: {
      threshold: 0.1,           // 10% pixel difference tolerance
      maxDiffPixels: 1000,      // Maximum different pixels
      animations: 'disabled'    // Disable animations for consistency
    }
  },
  projects: [
    {
      name: 'visual-chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 1440, height: 900 }
      }
    }
  ]
};
```

### Accessibility Configuration

```typescript
// Axe-core configuration
const axeConfig = {
  rules: {
    'color-contrast': { enabled: true },
    'keyboard-navigation': { enabled: true },
    'aria-valid-attr': { enabled: true },
    'button-name': { enabled: true },
    'form-field-multiple-labels': { enabled: true }
  },
  tags: ['wcag2a', 'wcag2aa', 'wcag21aa']
};
```

### Performance Thresholds

```typescript
const PERFORMANCE_THRESHOLDS = {
  componentRender: 100,      // Component render time (ms)
  themeSwitch: 300,          // Theme switch time (ms)
  animationFrame: 16.67,     // 60fps frame time (ms)
  memoryUsage: 50 * 1024 * 1024, // Memory limit (bytes)
  paintTime: 50,             // First paint time (ms)
  layoutTime: 30             // Layout calculation time (ms)
};
```

## Test Data Management

### Consistent Test Data

Use stable, predictable test data across all tests:

```typescript
const testData = {
  user: {
    name: "Test User",
    email: "test@example.com"
  },
  statCard: {
    title: "Total Revenue",
    value: "$12,345",
    change: { value: 12.5, type: 'increase', period: 'vs last month' }
  },
  appointment: {
    clientName: "John Doe",
    service: "Haircut",
    date: "2024-01-15T10:00:00Z",
    duration: 60
  }
};
```

### Test Selectors

Use consistent `data-testid` attributes:

```tsx
<Button 
  data-testid="button-primary-md"
  variant="primary" 
  size="md"
>
  Click me
</Button>
```

## Continuous Integration

### GitHub Actions Workflow

```yaml
name: Comprehensive Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:comprehensive:required
      
  visual-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:visual
```

### Quality Gates

Tests that must pass before deployment:
- ✅ All unit tests
- ✅ Visual regression tests
- ✅ Accessibility compliance
- ✅ Keyboard navigation
- ⚠️ Performance tests (warnings only)

## Troubleshooting

### Common Issues

#### Visual Test Failures

**Symptoms**: Screenshot differences detected
**Solutions**:
1. Review diff images in `test-results/`
2. Check if changes are intentional
3. Update baselines: `npm run test:visual:update`
4. Verify consistent test environment

#### Accessibility Failures

**Symptoms**: axe-core violations detected
**Solutions**:
1. Review violation details in test output
2. Fix ARIA attributes and semantic markup
3. Ensure proper color contrast
4. Add missing labels and descriptions

#### Performance Issues

**Symptoms**: Tests exceed performance thresholds
**Solutions**:
1. Profile component rendering
2. Optimize expensive operations
3. Check for memory leaks
4. Reduce animation complexity

#### Flaky Tests

**Symptoms**: Tests pass/fail inconsistently
**Solutions**:
1. Add proper waits for dynamic content
2. Use stable test data
3. Disable animations in tests
4. Ensure fonts are loaded

### Debugging Tools

```bash
# Visual test debugging
npm run test:visual:ui           # Interactive test runner
npm run test:visual:headed       # Run with browser visible

# Accessibility debugging
npm run test:accessibility -- --headed

# Performance profiling
npm run test:performance -- --trace on
```

## Reporting and Metrics

### Test Reports

After running comprehensive tests, reports are generated:

- **Markdown Report**: `test-results/comprehensive/test-report.md`
- **JSON Results**: `test-results/comprehensive/test-results.json`
- **HTML Reports**: `playwright-report/index.html`
- **Coverage Reports**: `coverage/index.html`

### Key Metrics

Track these metrics over time:

1. **Test Coverage**: Percentage of code covered by tests
2. **Pass Rate**: Percentage of tests passing
3. **Performance Trends**: Component render times over time
4. **Accessibility Score**: Number of violations found
5. **Visual Stability**: Frequency of visual regressions

### Dashboard Integration

Consider integrating with monitoring tools:

- **Lighthouse CI**: Automated performance monitoring
- **Chromatic**: Visual regression testing service
- **Sentry**: Error tracking and performance monitoring
- **GitHub Actions**: Automated test reporting

## Best Practices

### 1. Test-Driven Development

- Write tests before implementing features
- Use tests to define component behavior
- Maintain high test coverage

### 2. Consistent Testing

- Use stable test data
- Follow naming conventions
- Maintain test documentation

### 3. Performance Monitoring

- Set realistic performance budgets
- Monitor trends over time
- Optimize based on real usage

### 4. Accessibility First

- Test with screen readers
- Verify keyboard navigation
- Check color contrast regularly

### 5. Visual Consistency

- Update baselines intentionally
- Review visual changes carefully
- Test across all supported browsers

## Maintenance

### Regular Tasks

1. **Update Dependencies**: Keep testing tools up to date
2. **Review Thresholds**: Adjust performance thresholds as needed
3. **Baseline Management**: Update visual baselines for approved changes
4. **Test Coverage**: Maintain high coverage for new components
5. **Performance Monitoring**: Track performance trends

### Quarterly Reviews

- Analyze test metrics and trends
- Review and update testing strategies
- Evaluate new testing tools and techniques
- Update documentation and best practices

This comprehensive testing approach ensures our design system maintains the highest quality standards across all aspects of user experience, accessibility, and performance.
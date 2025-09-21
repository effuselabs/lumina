# Testing Commands Reference

> **Complete reference for all testing commands available in the Lumina project**

## 🎯 **Quick Start Commands**

### **Complete Test Suites**

```bash
# Run complete design system test suite (recommended)
npm run test:design-system

# Run only required tests (faster, for development)
npm run test:design-system:required

# Run all tests including legacy comprehensive suite
npm run test:all
```

### **Development Testing**

```bash
# Unit tests in watch mode
npm run test:watch

# Unit tests with coverage
npm run test:coverage

# Type checking
npm run type-check
```

## 📋 **Test Categories**

### **Unit Testing**

```bash
# Run all unit tests
npm run test
npm run test:unit

# Run unit tests in watch mode
npm run test:watch

# Run unit tests with coverage report
npm run test:coverage

# Run only unit tests (exclude integration)
npm run test:unit
```

### **Integration Testing**

```bash
# Run integration tests
npm run test:integration

# Run all tests (unit + integration)
npm run test:all
```

### **End-to-End Testing**

```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests with UI (interactive)
npm run test:e2e:ui

# Run E2E tests with browser visible
npm run test:e2e:headed

# Debug E2E tests
npm run test:e2e:debug
```

## 🎨 **Visual Regression Testing**

### **Setup and Baseline Management**

```bash
# Setup visual baselines (first time only)
npm run test:visual:setup

# Validate existing baselines
npm run test:visual:setup --validate

# Update baselines after approved visual changes
npm run test:visual:update
```

### **Running Visual Tests**

```bash
# Run all visual regression tests
npm run test:visual

# Run visual tests with interactive UI
npm run test:visual:ui

# Run visual tests with browser visible
npm run test:visual:headed

# Run specific visual test
npm run test:visual -- --grep "Button"
```

### **Visual Test Configuration**

```bash
# Run visual tests with specific config
npx playwright test --config=e2e/visual-test.config.ts

# Update specific component baselines
npm run test:visual:update -- --grep "Button"
```

## 🌐 **Cross-Browser Testing**

### **Complete Cross-Browser Suite**

```bash
# Run all cross-browser tests
npm run test:cross-browser

# Run cross-browser tests for specific browser
npm run test:cross-browser --browser chromium
npm run test:cross-browser --browser firefox
npm run test:cross-browser --browser webkit
```

### **Responsive Design Testing**

```bash
# Run only responsive design tests
npm run test:cross-browser --responsive-only

# Run performance tests across browsers
npm run test:cross-browser --performance-only
```

## ♿ **Accessibility Testing**

### **WCAG Compliance Testing**

```bash
# Run all accessibility tests (WCAG AA)
npm run test:accessibility

# Run accessibility tests with WCAG AAA compliance
npm run test:accessibility --wcag-level AAA

# Run specific accessibility test files
npx playwright test e2e/accessibility-compliance.spec.ts
```

### **Accessibility Test Categories**

```bash
# Run accessibility tests with browser visible (for debugging)
npx playwright test e2e/accessibility-compliance.spec.ts --headed

# Run specific accessibility test
npm run test:accessibility -- --grep "keyboard navigation"
```

## 🧪 **Comprehensive Testing**

### **Design System Testing**

```bash
# Run complete design system test suite
npm run test:design-system

# Run only required design system tests (faster)
npm run test:design-system:required

# Run with help to see all options
npm run test:design-system --help
```

### **Legacy Comprehensive Testing**

```bash
# Run comprehensive test suite (legacy)
npm run test:comprehensive

# Run with verbose output
npm run test:comprehensive:verbose

# Run only required tests
npm run test:comprehensive:required
```

## 🔧 **Development and Debugging**

### **Test Validation and Setup**

```bash
# Validate test setup and configuration
npm run test:validate-setup

# Validate test setup with verbose output
npm run test:validate-setup:verbose
```

### **Interactive Testing**

```bash
# Playwright UI mode for any test file
npx playwright test --ui

# Run specific test file with UI
npx playwright test e2e/design-system-visual-regression.spec.ts --ui

# Debug specific test
npx playwright test e2e/accessibility-compliance.spec.ts --debug
```

### **Test Reporting**

```bash
# Generate test reports (included in comprehensive tests)
# Reports are automatically generated in test-results/ directory

# View HTML reports
# Open playwright-report/index.html in browser after running tests
```

## 📊 **Test Configuration and Customization**

### **Environment Variables**

```bash
# Set base URL for tests
PLAYWRIGHT_BASE_URL=http://localhost:3001 npm run test:e2e

# Run tests in CI mode
CI=true npm run test:all
```

### **Custom Test Execution**

```bash
# Run tests with specific timeout
npx playwright test --timeout=60000

# Run tests with specific number of workers
npx playwright test --workers=1

# Run tests with trace enabled
npx playwright test --trace=on
```

## 🎯 **Test File Patterns**

### **Direct Playwright Commands**

```bash
# Run specific test files
npx playwright test e2e/design-system-visual-regression.spec.ts
npx playwright test e2e/cross-browser-responsive.spec.ts
npx playwright test e2e/accessibility-compliance.spec.ts

# Run tests matching pattern
npx playwright test --grep "visual regression"
npx playwright test --grep "accessibility"
npx playwright test --grep "responsive"
```

### **Jest Commands**

```bash
# Run specific Jest test files
npx jest __tests__/components/
npx jest __tests__/hooks/
npx jest __tests__/integration/

# Run Jest tests matching pattern
npx jest --testNamePattern="Button"
npx jest --testPathPattern="theme"
```

## 🚀 **CI/CD and Production**

### **Pre-commit Testing**

```bash
# Run essential tests before commit
npm run test:design-system:required

# Run type checking and linting
npm run type-check
npm run lint
```

### **Pre-deployment Testing**

```bash
# Run complete test suite before deployment
npm run test:design-system

# Validate all systems
npm run test:validate-setup
npm run test:comprehensive
```

## 📈 **Performance and Monitoring**

### **Performance Testing**

```bash
# Run performance tests
npm run test:cross-browser --performance-only

# Monitor test execution time
time npm run test:design-system
```

### **Coverage and Quality**

```bash
# Generate coverage reports
npm run test:coverage

# Check test quality metrics
# Reports available in test-results/ after running comprehensive tests
```

## 🛠 **Troubleshooting Commands**

### **Common Issues**

```bash
# Clear test cache and reinstall
rm -rf node_modules/.cache
npm ci

# Reinstall Playwright browsers
npx playwright install

# Clear test results
rm -rf test-results/
rm -rf playwright-report/
```

### **Debug Commands**

```bash
# Run tests with maximum verbosity
DEBUG=pw:* npm run test:e2e

# Run single test with debug output
npx playwright test e2e/design-system-visual-regression.spec.ts --debug --headed

# Check Playwright installation
npx playwright --version
npx playwright install --dry-run
```

## 📋 **Command Summary by Use Case**

### **Daily Development**

```bash
npm run test:watch                    # Unit tests during development
npm run test:visual -- --grep "Button"  # Test specific component visually
npm run type-check                    # Verify TypeScript
```

### **Feature Development**

```bash
npm run test:design-system:required   # Quick validation
npm run test:visual:update           # Update baselines after changes
npm run test:accessibility           # Ensure accessibility compliance
```

### **Pre-commit**

```bash
npm run test:design-system:required   # Essential tests
npm run lint                         # Code quality
npm run type-check                   # Type safety
```

### **Pre-deployment**

```bash
npm run test:design-system           # Complete design system validation
npm run test:comprehensive           # Full test suite
npm run test:validate-setup          # System validation
```

### **Debugging Issues**

```bash
npm run test:visual:ui               # Interactive visual debugging
npm run test:e2e:debug              # E2E test debugging
npm run test:accessibility --headed  # Accessibility debugging
```

---

**Last Updated**: December 2024  
**Testing Framework**: Jest + Playwright + axe-core  
**Total Commands**: 50+ testing commands available
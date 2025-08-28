# Testing Guide

This document outlines the testing strategy and practices for the Lumina application.

## Overview

Lumina uses a comprehensive testing approach with multiple layers:

1. **Unit Tests** - Individual component and function testing
2. **Integration Tests** - API routes and component integration testing
3. **End-to-End Tests** - Full user journey testing
4. **Visual Regression Tests** - UI consistency testing (future)

## Testing Stack

### Unit & Integration Testing
- **Jest** - Test runner and assertion library
- **React Testing Library** - Component testing utilities
- **Testing Library User Event** - User interaction simulation
- **Custom Test Utils** - Lumina-specific testing helpers

### End-to-End Testing
- **Playwright** - Cross-browser E2E testing
- **Multiple Browsers** - Chrome, Firefox, Safari, Edge
- **Mobile Testing** - iOS Safari, Android Chrome

### Test Databases
- **Unit Tests** - Mocked Prisma client
- **Integration Tests** - Test database (when needed)
- **E2E Tests** - Isolated test environment

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run only unit tests (exclude E2E)
npm run test:unit
```

### Integration Tests

```bash
# Run integration tests
npm run test:integration
```

### End-to-End Tests

```bash
# Run E2E tests (headless)
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in headed mode
npm run test:e2e:headed

# Debug E2E tests
npm run test:e2e:debug
```

### All Tests

```bash
# Run all tests (unit + E2E)
npm run test:all
```

## Test Structure

### Directory Structure

```
__tests__/
├── components/
│   └── ui/
│       ├── button.test.tsx
│       └── input.test.tsx
├── api/
│   └── health.test.ts
└── lib/
    └── utils.test.ts

e2e/
├── global-setup.ts
├── global-teardown.ts
├── homepage.spec.ts
├── design-system.spec.ts
└── health-check.spec.ts

test-utils/
├── index.ts
├── env-setup.js
├── global-setup.js
└── global-teardown.js

factories/
└── index.ts
```

### Naming Conventions

- **Unit Tests**: `*.test.{ts,tsx}`
- **Integration Tests**: `*.integration.test.{ts,tsx}`
- **E2E Tests**: `*.spec.ts`

## Writing Tests

### Unit Tests

```typescript
import { render, screen } from '@/test-utils';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
```

### Integration Tests

```typescript
import { GET } from '@/app/api/health/route';

describe('/api/health', () => {
  it('returns healthy status', async () => {
    const response = await GET();
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
  });
});
```

### E2E Tests

```typescript
import { test, expect } from '@playwright/test';

test('homepage loads correctly', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Lumina/);
});
```

## Test Utilities

### Custom Render

The `@/test-utils` module provides a custom render function with providers:

```typescript
import { render, screen } from '@/test-utils';

// Renders with SessionProvider and QueryClient
render(<MyComponent />);

// With custom session
render(<MyComponent />, { 
  session: mockSession 
});
```

### Mock Helpers

```typescript
import { mockFetch, mockApiResponse } from '@/test-utils';

// Mock API responses
mockFetch({ data: 'test' }, 200);

// Mock Prisma client
const mockPrisma = createMockPrismaClient();
```

### Factory Functions

```typescript
import { createUser, createBusiness } from '@/factories';

const user = createUser({ name: 'Test User' });
const business = createBusiness({ name: 'Test Salon' });
```

## Best Practices

### General

1. **Test Behavior, Not Implementation** - Focus on what the user sees and does
2. **Use Descriptive Test Names** - Clearly describe what is being tested
3. **Arrange, Act, Assert** - Structure tests clearly
4. **One Assertion Per Test** - Keep tests focused and specific

### Component Testing

1. **Test User Interactions** - Click, type, navigate
2. **Test Different States** - Loading, error, success
3. **Test Accessibility** - Screen readers, keyboard navigation
4. **Test Responsive Behavior** - Different screen sizes

### API Testing

1. **Test Happy Path** - Normal successful operations
2. **Test Error Cases** - Invalid input, server errors
3. **Test Edge Cases** - Boundary conditions
4. **Test Authentication** - Authorized and unauthorized access

### E2E Testing

1. **Test Critical User Journeys** - Registration, booking, payment
2. **Test Cross-Browser Compatibility** - Chrome, Firefox, Safari
3. **Test Mobile Experience** - Touch interactions, responsive design
4. **Test Performance** - Page load times, interactions

## Coverage Requirements

### Minimum Coverage Thresholds

- **Global**: 70% (branches, functions, lines, statements)
- **Critical Libraries** (`/lib`): 80%
- **UI Components** (`/components/ui`): 75%

### Coverage Reports

Coverage reports are generated in the `coverage/` directory:

- **HTML Report**: `coverage/lcov-report/index.html`
- **JSON Summary**: `coverage/coverage-summary.json`
- **LCOV**: `coverage/lcov.info`

## Continuous Integration

### GitHub Actions

Tests run automatically on:

- **Pull Requests** - All tests must pass
- **Main Branch** - Full test suite including E2E
- **Nightly** - Extended test suite with performance tests

### Test Environment

- **Node.js**: Latest LTS version
- **Database**: PostgreSQL test instance
- **Browsers**: Latest stable versions

## Debugging Tests

### Unit Tests

```bash
# Run specific test file
npm test -- button.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="renders correctly"

# Debug with Node.js debugger
node --inspect-brk node_modules/.bin/jest --runInBand
```

### E2E Tests

```bash
# Run specific test file
npx playwright test homepage.spec.ts

# Run with browser visible
npx playwright test --headed

# Debug mode with browser dev tools
npx playwright test --debug

# Generate test code
npx playwright codegen localhost:3000
```

## Common Issues

### Jest Issues

1. **Module Resolution** - Check `moduleNameMapper` in `jest.config.js`
2. **Async Tests** - Use `await` with async operations
3. **Mock Issues** - Clear mocks between tests with `jest.clearAllMocks()`

### Playwright Issues

1. **Timeouts** - Increase timeout for slow operations
2. **Element Not Found** - Use proper waiting strategies
3. **Flaky Tests** - Add proper wait conditions

### React Testing Library

1. **Query Selection** - Use semantic queries (getByRole, getByLabelText)
2. **Async Operations** - Use `waitFor` for async state changes
3. **User Events** - Use `@testing-library/user-event` for interactions

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
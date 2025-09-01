# Testing Documentation

This directory contains all testing-related documentation for the Lumina project.

## 🚀 Quick Start

### Running Tests

```bash
# Run all unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run all tests
npm run test:all
```

### Test Environment Setup
```bash
# Install dependencies
npm install

# Set up test database
npm run db:migrate
npm run db:seed

# Start development server for E2E tests
npm run dev
```

## 📋 Testing Strategy

### Testing Pyramid
- **Unit Tests** - Individual component and function testing (Jest + React Testing Library)
- **Integration Tests** - Feature interaction testing (API + Database)
- **E2E Tests** - Complete user workflow testing (Playwright)
- **API Tests** - Endpoint validation and security testing (Supertest)

### Testing Stack
- **Jest** - Test runner and assertion library
- **React Testing Library** - Component testing utilities
- **Playwright** - Cross-browser E2E testing
- **Supertest** - API testing
- **MSW** - API mocking

## 📁 Documentation Files

### Core Testing Plans
- [**TESTING_STRATEGY.md**](./TESTING_STRATEGY.md) - Comprehensive testing checklist for all features
- **This README** - Testing overview, quick start, and guidelines

### Feature-Specific Testing
- [Authentication Testing](../features/authentication/) - Auth flow testing
- [Booking System Testing](../features/booking-system/) - Booking engine testing
- [CRM Testing](../features/crm-staff-management/) - Staff and client management testing

## 📂 Test Structure

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

## ✍️ Writing Tests

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

## 🛠️ Test Utilities

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

## 📊 Coverage Requirements

### Minimum Coverage Thresholds

- **Global**: 70% (branches, functions, lines, statements)
- **Critical Libraries** (`/lib`): 80%
- **UI Components** (`/components/ui`): 75%

### Coverage Reports

Coverage reports are generated in the `coverage/` directory:

- **HTML Report**: `coverage/lcov-report/index.html`
- **JSON Summary**: `coverage/coverage-summary.json`
- **LCOV**: `coverage/lcov.info`

## 🚀 Continuous Integration

### GitHub Actions

Tests run automatically on:

- **Pull Requests** - All tests must pass
- **Main Branch** - Full test suite including E2E
- **Nightly** - Extended test suite with performance tests

### Test Environment

- **Node.js**: Latest LTS version
- **Database**: PostgreSQL test instance
- **Browsers**: Latest stable versions

## 🐛 Debugging Tests

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

## 🎯 Best Practices

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

## 🔗 Related Resources

- [Development Setup](../DEVELOPMENT_SETUP.md) - Local development environment
- [Contributing Guidelines](../../CONTRIBUTING.md) - How to contribute
- [Feature Documentation](../features/) - Feature-specific testing guides
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)

## 🎯 Testing Priorities

### High Priority (Must Pass)
1. **Authentication & Session Management**
2. **Multi-tenant Data Isolation** 
3. **Core CRUD Operations** (Staff, Clients, Services)
4. **API Security & Validation**
5. **Business Data Scoping**

### Medium Priority (Should Pass)
1. **Advanced Search & Filtering**
2. **Staff Invitation System**
3. **Employment Calculations**
4. **Email Notifications**
5. **Dashboard Analytics**

### Low Priority (Nice to Have)
1. **UI/UX Interactions**
2. **Performance Optimizations**
3. **Accessibility Features**
4. **Mobile Responsiveness**

## 🧪 Testing Tools & Setup

### Testing Stack
- **Jest** - Unit testing framework
- **React Testing Library** - Component testing
- **Playwright** - E2E testing
- **Supertest** - API testing
- **MSW** - API mocking

### Test Environment Setup
```bash
# Install dependencies
npm install

# Run unit tests
npm run test

# Run E2E tests  
npm run test:e2e

# Run all tests
npm run test:all

# Generate coverage report
npm run test:coverage
```

## 📊 Test Coverage Goals

### Current Coverage Targets
- **Unit Tests**: 80%+ coverage
- **Integration Tests**: Core workflows covered
- **E2E Tests**: Critical user journeys
- **API Tests**: All endpoints validated

### Coverage Areas
- ✅ Authentication flows
- ✅ Staff management CRUD
- ✅ Client management CRUD  
- ✅ Service management CRUD
- ✅ Multi-tenant isolation
- 🚧 Booking system (in progress)
- 🚧 Payment processing (planned)

## 🔍 Testing Checklist

### Pre-Testing Setup
- [ ] Database seeded with test data
- [ ] Test user accounts created
- [ ] Environment variables configured
- [ ] Development server running

### Core Feature Testing
- [ ] Authentication & session management
- [ ] Dashboard functionality
- [ ] Staff management operations
- [ ] Client management operations
- [ ] Service management operations
- [ ] Multi-tenant data isolation

### Security Testing
- [ ] Business data scoping
- [ ] API endpoint protection
- [ ] Input validation
- [ ] Cross-tenant prevention

### Performance Testing
- [ ] Page load times
- [ ] Large dataset handling
- [ ] Search performance
- [ ] API response times

## 🐛 Bug Reporting

### Bug Report Template
```markdown
## Bug Description
Brief description of the issue

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- Browser: 
- OS:
- User Role:
- Business Context:

## Screenshots/Logs
Attach relevant screenshots or error logs
```

### Critical Bug Criteria
- Authentication failures
- Data leakage between businesses
- Payment processing errors
- Data loss or corruption
- Security vulnerabilities

## 📈 Testing Metrics

### Key Performance Indicators
- Test pass rate
- Code coverage percentage
- Bug discovery rate
- Time to fix critical issues
- User acceptance test results

### Reporting
- Daily test runs on CI/CD
- Weekly coverage reports
- Monthly testing retrospectives
- Release testing summaries

## 🚀 Continuous Integration

### Automated Testing
- **Pre-commit hooks** - Lint and basic tests
- **Pull request checks** - Full test suite
- **Deployment gates** - E2E tests must pass
- **Scheduled runs** - Nightly comprehensive testing

### Quality Gates
- All tests must pass before merge
- Coverage must not decrease
- No critical security issues
- Performance benchmarks met

## 📚 Testing Best Practices

### Writing Good Tests
1. **Clear test names** - Describe what is being tested
2. **Arrange-Act-Assert** - Structure tests clearly
3. **Test isolation** - Tests should not depend on each other
4. **Mock external dependencies** - Control test environment
5. **Test edge cases** - Include boundary conditions

### Maintaining Tests
1. **Keep tests up to date** with feature changes
2. **Remove obsolete tests** when features are removed
3. **Refactor tests** when code is refactored
4. **Document complex test scenarios**
5. **Regular test review** and cleanup

## 🔗 Related Resources

- [Development Setup](../DEVELOPMENT_SETUP.md) - Local development environment
- [Contributing Guidelines](../../CONTRIBUTING.md) - How to contribute
- [Code Standards](../code-standards/) - Coding conventions
- [Security Guidelines](../security/) - Security testing requirements
# Appointment Management Testing Documentation

## Overview

This document outlines the comprehensive testing strategy for the Dashboard Appointment Management system. The testing suite covers all aspects of the appointment management functionality, from unit tests to end-to-end scenarios.

## Test Structure

### Test Categories

1. **Unit Tests** - Individual component testing
2. **Integration Tests** - Workflow and system integration testing
3. **Performance Tests** - Calendar rendering and real-time update performance
4. **Accessibility Tests** - WCAG compliance and keyboard navigation
5. **End-to-End Tests** - Complete user scenarios
6. **Mobile Tests** - Touch interactions and responsive design

### Test Files Organization

```
__tests__/
├── components/appointments/
│   ├── appointment-dashboard.test.tsx
│   ├── calendar-view.test.tsx
│   └── appointment-modal.test.tsx
├── integration/
│   └── appointment-management-workflows.test.tsx
├── performance/
│   └── calendar-performance.test.ts
├── accessibility/
│   └── appointment-accessibility.test.tsx
├── setup/
│   └── appointment-test-setup.ts
└── mocks/
    └── server.ts

e2e/
├── appointment-management.spec.ts
└── mobile-appointment-management.spec.ts
```

## Running Tests

### Quick Start

```bash
# Run all appointment tests
npm run test:appointments

# Run specific test suite
npm run test:appointments:unit
npm run test:appointments:integration
npm run test:appointments:performance
npm run test:appointments:accessibility
npm run test:appointments:e2e
npm run test:appointments:mobile

# Development mode
npm run test:appointments:watch
npm run test:appointments:coverage
```

### Advanced Usage

```bash
# Run with specific options
npm run test:appointments -- --suite unit --verbose
npm run test:appointments -- --coverage --parallel
npm run test:appointments -- --bail --maxWorkers=4

# Run individual test files
npx jest __tests__/components/appointments/appointment-dashboard.test.tsx
npx playwright test e2e/appointment-management.spec.ts
```

## Test Coverage Requirements

### Unit Tests Coverage

- **Components**: 90%+ line coverage
- **Hooks**: 85%+ line coverage
- **Services**: 95%+ line coverage
- **Utilities**: 100% line coverage

### Integration Tests Coverage

- **Appointment Creation Workflow**: Complete flow from time slot selection to confirmation
- **Appointment Editing Workflow**: Full edit cycle with validation and conflict checking
- **Drag-and-Drop Rescheduling**: Touch and mouse interactions with conflict resolution
- **Search and Filter Operations**: All filter combinations and search scenarios
- **Real-time Updates**: Multi-user synchronization and conflict resolution
- **Bulk Operations**: Multi-appointment selection and batch operations

### Performance Tests Coverage

- **Calendar Rendering**: < 1 second for day view, < 1.5 seconds for month view
- **Search Response**: < 500ms for search results
- **Real-time Updates**: < 2 seconds for update propagation
- **Virtual Scrolling**: Smooth performance with 1000+ appointments
- **Memory Usage**: No memory leaks during frequent re-renders

### Accessibility Tests Coverage

- **WCAG 2.1 AA Compliance**: All components pass axe-core validation
- **Keyboard Navigation**: Full keyboard accessibility for all interactions
- **Screen Reader Support**: Proper ARIA labels and announcements
- **Focus Management**: Correct focus handling in modals and dynamic content
- **High Contrast Mode**: Visibility maintained in high contrast themes
- **Reduced Motion**: Animations respect user preferences

### End-to-End Tests Coverage

- **Complete Appointment Lifecycle**: Create, view, edit, reschedule, cancel
- **Multi-user Scenarios**: Real-time synchronization across sessions
- **Error Handling**: Network failures, server errors, validation failures
- **Browser Compatibility**: Chrome, Firefox, Safari, Edge
- **Responsive Design**: Desktop, tablet, mobile viewports

### Mobile Tests Coverage

- **Touch Interactions**: Tap, long press, swipe gestures
- **Responsive Layout**: Portrait and landscape orientations
- **Performance**: Smooth scrolling and interactions on mobile devices
- **Accessibility**: Voice control and screen reader support
- **Offline Functionality**: Cached data and queued operations

## Test Data Management

### Mock Data

The test suite uses comprehensive mock data that mirrors production scenarios:

```typescript
// Example mock appointment
const mockAppointment = {
  id: 'appointment-1',
  businessId: 'business-1',
  clientId: 'client-1',
  staffId: 'staff-1',
  startTime: new Date('2024-01-15T09:00:00'),
  endTime: new Date('2024-01-15T10:00:00'),
  status: 'confirmed',
  services: [
    {
      id: 'service-1',
      name: 'Haircut',
      price: 50,
      duration: 60,
    },
  ],
  client: {
    id: 'client-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
  },
  staff: {
    id: 'staff-1',
    firstName: 'Alice',
    lastName: 'Johnson',
    displayName: 'Alice Johnson',
    color: '#3B82F6',
  },
};
```

### API Mocking

MSW (Mock Service Worker) is used for API mocking:

- **Realistic Responses**: Mock responses match production API structure
- **Error Scenarios**: Network errors, server errors, validation failures
- **Performance Simulation**: Configurable response delays
- **Conflict Simulation**: Appointment scheduling conflicts

## Performance Benchmarks

### Target Performance Metrics

| Operation           | Target      | Measurement                        |
| ------------------- | ----------- | ---------------------------------- |
| Calendar Load       | < 1 second  | Time to first meaningful paint     |
| View Switching      | < 300ms     | Transition between day/week/month  |
| Search Results      | < 500ms     | Time from input to results display |
| Drag & Drop         | < 100ms     | Visual feedback delay              |
| Real-time Updates   | < 2 seconds | Update propagation time            |
| Mobile Interactions | 60 FPS      | Touch response and animations      |

### Performance Test Examples

```typescript
it('should render day view within performance target', async () => {
  const appointments = generateMockAppointments(50)

  const renderTime = await measureRenderTime(() => {
    renderWithProviders(
      <CalendarView
        view="day"
        appointments={appointments}
        // ... other props
      />
    )
  })

  expect(renderTime).toBeLessThan(500) // 500ms target
})
```

## Accessibility Testing

### WCAG 2.1 AA Compliance

All components are tested against WCAG 2.1 AA standards:

```typescript
it('should have no accessibility violations', async () => {
  const { container } = renderWithProviders(
    <AppointmentDashboard businessId="business-1" />
  )

  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

### Keyboard Navigation Testing

```typescript
it('should support arrow key navigation in calendar grid', () => {
  renderWithProviders(<CalendarView {...props} />)

  const firstAppointment = screen.getByTestId('appointment-block-1')
  firstAppointment.focus()

  fireEvent.keyDown(firstAppointment, { key: 'ArrowRight' })
  expect(screen.getByTestId('appointment-block-2')).toHaveFocus()
})
```

## Mobile Testing

### Device Coverage

Tests run on multiple device configurations:

- **iPhone 12/12 Pro**: iOS Safari simulation
- **Samsung Galaxy S21**: Android Chrome simulation
- **iPad/iPad Pro**: Tablet interface testing

### Touch Interaction Testing

```typescript
it('should support touch gestures for navigation', async ({ page }) => {
  const calendarView = page.locator('[data-testid="mobile-calendar-view"]');

  // Swipe left for next day
  await calendarView.hover();
  await page.mouse.down();
  await page.mouse.move(-100, 0);
  await page.mouse.up();

  // Verify date changed
  await expect(page.locator('[data-testid="current-date"]')).not.toContainText(
    '15'
  );
});
```

## Continuous Integration

### Test Pipeline

```yaml
# Example CI configuration
test-appointments:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
    - run: npm ci
    - run: npm run test:appointments:unit
    - run: npm run test:appointments:integration
    - run: npm run test:appointments:accessibility
    - run: npm run test:appointments:e2e
    - run: npm run test:appointments:mobile
```

### Quality Gates

- **Unit Tests**: Must pass with 90%+ coverage
- **Integration Tests**: All workflows must complete successfully
- **Performance Tests**: All benchmarks must meet targets
- **Accessibility Tests**: Zero WCAG violations
- **E2E Tests**: All user scenarios must pass
- **Mobile Tests**: All device configurations must pass

## Debugging Tests

### Common Issues and Solutions

#### Test Timeouts

```typescript
// Increase timeout for slow operations
it('should handle large dataset', async () => {
  // Test implementation
}, 30000); // 30 second timeout
```

#### Async Operations

```typescript
// Wait for async operations to complete
await waitFor(
  () => {
    expect(screen.getByText('Updated')).toBeInTheDocument();
  },
  { timeout: 5000 }
);
```

#### Mock Service Worker Issues

```typescript
// Reset handlers between tests
afterEach(() => {
  server.resetHandlers();
});
```

### Debug Mode

```bash
# Run tests in debug mode
npm run test:appointments:unit -- --verbose
npm run test:appointments:e2e -- --debug
```

## Test Maintenance

### Regular Updates

- **Mock Data**: Keep mock data synchronized with production schemas
- **API Contracts**: Update mock responses when APIs change
- **Performance Targets**: Adjust benchmarks based on user feedback
- **Device Coverage**: Add new devices as they become popular

### Test Review Process

1. **Code Review**: All test changes require peer review
2. **Performance Impact**: Monitor test execution time
3. **Coverage Analysis**: Regular coverage reports and gap analysis
4. **Accessibility Audit**: Quarterly accessibility compliance review

## Reporting

### Test Results

Test results are automatically generated and include:

- **Coverage Reports**: Line, branch, and function coverage
- **Performance Metrics**: Benchmark results and trends
- **Accessibility Reports**: WCAG compliance status
- **Visual Regression**: Screenshot comparisons
- **Mobile Compatibility**: Device-specific test results

### Metrics Dashboard

Key metrics tracked:

- Test execution time trends
- Coverage percentage over time
- Performance benchmark trends
- Accessibility violation counts
- Mobile test pass rates

## Best Practices

### Writing Tests

1. **Descriptive Names**: Test names should clearly describe the scenario
2. **Single Responsibility**: Each test should verify one specific behavior
3. **Arrange-Act-Assert**: Follow the AAA pattern for test structure
4. **Mock External Dependencies**: Isolate components under test
5. **Test User Behavior**: Focus on user interactions, not implementation details

### Test Data

1. **Realistic Data**: Use data that mirrors production scenarios
2. **Edge Cases**: Include boundary conditions and error states
3. **Consistent Fixtures**: Reuse test data across related tests
4. **Data Cleanup**: Clean up test data between tests

### Performance

1. **Parallel Execution**: Run tests in parallel when possible
2. **Selective Testing**: Run only relevant tests during development
3. **Resource Management**: Clean up resources after tests
4. **Efficient Mocking**: Use lightweight mocks for external services

This comprehensive testing strategy ensures the appointment management system is reliable, performant, accessible, and provides an excellent user experience across all devices and interaction methods.

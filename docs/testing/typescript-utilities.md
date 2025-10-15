# TypeScript Development Utilities

## Overview

This document describes the TypeScript development utilities created during the comprehensive TypeScript Type Safety Audit (LUM-118). These tools are designed to improve type safety, reduce errors, and speed up development.

## Test Utilities

### Mock Helpers (`__tests__/utils/prisma-mock-helpers.ts`)

**Purpose**: Provides type-safe utilities for mocking Prisma client methods in tests.

**Key Functions**:

```typescript
// Basic mock casting
asMock(mockPrisma.user.findMany).mockResolvedValue([user1, user2])

// One-time mocks
mockFindManyOnce(mockPrisma.user.findMany, [user1, user2])
mockFindUniqueOnce(mockPrisma.user.findUnique, user1)
mockCreateOnce(mockPrisma.user.create, newUser)

// Service method mocking
mockServiceMethod(mockService, 'methodName', returnValue)
mockServiceMethodOnce(mockService, 'methodName', returnValue)

// Add missing methods to mocks
addMockMethod(mockObject, 'methodName', returnValue)
```

**Usage Example**:
```typescript
import { asMock, mockFindManyOnce } from '@/__tests__/utils/prisma-mock-helpers'

// In your test
mockFindManyOnce(mockPrisma.appointment.findMany, [
  createTestAppointment({ status: 'CONFIRMED' })
])
```

### Test Data Factories (`__tests__/utils/test-data-factories.ts`)

**Purpose**: Provides factory functions to create properly typed test data objects with all required properties.

**Available Factories**:

```typescript
// Core entities
createTestUser(overrides?)
createTestBusiness(overrides?)
createTestClient(overrides?)
createTestStaff(overrides?)
createTestService(overrides?)

// Appointments
createTestAppointment(overrides?)
createTestAppointmentService(overrides?)

// Scheduling
createTestBusinessHours(overrides?)
createTestStaffAvailability(overrides?)
createTestTimeOffRequest(overrides?)

// Other
createTestTransaction(overrides?)
createTestSession(overrides?)

// Bulk creation
createTestAppointments(count, overrides?)
createTestClients(count, overrides?)
```

**Usage Example**:
```typescript
import { createTestAppointment, createTestClient } from '@/__tests__/utils/test-data-factories'

// Create test data with defaults
const appointment = createTestAppointment()

// Create with custom properties
const confirmedAppointment = createTestAppointment({
  status: 'CONFIRMED',
  startTime: new Date('2025-10-15T10:00:00Z')
})

// Create related data
const client = createTestClient({ email: 'test@example.com' })
const appointmentWithClient = createTestAppointment({ 
  clientId: client.id,
  client 
})
```

## Automation Scripts

### Mock Type Fixer (`scripts/fix-mock-types.ts`)

**Purpose**: Automatically fixes mock typing issues in test files.

**What it fixes**:
- `mockPrisma.method.mockResolvedValue()` → `asMock(mockPrisma.method).mockResolvedValue()`
- Adds proper type casting for Prisma mock methods

**Usage**:
```bash
npx ts-node scripts/fix-mock-types.ts
```

**Results**: Fixed 684 errors across 36 test files during LUM-118.

### Test Type Fixer (`scripts/fix-test-types.ts`)

**Purpose**: Automatically fixes implicit any types in test callback parameters.

**What it fixes**:
- `(callback) =>` → `(callback: any) =>`
- `(error) =>` → `(error: any) =>`
- `(key) =>` → `(key: any) =>`
- `(apt) =>` → `(apt: any) =>`
- `(staff) =>` → `(staff: any) =>`
- `(service) =>` → `(service: any) =>`
- `(client) =>` → `(client: any) =>`

**Usage**:
```bash
npx ts-node scripts/fix-test-types.ts
```

**Results**: Fixed 72 errors across 11 test files during LUM-118.

### Error Analyzer (`scripts/analyze-test-errors.ts`)

**Purpose**: Analyzes and categorizes TypeScript errors for strategic fixing.

**Features**:
- Groups errors by file and error code
- Identifies common patterns
- Shows top files with most errors
- Generates detailed JSON report

**Usage**:
```bash
npx ts-node scripts/analyze-test-errors.ts
```

**Output**: Creates `typescript-error-analysis.json` with detailed breakdown.

## Best Practices

### Using Mock Helpers

1. **Always use `asMock()` for direct mock access**:
   ```typescript
   // Good
   asMock(mockPrisma.user.findMany).mockResolvedValue(users)
   
   // Avoid
   (mockPrisma.user.findMany as jest.Mock).mockResolvedValue(users)
   ```

2. **Use one-time mocks for specific test cases**:
   ```typescript
   // For single test expectation
   mockFindUniqueOnce(mockPrisma.user.findUnique, testUser)
   
   // For multiple tests
   asMock(mockPrisma.user.findUnique).mockResolvedValue(testUser)
   ```

3. **Add missing methods dynamically**:
   ```typescript
   // When mock doesn't have expected method
   addMockMethod(mockCalendarService, 'checkAvailability', true)
   ```

### Using Test Data Factories

1. **Use factories instead of manual objects**:
   ```typescript
   // Good
   const appointment = createTestAppointment({ status: 'CONFIRMED' })
   
   // Avoid
   const appointment = {
     id: 'test-id',
     status: 'CONFIRMED',
     // ... missing 20+ required properties
   }
   ```

2. **Create related data consistently**:
   ```typescript
   const client = createTestClient()
   const staff = createTestStaff()
   const appointment = createTestAppointment({
     clientId: client.id,
     staffId: staff.id,
     client,
     staff
   })
   ```

3. **Use bulk creation for lists**:
   ```typescript
   const appointments = createTestAppointments(5, { status: 'SCHEDULED' })
   ```

### Running Fix Scripts

1. **Run scripts incrementally**:
   ```bash
   # Fix one type of error at a time
   npx ts-node scripts/fix-test-types.ts
   npm run type-check  # Validate
   
   npx ts-node scripts/fix-mock-types.ts
   npm run type-check  # Validate
   ```

2. **Commit after each script**:
   ```bash
   git add -A
   git commit -m "fix: apply automated test type fixes"
   ```

3. **Analyze before fixing**:
   ```bash
   npx ts-node scripts/analyze-test-errors.ts
   # Review typescript-error-analysis.json
   # Plan fixing strategy
   ```

## Integration with Development Workflow

### New Test Files

1. **Start with factories**:
   ```typescript
   import { createTestAppointment, createTestClient } from '@/__tests__/utils/test-data-factories'
   import { asMock } from '@/__tests__/utils/prisma-mock-helpers'
   ```

2. **Use proper mock patterns**:
   ```typescript
   beforeEach(() => {
     asMock(mockPrisma.appointment.findMany).mockResolvedValue([
       createTestAppointment({ status: 'SCHEDULED' })
     ])
   })
   ```

### Fixing Existing Tests

1. **Apply automated fixes first**:
   ```bash
   npx ts-node scripts/fix-test-types.ts
   npx ts-node scripts/fix-mock-types.ts
   ```

2. **Replace manual test data**:
   ```typescript
   // Replace manual objects with factories
   const appointment = createTestAppointment(existingOverrides)
   ```

3. **Fix remaining issues manually**:
   - Use `addMockMethod()` for missing methods
   - Add type assertions where needed
   - Update component prop interfaces

## Maintenance

### Updating Factories

When Prisma schema changes:

1. Update factory functions in `test-data-factories.ts`
2. Add new required properties with sensible defaults
3. Update existing tests that use the factories
4. Run tests to validate changes

### Extending Mock Helpers

When new mock patterns emerge:

1. Add new helper functions to `prisma-mock-helpers.ts`
2. Update this documentation
3. Consider adding to fix scripts if pattern is common

### Script Maintenance

When new error patterns appear:

1. Update fix scripts with new patterns
2. Test on sample files before running on entire codebase
3. Update error analyzer to recognize new patterns

## Related Documentation

- [TypeScript Audit Final Status](../.kiro/specs/typescript-type-safety-audit/final-status.md)
- [Testing Best Practices](./testing-best-practices.md)
- [Coding Standards](../.kiro/steering/coding-approach-and-standards.md)

## Linear Issues

- [LUM-118](https://linear.app/scootr-ca/issue/LUM-118) - Comprehensive TypeScript Type Safety Audit and Cleanup
- [LUM-119](https://linear.app/scootr-ca/issue/LUM-119) - Complete remaining lib TypeScript errors
- [LUM-120](https://linear.app/scootr-ca/issue/LUM-120) - Fix component TypeScript errors
- [LUM-121](https://linear.app/scootr-ca/issue/LUM-121) - Rebuild test suite with proper typing

## Support

For questions or issues with these utilities:

1. Check the error analysis report: `typescript-error-analysis.json`
2. Review the final status document for context
3. Refer to Linear issues for tracking and updates
4. Check commit history for examples of usage

---

**Created**: October 15, 2025  
**Last Updated**: October 15, 2025  
**Related Issues**: [LUM-118](https://linear.app/scootr-ca/issue/LUM-118), [LUM-119](https://linear.app/scootr-ca/issue/LUM-119), [LUM-120](https://linear.app/scootr-ca/issue/LUM-120), [LUM-121](https://linear.app/scootr-ca/issue/LUM-121)

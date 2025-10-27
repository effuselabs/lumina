# Common Error Patterns and Solutions

## Overview

This document catalogs common TypeScript error patterns found in the test suite and their proven solutions.

## Pattern 1: Implicit Any in Callbacks

### Error Example
```typescript
// TS7006: Parameter 'slot' implicitly has an 'any' type
slots.every(slot => slot.isAvailable)
```

### Solution
```typescript
// Add type annotation
slots.every((slot: any) => slot.isAvailable)
```

### Batch Fix Command
```powershell
(Get-Content "file.test.ts" -Raw) -replace '\.every\(([a-z]+) =>', '.every(($1: any) =>' | Set-Content "file.test.ts" -NoNewline
```

### Applicable To
- `.forEach()`, `.map()`, `.filter()`, `.every()`, `.some()`, `.find()`
- Arrow function parameters in callbacks

---

## Pattern 2: Missing Type Imports

### Error Example
```typescript
// TS2304: Cannot find name 'DayOfWeek'
const day: DayOfWeek = DayOfWeek.MONDAY
```

### Solution
```typescript
// Add import from Prisma client
import { DayOfWeek } from '@prisma/client'
```

### Common Missing Imports
- `DayOfWeek` from `@prisma/client`
- `AppointmentStatus` from `@prisma/client`
- `UserRole` from `@prisma/client`
- Test utilities from `@/__tests__/utils/`

---

## Pattern 3: Staff Object Property Names

### Error Example
```typescript
// TS2353: 'name' does not exist in type 'Staff'
const mockStaff: Partial<Staff> = {
    id: 'staff-123',
    name: 'John Doe'  // Wrong property
}
```

### Solution
```typescript
// Use 'displayName' for Staff objects
const mockStaff = createTestStaff({
    id: 'staff-123',
    displayName: 'John Doe'
})
```

### Batch Fix Command
```powershell
(Get-Content "file.test.ts" -Raw) -replace '(\s+)name: ''([^'']+)'',', '$1displayName: ''$2'',' | Set-Content "file.test.ts" -NoNewline
```

---

## Pattern 4: Service Object Property Names

### Error Example
```typescript
// TS2353: 'displayName' does not exist in type 'Service'
const mockService: Partial<Service> = {
    id: 'service-123',
    displayName: 'Haircut'  // Wrong property
}
```

### Solution
```typescript
// Use 'name' for Service objects
const mockService = createTestService({
    id: 'service-123',
    name: 'Haircut'
})
```

---

## Pattern 5: Type Conversion for Partial Objects

### Error Example
```typescript
// TS2352: Conversion of type 'Partial<Staff>' to type 'Staff' may be a mistake
asMock(mockPrisma.staff.findFirst).mockResolvedValue(mockStaff as Staff)
```

### Solution
```typescript
// Use 'as unknown as' for complex conversions
asMock(mockPrisma.staff.findFirst).mockResolvedValue(mockStaff as unknown as Staff)
```

### When to Use
- Converting Partial types to full types
- Converting test data to Prisma types
- Complex type conversions where direct casting fails

---

## Pattern 6: Missing Variable Declarations in Scope

### Error Example
```typescript
// TS2304: Cannot find name 'mockBusinessId'
describe('BookingErrorTracker', () => {
    let errorTracker: BookingErrorTracker;
    // mockBusinessId used but not declared
})
```

### Solution
```typescript
describe('BookingErrorTracker', () => {
    let errorTracker: BookingErrorTracker;
    const mockBusinessId = 'test-business-id';  // Add declaration
})
```

---

## Pattern 7: Prisma Mock Method Typing

### Error Example
```typescript
// TS2339: Property 'mockResolvedValueOnce' does not exist
mockPrisma.staffAvailability.create.mockResolvedValueOnce(data)
```

### Solution
```typescript
// Cast to jest.Mock first
asMock(mockPrisma.staffAvailability.create).mockResolvedValueOnce(data)
```

### Alternative
```typescript
// Use mock helper
import { mockCreate } from '@/__tests__/utils/prisma-mock-helpers'
mockCreate(mockPrisma.staffAvailability.create, data)
```

---

## Pattern 8: Test Data Factory Usage

### Error Example
```typescript
// TS2740: Type is missing properties
const appointment = {
    id: 'apt-123',
    businessId: 'biz-123'
    // Missing many required properties
}
```

### Solution
```typescript
// Use test data factory
import { createTestAppointment } from '@/__tests__/utils/test-data-factories'

const appointment = createTestAppointment({
    id: 'apt-123',
    businessId: 'biz-123'
})
```

### Available Factories
- `createTestUser()`
- `createTestBusiness()`
- `createTestClient()`
- `createTestStaff()`
- `createTestService()`
- `createTestAppointment()`
- `createTestSession()`
- And more...

---

## Pattern 9: Mock Instance Method Setup

### Error Example
```typescript
// TS2339: Property 'checkAvailability' does not exist on type 'MockedObject<CalendarIntegration>'
calendarIntegrationInstance.checkAvailability.mockResolvedValue(result)
```

### Solution
```typescript
// Add method to mock instance first
import { addMockMethod } from '@/__tests__/utils/prisma-mock-helpers'

calendarIntegrationInstance = {} as any
addMockMethod(calendarIntegrationInstance, 'checkAvailability')

// Then use it
asMock(calendarIntegrationInstance.checkAvailability).mockResolvedValue(result)
```

---

## Pattern 10: Array Type Conversions

### Error Example
```typescript
// TS2740: Type 'Partial<Staff>[]' is missing properties
const mockStaff: Staff[] = [{ id: 'staff-123', displayName: 'John' }]
```

### Solution
```typescript
// Cast array with 'as unknown as'
asMock(mockPrisma.staff.findMany).mockResolvedValue(mockStaff as unknown as Staff[])
```

---

## Quick Reference Table

| Error Code | Pattern | Solution | Batch Fixable |
|------------|---------|----------|---------------|
| TS7006 | Implicit any in callback | Add type annotation | ✅ Yes |
| TS2304 | Cannot find name | Add import or declaration | ⚠️ Partial |
| TS2353 | Unknown property | Fix property name | ✅ Yes |
| TS2352 | Type conversion | Use `as unknown as` | ⚠️ Partial |
| TS2339 | Property doesn't exist | Add mock method or cast | ❌ No |
| TS2740 | Missing properties | Use test factory | ❌ No |
| TS2322 | Type not assignable | Fix type or use factory | ⚠️ Partial |

## Batch Fix Strategies

### Strategy 1: Regex Replacements
Use PowerShell regex for systematic replacements:
```powershell
# Fix implicit any in callbacks
Get-ChildItem -Path "__tests__" -Filter "*.test.ts" -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $content = $content -replace '\.map\(([a-z]+) =>', '.map(($1: any) =>'
    Set-Content $_.FullName -Value $content -NoNewline
}
```

### Strategy 2: File-by-File
For complex errors, fix file-by-file:
1. Identify high-error files with `analyze-test-errors.ts`
2. Fix one file completely
3. Run type-check to verify
4. Commit with descriptive message

### Strategy 3: Category-Based
Fix all errors in one category:
1. Focus on one test category (e.g., repository tests)
2. Apply consistent patterns across all files
3. Validate entire category
4. Move to next category

## Best Practices

1. **Always use test data factories** for creating test objects
2. **Use mock helpers** for Prisma mock setup
3. **Add type annotations** instead of suppressing errors
4. **Cast with `as unknown as`** for complex type conversions
5. **Commit frequently** with descriptive messages
6. **Run type-check** after each batch of fixes
7. **Document new patterns** as they emerge

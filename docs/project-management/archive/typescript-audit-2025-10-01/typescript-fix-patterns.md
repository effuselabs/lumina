# TypeScript Fix Patterns - LUM-118

## Overview

This document provides standardized fix patterns for resolving TypeScript errors identified in the comprehensive audit. Each pattern includes the problem, solution, and validation steps.

## Pattern 1: Prisma Model Required Fields

### Problem
```typescript
// Error: Missing required properties from type 'StaffUncheckedCreateInput': firstName, lastName
data: {
  businessId: string;
  userId: string;
  displayName: string;
  // Missing firstName, lastName
}
```

### Solution
```typescript
// Add all required fields from Prisma schema
data: {
  businessId: string;
  userId: string;
  firstName: string,      // Required field
  lastName: string,       // Required field
  displayName: string;
}
```

### Validation
- Check Prisma schema for required fields
- Ensure factory data includes all required fields
- Test database operations work correctly

## Pattern 2: Service Constructor Parameter Fixes

### Problem
```typescript
// Error: Expected 2 arguments, but got 0
this.webSocketService = new WebSocketService()
this.realTimeSyncService = new RealTimeSyncService()
```

### Solution
```typescript
// Provide required constructor parameters
this.webSocketService = new WebSocketService(config, callbacks)
this.realTimeSyncService = new RealTimeSyncService(businessId, userId, callbacks)
```

### Validation
- Check service class constructor signatures
- Ensure all required parameters are provided
- Test service instantiation works correctly

## Pattern 3: Missing Type Exports

### Problem
```typescript
// Error: Module has no exported member 'AppointmentStatus'
import { AppointmentStatus } from '@/types/dashboard-appointments';
```

### Solution
```typescript
// In types/dashboard-appointments.ts
import { AppointmentStatus } from '@prisma/client';

// Re-export for components
export { AppointmentStatus };
```

### Validation
- Verify type is properly exported
- Test import works in consuming files
- Check no circular dependencies created

## Pattern 4: Interface Property Access Fixes

### Problem
```typescript
// Error: Property 'appointmentId' does not exist on type 'ConflictDetails'
appointmentId: conflict.details.appointmentId,
```

### Solution
```typescript
// Use correct nested property access
appointmentId: conflict.details.conflictingAppointment?.id,
```

### Validation
- Check interface definition matches usage
- Verify property access patterns are consistent
- Test runtime behavior works correctly

## Pattern 5: Service Method Existence Fixes

### Problem
```typescript
// Error: Property 'getAvailableSlots' does not exist on type 'AvailabilityCalculator'
const slots = await this.availabilityCalculator.getAvailableSlots(query);
```

### Solution
```typescript
// Use correct static method
const result = await AvailabilityCalculator.calculateAvailability(query);
const slots = result.slots;
```

### Validation
- Check service class method definitions
- Verify static vs instance method usage
- Test method calls work correctly

## Pattern 6: JSON Field Type Compatibility

### Problem
```typescript
// Error: Type 'WeeklySchedule' is not assignable to type 'InputJsonValue'
workingHours: profile.workingHours,
```

### Solution
```typescript
// Cast to proper JSON type or restructure data
workingHours: profile.workingHours as InputJsonValue,
// OR
workingHours: JSON.parse(JSON.stringify(profile.workingHours)),
```

### Validation
- Verify JSON serialization works correctly
- Test database storage and retrieval
- Ensure type safety is maintained

## Pattern 7: Optional Parameter Handling

### Problem
```typescript
// Error: Type 'string | undefined' is not assignable to type 'string'
staffId: conflictRequest.staffId,
```

### Solution
```typescript
// Handle optional parameters properly
if (!conflictRequest.staffId) {
  return NextResponse.json({ error: 'Staff ID required' }, { status: 400 });
}

// Now TypeScript knows staffId is defined
const result = await service.method({
  staffId: conflictRequest.staffId, // No longer undefined
});
```

### Validation
- Check parameter optionality in schemas
- Ensure proper validation before usage
- Test error handling for missing parameters

## Pattern 8: Array Type Filtering

### Problem
```typescript
// Error: Type '(TimeSlot | undefined)[]' is not assignable to parameter of type 'TimeSlot[]'
suggestions.filter(s => s.type === 'time_slot').map(s => s.data?.timeSlot).filter(Boolean)
```

### Solution
```typescript
// Use proper type guards
suggestions
  .filter(s => s.type === 'time_slot')
  .map(s => s.data?.timeSlot)
  .filter((slot): slot is TimeSlot => slot !== undefined)
```

### Validation
- Verify type guards work correctly
- Test array filtering produces expected types
- Ensure no runtime errors occur

## Pattern 9: Enum Value Validation

### Problem
```typescript
// Error: This comparison appears to be unintentional because the types have no overlap
if (promotion.discountType === 'PERCENTAGE') {
```

### Solution
```typescript
// Check enum definition and use correct values
if (promotion.discountType === 'SERVICE_DISCOUNT') {
  // Handle service discount
} else if (promotion.discountType === 'PERCENTAGE') {
  // This should match actual enum values
}
```

### Validation
- Check enum definitions in Prisma schema
- Verify enum values match usage
- Test enum comparisons work correctly

## Pattern 10: Import Path Resolution

### Problem
```typescript
// Error: Module has no exported member 'BusinessHoursRepository'
import { BusinessHoursRepository } from '../repositories/business-hours-repository-enhanced'
```

### Solution
```typescript
// Use correct export name or fix export
import { EnhancedBusinessHoursRepository as BusinessHoursRepository } from '../repositories/business-hours-repository-enhanced'
// OR fix the export in the source file
```

### Validation
- Check actual exports in target module
- Verify import paths are correct
- Test module resolution works

## Fix Application Workflow

### 1. Identify Error Category
- Run `npx tsx scripts/validate-typescript-health.ts validate`
- Categorize error using patterns above
- Select appropriate fix pattern

### 2. Apply Fix Pattern
- Follow the solution template
- Make minimal changes to fix the specific error
- Avoid over-engineering or unnecessary refactoring

### 3. Validate Fix
- Run type check: `npm run type-check`
- Test affected functionality
- Ensure no new errors introduced

### 4. Commit Incrementally
- Commit small batches of fixes (10-20 errors)
- Use descriptive commit messages
- Include error count reduction in commit message

### 5. Track Progress
- Run validation script after each batch
- Monitor error reduction progress
- Update documentation as needed

## Rollback Procedures

### If Fix Causes Regression
1. **Immediate Rollback**: `git revert <commit-hash>`
2. **Analyze Issue**: Understand what went wrong
3. **Adjust Pattern**: Update fix pattern if needed
4. **Reapply Fix**: Use corrected approach

### If Multiple Fixes Cause Issues
1. **Identify Last Good State**: Find working commit
2. **Reset to Good State**: `git reset --hard <good-commit>`
3. **Reapply Fixes Individually**: One pattern at a time
4. **Test Each Fix**: Validate before proceeding

## Success Metrics

### Per-Pattern Success
- [ ] Error count reduced for pattern category
- [ ] No new errors introduced
- [ ] Affected functionality still works
- [ ] Build health improves or maintains

### Overall Success
- [ ] Total error count decreasing
- [ ] Build success rate improving
- [ ] Critical files error count reducing
- [ ] Development velocity maintained

---

**Pattern Guide Version**: 1.0  
**Last Updated**: October 1, 2025  
**Related Issue**: [LUM-118](https://linear.app/scootr-ca/issue/LUM-118)
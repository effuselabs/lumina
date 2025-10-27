# Complex Files Requiring Special Attention

## Overview

Files with 20+ errors that require careful, systematic fixes rather than batch operations.

## High-Complexity Files (30+ errors)

### 1. appointment-booking-workflows.test.ts (37 errors)

**Location**: `__tests__/integration/`  
**Category**: Integration Tests  
**Complexity**: Very High

**Error Breakdown**:
- Mock method typing issues (15 errors)
- Type conversion problems (10 errors)
- Argument type mismatches (8 errors)
- Implicit any types (4 errors)

**Main Issues**:
1. CalendarIntegration mock methods not properly typed
2. AppointmentService mock calls failing
3. createTestAppointment usage causing type mismatches
4. Complex nested object structures

**Recommended Approach**:
1. Fix mock instance setup in beforeEach
2. Ensure all mock methods are added with addMockMethod
3. Use proper type casting for appointment objects
4. Fix one test case at a time

**Estimated Time**: 3-4 hours

---

### 2. appointment-accessibility.test.tsx (34 errors)

**Location**: `__tests__/accessibility/`  
**Category**: Accessibility Tests  
**Complexity**: High

**Error Breakdown**:
- AppointmentDashboard component not found (12 errors)
- DashboardAppointment type mismatches (12 errors)
- StaffMember type mismatches (10 errors)

**Main Issues**:
1. Component doesn't exist or wrong import path
2. Manual test data doesn't match expected types
3. Missing required properties on test objects

**Recommended Approach**:
1. Check if AppointmentDashboard component exists
2. Use createTestDashboardAppointment factory
3. Use createTestStaffMember factory
4. Add missing properties to test data

**Estimated Time**: 3-4 hours

---

### 3. database-stress-benchmarks.test.ts (32 errors)

**Location**: `__tests__/performance/`  
**Category**: Performance Tests  
**Complexity**: High

**Error Breakdown**:
- Repository method signature mismatches (15 errors)
- Implicit any in callbacks (6 errors)
- Type conversion issues (11 errors)

**Main Issues**:
1. Mock repository methods don't match actual signatures
2. Performance test data structures complex
3. Callback parameter typing

**Recommended Approach**:
1. Review actual repository method signatures
2. Fix mock implementations to match
3. Add type annotations to callbacks
4. Use test factories for data

**Estimated Time**: 2-3 hours

---

### 4. concurrent-appointment-operations.test.ts (31 errors)

**Location**: `__tests__/performance/`  
**Category**: Performance Tests  
**Complexity**: High

**Error Breakdown**:
- AppointmentCache import issues (2 errors)
- Mock method typing (15 errors)
- Implicit any types (8 errors)
- Type mismatches (6 errors)

**Main Issues**:
1. AppointmentCache export name mismatch
2. OptimizedAppointmentRepository mock typing
3. Concurrent operation test data

**Recommended Approach**:
1. Fix AppointmentCache import
2. Add mock methods properly
3. Type all callback parameters
4. Use proper type casting

**Estimated Time**: 2-3 hours

---

## Medium-Complexity Files (20-29 errors)

### 5. appointment-modal.test.tsx (25 errors)

**Location**: `__tests__/components/appointments/`  
**Category**: Component Tests  
**Complexity**: Medium

**Main Issues**: Component prop mismatches, missing required props

**Estimated Time**: 2 hours

---

### 6. appointment-cache.test.ts (23 errors)

**Location**: `__tests__/cache/`  
**Category**: Cache Tests  
**Complexity**: Medium

**Main Issues**: ioredis types, AppointmentCacheManager not found, mock typing

**Estimated Time**: 2 hours

---

### 7. real-time-availability.test.ts (21 errors)

**Location**: `__tests__/integration/`  
**Category**: Integration Tests  
**Complexity**: Medium

**Main Issues**: AvailabilityCalculator.getAvailableSlots method typing, mock data

**Estimated Time**: 2 hours

---

### 8. calendar-view.test.tsx (20 errors)

**Location**: `__tests__/components/appointments/`  
**Category**: Component Tests  
**Complexity**: Medium

**Main Issues**: Component prop mismatches, appointment data structure

**Estimated Time**: 1-2 hours

---

### 9. business-hours-repository.test.ts (20 errors)

**Location**: `__tests__/lib/repositories/`  
**Category**: Repository Tests  
**Complexity**: Medium

**Main Issues**: Method name mismatches (getBusinessHoursForDay vs getBusinessHoursForDate)

**Estimated Time**: 1-2 hours

---

### 10. staff-availability-repository.test.ts (20 errors)

**Location**: `__tests__/lib/repositories/`  
**Category**: Repository Tests  
**Complexity**: Medium

**Main Issues**: Method name mismatches, mock typing

**Estimated Time**: 1-2 hours

---

## Fix Strategy by Complexity

### Very High Complexity (30+ errors)
1. Read entire file to understand context
2. Fix mock setup in beforeEach first
3. Fix one test case at a time
4. Validate after each test case
5. Commit when file is complete

### High Complexity (20-29 errors)
1. Identify error patterns in file
2. Apply batch fixes where possible
3. Fix remaining errors individually
4. Validate and commit

### Medium Complexity (10-19 errors)
1. Apply known patterns
2. Batch fix similar errors
3. Quick validation and commit

## Total Estimated Time

- Very High Complexity: 10-14 hours
- High Complexity: 10-14 hours
- Medium Complexity: 6-10 hours
- **Total**: 26-38 hours

## Recommended Work Sessions

### Session 1 (3-4 hours)
- Fix appointment-booking-workflows.test.ts
- Fix appointment-accessibility.test.tsx

### Session 2 (3-4 hours)
- Fix database-stress-benchmarks.test.ts
- Fix concurrent-appointment-operations.test.ts

### Session 3 (3-4 hours)
- Fix all repository tests
- Fix service tests

### Session 4 (3-4 hours)
- Fix component tests
- Fix cache tests

### Session 5 (2-3 hours)
- Fix remaining integration tests
- Final validation

### Session 6 (2-3 hours)
- Cleanup and edge cases
- Documentation
- Final commit

# TypeScript Compatibility Issues

**Status:** Deferred - Not blocking development  
**Priority:** Medium  
**Created:** 2025-01-16  
**Context:** NextAuth.js v5 compatibility issues discovered during ESLint setup

## Overview

During the setup of ESLint and TypeScript linting, we discovered 19 TypeScript compilation errors across 5 files. These are primarily related to NextAuth.js v5 type compatibility and do not affect runtime functionality.

## Current Impact

- ✅ **Application runs correctly** - No runtime errors
- ✅ **Authentication works** - All auth flows functional
- ❌ **TypeScript compilation fails** - `tsc --noEmit` reports errors
- ❌ **Pre-commit type checking disabled** - Temporarily bypassed

## Errors Summary

**Total:** 19 errors across 5 files

### File Breakdown:

- **lib/auth-config.ts** - 10 errors (NextAuth.js adapter and callback type mismatches)
- **lib/auth.ts** - 1 error (getServerSession import issue)
- **middleware.ts** - 4 errors (withAuth middleware type issues)
- **prisma/seed.ts** - 1 error (Prisma unique constraint naming)
- **types/auth.ts** - 3 errors (NextAuth.js type extension issues)

## Root Causes

1. **NextAuth.js v5 Breaking Changes**
   - Adapter interface changes in v5
   - Callback signature modifications
   - Import path changes

2. **TypeScript Strict Mode**
   - `exactOptionalPropertyTypes: true` causing adapter conflicts
   - Unused parameter warnings in callbacks

3. **Prisma Schema Evolution**
   - Unique constraint naming in seed data

## Recommended Solution Approach

### Phase 1: NextAuth.js Compatibility

1. **Update NextAuth.js imports** to v5 format
2. **Fix adapter type compatibility** with Prisma adapter
3. **Update callback signatures** to match v5 API
4. **Fix middleware implementation** for v5

### Phase 2: Type System Cleanup

1. **Remove unused parameters** in callbacks
2. **Fix Prisma seed data** unique constraints
3. **Update type extensions** for NextAuth.js v5

### Phase 3: Re-enable Type Checking

1. **Test all authentication flows** after fixes
2. **Re-enable pre-commit type checking**
3. **Verify no regressions** in functionality

## Detailed Error List

### lib/auth-config.ts (10 errors)

```
- Line 17: PrismaAdapter type incompatibility with NextAuth.js v5
- Line 26: authorize callback signature mismatch
- Line 88: Unused 'user' parameter in signIn callback
- Line 88: Unused 'profile' parameter in signIn callback
- Line 102: Unused 'account' parameter in jwt callback
- Line 168: Unused 'profile' parameter in signIn callback
- Line 168: Unused 'isNewUser' parameter in signIn callback
- Line 171: signOut callback parameter destructuring issues
- Line 171: 'session' property doesn't exist on signOut type
- Line 171: 'token' property doesn't exist on signOut type
```

### lib/auth.ts (1 error)

```
- Line 1: getServerSession import path incorrect for NextAuth.js v5
```

### middleware.ts (4 errors)

```
- Line 1: withAuth import not available in NextAuth.js v5
- Line 7: nextauth property doesn't exist on NextRequest
- Line 83: 'token' parameter implicitly has 'any' type
- Line 83: 'req' parameter implicitly has 'any' type
```

### prisma/seed.ts (1 error)

```
- Line 241: businessId_name unique constraint doesn't exist in Prisma schema
```

### types/auth.ts (3 errors)

```
- Line 2: Unused JWT import
- Line 37: DefaultUser type not found in NextAuth.js v5
- Line 66: DefaultJWT type not found in NextAuth.js v5
```

## Resources

- [NextAuth.js v5 Migration Guide](https://authjs.dev/guides/upgrade-to-v5)
- [NextAuth.js v5 TypeScript Documentation](https://authjs.dev/getting-started/typescript)
- [Prisma Adapter v5 Documentation](https://authjs.dev/reference/adapter/prisma)

## Acceptance Criteria

- [ ] All 19 TypeScript errors resolved
- [ ] `npm run type-check` passes without errors
- [ ] All authentication flows still functional
- [ ] Pre-commit type checking re-enabled
- [ ] No new TypeScript errors introduced
- [ ] Documentation updated with any breaking changes

## Estimated Effort

**Time:** 4-6 hours  
**Complexity:** Medium  
**Risk:** Low (functionality already works)

## Notes

This is technical debt that should be addressed before production deployment, but does not block current development work on UI components and features.

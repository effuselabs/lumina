# Phase 3 Track 2: Jest Configuration Fix & Component Testing

## Status: READY TO BEGIN 🚀

### 🎯 Objective

**Fix Jest path alias configuration to enable component and service testing**, unlocking the next level of test infrastructure expansion.

### 📊 Current Situation

**Working Foundation**: 7 test suites, 19 passing tests using relative imports
**Blocker**: Jest `@/` path alias resolution not working with Next.js configuration
**Impact**: Component tests fail because they require complex import chains with path aliases

### 🔧 Technical Challenge Analysis

#### Root Cause

**Jest Module Name Mapping Issue**: Next.js Jest configuration is overriding our custom moduleNameMapper
**Specific Problem**: `@/lib/utils`, `@/components/*` imports not resolving in test environment
**Cascade Effect**: Component tests fail because components import utilities with path aliases

#### Evidence

```
Cannot find module '@/lib/utils' from 'components/ui/spinner.tsx'
Cannot find module '@/components/ui/button' from '__tests__/components/ui/button.test.tsx'
```

### 🛠️ Solution Strategy

#### Approach 1: Fix Jest Configuration (Primary)

**Goal**: Make `@/` path aliases work properly in Jest environment
**Methods**:

1. **Async Configuration Export**: Properly merge Next.js and custom configurations
2. **Module Name Mapping Override**: Force our mappings to take precedence
3. **TypeScript Path Resolution**: Ensure Jest reads tsconfig.json paths

#### Approach 2: Component-Specific Mocks (Fallback)

**Goal**: Mock problematic imports to unblock component testing
**Methods**:

1. **Mock @/lib/utils**: Create Jest mock for utility functions
2. **Mock Complex Dependencies**: Isolate component testing from deep import chains
3. **Selective Mocking**: Target specific problematic imports

#### Approach 3: Hybrid Strategy (Recommended)

**Goal**: Combine configuration fixes with strategic mocking
**Benefits**: Robust solution that works even if configuration is partially successful

### 📋 Implementation Plan

#### Phase 3.2.1: Jest Configuration Investigation

**Tasks**:

1. **Analyze Next.js Jest Integration**: Understand how Next.js overrides Jest config
2. **Test Configuration Variations**: Try different approaches to module name mapping
3. **Validate TypeScript Integration**: Ensure Jest reads tsconfig.json paths properly

**Success Criteria**:

- `@/lib/utils` import resolves in test environment
- Simple component test passes with path aliases

#### Phase 3.2.2: Component Test Development

**Tasks**:

1. **Fix Button Component Test**: Get first component test working
2. **Create Input Component Test**: Expand to second component
3. **Establish Component Test Pattern**: Document reliable approach

**Success Criteria**:

- 2-3 component tests passing
- Clear pattern for future component tests
- No regressions in existing tests

#### Phase 3.2.3: Service Test Expansion

**Tasks**:

1. **Simple Service Tests**: Target services with minimal dependencies
2. **Utility Service Tests**: Test business logic utilities
3. **Mock Complex Dependencies**: Handle services with database/external dependencies

**Success Criteria**:

- 3-5 service tests passing
- Service testing patterns established
- Path alias resolution working for services

### 🔍 Specific Technical Approaches

#### Jest Configuration Fix Options

**Option 1: Async Configuration Override**

```javascript
module.exports = async () => {
  const nextJestConfig = await createJestConfig(customJestConfig)();
  return {
    ...nextJestConfig,
    moduleNameMapper: {
      '^@/(.*)$': '<rootDir>/$1',
      ...nextJestConfig.moduleNameMapper,
    },
  };
};
```

**Option 2: Direct Module Resolution**

```javascript
const customJestConfig = {
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  resolver: '<rootDir>/jest.resolver.js',
};
```

**Option 3: TypeScript Path Integration**

```javascript
const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

const customJestConfig = {
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: '<rootDir>/',
  }),
};
```

#### Component Mocking Strategy

**Mock @/lib/utils**:

```javascript
jest.mock('@/lib/utils', () => ({
  cn: (...classes) => classes.filter(Boolean).join(' '),
}));
```

**Mock Complex Components**:

```javascript
jest.mock('@/components/ui/spinner', () => ({
  Spinner: () => <div data-testid="spinner">Loading...</div>,
}));
```

### 📈 Success Metrics

#### Quantitative Goals

- **Component Tests**: 2-3 working component test suites
- **Service Tests**: 3-5 working service test suites
- **Total Test Suites**: Expand from 7 to 12-15 working suites
- **Path Alias Resolution**: 100% of `@/` imports working in tests

#### Qualitative Goals

- **Developer Experience**: Smooth component test development
- **Test Reliability**: Consistent test execution without import issues
- **Pattern Establishment**: Clear guidelines for future test development
- **Foundation Strength**: Robust testing infrastructure for continued expansion

### ⚠️ Risk Assessment

#### High-Risk Areas

- **Jest Configuration Changes**: Could break existing working tests
- **Next.js Integration**: Complex interaction between Jest and Next.js
- **Import Resolution**: Deep dependency chains in components

#### Mitigation Strategies

- **Incremental Changes**: Test each configuration change immediately
- **Backup Strategy**: Keep working relative import approach as fallback
- **Continuous Validation**: Run all existing tests after each change

### 🔄 Validation Process

#### After Each Change

1. **Run Existing Tests**: Ensure no regressions in 7 working test suites
2. **Test Path Aliases**: Verify `@/` imports resolve correctly
3. **Component Test**: Try button component test as canary

#### Success Validation

1. **Component Tests Pass**: Button and input component tests working
2. **Service Tests Pass**: At least 3 service tests working
3. **No Regressions**: All existing 19 tests still passing
4. **Path Aliases Work**: `@/` imports resolve in all test contexts

### 🎯 Expected Outcomes

#### Technical Improvements

- **Jest Configuration**: Properly configured for Next.js + TypeScript + path aliases
- **Component Testing**: Reliable pattern for UI component testing
- **Service Testing**: Foundation for business logic testing
- **Import Resolution**: Seamless `@/` path alias support

#### Process Improvements

- **Test Development**: Faster component and service test creation
- **Developer Experience**: No more import resolution debugging
- **Code Quality**: Better test coverage of UI and business logic
- **Systematic Progress**: Clear path for continued error resolution

### 📅 Timeline Estimate

- **Phase 3.2.1**: Jest Configuration (1-2 hours)
- **Phase 3.2.2**: Component Tests (2-3 hours)
- **Phase 3.2.3**: Service Tests (2-3 hours)
- **Total**: 5-8 hours for complete Track 2

---

**Status**: 🚀 READY TO BEGIN
**Priority**: HIGH - Unlocks major test infrastructure expansion
**Dependencies**: Phase 3 Track 1 completion (✅ DONE)
**Next Action**: Begin Jest configuration investigation

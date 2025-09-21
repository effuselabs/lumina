# Factory Testing Strategy

## Overview

This document outlines the comprehensive testing strategy for the Lumina data factory system, ensuring reliable generation of realistic demo data for platform showcase and development.

## Testing Architecture

### Test Structure

```
prisma/factories/
├── base-factory.ts              # Core factory functionality
├── client-factory.ts            # Client data generation
├── staff-factory.ts             # Staff profile generation  
├── service-factory.ts           # Service menu generation
├── client-factory.test.ts       # 17 tests - Client generation validation
├── staff-factory.test.ts        # 15 tests - Staff profile validation
└── service-factory.test.ts      # 17 tests - Service menu validation
```

### Test Coverage Summary

- **Total Tests**: 49 comprehensive tests across all factory implementations
- **Coverage Areas**: Data generation, business logic, validation, performance
- **Test Types**: Unit tests, integration tests, validation tests
- **Status**: ✅ All tests passing with comprehensive validation

## Factory-Specific Testing

### ClientFactory Testing (17 Tests)

#### Data Generation Tests
- **Realistic Demographics**: Validates age ranges, gender distribution, location variety
- **Contact Information**: Ensures proper email, phone, and address generation
- **Client History**: Validates service preferences and loyalty data generation
- **Business Scoping**: Ensures proper businessId inclusion and multi-tenant compliance

#### Business Logic Tests
- **Demographic Distribution**: Validates weighted random selection for realistic patterns
- **Communication Preferences**: Tests email/SMS preference generation
- **Client Segmentation**: Validates loyalty tier assignment and history tracking
- **Data Integrity**: Ensures referential integrity and constraint compliance

#### Performance Tests
- **Batch Generation**: Validates efficient batch processing for large client datasets
- **Memory Management**: Ensures proper memory usage during generation
- **Concurrent Operations**: Tests concurrent client generation without conflicts

### StaffFactory Testing (15 Tests)

#### Employment Configuration Tests
- **Employment Types**: Validates commission, chair rental, and hybrid model configurations
- **Rate Calculations**: Tests commission rates, chair rental amounts, and base salary logic
- **Employment Transitions**: Validates proper handling of employment type changes
- **Validation Logic**: Ensures proper validation of employment configurations

#### Specialty Assignment Tests
- **Service Matching**: Validates proper assignment of services to staff specialties
- **Experience Levels**: Tests junior, senior, master level assignments
- **Professional Development**: Validates certification and training record generation
- **Schedule Generation**: Tests realistic working hours and availability patterns

#### Data Quality Tests
- **Realistic Profiles**: Ensures generated staff profiles are realistic and diverse
- **Business Logic**: Validates employment rules and specialty constraints
- **Multi-Tenant Security**: Ensures proper businessId scoping for all staff data

### ServiceFactory Testing (17 Tests)

#### Service Generation Tests
- **Category Coverage**: Validates generation across all 6 service categories
- **Service Definitions**: Tests proper service name, description, pricing, duration
- **Seasonal Services**: Validates time-based availability for seasonal offerings
- **Pricing Tiers**: Tests junior, senior, master pricing calculations

#### Package and Pricing Tests
- **Service Packages**: Validates bundled service offerings with proper discounts
- **Discount Calculations**: Tests percentage-based discount application
- **Pricing Logic**: Ensures realistic pricing rounded to nearest $5
- **Package Composition**: Validates proper service inclusion in packages

#### Business Logic Tests
- **Category Assignment**: Ensures services are properly categorized
- **Availability Logic**: Tests seasonal service activation/deactivation
- **Validation Rules**: Validates service data constraints and business rules
- **Integration**: Tests proper integration with staff service assignments

## Testing Utilities and Mocks

### Mock Configuration

```typescript
// Faker.js mocking for consistent test results
jest.mock('@faker-js/faker', () => ({
    faker: {
        helpers: {
            arrayElement: jest.fn((arr) => arr[0]),
        },
        number: {
            int: jest.fn(() => 50),
            float: jest.fn(() => 0.5),
        },
    },
}));
```

### PrismaClient Mocking

```typescript
// Mock PrismaClient for isolated unit testing
const mockPrisma = {
    client: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
    },
    staff: {
        create: jest.fn(),
        findMany: jest.fn(),
    },
    service: {
        create: jest.fn(),
        findMany: jest.fn(),
    },
} as unknown as PrismaClient;
```

## Test Execution

### Running Tests

```bash
# Run all factory tests
npm test -- prisma/factories/

# Run specific factory tests
npm test -- prisma/factories/client-factory.test.ts
npm test -- prisma/factories/staff-factory.test.ts  
npm test -- prisma/factories/service-factory.test.ts

# Run with coverage
npm test -- --coverage prisma/factories/
```

### Test Configuration

Tests are configured with:
- **Jest Configuration**: Proper TypeScript and ES module support
- **Mock Setup**: Faker.js and PrismaClient mocking for isolation
- **Timeout Settings**: Appropriate timeouts for database operations
- **Coverage Thresholds**: Quality gates for test coverage

## Data Quality Validation

### Business Logic Testing

#### Client Data Quality
- **Demographics**: Realistic age and gender distributions
- **Contact Information**: Valid email formats and phone numbers
- **Geographic Distribution**: Diverse locations with proper address formats
- **Preferences**: Realistic service preferences and communication settings

#### Staff Data Quality
- **Employment Configurations**: Valid commission rates, chair rental amounts
- **Specializations**: Proper matching of staff titles to service capabilities
- **Professional Development**: Realistic experience levels and certifications
- **Schedule Patterns**: Business-appropriate working hours and availability

#### Service Data Quality
- **Pricing Logic**: Realistic pricing with proper tier calculations
- **Category Distribution**: Appropriate service distribution across categories
- **Seasonal Availability**: Proper time-based service activation
- **Package Composition**: Logical service bundling with appropriate discounts

### Integration Testing

#### End-to-End Validation
- **Complete Seed Process**: Tests full seeding from start to finish
- **Relationship Integrity**: Validates proper foreign key relationships
- **Business Constraints**: Ensures all business rules are followed
- **Data Consistency**: Verifies consistent data across all entities

#### Performance Validation
- **Generation Speed**: Ensures acceptable performance for large datasets
- **Memory Usage**: Validates efficient memory management during generation
- **Concurrent Operations**: Tests safe concurrent data generation
- **Batch Processing**: Validates efficient batch operation performance

## Quality Assurance

### Test Quality Standards

- **Comprehensive Coverage**: All public methods and business logic tested
- **Realistic Scenarios**: Tests use realistic business scenarios and data
- **Edge Case Handling**: Tests cover edge cases and error conditions
- **Performance Validation**: Tests include performance and efficiency validation

### Continuous Integration

- **Automated Testing**: All tests run automatically on code changes
- **Quality Gates**: Tests must pass before code integration
- **Coverage Requirements**: Maintain high test coverage for factory code
- **Performance Monitoring**: Track test execution time and performance

## Future Testing Enhancements

### Planned Improvements

1. **Integration Tests**: End-to-end testing with real database operations
2. **Performance Benchmarks**: Establish performance baselines and monitoring
3. **Data Quality Metrics**: Automated validation of generated data quality
4. **Load Testing**: Validate factory performance under high load conditions

### Testing Tools Integration

- **Database Testing**: Integration with test database for realistic scenarios
- **Performance Monitoring**: Integration with performance monitoring tools
- **Quality Metrics**: Automated collection of data quality metrics
- **Reporting**: Comprehensive test reporting and analytics

## Best Practices

### Writing Factory Tests

1. **Mock External Dependencies**: Use mocks for database and external services
2. **Test Business Logic**: Focus on business rules and data validation
3. **Realistic Data**: Use realistic test data that matches production patterns
4. **Performance Awareness**: Include performance considerations in test design

### Maintaining Test Quality

1. **Regular Review**: Regularly review and update tests as factories evolve
2. **Documentation**: Keep test documentation current with implementation
3. **Refactoring**: Refactor tests to maintain clarity and efficiency
4. **Coverage Monitoring**: Monitor and maintain high test coverage

The factory testing strategy ensures reliable, high-quality data generation that supports comprehensive demonstration of Lumina platform capabilities while maintaining performance and security standards.
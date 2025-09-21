# Enhanced Seed Infrastructure

This directory contains the enhanced seed infrastructure for generating comprehensive demo data for the Lumina platform.

## 🏗️ Infrastructure Components

### Core Files

- **`types.ts`** - TypeScript interfaces and types for all factory components
- **`base-factory.ts`** - Abstract base class with common functionality for all data factories
- **`batch-processor.ts`** - Efficient batch processing utilities for database operations
- **`seed-config.ts`** - Configuration system with validation and environment-specific settings
- **`validators.ts`** - Business logic validators and constraint checkers
- **`index.ts`** - Main exports and initialization functions

### Key Features Implemented

#### ✅ 1. Data Factory Infrastructure
- **BaseFactory**: Abstract base class with common functionality
- **Faker.js Integration**: Realistic data generation for names, addresses, emails, phones
- **Business Context**: All factories are scoped to specific business instances
- **Validation**: Built-in data validation before entity creation

#### ✅ 2. Batch Processing System
- **BatchProcessor**: Efficient database operations with configurable batch sizes
- **Concurrency Control**: Configurable maximum concurrent operations
- **Progress Tracking**: Real-time progress reporting with callbacks
- **Memory Management**: Streaming data generation for large datasets
- **Error Handling**: Graceful error handling with rollback capabilities

#### ✅ 3. Configuration System
- **Default Configuration**: Comprehensive default settings for all data types
- **Environment Configs**: Specialized configurations for development, testing, and demo
- **Validation**: Configuration validation with detailed error reporting
- **Customization**: Easy customization of seed parameters

#### ✅ 4. Business Logic Validators
- **AvailabilityChecker**: Staff availability validation and slot finding
- **ScheduleValidator**: Appointment booking validation with business rules
- **DataIntegrityValidator**: Post-seed data integrity verification

#### ✅ 5. Faker.js Integration
- **Realistic Data**: Names, emails, phones, addresses using faker.js
- **Business Context**: Data generation respects business context and patterns
- **Weighted Random**: Support for weighted random selections
- **Date Generation**: Business hours aware date/time generation

## 📊 Configuration Overview

### Default Seed Configuration
- **Clients**: 50 diverse client profiles with demographics
- **Staff**: 8 staff members across different specialties
- **Services**: 30+ services across 6 categories with packages
- **Historical Data**: 6 months of appointment history
- **Financial Data**: Realistic payment method and transaction distributions

### Service Categories
1. **Hair** (12 services) - Cuts, colors, treatments
2. **Nails** (8 services) - Manicures, pedicures, nail art
3. **Skincare** (6 services) - Facials, peels, treatments
4. **Massage** (4 services) - Various massage types
5. **Lashes** (4 services) - Extensions, lifts, tints
6. **Brows** (4 services) - Shaping, tinting, microblading

### Staff Specialties
- Senior Hair Stylist (Commission 60%)
- Hair Colorist (Commission 55%)
- Nail Technician (Chair Rental $200)
- Esthetician (Commission 50%)
- Massage Therapist (Hybrid)
- Junior Stylist (Commission 45%)
- Lash Specialist (Chair Rental $180)
- Master Stylist (Commission 65%)

## 🚀 Usage

### Basic Initialization
```typescript
import { initializeSeedSystem, loadSeedConfig } from './factories';

const config = loadSeedConfig();
const seedSystem = await initializeSeedSystem(prisma, businessId);
```

### Batch Processing
```typescript
import { BatchProcessor } from './factories';

const batchProcessor = new BatchProcessor(prisma, {
  batchSize: 50,
  maxConcurrency: 5,
  progressCallback: (processed, total) => {
    console.log(`Progress: ${processed}/${total}`);
  }
});

const results = await batchProcessor.createInBatches('client', clientData);
```

### Validation
```typescript
import { AvailabilityChecker, ScheduleValidator } from './factories';

const availabilityChecker = new AvailabilityChecker(prisma, businessId);
const isAvailable = await availabilityChecker.checkStaffAvailability(
  staffId, 
  startTime, 
  endTime
);

const scheduleValidator = new ScheduleValidator(prisma, businessId);
const validation = await scheduleValidator.validateAppointment(appointmentData);
```

## 🧪 Testing

Run the infrastructure test to verify all components are working:

```bash
npx tsx prisma/factories/test-factories.ts
```

This test verifies:
- Configuration system
- Business context validation
- Seed system initialization
- Batch processing utilities
- Validator functionality
- Data integrity checks

## 📋 Requirements Satisfied

This implementation satisfies the following requirements from the spec:

### Requirement 10.1 - Enhanced Seed Infrastructure
✅ **Data factory interfaces and base classes** - Complete with BaseFactory and type definitions
✅ **Faker.js integration** - Fully integrated with realistic data generation
✅ **Batch processing utilities** - BatchProcessor with configurable options
✅ **Configuration system** - Comprehensive config with validation

### Requirement 10.3 - Customizable Seed Parameters
✅ **Environment-specific configurations** - Development, testing, demo configs
✅ **Validation system** - Configuration validation with detailed error reporting
✅ **Flexible parameters** - Easy customization of all seed parameters

## ✅ Implemented Factory Classes

The infrastructure now includes fully implemented factory classes:

1. ✅ **ClientFactory** - Generates diverse client profiles with demographics and history
2. ✅ **StaffFactory** - Creates staff with specialties, employment configurations, and schedules
3. ✅ **ServiceFactory** - Generates comprehensive service menus with packages and pricing tiers
4. 🔄 **AppointmentFactory** - Create historical appointment data (Next: Task 5)
5. 🔄 **TransactionFactory** - Generate financial transaction history (Next: Task 6)

### Factory Implementation Status

#### ✅ ClientFactory (Task 2 Complete)
- **Demographics**: Realistic age ranges, gender distribution, location variety
- **Client History**: Service preferences, loyalty data, communication preferences
- **Business Logic**: Proper multi-tenant scoping and validation
- **Test Coverage**: 17 comprehensive tests ensuring data quality

#### ✅ StaffFactory (Task 3 Complete)  
- **Employment Types**: Commission, chair rental, hybrid models with proper calculations
- **Specializations**: Hair stylists, colorists, nail technicians, estheticians, massage therapists
- **Professional Development**: Experience levels, certifications, training records
- **Test Coverage**: 15 tests validating employment configurations and specialties

#### ✅ ServiceFactory (Task 4 Complete)
- **Service Categories**: Hair (12), Nails (8), Skincare (6), Massage (4), Lashes (4), Brows (4)
- **Pricing Tiers**: Junior (85%), Senior (100%), Master (125%) with realistic pricing
- **Seasonal Services**: 6 time-based offerings with availability logic
- **Service Packages**: 5 bundled offerings with 8-15% discounts
- **Test Coverage**: 17 tests ensuring pricing logic and package calculations

Each factory extends the BaseFactory class and uses the batch processing and validation systems for optimal performance and data quality.

## 🎯 Performance Features

- **Batch Operations**: Process data in configurable batches (default 50 items)
- **Concurrency Control**: Limit concurrent operations (default 5)
- **Memory Management**: Streaming data generation for large datasets
- **Progress Tracking**: Real-time progress reporting
- **Error Recovery**: Graceful error handling with rollback capabilities
- **Data Integrity**: Post-processing validation and verification

## 🔧 Configuration Options

The system supports various configuration options:

- **Batch Size**: Number of items processed per batch
- **Concurrency**: Maximum concurrent database operations
- **Demographics**: Age ranges, gender distribution, location variety
- **Employment Types**: Commission rates, chair rental rates
- **Booking Patterns**: Peak hours, seasonal variations, status distributions
- **Payment Methods**: Cash, card, digital payment distributions

This enhanced infrastructure provides a solid foundation for generating comprehensive, realistic demo data that showcases all Lumina platform capabilities.
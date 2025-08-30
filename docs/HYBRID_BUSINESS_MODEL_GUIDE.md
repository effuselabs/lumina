# Hybrid Business Model Implementation Guide

## Overview

This guide provides comprehensive documentation for implementing and working with the hybrid employment model system in Lumina. The hybrid model supports commission-based, chair rental, and mixed employment arrangements for salon and barbershop staff.

## Table of Contents

1. [Business Model Types](#business-model-types)
2. [Database Architecture](#database-architecture)
3. [Financial Calculation Engine](#financial-calculation-engine)
4. [Implementation Examples](#implementation-examples)
5. [API Integration](#api-integration)
6. [UI Components](#ui-components)
7. [Testing and Validation](#testing-and-validation)
8. [Performance Monitoring](#performance-monitoring)

## Business Model Types

### 1. Commission-Based Employment

**Description**: Staff earn a percentage of revenue from services they perform.

**Key Features**:
- Base salary (optional)
- Commission percentage (e.g., 50% of service revenue)
- Tiered commission rates based on performance
- Minimum guaranteed earnings

**Use Cases**:
- Traditional salon employment
- Performance-based compensation
- New staff with guaranteed minimum

**Configuration Example**:
```typescript
const commissionConfig: CommissionEmploymentConfig = {
  type: 'COMMISSION',
  baseSalary: 2000, // Optional base salary
  commissionRate: 0.50, // 50% commission
  minimumEarnings: 2500, // Guaranteed minimum
  tieredRates: [
    { threshold: 5000, rate: 0.55 }, // 55% above $5k revenue
    { threshold: 10000, rate: 0.60 } // 60% above $10k revenue
  ]
};
```

### 2. Chair Rental Employment

**Description**: Staff rent workspace and keep all service revenue minus rental fees.

**Key Features**:
- Fixed rental amount (daily, weekly, or monthly)
- Staff keeps 100% of service revenue
- No base salary or commission
- Flexible rental periods

**Use Cases**:
- Independent contractors
- Experienced stylists
- Flexible scheduling arrangements

**Configuration Example**:
```typescript
const chairRentalConfig: ChairRentalEmploymentConfig = {
  type: 'CHAIR_RENTAL',
  rentalAmount: 150, // $150 per day
  rentalPeriod: 'DAILY',
  businessRetentionRate: 0, // Business keeps 0%
  minimumRentalDays: 3 // Minimum 3 days per week
};
```

### 3. Hybrid Employment

**Description**: Combines commission and chair rental elements for flexible arrangements.

**Key Features**:
- Lower chair rental fee
- Reduced commission rate
- Flexible revenue sharing
- Customizable arrangements

**Use Cases**:
- Transitioning from commission to rental
- Part-time arrangements
- Seasonal adjustments

**Configuration Example**:
```typescript
const hybridConfig: HybridEmploymentConfig = {
  type: 'HYBRID',
  chairRentalAmount: 75, // Reduced rental
  chairRentalPeriod: 'DAILY',
  commissionRate: 0.30, // Reduced commission
  businessRetentionRate: 0.20, // Business keeps 20%
  baseSalary: 1000 // Optional base
};
```

## Database Architecture

### Core Tables

#### Staff Employment Configuration
```sql
CREATE TABLE staff_employment_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id),
  business_id UUID NOT NULL REFERENCES businesses(id),
  employment_type employment_type_enum NOT NULL,
  config JSONB NOT NULL,
  effective_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Payment Calculations
```sql
CREATE TABLE payment_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id),
  business_id UUID NOT NULL REFERENCES businesses(id),
  calculation_period_start DATE NOT NULL,
  calculation_period_end DATE NOT NULL,
  employment_type employment_type_enum NOT NULL,
  total_revenue DECIMAL(10,2) NOT NULL,
  base_salary DECIMAL(10,2) DEFAULT 0,
  commission_amount DECIMAL(10,2) DEFAULT 0,
  chair_rental_amount DECIMAL(10,2) DEFAULT 0,
  business_retention DECIMAL(10,2) DEFAULT 0,
  staff_earnings DECIMAL(10,2) NOT NULL,
  calculation_metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Employment Type Enum
```sql
CREATE TYPE employment_type_enum AS ENUM (
  'COMMISSION',
  'CHAIR_RENTAL', 
  'HYBRID'
);
```

### Indexes for Performance
```sql
-- Performance indexes
CREATE INDEX idx_staff_employment_config_staff_business 
ON staff_employment_config(staff_id, business_id);

CREATE INDEX idx_payment_calculations_staff_period 
ON payment_calculations(staff_id, calculation_period_start, calculation_period_end);

CREATE INDEX idx_payment_calculations_business_type 
ON payment_calculations(business_id, employment_type);
```

## Financial Calculation Engine

### Core Calculator Class

The `EmploymentCalculator` class handles all financial calculations:

```typescript
import { EmploymentCalculator } from '@/lib/financial/employment-calculator';

// Initialize calculator
const calculator = new EmploymentCalculator();

// Calculate commission earnings
const commissionResult = await calculator.calculateCommissionEarnings({
  totalRevenue: 5000,
  commissionRate: 0.50,
  baseSalary: 2000,
  minimumEarnings: 2500
});

// Calculate chair rental earnings
const rentalResult = await calculator.calculateChairRentalEarnings({
  totalRevenue: 3000,
  rentalAmount: 150,
  rentalPeriod: 'DAILY',
  workingDays: 5
});

// Calculate hybrid earnings
const hybridResult = await calculator.calculateHybridEarnings({
  totalRevenue: 4000,
  commissionRate: 0.30,
  chairRentalAmount: 75,
  chairRentalPeriod: 'DAILY',
  workingDays: 5,
  businessRetentionRate: 0.20
});
```

### Payment Calculation Service

The `PaymentCalculationService` provides database integration:

```typescript
import { PaymentCalculationService } from '@/lib/services/payment-calculation-service';

const paymentService = new PaymentCalculationService();

// Calculate and store staff earnings
const calculation = await paymentService.calculateStaffEarnings(
  staffId,
  businessId,
  startDate,
  endDate
);

// Get calculation history
const history = await paymentService.getCalculationHistory(
  staffId,
  businessId,
  { limit: 10 }
);

// Generate payroll report
const report = await paymentService.generatePayrollReport(
  businessId,
  startDate,
  endDate
);
```

## Implementation Examples

### 1. Setting Up Staff Employment

```typescript
// Create commission-based employment
const commissionStaff = await prisma.staffEmploymentConfig.create({
  data: {
    staffId: 'staff-uuid',
    businessId: 'business-uuid',
    employmentType: 'COMMISSION',
    config: {
      baseSalary: 2000,
      commissionRate: 0.50,
      minimumEarnings: 2500,
      tieredRates: [
        { threshold: 5000, rate: 0.55 },
        { threshold: 10000, rate: 0.60 }
      ]
    },
    effectiveDate: new Date()
  }
});

// Create chair rental employment
const rentalStaff = await prisma.staffEmploymentConfig.create({
  data: {
    staffId: 'staff-uuid-2',
    businessId: 'business-uuid',
    employmentType: 'CHAIR_RENTAL',
    config: {
      rentalAmount: 150,
      rentalPeriod: 'DAILY',
      minimumRentalDays: 3
    },
    effectiveDate: new Date()
  }
});
```

### 2. Processing Payments

```typescript
// Process weekly payroll
async function processWeeklyPayroll(businessId: string) {
  const startDate = getWeekStart();
  const endDate = getWeekEnd();
  
  // Get all active staff
  const staff = await prisma.staff.findMany({
    where: { 
      businessId,
      status: 'ACTIVE'
    },
    include: {
      employmentConfig: {
        where: {
          effectiveDate: { lte: endDate },
          OR: [
            { endDate: null },
            { endDate: { gte: startDate } }
          ]
        }
      }
    }
  });

  const paymentService = new PaymentCalculationService();
  const results = [];

  for (const staffMember of staff) {
    try {
      const calculation = await paymentService.calculateStaffEarnings(
        staffMember.id,
        businessId,
        startDate,
        endDate
      );
      results.push(calculation);
    } catch (error) {
      console.error(`Failed to calculate earnings for staff ${staffMember.id}:`, error);
    }
  }

  return results;
}
```

### 3. Transitioning Employment Types

```typescript
// Transition staff from commission to chair rental
async function transitionToChairRental(
  staffId: string,
  businessId: string,
  transitionDate: Date
) {
  // End current employment config
  await prisma.staffEmploymentConfig.updateMany({
    where: {
      staffId,
      businessId,
      endDate: null
    },
    data: {
      endDate: new Date(transitionDate.getTime() - 1) // Day before transition
    }
  });

  // Create new chair rental config
  await prisma.staffEmploymentConfig.create({
    data: {
      staffId,
      businessId,
      employmentType: 'CHAIR_RENTAL',
      config: {
        rentalAmount: 150,
        rentalPeriod: 'DAILY',
        minimumRentalDays: 3
      },
      effectiveDate: transitionDate
    }
  });
}
```

## API Integration

### REST API Endpoints

#### Get Staff Employment Configuration
```typescript
// GET /api/staff/{staffId}/employment
export async function GET(
  request: Request,
  { params }: { params: { staffId: string } }
) {
  const { staffId } = params;
  const businessId = await getBusinessIdFromSession();

  const config = await prisma.staffEmploymentConfig.findFirst({
    where: {
      staffId,
      businessId,
      effectiveDate: { lte: new Date() },
      OR: [
        { endDate: null },
        { endDate: { gte: new Date() } }
      ]
    }
  });

  return Response.json(config);
}
```

#### Update Employment Configuration
```typescript
// PUT /api/staff/{staffId}/employment
export async function PUT(
  request: Request,
  { params }: { params: { staffId: string } }
) {
  const { staffId } = params;
  const businessId = await getBusinessIdFromSession();
  const data = await request.json();

  // Validate employment configuration
  const validatedConfig = employmentConfigSchema.parse(data);

  // End current configuration
  await prisma.staffEmploymentConfig.updateMany({
    where: {
      staffId,
      businessId,
      endDate: null
    },
    data: { endDate: new Date() }
  });

  // Create new configuration
  const newConfig = await prisma.staffEmploymentConfig.create({
    data: {
      staffId,
      businessId,
      employmentType: validatedConfig.type,
      config: validatedConfig,
      effectiveDate: new Date()
    }
  });

  return Response.json(newConfig);
}
```

#### Calculate Staff Earnings
```typescript
// POST /api/staff/{staffId}/calculate-earnings
export async function POST(
  request: Request,
  { params }: { params: { staffId: string } }
) {
  const { staffId } = params;
  const { startDate, endDate } = await request.json();
  const businessId = await getBusinessIdFromSession();

  const paymentService = new PaymentCalculationService();
  
  const calculation = await paymentService.calculateStaffEarnings(
    staffId,
    businessId,
    new Date(startDate),
    new Date(endDate)
  );

  return Response.json(calculation);
}
```

## UI Components

### Employment Type Selector

```typescript
import { EmploymentTypeSelector } from '@/components/staff/employment-type-selector';

function StaffEmploymentForm({ staffId }: { staffId: string }) {
  const [employmentType, setEmploymentType] = useState<EmploymentType>('COMMISSION');
  const [config, setConfig] = useState<EmploymentConfig>({});

  return (
    <form>
      <EmploymentTypeSelector
        value={employmentType}
        onChange={setEmploymentType}
      />
      
      <EmploymentConfigForm
        type={employmentType}
        config={config}
        onChange={setConfig}
      />
      
      <CalculationPreview
        type={employmentType}
        config={config}
        sampleRevenue={5000}
      />
    </form>
  );
}
```

### Earnings Calculator Widget

```typescript
import { EarningsCalculator } from '@/components/staff/earnings-calculator';

function StaffDashboard({ staffId }: { staffId: string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <EarningsCalculator
        staffId={staffId}
        period="current-week"
      />
      
      <PaymentHistory
        staffId={staffId}
        limit={10}
      />
    </div>
  );
}
```

## Testing and Validation

### Unit Tests

```typescript
// __tests__/employment-calculator.test.ts
import { EmploymentCalculator } from '@/lib/financial/employment-calculator';

describe('EmploymentCalculator', () => {
  const calculator = new EmploymentCalculator();

  describe('Commission Calculations', () => {
    it('should calculate basic commission correctly', async () => {
      const result = await calculator.calculateCommissionEarnings({
        totalRevenue: 5000,
        commissionRate: 0.50,
        baseSalary: 2000
      });

      expect(result.commissionAmount).toBe(2500);
      expect(result.totalEarnings).toBe(4500);
    });

    it('should apply minimum earnings guarantee', async () => {
      const result = await calculator.calculateCommissionEarnings({
        totalRevenue: 2000,
        commissionRate: 0.50,
        baseSalary: 1000,
        minimumEarnings: 3000
      });

      expect(result.totalEarnings).toBe(3000);
      expect(result.minimumEarningsApplied).toBe(true);
    });
  });

  describe('Chair Rental Calculations', () => {
    it('should calculate daily rental correctly', async () => {
      const result = await calculator.calculateChairRentalEarnings({
        totalRevenue: 3000,
        rentalAmount: 150,
        rentalPeriod: 'DAILY',
        workingDays: 5
      });

      expect(result.totalRentalCost).toBe(750);
      expect(result.staffEarnings).toBe(2250);
    });
  });
});
```

### Integration Tests

```typescript
// __tests__/payment-calculation-service.test.ts
import { PaymentCalculationService } from '@/lib/services/payment-calculation-service';

describe('PaymentCalculationService', () => {
  const service = new PaymentCalculationService();

  it('should calculate and store staff earnings', async () => {
    const calculation = await service.calculateStaffEarnings(
      'staff-id',
      'business-id',
      new Date('2024-01-01'),
      new Date('2024-01-07')
    );

    expect(calculation).toBeDefined();
    expect(calculation.staffEarnings).toBeGreaterThan(0);
    
    // Verify database storage
    const stored = await prisma.paymentCalculation.findUnique({
      where: { id: calculation.id }
    });
    expect(stored).toBeDefined();
  });
});
```

## Performance Monitoring

### Monitoring Integration

```typescript
import { hybridModelPerformanceMonitor } from '@/lib/hybrid-model-performance-monitor';

// Monitor calculation performance
const result = await hybridModelPerformanceMonitor.monitorCalculation(
  'commission',
  () => calculator.calculateCommissionEarnings(config),
  (result) => result.totalEarnings > 0 // Validation function
);

// Get performance metrics
const metrics = hybridModelPerformanceMonitor.getPerformanceMetrics();
console.log('Calculation success rate:', metrics.successfulCalculations / metrics.totalCalculations);

// Get performance summary
const summary = hybridModelPerformanceMonitor.getPerformanceSummary();
console.log('Overall health:', summary.overallHealth);
```

### Performance Alerts

The system automatically monitors:
- Calculation execution times
- Success/failure rates
- Accuracy of calculations
- Common error patterns

Alerts are triggered when:
- Execution time exceeds 5 seconds
- Failure rate exceeds 1%
- Accuracy drops below 99.5%

## Best Practices

### 1. Configuration Management

- Always validate employment configurations before saving
- Use effective dates for configuration changes
- Maintain audit trail of configuration changes
- Test calculations with sample data before applying

### 2. Financial Calculations

- Use decimal precision for all monetary calculations
- Validate calculation results before storing
- Implement comprehensive error handling
- Monitor calculation performance and accuracy

### 3. Database Operations

- Use transactions for multi-table updates
- Implement proper indexing for performance
- Use business-scoped queries for data isolation
- Regular backup of financial data

### 4. UI/UX Considerations

- Provide real-time calculation previews
- Show clear breakdown of earnings components
- Implement validation with helpful error messages
- Support easy transitions between employment types

### 5. Testing and Quality Assurance

- Test all calculation scenarios thoroughly
- Validate edge cases and error conditions
- Monitor production calculations for accuracy
- Implement automated testing for financial logic

## Troubleshooting

### Common Issues

1. **Calculation Discrepancies**
   - Verify employment configuration is correct
   - Check date ranges for calculation periods
   - Validate revenue data accuracy

2. **Performance Issues**
   - Monitor calculation execution times
   - Check database query performance
   - Review indexing strategy

3. **Configuration Errors**
   - Validate employment type transitions
   - Check effective date overlaps
   - Verify business rule compliance

### Support Resources

- [Financial Calculation API Reference](./API_REFERENCE.md)
- [Database Schema Documentation](./DATABASE_SCHEMA.md)
- [Performance Monitoring Guide](./PERFORMANCE_MONITORING.md)
- [Troubleshooting Guide](./WORKFLOW_TROUBLESHOOTING_GUIDE.md)
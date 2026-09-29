// ============================================================================
// HYBRID EMPLOYMENT TYPE DEFINITIONS
// ============================================================================

// Employment type enumeration
export type EmploymentType = 'commission' | 'chair_rental' | 'hybrid';

// Chair rental period options
export type ChairRentalPeriod = 'daily' | 'weekly' | 'monthly';

// ============================================================================
// PAYMENT CALCULATION INTERFACES
// ============================================================================

// Date range for calculations
export interface DateRange {
  start: Date;
  end: Date;
}

// Commission calculation result
export interface CommissionCalculation {
  grossRevenue: number;
  commissionRate: number;
  commissionAmount: number;
  baseSalary: number;
  totalEarnings: number;
}

// Chair rental calculation result
export interface ChairRentalCalculation {
  rentalAmount: number;
  rentalPeriod: ChairRentalPeriod;
  periodsWorked: number;
  totalRental: number;
  grossRevenue: number;
  netEarnings: number; // Revenue minus rental
}

// Hybrid model calculation (both commission and rental)
export interface HybridCalculation {
  commission: CommissionCalculation;
  chairRental: ChairRentalCalculation;
  totalEarnings: number;
  businessRetention: number;
}

// Payment calculation for any employment type
export interface PaymentCalculation {
  staffId: string;
  businessId: string;
  period: DateRange;
  employmentType: EmploymentType;
  grossRevenue: number;
  commissionEarnings?: number;
  chairRentalDue?: number;
  baseSalaryAmount?: number;
  netEarnings: number;
  businessRetention: number;
  calculationDate: Date;
  processed: boolean;
}

// ============================================================================
// BUSINESS RETENTION INTERFACES
// ============================================================================

// Business retention calculation
export interface BusinessRetention {
  totalRevenue: number;
  staffEarnings: number;
  operatingExpenses: number;
  netRetention: number;
  retentionPercentage: number;
}

// Mixed employment model summary
export interface MixedEmploymentSummary {
  businessId: string;
  period: DateRange;
  commissionEmployees: {
    count: number;
    totalEarnings: number;
    averageEarnings: number;
  };
  chairRentalContractors: {
    count: number;
    totalRental: number;
    averageRental: number;
  };
  hybridStaff: {
    count: number;
    totalEarnings: number;
    averageEarnings: number;
  };
  totalBusinessRetention: number;
}

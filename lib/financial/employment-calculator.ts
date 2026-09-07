/**
 * Financial Calculation Engine for Hybrid Employment Models
 *
 * This module provides comprehensive financial calculations for different employment types:
 * - Commission-based employees
 * - Chair rental contractors
 * - Hybrid employees (both commission and rental)
 * - Business retention calculations
 */

import type {
  BusinessRetention,
  ChairRentalCalculation,
  ChairRentalPeriod,
  CommissionCalculation,
  DateRange,
  EmploymentType,
  HybridCalculation,
  MixedEmploymentSummary,
  PaymentCalculation,
} from '@/types/employment';

// ============================================================================
// COMMISSION CALCULATION ENGINE
// ============================================================================

/**
 * Calculates commission earnings for commission-based employees
 */
export function calculateCommissionEarnings(
  grossRevenue: number,
  commissionRate: number,
  baseSalary: number = 0
): CommissionCalculation {
  if (grossRevenue < 0) {
    throw new Error('Gross revenue cannot be negative');
  }

  if (commissionRate < 0 || commissionRate > 100) {
    throw new Error('Commission rate must be between 0 and 100');
  }

  if (baseSalary < 0) {
    throw new Error('Base salary cannot be negative');
  }

  const commissionAmount = (grossRevenue * commissionRate) / 100;
  const totalEarnings = commissionAmount + baseSalary;

  return {
    grossRevenue,
    commissionRate,
    commissionAmount,
    baseSalary,
    totalEarnings,
  };
}

// ============================================================================
// CHAIR RENTAL CALCULATION ENGINE
// ============================================================================

/**
 * Calculates chair rental payments for rental-based contractors
 */
export function calculateChairRental(
  rentalAmount: number,
  rentalPeriod: ChairRentalPeriod,
  periodsWorked: number,
  grossRevenue: number = 0
): ChairRentalCalculation {
  if (rentalAmount < 0) {
    throw new Error('Rental amount cannot be negative');
  }

  if (periodsWorked < 0) {
    throw new Error('Periods worked cannot be negative');
  }

  if (grossRevenue < 0) {
    throw new Error('Gross revenue cannot be negative');
  }

  const totalRental = rentalAmount * periodsWorked;
  const netEarnings = Math.max(0, grossRevenue - totalRental);

  return {
    rentalAmount,
    rentalPeriod,
    periodsWorked,
    totalRental,
    grossRevenue,
    netEarnings,
  };
}

/**
 * Calculates the number of rental periods worked based on date range
 */
export function calculateRentalPeriods(
  startDate: Date,
  endDate: Date,
  rentalPeriod: ChairRentalPeriod,
  daysWorked?: number
): number {
  const totalDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // If specific days worked is provided, use that for calculation
  const effectiveDays = daysWorked ?? totalDays;

  switch (rentalPeriod) {
    case 'daily':
      return effectiveDays;
    case 'weekly':
      return Math.ceil(effectiveDays / 7);
    case 'monthly':
      return Math.ceil(effectiveDays / 30); // Approximate month as 30 days
    default:
      throw new Error(`Invalid rental period: ${rentalPeriod}`);
  }
}

// ============================================================================
// HYBRID MODEL CALCULATION ENGINE
// ============================================================================

/**
 * Calculates earnings for hybrid employees (both commission and rental)
 */
export function calculateHybridEarnings(
  grossRevenue: number,
  commissionRate: number,
  chairRentalAmount: number,
  chairRentalPeriod: ChairRentalPeriod,
  periodsWorked: number,
  baseSalary: number = 0
): HybridCalculation {
  const commission = calculateCommissionEarnings(
    grossRevenue,
    commissionRate,
    baseSalary
  );
  const chairRental = calculateChairRental(
    chairRentalAmount,
    chairRentalPeriod,
    periodsWorked,
    grossRevenue
  );

  // For hybrid model, total earnings is commission minus rental due
  const totalEarnings = Math.max(
    0,
    commission.totalEarnings - chairRental.totalRental
  );
  const businessRetention = grossRevenue - totalEarnings;

  return {
    commission,
    chairRental,
    totalEarnings,
    businessRetention,
  };
}

// ============================================================================
// BUSINESS RETENTION CALCULATION ENGINE
// ============================================================================

/**
 * Calculates business retention after staff payments
 */
export function calculateBusinessRetention(
  totalRevenue: number,
  staffEarnings: number,
  operatingExpenses: number = 0
): BusinessRetention {
  if (totalRevenue < 0) {
    throw new Error('Total revenue cannot be negative');
  }

  if (staffEarnings < 0) {
    throw new Error('Staff earnings cannot be negative');
  }

  if (operatingExpenses < 0) {
    throw new Error('Operating expenses cannot be negative');
  }

  const netRetention = totalRevenue - staffEarnings - operatingExpenses;
  const retentionPercentage =
    totalRevenue > 0 ? (netRetention / totalRevenue) * 100 : 0;

  return {
    totalRevenue,
    staffEarnings,
    operatingExpenses,
    netRetention,
    retentionPercentage,
  };
}

// ============================================================================
// COMPREHENSIVE PAYMENT CALCULATION ENGINE
// ============================================================================

/**
 * Calculates payment for any employment type
 */
export function calculateStaffPayment(
  staffId: string,
  businessId: string,
  period: DateRange,
  employmentType: EmploymentType,
  grossRevenue: number,
  employmentConfig: {
    commissionRate?: number;
    chairRentalAmount?: number;
    chairRentalPeriod?: ChairRentalPeriod;
    baseSalary?: number;
  },
  periodsWorked?: number
): PaymentCalculation {
  let commissionEarnings: number | undefined;
  let chairRentalDue: number | undefined;
  let baseSalaryAmount: number | undefined;
  let netEarnings: number;

  switch (employmentType) {
    case 'commission': {
      if (!employmentConfig.commissionRate) {
        throw new Error('Commission rate is required for commission employees');
      }

      const calculation = calculateCommissionEarnings(
        grossRevenue,
        employmentConfig.commissionRate,
        employmentConfig.baseSalary || 0
      );

      commissionEarnings = calculation.commissionAmount;
      baseSalaryAmount =
        calculation.baseSalary > 0 ? calculation.baseSalary : undefined;
      netEarnings = calculation.totalEarnings;
      break;
    }

    case 'chair_rental': {
      if (
        !employmentConfig.chairRentalAmount ||
        !employmentConfig.chairRentalPeriod
      ) {
        throw new Error(
          'Chair rental amount and period are required for chair rental contractors'
        );
      }

      const calculatedPeriods =
        periodsWorked ??
        calculateRentalPeriods(
          period.start,
          period.end,
          employmentConfig.chairRentalPeriod
        );

      const calculation = calculateChairRental(
        employmentConfig.chairRentalAmount,
        employmentConfig.chairRentalPeriod,
        calculatedPeriods,
        grossRevenue
      );

      chairRentalDue = calculation.totalRental;
      netEarnings = calculation.netEarnings;
      break;
    }

    case 'hybrid': {
      if (
        !employmentConfig.commissionRate ||
        !employmentConfig.chairRentalAmount ||
        !employmentConfig.chairRentalPeriod
      ) {
        throw new Error(
          'Commission rate, chair rental amount, and period are required for hybrid employees'
        );
      }

      const calculatedPeriods =
        periodsWorked ??
        calculateRentalPeriods(
          period.start,
          period.end,
          employmentConfig.chairRentalPeriod
        );

      const calculation = calculateHybridEarnings(
        grossRevenue,
        employmentConfig.commissionRate,
        employmentConfig.chairRentalAmount,
        employmentConfig.chairRentalPeriod,
        calculatedPeriods,
        employmentConfig.baseSalary || 0
      );

      commissionEarnings = calculation.commission.commissionAmount;
      chairRentalDue = calculation.chairRental.totalRental;
      baseSalaryAmount =
        calculation.commission.baseSalary > 0
          ? calculation.commission.baseSalary
          : undefined;
      netEarnings = calculation.totalEarnings;
      break;
    }

    default:
      throw new Error(`Invalid employment type: ${employmentType}`);
  }

  const businessRetention = grossRevenue - netEarnings;

  return {
    staffId,
    businessId,
    period,
    employmentType,
    grossRevenue,
    commissionEarnings,
    chairRentalDue,
    baseSalaryAmount,
    netEarnings,
    businessRetention,
    calculationDate: new Date(),
    processed: false,
  };
}

// ============================================================================
// MIXED EMPLOYMENT MODEL SUMMARY ENGINE
// ============================================================================

/**
 * Calculates summary for businesses with mixed employment types
 */
export function calculateMixedEmploymentSummary(
  businessId: string,
  period: DateRange,
  paymentCalculations: PaymentCalculation[]
): MixedEmploymentSummary {
  const commissionEmployees = paymentCalculations.filter(
    calc => calc.employmentType === 'commission'
  );
  const chairRentalContractors = paymentCalculations.filter(
    calc => calc.employmentType === 'chair_rental'
  );
  const hybridStaff = paymentCalculations.filter(
    calc => calc.employmentType === 'hybrid'
  );

  const totalBusinessRetention = paymentCalculations.reduce(
    (sum, calc) => sum + calc.businessRetention,
    0
  );

  return {
    businessId,
    period,
    commissionEmployees: {
      count: commissionEmployees.length,
      totalEarnings: commissionEmployees.reduce(
        (sum, calc) => sum + calc.netEarnings,
        0
      ),
      averageEarnings:
        commissionEmployees.length > 0
          ? commissionEmployees.reduce(
              (sum, calc) => sum + calc.netEarnings,
              0
            ) / commissionEmployees.length
          : 0,
    },
    chairRentalContractors: {
      count: chairRentalContractors.length,
      totalRental: chairRentalContractors.reduce(
        (sum, calc) => sum + (calc.chairRentalDue || 0),
        0
      ),
      averageRental:
        chairRentalContractors.length > 0
          ? chairRentalContractors.reduce(
              (sum, calc) => sum + (calc.chairRentalDue || 0),
              0
            ) / chairRentalContractors.length
          : 0,
    },
    hybridStaff: {
      count: hybridStaff.length,
      totalEarnings: hybridStaff.reduce(
        (sum, calc) => sum + calc.netEarnings,
        0
      ),
      averageEarnings:
        hybridStaff.length > 0
          ? hybridStaff.reduce((sum, calc) => sum + calc.netEarnings, 0) /
            hybridStaff.length
          : 0,
    },
    totalBusinessRetention,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validates employment configuration for calculations
 */
export function validateCalculationInputs(
  employmentType: EmploymentType,
  grossRevenue: number,
  employmentConfig: {
    commissionRate?: number;
    chairRentalAmount?: number;
    chairRentalPeriod?: ChairRentalPeriod;
    baseSalary?: number;
  }
): void {
  if (grossRevenue < 0) {
    throw new Error('Gross revenue cannot be negative');
  }

  switch (employmentType) {
    case 'commission':
      if (!employmentConfig.commissionRate) {
        throw new Error('Commission rate is required for commission employees');
      }
      if (
        employmentConfig.commissionRate < 0 ||
        employmentConfig.commissionRate > 100
      ) {
        throw new Error('Commission rate must be between 0 and 100');
      }
      break;

    case 'chair_rental':
      if (
        !employmentConfig.chairRentalAmount ||
        !employmentConfig.chairRentalPeriod
      ) {
        throw new Error(
          'Chair rental amount and period are required for chair rental contractors'
        );
      }
      if (employmentConfig.chairRentalAmount < 0) {
        throw new Error('Chair rental amount cannot be negative');
      }
      break;

    case 'hybrid':
      if (
        !employmentConfig.commissionRate ||
        !employmentConfig.chairRentalAmount ||
        !employmentConfig.chairRentalPeriod
      ) {
        throw new Error(
          'Commission rate, chair rental amount, and period are required for hybrid employees'
        );
      }
      if (
        employmentConfig.commissionRate < 0 ||
        employmentConfig.commissionRate > 100
      ) {
        throw new Error('Commission rate must be between 0 and 100');
      }
      if (employmentConfig.chairRentalAmount < 0) {
        throw new Error('Chair rental amount cannot be negative');
      }
      break;
  }

  if (employmentConfig.baseSalary && employmentConfig.baseSalary < 0) {
    throw new Error('Base salary cannot be negative');
  }
}

/**
 * Formats currency for display
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD'
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Formats percentage for display
 */
export function formatPercentage(percentage: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(percentage / 100);
}

/**
 * Calculates effective hourly rate for any employment type
 */
export function calculateEffectiveHourlyRate(
  netEarnings: number,
  hoursWorked: number
): number {
  if (hoursWorked <= 0) {
    throw new Error('Hours worked must be greater than 0');
  }

  return netEarnings / hoursWorked;
}

/**
 * Compares profitability between different employment arrangements
 */
export function compareEmploymentProfitability(
  grossRevenue: number,
  commissionRate: number,
  chairRentalAmount: number,
  chairRentalPeriod: ChairRentalPeriod,
  periodsWorked: number
): {
  commission: { staffEarnings: number; businessRetention: number };
  chairRental: { staffEarnings: number; businessRetention: number };
  hybrid: { staffEarnings: number; businessRetention: number };
} {
  const commission = calculateCommissionEarnings(grossRevenue, commissionRate);
  const chairRental = calculateChairRental(
    chairRentalAmount,
    chairRentalPeriod,
    periodsWorked,
    grossRevenue
  );
  const hybrid = calculateHybridEarnings(
    grossRevenue,
    commissionRate,
    chairRentalAmount,
    chairRentalPeriod,
    periodsWorked
  );

  return {
    commission: {
      staffEarnings: commission.totalEarnings,
      businessRetention: grossRevenue - commission.totalEarnings,
    },
    chairRental: {
      staffEarnings: chairRental.netEarnings,
      businessRetention: chairRental.totalRental,
    },
    hybrid: {
      staffEarnings: hybrid.totalEarnings,
      businessRetention: hybrid.businessRetention,
    },
  };
}

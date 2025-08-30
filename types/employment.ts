// ============================================================================
// HYBRID EMPLOYMENT TYPE DEFINITIONS
// ============================================================================

import type { Prisma } from '@prisma/client';

// Employment type enumeration
export type EmploymentType = 'commission' | 'chair_rental' | 'hybrid';

// Chair rental period options
export type ChairRentalPeriod = 'daily' | 'weekly' | 'monthly';

// ============================================================================
// CORE EMPLOYMENT INTERFACES
// ============================================================================

// Base employment configuration
export interface EmploymentConfiguration {
    employmentType: EmploymentType;
    commissionRate?: number; // Percentage (e.g., 50.00 for 50%)
    chairRentalAmount?: number; // Fixed rental amount
    chairRentalPeriod?: ChairRentalPeriod;
    baseSalary?: number; // Optional base salary for commission employees
}

// Enhanced staff member with employment details
export interface StaffEmploymentDetails extends EmploymentConfiguration {
    id: string;
    businessId: string;
    userId: string;
    displayName: string;
    startDate: Date;
    endDate?: Date;
    active: boolean;
}

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

// ============================================================================
// VALIDATION INTERFACES
// ============================================================================

// Employment configuration validation result
export interface EmploymentValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

// Employment type validation rules
export interface EmploymentValidationRules {
    commission: {
        requiresCommissionRate: boolean;
        minCommissionRate: number;
        maxCommissionRate: number;
        allowsBaseSalary: boolean;
    };
    chairRental: {
        requiresRentalAmount: boolean;
        requiresRentalPeriod: boolean;
        minRentalAmount: number;
        allowedPeriods: ChairRentalPeriod[];
    };
    hybrid: {
        requiresBothModels: boolean;
        allowsBaseSalary: boolean;
    };
}

// ============================================================================
// REPORTING INTERFACES
// ============================================================================

// Payroll report for mixed employment types
export interface PayrollReport {
    businessId: string;
    period: DateRange;
    commissionEmployees: Array<{
        staffId: string;
        displayName: string;
        grossRevenue: number;
        commissionRate: number;
        commissionEarnings: number;
        baseSalary: number;
        totalEarnings: number;
    }>;
    chairRentalContractors: Array<{
        staffId: string;
        displayName: string;
        grossRevenue: number;
        rentalAmount: number;
        rentalPeriod: ChairRentalPeriod;
        totalRental: number;
        netEarnings: number;
    }>;
    hybridStaff: Array<{
        staffId: string;
        displayName: string;
        grossRevenue: number;
        commissionEarnings: number;
        chairRentalDue: number;
        totalEarnings: number;
    }>;
    summary: MixedEmploymentSummary;
}

// Financial breakdown by employment type
export interface EmploymentTypeFinancials {
    employmentType: EmploymentType;
    staffCount: number;
    totalRevenue: number;
    totalStaffEarnings: number;
    businessRetention: number;
    averageEarningsPerStaff: number;
}

// ============================================================================
// PRISMA EXTENDED TYPES
// ============================================================================

// Staff with payment calculations
export type StaffWithPaymentCalculations = Prisma.StaffGetPayload<{
    include: {
        user: true;
        business: true;
        paymentCalculations: true;
    };
}>;

// Payment calculation with staff details
export type PaymentCalculationWithStaff = Prisma.PaymentCalculationGetPayload<{
    include: {
        staff: {
            include: {
                user: true;
            };
        };
        business: true;
    };
}>;

// ============================================================================
// EMPLOYMENT TRANSITION INTERFACES
// ============================================================================

// Employment type transition data
export interface EmploymentTransition {
    staffId: string;
    fromEmploymentType: EmploymentType;
    toEmploymentType: EmploymentType;
    transitionDate: Date;
    reason?: string;
    dataPreservation: {
        preserveHistoricalCalculations: boolean;
        migrateOngoingCalculations: boolean;
    };
}

// Employment transition validation
export interface EmploymentTransitionValidation {
    isValid: boolean;
    canTransition: boolean;
    requiredActions: string[];
    dataImpact: string[];
    warnings: string[];
}
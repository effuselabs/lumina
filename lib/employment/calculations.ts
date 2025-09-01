import type {
    EmploymentConfiguration,
    EmploymentType,
    RentalPeriod,
} from '@/lib/validations/employment';

// ============================================================================
// CALCULATION INTERFACES
// ============================================================================

export interface CalculationInput {
    grossRevenue: number;
    employmentType: EmploymentType;
    commissionRate?: number;
    chairRentalAmount?: number;
    chairRentalPeriod?: RentalPeriod;
    baseSalary?: number;
    periodsWorked?: number;
}

export interface CalculationResult {
    grossRevenue: number;
    commissionEarnings: number;
    chairRentalDue: number;
    baseSalaryAmount: number;
    netEarnings: number;
    businessRetention: number;
    breakdown: {
        commissionCalculation?: CommissionBreakdown;
        rentalCalculation?: RentalBreakdown;
        hybridCalculation?: HybridBreakdown;
    };
}

export interface CommissionBreakdown {
    grossRevenue: number;
    commissionRate: number;
    commissionAmount: number;
    baseSalary: number;
    totalEarnings: number;
}

export interface RentalBreakdown {
    grossRevenue: number;
    rentalAmount: number;
    rentalPeriod: RentalPeriod;
    periodsWorked: number;
    totalRental: number;
    netEarnings: number;
}

export interface HybridBreakdown {
    grossRevenue: number;
    commissionRate: number;
    commissionAmount: number;
    rentalAmount: number;
    rentalPeriod: RentalPeriod;
    periodsWorked: number;
    totalRental: number;
    baseSalary: number;
    totalEarnings: number;
    businessRetention: number;
}

// ============================================================================
// CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate commission earnings
 */
export function calculateCommissionEarnings(
    revenue: number,
    rate: number,
    baseSalary: number = 0,
    minimumEarnings: number = 0
): CommissionBreakdown {
    const commissionAmount = (revenue * rate) / 100;
    const totalEarnings = Math.max(commissionAmount + baseSalary, minimumEarnings);

    return {
        grossRevenue: revenue,
        commissionRate: rate,
        commissionAmount,
        baseSalary,
        totalEarnings,
    };
}

/**
 * Calculate chair rental payments
 */
export function calculateChairRental(
    revenue: number,
    rentalAmount: number,
    rentalPeriod: RentalPeriod,
    periodsWorked: number = 1
): RentalBreakdown {
    const totalRental = rentalAmount * periodsWorked;
    const netEarnings = Math.max(revenue - totalRental, 0);

    return {
        grossRevenue: revenue,
        rentalAmount,
        rentalPeriod,
        periodsWorked,
        totalRental,
        netEarnings,
    };
}

/**
 * Calculate hybrid employment earnings
 */
export function calculateHybridEarnings(
    revenue: number,
    commissionRate: number,
    rentalAmount: number,
    rentalPeriod: RentalPeriod,
    periodsWorked: number = 1,
    baseSalary: number = 0
): HybridBreakdown {
    const commissionAmount = (revenue * commissionRate) / 100;
    const totalRental = rentalAmount * periodsWorked;
    const totalEarnings = commissionAmount + baseSalary;
    // In hybrid model, business gets rental fee + remaining revenue after staff earnings
    const businessRetention = (revenue - totalEarnings) + totalRental;

    return {
        grossRevenue: revenue,
        commissionRate,
        commissionAmount,
        rentalAmount,
        rentalPeriod,
        periodsWorked,
        totalRental,
        baseSalary,
        totalEarnings,
        businessRetention: Math.max(businessRetention, 0),
    };
}

/**
 * Main calculation function that handles all employment types
 */
export function calculateEmploymentEarnings(input: CalculationInput): CalculationResult {
    const {
        grossRevenue,
        employmentType,
        commissionRate = 0,
        chairRentalAmount = 0,
        chairRentalPeriod = 'WEEKLY',
        baseSalary = 0,
        periodsWorked = 1,
    } = input;

    let result: CalculationResult = {
        grossRevenue,
        commissionEarnings: 0,
        chairRentalDue: 0,
        baseSalaryAmount: baseSalary,
        netEarnings: 0,
        businessRetention: 0,
        breakdown: {},
    };

    switch (employmentType) {
        case 'COMMISSION': {
            const commission = calculateCommissionEarnings(
                grossRevenue,
                commissionRate,
                baseSalary
            );
            result.commissionEarnings = commission.commissionAmount;
            result.netEarnings = commission.totalEarnings;
            result.businessRetention = grossRevenue - commission.totalEarnings;
            result.breakdown.commissionCalculation = commission;
            break;
        }

        case 'CHAIR_RENTAL': {
            const rental = calculateChairRental(
                grossRevenue,
                chairRentalAmount,
                chairRentalPeriod,
                periodsWorked
            );
            result.chairRentalDue = rental.totalRental;
            result.netEarnings = rental.netEarnings;
            result.businessRetention = rental.totalRental;
            result.breakdown.rentalCalculation = rental;
            break;
        }

        case 'HYBRID': {
            const hybrid = calculateHybridEarnings(
                grossRevenue,
                commissionRate,
                chairRentalAmount,
                chairRentalPeriod,
                periodsWorked,
                baseSalary
            );
            result.commissionEarnings = hybrid.commissionAmount;
            result.chairRentalDue = hybrid.totalRental;
            result.netEarnings = hybrid.totalEarnings;
            result.businessRetention = hybrid.businessRetention;
            result.breakdown.hybridCalculation = hybrid;
            break;
        }
    }

    return result;
}

// ============================================================================
// PREVIEW CALCULATION FUNCTIONS
// ============================================================================

/**
 * Generate calculation preview for different revenue scenarios
 */
export function generateCalculationPreview(
    config: EmploymentConfiguration,
    revenueScenarios: number[] = [500, 1000, 2000, 3000]
): Array<{ revenue: number; result: CalculationResult }> {
    return revenueScenarios.map((revenue) => ({
        revenue,
        result: calculateEmploymentEarnings({
            grossRevenue: revenue,
            employmentType: config.employmentType,
            commissionRate: config.commissionRate,
            chairRentalAmount: config.chairRentalAmount,
            chairRentalPeriod: config.chairRentalPeriod,
            baseSalary: config.baseSalary,
            periodsWorked: 1,
        }),
    }));
}

/**
 * Compare different employment types for the same revenue
 */
export function compareEmploymentTypes(
    revenue: number,
    configurations: EmploymentConfiguration[]
): Array<{ config: EmploymentConfiguration; result: CalculationResult }> {
    return configurations.map((config) => ({
        config,
        result: calculateEmploymentEarnings({
            grossRevenue: revenue,
            employmentType: config.employmentType,
            commissionRate: config.commissionRate,
            chairRentalAmount: config.chairRentalAmount,
            chairRentalPeriod: config.chairRentalPeriod,
            baseSalary: config.baseSalary,
            periodsWorked: 1,
        }),
    }));
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format currency values
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
    }).format(amount);
}

/**
 * Format percentage values
 */
export function formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
}

/**
 * Get rental period multiplier for calculations
 */
export function getRentalPeriodMultiplier(period: RentalPeriod): number {
    switch (period) {
        case 'DAILY':
            return 1;
        case 'WEEKLY':
            return 7;
        case 'MONTHLY':
            return 30;
        default:
            return 1;
    }
}

/**
 * Validate employment configuration for calculations
 */
export function validateCalculationInput(input: CalculationInput): {
    isValid: boolean;
    errors: string[];
} {
    const errors: string[] = [];

    if (input.grossRevenue < 0) {
        errors.push('Gross revenue must be positive');
    }

    if (input.employmentType === 'COMMISSION' && !input.commissionRate) {
        errors.push('Commission rate is required for commission-based employment');
    }

    if (input.employmentType === 'CHAIR_RENTAL') {
        if (!input.chairRentalAmount) {
            errors.push('Chair rental amount is required');
        }
        if (!input.chairRentalPeriod) {
            errors.push('Chair rental period is required');
        }
    }

    if (input.employmentType === 'HYBRID') {
        if (!input.commissionRate) {
            errors.push('Commission rate is required for hybrid employment');
        }
        if (!input.chairRentalAmount) {
            errors.push('Chair rental amount is required for hybrid employment');
        }
        if (!input.chairRentalPeriod) {
            errors.push('Chair rental period is required for hybrid employment');
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}
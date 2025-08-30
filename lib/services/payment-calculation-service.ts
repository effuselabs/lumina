/**
 * Payment Calculation Service
 * 
 * This service manages payment calculations for different employment types,
 * including creating, updating, and retrieving payment calculations from the database.
 */

import {
    calculateMixedEmploymentSummary,
    calculateStaffPayment,
    validateCalculationInputs,
} from '@/lib/financial/employment-calculator';
import type {
    CreatePaymentCalculation,
    PaymentCalculationWithRelations
} from '@/types/database';
import type {
    DateRange,
    EmploymentType,
    PaymentCalculation,
    PayrollReport
} from '@/types/employment';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// PAYMENT CALCULATION CRUD OPERATIONS
// ============================================================================

/**
 * Creates a new payment calculation
 */
export async function createPaymentCalculation(
    data: CreatePaymentCalculation
): Promise<PaymentCalculationWithRelations> {
    return await prisma.paymentCalculation.create({
        data,
        include: {
            staff: {
                include: {
                    user: true,
                },
            },
            business: true,
        },
    });
}

/**
 * Gets payment calculations for a specific staff member
 */
export async function getStaffPaymentCalculations(
    staffId: string,
    period?: DateRange
): Promise<PaymentCalculationWithRelations[]> {
    const whereClause: any = { staffId };

    if (period) {
        whereClause.calculationPeriodStart = { gte: period.start };
        whereClause.calculationPeriodEnd = { lte: period.end };
    }

    return await prisma.paymentCalculation.findMany({
        where: whereClause,
        include: {
            staff: {
                include: {
                    user: true,
                },
            },
            business: true,
        },
        orderBy: {
            calculationPeriodStart: 'desc',
        },
    });
}

/**
 * Gets payment calculations for a business
 */
export async function getBusinessPaymentCalculations(
    businessId: string,
    period?: DateRange,
    employmentType?: EmploymentType
): Promise<PaymentCalculationWithRelations[]> {
    const whereClause: any = { businessId };

    if (period) {
        whereClause.calculationPeriodStart = { gte: period.start };
        whereClause.calculationPeriodEnd = { lte: period.end };
    }

    if (employmentType) {
        whereClause.employmentType = employmentType.toUpperCase();
    }

    return await prisma.paymentCalculation.findMany({
        where: whereClause,
        include: {
            staff: {
                include: {
                    user: true,
                },
            },
            business: true,
        },
        orderBy: [
            { calculationPeriodStart: 'desc' },
            { staff: { displayName: 'asc' } },
        ],
    });
}

/**
 * Updates a payment calculation
 */
export async function updatePaymentCalculation(
    id: string,
    data: Partial<CreatePaymentCalculation>
): Promise<PaymentCalculationWithRelations> {
    return await prisma.paymentCalculation.update({
        where: { id },
        data,
        include: {
            staff: {
                include: {
                    user: true,
                },
            },
            business: true,
        },
    });
}

/**
 * Marks payment calculations as processed
 */
export async function markPaymentCalculationsProcessed(
    calculationIds: string[]
): Promise<number> {
    const result = await prisma.paymentCalculation.updateMany({
        where: {
            id: { in: calculationIds },
        },
        data: {
            processed: true,
        },
    });

    return result.count;
}

// ============================================================================
// AUTOMATED PAYMENT CALCULATION GENERATION
// ============================================================================

/**
 * Calculates and stores payment for a staff member for a given period
 */
export async function calculateAndStoreStaffPayment(
    staffId: string,
    period: DateRange,
    grossRevenue: number,
    periodsWorked?: number
): Promise<PaymentCalculationWithRelations> {
    // Get staff employment details
    const staff = await prisma.staff.findUnique({
        where: { id: staffId },
        include: {
            user: true,
            business: true,
        },
    });

    if (!staff) {
        throw new Error(`Staff member not found: ${staffId}`);
    }

    // Validate inputs
    const employmentConfig = {
        commissionRate: staff.commissionRate?.toNumber(),
        chairRentalAmount: staff.chairRentalAmount?.toNumber(),
        chairRentalPeriod: staff.chairRentalPeriod?.toLowerCase() as any,
        baseSalary: staff.baseSalary?.toNumber(),
    };

    validateCalculationInputs(
        staff.employmentType.toLowerCase() as EmploymentType,
        grossRevenue,
        employmentConfig
    );

    // Calculate payment
    const paymentCalculation = calculateStaffPayment(
        staffId,
        staff.businessId,
        period,
        staff.employmentType.toLowerCase() as EmploymentType,
        grossRevenue,
        employmentConfig,
        periodsWorked
    );

    // Check if calculation already exists for this period
    const existingCalculation = await prisma.paymentCalculation.findUnique({
        where: {
            staffId_calculationPeriodStart_calculationPeriodEnd: {
                staffId,
                calculationPeriodStart: period.start,
                calculationPeriodEnd: period.end,
            },
        },
    });

    if (existingCalculation) {
        // Update existing calculation
        return await updatePaymentCalculation(existingCalculation.id, {
            employmentType: paymentCalculation.employmentType.toUpperCase() as any,
            grossRevenue: paymentCalculation.grossRevenue,
            commissionEarnings: paymentCalculation.commissionEarnings,
            chairRentalDue: paymentCalculation.chairRentalDue,
            baseSalaryAmount: paymentCalculation.baseSalaryAmount,
            netEarnings: paymentCalculation.netEarnings,
            businessRetention: paymentCalculation.businessRetention,
            calculationDate: paymentCalculation.calculationDate,
            processed: false, // Reset processed status when updating
        });
    } else {
        // Create new calculation
        return await createPaymentCalculation({
            businessId: paymentCalculation.businessId,
            staffId: paymentCalculation.staffId,
            calculationPeriodStart: paymentCalculation.period.start,
            calculationPeriodEnd: paymentCalculation.period.end,
            employmentType: paymentCalculation.employmentType.toUpperCase() as any,
            grossRevenue: paymentCalculation.grossRevenue,
            commissionEarnings: paymentCalculation.commissionEarnings,
            chairRentalDue: paymentCalculation.chairRentalDue,
            baseSalaryAmount: paymentCalculation.baseSalaryAmount,
            netEarnings: paymentCalculation.netEarnings,
            businessRetention: paymentCalculation.businessRetention,
            calculationDate: paymentCalculation.calculationDate,
            processed: false,
        });
    }
}

/**
 * Calculates payments for all staff in a business for a given period
 */
export async function calculateBusinessPaymentsForPeriod(
    businessId: string,
    period: DateRange,
    revenueByStaff: Record<string, number>,
    periodsWorkedByStaff?: Record<string, number>
): Promise<PaymentCalculationWithRelations[]> {
    const staff = await prisma.staff.findMany({
        where: {
            businessId,
            isActive: true,
        },
        include: {
            user: true,
            business: true,
        },
    });

    const calculations: PaymentCalculationWithRelations[] = [];

    for (const staffMember of staff) {
        const grossRevenue = revenueByStaff[staffMember.id] || 0;
        const periodsWorked = periodsWorkedByStaff?.[staffMember.id];

        if (grossRevenue > 0) {
            const calculation = await calculateAndStoreStaffPayment(
                staffMember.id,
                period,
                grossRevenue,
                periodsWorked
            );
            calculations.push(calculation);
        }
    }

    return calculations;
}

// ============================================================================
// REPORTING AND ANALYTICS
// ============================================================================

/**
 * Generates a comprehensive payroll report for a business
 */
export async function generatePayrollReport(
    businessId: string,
    period: DateRange
): Promise<PayrollReport> {
    const calculations = await getBusinessPaymentCalculations(businessId, period);

    const commissionEmployees = calculations
        .filter(calc => calc.employmentType === 'COMMISSION')
        .map(calc => ({
            staffId: calc.staffId,
            displayName: calc.staff.displayName,
            grossRevenue: calc.grossRevenue.toNumber(),
            commissionRate: calc.staff.commissionRate?.toNumber() || 0,
            commissionEarnings: calc.commissionEarnings?.toNumber() || 0,
            baseSalary: calc.baseSalaryAmount?.toNumber() || 0,
            totalEarnings: calc.netEarnings.toNumber(),
        }));

    const chairRentalContractors = calculations
        .filter(calc => calc.employmentType === 'CHAIR_RENTAL')
        .map(calc => ({
            staffId: calc.staffId,
            displayName: calc.staff.displayName,
            grossRevenue: calc.grossRevenue.toNumber(),
            rentalAmount: calc.staff.chairRentalAmount?.toNumber() || 0,
            rentalPeriod: calc.staff.chairRentalPeriod?.toLowerCase() as any,
            totalRental: calc.chairRentalDue?.toNumber() || 0,
            netEarnings: calc.netEarnings.toNumber(),
        }));

    const hybridStaff = calculations
        .filter(calc => calc.employmentType === 'HYBRID')
        .map(calc => ({
            staffId: calc.staffId,
            displayName: calc.staff.displayName,
            grossRevenue: calc.grossRevenue.toNumber(),
            commissionEarnings: calc.commissionEarnings?.toNumber() || 0,
            chairRentalDue: calc.chairRentalDue?.toNumber() || 0,
            totalEarnings: calc.netEarnings.toNumber(),
        }));

    // Convert calculations to PaymentCalculation format for summary
    const paymentCalculations: PaymentCalculation[] = calculations.map(calc => ({
        staffId: calc.staffId,
        businessId: calc.businessId,
        period,
        employmentType: calc.employmentType.toLowerCase() as EmploymentType,
        grossRevenue: calc.grossRevenue.toNumber(),
        commissionEarnings: calc.commissionEarnings?.toNumber(),
        chairRentalDue: calc.chairRentalDue?.toNumber(),
        baseSalaryAmount: calc.baseSalaryAmount?.toNumber(),
        netEarnings: calc.netEarnings.toNumber(),
        businessRetention: calc.businessRetention.toNumber(),
        calculationDate: calc.calculationDate,
        processed: calc.processed,
    }));

    const summary = calculateMixedEmploymentSummary(businessId, period, paymentCalculations);

    return {
        businessId,
        period,
        commissionEmployees,
        chairRentalContractors,
        hybridStaff,
        summary,
    };
}

/**
 * Gets employment type distribution for a business
 */
export async function getEmploymentTypeDistribution(
    businessId: string
): Promise<Record<EmploymentType, number>> {
    const distribution = await prisma.staff.groupBy({
        by: ['employmentType'],
        where: {
            businessId,
            isActive: true,
        },
        _count: {
            employmentType: true,
        },
    });

    const result: Record<EmploymentType, number> = {
        commission: 0,
        chair_rental: 0,
        hybrid: 0,
    };

    distribution.forEach(item => {
        const employmentType = item.employmentType.toLowerCase() as EmploymentType;
        result[employmentType] = item._count.employmentType;
    });

    return result;
}

/**
 * Calculates average earnings by employment type
 */
export async function getAverageEarningsByEmploymentType(
    businessId: string,
    period: DateRange
): Promise<Record<EmploymentType, { averageEarnings: number; staffCount: number }>> {
    const calculations = await getBusinessPaymentCalculations(businessId, period);

    const result: Record<EmploymentType, { averageEarnings: number; staffCount: number }> = {
        commission: { averageEarnings: 0, staffCount: 0 },
        chair_rental: { averageEarnings: 0, staffCount: 0 },
        hybrid: { averageEarnings: 0, staffCount: 0 },
    };

    const groupedCalculations = calculations.reduce((acc, calc) => {
        const employmentType = calc.employmentType.toLowerCase() as EmploymentType;
        if (!acc[employmentType]) {
            acc[employmentType] = [];
        }
        acc[employmentType].push(calc);
        return acc;
    }, {} as Record<EmploymentType, typeof calculations>);

    Object.entries(groupedCalculations).forEach(([type, calcs]) => {
        const employmentType = type as EmploymentType;
        const totalEarnings = calcs.reduce((sum, calc) => sum + calc.netEarnings.toNumber(), 0);
        result[employmentType] = {
            averageEarnings: calcs.length > 0 ? totalEarnings / calcs.length : 0,
            staffCount: calcs.length,
        };
    });

    return result;
}

// ============================================================================
// REVENUE CALCULATION FROM TRANSACTIONS
// ============================================================================

/**
 * Calculates gross revenue by staff for a given period
 */
export async function calculateStaffRevenueForPeriod(
    businessId: string,
    period: DateRange
): Promise<Record<string, number>> {
    const transactions = await prisma.transaction.findMany({
        where: {
            businessId,
            staffId: { not: null },
            status: 'COMPLETED',
            createdAt: {
                gte: period.start,
                lte: period.end,
            },
        },
        select: {
            staffId: true,
            amount: true,
        },
    });

    const revenueByStaff: Record<string, number> = {};

    transactions.forEach(transaction => {
        if (transaction.staffId) {
            const staffId = transaction.staffId;
            const amount = transaction.amount.toNumber();
            revenueByStaff[staffId] = (revenueByStaff[staffId] || 0) + amount;
        }
    });

    return revenueByStaff;
}

/**
 * Automatically calculates and stores payments for all staff based on transaction data
 */
export async function autoCalculatePaymentsFromTransactions(
    businessId: string,
    period: DateRange
): Promise<PaymentCalculationWithRelations[]> {
    const revenueByStaff = await calculateStaffRevenueForPeriod(businessId, period);

    return await calculateBusinessPaymentsForPeriod(
        businessId,
        period,
        revenueByStaff
    );
}

// ============================================================================
// CLEANUP AND MAINTENANCE
// ============================================================================

/**
 * Deletes payment calculations for a specific period
 */
export async function deletePaymentCalculationsForPeriod(
    businessId: string,
    period: DateRange
): Promise<number> {
    const result = await prisma.paymentCalculation.deleteMany({
        where: {
            businessId,
            calculationPeriodStart: { gte: period.start },
            calculationPeriodEnd: { lte: period.end },
        },
    });

    return result.count;
}

/**
 * Archives old payment calculations (older than specified date)
 */
export async function archiveOldPaymentCalculations(
    businessId: string,
    olderThan: Date
): Promise<number> {
    // In a real implementation, you might move these to an archive table
    // For now, we'll just mark them as processed
    const result = await prisma.paymentCalculation.updateMany({
        where: {
            businessId,
            calculationPeriodEnd: { lt: olderThan },
            processed: false,
        },
        data: {
            processed: true,
        },
    });

    return result.count;
}
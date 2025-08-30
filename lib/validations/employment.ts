import type {
    ChairRentalPeriod,
    EmploymentConfiguration,
    EmploymentTransition,
    EmploymentTransitionValidation,
    EmploymentType,
    EmploymentValidationResult,
    EmploymentValidationRules,
} from '@/types/employment';
import { z } from 'zod';

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

// Employment type schema
export const employmentTypeSchema = z.enum(['commission', 'chair_rental', 'hybrid']);

// Chair rental period schema
export const chairRentalPeriodSchema = z.enum(['daily', 'weekly', 'monthly']);

// Base employment configuration schema
export const employmentConfigurationSchema = z.object({
    employmentType: employmentTypeSchema,
    commissionRate: z.number().min(0).max(100).optional(),
    chairRentalAmount: z.number().min(0).optional(),
    chairRentalPeriod: chairRentalPeriodSchema.optional(),
    baseSalary: z.number().min(0).optional(),
});

// Commission employee schema
export const commissionEmployeeSchema = z.object({
    employmentType: z.literal('commission'),
    commissionRate: z.number().min(1).max(100),
    baseSalary: z.number().min(0).optional(),
    chairRentalAmount: z.undefined(),
    chairRentalPeriod: z.undefined(),
});

// Chair rental contractor schema
export const chairRentalContractorSchema = z.object({
    employmentType: z.literal('chair_rental'),
    chairRentalAmount: z.number().min(1),
    chairRentalPeriod: chairRentalPeriodSchema,
    commissionRate: z.undefined(),
    baseSalary: z.undefined(),
});

// Hybrid employee schema
export const hybridEmployeeSchema = z.object({
    employmentType: z.literal('hybrid'),
    commissionRate: z.number().min(1).max(100),
    chairRentalAmount: z.number().min(1),
    chairRentalPeriod: chairRentalPeriodSchema,
    baseSalary: z.number().min(0).optional(),
});

// Union schema for all employment types
export const employmentSchema = z.discriminatedUnion('employmentType', [
    commissionEmployeeSchema,
    chairRentalContractorSchema,
    hybridEmployeeSchema,
]);

// Employment transition schema
export const employmentTransitionSchema = z.object({
    staffId: z.string().cuid(),
    fromEmploymentType: employmentTypeSchema,
    toEmploymentType: employmentTypeSchema,
    transitionDate: z.date(),
    reason: z.string().optional(),
    dataPreservation: z.object({
        preserveHistoricalCalculations: z.boolean(),
        migrateOngoingCalculations: z.boolean(),
    }),
});

// ============================================================================
// VALIDATION RULES CONFIGURATION
// ============================================================================

export const employmentValidationRules: EmploymentValidationRules = {
    commission: {
        requiresCommissionRate: true,
        minCommissionRate: 1,
        maxCommissionRate: 100,
        allowsBaseSalary: true,
    },
    chairRental: {
        requiresRentalAmount: true,
        requiresRentalPeriod: true,
        minRentalAmount: 1,
        allowedPeriods: ['daily', 'weekly', 'monthly'],
    },
    hybrid: {
        requiresBothModels: true,
        allowsBaseSalary: true,
    },
};

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates employment configuration based on employment type
 */
export function validateEmploymentConfiguration(
    config: EmploymentConfiguration
): EmploymentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
        // Use Zod schema validation
        employmentSchema.parse(config);
    } catch (error) {
        if (error instanceof z.ZodError) {
            errors.push(...error.errors.map(err => `${err.path.join('.')}: ${err.message}`));
        }
    }

    // Additional business logic validation
    switch (config.employmentType) {
        case 'commission':
            validateCommissionEmployee(config, errors, warnings);
            break;
        case 'chair_rental':
            validateChairRentalContractor(config, errors, warnings);
            break;
        case 'hybrid':
            validateHybridEmployee(config, errors, warnings);
            break;
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    };
}

/**
 * Validates commission employee configuration
 */
function validateCommissionEmployee(
    config: EmploymentConfiguration,
    errors: string[],
    warnings: string[]
): void {
    const rules = employmentValidationRules.commission;

    if (!config.commissionRate) {
        errors.push('Commission rate is required for commission employees');
    } else {
        if (config.commissionRate < rules.minCommissionRate) {
            errors.push(`Commission rate must be at least ${rules.minCommissionRate}%`);
        }
        if (config.commissionRate > rules.maxCommissionRate) {
            errors.push(`Commission rate cannot exceed ${rules.maxCommissionRate}%`);
        }
    }

    if (config.chairRentalAmount || config.chairRentalPeriod) {
        errors.push('Chair rental fields are not allowed for commission employees');
    }

    if (config.baseSalary && config.baseSalary > 0) {
        warnings.push('Base salary with commission may affect tax classification');
    }
}

/**
 * Validates chair rental contractor configuration
 */
function validateChairRentalContractor(
    config: EmploymentConfiguration,
    errors: string[],
    warnings: string[]
): void {
    const rules = employmentValidationRules.chairRental;

    if (!config.chairRentalAmount) {
        errors.push('Chair rental amount is required for chair rental contractors');
    } else if (config.chairRentalAmount < rules.minRentalAmount) {
        errors.push(`Chair rental amount must be at least $${rules.minRentalAmount}`);
    }

    if (!config.chairRentalPeriod) {
        errors.push('Chair rental period is required for chair rental contractors');
    } else if (!rules.allowedPeriods.includes(config.chairRentalPeriod)) {
        errors.push(`Chair rental period must be one of: ${rules.allowedPeriods.join(', ')}`);
    }

    if (config.commissionRate || config.baseSalary) {
        errors.push('Commission rate and base salary are not allowed for chair rental contractors');
    }

    warnings.push('Chair rental contractors are typically classified as independent contractors');
}

/**
 * Validates hybrid employee configuration
 */
function validateHybridEmployee(
    config: EmploymentConfiguration,
    errors: string[],
    warnings: string[]
): void {
    if (!config.commissionRate) {
        errors.push('Commission rate is required for hybrid employees');
    }

    if (!config.chairRentalAmount) {
        errors.push('Chair rental amount is required for hybrid employees');
    }

    if (!config.chairRentalPeriod) {
        errors.push('Chair rental period is required for hybrid employees');
    }

    if (config.commissionRate && config.commissionRate > 50) {
        warnings.push('High commission rates with chair rental may reduce business profitability');
    }

    warnings.push('Hybrid employment models require careful legal and tax consideration');
}

/**
 * Validates employment type transition
 */
export function validateEmploymentTransition(
    transition: EmploymentTransition
): EmploymentTransitionValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    const requiredActions: string[] = [];
    const dataImpact: string[] = [];

    try {
        employmentTransitionSchema.parse(transition);
    } catch (error) {
        if (error instanceof z.ZodError) {
            errors.push(...error.errors.map(err => `${err.path.join('.')}: ${err.message}`));
        }
    }

    // Check if transition is valid
    if (transition.fromEmploymentType === transition.toEmploymentType) {
        errors.push('Cannot transition to the same employment type');
    }

    // Analyze transition impact
    analyzeTransitionImpact(transition, requiredActions, dataImpact, warnings);

    return {
        isValid: errors.length === 0,
        canTransition: errors.length === 0,
        requiredActions,
        dataImpact,
        warnings,
    };
}

/**
 * Analyzes the impact of employment type transition
 */
function analyzeTransitionImpact(
    transition: EmploymentTransition,
    requiredActions: string[],
    dataImpact: string[],
    warnings: string[]
): void {
    const { fromEmploymentType, toEmploymentType } = transition;

    // Commission to Chair Rental
    if (fromEmploymentType === 'commission' && toEmploymentType === 'chair_rental') {
        requiredActions.push('Update employment classification from employee to contractor');
        requiredActions.push('Set up chair rental amount and period');
        dataImpact.push('Historical commission calculations will be preserved');
        dataImpact.push('Future earnings will be calculated as rental-based');
        warnings.push('Tax implications: contractor vs employee classification');
    }

    // Chair Rental to Commission
    if (fromEmploymentType === 'chair_rental' && toEmploymentType === 'commission') {
        requiredActions.push('Update employment classification from contractor to employee');
        requiredActions.push('Set up commission rate and optional base salary');
        dataImpact.push('Historical rental calculations will be preserved');
        dataImpact.push('Future earnings will be calculated as commission-based');
        warnings.push('May require new employment contract and tax setup');
    }

    // Any type to Hybrid
    if (toEmploymentType === 'hybrid') {
        requiredActions.push('Configure both commission rate and chair rental amount');
        requiredActions.push('Set up hybrid calculation logic');
        dataImpact.push('Future calculations will include both commission and rental components');
        warnings.push('Hybrid models require careful legal review');
    }

    // Hybrid to any single type
    if (fromEmploymentType === 'hybrid') {
        requiredActions.push('Simplify employment model to single type');
        dataImpact.push('Historical hybrid calculations will be preserved');
        warnings.push('Ensure staff understands the change in earning structure');
    }
}

/**
 * Validates chair rental period value
 */
export function validateChairRentalPeriod(period: string): period is ChairRentalPeriod {
    return ['daily', 'weekly', 'monthly'].includes(period);
}

/**
 * Validates employment type value
 */
export function validateEmploymentType(type: string): type is EmploymentType {
    return ['commission', 'chair_rental', 'hybrid'].includes(type);
}

/**
 * Gets validation rules for specific employment type
 */
export function getEmploymentTypeRules(employmentType: EmploymentType) {
    return employmentValidationRules[employmentType];
}

/**
 * Checks if employment configuration is complete
 */
export function isEmploymentConfigurationComplete(config: EmploymentConfiguration): boolean {
    const validation = validateEmploymentConfiguration(config);
    return validation.isValid;
}
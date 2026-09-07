import { z } from 'zod';

// Employment type enums
export const employmentTypeSchema = z.enum(
  ['COMMISSION', 'CHAIR_RENTAL', 'HYBRID'],
  {
    required_error: 'Please select an employment type',
  }
);

export const rentalPeriodSchema = z.enum(['DAILY', 'WEEKLY', 'MONTHLY'], {
  required_error: 'Please select a rental period',
});

// Base employment configuration schema
export const employmentConfigurationSchema = z.object({
  employmentType: employmentTypeSchema,
  commissionRate: z
    .number()
    .min(0, 'Commission rate must be at least 0%')
    .max(100, 'Commission rate cannot exceed 100%')
    .optional(),
  chairRentalAmount: z
    .number()
    .min(0, 'Rental amount must be positive')
    .optional(),
  chairRentalPeriod: rentalPeriodSchema.optional(),
  baseSalary: z.number().min(0, 'Base salary must be positive').optional(),
});

// Commission-specific validation
export const commissionEmploymentSchema = employmentConfigurationSchema.extend({
  employmentType: z.literal('COMMISSION'),
  commissionRate: z
    .number()
    .min(10, 'Commission rate must be at least 10%')
    .max(90, 'Commission rate cannot exceed 90%'),
  baseSalary: z.number().min(0, 'Base salary must be positive').optional(),
});

// Chair rental-specific validation
export const chairRentalEmploymentSchema = employmentConfigurationSchema.extend(
  {
    employmentType: z.literal('CHAIR_RENTAL'),
    chairRentalAmount: z.number().min(50, 'Rental amount must be at least $50'),
    chairRentalPeriod: rentalPeriodSchema,
  }
);

// Hybrid employment validation
export const hybridEmploymentSchema = employmentConfigurationSchema.extend({
  employmentType: z.literal('HYBRID'),
  commissionRate: z
    .number()
    .min(5, 'Commission rate must be at least 5%')
    .max(70, 'Commission rate cannot exceed 70% in hybrid model'),
  chairRentalAmount: z.number().min(25, 'Rental amount must be at least $25'),
  chairRentalPeriod: rentalPeriodSchema,
  baseSalary: z.number().min(0, 'Base salary must be positive').optional(),
});

// Employment transition schema
export const employmentTransitionSchema = z.object({
  staffId: z.string().min(1, 'Staff ID is required'),
  fromEmploymentType: employmentTypeSchema,
  toEmploymentType: employmentTypeSchema,
  transitionDate: z.date(),
  reason: z.string().optional(),
  preserveHistoricalCalculations: z.boolean().default(true),
  migrateOngoingCalculations: z.boolean().default(true),
});

// Dynamic validation based on employment type
export const createEmploymentValidationSchema = (employmentType: string) => {
  switch (employmentType) {
    case 'COMMISSION':
      return commissionEmploymentSchema;
    case 'CHAIR_RENTAL':
      return chairRentalEmploymentSchema;
    case 'HYBRID':
      return hybridEmploymentSchema;
    default:
      return employmentConfigurationSchema;
  }
};

// Types
export type EmploymentType = z.infer<typeof employmentTypeSchema>;
export type RentalPeriod = z.infer<typeof rentalPeriodSchema>;
export type EmploymentConfiguration = z.infer<
  typeof employmentConfigurationSchema
>;
export type CommissionEmployment = z.infer<typeof commissionEmploymentSchema>;
export type ChairRentalEmployment = z.infer<typeof chairRentalEmploymentSchema>;
export type HybridEmployment = z.infer<typeof hybridEmploymentSchema>;
export type EmploymentTransition = z.infer<typeof employmentTransitionSchema>;

// Employment type descriptions for UI
export const employmentTypeDescriptions = {
  COMMISSION: {
    title: 'Commission-Based',
    description: 'Staff earn a percentage of each service they perform',
    example: 'Staff keeps 60% of service revenue, business keeps 40%',
    requiredFields: ['commissionRate'],
    optionalFields: ['baseSalary'],
    pros: [
      'Motivates staff performance',
      'Scales with business growth',
      'Lower fixed costs for business',
    ],
    cons: [
      'Variable staff income',
      'Complex calculations',
      'Income uncertainty during slow periods',
    ],
  },
  CHAIR_RENTAL: {
    title: 'Chair Rental',
    description:
      'Staff pay a fixed fee to use workspace and keep all service revenue',
    example:
      'Staff pays $200/week for chair rental, keeps 100% of service revenue',
    requiredFields: ['chairRentalAmount', 'chairRentalPeriod'],
    optionalFields: [],
    pros: [
      'Predictable business income',
      'Simple calculations',
      'Staff independence',
      'No commission disputes',
    ],
    cons: [
      'Fixed costs for staff',
      'Less control over pricing',
      'Staff responsible for slow periods',
    ],
  },
  HYBRID: {
    title: 'Hybrid Model',
    description: 'Combination of chair rental and commission structure',
    example: 'Staff pays $100/week rental plus 30% commission on services',
    requiredFields: [
      'commissionRate',
      'chairRentalAmount',
      'chairRentalPeriod',
    ],
    optionalFields: ['baseSalary'],
    pros: [
      'Balanced risk sharing',
      'Lower rental costs',
      'Performance incentives',
      'Flexible structure',
    ],
    cons: [
      'Complex calculations',
      'Requires careful planning',
      'Higher admin overhead',
    ],
  },
} as const;

// Rental period descriptions
export const rentalPeriodDescriptions = {
  DAILY: {
    title: 'Daily',
    description: 'Rental fee charged per day worked',
    multiplier: 1,
  },
  WEEKLY: {
    title: 'Weekly',
    description: 'Rental fee charged per week',
    multiplier: 7,
  },
  MONTHLY: {
    title: 'Monthly',
    description: 'Rental fee charged per month',
    multiplier: 30,
  },
} as const;

// Validation rules for employment types
export const employmentValidationRules = {
  COMMISSION: {
    requiresCommissionRate: true,
    minCommissionRate: 10,
    maxCommissionRate: 90,
    allowsBaseSalary: true,
    allowsRental: false,
  },
  CHAIR_RENTAL: {
    requiresRentalAmount: true,
    requiresRentalPeriod: true,
    minRentalAmount: 50,
    allowedPeriods: ['DAILY', 'WEEKLY', 'MONTHLY'] as const,
    allowsCommission: false,
  },
  HYBRID: {
    requiresBothModels: true,
    minCommissionRate: 5,
    maxCommissionRate: 70,
    minRentalAmount: 25,
    allowsBaseSalary: true,
  },
} as const;

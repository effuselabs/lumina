import { z } from 'zod';

// Business onboarding step schemas
export const businessBasicInfoSchema = z.object({
  name: z.string().min(2, 'Business name must be at least 2 characters'),
  description: z.string().optional(),
  email: z
    .string()
    .email('Please enter a valid email address')
    .optional()
    .or(z.literal('')),
  phone: z.string().optional(),
  website: z
    .string()
    .url('Please enter a valid website URL')
    .optional()
    .or(z.literal('')),
});

export const businessAddressSchema = z.object({
  address: z.string().min(5, 'Please enter a complete address'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(1, 'State/Province is required'),
  zipCode: z.string().min(3, 'Please enter a valid postal code'),
  country: z.string().default('US'),
  timezone: z.string().default('America/New_York'),
});

export const businessFinancialModelSchema = z.object({
  financialModel: z.enum(['COMMISSION', 'CHAIR_RENTAL', 'HOURLY', 'HYBRID'], {
    required_error: 'Please select a financial model',
  }),
  currency: z.string().default('USD'),
});

export const businessSettingsSchema = z.object({
  bookingEnabled: z.boolean().default(true),
  onlineBooking: z.boolean().default(true),
  requireDeposit: z.boolean().default(false),
  depositAmount: z.number().min(0).optional(),
  cancellationPolicy: z.string().optional(),
  primaryColor: z.string().default('#FFD25A'),
});

export const businessOperatingHoursSchema = z.object({
  operatingHours: z
    .record(
      z.object({
        isOpen: z.boolean(),
        openTime: z.string().optional(),
        closeTime: z.string().optional(),
      })
    )
    .optional(),
});

// Complete business profile schema
export const businessProfileSchema = businessBasicInfoSchema
  .merge(businessAddressSchema)
  .merge(businessFinancialModelSchema)
  .merge(businessSettingsSchema)
  .merge(businessOperatingHoursSchema);

// Onboarding step validation
export const onboardingStepSchema = z.object({
  step: z.number().min(1).max(5),
  data: z.record(z.any()),
});

// Types
export type BusinessBasicInfo = z.infer<typeof businessBasicInfoSchema>;
export type BusinessAddress = z.infer<typeof businessAddressSchema>;
export type BusinessFinancialModel = z.infer<
  typeof businessFinancialModelSchema
>;
export type BusinessSettings = z.infer<typeof businessSettingsSchema>;
export type BusinessOperatingHours = z.infer<
  typeof businessOperatingHoursSchema
>;
export type BusinessProfile = z.infer<typeof businessProfileSchema>;
export type OnboardingStep = z.infer<typeof onboardingStepSchema>;

// Default operating hours
export const defaultOperatingHours = {
  monday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
  tuesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
  wednesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
  thursday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
  friday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
  saturday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
  sunday: { isOpen: false, openTime: '', closeTime: '' },
};

// Financial model descriptions
export const financialModelDescriptions = {
  COMMISSION: {
    title: 'Commission-Based',
    description: 'Staff earn a percentage of each service they perform',
    example: 'Staff keeps 60% of service revenue, business keeps 40%',
    pros: [
      'Motivates staff performance',
      'Scales with business growth',
      'Lower fixed costs',
    ],
    cons: [
      'Variable staff income',
      'Complex calculations',
      'Potential conflicts',
    ],
  },
  CHAIR_RENTAL: {
    title: 'Chair Rental',
    description: 'Staff pay a fixed weekly/monthly fee to use workspace',
    example: 'Staff pays $200/week for chair rental, keeps all service revenue',
    pros: [
      'Predictable business income',
      'Simple calculations',
      'Staff independence',
    ],
    cons: [
      'Fixed costs for staff',
      'Less control over pricing',
      'Slower growth',
    ],
  },
  HOURLY: {
    title: 'Hourly Wage',
    description: 'Staff are paid a fixed hourly rate regardless of services',
    example: 'Staff earns $25/hour plus tips',
    pros: ['Predictable staff income', 'Simple payroll', 'Easy to manage'],
    cons: [
      'Higher fixed costs',
      'Less performance incentive',
      'Scaling challenges',
    ],
  },
  HYBRID: {
    title: 'Hybrid Model',
    description: 'Combination of base pay plus commission or bonuses',
    example: 'Base hourly rate plus commission on services above target',
    pros: ['Balanced approach', 'Income security with incentives', 'Flexible'],
    cons: [
      'Complex calculations',
      'Requires careful planning',
      'Higher admin overhead',
    ],
  },
} as const;

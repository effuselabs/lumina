/**
 * Configuration system for customizable seed parameters
 */

import { SeedConfiguration } from './types';

export const DEFAULT_SEED_CONFIG: SeedConfiguration = {
  clients: {
    count: 50,
    demographics: {
      ageRanges: {
        '18-25': 0.15,
        '26-35': 0.25,
        '36-45': 0.25,
        '46-55': 0.2,
        '56-65': 0.1,
        '65+': 0.05,
      },
      genderDistribution: {
        female: 0.7,
        male: 0.25,
        nonBinary: 0.05,
      },
      locationVariety: true,
    },
  },
  staff: {
    count: 8,
    specialties: [
      {
        name: 'Senior Hair Stylist',
        services: [
          'Haircut & Style',
          'Hair Color',
          'Highlights',
          'Balayage',
          'Hair Treatment',
        ],
        employmentType: 'COMMISSION',
        commissionRate: 60,
      },
      {
        name: 'Hair Colorist',
        services: [
          'Hair Color',
          'Highlights',
          'Balayage',
          'Color Correction',
          'Hair Treatment',
        ],
        employmentType: 'COMMISSION',
        commissionRate: 55,
      },
      {
        name: 'Nail Technician',
        services: [
          'Manicure',
          'Pedicure',
          'Gel Manicure',
          'Nail Art',
          'Acrylic Nails',
        ],
        employmentType: 'CHAIR_RENTAL',
        chairRentalRate: 200,
      },
      {
        name: 'Esthetician',
        services: [
          'Facial',
          'Chemical Peel',
          'Microdermabrasion',
          'Eyebrow Shaping',
          'Lash Extensions',
        ],
        employmentType: 'COMMISSION',
        commissionRate: 50,
      },
      {
        name: 'Massage Therapist',
        services: [
          'Swedish Massage',
          'Deep Tissue Massage',
          'Hot Stone Massage',
          'Aromatherapy Massage',
        ],
        employmentType: 'HYBRID',
        commissionRate: 45,
        chairRentalRate: 150,
      },
      {
        name: 'Junior Stylist',
        services: [
          'Haircut & Style',
          'Blowout',
          'Hair Treatment',
          'Eyebrow Shaping',
        ],
        employmentType: 'COMMISSION',
        commissionRate: 45,
      },
      {
        name: 'Lash Specialist',
        services: [
          'Lash Extensions',
          'Lash Lift',
          'Lash Tint',
          'Eyebrow Shaping',
          'Eyebrow Tint',
        ],
        employmentType: 'CHAIR_RENTAL',
        chairRentalRate: 180,
      },
      {
        name: 'Master Stylist',
        services: [
          'Haircut & Style',
          'Hair Color',
          'Highlights',
          'Balayage',
          'Color Correction',
          'Hair Treatment',
        ],
        employmentType: 'COMMISSION',
        commissionRate: 65,
      },
    ],
  },
  services: {
    categories: [
      {
        name: 'Hair',
        services: [
          {
            name: 'Haircut & Style',
            description: 'Professional haircut with wash and style',
            basePrice: 65,
            duration: 60,
          },
          {
            name: 'Hair Color',
            description: 'Full hair coloring service',
            basePrice: 120,
            duration: 120,
          },
          {
            name: 'Highlights',
            description: 'Partial or full highlights',
            basePrice: 95,
            duration: 90,
          },
          {
            name: 'Balayage',
            description: 'Hand-painted highlights for natural look',
            basePrice: 140,
            duration: 150,
          },
          {
            name: 'Color Correction',
            description: 'Fix previous color treatments',
            basePrice: 200,
            duration: 180,
          },
          {
            name: 'Hair Treatment',
            description: 'Deep conditioning and repair treatment',
            basePrice: 45,
            duration: 30,
          },
          {
            name: 'Blowout',
            description: 'Professional wash and blow dry styling',
            basePrice: 35,
            duration: 45,
          },
          {
            name: 'Updo',
            description: 'Special occasion hair styling',
            basePrice: 75,
            duration: 60,
          },
          {
            name: 'Hair Extensions',
            description: 'Temporary or semi-permanent hair extensions',
            basePrice: 250,
            duration: 120,
          },
          {
            name: 'Keratin Treatment',
            description: 'Smoothing and straightening treatment',
            basePrice: 180,
            duration: 150,
          },
          {
            name: 'Perm',
            description: 'Chemical wave or curl treatment',
            basePrice: 90,
            duration: 120,
          },
          {
            name: 'Relaxer',
            description: 'Chemical straightening treatment',
            basePrice: 85,
            duration: 90,
          },
        ],
      },
      {
        name: 'Nails',
        services: [
          {
            name: 'Manicure',
            description: 'Classic manicure with polish',
            basePrice: 35,
            duration: 45,
          },
          {
            name: 'Pedicure',
            description: 'Relaxing pedicure with polish',
            basePrice: 45,
            duration: 60,
          },
          {
            name: 'Gel Manicure',
            description: 'Long-lasting gel manicure',
            basePrice: 50,
            duration: 60,
          },
          {
            name: 'Gel Pedicure',
            description: 'Long-lasting gel pedicure',
            basePrice: 60,
            duration: 75,
          },
          {
            name: 'Acrylic Nails',
            description: 'Full set of acrylic nail extensions',
            basePrice: 70,
            duration: 90,
          },
          {
            name: 'Nail Art',
            description: 'Custom nail art and designs',
            basePrice: 25,
            duration: 30,
          },
          {
            name: 'French Manicure',
            description: 'Classic French tip manicure',
            basePrice: 40,
            duration: 50,
          },
          {
            name: 'Dip Powder Nails',
            description: 'Durable dip powder manicure',
            basePrice: 55,
            duration: 75,
          },
        ],
      },
      {
        name: 'Skincare',
        services: [
          {
            name: 'Facial',
            description: 'Customized facial treatment',
            basePrice: 80,
            duration: 60,
          },
          {
            name: 'Chemical Peel',
            description: 'Exfoliating chemical peel treatment',
            basePrice: 120,
            duration: 45,
          },
          {
            name: 'Microdermabrasion',
            description: 'Diamond-tip skin resurfacing',
            basePrice: 100,
            duration: 60,
          },
          {
            name: 'HydraFacial',
            description: 'Hydrating and exfoliating facial',
            basePrice: 150,
            duration: 60,
          },
          {
            name: 'Anti-Aging Facial',
            description: 'Specialized anti-aging treatment',
            basePrice: 110,
            duration: 75,
          },
          {
            name: 'Acne Treatment',
            description: 'Targeted acne clearing treatment',
            basePrice: 90,
            duration: 60,
          },
        ],
      },
      {
        name: 'Massage',
        services: [
          {
            name: 'Swedish Massage',
            description: 'Relaxing full-body massage',
            basePrice: 90,
            duration: 60,
          },
          {
            name: 'Deep Tissue Massage',
            description: 'Therapeutic deep tissue massage',
            basePrice: 110,
            duration: 60,
          },
          {
            name: 'Hot Stone Massage',
            description: 'Massage with heated stones',
            basePrice: 130,
            duration: 75,
          },
          {
            name: 'Aromatherapy Massage',
            description: 'Massage with essential oils',
            basePrice: 100,
            duration: 60,
          },
        ],
      },
      {
        name: 'Lashes',
        services: [
          {
            name: 'Lash Extensions',
            description: 'Individual lash extensions',
            basePrice: 120,
            duration: 120,
          },
          {
            name: 'Lash Lift',
            description: 'Natural lash lifting and curling',
            basePrice: 65,
            duration: 60,
          },
          {
            name: 'Lash Tint',
            description: 'Lash tinting service',
            basePrice: 25,
            duration: 30,
          },
          {
            name: 'Lash Fill',
            description: 'Lash extension maintenance',
            basePrice: 80,
            duration: 90,
          },
        ],
      },
      {
        name: 'Brows',
        services: [
          {
            name: 'Eyebrow Shaping',
            description: 'Professional eyebrow shaping',
            basePrice: 25,
            duration: 30,
          },
          {
            name: 'Eyebrow Tint',
            description: 'Eyebrow tinting service',
            basePrice: 20,
            duration: 20,
          },
          {
            name: 'Microblading',
            description: 'Semi-permanent eyebrow tattooing',
            basePrice: 350,
            duration: 150,
          },
          {
            name: 'Brow Lamination',
            description: 'Eyebrow setting and shaping treatment',
            basePrice: 55,
            duration: 45,
          },
        ],
      },
    ],
    packages: [
      {
        name: 'Bridal Package',
        description: 'Complete bridal beauty package',
        serviceIds: [
          'haircut-style',
          'updo',
          'facial',
          'manicure',
          'eyebrow-shaping',
        ],
        discountPercentage: 15,
        duration: 240,
      },
      {
        name: 'Spa Day Package',
        description: 'Full day of relaxation and beauty',
        serviceIds: ['facial', 'swedish-massage', 'manicure', 'pedicure'],
        discountPercentage: 12,
        duration: 180,
      },
      {
        name: 'Hair Transformation',
        description: 'Complete hair makeover package',
        serviceIds: ['haircut-style', 'hair-color', 'hair-treatment'],
        discountPercentage: 10,
        duration: 210,
      },
      {
        name: 'Nail Care Deluxe',
        description: 'Premium nail care package',
        serviceIds: ['gel-manicure', 'gel-pedicure', 'nail-art'],
        discountPercentage: 8,
        duration: 165,
      },
      {
        name: 'Glow Up Package',
        description: 'Complete beauty refresh',
        serviceIds: ['facial', 'eyebrow-shaping', 'lash-tint', 'manicure'],
        discountPercentage: 10,
        duration: 135,
      },
    ],
  },
  appointments: {
    historicalMonths: 6,
    patternsConfig: {
      peakHours: [10, 11, 14, 15, 16, 17], // 10am-11am, 2pm-5pm
      peakDays: [4, 5, 6], // Thursday, Friday, Saturday (0 = Sunday)
      seasonalVariations: [
        { months: [11, 12], multiplier: 1.3 }, // Holiday season
        { months: [5, 6], multiplier: 1.2 }, // Wedding season
        { months: [1, 2], multiplier: 0.8 }, // Post-holiday slowdown
      ],
      statusDistribution: {
        completed: 0.85,
        cancelled: 0.1,
        noShow: 0.03,
        rescheduled: 0.02,
      },
    },
  },
  financial: {
    paymentMethods: {
      cash: 0.25,
      card: 0.6,
      digital: 0.1,
      other: 0.05,
    },
    transactionTypes: {
      tips: {
        averagePercentage: 18,
        range: [10, 25],
      },
      refunds: {
        percentage: 0.02,
      },
      deposits: {
        percentage: 0.15,
      },
    },
  },
};

/**
 * Load seed configuration from environment or use defaults
 */
export function loadSeedConfig(): SeedConfiguration {
  // In the future, this could load from environment variables or config files
  // For now, return the default configuration
  return DEFAULT_SEED_CONFIG;
}

/**
 * Validate seed configuration
 */
export function validateSeedConfig(config: SeedConfiguration): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate client demographics sum to 1.0
  const ageRangeSum = Object.values(
    config.clients.demographics.ageRanges
  ).reduce((sum, val) => sum + val, 0);
  if (Math.abs(ageRangeSum - 1.0) > 0.01) {
    errors.push(`Age range distribution must sum to 1.0, got ${ageRangeSum}`);
  }

  const genderSum = Object.values(
    config.clients.demographics.genderDistribution
  ).reduce((sum, val) => sum + val, 0);
  if (Math.abs(genderSum - 1.0) > 0.01) {
    errors.push(`Gender distribution must sum to 1.0, got ${genderSum}`);
  }

  // Validate appointment status distribution
  const statusSum = Object.values(
    config.appointments.patternsConfig.statusDistribution
  ).reduce((sum, val) => sum + val, 0);
  if (Math.abs(statusSum - 1.0) > 0.01) {
    errors.push(
      `Appointment status distribution must sum to 1.0, got ${statusSum}`
    );
  }

  // Validate payment method distribution
  const paymentSum = Object.values(config.financial.paymentMethods).reduce(
    (sum, val) => sum + val,
    0
  );
  if (Math.abs(paymentSum - 1.0) > 0.01) {
    errors.push(
      `Payment method distribution must sum to 1.0, got ${paymentSum}`
    );
  }

  // Validate staff count
  if (config.staff.count < 1 || config.staff.count > 20) {
    errors.push(
      `Staff count must be between 1 and 20, got ${config.staff.count}`
    );
  }

  // Validate client count
  if (config.clients.count < 10 || config.clients.count > 1000) {
    errors.push(
      `Client count must be between 10 and 1000, got ${config.clients.count}`
    );
  }

  // Validate historical months
  if (
    config.appointments.historicalMonths < 1 ||
    config.appointments.historicalMonths > 24
  ) {
    errors.push(
      `Historical months must be between 1 and 24, got ${config.appointments.historicalMonths}`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get configuration for specific environment
 */
export function getEnvironmentConfig(
  env: 'development' | 'testing' | 'demo'
): Partial<SeedConfiguration> {
  switch (env) {
    case 'development':
      return {
        clients: {
          count: 25,
          demographics: DEFAULT_SEED_CONFIG.clients.demographics,
        },
        staff: {
          count: 6,
          specialties: DEFAULT_SEED_CONFIG.staff.specialties.slice(0, 6),
        },
        appointments: {
          historicalMonths: 3,
          patternsConfig: DEFAULT_SEED_CONFIG.appointments.patternsConfig,
        },
      };

    case 'testing':
      return {
        clients: {
          count: 10,
          demographics: DEFAULT_SEED_CONFIG.clients.demographics,
        },
        staff: {
          count: 3,
          specialties: DEFAULT_SEED_CONFIG.staff.specialties.slice(0, 3),
        },
        appointments: {
          historicalMonths: 1,
          patternsConfig: DEFAULT_SEED_CONFIG.appointments.patternsConfig,
        },
      };

    case 'demo':
    default:
      return DEFAULT_SEED_CONFIG;
  }
}

/**
 * Merge configuration with environment overrides
 */
export function mergeConfigs(
  base: SeedConfiguration,
  override: Partial<SeedConfiguration>
): SeedConfiguration {
  return {
    clients: { ...base.clients, ...override.clients },
    staff: { ...base.staff, ...override.staff },
    services: { ...base.services, ...override.services },
    appointments: { ...base.appointments, ...override.appointments },
    financial: { ...base.financial, ...override.financial },
  };
}

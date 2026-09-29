/**
 * Core types and interfaces for data factories
 */

export interface SeedConfiguration {
  clients: {
    count: number;
    demographics: DemographicDistribution;
  };
  staff: {
    count: number;
    specialties: StaffSpecialty[];
  };
  services: {
    categories: ServiceCategory[];
    packages: ServicePackage[];
  };
  appointments: {
    historicalMonths: number;
    patternsConfig: BookingPatterns;
  };
  financial: {
    paymentMethods: PaymentMethodDistribution;
    transactionTypes: TransactionTypeConfig;
  };
}

export interface DemographicDistribution {
  ageRanges: {
    '18-25': number;
    '26-35': number;
    '36-45': number;
    '46-55': number;
    '56-65': number;
    '65+': number;
  };
  genderDistribution: {
    female: number;
    male: number;
    nonBinary: number;
  };
  locationVariety: boolean;
}

export interface StaffSpecialty {
  name: string;
  services: string[];
  employmentType: 'COMMISSION' | 'CHAIR_RENTAL' | 'HYBRID';
  commissionRate?: number;
  chairRentalRate?: number;
}

export interface ServiceCategory {
  name: string;
  services: ServiceDefinition[];
}

export interface ServiceDefinition {
  name: string;
  description: string;
  basePrice: number;
  duration: number;
  variations?: ServiceVariation[];
  addOns?: ServiceAddOn[];
}

interface ServiceVariation {
  name: string;
  priceModifier: number;
  durationModifier: number;
}

interface ServiceAddOn {
  name: string;
  price: number;
  duration: number;
}

export interface ServicePackage {
  name: string;
  description: string;
  serviceIds: string[];
  discountPercentage: number;
  duration: number;
}

export interface BookingPatterns {
  peakHours: number[];
  peakDays: number[];
  seasonalVariations: SeasonalVariation[];
  statusDistribution: AppointmentStatusDistribution;
}

interface SeasonalVariation {
  months: number[];
  multiplier: number;
}

interface AppointmentStatusDistribution {
  completed: number;
  cancelled: number;
  noShow: number;
  rescheduled: number;
}

export interface PaymentMethodDistribution {
  cash: number;
  card: number;
  digital: number;
  other: number;
}

export interface TransactionTypeConfig {
  tips: {
    averagePercentage: number;
    range: [number, number];
  };
  refunds: {
    percentage: number;
  };
  deposits: {
    percentage: number;
  };
}

export interface BatchProcessingOptions {
  batchSize: number;
  maxConcurrency: number;
  progressCallback?: (processed: number, total: number) => void;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  /** Model/table the error relates to, when the validator can attribute it. */
  entity?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  /** Model/table the warning relates to, when the validator can attribute it. */
  entity?: string;
}

export type AgeRange = '18-25' | '26-35' | '36-45' | '46-55' | '56-65' | '65+';
export type CommunicationMethod = 'EMAIL' | 'SMS' | 'BOTH';
export type BookingSource = 'ONLINE' | 'PHONE' | 'WALK_IN' | 'REFERRAL';
export type LoyaltyTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
export type ExperienceLevel = 'JUNIOR' | 'SENIOR' | 'MASTER';

// Additional client-related types

// Staff-related types

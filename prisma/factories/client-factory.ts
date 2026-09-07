/**
 * ClientFactory - Generates comprehensive client data with demographic diversity and realistic profiles
 */

import { faker } from '@faker-js/faker';
import { Client, PrismaClient } from '@prisma/client';
import { BaseFactory } from './base-factory';
import {
  AgeRange,
  CommunicationMethod,
  DemographicDistribution,
  LoyaltyTier,
  ValidationError,
  ValidationResult,
} from './types';

export interface ClientProfile {
  // Basic Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;

  // Demographics
  ageRange: AgeRange;
  gender: 'female' | 'male' | 'nonBinary';

  // Address
  address: string;
  city: string;
  state: string;
  zipCode: string;

  // Preferences
  preferredStaff?: string[];
  preferredServices?: string[];
  communicationMethod: CommunicationMethod;

  // Client Notes and Special Requests
  notes?: string;
  allergies?: string[];
  specialRequests?: string[];

  // Marketing Preferences
  emailMarketing: boolean;
  smsMarketing: boolean;

  // Loyalty Information
  loyaltyTier: LoyaltyTier;
  loyaltyPoints: number;

  // Visit History Metadata (for generating realistic patterns)
  visitFrequency:
    'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'occasional';
  averageSpend: number;
  firstVisitDate: Date;
  lastVisitDate?: Date;
  totalVisits: number;
}

export interface ClientFactoryOptions {
  demographics?: Partial<DemographicDistribution>;
  includeInactiveClients?: boolean;
  averageVisitsPerClient?: number;
  historicalMonths?: number;
}

export class ClientFactory extends BaseFactory<Client> {
  private staffIds: string[] = [];
  private serviceIds: string[] = [];
  private demographics: DemographicDistribution;

  constructor(
    prisma: PrismaClient,
    businessId: string,
    demographics: DemographicDistribution
  ) {
    super(prisma, businessId);
    this.demographics = demographics;
  }

  /**
   * Initialize factory with business context
   */
  async initialize(): Promise<void> {
    // Load available staff and services for preferences
    const staff = await this.prisma.staff.findMany({
      where: { businessId: this.businessId, isActive: true },
      select: { id: true },
    });

    const services = await this.prisma.service.findMany({
      where: { businessId: this.businessId, isActive: true },
      select: { id: true },
    });

    this.staffIds = staff.map(s => s.id);
    this.serviceIds = services.map(s => s.id);
  }

  /**
   * Generate a single client with comprehensive profile
   */
  async generate(options?: ClientFactoryOptions): Promise<Client> {
    const profile = this.generateClientProfile(options);
    const clientData = this.profileToClientData(profile);

    const validation = this.validate(clientData);
    if (!validation.isValid) {
      throw new Error(
        `Client validation failed: ${validation.errors.map(e => e.message).join(', ')}`
      );
    }

    try {
      const client = await this.prisma.client.create({
        data: clientData,
      });

      return client;
    } catch (error) {
      console.error('Failed to create client:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive client profile with realistic data
   */
  private generateClientProfile(options?: ClientFactoryOptions): ClientProfile {
    const { firstName, lastName } = this.generatePersonName();
    const email = this.generateEmail(firstName, lastName);
    const phone = this.generatePhone();
    const address = this.generateAddress();

    // Generate demographics based on distribution
    const ageRange = this.generateAgeRange();
    const gender = this.generateGender();

    // Generate preferences
    const communicationMethod = this.generateCommunicationMethod();
    const preferredStaff = this.generatePreferredStaff();
    const preferredServices = this.generatePreferredServices();

    // Generate client notes and special considerations
    const notes = this.generateClientNotes();
    const allergies = this.generateAllergies();
    const specialRequests = this.generateSpecialRequests();

    // Generate marketing preferences
    const { emailMarketing, smsMarketing } =
      this.generateMarketingPreferences(communicationMethod);

    // Generate loyalty information
    const loyaltyTier = this.generateLoyaltyTier();
    const loyaltyPoints = this.generateLoyaltyPoints(loyaltyTier);

    // Generate visit patterns
    const visitFrequency = this.generateVisitFrequency();
    const averageSpend = this.generateAverageSpend(ageRange, loyaltyTier);
    const { firstVisitDate, lastVisitDate, totalVisits } =
      this.generateVisitHistory(visitFrequency, options?.historicalMonths || 6);

    return {
      firstName,
      lastName,
      email,
      phone,
      ageRange,
      gender,
      address: address.address,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      preferredStaff,
      preferredServices,
      communicationMethod,
      notes,
      allergies,
      specialRequests,
      emailMarketing,
      smsMarketing,
      loyaltyTier,
      loyaltyPoints,
      visitFrequency,
      averageSpend,
      firstVisitDate,
      lastVisitDate,
      totalVisits,
    };
  }

  /**
   * Generate age range based on demographic distribution
   */
  private generateAgeRange(): AgeRange {
    const ageRanges = Object.keys(this.demographics.ageRanges) as AgeRange[];
    const weights = Object.values(this.demographics.ageRanges);
    return this.weightedRandom(ageRanges, weights);
  }

  /**
   * Generate gender based on demographic distribution
   */
  private generateGender(): 'female' | 'male' | 'nonBinary' {
    const genders: ('female' | 'male' | 'nonBinary')[] = [
      'female',
      'male',
      'nonBinary',
    ];
    const weights = [
      this.demographics.genderDistribution.female,
      this.demographics.genderDistribution.male,
      this.demographics.genderDistribution.nonBinary,
    ];
    return this.weightedRandom(genders, weights);
  }

  /**
   * Generate communication preferences
   */
  private generateCommunicationMethod(): CommunicationMethod {
    const methods: CommunicationMethod[] = ['EMAIL', 'SMS', 'BOTH'];
    const weights = [0.3, 0.2, 0.5]; // Most prefer both
    return this.weightedRandom(methods, weights);
  }

  /**
   * Generate preferred staff (some clients have preferences, others don't)
   */
  private generatePreferredStaff(): string[] | undefined {
    if (this.staffIds.length === 0) return undefined;

    // 60% of clients have staff preferences
    if (faker.number.float() > 0.6) return undefined;

    // Most clients prefer 1-2 staff members
    const preferredCount = faker.helpers.arrayElement([1, 1, 1, 2, 2, 3]);
    return faker.helpers.arrayElements(this.staffIds, preferredCount);
  }

  /**
   * Generate preferred services
   */
  private generatePreferredServices(): string[] | undefined {
    if (this.serviceIds.length === 0) return undefined;

    // 70% of clients have service preferences
    if (faker.number.float() > 0.7) return undefined;

    // Clients typically prefer 2-5 services
    const preferredCount = faker.helpers.arrayElement([2, 3, 3, 4, 5]);
    return faker.helpers.arrayElements(
      this.serviceIds,
      Math.min(preferredCount, this.serviceIds.length)
    );
  }

  /**
   * Generate realistic client notes
   */
  private generateClientNotes(): string | undefined {
    // 40% of clients have notes
    if (faker.number.float() > 0.4) return undefined;

    const noteTypes = [
      'Prefers natural hair colors and styles',
      'Very punctual, always arrives on time',
      'Likes to chat during appointments',
      'Prefers quiet, relaxing appointments',
      'Regular client since opening',
      'Sensitive to strong fragrances',
      'Prefers appointments in the morning',
      'Likes to try new trends and styles',
      'Prefers shorter appointment times',
      'Very particular about hair texture',
      'Excellent tipper, very appreciative',
      'Brings referrals frequently',
      'Prefers same stylist for consistency',
      'Books appointments well in advance',
      'Flexible with scheduling changes',
    ];

    return faker.helpers.arrayElement(noteTypes);
  }

  /**
   * Generate client allergies
   */
  private generateAllergies(): string[] | undefined {
    // 15% of clients have allergies
    if (faker.number.float() > 0.15) return undefined;

    const commonAllergies = [
      'Sulfates',
      'Parabens',
      'Ammonia',
      'PPD (hair dye)',
      'Formaldehyde',
      'Fragrance',
      'Latex',
      'Nickel',
      'Lanolin',
      'Coconut oil',
    ];

    const allergyCount = faker.helpers.arrayElement([1, 1, 1, 2, 2, 3]);
    return faker.helpers.arrayElements(commonAllergies, allergyCount);
  }

  /**
   * Generate special requests
   */
  private generateSpecialRequests(): string[] | undefined {
    // 25% of clients have special requests
    if (faker.number.float() > 0.25) return undefined;

    const requests = [
      'Organic products only',
      'Cruelty-free products preferred',
      'Vegan products only',
      'Low-chemical treatments',
      'Extra conditioning treatment',
      'Scalp massage included',
      'Blow-dry style to last longer',
      'Color touch-up between appointments',
      'Eyebrow trim with haircut',
      'Beard trim included',
      'Hot towel treatment',
      'Paraffin hand treatment',
    ];

    const requestCount = faker.helpers.arrayElement([1, 1, 2, 2, 3]);
    return faker.helpers.arrayElements(requests, requestCount);
  }

  /**
   * Generate marketing preferences based on communication method
   */
  private generateMarketingPreferences(
    communicationMethod: CommunicationMethod
  ): {
    emailMarketing: boolean;
    smsMarketing: boolean;
  } {
    let emailMarketing = true;
    let smsMarketing = true;

    // Base opt-in rates
    const emailOptInRate = 0.75;
    const smsOptInRate = 0.65;

    switch (communicationMethod) {
      case 'EMAIL':
        emailMarketing = faker.number.float() < emailOptInRate;
        smsMarketing = faker.number.float() < smsOptInRate * 0.5; // Lower SMS opt-in for email-preferred
        break;
      case 'SMS':
        emailMarketing = faker.number.float() < emailOptInRate * 0.6; // Lower email opt-in for SMS-preferred
        smsMarketing = faker.number.float() < smsOptInRate;
        break;
      case 'BOTH':
        emailMarketing = faker.number.float() < emailOptInRate;
        smsMarketing = faker.number.float() < smsOptInRate;
        break;
    }

    return { emailMarketing, smsMarketing };
  }

  /**
   * Generate loyalty tier based on client profile
   */
  private generateLoyaltyTier(): LoyaltyTier {
    const tiers: LoyaltyTier[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];
    const weights = [0.4, 0.35, 0.2, 0.05]; // Most clients are Bronze/Silver
    return this.weightedRandom(tiers, weights);
  }

  /**
   * Generate loyalty points based on tier
   */
  private generateLoyaltyPoints(tier: LoyaltyTier): number {
    const pointRanges = {
      BRONZE: [0, 500],
      SILVER: [500, 1500],
      GOLD: [1500, 3000],
      PLATINUM: [3000, 10000],
    };

    const [min, max] = pointRanges[tier];
    return faker.number.int({ min, max });
  }

  /**
   * Generate visit frequency pattern
   */
  private generateVisitFrequency():
    'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'occasional' {
    const frequencies = [
      'weekly',
      'biweekly',
      'monthly',
      'quarterly',
      'occasional',
    ] as const;
    const weights = [0.05, 0.15, 0.45, 0.25, 0.1]; // Most clients visit monthly
    return this.weightedRandom([...frequencies], weights);
  }

  /**
   * Generate average spend based on age range and loyalty tier
   */
  private generateAverageSpend(
    ageRange: AgeRange,
    loyaltyTier: LoyaltyTier
  ): number {
    // Base spending by age range
    const ageSpendingBase = {
      '18-25': 80,
      '26-35': 120,
      '36-45': 150,
      '46-55': 140,
      '56-65': 130,
      '65+': 110,
    };

    // Loyalty tier multipliers
    const loyaltyMultipliers = {
      BRONZE: 1.0,
      SILVER: 1.2,
      GOLD: 1.5,
      PLATINUM: 2.0,
    };

    const baseSpend = ageSpendingBase[ageRange];
    const multiplier = loyaltyMultipliers[loyaltyTier];
    const variation = faker.number.float({ min: 0.8, max: 1.3 });

    return Math.round(baseSpend * multiplier * variation);
  }

  /**
   * Generate visit history based on frequency and historical months
   */
  private generateVisitHistory(
    frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'occasional',
    historicalMonths: number
  ): { firstVisitDate: Date; lastVisitDate?: Date; totalVisits: number } {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - historicalMonths);

    // Calculate expected visits based on frequency
    const visitsPerMonth = {
      weekly: 4,
      biweekly: 2,
      monthly: 1,
      quarterly: 0.33,
      occasional: 0.2,
    };

    const expectedVisits = Math.round(
      visitsPerMonth[frequency] * historicalMonths
    );
    const actualVisits = Math.max(
      1,
      Math.round(expectedVisits * faker.number.float({ min: 0.7, max: 1.3 }))
    );

    // Generate first visit date (within the historical period)
    const firstVisitDate = this.generateDateInRange(startDate, now);

    // Generate last visit date (80% of clients have visited recently)
    let lastVisitDate: Date | undefined;
    if (faker.number.float() < 0.8) {
      const recentDate = new Date(now);
      recentDate.setMonth(recentDate.getMonth() - 2); // Within last 2 months
      lastVisitDate = this.generateDateInRange(recentDate, now);
    }

    return {
      firstVisitDate,
      lastVisitDate,
      totalVisits: actualVisits,
    };
  }

  /**
   * Convert client profile to Prisma client data
   */
  private profileToClientData(profile: ClientProfile): any {
    return {
      businessId: this.businessId,
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      phone: profile.phone,
      address: profile.address,
      city: profile.city,
      state: profile.state,
      zipCode: profile.zipCode,
      preferredStaff: profile.preferredStaff?.[0], // Prisma schema only supports single preferred staff
      notes: this.formatClientNotes(profile),
      emailMarketing: profile.emailMarketing,
      smsMarketing: profile.smsMarketing,
    };
  }

  /**
   * Format comprehensive client notes
   */
  private formatClientNotes(profile: ClientProfile): string {
    const notes: string[] = [];

    // Add basic notes
    if (profile.notes) {
      notes.push(profile.notes);
    }

    // Add allergies
    if (profile.allergies && profile.allergies.length > 0) {
      notes.push(`Allergies: ${profile.allergies.join(', ')}`);
    }

    // Add special requests
    if (profile.specialRequests && profile.specialRequests.length > 0) {
      notes.push(`Special requests: ${profile.specialRequests.join(', ')}`);
    }

    // Add demographic info for context
    notes.push(
      `Age range: ${profile.ageRange}, Loyalty: ${profile.loyaltyTier} (${profile.loyaltyPoints} pts)`
    );
    notes.push(
      `Visit frequency: ${profile.visitFrequency}, Avg spend: $${profile.averageSpend}`
    );
    notes.push(`Communication: ${profile.communicationMethod}`);

    return notes.join(' | ');
  }

  /**
   * Validate client data before creation
   */
  protected validate(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    // Required fields validation
    if (!data.firstName || data.firstName.trim().length === 0) {
      errors.push({
        field: 'firstName',
        message: 'First name is required',
        code: 'REQUIRED_FIELD',
      });
    }

    if (!data.lastName || data.lastName.trim().length === 0) {
      errors.push({
        field: 'lastName',
        message: 'Last name is required',
        code: 'REQUIRED_FIELD',
      });
    }

    if (!data.businessId) {
      errors.push({
        field: 'businessId',
        message: 'Business ID is required',
        code: 'REQUIRED_FIELD',
      });
    }

    // Email validation
    if (data.email && !this.isValidEmail(data.email)) {
      errors.push({
        field: 'email',
        message: 'Invalid email format',
        code: 'INVALID_FORMAT',
      });
    }

    // Phone validation
    if (data.phone && !this.isValidPhone(data.phone)) {
      errors.push({
        field: 'phone',
        message: 'Invalid phone format',
        code: 'INVALID_FORMAT',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  /**
   * Email validation helper
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Phone validation helper
   */
  private isValidPhone(phone: string): boolean {
    // Basic phone validation - at least 10 digits
    const phoneDigits = phone.replace(/\D/g, '');
    return phoneDigits.length >= 10;
  }

  /**
   * Generate batch of clients with progress tracking
   */
  async generateClients(
    count: number,
    options?: ClientFactoryOptions,
    progressCallback?: (processed: number, total: number) => void
  ): Promise<Client[]> {
    await this.initialize();

    console.log(`Generating ${count} clients with comprehensive profiles...`);

    return this.generateBatch(count, options, {
      batchSize: 25,
      maxConcurrency: 5,
      progressCallback,
    });
  }
}

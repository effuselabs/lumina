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

export interface ServiceVariation {
    name: string;
    priceModifier: number;
    durationModifier: number;
}

export interface ServiceAddOn {
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

export interface SeasonalVariation {
    months: number[];
    multiplier: number;
}

export interface AppointmentStatusDistribution {
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

export interface EnhancedBatchOptions extends BatchProcessingOptions {
    enableMemoryMonitoring?: boolean;
    memoryThresholdMB?: number;
    enableProgressLogging?: boolean;
    logInterval?: number;
    enableRollback?: boolean;
    rollbackOnError?: boolean;
    streamingMode?: boolean;
    connectionPoolSize?: number;
}

export interface BatchOperationResult<T> {
    results: T[];
    totalProcessed: number;
    totalErrors: number;
    duration: number;
    memoryUsage?: MemoryUsageStats;
    errors: BatchError[];
}

export interface BatchError {
    batchIndex: number;
    itemIndex: number;
    error: Error;
    timestamp: Date;
}

export interface MemoryUsageStats {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
}

export interface ProgressTracker {
    startTime: Date;
    totalItems: number;
    processedItems: number;
    currentBatch: number;
    totalBatches: number;
    estimatedTimeRemaining: number;
    itemsPerSecond: number;
    errors: BatchError[];
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
}

export interface ValidationWarning {
    field: string;
    message: string;
    code: string;
}

export interface TimeSlot {
    startTime: Date;
    endTime: Date;
    available: boolean;
}

export interface WorkPattern {
    type: 'FULL_TIME' | 'PART_TIME';
    hoursPerWeek: number;
    preferredDays: number[];
}

export interface ClientPreferences {
    preferredStaff?: string[];
    preferredServices?: string[];
    communicationMethod: 'EMAIL' | 'SMS' | 'BOTH';
    marketingOptIn: boolean;
}

export interface AppointmentBookingData {
    clientId: string;
    staffId: string;
    serviceIds: string[];
    startTime: Date;
    endTime: Date;
    notes?: string;
}

export type AgeRange = '18-25' | '26-35' | '36-45' | '46-55' | '56-65' | '65+';
export type CommunicationMethod = 'EMAIL' | 'SMS' | 'BOTH';
export type BookingSource = 'ONLINE' | 'PHONE' | 'WALK_IN' | 'REFERRAL';
export type LoyaltyTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
export type ExperienceLevel = 'JUNIOR' | 'SENIOR' | 'MASTER';

// Additional client-related types
export interface ClientHistory {
    firstVisit: Date;
    totalVisits: number;
    totalSpent: number;
    averageTicket: number;
    lastVisit: Date;
}

export interface LoyaltyData {
    points: number;
    tier: LoyaltyTier;
    rewards: RewardHistory[];
}

export interface RewardHistory {
    id: string;
    type: string;
    pointsUsed: number;
    dateRedeemed: Date;
    description: string;
}

export interface CommunicationPreferences {
    preferredMethod: CommunicationMethod;
    marketingOptIn: boolean;
    responseRate: number;
}

export interface ClientDemographics {
    ageRange: AgeRange;
    gender: 'female' | 'male' | 'nonBinary';
    location: LocationData;
    preferences: ServicePreferences;
}

export interface LocationData {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates?: {
        latitude: number;
        longitude: number;
    };
}

export interface ServicePreferences {
    preferredServices: string[];
    preferredStaff: string[];
    communicationMethod: CommunicationMethod;
    specialRequests: string[];
    allergies: string[];
}

// Staff-related types
export interface WeeklySchedule {
    monday?: DaySchedule;
    tuesday?: DaySchedule;
    wednesday?: DaySchedule;
    thursday?: DaySchedule;
    friday?: DaySchedule;
    saturday?: DaySchedule;
    sunday?: DaySchedule;
}

export interface DaySchedule {
    startTime: string; // "09:00"
    endTime: string;   // "17:00"
    breakStart?: string;
    breakEnd?: string;
}

export interface StaffExperience {
    level: ExperienceLevel;
    yearsInIndustry: number;
    yearsAtSalon: number;
    previousSalons: number;
    specializations: string[];
}

export interface Certification {
    name: string;
    issuingOrganization: string;
    dateEarned: Date;
    expirationDate?: Date;
    isActive: boolean;
}

export interface TrainingRecord {
    courseName: string;
    provider: string;
    dateCompleted: Date;
    hoursCompleted: number;
    certificateEarned: boolean;
    skillsLearned: string[];
}
/**
 * Staff Factory - Generate enhanced staff profiles with specializations
 */

import { faker } from '@faker-js/faker';
import { EmploymentType, PrismaClient, RentalPeriod, Staff } from '@prisma/client';
import { BaseFactory } from './base-factory';
import { ExperienceLevel, StaffSpecialty, ValidationResult } from './types';

export interface StaffProfile {
    displayName: string;
    title: string;
    bio: string;
    avatar?: string;
    employmentType: EmploymentType;
    commissionRate?: number;
    chairRentalAmount?: number;
    chairRentalPeriod?: RentalPeriod;
    baseSalary?: number;
    startDate: Date;
    workingHours: WeeklySchedule;
    specialties: string[];
    experience: StaffExperience;
    certifications: Certification[];
    trainingHistory: TrainingRecord[];
}

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

export class StaffFactory extends BaseFactory<Staff> {
    private staffSpecialties: StaffSpecialty[];
    private usedNames: Set<string> = new Set();

    constructor(prisma: PrismaClient, businessId: string, specialties: StaffSpecialty[]) {
        super(prisma, businessId);
        this.staffSpecialties = specialties;
    }

    /**
     * Generate a single staff member with enhanced profile
     */
    async generate(options?: {
        specialty?: StaffSpecialty;
        employmentType?: EmploymentType;
        experienceLevel?: ExperienceLevel;
    }): Promise<Staff> {
        // Select specialty (either provided or random)
        const specialty = options?.specialty || faker.helpers.arrayElement(this.staffSpecialties);

        // Generate basic profile
        const profile = this.generateStaffProfile(specialty, options);

        // Validate the profile
        const validation = this.validate(profile);
        if (!validation.isValid) {
            throw new Error(`Staff validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
        }

        // Create user account for staff member
        const user = await this.createStaffUser(profile);

        // Create staff record
        const staff = await this.prisma.staff.create({
            data: {
                businessId: this.businessId,
                userId: user.id,
                displayName: profile.displayName,
                title: profile.title,
                bio: profile.bio,
                avatar: profile.avatar,
                employmentType: profile.employmentType,
                commissionRate: profile.commissionRate,
                chairRentalAmount: profile.chairRentalAmount,
                chairRentalPeriod: profile.chairRentalPeriod,
                baseSalary: profile.baseSalary,
                startDate: profile.startDate,
                workingHours: profile.workingHours,
                isActive: true,
                acceptsOnlineBookings: true,
            },
        });

        console.log(`✅ Created staff member: ${profile.displayName} (${profile.title})`);
        return staff;
    }

    /**
     * Generate comprehensive staff profile
     */
    private generateStaffProfile(
        specialty: StaffSpecialty,
        options?: { employmentType?: EmploymentType; experienceLevel?: ExperienceLevel }
    ): StaffProfile {
        const { firstName, lastName } = this.generateUniquePersonName();
        const displayName = `${firstName} ${lastName}`;

        // Determine employment type
        const employmentType = options?.employmentType ||
            specialty.employmentType as EmploymentType ||
            this.generateEmploymentType();

        // Generate experience level
        const experienceLevel = options?.experienceLevel || this.generateExperienceLevel();

        // Generate employment details based on type
        const employmentDetails = this.generateEmploymentDetails(employmentType, experienceLevel);

        // Generate work schedule
        const workingHours = this.generateWorkSchedule(employmentType, experienceLevel);

        // Generate professional background
        const experience = this.generateStaffExperience(specialty, experienceLevel);
        const certifications = this.generateCertifications(specialty, experience);
        const trainingHistory = this.generateTrainingHistory(specialty, experience);

        return {
            displayName,
            title: this.generateJobTitle(specialty, experienceLevel),
            bio: this.generateStaffBio(specialty, experience),
            employmentType,
            ...employmentDetails,
            startDate: this.generateStartDate(experience.yearsAtSalon),
            workingHours,
            specialties: specialty.services,
            experience,
            certifications,
            trainingHistory,
        };
    }

    /**
     * Generate unique person name to avoid duplicates
     */
    private generateUniquePersonName(): { firstName: string; lastName: string } {
        let attempts = 0;
        let name: { firstName: string; lastName: string };

        do {
            name = this.generatePersonName();
            const fullName = `${name.firstName} ${name.lastName}`;

            if (!this.usedNames.has(fullName)) {
                this.usedNames.add(fullName);
                return name;
            }

            attempts++;
        } while (attempts < 50);

        // If we can't find a unique name after 50 attempts, add a number
        const baseName = `${name!.firstName} ${name!.lastName}`;
        let counter = 1;
        let uniqueName = `${baseName} ${counter}`;

        while (this.usedNames.has(uniqueName)) {
            counter++;
            uniqueName = `${baseName} ${counter}`;
        }

        this.usedNames.add(uniqueName);
        const parts = uniqueName.split(' ');
        return {
            firstName: parts[0],
            lastName: parts.slice(1).join(' '),
        };
    }

    /**
     * Generate employment type with realistic distribution
     */
    private generateEmploymentType(): EmploymentType {
        return this.weightedRandom(
            ['COMMISSION', 'CHAIR_RENTAL', 'HYBRID'],
            [60, 25, 15] // 60% commission, 25% chair rental, 15% hybrid
        ) as EmploymentType;
    }

    /**
     * Generate experience level
     */
    private generateExperienceLevel(): ExperienceLevel {
        return this.weightedRandom(
            ['JUNIOR', 'SENIOR', 'MASTER'],
            [30, 50, 20] // 30% junior, 50% senior, 20% master
        ) as ExperienceLevel;
    }

    /**
     * Generate employment details based on type and experience
     */
    private generateEmploymentDetails(employmentType: EmploymentType, experienceLevel: ExperienceLevel) {
        const details: Partial<StaffProfile> = {};

        switch (employmentType) {
            case 'COMMISSION':
                details.commissionRate = this.generateCommissionRate(experienceLevel);
                details.baseSalary = faker.datatype.boolean(0.3) ? this.generateBaseSalary() : undefined;
                break;

            case 'CHAIR_RENTAL':
                details.chairRentalAmount = this.generateChairRentalAmount(experienceLevel);
                details.chairRentalPeriod = this.generateRentalPeriod();
                break;

            case 'HYBRID':
                details.commissionRate = this.generateCommissionRate(experienceLevel, true);
                details.chairRentalAmount = this.generateChairRentalAmount(experienceLevel, true);
                details.chairRentalPeriod = this.generateRentalPeriod();
                break;
        }

        return details;
    }

    /**
     * Generate commission rate based on experience level
     */
    private generateCommissionRate(experienceLevel: ExperienceLevel, isHybrid: boolean = false): number {
        const baseRates = {
            JUNIOR: { min: 40, max: 50 },
            SENIOR: { min: 50, max: 60 },
            MASTER: { min: 60, max: 70 },
        };

        const rates = baseRates[experienceLevel];
        let rate = faker.number.int({ min: rates.min, max: rates.max });

        // Hybrid models typically have lower commission rates
        if (isHybrid) {
            rate = Math.max(35, rate - 10);
        }

        return rate;
    }

    /**
     * Generate chair rental amount
     */
    private generateChairRentalAmount(experienceLevel: ExperienceLevel, isHybrid: boolean = false): number {
        const baseAmounts = {
            JUNIOR: { min: 150, max: 200 },
            SENIOR: { min: 180, max: 250 },
            MASTER: { min: 200, max: 300 },
        };

        const amounts = baseAmounts[experienceLevel];
        let amount = faker.number.int({ min: amounts.min, max: amounts.max });

        // Hybrid models typically have lower rental amounts
        if (isHybrid) {
            amount = Math.round(amount * 0.7);
        }

        // Round to nearest $25
        return Math.round(amount / 25) * 25;
    }

    /**
     * Generate rental period
     */
    private generateRentalPeriod(): RentalPeriod {
        return this.weightedRandom(
            ['WEEKLY', 'MONTHLY'],
            [30, 70] // 30% weekly, 70% monthly
        ) as RentalPeriod;
    }

    /**
     * Generate base salary for commission employees
     */
    private generateBaseSalary(): number {
        const amount = faker.number.int({ min: 1500, max: 3000 });
        return Math.round(amount / 100) * 100; // Round to nearest $100
    }

    /**
     * Generate job title based on specialty and experience
     */
    private generateJobTitle(specialty: StaffSpecialty, experienceLevel: ExperienceLevel): string {
        const prefixes = {
            JUNIOR: ['Junior', 'Associate', ''],
            SENIOR: ['Senior', '', 'Lead'],
            MASTER: ['Master', 'Senior', 'Lead'],
        };

        const prefix = faker.helpers.arrayElement(prefixes[experienceLevel]);
        return prefix ? `${prefix} ${specialty.name}` : specialty.name;
    }

    /**
     * Generate work schedule based on employment type and experience
     */
    private generateWorkSchedule(employmentType: EmploymentType, experienceLevel: ExperienceLevel): WeeklySchedule {
        const isFullTime = this.determineFullTimeStatus(employmentType, experienceLevel);

        if (isFullTime) {
            return this.generateFullTimeSchedule();
        } else {
            return this.generatePartTimeSchedule();
        }
    }

    /**
     * Determine if staff member works full-time
     */
    private determineFullTimeStatus(employmentType: EmploymentType, experienceLevel: ExperienceLevel): boolean {
        // Chair rental and hybrid are more likely to be part-time
        if (employmentType === 'CHAIR_RENTAL') {
            return faker.datatype.boolean(0.4); // 40% full-time
        }

        if (employmentType === 'HYBRID') {
            return faker.datatype.boolean(0.6); // 60% full-time
        }

        // Commission employees more likely to be full-time, especially seniors and masters
        const fullTimeChances = {
            JUNIOR: 0.7,
            SENIOR: 0.85,
            MASTER: 0.95,
        };

        return faker.datatype.boolean(fullTimeChances[experienceLevel]);
    }

    /**
     * Generate full-time schedule (5-6 days, 35-40 hours)
     */
    private generateFullTimeSchedule(): WeeklySchedule {
        const workDays = faker.number.int({ min: 5, max: 6 });
        const allDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

        // Always include peak days (Thursday, Friday, Saturday)
        const guaranteedDays = ['thursday', 'friday', 'saturday'];
        const remainingDays = allDays.filter(day => !guaranteedDays.includes(day));
        const additionalDays = faker.helpers.arrayElements(remainingDays, workDays - 3);

        const selectedDays = [...guaranteedDays, ...additionalDays];
        const schedule: WeeklySchedule = {};

        selectedDays.forEach(day => {
            schedule[day as keyof WeeklySchedule] = this.generateDaySchedule('full');
        });

        return schedule;
    }

    /**
     * Generate part-time schedule (3-4 days, 20-30 hours)
     */
    private generatePartTimeSchedule(): WeeklySchedule {
        const workDays = faker.number.int({ min: 3, max: 4 });

        // Prefer peak days for part-time workers
        const peakDays = ['thursday', 'friday', 'saturday'];
        const otherDays = ['monday', 'tuesday', 'wednesday', 'sunday'];

        // Always include at least 2 peak days
        const selectedPeakDays = faker.helpers.arrayElements(peakDays, Math.min(2, workDays));
        const remainingSlots = workDays - selectedPeakDays.length;
        const selectedOtherDays = remainingSlots > 0 ?
            faker.helpers.arrayElements(otherDays, remainingSlots) : [];

        const selectedDays = [...selectedPeakDays, ...selectedOtherDays];
        const schedule: WeeklySchedule = {};

        selectedDays.forEach(day => {
            schedule[day as keyof WeeklySchedule] = this.generateDaySchedule('part');
        });

        return schedule;
    }

    /**
     * Generate schedule for a single day
     */
    private generateDaySchedule(type: 'full' | 'part'): DaySchedule {
        if (type === 'full') {
            // Full day: 8-9 hours
            const startHour = faker.number.int({ min: 8, max: 10 });
            const endHour = startHour + faker.number.int({ min: 8, max: 9 });

            return {
                startTime: `${startHour.toString().padStart(2, '0')}:00`,
                endTime: `${Math.min(endHour, 19).toString().padStart(2, '0')}:00`,
                breakStart: '12:30',
                breakEnd: '13:30',
            };
        } else {
            // Part day: 4-6 hours
            const isEarlyShift = faker.datatype.boolean(0.6);

            if (isEarlyShift) {
                const startHour = faker.number.int({ min: 9, max: 10 });
                const endHour = startHour + faker.number.int({ min: 4, max: 6 });

                return {
                    startTime: `${startHour.toString().padStart(2, '0')}:00`,
                    endTime: `${Math.min(endHour, 16).toString().padStart(2, '0')}:00`,
                };
            } else {
                const startHour = faker.number.int({ min: 13, max: 14 });
                const endHour = startHour + faker.number.int({ min: 4, max: 6 });

                return {
                    startTime: `${startHour.toString().padStart(2, '0')}:00`,
                    endTime: `${Math.min(endHour, 20).toString().padStart(2, '0')}:00`,
                };
            }
        }
    }

    /**
     * Generate staff experience data
     */
    private generateStaffExperience(specialty: StaffSpecialty, experienceLevel: ExperienceLevel): StaffExperience {
        const experienceRanges = {
            JUNIOR: { industry: [1, 3], salon: [0.5, 2] },
            SENIOR: { industry: [3, 8], salon: [1, 5] },
            MASTER: { industry: [8, 20], salon: [2, 10] },
        };

        const ranges = experienceRanges[experienceLevel];
        const yearsInIndustry = faker.number.float({
            min: ranges.industry[0],
            max: ranges.industry[1],
            fractionDigits: 1
        });

        const yearsAtSalon = faker.number.float({
            min: ranges.salon[0],
            max: Math.min(ranges.salon[1], yearsInIndustry),
            fractionDigits: 1
        });

        const previousSalons = yearsInIndustry > 2 ?
            faker.number.int({ min: 1, max: Math.floor(yearsInIndustry / 2) }) : 0;

        return {
            level: experienceLevel,
            yearsInIndustry,
            yearsAtSalon,
            previousSalons,
            specializations: this.generateSpecializations(specialty, experienceLevel),
        };
    }

    /**
     * Generate specializations based on experience
     */
    private generateSpecializations(specialty: StaffSpecialty, experienceLevel: ExperienceLevel): string[] {
        const baseSpecializations = specialty.services.slice();

        // More experienced staff have more specializations
        const additionalCount = {
            JUNIOR: 0,
            SENIOR: faker.number.int({ min: 1, max: 2 }),
            MASTER: faker.number.int({ min: 2, max: 4 }),
        };

        const additionalSpecializations = [
            'Color Correction',
            'Bridal Styling',
            'Editorial Styling',
            'Texture Specialist',
            'Curly Hair Specialist',
            'Men\'s Grooming',
            'Precision Cutting',
            'Balayage Specialist',
            'Extension Specialist',
            'Chemical Services',
        ];

        const additional = faker.helpers.arrayElements(
            additionalSpecializations,
            additionalCount[experienceLevel]
        );

        return [...baseSpecializations, ...additional];
    }

    /**
     * Generate certifications
     */
    private generateCertifications(specialty: StaffSpecialty, experience: StaffExperience): Certification[] {
        const certificationPool = [
            { name: 'Cosmetology License', org: 'State Board of Cosmetology', required: true },
            { name: 'Advanced Color Theory', org: 'Aveda Institute', required: false },
            { name: 'Balayage Certification', org: 'L\'Oreal Professional', required: false },
            { name: 'Keratin Treatment Specialist', org: 'Brazilian Blowout', required: false },
            { name: 'Bridal Hair Specialist', org: 'Wedding Beauty Association', required: false },
            { name: 'Men\'s Grooming Certification', org: 'American Crew', required: false },
            { name: 'Lash Extension Certification', org: 'NovaLash', required: false },
            { name: 'Microblading Certification', org: 'PhiBrows Academy', required: false },
            { name: 'Nail Technology License', org: 'State Board of Cosmetology', required: false },
            { name: 'Esthetics License', org: 'State Board of Cosmetology', required: false },
        ];

        const certifications: Certification[] = [];

        // Always include required certifications
        const requiredCerts = certificationPool.filter(cert => cert.required);
        requiredCerts.forEach(cert => {
            certifications.push(this.createCertification(cert, experience, true));
        });

        // Add additional certifications based on experience level
        const additionalCertCount = {
            JUNIOR: faker.number.int({ min: 0, max: 2 }),
            SENIOR: faker.number.int({ min: 1, max: 4 }),
            MASTER: faker.number.int({ min: 3, max: 6 }),
        };

        const optionalCerts = certificationPool.filter(cert => !cert.required);
        const selectedOptional = faker.helpers.arrayElements(
            optionalCerts,
            additionalCertCount[experience.level]
        );

        selectedOptional.forEach(cert => {
            certifications.push(this.createCertification(cert, experience, false));
        });

        return certifications;
    }

    /**
     * Create a certification record
     */
    private createCertification(
        cert: { name: string; org: string },
        experience: StaffExperience,
        isRequired: boolean
    ): Certification {
        const yearsAgo = isRequired ?
            experience.yearsInIndustry :
            faker.number.float({ min: 0.5, max: experience.yearsInIndustry });

        const dateEarned = new Date();
        dateEarned.setFullYear(dateEarned.getFullYear() - Math.floor(yearsAgo));

        // Some certifications expire
        const hasExpiration = faker.datatype.boolean(0.3);
        let expirationDate: Date | undefined;
        let isActive = true;

        if (hasExpiration) {
            expirationDate = new Date(dateEarned);
            expirationDate.setFullYear(expirationDate.getFullYear() + faker.number.int({ min: 2, max: 5 }));
            isActive = expirationDate > new Date();
        }

        return {
            name: cert.name,
            issuingOrganization: cert.org,
            dateEarned,
            expirationDate,
            isActive,
        };
    }

    /**
     * Generate training history
     */
    private generateTrainingHistory(specialty: StaffSpecialty, experience: StaffExperience): TrainingRecord[] {
        const trainingPool = [
            { name: 'Advanced Cutting Techniques', provider: 'Vidal Sassoon Academy', hours: 16 },
            { name: 'Color Theory Masterclass', provider: 'Redken Education', hours: 8 },
            { name: 'Balayage Workshop', provider: 'Wella Professionals', hours: 12 },
            { name: 'Client Consultation Skills', provider: 'Beauty Industry Training', hours: 4 },
            { name: 'Chemical Safety Training', provider: 'OSHA Compliance', hours: 6 },
            { name: 'Texture Services Workshop', provider: 'Matrix Education', hours: 10 },
            { name: 'Bridal Styling Intensive', provider: 'Wedding Hair Academy', hours: 20 },
            { name: 'Men\'s Grooming Trends', provider: 'American Crew Education', hours: 8 },
            { name: 'Salon Business Management', provider: 'Professional Beauty Association', hours: 12 },
            { name: 'Customer Service Excellence', provider: 'Service Industry Training', hours: 6 },
        ];

        const trainingCount = {
            JUNIOR: faker.number.int({ min: 2, max: 5 }),
            SENIOR: faker.number.int({ min: 4, max: 8 }),
            MASTER: faker.number.int({ min: 6, max: 12 }),
        };

        const selectedTraining = faker.helpers.arrayElements(
            trainingPool,
            trainingCount[experience.level]
        );

        return selectedTraining.map(training => {
            const yearsAgo = faker.number.float({ min: 0.1, max: experience.yearsInIndustry });
            const dateCompleted = new Date();
            dateCompleted.setFullYear(dateCompleted.getFullYear() - Math.floor(yearsAgo));

            return {
                courseName: training.name,
                provider: training.provider,
                dateCompleted,
                hoursCompleted: training.hours,
                certificateEarned: faker.datatype.boolean(0.8),
                skillsLearned: this.generateSkillsLearned(training.name),
            };
        });
    }

    /**
     * Generate skills learned from training
     */
    private generateSkillsLearned(courseName: string): string[] {
        const skillsMap: Record<string, string[]> = {
            'Advanced Cutting Techniques': ['Precision cutting', 'Layering techniques', 'Texturizing'],
            'Color Theory Masterclass': ['Color wheel theory', 'Tone matching', 'Color correction'],
            'Balayage Workshop': ['Hand-painting technique', 'Color placement', 'Blending'],
            'Client Consultation Skills': ['Active listening', 'Needs assessment', 'Communication'],
            'Chemical Safety Training': ['Product handling', 'Safety protocols', 'Emergency procedures'],
            'Texture Services Workshop': ['Perm techniques', 'Relaxer application', 'Curl patterns'],
            'Bridal Styling Intensive': ['Updo techniques', 'Hair accessories', 'Long-lasting styles'],
            'Men\'s Grooming Trends': ['Fade techniques', 'Beard styling', 'Modern cuts'],
            'Salon Business Management': ['Scheduling', 'Inventory management', 'Staff coordination'],
            'Customer Service Excellence': ['Conflict resolution', 'Upselling', 'Client retention'],
        };

        return skillsMap[courseName] || ['Professional development', 'Industry knowledge'];
    }

    /**
     * Generate staff bio
     */
    private generateStaffBio(specialty: StaffSpecialty, experience: StaffExperience): string {
        const templates = [
            `With ${Math.floor(experience.yearsInIndustry)} years of experience in the beauty industry, I specialize in ${specialty.services.slice(0, 2).join(' and ')}. I'm passionate about helping clients look and feel their best.`,

            `As a ${experience.level.toLowerCase()} ${specialty.name.toLowerCase()}, I bring ${Math.floor(experience.yearsInIndustry)} years of expertise to every appointment. I love creating personalized looks that enhance each client's natural beauty.`,

            `I've been perfecting my craft for ${Math.floor(experience.yearsInIndustry)} years, specializing in ${specialty.services[0].toLowerCase()} and ${specialty.services[1]?.toLowerCase() || 'beauty services'}. My goal is to make every client feel confident and beautiful.`,

            `With extensive training in ${specialty.services.slice(0, 2).join(' and ').toLowerCase()}, I'm dedicated to staying current with the latest trends and techniques. I believe great hair is the best accessory.`,
        ];

        return faker.helpers.arrayElement(templates);
    }

    /**
     * Generate start date based on years at salon
     */
    private generateStartDate(yearsAtSalon: number): Date {
        const startDate = new Date();
        const daysAgo = Math.floor(yearsAtSalon * 365);
        startDate.setDate(startDate.getDate() - daysAgo);
        return startDate;
    }

    /**
     * Create user account for staff member
     */
    private async createStaffUser(profile: StaffProfile) {
        const [firstName, ...lastNameParts] = profile.displayName.split(' ');
        const lastName = lastNameParts.join(' ');
        const email = this.generateEmail(firstName, lastName);

        return await this.prisma.user.create({
            data: {
                email,
                name: profile.displayName,
                role: 'STAFF',
            },
        });
    }

    /**
     * Validate staff profile data
     */
    protected validate(data: StaffProfile): ValidationResult {
        const errors: any[] = [];
        const warnings: any[] = [];

        // Validate required fields
        if (!data.displayName?.trim()) {
            errors.push({ field: 'displayName', message: 'Display name is required', code: 'REQUIRED' });
        }

        if (!data.title?.trim()) {
            errors.push({ field: 'title', message: 'Title is required', code: 'REQUIRED' });
        }

        if (!data.employmentType) {
            errors.push({ field: 'employmentType', message: 'Employment type is required', code: 'REQUIRED' });
        }

        // Validate employment type specific fields
        if (data.employmentType === 'COMMISSION' && !data.commissionRate) {
            errors.push({ field: 'commissionRate', message: 'Commission rate required for commission employees', code: 'REQUIRED' });
        }

        if ((data.employmentType === 'CHAIR_RENTAL' || data.employmentType === 'HYBRID') && !data.chairRentalAmount) {
            errors.push({ field: 'chairRentalAmount', message: 'Chair rental amount required for rental employees', code: 'REQUIRED' });
        }

        // Validate ranges
        if (data.commissionRate && (data.commissionRate < 0 || data.commissionRate > 100)) {
            errors.push({ field: 'commissionRate', message: 'Commission rate must be between 0 and 100', code: 'RANGE' });
        }

        if (data.chairRentalAmount && data.chairRentalAmount < 0) {
            errors.push({ field: 'chairRentalAmount', message: 'Chair rental amount must be positive', code: 'RANGE' });
        }

        // Validate schedule
        if (!data.workingHours || Object.keys(data.workingHours).length === 0) {
            errors.push({ field: 'workingHours', message: 'Working hours must be specified', code: 'REQUIRED' });
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }
}
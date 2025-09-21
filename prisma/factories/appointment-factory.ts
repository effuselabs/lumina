/**
 * AppointmentFactory - Generate 6+ months of historical appointment data with realistic booking patterns
 */

import { faker } from '@faker-js/faker';
import { Appointment, AppointmentStatus, PrismaClient } from '@prisma/client';
import { BaseFactory } from './base-factory';
import {
    BookingPatterns,
    BookingSource,
    ValidationResult
} from './types';

export interface AppointmentProfile {
    clientId: string;
    staffId: string;
    serviceIds: string[];
    startTime: Date;
    endTime: Date;
    status: AppointmentStatus;
    bookingSource: BookingSource;
    clientName?: string;
    clientEmail?: string;
    clientPhone?: string;
    notes?: string;
    internalNotes?: string;
    depositAmount?: number;
    depositPaid: boolean;
    leadTime: number; // Days between booking and appointment
    modifications: AppointmentModification[];
}

export interface AppointmentModification {
    type: 'RESCHEDULE' | 'CANCEL' | 'SERVICE_CHANGE' | 'TIME_CHANGE';
    originalValue: string;
    newValue: string;
    modifiedAt: Date;
    reason?: string;
}

export interface AppointmentFactoryOptions {
    startDate?: Date;
    endDate?: Date;
    patterns?: Partial<BookingPatterns>;
    includeWalkIns?: boolean;
    targetCount?: number;
}

export class AppointmentFactory extends BaseFactory<Appointment> {
    private clients: Array<{ id: string; firstName: string; lastName: string; email: string | null; phone: string | null }> = [];
    private staff: Array<{ id: string; displayName: string; workingHours: any }> = [];
    private services: Array<{ id: string; name: string; duration: number; price: any; category: string | null }> = [];
    private patterns: BookingPatterns;

    constructor(prisma: PrismaClient, businessId: string, patterns: BookingPatterns) {
        super(prisma, businessId);
        this.patterns = patterns;
    }

    /**
     * Initialize factory with business context
     */
    async initialize(): Promise<void> {
        console.log('🔧 Initializing AppointmentFactory...');

        // Load clients
        const clientsData = await this.prisma.client.findMany({
            where: { businessId: this.businessId },
            select: { id: true, firstName: true, lastName: true, email: true, phone: true }
        });

        this.clients = clientsData;
        console.log(`  Loaded ${this.clients.length} clients`);

        // Load staff with working hours
        const staffData = await this.prisma.staff.findMany({
            where: { businessId: this.businessId, isActive: true },
            select: { id: true, displayName: true, workingHours: true }
        });

        this.staff = staffData;
        console.log(`  Loaded ${this.staff.length} staff members`);

        // Load services
        const servicesData = await this.prisma.service.findMany({
            where: { businessId: this.businessId, isActive: true },
            select: { id: true, name: true, duration: true, price: true, category: true }
        });

        this.services = servicesData.map(service => ({
            ...service,
            price: Number(service.price) // Convert Decimal to number
        }));
        console.log(`  Loaded ${this.services.length} services`);

        if (this.clients.length === 0 || this.staff.length === 0 || this.services.length === 0) {
            throw new Error('Cannot generate appointments without clients, staff, and services');
        }

        console.log('✅ AppointmentFactory initialized');
    }

    /**
     * Generate a single appointment with realistic patterns
     */
    async generate(options?: AppointmentFactoryOptions): Promise<Appointment> {
        const profile = this.generateAppointmentProfile(options);
        const appointmentData = this.profileToAppointmentData(profile);

        const validation = this.validate(appointmentData);
        if (!validation.isValid) {
            throw new Error(`Appointment validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
        }

        try {
            // Create appointment
            const appointment = await this.prisma.appointment.create({
                data: appointmentData
            });

            // Create appointment services
            await this.createAppointmentServices(appointment.id, profile.serviceIds);

            return appointment;
        } catch (error) {
            console.error('Failed to create appointment:', error);
            throw error;
        }
    }

    /**
     * Generate comprehensive appointment profile with realistic data
     */
    private generateAppointmentProfile(options?: AppointmentFactoryOptions): AppointmentProfile {
        // Select client and staff
        const client = faker.helpers.arrayElement(this.clients);
        const staff = faker.helpers.arrayElement(this.staff);

        // Generate appointment date within the specified range
        const appointmentDate = this.generateAppointmentDate(options);

        // Generate appointment time based on staff schedule and peak hours
        const { startTime, endTime } = this.generateAppointmentTime(appointmentDate, staff);

        // Select services based on realistic combinations
        const serviceIds = this.generateServiceCombination();

        // Generate appointment status based on distribution
        const status = this.generateAppointmentStatus();

        // Generate booking details
        const bookingSource = this.generateBookingSource();
        const leadTime = this.generateLeadTime(bookingSource, appointmentDate);

        // Generate notes and special considerations
        const notes = this.generateAppointmentNotes();
        const internalNotes = this.generateInternalNotes(status);

        // Generate deposit information
        const { depositAmount, depositPaid } = this.generateDepositInfo(serviceIds, status);

        // Generate modifications for rescheduled appointments
        const modifications = status === 'SCHEDULED' ? [] : this.generateAppointmentModifications(status);

        return {
            clientId: client.id,
            staffId: staff.id,
            serviceIds,
            startTime,
            endTime,
            status,
            bookingSource,
            notes,
            internalNotes,
            depositAmount,
            depositPaid,
            leadTime,
            modifications
        };
    }

    /**
     * Generate appointment date with seasonal variations
     */
    private generateAppointmentDate(options?: AppointmentFactoryOptions): Date {
        const now = new Date();
        const startDate = options?.startDate || new Date(now.getFullYear(), 0, 1); // January 1st
        const endDate = options?.endDate || now;

        // Apply seasonal variations
        let targetDate = this.generateDateInRange(startDate, endDate);

        // Bias towards peak days (Thursday, Friday, Saturday)
        const dayOfWeek = targetDate.getDay();
        if (!this.patterns.peakDays.includes(dayOfWeek)) {
            // 70% chance to move to a peak day
            if (faker.number.float() < 0.7) {
                const peakDay = faker.helpers.arrayElement(this.patterns.peakDays);
                const daysToAdd = (peakDay - dayOfWeek + 7) % 7;
                targetDate.setDate(targetDate.getDate() + daysToAdd);

                // Ensure we don't go beyond the end date
                if (targetDate > endDate) {
                    targetDate.setDate(targetDate.getDate() - 7);
                }
            }
        }

        return targetDate;
    }

    /**
     * Generate appointment time based on staff schedule and peak hours
     */
    private generateAppointmentTime(
        date: Date,
        staff: { id: string; displayName: string; workingHours: any }
    ): { startTime: Date; endTime: Date } {
        const dayName = this.getDayName(date.getDay());
        const staffSchedule = staff.workingHours?.[dayName];

        let startHour: number;
        let startMinute: number;

        if (staffSchedule && staffSchedule.startTime && staffSchedule.endTime) {
            // Use staff's actual working hours
            const [startHourStr] = staffSchedule.startTime.split(':');
            const [endHourStr] = staffSchedule.endTime.split(':');
            const workStartHour = parseInt(startHourStr);
            const workEndHour = parseInt(endHourStr);

            // Bias towards peak hours within working hours
            const availablePeakHours = this.patterns.peakHours.filter(
                hour => hour >= workStartHour && hour < workEndHour
            );

            if (availablePeakHours.length > 0 && faker.number.float() < 0.6) {
                startHour = faker.helpers.arrayElement(availablePeakHours);
            } else {
                startHour = faker.number.int({ min: workStartHour, max: workEndHour - 1 });
            }
        } else {
            // Default business hours if no staff schedule
            const businessHours = this.patterns.peakHours.length > 0 ? this.patterns.peakHours : [9, 10, 11, 14, 15, 16, 17];
            startHour = faker.helpers.arrayElement(businessHours);
        }

        // Generate realistic appointment times (on the hour, half hour, or quarter hour)
        startMinute = faker.helpers.arrayElement([0, 15, 30, 45]);

        const startTime = new Date(date);
        startTime.setHours(startHour, startMinute, 0, 0);

        // Calculate end time based on service duration (will be updated after service selection)
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + 60); // Default 1 hour, will be adjusted

        return { startTime, endTime };
    }

    /**
     * Generate realistic service combinations
     */
    private generateServiceCombination(): string[] {
        // Most appointments have 1-2 services, some have 3+
        const serviceCount = this.weightedRandom([1, 2, 3, 4], [50, 35, 12, 3]);

        if (serviceCount === 1) {
            return [faker.helpers.arrayElement(this.services).id];
        }

        // For multiple services, prefer complementary combinations
        const selectedServices: string[] = [];
        const availableServices = [...this.services];

        // Start with a primary service
        const primaryService = faker.helpers.arrayElement(availableServices);
        selectedServices.push(primaryService.id);

        // Add complementary services
        for (let i = 1; i < serviceCount; i++) {
            const complementaryServices = this.getComplementaryServices(primaryService, availableServices);
            if (complementaryServices.length > 0) {
                const nextService = faker.helpers.arrayElement(complementaryServices);
                if (!selectedServices.includes(nextService.id)) {
                    selectedServices.push(nextService.id);
                }
            } else {
                // Fallback to any available service
                const remainingServices = availableServices.filter(s => !selectedServices.includes(s.id));
                if (remainingServices.length > 0) {
                    selectedServices.push(faker.helpers.arrayElement(remainingServices).id);
                }
            }
        }

        return selectedServices;
    }

    /**
     * Get services that complement the primary service
     */
    private getComplementaryServices(
        primaryService: { id: string; name: string; category?: string },
        availableServices: Array<{ id: string; name: string; category?: string }>
    ): Array<{ id: string; name: string; category?: string }> {
        const complementaryPairs: Record<string, string[]> = {
            'Hair': ['Hair', 'Brows'],
            'Nails': ['Nails'],
            'Skincare': ['Skincare', 'Brows', 'Lashes'],
            'Massage': ['Skincare'],
            'Lashes': ['Brows', 'Skincare'],
            'Brows': ['Lashes', 'Skincare', 'Hair']
        };

        const primaryCategory = primaryService.category || 'Hair';
        const complementaryCategories = complementaryPairs[primaryCategory] || [primaryCategory];

        return availableServices.filter(service =>
            service.id !== primaryService.id &&
            complementaryCategories.includes(service.category || 'Hair')
        );
    }

    /**
     * Generate appointment status based on distribution
     */
    private generateAppointmentStatus(): AppointmentStatus {
        const statuses: AppointmentStatus[] = ['COMPLETED', 'CANCELLED', 'NO_SHOW', 'SCHEDULED'];
        const weights = [
            this.patterns.statusDistribution.completed,
            this.patterns.statusDistribution.cancelled,
            this.patterns.statusDistribution.noShow,
            this.patterns.statusDistribution.rescheduled
        ];

        const selectedStatus = this.weightedRandom(statuses, weights);

        // Map rescheduled to scheduled (rescheduled appointments become new scheduled appointments)
        return selectedStatus === 'SCHEDULED' ? 'SCHEDULED' : selectedStatus;
    }

    /**
     * Generate booking source
     */
    private generateBookingSource(): BookingSource {
        const sources: BookingSource[] = ['ONLINE', 'PHONE', 'WALK_IN', 'REFERRAL'];
        const weights = [60, 25, 10, 5]; // 60% online, 25% phone, 10% walk-in, 5% referral
        return this.weightedRandom(sources, weights);
    }

    /**
     * Generate lead time (days between booking and appointment)
     */
    private generateLeadTime(source: BookingSource, appointmentDate: Date): number {
        const now = new Date();
        const maxLeadTime = Math.floor((appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        let leadTimeRange: [number, number];

        switch (source) {
            case 'WALK_IN':
                leadTimeRange = [0, 0]; // Same day
                break;
            case 'PHONE':
                leadTimeRange = [1, 14]; // 1-14 days
                break;
            case 'ONLINE':
                leadTimeRange = [2, 21]; // 2-21 days
                break;
            case 'REFERRAL':
                leadTimeRange = [3, 30]; // 3-30 days
                break;
            default:
                leadTimeRange = [1, 14];
        }

        const minLeadTime = Math.min(leadTimeRange[0], maxLeadTime);
        const maxLeadTimeAdjusted = Math.min(leadTimeRange[1], maxLeadTime);

        return faker.number.int({ min: minLeadTime, max: Math.max(minLeadTime, maxLeadTimeAdjusted) });
    }

    /**
     * Generate appointment notes
     */
    private generateAppointmentNotes(): string | undefined {
        // 30% of appointments have notes
        if (faker.number.float() > 0.3) return undefined;

        const noteTypes = [
            'Client requested extra conditioning treatment',
            'First-time client, provided full consultation',
            'Client prefers natural products only',
            'Sensitive scalp, use gentle products',
            'Client running 10 minutes late',
            'Referred by existing client',
            'Special occasion - wedding next week',
            'Client has allergies to certain products',
            'Prefers quiet appointment',
            'Regular client, knows preferences',
            'Client requested specific stylist',
            'Consultation for color correction needed',
            'Client interested in package deals',
            'Rescheduled from previous week',
            'Client prefers morning appointments'
        ];

        return faker.helpers.arrayElement(noteTypes);
    }

    /**
     * Generate internal staff notes
     */
    private generateInternalNotes(status: AppointmentStatus): string | undefined {
        // Only generate internal notes for certain statuses
        if (status === 'COMPLETED' && faker.number.float() < 0.4) {
            const completedNotes = [
                'Client very satisfied with results',
                'Recommended follow-up appointment in 6 weeks',
                'Client purchased retail products',
                'Excellent tip, client very happy',
                'Client booked next appointment before leaving',
                'Used new technique, great results',
                'Client loved the color, wants to maintain',
                'Discussed hair care routine with client'
            ];
            return faker.helpers.arrayElement(completedNotes);
        }

        if (status === 'CANCELLED' && faker.number.float() < 0.6) {
            const cancelledNotes = [
                'Client cancelled due to illness',
                'Emergency cancellation, offered reschedule',
                'Client travelling, will reschedule when back',
                'Cancelled due to weather conditions',
                'Client had scheduling conflict',
                'Cancelled within 24 hours, charged cancellation fee'
            ];
            return faker.helpers.arrayElement(cancelledNotes);
        }

        if (status === 'NO_SHOW' && faker.number.float() < 0.8) {
            const noShowNotes = [
                'Client did not show up, no call',
                'Attempted to contact client, no response',
                'No-show fee applied to account',
                'Client contacted later, family emergency',
                'Frequent no-show, consider policy review'
            ];
            return faker.helpers.arrayElement(noShowNotes);
        }

        return undefined;
    }

    /**
     * Generate deposit information
     */
    private generateDepositInfo(serviceIds: string[], status: AppointmentStatus): {
        depositAmount?: number;
        depositPaid: boolean;
    } {
        // Calculate total service cost
        const totalCost = serviceIds.reduce((sum, serviceId) => {
            const service = this.services.find(s => s.id === serviceId);
            return sum + (service?.price || 0);
        }, 0);

        // 15% of appointments require deposits (high-value services)
        const requiresDeposit = totalCost > 200 || faker.number.float() < 0.15;

        if (!requiresDeposit) {
            return { depositPaid: false };
        }

        const depositAmount = Math.round(totalCost * 0.2); // 20% deposit

        // Deposit payment status based on appointment status
        let depositPaid = false;
        if (status === 'COMPLETED' || status === 'SCHEDULED') {
            depositPaid = faker.number.float() < 0.9; // 90% pay deposits
        } else if (status === 'CANCELLED') {
            depositPaid = faker.number.float() < 0.5; // 50% had paid before cancelling
        }

        return { depositAmount, depositPaid };
    }

    /**
     * Generate appointment modifications for rescheduled appointments
     */
    private generateAppointmentModifications(status: AppointmentStatus): AppointmentModification[] {
        if (status !== 'SCHEDULED') return [];

        // Some scheduled appointments are rescheduled appointments
        if (faker.number.float() > 0.3) return [];

        const modifications: AppointmentModification[] = [];

        const modificationType = faker.helpers.arrayElement(['RESCHEDULE', 'TIME_CHANGE', 'SERVICE_CHANGE']);
        const modifiedAt = faker.date.recent({ days: 7 });

        switch (modificationType) {
            case 'RESCHEDULE':
                modifications.push({
                    type: 'RESCHEDULE',
                    originalValue: faker.date.recent({ days: 14 }).toISOString(),
                    newValue: new Date().toISOString(),
                    modifiedAt,
                    reason: faker.helpers.arrayElement([
                        'Client requested different date',
                        'Staff availability changed',
                        'Client had scheduling conflict',
                        'Weather-related reschedule'
                    ])
                });
                break;

            case 'TIME_CHANGE':
                modifications.push({
                    type: 'TIME_CHANGE',
                    originalValue: '14:00',
                    newValue: '16:00',
                    modifiedAt,
                    reason: 'Client requested later time'
                });
                break;

            case 'SERVICE_CHANGE':
                modifications.push({
                    type: 'SERVICE_CHANGE',
                    originalValue: 'Haircut only',
                    newValue: 'Haircut + Color',
                    modifiedAt,
                    reason: 'Client added color service'
                });
                break;
        }

        return modifications;
    }

    /**
     * Convert appointment profile to Prisma data
     */
    private profileToAppointmentData(profile: AppointmentProfile): any {
        // Calculate actual end time based on service durations
        const totalDuration = profile.serviceIds.reduce((sum, serviceId) => {
            const service = this.services.find(s => s.id === serviceId);
            return sum + (service?.duration || 60);
        }, 0);

        const endTime = new Date(profile.startTime);
        endTime.setMinutes(endTime.getMinutes() + totalDuration);

        return {
            businessId: this.businessId,
            clientId: profile.clientId,
            staffId: profile.staffId,
            startTime: profile.startTime,
            endTime: endTime,
            status: profile.status,
            clientName: profile.clientName,
            clientEmail: profile.clientEmail,
            clientPhone: profile.clientPhone,
            notes: profile.notes,
            internalNotes: profile.internalNotes,
            depositAmount: profile.depositAmount,
            depositPaid: profile.depositPaid
        };
    }

    /**
     * Create appointment services relationships
     */
    private async createAppointmentServices(appointmentId: string, serviceIds: string[]): Promise<void> {
        const appointmentServices = serviceIds.map(serviceId => {
            const service = this.services.find(s => s.id === serviceId);
            if (!service) {
                throw new Error(`Service not found: ${serviceId}`);
            }

            return {
                appointmentId,
                serviceId,
                serviceName: service.name,
                price: service.price,
                duration: service.duration
            };
        });

        await this.prisma.appointmentService.createMany({
            data: appointmentServices
        });
    }

    /**
     * Get day name from day number
     */
    private getDayName(dayNumber: number): string {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return days[dayNumber];
    }

    /**
     * Validate appointment data
     */
    protected validate(data: any): ValidationResult {
        const errors: any[] = [];

        // Required fields
        if (!data.businessId) {
            errors.push({ field: 'businessId', message: 'Business ID is required', code: 'REQUIRED' });
        }

        if (!data.clientId) {
            errors.push({ field: 'clientId', message: 'Client ID is required', code: 'REQUIRED' });
        }

        if (!data.staffId) {
            errors.push({ field: 'staffId', message: 'Staff ID is required', code: 'REQUIRED' });
        }

        if (!data.startTime) {
            errors.push({ field: 'startTime', message: 'Start time is required', code: 'REQUIRED' });
        }

        if (!data.endTime) {
            errors.push({ field: 'endTime', message: 'End time is required', code: 'REQUIRED' });
        }

        // Validate time logic
        if (data.startTime && data.endTime && data.startTime >= data.endTime) {
            errors.push({ field: 'endTime', message: 'End time must be after start time', code: 'INVALID_RANGE' });
        }

        // Validate deposit amount
        if (data.depositAmount && data.depositAmount < 0) {
            errors.push({ field: 'depositAmount', message: 'Deposit amount must be positive', code: 'INVALID_VALUE' });
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings: []
        };
    }

    /**
     * Generate historical appointments for a date range
     */
    async generateHistoricalAppointments(
        startDate: Date,
        endDate: Date,
        targetCount: number,
        progressCallback?: (processed: number, total: number) => void
    ): Promise<Appointment[]> {
        await this.initialize();

        console.log(`Generating ${targetCount} historical appointments from ${startDate.toDateString()} to ${endDate.toDateString()}...`);

        const appointments: Appointment[] = [];
        const options: AppointmentFactoryOptions = { startDate, endDate, targetCount };

        // Generate appointments in batches
        const batchSize = 25;
        const totalBatches = Math.ceil(targetCount / batchSize);

        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            const batchStart = batchIndex * batchSize;
            const batchEnd = Math.min(batchStart + batchSize, targetCount);
            const batchCount = batchEnd - batchStart;

            const batchPromises: Promise<Appointment>[] = [];
            for (let i = 0; i < batchCount; i++) {
                batchPromises.push(this.generate(options));
            }

            try {
                const batchResults = await Promise.all(batchPromises);
                appointments.push(...batchResults);

                if (progressCallback) {
                    progressCallback(appointments.length, targetCount);
                }

                // Small delay between batches
                if (batchIndex < totalBatches - 1) {
                    await this.delay(50);
                }
            } catch (error) {
                console.error(`Error in batch ${batchIndex + 1}:`, error);
                throw error;
            }
        }

        console.log(`✅ Generated ${appointments.length} historical appointments`);
        return appointments;
    }
}
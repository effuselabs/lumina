/**
 * PromotionFactory - Generates promotional codes, seasonal offers, and loyalty rewards
 */

import { faker } from '@faker-js/faker';
import { DiscountType, Promotion, PromotionUsage } from '@prisma/client';
import { BaseFactory } from './base-factory';
import { ValidationError, ValidationResult } from './types';

export interface PromotionConfiguration {
    seasonalPromotions: boolean;
    loyaltyPromotions: boolean;
    newClientPromotions: boolean;
    serviceSpecificPromotions: boolean;
}

export interface PromotionTemplate {
    name: string;
    description: string;
    discountType: DiscountType;
    discountValue: number;
    minimumSpend?: number;
    maximumDiscount?: number;
    usageLimit?: number;
    perClientLimit?: number;
    newClientsOnly: boolean;
    durationDays: number;
    seasonal?: {
        months: number[];
        year?: number;
    };
}

export class PromotionFactory extends BaseFactory<Promotion> {
    private readonly promotionTemplates: PromotionTemplate[] = [
        // New Client Promotions
        {
            name: "New Client Special",
            description: "20% off your first visit",
            discountType: DiscountType.PERCENTAGE,
            discountValue: 20,
            maximumDiscount: 50,
            perClientLimit: 1,
            newClientsOnly: true,
            durationDays: 365
        },
        {
            name: "First Time Discount",
            description: "$25 off your first service over $75",
            discountType: DiscountType.FIXED_AMOUNT,
            discountValue: 25,
            minimumSpend: 75,
            perClientLimit: 1,
            newClientsOnly: true,
            durationDays: 365
        },

        // Seasonal Promotions
        {
            name: "Holiday Glow Special",
            description: "15% off all skincare services",
            discountType: DiscountType.PERCENTAGE,
            discountValue: 15,
            maximumDiscount: 75,
            usageLimit: 100,
            durationDays: 45,
            newClientsOnly: false,
            seasonal: { months: [11, 12] }
        },
        {
            name: "Spring Refresh",
            description: "Buy 2 services, get 1 free",
            discountType: DiscountType.PERCENTAGE,
            discountValue: 33,
            minimumSpend: 150,
            maximumDiscount: 100,
            usageLimit: 50,
            durationDays: 60,
            newClientsOnly: false,
            seasonal: { months: [3, 4, 5] }
        },
        {
            name: "Summer Ready",
            description: "$30 off packages over $200",
            discountType: DiscountType.FIXED_AMOUNT,
            discountValue: 30,
            minimumSpend: 200,
            usageLimit: 75,
            durationDays: 90,
            newClientsOnly: false,
            seasonal: { months: [6, 7, 8] }
        },
        {
            name: "Back to School",
            description: "Student discount - 10% off with valid ID",
            discountType: DiscountType.PERCENTAGE,
            discountValue: 10,
            maximumDiscount: 40,
            durationDays: 120,
            newClientsOnly: false,
            seasonal: { months: [8, 9] }
        },

        // Loyalty & Referral Promotions
        {
            name: "Loyalty Reward",
            description: "$20 off for returning clients",
            discountType: DiscountType.FIXED_AMOUNT,
            discountValue: 20,
            minimumSpend: 80,
            perClientLimit: 4,
            durationDays: 90,
            newClientsOnly: false
        },
        {
            name: "Referral Bonus",
            description: "Refer a friend and both get 15% off",
            discountType: DiscountType.PERCENTAGE,
            discountValue: 15,
            maximumDiscount: 60,
            perClientLimit: 5,
            durationDays: 180,
            newClientsOnly: false
        },

        // Service-Specific Promotions
        {
            name: "Hair Color Special",
            description: "20% off all color services",
            discountType: DiscountType.PERCENTAGE,
            discountValue: 20,
            maximumDiscount: 80,
            usageLimit: 60,
            durationDays: 30,
            newClientsOnly: false
        },
        {
            name: "Mani-Pedi Monday",
            description: "$15 off nail packages on Mondays",
            discountType: DiscountType.FIXED_AMOUNT,
            discountValue: 15,
            minimumSpend: 50,
            usageLimit: 40,
            durationDays: 30,
            newClientsOnly: false
        },
        {
            name: "Facial Friday",
            description: "Buy any facial, get eyebrow shaping free",
            discountType: DiscountType.FIXED_AMOUNT,
            discountValue: 35,
            minimumSpend: 80,
            usageLimit: 30,
            durationDays: 30,
            newClientsOnly: false
        },

        // Special Occasion Promotions
        {
            name: "Mother's Day Special",
            description: "Pamper Mom - 25% off spa packages",
            discountType: DiscountType.PERCENTAGE,
            discountValue: 25,
            minimumSpend: 120,
            maximumDiscount: 100,
            usageLimit: 80,
            durationDays: 14,
            newClientsOnly: false,
            seasonal: { months: [5] }
        },
        {
            name: "Valentine's Day Couples",
            description: "$50 off couples spa packages",
            discountType: DiscountType.FIXED_AMOUNT,
            discountValue: 50,
            minimumSpend: 250,
            usageLimit: 25,
            durationDays: 7,
            newClientsOnly: false,
            seasonal: { months: [2] }
        }
    ];

    async generate(options?: Partial<PromotionConfiguration>): Promise<Promotion> {
        const config = {
            seasonalPromotions: true,
            loyaltyPromotions: true,
            newClientPromotions: true,
            serviceSpecificPromotions: true,
            ...options
        };

        // Select appropriate promotion template
        const template = this.selectPromotionTemplate(config);

        // Generate promotion dates
        const { startDate, endDate } = this.generatePromotionDates(template);

        // Generate promo code (some promotions are automatic, others require codes)
        const code = faker.datatype.boolean({ probability: 0.7 })
            ? this.generatePromoCode(template.name)
            : undefined;

        // Get applicable services if this is service-specific
        const applicableServices = await this.getApplicableServices(template);

        const promotionData = {
            businessId: this.businessId,
            name: template.name,
            description: template.description,
            code: code,
            discountType: template.discountType,
            discountValue: template.discountValue,
            minimumSpend: template.minimumSpend,
            maximumDiscount: template.maximumDiscount,
            startDate: startDate,
            endDate: endDate,
            usageLimit: template.usageLimit,
            usageCount: 0,
            perClientLimit: template.perClientLimit,
            applicableServices: applicableServices,
            newClientsOnly: template.newClientsOnly,
            isActive: true
        };

        const validation = this.validate(promotionData);
        if (!validation.isValid) {
            throw new Error(`Promotion validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
        }

        return await this.prisma.promotion.create({
            data: promotionData
        });
    }

    /**
     * Generate usage history for a promotion
     */
    async generateUsageHistory(promotionId: string): Promise<PromotionUsage[]> {
        const promotion = await this.prisma.promotion.findUnique({
            where: { id: promotionId }
        });

        if (!promotion) {
            throw new Error(`Promotion with ID ${promotionId} not found`);
        }

        const usageHistory: PromotionUsage[] = [];

        // Calculate realistic usage based on promotion type and duration
        const daysSinceStart = Math.max(0,
            (new Date().getTime() - promotion.startDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        const promotionDuration = (promotion.endDate.getTime() - promotion.startDate.getTime()) / (1000 * 60 * 60 * 24);
        const usageRate = this.calculateUsageRate(promotion);

        const expectedUsage = Math.min(
            Math.floor(daysSinceStart * usageRate),
            promotion.usageLimit || 1000
        );

        // Get clients and appointments for realistic usage context
        const clients = await this.prisma.client.findMany({
            where: { businessId: this.businessId }
        });

        const appointments = await this.prisma.appointment.findMany({
            where: {
                businessId: this.businessId,
                startTime: {
                    gte: promotion.startDate,
                    lte: new Date()
                },
                status: 'COMPLETED'
            }
        });

        for (let i = 0; i < expectedUsage; i++) {
            const usageDate = this.generateDateInRange(promotion.startDate, new Date());

            // Find relevant appointment and client
            let appointmentId: string | undefined;
            let clientId: string | undefined;

            const relevantAppointments = appointments.filter(apt => {
                const aptDate = new Date(apt.startTime);
                const daysDiff = Math.abs((aptDate.getTime() - usageDate.getTime()) / (1000 * 60 * 60 * 24));
                return daysDiff <= 1;
            });

            if (relevantAppointments.length > 0) {
                const appointment = faker.helpers.arrayElement(relevantAppointments);
                appointmentId = appointment.id;
                clientId = appointment.clientId || undefined;
            } else if (clients.length > 0) {
                clientId = faker.helpers.arrayElement(clients).id;
            }

            // Calculate discount amount
            const discountAmount = this.calculateDiscountAmount(promotion, 100); // Assume $100 service

            const usageData = {
                promotionId: promotionId,
                appointmentId: appointmentId,
                clientId: clientId,
                discountAmount: discountAmount,
                usedAt: usageDate,
                createdAt: usageDate,
                updatedAt: usageDate
            };

            const usage = await this.prisma.promotionUsage.create({
                data: usageData
            });

            usageHistory.push(usage);
        }

        // Update promotion usage count
        await this.prisma.promotion.update({
            where: { id: promotionId },
            data: { usageCount: expectedUsage }
        });

        return usageHistory;
    }

    /**
     * Generate a complete promotion system
     */
    async generatePromotionSystem(): Promise<{
        promotions: Promotion[];
        usage: PromotionUsage[];
    }> {
        const promotions: Promotion[] = [];
        const usage: PromotionUsage[] = [];

        // Generate 8-12 promotions with different types
        const promotionCount = faker.number.int({ min: 8, max: 12 });

        for (let i = 0; i < promotionCount; i++) {
            const promotion = await this.generate();
            promotions.push(promotion);

            // Generate usage history for active/past promotions
            if (promotion.startDate <= new Date()) {
                const promotionUsage = await this.generateUsageHistory(promotion.id);
                usage.push(...promotionUsage);
            }
        }

        return { promotions, usage };
    }

    private selectPromotionTemplate(config: PromotionConfiguration): PromotionTemplate {
        let availableTemplates = [...this.promotionTemplates];

        // Filter based on configuration
        if (!config.newClientPromotions) {
            availableTemplates = availableTemplates.filter(t => !t.newClientsOnly);
        }

        if (!config.seasonalPromotions) {
            availableTemplates = availableTemplates.filter(t => !t.seasonal);
        }

        return faker.helpers.arrayElement(availableTemplates);
    }

    private generatePromotionDates(template: PromotionTemplate): { startDate: Date; endDate: Date } {
        const now = new Date();

        if (template.seasonal) {
            // Generate seasonal promotion dates
            const currentYear = now.getFullYear();
            const targetYear = faker.helpers.arrayElement([currentYear - 1, currentYear, currentYear + 1]);
            const month = faker.helpers.arrayElement(template.seasonal.months);

            const startDate = new Date(targetYear, month - 1, faker.number.int({ min: 1, max: 15 }));
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + template.durationDays);

            return { startDate, endDate };
        } else {
            // Generate regular promotion dates
            const startDate = faker.date.between({
                from: new Date(now.getFullYear() - 1, 0, 1),
                to: now
            });

            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + template.durationDays);

            return { startDate, endDate };
        }
    }

    private generatePromoCode(promotionName: string): string {
        const words = promotionName.split(' ');
        const prefix = words.map(w => w.substring(0, 2).toUpperCase()).join('');
        const suffix = faker.string.alphanumeric({ length: 3, casing: 'upper' });
        const number = faker.number.int({ min: 10, max: 99 });

        return `${prefix}${number}${suffix}`;
    }

    private async getApplicableServices(template: PromotionTemplate): Promise<string[]> {
        // For service-specific promotions, get relevant service IDs
        if (template.name.toLowerCase().includes('hair') || template.name.toLowerCase().includes('color')) {
            const services = await this.prisma.service.findMany({
                where: {
                    businessId: this.businessId,
                    OR: [
                        { category: { contains: 'Hair', mode: 'insensitive' } },
                        { name: { contains: 'Color', mode: 'insensitive' } },
                        { name: { contains: 'Highlight', mode: 'insensitive' } }
                    ]
                }
            });
            return services.map(s => s.id);
        }

        if (template.name.toLowerCase().includes('nail') || template.name.toLowerCase().includes('mani')) {
            const services = await this.prisma.service.findMany({
                where: {
                    businessId: this.businessId,
                    OR: [
                        { category: { contains: 'Nail', mode: 'insensitive' } },
                        { name: { contains: 'Manicure', mode: 'insensitive' } },
                        { name: { contains: 'Pedicure', mode: 'insensitive' } }
                    ]
                }
            });
            return services.map(s => s.id);
        }

        if (template.name.toLowerCase().includes('facial') || template.name.toLowerCase().includes('skincare')) {
            const services = await this.prisma.service.findMany({
                where: {
                    businessId: this.businessId,
                    OR: [
                        { category: { contains: 'Skincare', mode: 'insensitive' } },
                        { name: { contains: 'Facial', mode: 'insensitive' } }
                    ]
                }
            });
            return services.map(s => s.id);
        }

        // Return empty array for promotions that apply to all services
        return [];
    }

    private calculateUsageRate(promotion: Promotion): number {
        // Calculate daily usage rate based on promotion characteristics
        let baseRate = 0.5; // Base rate of 0.5 uses per day

        // Adjust based on discount value
        if (promotion.discountType === DiscountType.PERCENTAGE) {
            baseRate *= (Number(promotion.discountValue) / 20); // Higher percentage = more usage
        } else {
            baseRate *= (Number(promotion.discountValue) / 25); // Higher dollar amount = more usage
        }

        // Adjust based on promotion type
        if (promotion.newClientsOnly) {
            baseRate *= 0.3; // New client promotions used less frequently
        }

        if (promotion.code) {
            baseRate *= 0.7; // Code-required promotions used less than automatic ones
        }

        if (promotion.minimumSpend) {
            baseRate *= 0.8; // Minimum spend reduces usage
        }

        return Math.max(0.1, Math.min(baseRate, 2.0)); // Cap between 0.1 and 2.0 uses per day
    }

    private calculateDiscountAmount(promotion: Promotion, serviceAmount: number): number {
        let discount = 0;

        if (promotion.discountType === DiscountType.PERCENTAGE) {
            discount = serviceAmount * (Number(promotion.discountValue) / 100);

            if (promotion.maximumDiscount) {
                discount = Math.min(discount, Number(promotion.maximumDiscount));
            }
        } else {
            discount = Number(promotion.discountValue);
        }

        return Math.round(discount * 100) / 100; // Round to 2 decimal places
    }

    protected validate(data: any): ValidationResult {
        const errors: ValidationError[] = [];

        if (!data.name || data.name.trim().length === 0) {
            errors.push({
                field: 'name',
                message: 'Promotion name is required',
                code: 'REQUIRED_FIELD'
            });
        }

        if (data.discountValue <= 0) {
            errors.push({
                field: 'discountValue',
                message: 'Discount value must be greater than 0',
                code: 'INVALID_VALUE'
            });
        }

        if (data.discountType === DiscountType.PERCENTAGE && data.discountValue > 100) {
            errors.push({
                field: 'discountValue',
                message: 'Percentage discount cannot exceed 100%',
                code: 'INVALID_VALUE'
            });
        }

        if (!data.startDate || !data.endDate) {
            errors.push({
                field: 'dates',
                message: 'Start date and end date are required',
                code: 'REQUIRED_FIELD'
            });
        }

        if (data.startDate && data.endDate && data.startDate >= data.endDate) {
            errors.push({
                field: 'dates',
                message: 'End date must be after start date',
                code: 'INVALID_VALUE'
            });
        }

        if (data.minimumSpend && data.minimumSpend < 0) {
            errors.push({
                field: 'minimumSpend',
                message: 'Minimum spend cannot be negative',
                code: 'INVALID_VALUE'
            });
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings: []
        };
    }
}
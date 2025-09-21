/**
 * GiftCardFactory - Generates gift cards with realistic purchase and redemption patterns
 */

import { faker } from '@faker-js/faker';
import { GiftCard, GiftCardRedemption } from '@prisma/client';
import { BaseFactory } from './base-factory';
import { ValidationError, ValidationResult } from './types';

export interface GiftCardConfiguration {
    amounts: number[];
    redemptionRate: number; // Percentage of gift cards that get redeemed
    partialRedemptionRate: number; // Percentage that are partially redeemed
    expiryMonths: number;
}

export class GiftCardFactory extends BaseFactory<GiftCard> {
    private readonly commonAmounts = [25, 50, 75, 100, 150, 200, 250, 300];
    private readonly holidaySeasons = [
        { start: { month: 11, day: 15 }, end: { month: 12, day: 31 } }, // Holiday season
        { start: { month: 2, day: 1 }, end: { month: 2, day: 14 } },   // Valentine's Day
        { start: { month: 5, day: 1 }, end: { month: 5, day: 15 } },   // Mother's Day
        { start: { month: 6, day: 15 }, end: { month: 6, day: 30 } },  // Father's Day
    ];

    async generate(options?: Partial<GiftCardConfiguration>): Promise<GiftCard> {
        const config = {
            amounts: this.commonAmounts,
            redemptionRate: 0.75,
            partialRedemptionRate: 0.4,
            expiryMonths: 12,
            ...options
        };

        // Generate purchase date (weighted toward holiday seasons)
        const purchaseDate = this.generatePurchaseDate();

        // Generate gift card amount
        const amount = faker.helpers.arrayElement(config.amounts);

        // Generate unique code
        const code = this.generateGiftCardCode();

        // Generate purchaser information
        const { firstName, lastName } = this.generatePersonName();
        const purchasedBy = `${firstName} ${lastName}`;

        // Generate recipient information (sometimes same as purchaser)
        const isSelfPurchase = faker.datatype.boolean({ probability: 0.3 });
        let recipientName: string;
        let recipientEmail: string;

        if (isSelfPurchase) {
            recipientName = purchasedBy;
            recipientEmail = this.generateEmail(firstName, lastName);
        } else {
            const recipient = this.generatePersonName();
            recipientName = `${recipient.firstName} ${recipient.lastName}`;
            recipientEmail = this.generateEmail(recipient.firstName, recipient.lastName);
        }

        // Generate gift message
        const message = this.generateGiftMessage();

        // Calculate expiry date
        const expiryDate = new Date(purchaseDate);
        expiryDate.setMonth(expiryDate.getMonth() + config.expiryMonths);

        // Determine current balance based on redemption patterns
        const currentBalance = this.calculateCurrentBalance(amount, purchaseDate, config);

        const giftCardData = {
            businessId: this.businessId,
            code: code,
            initialAmount: amount,
            currentBalance: currentBalance,
            purchasedBy: purchasedBy,
            purchaseDate: purchaseDate,
            recipientName: recipientName,
            recipientEmail: recipientEmail,
            message: message,
            isActive: currentBalance > 0 && new Date() < expiryDate,
            expiryDate: expiryDate
        };

        const validation = this.validate(giftCardData);
        if (!validation.isValid) {
            throw new Error(`Gift card validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
        }

        return await this.prisma.giftCard.create({
            data: giftCardData
        });
    }

    /**
     * Generate redemption history for a gift card
     */
    async generateRedemptions(
        giftCardId: string,
        targetBalance: number
    ): Promise<GiftCardRedemption[]> {
        const giftCard = await this.prisma.giftCard.findUnique({
            where: { id: giftCardId }
        });

        if (!giftCard) {
            throw new Error(`Gift card with ID ${giftCardId} not found`);
        }

        const redemptions: GiftCardRedemption[] = [];
        const totalToRedeem = Number(giftCard.initialAmount) - targetBalance;

        if (totalToRedeem <= 0) {
            return redemptions;
        }

        // Get completed appointments for realistic redemption context
        const appointments = await this.prisma.appointment.findMany({
            where: {
                businessId: this.businessId,
                startTime: {
                    gte: giftCard.purchaseDate,
                    lte: new Date()
                },
                status: 'COMPLETED'
            },
            orderBy: { startTime: 'asc' }
        });

        let remainingToRedeem = totalToRedeem;
        let redemptionDate = new Date(giftCard.purchaseDate);
        redemptionDate.setDate(redemptionDate.getDate() + faker.number.int({ min: 7, max: 90 }));

        // Generate 1-3 redemptions
        const numRedemptions = faker.number.int({ min: 1, max: Math.min(3, Math.ceil(totalToRedeem / 25)) });

        for (let i = 0; i < numRedemptions && remainingToRedeem > 0; i++) {
            // Find appointment around redemption date
            let appointmentId: string | undefined;

            if (appointments.length > 0) {
                const relevantAppointments = appointments.filter(apt => {
                    const aptDate = new Date(apt.startTime);
                    return aptDate >= redemptionDate;
                });

                if (relevantAppointments.length > 0) {
                    const appointment = relevantAppointments[0];
                    appointmentId = appointment.id;
                    redemptionDate = new Date(appointment.startTime);
                }
            }

            // Calculate redemption amount
            let redemptionAmount: number;
            if (i === numRedemptions - 1) {
                // Last redemption - use remaining balance
                redemptionAmount = remainingToRedeem;
            } else {
                // Partial redemption
                const maxRedemption = Math.min(remainingToRedeem, remainingToRedeem * 0.7);
                redemptionAmount = faker.number.float({
                    min: Math.min(25, remainingToRedeem),
                    max: maxRedemption
                });
                redemptionAmount = Math.round(redemptionAmount * 100) / 100; // Round to 2 decimal places
            }

            const redemptionData = {
                giftCardId: giftCardId,
                appointmentId: appointmentId,
                amount: redemptionAmount,
                redeemedBy: giftCard.recipientName,
                redemptionDate: redemptionDate,
                createdAt: redemptionDate,
                updatedAt: redemptionDate
            };

            const redemption = await this.prisma.giftCardRedemption.create({
                data: redemptionData
            });

            redemptions.push(redemption);
            remainingToRedeem -= redemptionAmount;

            // Set next redemption date
            if (i < numRedemptions - 1) {
                redemptionDate = new Date(redemptionDate);
                redemptionDate.setDate(redemptionDate.getDate() + faker.number.int({ min: 14, max: 60 }));
            }
        }

        return redemptions;
    }

    /**
     * Generate a batch of gift cards with realistic patterns
     */
    async generateGiftCardSystem(count: number = 15): Promise<{
        giftCards: GiftCard[];
        redemptions: GiftCardRedemption[];
    }> {
        const giftCards: GiftCard[] = [];
        const redemptions: GiftCardRedemption[] = [];

        for (let i = 0; i < count; i++) {
            const giftCard = await this.generate();
            giftCards.push(giftCard);

            // Generate redemptions if the card has been used
            if (Number(giftCard.currentBalance) < Number(giftCard.initialAmount)) {
                const cardRedemptions = await this.generateRedemptions(
                    giftCard.id,
                    Number(giftCard.currentBalance)
                );
                redemptions.push(...cardRedemptions);
            }
        }

        return { giftCards, redemptions };
    }

    private generatePurchaseDate(): Date {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 12);

        // Check if we should generate a holiday season purchase (higher probability)
        const isHolidayPurchase = faker.datatype.boolean({ probability: 0.4 });

        if (isHolidayPurchase) {
            const season = faker.helpers.arrayElement(this.holidaySeasons);
            const year = faker.number.int({ min: startDate.getFullYear(), max: endDate.getFullYear() });

            const seasonStart = new Date(year, season.start.month - 1, season.start.day);
            const seasonEnd = new Date(year, season.end.month - 1, season.end.day);

            // Make sure the date is within our range
            if (seasonStart >= startDate && seasonEnd <= endDate) {
                return faker.date.between({ from: seasonStart, to: seasonEnd });
            }
        }

        return faker.date.between({ from: startDate, to: endDate });
    }

    private generateGiftCardCode(): string {
        // Generate a code like "GC2024-ABCD-1234"
        const year = new Date().getFullYear();
        const letters = faker.string.alpha({ length: 4, casing: 'upper' });
        const numbers = faker.string.numeric(4);

        return `GC${year}-${letters}-${numbers}`;
    }

    private generateGiftMessage(): string {
        const messages = [
            "Enjoy a relaxing day at the salon!",
            "Treat yourself to something special",
            "Happy Birthday! Hope you love your spa day",
            "Congratulations! You deserve to be pampered",
            "Merry Christmas! Enjoy some self-care time",
            "Happy Mother's Day! Take some time for yourself",
            "Thinking of you - enjoy a day of beauty",
            "Happy Anniversary! Here's to looking fabulous",
            "Get ready to feel amazing!",
            "A little something to make you smile",
            "Hope this brightens your day!",
            "You're worth it - enjoy every moment"
        ];

        return faker.helpers.arrayElement(messages);
    }

    private calculateCurrentBalance(
        initialAmount: number,
        purchaseDate: Date,
        config: GiftCardConfiguration
    ): number {
        const now = new Date();
        const daysSincePurchase = (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24);

        // Cards purchased very recently are likely unused
        if (daysSincePurchase < 7) {
            return initialAmount;
        }

        // Determine if this card has been redeemed
        const isRedeemed = faker.datatype.boolean({ probability: config.redemptionRate });

        if (!isRedeemed) {
            return initialAmount;
        }

        // Determine if it's fully or partially redeemed
        const isPartiallyRedeemed = faker.datatype.boolean({
            probability: config.partialRedemptionRate
        });

        if (!isPartiallyRedeemed) {
            return 0; // Fully redeemed
        }

        // Partially redeemed - return 20-80% of original value
        const remainingPercentage = faker.number.float({ min: 0.2, max: 0.8 });
        const balance = initialAmount * remainingPercentage;

        // Round to nearest dollar for realistic amounts
        return Math.round(balance);
    }

    protected validate(data: any): ValidationResult {
        const errors: ValidationError[] = [];

        if (!data.code || data.code.trim().length === 0) {
            errors.push({
                field: 'code',
                message: 'Gift card code is required',
                code: 'REQUIRED_FIELD'
            });
        }

        if (data.initialAmount <= 0) {
            errors.push({
                field: 'initialAmount',
                message: 'Initial amount must be greater than 0',
                code: 'INVALID_VALUE'
            });
        }

        if (data.currentBalance < 0) {
            errors.push({
                field: 'currentBalance',
                message: 'Current balance cannot be negative',
                code: 'INVALID_VALUE'
            });
        }

        if (data.currentBalance > data.initialAmount) {
            errors.push({
                field: 'currentBalance',
                message: 'Current balance cannot exceed initial amount',
                code: 'INVALID_VALUE'
            });
        }

        if (!data.purchaseDate) {
            errors.push({
                field: 'purchaseDate',
                message: 'Purchase date is required',
                code: 'REQUIRED_FIELD'
            });
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings: []
        };
    }
}
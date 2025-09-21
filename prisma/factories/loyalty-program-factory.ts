/**
 * LoyaltyProgramFactory - Generates loyalty programs with points, tiers, and member transactions
 */

import { faker } from '@faker-js/faker';
import { BaseFactory } from './base-factory';
import { ValidationError, ValidationResult } from './types';

// Define types manually since Prisma client might not be updated
export interface LoyaltyProgram {
    id: string;
    businessId: string;
    name: string;
    description?: string;
    pointsPerDollar: number;
    pointsRedemptionRate: number;
    tiers: any;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface LoyaltyMembership {
    id: string;
    loyaltyProgramId: string;
    clientId: string;
    currentPoints: number;
    totalEarned: number;
    totalRedeemed: number;
    currentTier?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface LoyaltyTransaction {
    id: string;
    loyaltyMembershipId: string;
    appointmentId?: string;
    type: string;
    points: number;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface LoyaltyConfiguration {
    pointsPerDollar: number;
    redemptionRate: number;
    tierSystem: TierConfiguration[];
}

export interface TierConfiguration {
    name: string;
    minPoints: number;
    benefits: string[];
    multiplier: number;
}

export class LoyaltyProgramFactory extends BaseFactory<LoyaltyProgram> {
    private readonly defaultTiers: TierConfiguration[] = [
        {
            name: 'Bronze',
            minPoints: 0,
            benefits: ['Earn 1 point per $1 spent', 'Birthday month discount'],
            multiplier: 1.0
        },
        {
            name: 'Silver',
            minPoints: 500,
            benefits: ['Earn 1.25 points per $1 spent', 'Priority booking', '5% service discount'],
            multiplier: 1.25
        },
        {
            name: 'Gold',
            minPoints: 1500,
            benefits: ['Earn 1.5 points per $1 spent', 'Complimentary add-ons', '10% service discount'],
            multiplier: 1.5
        },
        {
            name: 'Platinum',
            minPoints: 3000,
            benefits: ['Earn 2 points per $1 spent', 'VIP treatment', '15% service discount', 'Free monthly service'],
            multiplier: 2.0
        }
    ];

    async generate(options?: Partial<LoyaltyConfiguration>): Promise<LoyaltyProgram> {
        const config = {
            pointsPerDollar: 1.0,
            redemptionRate: 0.01, // $0.01 per point
            tierSystem: this.defaultTiers,
            ...options
        };

        const programData = {
            businessId: this.businessId,
            name: "Lumina Rewards Program",
            description: "Earn points with every visit and unlock exclusive benefits as you reach new tiers.",
            pointsPerDollar: config.pointsPerDollar,
            pointsRedemptionRate: config.redemptionRate,
            tiers: config.tierSystem,
            isActive: true
        };

        const validation = this.validate(programData);
        if (!validation.isValid) {
            throw new Error(`Loyalty program validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
        }

        try {
            const programId = faker.string.uuid();
            await this.prisma.$executeRaw`
                INSERT INTO loyalty_programs (
                    id, "businessId", name, description, "pointsPerDollar",
                    "pointsRedemptionRate", tiers, "isActive", "createdAt", "updatedAt"
                ) VALUES (
                    ${programId}, ${programData.businessId}, ${programData.name},
                    ${programData.description}, ${programData.pointsPerDollar},
                    ${programData.pointsRedemptionRate}, ${JSON.stringify(programData.tiers)},
                    ${programData.isActive}, NOW(), NOW()
                )
            `;

            return {
                id: programId,
                ...programData,
                createdAt: new Date(),
                updatedAt: new Date()
            } as LoyaltyProgram;
        } catch (error) {
            console.error('Failed to create loyalty program:', error);
            throw error;
        }
    }

    /**
     * Generate loyalty memberships for existing clients
     */
    async generateMemberships(loyaltyProgramId: string): Promise<LoyaltyMembership[]> {
        const loyaltyPrograms = await this.prisma.$queryRaw<LoyaltyProgram[]>`
            SELECT * FROM loyalty_programs WHERE id = ${loyaltyProgramId}
        `;

        const loyaltyProgram = loyaltyPrograms[0];

        if (!loyaltyProgram) {
            throw new Error(`Loyalty program with ID ${loyaltyProgramId} not found`);
        }

        // Get all clients for this business
        const clients = await this.prisma.client.findMany({
            where: { businessId: this.businessId },
            include: {
                appointments: {
                    where: { status: 'COMPLETED' },
                    include: { services: true }
                }
            }
        });

        const memberships: LoyaltyMembership[] = [];

        for (const client of clients) {
            // 85% of clients join the loyalty program
            if (!faker.datatype.boolean({ probability: 0.85 })) {
                continue;
            }

            // Calculate points based on appointment history
            const { totalEarned, currentPoints } = this.calculateClientPoints(
                client.appointments,
                Number(loyaltyProgram.pointsPerDollar)
            );

            // Determine current tier
            const currentTier = this.determineTier(currentPoints, loyaltyProgram.tiers as TierConfiguration[]);

            const membershipData = {
                loyaltyProgramId: loyaltyProgramId,
                clientId: client.id,
                currentPoints: currentPoints,
                totalEarned: totalEarned,
                totalRedeemed: totalEarned - currentPoints,
                currentTier: currentTier,
                isActive: true
            };

            const membershipId = faker.string.uuid();
            await this.prisma.$executeRaw`
                INSERT INTO loyalty_memberships (
                    id, "loyaltyProgramId", "clientId", "currentPoints",
                    "totalEarned", "totalRedeemed", "currentTier", "isActive",
                    "createdAt", "updatedAt"
                ) VALUES (
                    ${membershipId}, ${membershipData.loyaltyProgramId}, ${membershipData.clientId},
                    ${membershipData.currentPoints}, ${membershipData.totalEarned}, ${membershipData.totalRedeemed},
                    ${membershipData.currentTier}, ${membershipData.isActive}, NOW(), NOW()
                )
            `;

            const membership = {
                id: membershipId,
                ...membershipData,
                createdAt: new Date(),
                updatedAt: new Date()
            } as LoyaltyMembership;

            memberships.push(membership);
        }

        return memberships;
    }

    /**
     * Generate loyalty transactions for a membership
     */
    async generateTransactions(membershipId: string): Promise<LoyaltyTransaction[]> {
        const memberships = await this.prisma.$queryRaw<any[]>`
            SELECT 
                lm.*,
                lp."pointsPerDollar",
                lp."pointsRedemptionRate"
            FROM loyalty_memberships lm
            JOIN loyalty_programs lp ON lm."loyaltyProgramId" = lp.id
            WHERE lm.id = ${membershipId}
        `;

        const membership = memberships[0];

        if (!membership) {
            throw new Error(`Loyalty membership with ID ${membershipId} not found`);
        }

        // Get client appointments
        const clientAppointments = await this.prisma.appointment.findMany({
            where: {
                clientId: membership.clientId,
                status: 'COMPLETED'
            },
            include: { services: true },
            orderBy: { startTime: 'asc' }
        });

        const transactions: LoyaltyTransaction[] = [];
        let runningPoints = 0;

        // Generate earning transactions for each completed appointment
        for (const appointment of clientAppointments) {
            const appointmentTotal = appointment.services.reduce(
                (sum, service) => sum + Number(service.price),
                0
            );

            const pointsEarned = Math.floor(
                appointmentTotal * Number(membership.pointsPerDollar)
            );

            if (pointsEarned > 0) {
                const transactionId = faker.string.uuid();
                await this.prisma.$executeRaw`
                    INSERT INTO loyalty_transactions (
                        id, "loyaltyMembershipId", "appointmentId", type,
                        points, description, "createdAt", "updatedAt"
                    ) VALUES (
                        ${transactionId}, ${membershipId}, ${appointment.id}, 'EARNED'::"LoyaltyTransactionType",
                        ${pointsEarned}, ${`Points earned for appointment on ${appointment.startTime.toDateString()}`},
                        ${appointment.startTime}, ${appointment.startTime}
                    )
                `;

                const earnTransaction = {
                    id: transactionId,
                    loyaltyMembershipId: membershipId,
                    appointmentId: appointment.id,
                    type: 'EARNED',
                    points: pointsEarned,
                    description: `Points earned for appointment on ${appointment.startTime.toDateString()}`,
                    createdAt: appointment.startTime,
                    updatedAt: appointment.startTime
                } as LoyaltyTransaction;

                transactions.push(earnTransaction);
                runningPoints += pointsEarned;
            }
        }

        // Generate some redemption transactions
        const totalRedeemed = membership.totalRedeemed;
        let remainingToRedeem = totalRedeemed;

        while (remainingToRedeem > 0 && runningPoints > 0 && clientAppointments.length > 0) {
            // Generate redemption between 100-500 points
            const redemptionAmount = Math.min(
                remainingToRedeem,
                faker.number.int({ min: 100, max: Math.min(500, runningPoints) })
            );

            // Find a random appointment date for the redemption
            const randomAppointment = faker.helpers.arrayElement(clientAppointments);
            const redemptionDate = new Date(randomAppointment.startTime);
            redemptionDate.setDate(redemptionDate.getDate() + faker.number.int({ min: 1, max: 30 }));

            const redeemTransactionId = faker.string.uuid();
            const redeemDescription = `Redeemed ${redemptionAmount} points for $${(redemptionAmount * Number(membership.pointsRedemptionRate)).toFixed(2)} service credit`;

            await this.prisma.$executeRaw`
                INSERT INTO loyalty_transactions (
                    id, "loyaltyMembershipId", type, points, description,
                    "createdAt", "updatedAt"
                ) VALUES (
                    ${redeemTransactionId}, ${membershipId}, 'REDEEMED'::"LoyaltyTransactionType",
                    ${-redemptionAmount}, ${redeemDescription},
                    ${redemptionDate}, ${redemptionDate}
                )
            `;

            const redeemTransaction = {
                id: redeemTransactionId,
                loyaltyMembershipId: membershipId,
                type: 'REDEEMED',
                points: -redemptionAmount,
                description: redeemDescription,
                createdAt: redemptionDate,
                updatedAt: redemptionDate
            } as LoyaltyTransaction;

            transactions.push(redeemTransaction);
            runningPoints -= redemptionAmount;
            remainingToRedeem -= redemptionAmount;
        }

        // Occasionally add adjustment transactions
        if (faker.datatype.boolean({ probability: 0.1 })) {
            const adjustmentPoints = faker.number.int({ min: -50, max: 100 });
            const adjustmentReason = adjustmentPoints > 0
                ? "Bonus points for referral"
                : "Points adjustment for returned service";

            const adjustmentTransactionId = faker.string.uuid();
            const adjustmentDate = faker.date.recent({ days: 30 });

            await this.prisma.$executeRaw`
                INSERT INTO loyalty_transactions (
                    id, "loyaltyMembershipId", type, points, description,
                    "createdAt", "updatedAt"
                ) VALUES (
                    ${adjustmentTransactionId}, ${membershipId}, 'ADJUSTMENT'::"LoyaltyTransactionType",
                    ${adjustmentPoints}, ${adjustmentReason},
                    ${adjustmentDate}, ${new Date()}
                )
            `;

            const adjustmentTransaction = {
                id: adjustmentTransactionId,
                loyaltyMembershipId: membershipId,
                type: 'ADJUSTMENT',
                points: adjustmentPoints,
                description: adjustmentReason,
                createdAt: adjustmentDate,
                updatedAt: new Date()
            } as LoyaltyTransaction;

            transactions.push(adjustmentTransaction);
        }

        return transactions;
    }

    /**
     * Generate a complete loyalty system
     */
    async generateLoyaltySystem(): Promise<{
        program: LoyaltyProgram;
        memberships: LoyaltyMembership[];
        transactions: LoyaltyTransaction[];
    }> {
        // Create the loyalty program
        const program = await this.generate();

        // Generate memberships for clients
        const memberships = await this.generateMemberships(program.id);

        // Generate transactions for each membership
        const transactions: LoyaltyTransaction[] = [];
        for (const membership of memberships) {
            const memberTransactions = await this.generateTransactions(membership.id);
            transactions.push(...memberTransactions);
        }

        return { program, memberships, transactions };
    }

    private calculateClientPoints(appointments: any[], pointsPerDollar: number): {
        totalEarned: number;
        currentPoints: number;
    } {
        let totalEarned = 0;

        for (const appointment of appointments) {
            const appointmentTotal = appointment.services.reduce(
                (sum: number, service: any) => sum + Number(service.price),
                0
            );
            totalEarned += Math.floor(appointmentTotal * pointsPerDollar);
        }

        // Simulate some redemptions - clients typically redeem 20-40% of earned points
        const redemptionRate = faker.number.float({ min: 0.2, max: 0.4 });
        const totalRedeemed = Math.floor(totalEarned * redemptionRate);
        const currentPoints = totalEarned - totalRedeemed;

        return { totalEarned, currentPoints };
    }

    private determineTier(points: number, tiers: TierConfiguration[]): string {
        // Sort tiers by minPoints in descending order
        const sortedTiers = [...tiers].sort((a, b) => b.minPoints - a.minPoints);

        for (const tier of sortedTiers) {
            if (points >= tier.minPoints) {
                return tier.name;
            }
        }

        return tiers[0].name; // Default to first tier
    }

    protected validate(data: any): ValidationResult {
        const errors: ValidationError[] = [];

        if (!data.name || data.name.trim().length === 0) {
            errors.push({
                field: 'name',
                message: 'Loyalty program name is required',
                code: 'REQUIRED_FIELD'
            });
        }

        if (data.pointsPerDollar <= 0) {
            errors.push({
                field: 'pointsPerDollar',
                message: 'Points per dollar must be greater than 0',
                code: 'INVALID_VALUE'
            });
        }

        if (data.pointsRedemptionRate <= 0) {
            errors.push({
                field: 'pointsRedemptionRate',
                message: 'Points redemption rate must be greater than 0',
                code: 'INVALID_VALUE'
            });
        }

        if (!data.tiers || !Array.isArray(data.tiers) || data.tiers.length === 0) {
            errors.push({
                field: 'tiers',
                message: 'At least one tier is required',
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
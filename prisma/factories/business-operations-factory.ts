/**
 * BusinessOperationsFactory - Orchestrates the generation of all business operations data
 * including products, gift cards, promotions, marketing campaigns, and loyalty programs
 */

import { PrismaClient } from '@prisma/client';
import { BaseFactory } from './base-factory';
import { GiftCardFactory } from './gift-card-factory';
import { LoyaltyProgramFactory } from './loyalty-program-factory';
import { MarketingCampaignFactory } from './marketing-campaign-factory';
import { ProductFactory } from './product-factory';
import { PromotionFactory } from './promotion-factory';
import { ValidationResult } from './types';

export interface BusinessOperationsResult {
    products: any[];
    productSales: any[];
    giftCards: any[];
    giftCardRedemptions: any[];
    promotions: any[];
    promotionUsage: any[];
    marketingCampaigns: any[];
    campaignRecipients: any[];
    loyaltyProgram: any;
    loyaltyMemberships: any[];
    loyaltyTransactions: any[];
}

export interface BusinessOperationsConfig {
    products: {
        generateProducts: boolean;
        generateSalesHistory: boolean;
        salesHistoryMonths: number;
    };
    giftCards: {
        generateGiftCards: boolean;
        giftCardCount: number;
    };
    promotions: {
        generatePromotions: boolean;
        includeSeasonalPromotions: boolean;
        includeLoyaltyPromotions: boolean;
    };
    marketing: {
        generateCampaigns: boolean;
        includeEmailCampaigns: boolean;
        includeSMSCampaigns: boolean;
    };
    loyalty: {
        generateLoyaltyProgram: boolean;
        generateMemberships: boolean;
    };
}

export class BusinessOperationsFactory extends BaseFactory<BusinessOperationsResult> {
    private productFactory: ProductFactory;
    private giftCardFactory: GiftCardFactory;
    private promotionFactory: PromotionFactory;
    private marketingCampaignFactory: MarketingCampaignFactory;
    private loyaltyProgramFactory: LoyaltyProgramFactory;

    constructor(prisma: PrismaClient, businessId: string) {
        super(prisma, businessId);
        this.productFactory = new ProductFactory(prisma, businessId);
        this.giftCardFactory = new GiftCardFactory(prisma, businessId);
        this.promotionFactory = new PromotionFactory(prisma, businessId);
        this.marketingCampaignFactory = new MarketingCampaignFactory(prisma, businessId);
        this.loyaltyProgramFactory = new LoyaltyProgramFactory(prisma, businessId);
    }

    async generate(config?: Partial<BusinessOperationsConfig>): Promise<BusinessOperationsResult> {
        const defaultConfig: BusinessOperationsConfig = {
            products: {
                generateProducts: true,
                generateSalesHistory: true,
                salesHistoryMonths: 6
            },
            giftCards: {
                generateGiftCards: true,
                giftCardCount: 15
            },
            promotions: {
                generatePromotions: true,
                includeSeasonalPromotions: true,
                includeLoyaltyPromotions: true
            },
            marketing: {
                generateCampaigns: true,
                includeEmailCampaigns: true,
                includeSMSCampaigns: true
            },
            loyalty: {
                generateLoyaltyProgram: true,
                generateMemberships: true
            }
        };

        const finalConfig = { ...defaultConfig, ...config };
        const result: BusinessOperationsResult = {
            products: [],
            productSales: [],
            giftCards: [],
            giftCardRedemptions: [],
            promotions: [],
            promotionUsage: [],
            marketingCampaigns: [],
            campaignRecipients: [],
            loyaltyProgram: null,
            loyaltyMemberships: [],
            loyaltyTransactions: []
        };

        console.log('🏪 Generating business operations data...');

        try {
            // 1. Generate Products and Sales History
            if (finalConfig.products.generateProducts) {
                console.log('📦 Generating products...');
                result.products = await this.productFactory.generateAllProducts();
                console.log(`✅ Generated ${result.products.length} products`);

                if (finalConfig.products.generateSalesHistory) {
                    console.log('💰 Generating product sales history...');
                    for (const product of result.products) {
                        const sales = await this.productFactory.generateSalesHistory(
                            product.id,
                            finalConfig.products.salesHistoryMonths
                        );
                        result.productSales.push(...sales);
                    }
                    console.log(`✅ Generated ${result.productSales.length} product sales`);
                }
            }

            // 2. Generate Gift Cards System
            if (finalConfig.giftCards.generateGiftCards) {
                console.log('🎁 Generating gift card system...');
                const giftCardSystem = await this.giftCardFactory.generateGiftCardSystem(
                    finalConfig.giftCards.giftCardCount
                );
                result.giftCards = giftCardSystem.giftCards;
                result.giftCardRedemptions = giftCardSystem.redemptions;
                console.log(`✅ Generated ${result.giftCards.length} gift cards with ${result.giftCardRedemptions.length} redemptions`);
            }

            // 3. Generate Promotions System
            if (finalConfig.promotions.generatePromotions) {
                console.log('🎯 Generating promotions system...');
                const promotionSystem = await this.promotionFactory.generatePromotionSystem();
                result.promotions = promotionSystem.promotions;
                result.promotionUsage = promotionSystem.usage;
                console.log(`✅ Generated ${result.promotions.length} promotions with ${result.promotionUsage.length} usage records`);
            }

            // 4. Generate Marketing Campaigns
            if (finalConfig.marketing.generateCampaigns) {
                console.log('📧 Generating marketing campaigns...');
                const marketingSystem = await this.marketingCampaignFactory.generateMarketingSystem();
                result.marketingCampaigns = marketingSystem.campaigns;
                result.campaignRecipients = marketingSystem.recipients;
                console.log(`✅ Generated ${result.marketingCampaigns.length} campaigns with ${result.campaignRecipients.length} recipients`);
            }

            // 5. Generate Loyalty Program System
            if (finalConfig.loyalty.generateLoyaltyProgram) {
                console.log('⭐ Generating loyalty program system...');
                const loyaltySystem = await this.loyaltyProgramFactory.generateLoyaltySystem();
                result.loyaltyProgram = loyaltySystem.program;
                result.loyaltyMemberships = loyaltySystem.memberships;
                result.loyaltyTransactions = loyaltySystem.transactions;
                console.log(`✅ Generated loyalty program with ${result.loyaltyMemberships.length} members and ${result.loyaltyTransactions.length} transactions`);
            }

            console.log('🎉 Business operations data generation completed successfully!');
            this.logGenerationSummary(result);

            return result;

        } catch (error) {
            console.error('❌ Error generating business operations data:', error);
            throw error;
        }
    }

    /**
     * Generate business operations data with progress tracking
     */
    async generateWithProgress(
        config?: Partial<BusinessOperationsConfig>,
        progressCallback?: (step: string, progress: number, total: number) => void
    ): Promise<BusinessOperationsResult> {
        const totalSteps = 5;
        let currentStep = 0;

        const updateProgress = (stepName: string) => {
            currentStep++;
            if (progressCallback) {
                progressCallback(stepName, currentStep, totalSteps);
            }
        };

        const result = await this.generate(config);

        updateProgress('Products Generated');
        updateProgress('Gift Cards Generated');
        updateProgress('Promotions Generated');
        updateProgress('Marketing Campaigns Generated');
        updateProgress('Loyalty Program Generated');

        return result;
    }

    /**
     * Validate business operations data integrity
     */
    async validateBusinessOperationsData(): Promise<ValidationResult> {
        const errors: any[] = [];
        const warnings: any[] = [];

        try {
            // Check product data integrity
            const products = await this.prisma.product.findMany({
                where: { businessId: this.businessId }
            });

            const productSales = await this.prisma.productSale.findMany({
                where: { businessId: this.businessId }
            });

            if (products.length === 0) {
                warnings.push({
                    field: 'products',
                    message: 'No products found for business',
                    code: 'NO_DATA'
                });
            }

            // Check gift card data integrity
            const giftCards = await this.prisma.giftCard.findMany({
                where: { businessId: this.businessId }
            });

            for (const giftCard of giftCards) {
                if (Number(giftCard.currentBalance) > Number(giftCard.initialAmount)) {
                    errors.push({
                        field: 'giftCard.currentBalance',
                        message: `Gift card ${giftCard.code} has current balance greater than initial amount`,
                        code: 'INVALID_BALANCE'
                    });
                }
            }

            // Check promotion data integrity
            const promotions = await this.prisma.promotion.findMany({
                where: { businessId: this.businessId }
            });

            for (const promotion of promotions) {
                if (promotion.usageLimit && promotion.usageCount > promotion.usageLimit) {
                    errors.push({
                        field: 'promotion.usageCount',
                        message: `Promotion ${promotion.name} has usage count exceeding limit`,
                        code: 'USAGE_LIMIT_EXCEEDED'
                    });
                }
            }

            // Check loyalty program data integrity
            const loyaltyProgram = await this.prisma.loyaltyProgram.findFirst({
                where: { businessId: this.businessId }
            });

            if (loyaltyProgram) {
                const memberships = await this.prisma.loyaltyMembership.findMany({
                    where: { loyaltyProgramId: loyaltyProgram.id }
                });

                for (const membership of memberships) {
                    if (membership.currentPoints < 0) {
                        errors.push({
                            field: 'loyaltyMembership.currentPoints',
                            message: `Loyalty membership has negative points`,
                            code: 'NEGATIVE_POINTS'
                        });
                    }
                }
            }

            console.log(`✅ Business operations validation completed: ${errors.length} errors, ${warnings.length} warnings`);

            return {
                isValid: errors.length === 0,
                errors,
                warnings
            };

        } catch (error) {
            console.error('❌ Error validating business operations data:', error);
            return {
                isValid: false,
                errors: [{
                    field: 'validation',
                    message: `Validation failed: ${error}`,
                    code: 'VALIDATION_ERROR'
                }],
                warnings: []
            };
        }
    }

    private logGenerationSummary(result: BusinessOperationsResult): void {
        console.log('\n📊 Business Operations Generation Summary:');
        console.log('==========================================');
        console.log(`📦 Products: ${result.products.length}`);
        console.log(`💰 Product Sales: ${result.productSales.length}`);
        console.log(`🎁 Gift Cards: ${result.giftCards.length}`);
        console.log(`🎫 Gift Card Redemptions: ${result.giftCardRedemptions.length}`);
        console.log(`🎯 Promotions: ${result.promotions.length}`);
        console.log(`📈 Promotion Usage: ${result.promotionUsage.length}`);
        console.log(`📧 Marketing Campaigns: ${result.marketingCampaigns.length}`);
        console.log(`👥 Campaign Recipients: ${result.campaignRecipients.length}`);
        console.log(`⭐ Loyalty Program: ${result.loyaltyProgram ? 'Generated' : 'Not Generated'}`);
        console.log(`🏆 Loyalty Memberships: ${result.loyaltyMemberships.length}`);
        console.log(`💎 Loyalty Transactions: ${result.loyaltyTransactions.length}`);
        console.log('==========================================\n');
    }

    protected validate(data: any): ValidationResult {
        // This factory orchestrates other factories, so validation is handled by individual factories
        return {
            isValid: true,
            errors: [],
            warnings: []
        };
    }
}
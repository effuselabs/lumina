/**
 * Tests for BusinessOperationsFactory and related factories
 */

import { PrismaClient } from '@prisma/client';
import { BusinessOperationsFactory } from './business-operations-factory';
import { GiftCardFactory } from './gift-card-factory';
import { LoyaltyProgramFactory } from './loyalty-program-factory';
import { MarketingCampaignFactory } from './marketing-campaign-factory';
import { ProductFactory } from './product-factory';
import { PromotionFactory } from './promotion-factory';

// Mock Prisma Client for testing
const mockPrisma = {
    product: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn()
    },
    productSale: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn()
    },
    giftCard: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn()
    },
    giftCardRedemption: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn()
    },
    promotion: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn()
    },
    promotionUsage: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn()
    },
    marketingCampaign: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn()
    },
    campaignRecipient: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn()
    },
    loyaltyProgram: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn()
    },
    loyaltyMembership: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn()
    },
    loyaltyTransaction: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn()
    },
    staff: {
        findMany: jest.fn()
    },
    client: {
        findMany: jest.fn()
    },
    appointment: {
        findMany: jest.fn()
    },
    service: {
        findMany: jest.fn()
    },
    $transaction: jest.fn()
} as unknown as PrismaClient;

const businessId = 'test-business-id';

describe('ProductFactory', () => {
    let productFactory: ProductFactory;

    beforeEach(() => {
        productFactory = new ProductFactory(mockPrisma, businessId);
        jest.clearAllMocks();
    });

    describe('generate', () => {
        it('should generate a valid product', async () => {
            const mockProduct = {
                id: 'product-1',
                businessId,
                name: 'Test Product',
                category: 'Hair Care',
                retailPrice: 25.00,
                stockLevel: 10
            };

            (mockPrisma.product.create as jest.Mock).mockResolvedValue(mockProduct);

            const result = await productFactory.generate();

            expect(result).toEqual(mockProduct);
            expect(mockPrisma.product.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    businessId,
                    name: expect.any(String),
                    category: expect.any(String),
                    retailPrice: expect.any(Number),
                    stockLevel: expect.any(Number)
                })
            });
        });

        it('should validate product data', () => {
            const invalidData = {
                name: '',
                category: 'Hair Care',
                retailPrice: -10,
                stockLevel: -5
            };

            const validation = (productFactory as any).validate(invalidData);

            expect(validation.isValid).toBe(false);
            expect(validation.errors).toHaveLength(3); // name, retailPrice, stockLevel
        });
    });

    describe('generateAllProducts', () => {
        it('should generate products for all categories', async () => {
            const mockProduct = {
                id: 'product-1',
                businessId,
                name: 'Test Product',
                category: 'Hair Care'
            };

            (mockPrisma.product.create as jest.Mock).mockResolvedValue(mockProduct);

            const result = await productFactory.generateAllProducts();

            expect(result.length).toBeGreaterThan(0);
            expect(mockPrisma.product.create).toHaveBeenCalled();
        });
    });
});

describe('GiftCardFactory', () => {
    let giftCardFactory: GiftCardFactory;

    beforeEach(() => {
        giftCardFactory = new GiftCardFactory(mockPrisma, businessId);
        jest.clearAllMocks();
    });

    describe('generate', () => {
        it('should generate a valid gift card', async () => {
            const mockGiftCard = {
                id: 'gift-card-1',
                businessId,
                code: 'GC2024-ABCD-1234',
                initialAmount: 100,
                currentBalance: 100
            };

            (mockPrisma.giftCard.create as jest.Mock).mockResolvedValue(mockGiftCard);

            const result = await giftCardFactory.generate();

            expect(result).toEqual(mockGiftCard);
            expect(mockPrisma.giftCard.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    businessId,
                    code: expect.any(String),
                    initialAmount: expect.any(Number),
                    currentBalance: expect.any(Number)
                })
            });
        });

        it('should validate gift card data', () => {
            const invalidData = {
                code: '',
                initialAmount: -50,
                currentBalance: -10
            };

            const validation = (giftCardFactory as any).validate(invalidData);

            expect(validation.isValid).toBe(false);
            expect(validation.errors.length).toBeGreaterThan(0);
        });
    });
});

describe('PromotionFactory', () => {
    let promotionFactory: PromotionFactory;

    beforeEach(() => {
        promotionFactory = new PromotionFactory(mockPrisma, businessId);
        jest.clearAllMocks();
    });

    describe('generate', () => {
        it('should generate a valid promotion', async () => {
            const mockPromotion = {
                id: 'promotion-1',
                businessId,
                name: 'Test Promotion',
                discountType: 'PERCENTAGE',
                discountValue: 20
            };

            (mockPrisma.promotion.create as jest.Mock).mockResolvedValue(mockPromotion);
            (mockPrisma.service.findMany as jest.Mock).mockResolvedValue([]);

            const result = await promotionFactory.generate();

            expect(result).toEqual(mockPromotion);
            expect(mockPrisma.promotion.create).toHaveBeenCalled();
        });

        it('should validate promotion data', () => {
            const invalidData = {
                name: '',
                discountValue: -10,
                startDate: new Date('2024-01-01'),
                endDate: new Date('2023-12-31') // End before start
            };

            const validation = (promotionFactory as any).validate(invalidData);

            expect(validation.isValid).toBe(false);
            expect(validation.errors.length).toBeGreaterThan(0);
        });
    });
});

describe('MarketingCampaignFactory', () => {
    let marketingCampaignFactory: MarketingCampaignFactory;

    beforeEach(() => {
        marketingCampaignFactory = new MarketingCampaignFactory(mockPrisma, businessId);
        jest.clearAllMocks();
    });

    describe('generate', () => {
        it('should generate a valid marketing campaign', async () => {
            const mockCampaign = {
                id: 'campaign-1',
                businessId,
                name: 'Test Campaign',
                type: 'EMAIL',
                content: 'Test content'
            };

            (mockPrisma.marketingCampaign.create as jest.Mock).mockResolvedValue(mockCampaign);

            const result = await marketingCampaignFactory.generate();

            expect(result).toEqual(mockCampaign);
            expect(mockPrisma.marketingCampaign.create).toHaveBeenCalled();
        });

        it('should validate campaign data', () => {
            const invalidData = {
                name: '',
                type: 'EMAIL',
                content: '',
                subject: '' // Required for email campaigns
            };

            const validation = (marketingCampaignFactory as any).validate(invalidData);

            expect(validation.isValid).toBe(false);
            expect(validation.errors.length).toBeGreaterThan(0);
        });
    });
});

describe('LoyaltyProgramFactory', () => {
    let loyaltyProgramFactory: LoyaltyProgramFactory;

    beforeEach(() => {
        loyaltyProgramFactory = new LoyaltyProgramFactory(mockPrisma, businessId);
        jest.clearAllMocks();
    });

    describe('generate', () => {
        it('should generate a valid loyalty program', async () => {
            const mockProgram = {
                id: 'loyalty-1',
                businessId,
                name: 'Test Loyalty Program',
                pointsPerDollar: 1.0,
                pointsRedemptionRate: 0.01
            };

            (mockPrisma.loyaltyProgram.create as jest.Mock).mockResolvedValue(mockProgram);

            const result = await loyaltyProgramFactory.generate();

            expect(result).toEqual(mockProgram);
            expect(mockPrisma.loyaltyProgram.create).toHaveBeenCalled();
        });

        it('should validate loyalty program data', () => {
            const invalidData = {
                name: '',
                pointsPerDollar: -1,
                pointsRedemptionRate: 0,
                tiers: []
            };

            const validation = (loyaltyProgramFactory as any).validate(invalidData);

            expect(validation.isValid).toBe(false);
            expect(validation.errors.length).toBeGreaterThan(0);
        });
    });
});

describe('BusinessOperationsFactory', () => {
    let businessOperationsFactory: BusinessOperationsFactory;

    beforeEach(() => {
        businessOperationsFactory = new BusinessOperationsFactory(mockPrisma, businessId);
        jest.clearAllMocks();

        // Setup default mocks
        (mockPrisma.product.create as jest.Mock).mockResolvedValue({ id: 'product-1' });
        (mockPrisma.giftCard.create as jest.Mock).mockResolvedValue({ id: 'gift-card-1' });
        (mockPrisma.promotion.create as jest.Mock).mockResolvedValue({ id: 'promotion-1' });
        (mockPrisma.marketingCampaign.create as jest.Mock).mockResolvedValue({ id: 'campaign-1' });
        (mockPrisma.loyaltyProgram.create as jest.Mock).mockResolvedValue({ id: 'loyalty-1' });

        (mockPrisma.staff.findMany as jest.Mock).mockResolvedValue([]);
        (mockPrisma.client.findMany as jest.Mock).mockResolvedValue([]);
        (mockPrisma.appointment.findMany as jest.Mock).mockResolvedValue([]);
        (mockPrisma.service.findMany as jest.Mock).mockResolvedValue([]);
    });

    describe('generate', () => {
        it('should generate complete business operations data', async () => {
            const result = await businessOperationsFactory.generate();

            expect(result).toHaveProperty('products');
            expect(result).toHaveProperty('giftCards');
            expect(result).toHaveProperty('promotions');
            expect(result).toHaveProperty('marketingCampaigns');
            expect(result).toHaveProperty('loyaltyProgram');
            expect(result).toHaveProperty('loyaltyMemberships');
        });

        it('should respect configuration options', async () => {
            const config = {
                products: { generateProducts: false, generateSalesHistory: false, salesHistoryMonths: 6 },
                giftCards: { generateGiftCards: false, giftCardCount: 0 },
                promotions: { generatePromotions: false, includeSeasonalPromotions: false, includeLoyaltyPromotions: false },
                marketing: { generateCampaigns: false, includeEmailCampaigns: false, includeSMSCampaigns: false },
                loyalty: { generateLoyaltyProgram: false, generateMemberships: false }
            };

            const result = await businessOperationsFactory.generate(config);

            expect(result.products).toHaveLength(0);
            expect(result.giftCards).toHaveLength(0);
            expect(result.promotions).toHaveLength(0);
            expect(result.marketingCampaigns).toHaveLength(0);
            expect(result.loyaltyProgram).toBeNull();
        });
    });

    describe('validateBusinessOperationsData', () => {
        it('should validate business operations data integrity', async () => {
            // Setup mocks for validation
            (mockPrisma.product.findMany as jest.Mock).mockResolvedValue([{ id: 'product-1' }]);
            (mockPrisma.productSale.findMany as jest.Mock).mockResolvedValue([]);
            (mockPrisma.giftCard.findMany as jest.Mock).mockResolvedValue([
                { id: 'gc-1', code: 'TEST', initialAmount: 100, currentBalance: 50 }
            ]);
            (mockPrisma.promotion.findMany as jest.Mock).mockResolvedValue([
                { id: 'promo-1', name: 'Test', usageLimit: 10, usageCount: 5 }
            ]);
            (mockPrisma.loyaltyProgram.findFirst as jest.Mock).mockResolvedValue({ id: 'loyalty-1' });
            (mockPrisma.loyaltyMembership.findMany as jest.Mock).mockResolvedValue([
                { id: 'member-1', currentPoints: 100 }
            ]);

            const result = await businessOperationsFactory.validateBusinessOperationsData();

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should detect data integrity issues', async () => {
            // Setup mocks with invalid data
            (mockPrisma.product.findMany as jest.Mock).mockResolvedValue([]);
            (mockPrisma.productSale.findMany as jest.Mock).mockResolvedValue([]);
            (mockPrisma.giftCard.findMany as jest.Mock).mockResolvedValue([
                { id: 'gc-1', code: 'TEST', initialAmount: 100, currentBalance: 150 } // Invalid balance
            ]);
            (mockPrisma.promotion.findMany as jest.Mock).mockResolvedValue([
                { id: 'promo-1', name: 'Test', usageLimit: 10, usageCount: 15 } // Exceeded limit
            ]);
            (mockPrisma.loyaltyProgram.findFirst as jest.Mock).mockResolvedValue({ id: 'loyalty-1' });
            (mockPrisma.loyaltyMembership.findMany as jest.Mock).mockResolvedValue([
                { id: 'member-1', currentPoints: -50 } // Negative points
            ]);

            const result = await businessOperationsFactory.validateBusinessOperationsData();

            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });
    });
});

// Integration test helpers
export const createTestBusinessOperationsData = async (
    prisma: PrismaClient,
    businessId: string
) => {
    const factory = new BusinessOperationsFactory(prisma, businessId);
    return await factory.generate();
};

export const validateTestBusinessOperationsData = async (
    prisma: PrismaClient,
    businessId: string
) => {
    const factory = new BusinessOperationsFactory(prisma, businessId);
    return await factory.validateBusinessOperationsData();
};
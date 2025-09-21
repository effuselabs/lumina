/**
 * Tests for ServiceFactory
 */

import { PrismaClient } from '@prisma/client';

// Mock faker.js
jest.mock('@faker-js/faker', () => ({
    faker: {
        helpers: {
            arrayElement: jest.fn((arr) => arr[0]),
        },
        number: {
            int: jest.fn(() => 50),
            float: jest.fn(() => 0.5),
        },
    },
}));

import { ServiceFactory } from './service-factory';

// Mock PrismaClient
const mockPrisma = {
    service: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
    },
} as unknown as PrismaClient;

describe('ServiceFactory', () => {
    let factory: ServiceFactory;
    const businessId = 'test-business-id';

    beforeEach(() => {
        factory = new ServiceFactory(mockPrisma, businessId);
        jest.clearAllMocks();
    });

    describe('generate', () => {
        it('should generate a single service', async () => {
            const mockService = {
                id: 'service-1',
                businessId,
                name: 'Haircut & Style',
                description: 'Professional haircut with wash and style',
                category: 'Hair',
                price: 65,
                duration: 60,
                isActive: true,
                isOnline: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            (mockPrisma.service.create as jest.Mock).mockResolvedValue(mockService);

            const result = await factory.generate();

            expect(result).toEqual(mockService);
            expect(mockPrisma.service.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    businessId,
                    name: expect.any(String),
                    description: expect.any(String),
                    category: expect.any(String),
                    price: expect.any(Number),
                    duration: expect.any(Number),
                    isActive: true,
                    isOnline: true,
                }),
            });
        });

        it('should apply pricing tiers when enabled', async () => {
            const mockService = {
                id: 'service-1',
                businessId,
                name: 'Haircut & Style',
                description: 'Professional haircut with wash and style',
                category: 'Hair',
                price: 55, // Modified by tier multiplier
                duration: 60,
                isActive: true,
                isOnline: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            (mockPrisma.service.create as jest.Mock).mockResolvedValue(mockService);

            await factory.generate({ includePricingTiers: true });

            expect(mockPrisma.service.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    price: expect.any(Number),
                }),
            });
        });
    });

    describe('generateAllServices', () => {
        it('should generate services from all categories', async () => {
            const mockServices = Array.from({ length: 38 }, (_, i) => ({
                id: `service-${i + 1}`,
                businessId,
                name: `Service ${i + 1}`,
                description: `Description ${i + 1}`,
                category: 'Hair',
                price: 50,
                duration: 60,
                isActive: true,
                isOnline: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            }));

            (mockPrisma.service.create as jest.Mock).mockImplementation((data) =>
                Promise.resolve(mockServices.shift())
            );

            const result = await factory.generateAllServices();

            expect(result).toHaveLength(44); // 38 regular + 6 seasonal
            expect(mockPrisma.service.create).toHaveBeenCalledTimes(44);
        });

        it('should exclude seasonal services when requested', async () => {
            const mockServices = Array.from({ length: 32 }, (_, i) => ({
                id: `service-${i + 1}`,
                businessId,
                name: `Service ${i + 1}`,
                description: `Description ${i + 1}`,
                category: 'Hair',
                price: 50,
                duration: 60,
                isActive: true,
                isOnline: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            }));

            (mockPrisma.service.create as jest.Mock).mockImplementation((data) =>
                Promise.resolve(mockServices.shift())
            );

            const result = await factory.generateAllServices({ includeSeasonalServices: false });

            expect(result).toHaveLength(38); // Only regular services
            expect(mockPrisma.service.create).toHaveBeenCalledTimes(38);
        });
    });

    describe('generateServicePackages', () => {
        it('should return predefined service packages', async () => {
            const packages = await factory.generateServicePackages();

            expect(packages).toHaveLength(5);
            expect(packages[0]).toEqual(
                expect.objectContaining({
                    name: 'Bridal Package',
                    description: expect.any(String),
                    serviceIds: expect.any(Array),
                    discountPercentage: expect.any(Number),
                    duration: expect.any(Number),
                })
            );
        });
    });

    describe('getPricingTiers', () => {
        it('should calculate pricing tiers correctly', () => {
            const basePrice = 100;
            const tiers = factory.getPricingTiers(basePrice);

            expect(tiers).toEqual({
                junior: 85,   // 100 * 0.85 = 85
                senior: 100,  // 100 * 1.0 = 100
                master: 125,  // 100 * 1.25 = 125
            });
        });

        it('should round prices to nearest $5', () => {
            const basePrice = 67; // Should result in non-round numbers
            const tiers = factory.getPricingTiers(basePrice);

            // All prices should be multiples of 5
            expect(tiers.junior % 5).toBe(0);
            expect(tiers.senior % 5).toBe(0);
            expect(tiers.master % 5).toBe(0);
        });
    });

    describe('getServicesByCategory', () => {
        it('should return services for valid category', () => {
            const hairServices = factory.getServicesByCategory('Hair');

            expect(hairServices).toHaveLength(12);
            expect(hairServices[0]).toEqual(
                expect.objectContaining({
                    name: 'Haircut & Style',
                    description: expect.any(String),
                    basePrice: expect.any(Number),
                    duration: expect.any(Number),
                })
            );
        });

        it('should return empty array for invalid category', () => {
            const services = factory.getServicesByCategory('InvalidCategory');
            expect(services).toEqual([]);
        });
    });

    describe('getAllCategories', () => {
        it('should return all service categories', () => {
            const categories = factory.getAllCategories();

            expect(categories).toEqual([
                'Hair',
                'Nails',
                'Skincare',
                'Massage',
                'Lashes',
                'Brows',
            ]);
        });
    });

    describe('getSeasonalServicesForMonth', () => {
        it('should return services available in December', () => {
            const decemberServices = factory.getSeasonalServicesForMonth(12);

            expect(decemberServices.length).toBeGreaterThan(0);
            expect(decemberServices.every(service =>
                service.availableMonths.includes(12)
            )).toBe(true);
        });

        it('should return empty array for months with no seasonal services', () => {
            const services = factory.getSeasonalServicesForMonth(10); // October
            expect(services).toEqual([]);
        });
    });

    describe('getHolidaySpecials', () => {
        it('should return only holiday special services', () => {
            const holidaySpecials = factory.getHolidaySpecials();

            expect(holidaySpecials.length).toBeGreaterThan(0);
            expect(holidaySpecials.every(service => service.isHolidaySpecial)).toBe(true);
        });
    });

    describe('calculatePackagePrice', () => {
        it('should calculate package price with discount', () => {
            const mockServices = [
                { id: '1', name: 'Haircut & Style', price: 65 },
                { id: '2', name: 'Updo', price: 75 },
                { id: '3', name: 'Facial', price: 80 },
                { id: '4', name: 'Gel Manicure', price: 50 },
                { id: '5', name: 'Eyebrow Shaping', price: 25 },
            ] as any[];

            const packageDef = {
                name: 'Bridal Package',
                description: 'Complete bridal beauty package',
                serviceIds: ['haircut-style', 'updo', 'facial', 'gel-manicure', 'eyebrow-shaping'],
                discountPercentage: 15,
                duration: 240,
            };

            const totalPrice = 65 + 75 + 80 + 50 + 25; // 295
            const expectedPrice = Math.round((totalPrice * 0.85) / 5) * 5; // 15% discount, rounded to $5

            const result = factory.calculatePackagePrice(packageDef, mockServices);
            expect(result).toBe(expectedPrice);
        });
    });

    describe('validation', () => {
        it('should validate service data correctly', () => {
            const validService = {
                name: 'Test Service',
                description: 'Test description',
                basePrice: 50,
                duration: 60,
            };

            const result = (factory as any).validate(validService);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should return errors for invalid service data', () => {
            const invalidService = {
                name: '',
                description: 'Test description',
                basePrice: -10,
                duration: 0,
            };

            const result = (factory as any).validate(invalidService);
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        it('should return warnings for missing optional data', () => {
            const serviceWithoutDescription = {
                name: 'Test Service',
                description: '',
                basePrice: 50,
                duration: 60,
            };

            const result = (factory as any).validate(serviceWithoutDescription);
            expect(result.warnings.length).toBeGreaterThan(0);
        });
    });
});
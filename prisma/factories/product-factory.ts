/**
 * ProductFactory - Generates realistic retail products with inventory and sales history
 */

import { faker } from '@faker-js/faker';
import { Product, ProductSale, SaleType } from '@prisma/client';
import { BaseFactory } from './base-factory';
import { ValidationError, ValidationResult } from './types';

export interface ProductConfiguration {
    categories: ProductCategory[];
    stockLevels: StockLevelConfig;
    salesHistory: SalesHistoryConfig;
}

export interface ProductCategory {
    name: string;
    products: ProductDefinition[];
    brands: string[];
}

export interface ProductDefinition {
    name: string;
    description?: string;
    baseCostPrice: number;
    baseRetailPrice: number;
    stockRange: [number, number];
    popularity: number; // 1-10 scale for sales frequency
}

export interface StockLevelConfig {
    lowStockThreshold: number;
    averageStock: number;
    maxStock: number;
    outOfStockPercentage: number;
}

export interface SalesHistoryConfig {
    monthsOfHistory: number;
    salesPerMonth: number;
    retailVsServiceRatio: number; // 0.3 = 30% retail, 70% with service
}

export class ProductFactory extends BaseFactory<Product> {
    private readonly productCategories: ProductCategory[] = [
        {
            name: 'Hair Care',
            brands: ['Redken', 'Matrix', 'Paul Mitchell', 'Schwarzkopf', 'Olaplex', 'Moroccanoil'],
            products: [
                {
                    name: 'Professional Shampoo',
                    description: 'Salon-quality cleansing shampoo',
                    baseCostPrice: 12.50,
                    baseRetailPrice: 28.00,
                    stockRange: [5, 25],
                    popularity: 9
                },
                {
                    name: 'Deep Conditioning Treatment',
                    description: 'Intensive repair treatment mask',
                    baseCostPrice: 18.00,
                    baseRetailPrice: 42.00,
                    stockRange: [3, 15],
                    popularity: 7
                },
                {
                    name: 'Heat Protection Spray',
                    description: 'Thermal protection for styling',
                    baseCostPrice: 8.75,
                    baseRetailPrice: 22.00,
                    stockRange: [8, 20],
                    popularity: 8
                },
                {
                    name: 'Hair Oil Treatment',
                    description: 'Nourishing argan oil blend',
                    baseCostPrice: 15.00,
                    baseRetailPrice: 35.00,
                    stockRange: [4, 12],
                    popularity: 6
                }
            ]
        },
        {
            name: 'Nail Care',
            brands: ['OPI', 'Essie', 'CND', 'Gelish', 'Dior', 'Chanel'],
            products: [
                {
                    name: 'Gel Polish',
                    description: 'Long-lasting gel nail polish',
                    baseCostPrice: 6.50,
                    baseRetailPrice: 18.00,
                    stockRange: [10, 30],
                    popularity: 9
                },
                {
                    name: 'Cuticle Oil',
                    description: 'Nourishing cuticle treatment',
                    baseCostPrice: 4.25,
                    baseRetailPrice: 12.00,
                    stockRange: [8, 20],
                    popularity: 7
                },
                {
                    name: 'Base Coat',
                    description: 'Professional nail base coat',
                    baseCostPrice: 5.00,
                    baseRetailPrice: 14.00,
                    stockRange: [6, 15],
                    popularity: 8
                },
                {
                    name: 'Top Coat',
                    description: 'High-shine protective top coat',
                    baseCostPrice: 5.50,
                    baseRetailPrice: 15.00,
                    stockRange: [6, 15],
                    popularity: 8
                }
            ]
        },
        {
            name: 'Skincare',
            brands: ['Dermalogica', 'SkinCeuticals', 'Murad', 'Pevonia', 'Eminence', 'Image'],
            products: [
                {
                    name: 'Vitamin C Serum',
                    description: 'Brightening antioxidant serum',
                    baseCostPrice: 25.00,
                    baseRetailPrice: 65.00,
                    stockRange: [3, 10],
                    popularity: 8
                },
                {
                    name: 'Hydrating Moisturizer',
                    description: 'Daily hydrating face cream',
                    baseCostPrice: 18.50,
                    baseRetailPrice: 45.00,
                    stockRange: [5, 15],
                    popularity: 9
                },
                {
                    name: 'Gentle Cleanser',
                    description: 'pH-balanced facial cleanser',
                    baseCostPrice: 12.00,
                    baseRetailPrice: 32.00,
                    stockRange: [6, 18],
                    popularity: 8
                },
                {
                    name: 'Exfoliating Scrub',
                    description: 'Weekly exfoliating treatment',
                    baseCostPrice: 15.75,
                    baseRetailPrice: 38.00,
                    stockRange: [4, 12],
                    popularity: 6
                }
            ]
        },
        {
            name: 'Styling Tools',
            brands: ['Dyson', 'GHD', 'BaByliss', 'Hot Tools', 'T3', 'Bio Ionic'],
            products: [
                {
                    name: 'Professional Hair Dryer',
                    description: 'Ionic ceramic hair dryer',
                    baseCostPrice: 85.00,
                    baseRetailPrice: 180.00,
                    stockRange: [1, 4],
                    popularity: 4
                },
                {
                    name: 'Flat Iron',
                    description: 'Titanium plate straightener',
                    baseCostPrice: 65.00,
                    baseRetailPrice: 145.00,
                    stockRange: [1, 3],
                    popularity: 5
                },
                {
                    name: 'Curling Iron',
                    description: '1.25" barrel curling iron',
                    baseCostPrice: 45.00,
                    baseRetailPrice: 95.00,
                    stockRange: [2, 5],
                    popularity: 6
                }
            ]
        },
        {
            name: 'Accessories',
            brands: ['Scunci', 'Goody', 'Kitsch', 'Slip', 'Invisibobble', 'Tangle Teezer'],
            products: [
                {
                    name: 'Silk Hair Ties',
                    description: 'Gentle silk hair elastics',
                    baseCostPrice: 3.50,
                    baseRetailPrice: 12.00,
                    stockRange: [15, 40],
                    popularity: 8
                },
                {
                    name: 'Detangling Brush',
                    description: 'Wet/dry detangling brush',
                    baseCostPrice: 8.00,
                    baseRetailPrice: 22.00,
                    stockRange: [5, 15],
                    popularity: 7
                },
                {
                    name: 'Satin Pillowcase',
                    description: 'Hair-friendly satin pillowcase',
                    baseCostPrice: 12.00,
                    baseRetailPrice: 35.00,
                    stockRange: [3, 10],
                    popularity: 5
                }
            ]
        }
    ];

    async generate(options?: Partial<ProductConfiguration>): Promise<Product> {
        const category = faker.helpers.arrayElement(this.productCategories);
        const productDef = faker.helpers.arrayElement(category.products);
        const brand = faker.helpers.arrayElement(category.brands);

        // Generate realistic stock level
        const [minStock, maxStock] = productDef.stockRange;
        const stockLevel = faker.number.int({ min: minStock, max: maxStock });

        // Add some variation to pricing
        const costPrice = this.generateRealisticPrice(productDef.baseCostPrice, 0.15);
        const retailPrice = this.generateRealisticPrice(productDef.baseRetailPrice, 0.1);

        // Generate SKU
        const sku = this.generateSKU(category.name, brand, productDef.name);

        const productData = {
            businessId: this.businessId,
            name: `${brand} ${productDef.name}`,
            description: productDef.description,
            category: category.name,
            brand: brand,
            sku: sku,
            costPrice: costPrice,
            retailPrice: retailPrice,
            stockLevel: stockLevel,
            lowStockAlert: Math.max(1, Math.floor(stockLevel * 0.2)),
            isActive: faker.datatype.boolean({ probability: 0.95 })
        };

        const validation = this.validate(productData);
        if (!validation.isValid) {
            throw new Error(`Product validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
        }

        return await this.prisma.product.create({
            data: productData
        });
    }

    /**
     * Generate sales history for a product
     */
    async generateSalesHistory(
        productId: string,
        monthsOfHistory: number = 6,
        salesPerMonth: number = 5
    ): Promise<ProductSale[]> {
        const product = await this.prisma.product.findUnique({
            where: { id: productId }
        });

        if (!product) {
            throw new Error(`Product with ID ${productId} not found`);
        }

        const sales: ProductSale[] = [];
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - monthsOfHistory);

        // Get staff and appointments for realistic sales context
        const staff = await this.prisma.staff.findMany({
            where: { businessId: this.businessId, isActive: true }
        });

        const appointments = await this.prisma.appointment.findMany({
            where: {
                businessId: this.businessId,
                startTime: {
                    gte: startDate,
                    lte: endDate
                },
                status: 'COMPLETED'
            }
        });

        // Generate sales based on product popularity
        const totalSales = Math.floor(salesPerMonth * monthsOfHistory * (product.stockLevel / 10));

        for (let i = 0; i < totalSales; i++) {
            const saleDate = this.generateDateInRange(startDate, endDate);
            const quantity = this.weightedRandom([1, 2, 3], [70, 25, 5]);

            // Determine if this is a retail sale or sold with service
            const isRetailSale = faker.datatype.boolean({ probability: 0.3 });

            let appointmentId: string | undefined;
            let staffId: string | undefined;

            if (!isRetailSale && appointments.length > 0) {
                // Find appointment close to sale date
                const relevantAppointments = appointments.filter(apt => {
                    const aptDate = new Date(apt.startTime);
                    const daysDiff = Math.abs((aptDate.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24));
                    return daysDiff <= 1;
                });

                if (relevantAppointments.length > 0) {
                    const appointment = faker.helpers.arrayElement(relevantAppointments);
                    appointmentId = appointment.id;
                    staffId = appointment.staffId;
                }
            }

            if (isRetailSale && staff.length > 0) {
                staffId = faker.helpers.arrayElement(staff).id;
            }

            // Add some price variation for sales/promotions
            const unitPrice = faker.datatype.boolean({ probability: 0.85 })
                ? Number(product.retailPrice)
                : this.generateRealisticPrice(Number(product.retailPrice), 0.2);

            const saleData = {
                businessId: this.businessId,
                productId: productId,
                appointmentId: appointmentId,
                staffId: staffId,
                quantity: quantity,
                unitPrice: unitPrice,
                totalAmount: Number(unitPrice) * quantity,
                saleType: isRetailSale ? SaleType.RETAIL : SaleType.WITH_SERVICE,
                createdAt: saleDate,
                updatedAt: saleDate
            };

            const sale = await this.prisma.productSale.create({
                data: saleData
            });

            sales.push(sale);
        }

        return sales;
    }

    /**
     * Generate all products for the business
     */
    async generateAllProducts(): Promise<Product[]> {
        const products: Product[] = [];

        for (const category of this.productCategories) {
            for (const productDef of category.products) {
                for (const brand of category.brands.slice(0, 2)) { // Limit to 2 brands per product type
                    try {
                        const product = await this.generateProductVariant(category, productDef, brand);
                        products.push(product);
                    } catch (error) {
                        console.warn(`Failed to create product ${brand} ${productDef.name}:`, error);
                    }
                }
            }
        }

        return products;
    }

    private async generateProductVariant(
        category: ProductCategory,
        productDef: ProductDefinition,
        brand: string
    ): Promise<Product> {
        const [minStock, maxStock] = productDef.stockRange;
        const stockLevel = faker.number.int({ min: minStock, max: maxStock });

        const costPrice = this.generateRealisticPrice(productDef.baseCostPrice, 0.15);
        const retailPrice = this.generateRealisticPrice(productDef.baseRetailPrice, 0.1);

        const sku = this.generateSKU(category.name, brand, productDef.name);

        return await this.prisma.product.create({
            data: {
                businessId: this.businessId,
                name: `${brand} ${productDef.name}`,
                description: productDef.description,
                category: category.name,
                brand: brand,
                sku: sku,
                costPrice: costPrice,
                retailPrice: retailPrice,
                stockLevel: stockLevel,
                lowStockAlert: Math.max(1, Math.floor(stockLevel * 0.2)),
                isActive: faker.datatype.boolean({ probability: 0.95 })
            }
        });
    }

    private generateSKU(category: string, brand: string, productName: string): string {
        const categoryCode = category.substring(0, 2).toUpperCase();
        const brandCode = brand.substring(0, 3).toUpperCase();
        const productCode = productName.replace(/\s+/g, '').substring(0, 3).toUpperCase();
        const randomNum = faker.number.int({ min: 100, max: 999 });

        return `${categoryCode}${brandCode}${productCode}${randomNum}`;
    }

    protected validate(data: any): ValidationResult {
        const errors: ValidationError[] = [];

        if (!data.name || data.name.trim().length === 0) {
            errors.push({
                field: 'name',
                message: 'Product name is required',
                code: 'REQUIRED_FIELD'
            });
        }

        if (!data.category || data.category.trim().length === 0) {
            errors.push({
                field: 'category',
                message: 'Product category is required',
                code: 'REQUIRED_FIELD'
            });
        }

        if (data.retailPrice <= 0) {
            errors.push({
                field: 'retailPrice',
                message: 'Retail price must be greater than 0',
                code: 'INVALID_VALUE'
            });
        }

        if (data.costPrice && data.costPrice >= data.retailPrice) {
            errors.push({
                field: 'costPrice',
                message: 'Cost price must be less than retail price',
                code: 'INVALID_VALUE'
            });
        }

        if (data.stockLevel < 0) {
            errors.push({
                field: 'stockLevel',
                message: 'Stock level cannot be negative',
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
/**
 * TransactionFactory Tests
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { DEFAULT_SEED_CONFIG } from './seed-config';
import { TransactionFactory } from './transaction-factory';

const prisma = new PrismaClient();
const businessId = 'test-business-transaction-factory';

describe('TransactionFactory', () => {
    let factory: TransactionFactory;

    beforeAll(async () => {
        // Create test business
        await prisma.business.create({
            data: {
                id: businessId,
                name: 'Test Transaction Business',
                slug: 'test-transaction-business',
                financialModel: 'COMMISSION'
            }
        });

        // Create test staff with different employment types
        const staff = await prisma.staff.createMany({
            data: [
                {
                    id: 'staff-commission',
                    businessId,
                    userId: 'user-commission',
                    firstName: 'Commission',
                    lastName: 'Staff',
                    displayName: 'Commission Staff',
                    employmentType: 'COMMISSION',
                    commissionRate: 60
                },
                {
                    id: 'staff-chair-rental',
                    businessId,
                    userId: 'user-chair-rental',
                    firstName: 'Chair',
                    lastName: 'Rental',
                    displayName: 'Chair Rental Staff',
                    employmentType: 'CHAIR_RENTAL',
                    chairRentalAmount: 200
                },
                {
                    id: 'staff-hybrid',
                    businessId,
                    userId: 'user-hybrid',
                    firstName: 'Hybrid',
                    lastName: 'Staff',
                    displayName: 'Hybrid Staff',
                    employmentType: 'HYBRID',
                    commissionRate: 45,
                    chairRentalAmount: 150
                }
            ]
        });

        // Create test client
        const client = await prisma.client.create({
            data: {
                id: 'test-client-transaction',
                businessId,
                firstName: 'Test',
                lastName: 'Client',
                email: 'test.client@example.com'
            }
        });

        // Create test services
        const services = await prisma.service.createMany({
            data: [
                {
                    id: 'service-haircut',
                    businessId,
                    name: 'Haircut',
                    price: 65,
                    duration: 60
                },
                {
                    id: 'service-color',
                    businessId,
                    name: 'Hair Color',
                    price: 120,
                    duration: 120
                }
            ]
        });

        // Create test appointments
        const appointments = await prisma.appointment.createMany({
            data: [
                {
                    id: 'appointment-1',
                    businessId,
                    clientId: client.id,
                    staffId: 'staff-commission',
                    startTime: new Date('2025-01-15T10:00:00Z'),
                    endTime: new Date('2025-01-15T11:00:00Z'),
                    totalDuration: 60,
                    totalPrice: 85.00,
                    status: 'COMPLETED'
                },
                {
                    id: 'appointment-2',
                    businessId,
                    clientId: client.id,
                    staffId: 'staff-chair-rental',
                    startTime: new Date('2025-01-16T14:00:00Z'),
                    endTime: new Date('2025-01-16T16:00:00Z'),
                    totalDuration: 120,
                    totalPrice: 120.00,
                    status: 'COMPLETED'
                }
            ]
        });

        // Create appointment services
        await prisma.appointmentService.createMany({
            data: [
                {
                    appointmentId: 'appointment-1',
                    serviceId: 'service-haircut',
                    serviceName: 'Haircut',
                    price: 65,
                    duration: 60
                },
                {
                    appointmentId: 'appointment-2',
                    serviceId: 'service-color',
                    serviceName: 'Hair Color',
                    price: 120,
                    duration: 120
                }
            ]
        });

        factory = new TransactionFactory(
            prisma,
            businessId,
            DEFAULT_SEED_CONFIG.financial.paymentMethods,
            DEFAULT_SEED_CONFIG.financial.transactionTypes
        );
    });

    afterAll(async () => {
        // Clean up test data
        await prisma.appointmentService.deleteMany({ where: { appointment: { businessId } } });
        await prisma.appointment.deleteMany({ where: { businessId } });
        await prisma.transaction.deleteMany({ where: { businessId } });
        await prisma.service.deleteMany({ where: { businessId } });
        await prisma.client.deleteMany({ where: { businessId } });
        await prisma.staff.deleteMany({ where: { businessId } });
        await prisma.business.delete({ where: { id: businessId } });
        await prisma.$disconnect();
    });

    beforeEach(async () => {
        // Clean transactions before each test
        await prisma.transaction.deleteMany({ where: { businessId } });
    });

    describe('initialization', () => {
        it('should initialize with financial context', async () => {
            await factory.initialize();
            expect(factory).toBeDefined();
        });

        it('should throw error if no completed appointments exist', async () => {
            // Temporarily update appointments to non-completed status
            await prisma.appointment.updateMany({
                where: { businessId },
                data: { status: 'CANCELLED' }
            });

            const emptyFactory = new TransactionFactory(
                prisma,
                businessId,
                DEFAULT_SEED_CONFIG.financial.paymentMethods,
                DEFAULT_SEED_CONFIG.financial.transactionTypes
            );

            await expect(emptyFactory.initialize()).rejects.toThrow(
                'Cannot generate transactions without completed appointments'
            );

            // Restore appointments
            await prisma.appointment.updateMany({
                where: { businessId },
                data: { status: 'COMPLETED' }
            });
        });
    });

    describe('transaction generation', () => {
        beforeEach(async () => {
            await factory.initialize();
        });

        it('should generate a payment transaction', async () => {
            const transaction = await factory.generate();

            expect(transaction).toBeDefined();
            expect(transaction.businessId).toBe(businessId);
            expect(transaction.type).toMatch(/^(PAYMENT|TIP|REFUND|COMMISSION|CHAIR_RENTAL|DEPOSIT)$/);
            expect(transaction.status).toBe('COMPLETED');
            expect(transaction.currency).toBe('USD');
        });

        it('should generate transactions with correct amounts for payment types', async () => {
            // Generate multiple transactions to test different types
            const transactions = await Promise.all([
                factory.generate(),
                factory.generate(),
                factory.generate(),
                factory.generate(),
                factory.generate()
            ]);

            transactions.forEach(transaction => {
                const amount = Number(transaction.amount);

                switch (transaction.type) {
                    case 'PAYMENT':
                    case 'TIP':
                    case 'COMMISSION':
                    case 'DEPOSIT':
                        expect(amount).toBeGreaterThan(0);
                        break;
                    case 'REFUND':
                    case 'CHAIR_RENTAL':
                        expect(amount).toBeLessThan(0);
                        break;
                }
            });
        });

        it('should generate transactions with appropriate payment methods', async () => {
            const transactions = await Promise.all(
                Array(10).fill(null).map(() => factory.generate())
            );

            const paymentMethods = transactions
                .filter(t => t.paymentMethod)
                .map(t => t.paymentMethod);

            expect(paymentMethods.length).toBeGreaterThan(0);
            paymentMethods.forEach(method => {
                expect(['CASH', 'CARD', 'DIGITAL_WALLET', 'OTHER', 'BANK_TRANSFER']).toContain(method);
            });
        });

        it('should generate commission amounts for commission-based staff', async () => {
            // Generate multiple transactions to increase chance of getting commission transactions
            const transactions = await Promise.all(
                Array(20).fill(null).map(() => factory.generate())
            );

            const commissionTransactions = transactions.filter(t =>
                t.staffEmploymentType === 'COMMISSION' || t.staffEmploymentType === 'HYBRID'
            );

            expect(commissionTransactions.length).toBeGreaterThan(0);

            commissionTransactions.forEach(transaction => {
                if (transaction.type === 'PAYMENT' || transaction.type === 'COMMISSION') {
                    expect(transaction.commissionRate).toBeDefined();
                    expect(Number(transaction.commissionRate)).toBeGreaterThan(0);
                    expect(Number(transaction.commissionRate)).toBeLessThanOrEqual(100);
                }
            });
        });

        it('should generate transactions with proper metadata', async () => {
            const transaction = await factory.generate();

            expect(transaction.metadata).toBeDefined();

            if (transaction.type === 'PAYMENT') {
                const metadata = transaction.metadata as any;
                expect(metadata.serviceCount).toBeDefined();
                expect(metadata.appointmentDate).toBeDefined();
                expect(metadata.paymentProcessedAt).toBeDefined();
            }
        });
    });

    describe('comprehensive transaction generation', () => {
        beforeEach(async () => {
            await factory.initialize();
        });

        it('should generate the target number of transactions', async () => {
            const targetCount = 50;
            const transactions = await factory.generateComprehensiveTransactions(targetCount);

            expect(transactions).toHaveLength(targetCount);
        });

        it('should generate diverse transaction types', async () => {
            const transactions = await factory.generateComprehensiveTransactions(100);

            const typeDistribution = transactions.reduce((acc, tx) => {
                acc[tx.type] = (acc[tx.type] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            // Should have multiple transaction types
            expect(Object.keys(typeDistribution).length).toBeGreaterThan(1);

            // Payment should be the most common type
            expect(typeDistribution['PAYMENT']).toBeDefined();
            expect(typeDistribution['PAYMENT']).toBeGreaterThan(typeDistribution['TIP'] || 0);
        });

        it('should generate transactions with realistic payment method distribution', async () => {
            const transactions = await factory.generateComprehensiveTransactions(100);

            const paymentMethodDistribution = transactions
                .filter(t => t.paymentMethod)
                .reduce((acc, tx) => {
                    acc[tx.paymentMethod!] = (acc[tx.paymentMethod!] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);

            // Card should be the most common payment method (60% in config)
            expect(paymentMethodDistribution['CARD']).toBeDefined();
            expect(paymentMethodDistribution['CARD']).toBeGreaterThan(paymentMethodDistribution['CASH'] || 0);
        });

        it('should call progress callback during generation', async () => {
            const progressUpdates: Array<{ processed: number; total: number }> = [];

            await factory.generateComprehensiveTransactions(30, undefined, (processed, total) => {
                progressUpdates.push({ processed, total });
            });

            expect(progressUpdates.length).toBeGreaterThan(0);
            expect(progressUpdates[progressUpdates.length - 1].processed).toBe(30);
            expect(progressUpdates[progressUpdates.length - 1].total).toBe(30);
        });
    });

    describe('validation', () => {
        it('should validate required fields', () => {
            const invalidData = {
                // Missing required fields
            };

            const result = (factory as any).validate(invalidData);
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors.some((e: any) => e.field === 'businessId')).toBe(true);
            expect(result.errors.some((e: any) => e.field === 'type')).toBe(true);
        });

        it('should validate refund amounts are negative', () => {
            const refundData = {
                businessId,
                type: 'REFUND',
                status: 'COMPLETED',
                amount: 100, // Should be negative
                currency: 'USD'
            };

            const result = (factory as any).validate(refundData);
            expect(result.isValid).toBe(false);
            expect(result.errors.some((e: any) => e.message.includes('negative'))).toBe(true);
        });

        it('should validate commission rates are within valid range', () => {
            const invalidCommissionData = {
                businessId,
                type: 'COMMISSION',
                status: 'COMPLETED',
                amount: 100,
                currency: 'USD',
                commissionRate: 150 // Invalid: > 100%
            };

            const result = (factory as any).validate(invalidCommissionData);
            expect(result.isValid).toBe(false);
            expect(result.errors.some((e: any) => e.field === 'commissionRate')).toBe(true);
        });

        it('should validate positive amounts for payment types', () => {
            const invalidPaymentData = {
                businessId,
                type: 'PAYMENT',
                status: 'COMPLETED',
                amount: -100, // Should be positive
                currency: 'USD'
            };

            const result = (factory as any).validate(invalidPaymentData);
            expect(result.isValid).toBe(false);
            expect(result.errors.some((e: any) => e.message.includes('positive'))).toBe(true);
        });
    });

    describe('financial calculations', () => {
        beforeEach(async () => {
            await factory.initialize();
        });

        it('should calculate commission amounts correctly', async () => {
            // Generate transactions and check commission calculations
            const transactions = await Promise.all(
                Array(20).fill(null).map(() => factory.generate())
            );

            const paymentTransactions = transactions.filter(t =>
                t.type === 'PAYMENT' && t.commissionAmount && t.commissionRate
            );

            paymentTransactions.forEach(transaction => {
                const amount = Number(transaction.amount);
                const commissionRate = Number(transaction.commissionRate);
                const commissionAmount = Number(transaction.commissionAmount);

                const expectedCommission = Math.round(amount * (commissionRate / 100));
                expect(commissionAmount).toBe(expectedCommission);
            });
        });

        it('should handle different employment types correctly', async () => {
            const transactions = await factory.generateComprehensiveTransactions(50);

            const employmentTypes = [...new Set(transactions
                .filter(t => t.staffEmploymentType)
                .map(t => t.staffEmploymentType))];

            expect(employmentTypes.length).toBeGreaterThan(1);
            expect(employmentTypes).toContain('COMMISSION');
            expect(employmentTypes).toContain('CHAIR_RENTAL');
        });
    });
});
/**
 * Tests for DataResetManager
 */

import { PrismaClient } from '@prisma/client';
import { DataResetManager } from '../../prisma/factories/data-reset-manager';
import { loadSeedConfig } from '../../prisma/factories/seed-config';

// Mock PrismaClient
jest.mock('@prisma/client');

describe('DataResetManager', () => {
    let prisma: jest.Mocked<PrismaClient>;
    let resetManager: DataResetManager;
    const mockBusinessId = 'test-business-123';

    beforeEach(() => {
        prisma = new PrismaClient() as jest.Mocked<PrismaClient>;
        resetManager = new DataResetManager(prisma);

        // Mock common Prisma methods
        prisma.business = {
            findUnique: jest.fn(),
            delete: jest.fn(),
        } as any;

        prisma.client = {
            count: jest.fn(),
            deleteMany: jest.fn(),
        } as any;

        prisma.staff = {
            count: jest.fn(),
            deleteMany: jest.fn(),
        } as any;

        prisma.service = {
            count: jest.fn(),
            deleteMany: jest.fn(),
        } as any;

        prisma.appointment = {
            count: jest.fn(),
            deleteMany: jest.fn(),
            findMany: jest.fn(),
        } as any;

        prisma.transaction = {
            count: jest.fn(),
            deleteMany: jest.fn(),
        } as any;

        prisma.staffService = {
            count: jest.fn(),
            deleteMany: jest.fn(),
        } as any;

        prisma.appointmentService = {
            count: jest.fn(),
            deleteMany: jest.fn(),
        } as any;

        prisma.businessUser = {
            count: jest.fn(),
            deleteMany: jest.fn(),
        } as any;

        prisma.$transaction = jest.fn();
        prisma.$queryRaw = jest.fn();
        prisma.$executeRaw = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getPredefinedScenarios', () => {
        it('should return all predefined scenarios', () => {
            const scenarios = resetManager.getPredefinedScenarios();

            expect(scenarios).toHaveLength(5);
            expect(scenarios.map((s: any) => s.name)).toEqual([
                'demo',
                'development',
                'testing',
                'performance',
                'minimal',
            ]);
        });

        it('should have valid scenario configurations', () => {
            const scenarios = resetManager.getPredefinedScenarios();

            scenarios.forEach((scenario: any) => {
                expect(scenario.name).toBeTruthy();
                expect(scenario.description).toBeTruthy();
                expect(scenario.config).toBeTruthy();
                expect(scenario.config.clients?.count).toBeGreaterThan(0);
                expect(scenario.config.staff?.count).toBeGreaterThan(0);
            });
        });
    });

    describe('getScenario', () => {
        it('should return scenario by name', () => {
            const scenario = resetManager.getScenario('demo');

            expect(scenario).toBeTruthy();
            expect(scenario?.name).toBe('demo');
            expect(scenario?.description).toContain('demonstration');
        });

        it('should return null for non-existent scenario', () => {
            const scenario = resetManager.getScenario('non-existent');

            expect(scenario).toBeNull();
        });
    });

    describe('cleanReset', () => {
        beforeEach(() => {
            // Mock business exists
            (prisma.business.findUnique as jest.Mock).mockResolvedValue({
                id: mockBusinessId,
                name: 'Test Business',
            });

            // Mock transaction
            (prisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
                return await callback(prisma);
            });

            // Mock delete operations
            (prisma.client.deleteMany as jest.Mock).mockResolvedValue({ count: 10 });
            (prisma.staff.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });
            (prisma.service.deleteMany as jest.Mock).mockResolvedValue({ count: 20 });
            (prisma.appointment.deleteMany as jest.Mock).mockResolvedValue({ count: 50 });
            (prisma.transaction.deleteMany as jest.Mock).mockResolvedValue({ count: 30 });
            (prisma.staffService.deleteMany as jest.Mock).mockResolvedValue({ count: 25 });
            (prisma.appointmentService.deleteMany as jest.Mock).mockResolvedValue({ count: 75 });
            (prisma.businessUser.deleteMany as jest.Mock).mockResolvedValue({ count: 3 });

            // Mock raw SQL operations for extended entities
            (prisma.$executeRaw as jest.Mock).mockResolvedValue(0);
        });

        it('should perform clean reset successfully', async () => {
            const result = await resetManager.cleanReset(mockBusinessId);

            expect(result.success).toBe(true);
            expect(result.deletedCounts).toBeTruthy();
            expect(result.errors).toHaveLength(0);
            expect(result.duration).toBeGreaterThan(0);
        });

        it('should handle dry run mode', async () => {
            // Mock count operations for dry run
            (prisma.client.count as jest.Mock).mockResolvedValue(10);
            (prisma.staff.count as jest.Mock).mockResolvedValue(5);
            (prisma.service.count as jest.Mock).mockResolvedValue(20);
            (prisma.appointment.count as jest.Mock).mockResolvedValue(50);
            (prisma.transaction.count as jest.Mock).mockResolvedValue(30);
            (prisma.staffService.count as jest.Mock).mockResolvedValue(25);
            (prisma.appointmentService.count as jest.Mock).mockResolvedValue(75);
            (prisma.businessUser.count as jest.Mock).mockResolvedValue(3);
            (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ count: BigInt(0) }]);

            const result = await resetManager.cleanReset(mockBusinessId, { dryRun: true });

            expect(result.success).toBe(true);
            expect(result.warnings).toContain('Dry run mode - no data was actually deleted');
            expect(prisma.$transaction).not.toHaveBeenCalled();
        });

        it('should preserve users when specified', async () => {
            const result = await resetManager.cleanReset(mockBusinessId, {
                preserveUsers: true,
                preserveBusiness: true,
                preserveBusinessUsers: true,
            });

            expect(result.success).toBe(true);
            expect(prisma.business.delete).not.toHaveBeenCalled();
        });

        it('should handle business not found error', async () => {
            (prisma.business.findUnique as jest.Mock).mockResolvedValue(null);

            const result = await resetManager.cleanReset(mockBusinessId);

            expect(result.success).toBe(false);
            expect(result.errors).toContain(`Business with ID ${mockBusinessId} not found`);
        });

        it('should handle transaction errors gracefully', async () => {
            (prisma.$transaction as jest.Mock).mockRejectedValue(new Error('Transaction failed'));

            const result = await resetManager.cleanReset(mockBusinessId);

            expect(result.success).toBe(false);
            expect(result.errors).toContain('Transaction failed');
        });
    });

    describe('validateDataIntegrity', () => {
        beforeEach(() => {
            // Mock business exists
            (prisma.business.findUnique as jest.Mock).mockResolvedValue({
                id: mockBusinessId,
                name: 'Test Business',
                operatingHours: {
                    monday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
                    tuesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
                    wednesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
                    thursday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
                    friday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
                    saturday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
                    sunday: { isOpen: false, openTime: '10:00', closeTime: '16:00' },
                },
            });

            // Mock count operations
            (prisma.client.count as jest.Mock).mockResolvedValue(10);
            (prisma.staff.count as jest.Mock).mockResolvedValue(5);
            (prisma.service.count as jest.Mock).mockResolvedValue(20);
            (prisma.appointment.count as jest.Mock).mockResolvedValue(50);
            (prisma.transaction.count as jest.Mock).mockResolvedValue(30);
            (prisma.staffService.count as jest.Mock).mockResolvedValue(25);
            (prisma.appointmentService.count as jest.Mock).mockResolvedValue(75);
            (prisma.businessUser.count as jest.Mock).mockResolvedValue(3);
            (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ count: BigInt(0) }]);

            // Mock appointments without services
            (prisma.appointment.count as jest.Mock).mockImplementation((args) => {
                if (args?.where?.appointmentServices?.none) {
                    return Promise.resolve(0); // No appointments without services
                }
                return Promise.resolve(50);
            });

            // Mock staff without services
            (prisma.staff.count as jest.Mock).mockImplementation((args) => {
                if (args?.where?.staffServices?.none) {
                    return Promise.resolve(0); // No staff without services
                }
                return Promise.resolve(5);
            });

            // Mock appointments with transactions
            (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);
        });

        it('should validate data integrity successfully', async () => {
            const result = await resetManager.validateDataIntegrity(mockBusinessId);

            expect(result.isValid).toBe(true);
            expect(result.summary.totalEntities).toBeGreaterThan(0);
            expect(result.summary.criticalErrors).toBe(0);
            expect(result.summary.highErrors).toBe(0);
        });

        it('should detect business not found', async () => {
            (prisma.business.findUnique as jest.Mock).mockResolvedValue(null);

            const result = await resetManager.validateDataIntegrity(mockBusinessId);

            expect(result.isValid).toBe(false);
            expect(result.summary.criticalErrors).toBe(1);
            expect(result.errors[0].message).toContain('Business with ID');
        });

        it('should detect appointments without services', async () => {
            (prisma.appointment.count as jest.Mock).mockImplementation((args) => {
                if (args?.where?.appointmentServices?.none) {
                    return Promise.resolve(5); // 5 appointments without services
                }
                return Promise.resolve(50);
            });

            const result = await resetManager.validateDataIntegrity(mockBusinessId);

            expect(result.isValid).toBe(false);
            expect(result.summary.highErrors).toBeGreaterThan(0);
            expect(result.errors.some((e: any) => e.message.includes('appointments without services'))).toBe(true);
        });

        it('should detect staff without services as warning', async () => {
            (prisma.staff.count as jest.Mock).mockImplementation((args) => {
                if (args?.where?.staffServices?.none) {
                    return Promise.resolve(2); // 2 staff without services
                }
                return Promise.resolve(5);
            });

            const result = await resetManager.validateDataIntegrity(mockBusinessId);

            expect(result.warnings.some((w: any) => w.message.includes('staff members without assigned services'))).toBe(true);
        });
    });

    describe('validateConfiguration', () => {
        it('should validate valid configuration', () => {
            const config = loadSeedConfig();
            const result = resetManager.validateConfiguration(config);

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should detect invalid age range distribution', () => {
            const config = loadSeedConfig();
            config.clients.demographics.ageRanges = {
                '18-25': 0.5,
                '26-35': 0.3,
                '36-45': 0.1,
                '46-55': 0.05,
                '56-65': 0.03,
                '65+': 0.005,
            }; // Sum = 0.985, outside tolerance

            const result = resetManager.validateConfiguration(config);

            expect(result.isValid).toBe(false);
            expect(result.errors.some((e: any) => e.message.includes('Age range distribution'))).toBe(true);
        });

        it('should detect performance warnings for large datasets', () => {
            const config = loadSeedConfig();
            config.clients.count = 150; // Large count
            config.appointments.historicalMonths = 18; // Long period

            const result = resetManager.validateConfiguration(config);

            expect(result.warnings.some((w: any) => w.message.includes('Large client count'))).toBe(true);
            expect(result.warnings.some((w: any) => w.message.includes('Long historical period'))).toBe(true);
        });
    });

    describe('generateDataReport', () => {
        beforeEach(() => {
            // Mock business exists
            (prisma.business.findUnique as jest.Mock).mockResolvedValue({
                id: mockBusinessId,
                name: 'Test Business',
            });

            // Mock entity counts
            (prisma.client.count as jest.Mock).mockResolvedValue(10);
            (prisma.staff.count as jest.Mock).mockResolvedValue(5);
            (prisma.service.count as jest.Mock).mockResolvedValue(20);
            (prisma.appointment.count as jest.Mock).mockResolvedValue(50);
            (prisma.transaction.count as jest.Mock).mockResolvedValue(30);
            (prisma.staffService.count as jest.Mock).mockResolvedValue(25);
            (prisma.appointmentService.count as jest.Mock).mockResolvedValue(75);
            (prisma.businessUser.count as jest.Mock).mockResolvedValue(3);
            (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ count: BigInt(0) }]);

            // Mock validation methods
            (prisma.appointment.count as jest.Mock).mockImplementation((args) => {
                if (args?.where?.appointmentServices?.none) {
                    return Promise.resolve(0);
                }
                return Promise.resolve(50);
            });

            (prisma.staff.count as jest.Mock).mockImplementation((args) => {
                if (args?.where?.staffServices?.none) {
                    return Promise.resolve(0);
                }
                return Promise.resolve(5);
            });

            (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);
        });

        it('should generate comprehensive data report', async () => {
            const report = await resetManager.generateDataReport(mockBusinessId);

            expect(report).toContain('# Data Management Report');
            expect(report).toContain(`## Business: ${mockBusinessId}`);
            expect(report).toContain('## Entity Counts');
            expect(report).toContain('## Validation Summary');
            expect(report).toContain('clients: 10');
            expect(report).toContain('staff: 5');
            expect(report).toContain('services: 20');
        });

        it('should include validation errors in report', async () => {
            // Mock appointments without services
            (prisma.appointment.count as jest.Mock).mockImplementation((args) => {
                if (args?.where?.appointmentServices?.none) {
                    return Promise.resolve(3); // 3 appointments without services
                }
                return Promise.resolve(50);
            });

            const report = await resetManager.generateDataReport(mockBusinessId);

            expect(report).toContain('## Validation Errors');
            expect(report).toContain('appointments without services');
        });
    });
});
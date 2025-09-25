/**
 * @jest-environment node
 */

import { PrismaClient } from '@prisma/client';
import { DataMigrationService } from '../../../lib/services/data-migration';

// Mock Prisma Client
const mockPrisma = {
    $transaction: jest.fn(),
    business: {
        findMany: jest.fn(),
        count: jest.fn(),
    },
    staff: {
        findMany: jest.fn(),
        count: jest.fn(),
    },
    businessHours: {
        create: jest.fn(),
        findMany: jest.fn(),
        deleteMany: jest.fn(),
    },
    staffAvailability: {
        create: jest.fn(),
        findMany: jest.fn(),
        deleteMany: jest.fn(),
    },
} as unknown as PrismaClient;

describe('DataMigrationService', () => {
    let migrationService: DataMigrationService;

    beforeEach(() => {
        migrationService = new DataMigrationService(mockPrisma);
        jest.clearAllMocks();
    });

    describe('getMigrationStatus', () => {
        it('should return correct migration status', async () => {
            // Mock the count queries
            (mockPrisma.business.count as jest.Mock)
                .mockResolvedValueOnce(10) // total businesses
                .mockResolvedValueOnce(8)  // businesses with JSON data
                .mockResolvedValueOnce(5); // businesses with structured data

            (mockPrisma.staff.count as jest.Mock)
                .mockResolvedValueOnce(20) // total staff
                .mockResolvedValueOnce(15) // staff with JSON data
                .mockResolvedValueOnce(10); // staff with structured data

            const status = await migrationService.getMigrationStatus();

            expect(status).toEqual({
                businesses: {
                    total: 10,
                    withJsonData: 8,
                    withStructuredData: 5,
                    migrated: 5,
                    needsMigration: 3,
                },
                staff: {
                    total: 20,
                    withJsonData: 15,
                    withStructuredData: 10,
                    migrated: 10,
                    needsMigration: 5,
                },
            });
        });
    });

    describe('migrateAllData', () => {
        it('should successfully migrate business and staff data', async () => {
            const mockBusinesses = [
                {
                    id: 'business-1',
                    operatingHours: {
                        monday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
                        tuesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
                        wednesday: { isOpen: false, openTime: '09:00', closeTime: '17:00' },
                        thursday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
                        friday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
                        saturday: { isOpen: true, openTime: '08:00', closeTime: '16:00' },
                        sunday: { isOpen: false, openTime: '10:00', closeTime: '16:00' },
                    },
                },
            ];

            const mockStaff = [
                {
                    id: 'staff-1',
                    businessId: 'business-1',
                    workingHours: {
                        monday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
                        tuesday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
                        wednesday: { isAvailable: false, startTime: '09:00', endTime: '17:00' },
                        thursday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
                        friday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
                        saturday: { isAvailable: true, startTime: '08:00', endTime: '16:00' },
                        sunday: { isAvailable: false, startTime: '10:00', endTime: '16:00' },
                    },
                },
            ];

            // Mock transaction
            (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
                const mockTx = {
                    business: {
                        findMany: jest.fn().mockResolvedValue(mockBusinesses),
                    },
                    staff: {
                        findMany: jest.fn().mockResolvedValue(mockStaff),
                    },
                    businessHours: {
                        create: jest.fn().mockImplementation((data) => ({
                            id: `bh-${Date.now()}`,
                            ...data.data,
                        })),
                    },
                    staffAvailability: {
                        create: jest.fn().mockImplementation((data) => ({
                            id: `sa-${Date.now()}`,
                            ...data.data,
                        })),
                    },
                };
                return await callback(mockTx);
            });

            const result = await migrationService.migrateAllData();

            expect(result.success).toBe(true);
            expect(result.businessesMigrated).toBe(1);
            expect(result.staffMigrated).toBe(1);
            expect(result.errors).toHaveLength(0);
            expect(result.rollbackData).toBeDefined();
            expect(result.rollbackData!.businessHours).toHaveLength(7); // 7 days
            expect(result.rollbackData!.staffAvailability).toHaveLength(5); // 5 available days
        });

        it('should handle invalid JSON data gracefully', async () => {
            const mockBusinesses = [
                {
                    id: 'business-1',
                    operatingHours: {
                        monday: { isOpen: true, openTime: 'invalid-time', closeTime: '17:00' },
                    },
                },
            ];

            // Mock transaction
            (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
                const mockTx = {
                    business: {
                        findMany: jest.fn().mockResolvedValue(mockBusinesses),
                    },
                    staff: {
                        findMany: jest.fn().mockResolvedValue([]),
                    },
                    businessHours: {
                        create: jest.fn(),
                    },
                    staffAvailability: {
                        create: jest.fn(),
                    },
                };
                return await callback(mockTx);
            });

            const result = await migrationService.migrateAllData();

            expect(result.success).toBe(false);
            expect(result.businessesMigrated).toBe(0);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].type).toBe('business');
            expect(result.errors[0].error).toContain('Failed to migrate business hours');
        });
    });

    describe('validateMigrationIntegrity', () => {
        it('should validate migration integrity successfully', async () => {
            // Mock successful validation queries
            (mockPrisma.business.findMany as jest.Mock).mockResolvedValue([]);
            (mockPrisma.businessHours.findMany as jest.Mock).mockResolvedValue([]);
            (mockPrisma.staff.findMany as jest.Mock).mockResolvedValue([]);
            (mockPrisma.staffAvailability.findMany as jest.Mock).mockResolvedValue([]);

            const result = await migrationService.validateMigrationIntegrity();

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should detect businesses with JSON but no structured data', async () => {
            const businessesWithoutStructuredData = [
                { id: 'business-1' },
            ];

            (mockPrisma.business.findMany as jest.Mock).mockResolvedValue(businessesWithoutStructuredData);
            (mockPrisma.businessHours.findMany as jest.Mock).mockResolvedValue([]);
            (mockPrisma.staff.findMany as jest.Mock).mockResolvedValue([]);
            (mockPrisma.staffAvailability.findMany as jest.Mock).mockResolvedValue([]);

            const result = await migrationService.validateMigrationIntegrity();

            expect(result.isValid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].type).toBe('business');
            expect(result.errors[0].field).toBe('businessHours');
            expect(result.errors[0].message).toContain('has JSON operating hours but no structured business hours data');
        });

        it('should detect invalid time formats', async () => {
            const invalidTimeFormats = [
                {
                    id: 'bh-1',
                    businessId: 'business-1',
                    openTime: '25:00', // Invalid hour
                    closeTime: '17:00',
                },
            ];

            (mockPrisma.business.findMany as jest.Mock).mockResolvedValue([]);
            (mockPrisma.businessHours.findMany as jest.Mock).mockResolvedValue(invalidTimeFormats);
            (mockPrisma.staff.findMany as jest.Mock).mockResolvedValue([]);
            (mockPrisma.staffAvailability.findMany as jest.Mock).mockResolvedValue([]);

            const result = await migrationService.validateMigrationIntegrity();

            expect(result.isValid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].type).toBe('business');
            expect(result.errors[0].field).toBe('timeFormat');
            expect(result.errors[0].message).toContain('Invalid time format');
        });

        it('should detect logical inconsistencies in time ranges', async () => {
            const logicalInconsistencies = [
                {
                    id: 'bh-1',
                    businessId: 'business-1',
                    openTime: '18:00',
                    closeTime: '09:00', // Close time before open time
                },
            ];

            (mockPrisma.business.findMany as jest.Mock).mockResolvedValue([]);
            (mockPrisma.businessHours.findMany as jest.Mock)
                .mockResolvedValueOnce([]) // First call for invalid time formats
                .mockResolvedValueOnce(logicalInconsistencies); // Second call for logical inconsistencies
            (mockPrisma.staff.findMany as jest.Mock).mockResolvedValue([]);
            (mockPrisma.staffAvailability.findMany as jest.Mock)
                .mockResolvedValueOnce([]) // First call for invalid time formats
                .mockResolvedValueOnce([]); // Second call for logical inconsistencies

            const result = await migrationService.validateMigrationIntegrity();

            expect(result.isValid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].type).toBe('business');
            expect(result.errors[0].field).toBe('timeLogic');
            expect(result.errors[0].message).toContain('Open time (18:00) is not before close time (09:00)');
        });
    });

    describe('rollbackMigration', () => {
        it('should successfully rollback migration', async () => {
            const rollbackData = {
                businessHours: [
                    { id: 'bh-1', businessId: 'business-1', dayOfWeek: 1 },
                    { id: 'bh-2', businessId: 'business-1', dayOfWeek: 2 },
                ],
                staffAvailability: [
                    { id: 'sa-1', staffId: 'staff-1', dayOfWeek: 1 },
                ],
            };

            // Mock transaction
            (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
                const mockTx = {
                    businessHours: {
                        deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
                    },
                    staffAvailability: {
                        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
                    },
                };
                return await callback(mockTx);
            });

            const result = await migrationService.rollbackMigration(rollbackData);

            expect(result.success).toBe(true);
            expect(result.businessHoursRemoved).toBe(2);
            expect(result.staffAvailabilityRemoved).toBe(1);
            expect(result.errors).toHaveLength(0);
        });

        it('should handle missing rollback data', async () => {
            const result = await migrationService.rollbackMigration(undefined);

            expect(result.success).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]).toBe('No rollback data provided');
        });

        it('should handle rollback transaction failure', async () => {
            const rollbackData = {
                businessHours: [{ id: 'bh-1', businessId: 'business-1', dayOfWeek: 1 }],
                staffAvailability: [],
            };

            // Mock transaction failure
            (mockPrisma.$transaction as jest.Mock).mockRejectedValue(new Error('Transaction failed'));

            const result = await migrationService.rollbackMigration(rollbackData);

            expect(result.success).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]).toContain('Rollback failed: Transaction failed');
        });
    });

    describe('Day mapping', () => {
        it('should correctly map day names to numbers', async () => {
            const mockBusinesses = [
                {
                    id: 'business-1',
                    operatingHours: {
                        sunday: { isOpen: true, openTime: '10:00', closeTime: '16:00' },
                        monday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
                        saturday: { isOpen: true, openTime: '08:00', closeTime: '16:00' },
                    },
                },
            ];

            let createdBusinessHours: any[] = [];

            // Mock transaction
            (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
                const mockTx = {
                    business: {
                        findMany: jest.fn().mockResolvedValue(mockBusinesses),
                    },
                    staff: {
                        findMany: jest.fn().mockResolvedValue([]),
                    },
                    businessHours: {
                        create: jest.fn().mockImplementation((data) => {
                            const businessHour = {
                                id: `bh-${Date.now()}-${data.data.dayOfWeek}`,
                                ...data.data,
                            };
                            createdBusinessHours.push(businessHour);
                            return businessHour;
                        }),
                    },
                    staffAvailability: {
                        create: jest.fn(),
                    },
                };
                return await callback(mockTx);
            });

            await migrationService.migrateAllData();

            // Verify day mapping: Sunday=0, Monday=1, Saturday=6
            expect(createdBusinessHours).toHaveLength(3);
            expect(createdBusinessHours.find(bh => bh.dayOfWeek === 0)).toBeDefined(); // Sunday
            expect(createdBusinessHours.find(bh => bh.dayOfWeek === 1)).toBeDefined(); // Monday
            expect(createdBusinessHours.find(bh => bh.dayOfWeek === 6)).toBeDefined(); // Saturday
        });
    });
});
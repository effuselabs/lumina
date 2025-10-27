/**
 * @jest-environment node
 */

import { PrismaClient } from '@prisma/client';
import { BackwardCompatibilityService } from '../../../lib/services/backward-compatibility';

// Mock Prisma Client
const mockPrisma = {
    $transaction: jest.fn(),
    business: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
    },
    staff: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
    },
    businessHours: {
        findMany: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
    },
    staffAvailability: {
        findMany: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
    },
} as unknown as PrismaClient;

describe('BackwardCompatibilityService', () => {
    let compatService: BackwardCompatibilityService;

    beforeEach(() => {
        compatService = new BackwardCompatibilityService(mockPrisma);
        jest.clearAllMocks();
    });

    describe('getBusinessHours', () => {
        it('should return structured data when available', async () => {
            const structuredHours = [
                { dayOfWeek: 1, openTime: '09:00', closeTime: '17:00', isClosed: false },
                { dayOfWeek: 2, openTime: '09:00', closeTime: '17:00', isClosed: false },
            ];

            (mockPrisma.businessHours.findMany as jest.Mock).mockResolvedValue(structuredHours);

            const result = await compatService.getBusinessHours('business-1');

            expect(result.source).toBe('structured');
            expect(result.hours).toHaveLength(2);
            expect(result.migrationNeeded).toBe(false);
            expect(result.deprecationWarning).toBeUndefined();
        });

        it('should fallback to JSON data when structured data is not available', async () => {
            const jsonOperatingHours = {
                monday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
                tuesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
                wednesday: { isOpen: false, openTime: '09:00', closeTime: '17:00' },
                thursday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
                friday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
                saturday: { isOpen: true, openTime: '08:00', closeTime: '16:00' },
                sunday: { isOpen: false, openTime: '10:00', closeTime: '16:00' },
            };

            (mockPrisma.businessHours.findMany as jest.Mock).mockResolvedValue([]);
            (mockPrisma.business.findUnique as jest.Mock).mockResolvedValue({
                operatingHours: jsonOperatingHours,
            });

            // Mock auto-migration
            (mockPrisma.businessHours.count as jest.Mock).mockResolvedValue(0);
            (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
                const mockTx = {
                    businessHours: {
                        create: jest.fn().mockResolvedValue({ id: 'bh-1' }),
                    },
                };
                return await callback(mockTx);
            });

            const result = await compatService.getBusinessHours('business-1');

            expect(result.source).toBe('json');
            expect(result.hours).toHaveLength(7);
            expect(result.migrationNeeded).toBe(true);
            expect(result.deprecationWarning).toContain('deprecated JSON format');

            // Verify day mapping
            const mondayHours = result.hours.find((h: any) => h.dayOfWeek === 1);
            expect(mondayHours).toEqual({
                dayOfWeek: 1,
                openTime: '09:00',
                closeTime: '17:00',
                isClosed: false,
            });

            const sundayHours = result.hours.find((h: any) => h.dayOfWeek === 0);
            expect(sundayHours).toEqual({
                dayOfWeek: 0,
                openTime: null,
                closeTime: null,
                isClosed: true,
            });
        });

        it('should return default hours when no data is available', async () => {
            (mockPrisma.businessHours.findMany as jest.Mock).mockResolvedValue([]);
            (mockPrisma.business.findUnique as jest.Mock).mockResolvedValue({
                operatingHours: null,
            });

            const result = await compatService.getBusinessHours('business-1');

            expect(result.source).toBe('default');
            expect(result.hours).toHaveLength(7);
            expect(result.migrationNeeded).toBe(false);
            expect(result.deprecationWarning).toBeUndefined();

            // Verify default hours structure
            const mondayHours = result.hours.find((h: any) => h.dayOfWeek === 1);
            expect(mondayHours?.isClosed).toBe(false);
            expect(mondayHours?.openTime).toBe('09:00');
            expect(mondayHours?.closeTime).toBe('17:00');

            const sundayHours = result.hours.find((h: any) => h.dayOfWeek === 0);
            expect(sundayHours?.isClosed).toBe(true);
        });

        it('should handle invalid JSON data gracefully', async () => {
            const invalidJsonData = {
                monday: { isOpen: true, openTime: 'invalid-time', closeTime: '17:00' },
            };

            (mockPrisma.businessHours.findMany as jest.Mock).mockResolvedValue([]);
            (mockPrisma.business.findUnique as jest.Mock).mockResolvedValue({
                operatingHours: invalidJsonData,
            });

            const result = await compatService.getBusinessHours('business-1');

            expect(result.source).toBe('default');
            expect(result.hours).toHaveLength(7);
            expect(result.migrationNeeded).toBe(false);
        });
    });

    describe('getStaffAvailability', () => {
        it('should return structured data when available', async () => {
            const structuredAvailability = [
                { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isRecurring: true },
                { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', isRecurring: true },
            ];

            (mockPrisma.staffAvailability.findMany as jest.Mock).mockResolvedValue(structuredAvailability);

            const result = await compatService.getStaffAvailability('staff-1');

            expect(result.source).toBe('structured');
            expect(result.availability).toHaveLength(2);
            expect(result.migrationNeeded).toBe(false);
            expect(result.deprecationWarning).toBeUndefined();
        });

        it('should fallback to JSON data when structured data is not available', async () => {
            const jsonWorkingHours = {
                monday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
                tuesday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
                wednesday: { isAvailable: false, startTime: '09:00', endTime: '17:00' },
                thursday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
                friday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
                saturday: { isAvailable: true, startTime: '08:00', endTime: '16:00' },
                sunday: { isAvailable: false, startTime: '10:00', endTime: '16:00' },
            };

            (mockPrisma.staffAvailability.findMany as jest.Mock).mockResolvedValue([]);
            (mockPrisma.staff.findUnique as jest.Mock).mockResolvedValue({
                workingHours: jsonWorkingHours,
                businessId: 'business-1',
            });

            // Mock auto-migration
            (mockPrisma.staffAvailability.count as jest.Mock).mockResolvedValue(0);
            (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
                const mockTx = {
                    staffAvailability: {
                        create: jest.fn().mockResolvedValue({ id: 'sa-1' }),
                    },
                };
                return await callback(mockTx);
            });

            const result = await compatService.getStaffAvailability('staff-1');

            expect(result.source).toBe('json');
            expect(result.availability).toHaveLength(5); // Only available days
            expect(result.migrationNeeded).toBe(true);
            expect(result.deprecationWarning).toContain('deprecated JSON format');

            // Verify only available days are included
            const availableDays = result.availability.map((a: any) => a.dayOfWeek).sort();
            expect(availableDays).toEqual([1, 2, 4, 5, 6]); // Monday, Tuesday, Thursday, Friday, Saturday
        });

        it('should return empty availability when no data is available', async () => {
            (mockPrisma.staffAvailability.findMany as jest.Mock).mockResolvedValue([]);
            (mockPrisma.staff.findUnique as jest.Mock).mockResolvedValue({
                workingHours: null,
                businessId: 'business-1',
            });

            const result = await compatService.getStaffAvailability('staff-1');

            expect(result.source).toBe('default');
            expect(result.availability).toHaveLength(0);
            expect(result.migrationNeeded).toBe(false);
            expect(result.deprecationWarning).toBeUndefined();
        });
    });

    describe('hasBusinessHours', () => {
        it('should correctly identify structured and JSON data availability', async () => {
            (mockPrisma.businessHours.count as jest.Mock).mockResolvedValue(7);
            (mockPrisma.business.findUnique as jest.Mock).mockResolvedValue({
                operatingHours: { monday: { isOpen: true, openTime: '09:00', closeTime: '17:00' } },
            });

            const result = await compatService.hasBusinessHours('business-1');

            expect(result.hasStructured).toBe(true);
            expect(result.hasJson).toBe(true);
            expect(result.needsMigration).toBe(false); // Has structured, so no migration needed
        });

        it('should identify migration need when only JSON data exists', async () => {
            (mockPrisma.businessHours.count as jest.Mock).mockResolvedValue(0);
            (mockPrisma.business.findUnique as jest.Mock).mockResolvedValue({
                operatingHours: { monday: { isOpen: true, openTime: '09:00', closeTime: '17:00' } },
            });

            const result = await compatService.hasBusinessHours('business-1');

            expect(result.hasStructured).toBe(false);
            expect(result.hasJson).toBe(true);
            expect(result.needsMigration).toBe(true);
        });
    });

    describe('getMigrationCandidates', () => {
        it('should return businesses and staff that need migration', async () => {
            const businesses = [
                { id: 'business-1', name: 'Test Salon' },
                { id: 'business-2', name: 'Another Salon' },
            ];

            const staff = [
                { id: 'staff-1', displayName: 'John Doe', businessId: 'business-1' },
                { id: 'staff-2', displayName: 'Jane Smith', businessId: 'business-2' },
            ];

            (mockPrisma.business.findMany as jest.Mock).mockResolvedValue(businesses);
            (mockPrisma.staff.findMany as jest.Mock).mockResolvedValue(staff);

            const result = await compatService.getMigrationCandidates();

            expect(result.businesses).toHaveLength(2);
            expect(result.staff).toHaveLength(2);
            expect(result.businesses[0].name).toBe('Test Salon');
            expect(result.staff[0].displayName).toBe('John Doe');
        });
    });

    describe('getDeprecationStatistics', () => {
        it('should return correct deprecation statistics', async () => {
            // Mock count queries
            (mockPrisma.business.count as jest.Mock)
                .mockResolvedValueOnce(5) // businesses using JSON
                .mockResolvedValueOnce(10) // total businesses
                .mockResolvedValueOnce(8); // businesses with structured data

            (mockPrisma.staff.count as jest.Mock)
                .mockResolvedValueOnce(3) // staff using JSON
                .mockResolvedValueOnce(20) // total staff
                .mockResolvedValueOnce(15); // staff with structured data

            const result = await compatService.getDeprecationStatistics();

            expect(result.businessesUsingJson).toBe(5);
            expect(result.staffUsingJson).toBe(3);
            expect(result.totalBusinesses).toBe(10);
            expect(result.totalStaff).toBe(20);
            expect(result.migrationProgress.businesses).toBe(80); // 8/10 * 100
            expect(result.migrationProgress.staff).toBe(75); // 15/20 * 100
        });
    });

    describe('forceMigrateBusiness', () => {
        it('should successfully migrate business hours', async () => {
            const jsonOperatingHours = {
                monday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
                tuesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
            };

            (mockPrisma.business.findUnique as jest.Mock).mockResolvedValue({
                operatingHours: jsonOperatingHours,
            });

            (mockPrisma.businessHours.count as jest.Mock).mockResolvedValue(0);
            (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
                const mockTx = {
                    businessHours: {
                        create: jest.fn().mockResolvedValue({ id: 'bh-1' }),
                    },
                };
                return await callback(mockTx);
            });

            const result = await compatService.forceMigrateBusiness('business-1');

            expect(result.success).toBe(true);
            expect(result.migratedHours).toBe(2);
            expect(result.error).toBeUndefined();
        });

        it('should handle business with no JSON data', async () => {
            (mockPrisma.business.findUnique as jest.Mock).mockResolvedValue({
                operatingHours: null,
            });

            const result = await compatService.forceMigrateBusiness('business-1');

            expect(result.success).toBe(false);
            expect(result.error).toBe('No JSON operating hours found for this business');
            expect(result.migratedHours).toBe(0);
        });
    });

    describe('forceMigrateStaff', () => {
        it('should successfully migrate staff availability', async () => {
            const jsonWorkingHours = {
                monday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
                tuesday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
                wednesday: { isAvailable: false, startTime: '09:00', endTime: '17:00' },
            };

            (mockPrisma.staff.findUnique as jest.Mock).mockResolvedValue({
                workingHours: jsonWorkingHours,
                businessId: 'business-1',
            });

            (mockPrisma.staffAvailability.count as jest.Mock).mockResolvedValue(0);
            (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
                const mockTx = {
                    staffAvailability: {
                        create: jest.fn().mockResolvedValue({ id: 'sa-1' }),
                    },
                };
                return await callback(mockTx);
            });

            const result = await compatService.forceMigrateStaff('staff-1');

            expect(result.success).toBe(true);
            expect(result.migratedSlots).toBe(2); // Only available days
            expect(result.error).toBeUndefined();
        });

        it('should handle staff with no JSON data', async () => {
            (mockPrisma.staff.findUnique as jest.Mock).mockResolvedValue({
                workingHours: null,
                businessId: 'business-1',
            });

            const result = await compatService.forceMigrateStaff('staff-1');

            expect(result.success).toBe(false);
            expect(result.error).toBe('No JSON working hours found for this staff member');
            expect(result.migratedSlots).toBe(0);
        });
    });
});
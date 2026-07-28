/**
 * Backward Compatibility Layer for Calendar Infrastructure
 * 
 * Provides fallback reading from JSON fields when structured data is unavailable,
 * automatic migration triggers, and gradual migration strategy with dual-read capability.
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { z } from 'zod';

// Types for business hours
interface BusinessHour {
    dayOfWeek: number;
    openTime: string | null;
    closeTime: string | null;
    isClosed: boolean;
}

interface BusinessHoursResult {
    source: 'structured' | 'json' | 'default';
    hours: BusinessHour[];
    migrationNeeded: boolean;
    deprecationWarning?: string;
}

// Types for staff availability
interface StaffAvailabilitySlot {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isRecurring: boolean;
}

interface StaffAvailabilityResult {
    source: 'structured' | 'json' | 'default';
    availability: StaffAvailabilitySlot[];
    migrationNeeded: boolean;
    deprecationWarning?: string;
}

// Validation schemas for JSON data
const OperatingHoursSchema = z.record(
    z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
    z.object({
        isOpen: z.boolean(),
        openTime: z.string().regex(/^\d{2}:\d{2}$/),
        closeTime: z.string().regex(/^\d{2}:\d{2}$/),
    })
);

const WorkingHoursSchema = z.record(
    z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
    z.object({
        isAvailable: z.boolean(),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime: z.string().regex(/^\d{2}:\d{2}$/),
    })
);

export class BackwardCompatibilityService {
    private readonly dayMapping = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
    };

    private readonly defaultBusinessHours: BusinessHour[] = [
        { dayOfWeek: 0, openTime: null, closeTime: null, isClosed: true }, // Sunday
        { dayOfWeek: 1, openTime: '09:00', closeTime: '17:00', isClosed: false }, // Monday
        { dayOfWeek: 2, openTime: '09:00', closeTime: '17:00', isClosed: false }, // Tuesday
        { dayOfWeek: 3, openTime: '09:00', closeTime: '17:00', isClosed: false }, // Wednesday
        { dayOfWeek: 4, openTime: '09:00', closeTime: '17:00', isClosed: false }, // Thursday
        { dayOfWeek: 5, openTime: '09:00', closeTime: '17:00', isClosed: false }, // Friday
        { dayOfWeek: 6, openTime: '09:00', closeTime: '16:00', isClosed: false }, // Saturday
    ];

    constructor(private prisma: PrismaClient) { }

    /**
     * Get business hours with fallback to JSON data
     */
    async getBusinessHours(businessId: string): Promise<BusinessHoursResult> {
        try {
            // First, try to get structured data
            const structuredHours = await this.prisma.businessHours.findMany({
                where: { businessId },
                orderBy: { dayOfWeek: 'asc' },
            });

            if (structuredHours.length > 0) {
                return {
                    source: 'structured',
                    hours: structuredHours.map(hour => ({
                        dayOfWeek: hour.dayOfWeek,
                        openTime: hour.openTime,
                        closeTime: hour.closeTime,
                        isClosed: hour.isClosed,
                    })),
                    migrationNeeded: false,
                };
            }

            // Fallback to JSON data
            const business = await this.prisma.business.findUnique({
                where: { id: businessId },
                select: { operatingHours: true },
            });

            if (business?.operatingHours) {
                try {
                    const jsonHours = OperatingHoursSchema.parse(business.operatingHours);
                    const hours = this.convertJsonToBusinessHours(jsonHours);

                    // Trigger automatic migration for this business
                    this.triggerBusinessHoursMigration(businessId, jsonHours).catch(error => {
                        console.warn(`Failed to auto-migrate business hours for ${businessId}:`, error);
                    });

                    return {
                        source: 'json',
                        hours,
                        migrationNeeded: true,
                        deprecationWarning: 'Business hours are being read from deprecated JSON format. Migration to structured format is recommended.',
                    };
                } catch (error) {
                    console.warn(`Invalid JSON operating hours for business ${businessId}:`, error);
                }
            }

            // Use default hours
            return {
                source: 'default',
                hours: this.defaultBusinessHours,
                migrationNeeded: false,
            };
        } catch (error) {
            console.error(`Error getting business hours for ${businessId}:`, error);
            return {
                source: 'default',
                hours: this.defaultBusinessHours,
                migrationNeeded: false,
            };
        }
    }

    /**
     * Get staff availability with fallback to JSON data
     */
    async getStaffAvailability(staffId: string): Promise<StaffAvailabilityResult> {
        try {
            // First, try to get structured data
            const structuredAvailability = await this.prisma.staffAvailability.findMany({
                where: { staffId },
                orderBy: { dayOfWeek: 'asc' },
            });

            if (structuredAvailability.length > 0) {
                return {
                    source: 'structured',
                    availability: structuredAvailability.map(slot => ({
                        dayOfWeek: slot.dayOfWeek,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        isRecurring: slot.isRecurring,
                    })),
                    migrationNeeded: false,
                };
            }

            // Fallback to JSON data
            const staff = await this.prisma.staff.findUnique({
                where: { id: staffId },
                select: { workingHours: true, businessId: true },
            });

            if (staff?.workingHours) {
                try {
                    const jsonHours = WorkingHoursSchema.parse(staff.workingHours);
                    const availability = this.convertJsonToStaffAvailability(jsonHours);

                    // Trigger automatic migration for this staff member
                    this.triggerStaffAvailabilityMigration(staffId, staff.businessId, jsonHours).catch(error => {
                        console.warn(`Failed to auto-migrate staff availability for ${staffId}:`, error);
                    });

                    return {
                        source: 'json',
                        availability,
                        migrationNeeded: true,
                        deprecationWarning: 'Staff availability is being read from deprecated JSON format. Migration to structured format is recommended.',
                    };
                } catch (error) {
                    console.warn(`Invalid JSON working hours for staff ${staffId}:`, error);
                }
            }

            // No availability data found
            return {
                source: 'default',
                availability: [],
                migrationNeeded: false,
            };
        } catch (error) {
            console.error(`Error getting staff availability for ${staffId}:`, error);
            return {
                source: 'default',
                availability: [],
                migrationNeeded: false,
            };
        }
    }

    /**
     * Check if business hours are available (structured or JSON)
     */
    async hasBusinessHours(businessId: string): Promise<{
        hasStructured: boolean;
        hasJson: boolean;
        needsMigration: boolean;
    }> {
        const [structuredCount, business] = await Promise.all([
            this.prisma.businessHours.count({ where: { businessId } }),
            this.prisma.business.findUnique({
                where: { id: businessId },
                select: { operatingHours: true },
            }),
        ]);

        const hasStructured = structuredCount > 0;
        const hasJson = business?.operatingHours != null;

        return {
            hasStructured,
            hasJson,
            needsMigration: hasJson && !hasStructured,
        };
    }

    /**
     * Check if staff availability is available (structured or JSON)
     */
    async hasStaffAvailability(staffId: string): Promise<{
        hasStructured: boolean;
        hasJson: boolean;
        needsMigration: boolean;
    }> {
        const [structuredCount, staff] = await Promise.all([
            this.prisma.staffAvailability.count({ where: { staffId } }),
            this.prisma.staff.findUnique({
                where: { id: staffId },
                select: { workingHours: true },
            }),
        ]);

        const hasStructured = structuredCount > 0;
        const hasJson = staff?.workingHours != null;

        return {
            hasStructured,
            hasJson,
            needsMigration: hasJson && !hasStructured,
        };
    }

    /**
     * Get migration candidates (entities that have JSON but no structured data)
     */
    async getMigrationCandidates(): Promise<{
        businesses: Array<{ id: string; name: string }>;
        staff: Array<{ id: string; displayName: string; businessId: string }>;
    }> {
        const [businesses, staff] = await Promise.all([
            this.prisma.business.findMany({
                where: {
                    operatingHours: { not: Prisma.DbNull },
                    businessHours: { none: {} },
                },
                select: { id: true, name: true },
            }),
            this.prisma.staff.findMany({
                where: {
                    workingHours: { not: Prisma.DbNull },
                    staffAvailability: { none: {} },
                },
                select: { id: true, displayName: true, businessId: true },
            }),
        ]);

        return { businesses, staff };
    }

    /**
     * Automatically migrate business hours from JSON to structured format
     */
    private async triggerBusinessHoursMigration(
        businessId: string,
        jsonHours: Record<string, { isOpen: boolean; openTime: string; closeTime: string }>
    ): Promise<void> {
        try {
            // Check if migration is already in progress or completed
            const existingHours = await this.prisma.businessHours.count({
                where: { businessId },
            });

            if (existingHours > 0) {
                return; // Already migrated
            }

            // Perform migration in transaction
            await this.prisma.$transaction(async (tx) => {
                const businessHours = this.convertJsonToBusinessHours(jsonHours);

                for (const hour of businessHours) {
                    await tx.businessHours.create({
                        data: {
                            businessId,
                            dayOfWeek: hour.dayOfWeek,
                            openTime: hour.openTime,
                            closeTime: hour.closeTime,
                            isClosed: hour.isClosed,
                        },
                    });
                }
            });

            console.log(`Auto-migrated business hours for business ${businessId}`);
        } catch (error) {
            console.error(`Failed to auto-migrate business hours for ${businessId}:`, error);
            throw error;
        }
    }

    /**
     * Automatically migrate staff availability from JSON to structured format
     */
    private async triggerStaffAvailabilityMigration(
        staffId: string,
        businessId: string,
        jsonHours: Record<string, { isAvailable: boolean; startTime: string; endTime: string }>
    ): Promise<void> {
        try {
            // Check if migration is already in progress or completed
            const existingAvailability = await this.prisma.staffAvailability.count({
                where: { staffId },
            });

            if (existingAvailability > 0) {
                return; // Already migrated
            }

            // Perform migration in transaction
            await this.prisma.$transaction(async (tx) => {
                const availability = this.convertJsonToStaffAvailability(jsonHours);

                for (const slot of availability) {
                    await tx.staffAvailability.create({
                        data: {
                            staffId,
                            businessId,
                            dayOfWeek: slot.dayOfWeek,
                            startTime: slot.startTime,
                            endTime: slot.endTime,
                            isRecurring: slot.isRecurring,
                        },
                    });
                }
            });

            console.log(`Auto-migrated staff availability for staff ${staffId}`);
        } catch (error) {
            console.error(`Failed to auto-migrate staff availability for ${staffId}:`, error);
            throw error;
        }
    }

    /**
     * Convert JSON operating hours to structured business hours
     */
    private convertJsonToBusinessHours(
        jsonHours: Record<string, { isOpen: boolean; openTime: string; closeTime: string }>
    ): BusinessHour[] {
        const hours: BusinessHour[] = [];

        for (const [dayName, dayHours] of Object.entries(jsonHours)) {
            const dayOfWeek = this.dayMapping[dayName as keyof typeof this.dayMapping];

            hours.push({
                dayOfWeek,
                openTime: dayHours.isOpen ? dayHours.openTime : null,
                closeTime: dayHours.isOpen ? dayHours.closeTime : null,
                isClosed: !dayHours.isOpen,
            });
        }

        return hours.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    }

    /**
     * Convert JSON working hours to structured staff availability
     */
    private convertJsonToStaffAvailability(
        jsonHours: Record<string, { isAvailable: boolean; startTime: string; endTime: string }>
    ): StaffAvailabilitySlot[] {
        const availability: StaffAvailabilitySlot[] = [];

        for (const [dayName, dayHours] of Object.entries(jsonHours)) {
            if (dayHours.isAvailable) {
                const dayOfWeek = this.dayMapping[dayName as keyof typeof this.dayMapping];

                availability.push({
                    dayOfWeek,
                    startTime: dayHours.startTime,
                    endTime: dayHours.endTime,
                    isRecurring: true,
                });
            }
        }

        return availability.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    }

    /**
     * Log deprecation warning for JSON field usage
     */
    logDeprecationWarning(type: 'business' | 'staff', id: string, field: string): void {
        const timestamp = new Date().toISOString();
        const message = `[${timestamp}] DEPRECATION WARNING: ${type} ${id} is using deprecated JSON field '${field}'. Please migrate to structured format.`;

        console.warn(message);

        // In a production environment, you might want to send this to a logging service
        // or store it in a database for monitoring purposes
    }

    /**
     * Get deprecation statistics
     */
    async getDeprecationStatistics(): Promise<{
        businessesUsingJson: number;
        staffUsingJson: number;
        totalBusinesses: number;
        totalStaff: number;
        migrationProgress: {
            businesses: number; // percentage
            staff: number; // percentage
        };
    }> {
        const [
            businessesUsingJson,
            staffUsingJson,
            totalBusinesses,
            totalStaff,
            businessesWithStructured,
            staffWithStructured,
        ] = await Promise.all([
            this.prisma.business.count({
                where: { operatingHours: { not: Prisma.DbNull } },
            }),
            this.prisma.staff.count({
                where: { workingHours: { not: Prisma.DbNull } },
            }),
            this.prisma.business.count(),
            this.prisma.staff.count(),
            this.prisma.business.count({
                where: { businessHours: { some: {} } },
            }),
            this.prisma.staff.count({
                where: { staffAvailability: { some: {} } },
            }),
        ]);

        return {
            businessesUsingJson,
            staffUsingJson,
            totalBusinesses,
            totalStaff,
            migrationProgress: {
                businesses: totalBusinesses > 0 ? Math.round((businessesWithStructured / totalBusinesses) * 100) : 0,
                staff: totalStaff > 0 ? Math.round((staffWithStructured / totalStaff) * 100) : 0,
            },
        };
    }

    /**
     * Force migration for specific business
     */
    async forceMigrateBusiness(businessId: string): Promise<{
        success: boolean;
        error?: string;
        migratedHours: number;
    }> {
        try {
            const business = await this.prisma.business.findUnique({
                where: { id: businessId },
                select: { operatingHours: true },
            });

            if (!business?.operatingHours) {
                return {
                    success: false,
                    error: 'No JSON operating hours found for this business',
                    migratedHours: 0,
                };
            }

            const jsonHours = OperatingHoursSchema.parse(business.operatingHours);
            await this.triggerBusinessHoursMigration(businessId, jsonHours);

            return {
                success: true,
                migratedHours: Object.keys(jsonHours).length,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                migratedHours: 0,
            };
        }
    }

    /**
     * Force migration for specific staff member
     */
    async forceMigrateStaff(staffId: string): Promise<{
        success: boolean;
        error?: string;
        migratedSlots: number;
    }> {
        try {
            const staff = await this.prisma.staff.findUnique({
                where: { id: staffId },
                select: { workingHours: true, businessId: true },
            });

            if (!staff?.workingHours) {
                return {
                    success: false,
                    error: 'No JSON working hours found for this staff member',
                    migratedSlots: 0,
                };
            }

            const jsonHours = WorkingHoursSchema.parse(staff.workingHours);
            await this.triggerStaffAvailabilityMigration(staffId, staff.businessId, jsonHours);

            const availableSlots = Object.values(jsonHours).filter(h => h.isAvailable).length;

            return {
                success: true,
                migratedSlots: availableSlots,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                migratedSlots: 0,
            };
        }
    }
}
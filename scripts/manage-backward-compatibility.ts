#!/usr/bin/env tsx

/**
 * Backward Compatibility Management Script
 * 
 * Manages the gradual migration strategy and provides tools for monitoring
 * and managing the transition from JSON to structured data.
 * 
 * Usage:
 *   npm run compat:status
 *   npm run compat:candidates
 *   npm run compat:migrate-business <businessId>
 *   npm run compat:migrate-staff <staffId>
 *   npm run compat:migrate-all
 */

import { PrismaClient } from '@prisma/client';
import { BackwardCompatibilityService } from '../lib/services/backward-compatibility';

const prisma = new PrismaClient();

interface CliOptions {
    command: string;
    businessId?: string;
    staffId?: string;
    help: boolean;
}

function parseArgs(): CliOptions {
    const args = process.argv.slice(2);

    return {
        command: args[0] || 'help',
        businessId: args[1],
        staffId: args[1],
        help: args.includes('--help') || args.includes('-h') || args[0] === 'help',
    };
}

function printHelp() {
    console.log(`
Backward Compatibility Management Script

Usage:
  npm run compat:status                    Show migration status and deprecation statistics
  npm run compat:candidates                List entities that need migration
  npm run compat:migrate-business <id>     Force migrate specific business
  npm run compat:migrate-staff <id>        Force migrate specific staff member
  npm run compat:migrate-all               Migrate all candidates
  npm run compat:test-fallback <id>        Test fallback behavior for business/staff

Commands:
  status        Show current migration status and deprecation statistics
  candidates    List businesses and staff that need migration
  migrate-business <businessId>    Force migrate business hours for specific business
  migrate-staff <staffId>          Force migrate availability for specific staff
  migrate-all   Migrate all candidates automatically
  test-fallback <id>               Test fallback behavior (specify business or staff ID)
  help          Show this help message

Examples:
  npm run compat:status
  npm run compat:candidates
  npm run compat:migrate-business business-123
  npm run compat:migrate-staff staff-456
  npm run compat:migrate-all
`);
}

async function showStatus(compatService: BackwardCompatibilityService) {
    console.log('📊 Backward Compatibility Status\n');

    const stats = await compatService.getDeprecationStatistics();

    console.log('📈 Migration Progress:');
    console.log(`  Businesses: ${stats.migrationProgress.businesses}% migrated`);
    console.log(`  Staff: ${stats.migrationProgress.staff}% migrated`);

    console.log('\n📋 Current State:');
    console.log(`  Total businesses: ${stats.totalBusinesses}`);
    console.log(`  Businesses using JSON: ${stats.businessesUsingJson}`);
    console.log(`  Total staff: ${stats.totalStaff}`);
    console.log(`  Staff using JSON: ${stats.staffUsingJson}`);

    const businessesNeedMigration = stats.businessesUsingJson;
    const staffNeedMigration = stats.staffUsingJson;
    const totalNeedMigration = businessesNeedMigration + staffNeedMigration;

    if (totalNeedMigration === 0) {
        console.log('\n✅ All entities have been migrated to structured format!');
    } else {
        console.log(`\n⚠️  ${totalNeedMigration} entities still using deprecated JSON format:`);
        console.log(`  - ${businessesNeedMigration} businesses`);
        console.log(`  - ${staffNeedMigration} staff members`);
        console.log('\nRun "npm run compat:candidates" to see specific entities');
        console.log('Run "npm run compat:migrate-all" to migrate all candidates');
    }
}

async function showCandidates(compatService: BackwardCompatibilityService) {
    console.log('🎯 Migration Candidates\n');

    const candidates = await compatService.getMigrationCandidates();

    if (candidates.businesses.length === 0 && candidates.staff.length === 0) {
        console.log('✅ No migration candidates found - all entities are using structured format!');
        return;
    }

    if (candidates.businesses.length > 0) {
        console.log(`🏢 Businesses needing migration (${candidates.businesses.length}):`);
        candidates.businesses.forEach((business, index) => {
            console.log(`  ${index + 1}. ${business.name} (ID: ${business.id})`);
        });
        console.log();
    }

    if (candidates.staff.length > 0) {
        console.log(`👥 Staff needing migration (${candidates.staff.length}):`);
        candidates.staff.forEach((staff, index) => {
            console.log(`  ${index + 1}. ${staff.displayName} (ID: ${staff.id}, Business: ${staff.businessId})`);
        });
        console.log();
    }

    console.log('💡 Migration Commands:');
    if (candidates.businesses.length > 0) {
        console.log('  Business: npm run compat:migrate-business <businessId>');
    }
    if (candidates.staff.length > 0) {
        console.log('  Staff: npm run compat:migrate-staff <staffId>');
    }
    console.log('  All: npm run compat:migrate-all');
}

async function migrateBusiness(compatService: BackwardCompatibilityService, businessId: string) {
    console.log(`🏢 Migrating business hours for business: ${businessId}\n`);

    const result = await compatService.forceMigrateBusiness(businessId);

    if (result.success) {
        console.log(`✅ Successfully migrated ${result.migratedHours} business hours`);
    } else {
        console.log(`❌ Migration failed: ${result.error}`);
        process.exit(1);
    }
}

async function migrateStaff(compatService: BackwardCompatibilityService, staffId: string) {
    console.log(`👤 Migrating staff availability for staff: ${staffId}\n`);

    const result = await compatService.forceMigrateStaff(staffId);

    if (result.success) {
        console.log(`✅ Successfully migrated ${result.migratedSlots} availability slots`);
    } else {
        console.log(`❌ Migration failed: ${result.error}`);
        process.exit(1);
    }
}

async function migrateAll(compatService: BackwardCompatibilityService) {
    console.log('🚀 Migrating all candidates\n');

    const candidates = await compatService.getMigrationCandidates();
    const totalCandidates = candidates.businesses.length + candidates.staff.length;

    if (totalCandidates === 0) {
        console.log('✅ No candidates found - all entities are already migrated!');
        return;
    }

    console.log(`📋 Found ${totalCandidates} candidates to migrate:`);
    console.log(`  - ${candidates.businesses.length} businesses`);
    console.log(`  - ${candidates.staff.length} staff members\n`);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Migrate businesses
    for (const business of candidates.businesses) {
        try {
            console.log(`🏢 Migrating business: ${business.name}...`);
            const result = await compatService.forceMigrateBusiness(business.id);

            if (result.success) {
                console.log(`  ✅ Migrated ${result.migratedHours} hours`);
                successCount++;
            } else {
                console.log(`  ❌ Failed: ${result.error}`);
                errors.push(`Business ${business.name}: ${result.error}`);
                errorCount++;
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.log(`  ❌ Failed: ${errorMessage}`);
            errors.push(`Business ${business.name}: ${errorMessage}`);
            errorCount++;
        }
    }

    // Migrate staff
    for (const staff of candidates.staff) {
        try {
            console.log(`👤 Migrating staff: ${staff.displayName}...`);
            const result = await compatService.forceMigrateStaff(staff.id);

            if (result.success) {
                console.log(`  ✅ Migrated ${result.migratedSlots} slots`);
                successCount++;
            } else {
                console.log(`  ❌ Failed: ${result.error}`);
                errors.push(`Staff ${staff.displayName}: ${result.error}`);
                errorCount++;
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.log(`  ❌ Failed: ${errorMessage}`);
            errors.push(`Staff ${staff.displayName}: ${errorMessage}`);
            errorCount++;
        }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`  ✅ Successful: ${successCount}`);
    console.log(`  ❌ Failed: ${errorCount}`);

    if (errors.length > 0) {
        console.log('\n❌ Errors:');
        errors.forEach((error, index) => {
            console.log(`  ${index + 1}. ${error}`);
        });
    }

    if (errorCount > 0) {
        process.exit(1);
    } else {
        console.log('\n🎉 All migrations completed successfully!');
    }
}

async function testFallback(compatService: BackwardCompatibilityService, entityId: string) {
    console.log(`🧪 Testing fallback behavior for entity: ${entityId}\n`);

    // Try as business first
    try {
        const businessHours = await compatService.getBusinessHours(entityId);
        console.log('🏢 Business Hours Result:');
        console.log(`  Source: ${businessHours.source}`);
        console.log(`  Migration needed: ${businessHours.migrationNeeded}`);
        console.log(`  Hours count: ${businessHours.hours.length}`);

        if (businessHours.deprecationWarning) {
            console.log(`  ⚠️  Warning: ${businessHours.deprecationWarning}`);
        }

        console.log('\n📅 Hours Details:');
        businessHours.hours.forEach(hour => {
            const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][hour.dayOfWeek];
            if (hour.isClosed) {
                console.log(`    ${dayName}: Closed`);
            } else {
                console.log(`    ${dayName}: ${hour.openTime} - ${hour.closeTime}`);
            }
        });

        return;
    } catch (error) {
        // Not a business, try as staff
    }

    // Try as staff
    try {
        const staffAvailability = await compatService.getStaffAvailability(entityId);
        console.log('👤 Staff Availability Result:');
        console.log(`  Source: ${staffAvailability.source}`);
        console.log(`  Migration needed: ${staffAvailability.migrationNeeded}`);
        console.log(`  Availability slots: ${staffAvailability.availability.length}`);

        if (staffAvailability.deprecationWarning) {
            console.log(`  ⚠️  Warning: ${staffAvailability.deprecationWarning}`);
        }

        if (staffAvailability.availability.length > 0) {
            console.log('\n📅 Availability Details:');
            staffAvailability.availability.forEach(slot => {
                const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][slot.dayOfWeek];
                console.log(`    ${dayName}: ${slot.startTime} - ${slot.endTime} (Recurring: ${slot.isRecurring})`);
            });
        }

        return;
    } catch (error) {
        console.log(`❌ Entity ${entityId} not found as business or staff member`);
        process.exit(1);
    }
}

async function main() {
    const options = parseArgs();

    if (options.help) {
        printHelp();
        return;
    }

    const compatService = new BackwardCompatibilityService(prisma);

    try {
        switch (options.command) {
            case 'status':
                await showStatus(compatService);
                break;

            case 'candidates':
                await showCandidates(compatService);
                break;

            case 'migrate-business':
                if (!options.businessId) {
                    console.log('❌ Business ID is required');
                    console.log('Usage: npm run compat:migrate-business <businessId>');
                    process.exit(1);
                }
                await migrateBusiness(compatService, options.businessId);
                break;

            case 'migrate-staff':
                if (!options.staffId) {
                    console.log('❌ Staff ID is required');
                    console.log('Usage: npm run compat:migrate-staff <staffId>');
                    process.exit(1);
                }
                await migrateStaff(compatService, options.staffId);
                break;

            case 'migrate-all':
                await migrateAll(compatService);
                break;

            case 'test-fallback':
                if (!options.businessId) {
                    console.log('❌ Entity ID is required');
                    console.log('Usage: npm run compat:test-fallback <entityId>');
                    process.exit(1);
                }
                await testFallback(compatService, options.businessId);
                break;

            default:
                console.log(`❌ Unknown command: ${options.command}`);
                printHelp();
                process.exit(1);
        }
    } catch (error) {
        console.error('❌ Script failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

main().catch((error) => {
    console.error('❌ Compatibility management script failed:', error);
    process.exit(1);
});
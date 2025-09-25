#!/usr/bin/env tsx

/**
 * Calendar Data Migration Script
 * 
 * Migrates existing JSON-based operatingHours and workingHours data
 * to structured database tables for the calendar infrastructure.
 * 
 * Usage:
 *   npm run migrate:calendar-data [--dry-run] [--rollback] [--status]
 */

import { PrismaClient } from '@prisma/client';
import { DataMigrationService } from '../lib/services/data-migration';

const prisma = new PrismaClient();

interface CliOptions {
    dryRun: boolean;
    rollback: boolean;
    status: boolean;
    help: boolean;
}

function parseArgs(): CliOptions {
    const args = process.argv.slice(2);
    return {
        dryRun: args.includes('--dry-run'),
        rollback: args.includes('--rollback'),
        status: args.includes('--status'),
        help: args.includes('--help') || args.includes('-h'),
    };
}

function printHelp() {
    console.log(`
Calendar Data Migration Script

Usage:
  npm run migrate:calendar-data [options]

Options:
  --dry-run     Show what would be migrated without making changes
  --status      Show current migration status
  --rollback    Rollback the last migration (requires rollback data)
  --help, -h    Show this help message

Examples:
  npm run migrate:calendar-data --status
  npm run migrate:calendar-data --dry-run
  npm run migrate:calendar-data
  npm run migrate:calendar-data --rollback
`);
}

async function showMigrationStatus(migrationService: DataMigrationService) {
    console.log('📊 Checking migration status...\n');

    const status = await migrationService.getMigrationStatus();

    console.log('🏢 Business Operating Hours:');
    console.log(`  Total businesses: ${status.businesses.total}`);
    console.log(`  With JSON data: ${status.businesses.withJsonData}`);
    console.log(`  With structured data: ${status.businesses.withStructuredData}`);
    console.log(`  Already migrated: ${status.businesses.migrated}`);
    console.log(`  Need migration: ${status.businesses.needsMigration}`);

    console.log('\n👥 Staff Working Hours:');
    console.log(`  Total staff: ${status.staff.total}`);
    console.log(`  With JSON data: ${status.staff.withJsonData}`);
    console.log(`  With structured data: ${status.staff.withStructuredData}`);
    console.log(`  Already migrated: ${status.staff.migrated}`);
    console.log(`  Need migration: ${status.staff.needsMigration}`);

    const totalNeedsMigration = status.businesses.needsMigration + status.staff.needsMigration;

    if (totalNeedsMigration === 0) {
        console.log('\n✅ All data has been migrated successfully!');
    } else {
        console.log(`\n⚠️  ${totalNeedsMigration} items need migration`);
        console.log('Run without --status flag to perform migration');
    }
}

async function performDryRun(migrationService: DataMigrationService) {
    console.log('🔍 Performing dry run (no changes will be made)...\n');

    const status = await migrationService.getMigrationStatus();

    console.log('📋 Migration Plan:');
    console.log(`  Business hours to migrate: ${status.businesses.needsMigration}`);
    console.log(`  Staff availability to migrate: ${status.staff.needsMigration}`);

    if (status.businesses.needsMigration === 0 && status.staff.needsMigration === 0) {
        console.log('\n✅ No migration needed - all data is already migrated');
        return;
    }

    console.log('\n🔄 Would perform the following actions:');

    if (status.businesses.needsMigration > 0) {
        console.log(`  1. Migrate ${status.businesses.needsMigration} business operating hours from JSON to business_hours table`);
        console.log('     - Validate JSON structure');
        console.log('     - Convert day names to numeric values');
        console.log('     - Create business_hours records');
    }

    if (status.staff.needsMigration > 0) {
        console.log(`  2. Migrate ${status.staff.needsMigration} staff working hours from JSON to staff_availability table`);
        console.log('     - Validate JSON structure');
        console.log('     - Convert day names to numeric values');
        console.log('     - Create staff_availability records');
    }

    console.log('\n✅ Dry run complete. Run without --dry-run to perform actual migration.');
}

async function performMigration(migrationService: DataMigrationService) {
    console.log('🚀 Starting calendar data migration...\n');

    const startTime = Date.now();
    const result = await migrationService.migrateAllData();
    const duration = Date.now() - startTime;

    console.log('📊 Migration Results:');
    console.log(`  Duration: ${duration}ms`);
    console.log(`  Success: ${result.success ? '✅' : '❌'}`);
    console.log(`  Businesses migrated: ${result.businessesMigrated}`);
    console.log(`  Staff migrated: ${result.staffMigrated}`);
    console.log(`  Errors: ${result.errors.length}`);

    if (result.errors.length > 0) {
        console.log('\n❌ Migration Errors:');
        result.errors.forEach((error, index) => {
            console.log(`  ${index + 1}. [${error.type}:${error.id}] ${error.error}`);
        });
    }

    if (result.success) {
        console.log('\n✅ Migration completed successfully!');

        // Store rollback data for potential rollback
        if (result.rollbackData) {
            const rollbackFile = `migration-rollback-${Date.now()}.json`;
            const fs = await import('fs/promises');
            await fs.writeFile(rollbackFile, JSON.stringify(result.rollbackData, null, 2));
            console.log(`📄 Rollback data saved to: ${rollbackFile}`);
        }

        // Validate migration integrity
        console.log('\n🔍 Validating migration integrity...');
        const validation = await migrationService.validateMigrationIntegrity();

        if (validation.isValid) {
            console.log('✅ Migration integrity validation passed');
        } else {
            console.log(`⚠️  Migration integrity validation found ${validation.errors.length} issues:`);
            validation.errors.forEach((error, index) => {
                console.log(`  ${index + 1}. [${error.type}:${error.id}:${error.field}] ${error.message}`);
            });
        }
    } else {
        console.log('\n❌ Migration failed. No changes were made.');
        process.exit(1);
    }
}

async function performRollback(migrationService: DataMigrationService) {
    console.log('🔄 Looking for rollback data...\n');

    const fs = await import('fs/promises');
    const glob = await import('glob');

    // Find the most recent rollback file
    const rollbackFiles = glob.sync('migration-rollback-*.json').sort().reverse();

    if (rollbackFiles.length === 0) {
        console.log('❌ No rollback data found. Cannot perform rollback.');
        console.log('Rollback files are created during successful migrations.');
        process.exit(1);
    }

    const rollbackFile = rollbackFiles[0];
    console.log(`📄 Using rollback data from: ${rollbackFile}`);

    try {
        const rollbackDataJson = await fs.readFile(rollbackFile, 'utf-8');
        const rollbackData = JSON.parse(rollbackDataJson);

        console.log('⚠️  WARNING: This will remove all migrated structured data!');
        console.log(`  Business hours records to remove: ${rollbackData.businessHours?.length || 0}`);
        console.log(`  Staff availability records to remove: ${rollbackData.staffAvailability?.length || 0}`);

        // In a real CLI, you'd want to prompt for confirmation here
        console.log('\n🔄 Performing rollback...');

        const result = await migrationService.rollbackMigration(rollbackData);

        console.log('📊 Rollback Results:');
        console.log(`  Success: ${result.success ? '✅' : '❌'}`);
        console.log(`  Business hours removed: ${result.businessHoursRemoved}`);
        console.log(`  Staff availability removed: ${result.staffAvailabilityRemoved}`);
        console.log(`  Errors: ${result.errors.length}`);

        if (result.errors.length > 0) {
            console.log('\n❌ Rollback Errors:');
            result.errors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error}`);
            });
        }

        if (result.success) {
            console.log('\n✅ Rollback completed successfully!');

            // Archive the used rollback file
            const archivedFile = rollbackFile.replace('.json', '-used.json');
            await fs.rename(rollbackFile, archivedFile);
            console.log(`📄 Rollback file archived as: ${archivedFile}`);
        } else {
            console.log('\n❌ Rollback failed.');
            process.exit(1);
        }
    } catch (error) {
        console.log(`❌ Failed to read rollback data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exit(1);
    }
}

async function main() {
    const options = parseArgs();

    if (options.help) {
        printHelp();
        return;
    }

    const migrationService = new DataMigrationService(prisma);

    try {
        if (options.status) {
            await showMigrationStatus(migrationService);
        } else if (options.dryRun) {
            await performDryRun(migrationService);
        } else if (options.rollback) {
            await performRollback(migrationService);
        } else {
            await performMigration(migrationService);
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
    console.error('❌ Migration script failed:', error);
    process.exit(1);
});
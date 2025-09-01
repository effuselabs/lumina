#!/usr/bin/env tsx

/**
 * Employment Migration Validation Script
 * 
 * This script validates the hybrid employment model migration by:
 * 1. Checking data integrity after migration
 * 2. Validating employment type configurations
 * 3. Ensuring all constraints are properly applied
 * 4. Generating a validation report
 */

import { PrismaClient } from '@prisma/client';
import { employmentConfigurationSchema } from '../lib/validations/employment';
import type { EmploymentConfiguration } from '../types/employment';

const prisma = new PrismaClient();

interface ValidationResult {
    success: boolean;
    errors: string[];
    warnings: string[];
    stats: {
        totalStaff: number;
        commissionStaff: number;
        chairRentalStaff: number;
        hybridStaff: number;
        invalidConfigurations: number;
    };
}

async function validateEmploymentMigration(): Promise<ValidationResult> {
    const result: ValidationResult = {
        success: true,
        errors: [],
        warnings: [],
        stats: {
            totalStaff: 0,
            commissionStaff: 0,
            chairRentalStaff: 0,
            hybridStaff: 0,
            invalidConfigurations: 0,
        },
    };

    try {
        console.log('🔍 Starting employment migration validation...\n');

        // 1. Validate staff employment configurations
        await validateStaffEmploymentConfigurations(result);

        // 2. Validate database constraints
        await validateDatabaseConstraints(result);

        // 3. Validate payment calculations table
        await validatePaymentCalculationsTable(result);

        // 4. Check for data consistency
        await validateDataConsistency(result);

        // 5. Generate summary
        generateValidationSummary(result);

    } catch (error) {
        result.success = false;
        result.errors.push(`Migration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
        await prisma.$disconnect();
    }

    return result;
}

async function validateStaffEmploymentConfigurations(result: ValidationResult): Promise<void> {
    console.log('📋 Validating staff employment configurations...');

    const staff = await prisma.staff.findMany({
        include: {
            user: true,
            business: true,
        },
    });

    result.stats.totalStaff = staff.length;

    for (const staffMember of staff) {
        const config: EmploymentConfiguration = {
            employmentType: staffMember.employmentType.toLowerCase() as any,
            commissionRate: staffMember.commissionRate?.toNumber(),
            chairRentalAmount: staffMember.chairRentalAmount?.toNumber(),
            chairRentalPeriod: staffMember.chairRentalPeriod?.toLowerCase() as any,
            baseSalary: staffMember.baseSalary?.toNumber(),
        };

        // Count employment types
        switch (config.employmentType) {
            case 'commission':
                result.stats.commissionStaff++;
                break;
            case 'chair_rental':
                result.stats.chairRentalStaff++;
                break;
            case 'hybrid':
                result.stats.hybridStaff++;
                break;
        }

        // Validate configuration
        const validationSchema = employmentConfigurationSchema;
        const validation = validationSchema.safeParse(config);
        if (!validation.success) {
            result.stats.invalidConfigurations++;
            result.errors.push(
                `Invalid employment configuration for staff ${staffMember.displayName} (${staffMember.id}): ${validation.error.errors.map(e => e.message).join(', ')}`
            );
        }

        // Note: Zod doesn't have warnings, only success/error
        // Additional validation logic could be added here if needed
    }

    console.log(`✅ Validated ${staff.length} staff members`);
}

async function validateDatabaseConstraints(result: ValidationResult): Promise<void> {
    console.log('🔒 Validating database constraints...');

    try {
        // Test employment type constraints
        const constraintTests = [
            {
                name: 'Commission staff must have commission rate',
                query: `
          SELECT COUNT(*) as count 
          FROM staff 
          WHERE employment_type = 'COMMISSION' 
          AND (commission_rate IS NULL OR commission_rate <= 0)
        `,
            },
            {
                name: 'Chair rental staff must have rental amount and period',
                query: `
          SELECT COUNT(*) as count 
          FROM staff 
          WHERE employment_type = 'CHAIR_RENTAL' 
          AND (chair_rental_amount IS NULL OR chair_rental_period IS NULL)
        `,
            },
            {
                name: 'Hybrid staff must have both commission and rental configured',
                query: `
          SELECT COUNT(*) as count 
          FROM staff 
          WHERE employment_type = 'HYBRID' 
          AND (commission_rate IS NULL OR chair_rental_amount IS NULL OR chair_rental_period IS NULL)
        `,
            },
            {
                name: 'Chair rental staff should not have commission rate',
                query: `
          SELECT COUNT(*) as count 
          FROM staff 
          WHERE employment_type = 'CHAIR_RENTAL' 
          AND commission_rate IS NOT NULL
        `,
            },
        ];

        for (const test of constraintTests) {
            const result_query = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(test.query);
            const count = Number(result_query[0]?.count || 0);

            if (count > 0) {
                result.errors.push(`${test.name}: Found ${count} violations`);
            }
        }

        console.log('✅ Database constraints validated');
    } catch (error) {
        result.errors.push(`Database constraint validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

async function validatePaymentCalculationsTable(result: ValidationResult): Promise<void> {
    console.log('💰 Validating payment calculations table...');

    try {
        // Check if table exists and has correct structure
        const tableInfo = await prisma.$queryRaw<Array<{ column_name: string; data_type: string }>>`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'payment_calculations' 
      AND table_schema = 'public'
    `;

        const requiredColumns = [
            'id',
            'business_id',
            'staff_id',
            'calculation_period_start',
            'calculation_period_end',
            'employment_type',
            'gross_revenue',
            'net_earnings',
            'business_retention',
        ];

        const existingColumns = tableInfo.map(col => col.column_name);
        const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

        if (missingColumns.length > 0) {
            result.errors.push(`Payment calculations table missing columns: ${missingColumns.join(', ')}`);
        }

        // Check indexes exist
        const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'payment_calculations'
    `;

        const requiredIndexes = [
            'payment_calculations_business_id_calculation_period_start_idx',
            'payment_calculations_staff_id_calculation_period_start_idx',
            'payment_calculations_business_id_employment_type_idx',
        ];

        const existingIndexes = indexes.map(idx => idx.indexname);
        const missingIndexes = requiredIndexes.filter(idx => !existingIndexes.includes(idx));

        if (missingIndexes.length > 0) {
            result.warnings.push(`Payment calculations table missing indexes: ${missingIndexes.join(', ')}`);
        }

        console.log('✅ Payment calculations table validated');
    } catch (error) {
        result.errors.push(`Payment calculations validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

async function validateDataConsistency(result: ValidationResult): Promise<void> {
    console.log('🔄 Validating data consistency...');

    try {
        // Check for orphaned records
        const orphanedTransactions = await prisma.transaction.count({
            where: {
                staffId: { not: null },
                staff: null,
            },
        });

        if (orphanedTransactions > 0) {
            result.warnings.push(`Found ${orphanedTransactions} transactions with invalid staff references`);
        }

        // Check for inconsistent employment types in transactions
        const inconsistentTransactions = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM transactions t
      JOIN staff s ON t.staff_id = s.id
      WHERE t.staff_employment_type IS NOT NULL 
      AND t.staff_employment_type != s.employment_type
    `;

        const inconsistentCount = Number(inconsistentTransactions[0]?.count || 0);
        if (inconsistentCount > 0) {
            result.warnings.push(`Found ${inconsistentCount} transactions with inconsistent employment types`);
        }

        console.log('✅ Data consistency validated');
    } catch (error) {
        result.errors.push(`Data consistency validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

function generateValidationSummary(result: ValidationResult): void {
    console.log('\n📊 Validation Summary');
    console.log('='.repeat(50));

    console.log(`Total Staff: ${result.stats.totalStaff}`);
    console.log(`Commission Staff: ${result.stats.commissionStaff}`);
    console.log(`Chair Rental Staff: ${result.stats.chairRentalStaff}`);
    console.log(`Hybrid Staff: ${result.stats.hybridStaff}`);
    console.log(`Invalid Configurations: ${result.stats.invalidConfigurations}`);

    console.log(`\nErrors: ${result.errors.length}`);
    if (result.errors.length > 0) {
        result.errors.forEach(error => console.log(`  ❌ ${error}`));
    }

    console.log(`\nWarnings: ${result.warnings.length}`);
    if (result.warnings.length > 0) {
        result.warnings.forEach(warning => console.log(`  ⚠️  ${warning}`));
    }

    if (result.success && result.errors.length === 0) {
        console.log('\n🎉 Migration validation completed successfully!');
    } else {
        console.log('\n❌ Migration validation found issues that need to be addressed.');
        result.success = false;
    }
}

// Run validation if called directly
if (require.main === module) {
    validateEmploymentMigration()
        .then((result) => {
            process.exit(result.success ? 0 : 1);
        })
        .catch((error) => {
            console.error('Validation script failed:', error);
            process.exit(1);
        });
}

export { validateEmploymentMigration };


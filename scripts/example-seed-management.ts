#!/usr/bin/env tsx

/**
 * Example Seed Management Usage
 *
 * Demonstrates how to use the new data reset and management utilities
 * for different scenarios and operations.
 */

import { PrismaClient } from '@prisma/client';
import { DataResetManager } from '../prisma/factories/data-reset-manager';
import { EnhancedSeedOrchestrator } from '../prisma/factories/enhanced-seed-integration';

const prisma = new PrismaClient();

async function demonstrateDataManagement() {
  console.log('🚀 Data Management Utilities Demonstration\n');

  const resetManager = new DataResetManager(prisma);
  const seedOrchestrator = new EnhancedSeedOrchestrator(prisma);

  // Example business ID (in real usage, this would be a valid business ID)
  const businessId = 'demo-business-id';

  try {
    // 1. List available scenarios
    console.log('📋 Available Seed Scenarios:');
    const scenarios = resetManager.getPredefinedScenarios();
    scenarios.forEach(scenario => {
      console.log(`  - ${scenario.name}: ${scenario.description}`);
    });
    console.log('');

    // 2. Validate configuration for a specific scenario
    console.log('🔍 Validating Demo Scenario Configuration:');
    const demoScenario = resetManager.getScenario('demo');
    if (demoScenario) {
      const configValidation = resetManager.validateConfiguration(
        demoScenario.config as any
      );
      console.log(
        `  Configuration valid: ${configValidation.isValid ? '✅' : '❌'}`
      );

      if (configValidation.errors.length > 0) {
        console.log('  Errors:');
        configValidation.errors.forEach(error => {
          console.log(`    - ${error.message}`);
        });
      }

      if (configValidation.warnings.length > 0) {
        console.log('  Warnings:');
        configValidation.warnings.forEach(warning => {
          console.log(`    - ${warning.message}`);
        });
      }
    }
    console.log('');

    // 3. Demonstrate dry run reset
    console.log('🧹 Dry Run Reset (Preview):');
    try {
      const dryRunResult = await resetManager.cleanReset(businessId, {
        dryRun: true,
        verbose: true,
      });

      console.log(`  Would delete:`);
      Object.entries(dryRunResult.deletedCounts).forEach(([entity, count]) => {
        if (count > 0) {
          console.log(`    - ${entity}: ${count}`);
        }
      });
    } catch (error) {
      console.log(`  ⚠️  Business not found (expected for demo): ${error}`);
    }
    console.log('');

    // 4. Demonstrate data validation
    console.log('🔍 Data Integrity Validation:');
    try {
      const validationResult =
        await resetManager.validateDataIntegrity(businessId);
      console.log(`  Data valid: ${validationResult.isValid ? '✅' : '❌'}`);
      console.log(
        `  Total entities: ${validationResult.summary.totalEntities}`
      );
      console.log(
        `  Critical errors: ${validationResult.summary.criticalErrors}`
      );
      console.log(`  Warnings: ${validationResult.summary.warnings}`);
    } catch (error) {
      console.log(`  ⚠️  Business not found (expected for demo): ${error}`);
    }
    console.log('');

    // 5. Demonstrate enhanced seeding (would work with real business)
    console.log('🌱 Enhanced Seeding Example:');
    console.log('  This would run with a real business ID:');
    console.log('  ```typescript');
    console.log('  const result = await seedForEnvironment(');
    console.log('    prisma,');
    console.log('    "real-business-id",');
    console.log('    "development",');
    console.log('    { verbose: true }');
    console.log('  );');
    console.log('  ```');
    console.log('');

    // 6. Generate a sample data report
    console.log('📊 Sample Data Report Generation:');
    try {
      const report = await resetManager.generateDataReport(businessId);
      console.log('  Report preview (first 300 characters):');
      console.log(`  ${report.substring(0, 300)}...`);
    } catch (error) {
      console.log(`  ⚠️  Business not found (expected for demo): ${error}`);
    }
    console.log('');

    // 7. Show CLI usage examples
    console.log('💻 CLI Usage Examples:');
    console.log('');
    console.log('  # List available scenarios');
    console.log('  npm run seed:manage list-scenarios');
    console.log('');
    console.log('  # Validate data integrity');
    console.log('  npm run seed:manage validate -b business-123');
    console.log('');
    console.log('  # Dry run reset');
    console.log(
      '  npm run seed:manage reset -b business-123 --dry-run --verbose'
    );
    console.log('');
    console.log('  # Reset with preservation');
    console.log(
      '  npm run seed:manage reset -b business-123 --preserve-users --preserve-business'
    );
    console.log('');
    console.log('  # Seed with development scenario');
    console.log('  npm run seed:manage seed -b business-123 -s development');
    console.log('');
    console.log('  # Generate data report');
    console.log(
      '  npm run seed:manage report -b business-123 -o data-report.md'
    );
    console.log('');

    console.log('✅ Data Management Demonstration Complete!');
    console.log('');
    console.log('📚 For more information, see:');
    console.log('  - docs/api/seed-data-management.md');
    console.log('  - prisma/factories/data-reset-manager.ts');
    console.log('  - scripts/manage-seed-data.ts');
  } catch (error) {
    console.error('❌ Demonstration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the demonstration
if (require.main === module) {
  demonstrateDataManagement().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

export { demonstrateDataManagement };

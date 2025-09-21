#!/usr/bin/env tsx

/**
 * Seed Data Management CLI
 * 
 * Command-line utility for managing seed data with different scenarios,
 * reset operations, and validation checks.
 */

import { PrismaClient } from '@prisma/client';
import { DataResetManager } from '../prisma/factories/data-reset-manager';

const prisma = new PrismaClient();
const resetManager = new DataResetManager(prisma);

interface CLIOptions {
    command: string;
    businessId?: string;
    scenario?: string;
    dryRun?: boolean;
    verbose?: boolean;
    preserveUsers?: boolean;
    preserveBusiness?: boolean;
    preserveBusinessUsers?: boolean;
    output?: string;
}

/**
 * Parse command line arguments
 */
function parseArgs(): CLIOptions {
    const args = process.argv.slice(2);
    const options: CLIOptions = {
        command: args[0] || 'help',
    };

    for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        const nextArg = args[i + 1];

        switch (arg) {
            case '--business-id':
            case '-b':
                options.businessId = nextArg;
                i++;
                break;
            case '--scenario':
            case '-s':
                options.scenario = nextArg;
                i++;
                break;
            case '--dry-run':
            case '-d':
                options.dryRun = true;
                break;
            case '--verbose':
            case '-v':
                options.verbose = true;
                break;
            case '--preserve-users':
                options.preserveUsers = true;
                break;
            case '--preserve-business':
                options.preserveBusiness = true;
                break;
            case '--preserve-business-users':
                options.preserveBusinessUsers = true;
                break;
            case '--output':
            case '-o':
                options.output = nextArg;
                i++;
                break;
        }
    }

    return options;
}

/**
 * Display help information
 */
function showHelp() {
    console.log(`
Seed Data Management CLI

USAGE:
  npm run manage-seed-data <command> [options]

COMMANDS:
  help                    Show this help message
  list-scenarios          List available seed scenarios
  validate <business-id>  Validate data integrity for a business
  reset <business-id>     Clean reset data for a business
  seed <business-id>      Seed data using a scenario
  report <business-id>    Generate data report for a business
  
OPTIONS:
  -b, --business-id <id>     Business ID to operate on
  -s, --scenario <name>      Seed scenario to use (demo, development, testing, performance, minimal)
  -d, --dry-run             Perform dry run without making changes
  -v, --verbose             Enable verbose output
  --preserve-users          Don't delete users during reset
  --preserve-business       Don't delete business during reset
  --preserve-business-users Don't delete business-user relationships during reset
  -o, --output <file>       Output file for reports

EXAMPLES:
  # List available scenarios
  npm run manage-seed-data list-scenarios

  # Validate data integrity
  npm run manage-seed-data validate -b business-123

  # Dry run reset to see what would be deleted
  npm run manage-seed-data reset -b business-123 --dry-run --verbose

  # Reset data preserving users and business
  npm run manage-seed-data reset -b business-123 --preserve-users --preserve-business

  # Seed with development scenario
  npm run manage-seed-data seed -b business-123 -s development

  # Generate data report
  npm run manage-seed-data report -b business-123 -o data-report.md
`);
}

/**
 * List available scenarios
 */
function listScenarios() {
    console.log('📋 Available Seed Scenarios:\n');

    const scenarios = resetManager.getPredefinedScenarios();

    scenarios.forEach(scenario => {
        console.log(`🎯 ${scenario.name.toUpperCase()}`);
        console.log(`   Description: ${scenario.description}`);
        console.log(`   Clients: ${scenario.config.clients?.count || 'default'}`);
        console.log(`   Staff: ${scenario.config.staff?.count || 'default'}`);
        console.log(`   Historical months: ${scenario.config.appointments?.historicalMonths || 'default'}`);
        console.log('');
    });
}

/**
 * Validate data integrity
 */
async function validateData(businessId: string, verbose: boolean = false) {
    console.log(`🔍 Validating data integrity for business: ${businessId}\n`);

    try {
        const result = await resetManager.validateDataIntegrity(businessId);

        if (verbose) {
            console.log('\n📊 Detailed Results:');

            if (result.errors.length > 0) {
                console.log('\n❌ Errors:');
                result.errors.forEach(error => {
                    console.log(`  [${error.severity.toUpperCase()}] ${error.entity}${error.field ? `.${error.field}` : ''}: ${error.message}`);
                });
            }

            if (result.warnings.length > 0) {
                console.log('\n⚠️  Warnings:');
                result.warnings.forEach(warning => {
                    console.log(`  ${warning.entity}${warning.field ? `.${warning.field}` : ''}: ${warning.message}`);
                });
            }
        }

        if (result.isValid) {
            console.log('\n✅ Data validation passed!');
            process.exit(0);
        } else {
            console.log('\n❌ Data validation failed!');
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Validation failed:', error);
        process.exit(1);
    }
}

/**
 * Reset data
 */
async function resetData(businessId: string, options: CLIOptions) {
    console.log(`🧹 Resetting data for business: ${businessId}\n`);

    const resetOptions = {
        dryRun: options.dryRun || false,
        verbose: options.verbose || false,
        preserveUsers: options.preserveUsers || false,
        preserveBusiness: options.preserveBusiness || false,
        preserveBusinessUsers: options.preserveBusinessUsers || false,
    };

    try {
        const result = await resetManager.cleanReset(businessId, resetOptions);

        if (result.success) {
            console.log(`\n✅ Reset completed in ${result.duration}ms`);

            if (options.verbose) {
                console.log('\n📊 Deleted entities:');
                Object.entries(result.deletedCounts).forEach(([entity, count]) => {
                    if (count > 0) {
                        console.log(`  ${entity}: ${count}`);
                    }
                });
            }

            if (result.warnings.length > 0) {
                console.log('\n⚠️  Warnings:');
                result.warnings.forEach(warning => console.log(`  ${warning}`));
            }

        } else {
            console.log('\n❌ Reset failed!');
            result.errors.forEach(error => console.log(`  Error: ${error}`));
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Reset failed:', error);
        process.exit(1);
    }
}

/**
 * Seed data with scenario
 */
async function seedData(businessId: string, scenarioName: string, verbose: boolean = false) {
    console.log(`🌱 Seeding data for business: ${businessId} with scenario: ${scenarioName}\n`);

    try {
        const scenario = resetManager.getScenario(scenarioName);

        if (!scenario) {
            console.error(`❌ Scenario '${scenarioName}' not found. Available scenarios:`);
            resetManager.getPredefinedScenarios().forEach(s => {
                console.log(`  - ${s.name}`);
            });
            process.exit(1);
        }

        console.log(`📋 Using scenario: ${scenario.description}`);

        // Validate configuration
        const configValidation = resetManager.validateConfiguration(scenario.config as any);

        if (!configValidation.isValid) {
            console.error('❌ Scenario configuration is invalid:');
            configValidation.errors.forEach(error => {
                console.error(`  ${error.message}`);
            });
            process.exit(1);
        }

        if (configValidation.warnings.length > 0 && verbose) {
            console.log('⚠️  Configuration warnings:');
            configValidation.warnings.forEach(warning => {
                console.log(`  ${warning.message}`);
            });
        }

        // Import and run the seed script with the scenario configuration
        // Note: This would need to be integrated with the actual seed script
        console.log('🚀 Starting seed process...');
        console.log('⚠️  Note: Actual seeding integration would be implemented here');
        console.log('   You can run: npm run db:seed after this validation');

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

/**
 * Generate data report
 */
async function generateReport(businessId: string, outputFile?: string) {
    console.log(`📊 Generating data report for business: ${businessId}\n`);

    try {
        const report = await resetManager.generateDataReport(businessId);

        if (outputFile) {
            const fs = await import('fs/promises');
            await fs.writeFile(outputFile, report, 'utf8');
            console.log(`✅ Report saved to: ${outputFile}`);
        } else {
            console.log(report);
        }

    } catch (error) {
        console.error('❌ Report generation failed:', error);
        process.exit(1);
    }
}

/**
 * Main CLI function
 */
async function main() {
    const options = parseArgs();

    try {
        switch (options.command) {
            case 'help':
                showHelp();
                break;

            case 'list-scenarios':
                listScenarios();
                break;

            case 'validate':
                if (!options.businessId) {
                    console.error('❌ Business ID is required for validation');
                    console.log('Usage: npm run manage-seed-data validate -b <business-id>');
                    process.exit(1);
                }
                await validateData(options.businessId, options.verbose);
                break;

            case 'reset':
                if (!options.businessId) {
                    console.error('❌ Business ID is required for reset');
                    console.log('Usage: npm run manage-seed-data reset -b <business-id>');
                    process.exit(1);
                }
                await resetData(options.businessId, options);
                break;

            case 'seed':
                if (!options.businessId) {
                    console.error('❌ Business ID is required for seeding');
                    console.log('Usage: npm run manage-seed-data seed -b <business-id> -s <scenario>');
                    process.exit(1);
                }
                if (!options.scenario) {
                    console.error('❌ Scenario is required for seeding');
                    console.log('Usage: npm run manage-seed-data seed -b <business-id> -s <scenario>');
                    process.exit(1);
                }
                await seedData(options.businessId, options.scenario, options.verbose);
                break;

            case 'report':
                if (!options.businessId) {
                    console.error('❌ Business ID is required for report generation');
                    console.log('Usage: npm run manage-seed-data report -b <business-id>');
                    process.exit(1);
                }
                await generateReport(options.businessId, options.output);
                break;

            default:
                console.error(`❌ Unknown command: ${options.command}`);
                showHelp();
                process.exit(1);
        }

    } catch (error) {
        console.error('❌ Command failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the CLI
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    });
}
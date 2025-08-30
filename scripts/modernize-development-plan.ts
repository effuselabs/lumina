#!/usr/bin/env tsx

/**
 * CLI tool for modernizing the development plan with steering integration
 * 
 * Usage:
 *   npm run modernize-plan
 *   npm run modernize-plan -- --output custom-plan.md
 *   npm run modernize-plan -- --dry-run
 */

import { DevelopmentPlanModernizer } from '../lib/development-plan-modernizer';

interface CliOptions {
    output?: string;
    dryRun?: boolean;
    help?: boolean;
}

function parseArgs(args: string[]): CliOptions {
    const options: CliOptions = {};

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        switch (arg) {
            case '--output':
                options.output = args[++i];
                break;
            case '--dry-run':
                options.dryRun = true;
                break;
            case '--help':
            case '-h':
                options.help = true;
                break;
        }
    }

    return options;
}

function showHelp() {
    console.log(`
Development Plan Modernization Tool

Usage:
  npm run modernize-plan [options]

Options:
  --output <path>        Save modernized plan to specified file
  --dry-run             Show what would be changed without writing files
  --help, -h            Show this help message

Examples:
  npm run modernize-plan
  npm run modernize-plan --output docs/DEVELOPMENT_PLAN_V4.md
  npm run modernize-plan --dry-run
`);
}

async function main() {
    const args = process.argv.slice(2);
    const options = parseArgs(args);

    if (options.help) {
        showHelp();
        return;
    }

    try {
        console.log('🚀 Starting development plan modernization...');

        const modernizer = new DevelopmentPlanModernizer(
            'docs/DEVELOPMENT_PLAN.md',
            options.output || 'docs/DEVELOPMENT_PLAN_MODERNIZED.md'
        );

        if (options.dryRun) {
            console.log('🔍 Running in dry-run mode...');

            // Load and analyze without writing
            const steeringAnalyzer = modernizer['steeringAnalyzer'];
            const steeringMappings = await steeringAnalyzer.createTaskSteeringMappings();

            console.log('\n📊 Analysis Results:');
            console.log(`- Tasks to be modernized: ${steeringMappings.size}`);

            console.log('\n📋 Steering Integration Summary:');
            const steeringUsage = new Map<string, number>();

            for (const [taskId, mapping] of steeringMappings) {
                for (const steering of mapping.applicableSteering) {
                    steeringUsage.set(steering, (steeringUsage.get(steering) || 0) + 1);
                }
            }

            for (const [steering, count] of Array.from(steeringUsage.entries()).sort((a, b) => b[1] - a[1])) {
                console.log(`- ${steering}: ${count} tasks`);
            }

            console.log('\n🎯 Sample Task Modernization:');
            const firstMapping = Array.from(steeringMappings.values())[0];
            if (firstMapping) {
                console.log(`Task: ${firstMapping.taskId}`);
                console.log(`Steering Files: ${firstMapping.applicableSteering.join(', ')}`);
                console.log(`Compliance Checks: ${firstMapping.complianceChecks.length}`);
                console.log(`Implementation Guidance: ${firstMapping.implementationGuidance.length} items`);
            }

            console.log('\n✅ Dry run completed. Use without --dry-run to generate modernized plan.');

        } else {
            const modernizedPlan = await modernizer.modernizeDevelopmentPlan();

            console.log('\n📈 Modernization completed successfully!');
            console.log(`📄 Modernized plan saved to: ${options.output || 'docs/DEVELOPMENT_PLAN_MODERNIZED.md'}`);

            // Show summary statistics
            const lines = modernizedPlan.split('\n');
            const taskCount = (modernizedPlan.match(/\*\*Task \d+:\*\*/g) || []).length;
            const steeringReferences = (modernizedPlan.match(/\*\*Steering:\*\*/g) || []).length;
            const acceptanceCriteria = (modernizedPlan.match(/\*\*Acceptance Criteria:\*\*/g) || []).length;

            console.log('\n📊 Modernization Statistics:');
            console.log(`- Total lines: ${lines.length}`);
            console.log(`- Tasks modernized: ${taskCount}`);
            console.log(`- Steering references added: ${steeringReferences}`);
            console.log(`- Acceptance criteria sections: ${acceptanceCriteria}`);

            console.log('\n🎯 Next Steps:');
            console.log('1. Review the modernized development plan');
            console.log('2. Update Linear issues with new acceptance criteria');
            console.log('3. Communicate changes to the development team');
            console.log('4. Begin implementing tasks with steering guidance');
        }

    } catch (error) {
        console.error('❌ Error during modernization:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}
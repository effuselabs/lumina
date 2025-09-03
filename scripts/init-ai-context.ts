#!/usr/bin/env tsx

/**
 * AI Context Initialization Script
 * 
 * Initializes AI context for new sessions and generates context reports
 */

import { writeFile } from 'fs/promises';
import { join } from 'path';
import { aiContextLoader } from '../lib/ai-context-loader';

interface CLIOptions {
    report?: boolean;
    output?: string;
    verbose?: boolean;
    validate?: boolean;
}

async function main() {
    const options = parseOptions();

    try {
        console.log('🤖 Initializing AI Context...\n');

        // Initialize context
        const contextState = await aiContextLoader.initializeContext();

        // Display summary
        displayContextSummary(contextState, options.verbose);

        // Generate report if requested
        if (options.report) {
            await generateContextReport(contextState, options.output);
        }

        // Validate context if requested
        if (options.validate) {
            validateContext(contextState);
        }

        console.log('\n✅ AI Context initialization complete');

    } catch (error) {
        console.error('❌ Failed to initialize AI context:', error);
        process.exit(1);
    }
}

function parseOptions(): CLIOptions {
    const args = process.argv.slice(2);
    const options: CLIOptions = {};

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const nextArg = args[i + 1];

        switch (arg) {
            case '--report':
            case '-r':
                options.report = true;
                break;
            case '--output':
            case '-o':
                options.output = nextArg;
                i++;
                break;
            case '--verbose':
            case '-v':
                options.verbose = true;
                break;
            case '--validate':
                options.validate = true;
                break;
            case '--help':
            case '-h':
                showHelp();
                process.exit(0);
        }
    }

    return options;
}

function displayContextSummary(contextState: any, verbose: boolean = false) {
    console.log(`📋 Session ID: ${contextState.sessionId}`);
    console.log(`⏰ Initialized: ${contextState.startTime.toLocaleString()}`);
    console.log(`📊 Context Completeness: ${contextState.contextCompleteness}%`);

    // Completeness indicator
    const completenessBar = generateProgressBar(contextState.contextCompleteness);
    console.log(`📈 Progress: ${completenessBar}`);

    // Validation results
    console.log('\n🔍 Validation Results:');
    const validationEmojis = {
        essentialDocsAccessible: contextState.validationResults.essentialDocsAccessible ? '✅' : '❌',
        projectStateValid: contextState.validationResults.projectStateValid ? '✅' : '❌',
        recentDecisionsLoaded: contextState.validationResults.recentDecisionsLoaded ? '✅' : '❌',
        developmentStandardsAvailable: contextState.validationResults.developmentStandardsAvailable ? '✅' : '❌'
    };

    console.log(`  ${validationEmojis.essentialDocsAccessible} Essential Documents`);
    console.log(`  ${validationEmojis.projectStateValid} Project State`);
    console.log(`  ${validationEmojis.recentDecisionsLoaded} Recent Decisions`);
    console.log(`  ${validationEmojis.developmentStandardsAvailable} Development Standards`);

    // Project snapshot
    console.log('\n📊 Project Snapshot:');
    console.log(`  🎯 Active Features: ${contextState.projectStateSnapshot.activeFeatures.length}`);
    console.log(`  📝 Recent Decisions: ${contextState.projectStateSnapshot.recentDecisions.length}`);
    console.log(`  ⚠️  Current Issues: ${contextState.projectStateSnapshot.currentIssues.length}`);

    const avgHealth = Math.round(
        (contextState.projectStateSnapshot.healthMetrics.codeQuality +
            contextState.projectStateSnapshot.healthMetrics.testCoverage +
            contextState.projectStateSnapshot.healthMetrics.documentationHealth) / 3
    );
    console.log(`  💚 Health Score: ${avgHealth}%`);

    // Recommendations
    console.log('\n🎯 Recommended Next Steps:');
    contextState.recommendedNextSteps.forEach((step: string, index: number) => {
        console.log(`  ${index + 1}. ${step}`);
    });

    if (verbose) {
        displayVerboseInfo(contextState);
    }
}

function displayVerboseInfo(contextState: any) {
    console.log('\n📚 Essential Documents Reviewed:');
    contextState.essentialDocsReviewed.forEach((doc: string) => {
        console.log(`  ✅ ${doc}`);
    });

    if (contextState.projectStateSnapshot.activeFeatures.length > 0) {
        console.log('\n🎯 Active Features Detail:');
        contextState.projectStateSnapshot.activeFeatures.forEach((feature: any) => {
            const statusEmoji = {
                'not_started': '⏳',
                'in_progress': '🔄',
                'completed': '✅',
                'blocked': '🚫'
            }[feature.status] || '❓';

            console.log(`  ${statusEmoji} ${feature.name} (${feature.completionPercentage || 0}%)`);
        });
    }

    if (contextState.projectStateSnapshot.recentDecisions.length > 0) {
        console.log('\n📋 Recent Decisions:');
        contextState.projectStateSnapshot.recentDecisions.slice(0, 3).forEach((decision: any) => {
            console.log(`  📝 ${decision.title} (${decision.date.toDateString()})`);
        });
    }
}

async function generateContextReport(contextState: any, outputPath?: string) {
    console.log('\n📄 Generating context report...');

    const report = await aiContextLoader.generateContextReport(contextState);
    const reportPath = outputPath || join(process.cwd(), 'docs', 'project-management', 'AI_CONTEXT_REPORT.md');

    await writeFile(reportPath, report);
    console.log(`📝 Context report saved to: ${reportPath}`);
}

function validateContext(contextState: any) {
    console.log('\n🔍 Context Validation:');

    const issues: string[] = [];

    if (contextState.contextCompleteness < 70) {
        issues.push(`Low context completeness: ${contextState.contextCompleteness}%`);
    }

    if (!contextState.validationResults.essentialDocsAccessible) {
        issues.push('Essential documents not accessible');
    }

    if (!contextState.validationResults.projectStateValid) {
        issues.push('Project state validation failed');
    }

    if (contextState.projectStateSnapshot.currentIssues.some((issue: any) => issue.priority === 'urgent')) {
        issues.push('Urgent issues require attention');
    }

    if (issues.length === 0) {
        console.log('✅ Context validation passed - ready for AI session');
    } else {
        console.log('⚠️  Context validation issues found:');
        issues.forEach(issue => console.log(`  - ${issue}`));
    }
}

function generateProgressBar(percentage: number, width: number = 20): string {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `${bar} ${percentage}%`;
}

function showHelp() {
    console.log(`
🤖 AI Context Initialization CLI

Usage: tsx scripts/init-ai-context.ts [options]

Options:
  --report, -r           Generate detailed context report
  --output, -o <path>    Output path for context report
  --verbose, -v          Show verbose context information
  --validate             Validate context completeness and quality
  --help, -h             Show this help message

Examples:
  # Basic context initialization
  tsx scripts/init-ai-context.ts
  
  # Generate detailed report
  tsx scripts/init-ai-context.ts --report --verbose
  
  # Custom report output
  tsx scripts/init-ai-context.ts --report --output ./context-report.md
  
  # Validate context quality
  tsx scripts/init-ai-context.ts --validate --verbose

The script will:
1. Load essential project documents
2. Validate document accessibility
3. Generate project state snapshot
4. Calculate context completeness score
5. Provide recommendations for next steps
`);
}

// Run the script if called directly
if (require.main === module) {
    main().catch(console.error);
}

export { main as initAIContext };

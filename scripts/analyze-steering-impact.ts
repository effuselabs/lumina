#!/usr/bin/env tsx

/**
 * CLI tool for analyzing steering file impact on development tasks
 * 
 * Usage:
 *   npm run analyze-steering-impact
 *   npm run analyze-steering-impact -- --changed security.md api-standards.md
 *   npm run analyze-steering-impact -- --report
 */

import { writeFileSync } from 'fs';
import { SteeringImpactAnalyzer } from '../lib/steering-impact-analysis';

interface CliOptions {
    changed?: string[];
    report?: boolean;
    output?: string;
    help?: boolean;
}

function parseArgs(args: string[]): CliOptions {
    const options: CliOptions = {};

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        switch (arg) {
            case '--changed':
                options.changed = [];
                i++;
                while (i < args.length && !args[i].startsWith('--')) {
                    options.changed.push(args[i].replace('.md', ''));
                    i++;
                }
                i--; // Back up one since the loop will increment
                break;
            case '--report':
                options.report = true;
                break;
            case '--output':
                options.output = args[++i];
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
Steering Impact Analysis Tool

Usage:
  npm run analyze-steering-impact [options]

Options:
  --changed <files...>    Analyze impact of specific changed steering files
  --report               Generate full impact report for all steering files
  --output <path>        Save report to specified file (default: console)
  --help, -h             Show this help message

Examples:
  npm run analyze-steering-impact --report
  npm run analyze-steering-impact --changed security api-standards
  npm run analyze-steering-impact --changed security --output impact-report.md
`);
}

async function main() {
    const args = process.argv.slice(2);
    const options = parseArgs(args);

    if (options.help) {
        showHelp();
        return;
    }

    const analyzer = new SteeringImpactAnalyzer();

    try {
        console.log('🔍 Loading steering files and development tasks...');

        if (options.report) {
            // Generate full report for all steering files
            console.log('📊 Generating full impact analysis report...');

            const steeringFiles = await analyzer.loadSteeringFiles();
            const impactMap = await analyzer.analyzeSteeringImpact();
            const mappings = await analyzer.createTaskSteeringMappings();

            let report = '# Complete Steering Impact Analysis Report\n\n';
            report += `Generated: ${new Date().toISOString()}\n\n`;
            report += `## Summary\n\n`;
            report += `- **Steering Files Analyzed**: ${steeringFiles.length}\n`;
            report += `- **Development Tasks Analyzed**: ${(await analyzer.loadDevelopmentTasks()).length}\n`;
            report += `- **Task-Steering Mappings**: ${mappings.size}\n\n`;

            report += '## Steering File Impact Overview\n\n';

            for (const [steeringName, impact] of impactMap) {
                report += `### ${steeringName}.md\n\n`;
                report += `- **Impact Level**: ${impact.impactLevel.toUpperCase()}\n`;
                report += `- **Change Type**: ${impact.changeType}\n`;
                report += `- **Affected Tasks**: ${impact.affectedTasks.length}\n`;
                report += `- **Estimated Rework**: ${impact.estimatedReworkHours} hours\n`;
                report += `- **Affected Developers**: ${impact.affectedDevelopers.join(', ')}\n\n`;

                if (impact.affectedTasks.length > 0) {
                    report += '**Affected Tasks:**\n';
                    for (const taskId of impact.affectedTasks) {
                        const mapping = mappings.get(taskId);
                        if (mapping) {
                            report += `- ${taskId}: ${mapping.complianceChecks.length} compliance checks\n`;
                        }
                    }
                    report += '\n';
                }
            }

            report += '## Task-Steering Mappings\n\n';

            for (const [taskId, mapping] of mappings) {
                report += `### ${taskId}\n\n`;
                report += `**Applicable Steering Files**: ${mapping.applicableSteering.join(', ')}\n\n`;

                if (mapping.complianceChecks.length > 0) {
                    report += '**Compliance Checks:**\n';
                    for (const check of mapping.complianceChecks) {
                        report += `- [${check.severity.toUpperCase()}] ${check.rule}: ${check.description}\n`;
                    }
                    report += '\n';
                }

                if (mapping.implementationGuidance.length > 0) {
                    report += '**Implementation Guidance:**\n';
                    for (const guidance of mapping.implementationGuidance) {
                        report += `- ${guidance}\n`;
                    }
                    report += '\n';
                }
            }

            if (options.output) {
                writeFileSync(options.output, report);
                console.log(`✅ Full report saved to ${options.output}`);
            } else {
                console.log(report);
            }

        } else if (options.changed && options.changed.length > 0) {
            // Analyze impact of specific changed files
            console.log(`📋 Analyzing impact of changed files: ${options.changed.join(', ')}`);

            const report = await analyzer.generateImpactReport(options.changed);
            const notifications = await analyzer.generateDeveloperNotifications(options.changed);

            let fullReport = report;

            if (notifications.size > 0) {
                fullReport += '\n## Developer Notifications\n\n';
                for (const [developer, messages] of notifications) {
                    fullReport += `### ${developer}\n\n`;
                    for (const message of messages) {
                        fullReport += `- ${message}\n`;
                    }
                    fullReport += '\n';
                }
            }

            if (options.output) {
                writeFileSync(options.output, fullReport);
                console.log(`✅ Impact report saved to ${options.output}`);
            } else {
                console.log(fullReport);
            }

        } else {
            // Default: show basic analysis
            console.log('📈 Running basic steering impact analysis...');

            const steeringFiles = await analyzer.loadSteeringFiles();
            const tasks = await analyzer.loadDevelopmentTasks();
            const mappings = await analyzer.createTaskSteeringMappings();

            console.log(`\n📊 Analysis Results:`);
            console.log(`- Steering files loaded: ${steeringFiles.length}`);
            console.log(`- Development tasks analyzed: ${tasks.length}`);
            console.log(`- Task-steering mappings created: ${mappings.size}`);

            console.log(`\n📋 Steering Files:`);
            for (const file of steeringFiles) {
                console.log(`- ${file.name}.md (${file.inclusion})`);
                if (file.fileMatchPattern) {
                    console.log(`  Patterns: ${file.fileMatchPattern.join(', ')}`);
                }
            }

            console.log(`\n🎯 Use --report for full analysis or --changed <files> for specific impact analysis`);
        }

    } catch (error) {
        console.error('❌ Error during analysis:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}
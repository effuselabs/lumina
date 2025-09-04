#!/usr/bin/env tsx
/**
 * Documentation Quality Audit CLI
 * Run quality checks and optionally create Linear issues
 */

/* eslint-disable no-console */

import { formatQualityReport, runQualityAudit } from '../lib/documentation-quality';
import { defaultQualityConfig, processQualityReport } from '../lib/quality-linear-integration';

interface AuditOptions {
    createIssues?: boolean;
    rootDir?: string;
    verbose?: boolean;
}

async function main() {
    const args = process.argv.slice(2);
    const options: AuditOptions = {
        createIssues: args.includes('--create-issues'),
        rootDir: args.find(arg => arg.startsWith('--dir='))?.split('=')[1] || '.',
        verbose: args.includes('--verbose')
    };

    console.log('🔍 Starting documentation quality audit...\n');

    try {
        // Run the audit
        const report = await runQualityAudit(options.rootDir);

        // Display results
        console.log(formatQualityReport(report));

        // Create Linear issues if requested
        if (options.createIssues && report.issues.length > 0) {
            console.log('📝 Creating Linear issues for quality problems...\n');

            const config = {
                ...defaultQualityConfig,
                createIssues: true
            };

            const result = await processQualityReport(report, config);

            console.log(`✅ Created ${result.created} Linear issues`);
            if (result.skipped > 0) {
                console.log(`⏭️  Skipped ${result.skipped} low-priority issues`);
            }
        } else if (report.issues.length > 0) {
            console.log('💡 Run with --create-issues to automatically create Linear issues for these problems.\n');
        }

        // Exit with error code if issues found (for CI/CD)
        if (report.issues.length > 0) {
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Quality audit failed:', error);
        process.exit(1);
    }
}

// Show help if requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
📊 Documentation Quality Audit

Usage: npm run quality-audit [options]

Options:
  --create-issues    Create Linear issues for quality problems
  --dir=<path>       Root directory to scan (default: current directory)
  --verbose          Show detailed output
  --help, -h         Show this help message

Examples:
  npm run quality-audit                    # Run audit and show results
  npm run quality-audit --create-issues   # Run audit and create Linear issues
  npm run quality-audit --dir=./docs      # Scan specific directory

The audit checks for:
  🔗 Broken internal links in markdown files
  📅 Stale content (not updated in 6+ months)

Issues are automatically categorized by severity:
  🔴 High: Critical broken links
  🟡 Medium: Secondary broken links  
  🟢 Low: Stale content needing review
`);
    process.exit(0);
}

main().catch(console.error);
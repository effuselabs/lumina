#!/usr/bin/env tsx
/**
 * Documentation Structure Cleanup Script
 * Fixes the organizational disaster created by the migration system
 */

/* eslint-disable no-console */

import { promises as fs } from 'fs';
import { glob } from 'glob';
import { basename, dirname } from 'path';

interface CleanupAction {
    action: 'move' | 'rename' | 'delete' | 'create';
    source?: string;
    target: string;
    reason: string;
}

/**
 * Generate cleanup plan for documentation reorganization
 */
async function generateCleanupPlan(): Promise<CleanupAction[]> {
    const actions: CleanupAction[] = [];

    // Find all files with timestamp suffixes
    const timestampedFiles = await glob('docs/**/*-2025-09-04T*.md', {
        ignore: ['docs/migration/**'] // Keep migration files as-is
    });

    console.log(`Found ${timestampedFiles.length} files with timestamp suffixes`);

    for (const file of timestampedFiles) {
        const filename = basename(file);
        const dir = dirname(file);

        // Extract original filename by removing timestamp suffix
        const cleanName = filename.replace(/-2025-09-04T[^.]+\.md$/, '.md');

        // Determine correct location based on content and current location
        const correctLocation = determineCorrectLocation(file, cleanName);

        if (correctLocation) {
            actions.push({
                action: 'move',
                source: file,
                target: correctLocation,
                reason: `Clean filename and move to correct location`
            });
        }
    }

    // Add specific reorganization actions
    actions.push(
        // Move project management docs to correct location
        {
            action: 'create',
            target: 'docs/project-management/development-plan.md',
            reason: 'Consolidate development plans'
        },
        {
            action: 'create',
            target: 'docs/project-management/decision-log.md',
            reason: 'Centralize architectural decisions'
        },
        // Create proper feature documentation structure
        {
            action: 'create',
            target: 'docs/features/README.md',
            reason: 'Feature documentation index'
        },
        // Create proper API documentation structure
        {
            action: 'create',
            target: 'docs/api/README.md',
            reason: 'API documentation index'
        }
    );

    return actions;
}

/**
 * Determine correct location for a file based on its content and name
 */
function determineCorrectLocation(filePath: string, cleanName: string): string | null {
    const dir = dirname(filePath);

    // Root files that should be in project root
    if (cleanName === 'README.md' && filePath.includes('onboarding')) {
        return null; // Already handled manually
    }

    // Project management files
    if (cleanName.includes('DEVELOPMENT_PLAN') ||
        cleanName.includes('GIT_WORKFLOW') ||
        cleanName.includes('DAILY_STATUS') ||
        cleanName.includes('LINEAR_INTEGRATION')) {
        return `docs/project-management/${cleanName.toLowerCase().replace(/_/g, '-')}`;
    }

    // Decision and documentation files
    if (cleanName.includes('DECISION_LOG') ||
        cleanName.includes('DOCUMENTATION_') ||
        cleanName.includes('STEERING_')) {
        return `docs/project-management/${cleanName.toLowerCase().replace(/_/g, '-')}`;
    }

    // API documentation
    if (cleanName.includes('PAYMENT_ENDPOINTS') ||
        cleanName.includes('AUTHENTICATION') && dir.includes('api')) {
        return `docs/api/${cleanName.toLowerCase().replace(/_/g, '-')}`;
    }

    // Feature documentation
    if (dir.includes('features/authentication') &&
        (cleanName.includes('AUTHENTICATION') || cleanName === 'README.md')) {
        return `docs/features/authentication/${cleanName.toLowerCase().replace(/_/g, '-')}`;
    }

    // Testing documentation
    if (cleanName.includes('TESTING_STRATEGY') ||
        cleanName.includes('test') ||
        dir.includes('testing')) {
        return `docs/testing/${cleanName.toLowerCase().replace(/_/g, '-')}`;
    }

    // Deployment documentation
    if (cleanName.includes('DEPLOYMENT') ||
        cleanName.includes('ROLLBACK') ||
        dir.includes('deployment')) {
        return `docs/deployment/${cleanName.toLowerCase().replace(/_/g, '-')}`;
    }

    // Archive old/outdated files
    if (cleanName.includes('V1') ||
        cleanName.includes('COMPREHENSIVE_REVIEW') ||
        cleanName.includes('IMPLEMENTATION_SUMMARY')) {
        return `docs/archive/${cleanName.toLowerCase().replace(/_/g, '-')}`;
    }

    return null;
}

/**
 * Execute cleanup plan
 */
async function executeCleanupPlan(actions: CleanupAction[], dryRun: boolean = true) {
    console.log(`\n${dryRun ? 'DRY RUN - ' : ''}Executing ${actions.length} cleanup actions...\n`);

    for (const action of actions) {
        try {
            switch (action.action) {
                case 'move':
                    if (action.source && action.target) {
                        console.log(`${dryRun ? '[DRY RUN] ' : ''}MOVE: ${action.source} → ${action.target}`);
                        console.log(`  Reason: ${action.reason}`);

                        if (!dryRun) {
                            // Ensure target directory exists
                            await fs.mkdir(dirname(action.target), { recursive: true });
                            await fs.rename(action.source, action.target);
                        }
                    }
                    break;

                case 'create':
                    console.log(`${dryRun ? '[DRY RUN] ' : ''}CREATE: ${action.target}`);
                    console.log(`  Reason: ${action.reason}`);

                    if (!dryRun) {
                        await fs.mkdir(dirname(action.target), { recursive: true });
                        // Create placeholder file if it doesn't exist
                        try {
                            await fs.access(action.target);
                        } catch {
                            await fs.writeFile(action.target, `# ${basename(action.target, '.md')}\n\nTODO: Add content\n`);
                        }
                    }
                    break;

                case 'delete':
                    console.log(`${dryRun ? '[DRY RUN] ' : ''}DELETE: ${action.target}`);
                    console.log(`  Reason: ${action.reason}`);

                    if (!dryRun) {
                        await fs.unlink(action.target);
                    }
                    break;
            }
        } catch (error) {
            console.error(`Error executing action: ${action.action} ${action.target}`, error);
        }
    }
}

/**
 * Main cleanup function
 */
async function main() {
    const args = process.argv.slice(2);
    const dryRun = !args.includes('--execute');

    console.log('🧹 Documentation Structure Cleanup');
    console.log('==================================\n');

    if (dryRun) {
        console.log('🔍 DRY RUN MODE - No files will be modified');
        console.log('Use --execute flag to perform actual cleanup\n');
    }

    try {
        const actions = await generateCleanupPlan();
        await executeCleanupPlan(actions, dryRun);

        if (dryRun) {
            console.log('\n✅ Cleanup plan generated successfully!');
            console.log('Review the actions above, then run with --execute to apply changes.');
        } else {
            console.log('\n✅ Documentation cleanup completed!');
            console.log('Next steps:');
            console.log('1. Review the reorganized structure');
            console.log('2. Update any broken internal links');
            console.log('3. Create proper documentation index files');
        }

    } catch (error) {
        console.error('❌ Cleanup failed:', error);
        process.exit(1);
    }
}

// Show help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
🧹 Documentation Structure Cleanup

Usage: npm run cleanup-docs [options]

Options:
  --execute     Actually perform the cleanup (default is dry-run)
  --help, -h    Show this help message

Examples:
  npm run cleanup-docs              # Dry run - show what would be done
  npm run cleanup-docs --execute    # Actually perform the cleanup

This script fixes the organizational disaster created by the migration system:
- Removes incomprehensible timestamp suffixes from filenames
- Moves files to their correct locations based on content
- Creates proper directory structure
- Archives outdated documentation
`);
    process.exit(0);
}

main().catch(console.error);
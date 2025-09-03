#!/usr/bin/env tsx
/**
 * Daily Status Linear CLI
 * 
 * Provides one-click "remember this" and "track this" functionality
 * Usage:
 *   npm run daily-status add-blocker "Can't deploy to production" --create-linear-issue
 *   npm run daily-status add-decision "Use PostgreSQL for main database" --link-linear-issue LUM-123
 */

import { Command } from 'commander';
import { createLinearBlockerTracker } from '../lib/daily-status-blocker-tracker-linear';
import { createLinearDecisionTracker } from '../lib/daily-status-decision-tracker-linear';

const program = new Command();

program
    .name('daily-status-linear')
    .description('Daily Status with Linear Integration')
    .version('1.0.0');

// Add blocker command
program
    .command('add-blocker')
    .description('Add a blocker to today\'s daily status')
    .argument('<title>', 'Blocker title')
    .option('-d, --description <desc>', 'Detailed description of the blocker')
    .option('-p, --priority <priority>', 'Priority: high, medium, low', 'medium')
    .option('-i, --impact <impact>', 'Impact description', 'Blocking progress')
    .option('-s, --steps <steps...>', 'Next steps to resolve')
    .option('-a, --assignee <assignee>', 'Person assigned to resolve')
    .option('--create-linear-issue', 'Auto-create Linear issue for this blocker')
    .option('--team-id <teamId>', 'Linear team ID (optional)')
    .option('--project-id <projectId>', 'Linear project ID (optional)')
    .action(async (title, options) => {
        try {
            console.log('🚧 Adding blocker to daily status...');

            const tracker = await createLinearBlockerTracker();

            const blocker = {
                title,
                description: options.description || title,
                priority: options.priority as 'high' | 'medium' | 'low',
                impact: options.impact,
                nextSteps: options.steps || ['Investigate and resolve'],
                assignee: options.assignee
            };

            const result = await tracker.addBlockerWithLinear(blocker, {
                createLinearIssue: options.createLinearIssue,
                teamId: options.teamId,
                projectId: options.projectId
            });

            console.log(`✅ Blocker added: ${result.blockerId}`);

            if (result.linearIssue) {
                console.log(`🔗 Linear issue created: ${result.linearIssue.identifier}`);
                console.log(`   URL: ${result.linearIssue.url}`);
            }

        } catch (error) {
            console.error('❌ Failed to add blocker:', error);
            process.exit(1);
        }
    });

// Add decision command
program
    .command('add-decision')
    .description('Add a decision to today\'s daily status')
    .argument('<title>', 'Decision title')
    .option('-c, --context <context>', 'Context that led to this decision')
    .option('-d, --decision <decision>', 'The actual decision made')
    .option('-r, --rationale <rationale>', 'Why this decision was made')
    .option('-a, --alternatives <alternatives...>', 'Alternative options considered')
    .option('-i, --impact <impact...>', 'Areas impacted by this decision')
    .option('-s, --status <status>', 'Decision status', 'approved')
    .option('--link-linear-issue <issueId>', 'Link to existing Linear issue')
    .option('--create-linear-issue', 'Create new Linear issue for this decision')
    .option('--team-id <teamId>', 'Linear team ID (optional)')
    .option('--project-id <projectId>', 'Linear project ID (optional)')
    .action(async (title, options) => {
        try {
            console.log('📝 Adding decision to daily status...');

            const tracker = await createLinearDecisionTracker();

            const decision = {
                title,
                context: options.context || 'Decision made during development',
                decision: options.decision || title,
                rationale: options.rationale || 'Best option for current requirements',
                alternatives: options.alternatives || ['Continue with current approach'],
                impact: options.impact || ['Development process'],
                status: options.status as 'proposed' | 'approved' | 'implemented' | 'deprecated'
            };

            const result = await tracker.addDecisionWithLinear(decision, {
                linkToLinearIssue: options.linkLinearIssue,
                createNewIssue: options.createLinearIssue,
                teamId: options.teamId,
                projectId: options.projectId
            });

            console.log(`✅ Decision added: ${result.decisionId}`);

            if (result.linearComment) {
                console.log(`💬 Added comment to Linear issue`);
            }

            if (result.linearIssue) {
                console.log(`📝 Linear issue created: ${result.linearIssue.identifier}`);
                console.log(`   URL: ${result.linearIssue.url}`);
            }

        } catch (error) {
            console.error('❌ Failed to add decision:', error);
            process.exit(1);
        }
    });

// Resolve blocker command
program
    .command('resolve-blocker')
    .description('Resolve a blocker and update Linear issue')
    .argument('<blockerId>', 'Blocker ID to resolve')
    .option('-n, --notes <notes>', 'Resolution notes')
    .action(async (blockerId, options) => {
        try {
            console.log(`✅ Resolving blocker ${blockerId}...`);

            const tracker = await createLinearBlockerTracker();
            await tracker.resolveBlockerWithLinear(blockerId, options.notes);

            console.log(`✅ Blocker ${blockerId} resolved`);

        } catch (error) {
            console.error('❌ Failed to resolve blocker:', error);
            process.exit(1);
        }
    });

// List active blockers
program
    .command('list-blockers')
    .description('List active blockers with Linear integration status')
    .option('-d, --days <days>', 'Number of days to look back', '30')
    .action(async (options) => {
        try {
            const tracker = await createLinearBlockerTracker();
            const blockers = await tracker.getActiveBlockers(parseInt(options.days));

            if (blockers.length === 0) {
                console.log('🎉 No active blockers found!');
                return;
            }

            console.log(`\n📋 Active Blockers (${blockers.length}):\n`);

            blockers.forEach(blocker => {
                console.log(`🚧 ${blocker.title} (${blocker.id})`);
                console.log(`   Priority: ${blocker.priority} | Status: ${blocker.status}`);
                console.log(`   Impact: ${blocker.impact}`);
                if (blocker.linearIssue) {
                    console.log(`   🔗 Linear: ${blocker.linearIssue}`);
                }
                console.log('');
            });

        } catch (error) {
            console.error('❌ Failed to list blockers:', error);
            process.exit(1);
        }
    });

// Generate report
program
    .command('report')
    .description('Generate daily status report with Linear integration')
    .option('-d, --days <days>', 'Number of days to include', '7')
    .option('-t, --type <type>', 'Report type: blockers, decisions, both', 'both')
    .action(async (options) => {
        try {
            const days = parseInt(options.days);

            if (options.type === 'blockers' || options.type === 'both') {
                console.log('📊 Generating blocker report...\n');
                const tracker = await createLinearBlockerTracker();
                const report = await tracker.generateBlockerReportWithLinear(days);
                console.log(report);
            }

            if (options.type === 'decisions' || options.type === 'both') {
                console.log('📊 Generating decision report...\n');
                const tracker = await createLinearDecisionTracker();
                const report = await tracker.generateDecisionReportWithLinear(days);
                console.log(report);
            }

        } catch (error) {
            console.error('❌ Failed to generate report:', error);
            process.exit(1);
        }
    });

// Sync with Linear
program
    .command('sync')
    .description('Sync existing blockers and decisions with Linear')
    .option('-d, --days <days>', 'Number of days to sync', '30')
    .action(async (options) => {
        try {
            const days = parseInt(options.days);

            console.log('🔄 Syncing blockers with Linear...');
            const blockerTracker = await createLinearBlockerTracker();
            await blockerTracker.syncBlockersWithLinear(days);

            console.log('🔄 Syncing decisions with Linear...');
            const decisionTracker = await createLinearDecisionTracker();
            await decisionTracker.syncDecisionsWithLinear(days);

            console.log('✅ Sync completed!');

        } catch (error) {
            console.error('❌ Failed to sync with Linear:', error);
            process.exit(1);
        }
    });

// Parse command line arguments
program.parse();
#!/usr/bin/env tsx

/**
 * Daily Status Management Script
 * 
 * Comprehensive tool for managing daily status files, decisions, and blockers
 */

import { format } from 'date-fns';
import { Blocker, DailyStatusBlockerTracker } from '../lib/daily-status-blocker-tracker';
import { DailyStatusDecisionTracker, Decision } from '../lib/daily-status-decision-tracker';
import { DailyStatusGenerator } from './generate-daily-status';

interface DailyStatusManager {
    generator: DailyStatusGenerator;
    decisionTracker: DailyStatusDecisionTracker;
    blockerTracker: DailyStatusBlockerTracker;
}

class DailyStatusManagementSystem {
    private manager: DailyStatusManager;

    constructor() {
        this.manager = {
            generator: new DailyStatusGenerator(),
            decisionTracker: new DailyStatusDecisionTracker(),
            blockerTracker: new DailyStatusBlockerTracker()
        };
    }

    /**
     * Initialize a new daily status file with optional initial data
     */
    async initializeDailyStatus(options: {
        date?: Date;
        focus?: string;
        duration?: string;
        initialDecisions?: Omit<Decision, 'id' | 'date'>[];
        initialBlockers?: Omit<Blocker, 'id' | 'createdDate' | 'status'>[];
    } = {}): Promise<string> {
        const date = options.date || new Date();

        console.log(`🚀 Initializing daily status for ${format(date, 'MMMM d, yyyy')}...`);

        // Generate the daily status file
        const filePath = await this.manager.generator.generateDailyStatus({
            date,
            focus: options.focus,
            duration: options.duration
        });

        // Add initial decisions if provided
        if (options.initialDecisions && options.initialDecisions.length > 0) {
            console.log(`📋 Adding ${options.initialDecisions.length} initial decisions...`);
            for (const decision of options.initialDecisions) {
                await this.manager.decisionTracker.addDecisionToDate(date, decision);
            }
        }

        // Add initial blockers if provided
        if (options.initialBlockers && options.initialBlockers.length > 0) {
            console.log(`🚫 Adding ${options.initialBlockers.length} initial blockers...`);
            for (const blocker of options.initialBlockers) {
                await this.manager.blockerTracker.addBlockerToDate(date, blocker);
            }
        }

        console.log(`✅ Daily status initialized: ${filePath}`);
        return filePath;
    }

    /**
     * Add a decision to today's or specified date's daily status
     */
    async addDecision(decision: Omit<Decision, 'id' | 'date'>, date?: Date): Promise<string> {
        if (date) {
            return await this.manager.decisionTracker.addDecisionToDate(date, decision);
        } else {
            return await this.manager.decisionTracker.addDecision(decision);
        }
    }

    /**
     * Add a blocker to today's or specified date's daily status
     */
    async addBlocker(blocker: Omit<Blocker, 'id' | 'createdDate' | 'status'>, date?: Date): Promise<string> {
        if (date) {
            return await this.manager.blockerTracker.addBlockerToDate(date, blocker);
        } else {
            return await this.manager.blockerTracker.addBlocker(blocker);
        }
    }

    /**
     * Update a decision
     */
    async updateDecision(decisionId: string, updates: Partial<Omit<Decision, 'id' | 'date'>>): Promise<void> {
        await this.manager.decisionTracker.updateDecision(decisionId, updates);
    }

    /**
     * Update a blocker
     */
    async updateBlocker(blockerId: string, updates: Partial<Omit<Blocker, 'id' | 'createdDate'>>): Promise<void> {
        await this.manager.blockerTracker.updateBlocker(blockerId, updates);
    }

    /**
     * Resolve a blocker
     */
    async resolveBlocker(blockerId: string, resolutionNotes?: string): Promise<void> {
        await this.manager.blockerTracker.resolveBlocker(blockerId, resolutionNotes);
    }

    /**
     * Generate comprehensive daily status report
     */
    async generateStatusReport(days: number = 7): Promise<string> {
        console.log(`📊 Generating status report for last ${days} days...`);

        const decisions = await this.manager.decisionTracker.getRecentDecisions(days);
        const blockers = await this.manager.blockerTracker.getAllBlockers(days);
        const blockerMetrics = await this.manager.blockerTracker.getBlockerMetrics(days);

        let report = `# Daily Status Report\n\n`;
        report += `**Period**: Last ${days} days\n`;
        report += `**Generated**: ${format(new Date(), 'MMMM d, yyyy \'at\' h:mm a')}\n\n`;

        // Decisions summary
        report += `## Decisions Summary\n\n`;
        report += `**Total Decisions**: ${decisions.length}\n\n`;

        if (decisions.length > 0) {
            const byStatus = decisions.reduce((acc, decision) => {
                acc[decision.status] = (acc[decision.status] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            Object.entries(byStatus).forEach(([status, count]) => {
                report += `- **${status}**: ${count}\n`;
            });

            report += `\n### Recent Key Decisions\n\n`;
            decisions.slice(0, 5).forEach((decision, index) => {
                report += `${index + 1}. **${decision.title}** (${decision.status})\n`;
                report += `   - ${decision.decision}\n`;
                report += `   - Impact: ${decision.impact.join(', ')}\n\n`;
            });
        }

        // Blockers summary
        report += `## Blockers Summary\n\n`;
        report += `**Total Blockers**: ${blockerMetrics.total}\n`;
        report += `**Active**: ${blockerMetrics.byStatus.new + blockerMetrics.byStatus['in-progress']}\n`;
        report += `**Resolved**: ${blockerMetrics.byStatus.resolved}\n`;
        report += `**Overdue**: ${blockerMetrics.overdueBlockers}\n`;
        report += `**Average Resolution Time**: ${blockerMetrics.averageResolutionTime.toFixed(1)} days\n\n`;

        // Active blockers by priority
        const activeBlockers = blockers.filter(b => b.status !== 'resolved');
        if (activeBlockers.length > 0) {
            report += `### Active Blockers by Priority\n\n`;

            ['high', 'medium', 'low'].forEach(priority => {
                const priorityBlockers = activeBlockers.filter(b => b.priority === priority);
                if (priorityBlockers.length > 0) {
                    report += `#### ${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority (${priorityBlockers.length})\n\n`;
                    priorityBlockers.forEach(blocker => {
                        report += `- **${blocker.title}** (${blocker.id})\n`;
                        report += `  - Status: ${blocker.status}\n`;
                        report += `  - Impact: ${blocker.impact}\n`;
                        if (blocker.assignee) {
                            report += `  - Assignee: ${blocker.assignee}\n`;
                        }
                        report += `\n`;
                    });
                }
            });
        }

        return report;
    }

    /**
     * Generate weekly summary
     */
    async generateWeeklySummary(weekStartDate: Date): Promise<string> {
        console.log(`📅 Generating weekly summary for week of ${format(weekStartDate, 'MMMM d, yyyy')}...`);

        const decisionSummary = await this.manager.decisionTracker.generateWeeklyDecisionSummary(weekStartDate);
        const blockerReport = await this.manager.blockerTracker.generateWeeklyBlockerReport(weekStartDate);

        const weekEnd = new Date(weekStartDate);
        weekEnd.setDate(weekEnd.getDate() + 6);

        let summary = `# Weekly Summary\n\n`;
        summary += `**Week of**: ${format(weekStartDate, 'MMMM d')} - ${format(weekEnd, 'MMMM d, yyyy')}\n\n`;

        summary += decisionSummary + '\n\n';
        summary += blockerReport;

        return summary;
    }

    /**
     * Search across decisions and blockers
     */
    async search(keyword: string, days: number = 30): Promise<{
        decisions: Decision[];
        blockers: Blocker[];
    }> {
        console.log(`🔍 Searching for "${keyword}" in last ${days} days...`);

        const [decisions, blockers] = await Promise.all([
            this.manager.decisionTracker.searchDecisions(keyword, days),
            this.manager.blockerTracker.searchBlockers(keyword, days)
        ]);

        console.log(`Found ${decisions.length} decisions and ${blockers.length} blockers`);

        return { decisions, blockers };
    }

    /**
     * Get dashboard data for current status
     */
    async getDashboardData(): Promise<{
        activeBlockers: number;
        recentDecisions: number;
        overdueBlockers: number;
        avgResolutionTime: number;
        recentFiles: string[];
    }> {
        const [blockerMetrics, recentDecisions, recentFiles] = await Promise.all([
            this.manager.blockerTracker.getBlockerMetrics(30),
            this.manager.decisionTracker.getRecentDecisions(7),
            this.manager.generator.listDailyStatusFiles()
        ]);

        return {
            activeBlockers: blockerMetrics.byStatus.new + blockerMetrics.byStatus['in-progress'],
            recentDecisions: recentDecisions.length,
            overdueBlockers: blockerMetrics.overdueBlockers,
            avgResolutionTime: blockerMetrics.averageResolutionTime,
            recentFiles: recentFiles.slice(0, 5)
        };
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    const system = new DailyStatusManagementSystem();

    try {
        switch (command) {
            case 'init': {
                const dateArg = args[1];
                const focus = args.find(arg => arg.startsWith('--focus='))?.split('=')[1];
                const duration = args.find(arg => arg.startsWith('--duration='))?.split('=')[1];

                const date = dateArg ? new Date(dateArg) : new Date();

                if (isNaN(date.getTime())) {
                    throw new Error('Invalid date format. Use YYYY-MM-DD or leave empty for today.');
                }

                await system.initializeDailyStatus({ date, focus, duration });
                break;
            }

            case 'add-decision': {
                const title = args[1];
                const context = args[2];
                const decision = args[3];
                const rationale = args[4];

                if (!title || !context || !decision || !rationale) {
                    throw new Error('Usage: add-decision <title> <context> <decision> <rationale>');
                }

                const decisionId = await system.addDecision({
                    title,
                    context,
                    decision,
                    rationale,
                    alternatives: [],
                    impact: [],
                    status: 'proposed'
                });

                console.log(`✅ Decision added: ${decisionId}`);
                break;
            }

            case 'add-blocker': {
                const title = args[1];
                const description = args[2];
                const priority = (args[3] as 'high' | 'medium' | 'low') || 'medium';
                const impact = args[4] || 'Unknown impact';

                if (!title || !description) {
                    throw new Error('Usage: add-blocker <title> <description> [priority] [impact]');
                }

                const blockerId = await system.addBlocker({
                    title,
                    description,
                    priority,
                    impact,
                    nextSteps: ['Investigate and resolve']
                });

                console.log(`✅ Blocker added: ${blockerId}`);
                break;
            }

            case 'resolve-blocker': {
                const blockerId = args[1];
                const resolutionNotes = args[2];

                if (!blockerId) {
                    throw new Error('Usage: resolve-blocker <blocker-id> [resolution-notes]');
                }

                await system.resolveBlocker(blockerId, resolutionNotes);
                console.log(`✅ Blocker resolved: ${blockerId}`);
                break;
            }

            case 'report': {
                const days = parseInt(args[1]) || 7;
                const report = await system.generateStatusReport(days);
                console.log(report);
                break;
            }

            case 'weekly': {
                const dateArg = args[1];
                const weekStart = dateArg ? new Date(dateArg) : new Date();

                // Adjust to start of week (Monday)
                const dayOfWeek = weekStart.getDay();
                const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                weekStart.setDate(weekStart.getDate() + daysToMonday);

                const summary = await system.generateWeeklySummary(weekStart);
                console.log(summary);
                break;
            }

            case 'search': {
                const keyword = args[1];
                const days = parseInt(args[2]) || 30;

                if (!keyword) {
                    throw new Error('Usage: search <keyword> [days]');
                }

                const results = await system.search(keyword, days);

                console.log(`\n🔍 Search Results for "${keyword}"\n`);

                if (results.decisions.length > 0) {
                    console.log(`📋 Decisions (${results.decisions.length}):`);
                    results.decisions.forEach(decision => {
                        console.log(`  - ${decision.title} (${decision.id}) - ${decision.status}`);
                    });
                    console.log();
                }

                if (results.blockers.length > 0) {
                    console.log(`🚫 Blockers (${results.blockers.length}):`);
                    results.blockers.forEach(blocker => {
                        console.log(`  - ${blocker.title} (${blocker.id}) - ${blocker.status}`);
                    });
                    console.log();
                }

                if (results.decisions.length === 0 && results.blockers.length === 0) {
                    console.log('No results found.');
                }
                break;
            }

            case 'dashboard': {
                const data = await system.getDashboardData();

                console.log(`\n📊 Daily Status Dashboard\n`);
                console.log(`Active Blockers: ${data.activeBlockers}`);
                console.log(`Recent Decisions (7 days): ${data.recentDecisions}`);
                console.log(`Overdue Blockers: ${data.overdueBlockers}`);
                console.log(`Avg Resolution Time: ${data.avgResolutionTime.toFixed(1)} days`);
                console.log(`\nRecent Status Files:`);
                data.recentFiles.forEach(file => console.log(`  - ${file}`));
                break;
            }

            default: {
                console.log(`
📝 Daily Status Management System

Usage:
  npm run daily-status init [date] [--focus="description"] [--duration="time"]
  npm run daily-status add-decision <title> <context> <decision> <rationale>
  npm run daily-status add-blocker <title> <description> [priority] [impact]
  npm run daily-status resolve-blocker <blocker-id> [resolution-notes]
  npm run daily-status report [days]
  npm run daily-status weekly [week-start-date]
  npm run daily-status search <keyword> [days]
  npm run daily-status dashboard

Examples:
  npm run daily-status init --focus="Dashboard implementation"
  npm run daily-status add-decision "Use React Query" "Need state management" "Implement React Query" "Better caching and sync"
  npm run daily-status add-blocker "API timeout" "Users experiencing timeouts" high "Blocks user workflow"
  npm run daily-status resolve-blocker BLOCK-2025-01-10-1234 "Increased timeout to 30s"
  npm run daily-status report 14
  npm run daily-status weekly 2025-01-06
  npm run daily-status search "authentication" 30
  npm run daily-status dashboard

Commands:
  init          Initialize new daily status file
  add-decision  Add a decision to today's status
  add-blocker   Add a blocker to today's status
  resolve-blocker  Mark a blocker as resolved
  report        Generate status report for recent days
  weekly        Generate weekly summary
  search        Search decisions and blockers
  dashboard     Show current status dashboard
        `);
                break;
            }
        }
    } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

// Export for programmatic use
export { DailyStatusManagementSystem };

// Run CLI if called directly
if (require.main === module) {
    main();
}
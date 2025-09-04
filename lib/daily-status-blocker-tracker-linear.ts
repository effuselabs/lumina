/**
 * Enhanced Daily Status Blocker Tracker with Linear Integration
 * 
 * Extends the base blocker tracker with Linear issue creation and linking
 */

import { LinearIssue } from '../types/linear-integration';
import { Blocker, DailyStatusBlockerTracker } from './daily-status-blocker-tracker';
import { SimpleLinearIntegration, shouldCreateLinearIssue } from './linear-integration';
import { getLinearMCPService } from './linear-mcp-service';

export interface LinearBlockerOptions {
    createLinearIssue?: boolean;
    assignee?: string;
    teamId?: string;
    projectId?: string;
}

export class DailyStatusBlockerTrackerLinear extends DailyStatusBlockerTracker {
    private linearIntegration: SimpleLinearIntegration | null = null;

    constructor(dailyStatusDir: string = 'docs/daily-status') {
        super(dailyStatusDir);
    }

    /**
     * Initialize Linear integration with team/project configuration
     */
    async initializeLinearIntegration(): Promise<void> {
        const mcpService = getLinearMCPService();

        // Find the appropriate team and project
        const teams = await mcpService.getTeams();
        const luminaTeam = teams.find(team =>
            team.name.toLowerCase().includes('lumina') ||
            team.name.toLowerCase().includes('product')
        );

        if (!luminaTeam) {
            console.warn('⚠️ No Lumina team found in Linear. Linear integration disabled.');
            return;
        }

        const projects = await mcpService.getProjects(luminaTeam.id);
        const luminaProject = projects.find(project =>
            project.name.toLowerCase().includes('lumina') ||
            project.name.toLowerCase().includes('app')
        );

        // Create Linear integration with found configuration
        this.linearIntegration = new SimpleLinearIntegration({
            teamId: luminaTeam.id,
            projectId: luminaProject?.id,
            defaultLabels: ['documentation']
        });

        console.log(`✅ Linear integration initialized for team: ${luminaTeam.name}`);
        if (luminaProject) {
            console.log(`   Project: ${luminaProject.name}`);
        }
    }

    /**
     * Add blocker with optional Linear issue creation
     */
    async addBlockerWithLinear(
        blocker: Omit<Blocker, 'id' | 'createdDate' | 'status'>,
        options: LinearBlockerOptions = {}
    ): Promise<{ blockerId: string; linearIssue?: LinearIssue }> {
        // Add the blocker to daily status first
        const blockerId = await this.addBlocker(blocker);

        let linearIssue: LinearIssue | undefined;

        // Check if we should create Linear issue
        const shouldCreate = options.createLinearIssue ?? shouldCreateLinearIssue(blocker);

        if (shouldCreate && this.linearIntegration) {
            try {
                // Create Linear issue for the blocker
                linearIssue = await this.linearIntegration.createBlockerIssue({
                    title: blocker.title,
                    description: blocker.description,
                    priority: blocker.priority,
                    impact: blocker.impact,
                    nextSteps: blocker.nextSteps,
                    blockerId,
                    dailyStatusFile: this.getDailyStatusFileName(new Date())
                });

                // Update the blocker with Linear issue reference
                await this.updateBlocker(blockerId, {
                    linearIssue: linearIssue.identifier
                });

                console.log(`🔗 Created Linear issue ${linearIssue.identifier} for blocker ${blockerId}`);
            } catch (error) {
                console.error(`❌ Failed to create Linear issue for blocker ${blockerId}:`, error);
            }
        }

        return { blockerId, linearIssue };
    }

    /**
     * Resolve blocker and update Linear issue
     */
    async resolveBlockerWithLinear(
        blockerId: string,
        resolutionNotes?: string
    ): Promise<void> {
        // Get the blocker to check for Linear issue
        const blocker = await this.getBlockerById(blockerId);

        if (!blocker) {
            throw new Error(`Blocker ${blockerId} not found`);
        }

        // Resolve the blocker in daily status
        await this.resolveBlocker(blockerId, resolutionNotes);

        // Update Linear issue if it exists
        if (blocker.linearIssue && this.linearIntegration) {
            try {
                const mcpService = getLinearMCPService();

                // Add resolution comment to Linear issue
                const commentBody = `## Blocker Resolved ✅

**Resolution**: ${resolutionNotes || 'Blocker has been resolved'}

**Resolved Date**: ${new Date().toISOString()}

**Daily Status Reference**: ${this.getDailyStatusFileName(new Date())}
**Blocker ID**: ${blockerId}`;

                await mcpService.addComment(blocker.linearIssue, commentBody);

                console.log(`✅ Updated Linear issue ${blocker.linearIssue} - blocker resolved`);
            } catch (error) {
                console.error(`❌ Failed to update Linear issue ${blocker.linearIssue}:`, error);
            }
        }
    }

    /**
     * Get blocker by ID (helper method)
     */
    private async getBlockerById(blockerId: string): Promise<Blocker | null> {
        const { date } = this.parseBlockerIdForLinear(blockerId);
        const blockers = await this.getBlockersFromDate(date);
        return blockers.find(b => b.id === blockerId) || null;
    }

    /**
     * Get daily status file name for a date
     */
    private getDailyStatusFileName(date: Date): string {
        return `docs/daily-status/${date.toISOString().split('T')[0]}.md`;
    }

    /**
     * Parse blocker ID to get date and file path (public method for Linear integration)
     */
    public parseBlockerIdForLinear(blockerId: string): { date: Date; filePath: string } {
        const match = blockerId.match(/^BLOCK-(\d{4}-\d{2}-\d{2})-/);
        if (!match) {
            throw new Error(`Invalid blocker ID format: ${blockerId}`);
        }

        const dateStr = match[1];
        const date = new Date(dateStr);
        const filePath = `docs/daily-status/${dateStr}.md`;

        return { date, filePath };
    }

    /**
     * Sync all blockers with Linear issues (maintenance function)
     */
    async syncBlockersWithLinear(days: number = 30): Promise<void> {
        if (!this.linearIntegration) {
            console.log('⚠️ Linear integration not initialized');
            return;
        }

        const blockers = await this.getAllBlockers(days);
        const blockersWithoutLinear = blockers.filter(b =>
            !b.linearIssue &&
            b.status !== 'resolved' &&
            shouldCreateLinearIssue(b)
        );

        console.log(`🔄 Syncing ${blockersWithoutLinear.length} blockers with Linear...`);

        for (const blocker of blockersWithoutLinear) {
            try {
                const linearIssue = await this.linearIntegration.createBlockerIssue({
                    title: blocker.title,
                    description: blocker.description,
                    priority: blocker.priority,
                    impact: blocker.impact,
                    nextSteps: blocker.nextSteps,
                    blockerId: blocker.id,
                    dailyStatusFile: this.getDailyStatusFileName(blocker.createdDate)
                });

                await this.updateBlocker(blocker.id, {
                    linearIssue: linearIssue.identifier
                });

                console.log(`✅ Synced blocker ${blocker.id} → Linear issue ${linearIssue.identifier}`);
            } catch (error) {
                console.error(`❌ Failed to sync blocker ${blocker.id}:`, error);
            }
        }
    }

    /**
     * Generate blocker report with Linear issue links
     */
    async generateBlockerReportWithLinear(days: number = 30): Promise<string> {
        const baseReport = await this.generateWeeklyBlockerReport(new Date());

        // Add Linear integration status
        const blockers = await this.getAllBlockers(days);
        const blockersWithLinear = blockers.filter(b => b.linearIssue);
        const activeBlockers = blockers.filter(b => b.status !== 'resolved');

        let linearSection = `\n## Linear Integration Status\n\n`;
        linearSection += `- **Blockers with Linear Issues**: ${blockersWithLinear.length}/${blockers.length}\n`;
        linearSection += `- **Active Blockers Tracked**: ${activeBlockers.filter(b => b.linearIssue).length}/${activeBlockers.length}\n`;

        if (blockersWithLinear.length > 0) {
            linearSection += `\n### Linear Issues\n\n`;
            blockersWithLinear.forEach(blocker => {
                linearSection += `- **${blocker.title}** → [${blocker.linearIssue}](https://linear.app/issue/${blocker.linearIssue})\n`;
            });
        }

        return baseReport + linearSection;
    }
}

/**
 * Factory function to create Linear-enabled blocker tracker
 */
export async function createLinearBlockerTracker(
    dailyStatusDir?: string
): Promise<DailyStatusBlockerTrackerLinear> {
    const tracker = new DailyStatusBlockerTrackerLinear(dailyStatusDir);
    await tracker.initializeLinearIntegration();
    return tracker;
}
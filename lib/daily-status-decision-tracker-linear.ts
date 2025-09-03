/**
 * Enhanced Daily Status Decision Tracker with Linear Integration
 * 
 * Extends the base decision tracker with Linear issue linking and comments
 */

import { LinearComment, LinearIssue } from '../types/linear-integration';
import { DailyStatusDecisionTracker, Decision } from './daily-status-decision-tracker';
import { SimpleLinearIntegration, shouldLinkDecisionToLinear } from './linear-integration';
import { getLinearMCPService } from './linear-mcp-service';

export interface LinearDecisionOptions {
    linkToLinearIssue?: string; // Existing Linear issue ID to link to
    createNewIssue?: boolean;    // Create new Linear issue for this decision
    teamId?: string;
    projectId?: string;
}

export class DailyStatusDecisionTrackerLinear extends DailyStatusDecisionTracker {
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
     * Add decision with optional Linear issue linking
     */
    async addDecisionWithLinear(
        decision: Omit<Decision, 'id' | 'date'>,
        options: LinearDecisionOptions = {}
    ): Promise<{ decisionId: string; linearComment?: LinearComment; linearIssue?: LinearIssue }> {
        // Add the decision to daily status first
        const decisionId = await this.addDecision(decision);

        let linearComment: LinearComment | undefined;
        let linkedIssue: LinearIssue | undefined;

        // Check if we should link to Linear
        const shouldLink = options.linkToLinearIssue ||
            options.createNewIssue ||
            shouldLinkDecisionToLinear(decision);

        if (shouldLink && this.linearIntegration) {
            try {
                const mcpService = getLinearMCPService();

                // If linking to existing issue
                if (options.linkToLinearIssue) {
                    linearComment = await this.linearIntegration.linkDecisionToIssue(
                        options.linkToLinearIssue,
                        {
                            title: decision.title,
                            context: decision.context,
                            decision: decision.decision,
                            rationale: decision.rationale,
                            alternatives: decision.alternatives,
                            impact: decision.impact,
                            decisionId,
                            dailyStatusFile: this.getDailyStatusFileName(new Date())
                        }
                    );

                    // Update decision with Linear issue reference
                    await this.updateDecision(decisionId, {
                        linearIssue: options.linkToLinearIssue
                    });

                    console.log(`🔗 Linked decision ${decisionId} to Linear issue ${options.linkToLinearIssue}`);
                }
                // If creating new issue for decision
                else if (options.createNewIssue) {
                    // Create new Linear issue for architectural decision
                    linkedIssue = await mcpService.createIssue({
                        title: `[DECISION] ${decision.title}`,
                        description: this.formatDecisionForLinear(decision, decisionId),
                        teamId: this.linearIntegration.config.teamId,
                        projectId: this.linearIntegration.config.projectId,
                        priority: 3, // Normal priority for decisions
                        labelIds: await mcpService.findLabels(['decision', 'architecture', 'documentation'])
                    });

                    // Update decision with Linear issue reference
                    await this.updateDecision(decisionId, {
                        linearIssue: linkedIssue.identifier
                    });

                    console.log(`📝 Created Linear issue ${linkedIssue.identifier} for decision ${decisionId}`);
                }

            } catch (error) {
                console.error(`❌ Failed to link decision ${decisionId} to Linear:`, error);
            }
        }

        return { decisionId, linearComment, linearIssue: linkedIssue };
    }

    /**
     * Update decision status and sync with Linear
     */
    async updateDecisionWithLinear(
        decisionId: string,
        updates: Partial<Omit<Decision, 'id' | 'date'>>,
        addLinearComment: boolean = true
    ): Promise<void> {
        // Get the decision to check for Linear issue
        const decision = await this.getDecisionById(decisionId);

        if (!decision) {
            throw new Error(`Decision ${decisionId} not found`);
        }

        // Update the decision in daily status
        await this.updateDecision(decisionId, updates);

        // Add comment to Linear issue if it exists and we want to sync
        if (decision.linearIssue && addLinearComment && this.linearIntegration) {
            try {
                const mcpService = getLinearMCPService();

                const commentBody = `## Decision Updated 📝

**Decision ID**: ${decisionId}
**Updated**: ${new Date().toISOString()}

**Changes Made**:
${Object.entries(updates).map(([key, value]) =>
                    `- **${key}**: ${Array.isArray(value) ? value.join(', ') : value}`
                ).join('\n')}

**Daily Status Reference**: ${this.getDailyStatusFileName(new Date())}`;

                await mcpService.addComment(decision.linearIssue, commentBody);

                console.log(`✅ Updated Linear issue ${decision.linearIssue} with decision changes`);
            } catch (error) {
                console.error(`❌ Failed to update Linear issue ${decision.linearIssue}:`, error);
            }
        }
    }

    /**
     * Find related Linear issues for a decision
     */
    async findRelatedLinearIssues(decision: Decision): Promise<LinearIssue[]> {
        if (!this.linearIntegration) {
            return [];
        }

        try {
            const mcpService = getLinearMCPService();

            // Search for issues related to the decision keywords
            const searchTerms = [
                decision.title,
                ...decision.impact.slice(0, 2), // First 2 impact areas
                ...decision.alternatives.slice(0, 1) // First alternative
            ];

            const relatedIssues: LinearIssue[] = [];

            for (const term of searchTerms) {
                if (term.length > 3) { // Only search meaningful terms
                    // This would use Linear search API through MCP
                    // For now, return empty array
                }
            }

            return relatedIssues;
        } catch (error) {
            console.error('❌ Failed to search for related Linear issues:', error);
            return [];
        }
    }

    /**
     * Get decision by ID (helper method)
     */
    private async getDecisionById(decisionId: string): Promise<Decision | null> {
        const { date } = this.parseDecisionId(decisionId);
        const decisions = await this.getDecisionsFromDate(date);
        return decisions.find(d => d.id === decisionId) || null;
    }

    /**
     * Format decision for Linear issue description
     */
    private formatDecisionForLinear(decision: Decision, decisionId: string): string {
        return `## Decision Context
${decision.context}

## Decision Made
${decision.decision}

## Rationale
${decision.rationale}

## Alternatives Considered
${decision.alternatives.map(alt => `- ${alt}`).join('\n')}

## Impact Areas
${decision.impact.map(imp => `- ${imp}`).join('\n')}

## Daily Status Reference
- **File**: ${this.getDailyStatusFileName(new Date())}
- **Decision ID**: ${decisionId}
- **Date**: ${new Date().toISOString()}

---
*This issue was automatically created from a daily status decision entry.*`;
    }

    /**
     * Get daily status file name for a date
     */
    private getDailyStatusFileName(date: Date): string {
        return `docs/daily-status/${date.toISOString().split('T')[0]}.md`;
    }

    /**
     * Parse decision ID to get date (expose protected method)
     */
    parseDecisionId(decisionId: string): { date: Date; filePath: string } {
        const match = decisionId.match(/^DEC-(\d{4}-\d{2}-\d{2})-/);
        if (!match) {
            throw new Error(`Invalid decision ID format: ${decisionId}`);
        }

        const dateStr = match[1];
        const date = new Date(dateStr);
        const filePath = `docs/daily-status/${dateStr}.md`;

        return { date, filePath };
    }

    /**
     * Generate decision report with Linear integration status
     */
    async generateDecisionReportWithLinear(days: number = 30): Promise<string> {
        const decisions = await this.getRecentDecisions(days);
        const decisionsWithLinear = decisions.filter(d => d.linearIssue);

        let report = `# Decision Report with Linear Integration\n\n`;
        report += `**Period**: Last ${days} days\n`;
        report += `**Generated**: ${new Date().toISOString()}\n\n`;

        report += `## Summary\n\n`;
        report += `- **Total Decisions**: ${decisions.length}\n`;
        report += `- **Linked to Linear**: ${decisionsWithLinear.length}\n`;
        report += `- **Integration Rate**: ${decisions.length > 0 ? Math.round((decisionsWithLinear.length / decisions.length) * 100) : 0}%\n\n`;

        // Group by status
        const byStatus = decisions.reduce((acc, decision) => {
            acc[decision.status] = (acc[decision.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        report += `## Decision Status\n\n`;
        Object.entries(byStatus).forEach(([status, count]) => {
            report += `- **${status}**: ${count}\n`;
        });
        report += `\n`;

        // Recent decisions with Linear links
        if (decisionsWithLinear.length > 0) {
            report += `## Decisions with Linear Issues\n\n`;
            decisionsWithLinear.slice(0, 10).forEach(decision => {
                report += `### ${decision.title}\n\n`;
                report += `- **Status**: ${decision.status}\n`;
                report += `- **Date**: ${decision.date.toISOString().split('T')[0]}\n`;
                report += `- **Linear Issue**: [${decision.linearIssue}](https://linear.app/issue/${decision.linearIssue})\n`;
                report += `- **Impact**: ${decision.impact.slice(0, 2).join(', ')}\n\n`;
            });
        }

        return report;
    }

    /**
     * Sync decisions with Linear (maintenance function)
     */
    async syncDecisionsWithLinear(days: number = 30): Promise<void> {
        if (!this.linearIntegration) {
            console.log('⚠️ Linear integration not initialized');
            return;
        }

        const decisions = await this.getRecentDecisions(days);
        const decisionsToLink = decisions.filter(d =>
            !d.linearIssue &&
            shouldLinkDecisionToLinear(d)
        );

        console.log(`🔄 Syncing ${decisionsToLink.length} decisions with Linear...`);

        for (const decision of decisionsToLink) {
            try {
                const mcpService = getLinearMCPService();

                const linearIssue = await mcpService.createIssue({
                    title: `[DECISION] ${decision.title}`,
                    description: this.formatDecisionForLinear(decision, decision.id),
                    teamId: this.linearIntegration.config.teamId,
                    projectId: this.linearIntegration.config.projectId,
                    priority: 3,
                    labelIds: await mcpService.findLabels(['decision', 'architecture', 'documentation'])
                });

                await this.updateDecision(decision.id, {
                    linearIssue: linearIssue.identifier
                });

                console.log(`✅ Synced decision ${decision.id} → Linear issue ${linearIssue.identifier}`);
            } catch (error) {
                console.error(`❌ Failed to sync decision ${decision.id}:`, error);
            }
        }
    }
}

/**
 * Factory function to create Linear-enabled decision tracker
 */
export async function createLinearDecisionTracker(
    dailyStatusDir?: string
): Promise<DailyStatusDecisionTrackerLinear> {
    const tracker = new DailyStatusDecisionTrackerLinear(dailyStatusDir);
    await tracker.initializeLinearIntegration();
    return tracker;
}
/**
 * Simple Linear Integration for Solo Developer Documentation
 * 
 * Provides one-click "remember this" and "track this" functionality
 * Auto-creates Linear issues for blockers and links decisions to issues
 */

import { CreateLinearIssueInput, DOCUMENTATION_ISSUE_TEMPLATES, LinearComment, LinearIssue } from '../types/linear-integration';

export interface SimpleLinearConfig {
    teamId: string;
    projectId?: string;
    defaultLabels: string[];
}

export class SimpleLinearIntegration {
    private config: SimpleLinearConfig;

    constructor(config: SimpleLinearConfig) {
        this.config = config;
    }

    /**
     * Get the team ID for Linear integration
     */
    public getTeamId(): string | undefined {
        return this.config.teamId;
    }

    /**
     * Get the project ID for Linear integration
     */
    public getProjectId(): string | undefined {
        return this.config.projectId;
    }

    /**
     * Auto-create Linear issue for a blocker (one-click "remember this")
     */
    async createBlockerIssue(blocker: {
        title: string;
        description: string;
        priority: 'high' | 'medium' | 'low';
        impact: string;
        nextSteps: string[];
        dailyStatusFile?: string;
        blockerId?: string;
    }): Promise<LinearIssue> {
        const template = DOCUMENTATION_ISSUE_TEMPLATES['high-priority-blocker'];

        const priorityMap = {
            'high': 2,    // High priority in Linear
            'medium': 3,  // Normal priority in Linear  
            'low': 4      // Low priority in Linear
        };

        const description = template.description
            .replace('{impact}', blocker.impact)
            .replace('{description}', blocker.description)
            .replace('{nextSteps}', blocker.nextSteps.map(step => `- ${step}`).join('\n'))
            .replace('{date}', new Date().toISOString())
            .replace('{dailyStatusFile}', blocker.dailyStatusFile || 'N/A')
            .replace('{blockerId}', blocker.blockerId || 'N/A');

        const title = template.title.replace('{title}', blocker.title);

        const issueInput: CreateLinearIssueInput = {
            title,
            description,
            teamId: this.config.teamId,
            projectId: this.config.projectId,
            priority: priorityMap[blocker.priority],
            labelIds: [...this.config.defaultLabels, 'blocker', blocker.priority + '-priority']
        };

        return await this.createIssue(issueInput);
    }

    /**
     * Link decision to Linear issue (one-click "track this")
     */
    async linkDecisionToIssue(issueId: string, decision: {
        title: string;
        context: string;
        decision: string;
        rationale: string;
        alternatives: string[];
        impact: string[];
        dailyStatusFile?: string;
        decisionId?: string;
    }): Promise<LinearComment> {
        const template = DOCUMENTATION_ISSUE_TEMPLATES['architectural-decision'];

        const commentBody = template.description
            .replace('{context}', decision.context)
            .replace('{decision}', decision.decision)
            .replace('{rationale}', decision.rationale)
            .replace('{alternatives}', decision.alternatives.map(alt => `- ${alt}`).join('\n'))
            .replace('{impact}', decision.impact.map(imp => `- ${imp}`).join('\n'))
            .replace('{dailyStatusFile}', decision.dailyStatusFile || 'N/A')
            .replace('{decisionId}', decision.decisionId || 'N/A');

        return await this.addComment(issueId, commentBody);
    }

    /**
     * Create maintenance issue for broken links or stale content
     */
    async createMaintenanceIssue(type: 'broken-link' | 'stale-content', details: {
        title: string;
        filePath?: string;
        url?: string;
        errorDetails?: string;
        lastUpdated?: string;
        ageInDays?: number;
    }): Promise<LinearIssue> {
        const templateKey = type === 'broken-link' ? 'broken-link-maintenance' : 'stale-content';
        const template = DOCUMENTATION_ISSUE_TEMPLATES[templateKey];

        let description = template.description;

        if (type === 'broken-link') {
            description = description
                .replace('{url}', details.url || 'N/A')
                .replace('{filePath}', details.filePath || 'N/A')
                .replace('{date}', new Date().toISOString())
                .replace('{errorDetails}', details.errorDetails || 'Link validation failed')
                .replace('{suggestedFix}', 'Check if URL is still valid or update to correct URL');
        } else {
            description = description
                .replace('{filePath}', details.filePath || 'N/A')
                .replace('{lastUpdated}', details.lastUpdated || 'Unknown')
                .replace('{ageInDays}', (details.ageInDays || 0).toString())
                .replace('{threshold}', '90')
                .replace('{contentSummary}', 'Content needs review and updates')
                .replace('{suggestedUpdates}', 'Review content for accuracy and relevance');
        }

        const title = template.title
            .replace('{url}', details.url || '')
            .replace('{fileName}', details.filePath?.split('/').pop() || details.title);

        const issueInput: CreateLinearIssueInput = {
            title,
            description,
            teamId: this.config.teamId,
            projectId: this.config.projectId,
            priority: template.priority,
            labelIds: [...this.config.defaultLabels, ...template.labels]
        };

        return await this.createIssue(issueInput);
    }

    // MCP Linear tool wrappers for simple interface
    private async createIssue(input: CreateLinearIssueInput): Promise<LinearIssue> {
        const mcpService = await import('./linear-mcp-service');
        const service = mcpService.getLinearMCPService();
        return await service.createIssue(input);
    }

    private async addComment(issueId: string, body: string): Promise<LinearComment> {
        const mcpService = await import('./linear-mcp-service');
        const service = mcpService.getLinearMCPService();
        return await service.addComment(issueId, body);
    }

    /**
     * Get team and project info for configuration
     */
    async getTeamInfo(): Promise<{ teams: any[], projects: any[] }> {
        // This will use MCP Linear tools to get team/project info
        throw new Error('MCP Linear integration not implemented - will be handled by MCP tools');
    }
}

/**
 * Factory function to create configured Linear integration
 */
export function createSimpleLinearIntegration(): SimpleLinearIntegration {
    // Default configuration for Lumina project
    const config: SimpleLinearConfig = {
        teamId: '', // Will be configured based on available teams
        projectId: '', // Will be configured based on available projects
        defaultLabels: ['documentation']
    };

    return new SimpleLinearIntegration(config);
}

/**
 * Helper function to determine if a blocker should auto-create Linear issue
 */
export function shouldCreateLinearIssue(blocker: {
    priority: 'high' | 'medium' | 'low';
    impact: string;
}): boolean {
    // Auto-create for high priority blockers or those with significant impact
    return blocker.priority === 'high' ||
        blocker.impact.toLowerCase().includes('critical') ||
        blocker.impact.toLowerCase().includes('blocking');
}

/**
 * Helper function to determine if a decision should be linked to Linear
 */
export function shouldLinkDecisionToLinear(decision: {
    impact: string[];
    context: string;
}): boolean {
    // Link decisions that affect architecture or have broad impact
    const architecturalKeywords = ['architecture', 'design', 'framework', 'database', 'api'];
    const impactKeywords = ['system', 'performance', 'security', 'scalability'];

    const text = (decision.context + ' ' + decision.impact.join(' ')).toLowerCase();

    return architecturalKeywords.some(keyword => text.includes(keyword)) ||
        impactKeywords.some(keyword => text.includes(keyword));
}
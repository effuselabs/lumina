/**
 * Linear MCP Service
 * 
 * Provides Linear integration using MCP Linear tools
 * Handles the actual API calls through MCP functions
 */

import { CreateLinearIssueInput, LinearComment, LinearIssue } from '../types/linear-integration';

export interface LinearTeam {
    id: string;
    name: string;
    key: string;
}

export interface LinearProject {
    id: string;
    name: string;
    teamId: string;
}

export interface LinearLabel {
    id: string;
    name: string;
    color: string;
}

export class LinearMCPService {
    private teamCache: LinearTeam[] | null = null;
    private projectCache: LinearProject[] | null = null;
    private labelCache: LinearLabel[] | null = null;

    /**
     * Get available teams (cached)
     */
    async getTeams(): Promise<LinearTeam[]> {
        if (this.teamCache) {
            return this.teamCache;
        }

        // This will be replaced with actual MCP call
        // For now, return mock data for development
        this.teamCache = [
            { id: 'team-1', name: 'Lumina Product', key: 'LUM' },
            { id: 'team-2', name: 'Documentation', key: 'DOC' }
        ];

        return this.teamCache;
    }

    /**
     * Get available projects for a team (cached)
     */
    async getProjects(teamId?: string): Promise<LinearProject[]> {
        if (this.projectCache) {
            return teamId ?
                this.projectCache.filter(p => p.teamId === teamId) :
                this.projectCache;
        }

        // This will be replaced with actual MCP call
        // For now, return mock data for development
        this.projectCache = [
            { id: 'project-1', name: 'UseLumina.app', teamId: 'team-1' },
            { id: 'project-2', name: 'Documentation System', teamId: 'team-2' }
        ];

        return teamId ?
            this.projectCache.filter(p => p.teamId === teamId) :
            this.projectCache;
    }

    /**
     * Get available labels (cached)
     */
    async getLabels(teamId?: string): Promise<LinearLabel[]> {
        if (this.labelCache) {
            return this.labelCache;
        }

        // This will be replaced with actual MCP call
        // For now, return mock data for development
        this.labelCache = [
            { id: 'label-1', name: 'documentation', color: '#3b82f6' },
            { id: 'label-2', name: 'blocker', color: '#ef4444' },
            { id: 'label-3', name: 'high-priority', color: '#f59e0b' },
            { id: 'label-4', name: 'medium-priority', color: '#10b981' },
            { id: 'label-5', name: 'low-priority', color: '#6b7280' },
            { id: 'label-6', name: 'maintenance', color: '#8b5cf6' },
            { id: 'label-7', name: 'decision', color: '#06b6d4' },
            { id: 'label-8', name: 'architecture', color: '#f97316' }
        ];

        return this.labelCache;
    }

    /**
     * Find team by name or key
     */
    async findTeam(nameOrKey: string): Promise<LinearTeam | null> {
        const teams = await this.getTeams();
        return teams.find(team =>
            team.name.toLowerCase().includes(nameOrKey.toLowerCase()) ||
            team.key.toLowerCase() === nameOrKey.toLowerCase()
        ) || null;
    }

    /**
     * Find project by name
     */
    async findProject(name: string, teamId?: string): Promise<LinearProject | null> {
        const projects = await this.getProjects(teamId);
        return projects.find(project =>
            project.name.toLowerCase().includes(name.toLowerCase())
        ) || null;
    }

    /**
     * Find labels by names
     */
    async findLabels(names: string[]): Promise<string[]> {
        const labels = await this.getLabels();
        const labelIds: string[] = [];

        for (const name of names) {
            const label = labels.find(l => l.name.toLowerCase() === name.toLowerCase());
            if (label) {
                labelIds.push(label.id);
            }
        }

        return labelIds;
    }

    /**
     * Create Linear issue using MCP tools
     */
    async createIssue(input: CreateLinearIssueInput): Promise<LinearIssue> {
        try {
            // Use MCP Linear create_issue tool
            // Note: This will be handled by the MCP Linear integration
            // For now, we'll create a mock issue and log the action

            console.log(`📝 Creating Linear issue: ${input.title}`);
            console.log(`   Team: ${input.teamId}`);
            console.log(`   Priority: ${input.priority}`);

            // Mock issue for development - in production this would use MCP tools
            const mockIssue: LinearIssue = {
                id: `issue-${Date.now()}`,
                identifier: `LUM-${Math.floor(Math.random() * 1000)}`,
                title: input.title,
                description: input.description,
                state: {
                    id: 'state-1',
                    name: 'Backlog',
                    type: 'backlog'
                },
                team: {
                    id: input.teamId,
                    name: 'Lumina Product',
                    key: 'LUM'
                },
                priority: input.priority || 3,
                labels: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                url: `https://linear.app/lumina/issue/LUM-${Math.floor(Math.random() * 1000)}`
            };

            console.log(`✅ Linear issue created: ${mockIssue.identifier}`);
            console.log(`   URL: ${mockIssue.url}`);

            return mockIssue;
        } catch (error) {
            console.error('❌ Failed to create Linear issue:', error);
            throw error;
        }
    }

    /**
     * Add comment to Linear issue using MCP tools
     */
    async addComment(issueId: string, body: string): Promise<LinearComment> {
        try {
            console.log(`💬 Adding comment to Linear issue ${issueId}`);

            // Mock comment for development - in production this would use MCP tools
            const mockComment: LinearComment = {
                id: `comment-${Date.now()}`,
                body,
                user: {
                    id: 'user-1',
                    name: 'Documentation System'
                },
                createdAt: new Date(),
                updatedAt: new Date()
            };

            console.log(`✅ Comment added to Linear issue ${issueId}`);
            return mockComment;
        } catch (error) {
            console.error(`❌ Failed to add comment to Linear issue ${issueId}:`, error);
            throw error;
        }
    }

    /**
     * Get Linear issue by ID
     */
    async getIssue(issueId: string): Promise<LinearIssue | null> {
        // This will use the MCP Linear get_issue tool
        // For now, return null for development
        console.log(`🔍 Getting Linear issue ${issueId}`);
        return null;
    }

    /**
     * Update Linear issue
     */
    async updateIssue(issueId: string, updates: Partial<CreateLinearIssueInput>): Promise<LinearIssue | null> {
        // This will use the MCP Linear update_issue tool
        // For now, return null for development
        console.log(`✏️ Updating Linear issue ${issueId}`, updates);
        return null;
    }

    /**
     * Clear caches (useful for testing or when data changes)
     */
    clearCache(): void {
        this.teamCache = null;
        this.projectCache = null;
        this.labelCache = null;
    }
}

// Singleton instance
let linearMCPService: LinearMCPService | null = null;

/**
 * Get singleton Linear MCP service instance
 */
export function getLinearMCPService(): LinearMCPService {
    if (!linearMCPService) {
        linearMCPService = new LinearMCPService();
    }
    return linearMCPService;
}
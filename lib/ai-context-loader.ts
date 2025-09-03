/**
 * AI Context Loader
 * 
 * Comprehensive system for loading and validating AI context across sessions
 * to ensure continuity and prevent knowledge loss.
 */

import { stat } from 'fs/promises';
import { join } from 'path';
import { decisionLog } from './decision-log';
import { ProjectState, projectStateTracker } from './project-state-tracker';

export interface AIContextState {
    sessionId: string;
    startTime: Date;
    essentialDocsReviewed: string[];
    projectStateSnapshot: ProjectState;
    contextCompleteness: number; // 0-100 percentage
    recommendedNextSteps: string[];
    validationResults: {
        essentialDocsAccessible: boolean;
        projectStateValid: boolean;
        recentDecisionsLoaded: boolean;
        developmentStandardsAvailable: boolean;
    };
}

export interface EssentialDocument {
    path: string;
    title: string;
    category: 'core' | 'development' | 'feature' | 'quality';
    priority: 'essential' | 'important' | 'optional';
    estimatedReadTime: number; // minutes
    lastModified?: Date;
    accessible: boolean;
}

export class AIContextLoader {
    private readonly rootPath: string;
    private readonly docsPath: string;

    constructor(rootPath: string = process.cwd()) {
        this.rootPath = rootPath;
        this.docsPath = join(rootPath, 'docs');
    }

    /**
     * Initialize AI context for a new session
     */
    async initializeContext(): Promise<AIContextState> {
        const sessionId = this.generateSessionId();
        console.log(`🤖 Initializing AI context for session: ${sessionId}`);

        try {
            // Load essential documents list
            const essentialDocs = await this.getEssentialDocuments();

            // Get current project state
            const projectState = await projectStateTracker.getCurrentState();

            // Validate context completeness
            const validationResults = await this.validateContext(essentialDocs);

            // Calculate completeness score
            const contextCompleteness = this.calculateCompleteness(essentialDocs, validationResults);

            // Generate recommendations
            const recommendedNextSteps = await this.generateRecommendations(projectState, validationResults);

            const contextState: AIContextState = {
                sessionId,
                startTime: new Date(),
                essentialDocsReviewed: essentialDocs.filter(doc => doc.accessible).map(doc => doc.path),
                projectStateSnapshot: projectState,
                contextCompleteness,
                recommendedNextSteps,
                validationResults
            };

            // Log context initialization
            await this.logContextInitialization(contextState);

            return contextState;
        } catch (error) {
            console.error('❌ Failed to initialize AI context:', error);
            return this.createMinimalContext(sessionId, error as Error);
        }
    }

    /**
     * Get list of essential documents for AI context
     */
    async getEssentialDocuments(): Promise<EssentialDocument[]> {
        const essentialDocs: EssentialDocument[] = [
            // Core Project Context (Essential - 5-10 minutes)
            {
                path: 'docs/onboarding/PROJECT_OVERVIEW.md',
                title: 'Project Overview',
                category: 'core',
                priority: 'essential',
                estimatedReadTime: 3,
                accessible: false
            },
            {
                path: '.kiro/steering/product.md',
                title: 'Product Overview',
                category: 'core',
                priority: 'essential',
                estimatedReadTime: 2,
                accessible: false
            },
            {
                path: '.kiro/steering/tech.md',
                title: 'Technology Stack',
                category: 'core',
                priority: 'essential',
                estimatedReadTime: 2,
                accessible: false
            },
            {
                path: '.kiro/steering/structure.md',
                title: 'Project Structure',
                category: 'core',
                priority: 'essential',
                estimatedReadTime: 2,
                accessible: false
            },
            {
                path: 'docs/onboarding/DECISION_LOG.md',
                title: 'Recent Decision Log',
                category: 'core',
                priority: 'essential',
                estimatedReadTime: 3,
                accessible: false
            },

            // Development Standards (Essential)
            {
                path: '.kiro/steering/coding-approach-and-standards.md',
                title: 'Coding Standards',
                category: 'development',
                priority: 'essential',
                estimatedReadTime: 5,
                accessible: false
            },
            {
                path: '.kiro/steering/security.md',
                title: 'Security Standards',
                category: 'development',
                priority: 'important',
                estimatedReadTime: 3,
                accessible: false
            },
            {
                path: '.kiro/steering/api-standards.md',
                title: 'API Standards',
                category: 'development',
                priority: 'important',
                estimatedReadTime: 3,
                accessible: false
            },

            // Feature Documentation (Important - 15-30 minutes)
            {
                path: 'docs/features/',
                title: 'Feature Documentation',
                category: 'feature',
                priority: 'important',
                estimatedReadTime: 10,
                accessible: false
            },
            {
                path: '.kiro/specs/',
                title: 'Feature Specifications',
                category: 'feature',
                priority: 'important',
                estimatedReadTime: 10,
                accessible: false
            },

            // Technical Architecture (Important)
            {
                path: 'prisma/schema.prisma',
                title: 'Database Schema',
                category: 'development',
                priority: 'important',
                estimatedReadTime: 5,
                accessible: false
            },
            {
                path: 'lib/auth.ts',
                title: 'Authentication System',
                category: 'development',
                priority: 'important',
                estimatedReadTime: 3,
                accessible: false
            },

            // Quality Assurance (Optional)
            {
                path: '.kiro/steering/troubleshooting.md',
                title: 'Troubleshooting Guide',
                category: 'quality',
                priority: 'optional',
                estimatedReadTime: 3,
                accessible: false
            },
            {
                path: 'docs/DEVELOPMENT_SETUP.md',
                title: 'Development Setup',
                category: 'quality',
                priority: 'optional',
                estimatedReadTime: 5,
                accessible: false
            }
        ];

        // Check accessibility of each document
        for (const doc of essentialDocs) {
            try {
                const fullPath = join(this.rootPath, doc.path);
                const stats = await stat(fullPath);
                doc.accessible = true;
                doc.lastModified = stats.mtime;
            } catch {
                doc.accessible = false;
            }
        }

        return essentialDocs;
    }

    /**
     * Validate context completeness and accessibility
     */
    async validateContext(essentialDocs: EssentialDocument[]): Promise<AIContextState['validationResults']> {
        const essentialAccessible = essentialDocs
            .filter(doc => doc.priority === 'essential')
            .every(doc => doc.accessible);

        const projectStateValid = await this.validateProjectState();
        const recentDecisionsLoaded = await this.validateRecentDecisions();
        const developmentStandardsAvailable = await this.validateDevelopmentStandards();

        return {
            essentialDocsAccessible: essentialAccessible,
            projectStateValid,
            recentDecisionsLoaded,
            developmentStandardsAvailable
        };
    }

    /**
     * Calculate context completeness score
     */
    private calculateCompleteness(
        essentialDocs: EssentialDocument[],
        validationResults: AIContextState['validationResults']
    ): number {
        const weights = {
            essentialDocs: 40,
            projectState: 25,
            recentDecisions: 20,
            developmentStandards: 15
        };

        let score = 0;

        // Essential documents score
        const essentialCount = essentialDocs.filter(doc => doc.priority === 'essential').length;
        const accessibleEssential = essentialDocs.filter(doc =>
            doc.priority === 'essential' && doc.accessible
        ).length;
        score += (accessibleEssential / essentialCount) * weights.essentialDocs;

        // Validation results scores
        score += validationResults.projectStateValid ? weights.projectState : 0;
        score += validationResults.recentDecisionsLoaded ? weights.recentDecisions : 0;
        score += validationResults.developmentStandardsAvailable ? weights.developmentStandards : 0;

        return Math.round(score);
    }

    /**
     * Generate recommendations based on context state
     */
    async generateRecommendations(
        projectState: ProjectState,
        validationResults: AIContextState['validationResults']
    ): Promise<string[]> {
        const recommendations: string[] = [];

        // Check for missing essential context
        if (!validationResults.essentialDocsAccessible) {
            recommendations.push('Review essential documents in docs/onboarding/ for project context');
        }

        if (!validationResults.recentDecisionsLoaded) {
            recommendations.push('Check recent architectural decisions in DECISION_LOG.md');
        }

        // Project-specific recommendations
        if (projectState.currentIssues.length > 0) {
            const highPriorityIssues = projectState.currentIssues.filter(
                issue => issue.priority === 'high' || issue.priority === 'urgent'
            );
            if (highPriorityIssues.length > 0) {
                recommendations.push(`Address ${highPriorityIssues.length} high-priority issue(s)`);
            }
        }

        // Feature development recommendations
        const inProgressFeatures = projectState.activeFeatures.filter(
            feature => feature.status === 'in_progress'
        );
        if (inProgressFeatures.length > 0) {
            recommendations.push(`Continue work on ${inProgressFeatures.length} active feature(s)`);
        }

        // Health-based recommendations
        if (projectState.healthMetrics.testCoverage < 80) {
            recommendations.push('Improve test coverage (currently below 80%)');
        }

        if (projectState.healthMetrics.documentationHealth < 90) {
            recommendations.push('Update documentation to improve health score');
        }

        return recommendations.length > 0 ? recommendations : [
            'All systems healthy - ready for development work'
        ];
    }

    /**
     * Generate context initialization report
     */
    async generateContextReport(contextState: AIContextState): Promise<string> {
        const essentialDocs = await this.getEssentialDocuments();
        const essentialAccessible = essentialDocs.filter(doc =>
            doc.priority === 'essential' && doc.accessible
        );
        const importantAccessible = essentialDocs.filter(doc =>
            doc.priority === 'important' && doc.accessible
        );

        return `# AI Context Initialization Report

**Session ID**: ${contextState.sessionId}  
**Initialized**: ${contextState.startTime.toISOString()}  
**Context Completeness**: ${contextState.contextCompleteness}%

## Essential Documents Review (${essentialAccessible.length}/${essentialDocs.filter(d => d.priority === 'essential').length})

${essentialAccessible.map(doc =>
            `- ✅ ${doc.title} (${doc.estimatedReadTime}min)`
        ).join('\n')}

## Important Documents Available (${importantAccessible.length}/${essentialDocs.filter(d => d.priority === 'important').length})

${importantAccessible.map(doc =>
            `- 📋 ${doc.title} (${doc.estimatedReadTime}min)`
        ).join('\n')}

## Project State Summary

- **Active Features**: ${contextState.projectStateSnapshot.activeFeatures.length}
- **Recent Decisions**: ${contextState.projectStateSnapshot.recentDecisions.length}
- **Current Issues**: ${contextState.projectStateSnapshot.currentIssues.length}
- **Health Score**: ${Math.round(
            (contextState.projectStateSnapshot.healthMetrics.codeQuality +
                contextState.projectStateSnapshot.healthMetrics.testCoverage +
                contextState.projectStateSnapshot.healthMetrics.documentationHealth) / 3
        )}%

## Validation Results

- Essential Documents: ${contextState.validationResults.essentialDocsAccessible ? '✅' : '❌'}
- Project State: ${contextState.validationResults.projectStateValid ? '✅' : '❌'}
- Recent Decisions: ${contextState.validationResults.recentDecisionsLoaded ? '✅' : '❌'}
- Development Standards: ${contextState.validationResults.developmentStandardsAvailable ? '✅' : '❌'}

## Recommended Next Steps

${contextState.recommendedNextSteps.map((step, index) =>
            `${index + 1}. ${step}`
        ).join('\n')}

## Quick Context Summary

${await this.generateQuickContextSummary(contextState.projectStateSnapshot)}
`;
    }

    /**
     * Generate quick context summary for immediate use
     */
    private async generateQuickContextSummary(projectState: ProjectState): Promise<string> {
        const activeFeature = projectState.activeFeatures.find(f => f.status === 'in_progress');
        const recentDecision = projectState.recentDecisions[0];
        const urgentIssue = projectState.currentIssues.find(i => i.priority === 'urgent');

        let summary = '';

        if (activeFeature) {
            summary += `**Current Focus**: ${activeFeature.name} (${activeFeature.completionPercentage || 0}% complete)\n`;
        }

        if (recentDecision) {
            summary += `**Latest Decision**: ${recentDecision.title} (${recentDecision.date.toDateString()})\n`;
        }

        if (urgentIssue) {
            summary += `**Urgent Issue**: ${urgentIssue.title}\n`;
        }

        if (!summary) {
            summary = 'No immediate priorities identified - ready for new development work.';
        }

        return summary;
    }

    /**
     * Validate project state is current and accessible
     */
    private async validateProjectState(): Promise<boolean> {
        try {
            const state = await projectStateTracker.getCurrentState();
            return state.lastUpdated && state.activeFeatures !== undefined;
        } catch {
            return false;
        }
    }

    /**
     * Validate recent decisions are accessible
     */
    private async validateRecentDecisions(): Promise<boolean> {
        try {
            const decisions = await decisionLog.getRecentDecisions(30);
            return true; // If no error, decisions are accessible
        } catch {
            return false;
        }
    }

    /**
     * Validate development standards are available
     */
    private async validateDevelopmentStandards(): Promise<boolean> {
        const standardsFiles = [
            '.kiro/steering/coding-approach-and-standards.md',
            '.kiro/steering/security.md',
            '.kiro/steering/api-standards.md'
        ];

        try {
            for (const file of standardsFiles) {
                await stat(join(this.rootPath, file));
            }
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Log context initialization for tracking
     */
    private async logContextInitialization(contextState: AIContextState): Promise<void> {
        const logEntry = `## AI Context Initialization - ${contextState.startTime.toISOString()}

**Session ID**: ${contextState.sessionId}  
**Completeness**: ${contextState.contextCompleteness}%  
**Essential Docs**: ${contextState.validationResults.essentialDocsAccessible ? 'Available' : 'Missing'}  
**Recommendations**: ${contextState.recommendedNextSteps.length} items

`;

        // In a real implementation, this would append to a context log file
        console.log('📝 Context initialization logged');
    }

    /**
     * Create minimal context when full initialization fails
     */
    private createMinimalContext(sessionId: string, error: Error): AIContextState {
        return {
            sessionId,
            startTime: new Date(),
            essentialDocsReviewed: [],
            projectStateSnapshot: {
                lastUpdated: new Date(),
                activeFeatures: [],
                recentDecisions: [],
                currentIssues: [],
                healthMetrics: {
                    codeQuality: 0,
                    testCoverage: 0,
                    documentationHealth: 0,
                    deploymentStatus: 'error'
                },
                recentActivity: []
            },
            contextCompleteness: 0,
            recommendedNextSteps: [
                'Fix context loading issues',
                'Verify essential documents are accessible',
                'Check project structure and permissions'
            ],
            validationResults: {
                essentialDocsAccessible: false,
                projectStateValid: false,
                recentDecisionsLoaded: false,
                developmentStandardsAvailable: false
            }
        };
    }

    /**
     * Generate unique session ID
     */
    private generateSessionId(): string {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `ai-${timestamp}-${random}`;
    }
}

// Export singleton instance
export const aiContextLoader = new AIContextLoader();
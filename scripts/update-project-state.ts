#!/usr/bin/env tsx

/**
 * Project State Update Script
 * 
 * Updates the project overview and generates current state reports
 * for AI context preservation and project management.
 */

import { writeFile } from 'fs/promises';
import { join } from 'path';
import { projectStateTracker } from '../lib/project-state-tracker';

async function updateProjectOverview() {
    console.log('🔄 Updating project state...');

    try {
        // Get current project state
        const state = await projectStateTracker.getCurrentState();

        // Generate state report
        const report = await projectStateTracker.generateStateReport();

        // Update PROJECT_OVERVIEW.md with current state
        const overviewPath = join(process.cwd(), 'docs', 'onboarding', 'PROJECT_OVERVIEW.md');

        // Read current overview to preserve manual content
        let overviewContent: string;
        try {
            const { readFile } = await import('fs/promises');
            overviewContent = await readFile(overviewPath, 'utf-8');
        } catch {
            console.warn('Could not read existing PROJECT_OVERVIEW.md, creating new one');
            overviewContent = '';
        }

        // Update the active features section
        const activeFeaturesSection = generateActiveFeaturesSection(state.activeFeatures);
        const recentDecisionsSection = generateRecentDecisionsSection(state.recentDecisions);
        const currentIssuesSection = generateCurrentIssuesSection(state.currentIssues);

        // Replace or add sections in overview
        overviewContent = updateSection(overviewContent, 'Active Features in Development', activeFeaturesSection);
        overviewContent = updateSection(overviewContent, 'Recent Architectural Decisions', recentDecisionsSection);
        overviewContent = updateSection(overviewContent, 'Current Blockers & Issues', currentIssuesSection);

        // Update last updated timestamp
        overviewContent = overviewContent.replace(
            /\*\*Last Updated\*\*: .+/,
            `**Last Updated**: ${new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })}`
        );

        await writeFile(overviewPath, overviewContent);

        // Write detailed state report
        const reportPath = join(process.cwd(), 'docs', 'project-management', 'PROJECT_STATE_REPORT.md');
        await writeFile(reportPath, report);

        console.log('✅ Project state updated successfully');
        console.log(`📊 Active features: ${state.activeFeatures.length}`);
        console.log(`📋 Recent decisions: ${state.recentDecisions.length}`);
        console.log(`⚠️  Current issues: ${state.currentIssues.length}`);
        console.log(`📈 Health score: ${Math.round((state.healthMetrics.codeQuality + state.healthMetrics.testCoverage + state.healthMetrics.documentationHealth) / 3)}%`);

    } catch (error) {
        console.error('❌ Failed to update project state:', error);
        process.exit(1);
    }
}

function generateActiveFeaturesSection(features: any[]): string {
    if (features.length === 0) {
        return 'No active features currently in development.';
    }

    return features.map((feature, index) => {
        const statusEmojiMap = {
            'not_started': '⏳',
            'in_progress': '🔄',
            'completed': '✅',
            'blocked': '🚫'
        } as const;
        const statusEmoji = statusEmojiMap[feature.status as keyof typeof statusEmojiMap] || '❓';

        return `### ${index + 1}. ${feature.name}
- **Status**: ${feature.status.replace('_', ' ')} ${statusEmoji}
- **Progress**: ${feature.completionPercentage || 0}%
- **Last Updated**: ${feature.lastUpdated.toLocaleDateString()}
${feature.description ? `- **Description**: ${feature.description}` : ''}`;
    }).join('\n\n');
}

function generateRecentDecisionsSection(decisions: any[]): string {
    if (decisions.length === 0) {
        return 'No recent architectural decisions recorded.';
    }

    return decisions.slice(0, 5).map(decision => {
        return `### ${decision.title}
- **Date**: ${decision.date.toLocaleDateString()}
- **Status**: ${decision.status}
- **Impact**: ${decision.impact.split('\n')[0]}`;
    }).join('\n\n');
}

function generateCurrentIssuesSection(issues: any[]): string {
    const highPriority = issues.filter(i => i.priority === 'high' || i.priority === 'urgent');
    const mediumPriority = issues.filter(i => i.priority === 'medium');
    const lowPriority = issues.filter(i => i.priority === 'low');

    let section = '';

    if (highPriority.length > 0) {
        section += '### High Priority\n';
        section += highPriority.map(issue => `- ${issue.title}`).join('\n');
        section += '\n\n';
    } else {
        section += '### High Priority\n- None currently identified\n\n';
    }

    if (mediumPriority.length > 0) {
        section += '### Medium Priority\n';
        section += mediumPriority.map(issue => `- ${issue.title}`).join('\n');
        section += '\n\n';
    }

    if (lowPriority.length > 0) {
        section += '### Low Priority\n';
        section += lowPriority.map(issue => `- ${issue.title}`).join('\n');
    }

    return section.trim();
}

function updateSection(content: string, sectionTitle: string, newContent: string): string {
    const sectionRegex = new RegExp(`(## ${sectionTitle}\\s*\\n)(.*?)(?=\\n## |$)`, 's');
    const match = content.match(sectionRegex);

    if (match) {
        return content.replace(sectionRegex, `$1\n${newContent}\n`);
    } else {
        // If section doesn't exist, add it before the "Quick Links" section or at the end
        const quickLinksIndex = content.indexOf('## Quick Links');
        if (quickLinksIndex !== -1) {
            return content.slice(0, quickLinksIndex) +
                `## ${sectionTitle}\n\n${newContent}\n\n` +
                content.slice(quickLinksIndex);
        } else {
            return content + `\n\n## ${sectionTitle}\n\n${newContent}\n`;
        }
    }
}

// Run the script if called directly
if (require.main === module) {
    updateProjectOverview().catch(console.error);
}

export { updateProjectOverview };


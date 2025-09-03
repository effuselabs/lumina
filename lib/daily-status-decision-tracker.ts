/**
 * Daily Status Decision Tracker
 * 
 * Manages decision capture and tracking within daily status entries
 */

import { format } from 'date-fns';
import { promises as fs } from 'fs';
import { join } from 'path';

export interface Decision {
    id: string;
    title: string;
    context: string;
    decision: string;
    rationale: string;
    alternatives: string[];
    impact: string[];
    linearIssue?: string;
    date: Date;
    author?: string;
    status: 'proposed' | 'approved' | 'implemented' | 'deprecated';
}

export interface DecisionSummary {
    id: string;
    title: string;
    date: Date;
    status: Decision['status'];
    impact: string[];
}

export class DailyStatusDecisionTracker {
    private readonly dailyStatusDir: string;

    constructor(dailyStatusDir: string = 'docs/daily-status') {
        this.dailyStatusDir = dailyStatusDir;
    }

    /**
     * Add a decision to today's daily status file
     */
    async addDecision(decision: Omit<Decision, 'id' | 'date'>): Promise<string> {
        const today = new Date();
        const decisionId = this.generateDecisionId(today, decision.title);

        const fullDecision: Decision = {
            ...decision,
            id: decisionId,
            date: today
        };

        await this.addDecisionToFile(today, fullDecision);
        return decisionId;
    }

    /**
     * Add a decision to a specific date's daily status file
     */
    async addDecisionToDate(date: Date, decision: Omit<Decision, 'id' | 'date'>): Promise<string> {
        const decisionId = this.generateDecisionId(date, decision.title);

        const fullDecision: Decision = {
            ...decision,
            id: decisionId,
            date
        };

        await this.addDecisionToFile(date, fullDecision);
        return decisionId;
    }

    /**
     * Update an existing decision in a daily status file
     */
    async updateDecision(decisionId: string, updates: Partial<Omit<Decision, 'id' | 'date'>>): Promise<void> {
        const { date, filePath } = this.parseDecisionId(decisionId);

        if (!(await this.fileExists(filePath))) {
            throw new Error(`Daily status file not found: ${filePath}`);
        }

        const content = await fs.readFile(filePath, 'utf8');
        const updatedContent = this.updateDecisionInContent(content, decisionId, updates);

        await fs.writeFile(filePath, updatedContent, 'utf8');
        console.log(`✅ Decision ${decisionId} updated in ${filePath}`);
    }

    /**
     * Get all decisions from a specific date
     */
    async getDecisionsFromDate(date: Date): Promise<Decision[]> {
        const dateStr = format(date, 'yyyy-MM-dd');
        const filePath = join(this.dailyStatusDir, `${dateStr}.md`);

        if (!(await this.fileExists(filePath))) {
            return [];
        }

        const content = await fs.readFile(filePath, 'utf8');
        return this.extractDecisionsFromContent(content, date);
    }

    /**
     * Get all decisions from the last N days
     */
    async getRecentDecisions(days: number = 30): Promise<Decision[]> {
        const decisions: Decision[] = [];
        const today = new Date();

        for (let i = 0; i < days; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);

            const dayDecisions = await this.getDecisionsFromDate(date);
            decisions.push(...dayDecisions);
        }

        return decisions.sort((a, b) => b.date.getTime() - a.date.getTime());
    }

    /**
     * Get decision summaries for reporting
     */
    async getDecisionSummaries(days: number = 30): Promise<DecisionSummary[]> {
        const decisions = await this.getRecentDecisions(days);

        return decisions.map(decision => ({
            id: decision.id,
            title: decision.title,
            date: decision.date,
            status: decision.status,
            impact: decision.impact
        }));
    }

    /**
     * Search decisions by keyword
     */
    async searchDecisions(keyword: string, days: number = 90): Promise<Decision[]> {
        const decisions = await this.getRecentDecisions(days);
        const lowerKeyword = keyword.toLowerCase();

        return decisions.filter(decision =>
            decision.title.toLowerCase().includes(lowerKeyword) ||
            decision.context.toLowerCase().includes(lowerKeyword) ||
            decision.decision.toLowerCase().includes(lowerKeyword) ||
            decision.rationale.toLowerCase().includes(lowerKeyword) ||
            decision.impact.some(impact => impact.toLowerCase().includes(lowerKeyword))
        );
    }

    /**
     * Generate weekly decision summary
     */
    async generateWeeklyDecisionSummary(weekStartDate: Date): Promise<string> {
        const decisions: Decision[] = [];

        // Get decisions from the week (7 days starting from weekStartDate)
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStartDate);
            date.setDate(date.getDate() + i);

            const dayDecisions = await this.getDecisionsFromDate(date);
            decisions.push(...dayDecisions);
        }

        if (decisions.length === 0) {
            return 'No decisions made this week.';
        }

        const weekEnd = new Date(weekStartDate);
        weekEnd.setDate(weekEnd.getDate() + 6);

        let summary = `# Weekly Decision Summary\n\n`;
        summary += `**Week of**: ${format(weekStartDate, 'MMMM d')} - ${format(weekEnd, 'MMMM d, yyyy')}\n\n`;
        summary += `**Total Decisions**: ${decisions.length}\n\n`;

        // Group by status
        const byStatus = decisions.reduce((acc, decision) => {
            acc[decision.status] = (acc[decision.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        summary += `## Decision Status Breakdown\n\n`;
        Object.entries(byStatus).forEach(([status, count]) => {
            summary += `- **${status}**: ${count}\n`;
        });

        summary += `\n## Key Decisions\n\n`;
        decisions.forEach((decision, index) => {
            summary += `### ${index + 1}. ${decision.title}\n\n`;
            summary += `- **Date**: ${format(decision.date, 'MMMM d, yyyy')}\n`;
            summary += `- **Status**: ${decision.status}\n`;
            summary += `- **Decision**: ${decision.decision}\n`;
            summary += `- **Impact**: ${decision.impact.join(', ')}\n`;
            if (decision.linearIssue) {
                summary += `- **Linear Issue**: ${decision.linearIssue}\n`;
            }
            summary += `\n`;
        });

        return summary;
    }

    private generateDecisionId(date: Date, title: string): string {
        const dateStr = format(date, 'yyyy-MM-dd');
        const titleSlug = title
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 30);

        return `DEC-${dateStr}-${titleSlug}`;
    }

    private parseDecisionId(decisionId: string): { date: Date; filePath: string } {
        const match = decisionId.match(/^DEC-(\d{4}-\d{2}-\d{2})-/);
        if (!match) {
            throw new Error(`Invalid decision ID format: ${decisionId}`);
        }

        const dateStr = match[1];
        const date = new Date(dateStr);
        const filePath = join(this.dailyStatusDir, `${dateStr}.md`);

        return { date, filePath };
    }

    private async addDecisionToFile(date: Date, decision: Decision): Promise<void> {
        const dateStr = format(date, 'yyyy-MM-dd');
        const filePath = join(this.dailyStatusDir, `${dateStr}.md`);

        if (!(await this.fileExists(filePath))) {
            throw new Error(`Daily status file not found: ${filePath}. Create it first using the daily status generator.`);
        }

        const content = await fs.readFile(filePath, 'utf8');
        const updatedContent = this.insertDecisionIntoContent(content, decision);

        await fs.writeFile(filePath, updatedContent, 'utf8');
        console.log(`✅ Decision added to ${filePath}: ${decision.title}`);
    }

    private insertDecisionIntoContent(content: string, decision: Decision): string {
        const decisionSection = this.formatDecisionForMarkdown(decision);

        // Find the "Decisions Made" section and insert after it
        const decisionsHeaderRegex = /## Decisions Made\s*\n/;
        const match = content.match(decisionsHeaderRegex);

        if (!match) {
            throw new Error('Could not find "Decisions Made" section in daily status file');
        }

        const insertIndex = match.index! + match[0].length;

        // Check if there are existing decisions
        const beforeInsert = content.substring(0, insertIndex);
        const afterInsert = content.substring(insertIndex);

        // Insert the new decision
        return beforeInsert + '\n' + decisionSection + '\n' + afterInsert;
    }

    private formatDecisionForMarkdown(decision: Decision): string {
        let markdown = `### Decision: ${decision.title}\n\n`;
        markdown += `- **ID**: ${decision.id}\n`;
        markdown += `- **Status**: ${decision.status}\n`;
        markdown += `- **Context**: ${decision.context}\n`;
        markdown += `- **Decision**: ${decision.decision}\n`;
        markdown += `- **Rationale**: ${decision.rationale}\n`;
        markdown += `- **Alternatives Considered**: ${decision.alternatives.join(', ')}\n`;
        markdown += `- **Impact**: ${decision.impact.join(', ')}\n`;

        if (decision.linearIssue) {
            markdown += `- **Linear Issue**: ${decision.linearIssue}\n`;
        }

        if (decision.author) {
            markdown += `- **Author**: ${decision.author}\n`;
        }

        return markdown;
    }

    private updateDecisionInContent(content: string, decisionId: string, updates: Partial<Omit<Decision, 'id' | 'date'>>): string {
        // Find the decision section by ID
        const decisionRegex = new RegExp(`### Decision: .*?\\n\\n- \\*\\*ID\\*\\*: ${decisionId}\\n(.*?)(?=\\n### |\\n## |$)`, 's');
        const match = content.match(decisionRegex);

        if (!match) {
            throw new Error(`Decision ${decisionId} not found in content`);
        }

        // Extract current decision data and apply updates
        const currentDecisionText = match[0];
        let updatedDecisionText = currentDecisionText;

        // Update specific fields
        if (updates.status) {
            updatedDecisionText = updatedDecisionText.replace(
                /- \*\*Status\*\*: .*/,
                `- **Status**: ${updates.status}`
            );
        }

        if (updates.context) {
            updatedDecisionText = updatedDecisionText.replace(
                /- \*\*Context\*\*: .*/,
                `- **Context**: ${updates.context}`
            );
        }

        if (updates.decision) {
            updatedDecisionText = updatedDecisionText.replace(
                /- \*\*Decision\*\*: .*/,
                `- **Decision**: ${updates.decision}`
            );
        }

        if (updates.rationale) {
            updatedDecisionText = updatedDecisionText.replace(
                /- \*\*Rationale\*\*: .*/,
                `- **Rationale**: ${updates.rationale}`
            );
        }

        if (updates.alternatives) {
            updatedDecisionText = updatedDecisionText.replace(
                /- \*\*Alternatives Considered\*\*: .*/,
                `- **Alternatives Considered**: ${updates.alternatives.join(', ')}`
            );
        }

        if (updates.impact) {
            updatedDecisionText = updatedDecisionText.replace(
                /- \*\*Impact\*\*: .*/,
                `- **Impact**: ${updates.impact.join(', ')}`
            );
        }

        return content.replace(currentDecisionText, updatedDecisionText);
    }

    private extractDecisionsFromContent(content: string, date: Date): Decision[] {
        const decisions: Decision[] = [];

        // Find all decision sections
        const decisionRegex = /### Decision: (.*?)\n\n- \*\*ID\*\*: (.*?)\n- \*\*Status\*\*: (.*?)\n- \*\*Context\*\*: (.*?)\n- \*\*Decision\*\*: (.*?)\n- \*\*Rationale\*\*: (.*?)\n- \*\*Alternatives Considered\*\*: (.*?)\n- \*\*Impact\*\*: (.*?)\n(?:- \*\*Linear Issue\*\*: (.*?)\n)?(?:- \*\*Author\*\*: (.*?)\n)?/g;

        let match;
        while ((match = decisionRegex.exec(content)) !== null) {
            const [, title, id, status, context, decision, rationale, alternatives, impact, linearIssue, author] = match;

            decisions.push({
                id: id.trim(),
                title: title.trim(),
                context: context.trim(),
                decision: decision.trim(),
                rationale: rationale.trim(),
                alternatives: alternatives.split(',').map(alt => alt.trim()).filter(Boolean),
                impact: impact.split(',').map(imp => imp.trim()).filter(Boolean),
                linearIssue: linearIssue?.trim(),
                author: author?.trim(),
                date,
                status: status.trim() as Decision['status']
            });
        }

        return decisions;
    }

    private async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }
}
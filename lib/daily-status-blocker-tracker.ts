/**
 * Daily Status Blocker Tracker
 * 
 * Manages blocker tracking and status management within daily status entries
 */

import { differenceInDays, format } from 'date-fns';
import { promises as fs } from 'fs';
import { join } from 'path';

export interface Blocker {
    id: string;
    title: string;
    description: string;
    status: 'new' | 'in-progress' | 'resolved';
    priority: 'high' | 'medium' | 'low';
    impact: string;
    assignee?: string;
    nextSteps: string[];
    createdDate: Date;
    targetResolution?: Date;
    resolvedDate?: Date;
    linearIssue?: string;
    tags?: string[];
}

export interface BlockerSummary {
    id: string;
    title: string;
    status: Blocker['status'];
    priority: Blocker['priority'];
    daysOpen: number;
    assignee?: string;
}

export interface BlockerMetrics {
    total: number;
    byStatus: Record<Blocker['status'], number>;
    byPriority: Record<Blocker['priority'], number>;
    averageResolutionTime: number;
    overdueBlockers: number;
}

export class DailyStatusBlockerTracker {
    private readonly dailyStatusDir: string;

    constructor(dailyStatusDir: string = 'docs/daily-status') {
        this.dailyStatusDir = dailyStatusDir;
    }

    /**
     * Add a new blocker to today's daily status file
     */
    async addBlocker(blocker: Omit<Blocker, 'id' | 'createdDate' | 'status'>): Promise<string> {
        const today = new Date();
        const blockerId = this.generateBlockerId(today);

        const fullBlocker: Blocker = {
            ...blocker,
            id: blockerId,
            createdDate: today,
            status: 'new'
        };

        await this.addBlockerToFile(today, fullBlocker);
        return blockerId;
    }

    /**
     * Add a blocker to a specific date's daily status file
     */
    async addBlockerToDate(date: Date, blocker: Omit<Blocker, 'id' | 'createdDate' | 'status'>): Promise<string> {
        const blockerId = this.generateBlockerId(date);

        const fullBlocker: Blocker = {
            ...blocker,
            id: blockerId,
            createdDate: date,
            status: 'new'
        };

        await this.addBlockerToFile(date, fullBlocker);
        return blockerId;
    }

    /**
     * Update an existing blocker's status or details
     */
    async updateBlocker(blockerId: string, updates: Partial<Omit<Blocker, 'id' | 'createdDate'>>): Promise<void> {
        const { date, filePath } = this.parseBlockerId(blockerId);

        if (!(await this.fileExists(filePath))) {
            throw new Error(`Daily status file not found: ${filePath}`);
        }

        const content = await fs.readFile(filePath, 'utf8');

        // If resolving the blocker, set resolved date
        if (updates.status === 'resolved' && !updates.resolvedDate) {
            updates.resolvedDate = new Date();
        }

        const updatedContent = this.updateBlockerInContent(content, blockerId, updates);

        await fs.writeFile(filePath, updatedContent, 'utf8');
        console.log(`✅ Blocker ${blockerId} updated in ${filePath}`);
    }

    /**
     * Resolve a blocker with resolution details
     */
    async resolveBlocker(blockerId: string, resolutionNotes?: string): Promise<void> {
        const updates: Partial<Blocker> = {
            status: 'resolved',
            resolvedDate: new Date()
        };

        if (resolutionNotes) {
            updates.nextSteps = [`✅ RESOLVED: ${resolutionNotes}`];
        }

        await this.updateBlocker(blockerId, updates);

        // Move blocker to resolved section in the same file
        await this.moveBlockerToResolvedSection(blockerId);
    }

    /**
     * Get all active blockers (new or in-progress) from recent days
     */
    async getActiveBlockers(days: number = 30): Promise<Blocker[]> {
        const allBlockers = await this.getAllBlockers(days);
        return allBlockers.filter(blocker => blocker.status !== 'resolved');
    }

    /**
     * Get all blockers from the last N days
     */
    async getAllBlockers(days: number = 30): Promise<Blocker[]> {
        const blockers: Blocker[] = [];
        const today = new Date();

        for (let i = 0; i < days; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);

            const dayBlockers = await this.getBlockersFromDate(date);
            blockers.push(...dayBlockers);
        }

        return blockers.sort((a, b) => {
            // Sort by priority (high first), then by creation date (newest first)
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];

            if (priorityDiff !== 0) return priorityDiff;
            return b.createdDate.getTime() - a.createdDate.getTime();
        });
    }

    /**
     * Get blockers from a specific date
     */
    async getBlockersFromDate(date: Date): Promise<Blocker[]> {
        const dateStr = format(date, 'yyyy-MM-dd');
        const filePath = join(this.dailyStatusDir, `${dateStr}.md`);

        if (!(await this.fileExists(filePath))) {
            return [];
        }

        const content = await fs.readFile(filePath, 'utf8');
        return this.extractBlockersFromContent(content);
    }

    /**
     * Get blocker metrics and statistics
     */
    async getBlockerMetrics(days: number = 30): Promise<BlockerMetrics> {
        const blockers = await this.getAllBlockers(days);

        const byStatus = blockers.reduce((acc, blocker) => {
            acc[blocker.status] = (acc[blocker.status] || 0) + 1;
            return acc;
        }, {} as Record<Blocker['status'], number>);

        const byPriority = blockers.reduce((acc, blocker) => {
            acc[blocker.priority] = (acc[blocker.priority] || 0) + 1;
            return acc;
        }, {} as Record<Blocker['priority'], number>);

        // Calculate average resolution time for resolved blockers
        const resolvedBlockers = blockers.filter(b => b.status === 'resolved' && b.resolvedDate);
        const totalResolutionDays = resolvedBlockers.reduce((sum, blocker) => {
            return sum + differenceInDays(blocker.resolvedDate!, blocker.createdDate);
        }, 0);
        const averageResolutionTime = resolvedBlockers.length > 0 ? totalResolutionDays / resolvedBlockers.length : 0;

        // Count overdue blockers (past target resolution date)
        const today = new Date();
        const overdueBlockers = blockers.filter(blocker =>
            blocker.status !== 'resolved' &&
            blocker.targetResolution &&
            blocker.targetResolution < today
        ).length;

        return {
            total: blockers.length,
            byStatus: {
                new: byStatus.new || 0,
                'in-progress': byStatus['in-progress'] || 0,
                resolved: byStatus.resolved || 0
            },
            byPriority: {
                high: byPriority.high || 0,
                medium: byPriority.medium || 0,
                low: byPriority.low || 0
            },
            averageResolutionTime,
            overdueBlockers
        };
    }

    /**
     * Get blocker summaries for reporting
     */
    async getBlockerSummaries(days: number = 30): Promise<BlockerSummary[]> {
        const blockers = await this.getAllBlockers(days);
        const today = new Date();

        return blockers.map(blocker => ({
            id: blocker.id,
            title: blocker.title,
            status: blocker.status,
            priority: blocker.priority,
            daysOpen: differenceInDays(today, blocker.createdDate),
            assignee: blocker.assignee
        }));
    }

    /**
     * Search blockers by keyword
     */
    async searchBlockers(keyword: string, days: number = 90): Promise<Blocker[]> {
        const blockers = await this.getAllBlockers(days);
        const lowerKeyword = keyword.toLowerCase();

        return blockers.filter(blocker =>
            blocker.title.toLowerCase().includes(lowerKeyword) ||
            blocker.description.toLowerCase().includes(lowerKeyword) ||
            blocker.impact.toLowerCase().includes(lowerKeyword) ||
            blocker.nextSteps.some(step => step.toLowerCase().includes(lowerKeyword)) ||
            blocker.tags?.some(tag => tag.toLowerCase().includes(lowerKeyword))
        );
    }

    /**
     * Generate weekly blocker report
     */
    async generateWeeklyBlockerReport(weekStartDate: Date): Promise<string> {
        const weekEnd = new Date(weekStartDate);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const weekBlockers: Blocker[] = [];

        // Get blockers from the week
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStartDate);
            date.setDate(date.getDate() + i);

            const dayBlockers = await this.getBlockersFromDate(date);
            weekBlockers.push(...dayBlockers);
        }

        const metrics = await this.getBlockerMetrics(7);

        let report = `# Weekly Blocker Report\n\n`;
        report += `**Week of**: ${format(weekStartDate, 'MMMM d')} - ${format(weekEnd, 'MMMM d, yyyy')}\n\n`;

        report += `## Summary\n\n`;
        report += `- **Total Blockers**: ${metrics.total}\n`;
        report += `- **New**: ${metrics.byStatus.new}\n`;
        report += `- **In Progress**: ${metrics.byStatus['in-progress']}\n`;
        report += `- **Resolved**: ${metrics.byStatus.resolved}\n`;
        report += `- **Overdue**: ${metrics.overdueBlockers}\n`;
        report += `- **Average Resolution Time**: ${metrics.averageResolutionTime.toFixed(1)} days\n\n`;

        // Active blockers by priority
        const activeBlockers = weekBlockers.filter(b => b.status !== 'resolved');
        if (activeBlockers.length > 0) {
            report += `## Active Blockers\n\n`;

            ['high', 'medium', 'low'].forEach(priority => {
                const priorityBlockers = activeBlockers.filter(b => b.priority === priority);
                if (priorityBlockers.length > 0) {
                    report += `### ${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority\n\n`;
                    priorityBlockers.forEach(blocker => {
                        const daysOpen = differenceInDays(new Date(), blocker.createdDate);
                        report += `#### ${blocker.title} (${blocker.id})\n\n`;
                        report += `- **Status**: ${blocker.status}\n`;
                        report += `- **Days Open**: ${daysOpen}\n`;
                        report += `- **Impact**: ${blocker.impact}\n`;
                        if (blocker.assignee) {
                            report += `- **Assignee**: ${blocker.assignee}\n`;
                        }
                        if (blocker.targetResolution) {
                            report += `- **Target Resolution**: ${format(blocker.targetResolution, 'MMMM d, yyyy')}\n`;
                        }
                        report += `- **Next Steps**: ${blocker.nextSteps.join(', ')}\n\n`;
                    });
                }
            });
        }

        // Resolved blockers
        const resolvedBlockers = weekBlockers.filter(b => b.status === 'resolved');
        if (resolvedBlockers.length > 0) {
            report += `## Resolved This Week\n\n`;
            resolvedBlockers.forEach(blocker => {
                const resolutionTime = blocker.resolvedDate ?
                    differenceInDays(blocker.resolvedDate, blocker.createdDate) : 0;
                report += `- **${blocker.title}** (${blocker.id}) - Resolved in ${resolutionTime} days\n`;
            });
            report += `\n`;
        }

        return report;
    }

    private generateBlockerId(date: Date): string {
        const dateStr = format(date, 'yyyy-MM-dd');
        const timestamp = Date.now().toString().slice(-4); // Last 4 digits for uniqueness
        return `BLOCK-${dateStr}-${timestamp}`;
    }

    private parseBlockerId(blockerId: string): { date: Date; filePath: string } {
        const match = blockerId.match(/^BLOCK-(\d{4}-\d{2}-\d{2})-/);
        if (!match) {
            throw new Error(`Invalid blocker ID format: ${blockerId}`);
        }

        const dateStr = match[1];
        const date = new Date(dateStr);
        const filePath = join(this.dailyStatusDir, `${dateStr}.md`);

        return { date, filePath };
    }

    private async addBlockerToFile(date: Date, blocker: Blocker): Promise<void> {
        const dateStr = format(date, 'yyyy-MM-dd');
        const filePath = join(this.dailyStatusDir, `${dateStr}.md`);

        if (!(await this.fileExists(filePath))) {
            throw new Error(`Daily status file not found: ${filePath}. Create it first using the daily status generator.`);
        }

        const content = await fs.readFile(filePath, 'utf8');
        const updatedContent = this.insertBlockerIntoContent(content, blocker);

        await fs.writeFile(filePath, updatedContent, 'utf8');
        console.log(`✅ Blocker added to ${filePath}: ${blocker.title}`);
    }

    private insertBlockerIntoContent(content: string, blocker: Blocker): string {
        const blockerSection = this.formatBlockerForMarkdown(blocker);

        // Find the "Active Blockers" section and insert after it
        const blockersHeaderRegex = /### Active Blockers\s*\n/;
        const match = content.match(blockersHeaderRegex);

        if (!match) {
            throw new Error('Could not find "Active Blockers" section in daily status file');
        }

        const insertIndex = match.index! + match[0].length;

        const beforeInsert = content.substring(0, insertIndex);
        const afterInsert = content.substring(insertIndex);

        return beforeInsert + '\n' + blockerSection + '\n' + afterInsert;
    }

    private formatBlockerForMarkdown(blocker: Blocker): string {
        let markdown = `#### ${blocker.title}\n\n`;
        markdown += `- **ID**: ${blocker.id}\n`;
        markdown += `- **Status**: ${blocker.status}\n`;
        markdown += `- **Priority**: ${blocker.priority}\n`;
        markdown += `- **Description**: ${blocker.description}\n`;
        markdown += `- **Impact**: ${blocker.impact}\n`;

        if (blocker.assignee) {
            markdown += `- **Assignee**: ${blocker.assignee}\n`;
        }

        markdown += `- **Next Steps**: ${blocker.nextSteps.join(', ')}\n`;
        markdown += `- **Created**: ${format(blocker.createdDate, 'MMMM d, yyyy')}\n`;

        if (blocker.targetResolution) {
            markdown += `- **Target Resolution**: ${format(blocker.targetResolution, 'MMMM d, yyyy')}\n`;
        }

        if (blocker.resolvedDate) {
            markdown += `- **Resolved**: ${format(blocker.resolvedDate, 'MMMM d, yyyy')}\n`;
        }

        if (blocker.linearIssue) {
            markdown += `- **Linear Issue**: ${blocker.linearIssue}\n`;
        }

        if (blocker.tags && blocker.tags.length > 0) {
            markdown += `- **Tags**: ${blocker.tags.join(', ')}\n`;
        }

        return markdown;
    }

    private updateBlockerInContent(content: string, blockerId: string, updates: Partial<Omit<Blocker, 'id' | 'createdDate'>>): string {
        // Find the blocker section by ID
        const blockerRegex = new RegExp(`#### .*?\\n\\n- \\*\\*ID\\*\\*: ${blockerId}\\n(.*?)(?=\\n#### |\\n### |\\n## |$)`, 's');
        const match = content.match(blockerRegex);

        if (!match) {
            throw new Error(`Blocker ${blockerId} not found in content`);
        }

        const currentBlockerText = match[0];
        let updatedBlockerText = currentBlockerText;

        // Update specific fields
        Object.entries(updates).forEach(([key, value]) => {
            if (value === undefined) return;

            const fieldName = key.charAt(0).toUpperCase() + key.slice(1);
            const fieldRegex = new RegExp(`- \\*\\*${fieldName}\\*\\*: .*`);

            let newValue: string;
            if (Array.isArray(value)) {
                newValue = value.join(', ');
            } else if (value instanceof Date) {
                newValue = format(value, 'MMMM d, yyyy');
            } else {
                newValue = String(value);
            }

            if (updatedBlockerText.match(fieldRegex)) {
                updatedBlockerText = updatedBlockerText.replace(fieldRegex, `- **${fieldName}**: ${newValue}`);
            } else {
                // Add new field before the last line
                const lines = updatedBlockerText.split('\n');
                lines.splice(-1, 0, `- **${fieldName}**: ${newValue}`);
                updatedBlockerText = lines.join('\n');
            }
        });

        return content.replace(currentBlockerText, updatedBlockerText);
    }

    private async moveBlockerToResolvedSection(blockerId: string): Promise<void> {
        const { filePath } = this.parseBlockerId(blockerId);
        const content = await fs.readFile(filePath, 'utf8');

        // Find and extract the blocker
        const blockerRegex = new RegExp(`#### .*?\\n\\n- \\*\\*ID\\*\\*: ${blockerId}\\n(.*?)(?=\\n#### |\\n### |\\n## |$)`, 's');
        const match = content.match(blockerRegex);

        if (!match) return; // Blocker not found

        const blockerText = match[0];

        // Remove from active blockers section
        const withoutBlocker = content.replace(blockerText + '\n', '');

        // Add to resolved issues section
        const resolvedSectionRegex = /### Resolved Issues\s*\n/;
        const resolvedMatch = withoutBlocker.match(resolvedSectionRegex);

        if (resolvedMatch) {
            const insertIndex = resolvedMatch.index! + resolvedMatch[0].length;
            const beforeInsert = withoutBlocker.substring(0, insertIndex);
            const afterInsert = withoutBlocker.substring(insertIndex);

            // Convert to resolved format (simpler)
            const title = blockerText.match(/#### (.*?)\n/)?.[1] || 'Unknown';
            const resolvedEntry = `- ✅ ${title} (${blockerId}) - Resolved\n`;

            const updatedContent = beforeInsert + '\n' + resolvedEntry + afterInsert;
            await fs.writeFile(filePath, updatedContent, 'utf8');
        }
    }

    private extractBlockersFromContent(content: string): Blocker[] {
        const blockers: Blocker[] = [];

        // Find all blocker sections
        const blockerRegex = /#### (.*?)\n\n- \*\*ID\*\*: (.*?)\n- \*\*Status\*\*: (.*?)\n- \*\*Priority\*\*: (.*?)\n- \*\*Description\*\*: (.*?)\n- \*\*Impact\*\*: (.*?)\n(?:- \*\*Assignee\*\*: (.*?)\n)?- \*\*Next Steps\*\*: (.*?)\n- \*\*Created\*\*: (.*?)\n(?:- \*\*Target Resolution\*\*: (.*?)\n)?(?:- \*\*Resolved\*\*: (.*?)\n)?(?:- \*\*Linear Issue\*\*: (.*?)\n)?(?:- \*\*Tags\*\*: (.*?)\n)?/g;

        let match;
        while ((match = blockerRegex.exec(content)) !== null) {
            const [, title, id, status, priority, description, impact, assignee, nextSteps, created, targetResolution, resolved, linearIssue, tags] = match;

            blockers.push({
                id: id.trim(),
                title: title.trim(),
                description: description.trim(),
                status: status.trim() as Blocker['status'],
                priority: priority.trim() as Blocker['priority'],
                impact: impact.trim(),
                assignee: assignee?.trim(),
                nextSteps: nextSteps.split(',').map(step => step.trim()).filter(Boolean),
                createdDate: new Date(created.trim()),
                targetResolution: targetResolution ? new Date(targetResolution.trim()) : undefined,
                resolvedDate: resolved ? new Date(resolved.trim()) : undefined,
                linearIssue: linearIssue?.trim(),
                tags: tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : undefined
            });
        }

        return blockers;
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
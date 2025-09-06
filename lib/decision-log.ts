/**
 * Decision Log System
 *
 * Utilities for capturing, managing, and retrieving architectural decisions
 * with proper formatting and validation.
 */

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

export interface ArchitecturalDecision {
  id: string;
  title: string;
  date: Date;
  status: 'proposed' | 'accepted' | 'deprecated' | 'superseded';
  context: string;
  decision: string;
  rationale: string;
  alternatives: Array<{
    name: string;
    description: string;
    rejectionReason: string;
  }>;
  impact: string;
  relatedIssues: string[];
  supersededBy?: string;
  supersedes?: string;
}

export class DecisionLog {
  private readonly logPath: string;

  constructor(rootPath: string = process.cwd()) {
    this.logPath = join(
      rootPath,
      'docs',
      'project-management',
      'decision-log.md'
    );
  }

  /**
   * Add a new architectural decision to the log
   */
  async addDecision(
    decision: Omit<ArchitecturalDecision, 'id'>
  ): Promise<string> {
    const existingContent = await this.readLogContent();
    const nextId = this.generateNextId(existingContent);

    const fullDecision: ArchitecturalDecision = {
      ...decision,
      id: nextId,
    };

    const decisionMarkdown = this.formatDecisionAsMarkdown(fullDecision);
    const updatedContent = this.insertDecisionIntoLog(
      existingContent,
      decisionMarkdown
    );

    await writeFile(this.logPath, updatedContent);
    return nextId;
  }

  /**
   * Update an existing decision's status
   */
  async updateDecisionStatus(
    id: string,
    status: ArchitecturalDecision['status'],
    supersededBy?: string
  ): Promise<void> {
    const content = await this.readLogContent();
    const updatedContent = content.replace(
      new RegExp(`(## ${id}:.*?\\n\\*\\*Status\\*\\*: )\\w+`, 's'),
      `$1${status}`
    );

    if (supersededBy && status === 'superseded') {
      const withSupersededBy = updatedContent.replace(
        new RegExp(`(## ${id}:.*?\\n\\*\\*Status\\*\\*: superseded)`, 's'),
        `$1 by ${supersededBy}`
      );
      await writeFile(this.logPath, withSupersededBy);
    } else {
      await writeFile(this.logPath, updatedContent);
    }
  }

  /**
   * Get recent decisions within specified days
   */
  async getRecentDecisions(
    days: number = 30
  ): Promise<ArchitecturalDecision[]> {
    const content = await this.readLogContent();
    const decisions = this.parseDecisionsFromContent(content);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return decisions.filter(decision => decision.date >= cutoffDate);
  }

  /**
   * Get all decisions with optional status filter
   */
  async getAllDecisions(
    status?: ArchitecturalDecision['status']
  ): Promise<ArchitecturalDecision[]> {
    const content = await this.readLogContent();
    const decisions = this.parseDecisionsFromContent(content);

    if (status) {
      return decisions.filter(decision => decision.status === status);
    }

    return decisions;
  }

  /**
   * Get a specific decision by ID
   */
  async getDecision(id: string): Promise<ArchitecturalDecision | null> {
    const decisions = await this.getAllDecisions();
    return decisions.find(decision => decision.id === id) || null;
  }

  /**
   * Generate a summary of decisions for AI context
   */
  async generateDecisionSummary(days: number = 30): Promise<string> {
    const recentDecisions = await this.getRecentDecisions(days);

    if (recentDecisions.length === 0) {
      return `No architectural decisions made in the last ${days} days.`;
    }

    const summary = `# Recent Architectural Decisions (Last ${days} days)

${recentDecisions
  .map(
    decision => `
## ${decision.id}: ${decision.title}
- **Date**: ${decision.date.toDateString()}
- **Status**: ${decision.status}
- **Impact**: ${decision.impact.split('\n')[0]}
`
  )
  .join('\n')}

## Key Patterns and Themes

${this.analyzeDecisionPatterns(recentDecisions)}
`;

    return summary;
  }

  /**
   * Create a new decision template
   */
  createDecisionTemplate(title: string): Partial<ArchitecturalDecision> {
    return {
      title,
      date: new Date(),
      status: 'proposed',
      context: '[Describe the situation that led to this decision]',
      decision: '[What was decided]',
      rationale: '[Why this decision was made - key factors and benefits]',
      alternatives: [
        {
          name: '[Alternative 1]',
          description: '[Description]',
          rejectionReason: '[Reason for rejection]',
        },
      ],
      impact: '[How this affects the system, development process, and team]',
      relatedIssues: [],
    };
  }

  /**
   * Read the current log content
   */
  private async readLogContent(): Promise<string> {
    try {
      return await readFile(this.logPath, 'utf-8');
    } catch (_error) {
      // If file doesn't exist, return empty template
      return this.getEmptyLogTemplate();
    }
  }

  /**
   * Generate the next ADR ID
   */
  private generateNextId(content: string): string {
    const existingIds = content.match(/## ADR-(\d+):/g) || [];
    const numbers = existingIds.map(id => {
      const match = id.match(/\d+/);
      return match ? parseInt(match[0]) : 0;
    });
    const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    return `ADR-${nextNumber.toString().padStart(3, '0')}`;
  }

  /**
   * Format decision as markdown
   */
  private formatDecisionAsMarkdown(decision: ArchitecturalDecision): string {
    const alternatives = decision.alternatives
      .map(
        (alt, index) =>
          `${index + 1}. **${alt.name}**: ${alt.description}\n   - ${alt.rejectionReason}`
      )
      .join('\n');

    const relatedIssues =
      decision.relatedIssues.length > 0
        ? decision.relatedIssues.join(', ')
        : '[No related issues]';

    return `## ${decision.id}: ${decision.title}

**Date**: ${decision.date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}  
**Status**: ${decision.status}  
**Context**: ${decision.context}

**Decision**: ${decision.decision}

**Rationale**: 
${decision.rationale}

**Alternatives Considered**:
${alternatives}

**Impact**:
${decision.impact}

**Related Issues**: ${relatedIssues}

---`;
  }

  /**
   * Insert decision into log content
   */
  private insertDecisionIntoLog(
    content: string,
    decisionMarkdown: string
  ): string {
    // Find the insertion point (after the last decision, before the template)
    const templateIndex = content.indexOf('## Decision Template');

    if (templateIndex !== -1) {
      return (
        content.slice(0, templateIndex) +
        decisionMarkdown +
        '\n\n' +
        content.slice(templateIndex)
      );
    } else {
      // If no template found, append at the end
      return content + '\n\n' + decisionMarkdown;
    }
  }

  /**
   * Parse decisions from markdown content
   */
  private parseDecisionsFromContent(content: string): ArchitecturalDecision[] {
    const decisions: ArchitecturalDecision[] = [];
    const decisionRegex =
      /## (ADR-\d+): (.+?)\n\n\*\*Date\*\*: (.+?)\s*\n\*\*Status\*\*: (.+?)\s*\n\*\*Context\*\*: (.+?)\n\n\*\*Decision\*\*: (.+?)\n\n\*\*Rationale\*\*:\s*\n(.+?)\n\n\*\*Alternatives Considered\*\*:\s*\n(.+?)\n\n\*\*Impact\*\*:\s*\n(.+?)\n\n\*\*Related Issues\*\*: (.+?)(?=\n\n---|$)/gs;

    let match;
    while ((match = decisionRegex.exec(content)) !== null) {
      const [
        ,
        id,
        title,
        dateStr,
        status,
        context,
        decision,
        rationale,
        alternativesStr,
        impact,
        relatedIssuesStr,
      ] = match;

      // Parse alternatives
      const alternatives = this.parseAlternatives(alternativesStr);

      // Parse related issues
      const relatedIssues =
        relatedIssuesStr.trim() === '[No related issues]'
          ? []
          : relatedIssuesStr.split(',').map(issue => issue.trim());

      decisions.push({
        id,
        title,
        date: new Date(dateStr),
        status: status as ArchitecturalDecision['status'],
        context: context.trim(),
        decision: decision.trim(),
        rationale: rationale.trim(),
        alternatives,
        impact: impact.trim(),
        relatedIssues,
      });
    }

    return decisions.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  /**
   * Parse alternatives from markdown text
   */
  private parseAlternatives(
    alternativesStr: string
  ): ArchitecturalDecision['alternatives'] {
    const alternatives: ArchitecturalDecision['alternatives'] = [];
    const altRegex =
      /\d+\.\s*\*\*(.+?)\*\*:\s*(.+?)\n\s*-\s*(.+?)(?=\n\d+\.|$)/gs;

    let match;
    while ((match = altRegex.exec(alternativesStr)) !== null) {
      const [, name, description, rejectionReason] = match;
      alternatives.push({
        name: name.trim(),
        description: description.trim(),
        rejectionReason: rejectionReason.trim(),
      });
    }

    return alternatives;
  }

  /**
   * Analyze patterns in recent decisions
   */
  private analyzeDecisionPatterns(decisions: ArchitecturalDecision[]): string {
    const statusCounts = decisions.reduce(
      (acc, decision) => {
        acc[decision.status] = (acc[decision.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const themes = this.extractThemes(decisions);

    return `
### Decision Status Distribution
${Object.entries(statusCounts)
  .map(
    ([status, count]) =>
      `- ${status}: ${count} decision${count !== 1 ? 's' : ''}`
  )
  .join('\n')}

### Common Themes
${themes.map(theme => `- ${theme}`).join('\n')}
`;
  }

  /**
   * Extract common themes from decisions
   */
  private extractThemes(decisions: ArchitecturalDecision[]): string[] {
    const themes: string[] = [];

    // Analyze titles and contexts for common patterns
    const keywords = decisions.flatMap(decision => [
      ...decision.title.toLowerCase().split(' '),
      ...decision.context.toLowerCase().split(' '),
    ]);

    const keywordCounts = keywords.reduce(
      (acc, keyword) => {
        if (keyword.length > 3) {
          // Filter out short words
          acc[keyword] = (acc[keyword] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>
    );

    // Find most common themes
    const sortedKeywords = Object.entries(keywordCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    for (const [keyword, count] of sortedKeywords) {
      if (count > 1) {
        themes.push(`${keyword} (mentioned ${count} times)`);
      }
    }

    return themes.length > 0 ? themes : ['No clear patterns identified'];
  }

  /**
   * Get empty log template
   */
  private getEmptyLogTemplate(): string {
    return `# Architectural Decision Log

This document records significant architectural and technical decisions made during Lumina's development. Each decision includes the context, rationale, alternatives considered, and impact.

## Decision Format

Each decision follows this structure:
- **Decision ID**: Unique identifier
- **Date**: When the decision was made
- **Status**: Proposed, Accepted, Deprecated, Superseded
- **Context**: The situation that led to this decision
- **Decision**: What was decided
- **Rationale**: Why this decision was made
- **Alternatives**: Other options that were considered
- **Impact**: How this affects the system and development
- **Related Issues**: Linear issues or other references

---

## Decision Template

Use this template for new architectural decisions:

\`\`\`markdown
## ADR-XXX: [Decision Title]

**Date**: [YYYY-MM-DD]  
**Status**: [Proposed/Accepted/Deprecated/Superseded]  
**Context**: [Describe the situation that led to this decision]

**Decision**: [What was decided]

**Rationale**: 
[Why this decision was made - key factors and benefits]

**Alternatives Considered**:
1. **[Alternative 1]**: [Description]
   - [Reason for rejection]
2. **[Alternative 2]**: [Description]
   - [Reason for rejection]

**Impact**:
[How this affects the system, development process, and team]

**Related Issues**: [Linear issues, PRs, or other references]
\`\`\`

---

## Maintenance Guidelines

### Adding New Decisions
1. Use the next sequential ADR number
2. Include all required sections
3. Link to relevant Linear issues
4. Update this document immediately when decisions are made

### Updating Existing Decisions
- Change status to "Deprecated" or "Superseded" when decisions are replaced
- Add reference to new decision that replaces it
- Maintain historical record - do not delete deprecated decisions

### Review Schedule
- Monthly review of recent decisions for accuracy
- Quarterly review of all decisions for relevance
- Annual review for consolidation and archival

**Last Updated**: ${new Date().toLocaleDateString()}  
**Next Review**: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}`;
  }
}

// Export singleton instance
export const decisionLog = new DecisionLog();

/**
 * Linear Integration Types
 *
 * Type definitions for Linear API integration with documentation systems
 */

export interface LinearIssue {
  id: string;
  identifier: string; // e.g., "LUM-123"
  title: string;
  description?: string;
  state: {
    id: string;
    name: string;
    type: 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled';
  };
  assignee?: {
    id: string;
    name: string;
    email: string;
  };
  team: {
    id: string;
    name: string;
    key: string;
  };
  project?: {
    id: string;
    name: string;
  };
  priority: number; // 0 = No priority, 1 = Urgent, 2 = High, 3 = Normal, 4 = Low
  labels: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
  url: string;
}

export interface CreateLinearIssueInput {
  title: string;
  description?: string;
  teamId: string;
  projectId?: string;
  assigneeId?: string;
  priority?: number;
  labelIds?: string[];
  stateId?: string;
}

export interface UpdateLinearIssueInput {
  title?: string;
  description?: string;
  assigneeId?: string;
  priority?: number;
  labelIds?: string[];
  stateId?: string;
}

export interface LinearComment {
  id: string;
  body: string;
  user: {
    id: string;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface LinearWebhookPayload {
  action: 'create' | 'update' | 'remove';
  type: 'Issue' | 'Comment' | 'Project';
  data: LinearIssue | LinearComment;
  updatedFrom?: Partial<LinearIssue>;
  createdAt: Date;
}

export interface LinearIntegration {
  // Issue Management
  createIssue(input: CreateLinearIssueInput): Promise<LinearIssue>;
  updateIssue(
    issueId: string,
    input: UpdateLinearIssueInput
  ): Promise<LinearIssue>;
  getIssue(issueId: string): Promise<LinearIssue | null>;
  searchIssues(query: string, teamId?: string): Promise<LinearIssue[]>;

  // Comments
  addComment(issueId: string, body: string): Promise<LinearComment>;
  getComments(issueId: string): Promise<LinearComment[]>;

  // Teams and Projects
  getTeams(): Promise<Array<{ id: string; name: string; key: string }>>;
  getProjects(
    teamId?: string
  ): Promise<Array<{ id: string; name: string; teamId: string }>>;
  getLabels(
    teamId?: string
  ): Promise<Array<{ id: string; name: string; color: string }>>;

  // Webhook Management
  verifyWebhookSignature(payload: string, signature: string): boolean;
  handleWebhook(payload: LinearWebhookPayload): Promise<void>;
}

export interface LinearConfig {
  apiKey: string;
  webhookSecret?: string;
  defaultTeamId?: string;
  defaultProjectId?: string;
  rateLimitPerMinute?: number;
}

// Documentation-specific Linear integration
export interface DocumentationLinearIntegration extends LinearIntegration {
  // Blocker Integration
  createBlockerIssue(blocker: {
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    impact: string;
    nextSteps: string[];
  }): Promise<LinearIssue>;

  // Decision Integration
  addDecisionComment(
    issueId: string,
    decision: {
      title: string;
      context: string;
      decision: string;
      rationale: string;
      alternatives: string[];
      impact: string[];
    }
  ): Promise<LinearComment>;

  // Documentation Maintenance
  createMaintenanceIssue(
    type: 'broken-link' | 'stale-content' | 'migration',
    details: {
      title: string;
      description: string;
      filePath?: string;
      url?: string;
      priority?: 'high' | 'medium' | 'low';
    }
  ): Promise<LinearIssue>;

  // Status Synchronization
  syncDocumentationStatus(
    issueId: string,
    status: 'completed' | 'in-progress' | 'blocked'
  ): Promise<void>;
  updateDocumentationReferences(
    issueId: string,
    references: string[]
  ): Promise<void>;
}

// Linear Issue Templates for Documentation
export interface LinearIssueTemplate {
  type: 'blocker' | 'decision' | 'maintenance' | 'feature-doc';
  title: string;
  description: string;
  labels: string[];
  priority: number;
  teamId: string;
  projectId?: string;
}

export const DOCUMENTATION_ISSUE_TEMPLATES: Record<
  string,
  LinearIssueTemplate
> = {
  'high-priority-blocker': {
    type: 'blocker',
    title: '[BLOCKER] {title}',
    description: `## Blocker Details
**Impact**: {impact}
**Priority**: High
**Created**: {date}

## Description
{description}

## Next Steps
{nextSteps}

## Daily Status Reference
- File: {dailyStatusFile}
- Blocker ID: {blockerId}`,
    labels: ['blocker', 'high-priority', 'documentation'],
    priority: 2, // High
    teamId: '', // To be configured
  },

  'architectural-decision': {
    type: 'decision',
    title: '[DECISION] {title}',
    description: `## Decision Context
{context}

## Decision Made
{decision}

## Rationale
{rationale}

## Alternatives Considered
{alternatives}

## Impact Areas
{impact}

## Daily Status Reference
- File: {dailyStatusFile}
- Decision ID: {decisionId}`,
    labels: ['decision', 'architecture', 'documentation'],
    priority: 3, // Normal
    teamId: '', // To be configured
  },

  'broken-link-maintenance': {
    type: 'maintenance',
    title: '[MAINTENANCE] Fix broken link: {url}',
    description: `## Broken Link Details
**URL**: {url}
**File**: {filePath}
**Detected**: {date}

## Error Details
{errorDetails}

## Suggested Fix
{suggestedFix}`,
    labels: ['maintenance', 'documentation', 'broken-link'],
    priority: 4, // Low
    teamId: '', // To be configured
  },

  'stale-content': {
    type: 'maintenance',
    title: '[MAINTENANCE] Update stale content: {fileName}',
    description: `## Stale Content Details
**File**: {filePath}
**Last Updated**: {lastUpdated}
**Age**: {ageInDays} days
**Staleness Threshold**: {threshold} days

## Content Summary
{contentSummary}

## Suggested Updates
{suggestedUpdates}`,
    labels: ['maintenance', 'documentation', 'stale-content'],
    priority: 4, // Low
    teamId: '', // To be configured
  },
};

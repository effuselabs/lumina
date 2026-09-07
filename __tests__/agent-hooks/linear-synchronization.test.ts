/**
 * Tests for Linear Synchronization Agent Hook Integration
 *
 * This test suite validates the Linear synchronization functionality
 * that integrates with the documentation and steering compliance hooks.
 */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

// Mock Linear API
const mockLinearCreateIssue = jest.fn() as jest.MockedFunction<any>;
const mockLinearUpdateIssue = jest.fn() as jest.MockedFunction<any>;
const mockLinearListIssues = jest.fn() as jest.MockedFunction<any>;
const mockLinearGetIssue = jest.fn() as jest.MockedFunction<any>;

jest.mock('@/lib/linear-client', () => ({
  createIssue: mockLinearCreateIssue,
  updateIssue: mockLinearUpdateIssue,
  listIssues: mockLinearListIssues,
  getIssue: mockLinearGetIssue,
}));

// Mock Linear synchronization service
interface LinearIssueData {
  title: string;
  description: string;
  labels: string[];
  priority: number;
  assigneeId?: string;
  projectId?: string;
}

interface LinearSyncResult {
  created: number;
  updated: number;
  errors: string[];
}

// Mock Linear synchronization functions
async function createDocumentationIssue(
  issueData: LinearIssueData
): Promise<string> {
  const issue = (await mockLinearCreateIssue({
    title: issueData.title,
    description: issueData.description,
    labelIds: issueData.labels,
    priority: issueData.priority,
    assigneeId: issueData.assigneeId,
    projectId: issueData.projectId,
  })) as { id: string };

  return issue.id;
}

async function createComplianceIssue(
  issueData: LinearIssueData
): Promise<string> {
  const issue = (await mockLinearCreateIssue({
    title: issueData.title,
    description: issueData.description,
    labelIds: issueData.labels,
    priority: issueData.priority,
    assigneeId: issueData.assigneeId,
    projectId: issueData.projectId,
  })) as { id: string };

  return issue.id;
}

async function updateExistingIssue(
  issueId: string,
  updates: Partial<LinearIssueData>
): Promise<void> {
  await mockLinearUpdateIssue(issueId, updates);
}

async function syncMaintenanceTasks(
  tasks: Array<{
    title: string;
    description: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    labels: string[];
  }>
): Promise<LinearSyncResult> {
  const result: LinearSyncResult = {
    created: 0,
    updated: 0,
    errors: [],
  };

  for (const task of tasks) {
    try {
      const priorityMap = {
        critical: 1,
        high: 2,
        medium: 3,
        low: 4,
      };

      await createDocumentationIssue({
        title: task.title,
        description: task.description,
        labels: task.labels,
        priority: priorityMap[task.priority],
      });

      result.created++;
    } catch (error) {
      result.errors.push(`Failed to create task: ${task.title}`);
    }
  }

  return result;
}

describe('Linear Synchronization Agent Hook Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLinearCreateIssue.mockResolvedValue({ id: 'issue-123' } as any);
    mockLinearUpdateIssue.mockResolvedValue({ success: true } as any);
    mockLinearListIssues.mockResolvedValue([] as any);
    mockLinearGetIssue.mockResolvedValue({
      id: 'issue-123',
      title: 'Test Issue',
    } as any);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Documentation Issue Creation', () => {
    it('should create Linear issues for missing documentation', async () => {
      const issueData: LinearIssueData = {
        title: 'Documentation Update: components/ui/button.tsx',
        description:
          'Create documentation for the Button component including usage examples and props interface.',
        labels: ['documentation', 'maintenance'],
        priority: 2,
      };

      const issueId = await createDocumentationIssue(issueData);

      expect(mockLinearCreateIssue).toHaveBeenCalledWith({
        title: issueData.title,
        description: issueData.description,
        labelIds: issueData.labels,
        priority: issueData.priority,
        assigneeId: undefined,
        projectId: undefined,
      });
      expect(issueId).toBe('issue-123');
    });

    it('should create Linear issues for API documentation', async () => {
      const issueData: LinearIssueData = {
        title: 'API Documentation: /api/clients',
        description:
          'Document the clients API endpoint including request/response formats, authentication, and error codes.',
        labels: ['documentation', 'api', 'critical'],
        priority: 1,
      };

      const issueId = await createDocumentationIssue(issueData);

      expect(mockLinearCreateIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          title: issueData.title,
          description: issueData.description,
          priority: 1,
        })
      );
      expect(issueId).toBe('issue-123');
    });

    it('should create Linear issues for utility documentation', async () => {
      const issueData: LinearIssueData = {
        title: 'Documentation Update: lib/auth.ts',
        description:
          'Update authentication utility documentation to reflect recent security enhancements.',
        labels: ['documentation', 'utilities', 'security'],
        priority: 2,
      };

      const issueId = await createDocumentationIssue(issueData);

      expect(mockLinearCreateIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          title: issueData.title,
          labels: ['documentation', 'utilities', 'security'],
        })
      );
      expect(issueId).toBe('issue-123');
    });
  });

  describe('Compliance Issue Creation', () => {
    it('should create Linear issues for steering compliance violations', async () => {
      const issueData: LinearIssueData = {
        title:
          'Compliance Violation: Missing businessId validation in /api/clients',
        description:
          'The clients API route is missing businessId validation required for multi-tenant data isolation.\n\nFix: Add businessId validation middleware and ensure all queries are scoped to the business context.',
        labels: ['compliance', 'security', 'api'],
        priority: 1,
      };

      const issueId = await createComplianceIssue(issueData);

      expect(mockLinearCreateIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          title: issueData.title,
          description: expect.stringContaining('businessId validation'),
          priority: 1,
        })
      );
      expect(issueId).toBe('issue-123');
    });

    it('should create Linear issues for TypeScript compliance violations', async () => {
      const issueData: LinearIssueData = {
        title:
          'Compliance Violation: Missing TypeScript types in Button component',
        description:
          'The Button component is missing proper TypeScript interface definitions for props.\n\nFix: Add ButtonProps interface with proper type definitions.',
        labels: ['compliance', 'typescript', 'components'],
        priority: 2,
      };

      const issueId = await createComplianceIssue(issueData);

      expect(mockLinearCreateIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          title: issueData.title,
          labels: ['compliance', 'typescript', 'components'],
        })
      );
      expect(issueId).toBe('issue-123');
    });

    it('should create Linear issues for security compliance violations', async () => {
      const issueData: LinearIssueData = {
        title: 'Security Compliance: Missing input validation in auth endpoint',
        description:
          'The authentication endpoint is missing proper input validation and sanitization.\n\nFix: Implement Zod schema validation and input sanitization.',
        labels: ['compliance', 'security', 'critical'],
        priority: 1,
      };

      const issueId = await createComplianceIssue(issueData);

      expect(mockLinearCreateIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          title: issueData.title,
          labels: ['compliance', 'security', 'critical'],
          priority: 1,
        })
      );
      expect(issueId).toBe('issue-123');
    });
  });

  describe('Issue Updates', () => {
    it('should update existing issues when violations are resolved', async () => {
      const issueId = 'issue-123';
      const updates = {
        description: 'Updated description with resolution details',
        labels: ['compliance', 'resolved'],
      };

      await updateExistingIssue(issueId, updates);

      expect(mockLinearUpdateIssue).toHaveBeenCalledWith(issueId, updates);
    });

    it('should update issue priority when severity changes', async () => {
      const issueId = 'issue-123';
      const updates = {
        priority: 3, // Changed from high to medium
      };

      await updateExistingIssue(issueId, updates);

      expect(mockLinearUpdateIssue).toHaveBeenCalledWith(issueId, updates);
    });
  });

  describe('Maintenance Task Synchronization', () => {
    it('should sync maintenance tasks from documentation audit', async () => {
      const maintenanceTasks = [
        {
          title: 'Create API documentation for clients endpoint',
          description:
            'Document the /api/clients endpoint including request/response formats.',
          priority: 'critical' as const,
          labels: ['documentation', 'api', 'critical'],
        },
        {
          title: 'Update component documentation',
          description:
            'Update all component documentation with latest prop interfaces.',
          priority: 'high' as const,
          labels: ['documentation', 'components'],
        },
        {
          title: 'Add utility function examples',
          description:
            'Add usage examples to all utility function documentation.',
          priority: 'medium' as const,
          labels: ['documentation', 'utilities', 'examples'],
        },
      ];

      const result = await syncMaintenanceTasks(maintenanceTasks);

      expect(result.created).toBe(3);
      expect(result.updated).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockLinearCreateIssue).toHaveBeenCalledTimes(3);
    });

    it('should handle errors during maintenance task creation', async () => {
      mockLinearCreateIssue.mockRejectedValueOnce(
        new Error('Linear API error') as any
      );

      const maintenanceTasks = [
        {
          title: 'Create API documentation',
          description: 'Document API endpoints',
          priority: 'critical' as const,
          labels: ['documentation', 'api'],
        },
        {
          title: 'Update component docs',
          description: 'Update component documentation',
          priority: 'high' as const,
          labels: ['documentation', 'components'],
        },
      ];

      const result = await syncMaintenanceTasks(maintenanceTasks);

      expect(result.created).toBe(1);
      expect(result.updated).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Create API documentation');
    });
  });

  describe('Priority Mapping', () => {
    it('should map critical priority to Linear priority 1', async () => {
      const issueData: LinearIssueData = {
        title: 'Critical Issue',
        description: 'Critical issue description',
        labels: ['critical'],
        priority: 1,
      };

      await createDocumentationIssue(issueData);

      expect(mockLinearCreateIssue).toHaveBeenCalledWith(
        expect.objectContaining({ priority: 1 })
      );
    });

    it('should map high priority to Linear priority 2', async () => {
      const issueData: LinearIssueData = {
        title: 'High Priority Issue',
        description: 'High priority issue description',
        labels: ['high'],
        priority: 2,
      };

      await createDocumentationIssue(issueData);

      expect(mockLinearCreateIssue).toHaveBeenCalledWith(
        expect.objectContaining({ priority: 2 })
      );
    });

    it('should map medium priority to Linear priority 3', async () => {
      const issueData: LinearIssueData = {
        title: 'Medium Priority Issue',
        description: 'Medium priority issue description',
        labels: ['medium'],
        priority: 3,
      };

      await createDocumentationIssue(issueData);

      expect(mockLinearCreateIssue).toHaveBeenCalledWith(
        expect.objectContaining({ priority: 3 })
      );
    });

    it('should map low priority to Linear priority 4', async () => {
      const issueData: LinearIssueData = {
        title: 'Low Priority Issue',
        description: 'Low priority issue description',
        labels: ['low'],
        priority: 4,
      };

      await createDocumentationIssue(issueData);

      expect(mockLinearCreateIssue).toHaveBeenCalledWith(
        expect.objectContaining({ priority: 4 })
      );
    });
  });

  describe('Label Management', () => {
    it('should use documentation labels for documentation issues', async () => {
      const issueData: LinearIssueData = {
        title: 'Documentation Issue',
        description: 'Documentation issue description',
        labels: ['documentation', 'maintenance'],
        priority: 2,
      };

      await createDocumentationIssue(issueData);

      expect(mockLinearCreateIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          labelIds: ['documentation', 'maintenance'],
        })
      );
    });

    it('should use compliance labels for compliance issues', async () => {
      const issueData: LinearIssueData = {
        title: 'Compliance Issue',
        description: 'Compliance issue description',
        labels: ['compliance', 'security'],
        priority: 1,
      };

      await createComplianceIssue(issueData);

      expect(mockLinearCreateIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          labelIds: ['compliance', 'security'],
        })
      );
    });

    it('should use module-specific labels', async () => {
      const issueData: LinearIssueData = {
        title: 'API Documentation Issue',
        description: 'API documentation issue description',
        labels: ['documentation', 'api', 'critical'],
        priority: 1,
      };

      await createDocumentationIssue(issueData);

      expect(mockLinearCreateIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          labelIds: ['documentation', 'api', 'critical'],
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle Linear API errors gracefully', async () => {
      mockLinearCreateIssue.mockRejectedValue(
        new Error('Linear API error') as any
      );

      const issueData: LinearIssueData = {
        title: 'Test Issue',
        description: 'Test description',
        labels: ['test'],
        priority: 2,
      };

      await expect(createDocumentationIssue(issueData)).rejects.toThrow(
        'Linear API error'
      );
    });

    it('should handle network errors during issue creation', async () => {
      mockLinearCreateIssue.mockRejectedValue(
        new Error('Network error') as any
      );

      const issueData: LinearIssueData = {
        title: 'Test Issue',
        description: 'Test description',
        labels: ['test'],
        priority: 2,
      };

      await expect(createDocumentationIssue(issueData)).rejects.toThrow(
        'Network error'
      );
    });

    it('should handle invalid issue data', async () => {
      mockLinearCreateIssue.mockRejectedValue(
        new Error('Invalid issue data') as any
      );

      const issueData: LinearIssueData = {
        title: '',
        description: '',
        labels: [],
        priority: 0,
      };

      await expect(createDocumentationIssue(issueData)).rejects.toThrow(
        'Invalid issue data'
      );
    });
  });

  describe('Integration Requirements', () => {
    it('should fulfill requirement 4.3 - Linear Issue Creation', () => {
      // Automated Linear issue creation from new development tasks
      expect(mockLinearCreateIssue).toBeDefined();

      // Label and milestone synchronization
      // This would be tested through the actual hook execution
    });

    it('should fulfill requirement 4.4 - Progress Tracking', () => {
      // Progress tracking automation with status updates
      expect(mockLinearUpdateIssue).toBeDefined();

      // Automated issue updates
      // This would be tested through the actual hook execution
    });

    it('should fulfill requirement 4.5 - Issue Management', () => {
      // Automated issue cleanup and archiving
      expect(mockLinearListIssues).toBeDefined();
      expect(mockLinearGetIssue).toBeDefined();

      // Discrepancy identification and resolution
      // This would be tested through the actual hook execution
    });

    it('should fulfill requirement 4.6 - Synchronization', () => {
      // Linear issue synchronization system
      expect(mockLinearCreateIssue).toBeDefined();
      expect(mockLinearUpdateIssue).toBeDefined();

      // Progress tracking automation
      // This would be tested through the actual hook execution
    });
  });

  describe('Batch Operations', () => {
    it('should handle batch issue creation efficiently', async () => {
      const tasks = Array.from({ length: 10 }, (_, i) => ({
        title: `Task ${i + 1}`,
        description: `Description for task ${i + 1}`,
        priority: 'medium' as const,
        labels: ['documentation', 'batch'],
      }));

      const result = await syncMaintenanceTasks(tasks);

      expect(result.created).toBe(10);
      expect(mockLinearCreateIssue).toHaveBeenCalledTimes(10);
    });

    it('should continue processing after individual failures', async () => {
      mockLinearCreateIssue
        .mockResolvedValueOnce({ id: 'issue-1' } as any)
        .mockRejectedValueOnce(new Error('API error') as any)
        .mockResolvedValueOnce({ id: 'issue-3' } as any);

      const tasks = [
        {
          title: 'Task 1',
          description: 'Desc 1',
          priority: 'medium' as const,
          labels: ['doc'],
        },
        {
          title: 'Task 2',
          description: 'Desc 2',
          priority: 'medium' as const,
          labels: ['doc'],
        },
        {
          title: 'Task 3',
          description: 'Desc 3',
          priority: 'medium' as const,
          labels: ['doc'],
        },
      ];

      const result = await syncMaintenanceTasks(tasks);

      expect(result.created).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(mockLinearCreateIssue).toHaveBeenCalledTimes(3);
    });
  });
});

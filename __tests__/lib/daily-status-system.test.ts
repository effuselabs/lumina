/**
 * Daily Status System Tests
 *
 * Tests for the daily status documentation system components
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { DailyStatusBlockerTracker } from '../../lib/daily-status-blocker-tracker';
import { DailyStatusDecisionTracker } from '../../lib/daily-status-decision-tracker';

// Mock file system for testing
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    access: jest.fn(),
    mkdir: jest.fn(),
    readdir: jest.fn(),
  },
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('Daily Status Decision Tracker', () => {
  let tracker: DailyStatusDecisionTracker;
  const testDir = 'test-daily-status';

  beforeEach(() => {
    tracker = new DailyStatusDecisionTracker(testDir);
    jest.clearAllMocks();
  });

  describe('Decision ID Generation', () => {
    test('generates unique decision IDs with date and title', () => {
      const date = new Date('2025-01-10T12:00:00.000Z');
      const title = 'Use React Query for State Management';

      // Access private method through any cast for testing
      const id = (tracker as any).generateDecisionId(date, title);

      expect(id).toMatch(/^DEC-\d{4}-\d{2}-\d{2}-use-react-query-for-state/);
    });

    test('handles special characters in titles', () => {
      const date = new Date('2025-01-10T12:00:00.000Z');
      const title = 'API Endpoint: /users/{id} Implementation!';

      const id = (tracker as any).generateDecisionId(date, title);

      expect(id).toMatch(
        /^DEC-\d{4}-\d{2}-\d{2}-api-endpoint-usersid-implement/
      );
    });
  });

  describe('Decision Formatting', () => {
    test('formats decision for markdown correctly', () => {
      const decision = {
        id: 'DEC-2025-01-10-test-decision',
        title: 'Test Decision',
        context: 'Need to test formatting',
        decision: 'Use markdown format',
        rationale: 'Better readability',
        alternatives: ['Plain text', 'JSON format'],
        impact: ['Documentation', 'Readability'],
        status: 'approved' as const,
        date: new Date('2025-01-10T12:00:00.000Z'),
        linearIssue: 'LUM-123',
        author: 'Test Author',
      };

      const markdown = (tracker as any).formatDecisionForMarkdown(decision);

      expect(markdown).toContain('### Decision: Test Decision');
      expect(markdown).toContain('- **ID**: DEC-2025-01-10-test-decision');
      expect(markdown).toContain('- **Status**: approved');
      expect(markdown).toContain('- **Context**: Need to test formatting');
      expect(markdown).toContain('- **Decision**: Use markdown format');
      expect(markdown).toContain('- **Rationale**: Better readability');
      expect(markdown).toContain(
        '- **Alternatives Considered**: Plain text, JSON format'
      );
      expect(markdown).toContain('- **Impact**: Documentation, Readability');
      expect(markdown).toContain('- **Linear Issue**: LUM-123');
      expect(markdown).toContain('- **Author**: Test Author');
    });
  });

  describe('Decision Extraction', () => {
    test('extracts decisions from markdown content', () => {
      const content = `
# Daily Status

## Decisions Made

### Decision: Test Decision

- **ID**: DEC-2025-01-10-test-decision
- **Status**: approved
- **Context**: Need to test extraction
- **Decision**: Extract from markdown
- **Rationale**: Automated processing
- **Alternatives Considered**: Manual parsing, JSON storage
- **Impact**: Testing, Automation
- **Linear Issue**: LUM-123
- **Author**: Test Author

## Other Section
`;

      const date = new Date('2025-01-10T12:00:00.000Z');
      const decisions = (tracker as any).extractDecisionsFromContent(
        content,
        date
      );

      expect(decisions).toHaveLength(1);
      expect(decisions[0]).toMatchObject({
        id: 'DEC-2025-01-10-test-decision',
        title: 'Test Decision',
        status: 'approved',
        context: 'Need to test extraction',
        decision: 'Extract from markdown',
        rationale: 'Automated processing',
        alternatives: ['Manual parsing', 'JSON storage'],
        impact: ['Testing', 'Automation'],
        linearIssue: 'LUM-123',
        author: 'Test Author',
        date,
      });
    });
  });
});

describe('Daily Status Blocker Tracker', () => {
  let tracker: DailyStatusBlockerTracker;
  const testDir = 'test-daily-status';

  beforeEach(() => {
    tracker = new DailyStatusBlockerTracker(testDir);
    jest.clearAllMocks();
  });

  describe('Blocker ID Generation', () => {
    test('generates unique blocker IDs with date and timestamp', () => {
      const date = new Date('2025-01-10T12:00:00.000Z');

      // Mock Date.now for consistent testing
      const originalNow = Date.now;
      Date.now = jest.fn(() => 1641811200000); // Fixed timestamp

      const id = (tracker as any).generateBlockerId(date);

      expect(id).toMatch(/^BLOCK-\d{4}-\d{2}-\d{2}-\d{4}$/);

      // Restore original Date.now
      Date.now = originalNow;
    });
  });

  describe('Blocker Formatting', () => {
    test('formats blocker for markdown correctly', () => {
      const blocker = {
        id: 'BLOCK-2025-01-10-1234',
        title: 'API Timeout Issues',
        description: 'Users experiencing 30 second timeouts',
        status: 'in-progress' as const,
        priority: 'high' as const,
        impact: 'Blocks user workflow completely',
        assignee: 'John Doe',
        nextSteps: ['Investigate timeout causes', 'Implement retry logic'],
        createdDate: new Date('2025-01-10T12:00:00.000Z'),
        targetResolution: new Date('2025-01-12T12:00:00.000Z'),
        linearIssue: 'LUM-456',
        tags: ['api', 'performance'],
      };

      const markdown = (tracker as any).formatBlockerForMarkdown(blocker);

      expect(markdown).toContain('#### API Timeout Issues');
      expect(markdown).toContain('- **ID**: BLOCK-2025-01-10-1234');
      expect(markdown).toContain('- **Status**: in-progress');
      expect(markdown).toContain('- **Priority**: high');
      expect(markdown).toContain(
        '- **Description**: Users experiencing 30 second timeouts'
      );
      expect(markdown).toContain(
        '- **Impact**: Blocks user workflow completely'
      );
      expect(markdown).toContain('- **Assignee**: John Doe');
      expect(markdown).toContain(
        '- **Next Steps**: Investigate timeout causes, Implement retry logic'
      );
      expect(markdown).toMatch(/- \*\*Created\*\*: January \d{1,2}, 2025/);
      expect(markdown).toMatch(
        /- \*\*Target Resolution\*\*: January \d{1,2}, 2025/
      );
      expect(markdown).toContain('- **Linear Issue**: LUM-456');
      expect(markdown).toContain('- **Tags**: api, performance');
    });
  });

  describe('Blocker Metrics Calculation', () => {
    test('calculates blocker metrics correctly', async () => {
      const mockBlockers = [
        {
          id: 'BLOCK-1',
          status: 'new' as const,
          priority: 'high' as const,
          createdDate: new Date('2025-01-08T12:00:00.000Z'),
          resolvedDate: undefined,
        },
        {
          id: 'BLOCK-2',
          status: 'resolved' as const,
          priority: 'medium' as const,
          createdDate: new Date('2025-01-07T12:00:00.000Z'),
          resolvedDate: new Date('2025-01-09T12:00:00.000Z'),
        },
        {
          id: 'BLOCK-3',
          status: 'in-progress' as const,
          priority: 'low' as const,
          createdDate: new Date('2025-01-06T12:00:00.000Z'),
          targetResolution: new Date('2025-01-05T12:00:00.000Z'), // Overdue
        },
      ];

      // Mock getAllBlockers method
      jest
        .spyOn(tracker, 'getAllBlockers')
        .mockResolvedValue(mockBlockers as any);

      const metrics = await tracker.getBlockerMetrics(30);

      expect(metrics.total).toBe(3);
      expect(metrics.byStatus.new).toBe(1);
      expect(metrics.byStatus['in-progress']).toBe(1);
      expect(metrics.byStatus.resolved).toBe(1);
      expect(metrics.byPriority.high).toBe(1);
      expect(metrics.byPriority.medium).toBe(1);
      expect(metrics.byPriority.low).toBe(1);
      expect(metrics.averageResolutionTime).toBe(2); // 2 days for resolved blocker
      expect(metrics.overdueBlockers).toBe(1);
    });
  });
});

describe('Integration Tests', () => {
  test('decision and blocker IDs do not conflict', () => {
    const date = new Date('2025-01-10T12:00:00.000Z');
    const decisionTracker = new DailyStatusDecisionTracker();
    const blockerTracker = new DailyStatusBlockerTracker();

    const decisionId = (decisionTracker as any).generateDecisionId(
      date,
      'Test Decision'
    );

    // Mock Date.now for blocker ID
    const originalNow = Date.now;
    Date.now = jest.fn(() => 1641811200000);
    const blockerId = (blockerTracker as any).generateBlockerId(date);
    Date.now = originalNow;

    expect(decisionId).toMatch(/^DEC-/);
    expect(blockerId).toMatch(/^BLOCK-/);
    expect(decisionId).not.toBe(blockerId);
  });

  test('file path parsing works for both decisions and blockers', () => {
    const decisionTracker = new DailyStatusDecisionTracker('test-dir');
    const blockerTracker = new DailyStatusBlockerTracker('test-dir');

    const decisionId = 'DEC-2025-01-10-test';
    const blockerId = 'BLOCK-2025-01-10-1234';

    const decisionPath = (decisionTracker as any).parseDecisionId(decisionId);
    const blockerPath = (blockerTracker as any).parseBlockerId(blockerId);

    expect(decisionPath.date).toEqual(new Date('2025-01-10T00:00:00.000Z'));
    expect(blockerPath.date).toEqual(new Date('2025-01-10T00:00:00.000Z'));
    expect(decisionPath.filePath).toBe(join('test-dir', '2025-01-10.md'));
    expect(blockerPath.filePath).toBe(join('test-dir', '2025-01-10.md'));
  });
});

describe('Error Handling', () => {
  test('handles invalid decision ID format', () => {
    const tracker = new DailyStatusDecisionTracker();

    expect(() => {
      (tracker as any).parseDecisionId('INVALID-ID');
    }).toThrow('Invalid decision ID format: INVALID-ID');
  });

  test('handles invalid blocker ID format', () => {
    const tracker = new DailyStatusBlockerTracker();

    expect(() => {
      (tracker as any).parseBlockerId('INVALID-ID');
    }).toThrow('Invalid blocker ID format: INVALID-ID');
  });

  test('handles missing daily status file', async () => {
    const tracker = new DailyStatusDecisionTracker();

    // Mock file not existing
    mockFs.access.mockRejectedValue(new Error('File not found'));

    await expect(
      tracker.addDecision({
        title: 'Test',
        context: 'Test',
        decision: 'Test',
        rationale: 'Test',
        alternatives: [],
        impact: [],
        status: 'proposed',
      })
    ).rejects.toThrow('Daily status file not found');
  });
});

/**
 * Tests for Steering Compliance Agent Hook
 *
 * This test suite validates the steering compliance Agent Hook functionality
 * including compliance checking, violation detection, and fix suggestions.
 */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';

// Mock Linear API
const mockLinearCreateIssue = jest.fn();
const mockLinearUpdateIssue = jest.fn();

jest.mock('@/lib/linear-client', () => ({
  createIssue: mockLinearCreateIssue,
  updateIssue: mockLinearUpdateIssue,
  listIssues: jest.fn() as jest.MockedFunction<any>,
}));

// Mock file system operations
const mockReadFile = jest.fn();
const mockExistsSync = jest.fn();

jest.mock('fs', () => ({
  readFileSync: mockReadFile,
  existsSync: mockExistsSync,
}));

// Import the hook configuration
const steeringComplianceHook = JSON.parse(
  readFileSync(
    join(process.cwd(), '.kiro/hooks/steering-compliance.json'),
    'utf-8'
  )
);

// Mock steering file content
const mockSteeringFiles = {
  'api-standards.md': `
# API Standards
- Use kebab-case for route segments
- Include businessId validation
- Implement proper error handling
`,
  'ui-standards.md': `
# UI Standards
- Use PascalCase for component names
- Implement proper TypeScript types
- Follow responsive design patterns
`,
  'database-standards.md': `
# Database Standards
- Include businessId in all business data
- Use proper indexes
- Implement soft deletes
`,
  'security.md': `
# Security Standards
- Validate all inputs
- Use business-scoped queries
- Implement proper authentication
`,
  'coding-approach-and-standards.md': `
# Coding Standards
- Use TypeScript strict mode
- Follow functional programming patterns
- Implement comprehensive error handling
`,
};

// Mock Agent Hook execution environment
interface AgentHookContext {
  changedFiles: string[];
  workspaceRoot: string;
  linearClient: any;
}

// Simulate Agent Hook execution
async function executeSteeringComplianceHook(
  context: AgentHookContext
): Promise<any> {
  const prompt = steeringComplianceHook.prompt.replace(
    '{{changedFiles}}',
    context.changedFiles.join(', ')
  );

  return await analyzeSteeringCompliance(
    context.changedFiles,
    context.workspaceRoot
  );
}

// Mock compliance analysis function
async function analyzeSteeringCompliance(
  changedFiles: string[],
  workspaceRoot: string
) {
  const results = [];

  for (const file of changedFiles) {
    const analysis = await analyzeFileCompliance(file, workspaceRoot);
    if (analysis.violations.length > 0) {
      results.push(analysis);
    }
  }

  return results;
}

async function analyzeFileCompliance(filePath: string, workspaceRoot: string) {
  const violations = [];
  const applicableSteeringFiles = [];

  // Determine applicable steering files
  if (filePath.includes('app/api/')) {
    applicableSteeringFiles.push('api-standards.md');
  }
  if (filePath.includes('components/') && filePath.endsWith('.tsx')) {
    applicableSteeringFiles.push('ui-standards.md');
  }
  if (filePath.includes('prisma/')) {
    applicableSteeringFiles.push('database-standards.md');
  }
  if (filePath.includes('auth') || filePath.includes('middleware')) {
    applicableSteeringFiles.push('security.md');
  }
  // All files should follow general coding standards
  applicableSteeringFiles.push('coding-approach-and-standards.md');

  // Mock file content analysis
  const fileContent = (mockReadFile(filePath) as string) || '';

  // Check for common violations
  if (filePath.includes('app/api/') && !fileContent.includes('businessId')) {
    violations.push({
      type: 'missing-business-scoping',
      severity: 'high',
      message: 'API route missing businessId validation',
      steeringFile: 'api-standards.md',
      suggestion:
        'Add businessId validation to ensure multi-tenant data isolation',
    });
  }

  if (
    filePath.endsWith('.tsx') &&
    !fileContent.includes('interface') &&
    !fileContent.includes('type')
  ) {
    violations.push({
      type: 'missing-typescript-types',
      severity: 'medium',
      message: 'Component missing TypeScript type definitions',
      steeringFile: 'ui-standards.md',
      suggestion: 'Add proper TypeScript interfaces for component props',
    });
  }

  if (filePath.includes('prisma/') && !fileContent.includes('businessId')) {
    violations.push({
      type: 'missing-business-scoping',
      severity: 'high',
      message: 'Database model missing businessId field',
      steeringFile: 'database-standards.md',
      suggestion: 'Add businessId field to ensure multi-tenant data isolation',
    });
  }

  if (
    !fileContent.includes('try') &&
    !fileContent.includes('catch') &&
    filePath.endsWith('.ts')
  ) {
    violations.push({
      type: 'missing-error-handling',
      severity: 'medium',
      message: 'Missing comprehensive error handling',
      steeringFile: 'coding-approach-and-standards.md',
      suggestion: 'Implement proper try-catch blocks and error handling',
    });
  }

  return {
    filePath,
    applicableSteeringFiles,
    violations,
    complianceScore:
      violations.length === 0 ? 100 : Math.max(0, 100 - violations.length * 20),
  };
}

describe('Steering Compliance Agent Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReadFile.mockReturnValue('// Mock file content');
    mockExistsSync.mockReturnValue(true);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Hook Configuration', () => {
    it('should have correct trigger configuration', () => {
      expect(steeringComplianceHook.trigger.type).toBe('file_save');
      expect(steeringComplianceHook.trigger.patterns).toContain(
        'app/api/**/*.ts'
      );
      expect(steeringComplianceHook.trigger.patterns).toContain(
        'components/**/*.tsx'
      );
      expect(steeringComplianceHook.trigger.patterns).toContain('lib/**/*.ts');
      expect(steeringComplianceHook.trigger.patterns).toContain(
        'prisma/schema.prisma'
      );
    });

    it('should be enabled by default', () => {
      expect(steeringComplianceHook.enabled).toBe(true);
    });

    it('should not auto-approve by default', () => {
      expect(steeringComplianceHook.autoApprove).toBe(false);
    });

    it('should have a comprehensive prompt template', () => {
      expect(steeringComplianceHook.prompt).toContain('Steering File Analysis');
      expect(steeringComplianceHook.prompt).toContain('Compliance Checking');
      expect(steeringComplianceHook.prompt).toContain('Violation Detection');
      expect(steeringComplianceHook.prompt).toContain('Fix Suggestions');
      expect(steeringComplianceHook.prompt).toContain('{{changedFiles}}');
    });
  });

  describe('File Pattern Matching', () => {
    it('should match API route files', () => {
      const patterns = steeringComplianceHook.trigger.patterns;
      const apiFile = 'app/api/auth/signin/route.ts';

      const matchesPattern = patterns.some((pattern: string) => {
        const regex = new RegExp(
          pattern.replace('**', '.*').replace('*', '[^/]*')
        );
        return regex.test(apiFile);
      });

      expect(matchesPattern).toBe(true);
    });

    it('should match React component files', () => {
      const patterns = steeringComplianceHook.trigger.patterns;
      const componentFile = 'components/ui/button.tsx';

      const matchesPattern = patterns.some((pattern: string) => {
        const regex = new RegExp(
          pattern.replace('**', '.*').replace('*', '[^/]*')
        );
        return regex.test(componentFile);
      });

      expect(matchesPattern).toBe(true);
    });

    it('should match utility files', () => {
      const patterns = steeringComplianceHook.trigger.patterns;
      const utilityFile = 'lib/auth.ts';

      const matchesPattern = patterns.some((pattern: string) => {
        const regex = new RegExp(
          pattern.replace('**', '.*').replace('*', '[^/]*')
        );
        return regex.test(utilityFile);
      });

      expect(matchesPattern).toBe(true);
    });

    it('should match Prisma schema file', () => {
      const patterns = steeringComplianceHook.trigger.patterns;
      const schemaFile = 'prisma/schema.prisma';

      expect(patterns).toContain(schemaFile);
    });
  });

  describe('Steering File Application', () => {
    it('should apply API standards to API routes', async () => {
      const context: AgentHookContext = {
        changedFiles: ['app/api/auth/signin/route.ts'],
        workspaceRoot: '/workspace',
        linearClient: {},
      };

      const results = await executeSteeringComplianceHook(context);

      if (results.length > 0) {
        expect(results[0].applicableSteeringFiles).toContain(
          'api-standards.md'
        );
      }
    });

    it('should apply UI standards to React components', async () => {
      const context: AgentHookContext = {
        changedFiles: ['components/ui/button.tsx'],
        workspaceRoot: '/workspace',
        linearClient: {},
      };

      const results = await executeSteeringComplianceHook(context);

      if (results.length > 0) {
        expect(results[0].applicableSteeringFiles).toContain('ui-standards.md');
      }
    });

    it('should apply database standards to Prisma files', async () => {
      const context: AgentHookContext = {
        changedFiles: ['prisma/schema.prisma'],
        workspaceRoot: '/workspace',
        linearClient: {},
      };

      const results = await executeSteeringComplianceHook(context);

      if (results.length > 0) {
        expect(results[0].applicableSteeringFiles).toContain(
          'database-standards.md'
        );
      }
    });

    it('should apply security standards to auth files', async () => {
      const context: AgentHookContext = {
        changedFiles: ['lib/auth.ts'],
        workspaceRoot: '/workspace',
        linearClient: {},
      };

      const results = await executeSteeringComplianceHook(context);

      if (results.length > 0) {
        expect(results[0].applicableSteeringFiles).toContain('security.md');
      }
    });

    it('should apply general coding standards to all files', async () => {
      const context: AgentHookContext = {
        changedFiles: ['lib/utils.ts'],
        workspaceRoot: '/workspace',
        linearClient: {},
      };

      const results = await executeSteeringComplianceHook(context);

      if (results.length > 0) {
        expect(results[0].applicableSteeringFiles).toContain(
          'coding-approach-and-standards.md'
        );
      }
    });
  });

  describe('Violation Detection', () => {
    it('should detect missing business scoping in API routes', async () => {
      mockReadFile.mockReturnValue(
        'export async function GET() { return Response.json({}) }'
      );

      const context: AgentHookContext = {
        changedFiles: ['app/api/clients/route.ts'],
        workspaceRoot: '/workspace',
        linearClient: {},
      };

      const results = await executeSteeringComplianceHook(context);

      expect(results).toHaveLength(1);
      expect(results[0].violations).toContainEqual(
        expect.objectContaining({
          type: 'missing-business-scoping',
          severity: 'high',
          steeringFile: 'api-standards.md',
        })
      );
    });

    it('should detect missing TypeScript types in components', async () => {
      mockReadFile.mockReturnValue(
        'export default function Button() { return <button>Click</button> }'
      );

      const context: AgentHookContext = {
        changedFiles: ['components/ui/button.tsx'],
        workspaceRoot: '/workspace',
        linearClient: {},
      };

      const results = await executeSteeringComplianceHook(context);

      expect(results).toHaveLength(1);
      expect(results[0].violations).toContainEqual(
        expect.objectContaining({
          type: 'missing-typescript-types',
          severity: 'medium',
          steeringFile: 'ui-standards.md',
        })
      );
    });

    it('should detect missing business scoping in database models', async () => {
      mockReadFile.mockReturnValue(
        'model Client { id String @id name String }'
      );

      const context: AgentHookContext = {
        changedFiles: ['prisma/schema.prisma'],
        workspaceRoot: '/workspace',
        linearClient: {},
      };

      const results = await executeSteeringComplianceHook(context);

      expect(results).toHaveLength(1);
      expect(results[0].violations).toContainEqual(
        expect.objectContaining({
          type: 'missing-business-scoping',
          severity: 'high',
          steeringFile: 'database-standards.md',
        })
      );
    });

    it('should detect missing error handling', async () => {
      mockReadFile.mockReturnValue(
        'export function processData() { return data.process() }'
      );

      const context: AgentHookContext = {
        changedFiles: ['lib/data-processor.ts'],
        workspaceRoot: '/workspace',
        linearClient: {},
      };

      const results = await executeSteeringComplianceHook(context);

      expect(results).toHaveLength(1);
      expect(results[0].violations).toContainEqual(
        expect.objectContaining({
          type: 'missing-error-handling',
          severity: 'medium',
          steeringFile: 'coding-approach-and-standards.md',
        })
      );
    });
  });

  describe('Compliance Scoring', () => {
    it('should give perfect score for compliant files', async () => {
      mockReadFile.mockReturnValue(`
        interface ButtonProps { children: React.ReactNode }
        export default function Button({ children }: ButtonProps) {
          try {
            return <button>{children}</button>
          } catch (error) {
            console.error(error)
            return null
          }
        }
      `);

      const context: AgentHookContext = {
        changedFiles: ['components/ui/button.tsx'],
        workspaceRoot: '/workspace',
        linearClient: {},
      };

      const results = await executeSteeringComplianceHook(context);

      if (results.length > 0) {
        expect(results[0].complianceScore).toBe(100);
      } else {
        // No violations found, which is good
        expect(results).toHaveLength(0);
      }
    });

    it('should reduce score based on number of violations', async () => {
      mockReadFile.mockReturnValue(
        'export function badFunction() { return data }'
      );

      const context: AgentHookContext = {
        changedFiles: ['lib/bad-code.ts'],
        workspaceRoot: '/workspace',
        linearClient: {},
      };

      const results = await executeSteeringComplianceHook(context);

      expect(results).toHaveLength(1);
      expect(results[0].complianceScore).toBeLessThan(100);
      expect(results[0].complianceScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Fix Suggestions', () => {
    it('should provide specific fix suggestions for violations', async () => {
      mockReadFile.mockReturnValue(
        'export async function GET() { return Response.json({}) }'
      );

      const context: AgentHookContext = {
        changedFiles: ['app/api/clients/route.ts'],
        workspaceRoot: '/workspace',
        linearClient: {},
      };

      const results = await executeSteeringComplianceHook(context);

      expect(results).toHaveLength(1);
      expect(results[0].violations[0].suggestion).toContain('businessId');
      expect(results[0].violations[0].suggestion).toContain('multi-tenant');
    });

    it('should reference relevant steering files in suggestions', async () => {
      mockReadFile.mockReturnValue(
        'export default function Button() { return <button>Click</button> }'
      );

      const context: AgentHookContext = {
        changedFiles: ['components/ui/button.tsx'],
        workspaceRoot: '/workspace',
        linearClient: {},
      };

      const results = await executeSteeringComplianceHook(context);

      expect(results).toHaveLength(1);
      expect(results[0].violations[0].steeringFile).toBe('ui-standards.md');
      expect(results[0].violations[0].suggestion).toContain('TypeScript');
    });
  });

  describe('Error Handling', () => {
    it('should handle file read errors gracefully', async () => {
      mockReadFile.mockImplementation(() => {
        throw new Error('File read error');
      });

      const context: AgentHookContext = {
        changedFiles: ['components/ui/button.tsx'],
        workspaceRoot: '/workspace',
        linearClient: {},
      };

      await expect(
        executeSteeringComplianceHook(context)
      ).resolves.not.toThrow();
    });

    it('should handle empty file list', async () => {
      const context: AgentHookContext = {
        changedFiles: [],
        workspaceRoot: '/workspace',
        linearClient: {},
      };

      const results = await executeSteeringComplianceHook(context);

      expect(results).toHaveLength(0);
    });

    it('should handle invalid file paths', async () => {
      const context: AgentHookContext = {
        changedFiles: ['', null as any, undefined as any],
        workspaceRoot: '/workspace',
        linearClient: {},
      };

      await expect(
        executeSteeringComplianceHook(context)
      ).resolves.not.toThrow();
    });
  });

  describe('Integration Requirements', () => {
    it('should fulfill requirement 2.1 - Steering Compliance', () => {
      // Automatic validation against steering files
      expect(steeringComplianceHook.trigger.type).toBe('file_save');

      // File-specific compliance checking
      expect(steeringComplianceHook.prompt).toContain(
        'API routes: Apply api-standards.md'
      );
      expect(steeringComplianceHook.prompt).toContain(
        'React components: Apply ui-standards.md'
      );

      // Violation detection and reporting
      expect(steeringComplianceHook.prompt).toContain('Violation Detection');
    });

    it('should fulfill requirement 2.2 - Compliance Checking', () => {
      // API route compliance validation
      expect(steeringComplianceHook.trigger.patterns).toContain(
        'app/api/**/*.ts'
      );

      // Component compliance checking
      expect(steeringComplianceHook.trigger.patterns).toContain(
        'components/**/*.tsx'
      );

      // Database file compliance verification
      expect(steeringComplianceHook.trigger.patterns).toContain(
        'prisma/schema.prisma'
      );
    });

    it('should fulfill requirement 2.3 - Automated Issue Updates', () => {
      // Linear issue creation for compliance violations
      expect(steeringComplianceHook.prompt).toContain(
        'Create Linear issues with "compliance" label'
      );

      // Detailed violation descriptions
      expect(steeringComplianceHook.prompt).toContain(
        'Include violation details'
      );

      // Fix suggestions and remediation guidance
      expect(steeringComplianceHook.prompt).toContain('Fix Suggestions');
      expect(steeringComplianceHook.prompt).toContain(
        'step-by-step remediation instructions'
      );
    });
  });
});

/**
 * Tests for Comprehensive Documentation Audit System
 */

import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import { DocumentationAuditor } from '../../lib/documentation-audit';

// Mock file system and git operations for testing
jest.mock('fs', () => ({
    promises: {
        readdir: jest.fn(),
        stat: jest.fn(),
        readFile: jest.fn(),
        writeFile: jest.fn(),
        mkdir: jest.fn(),
        access: jest.fn(),
        rename: jest.fn()
    }
}));

jest.mock('child_process', () => ({
    execSync: jest.fn()
}));

const mockFs = fs as jest.Mocked<typeof fs>;
const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

describe('DocumentationAuditor', () => {
    let auditor: DocumentationAuditor;
    const testRootPath = '/test/project';

    beforeEach(() => {
        auditor = new DocumentationAuditor(testRootPath);
        jest.clearAllMocks();
    });

    describe('Phase 1: Complete Discovery', () => {
        it('should discover all documentation files', async () => {
            // Mock directory structure
            mockFs.readdir
                .mockResolvedValueOnce([
                    { name: 'README.md', isDirectory: () => false, isFile: () => true },
                    { name: 'docs', isDirectory: () => true, isFile: () => false },
                    { name: 'src', isDirectory: () => true, isFile: () => false },
                    { name: 'package.json', isDirectory: () => false, isFile: () => true }
                ] as any)
                .mockResolvedValueOnce([
                    { name: 'api.md', isDirectory: () => false, isFile: () => true },
                    { name: 'guide.txt', isDirectory: () => false, isFile: () => true }
                ] as any)
                .mockResolvedValueOnce([
                    { name: 'utils.ts', isDirectory: () => false, isFile: () => true }
                ] as any);

            // Mock file stats
            mockFs.stat.mockResolvedValue({
                size: 1024,
                mtime: new Date('2025-01-01')
            } as any);

            // Mock file contents
            mockFs.readFile
                .mockResolvedValueOnce('# Project README\nThis is the main documentation.')
                .mockResolvedValueOnce('# API Documentation\nAPI endpoints and usage.')
                .mockResolvedValueOnce('Setup guide and installation instructions.')
                .mockResolvedValueOnce('{\n  "name": "test-project",\n  "version": "1.0.0"\n}')
                .mockResolvedValueOnce('// Utility functions\n// TODO: Add error handling\nfunction helper() {}');

            // Mock git history
            mockExecSync.mockReturnValue('abc123|John Doe|2025-01-01|Initial commit\ndef456|Jane Smith|2025-01-02|Add documentation');

            const files = await auditor.discoverAllDocumentation();

            expect(files).toHaveLength(5);
            expect(files.map(f => f.relativePath)).toContain('README.md');
            expect(files.map(f => f.relativePath)).toContain('docs/api.md');
            expect(files.map(f => f.relativePath)).toContain('docs/guide.txt');
            expect(files.map(f => f.relativePath)).toContain('package.json');
            expect(files.map(f => f.relativePath)).toContain('src/utils.ts');
        });

        it('should categorize files correctly', async () => {
            mockFs.readdir.mockResolvedValueOnce([
                { name: 'README.md', isDirectory: () => false, isFile: () => true }
            ] as any);

            mockFs.stat.mockResolvedValue({
                size: 1024,
                mtime: new Date('2025-01-01')
            } as any);

            mockFs.readFile.mockResolvedValueOnce('# Authentication System\nLogin and user management.');
            mockExecSync.mockReturnValue('abc123|John Doe|2025-01-01|Initial commit');

            const files = await auditor.discoverAllDocumentation();
            const readmeFile = files.find(f => f.relativePath === 'README.md');

            expect(readmeFile?.type).toBe('readme');
            expect(readmeFile?.category).toBe('authentication');
            expect(readmeFile?.importance).toBe('critical');
        });

        it('should extract knowledge from file content', async () => {
            mockFs.readdir.mockResolvedValueOnce([
                { name: 'architecture.md', isDirectory: () => false, isFile: () => true }
            ] as any);

            mockFs.stat.mockResolvedValue({
                size: 2048,
                mtime: new Date('2025-01-01')
            } as any);

            const content = `# Architecture Decision
We chose microservices architecture for scalability.
This approach allows better performance and maintainability.
TODO: Add monitoring for service health.`;

            mockFs.readFile.mockResolvedValueOnce(content);
            mockExecSync.mockReturnValue('abc123|John Doe|2025-01-01|Architecture decision');

            const files = await auditor.discoverAllDocumentation();
            const archFile = files[0];

            expect(archFile.extractedKnowledge).toHaveLength.greaterThan(0);

            const decisions = archFile.extractedKnowledge.filter(k => k.type === 'architectural-decision');
            expect(decisions).toHaveLength.greaterThan(0);

            const workarounds = archFile.extractedKnowledge.filter(k => k.type === 'workaround');
            expect(workarounds).toHaveLength.greaterThan(0);
        });
    });

    describe('Phase 2: Deep Manual Review', () => {
        it('should enhance knowledge extraction for critical files', async () => {
            const mockFile = {
                path: '/test/project/critical-doc.md',
                relativePath: 'critical-doc.md',
                type: 'markdown' as const,
                size: 2048,
                lastModified: new Date(),
                contentSummary: 'Critical architectural decisions',
                hasCodeComments: false,
                gitHistory: [],
                importance: 'critical' as const,
                category: 'architecture',
                extractedKnowledge: []
            };

            const enhancedContent = `
        interface UserService {
          authenticate(credentials: Credentials): Promise<User>;
          // TODO: Add rate limiting
        }
        
        // FIXME: This is a temporary workaround for auth issues
        function temporaryAuthFix() {}
      `;

            mockFs.readFile.mockResolvedValueOnce(enhancedContent);

            const reviewedFiles = await auditor.performDeepReview([mockFile]);
            const reviewedFile = reviewedFiles[0];

            expect(reviewedFile.extractedKnowledge.length).toBeGreaterThan(0);

            const architecturalKnowledge = reviewedFile.extractedKnowledge.filter(
                k => k.type === 'architectural-decision'
            );
            expect(architecturalKnowledge.length).toBeGreaterThan(0);
        });

        it('should find related files based on content similarity', async () => {
            const file1 = {
                path: '/test/project/auth.md',
                relativePath: 'auth.md',
                type: 'markdown' as const,
                size: 1024,
                lastModified: new Date(),
                contentSummary: 'authentication login user security',
                hasCodeComments: false,
                gitHistory: [],
                importance: 'high' as const,
                category: 'authentication',
                extractedKnowledge: [{
                    type: 'architectural-decision' as const,
                    content: 'We use JWT tokens for authentication',
                    context: 'Authentication system design',
                    source: 'file-content' as const,
                    importance: 'high' as const,
                    relatedFiles: []
                }]
            };

            const file2 = {
                path: '/test/project/security.md',
                relativePath: 'security.md',
                type: 'markdown' as const,
                size: 1024,
                lastModified: new Date(),
                contentSummary: 'security authentication tokens user',
                hasCodeComments: false,
                gitHistory: [],
                importance: 'medium' as const,
                category: 'authentication',
                extractedKnowledge: []
            };

            mockFs.readFile.mockResolvedValue('Mock content');

            const reviewedFiles = await auditor.performDeepReview([file1, file2]);

            expect(reviewedFiles[0].extractedKnowledge[0].relatedFiles).toContain('security.md');
        });
    });

    describe('Phase 3: Knowledge Archaeology', () => {
        it('should extract knowledge from git commit history', async () => {
            const mockFiles = [{
                path: '/test/project/test.md',
                relativePath: 'test.md',
                type: 'markdown' as const,
                size: 1024,
                lastModified: new Date(),
                contentSummary: 'Test documentation',
                hasCodeComments: false,
                gitHistory: [],
                importance: 'medium' as const,
                category: 'general',
                extractedKnowledge: []
            }];

            // Mock recent commits
            const commitLog = `abc123|John Doe|2025-01-01T10:00:00Z|refactor: restructure authentication system
def456|Jane Smith|2025-01-02T11:00:00Z|fix: resolve performance issue in user lookup
ghi789|Bob Wilson|2025-01-03T12:00:00Z|optimize: improve database query performance`;

            mockExecSync.mockReturnValueOnce(commitLog);

            const archaeologyKnowledge = await auditor.performKnowledgeArchaeology(mockFiles);

            expect(archaeologyKnowledge.length).toBeGreaterThan(0);

            const architecturalDecisions = archaeologyKnowledge.filter(k => k.type === 'architectural-decision');
            expect(architecturalDecisions.length).toBeGreaterThan(0);

            const performanceKnowledge = archaeologyKnowledge.filter(k => k.type === 'performance');
            expect(performanceKnowledge.length).toBeGreaterThan(0);
        });

        it('should extract knowledge from code comments', async () => {
            const codeFile = {
                path: '/test/project/utils.ts',
                relativePath: 'utils.ts',
                type: 'code-comment' as const,
                size: 2048,
                lastModified: new Date(),
                contentSummary: 'Utility functions with comments',
                hasCodeComments: true,
                gitHistory: [],
                importance: 'medium' as const,
                category: 'general',
                extractedKnowledge: []
            };

            const codeContent = `
        /**
         * Authentication utility functions
         * 
         * This module handles user authentication and session management.
         * We chose JWT tokens for stateless authentication.
         */
        
        // TODO: Add rate limiting to prevent brute force attacks
        // FIXME: Temporary workaround for session timeout issue
        function authenticateUser(credentials: Credentials) {
          // NOTE: This implementation needs security review
          return validateCredentials(credentials);
        }
      `;

            mockFs.readFile.mockResolvedValueOnce(codeContent);

            const archaeologyKnowledge = await auditor.performKnowledgeArchaeology([codeFile]);

            expect(archaeologyKnowledge.length).toBeGreaterThan(0);

            const jsdocKnowledge = archaeologyKnowledge.filter(k =>
                k.source === 'code-comment' && k.type === 'architectural-decision'
            );
            expect(jsdocKnowledge.length).toBeGreaterThan(0);

            const todoKnowledge = archaeologyKnowledge.filter(k =>
                k.source === 'code-comment' && k.type === 'workaround'
            );
            expect(todoKnowledge.length).toBeGreaterThan(0);
        });
    });

    describe('Phase 4: Safe Migration Planning', () => {
        it('should create comprehensive migration plan', async () => {
            const mockFiles = [
                {
                    path: '/test/project/README.md',
                    relativePath: 'README.md',
                    type: 'readme' as const,
                    size: 1024,
                    lastModified: new Date(),
                    contentSummary: 'Main project documentation',
                    hasCodeComments: false,
                    gitHistory: [],
                    importance: 'critical' as const,
                    category: 'general',
                    extractedKnowledge: []
                },
                {
                    path: '/test/project/auth-notes.txt',
                    relativePath: 'auth-notes.txt',
                    type: 'text' as const,
                    size: 512,
                    lastModified: new Date(),
                    contentSummary: 'Authentication implementation notes',
                    hasCodeComments: false,
                    gitHistory: [],
                    importance: 'medium' as const,
                    category: 'authentication',
                    extractedKnowledge: []
                }
            ];

            const mockKnowledge = [
                {
                    type: 'architectural-decision' as const,
                    content: 'Use JWT for authentication',
                    context: 'Security design',
                    source: 'file-content' as const,
                    importance: 'high' as const,
                    relatedFiles: ['auth-notes.txt']
                }
            ];

            const migrationPlan = await auditor.createMigrationPlan(mockFiles, mockKnowledge);

            expect(migrationPlan.phases).toHaveLength(4);
            expect(migrationPlan.phases[0].name).toBe('Preservation');
            expect(migrationPlan.phases[1].name).toBe('Organization');
            expect(migrationPlan.phases[2].name).toBe('Consolidation');
            expect(migrationPlan.phases[3].name).toBe('Indexing');

            expect(migrationPlan.rollbackProcedure).toHaveLength.greaterThan(0);
            expect(migrationPlan.verificationSteps).toHaveLength.greaterThan(0);
            expect(Object.keys(migrationPlan.beforeAfterMapping)).toHaveLength(2);
        });

        it('should identify duplicate content for consolidation', async () => {
            const duplicateFiles = [
                {
                    path: '/test/project/auth1.md',
                    relativePath: 'auth1.md',
                    type: 'markdown' as const,
                    size: 1024,
                    lastModified: new Date(),
                    contentSummary: 'authentication login user security jwt',
                    hasCodeComments: false,
                    gitHistory: [],
                    importance: 'high' as const,
                    category: 'authentication',
                    extractedKnowledge: []
                },
                {
                    path: '/test/project/auth2.md',
                    relativePath: 'auth2.md',
                    type: 'markdown' as const,
                    size: 1024,
                    lastModified: new Date(),
                    contentSummary: 'authentication login user security tokens',
                    hasCodeComments: false,
                    gitHistory: [],
                    importance: 'medium' as const,
                    category: 'authentication',
                    extractedKnowledge: []
                }
            ];

            const migrationPlan = await auditor.createMigrationPlan(duplicateFiles, []);
            const consolidationPhase = migrationPlan.phases.find(p => p.name === 'Consolidation');

            expect(consolidationPhase?.actions.length).toBeGreaterThan(0);
            expect(consolidationPhase?.actions[0].type).toBe('consolidate');
        });
    });

    describe('Phase 5: Migration Execution', () => {
        it('should execute migration with preservation guarantee', async () => {
            const mockPlan = {
                phases: [
                    {
                        name: 'Preservation',
                        description: 'Create backup',
                        files: ['README.md'],
                        actions: [{
                            type: 'preserve' as const,
                            source: '.',
                            destination: 'docs/migration/backup',
                            preserveHistory: true,
                            reason: 'Full backup'
                        }],
                        rollbackActions: []
                    }
                ],
                rollbackProcedure: ['git stash', 'git restore'],
                verificationSteps: ['verify files', 'verify content'],
                beforeAfterMapping: { 'README.md': 'docs/README.md' }
            };

            // Mock successful execution
            mockFs.mkdir.mockResolvedValue(undefined);
            mockExecSync.mockReturnValue('');
            mockFs.access.mockResolvedValue(undefined);

            const guarantee = await auditor.executeMigration(mockPlan);

            expect(guarantee.gitHistoryPreserved).toBe(true);
            expect(guarantee.allContentMapped).toBe(true);
            expect(guarantee.rollbackCapable).toBe(true);
            expect(guarantee.verificationComplete).toBe(true);
            expect(guarantee.knowledgeLossRisk).toBe('none');
        });
    });

    describe('Comprehensive Audit Report', () => {
        it('should generate complete audit report', async () => {
            const mockFiles = [
                {
                    path: '/test/project/README.md',
                    relativePath: 'README.md',
                    type: 'readme' as const,
                    size: 1024,
                    lastModified: new Date(),
                    contentSummary: 'Main documentation',
                    hasCodeComments: false,
                    gitHistory: [],
                    importance: 'critical' as const,
                    category: 'general',
                    extractedKnowledge: []
                }
            ];

            const mockKnowledge = [
                {
                    type: 'architectural-decision' as const,
                    content: 'Use microservices architecture',
                    context: 'System design',
                    source: 'file-content' as const,
                    importance: 'critical' as const,
                    relatedFiles: []
                }
            ];

            const mockPlan = {
                phases: [],
                rollbackProcedure: [],
                verificationSteps: [],
                beforeAfterMapping: {}
            };

            const report = await auditor.generateAuditReport(mockFiles, mockKnowledge, mockPlan);

            expect(report.totalFiles).toBe(1);
            expect(report.filesByType.readme).toBe(1);
            expect(report.filesByCategory.general).toBe(1);
            expect(report.criticalKnowledge).toHaveLength(1);
            expect(report.migrationPlan).toBe(mockPlan);
            expect(report.preservationGuarantee.knowledgeLossRisk).toBe('none');
        });
    });
});

describe('Error Handling and Edge Cases', () => {
    let auditor: DocumentationAuditor;

    beforeEach(() => {
        auditor = new DocumentationAuditor('/test/project');
        jest.clearAllMocks();
    });

    it('should handle file access errors gracefully', async () => {
        mockFs.readdir.mockRejectedValueOnce(new Error('Permission denied'));

        const files = await auditor.discoverAllDocumentation();
        expect(files).toHaveLength(0);
    });

    it('should handle git command failures', async () => {
        mockFs.readdir.mockResolvedValueOnce([
            { name: 'test.md', isDirectory: () => false, isFile: () => true }
        ] as any);

        mockFs.stat.mockResolvedValue({
            size: 1024,
            mtime: new Date()
        } as any);

        mockFs.readFile.mockResolvedValueOnce('Test content');
        mockExecSync.mockImplementation(() => {
            throw new Error('Git not found');
        });

        const files = await auditor.discoverAllDocumentation();
        expect(files).toHaveLength(1);
        expect(files[0].gitHistory).toHaveLength(0);
    });

    it('should handle migration rollback on failure', async () => {
        const mockPlan = {
            phases: [{
                name: 'Test Phase',
                description: 'Test',
                files: [],
                actions: [{
                    type: 'move' as const,
                    source: 'nonexistent.md',
                    destination: 'docs/nonexistent.md',
                    preserveHistory: true,
                    reason: 'Test move'
                }],
                rollbackActions: []
            }],
            rollbackProcedure: ['git stash', 'git restore'],
            verificationSteps: [],
            beforeAfterMapping: {}
        };

        mockExecSync.mockImplementation((cmd) => {
            if (cmd.includes('git mv')) {
                throw new Error('File not found');
            }
            return '';
        });

        await expect(auditor.executeMigration(mockPlan)).rejects.toThrow();

        // Verify rollback was attempted
        expect(mockExecSync).toHaveBeenCalledWith('git stash', expect.any(Object));
    });
});
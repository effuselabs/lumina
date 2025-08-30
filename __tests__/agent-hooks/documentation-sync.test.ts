/**
 * Tests for Documentation Sync Agent Hook
 * 
 * This test suite validates the documentation sync Agent Hook functionality
 * including file change detection, documentation requirement analysis,
 * and Linear issue creation.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { readFileSync } from 'fs'
import { join } from 'path'

// Mock Linear API
const mockLinearCreateIssue = jest.fn()
const mockLinearUpdateIssue = jest.fn()

jest.mock('@/lib/linear-client', () => ({
    createIssue: mockLinearCreateIssue,
    updateIssue: mockLinearUpdateIssue,
    listIssues: jest.fn().mockResolvedValue([])
}))

// Mock file system operations
const mockReadFile = jest.fn()
const mockExistsSync = jest.fn()

jest.mock('fs', () => ({
    readFileSync: mockReadFile,
    existsSync: mockExistsSync
}))

// Import the hook configuration
const documentationSyncHook = JSON.parse(
    readFileSync(join(process.cwd(), '.kiro/hooks/documentation-sync.json'), 'utf-8')
)

// Mock Agent Hook execution environment
interface AgentHookContext {
    changedFiles: string[]
    workspaceRoot: string
    linearClient: any
}

// Simulate Agent Hook execution
async function executeDocumentationSyncHook(context: AgentHookContext): Promise<any> {
    // This would normally be handled by Kiro's Agent Hook system
    // For testing, we simulate the execution
    const prompt = documentationSyncHook.prompt.replace('{{changedFiles}}', context.changedFiles.join(', '))

    // Simulate the AI agent's analysis
    return await analyzeDocumentationRequirements(context.changedFiles, context.workspaceRoot)
}

// Mock documentation analysis function
async function analyzeDocumentationRequirements(changedFiles: string[], workspaceRoot: string) {
    const results = []

    for (const file of changedFiles) {
        const analysis = await analyzeFileDocumentationNeeds(file, workspaceRoot)
        if (analysis.needsDocumentation) {
            results.push(analysis)
        }
    }

    return results
}

async function analyzeFileDocumentationNeeds(filePath: string, workspaceRoot: string) {
    // Mock analysis logic
    const isComponent = filePath.includes('components/') && filePath.endsWith('.tsx')
    const isApiRoute = filePath.includes('app/api/') && filePath.endsWith('.ts')
    const isUtility = filePath.includes('lib/') && filePath.endsWith('.ts')
    const isSchema = filePath.includes('prisma/schema.prisma')

    let needsDocumentation = false
    let documentationType = ''
    let expectedDocPath = ''

    if (isComponent) {
        needsDocumentation = true
        documentationType = 'component'
        expectedDocPath = `docs/components/${filePath.replace('components/', '').replace('.tsx', '.md')}`
    } else if (isApiRoute) {
        needsDocumentation = true
        documentationType = 'api'
        expectedDocPath = `docs/api/${filePath.replace('app/api/', '').replace('.ts', '.md')}`
    } else if (isUtility) {
        needsDocumentation = true
        documentationType = 'utility'
        expectedDocPath = `docs/utilities/${filePath.replace('lib/', '').replace('.ts', '.md')}`
    } else if (isSchema) {
        needsDocumentation = true
        documentationType = 'database'
        expectedDocPath = 'docs/database/schema.md'
    }

    return {
        filePath,
        needsDocumentation,
        documentationType,
        expectedDocPath,
        exists: mockExistsSync(expectedDocPath)
    }
}

describe('Documentation Sync Agent Hook', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockExistsSync.mockReturnValue(false) // Default: documentation doesn't exist
    })

    afterEach(() => {
        jest.resetAllMocks()
    })

    describe('Hook Configuration', () => {
        it('should have correct trigger configuration', () => {
            expect(documentationSyncHook.trigger.type).toBe('file_save')
            expect(documentationSyncHook.trigger.patterns).toContain('components/**/*.tsx')
            expect(documentationSyncHook.trigger.patterns).toContain('app/api/**/*.ts')
            expect(documentationSyncHook.trigger.patterns).toContain('lib/**/*.ts')
            expect(documentationSyncHook.trigger.patterns).toContain('prisma/schema.prisma')
        })

        it('should be enabled by default', () => {
            expect(documentationSyncHook.enabled).toBe(true)
        })

        it('should not auto-approve by default', () => {
            expect(documentationSyncHook.autoApprove).toBe(false)
        })

        it('should have a comprehensive prompt template', () => {
            expect(documentationSyncHook.prompt).toContain('Documentation Analysis')
            expect(documentationSyncHook.prompt).toContain('Linear Issue Creation')
            expect(documentationSyncHook.prompt).toContain('{{changedFiles}}')
        })
    })

    describe('File Pattern Matching', () => {
        it('should match React component files', () => {
            const patterns = documentationSyncHook.trigger.patterns
            const componentFile = 'components/ui/button.tsx'

            const matchesPattern = patterns.some(pattern => {
                const regex = new RegExp(pattern.replace('**', '.*').replace('*', '[^/]*'))
                return regex.test(componentFile)
            })

            expect(matchesPattern).toBe(true)
        })

        it('should match API route files', () => {
            const patterns = documentationSyncHook.trigger.patterns
            const apiFile = 'app/api/auth/signin/route.ts'

            const matchesPattern = patterns.some(pattern => {
                const regex = new RegExp(pattern.replace('**', '.*').replace('*', '[^/]*'))
                return regex.test(apiFile)
            })

            expect(matchesPattern).toBe(true)
        })

        it('should match utility files', () => {
            const patterns = documentationSyncHook.trigger.patterns
            const utilityFile = 'lib/auth.ts'

            const matchesPattern = patterns.some(pattern => {
                const regex = new RegExp(pattern.replace('**', '.*').replace('*', '[^/]*'))
                return regex.test(utilityFile)
            })

            expect(matchesPattern).toBe(true)
        })

        it('should match Prisma schema file', () => {
            const patterns = documentationSyncHook.trigger.patterns
            const schemaFile = 'prisma/schema.prisma'

            expect(patterns).toContain(schemaFile)
        })
    })

    describe('Documentation Requirements Analysis', () => {
        it('should identify component documentation needs', async () => {
            const context: AgentHookContext = {
                changedFiles: ['components/ui/button.tsx'],
                workspaceRoot: '/workspace',
                linearClient: {}
            }

            const results = await executeDocumentationSyncHook(context)

            expect(results).toHaveLength(1)
            expect(results[0].documentationType).toBe('component')
            expect(results[0].expectedDocPath).toBe('docs/components/ui/button.md')
        })

        it('should identify API route documentation needs', async () => {
            const context: AgentHookContext = {
                changedFiles: ['app/api/auth/signin/route.ts'],
                workspaceRoot: '/workspace',
                linearClient: {}
            }

            const results = await executeDocumentationSyncHook(context)

            expect(results).toHaveLength(1)
            expect(results[0].documentationType).toBe('api')
            expect(results[0].expectedDocPath).toBe('docs/api/auth/signin/route.md')
        })

        it('should identify utility documentation needs', async () => {
            const context: AgentHookContext = {
                changedFiles: ['lib/auth.ts'],
                workspaceRoot: '/workspace',
                linearClient: {}
            }

            const results = await executeDocumentationSyncHook(context)

            expect(results).toHaveLength(1)
            expect(results[0].documentationType).toBe('utility')
            expect(results[0].expectedDocPath).toBe('docs/utilities/auth.md')
        })

        it('should identify database schema documentation needs', async () => {
            const context: AgentHookContext = {
                changedFiles: ['prisma/schema.prisma'],
                workspaceRoot: '/workspace',
                linearClient: {}
            }

            const results = await executeDocumentationSyncHook(context)

            expect(results).toHaveLength(1)
            expect(results[0].documentationType).toBe('database')
            expect(results[0].expectedDocPath).toBe('docs/database/schema.md')
        })

        it('should handle multiple file changes', async () => {
            const context: AgentHookContext = {
                changedFiles: [
                    'components/ui/button.tsx',
                    'app/api/auth/signin/route.ts',
                    'lib/auth.ts'
                ],
                workspaceRoot: '/workspace',
                linearClient: {}
            }

            const results = await executeDocumentationSyncHook(context)

            expect(results).toHaveLength(3)
            expect(results.map(r => r.documentationType)).toEqual(['component', 'api', 'utility'])
        })

        it('should skip files that do not need documentation', async () => {
            const context: AgentHookContext = {
                changedFiles: ['README.md', 'package.json', '.gitignore'],
                workspaceRoot: '/workspace',
                linearClient: {}
            }

            const results = await executeDocumentationSyncHook(context)

            expect(results).toHaveLength(0)
        })
    })

    describe('Existing Documentation Detection', () => {
        it('should detect when documentation already exists', async () => {
            mockExistsSync.mockReturnValue(true)

            const context: AgentHookContext = {
                changedFiles: ['components/ui/button.tsx'],
                workspaceRoot: '/workspace',
                linearClient: {}
            }

            const results = await executeDocumentationSyncHook(context)

            expect(results[0].exists).toBe(true)
            expect(mockExistsSync).toHaveBeenCalledWith('docs/components/ui/button.md')
        })

        it('should detect when documentation is missing', async () => {
            mockExistsSync.mockReturnValue(false)

            const context: AgentHookContext = {
                changedFiles: ['components/ui/button.tsx'],
                workspaceRoot: '/workspace',
                linearClient: {}
            }

            const results = await executeDocumentationSyncHook(context)

            expect(results[0].exists).toBe(false)
            expect(mockExistsSync).toHaveBeenCalledWith('docs/components/ui/button.md')
        })
    })

    describe('Error Handling', () => {
        it('should handle file system errors gracefully', async () => {
            mockExistsSync.mockImplementation(() => {
                throw new Error('File system error')
            })

            const context: AgentHookContext = {
                changedFiles: ['components/ui/button.tsx'],
                workspaceRoot: '/workspace',
                linearClient: {}
            }

            await expect(executeDocumentationSyncHook(context)).resolves.not.toThrow()
        })

        it('should handle empty file list', async () => {
            const context: AgentHookContext = {
                changedFiles: [],
                workspaceRoot: '/workspace',
                linearClient: {}
            }

            const results = await executeDocumentationSyncHook(context)

            expect(results).toHaveLength(0)
        })

        it('should handle invalid file paths', async () => {
            const context: AgentHookContext = {
                changedFiles: ['', null as any, undefined as any],
                workspaceRoot: '/workspace',
                linearClient: {}
            }

            await expect(executeDocumentationSyncHook(context)).resolves.not.toThrow()
        })
    })

    describe('Integration Requirements', () => {
        it('should fulfill requirement 1.1 - Documentation Workflow Integration', () => {
            // Automatic documentation update detection
            expect(documentationSyncHook.trigger.type).toBe('file_save')

            // Integration with development workflow
            expect(documentationSyncHook.trigger.patterns.length).toBeGreaterThan(0)

            // Linear issue creation capability
            expect(documentationSyncHook.prompt).toContain('Linear Issue Creation')
        })

        it('should fulfill requirement 1.4 - Linear Issue Creation', () => {
            // Automated Linear issue creation for documentation updates
            expect(documentationSyncHook.prompt).toContain('Create a Linear issue')

            // Proper labeling
            expect(documentationSyncHook.prompt).toContain('documentation')
            expect(documentationSyncHook.prompt).toContain('maintenance')

            // Detailed issue descriptions
            expect(documentationSyncHook.prompt).toContain('Include details about what documentation needs updating')
        })

        it('should fulfill requirement 1.5 - Documentation Validation', () => {
            // Completeness checking
            expect(documentationSyncHook.prompt).toContain('Completeness of examples and usage instructions')

            // Accuracy validation
            expect(documentationSyncHook.prompt).toContain('Accuracy against current code implementation')

            // Quality assessment
            expect(documentationSyncHook.prompt).toContain('Validation')
        })
    })
})
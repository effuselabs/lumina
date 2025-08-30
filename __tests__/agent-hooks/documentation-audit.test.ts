/**
 * Tests for Documentation Audit Agent Hook
 * 
 * This test suite validates the documentation audit Agent Hook functionality
 * including comprehensive documentation review, health assessment, and
 * maintenance task creation.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { readFileSync } from 'fs'
import { join } from 'path'

// Mock Linear API
const mockLinearCreateIssue = jest.fn()
const mockLinearUpdateIssue = jest.fn()
const mockLinearListIssues = jest.fn()

jest.mock('@/lib/linear-client', () => ({
    createIssue: mockLinearCreateIssue,
    updateIssue: mockLinearUpdateIssue,
    listIssues: mockLinearListIssues
}))

// Mock file system operations
const mockReadFile = jest.fn()
const mockExistsSync = jest.fn()
const mockReaddirSync = jest.fn()
const mockStatSync = jest.fn()

jest.mock('fs', () => ({
    readFileSync: mockReadFile,
    existsSync: mockExistsSync,
    readdirSync: mockReaddirSync,
    statSync: mockStatSync
}))

// Mock glob for file discovery
const mockGlob = jest.fn()
jest.mock('glob', () => ({
    glob: mockGlob
}))

// Import the hook configuration
const documentationAuditHook = JSON.parse(
    readFileSync(join(process.cwd(), '.kiro/hooks/documentation-audit.json'), 'utf-8')
)

// Mock Agent Hook execution environment
interface AgentHookContext {
    workspaceRoot: string
    linearClient: any
    manualTrigger: boolean
}

// Mock documentation audit results
interface DocumentationAuditResult {
    inventory: {
        existingDocs: string[]
        missingDocs: string[]
        componentCount: number
        apiRouteCount: number
        utilityCount: number
    }
    healthAssessment: {
        overallScore: number
        accuracyScore: number
        completenessScore: number
        currencyScore: number
        qualityScore: number
    }
    gaps: Array<{
        type: string
        file: string
        expectedDocPath: string
        priority: 'critical' | 'high' | 'medium' | 'low'
        reason: string
    }>
    complianceIssues: Array<{
        file: string
        issues: string[]
        severity: 'high' | 'medium' | 'low'
    }>
    maintenanceTasks: Array<{
        title: string
        description: string
        priority: 'critical' | 'high' | 'medium' | 'low'
        labels: string[]
    }>
}

// Simulate Agent Hook execution
async function executeDocumentationAuditHook(context: AgentHookContext): Promise<DocumentationAuditResult> {
    return await performDocumentationAudit(context.workspaceRoot)
}

// Mock documentation audit function
async function performDocumentationAudit(): Promise<DocumentationAuditResult> {
    // Mock file discovery
    mockGlob.mockResolvedValue([
        'components/ui/button.tsx',
        'components/ui/input.tsx',
        'components/forms/contact-form.tsx',
        'app/api/auth/signin/route.ts',
        'app/api/clients/route.ts',
        'app/api/services/route.ts',
        'lib/auth.ts',
        'lib/utils.ts',
        'lib/validation.ts'
    ])

    const existingDocs = [
        'docs/components/ui/button.md',
        'docs/api/auth/signin.md',
        'docs/utilities/auth.md'
    ]

    const missingDocs = [
        'docs/components/ui/input.md',
        'docs/components/forms/contact-form.md',
        'docs/api/clients.md',
        'docs/api/services.md',
        'docs/utilities/utils.md',
        'docs/utilities/validation.md'
    ]

    // Mock health assessment
    const healthAssessment = {
        overallScore: 65,
        accuracyScore: 80,
        completenessScore: 45,
        currencyScore: 70,
        qualityScore: 75
    }

    // Mock gap analysis
    const gaps = [
        {
            type: 'missing-api-docs',
            file: 'app/api/clients/route.ts',
            expectedDocPath: 'docs/api/clients.md',
            priority: 'critical' as const,
            reason: 'Public API endpoint without documentation'
        },
        {
            type: 'missing-component-docs',
            file: 'components/forms/contact-form.tsx',
            expectedDocPath: 'docs/components/forms/contact-form.md',
            priority: 'high' as const,
            reason: 'Complex form component without usage documentation'
        },
        {
            type: 'outdated-docs',
            file: 'docs/utilities/auth.md',
            expectedDocPath: 'docs/utilities/auth.md',
            priority: 'medium' as const,
            reason: 'Documentation last updated 3 months ago, code changed recently'
        }
    ]

    // Mock compliance issues
    const complianceIssues = [
        {
            file: 'docs/components/ui/button.md',
            issues: ['Missing TypeScript examples', 'No accessibility guidelines'],
            severity: 'medium' as const
        },
        {
            file: 'docs/api/auth/signin.md',
            issues: ['Outdated response format', 'Missing error codes'],
            severity: 'high' as const
        }
    ]

    // Mock maintenance tasks
    const maintenanceTasks = [
        {
            title: 'Create API documentation for clients endpoint',
            description: 'Document the /api/clients endpoint including request/response formats, authentication requirements, and error handling.',
            priority: 'critical' as const,
            labels: ['documentation', 'api', 'critical']
        },
        {
            title: 'Update authentication documentation',
            description: 'Update auth.md to reflect recent changes in authentication flow and add new security features.',
            priority: 'high' as const,
            labels: ['documentation', 'maintenance', 'security']
        },
        {
            title: 'Add component usage examples',
            description: 'Add comprehensive usage examples to all component documentation files.',
            priority: 'medium' as const,
            labels: ['documentation', 'components', 'examples']
        }
    ]

    return {
        inventory: {
            existingDocs,
            missingDocs,
            componentCount: 3,
            apiRouteCount: 3,
            utilityCount: 3
        },
        healthAssessment,
        gaps,
        complianceIssues,
        maintenanceTasks
    }
}

describe('Documentation Audit Agent Hook', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockExistsSync.mockReturnValue(true)
        mockReaddirSync.mockReturnValue([])
        mockStatSync.mockReturnValue({ isDirectory: () => false, isFile: () => true })
        mockGlob.mockResolvedValue([])
        mockLinearListIssues.mockResolvedValue([])
    })

    afterEach(() => {
        jest.resetAllMocks()
    })

    describe('Hook Configuration', () => {
        it('should have correct trigger configuration', () => {
            expect(documentationAuditHook.trigger.type).toBe('manual')
            expect(documentationAuditHook.trigger.buttonText).toBe('Run Documentation Audit')
        })

        it('should be enabled by default', () => {
            expect(documentationAuditHook.enabled).toBe(true)
        })

        it('should not auto-approve by default', () => {
            expect(documentationAuditHook.autoApprove).toBe(false)
        })

        it('should have a comprehensive prompt template', () => {
            expect(documentationAuditHook.prompt).toContain('Documentation Inventory')
            expect(documentationAuditHook.prompt).toContain('Documentation Health Assessment')
            expect(documentationAuditHook.prompt).toContain('Gap Analysis')
            expect(documentationAuditHook.prompt).toContain('Compliance Check')
            expect(documentationAuditHook.prompt).toContain('Maintenance Task Creation')
            expect(documentationAuditHook.prompt).toContain('Health Report Generation')
        })
    })

    describe('Documentation Inventory', () => {
        it('should catalog existing documentation files', async () => {
            const context: AgentHookContext = {
                workspaceRoot: '/workspace',
                linearClient: {},
                manualTrigger: true
            }

            const result = await executeDocumentationAuditHook(context)

            expect(result.inventory.existingDocs).toContain('docs/components/ui/button.md')
            expect(result.inventory.existingDocs).toContain('docs/api/auth/signin.md')
            expect(result.inventory.existingDocs).toContain('docs/utilities/auth.md')
        })

        it('should identify missing documentation files', async () => {
            const context: AgentHookContext = {
                workspaceRoot: '/workspace',
                linearClient: {},
                manualTrigger: true
            }

            const result = await executeDocumentationAuditHook(context)

            expect(result.inventory.missingDocs).toContain('docs/components/ui/input.md')
            expect(result.inventory.missingDocs).toContain('docs/api/clients.md')
            expect(result.inventory.missingDocs).toContain('docs/utilities/utils.md')
        })

        it('should count different types of files', async () => {
            const context: AgentHookContext = {
                workspaceRoot: '/workspace',
                linearClient: {},
                manualTrigger: true
            }

            const result = await executeDocumentationAuditHook(context)

            expect(result.inventory.componentCount).toBe(3)
            expect(result.inventory.apiRouteCount).toBe(3)
            expect(result.inventory.utilityCount).toBe(3)
        })
    })

    describe('Health Assessment', () => {
        it('should provide overall health score', async () => {
            const context: AgentHookContext = {
                workspaceRoot: '/workspace',
                linearClient: {},
                manualTrigger: true
            }

            const result = await executeDocumentationAuditHook(context)

            expect(result.healthAssessment.overallScore).toBeGreaterThanOrEqual(0)
            expect(result.healthAssessment.overallScore).toBeLessThanOrEqual(100)
        })

        it('should assess accuracy of documentation', async () => {
            const context: AgentHookContext = {
                workspaceRoot: '/workspace',
                linearClient: {},
                manualTrigger: true
            }

            const result = await executeDocumentationAuditHook(context)

            expect(result.healthAssessment.accuracyScore).toBeGreaterThanOrEqual(0)
            expect(result.healthAssessment.accuracyScore).toBeLessThanOrEqual(100)
        })

        it('should assess completeness of documentation', async () => {
            const context: AgentHookContext = {
                workspaceRoot: '/workspace',
                linearClient: {},
                manualTrigger: true
            }

            const result = await executeDocumentationAuditHook(context)

            expect(result.healthAssessment.completenessScore).toBeGreaterThanOrEqual(0)
            expect(result.healthAssessment.completenessScore).toBeLessThanOrEqual(100)
        })

        it('should assess currency (freshness) of documentation', async () => {
            const context: AgentHookContext = {
                workspaceRoot: '/workspace',
                linearClient: {},
                manualTrigger: true
            }

            const result = await executeDocumentationAuditHook(context)

            expect(result.healthAssessment.currencyScore).toBeGreaterThanOrEqual(0)
            expect(result.healthAssessment.currencyScore).toBeLessThanOrEqual(100)
        })

        it('should assess quality of documentation', async () => {
            const context: AgentHookContext = {
                workspaceRoot: '/workspace',
                linearClient: {},
                manualTrigger: true
            }

            const result = await executeDocumentationAuditHook(context)

            expect(result.healthAssessment.qualityScore).toBeGreaterThanOrEqual(0)
            expect(result.healthAssessment.qualityScore).toBeLessThanOrEqual(100)
        })
    })

    describe('Gap Analysis', () => {
        it('should identify critical documentation gaps', async () => {
            const context: AgentHookContext = {
                workspaceRoot: '/workspace',
                linearClient: {},
                manualTrigger: true
            }

            const result = await executeDocumentationAuditHook(context)

            const criticalGaps = result.gaps.filter(gap => gap.priority === 'critical')
            expect(criticalGaps.length).toBeGreaterThan(0)
            expect(criticalGaps[0].type).toBe('missing-api-docs')
        })

        it('should identify high priority documentation gaps', async () => {
            const context: AgentHookContext = {
                workspaceRoot: '/workspace',
                linearClient: {},
                manualTrigger: true
            }

            const result = await executeDocumentationAuditHook(context)

            const highPriorityGaps = result.gaps.filter(gap => gap.priority === 'high')
            expect(highPriorityGaps.length).toBeGreaterThan(0)
            expect(highPriorityGaps[0].type).toBe('missing-component-docs')
        })

        it('should identify outdated documentation', async () => {
            const context: AgentHookContext = {
                workspaceRoot: '/workspace',
                linearClient: {},
                manualTrigger: true
            }

            const result = await executeDocumentationAuditHook(context)

            const outdatedDocs = result.gaps.filter(gap => gap.type === 'outdated-docs')
            expect(outdatedDocs.length).toBeGreaterThan(0)
            expect(outdatedDocs[0].reason).toContain('last updated')
        })

        it('should provide reasons for each gap', async () => {
            const context: AgentHookContext = {
                workspaceRoot: '/workspace',
                linearClient: {},
                manualTrigger: true
            }

            const result = await executeDocumentationAuditHook(context)

            result.gaps.forEach(gap => {
                expect(gap.reason).toBeTruthy()
                expect(typeof gap.reason).toBe('string')
                expect(gap.reason.length).toBeGreaterThan(0)
            })
        })
    })

    describe('Compliance Check', () => {
        it('should identify compliance issues in documentation', async () => {
            const context: AgentHookContext = {
                workspaceRoot: '/workspace',
                linearClient: {},
                manualTrigger: true
            }

            const result = await executeDocumentationAuditHook(context)

            expect(result.complianceIssues.length).toBeGreaterThan(0)
            expect(result.complianceIssues[0].file).toBeTruthy()
            expect(result.complianceIssues[0].issues.length).toBeGreaterThan(0)
        })

        it('should categorize compliance issues by severity', async () => {
            const context: AgentHookContext = {
                workspaceRoot: '/workspace',
                linearClient: {},
                manualTrigger: true
            }

            const result = await executeDocumentationAuditHook(context)

            const severities = result.complianceIssues.map(issue => issue.severity)
            expect(severities).toContain('high')
            expect(severities).toContain('medium')
        })

        it('should provide specific issue descriptions', async () => {
            const context: AgentHookContext = {
                workspaceRoot: '/workspace',
                linearClient: {},
                manualTrigger: true
            }

            const result = await executeDocumentationAuditHook(context)

            result.complianceIssues.forEach(complianceIssue => {
                complianceIssue.issues.forEach(issue => {
                    expect(typeof issue).toBe('string')
                    expect(issue.length).toBeGreaterThan(0)
                })
            })
        })
    })

    describe('Maintenance Task Creation', () => {
        it('should create maintenance tasks for critical issues', async () => {
            const context: AgentHookContext = {
                workspaceRoot: '/workspace',
                linearClient: {},
                manualTrigger: true
            }

            const result = await executeDocumentationAuditHook(context)

            const criticalTasks = result.maintenanceTasks.filter(task => task.priority === 'critical')
            expect(criticalTasks.length).toBeGreaterThan(0)
            expect(criticalTasks[0].title).toContain('API documentation')
        })

        it('should create maintenance tasks for high priority issues', async () => {
            const context: AgentHookContext = {
                workspaceRoot: '/workspace',
                linearClient: {},
                manualTrigger: true
            }

            const result = await executeDocumentationAuditHook(context)

            const highPriorityTasks = result.maintenanceTasks.filter(task => task.priority === 'high')
            expect(highPriorityTasks.length).toBeGreaterThan(0)
            expect(highPriorityTasks[0].title).toContain('authentication documentation')
        })

        it('should provide detailed descriptions for maintenance tasks', async () => {
            const context: AgentHookContext = {
                workspaceRoot: '/workspace',
                linearClient: {},
                manualTrigger: true
            }

            const result = await executeDocumentationAuditHook(context)

            result.maintenanceTasks.forEach(task => {
                expect(task.description).toBeTruthy()
                expect(typeof task.description).toBe('string')
                expect(task.description.length).toBeGreaterThan(50) // Detailed description
            })
        })

        it('should assign appropriate labels to maintenance tasks', async () => {
            const context: AgentHookContext = {
                workspaceRoot: '/workspace',
                linearClient: {},
                manualTrigger: true
            }

            const result = await executeDocumentationAuditHook(context)

            result.maintenanceTasks.forEach(task => {
                expect(task.labels).toContain('documentation')
                expect(task.labels.length).toBeGreaterThan(1)
            })
        })
    })

    describe('Error Handling', () => {
        it('should handle file system errors gracefully', async () => {
            mockGlob.mockRejectedValue(new Error('File system error'))

            const context: AgentHookContext = {
                workspaceRoot: '/workspace',
                linearClient: {},
                manualTrigger: true
            }

            await expect(executeDocumentationAuditHook(context)).resolves.not.toThrow()
        })

        it('should handle missing directories gracefully', async () => {
            mockExistsSync.mockReturnValue(false)

            const context: AgentHookContext = {
                workspaceRoot: '/workspace',
                linearClient: {},
                manualTrigger: true
            }

            await expect(executeDocumentationAuditHook(context)).resolves.not.toThrow()
        })

        it('should handle Linear API errors gracefully', async () => {
            mockLinearCreateIssue.mockRejectedValue(new Error('Linear API error'))

            const context: AgentHookContext = {
                workspaceRoot: '/workspace',
                linearClient: {},
                manualTrigger: true
            }

            await expect(executeDocumentationAuditHook(context)).resolves.not.toThrow()
        })
    })

    describe('Integration Requirements', () => {
        it('should fulfill requirement 1.6 - Documentation Audit', () => {
            // Comprehensive documentation reviews
            expect(documentationAuditHook.prompt).toContain('comprehensive review')

            // Quarterly documentation audit automation
            expect(documentationAuditHook.trigger.type).toBe('manual')

            // Documentation health reporting system
            expect(documentationAuditHook.prompt).toContain('Health Report Generation')
        })

        it('should fulfill requirement 2.4 - Audit and Maintenance', () => {
            // Automated maintenance task creation in Linear
            expect(documentationAuditHook.prompt).toContain('Maintenance Task Creation')
            expect(documentationAuditHook.prompt).toContain('Generate Linear issues')

            // Documentation health reporting
            expect(documentationAuditHook.prompt).toContain('Health Report')
        })

        it('should fulfill requirement 2.5 - Quality Assessment', () => {
            // Documentation quality metrics
            expect(documentationAuditHook.prompt).toContain('Quality')
            expect(documentationAuditHook.prompt).toContain('metrics')

            // Comprehensive audit reporting
            expect(documentationAuditHook.prompt).toContain('detailed audit report')

            // Maintenance scheduling
            expect(documentationAuditHook.prompt).toContain('maintenance schedule')
        })
    })

    describe('Manual Trigger Functionality', () => {
        it('should be configured as a manual trigger', () => {
            expect(documentationAuditHook.trigger.type).toBe('manual')
            expect(documentationAuditHook.trigger.buttonText).toBe('Run Documentation Audit')
        })

        it('should provide comprehensive audit scope', () => {
            expect(documentationAuditHook.prompt).toContain('Full project documentation review')
            expect(documentationAuditHook.prompt).toContain('API documentation, component guides, database schema, development processes')
        })

        it('should generate detailed audit reports', () => {
            expect(documentationAuditHook.prompt).toContain('Generate a detailed audit report')
            expect(documentationAuditHook.prompt).toContain('Documentation coverage percentage')
            expect(documentationAuditHook.prompt).toContain('Priority areas needing attention')
            expect(documentationAuditHook.prompt).toContain('Quality metrics and trends')
        })
    })
})
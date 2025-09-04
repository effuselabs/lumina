/**
 * Documentation Workflow Integration
 * Central module for all documentation workflow functionality
 */

// Re-export all documentation workflow utilities
export * from './documentation-audit'
export * from './documentation-sync'
export * from './steering-compliance'

// Central configuration for documentation workflow
export const DOCUMENTATION_WORKFLOW_CONFIG = {
    // File patterns that trigger documentation checks
    WATCHED_PATTERNS: [
        'src/**/*.tsx',
        'src/**/*.ts',
        'app/**/*.tsx',
        'app/**/*.ts',
        'components/**/*.tsx',
        'components/**/*.ts',
        'lib/**/*.ts',
        'types/**/*.ts',
        'prisma/schema.prisma'
    ],

    // Documentation directories
    DOCS_PATHS: {
        components: 'docs/components/',
        api: 'docs/api/',
        database: 'docs/database/',
        utilities: 'docs/utilities/',
        processes: 'docs/processes/'
    },

    // Steering files and their applicable patterns
    STEERING_FILES: {
        'api-standards.md': ['app/api/**/*.ts'],
        'ui-standards.md': ['components/**/*.tsx', 'app/**/*.tsx'],
        'database-standards.md': ['prisma/**/*.prisma', 'lib/prisma.ts'],
        'security.md': ['lib/auth.ts', 'middleware.ts', 'app/api/**/*.ts'],
        'coding-approach-and-standards.md': ['**/*.ts', '**/*.tsx']
    },

    // Linear integration settings
    LINEAR_CONFIG: {
        labels: {
            documentation: 'documentation',
            compliance: 'compliance',
            maintenance: 'maintenance',
            codeQuality: 'code-quality'
        },
        priorities: {
            critical: 1,
            high: 2,
            normal: 3,
            low: 4
        }
    },

    // Audit schedule
    AUDIT_SCHEDULE: {
        frequency: 'quarterly', // every 3 months
        reminderDays: 7 // remind 7 days before next audit
    }
}

/**
 * Main entry point for documentation workflow processing
 */
export async function processDocumentationWorkflow(
    changedFiles: string[],
    workflowType: 'sync' | 'compliance' | 'audit'
) {
    const results = {
        sync: null as any,
        compliance: null as any,
        audit: null as any,
        linearIssues: [] as any[]
    }

    try {
        switch (workflowType) {
            case 'sync':
                // Process documentation sync for changed files
                const { analyzeFileForDocumentation, generateLinearIssueData } = await import('./documentation-sync')

                for (const file of changedFiles) {
                    const analysis = analyzeFileForDocumentation(file)
                    if (analysis.requiresDocumentation) {
                        const issueData = generateLinearIssueData(analysis)
                        if (issueData) {
                            results.linearIssues.push(issueData)
                        }
                    }
                }
                results.sync = { processedFiles: changedFiles.length, issuesCreated: results.linearIssues.length }
                break

            case 'compliance':
                // Process steering compliance for changed files
                const { analyzeFileCompliance, generateComplianceIssueData } = await import('./steering-compliance')

                for (const file of changedFiles) {
                    // In a real implementation, we would read the file content
                    const fileContent = '' // This would be the actual file content
                    const complianceResult = analyzeFileCompliance(file, fileContent)

                    if (!complianceResult.compliant) {
                        const issueData = generateComplianceIssueData(complianceResult)
                        if (issueData) {
                            results.linearIssues.push(issueData)
                        }
                    }
                }
                results.compliance = { processedFiles: changedFiles.length, violationsFound: results.linearIssues.length }
                break

            case 'audit':
                // Perform comprehensive documentation audit
                const { performDocumentationAudit, generateMaintenanceLinearIssues, generateAuditReport } = await import('./documentation-audit')

                const auditResult = await performDocumentationAudit()
                const maintenanceIssues = await generateMaintenanceLinearIssues(auditResult.maintenanceTasks)
                const auditReport = await generateAuditReport(auditResult)

                results.audit = {
                    report: auditReport,
                    tasksCreated: maintenanceIssues.length,
                    healthScore: auditResult.metrics?.qualityScore || 0.8
                }
                results.linearIssues = maintenanceIssues
                break
        }

        return results
    } catch (error) {
        console.error(`Documentation workflow error (${workflowType}):`, error)
        throw error
    }
}

/**
 * Utility to check if a file should trigger documentation workflow
 */
export function shouldTriggerWorkflow(filePath: string): boolean {
    return DOCUMENTATION_WORKFLOW_CONFIG.WATCHED_PATTERNS.some(pattern => {
        const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'))
        return regex.test(filePath)
    })
}

/**
 * Get applicable steering files for a given file path
 */
export function getApplicableSteeringFiles(filePath: string): string[] {
    const applicable: string[] = []

    for (const [steeringFile, patterns] of Object.entries(DOCUMENTATION_WORKFLOW_CONFIG.STEERING_FILES)) {
        const isApplicable = patterns.some(pattern => {
            const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'))
            return regex.test(filePath)
        })

        if (isApplicable) {
            applicable.push(steeringFile)
        }
    }

    return applicable
}
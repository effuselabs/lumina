/**
 * Documentation Sync Utilities
 * Provides functionality for analyzing code changes and determining documentation requirements
 */

export interface DocumentationRequirement {
    filePath: string
    documentationType: 'component' | 'api' | 'utility' | 'database' | 'feature'
    requiredDocPath: string
    priority: 'critical' | 'high' | 'medium' | 'low'
    description: string
    exists: boolean
    lastUpdated?: Date
}

export interface DocumentationAnalysis {
    changedFile: string
    requiresDocumentation: boolean
    requirements: DocumentationRequirement[]
    suggestedActions: string[]
}

/**
 * Analyzes a file path to determine what type of documentation it might need
 */
export function analyzeFileForDocumentation(filePath: string): DocumentationAnalysis {
    const requirements: DocumentationRequirement[] = []
    const suggestedActions: string[] = []

    // Component files
    if (filePath.match(/components\/.*\.(tsx|ts)$/)) {
        const componentName = extractComponentName(filePath)
        requirements.push({
            filePath,
            documentationType: 'component',
            requiredDocPath: `docs/components/${componentName}.md`,
            priority: 'high',
            description: `Component documentation for ${componentName}`,
            exists: false // This would be checked against actual file system
        })
        suggestedActions.push(`Create or update component documentation for ${componentName}`)
    }

    // API routes
    if (filePath.match(/app\/api\/.*\.(ts|tsx)$/)) {
        const routeName = extractApiRouteName(filePath)
        requirements.push({
            filePath,
            documentationType: 'api',
            requiredDocPath: `docs/api/${routeName}.md`,
            priority: 'critical',
            description: `API documentation for ${routeName} endpoint`,
            exists: false
        })
        suggestedActions.push(`Create or update API documentation for ${routeName}`)
    }

    // Database schema changes
    if (filePath.includes('prisma/schema.prisma')) {
        requirements.push({
            filePath,
            documentationType: 'database',
            requiredDocPath: 'docs/database/schema.md',
            priority: 'high',
            description: 'Database schema documentation',
            exists: false
        })
        suggestedActions.push('Update database schema documentation')
    }

    // Utility functions
    if (filePath.match(/lib\/.*\.ts$/) && !filePath.includes('documentation-sync.ts')) {
        const utilityName = extractUtilityName(filePath)
        requirements.push({
            filePath,
            documentationType: 'utility',
            requiredDocPath: `docs/utilities/${utilityName}.md`,
            priority: 'medium',
            description: `Utility documentation for ${utilityName}`,
            exists: false
        })
        suggestedActions.push(`Document utility functions in ${utilityName}`)
    }

    return {
        changedFile: filePath,
        requiresDocumentation: requirements.length > 0,
        requirements,
        suggestedActions
    }
}

/**
 * Extracts component name from file path
 */
function extractComponentName(filePath: string): string {
    const fileName = filePath.split('/').pop() || ''
    return fileName.replace(/\.(tsx|ts)$/, '')
}

/**
 * Extracts API route name from file path
 */
function extractApiRouteName(filePath: string): string {
    const pathParts = filePath.split('/')
    const apiIndex = pathParts.indexOf('api')
    if (apiIndex !== -1 && apiIndex < pathParts.length - 1) {
        return pathParts.slice(apiIndex + 1).join('/').replace(/\.(ts|tsx)$/, '')
    }
    return 'unknown-route'
}

/**
 * Extracts utility name from file path
 */
function extractUtilityName(filePath: string): string {
    const fileName = filePath.split('/').pop() || ''
    return fileName.replace(/\.ts$/, '')
}

/**
 * Generates Linear issue data for documentation requirements
 */
export function generateLinearIssueData(analysis: DocumentationAnalysis) {
    if (!analysis.requiresDocumentation) {
        return null
    }

    const fileName = analysis.changedFile.split('/').pop() || 'unknown'
    const title = `Documentation Update: ${fileName}`

    const description = `
## Documentation Update Required

**Modified File**: \`${analysis.changedFile}\`

### Required Documentation Updates:

${analysis.requirements.map(req => `
- **${req.documentationType.toUpperCase()}**: ${req.description}
  - Path: \`${req.requiredDocPath}\`
  - Priority: ${req.priority}
  - Status: ${req.exists ? 'Update existing' : 'Create new'}
`).join('')}

### Suggested Actions:

${analysis.suggestedActions.map(action => `- ${action}`).join('\n')}

### Requirements Reference:
- Requirement 1.1: Documentation updates integrated into development workflow
- Requirement 1.4: Linear issue creation for documentation updates
- Requirement 1.5: Documentation completeness validation
  `

    return {
        title,
        description: description.trim(),
        labels: ['documentation', 'maintenance'],
        priority: analysis.requirements.some(r => r.priority === 'critical') ? 2 : 3 // High or Normal priority
    }
}
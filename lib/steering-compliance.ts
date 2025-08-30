/**
 * Steering Compliance Utilities
 * Provides functionality for validating code against steering file guidelines
 */

export interface ComplianceViolation {
    rule: string
    severity: 'error' | 'warning' | 'info'
    description: string
    filePath: string
    lineNumber?: number
    fixSuggestion: string
    steeringFileReference: string
}

export interface ComplianceResult {
    filePath: string
    compliant: boolean
    applicableSteering: string[]
    violations: ComplianceViolation[]
    autoFixAvailable: boolean
    overallSeverity: 'error' | 'warning' | 'info' | 'clean'
}

export interface SteeringRule {
    id: string
    name: string
    description: string
    pattern: RegExp
    severity: 'error' | 'warning' | 'info'
    fixSuggestion: string
    applicableFiles: string[]
}

/**
 * Predefined steering rules based on the project's steering files
 */
export const STEERING_RULES: SteeringRule[] = [
    // Naming Convention Rules
    {
        id: 'component-naming',
        name: 'Component File Naming',
        description: 'Component files should use kebab-case naming',
        pattern: /components\/.*[A-Z].*\.(tsx|ts)$/,
        severity: 'warning',
        fixSuggestion: 'Rename component files to use kebab-case (e.g., BookingForm.tsx → booking-form.tsx)',
        applicableFiles: ['components/**/*.tsx', 'components/**/*.ts']
    },

    // Multi-tenant Business Scoping Rules
    {
        id: 'business-scoping-missing',
        name: 'Missing Business Context',
        description: 'Database queries must include businessId for multi-tenant isolation',
        pattern: /prisma\.\w+\.findMany\((?![^}]*businessId)/,
        severity: 'error',
        fixSuggestion: 'Add businessId to query: { where: { businessId, ... } }',
        applicableFiles: ['**/*.ts', '**/*.tsx']
    },

    // TypeScript Strict Mode Rules
    {
        id: 'any-type-usage',
        name: 'TypeScript Any Type',
        description: 'Avoid using "any" type, use proper TypeScript types',
        pattern: /:\s*any\b/,
        severity: 'warning',
        fixSuggestion: 'Replace "any" with specific TypeScript types or interfaces',
        applicableFiles: ['**/*.ts', '**/*.tsx']
    },

    // API Route Rules
    {
        id: 'api-error-handling',
        name: 'API Error Handling',
        description: 'API routes must implement proper error handling',
        pattern: /export\s+async\s+function\s+(GET|POST|PUT|DELETE)(?![\s\S]*try[\s\S]*catch)/,
        severity: 'error',
        fixSuggestion: 'Wrap API route logic in try-catch blocks with proper error responses',
        applicableFiles: ['app/api/**/*.ts']
    },

    // Security Rules
    {
        id: 'auth-middleware-missing',
        name: 'Missing Authentication',
        description: 'Protected API routes must validate authentication',
        pattern: /export\s+async\s+function\s+(POST|PUT|DELETE)(?![\s\S]*auth)/,
        severity: 'error',
        fixSuggestion: 'Add authentication validation using auth utilities from lib/auth.ts',
        applicableFiles: ['app/api/**/*.ts']
    },

    // Database Rules
    {
        id: 'missing-timestamps',
        name: 'Missing Timestamps',
        description: 'Database models should include createdAt and updatedAt fields',
        pattern: /model\s+\w+\s*{(?![\s\S]*createdAt)[\s\S]*?}/,
        severity: 'warning',
        fixSuggestion: 'Add createdAt DateTime @default(now()) and updatedAt DateTime @updatedAt fields',
        applicableFiles: ['prisma/schema.prisma']
    }
]

/**
 * Analyzes a file for steering compliance violations
 */
export function analyzeFileCompliance(filePath: string, fileContent: string): ComplianceResult {
    const violations: ComplianceViolation[] = []
    const applicableSteering: string[] = []

    // Determine applicable steering files based on file path
    if (filePath.includes('app/api/')) {
        applicableSteering.push('api-standards.md', 'security.md')
    }
    if (filePath.includes('components/')) {
        applicableSteering.push('ui-standards.md')
    }
    if (filePath.includes('prisma/')) {
        applicableSteering.push('database-standards.md')
    }
    if (filePath.includes('lib/auth') || filePath.includes('middleware')) {
        applicableSteering.push('security.md')
    }

    // Always apply general coding standards
    applicableSteering.push('coding-approach-and-standards.md')

    // Check each applicable rule
    for (const rule of STEERING_RULES) {
        const isApplicable = rule.applicableFiles.some(pattern =>
            new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*')).test(filePath)
        )

        if (isApplicable && rule.pattern.test(fileContent)) {
            violations.push({
                rule: rule.id,
                severity: rule.severity,
                description: rule.description,
                filePath,
                fixSuggestion: rule.fixSuggestion,
                steeringFileReference: getSteeringFileForRule(rule.id)
            })
        }
    }

    // Determine overall severity
    const overallSeverity = violations.length === 0 ? 'clean' :
        violations.some(v => v.severity === 'error') ? 'error' :
            violations.some(v => v.severity === 'warning') ? 'warning' : 'info'

    return {
        filePath,
        compliant: violations.length === 0,
        applicableSteering,
        violations,
        autoFixAvailable: violations.some(v => v.fixSuggestion.includes('Replace') || v.fixSuggestion.includes('Add')),
        overallSeverity
    }
}

/**
 * Maps rule IDs to their corresponding steering files
 */
function getSteeringFileForRule(ruleId: string): string {
    const ruleToSteeringMap: Record<string, string> = {
        'component-naming': 'coding-approach-and-standards.md',
        'business-scoping-missing': 'database-standards.md',
        'any-type-usage': 'coding-approach-and-standards.md',
        'api-error-handling': 'api-standards.md',
        'auth-middleware-missing': 'security.md',
        'missing-timestamps': 'database-standards.md'
    }

    return ruleToSteeringMap[ruleId] || 'coding-approach-and-standards.md'
}

/**
 * Generates Linear issue data for compliance violations
 */
export function generateComplianceIssueData(result: ComplianceResult) {
    if (result.compliant) {
        return null
    }

    const fileName = result.filePath.split('/').pop() || 'unknown'
    const errorCount = result.violations.filter(v => v.severity === 'error').length
    const warningCount = result.violations.filter(v => v.severity === 'warning').length

    const title = `Steering Compliance: ${fileName} (${errorCount} errors, ${warningCount} warnings)`

    const description = `
## Steering Compliance Violations

**File**: \`${result.filePath}\`
**Applicable Steering**: ${result.applicableSteering.map(s => `\`${s}\``).join(', ')}

### Violations Found:

${result.violations.map(violation => `
#### ${violation.severity.toUpperCase()}: ${violation.rule}

**Description**: ${violation.description}

**Fix Suggestion**: ${violation.fixSuggestion}

**Reference**: \`${violation.steeringFileReference}\`
`).join('')}

### Requirements Reference:
- Requirement 2.1: Steering file compliance validation
- Requirement 2.2: Compliance checking for API routes, components, and database files
- Requirement 2.3: Automated Linear issue updates for compliance violations
  `

    return {
        title,
        description: description.trim(),
        labels: ['compliance', 'code-quality', result.overallSeverity],
        priority: result.overallSeverity === 'error' ? 1 : 3 // Urgent for errors, Normal for warnings
    }
}

/**
 * Generates fix suggestions for common compliance violations
 */
export function generateFixSuggestions(violations: ComplianceViolation[]): string[] {
    const suggestions: string[] = []

    for (const violation of violations) {
        switch (violation.rule) {
            case 'business-scoping-missing':
                suggestions.push('Add businessId validation to all database queries')
                suggestions.push('Import business context from middleware or session')
                break
            case 'api-error-handling':
                suggestions.push('Wrap API logic in try-catch blocks')
                suggestions.push('Return proper HTTP status codes (400, 401, 403, 500)')
                suggestions.push('Log errors for debugging and monitoring')
                break
            case 'auth-middleware-missing':
                suggestions.push('Import auth utilities: import { validateAuth } from "@/lib/auth"')
                suggestions.push('Add authentication check at the start of the API route')
                break
            default:
                suggestions.push(violation.fixSuggestion)
        }
    }

    return [...new Set(suggestions)] // Remove duplicates
}
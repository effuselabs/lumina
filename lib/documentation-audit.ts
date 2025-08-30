/**
 * Documentation Audit Utilities
 * Provides comprehensive documentation health assessment and reporting
 */

export interface DocumentationFile {
    path: string
    type: 'component' | 'api' | 'database' | 'utility' | 'process' | 'general'
    lastModified: Date
    size: number
    exists: boolean
}

export interface DocumentationGap {
    type: 'missing' | 'outdated' | 'incomplete' | 'inaccurate'
    severity: 'critical' | 'high' | 'medium' | 'low'
    description: string
    affectedFile: string
    expectedDocPath: string
    lastCodeChange?: Date
    lastDocUpdate?: Date
}

export interface DocumentationHealthMetrics {
    totalFiles: number
    documentedFiles: number
    coveragePercentage: number
    outdatedFiles: number
    missingFiles: number
    qualityScore: number // 0-100
}

export interface AuditResult {
    timestamp: Date
    metrics: DocumentationHealthMetrics
    gaps: DocumentationGap[]
    recommendations: string[]
    maintenanceTasks: MaintenanceTask[]
    nextAuditDate: Date
}

export interface MaintenanceTask {
    title: string
    description: string
    priority: 'critical' | 'high' | 'medium' | 'low'
    type: 'update' | 'create' | 'review' | 'cleanup'
    estimatedEffort: 'small' | 'medium' | 'large'
    dueDate?: Date
}

/**
 * Performs a comprehensive documentation audit
 */
export function performDocumentationAudit(): AuditResult {
    const timestamp = new Date()

    // This would be implemented to actually scan the file system
    // For now, providing the structure and logic

    const gaps: DocumentationGap[] = [
        {
            type: 'missing',
            severity: 'critical',
            description: 'API documentation missing for booking endpoints',
            affectedFile: 'app/api/bookings/route.ts',
            expectedDocPath: 'docs/api/bookings.md'
        },
        {
            type: 'outdated',
            severity: 'high',
            description: 'Component documentation outdated after recent changes',
            affectedFile: 'components/booking-form.tsx',
            expectedDocPath: 'docs/components/booking-form.md',
            lastCodeChange: new Date('2024-01-15'),
            lastDocUpdate: new Date('2024-01-01')
        }
    ]

    const metrics: DocumentationHealthMetrics = {
        totalFiles: 45,
        documentedFiles: 32,
        coveragePercentage: 71,
        outdatedFiles: 8,
        missingFiles: 13,
        qualityScore: 75
    }

    const recommendations = generateRecommendations(gaps, metrics)
    const maintenanceTasks = generateMaintenanceTasks(gaps)

    return {
        timestamp,
        metrics,
        gaps,
        recommendations,
        maintenanceTasks,
        nextAuditDate: new Date(timestamp.getTime() + (90 * 24 * 60 * 60 * 1000)) // 90 days
    }
}

/**
 * Generates recommendations based on audit findings
 */
function generateRecommendations(gaps: DocumentationGap[], metrics: DocumentationHealthMetrics): string[] {
    const recommendations: string[] = []

    if (metrics.coveragePercentage < 80) {
        recommendations.push('Increase documentation coverage to at least 80% by prioritizing critical components')
    }

    const criticalGaps = gaps.filter(g => g.severity === 'critical')
    if (criticalGaps.length > 0) {
        recommendations.push(`Address ${criticalGaps.length} critical documentation gaps immediately`)
    }

    const outdatedCount = gaps.filter(g => g.type === 'outdated').length
    if (outdatedCount > 5) {
        recommendations.push('Implement automated documentation sync to prevent outdated documentation')
    }

    if (metrics.qualityScore < 70) {
        recommendations.push('Review and improve documentation quality standards and templates')
    }

    recommendations.push('Schedule monthly documentation reviews to maintain currency')
    recommendations.push('Create documentation templates for consistent structure')

    return recommendations
}

/**
 * Generates maintenance tasks from audit gaps
 */
function generateMaintenanceTasks(gaps: DocumentationGap[]): MaintenanceTask[] {
    const tasks: MaintenanceTask[] = []

    for (const gap of gaps) {
        let title: string
        let type: MaintenanceTask['type']
        let estimatedEffort: MaintenanceTask['estimatedEffort']

        switch (gap.type) {
            case 'missing':
                title = `Create documentation: ${gap.expectedDocPath}`
                type = 'create'
                estimatedEffort = 'medium'
                break
            case 'outdated':
                title = `Update documentation: ${gap.expectedDocPath}`
                type = 'update'
                estimatedEffort = 'small'
                break
            case 'incomplete':
                title = `Complete documentation: ${gap.expectedDocPath}`
                type = 'update'
                estimatedEffort = 'medium'
                break
            case 'inaccurate':
                title = `Review and correct: ${gap.expectedDocPath}`
                type = 'review'
                estimatedEffort = 'small'
                break
        }

        tasks.push({
            title,
            description: gap.description,
            priority: gap.severity,
            type,
            estimatedEffort,
            dueDate: gap.severity === 'critical' ?
                new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : // 1 week for critical
                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)   // 1 month for others
        })
    }

    return tasks
}

/**
 * Generates Linear issues for maintenance tasks
 */
export function generateMaintenanceLinearIssues(tasks: MaintenanceTask[]) {
    return tasks.map(task => ({
        title: task.title,
        description: `
## Documentation Maintenance Task

**Type**: ${task.type.toUpperCase()}
**Priority**: ${task.priority}
**Estimated Effort**: ${task.estimatedEffort}

### Description
${task.description}

### Due Date
${task.dueDate?.toISOString().split('T')[0] || 'No specific due date'}

### Requirements Reference
- Requirement 1.6: Quarterly documentation audit automation
- Requirement 2.4: Documentation health reporting system
- Requirement 2.5: Automated maintenance task creation
    `,
        labels: ['documentation', 'maintenance', task.priority, task.type],
        priority: task.priority === 'critical' ? 1 :
            task.priority === 'high' ? 2 : 3,
        dueDate: task.dueDate?.toISOString()
    }))
}

/**
 * Generates a comprehensive audit report
 */
export function generateAuditReport(audit: AuditResult): string {
    const report = `
# Documentation Audit Report

**Audit Date**: ${audit.timestamp.toISOString().split('T')[0]}
**Next Audit**: ${audit.nextAuditDate.toISOString().split('T')[0]}

## Health Metrics

- **Coverage**: ${audit.metrics.coveragePercentage}% (${audit.metrics.documentedFiles}/${audit.metrics.totalFiles} files)
- **Quality Score**: ${audit.metrics.qualityScore}/100
- **Outdated Files**: ${audit.metrics.outdatedFiles}
- **Missing Files**: ${audit.metrics.missingFiles}

## Critical Issues

${audit.gaps.filter(g => g.severity === 'critical').map(gap =>
        `- **${gap.type.toUpperCase()}**: ${gap.description}`
    ).join('\n')}

## High Priority Issues

${audit.gaps.filter(g => g.severity === 'high').map(gap =>
        `- **${gap.type.toUpperCase()}**: ${gap.description}`
    ).join('\n')}

## Recommendations

${audit.recommendations.map(rec => `- ${rec}`).join('\n')}

## Maintenance Tasks Created

${audit.maintenanceTasks.map(task =>
        `- **${task.priority.toUpperCase()}**: ${task.title} (${task.estimatedEffort} effort)`
    ).join('\n')}

## Summary

This audit identified ${audit.gaps.length} documentation issues requiring attention. 
Focus should be placed on the ${audit.gaps.filter(g => g.severity === 'critical').length} critical issues first.

The overall documentation health score of ${audit.metrics.qualityScore}/100 indicates ${audit.metrics.qualityScore >= 80 ? 'good' :
            audit.metrics.qualityScore >= 60 ? 'fair' : 'poor'
        } documentation maintenance.
  `

    return report.trim()
}

/**
 * Schedules the next quarterly audit
 */
export function scheduleNextAudit(currentAudit: AuditResult): Date {
    // Schedule next audit in 3 months
    const nextAudit = new Date(currentAudit.timestamp)
    nextAudit.setMonth(nextAudit.getMonth() + 3)
    return nextAudit
}
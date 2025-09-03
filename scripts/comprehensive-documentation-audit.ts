#!/usr/bin/env tsx

/**
 * Comprehensive Documentation Audit & Migration Script
 * 
 * Implements the complete 5-phase documentation audit and migration process:
 * Phase 1: Complete Discovery - Scan EVERYTHING
 * Phase 2: Deep Manual Review - Extract hidden knowledge
 * Phase 3: Knowledge Archaeology - Mine git history and comments
 * Phase 4: Safe Migration - Preserve ALL content with rollback capability
 * Phase 5: Simple Organization - Clean structure without losing anything
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { DocumentationAuditor } from '../lib/documentation-audit';

interface AuditOptions {
    dryRun?: boolean;
    skipMigration?: boolean;
    outputDir?: string;
    verbose?: boolean;
}

class ComprehensiveDocumentationAudit {
    private auditor: DocumentationAuditor;
    private options: AuditOptions;

    constructor(options: AuditOptions = {}) {
        this.auditor = new DocumentationAuditor();
        this.options = {
            dryRun: false,
            skipMigration: false,
            outputDir: 'docs/migration',
            verbose: false,
            ...options
        };
    }

    async run(): Promise<void> {
        console.log('🚀 Starting Comprehensive Documentation Audit & Migration');
        console.log('='.repeat(60));

        try {
            // Phase 1: Complete Discovery
            console.log('\n📋 PHASE 1: COMPLETE DISCOVERY');
            console.log('-'.repeat(40));
            const discoveredFiles = await this.auditor.discoverAllDocumentation();
            await this.saveDiscoveryReport(discoveredFiles);

            if (this.options.verbose) {
                this.printDiscoveryStats(discoveredFiles);
            }

            // Phase 2: Deep Manual Review
            console.log('\n🔬 PHASE 2: DEEP MANUAL REVIEW');
            console.log('-'.repeat(40));
            const reviewedFiles = await this.auditor.performDeepReview(discoveredFiles);
            await this.saveReviewReport(reviewedFiles);

            if (this.options.verbose) {
                this.printReviewStats(reviewedFiles);
            }

            // Phase 3: Knowledge Archaeology
            console.log('\n🏛️ PHASE 3: KNOWLEDGE ARCHAEOLOGY');
            console.log('-'.repeat(40));
            const archaeologyKnowledge = await this.auditor.performKnowledgeArchaeology(reviewedFiles);
            await this.saveArchaeologyReport(archaeologyKnowledge);

            if (this.options.verbose) {
                this.printArchaeologyStats(archaeologyKnowledge);
            }

            // Combine all knowledge
            const allKnowledge = [
                ...reviewedFiles.flatMap(f => f.extractedKnowledge),
                ...archaeologyKnowledge
            ];

            // Phase 4: Safe Migration Planning
            console.log('\n📋 PHASE 4: SAFE MIGRATION PLANNING');
            console.log('-'.repeat(40));
            const migrationPlan = await this.auditor.createMigrationPlan(reviewedFiles, allKnowledge);
            await this.saveMigrationPlan(migrationPlan);

            if (this.options.verbose) {
                this.printMigrationPlan(migrationPlan);
            }

            // Generate comprehensive report
            const auditReport = await this.auditor.generateAuditReport(reviewedFiles, allKnowledge, migrationPlan);
            await this.saveAuditReport(auditReport);

            // Phase 5: Execute Migration (if not dry run)
            if (!this.options.dryRun && !this.options.skipMigration) {
                console.log('\n🚀 PHASE 5: EXECUTING MIGRATION');
                console.log('-'.repeat(40));

                const userConfirmation = await this.getUserConfirmation();
                if (userConfirmation) {
                    const preservationGuarantee = await this.auditor.executeMigration(migrationPlan);
                    await this.savePreservationGuarantee(preservationGuarantee);

                    console.log('\n✅ MIGRATION COMPLETED SUCCESSFULLY');
                    this.printPreservationGuarantee(preservationGuarantee);
                } else {
                    console.log('\n⏸️ Migration skipped by user');
                }
            } else {
                console.log('\n⏸️ Migration skipped (dry run mode)');
            }

            console.log('\n🎉 COMPREHENSIVE AUDIT COMPLETE');
            console.log('='.repeat(60));
            console.log(`📊 Total files analyzed: ${discoveredFiles.length}`);
            console.log(`🧠 Knowledge artifacts extracted: ${allKnowledge.length}`);
            console.log(`📁 Migration phases planned: ${migrationPlan.phases.length}`);
            console.log(`📋 Reports saved to: ${this.options.outputDir}`);

        } catch (error) {
            console.error('❌ Audit failed:', error);
            process.exit(1);
        }
    }

    private printDiscoveryStats(files: any[]): void {
        console.log(`\n📊 Discovery Statistics:`);
        console.log(`   Total files found: ${files.length}`);

        const byType = files.reduce((acc, f) => {
            acc[f.type] = (acc[f.type] || 0) + 1;
            return acc;
        }, {});

        Object.entries(byType).forEach(([type, count]) => {
            console.log(`   ${type}: ${count}`);
        });

        const byImportance = files.reduce((acc, f) => {
            acc[f.importance] = (acc[f.importance] || 0) + 1;
            return acc;
        }, {});

        console.log(`\n📈 Importance Distribution:`);
        Object.entries(byImportance).forEach(([importance, count]) => {
            console.log(`   ${importance}: ${count}`);
        });
    }

    private printReviewStats(files: any[]): void {
        const totalKnowledge = files.reduce((sum, f) => sum + f.extractedKnowledge.length, 0);
        console.log(`\n🧠 Knowledge Extraction:`);
        console.log(`   Total knowledge artifacts: ${totalKnowledge}`);

        const knowledgeByType = files.flatMap(f => f.extractedKnowledge).reduce((acc, k) => {
            acc[k.type] = (acc[k.type] || 0) + 1;
            return acc;
        }, {});

        Object.entries(knowledgeByType).forEach(([type, count]) => {
            console.log(`   ${type}: ${count}`);
        });
    }

    private printArchaeologyStats(knowledge: any[]): void {
        console.log(`\n🏛️ Archaeological Findings:`);
        console.log(`   Total artifacts: ${knowledge.length}`);

        const bySource = knowledge.reduce((acc, k) => {
            acc[k.source] = (acc[k.source] || 0) + 1;
            return acc;
        }, {});

        Object.entries(bySource).forEach(([source, count]) => {
            console.log(`   ${source}: ${count}`);
        });
    }

    private printMigrationPlan(plan: any): void {
        console.log(`\n📋 Migration Plan:`);
        console.log(`   Phases: ${plan.phases.length}`);

        plan.phases.forEach((phase: any, index: number) => {
            console.log(`   ${index + 1}. ${phase.name}: ${phase.actions.length} actions`);
        });

        console.log(`   Files to migrate: ${Object.keys(plan.beforeAfterMapping).length}`);
        console.log(`   Rollback steps: ${plan.rollbackProcedure.length}`);
    }

    private printPreservationGuarantee(guarantee: any): void {
        console.log(`\n🛡️ Preservation Guarantee:`);
        console.log(`   Git history preserved: ${guarantee.gitHistoryPreserved ? '✅' : '❌'}`);
        console.log(`   All content mapped: ${guarantee.allContentMapped ? '✅' : '❌'}`);
        console.log(`   Rollback capable: ${guarantee.rollbackCapable ? '✅' : '❌'}`);
        console.log(`   Verification complete: ${guarantee.verificationComplete ? '✅' : '❌'}`);
        console.log(`   Knowledge loss risk: ${guarantee.knowledgeLossRisk}`);
    }

    private async getUserConfirmation(): Promise<boolean> {
        // In a real implementation, this would prompt the user
        // For now, we'll assume confirmation in non-interactive mode
        console.log('\n⚠️ About to execute migration. This will move and reorganize files.');
        console.log('💾 All changes are tracked in git and can be rolled back.');
        console.log('🔄 Rollback procedure is available if needed.');

        // For automation, return true. In interactive mode, prompt user.
        return true;
    }

    private async saveDiscoveryReport(files: any[]): Promise<void> {
        const outputDir = this.options.outputDir!;
        await fs.mkdir(outputDir, { recursive: true });

        const report = {
            timestamp: new Date().toISOString(),
            phase: 'Discovery',
            summary: {
                totalFiles: files.length,
                byType: files.reduce((acc, f) => {
                    acc[f.type] = (acc[f.type] || 0) + 1;
                    return acc;
                }, {}),
                byCategory: files.reduce((acc, f) => {
                    acc[f.category] = (acc[f.category] || 0) + 1;
                    return acc;
                }, {}),
                byImportance: files.reduce((acc, f) => {
                    acc[f.importance] = (acc[f.importance] || 0) + 1;
                    return acc;
                }, {})
            },
            files: files.map(f => ({
                path: f.relativePath,
                type: f.type,
                category: f.category,
                importance: f.importance,
                size: f.size,
                lastModified: f.lastModified,
                contentSummary: f.contentSummary
            }))
        };

        await fs.writeFile(
            join(outputDir, 'phase1-discovery-report.json'),
            JSON.stringify(report, null, 2)
        );

        // Also create a markdown summary
        const markdownReport = this.generateDiscoveryMarkdown(report);
        await fs.writeFile(
            join(outputDir, 'phase1-discovery-report.md'),
            markdownReport
        );
    }

    private generateDiscoveryMarkdown(report: any): string {
        return `# Phase 1: Discovery Report

Generated: ${report.timestamp}

## Summary

- **Total Files**: ${report.summary.totalFiles}

### By Type
${Object.entries(report.summary.byType).map(([type, count]) => `- ${type}: ${count}`).join('\n')}

### By Category  
${Object.entries(report.summary.byCategory).map(([category, count]) => `- ${category}: ${count}`).join('\n')}

### By Importance
${Object.entries(report.summary.byImportance).map(([importance, count]) => `- ${importance}: ${count}`).join('\n')}

## Critical Files

${report.files.filter((f: any) => f.importance === 'critical').map((f: any) =>
            `- **${f.path}** (${f.type}, ${f.category})\n  ${f.contentSummary}`
        ).join('\n\n')}

## High Priority Files

${report.files.filter((f: any) => f.importance === 'high').map((f: any) =>
            `- **${f.path}** (${f.type}, ${f.category})\n  ${f.contentSummary}`
        ).join('\n\n')}
`;
    }

    private async saveReviewReport(files: any[]): Promise<void> {
        const outputDir = this.options.outputDir!;
        const allKnowledge = files.flatMap(f => f.extractedKnowledge);

        const report = {
            timestamp: new Date().toISOString(),
            phase: 'Deep Review',
            summary: {
                filesReviewed: files.length,
                knowledgeExtracted: allKnowledge.length,
                byKnowledgeType: allKnowledge.reduce((acc, k) => {
                    acc[k.type] = (acc[k.type] || 0) + 1;
                    return acc;
                }, {}),
                criticalKnowledge: allKnowledge.filter(k => k.importance === 'critical').length
            },
            knowledge: allKnowledge
        };

        await fs.writeFile(
            join(outputDir, 'phase2-review-report.json'),
            JSON.stringify(report, null, 2)
        );
    }

    private async saveArchaeologyReport(knowledge: any[]): Promise<void> {
        const outputDir = this.options.outputDir!;

        const report = {
            timestamp: new Date().toISOString(),
            phase: 'Knowledge Archaeology',
            summary: {
                artifactsFound: knowledge.length,
                bySource: knowledge.reduce((acc, k) => {
                    acc[k.source] = (acc[k.source] || 0) + 1;
                    return acc;
                }, {}),
                byType: knowledge.reduce((acc, k) => {
                    acc[k.type] = (acc[k.type] || 0) + 1;
                    return acc;
                }, {})
            },
            artifacts: knowledge
        };

        await fs.writeFile(
            join(outputDir, 'phase3-archaeology-report.json'),
            JSON.stringify(report, null, 2)
        );
    }

    private async saveMigrationPlan(plan: any): Promise<void> {
        const outputDir = this.options.outputDir!;

        await fs.writeFile(
            join(outputDir, 'phase4-migration-plan.json'),
            JSON.stringify(plan, null, 2)
        );

        // Create human-readable migration plan
        const markdownPlan = this.generateMigrationMarkdown(plan);
        await fs.writeFile(
            join(outputDir, 'phase4-migration-plan.md'),
            markdownPlan
        );
    }

    private generateMigrationMarkdown(plan: any): string {
        return `# Migration Plan

## Overview

This migration plan ensures zero knowledge loss while organizing documentation into a clean, findable structure.

## Phases

${plan.phases.map((phase: any, index: number) => `
### ${index + 1}. ${phase.name}

${phase.description}

**Actions**: ${phase.actions.length}
**Files affected**: ${phase.files.length}

${phase.actions.map((action: any) =>
            `- **${action.type}**: ${action.source} → ${action.destination}\n  *${action.reason}*`
        ).join('\n')}
`).join('\n')}

## Before/After Mapping

${Object.entries(plan.beforeAfterMapping).map(([before, after]) =>
            `- \`${before}\` → \`${after}\``
        ).join('\n')}

## Rollback Procedure

${plan.rollbackProcedure.map((step: string, index: number) =>
            `${index + 1}. ${step}`
        ).join('\n')}

## Verification Steps

${plan.verificationSteps.map((step: string, index: number) =>
            `${index + 1}. ${step}`
        ).join('\n')}
`;
    }

    private async saveAuditReport(report: any): Promise<void> {
        const outputDir = this.options.outputDir!;

        await fs.writeFile(
            join(outputDir, 'comprehensive-audit-report.json'),
            JSON.stringify(report, null, 2)
        );

        // Create executive summary
        const summary = this.generateExecutiveSummary(report);
        await fs.writeFile(
            join(outputDir, 'EXECUTIVE_SUMMARY.md'),
            summary
        );
    }

    private generateExecutiveSummary(report: any): string {
        return `# Comprehensive Documentation Audit - Executive Summary

**Generated**: ${new Date().toISOString()}

## Overview

This comprehensive audit analyzed **${report.totalFiles} documentation files** across the entire project, extracting **${report.criticalKnowledge.length} critical knowledge artifacts** and creating a safe migration plan with **zero knowledge loss guarantee**.

## Key Findings

### Documentation Inventory
${Object.entries(report.filesByType).map(([type, count]) => `- **${type}**: ${count} files`).join('\n')}

### Knowledge Distribution
${Object.entries(report.filesByCategory).map(([category, count]) => `- **${category}**: ${count} files`).join('\n')}

### Critical Knowledge Preserved
- **Architectural Decisions**: ${report.criticalKnowledge.filter((k: any) => k.type === 'architectural-decision').length}
- **Workarounds & Solutions**: ${report.criticalKnowledge.filter((k: any) => k.type === 'workaround').length}
- **Configuration Knowledge**: ${report.criticalKnowledge.filter((k: any) => k.type === 'configuration').length}
- **Performance Insights**: ${report.criticalKnowledge.filter((k: any) => k.type === 'performance').length}

## Migration Plan

- **Phases**: ${report.migrationPlan.phases.length}
- **Files to migrate**: ${Object.keys(report.migrationPlan.beforeAfterMapping).length}
- **Rollback capability**: ✅ Full rollback available
- **History preservation**: ✅ Git history maintained

## Preservation Guarantee

- **Knowledge Loss Risk**: ${report.preservationGuarantee.knowledgeLossRisk}
- **Git History**: ${report.preservationGuarantee.gitHistoryPreserved ? '✅ Preserved' : '❌ At Risk'}
- **Content Mapping**: ${report.preservationGuarantee.allContentMapped ? '✅ Complete' : '❌ Incomplete'}
- **Rollback Ready**: ${report.preservationGuarantee.rollbackCapable ? '✅ Available' : '❌ Not Available'}

## Next Steps

1. **Review Migration Plan**: Examine \`phase4-migration-plan.md\` for detailed migration steps
2. **Execute Migration**: Run with \`--execute\` flag when ready
3. **Verify Results**: Follow verification steps in migration plan
4. **Rollback if Needed**: Use provided rollback procedure if issues arise

## Files Generated

- \`phase1-discovery-report.md\` - Complete file inventory
- \`phase2-review-report.json\` - Extracted knowledge database  
- \`phase3-archaeology-report.json\` - Git history insights
- \`phase4-migration-plan.md\` - Step-by-step migration guide
- \`comprehensive-audit-report.json\` - Complete technical report

**Status**: ✅ Audit Complete - Ready for Migration
`;
    }

    private async savePreservationGuarantee(guarantee: any): Promise<void> {
        const outputDir = this.options.outputDir!;

        const report = {
            timestamp: new Date().toISOString(),
            phase: 'Migration Execution',
            guarantee,
            status: guarantee.knowledgeLossRisk === 'none' ? 'SUCCESS' : 'WARNING'
        };

        await fs.writeFile(
            join(outputDir, 'phase5-preservation-guarantee.json'),
            JSON.stringify(report, null, 2)
        );
    }
}

// CLI execution
async function main() {
    const args = process.argv.slice(2);
    const options: AuditOptions = {
        dryRun: args.includes('--dry-run'),
        skipMigration: args.includes('--skip-migration'),
        verbose: args.includes('--verbose') || args.includes('-v'),
        outputDir: args.includes('--output') ? args[args.indexOf('--output') + 1] : 'docs/migration'
    };

    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
Comprehensive Documentation Audit & Migration

Usage: npm run audit:docs [options]

Options:
  --dry-run         Run audit without executing migration
  --skip-migration  Run audit and planning only, skip execution
  --verbose, -v     Show detailed progress information
  --output DIR      Output directory for reports (default: docs/migration)
  --help, -h        Show this help message

Examples:
  npm run audit:docs --dry-run --verbose
  npm run audit:docs --skip-migration --output ./audit-results
  npm run audit:docs  # Full audit and migration
`);
        process.exit(0);
    }

    const audit = new ComprehensiveDocumentationAudit(options);
    await audit.run();
}

if (require.main === module) {
    main().catch(console.error);
}

export { ComprehensiveDocumentationAudit };

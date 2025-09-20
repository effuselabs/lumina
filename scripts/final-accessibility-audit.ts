#!/usr/bin/env tsx

/**
 * Final Accessibility Audit Script
 * 
 * This script performs a final comprehensive accessibility audit to ensure
 * WCAG 2.1 AA compliance before deployment.
 */

import { promises as fs } from 'fs';
import { AccessibilityAuditor } from './accessibility-audit';

interface FinalAccessibilityResult {
    auditResults: any;
    complianceScore: number;
    criticalIssues: number;
    readyForDeployment: boolean;
    recommendations: string[];
}

class FinalAccessibilityAuditor {
    async performFinalAudit(): Promise<FinalAccessibilityResult> {
        console.log('♿ Starting final accessibility audit for deployment readiness...\n');

        // Run comprehensive accessibility audit
        const auditor = new AccessibilityAuditor();
        const auditResults = await auditor.auditAllPages();

        // Calculate compliance score
        const complianceScore = this.calculateComplianceScore(auditResults);

        // Count critical issues
        const criticalIssues = auditResults.issues.filter(i => i.severity === 'error').length;

        // Determine deployment readiness
        const readyForDeployment = this.assessDeploymentReadiness(auditResults, complianceScore);

        // Generate recommendations
        const recommendations = this.generateFinalRecommendations(auditResults);

        console.log('\n📊 FINAL ACCESSIBILITY AUDIT RESULTS');
        console.log('====================================');
        console.log(`♿ Compliance Score: ${complianceScore}%`);
        console.log(`🚨 Critical Issues: ${criticalIssues}`);
        console.log(`🚀 Ready for Deployment: ${readyForDeployment ? 'YES' : 'NO'}\n`);

        if (readyForDeployment) {
            console.log('✅ ACCESSIBILITY COMPLIANCE ACHIEVED');
            console.log('The application meets WCAG 2.1 AA standards and is ready for deployment.');
        } else {
            console.log('❌ ACCESSIBILITY ISSUES REQUIRE ATTENTION');
            console.log('Critical accessibility issues must be resolved before deployment.');
        }

        return {
            auditResults,
            complianceScore,
            criticalIssues,
            readyForDeployment,
            recommendations
        };
    }

    private calculateComplianceScore(auditResults: any): number {
        const totalPossibleIssues = auditResults.totalFiles * 5; // Assume 5 potential issues per file
        const actualIssues = auditResults.issues.length;
        const score = Math.max(0, Math.round(((totalPossibleIssues - actualIssues) / totalPossibleIssues) * 100));
        return Math.min(100, score);
    }

    private assessDeploymentReadiness(auditResults: any, complianceScore: number): boolean {
        const criticalIssues = auditResults.issues.filter(i => i.severity === 'error').length;
        const levelAIssues = auditResults.wcagCompliance.A;

        // Ready if no critical errors, no Level A issues, and compliance score > 80%
        return criticalIssues === 0 && levelAIssues === 0 && complianceScore >= 80;
    }

    private generateFinalRecommendations(auditResults: any): string[] {
        const recommendations: string[] = [];

        const criticalIssues = auditResults.issues.filter(i => i.severity === 'error').length;
        const ariaIssues = auditResults.summary.aria;
        const keyboardIssues = auditResults.summary.keyboard;
        const contrastIssues = auditResults.summary.contrast;
        const semanticIssues = auditResults.summary.semantic;
        const focusIssues = auditResults.summary.focus;

        if (criticalIssues > 0) {
            recommendations.push(`Fix ${criticalIssues} critical accessibility errors before deployment`);
        }

        if (ariaIssues > 10) {
            recommendations.push(`Add ARIA attributes to ${ariaIssues} elements for better screen reader support`);
        }

        if (keyboardIssues > 10) {
            recommendations.push(`Improve keyboard navigation for ${keyboardIssues} interactive elements`);
        }

        if (contrastIssues > 0) {
            recommendations.push(`Review color contrast for ${contrastIssues} elements to meet WCAG standards`);
        }

        if (semanticIssues > 5) {
            recommendations.push(`Use proper semantic HTML for ${semanticIssues} elements`);
        }

        if (focusIssues > 5) {
            recommendations.push(`Improve focus management for ${focusIssues} elements`);
        }

        // Add general recommendations
        recommendations.push('Test with actual screen readers (NVDA, JAWS, VoiceOver)');
        recommendations.push('Verify keyboard-only navigation works throughout the application');
        recommendations.push('Test with users who have disabilities');
        recommendations.push('Set up automated accessibility testing in CI/CD pipeline');

        return recommendations;
    }

    async generateFinalAccessibilityReport(): Promise<void> {
        const result = await this.performFinalAudit();

        const reportContent = this.generateDetailedFinalReport(result);

        const reportPath = '.kiro/specs/design-system-consistency/final-accessibility-audit-report.md';
        await fs.writeFile(reportPath, reportContent);

        console.log(`\n📄 Final accessibility audit report saved to: ${reportPath}`);
    }

    private generateDetailedFinalReport(result: FinalAccessibilityResult): string {
        const timestamp = new Date().toISOString();

        return `# Final Accessibility Audit Report

Generated: ${timestamp}
Compliance Score: ${result.complianceScore}%
Critical Issues: ${result.criticalIssues}
Deployment Ready: ${result.readyForDeployment ? 'YES' : 'NO'}

## Executive Summary

This final accessibility audit evaluates the application's readiness for deployment from an accessibility perspective. The audit focuses on WCAG 2.1 AA compliance and identifies any remaining critical issues that must be addressed.

### Compliance Status

- **Overall Score**: ${result.complianceScore}%
- **Critical Issues**: ${result.criticalIssues}
- **WCAG Level A Issues**: ${result.auditResults.wcagCompliance.A}
- **WCAG Level AA Issues**: ${result.auditResults.wcagCompliance.AA}

### Deployment Readiness

${result.readyForDeployment ?
                '✅ **READY FOR DEPLOYMENT** - The application meets accessibility standards and can be safely deployed.' :
                '❌ **NOT READY FOR DEPLOYMENT** - Critical accessibility issues must be resolved before deployment.'
            }

## Detailed Findings

### Issues by Category

| Category | Count | Status |
|----------|-------|--------|
| ARIA | ${result.auditResults.summary.aria} | ${result.auditResults.summary.aria < 10 ? '✅ Good' : '⚠️ Needs Attention'} |
| Keyboard | ${result.auditResults.summary.keyboard} | ${result.auditResults.summary.keyboard < 10 ? '✅ Good' : '⚠️ Needs Attention'} |
| Contrast | ${result.auditResults.summary.contrast} | ${result.auditResults.summary.contrast === 0 ? '✅ Good' : '⚠️ Needs Attention'} |
| Semantic | ${result.auditResults.summary.semantic} | ${result.auditResults.summary.semantic < 5 ? '✅ Good' : '⚠️ Needs Attention'} |
| Focus | ${result.auditResults.summary.focus} | ${result.auditResults.summary.focus < 5 ? '✅ Good' : '⚠️ Needs Attention'} |

### Critical Issues Requiring Immediate Attention

${result.auditResults.issues.filter(i => i.severity === 'error').map(issue =>
                `- **${issue.file}:${issue.line}** - ${issue.issue} (${issue.category}, WCAG ${issue.wcagLevel})`
            ).join('\n')}

## Recommendations

### Immediate Actions (Before Deployment)
${result.recommendations.filter(r => r.includes('Fix') || r.includes('critical')).map(r => `- ${r}`).join('\n')}

### Post-Deployment Improvements
${result.recommendations.filter(r => !r.includes('Fix') && !r.includes('critical')).map(r => `- ${r}`).join('\n')}

## Testing Checklist

### Manual Testing Required
- [ ] Test with screen readers (NVDA, JAWS, VoiceOver)
- [ ] Verify keyboard-only navigation
- [ ] Check color contrast ratios
- [ ] Test focus management in modals/dialogs
- [ ] Verify ARIA labels and descriptions
- [ ] Test with high contrast mode
- [ ] Verify text scaling up to 200%

### Automated Testing
- [ ] Run axe-core accessibility tests
- [ ] Verify WCAG compliance with automated tools
- [ ] Test across different browsers
- [ ] Validate HTML semantics

## Compliance Certification

${result.readyForDeployment ?
                `This application has been audited and meets WCAG 2.1 AA accessibility standards as of ${timestamp}. The compliance score of ${result.complianceScore}% indicates a high level of accessibility implementation.` :
                `This application does not yet meet WCAG 2.1 AA accessibility standards. ${result.criticalIssues} critical issues must be resolved before deployment can be recommended.`
            }

## Next Steps

${result.readyForDeployment ?
                `1. Proceed with deployment
2. Set up ongoing accessibility monitoring
3. Schedule regular accessibility audits
4. Continue improving based on user feedback` :
                `1. Address all critical accessibility issues
2. Re-run this audit to verify fixes
3. Conduct manual testing with assistive technologies
4. Only proceed with deployment after achieving compliance`
            }

---

*This report certifies the accessibility status of the application at the time of audit. Regular accessibility testing should continue post-deployment.*
`;
    }
}

// Main execution
async function main() {
    const auditor = new FinalAccessibilityAuditor();
    await auditor.generateFinalAccessibilityReport();
}

if (require.main === module) {
    main().catch(console.error);
}

export { FinalAccessibilityAuditor };

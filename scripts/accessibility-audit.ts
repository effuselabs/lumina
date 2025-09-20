#!/usr/bin/env tsx

/**
 * Accessibility Audit Script
 * 
 * This script performs a comprehensive accessibility audit to ensure:
 * - WCAG 2.1 AA compliance
 * - Proper ARIA attributes
 * - Keyboard navigation support
 * - Screen reader compatibility
 * - Color contrast compliance
 */

import { promises as fs } from 'fs';
import { glob } from 'glob';

interface AccessibilityIssue {
    file: string;
    line: number;
    issue: string;
    severity: 'error' | 'warning' | 'info';
    category: 'aria' | 'keyboard' | 'contrast' | 'semantic' | 'focus';
    wcagLevel: 'A' | 'AA' | 'AAA';
}

interface AccessibilityTestResult {
    totalFiles: number;
    issues: AccessibilityIssue[];
    summary: {
        aria: number;
        keyboard: number;
        contrast: number;
        semantic: number;
        focus: number;
    };
    wcagCompliance: {
        A: number;
        AA: number;
        AAA: number;
    };
}

class AccessibilityAuditor {
    private issues: AccessibilityIssue[] = [];
    private fileCount = 0;

    async auditAllPages(): Promise<AccessibilityTestResult> {
        console.log('♿ Starting comprehensive accessibility audit...\n');

        // Find all relevant files
        const pageFiles = await glob('app/**/page.tsx', { ignore: ['node_modules/**'] });
        const componentFiles = await glob('components/**/*.tsx', { ignore: ['node_modules/**'] });
        const allFiles = [...pageFiles, ...componentFiles];

        this.fileCount = allFiles.length;
        console.log(`📁 Found ${this.fileCount} files to audit\n`);

        // Audit each file
        for (const file of allFiles) {
            await this.auditFile(file);
        }

        console.log('✅ Accessibility audit complete!\n');
        this.printResults();

        return {
            totalFiles: this.fileCount,
            issues: this.issues,
            summary: this.generateSummary(),
            wcagCompliance: this.generateWCAGSummary()
        };
    }

    private async auditFile(filePath: string): Promise<void> {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const lines = content.split('\n');

            console.log(`🔍 Auditing: ${filePath}`);

            // Check ARIA attributes
            this.checkARIAAttributes(filePath, content, lines);

            // Check keyboard navigation
            this.checkKeyboardNavigation(filePath, content, lines);

            // Check semantic HTML
            this.checkSemanticHTML(filePath, content, lines);

            // Check focus management
            this.checkFocusManagement(filePath, content, lines);

            // Check color contrast (basic checks)
            this.checkColorContrast(filePath, content, lines);

        } catch (error) {
            this.addIssue(filePath, 0, `Failed to read file: ${error}`, 'error', 'semantic', 'A');
        }
    }

    private checkARIAAttributes(filePath: string, content: string, lines: string[]): void {
        // Check for interactive elements without ARIA
        lines.forEach((line, index) => {
            // Check buttons without proper ARIA
            if (line.includes('onClick') && !line.includes('role=') && !line.includes('aria-')) {
                if (!line.includes('<button') && !line.includes('<Button')) {
                    this.addIssue(filePath, index + 1, 'Interactive element missing ARIA attributes or proper semantic element', 'warning', 'aria', 'AA');
                }
            }

            // Check for missing aria-label on icon buttons
            if (line.includes('<button') && line.includes('Icon') && !line.includes('aria-label')) {
                this.addIssue(filePath, index + 1, 'Icon button missing aria-label', 'error', 'aria', 'AA');
            }

            // Check for form inputs without labels
            if (line.includes('<input') && !line.includes('aria-label') && !line.includes('id=')) {
                this.addIssue(filePath, index + 1, 'Input potentially missing associated label or aria-label', 'warning', 'aria', 'AA');
            }

            // Check for images without alt text
            if (line.includes('<img') && !line.includes('alt=')) {
                this.addIssue(filePath, index + 1, 'Image missing alt attribute', 'error', 'semantic', 'A');
            }

            // Check for proper ARIA roles
            if (line.includes('role=') && line.includes('button') && !line.includes('tabIndex')) {
                this.addIssue(filePath, index + 1, 'Element with button role missing tabIndex for keyboard accessibility', 'warning', 'keyboard', 'AA');
            }

            // Check for ARIA expanded on collapsible elements
            if ((line.includes('Collapsible') || line.includes('Accordion')) && !line.includes('aria-expanded')) {
                this.addIssue(filePath, index + 1, 'Collapsible element missing aria-expanded attribute', 'warning', 'aria', 'AA');
            }
        });

        // Check for proper heading hierarchy
        const headingMatches = content.match(/<h[1-6]/g);
        if (headingMatches && headingMatches.length > 1) {
            // Simple check for h1 followed by h3 (skipping h2)
            if (content.includes('<h1') && content.includes('<h3') && !content.includes('<h2')) {
                this.addIssue(filePath, 0, 'Potential heading hierarchy issue (h1 to h3 without h2)', 'warning', 'semantic', 'AA');
            }
        }

        // Check for multiple h1 elements
        const h1Matches = content.match(/<h1/g);
        if (h1Matches && h1Matches.length > 1) {
            this.addIssue(filePath, 0, 'Multiple h1 elements found - should have only one per page', 'warning', 'semantic', 'AA');
        }
    }

    private checkKeyboardNavigation(filePath: string, content: string, lines: string[]): void {
        // Check for custom interactive elements without keyboard support
        lines.forEach((line, index) => {
            if (line.includes('onClick') && !line.includes('onKeyDown') && !line.includes('<button') && !line.includes('<Button')) {
                this.addIssue(filePath, index + 1, 'Interactive element missing keyboard event handler', 'warning', 'keyboard', 'AA');
            }

            // Check for tabIndex usage
            if (line.includes('tabIndex="-1"') && !line.includes('ref=')) {
                this.addIssue(filePath, index + 1, 'Element with tabIndex="-1" may need focus management', 'info', 'focus', 'AA');
            }

            // Check for positive tabIndex values (anti-pattern)
            const tabIndexMatch = line.match(/tabIndex=["']?([1-9]\d*)["']?/);
            if (tabIndexMatch) {
                this.addIssue(filePath, index + 1, 'Positive tabIndex values can disrupt natural tab order', 'warning', 'keyboard', 'AA');
            }
        });

        // Check for skip links in layout files
        if (filePath.includes('layout.tsx') && !content.includes('skip') && !content.includes('Skip')) {
            this.addIssue(filePath, 0, 'Layout missing skip links for keyboard navigation', 'warning', 'keyboard', 'AA');
        }
    }

    private checkSemanticHTML(filePath: string, content: string, lines: string[]): void {
        // Check for proper semantic elements
        lines.forEach((line, index) => {
            // Check for div used as button
            if (line.includes('<div') && line.includes('onClick') && !line.includes('role=')) {
                this.addIssue(filePath, index + 1, 'Div used as interactive element without proper role', 'warning', 'semantic', 'AA');
            }

            // Check for proper list usage
            if (line.includes('map(') && line.includes('key=') && !content.includes('<ul') && !content.includes('<ol')) {
                this.addIssue(filePath, index + 1, 'Mapped items may benefit from proper list markup', 'info', 'semantic', 'AA');
            }

            // Check for proper form structure
            if (line.includes('<form') && !content.includes('<fieldset') && content.includes('radio')) {
                this.addIssue(filePath, index + 1, 'Form with radio buttons missing fieldset grouping', 'warning', 'semantic', 'AA');
            }
        });

        // Check for proper landmark usage
        if (content.includes('<div') && !content.includes('<main') && !content.includes('<nav') && !content.includes('<aside')) {
            if (filePath.includes('page.tsx') && !filePath.includes('design-system')) {
                this.addIssue(filePath, 0, 'Page missing semantic landmarks (main, nav, aside)', 'info', 'semantic', 'AA');
            }
        }
    }

    private checkFocusManagement(filePath: string, content: string, lines: string[]): void {
        // Check for focus management in modals/dialogs
        if (content.includes('Dialog') || content.includes('Modal')) {
            if (!content.includes('autoFocus') && !content.includes('focus()')) {
                this.addIssue(filePath, 0, 'Dialog/Modal missing focus management', 'warning', 'focus', 'AA');
            }
        }

        // Check for focus indicators
        lines.forEach((line, index) => {
            if (line.includes('focus:') && line.includes('outline-none')) {
                this.addIssue(filePath, index + 1, 'Focus outline removed without alternative focus indicator', 'error', 'focus', 'AA');
            }
        });

        // Check for proper focus restoration
        if (content.includes('useEffect') && content.includes('focus') && !content.includes('previousFocus')) {
            this.addIssue(filePath, 0, 'Focus management may need to restore previous focus', 'info', 'focus', 'AA');
        }
    }

    private checkColorContrast(filePath: string, content: string, lines: string[]): void {
        // Basic checks for potential contrast issues
        lines.forEach((line, index) => {
            // Check for light text on light backgrounds
            if (line.includes('text-white') && (line.includes('bg-gray-100') || line.includes('bg-white'))) {
                this.addIssue(filePath, index + 1, 'Potential color contrast issue: white text on light background', 'warning', 'contrast', 'AA');
            }

            // Check for gray text that might have low contrast
            if (line.includes('text-gray-400') || line.includes('text-gray-300')) {
                this.addIssue(filePath, index + 1, 'Light gray text may not meet contrast requirements', 'info', 'contrast', 'AA');
            }

            // Check for disabled state contrast
            if (line.includes('disabled:') && line.includes('text-gray')) {
                this.addIssue(filePath, index + 1, 'Disabled state may need contrast verification', 'info', 'contrast', 'AA');
            }
        });
    }

    private addIssue(file: string, line: number, issue: string, severity: 'error' | 'warning' | 'info', category: 'aria' | 'keyboard' | 'contrast' | 'semantic' | 'focus', wcagLevel: 'A' | 'AA' | 'AAA'): void {
        this.issues.push({ file, line, issue, severity, category, wcagLevel });
    }

    private generateSummary() {
        return {
            aria: this.issues.filter(i => i.category === 'aria').length,
            keyboard: this.issues.filter(i => i.category === 'keyboard').length,
            contrast: this.issues.filter(i => i.category === 'contrast').length,
            semantic: this.issues.filter(i => i.category === 'semantic').length,
            focus: this.issues.filter(i => i.category === 'focus').length,
        };
    }

    private generateWCAGSummary() {
        return {
            A: this.issues.filter(i => i.wcagLevel === 'A').length,
            AA: this.issues.filter(i => i.wcagLevel === 'AA').length,
            AAA: this.issues.filter(i => i.wcagLevel === 'AAA').length,
        };
    }

    private printResults(): void {
        const summary = this.generateSummary();
        const wcagSummary = this.generateWCAGSummary();

        console.log('📊 ACCESSIBILITY AUDIT RESULTS');
        console.log('===============================');
        console.log(`📁 Total files audited: ${this.fileCount}`);
        console.log(`🚨 Total issues found: ${this.issues.length}\n`);

        console.log('📋 Issues by category:');
        console.log(`🏷️  ARIA: ${summary.aria}`);
        console.log(`⌨️  Keyboard: ${summary.keyboard}`);
        console.log(`🎨 Contrast: ${summary.contrast}`);
        console.log(`📝 Semantic: ${summary.semantic}`);
        console.log(`🎯 Focus: ${summary.focus}\n`);

        console.log('📋 WCAG Compliance Level:');
        console.log(`🔴 Level A: ${wcagSummary.A} issues`);
        console.log(`🟡 Level AA: ${wcagSummary.AA} issues`);
        console.log(`🟢 Level AAA: ${wcagSummary.AAA} issues\n`);

        const errors = this.issues.filter(i => i.severity === 'error');
        const warnings = this.issues.filter(i => i.severity === 'warning');

        if (errors.length > 0) {
            console.log('🚨 CRITICAL ACCESSIBILITY ISSUES (Errors):');
            errors.slice(0, 5).forEach(issue => {
                console.log(`   ${issue.file}:${issue.line} - ${issue.issue} (${issue.category}, WCAG ${issue.wcagLevel})`);
            });
            console.log('');
        }

        if (warnings.length > 0) {
            console.log('⚠️  ACCESSIBILITY WARNINGS (Top 10):');
            warnings.slice(0, 10).forEach(issue => {
                console.log(`   ${issue.file}:${issue.line} - ${issue.issue} (${issue.category})`);
            });
            console.log('');
        }

        // Recommendations
        console.log('💡 RECOMMENDATIONS:');
        if (summary.aria > 0) {
            console.log(`   - Add proper ARIA attributes to ${summary.aria} elements`);
        }
        if (summary.keyboard > 0) {
            console.log(`   - Improve keyboard navigation for ${summary.keyboard} elements`);
        }
        if (summary.contrast > 0) {
            console.log(`   - Review color contrast for ${summary.contrast} elements`);
        }
        if (summary.semantic > 0) {
            console.log(`   - Use proper semantic HTML for ${summary.semantic} elements`);
        }
        if (summary.focus > 0) {
            console.log(`   - Improve focus management for ${summary.focus} elements`);
        }
    }

    async generateAccessibilityReport(): Promise<void> {
        const result = await this.auditAllPages();

        const reportContent = this.generateDetailedAccessibilityReport(result);

        const reportPath = '.kiro/specs/design-system-consistency/accessibility-audit-report.md';
        await fs.writeFile(reportPath, reportContent);

        console.log(`📄 Accessibility audit report saved to: ${reportPath}`);
    }

    private generateDetailedAccessibilityReport(result: AccessibilityTestResult): string {
        const timestamp = new Date().toISOString();

        return `# Accessibility Audit Report

Generated: ${timestamp}
Total Files Audited: ${result.totalFiles}
Total Issues Found: ${result.issues.length}

## Summary

| Category | Issues |
|----------|--------|
| ARIA | ${result.summary.aria} |
| Keyboard | ${result.summary.keyboard} |
| Contrast | ${result.summary.contrast} |
| Semantic | ${result.summary.semantic} |
| Focus | ${result.summary.focus} |

## WCAG Compliance

| Level | Issues |
|-------|--------|
| A | ${result.wcagCompliance.A} |
| AA | ${result.wcagCompliance.AA} |
| AAA | ${result.wcagCompliance.AAA} |

## Critical Issues (Errors)

${result.issues.filter(i => i.severity === 'error').map(issue =>
            `- **${issue.file}:${issue.line}** - ${issue.issue} (${issue.category}, WCAG ${issue.wcagLevel})`
        ).join('\n')}

## Accessibility Warnings

${result.issues.filter(i => i.severity === 'warning').slice(0, 30).map(issue =>
            `- **${issue.file}:${issue.line}** - ${issue.issue} (${issue.category}, WCAG ${issue.wcagLevel})`
        ).join('\n')}

## Recommendations

### Immediate Actions (WCAG Level A)
1. Fix all Level A issues immediately - these are basic accessibility requirements
2. Add alt text to all images
3. Ensure proper semantic HTML structure

### High Priority (WCAG Level AA)
1. Add proper ARIA attributes to interactive elements
2. Ensure keyboard navigation works for all interactive elements
3. Verify color contrast meets 4.5:1 ratio for normal text
4. Implement proper focus management
5. Add skip links for keyboard navigation

### Accessibility Testing Strategy
1. Test with screen readers (NVDA, JAWS, VoiceOver)
2. Test keyboard-only navigation
3. Use automated accessibility testing tools (axe-core)
4. Verify color contrast with tools like WebAIM Contrast Checker
5. Test with users who have disabilities

### Implementation Guidelines
- Use semantic HTML elements whenever possible
- Provide alternative text for all images and icons
- Ensure all interactive elements are keyboard accessible
- Implement proper focus management for modals and dynamic content
- Use ARIA attributes to enhance semantic meaning
- Test with actual assistive technologies

### Next Steps
1. Address critical errors first (Level A issues)
2. Systematically fix Level AA issues
3. Implement automated accessibility testing
4. Create accessibility guidelines for the team
5. Regular accessibility audits and testing
`;
    }
}

// Main execution
async function main() {
    const auditor = new AccessibilityAuditor();
    await auditor.generateAccessibilityReport();
}

if (require.main === module) {
    main().catch(console.error);
}

export { AccessibilityAuditor };

#!/usr/bin/env tsx

/**
 * Design System Consistency Audit Script
 * 
 * This script performs a comprehensive review of all pages to ensure:
 * - Consistent application of design system components
 * - Theme switching functionality across all pages
 * - Responsive design compliance
 * - Accessibility standards compliance
 */

import { promises as fs } from 'fs';
import { glob } from 'glob';

interface ConsistencyIssue {
    file: string;
    line: number;
    issue: string;
    severity: 'error' | 'warning' | 'info';
    category: 'design-system' | 'theme' | 'responsive' | 'accessibility';
}

interface AuditResult {
    totalFiles: number;
    issues: ConsistencyIssue[];
    summary: {
        designSystem: number;
        theme: number;
        responsive: number;
        accessibility: number;
    };
}

class DesignSystemAuditor {
    private issues: ConsistencyIssue[] = [];
    private fileCount = 0;

    async auditAllPages(): Promise<AuditResult> {
        console.log('🔍 Starting comprehensive design system consistency audit...\n');

        // Find all page files
        const pageFiles = await glob('app/**/page.tsx', { ignore: ['node_modules/**'] });
        const componentFiles = await glob('components/**/*.tsx', { ignore: ['node_modules/**'] });
        const allFiles = [...pageFiles, ...componentFiles];

        this.fileCount = allFiles.length;
        console.log(`📁 Found ${this.fileCount} files to audit\n`);

        // Audit each file
        for (const file of allFiles) {
            await this.auditFile(file);
        }

        // Generate summary
        const summary = this.generateSummary();

        console.log('✅ Audit complete!\n');
        this.printSummary(summary);

        return {
            totalFiles: this.fileCount,
            issues: this.issues,
            summary
        };
    }

    private async auditFile(filePath: string): Promise<void> {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const lines = content.split('\n');

            console.log(`🔍 Auditing: ${filePath}`);

            // Check design system component usage
            this.checkDesignSystemComponents(filePath, content, lines);

            // Check theme implementation
            this.checkThemeImplementation(filePath, content, lines);

            // Check responsive design patterns
            this.checkResponsiveDesign(filePath, content, lines);

            // Check accessibility compliance
            this.checkAccessibility(filePath, content, lines);

        } catch (error) {
            this.addIssue(filePath, 0, `Failed to read file: ${error}`, 'error', 'design-system');
        }
    }

    private checkDesignSystemComponents(filePath: string, content: string, lines: string[]): void {
        // Check for inconsistent button usage
        if (content.includes('<button') && !content.includes('from "@/components/ui/button"')) {
            this.addIssue(filePath, 0, 'Using native button instead of design system Button component', 'warning', 'design-system');
        }

        // Check for inconsistent input usage
        if (content.includes('<input') && !content.includes('from "@/components/ui/input"')) {
            this.addIssue(filePath, 0, 'Using native input instead of design system Input component', 'warning', 'design-system');
        }

        // Check for inconsistent card usage
        if (content.includes('className.*card') && !content.includes('from "@/components/ui/card"')) {
            this.addIssue(filePath, 0, 'Using custom card styling instead of design system Card component', 'info', 'design-system');
        }

        // Check for proper StatCard usage
        if (content.includes('stat') && content.includes('card') && !content.includes('StatCard')) {
            this.addIssue(filePath, 0, 'Potential stat display not using standardized StatCard component', 'info', 'design-system');
        }

        // Check for PageHeader usage in pages
        if (filePath.includes('page.tsx') && !content.includes('PageHeader') && content.includes('<h1')) {
            this.addIssue(filePath, 0, 'Page missing standardized PageHeader component', 'warning', 'design-system');
        }

        // Check for consistent spacing usage
        lines.forEach((line, index) => {
            if (line.includes('className') && /p-\d|m-\d|gap-\d/.test(line)) {
                if (!/p-[1-8]|m-[1-8]|gap-[1-8]/.test(line)) {
                    this.addIssue(filePath, index + 1, 'Using non-standard spacing values', 'info', 'design-system');
                }
            }
        });
    }

    private checkThemeImplementation(filePath: string, content: string, lines: string[]): void {
        // Check for hardcoded colors instead of CSS variables
        lines.forEach((line, index) => {
            if (line.includes('className') && /#[0-9a-fA-F]{3,6}/.test(line)) {
                this.addIssue(filePath, index + 1, 'Using hardcoded color instead of design tokens', 'warning', 'theme');
            }
        });

        // Check for proper theme provider usage
        if (filePath.includes('layout.tsx') && !content.includes('ThemeProvider')) {
            this.addIssue(filePath, 0, 'Layout missing ThemeProvider wrapper', 'error', 'theme');
        }

        // Check for theme-aware styling
        if (content.includes('dark:') && !content.includes('data-theme')) {
            this.addIssue(filePath, 0, 'Using Tailwind dark mode instead of data-theme approach', 'info', 'theme');
        }
    }

    private checkResponsiveDesign(filePath: string, content: string, lines: string[]): void {
        // Check for responsive breakpoints
        lines.forEach((line, index) => {
            if (line.includes('className') && line.includes('grid')) {
                if (!/(sm:|md:|lg:|xl:)/.test(line)) {
                    this.addIssue(filePath, index + 1, 'Grid layout missing responsive breakpoints', 'warning', 'responsive');
                }
            }
        });

        // Check for mobile-first approach
        if (content.includes('hidden') && !content.includes('sm:block')) {
            this.addIssue(filePath, 0, 'Potential non-mobile-first responsive design', 'info', 'responsive');
        }
    }

    private checkAccessibility(filePath: string, content: string, lines: string[]): void {
        // Check for missing alt text on images
        lines.forEach((line, index) => {
            if (line.includes('<img') && !line.includes('alt=')) {
                this.addIssue(filePath, index + 1, 'Image missing alt attribute', 'error', 'accessibility');
            }
        });

        // Check for proper heading hierarchy
        const headingMatches = content.match(/<h[1-6]/g);
        if (headingMatches && headingMatches.length > 1) {
            // Simple check for h1 followed by h3 (skipping h2)
            if (content.includes('<h1') && content.includes('<h3') && !content.includes('<h2')) {
                this.addIssue(filePath, 0, 'Potential heading hierarchy issue (h1 to h3 without h2)', 'warning', 'accessibility');
            }
        }

        // Check for interactive elements without proper ARIA
        lines.forEach((line, index) => {
            if (line.includes('onClick') && !line.includes('role=') && !line.includes('aria-')) {
                this.addIssue(filePath, index + 1, 'Interactive element missing ARIA attributes', 'warning', 'accessibility');
            }
        });

        // Check for form inputs without labels
        lines.forEach((line, index) => {
            if (line.includes('<input') && !line.includes('aria-label') && !line.includes('id=')) {
                this.addIssue(filePath, index + 1, 'Input potentially missing associated label', 'warning', 'accessibility');
            }
        });
    }

    private addIssue(file: string, line: number, issue: string, severity: 'error' | 'warning' | 'info', category: 'design-system' | 'theme' | 'responsive' | 'accessibility'): void {
        this.issues.push({ file, line, issue, severity, category });
    }

    private generateSummary() {
        return {
            designSystem: this.issues.filter(i => i.category === 'design-system').length,
            theme: this.issues.filter(i => i.category === 'theme').length,
            responsive: this.issues.filter(i => i.category === 'responsive').length,
            accessibility: this.issues.filter(i => i.category === 'accessibility').length,
        };
    }

    private printSummary(summary: any): void {
        console.log('📊 AUDIT SUMMARY');
        console.log('================');
        console.log(`📁 Total files audited: ${this.fileCount}`);
        console.log(`🚨 Total issues found: ${this.issues.length}\n`);

        console.log('📋 Issues by category:');
        console.log(`🎨 Design System: ${summary.designSystem}`);
        console.log(`🌙 Theme: ${summary.theme}`);
        console.log(`📱 Responsive: ${summary.responsive}`);
        console.log(`♿ Accessibility: ${summary.accessibility}\n`);

        // Show top issues
        const errors = this.issues.filter(i => i.severity === 'error');
        const warnings = this.issues.filter(i => i.severity === 'warning');

        if (errors.length > 0) {
            console.log('🚨 CRITICAL ISSUES (Errors):');
            errors.slice(0, 5).forEach(issue => {
                console.log(`   ${issue.file}:${issue.line} - ${issue.issue}`);
            });
            console.log('');
        }

        if (warnings.length > 0) {
            console.log('⚠️  HIGH PRIORITY (Warnings):');
            warnings.slice(0, 5).forEach(issue => {
                console.log(`   ${issue.file}:${issue.line} - ${issue.issue}`);
            });
            console.log('');
        }
    }

    async generateReport(): Promise<void> {
        const result = await this.auditAllPages();

        // Generate detailed report
        const reportContent = this.generateDetailedReport(result);

        // Write report to file
        const reportPath = '.kiro/specs/design-system-consistency/consistency-audit-report.md';
        await fs.writeFile(reportPath, reportContent);

        console.log(`📄 Detailed report saved to: ${reportPath}`);
    }

    private generateDetailedReport(result: AuditResult): string {
        const timestamp = new Date().toISOString();

        let report = `# Design System Consistency Audit Report

Generated: ${timestamp}
Total Files Audited: ${result.totalFiles}
Total Issues Found: ${result.issues.length}

## Summary

| Category | Issues |
|----------|--------|
| Design System | ${result.summary.designSystem} |
| Theme | ${result.summary.theme} |
| Responsive | ${result.summary.responsive} |
| Accessibility | ${result.summary.accessibility} |

## Issues by Severity

### Errors (${result.issues.filter(i => i.severity === 'error').length})

`;

        const errors = result.issues.filter(i => i.severity === 'error');
        errors.forEach(issue => {
            report += `- **${issue.file}:${issue.line}** - ${issue.issue} (${issue.category})\n`;
        });

        report += `\n### Warnings (${result.issues.filter(i => i.severity === 'warning').length})\n\n`;

        const warnings = result.issues.filter(i => i.severity === 'warning');
        warnings.forEach(issue => {
            report += `- **${issue.file}:${issue.line}** - ${issue.issue} (${issue.category})\n`;
        });

        report += `\n### Info (${result.issues.filter(i => i.severity === 'info').length})\n\n`;

        const infos = result.issues.filter(i => i.severity === 'info');
        infos.forEach(issue => {
            report += `- **${issue.file}:${issue.line}** - ${issue.issue} (${issue.category})\n`;
        });

        report += `\n## Recommendations

### Immediate Actions Required
1. Fix all error-level issues immediately
2. Address warning-level issues in order of priority
3. Review info-level issues for potential improvements

### Design System Compliance
- Ensure all pages use standardized components from the design system
- Replace native HTML elements with design system components
- Implement consistent spacing using design tokens

### Theme Implementation
- Replace hardcoded colors with CSS custom properties
- Ensure all components work in both light and dark themes
- Test theme switching across all pages

### Responsive Design
- Add responsive breakpoints to all grid layouts
- Follow mobile-first design principles
- Test all pages across different viewport sizes

### Accessibility
- Add proper ARIA labels to all interactive elements
- Ensure proper heading hierarchy
- Add alt text to all images
- Test keyboard navigation on all pages

## Next Steps

1. Address critical errors first
2. Implement fixes for high-priority warnings
3. Create automated tests to prevent regression
4. Schedule regular consistency audits
`;

        return report;
    }
}

// Main execution
async function main() {
    const auditor = new DesignSystemAuditor();
    await auditor.generateReport();
}

if (require.main === module) {
    main().catch(console.error);
}

export { DesignSystemAuditor };

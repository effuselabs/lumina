#!/usr/bin/env tsx

/**
 * Responsive Design Test Script
 * 
 * This script tests responsive design implementation across all pages to ensure:
 * - Proper responsive breakpoints are used
 * - Mobile-first approach is followed
 * - Grid layouts are responsive
 * - Components work across all viewport sizes
 */

import { promises as fs } from 'fs';
import { glob } from 'glob';

interface ResponsiveIssue {
    file: string;
    line: number;
    issue: string;
    severity: 'error' | 'warning' | 'info';
    category: 'breakpoints' | 'grid' | 'mobile-first' | 'layout';
}

interface ResponsiveTestResult {
    totalFiles: number;
    issues: ResponsiveIssue[];
    summary: {
        breakpoints: number;
        grid: number;
        mobileFirst: number;
        layout: number;
    };
}

class ResponsiveDesignTester {
    private issues: ResponsiveIssue[] = [];
    private fileCount = 0;

    async testAllPages(): Promise<ResponsiveTestResult> {
        console.log('📱 Starting comprehensive responsive design test...\n');

        // Find all relevant files
        const pageFiles = await glob('app/**/page.tsx', { ignore: ['node_modules/**'] });
        const componentFiles = await glob('components/**/*.tsx', { ignore: ['node_modules/**'] });
        const cssFiles = await glob('app/**/*.css', { ignore: ['node_modules/**'] });
        const allFiles = [...pageFiles, ...componentFiles, ...cssFiles];

        this.fileCount = allFiles.length;
        console.log(`📁 Found ${this.fileCount} files to test\n`);

        // Test each file
        for (const file of allFiles) {
            await this.testFile(file);
        }

        console.log('✅ Responsive design testing complete!\n');
        this.printResults();

        return {
            totalFiles: this.fileCount,
            issues: this.issues,
            summary: this.generateSummary()
        };
    }

    private async testFile(filePath: string): Promise<void> {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const lines = content.split('\n');

            console.log(`🔍 Testing: ${filePath}`);

            if (filePath.endsWith('.css')) {
                this.testCSSFile(filePath, content, lines);
            } else {
                this.testTSXFile(filePath, content, lines);
            }

        } catch (error) {
            this.addIssue(filePath, 0, `Failed to read file: ${error}`, 'error', 'layout');
        }
    }

    private testCSSFile(filePath: string, content: string, lines: string[]): void {
        // Check for media queries
        const mediaQueryMatches = content.match(/@media[^{]+\{/g);
        if (mediaQueryMatches) {
            mediaQueryMatches.forEach(match => {
                // Check for mobile-first approach (min-width)
                if (match.includes('max-width') && !match.includes('min-width')) {
                    this.addIssue(filePath, 0, 'Using max-width media queries - consider mobile-first approach with min-width', 'info', 'mobile-first');
                }
            });
        }

        // Check for responsive grid patterns
        lines.forEach((line, index) => {
            if (line.includes('grid-template-columns')) {
                if (!line.includes('repeat') && !line.includes('minmax')) {
                    this.addIssue(filePath, index + 1, 'Grid layout may not be responsive - consider using repeat() with minmax()', 'warning', 'grid');
                }
            }
        });
    }

    private testTSXFile(filePath: string, content: string, lines: string[]): void {
        // Check for responsive breakpoint usage in Tailwind classes
        lines.forEach((line, index) => {
            if (line.includes('className') && line.includes('grid')) {
                const hasResponsiveBreakpoints = /(sm:|md:|lg:|xl:|2xl:)/.test(line);
                if (!hasResponsiveBreakpoints) {
                    this.addIssue(filePath, index + 1, 'Grid layout missing responsive breakpoints', 'warning', 'grid');
                }
            }

            // Check for fixed widths without responsive alternatives
            if (line.includes('className')) {
                const fixedWidthMatch = line.match(/w-\d+/g);
                if (fixedWidthMatch && !/(sm:|md:|lg:|xl:)/.test(line)) {
                    this.addIssue(filePath, index + 1, 'Fixed width without responsive breakpoints', 'info', 'breakpoints');
                }

                // Check for hidden elements without responsive alternatives
                if (line.includes('hidden') && !/(sm:|md:|lg:|xl:)/.test(line)) {
                    this.addIssue(filePath, index + 1, 'Hidden element without responsive breakpoints', 'warning', 'mobile-first');
                }

                // Check for text sizes without responsive alternatives
                const textSizeMatch = line.match(/text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl)/g);
                if (textSizeMatch && textSizeMatch.length > 0 && !/(sm:|md:|lg:|xl:)/.test(line)) {
                    this.addIssue(filePath, index + 1, 'Text size without responsive breakpoints', 'info', 'breakpoints');
                }
            }
        });

        // Check for viewport meta tag in layout files
        if (filePath.includes('layout.tsx') && !content.includes('viewport')) {
            this.addIssue(filePath, 0, 'Layout missing viewport meta tag for responsive design', 'warning', 'layout');
        }

        // Check for container usage
        if (content.includes('container') && !content.includes('mx-auto')) {
            this.addIssue(filePath, 0, 'Container usage without centering - may cause layout issues', 'info', 'layout');
        }

        // Check for overflow handling
        lines.forEach((line, index) => {
            if (line.includes('overflow-x-auto') || line.includes('overflow-scroll')) {
                // Good - handling overflow for responsive tables/content
            } else if (line.includes('table') && !line.includes('overflow')) {
                this.addIssue(filePath, index + 1, 'Table without overflow handling - may break on mobile', 'warning', 'mobile-first');
            }
        });

        // Check for flex layouts without responsive considerations
        lines.forEach((line, index) => {
            if (line.includes('className') && line.includes('flex')) {
                if (line.includes('flex-row') && !/(sm:|md:|lg:|xl:)/.test(line)) {
                    this.addIssue(filePath, index + 1, 'Flex row layout without responsive breakpoints', 'info', 'breakpoints');
                }
            }
        });
    }

    private addIssue(file: string, line: number, issue: string, severity: 'error' | 'warning' | 'info', category: 'breakpoints' | 'grid' | 'mobile-first' | 'layout'): void {
        this.issues.push({ file, line, issue, severity, category });
    }

    private generateSummary() {
        return {
            breakpoints: this.issues.filter(i => i.category === 'breakpoints').length,
            grid: this.issues.filter(i => i.category === 'grid').length,
            mobileFirst: this.issues.filter(i => i.category === 'mobile-first').length,
            layout: this.issues.filter(i => i.category === 'layout').length,
        };
    }

    private printResults(): void {
        const summary = this.generateSummary();

        console.log('📊 RESPONSIVE DESIGN TEST RESULTS');
        console.log('==================================');
        console.log(`📁 Total files tested: ${this.fileCount}`);
        console.log(`🚨 Total issues found: ${this.issues.length}\n`);

        console.log('📋 Issues by category:');
        console.log(`📱 Breakpoints: ${summary.breakpoints}`);
        console.log(`🔲 Grid: ${summary.grid}`);
        console.log(`📲 Mobile-first: ${summary.mobileFirst}`);
        console.log(`📐 Layout: ${summary.layout}\n`);

        const errors = this.issues.filter(i => i.severity === 'error');
        const warnings = this.issues.filter(i => i.severity === 'warning');

        if (errors.length > 0) {
            console.log('🚨 CRITICAL RESPONSIVE ISSUES (Errors):');
            errors.forEach(issue => {
                console.log(`   ${issue.file}:${issue.line} - ${issue.issue}`);
            });
            console.log('');
        }

        if (warnings.length > 0) {
            console.log('⚠️  RESPONSIVE WARNINGS (Top 10):');
            warnings.slice(0, 10).forEach(issue => {
                console.log(`   ${issue.file}:${issue.line} - ${issue.issue}`);
            });
            console.log('');
        }

        // Recommendations
        console.log('💡 RECOMMENDATIONS:');
        if (summary.grid > 0) {
            console.log(`   - Add responsive breakpoints to ${summary.grid} grid layouts`);
        }
        if (summary.mobileFirst > 0) {
            console.log(`   - Review ${summary.mobileFirst} mobile-first design issues`);
        }
        if (summary.breakpoints > 0) {
            console.log(`   - Add responsive breakpoints to ${summary.breakpoints} elements`);
        }
        if (summary.layout > 0) {
            console.log(`   - Fix ${summary.layout} layout-related responsive issues`);
        }
    }

    async generateResponsiveReport(): Promise<void> {
        const result = await this.testAllPages();

        const reportContent = this.generateDetailedResponsiveReport(result);

        const reportPath = '.kiro/specs/design-system-consistency/responsive-design-test-report.md';
        await fs.writeFile(reportPath, reportContent);

        console.log(`📄 Responsive design test report saved to: ${reportPath}`);
    }

    private generateDetailedResponsiveReport(result: ResponsiveTestResult): string {
        const timestamp = new Date().toISOString();

        return `# Responsive Design Test Report

Generated: ${timestamp}
Total Files Tested: ${result.totalFiles}
Total Issues Found: ${result.issues.length}

## Summary

| Category | Issues |
|----------|--------|
| Breakpoints | ${result.summary.breakpoints} |
| Grid | ${result.summary.grid} |
| Mobile-first | ${result.summary.mobileFirst} |
| Layout | ${result.summary.layout} |

## Critical Issues (Errors)

${result.issues.filter(i => i.severity === 'error').map(issue =>
            `- **${issue.file}:${issue.line}** - ${issue.issue} (${issue.category})`
        ).join('\n')}

## Responsive Warnings

${result.issues.filter(i => i.severity === 'warning').slice(0, 20).map(issue =>
            `- **${issue.file}:${issue.line}** - ${issue.issue} (${issue.category})`
        ).join('\n')}

## Recommendations

### Immediate Actions
1. Fix all error-level responsive issues
2. Add responsive breakpoints to grid layouts
3. Review mobile-first design approach
4. Test layouts across different viewport sizes

### Responsive Design Best Practices
- Use mobile-first approach with min-width media queries
- Add responsive breakpoints to all grid layouts
- Ensure proper overflow handling for tables and content
- Test on actual devices, not just browser dev tools

### Testing Strategy
1. Test all pages on mobile devices (320px - 768px)
2. Test tablet layouts (768px - 1024px)
3. Test desktop layouts (1024px+)
4. Verify touch targets are at least 44px
5. Ensure content is readable without horizontal scrolling

### Next Steps
1. Address critical responsive errors first
2. Systematically add responsive breakpoints
3. Implement responsive testing in CI/CD
4. Create responsive design guidelines
`;
    }
}

// Main execution
async function main() {
    const tester = new ResponsiveDesignTester();
    await tester.generateResponsiveReport();
}

if (require.main === module) {
    main().catch(console.error);
}

export { ResponsiveDesignTester };

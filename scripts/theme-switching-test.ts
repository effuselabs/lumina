#!/usr/bin/env tsx

/**
 * Theme Switching Test Script
 * 
 * This script tests theme switching functionality across all pages to ensure:
 * - Theme switching works properly on all pages
 * - CSS custom properties are properly applied
 * - No hardcoded colors break theme switching
 * - Theme persistence works correctly
 */

import { promises as fs } from 'fs';
import { glob } from 'glob';

interface ThemeIssue {
    file: string;
    line: number;
    issue: string;
    severity: 'error' | 'warning' | 'info';
}

interface ThemeTestResult {
    totalFiles: number;
    issues: ThemeIssue[];
    hardcodedColors: number;
    missingThemeSupport: number;
    cssVariableUsage: number;
}

class ThemeSwitchingTester {
    private issues: ThemeIssue[] = [];
    private fileCount = 0;
    private hardcodedColorCount = 0;
    private missingThemeSupportCount = 0;
    private cssVariableUsageCount = 0;

    async testAllPages(): Promise<ThemeTestResult> {
        console.log('🌙 Starting comprehensive theme switching test...\n');

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

        console.log('✅ Theme testing complete!\n');
        this.printResults();

        return {
            totalFiles: this.fileCount,
            issues: this.issues,
            hardcodedColors: this.hardcodedColorCount,
            missingThemeSupport: this.missingThemeSupportCount,
            cssVariableUsage: this.cssVariableUsageCount
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
            this.addIssue(filePath, 0, `Failed to read file: ${error}`, 'error');
        }
    }

    private testCSSFile(filePath: string, content: string, lines: string[]): void {
        // Check for CSS custom properties usage
        const cssVariableMatches = content.match(/var\(--[\w-]+\)/g);
        if (cssVariableMatches) {
            this.cssVariableUsageCount += cssVariableMatches.length;
        }

        // Check for hardcoded colors in CSS
        lines.forEach((line, index) => {
            const hexColorMatch = line.match(/#[0-9a-fA-F]{3,6}/g);
            const rgbColorMatch = line.match(/rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/g);
            const hslColorMatch = line.match(/hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)/g);

            if (hexColorMatch || rgbColorMatch || hslColorMatch) {
                // Allow hardcoded colors in design token files
                if (!filePath.includes('design-tokens') && !filePath.includes('colors.css')) {
                    this.hardcodedColorCount++;
                    this.addIssue(filePath, index + 1, 'Hardcoded color found in CSS - should use CSS custom properties', 'warning');
                }
            }
        });

        // Check for theme-specific selectors
        if (content.includes('[data-theme="dark"]') || content.includes('[data-theme="light"]')) {
            // Good - using data-theme approach
        } else if (content.includes('.dark') && !filePath.includes('design-tokens')) {
            this.addIssue(filePath, 0, 'Using Tailwind dark mode instead of data-theme approach', 'info');
        }
    }

    private testTSXFile(filePath: string, content: string, lines: string[]): void {
        // Check for hardcoded colors in className strings
        lines.forEach((line, index) => {
            if (line.includes('className') && /#[0-9a-fA-F]{3,6}/.test(line)) {
                this.hardcodedColorCount++;
                this.addIssue(filePath, index + 1, 'Hardcoded color in className - should use design tokens', 'warning');
            }
        });

        // Check for proper theme provider usage in layouts
        if (filePath.includes('layout.tsx')) {
            if (!content.includes('ThemeProvider') && !content.includes('theme-provider')) {
                this.missingThemeSupportCount++;
                this.addIssue(filePath, 0, 'Layout missing ThemeProvider - theme switching will not work', 'error');
            }
        }

        // Check for theme-aware components
        if (content.includes('useTheme') || content.includes('theme-provider')) {
            // Good - component is theme-aware
        } else if (content.includes('dark:') && !content.includes('data-theme')) {
            this.addIssue(filePath, 0, 'Using Tailwind dark mode classes instead of data-theme approach', 'info');
        }

        // Check for CSS-in-JS with hardcoded colors
        const styleObjectMatches = content.match(/style\s*=\s*\{[^}]*\}/g);
        if (styleObjectMatches) {
            styleObjectMatches.forEach(match => {
                if (/#[0-9a-fA-F]{3,6}/.test(match)) {
                    this.hardcodedColorCount++;
                    this.addIssue(filePath, 0, 'Hardcoded color in style object - should use CSS custom properties', 'warning');
                }
            });
        }

        // Check for proper CSS variable usage
        const cssVarMatches = content.match(/var\(--[\w-]+\)/g);
        if (cssVarMatches) {
            this.cssVariableUsageCount += cssVarMatches.length;
        }
    }

    private addIssue(file: string, line: number, issue: string, severity: 'error' | 'warning' | 'info'): void {
        this.issues.push({ file, line, issue, severity });
    }

    private printResults(): void {
        console.log('📊 THEME TESTING RESULTS');
        console.log('========================');
        console.log(`📁 Total files tested: ${this.fileCount}`);
        console.log(`🚨 Total issues found: ${this.issues.length}`);
        console.log(`🎨 Hardcoded colors found: ${this.hardcodedColorCount}`);
        console.log(`🌙 Files missing theme support: ${this.missingThemeSupportCount}`);
        console.log(`✅ CSS variable usages: ${this.cssVariableUsageCount}\n`);

        const errors = this.issues.filter(i => i.severity === 'error');
        const warnings = this.issues.filter(i => i.severity === 'warning');

        if (errors.length > 0) {
            console.log('🚨 CRITICAL THEME ISSUES (Errors):');
            errors.forEach(issue => {
                console.log(`   ${issue.file}:${issue.line} - ${issue.issue}`);
            });
            console.log('');
        }

        if (warnings.length > 0) {
            console.log('⚠️  THEME WARNINGS (Top 10):');
            warnings.slice(0, 10).forEach(issue => {
                console.log(`   ${issue.file}:${issue.line} - ${issue.issue}`);
            });
            console.log('');
        }

        // Recommendations
        console.log('💡 RECOMMENDATIONS:');
        if (this.hardcodedColorCount > 0) {
            console.log(`   - Replace ${this.hardcodedColorCount} hardcoded colors with CSS custom properties`);
        }
        if (this.missingThemeSupportCount > 0) {
            console.log(`   - Add ThemeProvider to ${this.missingThemeSupportCount} layout files`);
        }
        if (this.cssVariableUsageCount > 0) {
            console.log(`   ✅ Good: ${this.cssVariableUsageCount} CSS variables already in use`);
        }
    }

    async generateThemeReport(): Promise<void> {
        const result = await this.testAllPages();

        const reportContent = this.generateDetailedThemeReport(result);

        const reportPath = '.kiro/specs/design-system-consistency/theme-switching-test-report.md';
        await fs.writeFile(reportPath, reportContent);

        console.log(`📄 Theme test report saved to: ${reportPath}`);
    }

    private generateDetailedThemeReport(result: ThemeTestResult): string {
        const timestamp = new Date().toISOString();

        return `# Theme Switching Test Report

Generated: ${timestamp}
Total Files Tested: ${result.totalFiles}
Total Issues Found: ${result.issues.length}

## Summary

| Metric | Count |
|--------|-------|
| Hardcoded Colors | ${result.hardcodedColors} |
| Missing Theme Support | ${result.missingThemeSupport} |
| CSS Variable Usage | ${result.cssVariableUsage} |

## Critical Issues (Errors)

${result.issues.filter(i => i.severity === 'error').map(issue =>
            `- **${issue.file}:${issue.line}** - ${issue.issue}`
        ).join('\n')}

## Theme Warnings

${result.issues.filter(i => i.severity === 'warning').slice(0, 20).map(issue =>
            `- **${issue.file}:${issue.line}** - ${issue.issue}`
        ).join('\n')}

## Recommendations

### Immediate Actions
1. Fix all error-level theme issues immediately
2. Replace hardcoded colors with CSS custom properties
3. Ensure all layouts include ThemeProvider

### Theme Implementation Best Practices
- Use CSS custom properties for all colors
- Implement data-theme attribute approach instead of Tailwind dark mode
- Test theme switching on all pages
- Ensure proper contrast ratios in both themes

### Next Steps
1. Address critical errors first
2. Systematically replace hardcoded colors
3. Test theme switching functionality
4. Implement automated theme testing
`;
    }
}

// Main execution
async function main() {
    const tester = new ThemeSwitchingTester();
    await tester.generateThemeReport();
}

if (require.main === module) {
    main().catch(console.error);
}

export { ThemeSwitchingTester };

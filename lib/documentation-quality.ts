/**
 * Documentation Quality Automation
 * Auto-detect broken links and stale content with Linear integration
 */

import { promises as fs } from 'fs';
import { glob } from 'glob';
import { dirname, join, resolve } from 'path';

export interface QualityIssue {
    type: 'broken-link' | 'stale-content';
    file: string;
    line?: number;
    description: string;
    severity: 'low' | 'medium' | 'high';
    autoFixable: boolean;
}

export interface QualityReport {
    issues: QualityIssue[];
    summary: {
        totalFiles: number;
        brokenLinks: number;
        staleContent: number;
        autoFixableIssues: number;
    };
}

/**
 * Check for broken internal links in markdown files
 */
export async function checkBrokenLinks(rootDir: string = '.'): Promise<QualityIssue[]> {
    const issues: QualityIssue[] = [];

    // Find all markdown files
    const markdownFiles = await glob('**/*.md', {
        cwd: rootDir,
        ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**']
    });

    for (const file of markdownFiles) {
        const filePath = join(rootDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Check for markdown links [text](path)
            const linkMatches = line.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g);

            for (const match of linkMatches) {
                const linkPath = match[2];

                // Skip external links (http/https)
                if (linkPath.startsWith('http://') || linkPath.startsWith('https://')) {
                    continue;
                }

                // Skip anchors and fragments
                if (linkPath.startsWith('#')) {
                    continue;
                }

                // Resolve relative path
                const resolvedPath = resolve(dirname(filePath), linkPath);

                try {
                    await fs.access(resolvedPath);
                } catch {
                    issues.push({
                        type: 'broken-link',
                        file,
                        line: i + 1,
                        description: `Broken link: ${linkPath}`,
                        severity: 'medium',
                        autoFixable: false
                    });
                }
            }
        }
    }

    return issues;
}

/**
 * Check for stale content (files not modified in 6+ months)
 */
export async function checkStaleContent(rootDir: string = '.'): Promise<QualityIssue[]> {
    const issues: QualityIssue[] = [];
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Find all documentation files
    const docFiles = await glob('**/*.{md,txt}', {
        cwd: rootDir,
        ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**', 'CHANGELOG.md', 'LICENSE*']
    });

    for (const file of docFiles) {
        const filePath = join(rootDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime < sixMonthsAgo) {
            // Check if file has meaningful content (not just a placeholder)
            const content = await fs.readFile(filePath, 'utf-8');
            const meaningfulContent = content.trim().length > 100; // Basic heuristic

            if (meaningfulContent) {
                issues.push({
                    type: 'stale-content',
                    file,
                    description: `Content not updated since ${stats.mtime.toDateString()}`,
                    severity: 'low',
                    autoFixable: false
                });
            }
        }
    }

    return issues;
}

/**
 * Run complete quality audit
 */
export async function runQualityAudit(rootDir: string = '.'): Promise<QualityReport> {
    console.log('🔍 Running documentation quality audit...');

    const [brokenLinkIssues, staleContentIssues] = await Promise.all([
        checkBrokenLinks(rootDir),
        checkStaleContent(rootDir)
    ]);

    const allIssues = [...brokenLinkIssues, ...staleContentIssues];

    // Count files scanned
    const allFiles = await glob('**/*.{md,txt}', {
        cwd: rootDir,
        ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**']
    });

    const report: QualityReport = {
        issues: allIssues,
        summary: {
            totalFiles: allFiles.length,
            brokenLinks: brokenLinkIssues.length,
            staleContent: staleContentIssues.length,
            autoFixableIssues: allIssues.filter(i => i.autoFixable).length
        }
    };

    return report;
}

/**
 * Format quality report for console output
 */
export function formatQualityReport(report: QualityReport): string {
    const { summary, issues } = report;

    let output = '\n📊 Documentation Quality Report\n';
    output += '================================\n\n';

    output += `📁 Files scanned: ${summary.totalFiles}\n`;
    output += `🔗 Broken links: ${summary.brokenLinks}\n`;
    output += `📅 Stale content: ${summary.staleContent}\n`;
    output += `🔧 Auto-fixable: ${summary.autoFixableIssues}\n\n`;

    if (issues.length === 0) {
        output += '✅ No issues found! Documentation quality looks good.\n';
        return output;
    }

    // Group issues by type
    const brokenLinks = issues.filter(i => i.type === 'broken-link');
    const staleContent = issues.filter(i => i.type === 'stale-content');

    if (brokenLinks.length > 0) {
        output += '🔗 Broken Links:\n';
        for (const issue of brokenLinks) {
            output += `  • ${issue.file}:${issue.line} - ${issue.description}\n`;
        }
        output += '\n';
    }

    if (staleContent.length > 0) {
        output += '📅 Stale Content (6+ months old):\n';
        for (const issue of staleContent) {
            output += `  • ${issue.file} - ${issue.description}\n`;
        }
        output += '\n';
    }

    return output;
}
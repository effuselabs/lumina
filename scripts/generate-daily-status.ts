#!/usr/bin/env tsx

/**
 * Daily Status File Generator
 * 
 * Generates a new daily status file from template with automatic date formatting
 * and creates the necessary directory structure.
 */

import { format } from 'date-fns';
import { promises as fs } from 'fs';
import { join } from 'path';

interface DailyStatusConfig {
    date?: Date;
    templatePath?: string;
    outputDir?: string;
    focus?: string;
    duration?: string;
}

class DailyStatusGenerator {
    private readonly templatePath: string;
    private readonly outputDir: string;

    constructor(config: DailyStatusConfig = {}) {
        this.templatePath = config.templatePath || 'docs/daily-status/templates/daily-status-template.md';
        this.outputDir = config.outputDir || 'docs/daily-status';
    }

    /**
     * Generate a new daily status file for the specified date
     */
    async generateDailyStatus(config: DailyStatusConfig = {}): Promise<string> {
        const date = config.date || new Date();
        const dateStr = format(date, 'yyyy-MM-dd');
        const displayDate = format(date, 'MMMM d, yyyy');

        try {
            // Ensure output directory exists
            await this.ensureDirectoryExists(this.outputDir);

            // Read template
            const template = await this.readTemplate();

            // Replace placeholders
            const content = this.replacePlaceholders(template, {
                date: dateStr,
                displayDate,
                focus: config.focus,
                duration: config.duration
            });

            // Generate output file path
            const outputPath = join(this.outputDir, `${dateStr}.md`);

            // Check if file already exists
            if (await this.fileExists(outputPath)) {
                throw new Error(`Daily status file for ${dateStr} already exists at ${outputPath}`);
            }

            // Write file
            await fs.writeFile(outputPath, content, 'utf8');

            console.log(`✅ Daily status file created: ${outputPath}`);
            return outputPath;

        } catch (error) {
            console.error('❌ Error generating daily status file:', error);
            throw error;
        }
    }

    /**
     * Update an existing daily status file with new content
     */
    async updateDailyStatus(date: Date, updates: Partial<DailyStatusUpdate>): Promise<void> {
        const dateStr = format(date, 'yyyy-MM-dd');
        const filePath = join(this.outputDir, `${dateStr}.md`);

        try {
            if (!(await this.fileExists(filePath))) {
                throw new Error(`Daily status file for ${dateStr} does not exist`);
            }

            const content = await fs.readFile(filePath, 'utf8');
            const updatedContent = this.applyUpdates(content, updates);

            await fs.writeFile(filePath, updatedContent, 'utf8');
            console.log(`✅ Daily status file updated: ${filePath}`);

        } catch (error) {
            console.error('❌ Error updating daily status file:', error);
            throw error;
        }
    }

    /**
     * List all daily status files
     */
    async listDailyStatusFiles(): Promise<string[]> {
        try {
            const files = await fs.readdir(this.outputDir);
            return files
                .filter(file => file.match(/^\d{4}-\d{2}-\d{2}\.md$/))
                .sort()
                .reverse(); // Most recent first
        } catch (error) {
            console.error('❌ Error listing daily status files:', error);
            return [];
        }
    }

    /**
     * Get the most recent daily status file
     */
    async getLatestDailyStatus(): Promise<string | null> {
        const files = await this.listDailyStatusFiles();
        return files.length > 0 ? join(this.outputDir, files[0]) : null;
    }

    private async readTemplate(): Promise<string> {
        try {
            return await fs.readFile(this.templatePath, 'utf8');
        } catch (error) {
            throw new Error(`Failed to read template file: ${this.templatePath}`);
        }
    }

    private replacePlaceholders(
        template: string,
        replacements: { date: string; displayDate: string; focus?: string; duration?: string }
    ): string {
        let content = template;

        // Replace date placeholders
        content = content.replace(/{DATE}/g, replacements.displayDate);
        content = content.replace(/\{DATE\}/g, replacements.displayDate);

        // Replace optional placeholders if provided
        if (replacements.focus) {
            content = content.replace(/\[Brief description of main focus area\]/g, replacements.focus);
        }

        if (replacements.duration) {
            content = content.replace(/\[Time spent or session length\]/g, replacements.duration);
        }

        // Generate unique blocker IDs with date
        const blockerId1 = `BLOCK-${replacements.date}-001`;
        const blockerId2 = `BLOCK-${replacements.date}-002`;
        content = content.replace(/BLOCK-\{DATE\}-001/g, blockerId1);
        content = content.replace(/BLOCK-\{DATE\}-002/g, blockerId2);

        return content;
    }

    private applyUpdates(content: string, updates: Partial<DailyStatusUpdate>): string {
        let updatedContent = content;

        if (updates.focus) {
            updatedContent = updatedContent.replace(
                /\*\*Focus\*\*: .*/,
                `**Focus**: ${updates.focus}`
            );
        }

        if (updates.status) {
            updatedContent = updatedContent.replace(
                /\*\*Status\*\*: .*/,
                `**Status**: ${updates.status}`
            );
        }

        if (updates.duration) {
            updatedContent = updatedContent.replace(
                /\*\*Duration\*\*: .*/,
                `**Duration**: ${updates.duration}`
            );
        }

        return updatedContent;
    }

    private async ensureDirectoryExists(dirPath: string): Promise<void> {
        try {
            await fs.access(dirPath);
        } catch {
            await fs.mkdir(dirPath, { recursive: true });
        }
    }

    private async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }
}

interface DailyStatusUpdate {
    focus: string;
    status: string;
    duration: string;
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    const generator = new DailyStatusGenerator();

    try {
        switch (command) {
            case 'generate':
            case 'new': {
                const dateArg = args[1];
                const focus = args.find(arg => arg.startsWith('--focus='))?.split('=')[1];
                const duration = args.find(arg => arg.startsWith('--duration='))?.split('=')[1];

                const date = dateArg ? new Date(dateArg) : new Date();

                if (isNaN(date.getTime())) {
                    throw new Error('Invalid date format. Use YYYY-MM-DD or leave empty for today.');
                }

                await generator.generateDailyStatus({ date, focus, duration });
                break;
            }

            case 'list': {
                const files = await generator.listDailyStatusFiles();
                console.log('📋 Daily Status Files:');
                files.forEach(file => console.log(`  - ${file}`));
                break;
            }

            case 'latest': {
                const latest = await generator.getLatestDailyStatus();
                if (latest) {
                    console.log(`📄 Latest daily status: ${latest}`);
                } else {
                    console.log('📄 No daily status files found');
                }
                break;
            }

            default: {
                console.log(`
📝 Daily Status Generator

Usage:
  npm run daily-status generate [date] [--focus="description"] [--duration="time"]
  npm run daily-status new [date] [--focus="description"] [--duration="time"]
  npm run daily-status list
  npm run daily-status latest

Examples:
  npm run daily-status generate
  npm run daily-status generate 2025-01-10
  npm run daily-status generate --focus="Dashboard implementation" --duration="4 hours"
  npm run daily-status list
  npm run daily-status latest

Options:
  date        Date in YYYY-MM-DD format (defaults to today)
  --focus     Brief description of main focus area
  --duration  Time spent or session length
        `);
                break;
            }
        }
    } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

// Export for programmatic use
export { DailyStatusGenerator };

// Run CLI if called directly
if (require.main === module) {
    main();
}
/**
 * Steering File Impact Analysis Tool
 * 
 * This tool analyzes development tasks against steering files to identify:
 * - Which tasks are affected by each steering file
 * - Dependencies between steering changes and development work
 * - Impact assessment for steering file updates
 * - Automated notifications for affected developers
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';

// Types for steering file analysis
interface SteeringFile {
    path: string;
    name: string;
    inclusion: 'always' | 'fileMatch' | 'manual';
    fileMatchPattern?: string[];
    content: string;
    patterns: string[];
    affectedFileTypes: string[];
}

interface DevelopmentTask {
    id: string;
    title: string;
    description: string;
    requirements: string[];
    affectedFiles: string[];
    estimatedEffort: number;
    dependencies: string[];
}

interface SteeringImpact {
    steeringFile: string;
    affectedTasks: string[];
    impactLevel: 'high' | 'medium' | 'low';
    changeType: 'breaking' | 'enhancement' | 'clarification';
    affectedDevelopers: string[];
    estimatedReworkHours: number;
}

interface TaskSteeringMapping {
    taskId: string;
    applicableSteering: string[];
    complianceChecks: ComplianceCheck[];
    implementationGuidance: string[];
}

interface ComplianceCheck {
    steeringFile: string;
    rule: string;
    severity: 'error' | 'warning' | 'info';
    description: string;
    autoFixAvailable: boolean;
}

// Schema for parsing steering file frontmatter
const SteeringFrontmatterSchema = z.object({
    inclusion: z.enum(['always', 'fileMatch', 'manual']).default('always'),
    fileMatchPattern: z.array(z.string()).optional()
});

export class SteeringImpactAnalyzer {
    private steeringFiles: SteeringFile[] = [];
    private developmentTasks: DevelopmentTask[] = [];
    private taskMappings: Map<string, TaskSteeringMapping> = new Map();

    constructor(
        private steeringDir: string = '.kiro/steering',
        private developmentPlanPath: string = 'docs/DEVELOPMENT_PLAN.md'
    ) { }

    /**
     * Load and parse all steering files
     */
    async loadSteeringFiles(): Promise<SteeringFile[]> {
        const steeringFiles: SteeringFile[] = [];

        try {
            const files = readdirSync(this.steeringDir).filter(f => f.endsWith('.md'));

            for (const file of files) {
                const filePath = join(this.steeringDir, file);
                const content = readFileSync(filePath, 'utf-8');

                // Parse frontmatter
                const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
                let frontmatter = { inclusion: 'always' as const };

                if (frontmatterMatch) {
                    try {
                        const yamlContent = frontmatterMatch[1];
                        // Simple YAML parsing for our specific needs
                        const inclusionMatch = yamlContent.match(/inclusion:\s*(\w+)/);
                        const patternMatch = yamlContent.match(/fileMatchPattern:\s*\[(.*?)\]/s);

                        if (inclusionMatch) {
                            frontmatter.inclusion = inclusionMatch[1] as 'always' | 'fileMatch' | 'manual';
                        }

                        if (patternMatch) {
                            const patterns = patternMatch[1]
                                .split(',')
                                .map(p => p.trim().replace(/['"]/g, ''))
                                .filter(p => p.length > 0);
                            (frontmatter as any).fileMatchPattern = patterns;
                        }
                    } catch (error) {
                        console.warn(`Failed to parse frontmatter for ${file}:`, error);
                    }
                }

                // Extract patterns and affected file types from content
                const patterns = this.extractPatternsFromContent(content);
                const affectedFileTypes = this.extractAffectedFileTypes(content, frontmatter);

                steeringFiles.push({
                    path: filePath,
                    name: file.replace('.md', ''),
                    inclusion: frontmatter.inclusion,
                    fileMatchPattern: (frontmatter as any).fileMatchPattern,
                    content,
                    patterns,
                    affectedFileTypes
                });
            }

            this.steeringFiles = steeringFiles;
            return steeringFiles;
        } catch (error) {
            console.error('Failed to load steering files:', error);
            return [];
        }
    }

    /**
     * Parse development plan and extract tasks
     */
    async loadDevelopmentTasks(): Promise<DevelopmentTask[]> {
        try {
            const content = readFileSync(this.developmentPlanPath, 'utf-8');
            const tasks = this.parseDevelopmentPlan(content);
            this.developmentTasks = tasks;
            return tasks;
        } catch (error) {
            console.error('Failed to load development plan:', error);
            return [];
        }
    }

    /**
     * Analyze which tasks are affected by each steering file
     */
    async analyzeSteeringImpact(): Promise<Map<string, SteeringImpact>> {
        await this.loadSteeringFiles();
        await this.loadDevelopmentTasks();

        const impactMap = new Map<string, SteeringImpact>();

        for (const steeringFile of this.steeringFiles) {
            const affectedTasks = this.findAffectedTasks(steeringFile);
            const impactLevel = this.calculateImpactLevel(affectedTasks.length, steeringFile);
            const estimatedReworkHours = this.estimateReworkEffort(affectedTasks, steeringFile);

            impactMap.set(steeringFile.name, {
                steeringFile: steeringFile.name,
                affectedTasks: affectedTasks.map(t => t.id),
                impactLevel,
                changeType: this.determineChangeType(steeringFile),
                affectedDevelopers: this.identifyAffectedDevelopers(affectedTasks),
                estimatedReworkHours
            });
        }

        return impactMap;
    }

    /**
     * Create mapping between tasks and applicable steering files
     */
    async createTaskSteeringMappings(): Promise<Map<string, TaskSteeringMapping>> {
        await this.loadSteeringFiles();
        await this.loadDevelopmentTasks();

        const mappings = new Map<string, TaskSteeringMapping>();

        for (const task of this.developmentTasks) {
            const applicableSteering = this.findApplicableSteeringFiles(task);
            const complianceChecks = this.generateComplianceChecks(task, applicableSteering);
            const implementationGuidance = this.extractImplementationGuidance(task, applicableSteering);

            mappings.set(task.id, {
                taskId: task.id,
                applicableSteering: applicableSteering.map(s => s.name),
                complianceChecks,
                implementationGuidance
            });
        }

        this.taskMappings = mappings;
        return mappings;
    }

    /**
     * Generate impact assessment report for steering file changes
     */
    async generateImpactReport(changedSteeringFiles: string[]): Promise<string> {
        const impactMap = await this.analyzeSteeringImpact();
        const mappings = await this.createTaskSteeringMappings();

        let report = '# Steering File Impact Assessment Report\n\n';
        report += `Generated: ${new Date().toISOString()}\n\n`;

        for (const steeringFileName of changedSteeringFiles) {
            const impact = impactMap.get(steeringFileName);
            if (!impact) continue;

            report += `## ${steeringFileName}.md\n\n`;
            report += `- **Impact Level**: ${impact.impactLevel.toUpperCase()}\n`;
            report += `- **Change Type**: ${impact.changeType}\n`;
            report += `- **Affected Tasks**: ${impact.affectedTasks.length}\n`;
            report += `- **Estimated Rework**: ${impact.estimatedReworkHours} hours\n\n`;

            if (impact.affectedTasks.length > 0) {
                report += '### Affected Tasks:\n\n';
                for (const taskId of impact.affectedTasks) {
                    const task = this.developmentTasks.find(t => t.id === taskId);
                    const mapping = mappings.get(taskId);

                    if (task && mapping) {
                        report += `- **${taskId}**: ${task.title}\n`;
                        report += `  - Requirements: ${task.requirements.join(', ')}\n`;
                        report += `  - Compliance Checks: ${mapping.complianceChecks.length}\n`;
                        report += `  - Implementation Guidance: ${mapping.implementationGuidance.length} items\n\n`;
                    }
                }
            }

            report += '---\n\n';
        }

        return report;
    }

    /**
     * Generate automated notifications for affected developers
     */
    async generateDeveloperNotifications(changedSteeringFiles: string[]): Promise<Map<string, string[]>> {
        const impactMap = await this.analyzeSteeringImpact();
        const notifications = new Map<string, string[]>();

        for (const steeringFileName of changedSteeringFiles) {
            const impact = impactMap.get(steeringFileName);
            if (!impact) continue;

            for (const developer of impact.affectedDevelopers) {
                if (!notifications.has(developer)) {
                    notifications.set(developer, []);
                }

                const message = `Steering file ${steeringFileName}.md has been updated. ` +
                    `This affects ${impact.affectedTasks.length} of your tasks with ${impact.impactLevel} impact. ` +
                    `Estimated rework: ${impact.estimatedReworkHours} hours.`;

                notifications.get(developer)!.push(message);
            }
        }

        return notifications;
    }

    // Private helper methods

    private extractPatternsFromContent(content: string): string[] {
        const patterns: string[] = [];

        // Extract code patterns from TypeScript examples
        const codeBlocks = content.match(/```typescript\n([\s\S]*?)\n```/g) || [];
        for (const block of codeBlocks) {
            // Extract function names, class names, interface names
            const functionMatches = block.match(/(?:function|const)\s+(\w+)/g) || [];
            const classMatches = block.match(/(?:class|interface)\s+(\w+)/g) || [];
            patterns.push(...functionMatches, ...classMatches);
        }

        // Extract file path patterns
        const pathMatches = content.match(/`[^`]*\.(ts|tsx|js|jsx|md|json)`/g) || [];
        patterns.push(...pathMatches.map(p => p.replace(/`/g, '')));

        return patterns;
    }

    private extractAffectedFileTypes(content: string, frontmatter: any): string[] {
        const fileTypes: string[] = [];

        // From fileMatchPattern in frontmatter
        if (frontmatter.fileMatchPattern) {
            for (const pattern of frontmatter.fileMatchPattern) {
                const extension = pattern.match(/\*\.(\w+)$/);
                if (extension) {
                    fileTypes.push(extension[1]);
                }
            }
        }

        // From content analysis
        const extensions = content.match(/\*\.(\w+)/g) || [];
        fileTypes.push(...extensions.map(e => e.replace('*.', '')));

        return [...new Set(fileTypes)];
    }

    private parseDevelopmentPlan(content: string): DevelopmentTask[] {
        const tasks: DevelopmentTask[] = [];

        // Parse Sprint sections
        const sprintSections = content.split(/### Sprint \d+:/);

        for (let i = 1; i < sprintSections.length; i++) {
            const section = sprintSections[i];
            const taskMatches = section.match(/\*\s+\*\*Task \d+:\*\*\s+(.+?)(?=\*\s+\*\*Task|\n\n|$)/gs) || [];

            for (const taskMatch of taskMatches) {
                const titleMatch = taskMatch.match(/\*\*Task \d+:\*\*\s+(.+)/);
                if (titleMatch) {
                    const taskId = `Sprint${i}-Task${tasks.length + 1}`;
                    const title = titleMatch[1].trim();

                    tasks.push({
                        id: taskId,
                        title,
                        description: taskMatch.trim(),
                        requirements: this.extractRequirementsFromTask(taskMatch),
                        affectedFiles: this.extractAffectedFilesFromTask(taskMatch),
                        estimatedEffort: this.estimateTaskEffort(taskMatch),
                        dependencies: []
                    });
                }
            }
        }

        return tasks;
    }

    private extractRequirementsFromTask(taskContent: string): string[] {
        // Extract requirements based on task content keywords
        const requirements: string[] = [];

        if (taskContent.toLowerCase().includes('auth')) requirements.push('Authentication');
        if (taskContent.toLowerCase().includes('database')) requirements.push('Database');
        if (taskContent.toLowerCase().includes('api')) requirements.push('API');
        if (taskContent.toLowerCase().includes('ui') || taskContent.toLowerCase().includes('interface')) requirements.push('UI/UX');
        if (taskContent.toLowerCase().includes('security')) requirements.push('Security');
        if (taskContent.toLowerCase().includes('payment') || taskContent.toLowerCase().includes('stripe')) requirements.push('Payment Processing');

        return requirements;
    }

    private extractAffectedFilesFromTask(taskContent: string): string[] {
        const files: string[] = [];

        // Extract file patterns based on task type
        if (taskContent.toLowerCase().includes('auth')) {
            files.push('lib/auth.ts', 'middleware.ts', 'app/auth/**/*.tsx');
        }
        if (taskContent.toLowerCase().includes('database')) {
            files.push('prisma/schema.prisma', 'lib/prisma.ts', 'lib/db-utils.ts');
        }
        if (taskContent.toLowerCase().includes('api')) {
            files.push('app/api/**/*.ts');
        }
        if (taskContent.toLowerCase().includes('ui') || taskContent.toLowerCase().includes('page')) {
            files.push('components/**/*.tsx', 'app/**/*.tsx');
        }

        return files;
    }

    private estimateTaskEffort(taskContent: string): number {
        // Simple effort estimation based on task complexity
        let effort = 4; // Base 4 hours

        if (taskContent.toLowerCase().includes('integration')) effort += 8;
        if (taskContent.toLowerCase().includes('database')) effort += 4;
        if (taskContent.toLowerCase().includes('security')) effort += 6;
        if (taskContent.toLowerCase().includes('payment')) effort += 8;
        if (taskContent.toLowerCase().includes('ui')) effort += 6;

        return effort;
    }

    private findAffectedTasks(steeringFile: SteeringFile): DevelopmentTask[] {
        return this.developmentTasks.filter(task => {
            // Check if task affects files matching steering file patterns
            if (steeringFile.fileMatchPattern) {
                for (const pattern of steeringFile.fileMatchPattern) {
                    for (const affectedFile of task.affectedFiles) {
                        if (this.matchesPattern(affectedFile, pattern)) {
                            return true;
                        }
                    }
                }
            }

            // Check if task requirements match steering file focus
            const steeringFocus = this.getSteeringFileFocus(steeringFile);
            return task.requirements.some(req =>
                steeringFocus.some(focus =>
                    req.toLowerCase().includes(focus.toLowerCase())
                )
            );
        });
    }

    private getSteeringFileFocus(steeringFile: SteeringFile): string[] {
        const focus: string[] = [];

        if (steeringFile.name.includes('api')) focus.push('API', 'Backend');
        if (steeringFile.name.includes('database')) focus.push('Database', 'Data');
        if (steeringFile.name.includes('security')) focus.push('Security', 'Authentication');
        if (steeringFile.name.includes('ui')) focus.push('UI', 'Frontend', 'Components');
        if (steeringFile.name.includes('coding')) focus.push('Code Quality', 'Standards');

        return focus;
    }

    private matchesPattern(filePath: string, pattern: string): boolean {
        // Simple glob pattern matching
        const regexPattern = pattern
            .replace(/\*\*/g, '.*')
            .replace(/\*/g, '[^/]*')
            .replace(/\./g, '\\.');

        return new RegExp(`^${regexPattern}$`).test(filePath);
    }

    private calculateImpactLevel(affectedTaskCount: number, steeringFile: SteeringFile): 'high' | 'medium' | 'low' {
        if (affectedTaskCount >= 5 || steeringFile.name.includes('security')) return 'high';
        if (affectedTaskCount >= 2) return 'medium';
        return 'low';
    }

    private determineChangeType(steeringFile: SteeringFile): 'breaking' | 'enhancement' | 'clarification' {
        if (steeringFile.name.includes('security') || steeringFile.name.includes('database')) {
            return 'breaking';
        }
        if (steeringFile.name.includes('ui') || steeringFile.name.includes('api')) {
            return 'enhancement';
        }
        return 'clarification';
    }

    private estimateReworkEffort(affectedTasks: DevelopmentTask[], steeringFile: SteeringFile): number {
        const baseRework = affectedTasks.reduce((sum, task) => sum + (task.estimatedEffort * 0.3), 0);

        // Adjust based on steering file type
        if (steeringFile.name.includes('security')) return Math.ceil(baseRework * 1.5);
        if (steeringFile.name.includes('database')) return Math.ceil(baseRework * 1.3);

        return Math.ceil(baseRework);
    }

    private identifyAffectedDevelopers(affectedTasks: DevelopmentTask[]): string[] {
        // For now, return generic developer roles based on task types
        const developers = new Set<string>();

        for (const task of affectedTasks) {
            if (task.requirements.includes('Authentication') || task.requirements.includes('Security')) {
                developers.add('Backend Developer');
            }
            if (task.requirements.includes('Database')) {
                developers.add('Database Developer');
            }
            if (task.requirements.includes('UI/UX')) {
                developers.add('Frontend Developer');
            }
            if (task.requirements.includes('API')) {
                developers.add('Backend Developer');
            }
        }

        return Array.from(developers);
    }

    private findApplicableSteeringFiles(task: DevelopmentTask): SteeringFile[] {
        return this.steeringFiles.filter(steeringFile => {
            // Always include files with 'always' inclusion
            if (steeringFile.inclusion === 'always') return true;

            // Check fileMatch patterns
            if (steeringFile.inclusion === 'fileMatch' && steeringFile.fileMatchPattern) {
                for (const pattern of steeringFile.fileMatchPattern) {
                    for (const affectedFile of task.affectedFiles) {
                        if (this.matchesPattern(affectedFile, pattern)) {
                            return true;
                        }
                    }
                }
            }

            return false;
        });
    }

    private generateComplianceChecks(task: DevelopmentTask, applicableSteering: SteeringFile[]): ComplianceCheck[] {
        const checks: ComplianceCheck[] = [];

        for (const steeringFile of applicableSteering) {
            // Generate checks based on steering file content
            if (steeringFile.name.includes('security')) {
                checks.push({
                    steeringFile: steeringFile.name,
                    rule: 'Business data isolation',
                    severity: 'error',
                    description: 'All queries must include businessId filter',
                    autoFixAvailable: false
                });
            }

            if (steeringFile.name.includes('api')) {
                checks.push({
                    steeringFile: steeringFile.name,
                    rule: 'Input validation',
                    severity: 'error',
                    description: 'Use Zod schemas for request validation',
                    autoFixAvailable: true
                });
            }

            if (steeringFile.name.includes('ui')) {
                checks.push({
                    steeringFile: steeringFile.name,
                    rule: 'Accessibility compliance',
                    severity: 'warning',
                    description: 'Include proper ARIA labels and semantic HTML',
                    autoFixAvailable: false
                });
            }
        }

        return checks;
    }

    private extractImplementationGuidance(task: DevelopmentTask, applicableSteering: SteeringFile[]): string[] {
        const guidance: string[] = [];

        for (const steeringFile of applicableSteering) {
            // Extract key guidance points from steering file content
            const lines = steeringFile.content.split('\n');

            for (const line of lines) {
                if (line.startsWith('- **') || line.startsWith('* **')) {
                    const guidancePoint = line.replace(/^[-*]\s*\*\*([^*]+)\*\*:?\s*/, '$1: ');
                    if (guidancePoint.length > 10) {
                        guidance.push(guidancePoint);
                    }
                }
            }
        }

        return guidance.slice(0, 5); // Limit to top 5 guidance points
    }
}

// Export utility functions for use in other modules
export async function analyzeSteeringImpact(changedFiles: string[] = []): Promise<string> {
    const analyzer = new SteeringImpactAnalyzer();
    return await analyzer.generateImpactReport(changedFiles);
}

export async function getTaskSteeringMappings(): Promise<Map<string, TaskSteeringMapping>> {
    const analyzer = new SteeringImpactAnalyzer();
    return await analyzer.createTaskSteeringMappings();
}

export async function notifyAffectedDevelopers(changedFiles: string[]): Promise<Map<string, string[]>> {
    const analyzer = new SteeringImpactAnalyzer();
    return await analyzer.generateDeveloperNotifications(changedFiles);
}
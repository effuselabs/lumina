#!/usr/bin/env tsx

/**
 * TypeScript Health Validation Script
 * 
 * Monitors TypeScript compilation health and tracks progress
 * during the comprehensive type safety audit (LUM-118)
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface ValidationResult {
  timestamp: string;
  totalErrors: number;
  totalFiles: number;
  buildSuccess: boolean;
  typeCheckSuccess: boolean;
  errorsByCategory: {
    prisma: number;
    services: number;
    api: number;
    components: number;
    tests: number;
    imports: number;
    other: number;
  };
  criticalFiles: string[];
  progressMetrics: {
    errorReduction: number;
    filesFixed: number;
    completionPercentage: number;
  };
}

class TypeScriptHealthValidator {
  private baselineFile = 'docs/project-management/typescript-audit-2025-10-01/typescript-baseline.json';
  private progressFile = 'docs/project-management/typescript-audit-2025-10-01/typescript-progress.json';
  private baseline: ValidationResult | null = null;

  constructor() {
    this.loadBaseline();
  }

  private loadBaseline(): void {
    if (existsSync(this.baselineFile)) {
      try {
        const data = readFileSync(this.baselineFile, 'utf-8');
        this.baseline = JSON.parse(data);
        console.log(`📊 Loaded baseline: ${this.baseline?.totalErrors} errors`);
      } catch (error) {
        console.warn('⚠️  Could not load baseline, will create new one');
      }
    }
  }

  async validateTypeScript(): Promise<ValidationResult> {
    console.log('🔍 Running TypeScript validation...');
    
    const result: ValidationResult = {
      timestamp: new Date().toISOString(),
      totalErrors: 0,
      totalFiles: 0,
      buildSuccess: false,
      typeCheckSuccess: false,
      errorsByCategory: {
        prisma: 0,
        services: 0,
        api: 0,
        components: 0,
        tests: 0,
        imports: 0,
        other: 0
      },
      criticalFiles: [],
      progressMetrics: {
        errorReduction: 0,
        filesFixed: 0,
        completionPercentage: 0
      }
    };

    // Test build success
    try {
      execSync('npm run build', { stdio: 'pipe' });
      result.buildSuccess = true;
      console.log('✅ Build successful');
    } catch (error) {
      result.buildSuccess = false;
      console.log('❌ Build failed');
    }

    // Run type check and parse results
    try {
      execSync('npm run type-check', { stdio: 'pipe' });
      result.typeCheckSuccess = true;
      console.log('✅ Type check successful');
    } catch (error: any) {
      result.typeCheckSuccess = false;
      const output = error.stdout?.toString() || error.stderr?.toString() || '';
      this.parseTypeCheckOutput(output, result);
    }

    // Calculate progress metrics
    this.calculateProgress(result);

    return result;
  }

  private parseTypeCheckOutput(output: string, result: ValidationResult): void {
    const lines = output.split('\n');
    const errorFiles = new Set<string>();
    
    for (const line of lines) {
      if (line.includes(' error TS')) {
        result.totalErrors++;
        
        // Extract file path
        const fileMatch = line.match(/^([^:]+):/);
        if (fileMatch) {
          const filePath = fileMatch[1];
          errorFiles.add(filePath);
          
          // Categorize errors
          this.categorizeError(filePath, line, result);
          
          // Track critical files (>10 errors)
          const fileErrorCount = lines.filter(l => l.startsWith(filePath)).length;
          if (fileErrorCount > 10) {
            result.criticalFiles.push(`${filePath} (${fileErrorCount} errors)`);
          }
        }
      }
    }

    result.totalFiles = errorFiles.size;

    // Parse summary if available
    const summaryMatch = output.match(/Found (\d+) errors in (\d+) files/);
    if (summaryMatch) {
      result.totalErrors = parseInt(summaryMatch[1]);
      result.totalFiles = parseInt(summaryMatch[2]);
    }
  }

  private categorizeError(filePath: string, errorLine: string, result: ValidationResult): void {
    if (filePath.includes('prisma/') || filePath.includes('factories/') || errorLine.includes('Prisma')) {
      result.errorsByCategory.prisma++;
    } else if (filePath.includes('lib/services/')) {
      result.errorsByCategory.services++;
    } else if (filePath.includes('app/api/')) {
      result.errorsByCategory.api++;
    } else if (filePath.includes('components/')) {
      result.errorsByCategory.components++;
    } else if (filePath.includes('__tests__/') || filePath.includes('.test.') || filePath.includes('.spec.')) {
      result.errorsByCategory.tests++;
    } else if (errorLine.includes('has no exported member') || errorLine.includes('Cannot find module')) {
      result.errorsByCategory.imports++;
    } else {
      result.errorsByCategory.other++;
    }
  }

  private calculateProgress(result: ValidationResult): void {
    if (!this.baseline) {
      // First run - set as baseline
      this.baseline = { ...result };
      this.saveBaseline();
      console.log('📊 Created new baseline with', result.totalErrors, 'errors');
      return;
    }

    const errorReduction = this.baseline.totalErrors - result.totalErrors;
    const filesFixed = this.baseline.totalFiles - result.totalFiles;
    const completionPercentage = Math.max(0, (errorReduction / this.baseline.totalErrors) * 100);

    result.progressMetrics = {
      errorReduction,
      filesFixed,
      completionPercentage
    };
  }

  private saveBaseline(): void {
    if (this.baseline) {
      writeFileSync(this.baselineFile, JSON.stringify(this.baseline, null, 2));
    }
  }

  saveProgress(result: ValidationResult): void {
    // Load existing progress
    let progressHistory: ValidationResult[] = [];
    if (existsSync(this.progressFile)) {
      try {
        const data = readFileSync(this.progressFile, 'utf-8');
        progressHistory = JSON.parse(data);
      } catch (error) {
        console.warn('⚠️  Could not load progress history');
      }
    }

    // Add current result
    progressHistory.push(result);

    // Keep only last 50 entries
    if (progressHistory.length > 50) {
      progressHistory = progressHistory.slice(-50);
    }

    // Save updated progress
    writeFileSync(this.progressFile, JSON.stringify(progressHistory, null, 2));
  }

  generateReport(result: ValidationResult): void {
    console.log('\n📋 TypeScript Health Report');
    console.log('=' .repeat(50));
    console.log(`🕐 Timestamp: ${result.timestamp}`);
    console.log(`📊 Total Errors: ${result.totalErrors}`);
    console.log(`📁 Files Affected: ${result.totalFiles}`);
    console.log(`🏗️  Build Success: ${result.buildSuccess ? '✅' : '❌'}`);
    console.log(`🔍 Type Check Success: ${result.typeCheckSuccess ? '✅' : '❌'}`);

    if (this.baseline && result.progressMetrics.errorReduction !== 0) {
      console.log('\n📈 Progress Metrics');
      console.log('-'.repeat(30));
      console.log(`🔻 Errors Reduced: ${result.progressMetrics.errorReduction}`);
      console.log(`📁 Files Fixed: ${result.progressMetrics.filesFixed}`);
      console.log(`📊 Completion: ${result.progressMetrics.completionPercentage.toFixed(1)}%`);
    }

    console.log('\n🏷️  Error Categories');
    console.log('-'.repeat(30));
    Object.entries(result.errorsByCategory).forEach(([category, count]) => {
      if (count > 0) {
        console.log(`${category.padEnd(12)}: ${count}`);
      }
    });

    if (result.criticalFiles.length > 0) {
      console.log('\n🚨 Critical Files (>10 errors)');
      console.log('-'.repeat(30));
      result.criticalFiles.slice(0, 10).forEach(file => {
        console.log(`  ${file}`);
      });
      if (result.criticalFiles.length > 10) {
        console.log(`  ... and ${result.criticalFiles.length - 10} more`);
      }
    }

    // Phase completion status
    this.reportPhaseStatus(result);
  }

  private reportPhaseStatus(result: ValidationResult): void {
    if (!this.baseline) return;

    const phases = [
      { name: 'Phase 1', target: this.baseline.totalErrors * 0.5, description: '50% error reduction' },
      { name: 'Phase 2', target: this.baseline.totalErrors * 0.2, description: '80% error reduction' },
      { name: 'Phase 3', target: this.baseline.totalErrors * 0.05, description: '95% error reduction' },
      { name: 'Phase 4', target: 0, description: 'Zero critical errors' }
    ];

    console.log('\n🎯 Phase Progress');
    console.log('-'.repeat(30));

    for (const phase of phases) {
      const completed = result.totalErrors <= phase.target;
      const status = completed ? '✅' : '⏳';
      console.log(`${status} ${phase.name}: ${phase.description} (Target: ≤${Math.round(phase.target)} errors)`);
      
      if (!completed) {
        const remaining = result.totalErrors - phase.target;
        console.log(`    ${Math.round(remaining)} errors remaining for this phase`);
        break; // Only show current phase details
      }
    }
  }

  async generateDetailedReport(): Promise<void> {
    const result = await this.validateTypeScript();
    this.saveProgress(result);
    this.generateReport(result);

    // Generate markdown report
    const reportPath = `docs/project-management/typescript-audit-2025-10-01/typescript-health-${new Date().toISOString().split('T')[0]}.md`;
    const markdownReport = this.generateMarkdownReport(result);
    writeFileSync(reportPath, markdownReport);
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }

  private generateMarkdownReport(result: ValidationResult): string {
    const baseline = this.baseline;
    
    return `# TypeScript Health Report - ${result.timestamp.split('T')[0]}

## Summary

- **Total Errors**: ${result.totalErrors}
- **Files Affected**: ${result.totalFiles}
- **Build Success**: ${result.buildSuccess ? '✅ Yes' : '❌ No'}
- **Type Check Success**: ${result.typeCheckSuccess ? '✅ Yes' : '❌ No'}

${baseline ? `## Progress Since Baseline

- **Baseline Errors**: ${baseline.totalErrors}
- **Current Errors**: ${result.totalErrors}
- **Errors Reduced**: ${result.progressMetrics.errorReduction}
- **Completion**: ${result.progressMetrics.completionPercentage.toFixed(1)}%

` : ''}## Error Categories

| Category | Count | Percentage |
|----------|-------|------------|
${Object.entries(result.errorsByCategory)
  .filter(([, count]) => count > 0)
  .map(([category, count]) => `| ${category} | ${count} | ${((count / result.totalErrors) * 100).toFixed(1)}% |`)
  .join('\n')}

${result.criticalFiles.length > 0 ? `## Critical Files (>10 errors)

${result.criticalFiles.map(file => `- ${file}`).join('\n')}

` : ''}## Next Steps

${result.totalErrors > 1000 ? '1. **Phase 1**: Focus on Prisma model and service layer fixes' :
  result.totalErrors > 400 ? '2. **Phase 2**: Address API routes and component type issues' :
  result.totalErrors > 100 ? '3. **Phase 3**: Clean up remaining import/export and test issues' :
  '4. **Phase 4**: Final validation and documentation updates'}

---
*Generated by TypeScript Health Validator*
`;
  }
}

// CLI execution
async function main() {
  const validator = new TypeScriptHealthValidator();
  
  const args = process.argv.slice(2);
  const command = args[0] || 'validate';

  switch (command) {
    case 'validate':
      const result = await validator.validateTypeScript();
      validator.saveProgress(result);
      validator.generateReport(result);
      break;
      
    case 'report':
      await validator.generateDetailedReport();
      break;
      
    case 'baseline':
      console.log('🔄 Resetting baseline...');
      const newBaseline = await validator.validateTypeScript();
      validator.saveProgress(newBaseline);
      console.log('✅ New baseline created');
      break;
      
    default:
      console.log('Usage: tsx scripts/validate-typescript-health.ts [validate|report|baseline]');
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { TypeScriptHealthValidator };
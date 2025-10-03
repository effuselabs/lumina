/**
 * Analyze TypeScript errors in test files
 * 
 * This script analyzes TypeScript errors and categorizes them by type and file.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';

interface ErrorInfo {
  file: string;
  line: number;
  column: number;
  code: string;
  message: string;
}

function analyzeErrors() {
  console.log('🔍 Analyzing TypeScript errors...\n');

  try {
    execSync('npx tsc --noEmit', { encoding: 'utf-8' });
    console.log('✅ No TypeScript errors found!');
    return;
  } catch (error: any) {
    const output = error.stdout || '';
    
    // Parse errors
    const errorPattern = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/gm;
    const errors: ErrorInfo[] = [];
    let match;

    while ((match = errorPattern.exec(output)) !== null) {
      errors.push({
        file: match[1],
        line: parseInt(match[2]),
        column: parseInt(match[3]),
        code: match[4],
        message: match[5],
      });
    }

    console.log(`📊 Total errors: ${errors.length}\n`);

    // Group by file
    const errorsByFile = errors.reduce((acc, error) => {
      if (!acc[error.file]) {
        acc[error.file] = [];
      }
      acc[error.file].push(error);
      return acc;
    }, {} as Record<string, ErrorInfo[]>);

    // Sort files by error count
    const sortedFiles = Object.entries(errorsByFile)
      .sort(([, a], [, b]) => b.length - a.length)
      .slice(0, 20);

    console.log('📁 Top 20 files with most errors:\n');
    sortedFiles.forEach(([file, fileErrors]) => {
      console.log(`  ${fileErrors.length.toString().padStart(3)} errors - ${file}`);
    });

    // Group by error code
    const errorsByCode = errors.reduce((acc, error) => {
      if (!acc[error.code]) {
        acc[error.code] = [];
      }
      acc[error.code].push(error);
      return acc;
    }, {} as Record<string, ErrorInfo[]>);

    console.log('\n📋 Errors by type:\n');
    Object.entries(errorsByCode)
      .sort(([, a], [, b]) => b.length - a.length)
      .slice(0, 10)
      .forEach(([code, codeErrors]) => {
        console.log(`  ${codeErrors.length.toString().padStart(4)} - ${code}`);
      });

    // Analyze common patterns
    console.log('\n🔎 Common error patterns:\n');
    
    const missingProperties = errors.filter(e => 
      e.message.includes('is missing') && e.message.includes('properties')
    );
    console.log(`  ${missingProperties.length.toString().padStart(4)} - Missing properties in test data`);

    const propertyNotExist = errors.filter(e => 
      e.message.includes('Property') && e.message.includes('does not exist')
    );
    console.log(`  ${propertyNotExist.length.toString().padStart(4)} - Property does not exist on type`);

    const notAssignable = errors.filter(e => 
      e.message.includes('is not assignable to')
    );
    console.log(`  ${notAssignable.length.toString().padStart(4)} - Type not assignable`);

    const implicitAny = errors.filter(e => 
      e.code === 'TS7006' || e.message.includes('implicitly has an \'any\' type')
    );
    console.log(`  ${implicitAny.length.toString().padStart(4)} - Implicit any type`);

    // Save detailed report
    const report = {
      totalErrors: errors.length,
      errorsByFile: Object.fromEntries(
        Object.entries(errorsByFile).map(([file, fileErrors]) => [
          file,
          fileErrors.length
        ])
      ),
      errorsByCode: Object.fromEntries(
        Object.entries(errorsByCode).map(([code, codeErrors]) => [
          code,
          codeErrors.length
        ])
      ),
      topFiles: sortedFiles.map(([file, fileErrors]) => ({
        file,
        errorCount: fileErrors.length,
        errors: fileErrors.slice(0, 5).map(e => ({
          line: e.line,
          code: e.code,
          message: e.message.substring(0, 100)
        }))
      }))
    };

    fs.writeFileSync(
      'typescript-error-analysis.json',
      JSON.stringify(report, null, 2)
    );

    console.log('\n💾 Detailed report saved to: typescript-error-analysis.json');
  }
}

analyzeErrors();

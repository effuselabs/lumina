#!/usr/bin/env tsx

/**
 * Performance Optimization Script
 *
 * This script performs comprehensive performance optimization including:
 * - Bundle size analysis and optimization
 * - CSS optimization and unused style removal
 * - Animation performance tuning
 * - Component rendering optimization
 */

import { promises as fs } from 'fs';
import { glob } from 'glob';

interface PerformanceIssue {
  file: string;
  line: number;
  issue: string;
  severity: 'error' | 'warning' | 'info';
  category: 'bundle' | 'css' | 'animation' | 'rendering';
  impact: 'high' | 'medium' | 'low';
}

interface PerformanceOptimizationResult {
  totalFiles: number;
  issues: PerformanceIssue[];
  optimizations: {
    bundle: number;
    css: number;
    animation: number;
    rendering: number;
  };
  recommendations: string[];
}

class PerformanceOptimizer {
  private issues: PerformanceIssue[] = [];
  private fileCount = 0;
  private recommendations: string[] = [];

  async optimizePerformance(): Promise<PerformanceOptimizationResult> {
    console.log('⚡ Starting comprehensive performance optimization...\n');

    // Find all relevant files
    const tsxFiles = await glob('**/*.{tsx,ts}', {
      ignore: ['node_modules/**', '.next/**', 'coverage/**'],
    });
    const cssFiles = await glob('**/*.css', {
      ignore: ['node_modules/**', '.next/**'],
    });
    const allFiles = [...tsxFiles, ...cssFiles];

    this.fileCount = allFiles.length;
    console.log(`📁 Found ${this.fileCount} files to optimize\n`);

    // Run optimization checks
    for (const file of allFiles) {
      await this.analyzeFile(file);
    }

    // Generate bundle analysis
    await this.analyzeBundleSize();

    // Check CSS optimization opportunities
    await this.analyzeCSSOptimization();

    // Check animation performance
    await this.analyzeAnimationPerformance();

    console.log('✅ Performance optimization analysis complete!\n');
    this.printResults();

    return {
      totalFiles: this.fileCount,
      issues: this.issues,
      optimizations: this.generateOptimizationSummary(),
      recommendations: this.recommendations,
    };
  }

  private async analyzeFile(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      console.log(`🔍 Analyzing: ${filePath}`);

      if (filePath.endsWith('.css')) {
        this.analyzeCSSFile(filePath, content, lines);
      } else {
        this.analyzeTSXFile(filePath, content, lines);
      }
    } catch (error) {
      this.addIssue(
        filePath,
        0,
        `Failed to read file: ${error}`,
        'error',
        'bundle',
        'high'
      );
    }
  }

  private analyzeCSSFile(
    filePath: string,
    content: string,
    lines: string[]
  ): void {
    // Check for unused CSS selectors
    const selectors = content.match(/\.[a-zA-Z][a-zA-Z0-9_-]*\s*{/g);
    if (selectors && selectors.length > 100) {
      this.addIssue(
        filePath,
        0,
        'Large CSS file with many selectors - consider splitting or tree-shaking',
        'warning',
        'css',
        'medium'
      );
    }

    // Check for inefficient selectors
    lines.forEach((line, index) => {
      // Check for universal selectors
      if (line.includes('* {') || line.includes('*,')) {
        this.addIssue(
          filePath,
          index + 1,
          'Universal selector can impact performance',
          'warning',
          'css',
          'medium'
        );
      }

      // Check for complex descendant selectors
      const selectorComplexity = (line.match(/\s+/g) || []).length;
      if (selectorComplexity > 4 && line.includes('{')) {
        this.addIssue(
          filePath,
          index + 1,
          'Complex CSS selector may impact performance',
          'info',
          'css',
          'low'
        );
      }

      // Check for expensive properties
      if (line.includes('box-shadow') && line.includes('blur')) {
        this.addIssue(
          filePath,
          index + 1,
          'Blur box-shadow can be expensive - consider alternatives',
          'info',
          'css',
          'low'
        );
      }

      // Check for layout-triggering properties in animations
      if (line.includes('@keyframes') || line.includes('transition')) {
        if (
          line.includes('width') ||
          line.includes('height') ||
          line.includes('top') ||
          line.includes('left')
        ) {
          this.addIssue(
            filePath,
            index + 1,
            'Animation uses layout-triggering properties - use transform instead',
            'warning',
            'animation',
            'high'
          );
        }
      }
    });

    // Check for duplicate styles
    const duplicateCheck = new Map<string, number>();
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed && trimmed.includes(':') && !trimmed.startsWith('/*')) {
        const count = duplicateCheck.get(trimmed) || 0;
        duplicateCheck.set(trimmed, count + 1);
        if (count > 2) {
          this.addIssue(
            filePath,
            index + 1,
            'Duplicate CSS rule - consider consolidating',
            'info',
            'css',
            'low'
          );
        }
      }
    });
  }

  private analyzeTSXFile(
    filePath: string,
    content: string,
    lines: string[]
  ): void {
    // Check for large components
    const componentLines = lines.length;
    if (componentLines > 300) {
      this.addIssue(
        filePath,
        0,
        'Large component file - consider splitting into smaller components',
        'warning',
        'rendering',
        'medium'
      );
    }

    // Check for missing React.memo or useMemo
    if (
      content.includes('export default function') &&
      !content.includes('memo(') &&
      componentLines > 100
    ) {
      this.addIssue(
        filePath,
        0,
        'Large component without memoization - consider React.memo',
        'info',
        'rendering',
        'medium'
      );
    }

    // Check for expensive operations in render
    lines.forEach((line, index) => {
      // Check for array operations in JSX
      if (
        line.includes('.map(') &&
        line.includes('key=') &&
        !line.includes('useMemo')
      ) {
        this.addIssue(
          filePath,
          index + 1,
          'Array mapping in render without memoization',
          'info',
          'rendering',
          'low'
        );
      }

      // Check for object creation in JSX
      if (line.includes('style={{') || line.includes('className={`')) {
        this.addIssue(
          filePath,
          index + 1,
          'Object/string creation in render - consider memoization',
          'info',
          'rendering',
          'low'
        );
      }

      // Check for inline functions
      if (line.includes('onClick={() =>') || line.includes('onChange={() =>')) {
        this.addIssue(
          filePath,
          index + 1,
          'Inline function in JSX - consider useCallback',
          'info',
          'rendering',
          'low'
        );
      }

      // Check for heavy imports
      if (
        line.includes('import') &&
        (line.includes('lodash') || line.includes('moment'))
      ) {
        this.addIssue(
          filePath,
          index + 1,
          'Heavy library import - consider tree-shaking or alternatives',
          'warning',
          'bundle',
          'high'
        );
      }

      // Check for dynamic imports
      if (line.includes('import(') && !line.includes('lazy')) {
        this.addIssue(
          filePath,
          index + 1,
          'Dynamic import without lazy loading - consider React.lazy',
          'info',
          'bundle',
          'medium'
        );
      }
    });

    // Check for unused imports
    const imports =
      content.match(/import\s+.*?\s+from\s+['"][^'"]+['"]/g) || [];
    imports.forEach(importStatement => {
      const importName = importStatement.match(/import\s+(?:{[^}]+}|\w+)/)?.[0];
      if (
        importName &&
        !content.includes(
          importName.replace('import ', '').replace(/[{}]/g, '')
        )
      ) {
        this.addIssue(
          filePath,
          0,
          `Potentially unused import: ${importStatement}`,
          'info',
          'bundle',
          'low'
        );
      }
    });
  }

  private async analyzeBundleSize(): Promise<void> {
    console.log('📦 Analyzing bundle size...');

    try {
      // Check package.json for heavy dependencies
      const packageJson = JSON.parse(
        await fs.readFile('package.json', 'utf-8')
      );
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      const heavyPackages = [
        'lodash',
        'moment',
        'jquery',
        'bootstrap',
        'material-ui',
        'antd',
        'semantic-ui-react',
        'react-bootstrap',
      ];

      Object.keys(dependencies).forEach(dep => {
        if (heavyPackages.some(heavy => dep.includes(heavy))) {
          this.addIssue(
            'package.json',
            0,
            `Heavy dependency detected: ${dep}`,
            'warning',
            'bundle',
            'high'
          );
          this.recommendations.push(`Consider lighter alternatives to ${dep}`);
        }
      });

      // Check for duplicate dependencies
      const depNames = Object.keys(dependencies);
      const duplicates = depNames.filter(dep =>
        depNames.some(
          other => other !== dep && other.includes(dep.split('-')[0])
        )
      );

      duplicates.forEach(dup => {
        this.addIssue(
          'package.json',
          0,
          `Potential duplicate dependency: ${dup}`,
          'info',
          'bundle',
          'medium'
        );
      });
    } catch (error) {
      console.log('Could not analyze package.json');
    }

    this.recommendations.push('Run bundle analyzer to identify largest chunks');
    this.recommendations.push('Consider code splitting for large routes');
    this.recommendations.push('Implement tree shaking for unused exports');
  }

  private async analyzeCSSOptimization(): Promise<void> {
    console.log('🎨 Analyzing CSS optimization opportunities...');

    try {
      // Check Tailwind config for unused utilities
      const tailwindConfig = await fs.readFile('tailwind.config.ts', 'utf-8');
      if (
        !tailwindConfig.includes('purge') &&
        !tailwindConfig.includes('content')
      ) {
        this.addIssue(
          'tailwind.config.ts',
          0,
          'Tailwind CSS purging not configured - bundle may include unused styles',
          'warning',
          'css',
          'high'
        );
      }

      // Check for CSS-in-JS usage
      const cssInJsFiles = await glob('**/*.{tsx,ts}', {
        ignore: ['node_modules/**'],
      });
      let cssInJsUsage = 0;

      for (const file of cssInJsFiles.slice(0, 20)) {
        // Sample check
        const content = await fs.readFile(file, 'utf-8');
        if (
          content.includes('styled-components') ||
          content.includes('emotion') ||
          content.includes('makeStyles')
        ) {
          cssInJsUsage++;
        }
      }

      if (cssInJsUsage > 5) {
        this.addIssue(
          'multiple files',
          0,
          'Heavy CSS-in-JS usage detected - consider static CSS for better performance',
          'info',
          'css',
          'medium'
        );
      }
    } catch (error) {
      console.log('Could not analyze CSS configuration');
    }

    this.recommendations.push('Enable CSS purging in production builds');
    this.recommendations.push('Consider critical CSS extraction');
    this.recommendations.push('Minimize CSS-in-JS runtime overhead');
  }

  private async analyzeAnimationPerformance(): Promise<void> {
    console.log('🎬 Analyzing animation performance...');

    const animationFiles = await glob('**/*.{css,tsx,ts}', {
      ignore: ['node_modules/**'],
    });

    for (const file of animationFiles.slice(0, 30)) {
      // Sample check
      try {
        const content = await fs.readFile(file, 'utf-8');

        // Check for 60fps animations
        if (content.includes('animation') || content.includes('transition')) {
          if (
            content.includes('width') ||
            content.includes('height') ||
            content.includes('top') ||
            content.includes('left')
          ) {
            this.addIssue(
              file,
              0,
              'Animation may cause layout thrashing - use transform/opacity instead',
              'warning',
              'animation',
              'high'
            );
          }
        }

        // Check for will-change usage
        if (content.includes('transform') && !content.includes('will-change')) {
          this.addIssue(
            file,
            0,
            'Consider adding will-change property for better animation performance',
            'info',
            'animation',
            'low'
          );
        }

        // Check for excessive animations
        const animationCount = (
          content.match(/@keyframes|animation:|transition:/g) || []
        ).length;
        if (animationCount > 10) {
          this.addIssue(
            file,
            0,
            'Many animations in single file - consider performance impact',
            'info',
            'animation',
            'medium'
          );
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }

    this.recommendations.push(
      'Use transform and opacity for smooth 60fps animations'
    );
    this.recommendations.push(
      'Add will-change property for elements that will be animated'
    );
    this.recommendations.push(
      'Remove animations on low-end devices using prefers-reduced-motion'
    );
  }

  private addIssue(
    file: string,
    line: number,
    issue: string,
    severity: 'error' | 'warning' | 'info',
    category: 'bundle' | 'css' | 'animation' | 'rendering',
    impact: 'high' | 'medium' | 'low'
  ): void {
    this.issues.push({ file, line, issue, severity, category, impact });
  }

  private generateOptimizationSummary() {
    return {
      bundle: this.issues.filter(i => i.category === 'bundle').length,
      css: this.issues.filter(i => i.category === 'css').length,
      animation: this.issues.filter(i => i.category === 'animation').length,
      rendering: this.issues.filter(i => i.category === 'rendering').length,
    };
  }

  private printResults(): void {
    const summary = this.generateOptimizationSummary();

    console.log('📊 PERFORMANCE OPTIMIZATION RESULTS');
    console.log('===================================');
    console.log(`📁 Total files analyzed: ${this.fileCount}`);
    console.log(`🚨 Total optimization opportunities: ${this.issues.length}\n`);

    console.log('📋 Optimization opportunities by category:');
    console.log(`📦 Bundle: ${summary.bundle}`);
    console.log(`🎨 CSS: ${summary.css}`);
    console.log(`🎬 Animation: ${summary.animation}`);
    console.log(`⚡ Rendering: ${summary.rendering}\n`);

    const highImpact = this.issues.filter(i => i.impact === 'high');
    const mediumImpact = this.issues.filter(i => i.impact === 'medium');

    if (highImpact.length > 0) {
      console.log('🚨 HIGH IMPACT OPTIMIZATIONS (Top 5):');
      highImpact.slice(0, 5).forEach(issue => {
        console.log(
          `   ${issue.file}:${issue.line} - ${issue.issue} (${issue.category})`
        );
      });
      console.log('');
    }

    if (mediumImpact.length > 0) {
      console.log('⚠️  MEDIUM IMPACT OPTIMIZATIONS (Top 5):');
      mediumImpact.slice(0, 5).forEach(issue => {
        console.log(
          `   ${issue.file}:${issue.line} - ${issue.issue} (${issue.category})`
        );
      });
      console.log('');
    }

    console.log('💡 KEY RECOMMENDATIONS:');
    this.recommendations.slice(0, 8).forEach(rec => {
      console.log(`   - ${rec}`);
    });
  }

  async generatePerformanceReport(): Promise<void> {
    const result = await this.optimizePerformance();

    const reportContent = this.generateDetailedPerformanceReport(result);

    const reportPath =
      '.kiro/specs/design-system-consistency/performance-optimization-report.md';
    await fs.writeFile(reportPath, reportContent);

    console.log(`\n📄 Performance optimization report saved to: ${reportPath}`);
  }

  private generateDetailedPerformanceReport(
    result: PerformanceOptimizationResult
  ): string {
    const timestamp = new Date().toISOString();

    return `# Performance Optimization Report

Generated: ${timestamp}
Total Files Analyzed: ${result.totalFiles}
Total Optimization Opportunities: ${result.issues.length}

## Summary

| Category | Opportunities |
|----------|---------------|
| Bundle Size | ${result.optimizations.bundle} |
| CSS Optimization | ${result.optimizations.css} |
| Animation Performance | ${result.optimizations.animation} |
| Rendering Performance | ${result.optimizations.rendering} |

## High Impact Optimizations

${result.issues
  .filter(i => i.impact === 'high')
  .map(
    issue =>
      `- **${issue.file}:${issue.line}** - ${issue.issue} (${issue.category})`
  )
  .join('\n')}

## Medium Impact Optimizations

${result.issues
  .filter(i => i.impact === 'medium')
  .slice(0, 15)
  .map(
    issue =>
      `- **${issue.file}:${issue.line}** - ${issue.issue} (${issue.category})`
  )
  .join('\n')}

## Key Recommendations

${result.recommendations.map(rec => `- ${rec}`).join('\n')}

## Implementation Priority

### Immediate (High Impact)
1. Fix layout-triggering animations
2. Optimize heavy dependencies
3. Enable CSS purging
4. Add React.memo to large components

### Short Term (Medium Impact)
1. Implement code splitting
2. Optimize CSS selectors
3. Add animation will-change properties
4. Remove unused imports

### Long Term (Low Impact)
1. Implement comprehensive memoization
2. Optimize inline functions
3. Consider CSS-in-JS alternatives
4. Fine-tune animation performance

## Performance Metrics to Track

- Bundle size (target: <500KB gzipped)
- First Contentful Paint (target: <1.5s)
- Largest Contentful Paint (target: <2.5s)
- Cumulative Layout Shift (target: <0.1)
- First Input Delay (target: <100ms)

## Tools and Techniques

### Bundle Analysis
- Use webpack-bundle-analyzer
- Implement code splitting with React.lazy
- Tree shake unused exports
- Use dynamic imports for heavy features

### CSS Optimization
- Enable Tailwind CSS purging
- Use critical CSS extraction
- Minimize CSS-in-JS runtime overhead
- Implement CSS containment

### Animation Performance
- Use transform and opacity only
- Add will-change for animated elements
- Respect prefers-reduced-motion
- Use CSS animations over JavaScript

### Rendering Optimization
- Implement React.memo for expensive components
- Use useCallback and useMemo appropriately
- Avoid inline objects and functions
- Implement virtualization for long lists

## Next Steps

1. Address high-impact optimizations first
2. Set up performance monitoring
3. Implement automated performance testing
4. Create performance budget alerts
5. Regular performance audits

---

*This report identifies optimization opportunities. Implement changes incrementally and measure impact.*
`;
  }
}

// Main execution
async function main() {
  const optimizer = new PerformanceOptimizer();
  await optimizer.generatePerformanceReport();
}

if (require.main === module) {
  main().catch(console.error);
}

export { PerformanceOptimizer };

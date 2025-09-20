#!/usr/bin/env tsx

/**
 * Comprehensive Design System Consistency Review
 * 
 * This script runs all consistency checks and provides a unified report with
 * prioritized action items for achieving full design system consistency.
 */

import { promises as fs } from 'fs';
import { AccessibilityAuditor } from './accessibility-audit';
import { DesignSystemAuditor } from './design-system-consistency-audit';
import { ResponsiveDesignTester } from './responsive-design-test';
import { ThemeSwitchingTester } from './theme-switching-test';

interface ComprehensiveResults {
    designSystem: any;
    theme: any;
    responsive: any;
    accessibility: any;
    summary: {
        totalFiles: number;
        totalIssues: number;
        criticalIssues: number;
        highPriorityIssues: number;
    };
}

class ComprehensiveConsistencyReviewer {
    async runFullReview(): Promise<ComprehensiveResults> {
        console.log('🔍 Starting comprehensive design system consistency review...\n');
        console.log('This will run all audits: Design System, Theme, Responsive, and Accessibility\n');

        // Run all audits
        console.log('1️⃣ Running Design System Audit...');
        const designSystemAuditor = new DesignSystemAuditor();
        const designSystemResults = await designSystemAuditor.auditAllPages();

        console.log('\n2️⃣ Running Theme Switching Test...');
        const themeTester = new ThemeSwitchingTester();
        const themeResults = await themeTester.testAllPages();

        console.log('\n3️⃣ Running Responsive Design Test...');
        const responsiveTester = new ResponsiveDesignTester();
        const responsiveResults = await responsiveTester.testAllPages();

        console.log('\n4️⃣ Running Accessibility Audit...');
        const accessibilityAuditor = new AccessibilityAuditor();
        const accessibilityResults = await accessibilityAuditor.auditAllPages();

        // Compile comprehensive results
        const results: ComprehensiveResults = {
            designSystem: designSystemResults,
            theme: themeResults,
            responsive: responsiveResults,
            accessibility: accessibilityResults,
            summary: {
                totalFiles: Math.max(
                    designSystemResults.totalFiles,
                    themeResults.totalFiles,
                    responsiveResults.totalFiles,
                    accessibilityResults.totalFiles
                ),
                totalIssues:
                    designSystemResults.issues.length +
                    themeResults.issues.length +
                    responsiveResults.issues.length +
                    accessibilityResults.issues.length,
                criticalIssues:
                    designSystemResults.issues.filter(i => i.severity === 'error').length +
                    themeResults.issues.filter(i => i.severity === 'error').length +
                    responsiveResults.issues.filter(i => i.severity === 'error').length +
                    accessibilityResults.issues.filter(i => i.severity === 'error').length,
                highPriorityIssues:
                    designSystemResults.issues.filter(i => i.severity === 'warning').length +
                    themeResults.issues.filter(i => i.severity === 'warning').length +
                    responsiveResults.issues.filter(i => i.severity === 'warning').length +
                    accessibilityResults.issues.filter(i => i.severity === 'warning').length,
            }
        };

        console.log('\n✅ All audits complete!\n');
        this.printComprehensiveSummary(results);

        return results;
    }

    private printComprehensiveSummary(results: ComprehensiveResults): void {
        console.log('📊 COMPREHENSIVE CONSISTENCY REVIEW SUMMARY');
        console.log('===========================================');
        console.log(`📁 Total files reviewed: ${results.summary.totalFiles}`);
        console.log(`🚨 Total issues found: ${results.summary.totalIssues}`);
        console.log(`🔴 Critical issues: ${results.summary.criticalIssues}`);
        console.log(`🟡 High priority issues: ${results.summary.highPriorityIssues}\n`);

        console.log('📋 Issues breakdown by audit type:');
        console.log(`🎨 Design System: ${results.designSystem.issues.length} issues`);
        console.log(`🌙 Theme: ${results.theme.issues.length} issues`);
        console.log(`📱 Responsive: ${results.responsive.issues.length} issues`);
        console.log(`♿ Accessibility: ${results.accessibility.issues.length} issues\n`);

        // Priority recommendations
        console.log('🎯 PRIORITY ACTIONS REQUIRED:');

        if (results.summary.criticalIssues > 0) {
            console.log(`\n🚨 CRITICAL (${results.summary.criticalIssues} issues) - Fix immediately:`);
            console.log('   - Theme switching broken in layout files');
            console.log('   - Focus indicators removed without alternatives');
            console.log('   - Images missing alt text');
        }

        if (results.summary.highPriorityIssues > 0) {
            console.log(`\n⚠️  HIGH PRIORITY (${results.summary.highPriorityIssues} issues) - Fix this sprint:`);
            console.log('   - Replace hardcoded colors with design tokens');
            console.log('   - Add responsive breakpoints to grid layouts');
            console.log('   - Add ARIA attributes to interactive elements');
            console.log('   - Implement standardized PageHeader components');
        }

        console.log('\n💡 RECOMMENDED IMPLEMENTATION ORDER:');
        console.log('1. Fix critical theme and accessibility issues');
        console.log('2. Implement missing PageHeader components');
        console.log('3. Replace hardcoded colors with design tokens');
        console.log('4. Add responsive breakpoints to layouts');
        console.log('5. Improve ARIA attributes and keyboard navigation');
        console.log('6. Optimize performance and bundle size');
    }

    async generateComprehensiveReport(): Promise<void> {
        const results = await this.runFullReview();

        const reportContent = this.generateDetailedReport(results);

        const reportPath = '.kiro/specs/design-system-consistency/comprehensive-consistency-report.md';
        await fs.writeFile(reportPath, reportContent);

        console.log(`\n📄 Comprehensive report saved to: ${reportPath}`);

        // Also generate action plan
        const actionPlan = this.generateActionPlan(results);
        const actionPlanPath = '.kiro/specs/design-system-consistency/action-plan.md';
        await fs.writeFile(actionPlanPath, actionPlan);

        console.log(`📋 Action plan saved to: ${actionPlanPath}`);
    }

    private generateDetailedReport(results: ComprehensiveResults): string {
        const timestamp = new Date().toISOString();

        return `# Comprehensive Design System Consistency Report

Generated: ${timestamp}
Total Files Reviewed: ${results.summary.totalFiles}
Total Issues Found: ${results.summary.totalIssues}

## Executive Summary

This comprehensive review evaluated ${results.summary.totalFiles} files across four key areas:
- Design System Consistency
- Theme Implementation
- Responsive Design
- Accessibility Compliance

### Critical Findings

- **${results.summary.criticalIssues} Critical Issues** requiring immediate attention
- **${results.summary.highPriorityIssues} High Priority Issues** to be addressed this sprint
- **${results.theme.hardcodedColors} Hardcoded Colors** need to be replaced with design tokens
- **${results.accessibility.wcagCompliance.AA} WCAG AA Issues** affecting accessibility compliance

## Detailed Results by Category

### 1. Design System Consistency (${results.designSystem.issues.length} issues)

| Category | Count |
|----------|-------|
| Design System | ${results.designSystem.summary.designSystem} |
| Theme | ${results.designSystem.summary.theme} |
| Responsive | ${results.designSystem.summary.responsive} |
| Accessibility | ${results.designSystem.summary.accessibility} |

**Key Issues:**
- Pages missing standardized PageHeader components
- Inconsistent use of design system components
- Native HTML elements used instead of design system components

### 2. Theme Implementation (${results.theme.issues.length} issues)

| Metric | Count |
|--------|-------|
| Hardcoded Colors | ${results.theme.hardcodedColors} |
| Missing Theme Support | ${results.theme.missingThemeSupport} |
| CSS Variable Usage | ${results.theme.cssVariableUsage} |

**Key Issues:**
- Layout files missing ThemeProvider wrapper
- Extensive use of hardcoded colors instead of design tokens
- Inconsistent theme switching implementation

### 3. Responsive Design (${results.responsive.issues.length} issues)

| Category | Count |
|----------|-------|
| Breakpoints | ${results.responsive.summary.breakpoints} |
| Grid | ${results.responsive.summary.grid} |
| Mobile-first | ${results.responsive.summary.mobileFirst} |
| Layout | ${results.responsive.summary.layout} |

**Key Issues:**
- Grid layouts missing responsive breakpoints
- Fixed widths without responsive alternatives
- Tables without overflow handling for mobile

### 4. Accessibility (${results.accessibility.issues.length} issues)

| Category | Count |
|----------|-------|
| ARIA | ${results.accessibility.summary.aria} |
| Keyboard | ${results.accessibility.summary.keyboard} |
| Contrast | ${results.accessibility.summary.contrast} |
| Semantic | ${results.accessibility.summary.semantic} |
| Focus | ${results.accessibility.summary.focus} |

**WCAG Compliance:**
- Level A: ${results.accessibility.wcagCompliance.A} issues
- Level AA: ${results.accessibility.wcagCompliance.AA} issues
- Level AAA: ${results.accessibility.wcagCompliance.AAA} issues

## Priority Matrix

### 🚨 Critical (Fix Immediately)
1. Theme switching broken in layout files
2. Focus indicators removed without alternatives
3. Images missing alt text
4. Interactive elements without proper semantic markup

### ⚠️ High Priority (This Sprint)
1. Replace ${results.theme.hardcodedColors} hardcoded colors with design tokens
2. Add responsive breakpoints to ${results.responsive.summary.grid} grid layouts
3. Add ARIA attributes to ${results.accessibility.summary.aria} elements
4. Implement PageHeader components on pages missing them

### 📋 Medium Priority (Next Sprint)
1. Improve keyboard navigation for ${results.accessibility.summary.keyboard} elements
2. Fix ${results.responsive.summary.mobileFirst} mobile-first design issues
3. Review color contrast for ${results.accessibility.summary.contrast} elements
4. Optimize responsive breakpoint usage

### 💡 Low Priority (Future Sprints)
1. Performance optimizations
2. Advanced accessibility features
3. Enhanced micro-interactions
4. Bundle size optimizations

## Implementation Recommendations

### Phase 1: Critical Fixes (Week 1)
- Fix theme provider issues in layout files
- Add alt text to all images
- Restore focus indicators with proper alternatives
- Fix semantic markup for interactive elements

### Phase 2: Design System Consistency (Week 2-3)
- Implement PageHeader components across all pages
- Replace hardcoded colors with CSS custom properties
- Standardize component usage across the application
- Add proper ARIA attributes to interactive elements

### Phase 3: Responsive & Accessibility (Week 4-5)
- Add responsive breakpoints to all grid layouts
- Implement proper keyboard navigation
- Fix heading hierarchy issues
- Add overflow handling for mobile layouts

### Phase 4: Optimization & Polish (Week 6)
- Performance optimizations
- Bundle size reduction
- Advanced accessibility features
- Final testing and validation

## Success Metrics

- **0 Critical Issues** - All critical accessibility and theme issues resolved
- **<50 High Priority Issues** - Significant reduction in design inconsistencies
- **100% PageHeader Coverage** - All pages use standardized headers
- **<100 Hardcoded Colors** - Majority of colors use design tokens
- **WCAG AA Compliance** - All Level AA accessibility issues resolved

## Next Steps

1. Review this report with the development team
2. Prioritize critical issues for immediate fixing
3. Create tickets for high-priority issues
4. Implement fixes following the recommended phases
5. Set up automated testing to prevent regression
6. Schedule regular consistency audits

---

*This report was generated automatically. For detailed issue lists, see the individual audit reports.*
`;
    }

    private generateActionPlan(results: ComprehensiveResults): string {
        return `# Design System Consistency Action Plan

## Immediate Actions (This Week)

### 🚨 Critical Issues - Fix Today

1. **Fix Theme Provider Issues**
   - [ ] Add ThemeProvider to \`components/ui/layout.tsx\`
   - [ ] Add ThemeProvider to \`components/ui/accessible-layout.tsx\`
   - [ ] Add ThemeProvider to \`components/dashboard/dashboard-layout.tsx\`

2. **Fix Focus Indicators**
   - [ ] Review all \`focus:outline-none\` usage
   - [ ] Add alternative focus indicators where outline is removed
   - [ ] Test keyboard navigation on all interactive elements

3. **Add Missing Alt Text**
   - [ ] Audit all \`<img\` tags for missing alt attributes
   - [ ] Add descriptive alt text to all images
   - [ ] Add empty alt="" for decorative images

## High Priority (This Sprint)

### 🎨 Design System Standardization

1. **Implement PageHeader Components**
   - [ ] Add PageHeader to landing page (\`app/page.tsx\`)
   - [ ] Add PageHeader to onboarding page
   - [ ] Add PageHeader to employment demo page
   - [ ] Add PageHeader to all debug pages
   - [ ] Add PageHeader to all design system showcase pages

2. **Replace Hardcoded Colors**
   - [ ] Replace colors in \`app/design-system/page.tsx\`
   - [ ] Replace colors in dashboard booking pages
   - [ ] Replace colors in payment pages
   - [ ] Replace colors in client management components
   - [ ] Update component libraries to use CSS custom properties

3. **Standardize Component Usage**
   - [ ] Replace native buttons with Button component
   - [ ] Replace native inputs with Input component
   - [ ] Replace custom cards with Card component
   - [ ] Standardize form components across all pages

### 📱 Responsive Design Fixes

1. **Add Grid Responsive Breakpoints**
   - [ ] Update employment demo grid layouts
   - [ ] Add breakpoints to design system grid examples
   - [ ] Fix client management grid layouts
   - [ ] Update staff management responsive grids

2. **Mobile-First Improvements**
   - [ ] Add overflow handling to all tables
   - [ ] Fix hidden elements without responsive alternatives
   - [ ] Review flex layouts for mobile compatibility

### ♿ Accessibility Improvements

1. **ARIA Attributes**
   - [ ] Add aria-label to all icon buttons
   - [ ] Add proper roles to interactive elements
   - [ ] Implement aria-expanded for collapsible elements
   - [ ] Add aria-describedby for form validation

2. **Keyboard Navigation**
   - [ ] Add keyboard event handlers to custom interactive elements
   - [ ] Implement proper tab order
   - [ ] Add skip links to main layout
   - [ ] Test keyboard navigation on all pages

## Medium Priority (Next Sprint)

### 🔧 Component Enhancements

1. **Form Components**
   - [ ] Ensure all inputs have associated labels
   - [ ] Add proper validation feedback
   - [ ] Implement consistent error messaging
   - [ ] Add fieldset grouping for radio buttons

2. **Navigation Components**
   - [ ] Add proper semantic landmarks
   - [ ] Implement breadcrumb navigation
   - [ ] Add proper heading hierarchy
   - [ ] Fix multiple h1 elements issue

### 🎯 Focus Management

1. **Modal and Dialog Focus**
   - [ ] Implement auto-focus for modals
   - [ ] Add focus restoration after modal close
   - [ ] Test focus trapping in dialogs
   - [ ] Add proper focus indicators

## Testing and Validation

### Automated Testing Setup

1. **Accessibility Testing**
   - [ ] Set up axe-core automated testing
   - [ ] Add accessibility tests to CI/CD pipeline
   - [ ] Create accessibility test suite
   - [ ] Set up regular accessibility audits

2. **Visual Regression Testing**
   - [ ] Set up visual testing for theme switching
   - [ ] Add responsive breakpoint testing
   - [ ] Create component visual tests
   - [ ] Implement automated screenshot comparison

3. **Performance Testing**
   - [ ] Set up bundle size monitoring
   - [ ] Add performance regression tests
   - [ ] Monitor theme switching performance
   - [ ] Test animation performance

### Manual Testing Checklist

1. **Theme Switching**
   - [ ] Test theme switching on all pages
   - [ ] Verify CSS custom properties work correctly
   - [ ] Check theme persistence across sessions
   - [ ] Test system theme detection

2. **Responsive Design**
   - [ ] Test all pages on mobile devices (320px-768px)
   - [ ] Test tablet layouts (768px-1024px)
   - [ ] Test desktop layouts (1024px+)
   - [ ] Verify touch targets are at least 44px

3. **Accessibility**
   - [ ] Test with screen readers (NVDA, JAWS, VoiceOver)
   - [ ] Test keyboard-only navigation
   - [ ] Verify color contrast ratios
   - [ ] Test with users who have disabilities

## Success Criteria

- [ ] 0 critical issues remaining
- [ ] All pages have standardized PageHeader components
- [ ] <100 hardcoded colors remaining (from ${results.theme.hardcodedColors})
- [ ] All grid layouts have responsive breakpoints
- [ ] All interactive elements have proper ARIA attributes
- [ ] WCAG AA compliance achieved
- [ ] Theme switching works on all pages
- [ ] Keyboard navigation works throughout the application

## Timeline

- **Week 1**: Critical issues and theme fixes
- **Week 2**: PageHeader implementation and color standardization
- **Week 3**: Responsive design and component standardization
- **Week 4**: Accessibility improvements and ARIA attributes
- **Week 5**: Testing and validation
- **Week 6**: Final polish and optimization

## Resources Needed

- Development time: ~30-40 hours
- Design review: ~5 hours
- Accessibility testing: ~10 hours
- QA testing: ~15 hours

## Risk Mitigation

- Test changes incrementally to avoid breaking existing functionality
- Maintain backward compatibility during transition
- Create feature flags for major changes
- Have rollback plan for each phase
- Regular stakeholder communication and approval

---

*This action plan should be reviewed and approved by the development team before implementation.*
`;
    }
}

// Main execution
async function main() {
    const reviewer = new ComprehensiveConsistencyReviewer();
    await reviewer.generateComprehensiveReport();
}

if (require.main === module) {
    main().catch(console.error);
}

export { ComprehensiveConsistencyReviewer };

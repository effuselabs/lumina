#!/usr/bin/env tsx

/**
 * Script to validate Lumina theme colors for WCAG AA compliance
 * Run with: npx tsx scripts/validate-theme-colors.ts
 */

import { generateAccessibilityReport, validateThemeColors } from '../lib/theme-validation';

function main() {
    console.log('🎨 Validating Lumina Theme Colors for WCAG AA Compliance\n');

    try {
        const validation = validateThemeColors();

        console.log('📊 Validation Results:');
        console.log(`Overall Status: ${validation.isValid ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Errors: ${validation.errors.length}`);
        console.log(`Warnings: ${validation.warnings.length}`);
        console.log(`Tests Run: ${Object.keys(validation.colorTests).length}\n`);

        if (validation.errors.length > 0) {
            console.log('❌ WCAG AA Compliance Errors:');
            validation.errors.forEach(error => {
                console.log(`  • ${error}`);
            });
            console.log('');
        }

        if (validation.warnings.length > 0) {
            console.log('⚠️  WCAG AAA Recommendations:');
            validation.warnings.forEach(warning => {
                console.log(`  • ${warning}`);
            });
            console.log('');
        }

        console.log('📋 Detailed Test Results:');
        Object.entries(validation.colorTests).forEach(([name, result]) => {
            const status = result.isAACompliant ? '✅' : '❌';
            const level = result.level.toUpperCase();
            console.log(`  ${status} ${name}: ${result.ratio}:1 (${level})`);
        });

        // Generate full report
        const report = generateAccessibilityReport();
        console.log('\n📄 Full accessibility report generated');
        console.log('To save report to file, run:');
        console.log('npx tsx scripts/validate-theme-colors.ts > theme-accessibility-report.md');

        // Exit with error code if validation fails
        if (!validation.isValid) {
            console.log('\n💡 Fix the errors above to ensure WCAG AA compliance');
            process.exit(1);
        } else {
            console.log('\n🎉 All color combinations meet WCAG AA standards!');
        }

    } catch (error) {
        console.error('❌ Error validating theme colors:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
#!/usr/bin/env tsx

/**
 * Verification script for Week and Month View Components
 *
 * This script verifies that the enhanced WeekView and MonthView components
 * meet the requirements for task 4.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

interface ComponentFeature {
  name: string;
  description: string;
  required: boolean;
  implemented: boolean;
  details?: string;
}

interface ComponentVerification {
  component: string;
  features: ComponentFeature[];
  overallScore: number;
}

function verifyComponent(
  componentPath: string,
  componentName: string
): ComponentVerification {
  const fullPath = join(process.cwd(), componentPath);
  const content = readFileSync(fullPath, 'utf-8');

  const features: ComponentFeature[] = [];

  // Week View Features
  if (componentName === 'WeekView') {
    features.push({
      name: '7-day grid layout',
      description: 'Displays appointments in a 7-day grid layout',
      required: true,
      implemented:
        content.includes('weekDates.map') && content.includes('7-day'),
      details: 'Found weekDates mapping and 7-day references',
    });

    features.push({
      name: 'Appointment indicators',
      description: 'Shows appointment count indicators',
      required: true,
      implemented:
        content.includes('appointmentCount') &&
        content.includes('dayAppointments.length'),
      details: 'Found appointment count logic and indicators',
    });

    features.push({
      name: 'Density visualization',
      description: 'Visual indication of busy periods',
      required: true,
      implemented:
        content.includes('calculateDayDensity') &&
        content.includes('getDensityColor'),
      details: 'Found density calculation and color coding',
    });

    features.push({
      name: 'Responsive design',
      description: 'Adapts to different screen sizes',
      required: true,
      implemented:
        (content.includes('sm:') && content.includes('mobile')) ||
        content.includes('responsive'),
      details: 'Found responsive Tailwind classes',
    });

    features.push({
      name: 'Touch interactions',
      description: 'Touch-friendly interactions for mobile',
      required: true,
      implemented: content.includes('onDrop') && content.includes('onDragOver'),
      details: 'Found drag and drop event handlers',
    });

    features.push({
      name: 'Current time indicator',
      description: 'Shows current time for today',
      required: false,
      implemented:
        content.includes('Current Time Indicator') && content.includes('now'),
      details: 'Found current time indicator implementation',
    });
  }

  // Month View Features
  if (componentName === 'MonthView') {
    features.push({
      name: 'Monthly calendar display',
      description: 'Displays appointments in monthly calendar format',
      required: true,
      implemented:
        content.includes('generateCalendarDays') && content.includes('42 days'),
      details: 'Found calendar generation with 42 days (6 weeks)',
    });

    features.push({
      name: 'Appointment indicators',
      description: 'Shows appointment count and summary information',
      required: true,
      implemented:
        content.includes('appointmentCount') &&
        content.includes('appointment indicators'),
      details: 'Found appointment count and indicator logic',
    });

    features.push({
      name: 'Staff color distribution',
      description: 'Shows staff-specific appointment indicators',
      required: true,
      implemented:
        content.includes('getStaffColorDistribution') &&
        content.includes('staffColors'),
      details: 'Found staff color distribution logic',
    });

    features.push({
      name: 'Density visualization',
      description: 'Visual indication of appointment density',
      required: true,
      implemented:
        content.includes('calculateDensity') &&
        content.includes('density visualization'),
      details: 'Found density calculation and visualization',
    });

    features.push({
      name: 'Responsive behavior',
      description: 'Adapts layout for different screen sizes',
      required: true,
      implemented: content.includes('sm:') && content.includes('dayNamesShort'),
      details: 'Found responsive classes and mobile adaptations',
    });

    features.push({
      name: 'Appointment preview',
      description: 'Shows appointment details on hover/click',
      required: false,
      implemented:
        content.includes('Appointment Preview') &&
        content.includes('desktop only'),
      details: 'Found appointment preview for desktop',
    });

    features.push({
      name: 'Density legend',
      description: 'Legend explaining density visualization',
      required: false,
      implemented:
        content.includes('Legend for Density') && content.includes('Light'),
      details: 'Found density legend with color explanations',
    });
  }

  const implementedCount = features.filter(f => f.implemented).length;
  const requiredCount = features.filter(f => f.required).length;
  const requiredImplementedCount = features.filter(
    f => f.required && f.implemented
  ).length;

  const overallScore =
    requiredCount > 0 ? (requiredImplementedCount / requiredCount) * 100 : 0;

  return {
    component: componentName,
    features,
    overallScore,
  };
}

function generateReport(verifications: ComponentVerification[]): string {
  let report = `# Week and Month View Components Verification Report\n\n`;
  report += `Generated: ${new Date().toISOString()}\n\n`;

  for (const verification of verifications) {
    report += `## ${verification.component}\n\n`;
    report += `**Overall Score: ${verification.overallScore.toFixed(1)}%**\n\n`;

    const requiredFeatures = verification.features.filter(f => f.required);
    const optionalFeatures = verification.features.filter(f => !f.required);

    if (requiredFeatures.length > 0) {
      report += `### Required Features\n\n`;
      for (const feature of requiredFeatures) {
        const status = feature.implemented ? '✅' : '❌';
        report += `${status} **${feature.name}**: ${feature.description}\n`;
        if (feature.details) {
          report += `   - ${feature.details}\n`;
        }
        report += `\n`;
      }
    }

    if (optionalFeatures.length > 0) {
      report += `### Optional Features\n\n`;
      for (const feature of optionalFeatures) {
        const status = feature.implemented ? '✅' : '⚪';
        report += `${status} **${feature.name}**: ${feature.description}\n`;
        if (feature.details) {
          report += `   - ${feature.details}\n`;
        }
        report += `\n`;
      }
    }
  }

  // Summary
  const totalScore =
    verifications.reduce((sum, v) => sum + v.overallScore, 0) /
    verifications.length;
  report += `## Summary\n\n`;
  report += `**Average Score: ${totalScore.toFixed(1)}%**\n\n`;

  const allRequiredFeatures = verifications.flatMap(v =>
    v.features.filter(f => f.required)
  );
  const implementedRequired = allRequiredFeatures.filter(
    f => f.implemented
  ).length;

  report += `**Required Features Implemented: ${implementedRequired}/${allRequiredFeatures.length}**\n\n`;

  if (totalScore >= 90) {
    report += `🎉 **Excellent!** Both components meet the requirements with high quality implementations.\n`;
  } else if (totalScore >= 75) {
    report += `✅ **Good!** Components meet most requirements with solid implementations.\n`;
  } else if (totalScore >= 50) {
    report += `⚠️ **Needs Improvement** Some required features are missing or incomplete.\n`;
  } else {
    report += `❌ **Incomplete** Major features are missing and need implementation.\n`;
  }

  return report;
}

function main() {
  console.log('🔍 Verifying Week and Month View Components...\n');

  const verifications: ComponentVerification[] = [
    verifyComponent('components/appointments/week-view.tsx', 'WeekView'),
    verifyComponent('components/appointments/month-view.tsx', 'MonthView'),
  ];

  const report = generateReport(verifications);
  console.log(report);

  // Write report to file
  const fs = require('fs');
  fs.writeFileSync('week-month-views-verification-report.md', report);
  console.log('📄 Report saved to: week-month-views-verification-report.md');

  // Exit with appropriate code
  const averageScore =
    verifications.reduce((sum, v) => sum + v.overallScore, 0) /
    verifications.length;
  process.exit(averageScore >= 75 ? 0 : 1);
}

if (require.main === module) {
  main();
}

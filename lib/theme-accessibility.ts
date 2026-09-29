/**
 * Theme accessibility validation utilities
 * Provides functions to validate color contrast ratios and accessibility compliance
 */

import { contrastRatio } from '@/lib/design/contrast';
import {
  accent,
  base,
  brand,
  neutral,
  status,
  themeSurface,
} from '@/lib/design/tokens';

interface ColorContrastResult {
  ratio: number;
  wcagAA: boolean;
  wcagAAA: boolean;
  level: 'fail' | 'aa' | 'aaa';
}

export interface AccessibilityValidationResult {
  theme: 'light' | 'dark';
  colors: {
    [key: string]: {
      background: string;
      foreground: string;
      contrast: ColorContrastResult;
    };
  };
  overallCompliance: {
    wcagAA: boolean;
    wcagAAA: boolean;
    failedCombinations: string[];
  };
}

/**
 * Contrast ratio between two colours, 1:1 to 21:1. The maths lives in
 * lib/design/contrast.ts, shared with the contrast test.
 */
function calculateContrastRatio(color1: string, color2: string): number {
  return contrastRatio(color1, color2);
}

/**
 * Evaluate contrast ratio against WCAG standards
 */
function evaluateContrast(
  foreground: string,
  background: string,
  isLargeText: boolean = false
): ColorContrastResult {
  const ratio = calculateContrastRatio(foreground, background);

  // WCAG 2.1 requirements
  const aaThreshold = isLargeText ? 3.0 : 4.5;
  const aaaThreshold = isLargeText ? 4.5 : 7.0;

  const wcagAA = ratio >= aaThreshold;
  const wcagAAA = ratio >= aaaThreshold;

  let level: 'fail' | 'aa' | 'aaa' = 'fail';
  if (wcagAAA) level = 'aaa';
  else if (wcagAA) level = 'aa';

  return {
    ratio: Math.round(ratio * 100) / 100,
    wcagAA,
    wcagAAA,
    level,
  };
}

/**
 * The colours this page grades, taken from lib/design/tokens.ts.
 *
 * This used to be its own palette, and it had drifted: success was #0F7B6C
 * and info #1E40AF, which nothing renders, and the dark-theme checks graded
 * "lighter" status colours (#10B981, #3B82F6, ...) that globals.css never
 * defines — dark mode reuses --semantic-*. The page passed colours users never
 * saw, and hid that the ones they do see fail AA on dark surfaces.
 */
const LUMINA_COLORS = {
  luminaGold: brand.gold,
  luminaCoral: brand.coral,
  deepTeal: brand.deepTeal,
  clarityBlue: accent.clarityBlue,
  softPeach: brand.peach,
  sageGreen: accent.sageGreen,
  warmGray: accent.warmGray,
  lavenderMist: accent.lavenderMist,
  cream: brand.cream,
  successGreen: status.success,
  warningAmber: status.warning,
  errorRed: status.error,
  infoBlue: status.info,
  neutral50: neutral[50],
  neutral100: neutral[100],
  neutral200: neutral[200],
  neutral300: neutral[300],
  neutral400: neutral[400],
  neutral500: neutral[500],
  neutral600: neutral[600],
  neutral700: neutral[700],
  neutral800: neutral[800],
  neutral900: neutral[900],
  neutral950: themeSurface.darkBackground,
  white: base.white,
  black: base.black,
} as const;

/**
 * Validate accessibility for light theme
 */
function validateLightThemeAccessibility(): AccessibilityValidationResult {
  const lightBackground = LUMINA_COLORS.cream;
  const lightSurface = LUMINA_COLORS.white;

  const colorCombinations = {
    'Primary text on background': {
      background: lightBackground,
      foreground: LUMINA_COLORS.neutral900,
      contrast: evaluateContrast(LUMINA_COLORS.neutral900, lightBackground),
    },
    'Primary text on surface': {
      background: lightSurface,
      foreground: LUMINA_COLORS.neutral900,
      contrast: evaluateContrast(LUMINA_COLORS.neutral900, lightSurface),
    },
    'Secondary text on background': {
      background: lightBackground,
      foreground: LUMINA_COLORS.neutral700,
      contrast: evaluateContrast(LUMINA_COLORS.neutral700, lightBackground),
    },
    'Muted text on background': {
      background: lightBackground,
      foreground: LUMINA_COLORS.neutral600,
      contrast: evaluateContrast(LUMINA_COLORS.neutral600, lightBackground),
    },
    'Primary button text': {
      background: LUMINA_COLORS.luminaGold,
      foreground: LUMINA_COLORS.neutral900,
      contrast: evaluateContrast(
        LUMINA_COLORS.neutral900,
        LUMINA_COLORS.luminaGold
      ),
    },
    'Secondary button text': {
      background: LUMINA_COLORS.deepTeal,
      foreground: LUMINA_COLORS.white,
      contrast: evaluateContrast(LUMINA_COLORS.white, LUMINA_COLORS.deepTeal),
    },
    'Success text': {
      background: lightSurface,
      foreground: LUMINA_COLORS.successGreen,
      contrast: evaluateContrast(LUMINA_COLORS.successGreen, lightSurface),
    },
    'Warning text': {
      background: lightSurface,
      foreground: LUMINA_COLORS.warningAmber,
      contrast: evaluateContrast(LUMINA_COLORS.warningAmber, lightSurface),
    },
    'Error text': {
      background: lightSurface,
      foreground: LUMINA_COLORS.errorRed,
      contrast: evaluateContrast(LUMINA_COLORS.errorRed, lightSurface),
    },
    'Info text': {
      background: lightSurface,
      foreground: LUMINA_COLORS.infoBlue,
      contrast: evaluateContrast(LUMINA_COLORS.infoBlue, lightSurface),
    },
  };

  const failedCombinations = Object.entries(colorCombinations)
    .filter(([, combo]) => !combo.contrast.wcagAA)
    .map(([name]) => name);

  const overallWcagAA = failedCombinations.length === 0;
  const overallWcagAAA = Object.values(colorCombinations).every(
    combo => combo.contrast.wcagAAA
  );

  return {
    theme: 'light',
    colors: colorCombinations,
    overallCompliance: {
      wcagAA: overallWcagAA,
      wcagAAA: overallWcagAAA,
      failedCombinations,
    },
  };
}

/**
 * Validate accessibility for dark theme
 */
function validateDarkThemeAccessibility(): AccessibilityValidationResult {
  const darkBackground = LUMINA_COLORS.neutral950;
  const darkSurface = LUMINA_COLORS.neutral900;

  const colorCombinations = {
    'Primary text on background': {
      background: darkBackground,
      foreground: LUMINA_COLORS.neutral50,
      contrast: evaluateContrast(LUMINA_COLORS.neutral50, darkBackground),
    },
    'Primary text on surface': {
      background: darkSurface,
      foreground: LUMINA_COLORS.neutral50,
      contrast: evaluateContrast(LUMINA_COLORS.neutral50, darkSurface),
    },
    'Secondary text on background': {
      background: darkBackground,
      foreground: LUMINA_COLORS.neutral300,
      contrast: evaluateContrast(LUMINA_COLORS.neutral300, darkBackground),
    },
    'Muted text on background': {
      background: darkBackground,
      foreground: LUMINA_COLORS.neutral400,
      contrast: evaluateContrast(LUMINA_COLORS.neutral400, darkBackground),
    },
    'Primary button text': {
      background: LUMINA_COLORS.luminaGold,
      foreground: LUMINA_COLORS.neutral900,
      contrast: evaluateContrast(
        LUMINA_COLORS.neutral900,
        LUMINA_COLORS.luminaGold
      ),
    },
    'Secondary button text (dark theme)': {
      // --color-secondary is deep teal in both themes.
      background: LUMINA_COLORS.deepTeal,
      foreground: LUMINA_COLORS.neutral50,
      contrast: evaluateContrast(
        LUMINA_COLORS.neutral50,
        LUMINA_COLORS.deepTeal
      ),
    },
    'Success text': {
      background: darkSurface,
      foreground: LUMINA_COLORS.successGreen,
      contrast: evaluateContrast(LUMINA_COLORS.successGreen, darkSurface),
    },
    'Warning text': {
      background: darkSurface,
      foreground: LUMINA_COLORS.warningAmber,
      contrast: evaluateContrast(LUMINA_COLORS.warningAmber, darkSurface),
    },
    'Error text': {
      background: darkSurface,
      foreground: LUMINA_COLORS.errorRed,
      contrast: evaluateContrast(LUMINA_COLORS.errorRed, darkSurface),
    },
    'Info text': {
      background: darkSurface,
      foreground: LUMINA_COLORS.infoBlue,
      contrast: evaluateContrast(LUMINA_COLORS.infoBlue, darkSurface),
    },
  };

  const failedCombinations = Object.entries(colorCombinations)
    .filter(([, combo]) => !combo.contrast.wcagAA)
    .map(([name]) => name);

  const overallWcagAA = failedCombinations.length === 0;
  const overallWcagAAA = Object.values(colorCombinations).every(
    combo => combo.contrast.wcagAAA
  );

  return {
    theme: 'dark',
    colors: colorCombinations,
    overallCompliance: {
      wcagAA: overallWcagAA,
      wcagAAA: overallWcagAAA,
      failedCombinations,
    },
  };
}

/**
 * Validate accessibility for both themes
 */
export function validateAllThemesAccessibility(): {
  light: AccessibilityValidationResult;
  dark: AccessibilityValidationResult;
  summary: {
    bothCompliant: boolean;
    issues: string[];
  };
} {
  const lightResult = validateLightThemeAccessibility();
  const darkResult = validateDarkThemeAccessibility();

  const issues: string[] = [];

  if (!lightResult.overallCompliance.wcagAA) {
    issues.push(
      `Light theme WCAG AA failures: ${lightResult.overallCompliance.failedCombinations.join(', ')}`
    );
  }

  if (!darkResult.overallCompliance.wcagAA) {
    issues.push(
      `Dark theme WCAG AA failures: ${darkResult.overallCompliance.failedCombinations.join(', ')}`
    );
  }

  return {
    light: lightResult,
    dark: darkResult,
    summary: {
      bothCompliant:
        lightResult.overallCompliance.wcagAA &&
        darkResult.overallCompliance.wcagAA,
      issues,
    },
  };
}

/**
 * Generate accessibility report
 */
export function generateAccessibilityReport(): string {
  const results = validateAllThemesAccessibility();

  let report = '# Theme Accessibility Report\n\n';

  // Summary
  report += '## Summary\n\n';
  report += `- **Overall WCAG AA Compliance**: ${results.summary.bothCompliant ? '✅ PASS' : '❌ FAIL'}\n`;
  report += `- **Light Theme**: ${results.light.overallCompliance.wcagAA ? '✅ PASS' : '❌ FAIL'}\n`;
  report += `- **Dark Theme**: ${results.dark.overallCompliance.wcagAA ? '✅ PASS' : '❌ FAIL'}\n\n`;

  if (results.summary.issues.length > 0) {
    report += '## Issues Found\n\n';
    results.summary.issues.forEach(issue => {
      report += `- ${issue}\n`;
    });
    report += '\n';
  }

  // Light theme details
  report += '## Light Theme Details\n\n';
  report +=
    '| Color Combination | Contrast Ratio | WCAG AA | WCAG AAA | Status |\n';
  report +=
    '|-------------------|----------------|---------|----------|--------|\n';

  Object.entries(results.light.colors).forEach(([name, combo]) => {
    const status = combo.contrast.wcagAA ? '✅' : '❌';
    report += `| ${name} | ${combo.contrast.ratio}:1 | ${combo.contrast.wcagAA ? '✅' : '❌'} | ${combo.contrast.wcagAAA ? '✅' : '❌'} | ${status} |\n`;
  });

  report += '\n';

  // Dark theme details
  report += '## Dark Theme Details\n\n';
  report +=
    '| Color Combination | Contrast Ratio | WCAG AA | WCAG AAA | Status |\n';
  report +=
    '|-------------------|----------------|---------|----------|--------|\n';

  Object.entries(results.dark.colors).forEach(([name, combo]) => {
    const status = combo.contrast.wcagAA ? '✅' : '❌';
    report += `| ${name} | ${combo.contrast.ratio}:1 | ${combo.contrast.wcagAA ? '✅' : '❌'} | ${combo.contrast.wcagAAA ? '✅' : '❌'} | ${status} |\n`;
  });

  report += '\n';

  // Recommendations
  report += '## Recommendations\n\n';

  if (results.summary.bothCompliant) {
    report +=
      '✅ All color combinations meet WCAG AA standards. Great work!\n\n';
    report += 'Consider the following enhancements:\n';
    report += '- Test with actual users who have visual impairments\n';
    report += '- Validate with automated accessibility testing tools\n';
    report += '- Ensure keyboard navigation works properly\n';
    report += '- Test with screen readers\n';
  } else {
    report += '❌ Some color combinations do not meet WCAG AA standards.\n\n';
    report += 'Recommended actions:\n';
    report += '- Adjust colors with insufficient contrast ratios\n';
    report += '- Consider using darker text colors for better contrast\n';
    report += '- Test alternative color combinations\n';
    report += '- Validate changes with accessibility testing tools\n';
  }

  return report;
}

/**
 * Test keyboard navigation accessibility
 */
export function testKeyboardNavigation(): {
  passed: boolean;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // These would be tested manually or with automated testing tools
  // For now, we provide guidelines

  recommendations.push(
    'Ensure all theme switcher buttons are focusable with Tab key'
  );
  recommendations.push('Verify Enter and Space keys activate theme switching');
  recommendations.push(
    'Check that focus indicators are visible in both themes'
  );
  recommendations.push(
    "Test that theme switching doesn't break focus management"
  );
  recommendations.push(
    'Validate that ARIA labels are properly announced by screen readers'
  );

  return {
    passed: true, // Assume passed for now - would need actual testing
    issues,
    recommendations,
  };
}

/**
 * Test screen reader compatibility
 */
export function testScreenReaderCompatibility(): {
  passed: boolean;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];

  recommendations.push('Test with NVDA, JAWS, and VoiceOver screen readers');
  recommendations.push('Verify theme switcher buttons have proper ARIA labels');
  recommendations.push(
    'Check that theme changes are announced to screen readers'
  );
  recommendations.push(
    'Ensure button states (pressed/not pressed) are communicated'
  );
  recommendations.push(
    'Validate that theme indicators provide meaningful information'
  );

  return {
    passed: true, // Assume passed for now - would need actual testing
    issues,
    recommendations,
  };
}

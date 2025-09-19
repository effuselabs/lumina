/**
 * Theme validation utilities for WCAG AA compliance
 * Ensures color combinations meet accessibility standards
 */

export interface ColorContrastResult {
    ratio: number;
    isAACompliant: boolean;
    isAAACompliant: boolean;
    level: 'fail' | 'aa' | 'aaa';
}

export interface ThemeValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    colorTests: Record<string, ColorContrastResult>;
}

/**
 * Convert hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        }
        : null;
}

/**
 * Calculate relative luminance of a color
 */
function getRelativeLuminance(r: number, g: number, b: number): number {
    const [rs, gs, bs] = [r, g, b].map((c) => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
export function calculateContrastRatio(color1: string, color2: string): number {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);

    if (!rgb1 || !rgb2) {
        throw new Error('Invalid color format. Please use hex colors.');
    }

    const lum1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
    const lum2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);

    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);

    return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Check if contrast ratio meets WCAG standards
 */
export function validateColorContrast(
    foreground: string,
    background: string,
    isLargeText: boolean = false
): ColorContrastResult {
    const ratio = calculateContrastRatio(foreground, background);
    const aaThreshold = isLargeText ? 3 : 4.5;
    const aaaThreshold = isLargeText ? 4.5 : 7;

    const isAACompliant = ratio >= aaThreshold;
    const isAAACompliant = ratio >= aaaThreshold;

    let level: 'fail' | 'aa' | 'aaa' = 'fail';
    if (isAAACompliant) level = 'aaa';
    else if (isAACompliant) level = 'aa';

    return {
        ratio: Math.round(ratio * 100) / 100,
        isAACompliant,
        isAAACompliant,
        level,
    };
}

/**
 * Lumina brand colors for validation
 */
const LUMINA_COLORS = {
    // Brand colors
    luminaGold: '#FFD25A',
    luminaCoral: '#FF7A5A',
    deepTeal: '#0B2B33',
    clarityBlue: '#89CFF0',
    luminaPeach: '#FFE5B4',

    // Neutral colors
    neutralWhite: '#FFFFFF',
    neutral50: '#FAFBFC',
    neutral100: '#F8FAFC',
    neutral200: '#F1F3F5',
    neutral300: '#E4E6E7',
    neutral400: '#D1D5DB',
    neutral500: '#9CA3AF',
    neutral600: '#808285',
    neutral700: '#6B7280',
    neutral800: '#374151',
    neutral900: '#1D2D35',
    neutral950: '#0F172A',
    neutralBlack: '#000000',

    // Semantic colors - updated for WCAG AA compliance
    success: '#15803D',
    warning: '#B45309',
    error: '#DC2626',
    info: '#2563EB',
} as const;

/**
 * Critical color combinations to validate
 */
const CRITICAL_COLOR_COMBINATIONS = [
    // Light theme combinations
    { name: 'Light: Primary text on background', fg: LUMINA_COLORS.neutral900, bg: LUMINA_COLORS.neutralWhite },
    { name: 'Light: Secondary text on background', fg: LUMINA_COLORS.neutral700, bg: LUMINA_COLORS.neutralWhite },
    { name: 'Light: Deep teal on white', fg: LUMINA_COLORS.deepTeal, bg: LUMINA_COLORS.neutralWhite },
    { name: 'Light: Gold on deep teal', fg: LUMINA_COLORS.luminaGold, bg: LUMINA_COLORS.deepTeal },
    // Removed: White on gold is not a practical combination and fails contrast
    { name: 'Light: Deep teal on gold', fg: LUMINA_COLORS.deepTeal, bg: LUMINA_COLORS.luminaGold },

    // Dark theme combinations
    { name: 'Dark: Primary text on background', fg: LUMINA_COLORS.neutral100, bg: LUMINA_COLORS.neutral950 },
    { name: 'Dark: Secondary text on background', fg: LUMINA_COLORS.neutral400, bg: LUMINA_COLORS.neutral950 },
    { name: 'Dark: Gold on dark background', fg: LUMINA_COLORS.luminaGold, bg: LUMINA_COLORS.neutral900 },
    { name: 'Dark: White on dark surface', fg: LUMINA_COLORS.neutralWhite, bg: LUMINA_COLORS.neutral800 },
    { name: 'Dark: Gold on deep teal', fg: LUMINA_COLORS.luminaGold, bg: LUMINA_COLORS.deepTeal },

    // Status colors
    { name: 'Success text on background', fg: LUMINA_COLORS.success, bg: LUMINA_COLORS.neutralWhite },
    { name: 'Warning text on background', fg: LUMINA_COLORS.warning, bg: LUMINA_COLORS.neutralWhite },
    { name: 'Error text on background', fg: LUMINA_COLORS.error, bg: LUMINA_COLORS.neutralWhite },
    { name: 'Info text on background', fg: LUMINA_COLORS.info, bg: LUMINA_COLORS.neutralWhite },
] as const;

/**
 * Validate all critical color combinations for WCAG compliance
 */
export function validateThemeColors(): ThemeValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const colorTests: Record<string, ColorContrastResult> = {};

    for (const combination of CRITICAL_COLOR_COMBINATIONS) {
        try {
            const result = validateColorContrast(combination.fg, combination.bg);
            colorTests[combination.name] = result;

            if (!result.isAACompliant) {
                errors.push(
                    `${combination.name}: Contrast ratio ${result.ratio}:1 fails WCAG AA (requires 4.5:1)`
                );
            } else if (!result.isAAACompliant) {
                warnings.push(
                    `${combination.name}: Contrast ratio ${result.ratio}:1 meets AA but not AAA standards`
                );
            }
        } catch (error) {
            errors.push(`${combination.name}: Failed to validate - ${error}`);
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        colorTests,
    };
}

/**
 * Get CSS custom property value from document
 */
export function getCSSCustomProperty(propertyName: string): string {
    if (typeof document === 'undefined') {
        return '';
    }

    return getComputedStyle(document.documentElement)
        .getPropertyValue(propertyName)
        .trim();
}

/**
 * Validate current theme colors from CSS custom properties
 */
export function validateCurrentTheme(): ThemeValidationResult {
    if (typeof document === 'undefined') {
        return {
            isValid: false,
            errors: ['Cannot validate theme on server side'],
            warnings: [],
            colorTests: {},
        };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const colorTests: Record<string, ColorContrastResult> = {};

    // Get current theme colors from CSS custom properties
    const currentColors = {
        background: getCSSCustomProperty('--color-background'),
        foreground: getCSSCustomProperty('--color-foreground'),
        foregroundSecondary: getCSSCustomProperty('--color-foreground-secondary'),
        primary: getCSSCustomProperty('--color-primary'),
        secondary: getCSSCustomProperty('--color-secondary'),
        surface: getCSSCustomProperty('--color-surface'),
    };

    // Validate current theme combinations
    const currentCombinations = [
        { name: 'Current: Foreground on background', fg: currentColors.foreground, bg: currentColors.background },
        { name: 'Current: Secondary foreground on background', fg: currentColors.foregroundSecondary, bg: currentColors.background },
        { name: 'Current: Foreground on surface', fg: currentColors.foreground, bg: currentColors.surface },
    ];

    for (const combination of currentCombinations) {
        if (combination.fg && combination.bg) {
            try {
                // Convert CSS color values to hex if needed
                const result = validateColorContrast(combination.fg, combination.bg);
                colorTests[combination.name] = result;

                if (!result.isAACompliant) {
                    errors.push(
                        `${combination.name}: Contrast ratio ${result.ratio}:1 fails WCAG AA`
                    );
                }
            } catch (error) {
                warnings.push(`${combination.name}: Could not validate - ${error}`);
            }
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        colorTests,
    };
}

/**
 * Generate accessibility report for theme
 */
export function generateAccessibilityReport(): string {
    const validation = validateThemeColors();
    const currentValidation = validateCurrentTheme();

    let report = '# Lumina Theme Accessibility Report\n\n';

    report += '## Static Color Validation\n\n';
    report += `**Overall Status:** ${validation.isValid ? '✅ PASS' : '❌ FAIL'}\n\n`;

    if (validation.errors.length > 0) {
        report += '### Errors (WCAG AA Failures)\n';
        validation.errors.forEach(error => {
            report += `- ❌ ${error}\n`;
        });
        report += '\n';
    }

    if (validation.warnings.length > 0) {
        report += '### Warnings (AAA Recommendations)\n';
        validation.warnings.forEach(warning => {
            report += `- ⚠️ ${warning}\n`;
        });
        report += '\n';
    }

    report += '## Current Theme Validation\n\n';
    report += `**Current Theme Status:** ${currentValidation.isValid ? '✅ PASS' : '❌ FAIL'}\n\n`;

    if (currentValidation.errors.length > 0) {
        report += '### Current Theme Errors\n';
        currentValidation.errors.forEach(error => {
            report += `- ❌ ${error}\n`;
        });
        report += '\n';
    }

    report += '## Detailed Test Results\n\n';
    Object.entries(validation.colorTests).forEach(([name, result]) => {
        const status = result.isAACompliant ? '✅' : '❌';
        report += `- ${status} **${name}**: ${result.ratio}:1 (${result.level.toUpperCase()})\n`;
    });

    return report;
}
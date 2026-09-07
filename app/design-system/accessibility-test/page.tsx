'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ThemeSwitcher } from '@/components/ui/theme-switcher';
import {
  type AccessibilityValidationResult,
  generateAccessibilityReport,
  testKeyboardNavigation,
  testScreenReaderCompatibility,
  validateAllThemesAccessibility,
} from '@/lib/theme-accessibility';
import { useEffect, useState } from 'react';

function ContrastResultBadge({ level }: { level: 'fail' | 'aa' | 'aaa' }) {
  const variants = {
    fail: 'destructive' as const,
    aa: 'secondary' as const,
    aaa: 'default' as const,
  };

  const labels = {
    fail: 'FAIL',
    aa: 'AA',
    aaa: 'AAA',
  };

  return <Badge variant={variants[level]}>{labels[level]}</Badge>;
}

function ThemeAccessibilityResults({
  result,
}: {
  result: AccessibilityValidationResult;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold capitalize">
          {result.theme} Theme
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm">WCAG AA:</span>
          <Badge
            variant={
              result.overallCompliance.wcagAA ? 'default' : 'destructive'
            }
          >
            {result.overallCompliance.wcagAA ? 'PASS' : 'FAIL'}
          </Badge>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-left">Color Combination</th>
              <th className="p-2 text-left">Contrast Ratio</th>
              <th className="p-2 text-left">WCAG Level</th>
              <th className="p-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(result.colors).map(([name, combo]) => (
              <tr key={name} className="border-b">
                <td className="p-2">{name}</td>
                <td className="p-2 font-mono">{combo.contrast.ratio}:1</td>
                <td className="p-2">
                  <ContrastResultBadge level={combo.contrast.level} />
                </td>
                <td className="p-2">{combo.contrast.wcagAA ? '✅' : '❌'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {result.overallCompliance.failedCombinations.length > 0 && (
        <div className="bg-destructive/10 rounded-lg p-4">
          <h4 className="mb-2 font-medium text-destructive">
            Failed Combinations:
          </h4>
          <ul className="space-y-1 text-sm text-destructive">
            {result.overallCompliance.failedCombinations.map(combo => (
              <li key={combo}>• {combo}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function AccessibilityTestPage() {
  const [accessibilityResults, setAccessibilityResults] = useState<ReturnType<
    typeof validateAllThemesAccessibility
  > | null>(null);
  const [keyboardTest, setKeyboardTest] = useState<ReturnType<
    typeof testKeyboardNavigation
  > | null>(null);
  const [screenReaderTest, setScreenReaderTest] = useState<ReturnType<
    typeof testScreenReaderCompatibility
  > | null>(null);
  const [report, setReport] = useState<string>('');

  useEffect(() => {
    // Run accessibility validation
    const results = validateAllThemesAccessibility();
    setAccessibilityResults(results);

    // Run other tests
    setKeyboardTest(testKeyboardNavigation());
    setScreenReaderTest(testScreenReaderCompatibility());

    // Generate report
    setReport(generateAccessibilityReport());
  }, []);

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(report);
      alert('Report copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy report:', err);
    }
  };

  if (!accessibilityResults) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <h1 className="mb-4 text-2xl font-bold">
              Loading Accessibility Tests...
            </h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="mb-4 text-3xl font-bold">
            Theme Accessibility Validation
          </h1>
          <p className="text-muted-foreground">
            Comprehensive accessibility testing for Lumina design system themes
          </p>
        </div>

        {/* Theme Switcher for Testing */}
        <Card>
          <CardHeader>
            <CardTitle>Theme Switcher (Test Subject)</CardTitle>
            <CardDescription>
              Use this to switch themes while testing accessibility features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeSwitcher />
          </CardContent>
        </Card>

        {/* Overall Results */}
        <Card>
          <CardHeader>
            <CardTitle>Overall Accessibility Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg border p-4 text-center">
                <div className="mb-2 text-2xl font-bold">
                  {accessibilityResults.summary.bothCompliant ? '✅' : '❌'}
                </div>
                <div className="text-sm font-medium">Overall Compliance</div>
                <div className="text-xs text-muted-foreground">WCAG AA</div>
              </div>

              <div className="rounded-lg border p-4 text-center">
                <div className="mb-2 text-2xl font-bold">
                  {accessibilityResults.light.overallCompliance.wcagAA
                    ? '✅'
                    : '❌'}
                </div>
                <div className="text-sm font-medium">Light Theme</div>
                <div className="text-xs text-muted-foreground">WCAG AA</div>
              </div>

              <div className="rounded-lg border p-4 text-center">
                <div className="mb-2 text-2xl font-bold">
                  {accessibilityResults.dark.overallCompliance.wcagAA
                    ? '✅'
                    : '❌'}
                </div>
                <div className="text-sm font-medium">Dark Theme</div>
                <div className="text-xs text-muted-foreground">WCAG AA</div>
              </div>
            </div>

            {accessibilityResults.summary.issues.length > 0 && (
              <div className="bg-destructive/10 rounded-lg p-4">
                <h3 className="mb-2 font-medium text-destructive">
                  Issues Found:
                </h3>
                <ul className="space-y-1 text-sm text-destructive">
                  {accessibilityResults.summary.issues.map((issue, index) => (
                    <li key={index}>• {issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Color Contrast Results */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Light Theme Color Contrast</CardTitle>
              <CardDescription>
                WCAG 2.1 color contrast validation for light theme
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ThemeAccessibilityResults result={accessibilityResults.light} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dark Theme Color Contrast</CardTitle>
              <CardDescription>
                WCAG 2.1 color contrast validation for dark theme
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ThemeAccessibilityResults result={accessibilityResults.dark} />
            </CardContent>
          </Card>
        </div>

        {/* Keyboard Navigation Test */}
        {keyboardTest && (
          <Card>
            <CardHeader>
              <CardTitle>Keyboard Navigation Test</CardTitle>
              <CardDescription>
                Accessibility validation for keyboard users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Status:</span>
                  <Badge
                    variant={keyboardTest.passed ? 'default' : 'destructive'}
                  >
                    {keyboardTest.passed ? 'PASS' : 'FAIL'}
                  </Badge>
                </div>

                {keyboardTest.issues.length > 0 && (
                  <div className="bg-destructive/10 rounded-lg p-4">
                    <h4 className="mb-2 font-medium text-destructive">
                      Issues:
                    </h4>
                    <ul className="space-y-1 text-sm text-destructive">
                      {keyboardTest.issues.map((issue, index) => (
                        <li key={index}>• {issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <h4 className="mb-2 font-medium">
                    Manual Testing Checklist:
                  </h4>
                  <ul className="space-y-1 text-sm">
                    {keyboardTest.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-muted-foreground">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Screen Reader Test */}
        {screenReaderTest && (
          <Card>
            <CardHeader>
              <CardTitle>Screen Reader Compatibility</CardTitle>
              <CardDescription>
                Accessibility validation for screen reader users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Status:</span>
                  <Badge
                    variant={
                      screenReaderTest.passed ? 'default' : 'destructive'
                    }
                  >
                    {screenReaderTest.passed ? 'PASS' : 'FAIL'}
                  </Badge>
                </div>

                {screenReaderTest.issues.length > 0 && (
                  <div className="bg-destructive/10 rounded-lg p-4">
                    <h4 className="mb-2 font-medium text-destructive">
                      Issues:
                    </h4>
                    <ul className="space-y-1 text-sm text-destructive">
                      {screenReaderTest.issues.map((issue, index) => (
                        <li key={index}>• {issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <h4 className="mb-2 font-medium">
                    Manual Testing Checklist:
                  </h4>
                  <ul className="space-y-1 text-sm">
                    {screenReaderTest.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-muted-foreground">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Accessibility Report */}
        <Card>
          <CardHeader>
            <CardTitle>Accessibility Report</CardTitle>
            <CardDescription>
              Comprehensive report for documentation and compliance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={copyReport} variant="outline" size="sm">
                  Copy Report
                </Button>
              </div>

              <div className="overflow-x-auto rounded-lg bg-muted p-4">
                <pre className="whitespace-pre-wrap font-mono text-sm">
                  {report}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Testing Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Manual Testing Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h4 className="mb-2 font-medium">
                  1. Keyboard Navigation Testing
                </h4>
                <ul className="ml-4 space-y-1 text-sm">
                  <li>• Use Tab key to navigate to theme switcher buttons</li>
                  <li>• Press Enter or Space to activate buttons</li>
                  <li>• Verify focus indicators are visible in both themes</li>
                  <li>• Check that focus doesn&apos;t get trapped or lost</li>
                </ul>
              </div>

              <div>
                <h4 className="mb-2 font-medium">2. Screen Reader Testing</h4>
                <ul className="ml-4 space-y-1 text-sm">
                  <li>
                    • Test with NVDA (Windows), JAWS (Windows), or VoiceOver
                    (Mac)
                  </li>
                  <li>• Verify button labels are announced correctly</li>
                  <li>
                    • Check that button states (pressed/not pressed) are
                    communicated
                  </li>
                  <li>• Ensure theme changes are announced to users</li>
                </ul>
              </div>

              <div>
                <h4 className="mb-2 font-medium">3. Visual Testing</h4>
                <ul className="ml-4 space-y-1 text-sm">
                  <li>• Test with high contrast mode enabled</li>
                  <li>
                    • Verify colors are distinguishable for colorblind users
                  </li>
                  <li>
                    • Check that focus indicators have sufficient contrast
                  </li>
                  <li>• Ensure text remains readable at 200% zoom</li>
                </ul>
              </div>

              <div>
                <h4 className="mb-2 font-medium">4. Motion and Animation</h4>
                <ul className="ml-4 space-y-1 text-sm">
                  <li>
                    • Test with &quot;prefers-reduced-motion&quot; enabled
                  </li>
                  <li>• Verify theme transitions respect motion preferences</li>
                  <li>
                    • Check that animations don&apos;t cause seizures or
                    vestibular disorders
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeIndicator, ThemeStatus, ThemeSwitcher } from '@/components/ui/theme-switcher';
import { useThemeSwitcher } from '@/hooks/use-theme-switcher';

function ThemeTestContent() {
    const { theme, resolvedTheme, isDark, isLight, isSystem, isTransitioning } = useThemeSwitcher();

    return (
        <div className="min-h-screen bg-background p-8 transition-colors duration-200">
            <div className="mx-auto max-w-4xl space-y-8">
                {/* Header */}
                <div className="text-center">
                    <h1 className="text-lumina-h1 mb-4 text-foreground">
                        Theme System Test Page
                    </h1>
                    <p className="text-lumina-body-lg text-muted-foreground">
                        Test the enhanced dark/light theme implementation with smooth transitions
                    </p>
                </div>

                {/* Theme Controls */}
                <Card>
                    <CardHeader>
                        <CardTitle>Theme Controls</CardTitle>
                        <CardDescription>
                            Switch between light, dark, and system themes
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Default Theme Switcher */}
                        <div>
                            <h3 className="text-lumina-h3 mb-3">Default Theme Switcher</h3>
                            <ThemeSwitcher />
                        </div>

                        {/* Compact Theme Switcher */}
                        <div>
                            <h3 className="text-lumina-h3 mb-3">Compact Theme Switcher</h3>
                            <ThemeSwitcher variant="compact" />
                        </div>

                        {/* Theme Indicator */}
                        <div>
                            <h3 className="text-lumina-h3 mb-3">Theme Indicator</h3>
                            <ThemeIndicator />
                        </div>

                        {/* Theme Status (Debug) */}
                        <div>
                            <h3 className="text-lumina-h3 mb-3">Theme Status (Debug)</h3>
                            <ThemeStatus />
                        </div>
                    </CardContent>
                </Card>

                {/* Theme Information */}
                <Card>
                    <CardHeader>
                        <CardTitle>Current Theme Information</CardTitle>
                        <CardDescription>
                            Real-time theme state information
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Theme Setting</p>
                                <Badge variant={theme === 'system' ? 'default' : 'secondary'}>
                                    {theme}
                                </Badge>
                            </div>

                            <div className="space-y-2">
                                <p className="text-sm font-medium">Resolved Theme</p>
                                <Badge variant={resolvedTheme === 'dark' ? 'default' : 'secondary'}>
                                    {resolvedTheme}
                                </Badge>
                            </div>

                            <div className="space-y-2">
                                <p className="text-sm font-medium">States</p>
                                <div className="flex flex-wrap gap-1">
                                    {isDark && <Badge variant="outline">Dark</Badge>}
                                    {isLight && <Badge variant="outline">Light</Badge>}
                                    {isSystem && <Badge variant="outline">System</Badge>}
                                    {isTransitioning && <Badge variant="destructive">Transitioning</Badge>}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Component Showcase */}
                <Card>
                    <CardHeader>
                        <CardTitle>Component Showcase</CardTitle>
                        <CardDescription>
                            Test how components look in different themes
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Buttons */}
                        <div>
                            <h3 className="text-lumina-h3 mb-3">Buttons</h3>
                            <div className="flex flex-wrap gap-3">
                                <Button variant="primary">Primary Button</Button>
                                <Button variant="secondary">Secondary Button</Button>
                                <Button variant="outline">Outline Button</Button>
                                <Button variant="ghost">Ghost Button</Button>
                                <Button variant="destructive">Destructive Button</Button>
                                <Button variant="link">Link Button</Button>
                            </div>
                        </div>

                        {/* Typography */}
                        <div>
                            <h3 className="text-lumina-h3 mb-3">Typography</h3>
                            <div className="space-y-2">
                                <h1 className="text-lumina-h1">Heading 1 - Bold Leadership</h1>
                                <h2 className="text-lumina-h2">Heading 2 - Clear Direction</h2>
                                <h3 className="text-lumina-h3">Heading 3 - Focused Sections</h3>
                                <p className="text-lumina-body-lg">
                                    Body Large - Primary content for readability and engagement
                                </p>
                                <p className="text-lumina-body-sm text-muted-foreground">
                                    Body Small - Secondary content and supporting information
                                </p>
                                <p className="text-lumina-caption text-muted-foreground">
                                    Caption - Labels, metadata, and supporting text
                                </p>
                            </div>
                        </div>

                        {/* Colors */}
                        <div>
                            <h3 className="text-lumina-h3 mb-3">Brand Colors</h3>
                            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                                <div className="space-y-2">
                                    <div className="h-16 w-full rounded bg-lumina-gold"></div>
                                    <p className="text-sm">Lumina Gold</p>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-16 w-full rounded bg-lumina-coral"></div>
                                    <p className="text-sm">Lumina Coral</p>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-16 w-full rounded bg-deep-teal"></div>
                                    <p className="text-sm">Deep Teal</p>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-16 w-full rounded bg-lumina-radiant"></div>
                                    <p className="text-sm">Radiant Gradient</p>
                                </div>
                            </div>
                        </div>

                        {/* Semantic Colors */}
                        <div>
                            <h3 className="text-lumina-h3 mb-3">Semantic Colors</h3>
                            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                                <div className="space-y-2">
                                    <div className="h-16 w-full rounded bg-success"></div>
                                    <p className="text-sm">Success</p>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-16 w-full rounded bg-warning"></div>
                                    <p className="text-sm">Warning</p>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-16 w-full rounded bg-error"></div>
                                    <p className="text-sm">Error</p>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-16 w-full rounded bg-info"></div>
                                    <p className="text-sm">Info</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Document Classes Test */}
                <Card>
                    <CardHeader>
                        <CardTitle>Document Classes Test</CardTitle>
                        <CardDescription>
                            Verify that theme classes are applied to the document
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 font-mono text-sm">
                            <p>
                                <span className="font-medium">Document classes:</span>{' '}
                                {typeof document !== 'undefined' ? document.documentElement.className : 'N/A'}
                            </p>
                            <p>
                                <span className="font-medium">Data theme:</span>{' '}
                                {typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') || 'None' : 'N/A'}
                            </p>
                            <p>
                                <span className="font-medium">Color scheme:</span>{' '}
                                {typeof document !== 'undefined' ? document.documentElement.style.colorScheme || 'None' : 'N/A'}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Instructions */}
                <Card>
                    <CardHeader>
                        <CardTitle>Test Instructions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-medium">1. Theme Switching</h4>
                                <p className="text-sm text-muted-foreground">
                                    Use the theme switchers above to change between light, dark, and system themes.
                                    Verify that the transition is smooth and there's no flash of unstyled content.
                                </p>
                            </div>

                            <div>
                                <h4 className="font-medium">2. System Theme Detection</h4>
                                <p className="text-sm text-muted-foreground">
                                    Set the theme to "System" and then change your OS theme preference.
                                    The page should automatically switch to match your system preference.
                                </p>
                            </div>

                            <div>
                                <h4 className="font-medium">3. Persistence</h4>
                                <p className="text-sm text-muted-foreground">
                                    Change the theme and refresh the page. Your theme preference should be remembered.
                                </p>
                            </div>

                            <div>
                                <h4 className="font-medium">4. Accessibility</h4>
                                <p className="text-sm text-muted-foreground">
                                    Test keyboard navigation with Tab and Enter keys. All theme controls should be accessible.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default function ThemeTestPage() {
    return <ThemeTestContent />;
}
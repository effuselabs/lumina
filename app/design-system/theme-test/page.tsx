'use client';

import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Moon, Sun } from 'lucide-react';

export default function ThemeTestPage() {
    const { theme, setTheme, resolvedTheme } = useTheme();

    return (
        <div className="min-h-screen bg-background text-foreground p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold">Theme Test Page</h1>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTheme(resolvedTheme === 'light' ? 'dark' : 'light')}
                        className="h-9 w-9 p-0"
                    >
                        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                        <span className="sr-only">Toggle theme</span>
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Theme Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <p><strong>Current theme:</strong> {theme}</p>
                            <p><strong>Resolved theme:</strong> {resolvedTheme}</p>
                            <p><strong>HTML class:</strong> {typeof document !== 'undefined' ? document.documentElement.className : 'N/A'}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Color Test</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <p className="text-foreground">Foreground text</p>
                                <p className="text-muted-foreground">Muted foreground text</p>
                                <p className="text-lumina-gold">Lumina gold text</p>
                                <p className="text-lumina-coral">Lumina coral text</p>
                                <p className="text-success">Success text</p>
                                <p className="text-error">Error text</p>
                            </div>

                            <div className="space-y-2">
                                <div className="w-full h-4 bg-lumina-gold rounded"></div>
                                <div className="w-full h-4 bg-lumina-coral rounded"></div>
                                <div className="w-full h-4 bg-deep-teal rounded"></div>
                                <div className="w-full h-4 bg-primary rounded"></div>
                                <div className="w-full h-4 bg-secondary rounded"></div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Button Variants</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                <Button variant="primary">Primary</Button>
                                <Button variant="secondary">Secondary</Button>
                                <Button variant="outline">Outline</Button>
                                <Button variant="ghost">Ghost</Button>
                                <Button variant="link">Link</Button>
                                <Button variant="destructive">Destructive</Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>CSS Variables Test</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div
                                className="w-full h-8 rounded"
                                style={{ backgroundColor: 'var(--lumina-gold)' }}
                            >
                                <span className="text-xs p-1">--lumina-gold</span>
                            </div>
                            <div
                                className="w-full h-8 rounded"
                                style={{ backgroundColor: 'var(--lumina-coral)' }}
                            >
                                <span className="text-xs p-1">--lumina-coral</span>
                            </div>
                            <div
                                className="w-full h-8 rounded"
                                style={{ backgroundColor: 'var(--deep-teal)' }}
                            >
                                <span className="text-xs p-1 text-white">--deep-teal</span>
                            </div>
                            <div
                                className="w-full h-8 rounded border"
                                style={{
                                    backgroundColor: 'var(--color-background)',
                                    color: 'var(--color-foreground)',
                                    borderColor: 'var(--color-border)'
                                }}
                            >
                                <span className="text-xs p-1">--color-background / --color-foreground</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
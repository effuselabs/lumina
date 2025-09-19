'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import {
    BarChart3,
    Calendar,
    DollarSign,
    Grid3X3,
    Layout,
    Maximize2,
    Minimize2,
    TrendingUp,
    Users
} from 'lucide-react';
import { useState } from 'react';

export default function GridSystemShowcase() {
    const [debugMode, setDebugMode] = useState(false);

    // Sample data for demonstrations
    const sampleStats = [
        { title: 'Total Revenue', value: '$12,345', change: { value: 12.5, type: 'increase' as const, period: 'vs last month' }, icon: DollarSign },
        { title: 'Active Clients', value: '1,234', change: { value: 8.2, type: 'increase' as const, period: 'vs last month' }, icon: Users },
        { title: 'Appointments', value: '456', change: { value: 3.1, type: 'decrease' as const, period: 'vs last week' }, icon: Calendar },
        { title: 'Growth Rate', value: '23.5%', change: { value: 5.7, type: 'increase' as const, period: 'vs last quarter' }, icon: TrendingUp },
    ];

    const sampleCards = Array.from({ length: 12 }, (_, i) => ({
        id: i + 1,
        title: `Card ${i + 1}`,
        description: `This is sample card ${i + 1} demonstrating the responsive grid system.`,
        content: `Content for card ${i + 1}`,
    }));

    return (
        <div className="min-h-screen bg-color-background p-8">
            <div className="mx-auto max-w-7xl space-y-12">
                <PageHeader
                    title="Responsive Grid System"
                    subtitle="Flexible Layout Components"
                    description="A comprehensive grid system with consistent breakpoints, auto-fit patterns, and responsive behavior across all device sizes."
                    breadcrumbs={[
                        { label: 'Design System', href: '/design-system' },
                        { label: 'Layout', href: '/design-system/layout' },
                        { label: 'Grid System' }
                    ]}
                    actions={[
                        {
                            label: debugMode ? 'Hide Debug' : 'Show Debug',
                            icon: debugMode ? Minimize2 : Maximize2,
                            variant: 'outline',
                            onClick: () => setDebugMode(!debugMode)
                        }
                    ]}
                />

                {/* Grid Overview */}
                <section className="space-y-6">
                    <div className="space-y-2">
                        <h2 className="text-2xl font-semibold text-color-foreground">Grid Variants</h2>
                        <p className="text-color-foreground-secondary">
                            Different grid layouts optimized for various content types and information density requirements.
                        </p>
                    </div>

                    <div className={`grid-container grid-cards ${debugMode ? 'grid-debug' : ''}`}>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Grid3X3 className="h-5 w-5" />
                                    Standard Cards Grid
                                </CardTitle>
                                <CardDescription>
                                    Default responsive grid with 300px minimum width
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Badge variant="secondary">grid-cards</Badge>
                                <p className="mt-2 text-sm text-color-foreground-secondary">
                                    Perfect for content cards, feature cards, and general layouts
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Layout className="h-5 w-5" />
                                    Compact Grid
                                </CardTitle>
                                <CardDescription>
                                    Denser layout with 250px minimum width
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Badge variant="secondary">grid-cards-compact</Badge>
                                <p className="mt-2 text-sm text-color-foreground-secondary">
                                    Ideal for dashboards and information-dense interfaces
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5" />
                                    Dense Grid
                                </CardTitle>
                                <CardDescription>
                                    Maximum density with 200px minimum width
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Badge variant="secondary">grid-cards-dense</Badge>
                                <p className="mt-2 text-sm text-color-foreground-secondary">
                                    For data tables, small widgets, and compact displays
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* Dashboard Stats Grid */}
                <section className="space-y-6">
                    <div className="space-y-2">
                        <h2 className="text-2xl font-semibold text-color-foreground">Dashboard Stats Grid</h2>
                        <p className="text-color-foreground-secondary">
                            Specialized grid layout optimized for metric cards and dashboard statistics.
                        </p>
                    </div>

                    <div className={`grid-container grid-dashboard-stats ${debugMode ? 'grid-debug' : ''}`}>
                        {sampleStats.map((stat, index) => (
                            <StatCard
                                key={index}
                                title={stat.title}
                                value={stat.value}
                                change={stat.change}
                                icon={stat.icon}
                            />
                        ))}
                    </div>
                </section>

                {/* Compact Grid Demo */}
                <section className="space-y-6">
                    <div className="space-y-2">
                        <h2 className="text-2xl font-semibold text-color-foreground">Compact Grid Layout</h2>
                        <p className="text-color-foreground-secondary">
                            Demonstrates the compact grid variant with reduced spacing and smaller minimum widths.
                        </p>
                    </div>

                    <div className={`grid-container grid-cards-compact ${debugMode ? 'grid-debug' : ''}`}>
                        {sampleCards.slice(0, 8).map((card) => (
                            <Card key={card.id}>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg">{card.title}</CardTitle>
                                    <CardDescription className="text-sm">
                                        {card.description}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <p className="text-sm text-color-foreground-secondary">
                                        {card.content}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>

                {/* Dense Grid Demo */}
                <section className="space-y-6">
                    <div className="space-y-2">
                        <h2 className="text-2xl font-semibold text-color-foreground">Dense Grid Layout</h2>
                        <p className="text-color-foreground-secondary">
                            Maximum information density for data-heavy interfaces and compact displays.
                        </p>
                    </div>

                    <div className={`grid-container grid-cards-dense ${debugMode ? 'grid-debug' : ''}`}>
                        {sampleCards.map((card) => (
                            <Card key={card.id} className="p-4">
                                <div className="space-y-2">
                                    <h3 className="font-semibold text-sm">{card.title}</h3>
                                    <p className="text-xs text-color-foreground-secondary">
                                        {card.content}
                                    </p>
                                    <Badge variant="outline" className="text-xs">
                                        Sample
                                    </Badge>
                                </div>
                            </Card>
                        ))}
                    </div>
                </section>

                {/* Fixed Column Grids */}
                <section className="space-y-6">
                    <div className="space-y-2">
                        <h2 className="text-2xl font-semibold text-color-foreground">Fixed Column Grids</h2>
                        <p className="text-color-foreground-secondary">
                            Traditional fixed-column layouts that adapt responsively on smaller screens.
                        </p>
                    </div>

                    <div className="space-y-8">
                        {/* 2 Column Grid */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Two Column Grid</h3>
                            <div className={`grid-container grid-cols-2 gap-lg ${debugMode ? 'grid-debug' : ''}`}>
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Column 1</CardTitle>
                                        <CardDescription>First column content</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-color-foreground-secondary">
                                            This demonstrates a fixed two-column layout that becomes single column on mobile.
                                        </p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Column 2</CardTitle>
                                        <CardDescription>Second column content</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-color-foreground-secondary">
                                            The grid system automatically handles responsive behavior.
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* 3 Column Grid */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Three Column Grid</h3>
                            <div className={`grid-container grid-cols-3 gap-lg ${debugMode ? 'grid-debug' : ''}`}>
                                {sampleCards.slice(0, 6).map((card) => (
                                    <Card key={card.id}>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base">{card.title}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-0">
                                            <p className="text-sm text-color-foreground-secondary">
                                                {card.content}
                                            </p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Grid Utilities Demo */}
                <section className="space-y-6">
                    <div className="space-y-2">
                        <h2 className="text-2xl font-semibold text-color-foreground">Grid Utilities</h2>
                        <p className="text-color-foreground-secondary">
                            Additional utilities for gap control, alignment, and item spanning.
                        </p>
                    </div>

                    <div className="space-y-8">
                        {/* Gap Utilities */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Gap Utilities</h3>
                            <div className="space-y-4">
                                <div>
                                    <Badge variant="outline" className="mb-2">gap-sm</Badge>
                                    <div className={`grid-container grid-cols-3 gap-sm ${debugMode ? 'grid-debug' : ''}`}>
                                        {[1, 2, 3].map((i) => (
                                            <Card key={i} className="p-4">
                                                <p className="text-sm">Small gap</p>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <Badge variant="outline" className="mb-2">gap-lg</Badge>
                                    <div className={`grid-container grid-cols-3 gap-lg ${debugMode ? 'grid-debug' : ''}`}>
                                        {[1, 2, 3].map((i) => (
                                            <Card key={i} className="p-4">
                                                <p className="text-sm">Large gap</p>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Column Spanning */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Column Spanning</h3>
                            <div className={`grid-container grid-cols-4 gap-md ${debugMode ? 'grid-debug' : ''}`}>
                                <Card className="col-span-2 p-4">
                                    <Badge variant="secondary" className="mb-2">col-span-2</Badge>
                                    <p className="text-sm">This card spans 2 columns</p>
                                </Card>
                                <Card className="p-4">
                                    <p className="text-sm">Single column</p>
                                </Card>
                                <Card className="p-4">
                                    <p className="text-sm">Single column</p>
                                </Card>
                                <Card className="col-span-full p-4">
                                    <Badge variant="secondary" className="mb-2">col-span-full</Badge>
                                    <p className="text-sm">This card spans the full width</p>
                                </Card>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Responsive Behavior */}
                <section className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Responsive Behavior</CardTitle>
                            <CardDescription>
                                How the grid system adapts across different screen sizes
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <h4 className="font-semibold flex items-center gap-2">
                                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                        Desktop (&gt;768px)
                                    </h4>
                                    <p className="text-sm text-color-foreground-secondary pl-5">
                                        Full responsive grid with auto-fit columns based on minimum widths
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="font-semibold flex items-center gap-2">
                                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                        Tablet (≤768px)
                                    </h4>
                                    <p className="text-sm text-color-foreground-secondary pl-5">
                                        Reduced minimum widths and gaps, maintains responsive behavior
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="font-semibold flex items-center gap-2">
                                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                                        Mobile (≤480px)
                                    </h4>
                                    <p className="text-sm text-color-foreground-secondary pl-5">
                                        Single column layout for optimal mobile experience
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-color-border">
                                <h4 className="font-semibold mb-2">Available Grid Classes</h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                                    <Badge variant="outline">grid-cards</Badge>
                                    <Badge variant="outline">grid-cards-compact</Badge>
                                    <Badge variant="outline">grid-cards-dense</Badge>
                                    <Badge variant="outline">grid-cards-large</Badge>
                                    <Badge variant="outline">grid-dashboard-stats</Badge>
                                    <Badge variant="outline">grid-cols-1 to 6</Badge>
                                    <Badge variant="outline">gap-xs to 2xl</Badge>
                                    <Badge variant="outline">col-span-1 to full</Badge>
                                    <Badge variant="outline">grid-auto-fit</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </section>
            </div>
        </div>
    );
}
'use client';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Grid, GridItem } from '@/components/ui/grid';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import {
  Calendar,
  Code,
  DollarSign,
  Grid3X3,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useState } from 'react';

export default function GridComponentShowcase() {
  const [debugMode, setDebugMode] = useState(false);

  // Sample data
  const sampleStats = [
    {
      title: 'Total Revenue',
      value: '$12,345',
      change: {
        value: 12.5,
        type: 'increase' as const,
        period: 'vs last month',
      },
      icon: DollarSign,
    },
    {
      title: 'Active Clients',
      value: '1,234',
      change: {
        value: 8.2,
        type: 'increase' as const,
        period: 'vs last month',
      },
      icon: Users,
    },
    {
      title: 'Appointments',
      value: '456',
      change: { value: 3.1, type: 'decrease' as const, period: 'vs last week' },
      icon: Calendar,
    },
    {
      title: 'Growth Rate',
      value: '23.5%',
      change: {
        value: 5.7,
        type: 'increase' as const,
        period: 'vs last quarter',
      },
      icon: TrendingUp,
    },
  ];

  return (
    <div className="bg-color-background min-h-screen p-8">
      <div className="mx-auto max-w-7xl space-y-12">
        <PageHeader
          title="Grid Component"
          subtitle="React Component Wrapper"
          description="A React component wrapper for the responsive grid system, providing a clean API for common grid layouts."
          breadcrumbs={[
            { label: 'Design System', href: '/design-system' },
            { label: 'Components', href: '/design-system/components' },
            { label: 'Grid Component' },
          ]}
          actions={[
            {
              label: debugMode ? 'Hide Debug' : 'Show Debug',
              icon: Grid3X3,
              variant: 'outline',
              onClick: () => setDebugMode(!debugMode),
            },
          ]}
        />

        {/* Basic Usage */}
        <section className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-color-foreground text-2xl font-semibold">
              Basic Usage
            </h2>
            <p className="text-color-foreground-secondary">
              Simple examples of using the Grid component with different
              variants.
            </p>
          </div>

          <div className="space-y-8">
            {/* Cards Variant */}
            <div>
              <div className="mb-4 flex items-center gap-4">
                <h3 className="text-lg font-semibold">Cards Variant</h3>
                <Badge variant="outline">
                  <Code className="mr-1 h-3 w-3" />
                  &lt;Grid variant=&quot;cards&quot;&gt;
                </Badge>
              </div>

              <Grid variant="cards" gap="lg" debug={debugMode}>
                <Card>
                  <CardHeader>
                    <CardTitle>Card 1</CardTitle>
                    <CardDescription>Standard card layout</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-color-foreground-secondary text-sm">
                      This demonstrates the default cards variant with
                      responsive behavior.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Card 2</CardTitle>
                    <CardDescription>Responsive grid</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-color-foreground-secondary text-sm">
                      Cards automatically adjust to screen size.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Card 3</CardTitle>
                    <CardDescription>Auto-fit columns</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-color-foreground-secondary text-sm">
                      The grid uses auto-fit for optimal layout.
                    </p>
                  </CardContent>
                </Card>
              </Grid>
            </div>

            {/* Dashboard Stats */}
            <div>
              <div className="mb-4 flex items-center gap-4">
                <h3 className="text-lg font-semibold">Dashboard Stats</h3>
                <Badge variant="outline">
                  <Code className="mr-1 h-3 w-3" />
                  &lt;Grid variant=&quot;dashboard-stats&quot;&gt;
                </Badge>
              </div>

              <Grid variant="dashboard-stats" debug={debugMode}>
                {sampleStats.map((stat, index) => (
                  <StatCard
                    key={index}
                    title={stat.title}
                    value={stat.value}
                    change={stat.change}
                    icon={stat.icon}
                  />
                ))}
              </Grid>
            </div>

            {/* Compact Variant */}
            <div>
              <div className="mb-4 flex items-center gap-4">
                <h3 className="text-lg font-semibold">Compact Variant</h3>
                <Badge variant="outline">
                  <Code className="mr-1 h-3 w-3" />
                  &lt;Grid variant=&quot;cards-compact&quot;&gt;
                </Badge>
              </div>

              <Grid variant="cards-compact" gap="md" debug={debugMode}>
                {Array.from({ length: 6 }, (_, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        Compact Card {i + 1}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-color-foreground-secondary text-sm">
                        Smaller cards for denser layouts.
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </Grid>
            </div>
          </div>
        </section>

        {/* Fixed Columns */}
        <section className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-color-foreground text-2xl font-semibold">
              Fixed Columns
            </h2>
            <p className="text-color-foreground-secondary">
              Using the columns prop for traditional fixed-column layouts.
            </p>
          </div>

          <div className="space-y-8">
            {/* 2 Columns */}
            <div>
              <div className="mb-4 flex items-center gap-4">
                <h3 className="text-lg font-semibold">Two Columns</h3>
                <Badge variant="outline">
                  <Code className="mr-1 h-3 w-3" />
                  &lt;Grid columns={2}&gt;
                </Badge>
              </div>

              <Grid columns={2} gap="lg" debug={debugMode}>
                <Card>
                  <CardHeader>
                    <CardTitle>Left Column</CardTitle>
                    <CardDescription>First column content</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-color-foreground-secondary text-sm">
                      Fixed two-column layout that becomes single column on
                      mobile.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Right Column</CardTitle>
                    <CardDescription>Second column content</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-color-foreground-secondary text-sm">
                      Responsive behavior is handled automatically.
                    </p>
                  </CardContent>
                </Card>
              </Grid>
            </div>

            {/* 3 Columns */}
            <div>
              <div className="mb-4 flex items-center gap-4">
                <h3 className="text-lg font-semibold">Three Columns</h3>
                <Badge variant="outline">
                  <Code className="mr-1 h-3 w-3" />
                  &lt;Grid columns={3}&gt;
                </Badge>
              </div>

              <Grid columns={3} gap="md" debug={debugMode}>
                {Array.from({ length: 6 }, (_, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        Column {i + 1}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-color-foreground-secondary text-sm">
                        Three-column layout content.
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </Grid>
            </div>
          </div>
        </section>

        {/* Grid Items with Spanning */}
        <section className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-color-foreground text-2xl font-semibold">
              Grid Items with Spanning
            </h2>
            <p className="text-color-foreground-secondary">
              Using GridItem component for column and row spanning.
            </p>
          </div>

          <div>
            <div className="mb-4 flex items-center gap-4">
              <h3 className="text-lg font-semibold">Column Spanning</h3>
              <Badge variant="outline">
                <Code className="mr-1 h-3 w-3" />
                &lt;GridItem colSpan={2}&gt;
              </Badge>
            </div>

            <Grid columns={4} gap="md" debug={debugMode}>
              <GridItem colSpan={2}>
                <Card>
                  <CardHeader>
                    <CardTitle>Wide Card</CardTitle>
                    <CardDescription>Spans 2 columns</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-color-foreground-secondary text-sm">
                      This card spans 2 columns using colSpan={2}.
                    </p>
                  </CardContent>
                </Card>
              </GridItem>
              <GridItem>
                <Card>
                  <CardHeader>
                    <CardTitle>Normal</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-color-foreground-secondary text-sm">
                      Single column.
                    </p>
                  </CardContent>
                </Card>
              </GridItem>
              <GridItem>
                <Card>
                  <CardHeader>
                    <CardTitle>Normal</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-color-foreground-secondary text-sm">
                      Single column.
                    </p>
                  </CardContent>
                </Card>
              </GridItem>
              <GridItem colSpan="full">
                <Card>
                  <CardHeader>
                    <CardTitle>Full Width Card</CardTitle>
                    <CardDescription>Spans all columns</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-color-foreground-secondary text-sm">
                      This card spans the full width using
                      colSpan=&quot;full&quot;.
                    </p>
                  </CardContent>
                </Card>
              </GridItem>
            </Grid>
          </div>
        </section>

        {/* Gap Variations */}
        <section className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-color-foreground text-2xl font-semibold">
              Gap Variations
            </h2>
            <p className="text-color-foreground-secondary">
              Different gap sizes for various spacing requirements.
            </p>
          </div>

          <div className="space-y-8">
            {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map(gapSize => (
              <div key={gapSize}>
                <div className="mb-4 flex items-center gap-4">
                  <h3 className="text-lg font-semibold capitalize">
                    Gap {gapSize}
                  </h3>
                  <Badge variant="outline">
                    <Code className="mr-1 h-3 w-3" />
                    gap=&quot;{gapSize}&quot;
                  </Badge>
                </div>

                <Grid columns={3} gap={gapSize} debug={debugMode}>
                  {Array.from({ length: 3 }, (_, i) => (
                    <Card key={i} className="p-4">
                      <p className="text-sm">
                        Gap {gapSize} - Item {i + 1}
                      </p>
                    </Card>
                  ))}
                </Grid>
              </div>
            ))}
          </div>
        </section>

        {/* API Reference */}
        <section className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Reference</CardTitle>
              <CardDescription>
                Props and usage patterns for the Grid component
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="mb-3 font-semibold">Grid Props</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex gap-4">
                    <code className="bg-color-background-secondary rounded px-2 py-1 font-mono text-xs">
                      variant
                    </code>
                    <span className="text-color-foreground-secondary">
                      &apos;cards&apos; | &apos;cards-compact&apos; |
                      &apos;cards-dense&apos; | &apos;cards-large&apos; |
                      &apos;dashboard-stats&apos; | &apos;auto-fit&apos; |
                      &apos;auto-fill&apos; | &apos;list&apos;
                    </span>
                  </div>
                  <div className="flex gap-4">
                    <code className="bg-color-background-secondary rounded px-2 py-1 font-mono text-xs">
                      columns
                    </code>
                    <span className="text-color-foreground-secondary">
                      1 | 2 | 3 | 4 | 5 | 6
                    </span>
                  </div>
                  <div className="flex gap-4">
                    <code className="bg-color-background-secondary rounded px-2 py-1 font-mono text-xs">
                      gap
                    </code>
                    <span className="text-color-foreground-secondary">
                      &apos;xs&apos; | &apos;sm&apos; | &apos;md&apos; |
                      &apos;lg&apos; | &apos;xl&apos; | &apos;2xl&apos;
                    </span>
                  </div>
                  <div className="flex gap-4">
                    <code className="bg-color-background-secondary rounded px-2 py-1 font-mono text-xs">
                      debug
                    </code>
                    <span className="text-color-foreground-secondary">
                      boolean - Shows grid debugging overlay
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="mb-3 font-semibold">GridItem Props</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex gap-4">
                    <code className="bg-color-background-secondary rounded px-2 py-1 font-mono text-xs">
                      colSpan
                    </code>
                    <span className="text-color-foreground-secondary">
                      1 | 2 | 3 | 4 | 5 | 6 | &apos;full&apos;
                    </span>
                  </div>
                  <div className="flex gap-4">
                    <code className="bg-color-background-secondary rounded px-2 py-1 font-mono text-xs">
                      rowSpan
                    </code>
                    <span className="text-color-foreground-secondary">
                      1 | 2 | 3 | 4 | &apos;full&apos;
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

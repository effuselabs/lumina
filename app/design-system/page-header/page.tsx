'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Download, Plus, Settings, Upload, Users } from 'lucide-react';

export default function PageHeaderShowcase() {
  return (
    <div className="bg-color-background min-h-screen p-8">
      <div className="mx-auto max-w-6xl space-y-12">
        {/* Default Page Header */}
        <section>
          <PageHeader
            title="Default Page Header"
            subtitle="Standard Layout"
            description="This is the default page header variant with full spacing and typography hierarchy. Perfect for main pages with plenty of vertical space."
            breadcrumbs={[
              { label: 'Design System', href: '/design-system' },
              { label: 'Components', href: '/design-system/components' },
              { label: 'Page Header' },
            ]}
            actions={[
              {
                label: 'Add Item',
                icon: Plus,
                primary: true,
                onClick: () => alert('Add Item clicked'),
              },
              {
                label: 'Import',
                icon: Upload,
                variant: 'outline',
                onClick: () => alert('Import clicked'),
              },
              {
                label: 'Settings',
                icon: Settings,
                variant: 'ghost',
                onClick: () => alert('Settings clicked'),
              },
            ]}
          />

          <Card>
            <CardHeader>
              <CardTitle>Default Variant Features</CardTitle>
              <CardDescription>
                The default page header provides maximum visual hierarchy and
                spacing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-color-foreground-secondary space-y-2 text-sm">
                <li>• Full typography hierarchy with large title</li>
                <li>• Generous spacing for visual breathing room</li>
                <li>• Support for subtitle and description</li>
                <li>• Breadcrumb navigation with proper separators</li>
                <li>
                  • Flexible action buttons with primary/secondary variants
                </li>
                <li>• Responsive behavior for mobile and tablet</li>
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* Compact Page Header */}
        <section>
          <PageHeader
            title="Compact Page Header"
            subtitle="Space-Efficient Layout"
            description="This is the compact page header variant with reduced spacing and smaller typography. Ideal for pages with limited vertical space or dense information layouts."
            variant="compact"
            breadcrumbs={[
              { label: 'Design System', href: '/design-system' },
              { label: 'Components', href: '/design-system/components' },
              { label: 'Page Header', href: '/design-system/page-header' },
              { label: 'Compact Variant' },
            ]}
            actions={[
              {
                label: 'Manage Users',
                icon: Users,
                primary: true,
                onClick: () => alert('Manage Users clicked'),
              },
              {
                label: 'Export',
                icon: Download,
                variant: 'secondary',
                onClick: () => alert('Export clicked'),
              },
            ]}
          />

          <Card>
            <CardHeader>
              <CardTitle>Compact Variant Features</CardTitle>
              <CardDescription>
                The compact page header optimizes space while maintaining
                usability
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-color-foreground-secondary space-y-2 text-sm">
                <li>• Reduced typography scale for space efficiency</li>
                <li>• Tighter spacing between elements</li>
                <li>• Maintains all functionality of default variant</li>
                <li>• Perfect for data-heavy pages or dashboards</li>
                <li>• Responsive design adapts gracefully</li>
                <li>• Consistent with Lumina design system</li>
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* Minimal Page Header */}
        <section>
          <PageHeader
            title="Minimal Page Header"
            description="Sometimes less is more. This header demonstrates minimal configuration with just a title and description."
          />

          <Card>
            <CardHeader>
              <CardTitle>Minimal Configuration</CardTitle>
              <CardDescription>
                Clean and simple when you don&apos;t need all the features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-color-foreground-secondary text-sm">
                The PageHeader component gracefully handles minimal
                configurations, providing consistent typography and spacing even
                with just basic content.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* With Additional Content */}
        <section>
          <PageHeader
            title="Page Header with Additional Content"
            subtitle="Extended Functionality"
            description="The PageHeader component supports additional content through the children prop, allowing for custom elements below the main header content."
            actions={[
              {
                label: 'Primary Action',
                primary: true,
                onClick: () => alert('Primary Action clicked'),
              },
            ]}
          >
            <div className="border-color-border flex gap-4 border-t pt-4">
              <div className="text-color-foreground-secondary flex items-center gap-2 text-sm">
                <div className="bg-color-success h-2 w-2 rounded-full"></div>
                <span>System Status: Operational</span>
              </div>
              <div className="text-color-foreground-secondary flex items-center gap-2 text-sm">
                <div className="bg-color-warning h-2 w-2 rounded-full"></div>
                <span>3 Pending Updates</span>
              </div>
            </div>
          </PageHeader>

          <Card>
            <CardHeader>
              <CardTitle>Additional Content Support</CardTitle>
              <CardDescription>
                Extend the header with custom content using the children prop
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-color-foreground-secondary text-sm">
                The children prop allows you to add custom content below the
                main header, such as status indicators, filters, or other
                contextual information.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Responsive Behavior Demo */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Responsive Behavior</CardTitle>
              <CardDescription>
                The PageHeader component adapts to different screen sizes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Desktop (Default)</h4>
                <p className="text-color-foreground-secondary text-sm">
                  Full horizontal layout with actions on the right side
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Tablet (≤768px)</h4>
                <p className="text-color-foreground-secondary text-sm">
                  Stacked layout with actions below the title, reduced
                  typography scale
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Mobile (≤480px)</h4>
                <p className="text-color-foreground-secondary text-sm">
                  Further reduced spacing and typography, actions may wrap or
                  stack
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Small Mobile (≤360px)</h4>
                <p className="text-color-foreground-secondary text-sm">
                  Actions stack vertically for better touch targets
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

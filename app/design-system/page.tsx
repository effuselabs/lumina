import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';

export default function DesignSystemPage() {
  return (
    <div className="bg-color-background min-h-screen p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <PageHeader
          title="Lumina Design System"
          description="A comprehensive UI component library built with Lumina brand guidelines"
          variant="default"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Design System' },
          ]}
        />

        {/* Color Palette */}
        <Card>
          <CardHeader>
            <CardTitle>Color Palette</CardTitle>
            <CardDescription>
              Lumina brand colors and functional UI colors
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Primary Colors */}
            <div>
              <h3 className="text-color-foreground mb-3 text-lg font-semibold">
                Primary Colors
              </h3>
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="mb-2 h-20 w-20 rounded-lg bg-lumina-gold shadow-lumina"></div>
                  <p className="text-sm font-medium">Lumina Gold</p>
                  <p className="text-color-foreground-muted text-xs">#FFD25A</p>
                </div>
                <div className="text-center">
                  <div className="mb-2 h-20 w-20 rounded-lg bg-lumina-coral shadow-lumina"></div>
                  <p className="text-sm font-medium">Lumina Coral</p>
                  <p className="text-color-foreground-muted text-xs">#FF7A5A</p>
                </div>
                <div className="text-center">
                  <div className="mb-2 h-20 w-20 rounded-lg bg-lumina-radiant shadow-lumina"></div>
                  <p className="text-sm font-medium">Radiant Gradient</p>
                  <p className="text-color-foreground-muted text-xs">
                    Gold → Coral
                  </p>
                </div>
              </div>
            </div>

            {/* Secondary Colors */}
            <div>
              <h3 className="text-color-foreground mb-3 text-lg font-semibold">
                Secondary Colors
              </h3>
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="mb-2 h-20 w-20 rounded-lg bg-deep-teal"></div>
                  <p className="text-sm font-medium">Deep Teal</p>
                  <p className="text-color-foreground-muted text-xs">#0B2B33</p>
                </div>
              </div>
            </div>

            {/* Functional Colors */}
            <div>
              <h3 className="text-color-foreground mb-3 text-lg font-semibold">
                Functional Colors
              </h3>
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="mb-2 h-20 w-20 rounded-lg bg-success"></div>
                  <p className="text-sm font-medium">Success</p>
                  <p className="text-color-foreground-muted text-xs">#22C58B</p>
                </div>
                <div className="text-center">
                  <div className="mb-2 h-20 w-20 rounded-lg bg-warning"></div>
                  <p className="text-sm font-medium">Warning</p>
                  <p className="text-color-foreground-muted text-xs">#FFB800</p>
                </div>
                <div className="text-center">
                  <div className="mb-2 h-20 w-20 rounded-lg bg-error"></div>
                  <p className="text-sm font-medium">Error</p>
                  <p className="text-color-foreground-muted text-xs">#E5484D</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Typography */}
        <Card>
          <CardHeader>
            <CardTitle>Typography</CardTitle>
            <CardDescription>
              Inter font family with Lumina typography scale
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-display-2xl text-color-foreground">
              Display 2XL
            </div>
            <div className="text-display-xl text-color-foreground">
              Display XL
            </div>
            <div className="text-display-lg text-color-foreground">
              Display Large
            </div>
            <div className="text-display-md text-color-foreground">
              Display Medium
            </div>
            <div className="text-display-sm text-color-foreground">
              Display Small
            </div>
            <div className="text-color-foreground text-xl font-semibold">
              Heading XL
            </div>
            <div className="text-color-foreground text-lg font-semibold">
              Heading Large
            </div>
            <div className="text-color-foreground text-base font-medium">
              Body Medium
            </div>
            <div className="text-color-foreground text-base">Body Regular</div>
            <div className="text-color-foreground-muted text-sm">
              Body Small
            </div>
            <div className="text-color-foreground-muted text-xs">Caption</div>
          </CardContent>
        </Card>

        {/* Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
            <CardDescription>
              Button variants with Lumina brand styling
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Primary Buttons */}
            <div>
              <h3 className="text-color-foreground mb-3 text-lg font-semibold">
                Primary Variants
              </h3>
              <div className="flex flex-wrap gap-3">
                <Button>Default (Radiant)</Button>
                <Button variant="secondary">Secondary (Teal)</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
              </div>
            </div>

            {/* Functional Buttons */}
            <div>
              <h3 className="text-color-foreground mb-3 text-lg font-semibold">
                Functional Variants
              </h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="success">Success</Button>
                <Button variant="warning">Warning</Button>
                <Button variant="destructive">Destructive</Button>
              </div>
            </div>

            {/* Button Sizes */}
            <div>
              <h3 className="text-color-foreground mb-3 text-lg font-semibold">
                Sizes
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="xl">Extra Large</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Elements */}
        <Card>
          <CardHeader>
            <CardTitle>Form Elements</CardTitle>
            <CardDescription>
              Input fields and form components with Lumina styling
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="Enter your email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="error-input">Input with Error</Label>
                <Input
                  id="error-input"
                  error
                  placeholder="This field has an error"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="disabled-input">Disabled Input</Label>
                <Input
                  id="disabled-input"
                  disabled
                  placeholder="This field is disabled"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Badges */}
        <Card>
          <CardHeader>
            <CardTitle>Badges</CardTitle>
            <CardDescription>
              Status indicators and labels with Lumina colors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="default">Success</Badge>
              <Badge variant="secondary">Warning</Badge>
              <Badge variant="destructive">Error</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="outline">Ghost</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Dialog Example */}
        <Card>
          <CardHeader>
            <CardTitle>Dialog</CardTitle>
            <CardDescription>Modal dialogs with Lumina styling</CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog>
              <DialogTrigger asChild>
                <Button>Open Dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Lumina Dialog</DialogTitle>
                  <DialogDescription>
                    This is a sample dialog using the Lumina design system.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="dialog-input">Sample Input</Label>
                    <Input id="dialog-input" placeholder="Enter some text" />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline">Cancel</Button>
                  <Button>Save Changes</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

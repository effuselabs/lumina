import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-neutral-light-grey p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-display-lg text-lumina-radiant mb-4">
            Lumina Design System
          </h1>
          <p className="text-lg text-neutral-medium-grey">
            A comprehensive UI component library built with Lumina brand
            guidelines
          </p>
        </div>

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
              <h3 className="mb-3 text-lg font-semibold text-neutral-off-black">
                Primary Colors
              </h3>
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="mb-2 h-20 w-20 rounded-lg bg-lumina-gold shadow-lumina"></div>
                  <p className="text-sm font-medium">Lumina Gold</p>
                  <p className="text-xs text-neutral-medium-grey">#FFD25A</p>
                </div>
                <div className="text-center">
                  <div className="mb-2 h-20 w-20 rounded-lg bg-lumina-coral shadow-lumina"></div>
                  <p className="text-sm font-medium">Lumina Coral</p>
                  <p className="text-xs text-neutral-medium-grey">#FF7A5A</p>
                </div>
                <div className="text-center">
                  <div className="mb-2 h-20 w-20 rounded-lg bg-lumina-radiant shadow-lumina"></div>
                  <p className="text-sm font-medium">Radiant Gradient</p>
                  <p className="text-xs text-neutral-medium-grey">
                    Gold → Coral
                  </p>
                </div>
              </div>
            </div>

            {/* Secondary Colors */}
            <div>
              <h3 className="mb-3 text-lg font-semibold text-neutral-off-black">
                Secondary Colors
              </h3>
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="mb-2 h-20 w-20 rounded-lg bg-deep-teal"></div>
                  <p className="text-sm font-medium">Deep Teal</p>
                  <p className="text-xs text-neutral-medium-grey">#0B2B33</p>
                </div>
              </div>
            </div>

            {/* Functional Colors */}
            <div>
              <h3 className="mb-3 text-lg font-semibold text-neutral-off-black">
                Functional Colors
              </h3>
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="mb-2 h-20 w-20 rounded-lg bg-success"></div>
                  <p className="text-sm font-medium">Success</p>
                  <p className="text-xs text-neutral-medium-grey">#22C58B</p>
                </div>
                <div className="text-center">
                  <div className="mb-2 h-20 w-20 rounded-lg bg-warning"></div>
                  <p className="text-sm font-medium">Warning</p>
                  <p className="text-xs text-neutral-medium-grey">#FFB800</p>
                </div>
                <div className="text-center">
                  <div className="mb-2 h-20 w-20 rounded-lg bg-error"></div>
                  <p className="text-sm font-medium">Error</p>
                  <p className="text-xs text-neutral-medium-grey">#E5484D</p>
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
            <div className="text-display-2xl text-neutral-off-black">
              Display 2XL
            </div>
            <div className="text-display-xl text-neutral-off-black">
              Display XL
            </div>
            <div className="text-display-lg text-neutral-off-black">
              Display Large
            </div>
            <div className="text-display-md text-neutral-off-black">
              Display Medium
            </div>
            <div className="text-display-sm text-neutral-off-black">
              Display Small
            </div>
            <div className="text-xl font-semibold text-neutral-off-black">
              Heading XL
            </div>
            <div className="text-lg font-semibold text-neutral-off-black">
              Heading Large
            </div>
            <div className="text-base font-medium text-neutral-off-black">
              Body Medium
            </div>
            <div className="text-base text-neutral-off-black">Body Regular</div>
            <div className="text-sm text-neutral-medium-grey">Body Small</div>
            <div className="text-xs text-neutral-medium-grey">Caption</div>
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
              <h3 className="mb-3 text-lg font-semibold text-neutral-off-black">
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
              <h3 className="mb-3 text-lg font-semibold text-neutral-off-black">
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
              <h3 className="mb-3 text-lg font-semibold text-neutral-off-black">
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
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="destructive">Error</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="ghost">Ghost</Badge>
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

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Download, ExternalLink, Plus, Trash2, User } from 'lucide-react';

export default function ButtonsPage() {
  return (
    <div className="container mx-auto space-y-8 py-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold">Enhanced Button Component</h1>
        <p className="text-muted-foreground">
          Comprehensive button component with all variants, sizes, and states.
        </p>
      </div>

      {/* Button Variants */}
      <Card>
        <CardHeader>
          <CardTitle>Button Variants</CardTitle>
          <CardDescription>
            All available button variants with consistent Lumina branding
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </div>
        </CardContent>
      </Card>

      {/* Button Sizes */}
      <Card>
        <CardHeader>
          <CardTitle>Button Sizes</CardTitle>
          <CardDescription>
            Different sizes for various use cases
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon">
              <User className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Button with Icons */}
      <Card>
        <CardHeader>
          <CardTitle>Buttons with Icons</CardTitle>
          <CardDescription>
            Buttons can include icons for better visual communication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button icon={<Plus className="h-4 w-4" />}>Add Client</Button>
            <Button variant="secondary" icon={<Download className="h-4 w-4" />}>
              Download Report
            </Button>
            <Button variant="outline" icon={<User className="h-4 w-4" />}>
              View Profile
            </Button>
            <Button variant="destructive" icon={<Trash2 className="h-4 w-4" />}>
              Delete
            </Button>
            <Button variant="link" icon={<ExternalLink className="h-4 w-4" />}>
              External Link
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading States */}
      <Card>
        <CardHeader>
          <CardTitle>Loading States</CardTitle>
          <CardDescription>
            Buttons show loading spinners when processing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button loading>Processing...</Button>
            <Button variant="secondary" loading>
              Saving Changes
            </Button>
            <Button variant="outline" loading size="sm">
              Loading
            </Button>
            <Button variant="destructive" loading size="lg">
              Deleting Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Disabled States */}
      <Card>
        <CardHeader>
          <CardTitle>Disabled States</CardTitle>
          <CardDescription>
            Disabled buttons are non-interactive and visually muted
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button disabled>Disabled Primary</Button>
            <Button variant="secondary" disabled>
              Disabled Secondary
            </Button>
            <Button variant="outline" disabled>
              Disabled Outline
            </Button>
            <Button variant="ghost" disabled>
              Disabled Ghost
            </Button>
            <Button variant="destructive" disabled>
              Disabled Destructive
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Interactive Examples</CardTitle>
          <CardDescription>Real-world button usage examples</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* CTA Section */}
          <div className="from-lumina-gold/10 to-lumina-coral/10 rounded-lg bg-gradient-to-r p-6">
            <h3 className="mb-2 text-lg font-semibold">
              Ready to get started?
            </h3>
            <p className="mb-4 text-muted-foreground">
              Join thousands of salon owners who trust Lumina to manage their
              business.
            </p>
            <div className="flex gap-3">
              <Button size="lg">Start Free Trial</Button>
              <Button variant="outline" size="lg">
                Learn More
              </Button>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <h4 className="font-medium">Client Management</h4>
              <p className="text-sm text-muted-foreground">
                Manage your client database
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={<Plus className="h-4 w-4" />}
              >
                Add Client
              </Button>
              <Button size="sm" icon={<Download className="h-4 w-4" />}>
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

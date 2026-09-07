import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function EnhancedCardDemo() {
  return (
    <div className="space-y-8 bg-background p-8">
      <h1 className="mb-8 text-center text-3xl font-bold">
        Enhanced Card System Demo
      </h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Default Card */}
        <Card>
          <CardHeader>
            <CardTitle>Default Card</CardTitle>
            <CardDescription>Standard card with basic styling</CardDescription>
          </CardHeader>
          <CardContent>
            <p>This is the default card variant with standard hover effects.</p>
          </CardContent>
        </Card>

        {/* Glass Card with Lift Hover */}
        <Card variant="glass" hover="lift">
          <CardHeader>
            <CardTitle>Glass Card</CardTitle>
            <CardDescription>
              Glassmorphism effect with lift hover
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              This card uses backdrop-filter for a glass effect and lifts on
              hover.
            </p>
          </CardContent>
        </Card>

        {/* Gradient Border Card with Glow Hover */}
        <Card variant="gradient-border" hover="glow">
          <CardHeader>
            <CardTitle>Gradient Border</CardTitle>
            <CardDescription>
              Lumina brand gradient border with glow hover
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              Features the Lumina radiant gradient border and glows on hover.
            </p>
          </CardContent>
        </Card>

        {/* Floating Card with Scale Hover */}
        <Card variant="floating" hover="scale">
          <CardHeader>
            <CardTitle>Floating Card</CardTitle>
            <CardDescription>
              Enhanced elevation with scale hover
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>This card has enhanced shadows and scales slightly on hover.</p>
          </CardContent>
        </Card>

        {/* Premium Card with Lift Hover */}
        <Card variant="premium" hover="lift">
          <CardHeader>
            <CardTitle>Premium Card</CardTitle>
            <CardDescription>
              Premium styling with Lumina brand colors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              Combines premium styling with Lumina gold accents and lift hover.
            </p>
          </CardContent>
        </Card>

        {/* Animated Card */}
        <Card variant="floating" hover="glow" animated>
          <CardHeader>
            <CardTitle>Animated Card</CardTitle>
            <CardDescription>Scroll-triggered animation ready</CardDescription>
          </CardHeader>
          <CardContent>
            <p>This card can be animated on scroll with the animated prop.</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-12">
        <h2 className="mb-4 text-2xl font-semibold">Theme Support</h2>
        <p className="mb-4 text-muted-foreground">
          All card variants automatically adapt to light and dark themes. Try
          switching themes to see the glassmorphism, gradient borders, and glow
          effects adjust appropriately.
        </p>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card variant="glass" hover="lift" className="p-6">
            <h3 className="mb-2 font-semibold">Light Theme</h3>
            <p className="text-sm text-muted-foreground">
              Glass effect uses light backdrop with subtle transparency
            </p>
          </Card>

          <Card variant="premium" hover="glow" className="p-6">
            <h3 className="mb-2 font-semibold">Dark Theme Ready</h3>
            <p className="text-sm text-muted-foreground">
              Premium effects adapt with enhanced shadows and brighter glows
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

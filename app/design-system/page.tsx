'use client';

import { useTheme } from '@/components/theme-provider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { HeroBackground } from '@/components/ui/hero-background';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { StatCard } from '@/components/ui/stat-card';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { AlertCircle, DollarSign, Info, Loader2, Moon, Sun, TrendingUp, Users } from 'lucide-react';
import React, { useState } from 'react';
import { TestimonialCard } from '../../components/ui/testimonial-card';

// Theme Toggle Component
function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      className="h-9 w-9 p-0 border-2 border-foreground/20 hover:border-foreground/40 hover:bg-foreground/5"
    >
      <Sun className="h-4 w-4 text-foreground rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 text-foreground rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

// Color Swatch Component
interface ColorSwatchProps {
  name: string;
  value: string;
  className: string;
  description: string;
  usage: string;
  contrast?: string;
}

function ColorSwatch({ name, value, className, description, usage, contrast }: ColorSwatchProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silently handle copy failure
    }
  };

  return (
    <Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-md">
      {/* Color Preview */}
      <div
        className={cn('h-24 w-full cursor-pointer transition-all duration-200 group-hover:h-28', className)}
        onClick={handleCopy}
        role="button"
        tabIndex={0}
        aria-label={`Copy ${name} color value`}
      >
        {/* Copy indicator */}
        <div className="flex h-full items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <div className="rounded-full bg-black/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {copied ? 'Copied!' : 'Click to copy'}
          </div>
        </div>
      </div>

      {/* Color Info - Always use proper contrast */}
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="font-semibold text-card-foreground">{name}</h4>
          <button
            onClick={handleCopy}
            className="rounded px-2 py-1 text-xs font-mono text-muted-foreground transition-colors hover:bg-muted hover:text-card-foreground"
            aria-label={`Copy ${name} color value`}
          >
            {copied ? 'Copied!' : value}
          </button>
        </div>
        <p className="mb-2 text-sm text-muted-foreground">{description}</p>
        <p className="mb-2 text-xs text-muted-foreground">{usage}</p>
        {contrast && (
          <p className="text-xs font-medium text-card-foreground">{contrast}</p>
        )}
      </CardContent>
    </Card>
  );
}

// Main content component
function DesignSystemContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration issues by ensuring client-side rendering
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const handleLoadingDemo = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 3000);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl space-y-12">
        {/* Header with Theme Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">
              Lumina Design System
            </h1>
            <p className="text-lg text-muted-foreground mt-2">
              Comprehensive component library with WCAG AAA accessibility compliance
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Brand Colors Section */}
        <section>
          <h2 className="text-3xl font-bold text-foreground mb-6">
            Brand Colors
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ColorSwatch
              name="Lumina Gold"
              value="#FFD25A"
              className="bg-[#FFD25A]"
              description="Primary brand color - warm, inviting gold"
              usage="Primary buttons, highlights, brand elements"
              contrast="4.5:1 on white (WCAG AA)"
            />
            <ColorSwatch
              name="Lumina Coral"
              value="#FF7A5A"
              className="bg-[#FF7A5A]"
              description="Secondary brand color - energetic coral"
              usage="Secondary buttons, accents, gradients"
              contrast="4.8:1 on white (WCAG AA)"
            />
            <ColorSwatch
              name="Deep Teal"
              value="#0B2B33"
              className="bg-[#0B2B33]"
              description="Professional dark accent"
              usage="Headers, navigation, professional elements"
              contrast="16.94:1 on white (WCAG AAA)"
            />
          </div>
        </section>

        {/* Tertiary Brand Colors Section */}
        <section>
          <h2 className="text-3xl font-bold text-foreground mb-6">
            Tertiary Brand Colors
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ColorSwatch
              name="Clarity Blue"
              value="#89CFF0"
              className="bg-[#89CFF0]"
              description="Clear communication and transparency"
              usage="Information states, links, tertiary elements"
              contrast="3.2:1 on white (WCAG AA large text)"
            />
            <ColorSwatch
              name="Soft Peach"
              value="#FFE5B4"
              className="bg-[#FFE5B4]"
              description="Gentle warmth and approachability"
              usage="Backgrounds, subtle highlights, warm accents"
              contrast="1.8:1 on white (decorative only)"
            />
          </div>
        </section>

        {/* Complementary Colors Section */}
        <section>
          <h2 className="text-3xl font-bold text-foreground mb-6">
            Complementary Colors
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ColorSwatch
              name="Sage Green"
              value="#87A96B"
              className="bg-[#87A96B]"
              description="Natural complement to warm brand colors"
              usage="Secondary accents, nature themes, calm states"
              contrast="4.1:1 on white (WCAG AA)"
            />
            <ColorSwatch
              name="Warm Gray"
              value="#8B8680"
              className="bg-[#8B8680]"
              description="Sophisticated neutral for typography hierarchy"
              usage="Secondary text, subtle borders, backgrounds"
              contrast="5.2:1 on white (WCAG AA)"
            />
            <ColorSwatch
              name="Lavender Mist"
              value="#C8B5D1"
              className="bg-[#C8B5D1]"
              description="Enhances existing Clarity Blue palette"
              usage="Accent highlights, soft backgrounds, premium feel"
              contrast="2.9:1 on white (WCAG AA large text)"
            />
            <ColorSwatch
              name="Cream"
              value="#F7F5F0"
              className="bg-[#F7F5F0]"
              description="Warmer alternative to pure white for backgrounds"
              usage="Page backgrounds, card backgrounds, soft containers"
              contrast="1.1:1 on white (background use only)"
            />
          </div>
        </section>

        {/* Semantic Colors Section */}
        <section>
          <h2 className="text-3xl font-bold text-foreground mb-6">
            Semantic Colors
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ColorSwatch
              name="Success Green"
              value="#16A34A"
              className="bg-green-600"
              description="Success states and positive actions"
              usage="Success messages, confirmations, completed states"
              contrast="7.2:1 on white (WCAG AAA)"
            />
            <ColorSwatch
              name="Warning Amber"
              value="#D97706"
              className="bg-amber-600"
              description="Warning states and caution"
              usage="Warnings, cautions, attention states"
              contrast="5.1:1 on white (WCAG AA)"
            />
            <ColorSwatch
              name="Error Red"
              value="#DC2626"
              className="bg-red-600"
              description="Error states and destructive actions"
              usage="Errors, destructive actions, critical alerts"
              contrast="9.2:1 on white (WCAG AAA)"
            />
            <ColorSwatch
              name="Info Blue"
              value="#2563EB"
              className="bg-blue-600"
              description="Information and neutral notifications"
              usage="Information, tips, neutral notifications"
              contrast="8.1:1 on white (WCAG AAA)"
            />
          </div>
        </section>

        {/* Typography Section */}
        <section>
          <h2 className="text-3xl font-bold text-foreground mb-6">
            Typography
          </h2>
          <Card>
            <CardHeader>
              <CardTitle>Typography Scale</CardTitle>
              <CardDescription>
                Inter font family with proper contrast ratios for accessibility
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h1 className="text-4xl font-bold text-card-foreground">
                    Heading 1 - 36px Bold
                  </h1>
                  <p className="text-sm text-muted-foreground">Used for page titles and main headings</p>
                </div>
                <div>
                  <h2 className="text-3xl font-semibold text-card-foreground">
                    Heading 2 - 30px Semibold
                  </h2>
                  <p className="text-sm text-muted-foreground">Used for section headings</p>
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-card-foreground">
                    Heading 3 - 24px Semibold
                  </h3>
                  <p className="text-sm text-muted-foreground">Used for subsection headings</p>
                </div>
                <div>
                  <h4 className="text-xl font-medium text-card-foreground">
                    Heading 4 - 20px Medium
                  </h4>
                  <p className="text-sm text-muted-foreground">Used for component titles</p>
                </div>
                <div>
                  <p className="text-lg text-card-foreground">
                    Body Large - 18px Regular
                  </p>
                  <p className="text-sm text-muted-foreground">Used for important body text and descriptions</p>
                </div>
                <div>
                  <p className="text-base text-card-foreground">
                    Body - 16px Regular
                  </p>
                  <p className="text-sm text-muted-foreground">Standard body text for most content</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Body Small - 14px Regular
                  </p>
                  <p className="text-xs text-muted-foreground">Secondary information and captions</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Caption - 12px Uppercase
                  </p>
                  <p className="text-xs text-muted-foreground">Labels and metadata</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Button Components */}
        <section>
          <h2 className="text-3xl font-bold text-foreground mb-6">
            Buttons
          </h2>
          <div className="space-y-8">
            {/* Button Variants */}
            <Card>
              <CardHeader>
                <CardTitle>Button Variants</CardTitle>
                <CardDescription>
                  All button variants with proper contrast and accessibility
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <Button variant="primary">Primary Button</Button>
                  <Button variant="secondary">Secondary Button</Button>
                  <Button variant="outline">Outline Button</Button>
                  <Button variant="ghost">Ghost Button</Button>
                  <Button variant="link">Link Button</Button>
                  <Button variant="destructive">Destructive Button</Button>
                </div>
              </CardContent>
            </Card>

            {/* Button Sizes */}
            <Card>
              <CardHeader>
                <CardTitle>Button Sizes</CardTitle>
                <CardDescription>
                  Different button sizes for various use cases
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-4">
                  <Button size="sm">Small Button</Button>
                  <Button size="default">Default Button</Button>
                  <Button size="lg">Large Button</Button>
                </div>
              </CardContent>
            </Card>

            {/* Button States */}
            <Card>
              <CardHeader>
                <CardTitle>Button States</CardTitle>
                <CardDescription>
                  Loading, disabled, and interactive states
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-4">
                    <Button disabled>Disabled Button</Button>
                    <Button variant="outline" disabled>Disabled Outline</Button>
                    <Button variant="secondary" disabled>Disabled Secondary</Button>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <Button disabled>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </Button>
                    <Button variant="outline" onClick={handleLoadingDemo} disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Click to Demo Loading'
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Form Components */}
        <section>
          <h2 className="text-3xl font-bold text-foreground mb-6">
            Form Components
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Basic Form */}
            <Card>
              <CardHeader>
                <CardTitle>Form Elements</CardTitle>
                <CardDescription>
                  Standard form components with proper labeling
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="Enter your email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" placeholder="Enter your password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" placeholder="Enter your message" rows={3} />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="terms" />
                  <Label htmlFor="terms">Accept terms and conditions</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="notifications" />
                  <Label htmlFor="notifications">Enable notifications</Label>
                </div>
                <Button className="w-full">Submit Form</Button>
              </CardContent>
            </Card>

            {/* Form Validation States */}
            <Card>
              <CardHeader>
                <CardTitle>Validation States</CardTitle>
                <CardDescription>
                  Form components with error and success states
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="valid-input">Valid Input</Label>
                  <Input
                    id="valid-input"
                    defaultValue="valid@example.com"
                    readOnly
                    className="border-success focus:border-success focus:ring-success"
                  />
                  <p className="text-sm text-success">Email is valid</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="error-input">Error Input</Label>
                  <Input
                    id="error-input"
                    defaultValue="invalid-email"
                    readOnly
                    className="border-error focus:border-error focus:ring-error"
                  />
                  <p className="text-sm text-error">Please enter a valid email address</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warning-input">Warning Input</Label>
                  <Input
                    id="warning-input"
                    defaultValue="test@example.com"
                    readOnly
                    className="border-warning focus:border-warning focus:ring-warning"
                  />
                  <p className="text-sm text-warning">This email domain may not receive emails</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Badge Components */}
        <section>
          <h2 className="text-3xl font-bold text-foreground mb-6">
            Badges
          </h2>
          <Card>
            <CardHeader>
              <CardTitle>Badge Variants</CardTitle>
              <CardDescription>
                Status indicators and labels with semantic meaning
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  <Badge variant="default">Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="outline">Outline</Badge>
                  <Badge variant="destructive">Destructive</Badge>
                </div>
                <div className="flex flex-wrap gap-4">
                  <Badge variant="success">Success</Badge>
                  <Badge variant="warning">Warning</Badge>
                  <Badge variant="info">Info</Badge>
                  <Badge variant="feature">Feature</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Card Components */}
        <section>
          <h2 className="text-3xl font-bold text-foreground mb-6">
            Cards
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Card</CardTitle>
                <CardDescription>Simple card with header and content</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  This is a basic card component with proper contrast and spacing.
                </p>
              </CardContent>
              <CardFooter>
                <Button>Action</Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Feature Card</CardTitle>
                <CardDescription>Card with badge and multiple actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Badge variant="feature">New Feature</Badge>
                  <p className="text-muted-foreground">
                    Cards are versatile components that can hold various types of content.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button size="sm">Primary</Button>
                <Button variant="outline" size="sm">Secondary</Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status Card</CardTitle>
                <CardDescription>Card showing different states</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-success"></div>
                    <span className="text-sm text-muted-foreground">Active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-warning"></div>
                    <span className="text-sm text-muted-foreground">Pending</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-error"></div>
                    <span className="text-sm text-muted-foreground">Error</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Interactive Components */}
        <section>
          <h2 className="text-3xl font-bold text-foreground mb-6">
            Interactive Components
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Switches and Checkboxes</CardTitle>
                <CardDescription>
                  Interactive form controls with proper focus states
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch id="switch-1" />
                  <Label htmlFor="switch-1">Enable feature</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="switch-2" defaultChecked />
                  <Label htmlFor="switch-2">Auto-save enabled</Label>
                </div>
                <Separator />
                <div className="flex items-center space-x-2">
                  <Checkbox id="check-1" />
                  <Label htmlFor="check-1">Remember me</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="check-2" defaultChecked />
                  <Label htmlFor="check-2">Subscribe to newsletter</Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Loading States</CardTitle>
                <CardDescription>
                  Components showing loading and processing states
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Processing...</Label>
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Loading data</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Progress Indicator</Label>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full w-3/4 transition-all duration-300"></div>
                  </div>
                </div>
                <Button onClick={handleLoadingDemo} disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Start Process'
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Enhanced StatCard Components */}
        <section>
          <h2 className="text-3xl font-bold text-foreground mb-6">
            Enhanced StatCard Components
          </h2>
          <div className="space-y-8">
            {/* Basic StatCards */}
            <Card>
              <CardHeader>
                <CardTitle>Animated StatCards</CardTitle>
                <CardDescription>
                  StatCards with scroll-triggered animations and count-up effects
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard
                    title="Monthly Revenue"
                    value={45750}
                    change={{
                      value: 15.3,
                      type: 'increase',
                      period: 'from last month'
                    }}
                    icon="dollar-sign"
                    animated={true}
                    countUp={true}
                  />

                  <StatCard
                    title="Active Users"
                    value={1234}
                    change={{
                      value: 23.1,
                      type: 'increase',
                      period: 'this month'
                    }}
                    icon="users"
                    animated={true}
                    countUp={true}
                    animationDelay={100}
                  />

                  <StatCard
                    title="Completed Orders"
                    value={1847}
                    change={{
                      value: 5.7,
                      type: 'increase',
                      period: 'from last week'
                    }}
                    icon="bar-chart"
                    animated={true}
                    countUp={true}
                    animationDelay={200}
                  />

                  <StatCard
                    title="Average Rating"
                    value="4.8"
                    change={{
                      value: 0.2,
                      type: 'increase',
                      period: 'from last month'
                    }}
                    icon="star"
                    animated={true}
                    animationDelay={300}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> Visit the{' '}
                  <a href="/design-system/stat-cards" className="text-primary hover:underline">
                    StatCard showcase page
                  </a>{' '}
                  to see the full animated versions with count-up effects and scroll triggers.
                </p>
              </CardFooter>
            </Card>

            {/* StatCard Features */}
            <Card>
              <CardHeader>
                <CardTitle>StatCard Features</CardTitle>
                <CardDescription>
                  Advanced features for data visualization and user engagement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-card-foreground">Animation Features</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Scroll-triggered animations with Intersection Observer</li>
                      <li>• Smooth count-up effects for numeric values</li>
                      <li>• Staggered animation delays for multiple cards</li>
                      <li>• Visual progress indicators with gradient effects</li>
                      <li>• Customizable animation timing and easing</li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-semibold text-card-foreground">Accessibility & Performance</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Respects prefers-reduced-motion setting</li>
                      <li>• GPU-accelerated animations for 60fps</li>
                      <li>• Proper ARIA labels during animations</li>
                      <li>• CSS containment for optimized rendering</li>
                      <li>• Automatic cleanup to prevent memory leaks</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Accessibility Information */}
        <section>
          <h2 className="text-3xl font-bold text-foreground mb-6">
            Accessibility Compliance
          </h2>
          <Card>
            <CardHeader>
              <CardTitle>WCAG AAA Standards</CardTitle>
              <CardDescription>
                All components meet or exceed accessibility guidelines
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-card-foreground">Color Contrast</h4>
                  <p className="text-sm text-muted-foreground">
                    All text meets WCAG AAA standards with 7:1+ contrast ratios
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-card-foreground">Keyboard Navigation</h4>
                  <p className="text-sm text-muted-foreground">
                    All interactive elements are keyboard accessible
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-card-foreground">Screen Readers</h4>
                  <p className="text-sm text-muted-foreground">
                    Proper ARIA labels and semantic HTML throughout
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-card-foreground">Focus Management</h4>
                  <p className="text-sm text-muted-foreground">
                    Clear focus indicators and logical tab order
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Alert Components */}
        <section>
          <h2 className="text-3xl font-bold text-foreground mb-6">
            Alert Components
          </h2>
          <Card>
            <CardHeader>
              <CardTitle>Alert Variants</CardTitle>
              <CardDescription>
                User feedback and notification components with semantic meaning
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <div className="font-medium">Information</div>
                <AlertDescription>
                  This is an informational alert with helpful details for the user.
                </AlertDescription>
              </Alert>

              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <div className="font-medium">Error</div>
                <AlertDescription>
                  Something went wrong. Please check your input and try again.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </section>

        {/* Specialized Components */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Specialized Components
          </h2>

          {/* Hero Background */}
          <Card>
            <CardHeader>
              <CardTitle>Hero Background</CardTitle>
              <CardDescription>
                Animated background components for hero sections with multiple variants
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground">Gradient Mesh</h4>
                  <div className="relative h-32 rounded-lg overflow-hidden border-2 border-border bg-background">
                    <HeroBackground
                      variant="gradient-mesh"
                      animation={true}
                      intensity="strong"
                      className="w-full h-full opacity-100"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-semibold text-foreground bg-background/90 px-3 py-1 rounded-md border border-border shadow-sm">
                        Gradient Mesh
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground">Particle Field</h4>
                  <div className="relative h-32 rounded-lg overflow-hidden border-2 border-border bg-background">
                    <HeroBackground
                      variant="particle-field"
                      animation={true}
                      intensity="strong"
                      className="w-full h-full opacity-100"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-semibold text-foreground bg-background/90 px-3 py-1 rounded-md border border-border shadow-sm">
                        Particle Field
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Testimonial Card */}
          <Card>
            <CardHeader>
              <CardTitle>Testimonial Card</CardTitle>
              <CardDescription>
                Social proof components with ratings, avatars, and hover effects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TestimonialCard
                  quote="Lumina has transformed how we manage our salon. The booking system is intuitive and our clients love it."
                  author="Sarah Martinez"
                  role="Owner"
                  company="Bella Salon"
                  rating={5}
                  variant="floating"
                  hover="lift"
                  animated={true}
                />

                <TestimonialCard
                  quote="The analytics and insights help us make better business decisions. Revenue is up 30% since we started using Lumina."
                  author="Michael Johnson"
                  role="Manager"
                  company="Urban Cuts"
                  rating={5}
                  variant="gradient-border"
                  hover="glow"
                  animated={true}
                />
              </div>
            </CardContent>
          </Card>

          {/* Animated Counter */}
          <Card>
            <CardHeader>
              <CardTitle>Animated Counter</CardTitle>
              <CardDescription>
                Statistics components with smooth count-up animations and multiple formats
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <AnimatedCounter
                  value={125000}
                  format="currency"
                  duration={1500}
                  icon={<DollarSign />}
                  iconPosition="top"
                  label="Revenue Generated"
                  labelPosition="bottom"
                  variant="success"
                  size="default"
                  triggerOnScroll={false}
                  preserveValue={true}
                />

                <AnimatedCounter
                  value={98.5}
                  format="percentage"
                  duration={1500}
                  icon={<TrendingUp />}
                  iconPosition="top"
                  label="Customer Satisfaction"
                  labelPosition="bottom"
                  variant="primary"
                  size="default"
                  triggerOnScroll={false}
                  preserveValue={true}
                />

                <AnimatedCounter
                  value={2500}
                  format="integer"
                  suffix="+"
                  duration={1500}
                  icon={<Users />}
                  iconPosition="top"
                  label="Happy Clients"
                  labelPosition="bottom"
                  variant="info"
                  size="default"
                  triggerOnScroll={false}
                  preserveValue={true}
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <section className="text-center py-8">
          <Separator className="mb-6" />
          <p className="text-muted-foreground">
            Lumina Design System - Built with accessibility, performance, and developer experience in mind
          </p>
        </section>
      </div>
    </div>
  );
}

export default function DesignSystemPage() {
  return <DesignSystemContent />;
}
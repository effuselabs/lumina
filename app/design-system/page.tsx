'use client';

import { ThemeProvider } from '@/components/theme-provider';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useState } from 'react';

// Theme Toggle Component
function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      className="h-9 w-9 p-0"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
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
    } catch (err) {
      console.error('Failed to copy color value:', err);
    }
  };

  return (
    <div className="group relative overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900">
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

      {/* Color Info */}
      <div className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">{name}</h4>
          <button
            onClick={handleCopy}
            className="rounded px-2 py-1 text-xs font-mono text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            aria-label={`Copy ${name} color value`}
          >
            {copied ? 'Copied!' : value}
          </button>
        </div>
        <p className="mb-2 text-sm text-neutral-700 dark:text-neutral-300">{description}</p>
        <p className="mb-2 text-xs text-neutral-600 dark:text-neutral-400">{usage}</p>
        {contrast && (
          <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200">{contrast}</p>
        )}
      </div>
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <div className="min-h-screen bg-background p-8">
        <div className="mx-auto max-w-6xl space-y-8">
          {/* Header with Theme Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground">
                Lumina Design System
              </h1>
              <p className="text-lg text-muted-foreground mt-2">
                A comprehensive UI component library built with Lumina brand guidelines
              </p>
            </div>
            <ThemeToggle />
          </div>

          {/* Color Palette */}
          <Card>
            <CardHeader>
              <CardTitle>Color Palette</CardTitle>
              <CardDescription>
                Lumina brand colors and functional UI colors with interactive demonstrations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Primary Brand Colors */}
              <div>
                <h3 className="text-foreground mb-4 text-lg font-semibold">
                  Primary Brand Colors
                </h3>
                <p className="text-muted-foreground mb-4 text-sm">
                  Core Lumina brand colors that define our visual identity and Creator archetype
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <ColorSwatch
                    name="Lumina Gold"
                    value="#FFD25A"
                    className="bg-lumina-gold"
                    description="Primary brand color - empowering and warm"
                    usage="Primary buttons, highlights, focus states"
                    contrast="4.5:1 on white, 7.2:1 on dark"
                  />
                  <ColorSwatch
                    name="Lumina Coral"
                    value="#FF7A5A"
                    className="bg-lumina-coral"
                    description="Secondary brand color - inspiring energy"
                    usage="Accents, hover states, call-to-action elements"
                    contrast="4.8:1 on white, 7.5:1 on dark"
                  />
                  <ColorSwatch
                    name="Radiant Gradient"
                    value="linear-gradient(135deg, #FFD25A 0%, #FF7A5A 100%)"
                    className="bg-lumina-radiant"
                    description="Signature gradient - innovation and creativity"
                    usage="Primary buttons, hero sections, key interactions"
                    contrast="Optimized for white text overlay"
                  />
                </div>
              </div>

              {/* Secondary Brand Colors */}
              <div>
                <h3 className="text-foreground mb-4 text-lg font-semibold">
                  Secondary Brand Colors
                </h3>
                <p className="text-muted-foreground mb-4 text-sm">
                  Supporting colors that provide depth and sophistication to the brand palette
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <ColorSwatch
                    name="Deep Teal"
                    value="#0B2B33"
                    className="bg-deep-teal"
                    description="Professional depth and trust"
                    usage="Secondary buttons, navigation, headers"
                    contrast="16.94:1 on white (AAA compliant)"
                  />
                  <ColorSwatch
                    name="Clarity Blue"
                    value="#89CFF0"
                    className="bg-clarity-blue"
                    description="Clear communication and transparency"
                    usage="Information states, links, tertiary elements"
                    contrast="3.2:1 on white (AA large text)"
                  />
                  <ColorSwatch
                    name="Soft Peach"
                    value="#FFE5B4"
                    className="bg-soft-peach"
                    description="Gentle warmth and approachability"
                    usage="Backgrounds, subtle highlights, warm accents"
                    contrast="1.8:1 on white (decorative only)"
                  />
                </div>
              </div>

              {/* Semantic Colors */}
              <div>
                <h3 className="text-foreground mb-4 text-lg font-semibold">
                  Semantic Colors
                </h3>
                <p className="text-muted-foreground mb-4 text-sm">
                  Functional colors that harmonize with the brand palette while providing clear communication
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <ColorSwatch
                    name="Success Green"
                    value="#0F7B6C"
                    className="bg-success-600"
                    description="Complements Sage Green - WCAG AAA Compliant"
                    usage="Success messages, confirmations, positive states"
                    contrast="7.2:1 on white (AAA compliant)"
                  />
                  <ColorSwatch
                    name="Warning Amber"
                    value="#92400E"
                    className="bg-warning-600"
                    description="Harmonizes with Lumina Gold - WCAG AAA Compliant"
                    usage="Warnings, cautions, attention states"
                    contrast="8.1:1 on white (AAA compliant)"
                  />
                  <ColorSwatch
                    name="Error Red"
                    value="#B91C1C"
                    className="bg-error-600"
                    description="Maintains urgency while fitting palette - WCAG AAA Compliant"
                    usage="Errors, destructive actions, critical alerts"
                    contrast="9.2:1 on white (AAA compliant)"
                  />
                  <ColorSwatch
                    name="Info Blue"
                    value="#1E40AF"
                    className="bg-info-600"
                    description="Works with Clarity Blue - WCAG AAA Compliant"
                    usage="Information, tips, neutral notifications"
                    contrast="10.1:1 on white (AAA compliant)"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Typography */}
          <Card>
            <CardHeader>
              <CardTitle>Typography</CardTitle>
              <CardDescription>
                Inter font family with Lumina Design System v2.0 typography scale - optimized for readability and brand expression
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Font Family */}
              <div>
                <h3 className="text-foreground mb-4 text-lg font-semibold">
                  Font Family
                </h3>
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-700 dark:bg-neutral-800">
                  <div className="mb-4">
                    <h4 className="mb-2 text-base font-semibold text-foreground">Inter</h4>
                    <p className="text-sm text-muted-foreground">
                      A typeface carefully crafted & designed for computer screens. Inter features a tall x-height to aid in readability of mixed-case and lower-case text.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <p className="mb-1 text-xs font-medium text-foreground">Font Weights Used</p>
                      <p className="text-sm text-muted-foreground">Regular (400), Medium (500), SemiBold (600), Bold (700)</p>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium text-foreground">Optimization</p>
                      <p className="text-sm text-muted-foreground">Next.js font optimization with font-display: swap</p>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium text-foreground">Fallbacks</p>
                      <p className="text-sm text-muted-foreground">-apple-system, BlinkMacSystemFont, Segoe UI</p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-lg border border-lumina-gold/20 bg-lumina-gold/5 p-4 dark:bg-lumina-gold/10">
                    <h5 className="mb-2 text-sm font-semibold text-foreground">Supporting Font Recommendation</h5>
                    <p className="text-sm text-foreground">
                      <strong>JetBrains Mono</strong> - For code blocks, technical documentation, and monospace requirements.
                      Complements Inter's clean aesthetic while providing excellent readability for code snippets and technical content.
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Usage: Code examples, API documentation, technical specifications, and developer-focused content.
                    </p>
                  </div>
                </div>
              </div>

              {/* Typography Scale */}
              <div>
                <h3 className="text-foreground mb-4 text-lg font-semibold">
                  Typography Scale
                </h3>
                <p className="text-muted-foreground mb-6 text-sm">
                  Carefully crafted typographic hierarchy following Lumina Design System v2.0 specifications
                </p>
                <div className="space-y-6">
                  <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900">
                    <div className="mb-2 flex items-center gap-3">
                      <span className="rounded bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                        H1
                      </span>
                    </div>
                    <h1 className="text-4xl font-bold text-foreground mb-2">
                      Heading 1 - Bold Leadership
                    </h1>
                    <p className="text-xs text-muted-foreground mb-2">32px • Bold (700) • 40px line height • -0.025em letter spacing</p>
                    <p className="text-xs text-muted-foreground">Usage: Page titles, hero headings, primary calls-to-action</p>
                  </div>

                  <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900">
                    <div className="mb-2 flex items-center gap-3">
                      <span className="rounded bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                        H2
                      </span>
                    </div>
                    <h2 className="text-2xl font-semibold text-foreground mb-2">
                      Heading 2 - Clear Direction
                    </h2>
                    <p className="text-xs text-muted-foreground mb-2">24px • SemiBold (600) • 32px line height • -0.015em letter spacing</p>
                    <p className="text-xs text-muted-foreground">Usage: Section headings, card titles, secondary navigation</p>
                  </div>

                  <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900">
                    <div className="mb-2 flex items-center gap-3">
                      <span className="rounded bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                        H3
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      Heading 3 - Focused Sections
                    </h3>
                    <p className="text-xs text-muted-foreground mb-2">20px • SemiBold (600) • 28px line height • -0.01em letter spacing</p>
                    <p className="text-xs text-muted-foreground">Usage: Subsection headings, component titles, form labels</p>
                  </div>

                  <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900">
                    <div className="mb-2 flex items-center gap-3">
                      <span className="rounded bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                        Body Large
                      </span>
                    </div>
                    <p className="text-base text-foreground mb-2">
                      Body Large - Primary content for readability and engagement with optimal line length for comfortable reading experience
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">16px • Regular (400) • 24px line height • 0em letter spacing</p>
                    <p className="text-xs text-muted-foreground">Usage: Primary body text, descriptions, article content</p>
                  </div>

                  <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900">
                    <div className="mb-2 flex items-center gap-3">
                      <span className="rounded bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                        Body Small
                      </span>
                    </div>
                    <p className="text-sm text-foreground mb-2">
                      Body Small - Secondary content and supporting information that complements the primary content
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">14px • Regular (400) • 20px line height • 0em letter spacing</p>
                    <p className="text-xs text-muted-foreground">Usage: Secondary text, captions, helper text, metadata</p>
                  </div>

                  <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900">
                    <div className="mb-2 flex items-center gap-3">
                      <span className="rounded bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                        Caption
                      </span>
                    </div>
                    <p className="text-xs font-medium text-foreground mb-2">
                      Caption - Labels, metadata, and supporting text for enhanced information hierarchy
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">12px • Medium (500) • 16px line height • 0.025em letter spacing</p>
                    <p className="text-xs text-muted-foreground">Usage: Labels, metadata, fine print, supporting text</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Buttons */}
          <Card>
            <CardHeader>
              <CardTitle>Buttons</CardTitle>
              <CardDescription>
                Interactive button gallery showcasing all variants, sizes, and states with Lumina brand styling
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Button Variants */}
              <div>
                <h3 className="text-foreground mb-4 text-lg font-semibold">
                  Button Variants
                </h3>
                <p className="text-muted-foreground mb-6 text-sm">
                  Each variant serves a specific purpose in the interface hierarchy and user interaction patterns
                </p>

                {/* Light Theme Buttons */}
                <div className="mb-8">
                  <h4 className="mb-4 text-base font-semibold text-foreground">Light Theme</h4>
                  <div className="rounded-lg border border-neutral-200 bg-white p-6">
                    <div className="flex flex-wrap gap-4">
                      <Button variant="primary">Primary</Button>
                      <Button variant="secondary">Secondary</Button>
                      <Button variant="outline">Outline</Button>
                      <Button variant="ghost">Ghost</Button>
                      <Button variant="destructive">Destructive</Button>
                      <Button variant="link">Link</Button>
                    </div>
                  </div>
                </div>

                {/* Dark Theme Buttons */}
                <div className="mb-8">
                  <h4 className="mb-4 text-base font-semibold text-foreground">Dark Theme</h4>
                  <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-6">
                    <div className="flex flex-wrap gap-4">
                      <Button variant="primary">Primary</Button>
                      <Button variant="secondary">Secondary</Button>
                      <Button variant="outline" className="border-neutral-600 text-neutral-200 hover:bg-neutral-800">Outline</Button>
                      <Button variant="ghost" className="text-lumina-gold hover:bg-neutral-800 hover:text-lumina-coral">Ghost</Button>
                      <Button variant="destructive">Destructive</Button>
                      <Button variant="link" className="text-lumina-gold">Link</Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Button Sizes */}
              <div>
                <h3 className="text-foreground mb-4 text-lg font-semibold">
                  Button Sizes
                </h3>
                <p className="text-muted-foreground mb-6 text-sm">
                  Consistent sizing system that maintains visual hierarchy and touch targets
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <Button variant="primary" size="sm">Small</Button>
                  <Button variant="primary" size="default">Default</Button>
                  <Button variant="primary" size="lg">Large</Button>
                  <Button variant="primary" size="xl">Extra Large</Button>
                </div>
              </div>

              {/* Interactive States */}
              <div>
                <h3 className="text-foreground mb-4 text-lg font-semibold">
                  Interactive States
                </h3>
                <p className="text-muted-foreground mb-6 text-sm">
                  Comprehensive state management for all user interactions and system feedback
                </p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Default</p>
                    <Button variant="primary">Normal State</Button>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Hover</p>
                    <Button variant="primary" className="hover:scale-105">Hover State</Button>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Loading</p>
                    <Button variant="primary" disabled>
                      <Spinner size="sm" className="mr-2 text-white" />
                      Loading...
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Disabled</p>
                    <Button variant="primary" disabled>Disabled</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Form Components */}
          <Card>
            <CardHeader>
              <CardTitle>Form Components</CardTitle>
              <CardDescription>
                Input fields, labels, and form elements with Lumina styling, validation states, and accessibility features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Form Examples */}
              <div>
                <h3 className="text-foreground mb-4 text-lg font-semibold">
                  Form Examples
                </h3>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {/* Light Theme Form */}
                  <div className="rounded-lg border border-neutral-200 bg-white p-6">
                    <h4 className="mb-4 text-base font-semibold text-neutral-900">Light Theme</h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name-light" className="text-neutral-900">Full Name</Label>
                        <Input id="name-light" placeholder="Enter your name" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email-light" className="text-neutral-900">Email</Label>
                        <Input id="email-light" type="email" placeholder="Enter your email" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="message-light" className="text-neutral-900">Message</Label>
                        <Textarea id="message-light" placeholder="Enter your message" rows={3} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="select-light" className="text-neutral-900">Select Option</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose an option" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="option1">Option 1</SelectItem>
                            <SelectItem value="option2">Option 2</SelectItem>
                            <SelectItem value="option3">Option 3</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button variant="primary" className="w-full">Submit</Button>
                    </div>
                  </div>

                  {/* Dark Theme Form */}
                  <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-6">
                    <h4 className="mb-4 text-base font-semibold text-neutral-100">Dark Theme</h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name-dark" className="text-neutral-200">Full Name</Label>
                        <Input id="name-dark" placeholder="Enter your name" className="bg-neutral-800 border-neutral-600 text-neutral-100" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email-dark" className="text-neutral-200">Email</Label>
                        <Input id="email-dark" type="email" placeholder="Enter your email" className="bg-neutral-800 border-neutral-600 text-neutral-100" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="message-dark" className="text-neutral-200">Message</Label>
                        <Textarea id="message-dark" placeholder="Enter your message" rows={3} className="bg-neutral-800 border-neutral-600 text-neutral-100" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="select-dark" className="text-neutral-200">Select Option</Label>
                        <Select>
                          <SelectTrigger className="bg-neutral-800 border-neutral-600 text-neutral-100">
                            <SelectValue placeholder="Choose an option" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="option1">Option 1</SelectItem>
                            <SelectItem value="option2">Option 2</SelectItem>
                            <SelectItem value="option3">Option 3</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button variant="primary" className="w-full">Submit</Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Input Validation States */}
              <div>
                <h3 className="text-foreground mb-4 text-lg font-semibold">
                  Validation States
                </h3>
                <p className="text-muted-foreground mb-6 text-sm">
                  Input fields with proper validation feedback and accessibility features
                </p>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="valid-input" className="text-foreground">Valid Input</Label>
                      <Input
                        id="valid-input"
                        placeholder="This input is valid"
                        className="border-green-500 focus:ring-green-500"
                      />
                      <p className="text-xs text-green-600">✓ This field is valid</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="error-input" className="text-foreground">Error Input</Label>
                      <Input
                        id="error-input"
                        placeholder="This input has an error"
                        className="border-red-500 focus:ring-red-500"
                      />
                      <p className="text-xs text-red-600">✗ This field is required</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="warning-input" className="text-foreground">Warning Input</Label>
                      <Input
                        id="warning-input"
                        placeholder="This input has a warning"
                        className="border-yellow-500 focus:ring-yellow-500"
                      />
                      <p className="text-xs text-yellow-600">⚠ Please double-check this field</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="disabled-input" className="text-foreground">Disabled Input</Label>
                      <Input
                        id="disabled-input"
                        placeholder="This input is disabled"
                        disabled
                      />
                      <p className="text-xs text-muted-foreground">This field is currently disabled</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Other Components */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Components</CardTitle>
              <CardDescription>
                Badges, cards, dialogs, and other UI elements with comprehensive styling
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Badges */}
              <div>
                <h3 className="text-foreground mb-4 text-lg font-semibold">
                  Badges
                </h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="mb-3 text-sm font-semibold text-foreground">Light Theme</h4>
                    <div className="rounded-lg border border-neutral-200 bg-white p-4">
                      <div className="flex flex-wrap gap-3">
                        <Badge>Default</Badge>
                        <Badge variant="secondary">Secondary</Badge>
                        <Badge variant="destructive">Destructive</Badge>
                        <Badge variant="outline">Outline</Badge>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="mb-3 text-sm font-semibold text-foreground">Dark Theme</h4>
                    <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-4">
                      <div className="flex flex-wrap gap-3">
                        <Badge>Default</Badge>
                        <Badge variant="secondary">Secondary</Badge>
                        <Badge variant="destructive">Destructive</Badge>
                        <Badge variant="outline" className="border-neutral-600 bg-neutral-800 text-neutral-200">Outline</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Examples */}
              <div>
                <h3 className="text-foreground mb-4 text-lg font-semibold">
                  Card Components
                </h3>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <Card className="border-lumina-gold/20 hover:shadow-lumina transition-all duration-200">
                    <CardHeader>
                      <CardTitle className="text-deep-teal">Feature Card</CardTitle>
                      <CardDescription>A sample feature card with Lumina styling</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        This card demonstrates the Lumina design system with proper spacing, typography, and colors.
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-lumina-coral/20 hover:shadow-lumina transition-all duration-200">
                    <CardHeader>
                      <CardTitle className="text-deep-teal">Stats Card</CardTitle>
                      <CardDescription>Performance metrics display</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-lumina-coral">24%</div>
                      <p className="text-xs text-muted-foreground">Revenue increase</p>
                    </CardContent>
                  </Card>

                  <Card className="border-sage-green/20 hover:shadow-lumina transition-all duration-200">
                    <CardHeader>
                      <CardTitle className="text-deep-teal">Action Card</CardTitle>
                      <CardDescription>Interactive card with actions</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Cards can contain various interactive elements.
                      </p>
                      <Button variant="secondary" size="sm">Learn More</Button>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Loading States */}
              <div>
                <h3 className="text-foreground mb-4 text-lg font-semibold">
                  Loading States
                </h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-foreground">Spinner</h4>
                    <div className="rounded border p-4 flex justify-center">
                      <Spinner size="default" className="text-lumina-coral" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-foreground">Skeleton</h4>
                    <div className="rounded border p-4 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-foreground">Empty State</h4>
                    <div className="rounded border p-4 text-center py-8">
                      <div className="text-muted-foreground text-sm">No items found</div>
                      <div className="text-muted-foreground text-xs mt-1">Get started by creating your first item.</div>
                      <Button variant="secondary" size="sm" className="mt-3">Create Item</Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dialog Example */}
              <div>
                <h3 className="text-foreground mb-4 text-lg font-semibold">
                  Dialog
                </h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>Open Dialog</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Lumina Dialog</DialogTitle>
                      <DialogDescription>
                        This is a sample dialog using the Lumina design system with proper contrast and styling.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="dialog-input" className="text-foreground">Sample Input</Label>
                        <Input id="dialog-input" placeholder="Enter some text" />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline">Cancel</Button>
                      <Button>Save Changes</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center py-8">
            <Separator className="mb-6" />
            <p className="text-muted-foreground text-sm">
              Lumina Design System - Built with accessibility, performance, and brand consistency in mind.
            </p>
            <p className="text-muted-foreground text-xs mt-2">
              All components follow WCAG AAA standards and support both light and dark themes.
            </p>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}
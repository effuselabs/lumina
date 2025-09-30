import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Grid, GridItem } from '@/components/ui/grid';
import { StatCard } from '@/components/ui/stat-card';
import {
  ArrowRight,
  Calendar,
  Check,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

export default async function HomePage() {
  // TEMPORARILY DISABLED FOR TESTING
  // If user is authenticated, check if they have a business
  // if (session?.user?.id) {
  //   console.log('Root page - checking businesses for user:', session.user.id); // Debug log

  //   const userBusinesses = await prisma.businessUser.findMany({
  //     where: {
  //       userId: session.user.id,
  //     },
  //     include: {
  //       business: {
  //         select: {
  //           id: true,
  //           name: true,
  //         },
  //       },
  //     },
  //   });

  //   console.log('Root page - found businesses:', userBusinesses.length); // Debug log

  //   if (userBusinesses.length > 0) {
  //     // User has a business, redirect to dashboard
  //     console.log('Root page - redirecting to dashboard'); // Debug log
  //     redirect('/dashboard');
  //   } else {
  //     // User doesn't have a business, redirect to onboarding
  //     console.log('Root page - redirecting to onboarding'); // Debug log
  //     redirect('/onboarding');
  //   }
  // }
  return (
    <div className="from-lumina-gold/5 to-lumina-coral/5 theme-transitioning min-h-screen bg-gradient-to-br via-cream">
      {/* Enhanced Navigation Header */}
      <header className="bg-surface/95 border-border/50 theme-transitioning relative z-10 border-b backdrop-blur-md">
        <div className="container mx-auto px-4 lg:px-6">
          <nav
            className="flex items-center justify-between py-4 lg:py-6"
            aria-label="Main navigation"
          >
            {/* Enhanced Logo */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lumina-radiant shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight text-deep-teal">
                  Lumina
                </span>
                <span className="text-foreground-muted text-xs font-medium">
                  Salon Management
                </span>
              </div>
            </div>

            {/* Enhanced Navigation */}
            <div className="hidden items-center gap-2 md:flex">
              <Button asChild variant="ghost" size="sm" className="font-medium">
                <Link href="/features">Features</Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="font-medium">
                <Link href="/pricing">Pricing</Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="font-medium">
                <Link href="/design-system">Design System</Link>
              </Button>
              <div className="mx-2 h-6 w-px bg-border" aria-hidden="true" />
              <Button
                asChild
                variant="outline"
                size="sm"
                className="font-medium"
              >
                <Link href="/auth/signin">Sign In</Link>
              </Button>
              <Button
                asChild
                variant="primary"
                size="sm"
                className="font-semibold shadow-md hover:shadow-lg"
              >
                <Link href="/auth/signup">Get Started Free</Link>
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button asChild variant="primary" size="sm">
                <Link href="/auth/signup">Get Started</Link>
              </Button>
            </div>
          </nav>
        </div>
      </header>
      {/* Enhanced Hero Section */}
      <section
        className="relative overflow-hidden py-20 lg:py-32"
        aria-labelledby="hero-title"
      >
        {/* Enhanced Background */}
        <div
          className="from-lumina-gold/8 to-lumina-coral/8 absolute inset-0 bg-gradient-to-br via-transparent"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,210,90,0.1),transparent_50%)] bg-[radial-gradient(circle_at_70%_80%,rgba(255,122,90,0.1),transparent_50%)]"
          aria-hidden="true"
        />

        <div className="container relative mx-auto px-4 lg:px-6">
          <div className="mx-auto max-w-5xl text-center">
            {/* Enhanced Brand Badge */}
            <Badge
              variant="secondary"
              className="border-lumina-gold/30 bg-lumina-gold/15 animate-lumina-fade-in mb-8 px-4 py-2 text-sm font-semibold text-deep-teal shadow-sm"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              AI-Powered Business Management Platform
            </Badge>

            {/* Enhanced Hero Title */}
            <div
              className="animate-lumina-fade-in mb-8"
              style={{ animationDelay: '100ms' }}
            >
              <h1
                id="hero-title"
                className="mb-4 text-5xl font-bold tracking-tight text-deep-teal lg:text-7xl"
              >
                Lumina
              </h1>
              <p className="bg-gradient-to-r from-lumina-coral to-lumina-gold bg-clip-text text-2xl font-semibold tracking-tight text-transparent lg:text-4xl">
                Intelligent Software for Salon Success
              </p>
            </div>

            {/* Enhanced Hero Description */}
            <p
              className="text-foreground-muted animate-lumina-fade-in mx-auto mb-12 max-w-3xl text-lg leading-relaxed lg:text-xl"
              style={{ animationDelay: '200ms' }}
            >
              Transform your salon or barbershop with our AI-powered platform.
              Streamline appointments, delight clients, and boost revenue while
              you focus on what you love most—creating beautiful experiences.
            </p>

            {/* Enhanced CTA Section */}
            <div
              className="animate-lumina-fade-in mb-16"
              style={{ animationDelay: '300ms' }}
            >
              <div
                className="mb-8 flex flex-col items-center justify-center gap-4 sm:flex-row"
                role="group"
                aria-label="Get started actions"
              >
                <Button
                  asChild
                  variant="primary"
                  size="xl"
                  className="min-w-[14rem] shadow-lg hover:shadow-xl"
                >
                  <Link
                    href="/auth/signup"
                    aria-describedby="signup-description"
                  >
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="xl"
                  className="hover:bg-surface/50 min-w-[14rem] border-2"
                >
                  <Link href="/book/demo" aria-describedby="demo-description">
                    Watch Demo
                    <Zap className="ml-2 h-5 w-5" aria-hidden="true" />
                  </Link>
                </Button>
              </div>

              {/* Enhanced Social Proof */}
              <div className="text-foreground-muted flex flex-wrap items-center justify-center gap-6 text-sm lg:gap-8">
                <div className="flex items-center gap-2">
                  <div className="bg-success/20 flex h-5 w-5 items-center justify-center rounded-full">
                    <Check className="h-3 w-3 text-success" />
                  </div>
                  <span className="font-medium">14-day free trial</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-success/20 flex h-5 w-5 items-center justify-center rounded-full">
                    <Shield className="h-3 w-3 text-success" />
                  </div>
                  <span className="font-medium">No setup fees</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-success/20 flex h-5 w-5 items-center justify-center rounded-full">
                    <Star className="h-3 w-3 text-success" />
                  </div>
                  <span className="font-medium">Cancel anytime</span>
                </div>
              </div>
            </div>

            {/* Hidden descriptions for screen readers */}
            <div className="sr-only">
              <p id="signup-description">
                Start your 14-day free trial with full access to all features
              </p>
              <p id="demo-description">
                Watch a 3-minute demo showcasing Lumina&apos;s key features
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Features Section */}
      <section
        className="bg-surface/50 theme-transitioning py-20 lg:py-32"
        aria-labelledby="features-title"
      >
        <div className="container mx-auto px-4 lg:px-6">
          <div className="mb-20 text-center">
            <Badge
              variant="secondary"
              className="border-lumina-coral/20 bg-lumina-coral/10 mb-6 text-deep-teal"
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              Powerful Features
            </Badge>
            <h2
              id="features-title"
              className="mb-6 text-4xl font-bold tracking-tight text-deep-teal lg:text-5xl"
            >
              Everything you need to grow your business
            </h2>
            <p className="text-foreground-muted mx-auto max-w-3xl text-lg leading-relaxed lg:text-xl">
              Comprehensive tools designed specifically for salon and barbershop
              owners who want to focus on their craft, not paperwork.
            </p>
          </div>

          {/* Enhanced Feature Cards Grid */}
          <Grid variant="cards" gap="lg" className="mb-20">
            <GridItem>
              <Card
                className="border-lumina-gold/20 from-surface to-surface/50 hover:border-lumina-gold/40 group h-full border-2 bg-gradient-to-br transition-all duration-300 hover:-translate-y-1 hover:shadow-lumina"
                role="article"
                aria-labelledby="booking-title"
              >
                <CardHeader className="pb-4">
                  <div
                    className="from-lumina-gold/20 to-lumina-coral/20 group-hover:from-lumina-gold/30 group-hover:to-lumina-coral/30 mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br transition-all duration-300"
                    aria-hidden="true"
                  >
                    <Calendar className="h-7 w-7 text-lumina-coral" />
                  </div>
                  <CardTitle
                    id="booking-title"
                    className="mb-3 text-xl font-bold text-deep-teal"
                  >
                    Smart Booking System
                  </CardTitle>
                  <CardDescription className="text-foreground-muted text-base leading-relaxed">
                    Real-time availability, automated confirmations, and
                    seamless client experience with intelligent scheduling that
                    works 24/7.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-center gap-3">
                      <div className="bg-success/20 flex h-5 w-5 items-center justify-center rounded-full">
                        <Check className="h-3 w-3 text-success" />
                      </div>
                      <span className="text-foreground-muted font-medium">
                        Online booking widget
                      </span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="bg-success/20 flex h-5 w-5 items-center justify-center rounded-full">
                        <Check className="h-3 w-3 text-success" />
                      </div>
                      <span className="text-foreground-muted font-medium">
                        Automated reminders
                      </span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="bg-success/20 flex h-5 w-5 items-center justify-center rounded-full">
                        <Check className="h-3 w-3 text-success" />
                      </div>
                      <span className="text-foreground-muted font-medium">
                        Calendar synchronization
                      </span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </GridItem>

            <GridItem>
              <Card
                className="border-lumina-gold/20 from-surface to-surface/50 hover:border-lumina-gold/40 group h-full border-2 bg-gradient-to-br transition-all duration-300 hover:-translate-y-1 hover:shadow-lumina"
                role="article"
                aria-labelledby="client-title"
              >
                <CardHeader className="pb-4">
                  <div
                    className="from-lumina-gold/20 to-lumina-coral/20 group-hover:from-lumina-gold/30 group-hover:to-lumina-coral/30 mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br transition-all duration-300"
                    aria-hidden="true"
                  >
                    <Users className="h-7 w-7 text-lumina-coral" />
                  </div>
                  <CardTitle
                    id="client-title"
                    className="mb-3 text-xl font-bold text-deep-teal"
                  >
                    Client Management
                  </CardTitle>
                  <CardDescription className="text-foreground-muted text-base leading-relaxed">
                    Comprehensive CRM with history, preferences, and automated
                    communications to build lasting relationships with every
                    client.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-center gap-3">
                      <div className="bg-success/20 flex h-5 w-5 items-center justify-center rounded-full">
                        <Check className="h-3 w-3 text-success" />
                      </div>
                      <span className="text-foreground-muted font-medium">
                        Client profiles & history
                      </span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="bg-success/20 flex h-5 w-5 items-center justify-center rounded-full">
                        <Check className="h-3 w-3 text-success" />
                      </div>
                      <span className="text-foreground-muted font-medium">
                        Preference tracking
                      </span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="bg-success/20 flex h-5 w-5 items-center justify-center rounded-full">
                        <Check className="h-3 w-3 text-success" />
                      </div>
                      <span className="text-foreground-muted font-medium">
                        Automated follow-ups
                      </span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </GridItem>

            <GridItem>
              <Card
                className="border-lumina-gold/20 from-surface to-surface/50 hover:border-lumina-gold/40 group h-full border-2 bg-gradient-to-br transition-all duration-300 hover:-translate-y-1 hover:shadow-lumina"
                role="article"
                aria-labelledby="insights-title"
              >
                <CardHeader className="pb-4">
                  <div
                    className="from-lumina-gold/20 to-lumina-coral/20 group-hover:from-lumina-gold/30 group-hover:to-lumina-coral/30 mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br transition-all duration-300"
                    aria-hidden="true"
                  >
                    <TrendingUp className="h-7 w-7 text-lumina-coral" />
                  </div>
                  <CardTitle
                    id="insights-title"
                    className="mb-3 text-xl font-bold text-deep-teal"
                  >
                    AI-Powered Insights
                  </CardTitle>
                  <CardDescription className="text-foreground-muted text-base leading-relaxed">
                    Intelligent analytics that reveal opportunities and optimize
                    your revenue with actionable recommendations powered by AI.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-center gap-3">
                      <div className="bg-success/20 flex h-5 w-5 items-center justify-center rounded-full">
                        <Check className="h-3 w-3 text-success" />
                      </div>
                      <span className="text-foreground-muted font-medium">
                        Revenue optimization
                      </span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="bg-success/20 flex h-5 w-5 items-center justify-center rounded-full">
                        <Check className="h-3 w-3 text-success" />
                      </div>
                      <span className="text-foreground-muted font-medium">
                        Performance analytics
                      </span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="bg-success/20 flex h-5 w-5 items-center justify-center rounded-full">
                        <Check className="h-3 w-3 text-success" />
                      </div>
                      <span className="text-foreground-muted font-medium">
                        Predictive insights
                      </span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </GridItem>
          </Grid>

          {/* Enhanced Stats Section */}
          <div className="mb-12 text-center">
            <Badge
              variant="secondary"
              className="border-deep-teal/20 bg-deep-teal/10 mb-6 text-deep-teal"
            >
              <Star className="mr-2 h-4 w-4" />
              Proven Results
            </Badge>
            <h3
              id="stats-title"
              className="mb-4 text-3xl font-bold tracking-tight text-deep-teal lg:text-4xl"
            >
              See the impact in action
            </h3>
            <p className="text-foreground-muted mx-auto max-w-2xl text-lg">
              Real results from salon and barbershop owners who transformed
              their business with Lumina
            </p>
          </div>

          <Grid variant="dashboard-stats" gap="lg">
            <GridItem>
              <StatCard
                title="Average Revenue Increase"
                value="24%"
                change={{
                  value: 12.5,
                  type: 'increase',
                  period: 'vs manual management',
                }}
                icon="trending-up"
                size="default"
                className="hover-lumina-lift-subtle border-success/20 from-surface to-success/5 border-2 bg-gradient-to-br"
              />
            </GridItem>
            <GridItem>
              <StatCard
                title="Time Saved Weekly"
                value="8.5hrs"
                change={{
                  value: 15,
                  type: 'increase',
                  period: 'on administrative tasks',
                }}
                icon="calendar"
                size="default"
                className="hover-lumina-lift-subtle border-info/20 from-surface to-info/5 border-2 bg-gradient-to-br"
              />
            </GridItem>
            <GridItem>
              <StatCard
                title="Client Retention Rate"
                value="89%"
                change={{
                  value: 23,
                  type: 'increase',
                  period: 'with automated follow-ups',
                }}
                icon="users"
                size="default"
                className="hover-lumina-lift-subtle border-warning/20 from-surface to-warning/5 border-2 bg-gradient-to-br"
              />
            </GridItem>
          </Grid>
        </div>
      </section>

      {/* Enhanced Development Status */}
      <section className="from-lumina-gold/10 via-lumina-coral/5 to-lumina-gold/10 theme-transitioning bg-gradient-to-r py-20">
        <div className="container mx-auto px-4 lg:px-6">
          <Card className="border-lumina-gold/30 bg-surface/95 mx-auto max-w-3xl border-2 text-center shadow-xl backdrop-blur-md transition-all duration-300 hover:shadow-2xl">
            <CardHeader className="pb-6">
              <div className="mx-auto mb-6 flex h-20 w-20 animate-lumina-pulse-subtle items-center justify-center rounded-2xl bg-lumina-radiant shadow-lg">
                <Sparkles className="h-10 w-10 text-white" />
              </div>
              <Badge
                variant="secondary"
                className="border-lumina-coral/30 bg-lumina-coral/15 mx-auto mb-4 text-deep-teal"
              >
                <Zap className="mr-2 h-4 w-4" />
                Early Access Available
              </Badge>
              <CardTitle className="mb-4 text-2xl font-bold text-deep-teal lg:text-3xl">
                🚧 Building the Future of Salon Management
              </CardTitle>
              <CardDescription className="text-foreground-muted text-lg leading-relaxed lg:text-xl">
                Lumina is currently in active development. Join our early access
                program to help shape the platform and get exclusive access to
                new features as they launch.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="mb-6 flex flex-col justify-center gap-4 sm:flex-row">
                <Button
                  asChild
                  variant="primary"
                  size="lg"
                  className="shadow-lg hover:shadow-xl"
                >
                  <Link href="/auth/signup">Join Early Access</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-2"
                >
                  <Link href="/design-system">View Design System</Link>
                </Button>
              </div>

              {/* Progress Indicators */}
              <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
                <div className="bg-success/10 flex flex-col items-center gap-2 rounded-lg p-3">
                  <div className="bg-success/20 flex h-8 w-8 items-center justify-center rounded-full">
                    <Check className="h-4 w-4 text-success" />
                  </div>
                  <span className="font-medium text-success">
                    Core Platform
                  </span>
                  <span className="text-foreground-muted text-xs">Ready</span>
                </div>
                <div className="bg-warning/10 flex flex-col items-center gap-2 rounded-lg p-3">
                  <div className="bg-warning/20 flex h-8 w-8 items-center justify-center rounded-full">
                    <Zap className="h-4 w-4 text-warning" />
                  </div>
                  <span className="font-medium text-warning">
                    Booking System
                  </span>
                  <span className="text-foreground-muted text-xs">
                    In Progress
                  </span>
                </div>
                <div className="bg-info/10 flex flex-col items-center gap-2 rounded-lg p-3">
                  <div className="bg-info/20 flex h-8 w-8 items-center justify-center rounded-full">
                    <Star className="h-4 w-4 text-info" />
                  </div>
                  <span className="font-medium text-info">AI Features</span>
                  <span className="text-foreground-muted text-xs">
                    Coming Soon
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="theme-transitioning bg-deep-teal py-16 text-white">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4 lg:gap-12">
            {/* Enhanced Brand Section */}
            <div className="lg:col-span-2">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lumina-radiant shadow-lg">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <span className="text-2xl font-bold">Lumina</span>
                  <div className="text-sm font-medium text-white/70">
                    Salon Management Platform
                  </div>
                </div>
              </div>
              <p className="mb-6 max-w-md text-lg leading-relaxed text-white/80">
                AI-powered business management platform designed specifically
                for salons and barbershops. Focus on your craft, not paperwork.
              </p>

              {/* CTA in Footer */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  variant="secondary"
                  size="sm"
                  className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                >
                  <Link href="/auth/signup">Start Free Trial</Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="text-white/80 hover:bg-white/10 hover:text-white"
                >
                  <Link href="/contact">Contact Sales</Link>
                </Button>
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="mb-6 text-lg font-semibold">Product</h4>
              <ul className="space-y-3 text-white/80">
                <li>
                  <Link
                    href="/features"
                    className="inline-block transition-colors hover:translate-x-1 hover:text-white"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="/pricing"
                    className="inline-block transition-colors hover:translate-x-1 hover:text-white"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href="/integrations"
                    className="inline-block transition-colors hover:translate-x-1 hover:text-white"
                  >
                    Integrations
                  </Link>
                </li>
                <li>
                  <Link
                    href="/api"
                    className="inline-block transition-colors hover:translate-x-1 hover:text-white"
                  >
                    API
                  </Link>
                </li>
                <li>
                  <Link
                    href="/design-system"
                    className="inline-block transition-colors hover:translate-x-1 hover:text-white"
                  >
                    Design System
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h4 className="mb-6 text-lg font-semibold">Company</h4>
              <ul className="space-y-3 text-white/80">
                <li>
                  <Link
                    href="/about"
                    className="inline-block transition-colors hover:translate-x-1 hover:text-white"
                  >
                    About
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="inline-block transition-colors hover:translate-x-1 hover:text-white"
                  >
                    Contact
                  </Link>
                </li>
                <li>
                  <Link
                    href="/blog"
                    className="inline-block transition-colors hover:translate-x-1 hover:text-white"
                  >
                    Blog
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="inline-block transition-colors hover:translate-x-1 hover:text-white"
                  >
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="inline-block transition-colors hover:translate-x-1 hover:text-white"
                  >
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Enhanced Footer Bottom */}
          <div className="mt-12 border-t border-white/20 pt-8">
            <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
              <div className="text-center text-white/60 md:text-left">
                <p>&copy; 2024 Lumina. All rights reserved.</p>
                <p className="mt-1 text-sm">
                  Built with passion for salon and barbershop owners.
                </p>
              </div>

              {/* Social Links Placeholder */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-white/60">Follow us:</span>
                <div className="flex gap-2">
                  <div className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20">
                    <span className="text-xs">𝕏</span>
                  </div>
                  <div className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20">
                    <span className="text-xs">in</span>
                  </div>
                  <div className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20">
                    <span className="text-xs">ig</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

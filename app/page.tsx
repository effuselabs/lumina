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
  Sparkles,
  TrendingUp,
  Users,
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
    <div className="min-h-screen bg-gradient-to-br from-lumina-gold/5 via-background to-lumina-coral/5">
      {/* Navigation Header */}
      <header className="relative z-10 bg-surface/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4">
          <nav className="flex items-center justify-between py-4" aria-label="Main navigation">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-lumina-gradient">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-deep-teal">Lumina</span>
            </div>

            <div className="flex items-center gap-4">
              <Button asChild variant="ghost" size="sm">
                <Link href="/design-system">Design System</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/auth/signin">Sign In</Link>
              </Button>
              <Button asChild variant="primary" size="sm">
                <Link href="/auth/signup">Get Started</Link>
              </Button>
            </div>
          </nav>
        </div>
      </header>
      {/* Hero Section */}
      <section
        className="relative overflow-hidden"
        aria-labelledby="hero-title"
      >
        <div
          className="absolute inset-0 bg-gradient-to-br from-lumina-gold/10 to-lumina-coral/10"
          aria-hidden="true"
        />
        <div className="container relative mx-auto px-4 py-20 lg:py-32">
          <div className="mx-auto max-w-4xl text-center">
            {/* Brand Badge */}
            <Badge
              variant="secondary"
              className="mb-6 border-lumina-gold/20 bg-lumina-gold/10 text-deep-teal animate-lumina-fade-in"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              AI-Powered Business Management
            </Badge>

            {/* Hero Title */}
            <h1
              id="hero-title"
              className="animate-lumina-fade-in mb-6 text-6xl font-bold tracking-tight text-deep-teal"
              style={{ animationDelay: '100ms' }}
            >
              Lumina
            </h1>
            <p
              className="mb-8 text-3xl font-semibold tracking-tight text-lumina-coral animate-lumina-fade-in"
              style={{ animationDelay: '200ms' }}
            >
              Intelligent Software for Small Business Growth
            </p>

            {/* Hero Description */}
            <p
              className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-foreground-muted animate-lumina-fade-in"
              style={{ animationDelay: '300ms' }}
            >
              Stop managing your business and start building your passion. Our
              AI-powered platform designed specifically for salons and
              barbershops streamlines booking, client management, and financials
              with intelligent insights.
            </p>

            {/* CTA Buttons */}
            <div
              className="mb-16 flex flex-col items-center justify-center gap-4 sm:flex-row animate-lumina-fade-in"
              style={{ animationDelay: '400ms' }}
              role="group"
              aria-label="Get started actions"
            >
              <Button
                asChild
                variant="primary"
                size="lg"
                className="min-w-[12rem]"
              >
                <Link href="/auth/signup" aria-describedby="signup-description">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="min-w-[12rem]"
              >
                <Link href="/book/demo" aria-describedby="demo-description">
                  Book a Demo
                </Link>
              </Button>
            </div>

            {/* Hidden descriptions for screen readers */}
            <div className="sr-only">
              <p id="signup-description">
                Start your 14-day free trial with no setup fees
              </p>
              <p id="demo-description">
                Schedule a personalized demo of Lumina&apos;s features
              </p>
            </div>

            {/* Social Proof */}
            <div
              className="flex items-center justify-center gap-8 text-sm text-foreground-muted animate-lumina-fade-in"
              style={{ animationDelay: '500ms' }}
            >
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                <span>No setup fees</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-surface py-20" aria-labelledby="features-title">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2
              id="features-title"
              className="mb-4 text-4xl font-bold tracking-tight text-deep-teal"
            >
              Everything you need to grow your business
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-foreground-muted">
              Comprehensive tools designed specifically for salon and barbershop
              owners who want to focus on their craft, not paperwork.
            </p>
          </div>

          {/* Enhanced Grid Layout */}
          <Grid variant="cards" gap="lg" className="mb-16">
            <GridItem>
              <Card
                className="hover-lumina-lift h-full border-lumina-gold/20 transition-all duration-300 hover:border-lumina-gold/40 hover:shadow-lumina"
                role="article"
                aria-labelledby="booking-title"
              >
                <CardHeader>
                  <div
                    className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-lumina-gold/20 to-lumina-coral/20"
                    aria-hidden="true"
                  >
                    <Calendar className="h-6 w-6 text-lumina-coral" />
                  </div>
                  <CardTitle id="booking-title" className="text-deep-teal">
                    Smart Booking System
                  </CardTitle>
                  <CardDescription className="text-foreground-muted">
                    Real-time availability, automated confirmations, and
                    seamless client experience with intelligent scheduling.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-foreground-muted">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-success" />
                      Online booking widget
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-success" />
                      Automated reminders
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-success" />
                      Calendar synchronization
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </GridItem>

            <GridItem>
              <Card
                className="hover-lumina-lift h-full border-lumina-gold/20 transition-all duration-300 hover:border-lumina-gold/40 hover:shadow-lumina"
                role="article"
                aria-labelledby="client-title"
              >
                <CardHeader>
                  <div
                    className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-lumina-gold/20 to-lumina-coral/20"
                    aria-hidden="true"
                  >
                    <Users className="h-6 w-6 text-lumina-coral" />
                  </div>
                  <CardTitle id="client-title" className="text-deep-teal">
                    Client Management
                  </CardTitle>
                  <CardDescription className="text-foreground-muted">
                    Comprehensive CRM with history, preferences, and automated
                    communications to build lasting relationships.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-foreground-muted">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-success" />
                      Client profiles & history
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-success" />
                      Preference tracking
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-success" />
                      Automated follow-ups
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </GridItem>

            <GridItem>
              <Card
                className="hover-lumina-lift h-full border-lumina-gold/20 transition-all duration-300 hover:border-lumina-gold/40 hover:shadow-lumina"
                role="article"
                aria-labelledby="insights-title"
              >
                <CardHeader>
                  <div
                    className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-lumina-gold/20 to-lumina-coral/20"
                    aria-hidden="true"
                  >
                    <TrendingUp className="h-6 w-6 text-lumina-coral" />
                  </div>
                  <CardTitle id="insights-title" className="text-deep-teal">
                    AI-Powered Insights
                  </CardTitle>
                  <CardDescription className="text-foreground-muted">
                    Intelligent analytics that reveal opportunities and optimize
                    your revenue with actionable recommendations.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-foreground-muted">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-success" />
                      Revenue optimization
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-success" />
                      Performance analytics
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-success" />
                      Predictive insights
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </GridItem>
          </Grid>

          {/* Demo Stats */}
          <div className="mb-8 text-center">
            <h3
              id="stats-title"
              className="mb-8 text-3xl font-semibold tracking-tight text-deep-teal"
            >
              See the impact in action
            </h3>
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
                className="hover-lumina-lift-subtle"
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
                className="hover-lumina-lift-subtle"
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
                className="hover-lumina-lift-subtle"
              />
            </GridItem>
          </Grid>
        </div>
      </section>

      {/* Development Status */}
      <section className="bg-gradient-to-r from-lumina-gold/10 to-lumina-coral/10 py-16">
        <div className="container mx-auto px-4">
          <Card className="mx-auto max-w-2xl border-lumina-gold/30 bg-surface/80 text-center backdrop-blur-sm hover-lumina-lift-subtle">
            <CardHeader>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-lumina-gradient animate-lumina-pulse-subtle">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-deep-teal">
                🚧 Development in Progress
              </CardTitle>
              <CardDescription className="text-lg text-foreground-muted">
                Lumina is currently under active development. This is the
                foundation setup phase where we&apos;re building the core
                platform architecture.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col justify-center gap-4 sm:flex-row">
                <Button
                  asChild
                  variant="primary"
                >
                  <Link href="/auth/signup">Join Early Access</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"

                >
                  <Link href="/design-system">View Design System</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-deep-teal text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-lumina-gradient">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">Lumina</span>
              </div>
              <p className="text-white/80 max-w-md">
                AI-powered business management platform designed specifically for salons and barbershops.
                Focus on your craft, not paperwork.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-white/80">
                <li><Link href="/features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/integrations" className="hover:text-white transition-colors">Integrations</Link></li>
                <li><Link href="/api" className="hover:text-white transition-colors">API</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-white/80">
                <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/20 mt-8 pt-8 text-center text-white/60">
            <p>&copy; 2024 Lumina. All rights reserved. Built with passion for salon and barbershop owners.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

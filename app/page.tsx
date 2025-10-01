import { Badge } from '@/components/ui/badge';
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
    <div className="theme-transitioning min-h-screen page-bg-gradient">
      {/* Enhanced Navigation Header */}
      <header className="nav-enhanced theme-transitioning relative z-10">
        <div className="container mx-auto px-4 lg:px-6">
          <nav
            className="flex items-center justify-between py-4 lg:py-6"
            aria-label="Main navigation"
          >
            {/* Enhanced Logo */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl nav-logo-enhanced">
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
              <Link href="/features" className="nav-link">Features</Link>
              <Link href="/pricing" className="nav-link">Pricing</Link>
              <Link href="/design-system" className="nav-link">Design System</Link>
              <div className="mx-2 h-6 w-px bg-border" aria-hidden="true" />
              <Link
                href="/auth/signin"
                className="btn-nav-ghost inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="btn-nav-primary inline-flex items-center justify-center px-5 py-2 text-sm font-semibold rounded-lg transition-all duration-300"
              >
                Get Started Free
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Link
                href="/auth/signup"
                className="btn-nav-primary inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300"
              >
                Get Started
              </Link>
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
          className="absolute inset-0 hero-bg-gradient"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 hero-radial-bg"
          aria-hidden="true"
        />

        <div className="container relative mx-auto px-4 lg:px-6">
          <div className="mx-auto max-w-5xl text-center">
            {/* Enhanced Brand Badge */}
            <Badge
              variant="secondary"
              className="animate-lumina-fade-in mb-8 px-4 py-2 text-sm font-semibold shadow-sm badge-lumina-gold"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              AI-Powered Business Management Platform
            </Badge>

            {/* Enhanced Hero Title */}
            <div
              className="animate-lumina-fade-in mb-8 animate-delay-100"
            >
              <h1
                id="hero-title"
                className="mb-4 text-5xl font-bold tracking-tight lg:text-7xl text-deep-teal"
              >
                Lumina
              </h1>
              <p className="text-2xl font-semibold tracking-tight lg:text-4xl text-gradient-lumina">
                Intelligent Software for Salon Success
              </p>
            </div>

            {/* Enhanced Hero Description */}
            <p
              className="text-foreground-muted animate-lumina-fade-in mx-auto mb-12 max-w-3xl text-lg leading-relaxed lg:text-xl animate-delay-200"
            >
              Transform your salon or barbershop with our AI-powered platform.
              Streamline appointments, delight clients, and boost revenue while
              you focus on what you love most—creating beautiful experiences.
            </p>

            {/* Enhanced CTA Section */}
            <div
              className="animate-lumina-fade-in mb-16 animate-delay-300"
            >
              <div
                className="mb-8 flex flex-col items-center justify-center gap-4 sm:flex-row"
                role="group"
                aria-label="Get started actions"
              >
                <Link
                  href="/auth/signup"
                  aria-describedby="signup-description"
                  className="btn-primary-gradient min-w-[14rem] inline-flex items-center justify-center px-6 py-3 text-base font-semibold rounded-lg transition-all duration-300"
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                </Link>
                <Link
                  href="/book/demo"
                  aria-describedby="demo-description"
                  className="btn-secondary-outline min-w-[14rem] inline-flex items-center justify-center px-6 py-3 text-base font-semibold rounded-lg transition-all duration-300"
                >
                  Watch Demo
                  <Zap className="ml-2 h-5 w-5" aria-hidden="true" />
                </Link>
              </div>

              {/* Enhanced Social Proof */}
              <div className="text-foreground-muted flex flex-wrap items-center justify-center gap-6 text-sm lg:gap-8">
                <div className="flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full check-success-bg">
                    <Check className="h-3 w-3 text-semantic-success" />
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

      {/* Value Proposition Section */}
      <section className="section-py-md section-bg-soft-peach theme-transitioning">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight lg:text-4xl mb-6 text-deep-teal">
                Stop managing your business. Start building your passion.
              </h2>
              <p className="text-foreground-muted text-lg leading-relaxed mb-8">
                Lumina handles the administrative burden so you can focus on what you love most—creating beautiful experiences for your clients.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success-subtle">
                    <TrendingUp className="h-4 w-4 text-success" />
                  </div>
                  <span className="font-medium">24% average revenue increase</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-info-subtle">
                    <Calendar className="h-4 w-4 text-info" />
                  </div>
                  <span className="font-medium">8.5 hours saved weekly</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-warning-subtle">
                    <Users className="h-4 w-4 text-warning" />
                  </div>
                  <span className="font-medium">89% client retention rate</span>
                </li>
              </ul>
            </div>
            <div className="relative">
              <div className="aspect-video rounded-2xl bg-lumina-section border-2 border-lumina-gold-subtle flex items-center justify-center">
                <div className="text-center">
                  <Sparkles className="h-16 w-16 mx-auto mb-4 text-lumina-coral" />
                  <p className="text-foreground-muted font-medium">Product Preview Coming Soon</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="section-py-lg section-bg-clarity-blue theme-transitioning">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-6 badge-lumina-gold">
              <Zap className="mr-2 h-4 w-4" />
              Simple Process
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight lg:text-4xl mb-6 text-deep-teal">
              Get started in minutes, not months
            </h2>
            <p className="text-foreground-muted mx-auto max-w-2xl text-lg">
              Our streamlined onboarding gets your salon up and running quickly
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-lumina-radiant rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-white font-bold text-xl">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-deep-teal">Sign Up & Setup</h3>
              <p className="text-foreground-muted">
                Create your account and customize your salon profile in under 5 minutes.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-lumina-radiant rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-white font-bold text-xl">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-deep-teal">Import Your Data</h3>
              <p className="text-foreground-muted">
                Easily migrate your existing client data and service information.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-lumina-radiant rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-white font-bold text-xl">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-deep-teal">Start Growing</h3>
              <p className="text-foreground-muted">
                Begin accepting bookings and watch your business thrive with AI insights.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Features Section */}
      <section
        className="section-bg-white section-py-xl theme-transitioning"
        aria-labelledby="features-title"
      >
        <div className="container mx-auto px-4 lg:px-6">
          <div className="mb-20 text-center">
            <Badge
              variant="secondary"
              className="mb-6 badge-lumina-coral"
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              Powerful Features
            </Badge>
            <h2
              id="features-title"
              className="mb-6 text-4xl font-bold tracking-tight lg:text-5xl text-deep-teal"
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
                className="group h-full border-2 transition-all duration-300 hover:-translate-y-1 feature-card"
                role="article"
                aria-labelledby="booking-title"
              >
                <CardHeader className="pb-4">
                  <div
                    className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl transition-all duration-300 feature-icon-bg"
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
                className="group h-full border-2 transition-all duration-300 hover:-translate-y-1 feature-card"
                role="article"
                aria-labelledby="client-title"
              >
                <CardHeader className="pb-4">
                  <div
                    className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl transition-all duration-300 feature-icon-bg"
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
                className="group h-full border-2 transition-all duration-300 hover:-translate-y-1 feature-card"
                role="article"
                aria-labelledby="insights-title"
              >
                <CardHeader className="pb-4">
                  <div
                    className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl transition-all duration-300 feature-icon-bg"
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
        </div>
      </section>

      {/* Social Proof & Stats Section */}
      <section className="section-py-lg section-bg-gradient-gold theme-transitioning">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="mb-16 text-center">
            <Badge variant="secondary" className="mb-6 badge-deep-teal">
              <Star className="mr-2 h-4 w-4" />
              Proven Results
            </Badge>
            <h3 className="mb-6 text-3xl font-bold tracking-tight lg:text-4xl text-deep-teal">
              See the impact in action
            </h3>
            <p className="text-foreground-muted mx-auto max-w-2xl text-lg">
              Real results from salon and barbershop owners who transformed their business with Lumina
            </p>
          </div>

          <Grid variant="dashboard-stats" gap="lg" className="mb-16">
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
                className="hover-lumina-lift-subtle border-2 bg-success-subtle"
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
                className="hover-lumina-lift-subtle border-2 bg-info-subtle"
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
                className="hover-lumina-lift-subtle border-2 bg-warning-subtle"
              />
            </GridItem>
          </Grid>

          {/* Customer Success Quote */}
          <div className="text-center">
            <blockquote className="mx-auto max-w-3xl">
              <p className="text-xl font-medium text-foreground-muted italic mb-6">
                "                &ldquo;Lumina transformed how we run our salon. We&apos;re booking 40% more appointments and our clients love the seamless experience.&rdquo;"
              </p>
              <footer className="flex items-center justify-center gap-4">
                <div className="w-12 h-12 rounded-full bg-lumina-section flex items-center justify-center">
                  <Users className="h-6 w-6 text-lumina-coral" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-deep-teal">Sarah Chen</div>
                  <div className="text-sm text-foreground-muted">Owner, Bloom Beauty Salon</div>
                </div>
              </footer>
            </blockquote>
          </div>
        </div>
      </section>

      {/* Pricing Preview Section */}
      <section className="section-py-lg section-bg-lavender-mist theme-transitioning">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-6 badge-lumina-coral">
              <TrendingUp className="mr-2 h-4 w-4" />
              Simple Pricing
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight lg:text-4xl mb-6 text-deep-teal">
              Simple, transparent pricing
            </h2>
            <p className="text-foreground-muted mx-auto max-w-2xl text-lg">
              Start free during our development phase, scale as you grow
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <Card className="text-center p-8 border-2 border-lumina-gold-subtle bg-surface-translucent shadow-xl">
              <div className="mb-6">
                <div className="w-16 h-16 bg-lumina-radiant rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-2 text-deep-teal">Early Access</h3>
                <p className="text-foreground-muted">Perfect for getting started</p>
              </div>

              <div className="mb-6">
                <div className="text-5xl font-bold mb-2 text-gradient-lumina">Free</div>
                <p className="text-foreground-muted">During development phase</p>
              </div>

              <ul className="space-y-3 mb-8 text-left">
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-sm">Full platform access</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-sm">Priority support</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-sm">Shape the product roadmap</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="text-sm">Grandfathered pricing</span>
                </li>
              </ul>

              <Link
                href="/auth/signup"
                className="w-full btn-primary-gradient inline-flex items-center justify-center py-3 text-base font-semibold rounded-lg transition-all duration-300"
              >
                Join Early Access
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>

              <p className="text-xs text-foreground-muted mt-4">
                No credit card required • Cancel anytime
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Enhanced Development Status */}
      <section className="section-py-lg section-bg-gradient-coral theme-transitioning">
        <div className="container mx-auto px-4 lg:px-6">
          <Card className="mx-auto max-w-3xl border-2 text-center shadow-xl backdrop-blur-md transition-all duration-300 hover:shadow-2xl border-lumina-gold-subtle bg-surface-translucent">
            <CardHeader className="pb-6">
              <div className="mx-auto mb-6 flex h-20 w-20 animate-lumina-pulse-subtle items-center justify-center rounded-2xl shadow-lg bg-lumina-radiant">
                <Sparkles className="h-10 w-10 text-white" />
              </div>
              <Badge
                variant="secondary"
                className="mx-auto mb-4 badge-lumina-coral"
              >
                <Zap className="mr-2 h-4 w-4" />
                Early Access Available
              </Badge>
              <CardTitle className="mb-4 text-2xl font-bold lg:text-3xl text-deep-teal">
                🎯 Be Part of Something Revolutionary
              </CardTitle>
              <CardDescription className="text-foreground-muted text-lg leading-relaxed lg:text-xl">
                Join forward-thinking salon owners who are shaping the future of beauty business management. Get exclusive early access, priority support, and help us build the perfect platform for your needs.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="mb-6 flex flex-col justify-center gap-4 sm:flex-row">
                <Link
                  href="/auth/signup"
                  className="btn-primary-gradient inline-flex items-center justify-center px-6 py-3 text-base font-semibold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Join Early Access
                </Link>
                <Link
                  href="/design-system"
                  className="btn-secondary-outline inline-flex items-center justify-center px-6 py-3 text-base font-semibold rounded-lg transition-all duration-300 border-2"
                >
                  View Design System
                </Link>
              </div>

              {/* Progress Indicators */}
              <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
                <div className="flex flex-col items-center gap-2 rounded-lg p-3 progress-success">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full progress-success-icon">
                    <Check className="h-4 w-4 text-semantic-success" />
                  </div>
                  <span className="font-medium text-semantic-success">
                    Core Platform
                  </span>
                  <span className="text-foreground-muted text-xs">Ready</span>
                </div>
                <div className="flex flex-col items-center gap-2 rounded-lg p-3 progress-warning">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full progress-warning-icon">
                    <Zap className="h-4 w-4 text-semantic-warning" />
                  </div>
                  <span className="font-medium text-semantic-warning">
                    Booking System
                  </span>
                  <span className="text-foreground-muted text-xs">
                    In Progress
                  </span>
                </div>
                <div className="flex flex-col items-center gap-2 rounded-lg p-3 progress-info">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full progress-info-icon">
                    <Star className="h-4 w-4 text-semantic-info" />
                  </div>
                  <span className="font-medium text-semantic-info">AI Features</span>
                  <span className="text-foreground-muted text-xs">
                    Coming Soon
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="section-py-lg section-bg-sage-green theme-transitioning">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-6 badge-lumina-gold">
              <Shield className="mr-2 h-4 w-4" />
              Frequently Asked
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight lg:text-4xl mb-6 text-deep-teal">
              Questions & Answers
            </h2>
            <p className="text-foreground-muted mx-auto max-w-2xl text-lg">
              Everything you need to know about Lumina and our early access program
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-3 text-deep-teal">
                Is Lumina really free during early access?
              </h3>
              <p className="text-foreground-muted">
                Yes! Early access is completely free with no hidden costs. You&apos;ll get full platform access and help shape our development roadmap. Early access users will also receive grandfathered pricing when we launch.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-3 text-deep-teal">
                How do I migrate my existing client data?
              </h3>
              <p className="text-foreground-muted">
                Our onboarding team will help you import your existing client data, appointment history, and service information. We support imports from most major salon management systems and spreadsheets.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-3 text-deep-teal">
                What happens when Lumina officially launches?
              </h3>
              <p className="text-foreground-muted">
                Early access users will automatically transition to our launch version with special grandfathered pricing. You&apos;ll keep all your data and settings, plus get priority access to new features.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-3 text-deep-teal">
                Do you offer training and support?
              </h3>
              <p className="text-foreground-muted">
                Absolutely! Early access users get priority support, personalized onboarding, and direct access to our development team. We&apos;re here to ensure your success every step of the way.
              </p>
            </Card>
          </div>

          <div className="text-center mt-12">
            <p className="text-foreground-muted mb-6">Still have questions?</p>
            <Link
              href="/contact"
              className="btn-contact-prominent inline-flex items-center justify-center px-6 py-3 text-base font-semibold rounded-lg transition-all duration-300"
            >
              Contact Our Team
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="theme-transitioning bg-deep-teal py-16 text-white">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 lg:gap-12">
            {/* Enhanced Brand Section */}
            <div className="lg:col-span-2">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lumina-radiant shadow-lg">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <span className="text-2xl font-bold">Lumina</span>
                  <div className="text-sm font-medium footer-text-secondary">
                    Salon Management Platform
                  </div>
                </div>
              </div>
              <p className="mb-6 max-w-md text-lg leading-relaxed footer-text-muted">
                AI-powered business management platform designed specifically
                for salons and barbershops. Focus on your craft, not paperwork.
              </p>

              {/* CTA in Footer */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/auth/signup"
                  className="btn-white-elevated inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300"
                >
                  Start Free Trial
                </Link>
                <Link
                  href="/contact"
                  className="btn-footer-ghost inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300"
                >
                  Contact Sales
                </Link>
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="mb-6 text-lg font-semibold">Product</h4>
              <ul className="space-y-3 footer-text-muted">
                <li>
                  <Link
                    href="/features"
                    className="footer-link"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="/pricing"
                    className="footer-link"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href="/integrations"
                    className="footer-link"
                  >
                    Integrations
                  </Link>
                </li>
                <li>
                  <Link
                    href="/api"
                    className="footer-link"
                  >
                    API
                  </Link>
                </li>
                <li>
                  <Link
                    href="/design-system"
                    className="footer-link"
                  >
                    Design System
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Enhanced Footer Bottom */}
          <div className="mt-12 border-t footer-border pt-8">
            <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
              <div className="text-center footer-text-subtle md:text-left">
                <p>&copy; 2024 Lumina. All rights reserved.</p>
                <p className="mt-1 text-sm">
                  Created by <Link href="https://effuselabs.com" target="_blank" rel="noopener noreferrer" className="footer-link font-medium">Effuse Labs</Link>
                </p>
              </div>

              {/* Social Links Placeholder */}
              <div className="flex items-center gap-4">
                <span className="text-sm footer-text-subtle">Follow us:</span>
                <div className="flex gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full btn-social">
                    <span className="text-xs">𝕏</span>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full btn-social">
                    <span className="text-xs">in</span>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full btn-social">
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

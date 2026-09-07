'use client';

import { AnimatedCounter } from '@/components/ui/animated-counter';
import { HeroBackground } from '@/components/ui/hero-background';
import { TestimonialCard } from '@/components/ui/testimonial-card';
import { DollarSign, TrendingUp, Users } from 'lucide-react';

/**
 * Demo showcasing the new specialized components:
 * - HeroBackground: Animated background components
 * - TestimonialCard: Social proof components
 * - AnimatedCounter: Statistics with count-up animations
 */
export default function SpecializedComponentsDemo() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section with Animated Background */}
      <section className="relative flex min-h-[60vh] items-center justify-center overflow-hidden">
        <HeroBackground
          variant="gradient-mesh"
          animation={true}
          intensity="subtle"
          className="absolute inset-0"
        />

        <div className="relative z-10 space-y-6 px-4 text-center">
          <h1 className="text-color-foreground text-4xl font-bold md:text-6xl">
            Premium Components
          </h1>
          <p className="text-color-foreground-secondary mx-auto max-w-2xl text-xl">
            Showcase of specialized components with animations and premium
            effects
          </p>
        </div>
      </section>

      {/* Animated Counters Section */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-color-foreground mb-12 text-center text-3xl font-bold">
            Animated Statistics
          </h2>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <AnimatedCounter
              value={125000}
              format="currency"
              duration={2500}
              icon={<DollarSign />}
              iconPosition="top"
              label="Revenue Generated"
              labelPosition="bottom"
              variant="success"
              size="lg"
              triggerOnScroll={true}
              showProgress={true}
            />

            <AnimatedCounter
              value={98.5}
              format="percentage"
              duration={2000}
              icon={<TrendingUp />}
              iconPosition="top"
              label="Customer Satisfaction"
              labelPosition="bottom"
              variant="primary"
              size="lg"
              triggerOnScroll={true}
              delay={200}
            />

            <AnimatedCounter
              value={2500}
              format="integer"
              suffix="+"
              duration={3000}
              icon={<Users />}
              iconPosition="top"
              label="Happy Clients"
              labelPosition="bottom"
              variant="info"
              size="lg"
              triggerOnScroll={true}
              delay={400}
            />
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="bg-gray-50 px-4 py-16 dark:bg-gray-900">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-color-foreground mb-12 text-center text-3xl font-bold">
            What Our Clients Say
          </h2>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            <TestimonialCard
              quote="Lumina has completely transformed how we manage our salon. The booking system is intuitive and our clients absolutely love the seamless experience."
              author="Sarah Martinez"
              role="Owner"
              company="Bella Salon"
              rating={5}
              variant="floating"
              hover="lift"
              animated={true}
            />

            <TestimonialCard
              quote="The analytics and insights help us make better business decisions every day. Our revenue is up 30% since we started using Lumina."
              author="Michael Johnson"
              role="Manager"
              company="Urban Cuts"
              rating={5}
              variant="gradient-border"
              hover="glow"
              animated={true}
            />

            <TestimonialCard
              quote="Customer satisfaction has never been higher. The automated reminders and easy rescheduling features are game-changers for our business."
              author="Emily Chen"
              role="Stylist"
              company="Modern Hair Studio"
              rating={5}
              variant="glass"
              hover="scale"
              animated={true}
              size="compact"
            />
          </div>
        </div>
      </section>

      {/* Background Variants Showcase */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-color-foreground mb-12 text-center text-3xl font-bold">
            Hero Background Variants
          </h2>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-color-foreground text-xl font-semibold">
                Particle Field
              </h3>
              <div className="relative h-48 overflow-hidden rounded-lg border">
                <HeroBackground
                  variant="particle-field"
                  animation={true}
                  intensity="medium"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-color-foreground rounded bg-white/80 px-4 py-2 text-lg font-medium dark:bg-black/80">
                    Particle Field
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-color-foreground text-xl font-semibold">
                Geometric Pattern
              </h3>
              <div className="relative h-48 overflow-hidden rounded-lg border">
                <HeroBackground
                  variant="geometric-pattern"
                  animation={true}
                  intensity="medium"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-color-foreground rounded bg-white/80 px-4 py-2 text-lg font-medium dark:bg-black/80">
                    Geometric Pattern
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

'use client';

import { cn } from '@/lib/utils';
import * as React from 'react';

export interface HeroBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Background variant type */
    variant?: 'gradient-mesh' | 'particle-field' | 'geometric-pattern' | 'minimal';
    /** Enable subtle animations */
    animation?: boolean;
    /** Animation intensity level */
    intensity?: 'subtle' | 'medium' | 'strong';
    /** Custom colors for the background (uses Lumina brand colors by default) */
    colors?: string[];
    /** Whether to respect reduced motion preferences */
    respectMotionPreference?: boolean;
}

const HeroBackground = React.forwardRef<HTMLDivElement, HeroBackgroundProps>(
    (
        {
            className,
            variant = 'gradient-mesh',
            animation = true,
            intensity = 'subtle',
            colors,
            respectMotionPreference = true,
            children,
            ...props
        },
        ref
    ) => {
        const [shouldAnimate, setShouldAnimate] = React.useState(animation);

        // Respect user's motion preferences
        React.useEffect(() => {
            if (respectMotionPreference && typeof window !== 'undefined') {
                const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
                setShouldAnimate(animation && !mediaQuery.matches);

                const handleChange = (e: MediaQueryListEvent) => {
                    setShouldAnimate(animation && !e.matches);
                };

                mediaQuery.addEventListener('change', handleChange);
                return () => mediaQuery.removeEventListener('change', handleChange);
            }

            // Return undefined for other code paths
            return undefined;
        }, [animation, respectMotionPreference]);

        // Generate CSS custom properties for colors if provided
        const customColorStyles = React.useMemo(() => {
            if (!colors || colors.length === 0) return {};

            const colorVars: Record<string, string> = {};
            colors.forEach((color, index) => {
                colorVars[`--hero-bg-color-${index + 1}`] = color;
            });

            return colorVars;
        }, [colors]);

        return (
            <div
                ref={ref}
                className={cn(
                    // Base styles
                    'absolute inset-0 overflow-hidden pointer-events-none',
                    'hero-background',
                    // Variant styles
                    variant === 'gradient-mesh' && 'hero-bg-gradient-mesh',
                    variant === 'particle-field' && 'hero-bg-particle-field',
                    variant === 'geometric-pattern' && 'hero-bg-geometric-pattern',
                    variant === 'minimal' && 'hero-bg-minimal',
                    // Animation styles
                    shouldAnimate && 'hero-bg-animated',
                    // Intensity styles
                    intensity === 'subtle' && 'hero-bg-intensity-subtle',
                    intensity === 'medium' && 'hero-bg-intensity-medium',
                    intensity === 'strong' && 'hero-bg-intensity-strong',
                    // Performance optimizations
                    'gpu-accelerated optimize-repaint',
                    className
                )}
                style={customColorStyles}
                data-testid="hero-background"
                data-variant={variant}
                data-animated={shouldAnimate}
                data-intensity={intensity}
                {...props}
            >
                {/* Gradient Mesh Background */}
                {variant === 'gradient-mesh' && (
                    <div className="hero-bg-gradient-mesh-content">
                        <div className="hero-bg-gradient-orb hero-bg-gradient-orb-1" />
                        <div className="hero-bg-gradient-orb hero-bg-gradient-orb-2" />
                        <div className="hero-bg-gradient-orb hero-bg-gradient-orb-3" />
                    </div>
                )}

                {/* Particle Field Background */}
                {variant === 'particle-field' && (
                    <div className="hero-bg-particle-field-content">
                        {Array.from({ length: 20 }, (_, i) => (
                            <div
                                key={i}
                                className={cn(
                                    'hero-bg-particle',
                                    `hero-bg-particle-${i + 1}`
                                )}
                            />
                        ))}
                    </div>
                )}

                {/* Geometric Pattern Background */}
                {variant === 'geometric-pattern' && (
                    <div className="hero-bg-geometric-content">
                        <svg
                            className="hero-bg-geometric-svg"
                            viewBox="0 0 1200 800"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <defs>
                                <linearGradient id="geometric-gradient-1" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="var(--lumina-gold)" stopOpacity="0.1" />
                                    <stop offset="100%" stopColor="var(--lumina-coral)" stopOpacity="0.05" />
                                </linearGradient>
                                <linearGradient id="geometric-gradient-2" x1="100%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="var(--lumina-coral)" stopOpacity="0.08" />
                                    <stop offset="100%" stopColor="var(--lumina-gold)" stopOpacity="0.03" />
                                </linearGradient>
                            </defs>
                            <polygon
                                points="0,0 400,200 200,400 0,300"
                                fill="url(#geometric-gradient-1)"
                                className="hero-bg-geometric-shape hero-bg-geometric-shape-1"
                            />
                            <polygon
                                points="800,100 1200,0 1200,300 900,400"
                                fill="url(#geometric-gradient-2)"
                                className="hero-bg-geometric-shape hero-bg-geometric-shape-2"
                            />
                            <circle
                                cx="300"
                                cy="600"
                                r="150"
                                fill="var(--lumina-gold)"
                                fillOpacity="0.05"
                                className="hero-bg-geometric-shape hero-bg-geometric-shape-3"
                            />
                            <circle
                                cx="900"
                                cy="700"
                                r="100"
                                fill="var(--lumina-coral)"
                                fillOpacity="0.03"
                                className="hero-bg-geometric-shape hero-bg-geometric-shape-4"
                            />
                        </svg>
                    </div>
                )}

                {/* Minimal Background */}
                {variant === 'minimal' && (
                    <div className="hero-bg-minimal-content">
                        <div className="hero-bg-minimal-gradient" />
                    </div>
                )}

                {children}
            </div>
        );
    }
);

HeroBackground.displayName = 'HeroBackground';

export { HeroBackground };


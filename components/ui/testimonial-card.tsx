'use client';

import { cn } from '@/lib/utils';
import Image from 'next/image';
import * as React from 'react';
import { useIntersectionObserver } from '../../hooks/use-intersection-observer';
import { Card, CardContent } from './card';

export interface TestimonialCardProps extends React.HTMLAttributes<HTMLDivElement> {
    /** The testimonial quote text */
    quote: string;
    /** Author's name */
    author: string;
    /** Author's role or title */
    role?: string;
    /** Company or organization name */
    company?: string;
    /** Avatar image URL or placeholder */
    avatar?: string;
    /** Rating out of 5 stars */
    rating?: number;
    /** Card variant following existing Card patterns */
    variant?: 'default' | 'glass' | 'gradient-border' | 'floating' | 'premium';
    /** Hover effect type */
    hover?: 'lift' | 'glow' | 'scale' | 'none';
    /** Enable subtle animations */
    animated?: boolean;
    /** Size variant */
    size?: 'compact' | 'default' | 'large';
}

const TestimonialCard = React.forwardRef<HTMLDivElement, TestimonialCardProps>(
    (
        {
            className,
            quote,
            author,
            role,
            company,
            avatar,
            rating,
            variant = 'default',
            hover = 'lift',
            animated = false,
            size = 'default',
            ...props
        },
        ref
    ) => {
        // Generate avatar placeholder if no avatar provided
        const avatarPlaceholder = React.useMemo(() => {
            if (avatar) return avatar;

            // Generate a consistent color based on author name
            const colors = [
                'bg-lumina-gold',
                'bg-lumina-coral',
                'bg-clarity-blue',
                'bg-sage-green',
                'bg-lavender-mist'
            ];

            const colorIndex = author.length % colors.length;
            return colors[colorIndex];
        }, [avatar, author]);

        // Generate initials from author name
        const initials = React.useMemo(() => {
            return author
                .split(' ')
                .map(name => name.charAt(0))
                .join('')
                .toUpperCase()
                .slice(0, 2);
        }, [author]);

        // Intersection observer for animations
        const { ref: intersectionRef, isIntersecting } = useIntersectionObserver({
            threshold: 0.3, // Require 30% of element to be visible
            rootMargin: '-100px 0px -100px 0px', // Only trigger when well into viewport
            triggerOnce: false, // Allow re-triggering for testing
            delay: 0,
        });

        // Animation state management
        React.useEffect(() => {
            // Clean up will-change property after animation completes
            if (animated && isIntersecting) {
                const timer = setTimeout(() => {
                    // Animation completed, optimize performance
                }, 800);
                return () => clearTimeout(timer);
            }
        }, [isIntersecting, animated]);

        // Combine refs
        const combinedRef = React.useCallback(
            (node: HTMLDivElement) => {
                if (ref) {
                    if (typeof ref === 'function') {
                        ref(node);
                    } else {
                        (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
                    }
                }
                if (intersectionRef) {
                    (intersectionRef as React.MutableRefObject<HTMLElement | null>).current = node;
                }
            },
            [ref, intersectionRef]
        );

        // Render star rating
        const renderStars = (rating: number) => {
            return Array.from({ length: 5 }, (_, i) => (
                <svg
                    key={i}
                    className={cn(
                        'w-4 h-4',
                        i < rating ? 'text-lumina-gold fill-current' : 'text-muted-foreground'
                    )}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"

                >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            ));
        };

        return (
            <Card
                ref={combinedRef}
                variant={variant}
                hover={hover}
                animated={false} // Handle animation at TestimonialCard level
                className={cn(
                    // Base testimonial card styles
                    'testimonial-card',
                    // Size variants
                    size === 'compact' && 'testimonial-card-compact',
                    size === 'default' && 'testimonial-card-default',
                    size === 'large' && 'testimonial-card-large',
                    // Animation classes
                    animated && 'card-animated',
                    animated && isIntersecting && 'in-view',
                    // Performance optimizations
                    'gpu-accelerated optimize-repaint',
                    className
                )}
                data-testid="testimonial-card"
                data-variant={variant}
                data-size={size}
                {...props}
            >
                <CardContent className={cn(
                    'testimonial-card-content',
                    size === 'compact' && 'p-4',
                    size === 'default' && 'p-6',
                    size === 'large' && 'p-8'
                )}>
                    {/* Quote Icon */}
                    <div className="testimonial-quote-icon mb-4">
                        <svg
                            className="w-8 h-8 text-lumina-gold opacity-60"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h4v10h-10z" />
                        </svg>
                    </div>

                    {/* Quote Text */}
                    <blockquote className={cn(
                        'testimonial-quote text-foreground mb-6',
                        size === 'compact' && 'text-sm leading-relaxed',
                        size === 'default' && 'text-base leading-relaxed',
                        size === 'large' && 'text-lg leading-relaxed'
                    )}>
                        "                        &ldquo;{quote}&rdquo;"
                    </blockquote>

                    {/* Rating */}
                    {rating && (
                        <div className="testimonial-rating flex items-center mb-4" aria-label={`Rating: ${rating} out of 5 stars`}>
                            <div className="flex items-center space-x-1">
                                {renderStars(rating)}
                            </div>
                            <span className="sr-only">{rating} out of 5 stars</span>
                        </div>
                    )}

                    {/* Author Information */}
                    <div className="testimonial-author flex items-center">
                        {/* Avatar */}
                        <div className={cn(
                            'testimonial-avatar flex-shrink-0 mr-4',
                            size === 'compact' && 'w-10 h-10',
                            size === 'default' && 'w-12 h-12',
                            size === 'large' && 'w-14 h-14'
                        )}>
                            {avatar && avatar.startsWith('http') ? (
                                <Image
                                    src={avatar}
                                    alt={`${author} avatar`}
                                    width={48}
                                    height={48}
                                    className="w-full h-full rounded-full object-cover border-2 border-background shadow-sm"
                                />
                            ) : (
                                <div className={cn(
                                    'w-full h-full rounded-full flex items-center justify-center text-white font-semibold shadow-sm',
                                    avatar || avatarPlaceholder,
                                    size === 'compact' && 'text-xs',
                                    size === 'default' && 'text-sm',
                                    size === 'large' && 'text-base'
                                )}>
                                    {initials}
                                </div>
                            )}
                        </div>

                        {/* Author Details */}
                        <div className="testimonial-author-details min-w-0 flex-1">
                            <div className={cn(
                                'testimonial-author-name font-semibold text-foreground',
                                size === 'compact' && 'text-sm',
                                size === 'default' && 'text-base',
                                size === 'large' && 'text-lg'
                            )}>
                                {author}
                            </div>

                            {(role || company) && (
                                <div className={cn(
                                    'testimonial-author-meta text-muted-foreground',
                                    size === 'compact' && 'text-xs',
                                    size === 'default' && 'text-sm',
                                    size === 'large' && 'text-base'
                                )}>
                                    {role && company ? `${role} at ${company}` : role || company}
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }
);

TestimonialCard.displayName = 'TestimonialCard';

export { TestimonialCard };


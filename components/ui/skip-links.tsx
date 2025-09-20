import { cn } from '@/lib/utils';

interface SkipLinksProps {
    links?: Array<{
        href: string;
        label: string;
    }>;
    className?: string;
}

/**
 * SkipLinks Component
 * 
 * Provides keyboard navigation shortcuts to main content areas.
 * Essential for accessibility compliance and improved keyboard navigation.
 * 
 * Features:
 * - Hidden by default, visible on keyboard focus
 * - High contrast styling for visibility
 * - Proper ARIA labeling
 * - Customizable link destinations
 * 
 * @example
 * <SkipLinks 
 *   links={[
 *     { href: '#main-content', label: 'Skip to main content' },
 *     { href: '#navigation', label: 'Skip to navigation' },
 *     { href: '#footer', label: 'Skip to footer' }
 *   ]}
 * />
 */
export function SkipLinks({
    links = [
        { href: '#main-content', label: 'Skip to main content' },
        { href: '#navigation', label: 'Skip to navigation' }
    ],
    className
}: SkipLinksProps) {
    return (
        <nav
            className={cn('skip-links-container', className)}
            aria-label="Skip navigation links"
        >
            <ul className="sr-only">
                {links.map((link, index) => (
                    <li key={index}>
                        <a
                            href={link.href}
                            className="skip-link sr-only-focusable"
                            onClick={(e) => {
                                // Ensure the target element receives focus after navigation
                                const target = document.querySelector(link.href);
                                if (target) {
                                    // Small delay to allow navigation to complete
                                    setTimeout(() => {
                                        (target as HTMLElement).focus();
                                    }, 100);
                                }
                            }}
                        >
                            {link.label}
                        </a>
                    </li>
                ))}
            </ul>
        </nav>
    );
}

/**
 * MainContentWrapper Component
 * 
 * Wrapper component that provides proper landmark and focus management
 * for the main content area.
 */
interface MainContentWrapperProps {
    children: React.ReactNode;
    className?: string;
    skipToId?: string;
}

export function MainContentWrapper({
    children,
    className,
    skipToId = 'main-content'
}: MainContentWrapperProps) {
    return (
        <main
            id={skipToId}
            className={cn('main-content-wrapper', className)}
            role="main"
            tabIndex={-1}
            aria-label="Main content"
        >
            {children}
        </main>
    );
}

/**
 * NavigationWrapper Component
 * 
 * Wrapper component for navigation areas with proper landmarks.
 */
interface NavigationWrapperProps {
    children: React.ReactNode;
    className?: string;
    skipToId?: string;
    ariaLabel?: string;
}

export function NavigationWrapper({
    children,
    className,
    skipToId = 'navigation',
    ariaLabel = 'Main navigation'
}: NavigationWrapperProps) {
    return (
        <nav
            id={skipToId}
            className={cn('navigation-wrapper', className)}
            role="navigation"
            tabIndex={-1}
            aria-label={ariaLabel}
        >
            {children}
        </nav>
    );
}
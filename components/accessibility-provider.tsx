'use client';

import { DocumentStructureManager, KeyboardShortcutManager, LiveRegionManager } from '@/lib/accessibility-utils';
import { ReactNode, useEffect } from 'react';

interface AccessibilityProviderProps {
    children: ReactNode;
    pageTitle?: string;
    siteName?: string;
}

/**
 * AccessibilityProvider Component
 * 
 * Initializes accessibility utilities and provides global accessibility features:
 * - Live regions for screen reader announcements
 * - Page title management
 * - Keyboard shortcut registration
 * - Document structure validation
 * 
 * Should be placed at the root of the application.
 */
export function AccessibilityProvider({
    children,
    pageTitle,
    siteName = 'Lumina'
}: AccessibilityProviderProps) {
    useEffect(() => {
        // Initialize live regions
        LiveRegionManager.getInstance();

        // Set page title if provided
        if (pageTitle) {
            DocumentStructureManager.setPageTitle(pageTitle, siteName);
        }

        // Register global keyboard shortcuts
        KeyboardShortcutManager.registerShortcut(
            '/',
            'Focus search',
            () => {
                const searchInput = document.querySelector('input[type="search"]') as HTMLElement;
                if (searchInput) {
                    searchInput.focus();
                }
            }
        );

        KeyboardShortcutManager.registerShortcut(
            'h',
            'Go to home',
            () => {
                window.location.href = '/dashboard';
            },
            { alt: true }
        );

        KeyboardShortcutManager.registerShortcut(
            'Escape',
            'Close modal or cancel action',
            () => {
                // Find and close any open modals
                const closeButtons = document.querySelectorAll('[data-modal-close], [aria-label*="close" i]');
                const lastCloseButton = closeButtons[closeButtons.length - 1] as HTMLElement;
                if (lastCloseButton) {
                    lastCloseButton.click();
                }
            }
        );

        // Validate document structure in development
        if (process.env.NODE_ENV === 'development') {
            setTimeout(() => {
                const validation = DocumentStructureManager.validateHeadingHierarchy();
                if (!validation.isValid) {
                    console.warn('Accessibility: Heading hierarchy issues found:', validation.issues);
                }
            }, 1000);
        }

        // Cleanup function
        return () => {
            KeyboardShortcutManager.unregisterShortcut('/');
            KeyboardShortcutManager.unregisterShortcut('h', { alt: true });
            KeyboardShortcutManager.unregisterShortcut('Escape');
        };
    }, [pageTitle, siteName]);

    return <>{children}</>;
}

/**
 * Hook to access accessibility utilities
 */
export function useAccessibility() {
    const liveRegion = LiveRegionManager.getInstance();

    return {
        announce: liveRegion.announce.bind(liveRegion),
        announceStatus: liveRegion.announceStatus.bind(liveRegion),
        announceNavigation: liveRegion.announceNavigation.bind(liveRegion),
        setPageTitle: DocumentStructureManager.setPageTitle,
        validateHeadingHierarchy: DocumentStructureManager.validateHeadingHierarchy,
        getKeyboardShortcuts: KeyboardShortcutManager.getShortcuts,
    };
}
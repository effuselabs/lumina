'use client';

import { useEffect, useState } from 'react';

export interface DeviceInfo {
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    isTouchDevice: boolean;
    screenSize: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    orientation: 'portrait' | 'landscape';
    userAgent: string;
}

/**
 * Custom hook for detecting mobile devices and screen characteristics
 * 
 * Provides comprehensive device detection including screen size,
 * touch capabilities, and orientation changes.
 * 
 * Requirements: 6.1, 6.2
 */
export function useMobileDetection(): DeviceInfo {
    const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isTouchDevice: false,
        screenSize: 'lg',
        orientation: 'landscape',
        userAgent: '',
    });

    useEffect(() => {
        const updateDeviceInfo = () => {
            const userAgent = navigator.userAgent;
            const width = window.innerWidth;
            const height = window.innerHeight;

            // Detect touch capability
            const isTouchDevice = 'ontouchstart' in window ||
                navigator.maxTouchPoints > 0 ||
                (navigator as any).msMaxTouchPoints > 0;

            // Detect device type based on screen size and user agent
            const isMobile = width < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
            const isTablet = (width >= 768 && width < 1024) || /iPad|Android(?!.*Mobile)/i.test(userAgent);
            const isDesktop = width >= 1024 && !isMobile && !isTablet;

            // Determine screen size breakpoint
            let screenSize: DeviceInfo['screenSize'] = 'sm';
            if (width >= 1536) screenSize = '2xl';
            else if (width >= 1280) screenSize = 'xl';
            else if (width >= 1024) screenSize = 'lg';
            else if (width >= 768) screenSize = 'md';

            // Determine orientation
            const orientation: DeviceInfo['orientation'] = height > width ? 'portrait' : 'landscape';

            setDeviceInfo({
                isMobile,
                isTablet,
                isDesktop,
                isTouchDevice,
                screenSize,
                orientation,
                userAgent,
            });
        };

        // Initial detection
        updateDeviceInfo();

        // Listen for resize and orientation changes
        const handleResize = () => updateDeviceInfo();
        const handleOrientationChange = () => {
            // Delay to allow for orientation change to complete
            setTimeout(updateDeviceInfo, 100);
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleOrientationChange);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleOrientationChange);
        };
    }, []);

    return deviceInfo;
}

/**
 * Hook for detecting if the current device is mobile
 * Simplified version for components that only need mobile detection
 */
export function useIsMobile(): boolean {
    const { isMobile } = useMobileDetection();
    return isMobile;
}

/**
 * Hook for detecting if the current device supports touch
 * Useful for enabling/disabling touch-specific features
 */
export function useIsTouchDevice(): boolean {
    const { isTouchDevice } = useMobileDetection();
    return isTouchDevice;
}
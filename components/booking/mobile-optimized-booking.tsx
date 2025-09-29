'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useNetworkResilience } from '@/hooks/use-network-resilience';
import { usePerformanceMonitor } from '@/lib/performance-hooks';
import { cn } from '@/lib/utils';
import { ArrowLeft, ArrowRight, Wifi, WifiOff } from 'lucide-react';
import { ReactNode, useCallback, useEffect, useState } from 'react';

interface MobileOptimizedBookingProps {
    children: ReactNode;
    currentStep: string;
    totalSteps: number;
    onNext?: () => void;
    onBack?: () => void;
    isNextDisabled?: boolean;
    isLoading?: boolean;
    className?: string;
}

export function MobileOptimizedBooking({
    children,
    currentStep,
    totalSteps,
    onNext,
    onBack,
    isNextDisabled = false,
    isLoading = false,
    className,
}: MobileOptimizedBookingProps) {
    const { trackPropsChange } = usePerformanceMonitor('MobileOptimizedBooking');
    const { networkState, shouldShowOfflineMessage } = useNetworkResilience();
    const [touchStartY, setTouchStartY] = useState<number | null>(null);
    const [isScrolling, setIsScrolling] = useState(false);

    // Track props changes for performance monitoring
    useEffect(() => {
        trackPropsChange({
            currentStep,
            totalSteps,
            isNextDisabled,
            isLoading,
        });
    }, [currentStep, totalSteps, isNextDisabled, isLoading, trackPropsChange]);

    // Handle touch gestures for mobile navigation
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        setTouchStartY(e.touches[0].clientY);
        setIsScrolling(false);
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (touchStartY === null) return;

        const currentY = e.touches[0].clientY;
        const deltaY = Math.abs(currentY - touchStartY);

        // If user is scrolling vertically, don't trigger navigation
        if (deltaY > 10) {
            setIsScrolling(true);
        }
    }, [touchStartY]);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        if (touchStartY === null || isScrolling) {
            setTouchStartY(null);
            setIsScrolling(false);
            return;
        }

        const currentY = e.changedTouches[0].clientY;
        const deltaY = touchStartY - currentY;
        const threshold = 50; // Minimum swipe distance

        // Swipe up to go to next step
        if (deltaY > threshold && onNext && !isNextDisabled && !isLoading) {
            onNext();
        }
        // Swipe down to go to previous step
        else if (deltaY < -threshold && onBack) {
            onBack();
        }

        setTouchStartY(null);
        setIsScrolling(false);
    }, [touchStartY, isScrolling, onNext, onBack, isNextDisabled, isLoading]);

    // Prevent zoom on double tap for better UX
    useEffect(() => {
        let lastTouchEnd = 0;
        const preventZoom = (e: TouchEvent) => {
            const now = new Date().getTime();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        };

        document.addEventListener('touchend', preventZoom, { passive: false });
        return () => document.removeEventListener('touchend', preventZoom);
    }, []);

    const currentStepNumber = parseInt(currentStep) || 1;
    const progressPercentage = (currentStepNumber / totalSteps) * 100;

    return (
        <div
            className={cn(
                'flex min-h-screen flex-col bg-gray-50',
                'touch-pan-y', // Allow vertical scrolling
                className
            )}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Mobile Header with Progress */}
            <header className="sticky top-0 z-50 bg-white shadow-sm">
                {/* Network Status Indicator */}
                {shouldShowOfflineMessage() && (
                    <div className="bg-red-50 px-4 py-2 text-center">
                        <div className="flex items-center justify-center gap-2 text-sm text-red-700">
                            <WifiOff className="h-4 w-4" />
                            <span>
                                {!networkState.isOnline
                                    ? 'No internet connection'
                                    : 'Connection issues - some features may be limited'}
                            </span>
                        </div>
                    </div>
                )}

                {/* Slow Connection Warning */}
                {networkState.isSlowConnection && networkState.isOnline && (
                    <div className="bg-yellow-50 px-4 py-2 text-center">
                        <div className="flex items-center justify-center gap-2 text-sm text-yellow-700">
                            <Wifi className="h-4 w-4" />
                            <span>Slow connection detected - optimizing for your network</span>
                        </div>
                    </div>
                )}

                <div className="px-4 py-3">
                    {/* Progress Bar */}
                    <div className="mb-3">
                        <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>Step {currentStepNumber} of {totalSteps}</span>
                            <span>{Math.round(progressPercentage)}%</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-200">
                            <div
                                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 ease-out"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                    </div>

                    {/* Navigation Controls */}
                    <div className="flex items-center justify-between">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onBack}
                            disabled={!onBack || isLoading}
                            className="flex items-center gap-2 px-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            <span>Back</span>
                        </Button>

                        <div className="text-sm font-medium text-gray-900">
                            Booking Appointment
                        </div>

                        <Button
                            onClick={onNext}
                            disabled={isNextDisabled || isLoading || !onNext}
                            size="sm"
                            className="flex items-center gap-2 px-2"
                        >
                            <span>{currentStepNumber === totalSteps ? 'Book' : 'Next'}</span>
                            {currentStepNumber < totalSteps && <ArrowRight className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto">
                <div className="p-4">
                    <Card className="min-h-[60vh] p-4">
                        {children}
                    </Card>
                </div>
            </main>

            {/* Mobile-Friendly Bottom Actions */}
            <footer className="sticky bottom-0 bg-white border-t p-4 safe-area-pb">
                <div className="flex gap-3">
                    {onBack && (
                        <Button
                            variant="outline"
                            onClick={onBack}
                            disabled={isLoading}
                            className="flex-1 h-12 text-base font-medium"
                        >
                            Back
                        </Button>
                    )}
                    {onNext && (
                        <Button
                            onClick={onNext}
                            disabled={isNextDisabled || isLoading}
                            className="flex-1 h-12 text-base font-medium bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    <span>Processing...</span>
                                </div>
                            ) : (
                                <span>{currentStepNumber === totalSteps ? 'Complete Booking' : 'Continue'}</span>
                            )}
                        </Button>
                    )}
                </div>

                {/* Swipe Hint for First-Time Users */}
                {currentStepNumber === 1 && (
                    <div className="mt-2 text-center text-xs text-gray-500">
                        Swipe up to continue or use the buttons above
                    </div>
                )}
            </footer>
        </div>
    );
}

// Touch-optimized input components
export function TouchOptimizedInput({
    className,
    ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            className={cn(
                'h-12 text-base', // Larger touch target and text
                'rounded-lg border border-gray-300',
                'px-4 py-3',
                'focus:border-blue-500 focus:ring-2 focus:ring-blue-200',
                'disabled:bg-gray-100 disabled:text-gray-500',
                className
            )}
        />
    );
}

export function TouchOptimizedButton({
    children,
    className,
    size = 'default',
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    size?: 'sm' | 'default' | 'lg';
}) {
    const sizeClasses = {
        sm: 'h-10 px-4 text-sm',
        default: 'h-12 px-6 text-base',
        lg: 'h-14 px-8 text-lg',
    };

    return (
        <button
            {...props}
            className={cn(
                'rounded-lg font-medium transition-colors',
                'active:scale-95 transform transition-transform',
                'focus:outline-none focus:ring-2 focus:ring-blue-200',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                sizeClasses[size],
                className
            )}
        >
            {children}
        </button>
    );
}

// Mobile-optimized card component
export function MobileCard({
    children,
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <Card
            {...props}
            className={cn(
                'p-4 sm:p-6', // Responsive padding
                'touch-manipulation', // Optimize touch interactions
                className
            )}
        >
            {children}
        </Card>
    );
}
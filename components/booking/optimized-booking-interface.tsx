'use client';

import { useNetworkResilience } from '@/hooks/use-network-resilience';
import { usePerformanceMonitor } from '@/lib/performance-hooks';
import { useBookingPerformance } from '@/lib/performance-monitoring';
import { BusinessInfo } from '@/types/booking';
import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { BookingLoadingState } from './booking-loading-states';
import { MobileOptimizedBooking } from './mobile-optimized-booking';
import { OfflineSupport, registerServiceWorker } from './offline-support';
import { ProgressiveLoading } from './progressive-loading';

// Lazy load booking steps for code splitting
const ServiceSelection = lazy(() =>
    import('./service-selection').then(module => ({ default: module.ServiceSelection }))
);

const StaffTimeSelection = lazy(() =>
    import('./staff-time-selection').then(module => ({ default: module.StaffTimeSelection }))
);

const ClientInformation = lazy(() =>
    import('./client-information-form').then(module => ({ default: module.default }))
);

const BookingConfirmation = lazy(() =>
    import('./booking-confirmation').then(module => ({ default: module.BookingConfirmation }))
);

interface OptimizedBookingInterfaceProps {
    businessId: string;
    business: BusinessInfo;
}

interface BookingState {
    currentStep: number;
    selectedServices: any[];
    selectedStaff: any;
    selectedDateTime: Date | null;
    clientInfo: any;
    isLoading: boolean;
    error: string | null;
}

const BOOKING_STEPS = [
    { id: 'services', title: 'Select Services', component: ServiceSelection },
    { id: 'datetime', title: 'Choose Date & Time', component: StaffTimeSelection },
    { id: 'client', title: 'Your Information', component: ClientInformation },
    { id: 'confirmation', title: 'Confirm Booking', component: BookingConfirmation },
];

export function OptimizedBookingInterface({
    businessId,
    business
}: OptimizedBookingInterfaceProps) {
    const { trackPropsChange } = usePerformanceMonitor('OptimizedBookingInterface');
    const { startMeasurement, measureAsync } = useBookingPerformance(businessId);
    const { networkState: _networkState, resilientFetch } = useNetworkResilience();

    const [bookingState, setBookingState] = useState<BookingState>({
        currentStep: 0,
        selectedServices: [],
        selectedStaff: null,
        selectedDateTime: null,
        clientInfo: null,
        isLoading: false,
        error: null,
    });

    const [isMobile, setIsMobile] = useState(false);

    // Track props changes for performance monitoring
    useEffect(() => {
        trackPropsChange({ businessId, currentStep: bookingState.currentStep });
    }, [businessId, bookingState.currentStep, trackPropsChange]);

    // Detect mobile device
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Register service worker for offline support
    useEffect(() => {
        registerServiceWorker();
    }, []);

    // Preload next step component
    useEffect(() => {
        const nextStep = bookingState.currentStep + 1;
        if (nextStep < BOOKING_STEPS.length) {
            const _nextComponent = BOOKING_STEPS[nextStep].component;
            // Preload the next component
            import('./service-selection').catch(() => { });
        }
    }, [bookingState.currentStep]);

    // Validate current step data
    const validateCurrentStep = useCallback(async (): Promise<boolean> => {
        const currentStepId = BOOKING_STEPS[bookingState.currentStep].id;

        switch (currentStepId) {
            case 'services':
                return bookingState.selectedServices.length > 0;
            case 'datetime':
                return bookingState.selectedDateTime !== null && bookingState.selectedStaff !== null;
            case 'client':
                return bookingState.clientInfo !== null;
            default:
                return true;
        }
    }, [bookingState.currentStep, bookingState.selectedServices, bookingState.selectedDateTime, bookingState.selectedStaff, bookingState.clientInfo]);

    // Handle step navigation
    const handleNext = useCallback(async () => {
        const endMeasurement = startMeasurement ? startMeasurement(`step-${bookingState.currentStep}-completion`) : undefined;

        try {
            setBookingState(prev => ({ ...prev, isLoading: true, error: null }));

            // Validate current step
            const isValid = await validateCurrentStep();
            if (!isValid) {
                setBookingState(prev => ({ ...prev, isLoading: false }));
                return;
            }

            // Move to next step
            setBookingState(prev => ({
                ...prev,
                currentStep: Math.min(prev.currentStep + 1, BOOKING_STEPS.length - 1),
                isLoading: false,
            }));

            endMeasurement?.();
        } catch (_error) {
            setBookingState(prev => ({
                ...prev,
                error: 'Failed to proceed to next step',
                isLoading: false,
            }));
        }
    }, [bookingState.currentStep, startMeasurement, validateCurrentStep]);

    const handleBack = useCallback(() => {
        setBookingState(prev => ({
            ...prev,
            currentStep: Math.max(prev.currentStep - 1, 0),
            error: null,
        }));
    }, []);

    // Handle service selection
    const handleServiceSelection = useCallback((services: any[]) => {
        setBookingState(prev => ({ ...prev, selectedServices: services }));
    }, []);

    // Handle date/time selection
    const handleDateTimeSelection = useCallback((dateTime: Date, staff: any) => {
        setBookingState(prev => ({
            ...prev,
            selectedDateTime: dateTime,
            selectedStaff: staff,
        }));
    }, []);

    // Handle client information
    const handleClientInformation = useCallback((clientInfo: any) => {
        setBookingState(prev => ({ ...prev, clientInfo }));
    }, []);

    // Handle booking confirmation
    const handleBookingConfirmation = useCallback(async () => {
        if (!measureAsync) return;

        try {
            setBookingState(prev => ({ ...prev, isLoading: true, error: null }));

            const bookingData = {
                businessId,
                services: bookingState.selectedServices,
                staff: bookingState.selectedStaff,
                dateTime: bookingState.selectedDateTime,
                client: bookingState.clientInfo,
            };

            const _result = await measureAsync('booking-creation', async () => {
                return await resilientFetch('/api/public/booking', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bookingData),
                });
            });

            // Booking successful
            setBookingState(prev => ({
                ...prev,
                isLoading: false,
                currentStep: BOOKING_STEPS.length - 1, // Go to confirmation
            }));

        } catch (_error) {
            setBookingState(prev => ({
                ...prev,
                error: 'Failed to create booking. Please try again.',
                isLoading: false,
            }));
        }
    }, [businessId, bookingState, measureAsync, resilientFetch]);

    // Get current step component
    const getCurrentStepComponent = () => {
        const currentStepData = BOOKING_STEPS[bookingState.currentStep];

        const commonProps = {
            businessId,
            business,
            isLoading: bookingState.isLoading,
            error: bookingState.error,
        };

        switch (currentStepData.id) {
            case 'services':
                return (
                    <ServiceSelection
                        {...commonProps}
                        selectedServices={bookingState.selectedServices}
                        onServicesSelect={handleServiceSelection}
                    />
                );
            case 'datetime':
                return (
                    <StaffTimeSelection
                        {...commonProps}
                        selectedServices={bookingState.selectedServices}
                        onSlotSelect={(slot) => {
                            handleDateTimeSelection(slot.startTime, { id: slot.staffId, name: slot.staffName });
                        }}
                    />
                );
            case 'client':
                return (
                    <ClientInformation
                        {...commonProps}
                        onSubmit={handleClientInformation}
                        onBack={handleBack}
                    />
                );
            case 'confirmation':
                return (
                    <BookingConfirmation
                        booking={{
                            id: '',
                            startTime: bookingState.selectedDateTime?.toISOString() || new Date().toISOString(),
                            endTime: new Date(bookingState.selectedDateTime?.getTime() || Date.now() + 3600000).toISOString(),
                            status: 'SCHEDULED',
                            client: {
                                firstName: bookingState.clientInfo?.firstName || '',
                                lastName: bookingState.clientInfo?.lastName || '',
                                email: bookingState.clientInfo?.email || '',
                            },
                            staff: {
                                name: bookingState.selectedStaff?.name || '',
                            },
                            service: {
                                name: bookingState.selectedServices[0]?.name || '',
                                price: bookingState.selectedServices[0]?.price || 0,
                                duration: bookingState.selectedServices[0]?.duration || 0,
                            },
                            business: {
                                name: business.name,
                            },
                        }}
                        onNewBooking={() => {}}
                    />
                );
            default:
                return <div>Unknown step</div>;
        }
    };

    // Check if next button should be disabled
    const isNextDisabled = () => {
        const currentStepId = BOOKING_STEPS[bookingState.currentStep].id;

        switch (currentStepId) {
            case 'services':
                return bookingState.selectedServices.length === 0;
            case 'datetime':
                return !bookingState.selectedDateTime || !bookingState.selectedStaff;
            case 'client':
                return !bookingState.clientInfo;
            default:
                return false;
        }
    };

    const currentStepData = BOOKING_STEPS[bookingState.currentStep];

    return (
        <OfflineSupport enableOfflineMode={true}>
            {isMobile ? (
                <MobileOptimizedBooking
                    currentStep={String(bookingState.currentStep + 1)}
                    totalSteps={BOOKING_STEPS.length}
                    onNext={bookingState.currentStep < BOOKING_STEPS.length - 1 ? handleNext : undefined}
                    onBack={bookingState.currentStep > 0 ? handleBack : undefined}
                    isNextDisabled={isNextDisabled()}
                    isLoading={bookingState.isLoading}
                >
                    <ProgressiveLoading
                        priority="high"
                        loadingMessage={`Loading ${currentStepData.title}...`}
                    >
                        <Suspense
                            fallback={
                                <BookingLoadingState
                                    type="general"
                                    message={`Loading ${currentStepData.title}...`}
                                />
                            }
                        >
                            {getCurrentStepComponent()}
                        </Suspense>
                    </ProgressiveLoading>
                </MobileOptimizedBooking>
            ) : (
                // Desktop version with progressive loading
                <div className="mx-auto max-w-4xl">
                    {/* Progress indicator */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>Step {bookingState.currentStep + 1} of {BOOKING_STEPS.length}</span>
                            <span>{Math.round(((bookingState.currentStep + 1) / BOOKING_STEPS.length) * 100)}%</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
                            <div
                                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                                style={{ width: `${((bookingState.currentStep + 1) / BOOKING_STEPS.length) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Step content */}
                    <ProgressiveLoading
                        priority="high"
                        loadingMessage={`Loading ${currentStepData.title}...`}
                    >
                        <Suspense
                            fallback={
                                <BookingLoadingState
                                    type="general"
                                    message={`Loading ${currentStepData.title}...`}
                                />
                            }
                        >
                            {getCurrentStepComponent()}
                        </Suspense>
                    </ProgressiveLoading>

                    {/* Navigation */}
                    <div className="mt-8 flex items-center justify-between">
                        <div>
                            {bookingState.currentStep > 0 && (
                                <button
                                    onClick={handleBack}
                                    disabled={bookingState.isLoading}
                                    className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    ← Back
                                </button>
                            )}
                        </div>

                        <div>
                            {bookingState.currentStep < BOOKING_STEPS.length - 1 && (
                                <button
                                    onClick={handleNext}
                                    disabled={isNextDisabled() || bookingState.isLoading}
                                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {bookingState.isLoading ? 'Loading...' : 'Continue →'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </OfflineSupport>
    );
}
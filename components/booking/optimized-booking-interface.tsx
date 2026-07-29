'use client';

import { usePerformanceMonitor } from '@/lib/performance-hooks';
import { useBookingPerformance } from '@/lib/performance-monitoring';
import { BusinessInfo } from '@/types/booking';
import { Service } from '@/types/service-selection';
import type { TimeSlot } from './staff-time-selection';
import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { BookingLoadingState } from './booking-loading-states';
import { MobileOptimizedBooking } from './mobile-optimized-booking';
import { OfflineSupport, registerServiceWorker } from './offline-support';
import { ProgressiveLoading } from './progressive-loading';

// Lazy load booking steps for code splitting
const ServiceSelection = lazy(() =>
  import('./service-selection').then(module => ({
    default: module.ServiceSelection,
  }))
);

const StaffTimeSelection = lazy(() =>
  import('./staff-time-selection').then(module => ({
    default: module.StaffTimeSelection,
  }))
);

const ClientInformation = lazy(() =>
  import('./client-information-form').then(module => ({
    default: module.default,
  }))
);

/*
 * The final step is BookingConfirmationStep, not BookingConfirmation.
 *
 * BookingConfirmation is a pure success screen: it renders an appointment that
 * already exists. It was being rendered here with `id: ''` and hand-assembled
 * fields, so step 4 told the client "Booking Confirmed!" without ever calling
 * the booking API — nothing was written to the database.
 *
 * BookingConfirmationStep is the reviewable step: it shows the summary, owns
 * the Confirm button, POSTs to /api/public/booking/[businessId]/book, and only
 * then renders the success state — from the appointment the server returned,
 * including its real confirmation number.
 */
const BookingConfirmationStep = lazy(() =>
  import('./booking-confirmation-step').then(module => ({
    default: module.BookingConfirmationStep,
  }))
);

interface OptimizedBookingInterfaceProps {
  businessId: string;
  business: BusinessInfo;
}

/**
 * Client details captured in step 3, matching the fields
 * ClientInformationForm submits and POST .../book validates.
 */
interface BookingClientInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes?: string;
  isNewClient: boolean;
  marketingOptIn: boolean;
}

interface BookingState {
  currentStep: number;
  selectedServices: Service[];
  /**
   * The whole slot, not just its start time.
   *
   * This used to keep only `selectedDateTime` and `{ id, name }` for the
   * staff member, discarding endTime, totalDuration and totalPrice — all of
   * which POST .../book requires. The booking request could not have been
   * assembled from what was stored.
   */
  selectedSlot: TimeSlot | null;
  clientInfo: BookingClientInfo | null;
  isLoading: boolean;
  error: string | null;
}

const BOOKING_STEPS = [
  {
    id: 'services',
    title: 'Select Services',
    preload: () => import('./service-selection'),
  },
  {
    id: 'datetime',
    title: 'Choose Date & Time',
    preload: () => import('./staff-time-selection'),
  },
  {
    id: 'client',
    title: 'Your Information',
    preload: () => import('./client-information-form'),
  },
  {
    id: 'confirmation',
    title: 'Confirm Booking',
    preload: () => import('./booking-confirmation-step'),
  },
] as const;

/*
 * Steps 3 and 4 render their own Back/Continue controls: the client form's
 * submit button is what runs react-hook-form validation, and the confirmation
 * step's button is what actually books. The wrapper's generic navigation is
 * only correct for the first two steps — showing it alongside gave step 3 two
 * competing sets of buttons, one of which advanced past the form without
 * validating it.
 */
const STEPS_WITH_OWN_NAVIGATION = new Set(['client', 'confirmation']);

export function OptimizedBookingInterface({
  businessId,
  business,
}: OptimizedBookingInterfaceProps) {
  const { trackPropsChange } = usePerformanceMonitor(
    'OptimizedBookingInterface'
  );
  const { startMeasurement } = useBookingPerformance(businessId);

  const [bookingState, setBookingState] = useState<BookingState>({
    currentStep: 0,
    selectedServices: [],
    selectedSlot: null,
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

  // Preload the next step's chunk. This used to preload './service-selection'
  // no matter which step was next, so every step after the first still paid
  // full download latency on arrival.
  useEffect(() => {
    const nextStep = bookingState.currentStep + 1;
    if (nextStep < BOOKING_STEPS.length) {
      BOOKING_STEPS[nextStep].preload().catch(() => {});
    }
  }, [bookingState.currentStep]);

  // Validate current step data
  const validateCurrentStep = useCallback(async (): Promise<boolean> => {
    const currentStepId = BOOKING_STEPS[bookingState.currentStep].id;

    switch (currentStepId) {
      case 'services':
        return bookingState.selectedServices.length > 0;
      case 'datetime':
        return bookingState.selectedSlot !== null;
      case 'client':
        return bookingState.clientInfo !== null;
      default:
        return true;
    }
  }, [
    bookingState.currentStep,
    bookingState.selectedServices,
    bookingState.selectedSlot,
    bookingState.clientInfo,
  ]);

  // Handle step navigation
  const handleNext = useCallback(async () => {
    const endMeasurement = startMeasurement
      ? startMeasurement(`step-${bookingState.currentStep}-completion`)
      : undefined;

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
  const handleServiceSelection = useCallback((services: Service[]) => {
    setBookingState(prev => ({ ...prev, selectedServices: services }));
  }, []);

  // Handle date/time selection
  const handleSlotSelection = useCallback((slot: TimeSlot) => {
    setBookingState(prev => ({ ...prev, selectedSlot: slot }));
  }, []);

  // Submitting the client form IS the "continue" action for step 3 — the
  // wrapper renders no Continue button there. Storing the details without
  // advancing left the client on a form they had already completed.
  const handleClientInformation = useCallback(
    (clientInfo: BookingClientInfo) => {
      setBookingState(prev => ({
        ...prev,
        clientInfo,
        currentStep: Math.min(prev.currentStep + 1, BOOKING_STEPS.length - 1),
        error: null,
      }));
    },
    []
  );

  // Start over after a completed booking.
  const handleNewBooking = useCallback(() => {
    setBookingState({
      currentStep: 0,
      selectedServices: [],
      selectedSlot: null,
      clientInfo: null,
      isLoading: false,
      error: null,
    });
  }, []);

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
            onSlotSelect={slot => {
              handleSlotSelection(slot);
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
      case 'confirmation': {
        // Reaching step 4 without a slot or client details means state was
        // lost (a refresh, say). Send them back rather than render a
        // confirmation built from empty strings.
        const { selectedSlot, clientInfo, selectedServices } = bookingState;
        if (!selectedSlot || !clientInfo || selectedServices.length === 0) {
          return (
            <div className="rounded-lg border border-gray-200 p-6 text-center">
              <p className="text-sm text-gray-700">
                We lost track of your booking details. Please start again.
              </p>
              <button
                onClick={handleNewBooking}
                className="mt-4 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Start over
              </button>
            </div>
          );
        }

        return (
          <BookingConfirmationStep
            businessId={businessId}
            selectedServices={selectedServices}
            selectedTimeSlot={selectedSlot}
            clientData={clientInfo}
            onBack={handleBack}
            onNewBooking={handleNewBooking}
          />
        );
      }
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
        return !bookingState.selectedSlot;
      case 'client':
        return !bookingState.clientInfo;
      default:
        return false;
    }
  };

  const currentStepData = BOOKING_STEPS[bookingState.currentStep];
  const showWrapperNavigation = !STEPS_WITH_OWN_NAVIGATION.has(
    currentStepData.id
  );

  return (
    <OfflineSupport enableOfflineMode={true}>
      {isMobile ? (
        <MobileOptimizedBooking
          currentStep={String(bookingState.currentStep + 1)}
          totalSteps={BOOKING_STEPS.length}
          onNext={showWrapperNavigation ? handleNext : undefined}
          onBack={
            showWrapperNavigation && bookingState.currentStep > 0
              ? handleBack
              : undefined
          }
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
              <span>
                Step {bookingState.currentStep + 1} of {BOOKING_STEPS.length}
              </span>
              <span>
                {Math.round(
                  ((bookingState.currentStep + 1) / BOOKING_STEPS.length) * 100
                )}
                %
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                style={{
                  width: `${((bookingState.currentStep + 1) / BOOKING_STEPS.length) * 100}%`,
                }}
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

          {/* Navigation — steps 3 and 4 render their own; see
                        STEPS_WITH_OWN_NAVIGATION. */}
          {showWrapperNavigation && (
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
                <button
                  onClick={handleNext}
                  disabled={isNextDisabled() || bookingState.isLoading}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {bookingState.isLoading ? 'Loading...' : 'Continue →'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </OfflineSupport>
  );
}

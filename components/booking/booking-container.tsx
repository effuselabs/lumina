'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { BookingProgress, BookingStep } from './booking-progress';

interface BookingContainerProps {
  children: ReactNode;
  currentStep: string;
  steps: BookingStep[];
  onNext?: () => void;
  onBack?: () => void;
  nextLabel?: string;
  backLabel?: string;
  isNextDisabled?: boolean;
  isLoading?: boolean;
  className?: string;
}

export function BookingContainer({
  children,
  currentStep,
  steps,
  onNext,
  onBack,
  nextLabel = 'Continue',
  backLabel = 'Back',
  isNextDisabled = false,
  isLoading = false,
  className,
}: BookingContainerProps) {
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Update completed steps when current step changes
  useEffect(() => {
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    if (currentIndex > 0) {
      const completed = steps.slice(0, currentIndex).map(step => step.id);
      setCompletedSteps(completed);
    }
  }, [currentStep, steps]);

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  return (
    <div className={cn('mx-auto w-full max-w-4xl', className)}>
      {/* Progress Indicator */}
      <BookingProgress
        steps={steps}
        currentStep={currentStep}
        completedSteps={completedSteps}
        className="mb-6 sm:mb-8"
      />

      {/* Main Content */}
      <div className="min-h-[400px] sm:min-h-[500px]">{children}</div>

      {/* Navigation Controls */}
      <div className="mt-6 flex items-center justify-between border-t pt-6 sm:mt-8">
        {/* Back Button */}
        <div className="flex-1">
          {!isFirstStep && onBack && (
            <Button
              variant="outline"
              onClick={onBack}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{backLabel}</span>
              <span className="sm:hidden">Back</span>
            </Button>
          )}
        </div>

        {/* Step Counter - Mobile Only */}
        {isMobile && (
          <div className="flex-1 text-center">
            <span className="text-sm text-gray-500">
              {currentStepIndex + 1} of {steps.length}
            </span>
          </div>
        )}

        {/* Next Button */}
        <div className="flex flex-1 justify-end">
          {onNext && (
            <Button
              onClick={onNext}
              disabled={isNextDisabled || isLoading}
              className="flex items-center gap-2 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)] font-medium text-[var(--brand-accent)] hover:opacity-90"
            >
              <span className="hidden sm:inline">
                {isLastStep ? 'Complete Booking' : nextLabel}
              </span>
              <span className="sm:hidden">{isLastStep ? 'Book' : 'Next'}</span>
              {!isLastStep && <ArrowRight className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Touch-friendly spacing for mobile */}
      <div className="h-6 sm:h-0" />
    </div>
  );
}

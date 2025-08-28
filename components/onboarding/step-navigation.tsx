'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface StepNavigationProps {
  currentStep: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
  isLoading?: boolean;
  canProceed?: boolean;
  nextButtonText?: string;
  submitButtonText?: string;
}

export function StepNavigation({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  onSubmit,
  isLoading = false,
  canProceed = true,
  nextButtonText = 'Continue',
  submitButtonText = 'Complete Setup',
}: StepNavigationProps) {
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;

  return (
    <div className="flex items-center justify-between border-t border-gray-200 pt-6">
      {/* Previous Button */}
      <Button
        type="button"
        variant="outline"
        onClick={onPrevious}
        disabled={isFirstStep || isLoading}
        className="flex items-center gap-2"
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </Button>

      {/* Next/Submit Button */}
      {isLastStep ? (
        <Button
          type="button"
          onClick={onSubmit}
          disabled={!canProceed || isLoading}
          className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600"
        >
          {isLoading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Creating...
            </>
          ) : (
            <>
              {submitButtonText}
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      ) : (
        <Button
          type="button"
          onClick={onNext}
          disabled={!canProceed || isLoading}
          className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600"
        >
          {nextButtonText}
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

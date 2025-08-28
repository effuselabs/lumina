'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  completedSteps?: number[];
}

export function ProgressIndicator({
  currentStep,
  totalSteps,
  completedSteps = [],
}: ProgressIndicatorProps) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center">
            {/* Step Circle */}
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-200',
                {
                  // Current step
                  'border-orange-500 bg-orange-500 text-white':
                    step === currentStep,
                  // Completed step
                  'border-green-500 bg-green-500 text-white':
                    completedSteps.includes(step),
                  // Future step
                  'border-gray-300 bg-white text-gray-400':
                    step > currentStep && !completedSteps.includes(step),
                  // Past step (not completed)
                  'border-gray-400 bg-gray-100 text-gray-600':
                    step < currentStep && !completedSteps.includes(step),
                }
              )}
            >
              {completedSteps.includes(step) ? (
                <Check className="h-5 w-5" />
              ) : (
                <span className="text-sm font-medium">{step}</span>
              )}
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={cn('mx-2 h-0.5 flex-1 transition-all duration-200', {
                  'bg-green-500':
                    step < currentStep || completedSteps.includes(step),
                  'bg-gray-300':
                    step >= currentStep && !completedSteps.includes(step),
                })}
              />
            )}
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="h-2 w-full rounded-full bg-gray-200">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-300 ease-out"
          style={{
            width: `${(currentStep / totalSteps) * 100}%`,
          }}
        />
      </div>

      {/* Step Counter */}
      <div className="mt-2 text-center">
        <span className="text-sm text-gray-600">
          Step {currentStep} of {totalSteps}
        </span>
      </div>
    </div>
  );
}

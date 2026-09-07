'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  completedSteps: number[];
}

export function ProgressIndicator({
  currentStep,
  totalSteps,
  completedSteps,
}: ProgressIndicatorProps) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-center">
      <nav aria-label="Progress">
        <ol className="flex items-center space-x-5">
          {steps.map((step, stepIdx) => {
            const isCompleted = completedSteps.includes(step);
            const isCurrent = step === currentStep;
            const isPast = step < currentStep;

            return (
              <li key={step}>
                <div className="flex items-center">
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full border-2',
                      {
                        'border-orange-600 bg-orange-600 text-white': isCurrent,
                        'border-green-600 bg-green-600 text-white':
                          isCompleted || isPast,
                        'border-gray-300 bg-white text-gray-500':
                          !isCurrent && !isCompleted && !isPast,
                      }
                    )}
                  >
                    {isCompleted || isPast ? (
                      <Check className="h-6 w-6" />
                    ) : (
                      <span className="text-sm font-medium">{step}</span>
                    )}
                  </div>

                  {stepIdx < steps.length - 1 && (
                    <div
                      className={cn('ml-5 h-0.5 w-16', {
                        'bg-green-600': isPast,
                        'bg-gray-300': !isPast,
                      })}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}

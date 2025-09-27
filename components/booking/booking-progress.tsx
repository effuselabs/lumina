'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export interface BookingStep {
  id: string;
  title: string;
  description: string;
}

interface BookingProgressProps {
  steps: BookingStep[];
  currentStep: string;
  completedSteps: string[];
  className?: string;
}

export function BookingProgress({
  steps,
  currentStep,
  completedSteps,
  className,
}: BookingProgressProps) {
  const currentStepIndex = steps.findIndex(step => step.id === currentStep);

  return (
    <div className={cn('w-full', className)}>
      {/* Mobile Progress Bar */}
      <div className="mb-6 sm:hidden">
        <div className="mb-2 flex items-center justify-between text-sm text-gray-600">
          <span>
            Step {currentStepIndex + 1} of {steps.length}
          </span>
          <span>
            {Math.round(((currentStepIndex + 1) / steps.length) * 100)}%
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)] transition-all duration-300"
            style={{
              width: `${((currentStepIndex + 1) / steps.length) * 100}%`,
            }}
          />
        </div>
        <div className="mt-3">
          <h3 className="font-medium text-gray-900">
            {steps[currentStepIndex]?.title}
          </h3>
          <p className="text-sm text-gray-600">
            {steps[currentStepIndex]?.description}
          </p>
        </div>
      </div>

      {/* Desktop Step Indicator */}
      <div className="hidden sm:block">
        <nav aria-label="Progress">
          <ol className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isCompleted = completedSteps.includes(step.id);
              const isCurrent = step.id === currentStep;
              const isUpcoming = !isCompleted && !isCurrent;

              return (
                <li key={step.id} className="flex-1">
                  <div className="flex items-center">
                    {/* Step Circle */}
                    <div className="flex items-center justify-center">
                      <div
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-all duration-200',
                          {
                            'border-transparent text-white': isCompleted,
                            'border-[var(--brand-primary)] text-[var(--brand-accent)]':
                              isCurrent,
                            'border-gray-300 text-gray-500': isUpcoming,
                          }
                        )}
                        style={{
                          backgroundColor: isCompleted
                            ? 'var(--brand-primary)'
                            : isCurrent
                              ? 'transparent'
                              : 'transparent',
                        }}
                      >
                        {isCompleted ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <span>{index + 1}</span>
                        )}
                      </div>
                    </div>

                    {/* Step Content */}
                    <div className="ml-3 flex-1">
                      <p
                        className={cn(
                          'text-sm font-medium transition-colors duration-200',
                          {
                            'text-gray-900': isCompleted || isCurrent,
                            'text-gray-500': isUpcoming,
                          }
                        )}
                      >
                        {step.title}
                      </p>
                      <p
                        className={cn(
                          'text-xs transition-colors duration-200',
                          {
                            'text-gray-600': isCompleted || isCurrent,
                            'text-gray-400': isUpcoming,
                          }
                        )}
                      >
                        {step.description}
                      </p>
                    </div>

                    {/* Connector Line */}
                    {index < steps.length - 1 && (
                      <div className="ml-4 flex-1">
                        <div
                          className={cn(
                            'h-0.5 transition-colors duration-200',
                            {
                              'bg-[var(--brand-primary)]': isCompleted,
                              'bg-gray-300': !isCompleted,
                            }
                          )}
                        />
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
    </div>
  );
}

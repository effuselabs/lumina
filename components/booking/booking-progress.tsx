'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface BookingProgressProps {
    currentStep: number;
    steps: Array<{
        id: number;
        name: string;
        description?: string;
    }>;
    className?: string;
}

/**
 * Booking Progress Component
 * 
 * Shows the current step in the booking process with visual indicators
 */
export function BookingProgress({ currentStep, steps, className }: BookingProgressProps) {
    return (
        <nav aria-label="Booking progress" className={cn('mb-8', className)}>
            <ol className="flex items-center justify-center space-x-4 sm:space-x-8">
                {steps.map((step, stepIdx) => (
                    <li key={step.id} className="flex items-center">
                        <div className="flex items-center space-x-3">
                            <div
                                className={cn(
                                    'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-all duration-200',
                                    step.id < currentStep
                                        ? 'border-lumina-gold bg-lumina-gold text-white'
                                        : step.id === currentStep
                                            ? 'border-lumina-gold bg-white text-lumina-gold ring-2 ring-lumina-gold ring-offset-2'
                                            : 'border-neutral-300 bg-white text-neutral-500'
                                )}
                                aria-current={step.id === currentStep ? 'step' : undefined}
                            >
                                {step.id < currentStep ? (
                                    <Check className="h-4 w-4" aria-hidden="true" />
                                ) : (
                                    <span>{step.id}</span>
                                )}
                            </div>
                            <div className="hidden sm:block">
                                <p
                                    className={cn(
                                        'text-sm font-medium transition-colors duration-200',
                                        step.id <= currentStep ? 'text-deep-teal' : 'text-neutral-500'
                                    )}
                                >
                                    {step.name}
                                </p>
                                {step.description && (
                                    <p className="text-xs text-neutral-400">{step.description}</p>
                                )}
                            </div>
                        </div>
                        {stepIdx < steps.length - 1 && (
                            <div
                                className={cn(
                                    'ml-4 h-0.5 w-8 sm:w-16 transition-colors duration-200',
                                    step.id < currentStep ? 'bg-lumina-gold' : 'bg-neutral-300'
                                )}
                                aria-hidden="true"
                            />
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}

// Default booking steps
export const defaultBookingSteps = [
    { id: 1, name: 'Service', description: 'Choose service' },
    { id: 2, name: 'Time', description: 'Select date & time' },
    { id: 3, name: 'Details', description: 'Your information' },
    { id: 4, name: 'Confirm', description: 'Review & book' },
];
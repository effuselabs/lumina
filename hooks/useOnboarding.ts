'use client';

import type { BusinessProfile } from '@/lib/validations/business';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

interface OnboardingState {
  currentStep: number;
  data: Partial<BusinessProfile>;
  isLoading: boolean;
  errors: Record<string, string>;
}

interface UseOnboardingReturn {
  state: OnboardingState;
  nextStep: () => void;
  prevStep: () => void;
  updateData: (stepData: Partial<BusinessProfile>) => void;
  submitOnboarding: () => Promise<void>;
  resetOnboarding: () => void;
}

const TOTAL_STEPS = 5;

const initialState: OnboardingState = {
  currentStep: 1,
  data: {},
  isLoading: false,
  errors: {},
};

export function useOnboarding(): UseOnboardingReturn {
  const [state, setState] = useState<OnboardingState>(initialState);
  const router = useRouter();

  const nextStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, TOTAL_STEPS),
      errors: {},
    }));
  }, []);

  const prevStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 1),
      errors: {},
    }));
  }, []);

  const updateData = useCallback((stepData: Partial<BusinessProfile>) => {
    setState(prev => ({
      ...prev,
      data: { ...prev.data, ...stepData },
      errors: {},
    }));
  }, []);

  const submitOnboarding = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, errors: {} }));

    try {
      const response = await fetch('/api/business', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(state.data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create business');
      }

      const { business } = await response.json();

      toast.success('Business profile created successfully!');

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Onboarding error:', error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to create business profile';

      toast.error(errorMessage);

      setState(prev => ({
        ...prev,
        errors: { submit: errorMessage },
      }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.data, router]);

  const resetOnboarding = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    state,
    nextStep,
    prevStep,
    updateData,
    submitOnboarding,
    resetOnboarding,
  };
}

// Helper function to get step progress percentage
export function getStepProgress(currentStep: number): number {
  return (currentStep / TOTAL_STEPS) * 100;
}

// Helper function to check if step is completed
export function isStepCompleted(
  step: number,
  data: Partial<BusinessProfile>
): boolean {
  switch (step) {
    case 1: // Basic Info
      return !!(data.name && data.name.length >= 2);
    case 2: // Address
      return !!(data.address && data.city && data.state && data.zipCode);
    case 3: // Financial Model
      return !!data.financialModel;
    case 4: // Settings
      return true; // Settings have defaults, so always considered complete
    case 5: // Operating Hours
      return true; // Operating hours have defaults, so always considered complete
    default:
      return false;
  }
}

// Helper function to get step title
export function getStepTitle(step: number): string {
  switch (step) {
    case 1:
      return 'Business Information';
    case 2:
      return 'Location & Contact';
    case 3:
      return 'Financial Model';
    case 4:
      return 'Booking Settings';
    case 5:
      return 'Operating Hours';
    default:
      return 'Unknown Step';
  }
}

// Helper function to get step description
export function getStepDescription(step: number): string {
  switch (step) {
    case 1:
      return 'Tell us about your business';
    case 2:
      return 'Where are you located?';
    case 3:
      return 'How do you pay your staff?';
    case 4:
      return 'Configure your booking preferences';
    case 5:
      return 'When are you open?';
    default:
      return '';
  }
}

'use client';

import { ProgressIndicator } from '@/components/onboarding/progress-indicator';
import { AddressStep } from '@/components/onboarding/steps/address-step';
import { BasicInfoStep } from '@/components/onboarding/steps/basic-info-step';
import { FinancialModelStep } from '@/components/onboarding/steps/financial-model-step';
import { OperatingHoursStep } from '@/components/onboarding/steps/operating-hours-step';
import { SettingsStep } from '@/components/onboarding/steps/settings-step';
import { PageHeader } from '@/components/ui/page-header';
import {
  getStepDescription,
  getStepTitle,
  isStepCompleted,
  useOnboarding,
} from '@/hooks/useOnboarding';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Toaster } from 'sonner';

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { state, nextStep, prevStep, updateData, submitOnboarding } =
    useOnboarding();

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const handleStepNext = (stepData: Record<string, unknown>) => {
    updateData(stepData);
    if (state.currentStep === 5) {
      // Last step - submit the onboarding
      submitOnboarding();
    } else {
      nextStep();
    }
  };

  const completedSteps = Array.from(
    { length: state.currentStep - 1 },
    (_, i) => i + 1
  ).filter(step => isStepCompleted(step, state.data));

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-orange-100">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <PageHeader
            title="Welcome to Lumina"
            description="Let's set up your business profile to get started"
            variant="compact"
            className="mb-6 text-center"
          />

          <ProgressIndicator
            currentStep={state.currentStep}
            totalSteps={5}
            completedSteps={completedSteps}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Step Header */}
        <div className="mb-8 text-center">
          <h2 className="mb-2 text-2xl font-semibold text-gray-900">
            {getStepTitle(state.currentStep)}
          </h2>
          <p className="text-gray-600">
            {getStepDescription(state.currentStep)}
          </p>
        </div>

        {/* Step Content */}
        <div className="mb-8">
          {state.currentStep === 1 && (
            <BasicInfoStep data={state.data} onNext={handleStepNext} />
          )}

          {state.currentStep === 2 && (
            <AddressStep
              data={state.data}
              onNext={handleStepNext}
              onPrevious={prevStep}
            />
          )}

          {state.currentStep === 3 && (
            <FinancialModelStep
              data={state.data}
              onNext={handleStepNext}
              onPrevious={prevStep}
            />
          )}

          {state.currentStep === 4 && (
            <SettingsStep
              data={state.data}
              onNext={handleStepNext}
              onPrevious={prevStep}
            />
          )}

          {state.currentStep === 5 && (
            <OperatingHoursStep
              data={state.data}
              onNext={handleStepNext}
              onPrevious={prevStep}
            />
          )}
        </div>

        {/* Loading State */}
        {state.isLoading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="rounded-lg bg-white p-6 text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
              <p className="font-medium text-gray-900">
                Creating your business profile...
              </p>
              <p className="mt-1 text-sm text-gray-600">
                This will just take a moment
              </p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {state.errors.submit && (
          <div className="mx-auto mt-4 max-w-2xl">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-800">{state.errors.submit}</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-12 border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <div className="text-center text-sm text-gray-600">
            <p>
              Need help? Contact our support team at{' '}
              <a
                href="mailto:support@uselumina.app"
                className="text-orange-600 hover:text-orange-700"
              >
                support@uselumina.app
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

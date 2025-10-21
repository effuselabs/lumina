'use client';

import { Service } from '@/types/service-selection';
import { useState } from 'react';
import { BookingConfirmationStep } from './booking-confirmation-step';
import { BookingContainer } from './booking-container';
import { BookingErrorBoundary } from './booking-error-boundary';
import { BookingStep } from './booking-progress';
import ClientInformationForm, { type ClientFormData } from './client-information-form';
import { ServiceSelection } from './service-selection';
import { StaffTimeSelection, type TimeSlot } from './staff-time-selection';

interface BookingInterfaceProps {
  businessId: string;
}

const BOOKING_STEPS: BookingStep[] = [
  {
    id: 'services',
    title: 'Select Services',
    description: 'Choose your desired services',
  },
  {
    id: 'datetime',
    title: 'Date & Time',
    description: 'Pick your preferred slot',
  },
  {
    id: 'details',
    title: 'Your Details',
    description: 'Provide contact information',
  },
  {
    id: 'confirmation',
    title: 'Confirmation',
    description: 'Review and confirm booking',
  },
];

export function BookingInterface({ businessId }: BookingInterfaceProps) {
  const [currentStep, setCurrentStep] = useState('services');
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<
    TimeSlot | undefined
  >();
  const [clientData, setClientData] = useState<
    (ClientFormData & { isNewClient: boolean }) | undefined
  >();
  const [isBookingLoading, setIsBookingLoading] = useState(false);

  const handleNext = () => {
    const currentIndex = BOOKING_STEPS.findIndex(
      step => step.id === currentStep
    );
    if (currentIndex < BOOKING_STEPS.length - 1) {
      setCurrentStep(BOOKING_STEPS[currentIndex + 1].id);
    }
  };

  const handleBack = () => {
    const currentIndex = BOOKING_STEPS.findIndex(
      step => step.id === currentStep
    );
    if (currentIndex > 0) {
      setCurrentStep(BOOKING_STEPS[currentIndex - 1].id);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'services':
        return (
          <ServiceSelection
            businessId={businessId}
            onServicesSelect={services => {
              setSelectedServices(services);
            }}
            selectedServices={selectedServices}
            onNext={selectedServices.length > 0 ? handleNext : undefined}
          />
        );

      case 'datetime':
        return (
          <StaffTimeSelection
            businessId={businessId}
            selectedServices={selectedServices}
            onSlotSelect={setSelectedTimeSlot}
            selectedSlot={selectedTimeSlot}
            onNext={selectedTimeSlot ? handleNext : undefined}
            onBack={handleBack}
          />
        );

      case 'details':
        return (
          <ClientInformationForm
            businessId={businessId}
            onSubmit={(data) => {
              setClientData(data);
              handleNext();
            }}
            onBack={handleBack}
            isLoading={isBookingLoading}
            initialData={clientData}
          />
        );

      case 'confirmation':
        if (!selectedServices.length || !selectedTimeSlot || !clientData) {
          return (
            <div className="py-12 text-center">
              <h2 className="mb-4 text-2xl font-bold text-gray-900">
                Missing Information
              </h2>
              <p className="mb-8 text-gray-600">
                Please complete all previous steps before confirming your booking.
              </p>
            </div>
          );
        }

        return (
          <BookingConfirmationStep
            businessId={businessId}
            selectedServices={selectedServices}
            selectedTimeSlot={selectedTimeSlot}
            clientData={clientData}
            onBack={handleBack}
            onNewBooking={() => {
              // Reset the booking flow
              setCurrentStep('services');
              setSelectedServices([]);
              setSelectedTimeSlot(undefined);
              setClientData(undefined);
              setIsBookingLoading(false);
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <BookingErrorBoundary>
      <BookingContainer
        currentStep={currentStep}
        steps={BOOKING_STEPS}
        onNext={handleNext}
        onBack={handleBack}
        className="mx-auto max-w-2xl"
      >
        {renderStepContent()}
      </BookingContainer>
    </BookingErrorBoundary>
  );
}

'use client';

import { Service } from '@/types/service-selection';
import { useState } from 'react';
import { BookingContainer } from './booking-container';
import { BookingStep } from './booking-progress';
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
          <div className="py-12 text-center">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              Your Information
            </h2>
            <p className="mb-8 text-gray-600">
              This step will be implemented in task 6: Client Information Form
              and Validation
            </p>
            <div className="mx-auto max-w-md rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-800">
                The client form will collect contact information with validation
                and support for returning customer recognition.
              </p>
            </div>
          </div>
        );

      case 'confirmation':
        return (
          <div className="py-12 text-center">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              Booking Confirmation
            </h2>
            <p className="mb-8 text-gray-600">
              This step will be implemented in task 7: Booking Creation and
              Confirmation System
            </p>
            <div className="mx-auto max-w-md rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-800">
                The confirmation system will create the appointment and send
                confirmation emails with booking details.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <BookingContainer
      currentStep={currentStep}
      steps={BOOKING_STEPS}
      onNext={handleNext}
      onBack={handleBack}
      className="mx-auto max-w-2xl"
    >
      {renderStepContent()}
    </BookingContainer>
  );
}

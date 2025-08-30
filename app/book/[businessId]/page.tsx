'use client'

import { BookingConfirmation } from '@/components/booking/booking-confirmation'
import { CustomerForm } from '@/components/booking/customer-form'
import { DateTimePicker } from '@/components/booking/date-time-picker'
import { ServiceSelection } from '@/components/booking/service-selection'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useState } from 'react'

interface Service {
    id: string
    name: string
    description?: string
    category?: string
    price: number
    duration: number
}

interface TimeSlot {
    startTime: string
    endTime: string
    displayTime: string
}

interface BookingStep {
    service?: Service
    staffId?: string
    staffName?: string
    slot?: TimeSlot
}

type BookingStepType = 'service' | 'datetime' | 'customer' | 'confirmation'

interface CustomerData {
    firstName: string
    lastName: string
    email: string
    phone?: string
    notes?: string
}

export default function BookingPage() {
    const params = useParams()
    const businessId = params.businessId as string

    const [currentStep, setCurrentStep] = useState<BookingStepType>('service')
    const [bookingData, setBookingData] = useState<BookingStep>({})
    const [customerData, setCustomerData] = useState<CustomerData | null>(null)
    const [confirmedBooking, setConfirmedBooking] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const steps: { key: BookingStepType; title: string; description: string }[] = [
        { key: 'service', title: 'Select Service', description: 'Choose your desired service' },
        { key: 'datetime', title: 'Date & Time', description: 'Pick your preferred date and time' },
        { key: 'customer', title: 'Your Details', description: 'Provide your contact information' },
        { key: 'confirmation', title: 'Confirmation', description: 'Your booking is confirmed' },
    ]

    const currentStepIndex = steps.findIndex(step => step.key === currentStep)

    const handleServiceSelect = (service: Service) => {
        setBookingData(prev => ({ ...prev, service }))
        setCurrentStep('datetime')
    }

    const handleSlotSelect = (staffId: string, slot: TimeSlot, staffName: string) => {
        setBookingData(prev => ({ ...prev, staffId, slot, staffName }))
    }

    const handleDateTimeNext = () => {
        if (bookingData.staffId && bookingData.slot) {
            setCurrentStep('customer')
        }
    }

    const handleCustomerSubmit = async (data: CustomerData) => {
        if (!bookingData.service || !bookingData.staffId || !bookingData.slot) {
            setError('Missing booking information')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/booking/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    businessId,
                    serviceId: bookingData.service.id,
                    staffId: bookingData.staffId,
                    startTime: bookingData.slot.startTime,
                    endTime: bookingData.slot.endTime,
                    client: {
                        firstName: data.firstName,
                        lastName: data.lastName,
                        email: data.email,
                        phone: data.phone,
                    },
                    notes: data.notes,
                }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to create booking')
            }

            const result = await response.json()
            setConfirmedBooking(result.appointment)
            setCustomerData(data)
            setCurrentStep('confirmation')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create booking')
        } finally {
            setLoading(false)
        }
    }

    const handleBack = () => {
        const stepOrder: BookingStepType[] = ['service', 'datetime', 'customer', 'confirmation']
        const currentIndex = stepOrder.indexOf(currentStep)
        if (currentIndex > 0) {
            setCurrentStep(stepOrder[currentIndex - 1])
        }
    }

    const handleNewBooking = () => {
        setCurrentStep('service')
        setBookingData({})
        setCustomerData(null)
        setConfirmedBooking(null)
        setError(null)
    }

    const canGoBack = currentStep !== 'service' && currentStep !== 'confirmation'
    const canGoNext = currentStep === 'datetime' && bookingData.staffId && bookingData.slot

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Progress Steps */}
                {currentStep !== 'confirmation' && (
                    <div className="mb-8">
                        <div className="flex items-center justify-between">
                            {steps.slice(0, -1).map((step, index) => (
                                <div key={step.key} className="flex items-center">
                                    <div
                                        className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${index <= currentStepIndex
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-200 text-gray-600'
                                            }`}
                                    >
                                        {index + 1}
                                    </div>
                                    <div className="ml-3">
                                        <p className={`text-sm font-medium ${index <= currentStepIndex ? 'text-blue-600' : 'text-gray-500'
                                            }`}>
                                            {step.title}
                                        </p>
                                        <p className="text-xs text-gray-500">{step.description}</p>
                                    </div>
                                    {index < steps.length - 2 && (
                                        <div className={`flex-1 h-0.5 mx-4 ${index < currentStepIndex ? 'bg-blue-600' : 'bg-gray-200'
                                            }`} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-red-600">{error}</p>
                    </div>
                )}

                {/* Step Content */}
                <div className="bg-white rounded-lg shadow-sm">
                    <div className="p-6">
                        {currentStep === 'service' && (
                            <ServiceSelection
                                businessId={businessId}
                                onServiceSelect={handleServiceSelect}
                                selectedServiceId={bookingData.service?.id}
                            />
                        )}

                        {currentStep === 'datetime' && bookingData.service && (
                            <DateTimePicker
                                businessId={businessId}
                                service={bookingData.service}
                                onSlotSelect={handleSlotSelect}
                                selectedSlot={
                                    bookingData.staffId && bookingData.slot && bookingData.staffName
                                        ? {
                                            staffId: bookingData.staffId,
                                            slot: bookingData.slot,
                                            staffName: bookingData.staffName,
                                        }
                                        : undefined
                                }
                            />
                        )}

                        {currentStep === 'customer' &&
                            bookingData.service &&
                            bookingData.staffId &&
                            bookingData.slot &&
                            bookingData.staffName && (
                                <CustomerForm
                                    businessId={businessId}
                                    bookingDetails={{
                                        service: bookingData.service,
                                        staffId: bookingData.staffId,
                                        staffName: bookingData.staffName,
                                        slot: bookingData.slot,
                                    }}
                                    onSubmit={handleCustomerSubmit}
                                    loading={loading}
                                />
                            )}

                        {currentStep === 'confirmation' && confirmedBooking && (
                            <BookingConfirmation
                                booking={confirmedBooking}
                                onNewBooking={handleNewBooking}
                            />
                        )}
                    </div>

                    {/* Navigation */}
                    {currentStep !== 'confirmation' && (
                        <div className="px-6 py-4 bg-gray-50 border-t flex justify-between">
                            <Button
                                variant="outline"
                                onClick={handleBack}
                                disabled={!canGoBack}
                                className="flex items-center space-x-2"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                <span>Back</span>
                            </Button>

                            {currentStep === 'datetime' && (
                                <Button
                                    onClick={handleDateTimeNext}
                                    disabled={!canGoNext}
                                    className="flex items-center space-x-2"
                                >
                                    <span>Continue</span>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
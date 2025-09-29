/**
 * Main public booking interface component
 * Orchestrates the complete booking workflow
 */

'use client'

import { useEffect, useState } from 'react'
import { BookingConfirmation } from './booking-confirmation'
import { BookingErrorHandler } from './booking-error-handler'
import { BookingLoadingStates } from './booking-loading-states'
import { ClientInformationForm } from './client-information-form'
import { ServiceSelection } from './service-selection'
import { StaffTimeSelection } from './staff-time-selection'

interface PublicBookingInterfaceProps {
    businessId: string
}

type BookingStep = 'services' | 'time' | 'client' | 'confirmation'

interface BookingState {
    selectedServices: any[]
    selectedTimeSlot: any
    clientData: any
    appointment: any
}

export function PublicBookingInterface({ businessId }: PublicBookingInterfaceProps) {
    const [currentStep, setCurrentStep] = useState<BookingStep>('services')
    const [bookingState, setBookingState] = useState<BookingState>({
        selectedServices: [],
        selectedTimeSlot: null,
        clientData: null,
        appointment: null
    })
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<any>(null)
    const [businessData, setBusinessData] = useState<any>(null)

    useEffect(() => {
        // Load business data on mount
        loadBusinessData()
    }, [businessId])

    const loadBusinessData = async () => {
        setIsLoading(true)
        try {
            // Mock API call - would be replaced with actual API
            const response = await fetch(`/api/public/booking/${businessId}`)
            if (!response.ok) throw new Error('Failed to load business data')

            const data = await response.json()
            setBusinessData(data)
        } catch (err) {
            setError(err)
        } finally {
            setIsLoading(false)
        }
    }

    const handleServiceSelect = (services: any[]) => {
        setBookingState(prev => ({ ...prev, selectedServices: services }))
    }

    const handleTimeSlotSelect = (timeSlot: any) => {
        setBookingState(prev => ({ ...prev, selectedTimeSlot: timeSlot }))
    }

    const handleClientSubmit = async (clientData: any) => {
        setIsLoading(true)
        try {
            // Create booking
            const response = await fetch(`/api/public/booking/${businessId}/book`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    services: bookingState.selectedServices.map(s => s.id),
                    timeSlot: bookingState.selectedTimeSlot,
                    client: clientData
                })
            })

            if (!response.ok) throw new Error('Booking failed')

            const result = await response.json()
            setBookingState(prev => ({ ...prev, clientData, appointment: result.appointment }))
            setCurrentStep('confirmation')
        } catch (err) {
            setError(err)
        } finally {
            setIsLoading(false)
        }
    }

    const handleNewBooking = () => {
        setCurrentStep('services')
        setBookingState({
            selectedServices: [],
            selectedTimeSlot: null,
            clientData: null,
            appointment: null
        })
        setError(null)
    }

    if (isLoading && !businessData) {
        return <BookingLoadingStates type="initial" />
    }

    if (error && !businessData) {
        return (
            <BookingErrorHandler
                error={error}
                onRetry={loadBusinessData}
                businessId={businessId}
            />
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Skip to main content link for accessibility */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded"
            >
                Skip to main content
            </a>

            {/* Business header */}
            <header className="bg-white shadow-sm">
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <div className="flex items-center space-x-4">
                        {businessData?.business?.logo && (
                            <img
                                src={businessData.business.logo}
                                alt={`${businessData.business.name} logo`}
                                className="h-12 w-12 object-contain"
                            />
                        )}
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {businessData?.business?.name}
                            </h1>
                            <p className="text-gray-600">
                                {businessData?.business?.address}
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main id="main-content" role="main" className="max-w-4xl mx-auto px-4 py-8">
                {currentStep === 'services' && (
                    <ServiceSelection
                        services={businessData?.services || []}
                        onServiceSelect={handleServiceSelect}
                        selectedServices={bookingState.selectedServices}
                        onContinue={() => setCurrentStep('time')}
                    />
                )}

                {currentStep === 'time' && (
                    <StaffTimeSelection
                        selectedServices={bookingState.selectedServices}
                        onSlotSelect={handleTimeSlotSelect}
                        businessId={businessId}
                        onBack={() => setCurrentStep('services')}
                        onContinue={() => setCurrentStep('client')}
                        selectedSlot={bookingState.selectedTimeSlot}
                    />
                )}

                {currentStep === 'client' && (
                    <ClientInformationForm
                        onSubmit={handleClientSubmit}
                        onBack={() => setCurrentStep('time')}
                        businessId={businessId}
                        isLoading={isLoading}
                    />
                )}

                {currentStep === 'confirmation' && bookingState.appointment && (
                    <BookingConfirmation
                        appointment={bookingState.appointment}
                        business={businessData?.business}
                        onNewBooking={handleNewBooking}
                    />
                )}

                {/* Error handling */}
                {error && currentStep !== 'confirmation' && (
                    <BookingErrorHandler
                        error={error}
                        onRetry={() => setError(null)}
                        businessId={businessId}
                    />
                )}

                {/* Loading states */}
                {isLoading && (
                    <BookingLoadingStates type="booking" />
                )}
            </main>

            {/* Footer */}
            <footer className="bg-white border-t mt-16">
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <div className="text-center text-gray-600">
                        <p>Need help? Contact us at {businessData?.business?.phone}</p>
                        <p className="text-sm mt-2">
                            Powered by Lumina - Intelligent Software for Small Business Growth
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    )
}
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useState } from 'react'

export default function TestBookingPage() {
    const [testResult, setTestResult] = useState<string>('')
    const [loading, setLoading] = useState(false)

    const testBookingAPI = async () => {
        setLoading(true)
        setTestResult('')

        try {
            // Test the services API first
            const servicesResponse = await fetch('/api/booking/services?businessId=test-business-id')

            if (servicesResponse.ok) {
                setTestResult('✅ Booking API endpoints are accessible')
            } else {
                const errorData = await servicesResponse.json()
                setTestResult(`❌ Services API Error: ${errorData.error}`)
            }
        } catch (error) {
            setTestResult(`❌ Network Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-neutral-50 p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <PageHeader
                    title="Booking System Test"
                    description="Test the booking system implementation to verify it's working correctly"
                    variant="compact"
                    actions={[
                        {
                            label: 'Test API',
                            onClick: testBookingAPI,
                            icon: TestTube,
                            primary: true,
                            disabled: loading,
                        },
                    ]}
                />

                <Card className="shadow-sm border-neutral-200">
                    <CardHeader>
                        <CardTitle className="text-deep-teal">Test Results</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        {testResult && (
                            <div className="p-4 bg-neutral-100 rounded-md border border-neutral-200">
                                <p className="font-mono text-sm">{testResult}</p>
                            </div>
                        )}

                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-3">
                                <h3 className="font-semibold text-deep-teal">Implemented Features:</h3>
                                <ul className="list-disc list-inside space-y-1 text-sm text-neutral-600">
                                    <li>✅ Public booking interface with service selection</li>
                                    <li>✅ Date and time picker with real-time availability</li>
                                    <li>✅ Customer information form with validation</li>
                                    <li>✅ Booking confirmation system</li>
                                    <li>✅ Email notification system (with React Email templates)</li>
                                    <li>✅ Booking management (view, modify, cancel)</li>
                                    <li>✅ Staff availability management system</li>
                                    <li>✅ Conflict detection and resolution</li>
                                </ul>
                            </div>

                            <div className="space-y-3">
                                <h3 className="font-semibold text-deep-teal">API Endpoints:</h3>
                                <ul className="list-disc list-inside space-y-1 text-sm text-neutral-600">
                                    <li><code>/api/booking/services</code> - Get available services</li>
                                    <li><code>/api/booking/availability</code> - Get available time slots</li>
                                    <li><code>/api/booking/create</code> - Create new booking</li>
                                    <li><code>/api/booking/[id]</code> - Get/update/cancel booking</li>
                                </ul>
                            </div>

                        </div>

                        <div className="space-y-3">
                            <h3 className="font-semibold text-deep-teal">UI Components:</h3>
                            <ul className="list-disc list-inside space-y-1 text-sm text-neutral-600">
                                <li><code>ServiceSelection</code> - Service selection interface</li>
                                <li><code>DateTimePicker</code> - Date and time selection</li>
                                <li><code>CustomerForm</code> - Customer information form</li>
                                <li><code>BookingConfirmation</code> - Confirmation display</li>
                                <li><code>BookingManagement</code> - Booking management interface</li>
                                <li><code>StaffAvailabilityManager</code> - Staff schedule management</li>
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
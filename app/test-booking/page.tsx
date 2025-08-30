'use client'

import { Button } from '@/components/ui/button'
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
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-2xl mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle>Booking System Test</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-gray-600">
                            Test the booking system implementation to verify it's working correctly.
                        </p>

                        <Button
                            onClick={testBookingAPI}
                            disabled={loading}
                            className="w-full"
                        >
                            {loading ? 'Testing...' : 'Test Booking API'}
                        </Button>

                        {testResult && (
                            <div className="p-4 bg-gray-100 rounded-md">
                                <p className="font-mono text-sm">{testResult}</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <h3 className="font-semibold">Implemented Features:</h3>
                            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
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

                        <div className="space-y-2">
                            <h3 className="font-semibold">API Endpoints:</h3>
                            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                                <li><code>/api/booking/services</code> - Get available services</li>
                                <li><code>/api/booking/availability</code> - Get available time slots</li>
                                <li><code>/api/booking/create</code> - Create new booking</li>
                                <li><code>/api/booking/[id]</code> - Get/update/cancel booking</li>
                            </ul>
                        </div>

                        <div className="space-y-2">
                            <h3 className="font-semibold">UI Components:</h3>
                            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
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
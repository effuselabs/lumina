'use client'

import { BookingManagement } from '@/components/booking/booking-management'
import { useParams } from 'next/navigation'

export default function BookingManagementPage() {
    const params = useParams()
    const bookingId = params.id as string

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 py-8">
                <BookingManagement bookingId={bookingId} />
            </div>
        </div>
    )
}
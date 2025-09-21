'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { addDays, format, isBefore, startOfDay } from 'date-fns'
import { CalendarDays, Clock, User } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Service {
    id: string
    name: string
    duration: number
    price: number
}

interface TimeSlot {
    startTime: string
    endTime: string
    displayTime: string
}

interface StaffAvailability {
    staffId: string
    staffName: string
    slots: TimeSlot[]
}

interface AvailabilityData {
    service: Service
    availableSlots: StaffAvailability[]
}

interface DateTimePickerProps {
    businessId: string
    service: Service
    onSlotSelect: (staffId: string, slot: TimeSlot, staffName: string) => void
    selectedSlot?: { staffId: string; slot: TimeSlot; staffName: string }
}

export function DateTimePicker({ businessId, service, onSlotSelect, selectedSlot }: DateTimePickerProps) {
    const [selectedDate, setSelectedDate] = useState<Date>()
    const [availability, setAvailability] = useState<AvailabilityData | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Set default date to today
    useEffect(() => {
        const today = new Date()
        setSelectedDate(today)
    }, [])

    // Fetch availability when date or service changes
    useEffect(() => {
        if (selectedDate && service) {
            fetchAvailability(selectedDate)
        }
    }, [selectedDate, service, businessId])

    const fetchAvailability = async (date: Date) => {
        try {
            setLoading(true)
            setError(null)

            const dateString = format(date, 'yyyy-MM-dd')
            const response = await fetch(
                `/api/booking/availability?businessId=${businessId}&serviceId=${service.id}&date=${dateString}`
            )

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to fetch availability')
            }

            const data = await response.json()
            setAvailability(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load availability')
            setAvailability(null)
        } finally {
            setLoading(false)
        }
    }

    const handleDateSelect = (date: Date | undefined) => {
        if (date) {
            setSelectedDate(date)
        }
    }

    const handleSlotSelect = (staffId: string, slot: TimeSlot, staffName: string) => {
        onSlotSelect(staffId, slot, staffName)
    }

    const isDateDisabled = (date: Date) => {
        // Disable past dates
        return isBefore(date, startOfDay(new Date()))
    }

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(price)
    }

    const formatDuration = (minutes: number) => {
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60

        if (hours > 0 && mins > 0) {
            return `${hours}h ${mins}m`
        } else if (hours > 0) {
            return `${hours}h`
        } else {
            return `${mins}m`
        }
    }

    return (
        <div className="space-y-6">
            {/* Service Summary */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <span>{service.name}</span>
                    </CardTitle>
                    <CardDescription className="flex items-center space-x-4">
                        <Badge variant="secondary" className="flex items-center space-x-1">
                            <span>{formatPrice(service.price)}</span>
                        </Badge>
                        <Badge variant="outline" className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatDuration(service.duration)}</span>
                        </Badge>
                    </CardDescription>
                </CardHeader>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Calendar */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <CalendarDays className="h-5 w-5" />
                            <span>Select Date</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={handleDateSelect}
                            disabled={isDateDisabled}
                            className="rounded-md border"
                            fromDate={new Date()}
                            toDate={addDays(new Date(), 90)} // Allow booking up to 90 days in advance
                        />
                    </CardContent>
                </Card>

                {/* Time Slots */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <Clock className="h-5 w-5" />
                            <span>Available Times</span>
                        </CardTitle>
                        {selectedDate && (
                            <CardDescription>
                                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                            </CardDescription>
                        )}
                    </CardHeader>
                    <CardContent>
                        {!selectedDate && (
                            <p className="text-gray-500 text-center py-8">
                                Please select a date to see available times
                            </p>
                        )}

                        {selectedDate && loading && (
                            <div className="space-y-2">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="h-10 bg-gray-200 rounded animate-pulse" />
                                ))}
                            </div>
                        )}

                        {selectedDate && error && (
                            <div className="text-center py-8">
                                <p className="text-red-600 mb-4">{error}</p>
                                <Button onClick={() => fetchAvailability(selectedDate)} variant="outline" size="sm">
                                    Try Again
                                </Button>
                            </div>
                        )}

                        {selectedDate && availability && (
                            <div className="space-y-4">
                                {availability.availableSlots.length === 0 ? (
                                    <p className="text-gray-500 text-center py-8">
                                        No available times for this date
                                    </p>
                                ) : (
                                    availability.availableSlots.map((staffAvailability) => (
                                        <div key={staffAvailability.staffId} className="space-y-2">
                                            <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                                                <User className="h-4 w-4" />
                                                <span>{staffAvailability.staffName}</span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                {staffAvailability.slots.map((slot, index) => (
                                                    <Button
                                                        key={index}
                                                        variant={
                                                            selectedSlot?.staffId === staffAvailability.staffId &&
                                                                selectedSlot?.slot.startTime === slot.startTime
                                                                ? "primary"
                                                                : "outline"
                                                        }
                                                        size="sm"
                                                        className="justify-center"
                                                        onClick={() => handleSlotSelect(
                                                            staffAvailability.staffId,
                                                            slot,
                                                            staffAvailability.staffName
                                                        )}
                                                    >
                                                        {slot.displayTime}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { Calendar, CheckCircle, Clock, DollarSign, Mail, MapPin, User } from 'lucide-react'

interface BookingConfirmationData {
    id: string
    startTime: string
    endTime: string
    status: string
    client: {
        firstName: string
        lastName: string
        email: string
    }
    staff: {
        name: string
    }
    service: {
        name: string
        price: number
        duration: number
    }
    business: {
        name: string
    }
}

interface BookingConfirmationProps {
    booking: BookingConfirmationData
    onNewBooking?: () => void
}

export function BookingConfirmation({ booking, onNewBooking }: BookingConfirmationProps) {
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

    const formatDateTime = (dateTimeString: string) => {
        const date = new Date(dateTimeString)
        return {
            date: format(date, 'EEEE, MMMM d, yyyy'),
            time: format(date, 'h:mm a'),
        }
    }

    const { date, time } = formatDateTime(booking.startTime)
    const endTime = format(new Date(booking.endTime), 'h:mm a')

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Success Header */}
            <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-6">
                    <div className="flex items-center space-x-3">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                        <div>
                            <h2 className="text-2xl font-bold text-green-900">
                                Booking Confirmed!
                            </h2>
                            <p className="text-green-700">
                                Your appointment has been successfully scheduled
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Appointment Details */}
            <Card>
                <CardHeader>
                    <CardTitle>Appointment Details</CardTitle>
                    <CardDescription>
                        Confirmation ID: {booking.id}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Business and Service */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <div className="flex items-center space-x-2 text-sm font-medium text-gray-600 mb-1">
                                <MapPin className="h-4 w-4" />
                                <span>Business</span>
                            </div>
                            <p className="font-semibold text-lg">{booking.business.name}</p>
                        </div>

                        <div>
                            <div className="text-sm font-medium text-gray-600 mb-1">Service</div>
                            <p className="font-semibold">{booking.service.name}</p>
                            <div className="flex items-center space-x-2 mt-1">
                                <Badge variant="secondary" className="flex items-center space-x-1">
                                    <DollarSign className="h-3 w-3" />
                                    <span>{formatPrice(booking.service.price)}</span>
                                </Badge>
                                <Badge variant="outline" className="flex items-center space-x-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{formatDuration(booking.service.duration)}</span>
                                </Badge>
                            </div>
                        </div>
                    </div>

                    {/* Date and Time */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <div className="flex items-center space-x-2 text-sm font-medium text-gray-600 mb-1">
                                <Calendar className="h-4 w-4" />
                                <span>Date</span>
                            </div>
                            <p className="font-semibold">{date}</p>
                        </div>

                        <div>
                            <div className="flex items-center space-x-2 text-sm font-medium text-gray-600 mb-1">
                                <Clock className="h-4 w-4" />
                                <span>Time</span>
                            </div>
                            <p className="font-semibold">{time} - {endTime}</p>
                        </div>
                    </div>

                    {/* Staff and Client */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <div className="flex items-center space-x-2 text-sm font-medium text-gray-600 mb-1">
                                <User className="h-4 w-4" />
                                <span>Staff Member</span>
                            </div>
                            <p className="font-semibold">{booking.staff.name}</p>
                        </div>

                        <div>
                            <div className="text-sm font-medium text-gray-600 mb-1">Client</div>
                            <p className="font-semibold">
                                {booking.client.firstName} {booking.client.lastName}
                            </p>
                            <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                                <Mail className="h-3 w-3" />
                                <span>{booking.client.email}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Next Steps */}
            <Card>
                <CardHeader>
                    <CardTitle>What's Next?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-3">
                        <div className="flex items-start space-x-3">
                            <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                            <div>
                                <p className="font-medium">Confirmation Email</p>
                                <p className="text-sm text-gray-600">
                                    A confirmation email has been sent to {booking.client.email} with all the appointment details.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start space-x-3">
                            <Calendar className="h-5 w-5 text-green-600 mt-0.5" />
                            <div>
                                <p className="font-medium">Add to Calendar</p>
                                <p className="text-sm text-gray-600">
                                    Don't forget to add this appointment to your personal calendar so you don't miss it.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start space-x-3">
                            <Clock className="h-5 w-5 text-orange-600 mt-0.5" />
                            <div>
                                <p className="font-medium">Arrive on Time</p>
                                <p className="text-sm text-gray-600">
                                    Please arrive 5-10 minutes early for your appointment to allow time for check-in.
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
                {onNewBooking && (
                    <Button onClick={onNewBooking} variant="outline" className="flex-1">
                        Book Another Appointment
                    </Button>
                )}
                <Button
                    onClick={() => window.print()}
                    variant="outline"
                    className="flex-1"
                >
                    Print Confirmation
                </Button>
            </div>
        </div>
    )
}
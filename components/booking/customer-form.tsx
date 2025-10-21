'use client'

import { BookingProgress } from '@/components/booking/booking-progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Clock, DollarSign, User } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { defaultBookingSteps } from './booking-progress';

const customerFormSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Please enter a valid email address'),
    phone: z.string().optional(),
    notes: z.string().optional(),
})

type CustomerFormData = z.infer<typeof customerFormSchema>

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

interface BookingDetails {
    service: Service
    staffId: string
    staffName: string
    slot: TimeSlot
}

interface CustomerFormProps {
    businessId: string
    bookingDetails: BookingDetails
    onSubmit: (customerData: CustomerFormData) => void
    loading?: boolean
}

export function CustomerForm({ businessId, bookingDetails, onSubmit, loading = false }: CustomerFormProps) {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<CustomerFormData>({
        resolver: zodResolver(customerFormSchema),
    })

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

    const { date, time } = formatDateTime(bookingDetails.slot.startTime)

    return (
        <div className="space-y-8">
            <BookingProgress currentStep="details" steps={defaultBookingSteps} completedSteps={['service', 'staff', 'datetime']} />
            {/* Booking Summary */}
            <Card className="shadow-sm border-neutral-200">
                <CardHeader>
                    <CardTitle className="text-deep-teal">Booking Summary</CardTitle>
                    <CardDescription>
                        Please review your appointment details
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <Label className="text-sm font-medium text-gray-600">Service</Label>
                            <p className="font-medium">{bookingDetails.service.name}</p>
                            <div className="flex items-center space-x-2 mt-1">
                                <Badge variant="secondary" className="flex items-center space-x-1">
                                    <DollarSign className="h-3 w-3" />
                                    <span>{formatPrice(bookingDetails.service.price)}</span>
                                </Badge>
                                <Badge variant="outline" className="flex items-center space-x-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{formatDuration(bookingDetails.service.duration)}</span>
                                </Badge>
                            </div>
                        </div>

                        <div>
                            <Label className="text-sm font-medium text-gray-600">Staff Member</Label>
                            <p className="font-medium flex items-center space-x-2">
                                <User className="h-4 w-4" />
                                <span>{bookingDetails.staffName}</span>
                            </p>
                        </div>

                        <div>
                            <Label className="text-sm font-medium text-gray-600">Date</Label>
                            <p className="font-medium">{date}</p>
                        </div>

                        <div>
                            <Label className="text-sm font-medium text-gray-600">Time</Label>
                            <p className="font-medium">{time}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Customer Information Form */}
            <Card className="shadow-sm border-neutral-200">
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-deep-teal">
                        <User className="h-5 w-5" />
                        <span>Your Information</span>
                    </CardTitle>
                    <CardDescription>
                        Please provide your contact information to complete the booking
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <FormField
                                label="First Name"
                                required
                                error={errors.firstName?.message}
                            >
                                <Input
                                    {...register('firstName')}
                                    placeholder="Enter your first name"
                                />
                            </FormField>

                            <FormField
                                label="Last Name"
                                required
                                error={errors.lastName?.message}
                            >
                                <Input
                                    {...register('lastName')}
                                    placeholder="Enter your last name"
                                />
                            </FormField>
                        </div>

                        <FormField
                            label="Email Address"
                            required
                            error={errors.email?.message}
                            hint="We'll send your appointment confirmation to this email"
                        >
                            <Input
                                type="email"
                                {...register('email')}
                                placeholder="Enter your email address"
                            />
                        </FormField>

                        <FormField
                            label="Phone Number"
                            hint="Optional: For appointment reminders and updates"
                        >
                            <Input
                                type="tel"
                                {...register('phone')}
                                placeholder="Enter your phone number"
                            />
                        </FormField>

                        <FormField
                            label="Special Requests"
                            hint="Any special requests or notes for your appointment"
                        >
                            <Textarea
                                {...register('notes')}
                                placeholder="Any special requests or notes for your appointment..."
                                rows={3}
                            />
                        </FormField>

                        <div className="pt-6 border-t border-neutral-200">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <Button
                                    type="submit"
                                    variant="primary"
                                    className="flex-1"
                                    size="lg"
                                    loading={loading}
                                >
                                    Book Appointment
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="sm:w-auto"
                                    size="lg"
                                    onClick={() => window.history.back()}
                                >
                                    Back to Services
                                </Button>
                            </div>
                            <p className="text-xs text-neutral-500 mt-3 text-center">
                                By booking, you agree to receive appointment confirmations and reminders
                            </p>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
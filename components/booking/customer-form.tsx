'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Clock, DollarSign, Mail, MessageSquare, Phone, User } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

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
        <div className="space-y-6">
            {/* Booking Summary */}
            <Card>
                <CardHeader>
                    <CardTitle>Booking Summary</CardTitle>
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
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
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
                            <div className="space-y-2">
                                <Label htmlFor="firstName">
                                    First Name <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="firstName"
                                    {...register('firstName')}
                                    placeholder="Enter your first name"
                                    className={errors.firstName ? 'border-red-500' : ''}
                                />
                                {errors.firstName && (
                                    <p className="text-sm text-red-600">{errors.firstName.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="lastName">
                                    Last Name <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="lastName"
                                    {...register('lastName')}
                                    placeholder="Enter your last name"
                                    className={errors.lastName ? 'border-red-500' : ''}
                                />
                                {errors.lastName && (
                                    <p className="text-sm text-red-600">{errors.lastName.message}</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email" className="flex items-center space-x-2">
                                <Mail className="h-4 w-4" />
                                <span>Email Address <span className="text-red-500">*</span></span>
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                {...register('email')}
                                placeholder="Enter your email address"
                                className={errors.email ? 'border-red-500' : ''}
                            />
                            {errors.email && (
                                <p className="text-sm text-red-600">{errors.email.message}</p>
                            )}
                            <p className="text-sm text-gray-600">
                                We'll send your appointment confirmation to this email
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone" className="flex items-center space-x-2">
                                <Phone className="h-4 w-4" />
                                <span>Phone Number (Optional)</span>
                            </Label>
                            <Input
                                id="phone"
                                type="tel"
                                {...register('phone')}
                                placeholder="Enter your phone number"
                            />
                            <p className="text-sm text-gray-600">
                                Optional: For appointment reminders and updates
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes" className="flex items-center space-x-2">
                                <MessageSquare className="h-4 w-4" />
                                <span>Special Requests (Optional)</span>
                            </Label>
                            <Textarea
                                id="notes"
                                {...register('notes')}
                                placeholder="Any special requests or notes for your appointment..."
                                rows={3}
                            />
                        </div>

                        <div className="pt-4">
                            <Button
                                type="submit"
                                className="w-full"
                                size="lg"
                                disabled={loading}
                            >
                                {loading ? 'Booking Appointment...' : 'Book Appointment'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
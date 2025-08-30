'use client'

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { format } from 'date-fns'
import { Calendar, Clock, Edit, Mail, Phone, User, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

interface BookingData {
    id: string
    startTime: string
    endTime: string
    status: string
    notes?: string
    client: {
        firstName: string
        lastName: string
        email: string
        phone?: string
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
        email?: string
        phone?: string
        address?: string
    }
}

interface BookingManagementProps {
    bookingId: string
}

export function BookingManagement({ bookingId }: BookingManagementProps) {
    const [booking, setBooking] = useState<BookingData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [updating, setUpdating] = useState(false)
    const [rescheduleOpen, setRescheduleOpen] = useState(false)

    useEffect(() => {
        fetchBooking()
    }, [bookingId])

    const fetchBooking = async () => {
        try {
            setLoading(true)
            const response = await fetch(`/api/booking/${bookingId}`)

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to fetch booking')
            }

            const data = await response.json()
            setBooking(data.appointment)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load booking')
        } finally {
            setLoading(false)
        }
    }

    const handleCancelBooking = async () => {
        try {
            setUpdating(true)
            const response = await fetch(`/api/booking/${bookingId}`, {
                method: 'DELETE',
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to cancel booking')
            }

            // Refresh booking data
            await fetchBooking()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to cancel booking')
        } finally {
            setUpdating(false)
        }
    }

    const handleUpdateNotes = async (notes: string) => {
        try {
            setUpdating(true)
            const response = await fetch(`/api/booking/${bookingId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ notes }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to update booking')
            }

            // Refresh booking data
            await fetchBooking()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update booking')
        } finally {
            setUpdating(false)
        }
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

    const formatDateTime = (dateTimeString: string) => {
        const date = new Date(dateTimeString)
        return {
            date: format(date, 'EEEE, MMMM d, yyyy'),
            time: format(date, 'h:mm a'),
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'SCHEDULED':
                return 'bg-blue-100 text-blue-800'
            case 'CONFIRMED':
                return 'bg-green-100 text-green-800'
            case 'CANCELLED':
                return 'bg-red-100 text-red-800'
            case 'COMPLETED':
                return 'bg-gray-100 text-gray-800'
            default:
                return 'bg-gray-100 text-gray-800'
        }
    }

    if (loading) {
        return (
            <div className="max-w-2xl mx-auto space-y-4">
                <div className="h-8 bg-gray-200 rounded animate-pulse" />
                <Card className="animate-pulse">
                    <CardHeader>
                        <div className="h-6 bg-gray-200 rounded w-1/2" />
                        <div className="h-4 bg-gray-200 rounded w-1/3" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="h-4 bg-gray-200 rounded" />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (error) {
        return (
            <div className="max-w-2xl mx-auto text-center py-8">
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={fetchBooking} variant="outline">
                    Try Again
                </Button>
            </div>
        )
    }

    if (!booking) {
        return (
            <div className="max-w-2xl mx-auto text-center py-8">
                <p className="text-gray-600">Booking not found</p>
            </div>
        )
    }

    const { date, time } = formatDateTime(booking.startTime)
    const endTime = format(new Date(booking.endTime), 'h:mm a')

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Booking Details</h1>
                    <p className="text-gray-600">Confirmation ID: {booking.id}</p>
                </div>
                <Badge className={getStatusColor(booking.status)}>
                    {booking.status}
                </Badge>
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-600">{error}</p>
                </div>
            )}

            {/* Appointment Details */}
            <Card>
                <CardHeader>
                    <CardTitle>Appointment Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <Label className="text-sm font-medium text-gray-600">Service</Label>
                            <p className="font-medium">{booking.service.name}</p>
                            <div className="flex items-center space-x-2 mt-1">
                                <Badge variant="secondary">
                                    {formatPrice(booking.service.price)}
                                </Badge>
                                <Badge variant="outline" className="flex items-center space-x-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{formatDuration(booking.service.duration)}</span>
                                </Badge>
                            </div>
                        </div>

                        <div>
                            <Label className="text-sm font-medium text-gray-600">Staff Member</Label>
                            <p className="font-medium flex items-center space-x-2">
                                <User className="h-4 w-4" />
                                <span>{booking.staff.name}</span>
                            </p>
                        </div>

                        <div>
                            <Label className="text-sm font-medium text-gray-600">Date</Label>
                            <p className="font-medium flex items-center space-x-2">
                                <Calendar className="h-4 w-4" />
                                <span>{date}</span>
                            </p>
                        </div>

                        <div>
                            <Label className="text-sm font-medium text-gray-600">Time</Label>
                            <p className="font-medium flex items-center space-x-2">
                                <Clock className="h-4 w-4" />
                                <span>{time} - {endTime}</span>
                            </p>
                        </div>
                    </div>

                    {booking.notes && (
                        <div>
                            <Label className="text-sm font-medium text-gray-600">Notes</Label>
                            <p className="text-gray-800">{booking.notes}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Client Information */}
            <Card>
                <CardHeader>
                    <CardTitle>Client Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div>
                        <Label className="text-sm font-medium text-gray-600">Name</Label>
                        <p className="font-medium">
                            {booking.client.firstName} {booking.client.lastName}
                        </p>
                    </div>

                    <div>
                        <Label className="text-sm font-medium text-gray-600">Email</Label>
                        <p className="flex items-center space-x-2">
                            <Mail className="h-4 w-4" />
                            <span>{booking.client.email}</span>
                        </p>
                    </div>

                    {booking.client.phone && (
                        <div>
                            <Label className="text-sm font-medium text-gray-600">Phone</Label>
                            <p className="flex items-center space-x-2">
                                <Phone className="h-4 w-4" />
                                <span>{booking.client.phone}</span>
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Business Information */}
            <Card>
                <CardHeader>
                    <CardTitle>Business Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div>
                        <Label className="text-sm font-medium text-gray-600">Business Name</Label>
                        <p className="font-medium">{booking.business.name}</p>
                    </div>

                    {booking.business.address && (
                        <div>
                            <Label className="text-sm font-medium text-gray-600">Address</Label>
                            <p>{booking.business.address}</p>
                        </div>
                    )}

                    {booking.business.phone && (
                        <div>
                            <Label className="text-sm font-medium text-gray-600">Phone</Label>
                            <p className="flex items-center space-x-2">
                                <Phone className="h-4 w-4" />
                                <span>{booking.business.phone}</span>
                            </p>
                        </div>
                    )}

                    {booking.business.email && (
                        <div>
                            <Label className="text-sm font-medium text-gray-600">Email</Label>
                            <p className="flex items-center space-x-2">
                                <Mail className="h-4 w-4" />
                                <span>{booking.business.email}</span>
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Actions */}
            {booking.status !== 'CANCELLED' && booking.status !== 'COMPLETED' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Manage Booking</CardTitle>
                        <CardDescription>
                            You can modify or cancel your appointment
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="flex items-center space-x-2">
                                        <Edit className="h-4 w-4" />
                                        <span>Add Notes</span>
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Add Notes</DialogTitle>
                                        <DialogDescription>
                                            Add any special requests or notes for your appointment
                                        </DialogDescription>
                                    </DialogHeader>
                                    <NotesForm
                                        initialNotes={booking.notes || ''}
                                        onSubmit={handleUpdateNotes}
                                        loading={updating}
                                    />
                                </DialogContent>
                            </Dialog>

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" className="flex items-center space-x-2">
                                        <XCircle className="h-4 w-4" />
                                        <span>Cancel Booking</span>
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Are you sure you want to cancel this appointment? This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleCancelBooking}
                                            disabled={updating}
                                            className="bg-red-600 hover:bg-red-700"
                                        >
                                            {updating ? 'Cancelling...' : 'Cancel Appointment'}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

interface NotesFormProps {
    initialNotes: string
    onSubmit: (notes: string) => void
    loading: boolean
}

function NotesForm({ initialNotes, onSubmit, loading }: NotesFormProps) {
    const [notes, setNotes] = useState(initialNotes)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSubmit(notes)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any special requests or notes..."
                    rows={4}
                />
            </div>
            <div className="flex justify-end space-x-2">
                <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Notes'}
                </Button>
            </div>
        </form>
    )
}
'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, DollarSign } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Service {
    id: string
    name: string
    description?: string
    category?: string
    price: number
    duration: number
}

interface ServicesByCategory {
    [category: string]: Service[]
}

interface ServiceSelectionProps {
    businessId: string
    onServiceSelect: (service: Service) => void
    selectedServiceId?: string
}

export function ServiceSelection({ businessId, onServiceSelect, selectedServiceId }: ServiceSelectionProps) {
    const [services, setServices] = useState<ServicesByCategory>({})
    const [businessName, setBusinessName] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchServices()
    }, [businessId])

    const fetchServices = async () => {
        try {
            setLoading(true)
            const response = await fetch(`/api/booking/services?businessId=${businessId}`)

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to fetch services')
            }

            const data = await response.json()
            setServices(data.services)
            setBusinessName(data.business.name)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load services')
        } finally {
            setLoading(false)
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

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="space-y-2">
                    <div className="h-8 bg-neutral-200 rounded animate-pulse w-3/4" />
                    <div className="h-4 bg-neutral-200 rounded animate-pulse w-1/2" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Card key={i} className="animate-pulse shadow-sm border-neutral-200">
                            <CardHeader className="pb-3">
                                <div className="h-5 bg-neutral-200 rounded w-3/4" />
                                <div className="h-3 bg-neutral-200 rounded w-1/2" />
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="flex items-center space-x-2">
                                    <div className="h-6 w-16 bg-neutral-200 rounded-full" />
                                    <div className="h-6 w-12 bg-neutral-200 rounded-full" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="text-center py-8">
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={fetchServices} variant="outline" size="lg">
                    Try Again
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <BookingProgress currentStep={1} steps={defaultBookingSteps} />

            <div className="text-center space-y-3">
                <h2 className="text-3xl font-bold text-deep-teal tracking-tight">
                    Book an Appointment
                </h2>
                <p className="text-xl text-neutral-600">
                    at {businessName}
                </p>
                <p className="text-neutral-500 max-w-2xl mx-auto">
                    Select a service to get started with your booking. All appointments include professional consultation and personalized service.
                </p>
            </div>

            {Object.entries(services).map(([category, categoryServices]) => (
                <div key={category} className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                        {category}
                    </h3>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {categoryServices.map((service) => (
                            <Card
                                key={service.id}
                                className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${selectedServiceId === service.id
                                    ? 'ring-2 ring-lumina-gold border-lumina-gold bg-gradient-to-br from-lumina-gold/5 to-lumina-coral/5'
                                    : 'hover:border-lumina-gold/50 shadow-sm'
                                    }`}
                                onClick={() => onServiceSelect(service)}
                            >
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg">{service.name}</CardTitle>
                                    {service.description && (
                                        <CardDescription className="text-sm">
                                            {service.description}
                                        </CardDescription>
                                    )}
                                </CardHeader>

                                <CardContent className="pt-0">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                            <Badge variant="secondary" className="flex items-center space-x-1">
                                                <DollarSign className="h-3 w-3" />
                                                <span>{formatPrice(service.price)}</span>
                                            </Badge>

                                            <Badge variant="outline" className="flex items-center space-x-1">
                                                <Clock className="h-3 w-3" />
                                                <span>{formatDuration(service.duration)}</span>
                                            </Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            ))}

            {Object.keys(services).length === 0 && (
                <div className="text-center py-8">
                    <p className="text-gray-600">No services available for online booking.</p>
                </div>
            )}
        </div>
    )
}
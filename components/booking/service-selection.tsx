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
            <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded animate-pulse" />
                <div className="grid gap-4 md:grid-cols-2">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader>
                                <div className="h-4 bg-gray-200 rounded w-3/4" />
                                <div className="h-3 bg-gray-200 rounded w-1/2" />
                            </CardHeader>
                            <CardContent>
                                <div className="h-3 bg-gray-200 rounded w-full mb-2" />
                                <div className="h-3 bg-gray-200 rounded w-2/3" />
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
                <Button onClick={fetchServices} variant="outline">
                    Try Again
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Book an Appointment at {businessName}
                </h2>
                <p className="text-gray-600">
                    Select a service to get started with your booking.
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
                                className={`cursor-pointer transition-all hover:shadow-md ${selectedServiceId === service.id
                                        ? 'ring-2 ring-blue-500 border-blue-500'
                                        : 'hover:border-gray-300'
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
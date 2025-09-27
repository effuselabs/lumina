'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  BookingConfig,
  BusinessInfo,
  Service,
  ServiceSelectionProps,
  ServicesByCategory,
} from '@/types/service-selection';
import {
  Check,
  Clock,
  DollarSign,
  Filter,
  Info,
  Minus,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

export function ServiceSelection({
  businessId,
  onServicesSelect,
  selectedServices = [],
  onNext,
}: ServiceSelectionProps) {
  const [_services, setServices] = useState<ServicesByCategory>({});
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const [bookingConfig, setBookingConfig] = useState<BookingConfig | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Service detail modal state
  const [_selectedServiceForDetails, setSelectedServiceForDetails] =
    useState<Service | null>(null);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/public/booking/${businessId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.userMessage || 'Failed to fetch services'
        );
      }

      const data = await response.json();
      setServices(data.servicesByCategory);
      setAllServices(data.services);
      setBusiness(data.business);
      setBookingConfig(data.bookingConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [businessId, fetchServices]);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/public/booking/${businessId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.userMessage || 'Failed to fetch services'
        );
      }

      const data = await response.json();
      setServices(data.servicesByCategory);
      setAllServices(data.services);
      setBusiness(data.business);
      setBookingConfig(data.bookingConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${mins}m`;
    }
  };

  // Filter services based on search and category
  const filteredServices = () => {
    let filtered = allServices;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        service =>
          service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          service.description
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          service.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(
        service => service.category === selectedCategory
      );
    }

    // Group by category
    return filtered.reduce((acc, service) => {
      const category = service.category || 'General';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(service);
      return acc;
    }, {} as ServicesByCategory);
  };

  // Get unique categories for filter
  const categories = [
    'all',
    ...Array.from(new Set(allServices.map(s => s.category || 'General'))),
  ];

  // Check if service is selected
  const isServiceSelected = (serviceId: string) => {
    return selectedServices.some(s => s.id === serviceId);
  };

  // Handle service selection/deselection
  const handleServiceToggle = (service: Service) => {
    const isSelected = isServiceSelected(service.id);
    let newSelection: Service[];

    if (isSelected) {
      // Remove service
      newSelection = selectedServices.filter(s => s.id !== service.id);
    } else {
      // Add service (check max limit)
      if (
        bookingConfig &&
        selectedServices.length >= bookingConfig.maxServicesPerBooking
      ) {
        return; // Don't add if at max limit
      }
      newSelection = [...selectedServices, service];
    }

    onServicesSelect(newSelection);
  };

  // Calculate totals for selected services
  const calculateTotals = () => {
    const totalPrice = selectedServices.reduce(
      (sum, service) => sum + service.price,
      0
    );
    const totalDuration = selectedServices.reduce(
      (sum, service) => sum + service.duration,
      0
    );
    return { totalPrice, totalDuration };
  };

  const { totalPrice, totalDuration } = calculateTotals();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-3/4 animate-pulse rounded bg-neutral-200" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-neutral-200" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card
              key={i}
              className="animate-pulse border-neutral-200 shadow-sm"
            >
              <CardHeader className="pb-3">
                <div className="h-5 w-3/4 rounded bg-neutral-200" />
                <div className="h-3 w-1/2 rounded bg-neutral-200" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center space-x-2">
                  <div className="h-6 w-16 rounded-full bg-neutral-200" />
                  <div className="h-6 w-12 rounded-full bg-neutral-200" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="mb-4 text-red-600">{error}</p>
        <Button onClick={fetchServices} variant="outline" size="lg">
          Try Again
        </Button>
      </div>
    );
  }

  const filteredServicesByCategory = filteredServices();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-[#0B2B33]">
          Select Your Services
        </h2>
        <p className="text-xl text-neutral-600">at {business?.name}</p>
        <p className="mx-auto max-w-2xl text-neutral-500">
          Choose the services you&apos;d like to book. You can select multiple
          services for your appointment.
        </p>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-neutral-400" />
          <Input
            placeholder="Search services..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>

          {selectedServices.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onServicesSelect([])}
              className="flex items-center gap-2 text-neutral-600"
            >
              <X className="h-4 w-4" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Category Filter */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 rounded-lg bg-neutral-50 p-4">
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="capitalize"
            >
              {category === 'all' ? 'All Categories' : category}
            </Button>
          ))}
        </div>
      )}

      {/* Selected Services Summary */}
      {selectedServices.length > 0 && (
        <Card className="border-[#FFD25A]/30 bg-gradient-to-r from-[#FFD25A]/10 to-[#FF7A5A]/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Check className="h-5 w-5 text-green-600" />
              Selected Services ({selectedServices.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="mb-4 space-y-2">
              {selectedServices.map(service => (
                <div
                  key={service.id}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex-1">
                    <span className="font-medium">{service.name}</span>
                    <div className="flex items-center gap-4 text-sm text-neutral-600">
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {formatPrice(service.price)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(service.duration)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleServiceToggle(service)}
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="flex items-center justify-between text-lg font-semibold">
              <span>Total:</span>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {formatPrice(totalPrice)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatDuration(totalDuration)}
                </span>
              </div>
            </div>

            {onNext && (
              <Button onClick={onNext} className="mt-4 w-full" size="lg">
                Continue to Date & Time
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Services Grid */}
      {Object.entries(filteredServicesByCategory).map(
        ([category, categoryServices]) => (
          <div key={category} className="space-y-4">
            <h3 className="border-b pb-2 text-lg font-semibold text-gray-800">
              {category}
            </h3>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoryServices.map(service => {
                const isSelected = isServiceSelected(service.id);
                const isAtMaxLimit =
                  bookingConfig &&
                  selectedServices.length >=
                    bookingConfig.maxServicesPerBooking &&
                  !isSelected;

                return (
                  <Card
                    key={service.id}
                    className={`transition-all duration-200 hover:shadow-lg ${
                      isSelected
                        ? 'border-[#FFD25A] bg-gradient-to-br from-[#FFD25A]/5 to-[#FF7A5A]/5 ring-2 ring-[#FFD25A]'
                        : isAtMaxLimit
                          ? 'cursor-not-allowed opacity-50'
                          : 'cursor-pointer shadow-sm hover:scale-[1.02] hover:border-[#FFD25A]/50'
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">
                            {service.name}
                          </CardTitle>
                          {service.description && (
                            <CardDescription className="mt-1 text-sm">
                              {service.description}
                            </CardDescription>
                          )}
                        </div>

                        {(service.prerequisites || service.recommendations) && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-1"
                                onClick={e => {
                                  e.stopPropagation();
                                  setSelectedServiceForDetails(service);
                                }}
                              >
                                <Info className="h-4 w-4 text-neutral-500" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>{service.name}</DialogTitle>
                                <DialogDescription>
                                  Service details and information
                                </DialogDescription>
                              </DialogHeader>

                              <div className="space-y-4">
                                {service.description && (
                                  <div>
                                    <h4 className="mb-2 font-medium">
                                      Description
                                    </h4>
                                    <p className="text-sm text-neutral-600">
                                      {service.description}
                                    </p>
                                  </div>
                                )}

                                {service.prerequisites && (
                                  <div>
                                    <h4 className="mb-2 font-medium">
                                      Prerequisites
                                    </h4>
                                    <p className="text-sm text-neutral-600">
                                      {service.prerequisites}
                                    </p>
                                  </div>
                                )}

                                {service.recommendations && (
                                  <div>
                                    <h4 className="mb-2 font-medium">
                                      Recommendations
                                    </h4>
                                    <p className="text-sm text-neutral-600">
                                      {service.recommendations}
                                    </p>
                                  </div>
                                )}

                                <div className="flex items-center gap-4 border-t pt-2">
                                  <Badge
                                    variant="secondary"
                                    className="flex items-center gap-1"
                                  >
                                    <DollarSign className="h-3 w-3" />
                                    {formatPrice(service.price)}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className="flex items-center gap-1"
                                  >
                                    <Clock className="h-3 w-3" />
                                    {formatDuration(service.duration)}
                                  </Badge>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Badge
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            <DollarSign className="h-3 w-3" />
                            {formatPrice(service.price)}
                          </Badge>

                          <Badge
                            variant="outline"
                            className="flex items-center gap-1"
                          >
                            <Clock className="h-3 w-3" />
                            {formatDuration(service.duration)}
                          </Badge>
                        </div>
                      </div>

                      <Button
                        variant={isSelected ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => handleServiceToggle(service)}
                        disabled={isAtMaxLimit}
                        className="w-full"
                      >
                        {isSelected ? (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Selected
                          </>
                        ) : (
                          <>
                            <Plus className="mr-2 h-4 w-4" />
                            {isAtMaxLimit
                              ? 'Max Services Reached'
                              : 'Add Service'}
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )
      )}

      {/* No services found */}
      {Object.keys(filteredServicesByCategory).length === 0 && (
        <div className="py-8 text-center">
          <p className="text-gray-600">
            {searchQuery || selectedCategory !== 'all'
              ? 'No services match your current filters.'
              : 'No services available for online booking.'}
          </p>
          {(searchQuery || selectedCategory !== 'all') && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="mt-4"
            >
              Clear Filters
            </Button>
          )}
        </div>
      )}

      {/* Max services warning */}
      {bookingConfig &&
        selectedServices.length >= bookingConfig.maxServicesPerBooking && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-800">
              You&apos;ve reached the maximum of{' '}
              {bookingConfig.maxServicesPerBooking} services per booking. Remove
              a service to add a different one.
            </p>
          </div>
        )}
    </div>
  );
}

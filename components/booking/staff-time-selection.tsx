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
import { Separator } from '@/components/ui/separator';
import { Service } from '@/types/service-selection';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  RefreshCw,
  User,
  Users
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  staffId: string;
  staffName: string;
  isAvailable: boolean;
  totalDuration: number;
  totalPrice: number;
  services: Array<{
    id: string;
    name: string;
    duration: number;
    price: number;
  }>;
}

export interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  avatar?: string;
  specialties: string[];
  isActive: boolean;
}

export interface StaffTimeSelectionProps {
  businessId: string;
  selectedServices: Service[];
  onSlotSelect: (slot: TimeSlot) => void;
  selectedSlot?: TimeSlot;
  onNext?: () => void;
  onBack?: () => void;
}

interface AvailabilityResponse {
  availableSlots: TimeSlot[];
  nextAvailableDate?: string;
  requestedDate: string;
  totalSlotsFound: number;
  metadata: {
    totalSlots: number;
    availableSlots: number;
    calculationTime: number;
    cacheHitRate: number;
    realTimeValidation: boolean;
    servicesValidated: string[];
  };
}

export function StaffTimeSelection({
  businessId,
  selectedServices,
  onSlotSelect,
  selectedSlot,
  onNext,
  onBack,
}: StaffTimeSelectionProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedStaffId, setSelectedStaffId] = useState<string>('any');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [qualifiedStaff, setQualifiedStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<PublicBookingError | Error | null>(null);
  const [nextAvailableDate, setNextAvailableDate] = useState<string | null>(
    null
  );
  const [alternativeSlots, setAlternativeSlots] = useState<TimeSlot[]>([]);

  // Network resilience hook
  const { resilientFetch, networkState, getNetworkErrorMessage } = useNetworkResilience({
    onConnectionChange: (isOnline) => {
      if (isOnline && error) {
        fetchAvailableSlots();
      }
    },
  });

  // Calendar navigation state
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Real-time update interval
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

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

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  // Fetch qualified staff for selected services
  const fetchQualifiedStaff = useCallback(async () => {
    if (selectedServices.length === 0) return;

    try {
      const serviceIds = selectedServices.map(s => s.id);
      const data = await resilientFetch(
        `/api/public/booking/${businessId}/staff?serviceIds=${serviceIds.join(',')}`,
        {},
        `staff-${businessId}-${serviceIds.join('-')}`
      );

      setQualifiedStaff(data.staff || []);
    } catch (_err) {
      // Error fetching qualified staff - set empty array
      setQualifiedStaff([]);
    }
  }, [businessId, selectedServices, resilientFetch]);

  // Fetch available time slots
  const fetchAvailableSlots = useCallback(async () => {
    if (selectedServices.length === 0) return;

    setLoading(true);
    setError(null);
    setAlternativeSlots([]);

    try {
      const serviceIds = selectedServices.map(s => s.id);
      const totalDuration = selectedServices.reduce(
        (sum, service) => sum + service.duration,
        0
      );

      const params = new URLSearchParams({
        serviceIds: serviceIds.join(','),
        date: selectedDate.toISOString().split('T')[0],
        duration: totalDuration.toString(),
      });

      if (selectedStaffId !== 'any') {
        params.append('staffId', selectedStaffId);
      }

      const data: AvailabilityResponse = await resilientFetch(
        `/api/public/booking/${businessId}/availability?${params}`,
        {},
        `availability-${businessId}-${selectedDate.toDateString()}-${serviceIds.join('-')}`
      );

      setAvailableSlots(data.availableSlots);
      setNextAvailableDate(data.nextAvailableDate || null);
      setLastUpdateTime(new Date());

      // If no slots available, fetch alternatives
      if (data.availableSlots.length === 0) {
        try {
          const alternatives = await AlternativeSlotsService.findAlternativeSlots({
            businessId,
            serviceIds,
            originalStartTime: selectedDate,
            staffId: selectedStaffId !== 'any' ? selectedStaffId : undefined,
            maxAlternatives: 6,
          });
          setAlternativeSlots(alternatives.alternatives);
        } catch (altError) {
          console.error('Failed to fetch alternative slots:', altError);
        }
      }
    } catch (err) {
      if (err instanceof PublicBookingError) {
        setError(err);
      } else {
        setError(new Error(getNetworkErrorMessage(err as Error)));
      }
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  }, [businessId, selectedServices, selectedDate, selectedStaffId, resilientFetch, getNetworkErrorMessage]);

  // Initial data fetch
  useEffect(() => {
    fetchQualifiedStaff();
  }, [fetchQualifiedStaff]);

  useEffect(() => {
    fetchAvailableSlots();
  }, [fetchAvailableSlots]);

  // Real-time updates every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAvailableSlots();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [fetchAvailableSlots]);

  // Calendar navigation helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const isDateSelectable = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date >= today;
  };

  const isDateSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(currentMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(currentMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  const handleDateSelect = (date: Date) => {
    if (isDateSelectable(date)) {
      setSelectedDate(date);
    }
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    onSlotSelect(slot);
  };

  const handleRefresh = () => {
    fetchAvailableSlots();
  };

  // Group slots by staff for better organization
  const slotsByStaff = availableSlots.reduce(
    (acc, slot) => {
      if (!acc[slot.staffId]) {
        acc[slot.staffId] = {
          staff: {
            id: slot.staffId,
            name: slot.staffName,
          },
          slots: [],
        };
      }
      acc[slot.staffId].slots.push(slot);
      return acc;
    },
    {} as Record<
      string,
      { staff: { id: string; name: string }; slots: TimeSlot[] }
    >
  );

  const totalServices = selectedServices.length;
  const totalDuration = selectedServices.reduce(
    (sum, service) => sum + service.duration,
    0
  );
  const totalPrice = selectedServices.reduce(
    (sum, service) => sum + service.price,
    0
  );

  return (
    <div className="space-y-6">
      <NetworkStatusIndicator />
      {/* Header */}
      <div className="space-y-3 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-[#0B2B33]">
          Choose Date & Time
        </h2>
        <p className="text-xl text-neutral-600">
          Select your preferred appointment slot
        </p>
        <div className="mx-auto flex max-w-md items-center justify-center gap-4 text-sm text-neutral-500">
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {totalServices} service{totalServices !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {formatDuration(totalDuration)}
          </span>
          <span className="flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            {formatPrice(totalPrice)}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Calendar Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Select Date
            </CardTitle>
            <CardDescription>
              Choose your preferred appointment date
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Calendar Navigation */}
            <div className="mb-4 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="text-lg font-semibold">
                {currentMonth.toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-center text-sm">
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-2 font-medium text-neutral-500">
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {getDaysInMonth(currentMonth).map((date, index) => (
                <div key={index} className="aspect-square">
                  {date && (
                    <Button
                      variant={isDateSelected(date) ? 'default' : 'ghost'}
                      size="sm"
                      className={`h-full w-full p-0 text-sm ${!isDateSelectable(date)
                        ? 'cursor-not-allowed opacity-50'
                        : ''
                        }`}
                      onClick={() => handleDateSelect(date)}
                      disabled={!isDateSelectable(date)}
                    >
                      {date.getDate()}
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Selected date display */}
            <div className="mt-4 rounded-lg bg-neutral-50 p-3 text-center">
              <p className="text-sm font-medium text-neutral-700">
                Selected Date
              </p>
              <p className="text-lg font-semibold text-[#0B2B33]">
                {formatDate(selectedDate)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Staff Selection & Time Slots */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Available Times
                </CardTitle>
                <CardDescription>
                  Choose your preferred time slot
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Staff Filter */}
            {qualifiedStaff.length > 1 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Staff Preference</label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedStaffId === 'any' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedStaffId('any')}
                  >
                    Any Available Staff
                  </Button>
                  {qualifiedStaff.map(staff => (
                    <Button
                      key={staff.id}
                      variant={
                        selectedStaffId === staff.id ? 'default' : 'outline'
                      }
                      size="sm"
                      onClick={() => setSelectedStaffId(staff.id)}
                    >
                      {staff.displayName}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Loading State */}
            {loading && (
              <div className="py-4">
                <BookingLoadingState
                  type="availability"
                  message={networkState.isSlowConnection ? "Checking availability (slow connection)..." : "Finding available time slots..."}
                  estimatedTime={networkState.isSlowConnection ? 8 : 3}
                />
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="py-4">
                <BookingErrorHandler
                  error={error}
                  onRetry={handleRefresh}
                  onClearError={() => setError(null)}
                  alternativeSlots={alternativeSlots}
                  onAlternativeSlotSelect={(slot) => {
                    setSelectedDate(slot.startTime);
                    setSelectedStaffId(slot.staffId);
                    handleSlotSelect(slot);
                  }}
                  showAlternatives={true}
                />
              </div>
            )}

            {/* Available Slots */}
            {!loading && !error && (
              <div className="space-y-4">
                {Object.keys(slotsByStaff).length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="mb-2 text-neutral-600">
                      No available times for {formatDate(selectedDate)}
                    </p>
                    {nextAvailableDate && (
                      <div className="space-y-2">
                        <p className="text-sm text-neutral-500">
                          Next available date:
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setSelectedDate(new Date(nextAvailableDate))
                          }
                        >
                          {new Date(nextAvailableDate).toLocaleDateString(
                            'en-US',
                            {
                              weekday: 'long',
                              month: 'short',
                              day: 'numeric',
                            }
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  Object.entries(slotsByStaff).map(
                    ([staffId, { staff, slots }]) => (
                      <div key={staffId} className="space-y-2">
                        <h4 className="font-medium text-neutral-700">
                          {staff.name}
                        </h4>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {slots.map((slot, index) => (
                            <Button
                              key={index}
                              variant={
                                selectedSlot &&
                                  selectedSlot.startTime.getTime() ===
                                  slot.startTime.getTime() &&
                                  selectedSlot.staffId === slot.staffId
                                  ? 'default'
                                  : 'outline'
                              }
                              size="sm"
                              onClick={() => handleSlotSelect(slot)}
                              className="flex flex-col items-center p-2 text-xs"
                            >
                              <span className="font-medium">
                                {formatTime(slot.startTime)}
                              </span>
                              <span className="text-xs text-neutral-500">
                                {formatDuration(slot.totalDuration)}
                              </span>
                            </Button>
                          ))}
                        </div>
                      </div>
                    )
                  )
                )}
              </div>
            )}

            {/* Real-time update indicator */}
            {!loading && availableSlots.length > 0 && (
              <div className="text-center text-xs text-neutral-500">
                Last updated: {formatTime(lastUpdateTime)}
                <br />
                Times update automatically every 30 seconds
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Selected Slot Summary */}
      {selectedSlot && (
        <Card className="border-[#FFD25A]/30 bg-gradient-to-r from-[#FFD25A]/10 to-[#FF7A5A]/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-green-600" />
              Selected Appointment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-neutral-700">
                  Date & Time
                </p>
                <p className="text-lg font-semibold">
                  {formatDate(selectedSlot.startTime)}
                </p>
                <p className="text-lg font-semibold">
                  {formatTime(selectedSlot.startTime)} -{' '}
                  {formatTime(selectedSlot.endTime)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-700">
                  Staff Member
                </p>
                <p className="text-lg font-semibold">
                  {selectedSlot.staffName}
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-sm font-medium text-neutral-700">Services</p>
              {selectedServices.map(service => (
                <div
                  key={service.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{service.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {formatDuration(service.duration)}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {formatPrice(service.price)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            <div className="flex items-center justify-between text-lg font-semibold">
              <span>Total:</span>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatDuration(selectedSlot.totalDuration)}
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {formatPrice(selectedSlot.totalPrice)}
                </span>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-3 pt-4">
              {onBack && (
                <Button variant="outline" onClick={onBack} className="flex-1">
                  Back to Services
                </Button>
              )}
              {onNext && (
                <Button onClick={onNext} className="flex-1">
                  Continue to Details
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

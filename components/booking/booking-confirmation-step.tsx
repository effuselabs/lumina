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
import { useNetworkResilience } from '@/hooks/use-network-resilience';
import {
  csrfHeader,
  fetchPublicBookingCSRFToken,
} from '@/lib/booking/csrf-token';
import { PublicBookingError } from '@/lib/errors/public-booking-error';
import { Service } from '@/types/service-selection';
import { format } from 'date-fns';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Loader2,
  Mail,
  MapPin,
  User,
} from 'lucide-react';
import { useState } from 'react';
import { BookingErrorHandler } from './booking-error-handler';
import {
  BookingLoadingState,
  MultiStepProgress,
  NetworkStatusIndicator,
} from './booking-loading-states';

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  staffId: string;
  staffName: string;
  totalDuration: number;
  totalPrice: number;
}

export interface ClientFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes?: string;
  marketingOptIn: boolean;
  isNewClient: boolean;
}

interface BookingConfirmationStepProps {
  businessId: string;
  selectedServices: Service[];
  selectedTimeSlot: TimeSlot;
  clientData: ClientFormData;
  onBack: () => void;
  onNewBooking: () => void;
}

/*
 * `dateTime` is a string, not a Date.
 *
 * The server types it as `Date`, but it crosses a JSON boundary to get here, so
 * what actually arrives is an ISO string. Declaring it `Date` made TypeScript
 * accept `createdAppointment.dateTime.getTime()`, which threw
 * "getTime is not a function" and took the whole confirmation screen down into
 * the error boundary — after the appointment had already been created. The
 * client saw a crash for a booking that succeeded.
 *
 * This is the fourth instance of the same mistake in this flow. The rule: model
 * the wire format honestly as `string`, and convert where it is used.
 */
interface CreatedAppointment {
  id: string;
  confirmationNumber: string;
  dateTime: string;
  services: {
    id: string;
    name: string;
    duration: number;
    price: number;
  }[];
  staff: {
    id: string;
    displayName: string;
    title?: string;
  };
  client: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  totalDuration: number;
  totalPrice: number;
  notes?: string;
  business: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  };
}

interface BookingResponse {
  appointment: CreatedAppointment;
  confirmationSent: boolean;
  message: string;
}

export function BookingConfirmationStep({
  businessId,
  selectedServices,
  selectedTimeSlot,
  clientData,
  onBack,
  onNewBooking,
}: BookingConfirmationStepProps) {
  const [isBooking, setIsBooking] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingError, setBookingError] = useState<
    PublicBookingError | Error | null
  >(null);
  const [createdAppointment, setCreatedAppointment] =
    useState<CreatedAppointment | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [bookingProgress, setBookingProgress] = useState(0);

  // Network resilience hook
  const { resilientFetch, networkState, getNetworkErrorMessage } =
    useNetworkResilience();

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

  const handleConfirmBooking = async () => {
    setIsBooking(true);
    setBookingError(null);
    setBookingProgress(0);

    try {
      // Progress: Preparing booking data
      setBookingProgress(20);

      const bookingData = {
        services: selectedServices.map(s => s.id),
        timeSlot: {
          startTime: selectedTimeSlot.startTime.toISOString(),
          endTime: selectedTimeSlot.endTime.toISOString(),
          staffId: selectedTimeSlot.staffId,
          totalDuration: selectedTimeSlot.totalDuration,
          totalPrice: selectedTimeSlot.totalPrice,
        },
        client: {
          firstName: clientData.firstName,
          lastName: clientData.lastName,
          email: clientData.email,
          phone: clientData.phone,
          notes: clientData.notes,
          isNewClient: clientData.isNewClient,
          marketingOptIn: clientData.marketingOptIn,
        },
      };

      // Progress: Validating time slot
      setBookingProgress(40);

      // The booking POST is CSRF-protected (double-submit cookie). Fetch
      // the token now rather than on mount — a client can linger on this
      // step, and tokens expire after an hour.
      const csrfToken = await fetchPublicBookingCSRFToken(businessId);

      // Progress: Creating appointment
      setBookingProgress(60);

      const result: BookingResponse = await resilientFetch(
        `/api/public/booking/${businessId}/book`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...csrfHeader(csrfToken),
          },
          body: JSON.stringify(bookingData),
        }
      );

      // Progress: Sending confirmation
      setBookingProgress(80);

      setCreatedAppointment(result.appointment);
      setConfirmationSent(result.confirmationSent);

      // Progress: Complete
      setBookingProgress(100);
      setBookingComplete(true);
    } catch (error) {
      console.error('Booking error:', error);
      if (error instanceof PublicBookingError) {
        setBookingError(error);
      } else {
        setBookingError(new Error(getNetworkErrorMessage(error as Error)));
      }
    } finally {
      setIsBooking(false);
    }
  };

  if (bookingComplete && createdAppointment) {
    // Revive the wire-format string once, here at the boundary.
    const confirmedStart = new Date(createdAppointment.dateTime);

    return (
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Success Header */}
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100/50 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 rounded-full bg-green-100 p-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="space-y-1">
                <h2 className="text-3xl font-bold tracking-tight text-green-900">
                  Booking Confirmed!
                </h2>
                <p className="text-lg text-green-700">
                  Your appointment has been successfully scheduled
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Confirmation Details */}
        <Card className="border-neutral-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-deep-teal">
              Appointment Details
            </CardTitle>
            <CardDescription>
              Confirmation Number: {createdAppointment.confirmationNumber}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Business and Services */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-1 flex items-center space-x-2 text-sm font-medium text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>Business</span>
                </div>
                <p className="text-lg font-semibold">
                  {createdAppointment.business.name}
                </p>
                {createdAppointment.business.address && (
                  <p className="text-sm text-gray-600">
                    {createdAppointment.business.address}
                  </p>
                )}
              </div>

              <div>
                <div className="mb-1 text-sm font-medium text-gray-600">
                  Services
                </div>
                <div className="space-y-1">
                  {createdAppointment.services.map((service, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <span className="font-semibold">{service.name}</span>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant="secondary"
                          className="flex items-center space-x-1"
                        >
                          <DollarSign className="h-3 w-3" />
                          <span>{formatPrice(service.price)}</span>
                        </Badge>
                        <Badge
                          variant="outline"
                          className="flex items-center space-x-1"
                        >
                          <Clock className="h-3 w-3" />
                          <span>{formatDuration(service.duration)}</span>
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 border-t border-gray-200 pt-2">
                  <div className="flex items-center justify-between font-semibold">
                    <span>Total</span>
                    <div className="flex items-center space-x-2">
                      <Badge className="flex items-center space-x-1">
                        <DollarSign className="h-3 w-3" />
                        <span>
                          {formatPrice(createdAppointment.totalPrice)}
                        </span>
                      </Badge>
                      <Badge
                        variant="outline"
                        className="flex items-center space-x-1"
                      >
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatDuration(createdAppointment.totalDuration)}
                        </span>
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Date and Time */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-1 flex items-center space-x-2 text-sm font-medium text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>Date</span>
                </div>
                <p className="font-semibold">
                  {format(confirmedStart, 'EEEE, MMMM d, yyyy')}
                </p>
              </div>

              <div>
                <div className="mb-1 flex items-center space-x-2 text-sm font-medium text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>Time</span>
                </div>
                <p className="font-semibold">
                  {format(confirmedStart, 'h:mm a')} -{' '}
                  {format(
                    new Date(
                      confirmedStart.getTime() +
                        createdAppointment.totalDuration * 60000
                    ),
                    'h:mm a'
                  )}
                </p>
              </div>
            </div>

            {/* Staff and Client */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-1 flex items-center space-x-2 text-sm font-medium text-gray-600">
                  <User className="h-4 w-4" />
                  <span>Staff Member</span>
                </div>
                <p className="font-semibold">
                  {createdAppointment.staff.displayName}
                </p>
                {createdAppointment.staff.title && (
                  <p className="text-sm text-gray-600">
                    {createdAppointment.staff.title}
                  </p>
                )}
              </div>

              <div>
                <div className="mb-1 text-sm font-medium text-gray-600">
                  Client
                </div>
                <p className="font-semibold">
                  {createdAppointment.client.firstName}{' '}
                  {createdAppointment.client.lastName}
                </p>
                <div className="mt-1 flex items-center space-x-2 text-sm text-gray-600">
                  <Mail className="h-3 w-3" />
                  <span>{createdAppointment.client.email}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {createdAppointment.notes && (
              <div>
                <div className="mb-1 text-sm font-medium text-gray-600">
                  Notes
                </div>
                <p className="rounded-md bg-gray-50 p-3 text-sm">
                  {createdAppointment.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email Confirmation Status */}
        <Card className="border-neutral-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-deep-teal">What's Next?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                {confirmationSent ? (
                  <CheckCircle className="mt-0.5 h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="mt-0.5 h-5 w-5 text-orange-600" />
                )}
                <div>
                  <p className="font-medium">Confirmation Email</p>
                  <p className="text-sm text-gray-600">
                    {confirmationSent
                      ? `A confirmation email has been sent to ${createdAppointment.client.email} with all the appointment details.`
                      : `We were unable to send a confirmation email, but your appointment is confirmed. Please save these details.`}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Calendar className="mt-0.5 h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">Add to Calendar</p>
                  <p className="text-sm text-gray-600">
                    Don't forget to add this appointment to your personal
                    calendar so you don't miss it.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Clock className="mt-0.5 h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium">Arrive on Time</p>
                  <p className="text-sm text-gray-600">
                    Please arrive 5-10 minutes early for your appointment to
                    allow time for check-in.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={onNewBooking}
            variant="primary"
            className="flex-1"
            size="lg"
          >
            Book Another Appointment
          </Button>
          <Button
            onClick={() => window.print()}
            variant="outline"
            className="flex-1"
            size="lg"
          >
            Print Confirmation
          </Button>
        </div>
      </div>
    );
  }

  // Show loading state during booking process
  if (isBooking) {
    const steps = [
      {
        id: 'validate',
        title: 'Validating time slot',
        status:
          bookingProgress >= 40
            ? ('completed' as const)
            : bookingProgress >= 20
              ? ('active' as const)
              : ('pending' as const),
      },
      {
        id: 'create',
        title: 'Creating appointment',
        status:
          bookingProgress >= 80
            ? ('completed' as const)
            : bookingProgress >= 60
              ? ('active' as const)
              : ('pending' as const),
      },
      {
        id: 'confirm',
        title: 'Sending confirmation',
        status:
          bookingProgress >= 100
            ? ('completed' as const)
            : bookingProgress >= 80
              ? ('active' as const)
              : ('pending' as const),
      },
    ];

    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <NetworkStatusIndicator />
        <BookingLoadingState
          type="booking"
          message={
            networkState.isSlowConnection
              ? 'Creating your appointment (slow connection detected)...'
              : 'Creating your appointment...'
          }
          progress={bookingProgress}
          showProgress={true}
          estimatedTime={networkState.isSlowConnection ? 15 : 8}
        />
        <Card>
          <CardContent className="pt-6">
            <MultiStepProgress steps={steps} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <NetworkStatusIndicator />
      <Card className="border-neutral-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-deep-teal">Review Your Booking</CardTitle>
          <CardDescription>
            Please review your appointment details before confirming
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Services Summary */}
          <div>
            <h3 className="mb-3 font-semibold">Selected Services</h3>
            <div className="space-y-2">
              {selectedServices.map((service, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                >
                  <div>
                    <p className="font-medium">{service.name}</p>
                    <p className="text-sm text-gray-600">
                      {service.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatPrice(service.price)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatDuration(service.duration)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-3">
              <span className="font-semibold">Total</span>
              <div className="text-right">
                <p className="text-lg font-semibold">
                  {formatPrice(selectedTimeSlot.totalPrice)}
                </p>
                <p className="text-sm text-gray-600">
                  {formatDuration(selectedTimeSlot.totalDuration)}
                </p>
              </div>
            </div>
          </div>

          {/* Date & Time Summary */}
          <div>
            <h3 className="mb-3 font-semibold">Appointment Time</h3>
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="mb-1 flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-600" />
                <span className="font-medium">
                  {format(selectedTimeSlot.startTime, 'EEEE, MMMM d, yyyy')}
                </span>
              </div>
              <div className="mb-1 flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-600" />
                <span>
                  {format(selectedTimeSlot.startTime, 'h:mm a')} -{' '}
                  {format(selectedTimeSlot.endTime, 'h:mm a')}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-600" />
                <span>with {selectedTimeSlot.staffName}</span>
              </div>
            </div>
          </div>

          {/* Client Information Summary */}
          <div>
            <h3 className="mb-3 font-semibold">Your Information</h3>
            <div className="space-y-2 rounded-lg bg-gray-50 p-3">
              <p>
                <span className="font-medium">Name:</span>{' '}
                {clientData.firstName} {clientData.lastName}
              </p>
              <p>
                <span className="font-medium">Email:</span> {clientData.email}
              </p>
              <p>
                <span className="font-medium">Phone:</span> {clientData.phone}
              </p>
              {clientData.notes && (
                <p>
                  <span className="font-medium">Notes:</span> {clientData.notes}
                </p>
              )}
            </div>
          </div>

          {/* Error Display */}
          {bookingError && (
            <BookingErrorHandler
              error={bookingError}
              onRetry={handleConfirmBooking}
              onClearError={() => setBookingError(null)}
            />
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-4 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              disabled={isBooking}
              className="w-full sm:w-auto"
            >
              Back to Edit Details
            </Button>

            <Button
              onClick={handleConfirmBooking}
              disabled={isBooking}
              className="w-full sm:flex-1"
              size="lg"
            >
              {isBooking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {networkState.isSlowConnection
                    ? 'Creating Appointment (slow connection)...'
                    : 'Creating Your Appointment...'}
                </>
              ) : (
                'Confirm Booking'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PublicBookingError } from '@/lib/errors/public-booking-error';
import { PublicBookingErrorType, TimeSlot } from '@/types/booking';
import {
  AlertCircle,
  Calendar,
  Clock,
  Mail,
  Phone,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface BookingErrorHandlerProps {
  error: PublicBookingError | Error | null;
  onRetry?: () => void;
  onClearError?: () => void;
  businessName?: string;
  businessPhone?: string;
  businessEmail?: string;
  alternativeSlots?: TimeSlot[];
  onAlternativeSlotSelect?: (slot: TimeSlot) => void;
  showAlternatives?: boolean;
}

export function BookingErrorHandler({
  error,
  onRetry,
  onClearError,
  businessName,
  businessPhone,
  businessEmail,
  alternativeSlots = [],
  onAlternativeSlotSelect,
  showAlternatives = true,
}: BookingErrorHandlerProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  // Monitor network connectivity
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!error) return null;

  const isPublicBookingError = error instanceof PublicBookingError;
  const publicError = isPublicBookingError
    ? (error as PublicBookingError)
    : null;

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    onRetry?.();
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
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  // Network connectivity error
  if (!isOnline) {
    return (
      <Alert variant="destructive" className="mb-4">
        <WifiOff className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <strong>No internet connection</strong>
            <p className="mt-1 text-sm">
              Please check your connection and try again.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="ml-4"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Get error-specific content
  const getErrorContent = () => {
    if (publicError) {
      switch (publicError.type) {
        case PublicBookingErrorType.BUSINESS_NOT_FOUND:
        case PublicBookingErrorType.BUSINESS_INACTIVE:
          return {
            variant: 'destructive' as const,
            title: 'Booking Unavailable',
            message: publicError.userMessage,
            showRetry: false,
            showContact: true,
            suggestions: publicError.suggestions,
          };

        case PublicBookingErrorType.SERVICE_UNAVAILABLE:
          return {
            variant: 'destructive' as const,
            title: 'Service Unavailable',
            message: publicError.userMessage,
            showRetry: true,
            showContact: true,
            suggestions: publicError.suggestions,
          };

        case PublicBookingErrorType.SLOT_UNAVAILABLE:
        case PublicBookingErrorType.BOOKING_CONFLICT:
          return {
            variant: 'destructive' as const,
            title: 'Time Slot Unavailable',
            message: publicError.userMessage,
            showRetry: true,
            showContact: false,
            suggestions: publicError.suggestions,
            showAlternatives: true,
          };

        case PublicBookingErrorType.INVALID_CLIENT_DATA:
          return {
            variant: 'destructive' as const,
            title: 'Invalid Information',
            message: publicError.userMessage,
            showRetry: false,
            showContact: false,
            suggestions: publicError.suggestions,
          };

        case PublicBookingErrorType.SYSTEM_ERROR:
          return {
            variant: 'destructive' as const,
            title: 'Technical Difficulties',
            message: publicError.userMessage,
            showRetry: true,
            showContact: retryCount >= 2,
            suggestions: publicError.suggestions,
          };

        default:
          return {
            variant: 'destructive' as const,
            title: 'Booking Error',
            message: publicError.userMessage,
            showRetry: true,
            showContact: true,
            suggestions: publicError.suggestions,
          };
      }
    }

    // Generic error handling
    return {
      variant: 'destructive' as const,
      title: 'Something went wrong',
      message: 'We encountered an unexpected error. Please try again.',
      showRetry: true,
      showContact: retryCount >= 2,
      suggestions: [
        'Try refreshing the page',
        'Check your internet connection',
        'Contact the business directly if the problem persists',
      ],
    };
  };

  const errorContent = getErrorContent();

  return (
    <div className="space-y-4">
      {/* Main Error Alert */}
      <Alert variant={errorContent.variant}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <div>
              <strong>{errorContent.title}</strong>
              <p className="mt-1">{errorContent.message}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {errorContent.showRetry && onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again {retryCount > 0 && `(${retryCount})`}
                </Button>
              )}

              {onClearError && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearError}
                  className="flex items-center gap-2"
                >
                  Dismiss
                </Button>
              )}

              {/* Network status indicator */}
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Wifi className="h-3 w-3" />
                <span>Connected</span>
              </div>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Suggestions */}
      {errorContent.suggestions && errorContent.suggestions.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-blue-900">
              Suggestions to resolve this issue:
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-1 text-sm text-blue-800">
              {errorContent.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="mt-0.5 text-blue-600">•</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Alternative Time Slots */}
      {showAlternatives &&
        errorContent.showAlternatives &&
        alternativeSlots.length > 0 &&
        onAlternativeSlotSelect && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm text-green-900">
                <Calendar className="h-4 w-4" />
                Alternative Time Slots Available
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="mb-3 text-sm text-green-800">
                Here are some alternative times that might work for you:
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {alternativeSlots.slice(0, 6).map((slot, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => onAlternativeSlotSelect(slot)}
                    className="flex flex-col items-start gap-1 border-green-300 bg-white p-3 text-left hover:bg-green-100"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Calendar className="h-3 w-3" />
                      {formatDate(slot.startTime)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      with {slot.staffName}
                    </div>
                  </Button>
                ))}
              </div>
              {alternativeSlots.length > 6 && (
                <p className="mt-2 text-xs text-green-700">
                  +{alternativeSlots.length - 6} more slots available
                </p>
              )}
            </CardContent>
          </Card>
        )}

      {/* Contact Information */}
      {errorContent.showContact && (businessPhone || businessEmail) && (
        <Card className="border-gray-200 bg-gray-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-900">
              Need immediate assistance?
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="mb-3 text-sm text-gray-700">
              Contact {businessName || 'the business'} directly:
            </p>
            <div className="flex gap-2">
              {businessPhone && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => window.open(`tel:${businessPhone}`)}
                >
                  <Phone className="h-4 w-4" />
                  Call {businessPhone}
                </Button>
              )}
              {businessEmail && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => window.open(`mailto:${businessEmail}`)}
                >
                  <Mail className="h-4 w-4" />
                  Email
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

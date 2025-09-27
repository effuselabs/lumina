'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PublicBookingError } from '@/lib/errors/public-booking-error';
import { PublicBookingErrorType } from '@/types/booking';
import { AlertTriangle, Mail, Phone, RefreshCw } from 'lucide-react';
import { Component, ReactNode } from 'react';

interface BookingErrorBoundaryProps {
  children: ReactNode;
  businessName?: string;
  businessPhone?: string;
  businessEmail?: string;
}

interface BookingErrorBoundaryState {
  hasError: boolean;
  error?: PublicBookingError | Error;
}

export class BookingErrorBoundary extends Component<
  BookingErrorBoundaryProps,
  BookingErrorBoundaryState
> {
  constructor(props: BookingErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): BookingErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Booking error boundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <BookingErrorDisplay
          error={this.state.error}
          businessName={this.props.businessName}
          businessPhone={this.props.businessPhone}
          businessEmail={this.props.businessEmail}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

interface BookingErrorDisplayProps {
  error?: PublicBookingError | Error;
  businessName?: string;
  businessPhone?: string;
  businessEmail?: string;
  onRetry: () => void;
}

function BookingErrorDisplay({
  error,
  businessName,
  businessPhone,
  businessEmail,
  onRetry,
}: BookingErrorDisplayProps) {
  const isPublicBookingError = error instanceof PublicBookingError;

  const getErrorContent = () => {
    if (isPublicBookingError) {
      const publicError = error as PublicBookingError;

      switch (publicError.type) {
        case PublicBookingErrorType.BUSINESS_NOT_FOUND:
        case PublicBookingErrorType.BUSINESS_INACTIVE:
          return {
            title: 'Booking Unavailable',
            message: publicError.userMessage,
            showRetry: false,
            showContact: true,
          };

        case PublicBookingErrorType.SERVICE_UNAVAILABLE:
        case PublicBookingErrorType.SLOT_UNAVAILABLE:
          return {
            title: 'Booking Conflict',
            message: publicError.userMessage,
            suggestions: publicError.suggestions,
            showRetry: true,
            showContact: true,
          };

        case PublicBookingErrorType.INVALID_CLIENT_DATA:
          return {
            title: 'Invalid Information',
            message: publicError.userMessage,
            suggestions: publicError.suggestions,
            showRetry: true,
            showContact: false,
          };

        default:
          return {
            title: 'Booking Error',
            message: publicError.userMessage,
            showRetry: true,
            showContact: true,
          };
      }
    }

    return {
      title: 'Something went wrong',
      message:
        'We encountered an unexpected error. Please try again or contact the business directly.',
      showRetry: true,
      showContact: true,
    };
  };

  const errorContent = getErrorContent();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md p-6 text-center sm:p-8">
        <div className="mb-4 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
        </div>

        <h2 className="mb-2 text-xl font-semibold text-gray-900">
          {errorContent.title}
        </h2>

        <p className="mb-6 text-gray-600">{errorContent.message}</p>

        {/* Suggestions */}
        {errorContent.suggestions && errorContent.suggestions.length > 0 && (
          <div className="mb-6 rounded-lg bg-blue-50 p-4 text-left">
            <h4 className="mb-2 font-medium text-blue-900">Suggestions:</h4>
            <ul className="space-y-1 text-sm text-blue-800">
              {errorContent.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="mt-0.5 text-blue-600">•</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {errorContent.showRetry && (
            <Button
              onClick={onRetry}
              className="flex w-full items-center justify-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          )}

          {errorContent.showContact && (businessPhone || businessEmail) && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Or contact {businessName || 'the business'} directly:
              </p>
              <div className="flex gap-2">
                {businessPhone && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex flex-1 items-center gap-2"
                    onClick={() => window.open(`tel:${businessPhone}`)}
                  >
                    <Phone className="h-4 w-4" />
                    Call
                  </Button>
                )}
                {businessEmail && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex flex-1 items-center gap-2"
                    onClick={() => window.open(`mailto:${businessEmail}`)}
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 border-t pt-6 text-xs text-gray-500">
          <p>
            Powered by{' '}
            <span className="font-medium text-[var(--brand-primary)]">
              Lumina
            </span>
          </p>
        </div>
      </Card>
    </div>
  );
}

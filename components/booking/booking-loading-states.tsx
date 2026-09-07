'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Calendar,
  CheckCircle,
  Clock,
  Loader2,
  Search,
  User,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface LoadingStateProps {
  type: 'services' | 'availability' | 'booking' | 'staff' | 'general';
  message?: string;
  progress?: number;
  showProgress?: boolean;
  estimatedTime?: number; // in seconds
}

export function BookingLoadingState({
  type,
  message,
  progress,
  showProgress = false,
  estimatedTime,
}: LoadingStateProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getLoadingContent = () => {
    switch (type) {
      case 'services':
        return {
          icon: <Search className="h-5 w-5" />,
          title: 'Loading Services',
          description: message || 'Fetching available services and pricing...',
          skeleton: <ServicesSkeleton />,
        };

      case 'availability':
        return {
          icon: <Calendar className="h-5 w-5" />,
          title: 'Checking Availability',
          description:
            message || 'Finding available time slots for your appointment...',
          skeleton: <AvailabilitySkeleton />,
        };

      case 'booking':
        return {
          icon: <CheckCircle className="h-5 w-5" />,
          title: 'Creating Your Appointment',
          description: message || 'Confirming your booking details...',
          skeleton: <BookingCreationSkeleton />,
        };

      case 'staff':
        return {
          icon: <User className="h-5 w-5" />,
          title: 'Loading Staff Information',
          description: message || 'Finding qualified staff members...',
          skeleton: <StaffSkeleton />,
        };

      default:
        return {
          icon: <Loader2 className="h-5 w-5 animate-spin" />,
          title: 'Loading',
          description: message || 'Please wait...',
          skeleton: <GeneralSkeleton />,
        };
    }
  };

  const content = getLoadingContent();

  return (
    <div className="space-y-6">
      {/* Loading Header */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
          {content.icon}
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{content.title}</h3>
        <p className="mt-1 text-sm text-gray-600">{content.description}</p>

        {/* Progress Bar */}
        {showProgress && progress !== undefined && (
          <div className="mx-auto mt-4 max-w-xs">
            <Progress value={progress} className="h-2" />
            <p className="mt-1 text-xs text-gray-500">{progress}% complete</p>
          </div>
        )}

        {/* Time Indicators */}
        <div className="mt-3 flex items-center justify-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {elapsedTime}s elapsed
          </span>
          {estimatedTime && (
            <span>
              Est. {Math.max(0, estimatedTime - elapsedTime)}s remaining
            </span>
          )}
        </div>
      </div>

      {/* Loading Skeleton */}
      {content.skeleton}
    </div>
  );
}

// Service loading skeleton
function ServicesSkeleton() {
  return (
    <div className="space-y-6">
      {/* Search bar skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-10 w-20" />
      </div>

      {/* Services grid skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-12 rounded-full" />
              </div>
              <Skeleton className="mt-3 h-8 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Availability loading skeleton
function AvailabilitySkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Calendar skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-8" />
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Time slots skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              <span className="ml-2 text-sm text-gray-600">
                Calculating availability...
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Booking creation skeleton
function BookingCreationSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          <Skeleton className="h-5 w-40" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-500" />
            <p className="mt-2 text-sm text-gray-600">
              Processing your appointment...
            </p>
            <div className="mt-4 space-y-2 text-xs text-gray-500">
              <div className="flex items-center justify-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span>Validating time slot</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-2 w-2 animate-spin" />
                <span>Creating appointment</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="h-2 w-2 rounded-full bg-gray-300"></div>
                <span>Sending confirmation</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Staff loading skeleton
function StaffSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5" />
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
    </div>
  );
}

// General loading skeleton
function GeneralSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </div>
  );
}

// Network status indicator component
export function NetworkStatusIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check connection type if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      setConnectionType(connection?.effectiveType || 'unknown');

      const handleConnectionChange = () => {
        setConnectionType(connection?.effectiveType || 'unknown');
      };

      connection?.addEventListener('change', handleConnectionChange);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        connection?.removeEventListener('change', handleConnectionChange);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <Badge variant="destructive" className="fixed bottom-4 right-4 z-50">
        Offline
      </Badge>
    );
  }

  if (connectionType === 'slow-2g' || connectionType === '2g') {
    return (
      <Badge variant="secondary" className="fixed bottom-4 right-4 z-50">
        Slow Connection
      </Badge>
    );
  }

  return null;
}

// Progress indicator for multi-step processes
interface MultiStepProgressProps {
  steps: Array<{
    id: string;
    title: string;
    status: 'pending' | 'active' | 'completed' | 'error';
  }>;
  className?: string;
}

export function MultiStepProgress({
  steps,
  className,
}: MultiStepProgressProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center gap-3">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
              step.status === 'completed'
                ? 'bg-green-100 text-green-700'
                : step.status === 'active'
                  ? 'bg-blue-100 text-blue-700'
                  : step.status === 'error'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-500'
            }`}
          >
            {step.status === 'completed' ? (
              <CheckCircle className="h-3 w-3" />
            ) : step.status === 'active' ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              index + 1
            )}
          </div>
          <span
            className={`text-sm ${
              step.status === 'active'
                ? 'font-medium text-gray-900'
                : step.status === 'completed'
                  ? 'text-gray-700'
                  : step.status === 'error'
                    ? 'text-red-600'
                    : 'text-gray-500'
            }`}
          >
            {step.title}
          </span>
        </div>
      ))}
    </div>
  );
}

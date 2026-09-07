'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';

/**
 * Appointment Card Skeleton
 *
 * Loading skeleton for appointment cards with consistent styling
 */
export function AppointmentCardSkeleton() {
  return (
    <Card className="animate-pulse border-neutral-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-24 rounded bg-neutral-200" />
            <div className="h-3 w-16 rounded bg-neutral-200" />
          </div>
          <div className="h-6 w-16 rounded-full bg-neutral-200" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center space-x-3">
          <div className="h-4 w-4 rounded bg-neutral-200" />
          <div className="h-3 w-32 rounded bg-neutral-200" />
        </div>
        <div className="flex items-center space-x-3">
          <div className="h-4 w-4 rounded bg-neutral-200" />
          <div className="h-3 w-24 rounded bg-neutral-200" />
        </div>
        <div className="flex items-center space-x-3">
          <div className="h-4 w-4 rounded bg-neutral-200" />
          <div className="h-3 w-28 rounded bg-neutral-200" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Multiple Appointment Cards Skeleton
 *
 * Shows multiple loading skeletons for appointment lists
 */
export function AppointmentListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <AppointmentCardSkeleton key={index} />
      ))}
    </div>
  );
}

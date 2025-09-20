'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';

/**
 * Appointment Card Skeleton
 * 
 * Loading skeleton for appointment cards with consistent styling
 */
export function AppointmentCardSkeleton() {
    return (
        <Card className="shadow-sm border-neutral-200 animate-pulse">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <div className="h-4 bg-neutral-200 rounded w-24" />
                        <div className="h-3 bg-neutral-200 rounded w-16" />
                    </div>
                    <div className="h-6 w-16 bg-neutral-200 rounded-full" />
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex items-center space-x-3">
                    <div className="h-4 w-4 bg-neutral-200 rounded" />
                    <div className="h-3 bg-neutral-200 rounded w-32" />
                </div>
                <div className="flex items-center space-x-3">
                    <div className="h-4 w-4 bg-neutral-200 rounded" />
                    <div className="h-3 bg-neutral-200 rounded w-24" />
                </div>
                <div className="flex items-center space-x-3">
                    <div className="h-4 w-4 bg-neutral-200 rounded" />
                    <div className="h-3 bg-neutral-200 rounded w-28" />
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
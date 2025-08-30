'use client';

import { ServiceCard } from '@/components/services/service-card';
import { ServiceForm } from '@/components/services/service-form';
import { ServicesListHeader } from '@/components/services/services-list';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Service,
    ServiceFilters,
    useCreateService,
    useDeleteService,
    useServices,
    useUpdateService,
} from '@/hooks/useServices';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';

export default function ServicesPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    // State
    const [businessId, setBusinessId] = useState<string>('');
    const [filters, setFilters] = useState<ServiceFilters>({});
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [deletingService, setDeletingService] = useState<Service | null>(null);

    // Hooks
    const { data: services = [], isLoading, error } = useServices(businessId, filters);
    const createServiceMutation = useCreateService();
    const updateServiceMutation = useUpdateService();
    const deleteServiceMutation = useDeleteService();

    // Get business ID from user's businesses
    useEffect(() => {
        if (status === 'loading') return;
        if (!session) {
            router.push('/auth/signin');
            return;
        }

        // Fetch user's businesses to get the business ID
        const fetchBusinessId = async () => {
            try {
                const response = await fetch('/api/user/businesses');
                if (response.ok) {
                    const data = await response.json();
                    if (data.businesses && data.businesses.length > 0) {
                        setBusinessId(data.businesses[0].businessId);
                    }
                }
            } catch (error) {
                console.error('Error fetching business ID:', error);
            }
        };

        fetchBusinessId();
    }, [session, status, router]);

    if (status === 'loading') {
        return <ServicesPageSkeleton />;
    }

    if (!session) {
        return null;
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <h3 className="text-lg font-semibold text-red-800">Error Loading Services</h3>
                    <p className="mt-2 text-red-600">
                        {error instanceof Error ? error.message : 'Failed to load services'}
                    </p>
                </div>
            </div>
        );
    }

    const handleCreateService = (data: any) => {
        createServiceMutation.mutate(data, {
            onSuccess: () => {
                setIsCreateDialogOpen(false);
            },
        });
    };

    const handleUpdateService = (data: any) => {
        if (!editingService) return;

        updateServiceMutation.mutate(
            { serviceId: editingService.id, data },
            {
                onSuccess: () => {
                    setEditingService(null);
                },
            }
        );
    };

    const handleToggleActive = (service: Service) => {
        updateServiceMutation.mutate({
            serviceId: service.id,
            data: { isActive: !service.isActive },
        });
    };

    const handleToggleOnline = (service: Service) => {
        updateServiceMutation.mutate({
            serviceId: service.id,
            data: { isOnline: !service.isOnline },
        });
    };

    const handleDeleteService = () => {
        if (!deletingService) return;

        deleteServiceMutation.mutate(deletingService.id, {
            onSuccess: () => {
                setDeletingService(null);
            },
        });
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <Toaster position="top-right" />

            {/* Header with Search and Filters */}
            <ServicesListHeader
                filters={filters}
                onFiltersChange={setFilters}
                onCreateService={() => setIsCreateDialogOpen(true)}
                totalServices={services.length}
                isLoading={isLoading}
            />

            {/* Services Grid */}
            <div className="mt-8">
                {isLoading ? (
                    <ServicesGridSkeleton />
                ) : services.length === 0 ? (
                    <EmptyServicesState
                        hasFilters={Object.keys(filters).some(key => filters[key as keyof ServiceFilters])}
                        onCreateService={() => setIsCreateDialogOpen(true)}
                        onClearFilters={() => setFilters({})}
                    />
                ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {services.map((service) => (
                            <ServiceCard
                                key={service.id}
                                service={service}
                                onEdit={setEditingService}
                                onToggleActive={handleToggleActive}
                                onToggleOnline={handleToggleOnline}
                                onDelete={setDeletingService}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Create Service Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Create New Service</DialogTitle>
                    </DialogHeader>
                    <ServiceForm
                        businessId={businessId}
                        onSubmit={handleCreateService}
                        onCancel={() => setIsCreateDialogOpen(false)}
                        isLoading={createServiceMutation.isPending}
                    />
                </DialogContent>
            </Dialog>

            {/* Edit Service Dialog */}
            <Dialog open={!!editingService} onOpenChange={() => setEditingService(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Service</DialogTitle>
                    </DialogHeader>
                    {editingService && (
                        <ServiceForm
                            businessId={businessId}
                            service={editingService}
                            onSubmit={handleUpdateService}
                            onCancel={() => setEditingService(null)}
                            isLoading={updateServiceMutation.isPending}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deletingService} onOpenChange={() => setDeletingService(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Deactivate Service</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to deactivate "{deletingService?.name}"?
                            This will hide the service from your booking system, but preserve
                            historical appointment data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteService}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Deactivate Service
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// Loading skeleton components
function ServicesPageSkeleton() {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="mt-2 h-4 w-48" />
                    </div>
                    <Skeleton className="h-10 w-28" />
                </div>

                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-10 w-20" />
                </div>
            </div>

            <ServicesGridSkeleton />
        </div>
    );
}

function ServicesGridSkeleton() {
    return (
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-gray-200 p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                            <Skeleton className="h-6 w-32 mb-2" />
                            <Skeleton className="h-4 w-20 mb-2" />
                            <Skeleton className="h-4 w-full mb-2" />
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                        <Skeleton className="h-8 w-8" />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-12" />
                    </div>

                    <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-20" />
                    </div>
                </div>
            ))}
        </div>
    );
}

// Empty state component
interface EmptyServicesStateProps {
    hasFilters: boolean;
    onCreateService: () => void;
    onClearFilters: () => void;
}

function EmptyServicesState({ hasFilters, onCreateService, onClearFilters }: EmptyServicesStateProps) {
    return (
        <div className="text-center py-12">
            <div className="mx-auto h-24 w-24 rounded-full bg-gradient-to-r from-orange-100 to-orange-200 flex items-center justify-center mb-6">
                <svg
                    className="h-12 w-12 text-orange-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0-1.125-.504-1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                </svg>
            </div>

            {hasFilters ? (
                <>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No services match your filters
                    </h3>
                    <p className="text-gray-600 mb-6">
                        Try adjusting your search criteria or clearing the filters.
                    </p>
                    <button
                        onClick={onClearFilters}
                        className="text-orange-600 hover:text-orange-700 font-medium"
                    >
                        Clear all filters
                    </button>
                </>
            ) : (
                <>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No services yet
                    </h3>
                    <p className="text-gray-600 mb-6">
                        Get started by creating your first service. Services are what your clients book appointments for.
                    </p>
                    <button
                        onClick={onCreateService}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600"
                    >
                        Create Your First Service
                    </button>
                </>
            )}
        </div>
    );
}
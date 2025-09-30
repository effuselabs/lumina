'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMobileDetection } from '@/hooks/use-mobile-detection';
import { cn } from '@/lib/utils';
import { AppointmentStatus, DashboardAppointment } from '@/types/dashboard-appointments';
import {
    Calendar,
    Clock,
    DollarSign,
    Edit,
    Mail,
    Phone,
    Trash2,
    User,
    X
} from 'lucide-react';
import { useEffect, useState } from 'react';

export interface MobileAppointmentModalProps {
    appointment: DashboardAppointment | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (appointment: Partial<DashboardAppointment>) => Promise<void>;
    onDelete: (appointmentId: string) => Promise<void>;
    mode: 'view' | 'edit' | 'create';
    staffMembers: Array<{
        id: string;
        firstName: string;
        lastName: string;
        displayName: string;
    }>;
    services: Array<{
        id: string;
        name: string;
        duration: number;
        price: number;
    }>;
}

/**
 * Mobile-optimized Appointment Modal Component
 * 
 * Uses drawer on mobile devices and dialog on desktop/tablet.
 * Optimized for touch interaction with larger touch targets and
 * simplified navigation.
 * 
 * Requirements: 6.1, 6.2, 6.5
 */
export function MobileAppointmentModal({
    appointment,
    isOpen,
    onClose,
    onSave,
    onDelete,
    mode: initialMode,
    staffMembers,
    services,
}: MobileAppointmentModalProps) {
    const { isMobile, isTablet } = useMobileDetection();
    const [mode, setMode] = useState<'view' | 'edit' | 'create'>(initialMode);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('details');

    // Reset mode when modal opens/closes or appointment changes
    useEffect(() => {
        setMode(initialMode);
        setActiveTab('details');
    }, [initialMode, appointment?.id, isOpen]);

    const formatTime = (date: Date): string => {
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    const formatDate = (date: Date): string => {
        if (isMobile) {
            return date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
            });
        }
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const formatDuration = (minutes: number): string => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
        }
        return `${mins}m`;
    };

    const formatPrice = (cents: number): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(cents / 100);
    };

    const getStatusColor = (status: AppointmentStatus): string => {
        switch (status) {
            case AppointmentStatus.SCHEDULED:
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case AppointmentStatus.CONFIRMED:
                return 'bg-green-100 text-green-800 border-green-200';
            case AppointmentStatus.IN_PROGRESS:
                return 'bg-lumina-radiant/20 text-lumina-coral border-lumina-coral/30';
            case AppointmentStatus.COMPLETED:
                return 'bg-gray-100 text-gray-600 border-gray-200';
            case AppointmentStatus.CANCELLED:
                return 'bg-red-100 text-red-800 border-red-200';
            case AppointmentStatus.NO_SHOW:
                return 'bg-orange-100 text-orange-800 border-orange-200';
            default:
                return 'bg-gray-100 text-gray-600 border-gray-200';
        }
    };

    const handleSave = async (updatedAppointment: Partial<DashboardAppointment>) => {
        setIsLoading(true);
        try {
            await onSave(updatedAppointment);
            setMode('view');
        } catch (error) {
            console.error('Failed to save appointment:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!appointment) return;

        setIsLoading(true);
        try {
            await onDelete(appointment.id);
            onClose();
        } catch (error) {
            console.error('Failed to delete appointment:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditToggle = () => {
        setMode(mode === 'edit' ? 'view' : 'edit');
    };

    if (!appointment && mode !== 'create') {
        return null;
    }

    const isEditing = mode === 'edit' || mode === 'create';
    const canEdit = appointment?.canEdit ?? true;
    const canDelete = appointment?.canCancel ?? true;

    // Mobile content
    const modalContent = (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex-shrink-0 p-4 border-b border-color-border">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xl font-semibold">
                        {mode === 'create' ? 'New Appointment' : 'Appointment'}
                    </h2>
                    <div className="flex items-center space-x-2">
                        {appointment && (
                            <Badge
                                variant="outline"
                                className={cn('border text-sm', getStatusColor(appointment.status))}
                            >
                                {appointment.status.replace('_', ' ')}
                            </Badge>
                        )}
                        {canEdit && mode !== 'create' && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleEditToggle}
                                disabled={isLoading}
                                className="touch-manipulation"
                            >
                                {isEditing ? (
                                    <>
                                        <X className="h-4 w-4 mr-1" />
                                        Cancel
                                    </>
                                ) : (
                                    <>
                                        <Edit className="h-4 w-4 mr-1" />
                                        Edit
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Quick info for mobile */}
                {appointment && isMobile && (
                    <div className="flex items-center justify-between text-sm text-color-foreground-muted">
                        <span>{formatDate(appointment.startTime)}</span>
                        <span>{formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}</span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                {isEditing ? (
                    <div className="p-4">
                        <div className="text-center text-color-foreground-muted">
                            <p>Appointment form would be implemented here</p>
                            <p className="text-sm mt-2">This would include touch-optimized form fields</p>
                        </div>
                    </div>
                ) : (
                    <ScrollArea className="h-full">
                        {isMobile ? (
                            <MobileAppointmentDetails appointment={appointment!} />
                        ) : (
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                                <TabsList className="grid w-full grid-cols-4 flex-shrink-0 mx-4 mt-4">
                                    <TabsTrigger value="details" className="touch-manipulation">Details</TabsTrigger>
                                    <TabsTrigger value="client" className="touch-manipulation">Client</TabsTrigger>
                                    <TabsTrigger value="status" className="touch-manipulation">Status</TabsTrigger>
                                    <TabsTrigger value="notes" className="touch-manipulation">Notes</TabsTrigger>
                                </TabsList>

                                <div className="flex-1 overflow-y-auto p-4">
                                    <TabsContent value="details">
                                        <AppointmentDetailsView appointment={appointment!} />
                                    </TabsContent>
                                    <TabsContent value="client">
                                        <div className="text-center text-color-foreground-muted">
                                            Client info component would be here
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="status">
                                        <div className="text-center text-color-foreground-muted">
                                            Status management component would be here
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="notes">
                                        <div className="text-center text-color-foreground-muted">
                                            Notes component would be here
                                        </div>
                                    </TabsContent>
                                </div>
                            </Tabs>
                        )}
                    </ScrollArea>
                )}
            </div>

            {/* Footer actions */}
            {!isEditing && canDelete && (
                <div className="flex-shrink-0 p-4 border-t border-color-border">
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isLoading}
                        className="w-full touch-manipulation h-12"
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Appointment
                    </Button>
                </div>
            )}
        </div>
    );

    // Use drawer for mobile, dialog for tablet/desktop
    if (isMobile) {
        return (
            <Drawer open={isOpen} onOpenChange={onClose}>
                <DrawerContent className="h-[90vh] flex flex-col">
                    {modalContent}
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className={cn(
                'max-h-[90vh] overflow-hidden flex flex-col',
                isTablet ? 'max-w-2xl' : 'max-w-4xl'
            )}>
                {modalContent}
            </DialogContent>
        </Dialog>
    );
}

/**
 * Mobile-optimized appointment details view
 * Single column layout with larger touch targets
 */
function MobileAppointmentDetails({ appointment }: { appointment: DashboardAppointment }) {
    const formatTime = (date: Date): string => {
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    const formatDate = (date: Date): string => {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const formatDuration = (minutes: number): string => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
        }
        return `${mins}m`;
    };

    const formatPrice = (cents: number): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(cents / 100);
    };

    return (
        <div className="p-4 space-y-6">
            {/* Date and Time */}
            <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-color-background-muted rounded-lg">
                    <Calendar className="h-6 w-6 text-lumina-coral flex-shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm text-color-foreground-muted">Date</p>
                        <p className="font-medium text-lg">{formatDate(appointment.startTime)}</p>
                    </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-color-background-muted rounded-lg">
                    <Clock className="h-6 w-6 text-lumina-coral flex-shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm text-color-foreground-muted">Time</p>
                        <p className="font-medium text-lg">
                            {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                        </p>
                    </div>
                </div>
            </div>

            <Separator />

            {/* Staff Information */}
            <div className="flex items-center space-x-3 p-3 bg-color-background-muted rounded-lg">
                <User className="h-6 w-6 text-lumina-coral flex-shrink-0" />
                <div className="flex-1">
                    <p className="text-sm text-color-foreground-muted">Staff Member</p>
                    <p className="font-medium text-lg">{appointment.staff.displayName}</p>
                </div>
            </div>

            <Separator />

            {/* Client Information */}
            <div className="space-y-3">
                <h3 className="text-lg font-medium">Client Information</h3>
                <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-3 bg-color-background-muted rounded-lg">
                        <User className="h-5 w-5 text-gray-500 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="font-medium">{appointment.client.firstName} {appointment.client.lastName}</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3 p-3 bg-color-background-muted rounded-lg">
                        <Mail className="h-5 w-5 text-gray-500 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm text-color-foreground-muted">Email</p>
                            <p className="font-medium">{appointment.client.email}</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3 p-3 bg-color-background-muted rounded-lg">
                        <Phone className="h-5 w-5 text-gray-500 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm text-color-foreground-muted">Phone</p>
                            <p className="font-medium">{appointment.client.phone}</p>
                        </div>
                    </div>
                </div>
            </div>

            <Separator />

            {/* Services */}
            <div className="space-y-3">
                <h3 className="text-lg font-medium">Services</h3>
                <div className="space-y-3">
                    {appointment.services.map((service) => (
                        <div key={service.id} className="p-4 bg-color-background-muted rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                                <p className="font-medium text-lg">{service.name}</p>
                                <p className="font-semibold text-lg">{formatPrice(service.price)}</p>
                            </div>
                            <p className="text-sm text-color-foreground-muted">{formatDuration(service.duration)}</p>
                        </div>
                    ))}
                </div>

                <div className="p-4 bg-lumina-radiant/10 rounded-lg border border-lumina-coral/20">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                            <DollarSign className="h-6 w-6 text-lumina-coral" />
                            <span className="font-medium text-lg">Total</span>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-xl text-lumina-coral">{formatPrice(appointment.totalPrice)}</p>
                            <p className="text-sm text-color-foreground-muted">{formatDuration(appointment.totalDuration)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Standard appointment details view for tablet/desktop
 */
function AppointmentDetailsView({ appointment }: { appointment: DashboardAppointment }) {
    const formatTime = (date: Date): string => {
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    const formatDate = (date: Date): string => {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const formatDuration = (minutes: number): string => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
        }
        return `${mins}m`;
    };

    const formatPrice = (cents: number): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(cents / 100);
    };

    return (
        <div className="space-y-6">
            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-gray-500" />
                    <div>
                        <p className="text-sm text-gray-500">Date</p>
                        <p className="font-medium">{formatDate(appointment.startTime)}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-gray-500" />
                    <div>
                        <p className="text-sm text-gray-500">Time</p>
                        <p className="font-medium">
                            {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                        </p>
                    </div>
                </div>
            </div>

            <Separator />

            {/* Staff Information */}
            <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-gray-500" />
                <div>
                    <p className="text-sm text-gray-500">Staff Member</p>
                    <p className="font-medium">{appointment.staff.displayName}</p>
                </div>
            </div>

            <Separator />

            {/* Services */}
            <div>
                <h3 className="text-lg font-medium mb-3">Services</h3>
                <div className="space-y-3">
                    {appointment.services.map((service) => (
                        <div key={service.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div>
                                <p className="font-medium">{service.name}</p>
                                <p className="text-sm text-gray-500">{formatDuration(service.duration)}</p>
                            </div>
                            <p className="font-medium">{formatPrice(service.price)}</p>
                        </div>
                    ))}
                </div>
                <div className="mt-4 pt-3 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                            <DollarSign className="h-5 w-5 text-gray-500" />
                            <span className="font-medium">Total</span>
                        </div>
                        <div className="text-right">
                            <p className="font-semibold text-lg">{formatPrice(appointment.totalPrice)}</p>
                            <p className="text-sm text-gray-500">{formatDuration(appointment.totalDuration)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Client Contact */}
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-gray-500" />
                    <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{appointment.client.email}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-gray-500" />
                    <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="font-medium">{appointment.client.phone}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
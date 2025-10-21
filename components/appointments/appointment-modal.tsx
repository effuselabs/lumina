'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { AppointmentForm } from './appointment-form';
import { AppointmentNotes } from './appointment-notes';
import { AppointmentStatusManager } from './appointment-status-manager';
import { ClientInfo } from './client-info';

export interface AppointmentModalProps {
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
 * AppointmentModal Component
 * 
 * Comprehensive modal for viewing, editing, and creating appointments.
 * Supports multiple tabs for different aspects of appointment management.
 * 
 * Requirements: 1.5, 3.1, 3.3, 3.4, 3.5, 3.7
 */
export function AppointmentModal({
    appointment,
    isOpen,
    onClose,
    onSave,
    onDelete,
    mode: initialMode,
    staffMembers,
    services,
}: AppointmentModalProps) {
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
            // Error handling would be implemented here
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
            // Error handling would be implemented here
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

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-xl font-semibold">
                            {mode === 'create' ? 'New Appointment' : 'Appointment Details'}
                        </DialogTitle>
                        <div className="flex items-center space-x-2">
                            {appointment && (
                                <Badge
                                    variant="outline"
                                    className={cn('border', getStatusColor(appointment.status))}
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
                </DialogHeader>

                <div className="flex-1 overflow-hidden">
                    {isEditing ? (
                        <AppointmentForm
                            appointment={appointment}
                            onSave={handleSave}
                            onCancel={() => mode === 'create' ? onClose() : setMode('view')}
                            staffMembers={staffMembers}
                            services={services}
                            isLoading={isLoading}
                        />
                    ) : (
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                            <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
                                <TabsTrigger value="details">Details</TabsTrigger>
                                <TabsTrigger value="client">Client</TabsTrigger>
                                <TabsTrigger value="status">Status</TabsTrigger>
                                <TabsTrigger value="notes">Notes</TabsTrigger>
                            </TabsList>

                            <div className="flex-1 overflow-y-auto">
                                <TabsContent value="details" className="space-y-6 p-1">
                                    <AppointmentDetailsView appointment={appointment!} />
                                </TabsContent>

                                <TabsContent value="client" className="space-y-6 p-1">
                                    <ClientInfo
                                        client={appointment!.client}
                                        onUpdate={async (clientData) => {
                                            // Handle client info updates
                                            console.log('Client update:', clientData);
                                        }}
                                    />
                                </TabsContent>

                                <TabsContent value="status" className="space-y-6 p-1">
                                    <AppointmentStatusManager
                                        appointment={appointment!}
                                        onStatusChange={async (status) => {
                                            handleSave({ status });
                                        }}
                                    />
                                </TabsContent>

                                <TabsContent value="notes" className="space-y-6 p-1">
                                    <AppointmentNotes
                                        appointment={appointment!}
                                        onNotesUpdate={async (notes) => {
                                            handleSave({ notes });
                                        }}
                                    />
                                </TabsContent>
                            </div>
                        </Tabs>
                    )}
                </div>

                {!isEditing && canDelete && (
                    <div className="flex-shrink-0 pt-4 border-t">
                        <div className="flex justify-end">
                            <Button
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={isLoading}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Appointment
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

/**
 * AppointmentDetailsView Component
 * 
 * Read-only view of appointment details
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
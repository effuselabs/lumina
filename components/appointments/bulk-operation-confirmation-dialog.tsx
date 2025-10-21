'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AppointmentStatus, DashboardAppointment } from '@/types/dashboard-appointments';
import { format } from 'date-fns';
import { AlertTriangle, Calendar, Clock, XCircle } from 'lucide-react';
import React from 'react';

interface BulkOperationConfirmationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    operation: 'cancel' | 'status_update' | 'reschedule';
    appointmentCount: number;
    appointments: DashboardAppointment[];
    newStatus?: AppointmentStatus;
    newDateTime?: Date;
}

export function BulkOperationConfirmationDialog({
    isOpen,
    onClose,
    onConfirm,
    operation,
    appointmentCount,
    appointments,
    newStatus,
    newDateTime,
}: BulkOperationConfirmationDialogProps) {
    const [isLoading, setIsLoading] = React.useState(false);

    const getOperationDetails = () => {
        switch (operation) {
            case 'cancel':
                return {
                    title: 'Cancel Appointments',
                    description: `Are you sure you want to cancel ${appointmentCount} appointment${appointmentCount > 1 ? 's' : ''}?`,
                    icon: <XCircle className="h-5 w-5 text-red-500" />,
                    confirmText: 'Cancel Appointments',
                    confirmVariant: 'destructive' as const,
                };
            case 'status_update':
                return {
                    title: 'Update Status',
                    description: `Update ${appointmentCount} appointment${appointmentCount > 1 ? 's' : ''} to "${newStatus}"?`,
                    icon: <Clock className="h-5 w-5 text-blue-500" />,
                    confirmText: 'Update Status',
                    confirmVariant: 'primary' as const,
                };
            case 'reschedule':
                return {
                    title: 'Reschedule Appointments',
                    description: `Reschedule ${appointmentCount} appointment${appointmentCount > 1 ? 's' : ''} to ${newDateTime ? format(newDateTime, 'PPP p') : 'new time'}?`,
                    icon: <Calendar className="h-5 w-5 text-green-500" />,
                    confirmText: 'Reschedule',
                    confirmVariant: 'primary' as const,
                };
            default:
                return {
                    title: 'Confirm Operation',
                    description: `Perform operation on ${appointmentCount} appointment${appointmentCount > 1 ? 's' : ''}?`,
                    icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
                    confirmText: 'Confirm',
                    confirmVariant: 'primary' as const,
                };
        }
    };

    const handleConfirm = async () => {
        setIsLoading(true);
        try {
            await onConfirm();
        } finally {
            setIsLoading(false);
        }
    };

    const operationDetails = getOperationDetails();

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {operationDetails.icon}
                        {operationDetails.title}
                    </DialogTitle>
                    <DialogDescription>
                        {operationDetails.description}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {operation === 'cancel' && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center gap-2 text-red-800">
                                <AlertTriangle className="h-4 w-4" />
                                <span className="font-medium">Warning</span>
                            </div>
                            <p className="text-sm text-red-700 mt-1">
                                This action cannot be undone. Clients will be notified of the cancellation.
                            </p>
                        </div>
                    )}

                    <div>
                        <h4 className="font-medium mb-2">Affected Appointments:</h4>
                        <ScrollArea className="h-48 border rounded-lg">
                            <div className="p-3 space-y-2">
                                {appointments.map((appointment) => (
                                    <div
                                        key={appointment.id}
                                        className="flex items-center justify-between p-2 bg-gray-50 rounded"
                                    >
                                        <div className="flex-1">
                                            <div className="font-medium">
                                                {appointment.client.firstName} {appointment.client.lastName}
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                {format(appointment.startTime, 'PPP p')} • {appointment.staff.displayName}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {appointment.services.map(s => s.name).join(', ')}
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="ml-2">
                                            {appointment.status}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    {newStatus && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="text-sm">
                                <span className="font-medium">New Status:</span>{' '}
                                <Badge variant="secondary" className="ml-1">
                                    {newStatus}
                                </Badge>
                            </div>
                        </div>
                    )}

                    {newDateTime && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="text-sm">
                                <span className="font-medium">New Date & Time:</span>{' '}
                                <span className="ml-1">{format(newDateTime, 'PPP p')}</span>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button
                        variant={operationDetails.confirmVariant as "destructive" | "outline" | "secondary" | "ghost" | "link" | "primary" | "premium-glass" | "premium-glow" | "premium-floating"}
                        onClick={handleConfirm}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Processing...' : operationDetails.confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
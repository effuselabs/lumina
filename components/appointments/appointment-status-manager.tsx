'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { AppointmentStatus, DashboardAppointment } from '@/types/dashboard-appointments';
import {
    AlertTriangle,
    Calendar,
    CheckCircle,
    Clock,
    MessageSquare,
    Play,
    User,
    XCircle
} from 'lucide-react';
import { useState } from 'react';

export interface AppointmentStatusManagerProps {
    appointment: DashboardAppointment;
    onStatusChange: (status: AppointmentStatus, reason?: string) => Promise<void>;
}

interface StatusTransition {
    from: AppointmentStatus;
    to: AppointmentStatus;
    label: string;
    icon: React.ReactNode;
    variant: 'default' | 'destructive' | 'outline' | 'secondary';
    requiresReason?: boolean;
    confirmationMessage?: string;
}

/**
 * AppointmentStatusManager Component
 * 
 * Manages appointment status transitions with workflow validation.
 * Provides appropriate status change options based on current status.
 * 
 * Requirements: 3.3, 3.7
 */
export function AppointmentStatusManager({
    appointment,
    onStatusChange,
}: AppointmentStatusManagerProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [showReasonInput, setShowReasonInput] = useState(false);
    const [pendingTransition, setPendingTransition] = useState<StatusTransition | null>(null);
    const [reason, setReason] = useState('');

    // Define valid status transitions
    const statusTransitions: StatusTransition[] = [
        // From SCHEDULED
        {
            from: AppointmentStatus.SCHEDULED,
            to: AppointmentStatus.CONFIRMED,
            label: 'Confirm Appointment',
            icon: <CheckCircle className="h-4 w-4" />,
            variant: 'default',
        },
        {
            from: AppointmentStatus.SCHEDULED,
            to: AppointmentStatus.CANCELLED,
            label: 'Cancel Appointment',
            icon: <XCircle className="h-4 w-4" />,
            variant: 'destructive',
            requiresReason: true,
            confirmationMessage: 'Are you sure you want to cancel this appointment?',
        },

        // From CONFIRMED
        {
            from: AppointmentStatus.CONFIRMED,
            to: AppointmentStatus.IN_PROGRESS,
            label: 'Start Appointment',
            icon: <Play className="h-4 w-4" />,
            variant: 'default',
        },
        {
            from: AppointmentStatus.CONFIRMED,
            to: AppointmentStatus.CANCELLED,
            label: 'Cancel Appointment',
            icon: <XCircle className="h-4 w-4" />,
            variant: 'destructive',
            requiresReason: true,
            confirmationMessage: 'Are you sure you want to cancel this confirmed appointment?',
        },
        {
            from: AppointmentStatus.CONFIRMED,
            to: AppointmentStatus.NO_SHOW,
            label: 'Mark as No Show',
            icon: <AlertTriangle className="h-4 w-4" />,
            variant: 'outline',
            requiresReason: true,
        },

        // From IN_PROGRESS
        {
            from: AppointmentStatus.IN_PROGRESS,
            to: AppointmentStatus.COMPLETED,
            label: 'Complete Appointment',
            icon: <CheckCircle className="h-4 w-4" />,
            variant: 'default',
        },

        // From COMPLETED (limited transitions)
        {
            from: AppointmentStatus.COMPLETED,
            to: AppointmentStatus.SCHEDULED,
            label: 'Reopen Appointment',
            icon: <Calendar className="h-4 w-4" />,
            variant: 'outline',
            requiresReason: true,
            confirmationMessage: 'This will reopen a completed appointment. Please provide a reason.',
        },
    ];

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

    const getStatusIcon = (status: AppointmentStatus) => {
        switch (status) {
            case AppointmentStatus.SCHEDULED:
                return <Clock className="h-4 w-4" />;
            case AppointmentStatus.CONFIRMED:
                return <CheckCircle className="h-4 w-4" />;
            case AppointmentStatus.IN_PROGRESS:
                return <Play className="h-4 w-4" />;
            case AppointmentStatus.COMPLETED:
                return <CheckCircle className="h-4 w-4" />;
            case AppointmentStatus.CANCELLED:
                return <XCircle className="h-4 w-4" />;
            case AppointmentStatus.NO_SHOW:
                return <AlertTriangle className="h-4 w-4" />;
            default:
                return <Clock className="h-4 w-4" />;
        }
    };

    const formatDateTime = (date: Date): string => {
        return date.toLocaleString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    const getAvailableTransitions = (): StatusTransition[] => {
        return statusTransitions.filter(transition =>
            transition.from === appointment.status
        );
    };

    const handleStatusTransition = (transition: StatusTransition) => {
        if (transition.requiresReason) {
            setPendingTransition(transition);
            setShowReasonInput(true);
            setReason('');
        } else {
            executeStatusChange(transition);
        }
    };

    const executeStatusChange = async (transition: StatusTransition, reasonText?: string) => {
        setIsLoading(true);
        try {
            await onStatusChange(transition.to, reasonText);
            setShowReasonInput(false);
            setPendingTransition(null);
            setReason('');
        } catch (error) {
            console.error('Failed to change status:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReasonSubmit = () => {
        if (pendingTransition) {
            executeStatusChange(pendingTransition, reason);
        }
    };

    const handleCancelReason = () => {
        setShowReasonInput(false);
        setPendingTransition(null);
        setReason('');
    };

    const availableTransitions = getAvailableTransitions();

    return (
        <div className="space-y-6">
            {/* Current Status */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Calendar className="h-5 w-5" />
                        <span>Current Status</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <Badge
                                variant="outline"
                                className={cn('border px-3 py-1', getStatusColor(appointment.status))}
                            >
                                <div className="flex items-center space-x-2">
                                    {getStatusIcon(appointment.status)}
                                    <span>{appointment.status.replace('_', ' ')}</span>
                                </div>
                            </Badge>
                        </div>
                        <div className="text-sm text-gray-500">
                            Last updated: {formatDateTime(appointment.lastUpdated)}
                            {appointment.updatedBy && (
                                <div className="flex items-center space-x-1 mt-1">
                                    <User className="h-3 w-3" />
                                    <span>by {appointment.updatedBy}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Status Transitions */}
            {availableTransitions.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Available Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {availableTransitions.map((transition, index) => (
                                <Button
                                    key={index}
                                    variant={transition.variant}
                                    onClick={() => handleStatusTransition(transition)}
                                    disabled={isLoading}
                                    className="justify-start"
                                >
                                    {transition.icon}
                                    <span className="ml-2">{transition.label}</span>
                                </Button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Reason Input Modal */}
            {showReasonInput && pendingTransition && (
                <Card className="border-orange-200 bg-orange-50">
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-orange-800">
                            <MessageSquare className="h-5 w-5" />
                            <span>Reason Required</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {pendingTransition.confirmationMessage && (
                            <Alert>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    {pendingTransition.confirmationMessage}
                                </AlertDescription>
                            </Alert>
                        )}
                        <div>
                            <Label htmlFor="reason">
                                Please provide a reason for changing status to "{pendingTransition.to.replace('_', ' ')}":
                            </Label>
                            <Textarea
                                id="reason"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Enter reason for status change..."
                                rows={3}
                                className="mt-2"
                            />
                        </div>
                        <div className="flex justify-end space-x-3">
                            <Button
                                variant="outline"
                                onClick={handleCancelReason}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleReasonSubmit}
                                disabled={isLoading || !reason.trim()}
                                variant={pendingTransition.variant}
                            >
                                {isLoading ? 'Processing...' : `Confirm ${pendingTransition.label}`}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Status History */}
            <Card>
                <CardHeader>
                    <CardTitle>Status History</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {/* Current status entry */}
                        <div className="flex items-start space-x-3 pb-3">
                            <div className="flex-shrink-0 mt-1">
                                {getStatusIcon(appointment.status)}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <p className="font-medium">{appointment.status.replace('_', ' ')}</p>
                                    <p className="text-sm text-gray-500">
                                        {formatDateTime(appointment.lastUpdated)}
                                    </p>
                                </div>
                                {appointment.updatedBy && (
                                    <p className="text-sm text-gray-500">Updated by {appointment.updatedBy}</p>
                                )}
                            </div>
                        </div>

                        {/* Placeholder for historical entries */}
                        <div className="text-sm text-gray-500 text-center py-4">
                            Status history would be displayed here based on appointment status history records
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Workflow Information */}
            <Card>
                <CardHeader>
                    <CardTitle>Workflow Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Can Edit:</span>
                            <span className={appointment.canEdit ? 'text-green-600' : 'text-red-600'}>
                                {appointment.canEdit ? 'Yes' : 'No'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Can Cancel:</span>
                            <span className={appointment.canCancel ? 'text-green-600' : 'text-red-600'}>
                                {appointment.canCancel ? 'Yes' : 'No'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Can Reschedule:</span>
                            <span className={appointment.canReschedule ? 'text-green-600' : 'text-red-600'}>
                                {appointment.canReschedule ? 'Yes' : 'No'}
                            </span>
                        </div>
                        {appointment.isConflicted && (
                            <Alert className="mt-3">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    This appointment has scheduling conflicts that need to be resolved.
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
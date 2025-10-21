'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropValidationResult } from '@/lib/drag-drop-utils';
import { CalendarSlot, ConflictInfo, DashboardAppointment } from '@/types/dashboard-appointments';
import { AlertTriangle, Calendar, Clock, Info, User } from 'lucide-react';

/**
 * Appointment Move Confirmation Dialog
 * 
 * Displays a confirmation dialog when moving appointments,
 * showing conflicts, warnings, and alternative suggestions.
 * 
 * Requirements: 2.2, 2.3, 3.2, 3.6
 */

interface AppointmentMoveConfirmationProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    onCancel: () => void;
    appointment: DashboardAppointment | null;
    fromSlot: CalendarSlot | null;
    toSlot: CalendarSlot | null;
    validation: DropValidationResult | null;
    suggestedAlternatives?: CalendarSlot[];
    onSelectAlternative?: (slot: CalendarSlot) => void;
    isLoading?: boolean;
}

export function AppointmentMoveConfirmation({
    isOpen,
    onClose,
    onConfirm,
    onCancel,
    appointment,
    fromSlot,
    toSlot,
    validation,
    suggestedAlternatives = [],
    onSelectAlternative,
    isLoading = false,
}: AppointmentMoveConfirmationProps) {
    if (!appointment || !fromSlot || !toSlot) {
        return null;
    }

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });
    };

    const isStaffChange = fromSlot.staffId !== toSlot.staffId && toSlot.staffId !== '';
    const isDateChange = fromSlot.startTime.toDateString() !== toSlot.startTime.toDateString();
    const hasConflicts = validation?.conflicts && validation.conflicts.length > 0;
    const hasWarnings = validation?.warnings && validation.warnings.length > 0;

    const getConflictIcon = (conflict: ConflictInfo) => {
        switch (conflict.type) {
            case 'overlap':
                return <Clock className="h-4 w-4" />;
            case 'staff_unavailable':
                return <User className="h-4 w-4" />;
            case 'business_closed':
                return <Calendar className="h-4 w-4" />;
            default:
                return <AlertTriangle className="h-4 w-4" />;
        }
    };

    const getConflictColor = (severity: 'warning' | 'error') => {
        return severity === 'error' ? 'destructive' : 'warning';
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center space-x-2">
                        <Calendar className="h-5 w-5" />
                        <span>Confirm Appointment Move</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Appointment Details */}
                    <div className="bg-color-background-muted rounded-lg p-4">
                        <h3 className="font-medium text-color-secondary mb-3">Appointment Details</h3>
                        <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                                <User className="h-4 w-4 text-color-foreground-muted" />
                                <span className="font-medium">
                                    {appointment.client.firstName} {appointment.client.lastName}
                                </span>
                            </div>
                            <div className="text-sm text-color-foreground-muted">
                                {appointment.services.map(s => s.name).join(', ')}
                            </div>
                            <div className="text-sm text-color-foreground-muted">
                                Duration: {Math.floor(appointment.totalDuration / 60)}h {appointment.totalDuration % 60}m
                            </div>
                        </div>
                    </div>

                    {/* Move Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* From */}
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <h4 className="font-medium text-red-800 mb-2">From</h4>
                            <div className="space-y-1 text-sm">
                                <div className="flex items-center space-x-2">
                                    <Calendar className="h-4 w-4 text-red-600" />
                                    <span>{formatDate(fromSlot.startTime)}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Clock className="h-4 w-4 text-red-600" />
                                    <span>{formatTime(fromSlot.startTime)}</span>
                                </div>
                                {fromSlot.staffId && (
                                    <div className="flex items-center space-x-2">
                                        <User className="h-4 w-4 text-red-600" />
                                        <span>{appointment.staff.displayName}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* To */}
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <h4 className="font-medium text-green-800 mb-2">To</h4>
                            <div className="space-y-1 text-sm">
                                <div className="flex items-center space-x-2">
                                    <Calendar className="h-4 w-4 text-green-600" />
                                    <span>{formatDate(toSlot.startTime)}</span>
                                    {isDateChange && <Badge variant="secondary">Date Change</Badge>}
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Clock className="h-4 w-4 text-green-600" />
                                    <span>{formatTime(toSlot.startTime)}</span>
                                </div>
                                {toSlot.staffId && (
                                    <div className="flex items-center space-x-2">
                                        <User className="h-4 w-4 text-green-600" />
                                        <span>Staff Member</span>
                                        {isStaffChange && <Badge variant="secondary">Staff Change</Badge>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Conflicts */}
                    {hasConflicts && validation && (
                        <div className="space-y-3">
                            <h3 className="font-medium text-color-secondary flex items-center space-x-2">
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                                <span>Conflicts Detected</span>
                            </h3>
                            {validation.conflicts.map((conflict, index) => (
                                <Alert key={index} variant={getConflictColor(conflict.severity) as "default" | "destructive"}>
                                    <div className="flex items-start space-x-2">
                                        {getConflictIcon(conflict)}
                                        <AlertDescription>{conflict.message}</AlertDescription>
                                    </div>
                                </Alert>
                            ))}
                        </div>
                    )}

                    {/* Warnings */}
                    {hasWarnings && validation && (
                        <div className="space-y-3">
                            <h3 className="font-medium text-color-secondary flex items-center space-x-2">
                                <Info className="h-5 w-5 text-yellow-500" />
                                <span>Important Notes</span>
                            </h3>
                            {validation.warnings.map((warning, index) => (
                                <Alert key={index} variant="default">
                                    <Info className="h-4 w-4" />
                                    <AlertDescription>{warning}</AlertDescription>
                                </Alert>
                            ))}
                        </div>
                    )}

                    {/* Alternative Suggestions */}
                    {suggestedAlternatives.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="font-medium text-color-secondary">Suggested Alternatives</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {suggestedAlternatives.slice(0, 4).map((slot, index) => (
                                    <button
                                        key={index}
                                        onClick={() => onSelectAlternative?.(slot)}
                                        className="p-3 border border-color-border rounded-lg hover:bg-color-background-muted transition-colors text-left"
                                    >
                                        <div className="text-sm font-medium">
                                            {formatDate(slot.startTime)}
                                        </div>
                                        <div className="text-sm text-color-foreground-muted">
                                            {formatTime(slot.startTime)}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <Button
                        variant="outline"
                        onClick={onCancel}
                        disabled={isLoading}
                        className="w-full sm:w-auto"
                    >
                        Cancel
                    </Button>

                    {hasConflicts ? (
                        <Button
                            variant="destructive"
                            onClick={onConfirm}
                            disabled={isLoading}
                            className="w-full sm:w-auto"
                        >
                            {isLoading ? 'Moving...' : 'Force Move'}
                        </Button>
                    ) : (
                        <Button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className="w-full sm:w-auto"
                        >
                            {isLoading ? 'Moving...' : 'Confirm Move'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
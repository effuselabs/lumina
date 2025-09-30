'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { AppointmentStatus, DashboardAppointment } from '@/types/appointment-types';
import {
    Calendar,
    CheckSquare,
    Clock,
    MoreHorizontal,
    Square,
    X,
    XCircle
} from 'lucide-react';
import { useState } from 'react';
import { BulkOperationConfirmationDialog } from './bulk-operation-confirmation-dialog';
import { BulkRescheduleDialog } from './bulk-reschedule-dialog';
import { useBulkSelection } from './bulk-selection-provider';

interface BulkOperationsToolbarProps {
    appointments: DashboardAppointment[];
    onBulkCancel: (appointmentIds: string[]) => Promise<void>;
    onBulkStatusUpdate: (appointmentIds: string[], status: AppointmentStatus) => Promise<void>;
    onBulkReschedule: (appointmentIds: string[], newDateTime: Date) => Promise<void>;
}

export function BulkOperationsToolbar({
    appointments,
    onBulkCancel,
    onBulkStatusUpdate,
    onBulkReschedule,
}: BulkOperationsToolbarProps) {
    const {
        selectedAppointments,
        isSelectionMode,
        selectAll,
        clearSelection,
        exitSelectionMode,
        getSelectedAppointments,
    } = useBulkSelection();

    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [showStatusDialog, setShowStatusDialog] = useState(false);
    const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState<AppointmentStatus>('confirmed');

    const selectedCount = selectedAppointments.size;
    const allSelected = selectedCount === appointments.length && appointments.length > 0;
    const someSelected = selectedCount > 0 && selectedCount < appointments.length;

    const handleSelectAll = () => {
        if (allSelected) {
            clearSelection();
        } else {
            selectAll(appointments);
        }
    };

    const handleBulkCancel = async () => {
        const selectedIds = Array.from(selectedAppointments);
        await onBulkCancel(selectedIds);
        setShowCancelDialog(false);
        clearSelection();
    };

    const handleBulkStatusUpdate = async () => {
        const selectedIds = Array.from(selectedAppointments);
        await onBulkStatusUpdate(selectedIds, selectedStatus);
        setShowStatusDialog(false);
        clearSelection();
    };

    const handleBulkReschedule = async (newDateTime: Date) => {
        const selectedIds = Array.from(selectedAppointments);
        await onBulkReschedule(selectedIds, newDateTime);
        setShowRescheduleDialog(false);
        clearSelection();
    };

    if (!isSelectionMode) {
        return null;
    }

    return (
        <>
            <div className="flex items-center justify-between p-4 bg-blue-50 border-b border-blue-200">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={exitSelectionMode}
                        className="text-blue-700 hover:text-blue-800"
                    >
                        <X className="h-4 w-4" />
                    </Button>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSelectAll}
                            className="text-blue-700 hover:text-blue-800"
                        >
                            {allSelected ? (
                                <CheckSquare className="h-4 w-4" />
                            ) : (
                                <Square className="h-4 w-4" />
                            )}
                        </Button>

                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            {selectedCount} selected
                        </Badge>
                    </div>
                </div>

                {selectedCount > 0 && (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowRescheduleDialog(true)}
                            className="text-blue-700 border-blue-200 hover:bg-blue-100"
                        >
                            <Calendar className="h-4 w-4 mr-2" />
                            Reschedule
                        </Button>

                        <Select value={selectedStatus} onValueChange={(value: AppointmentStatus) => setSelectedStatus(value)}>
                            <SelectTrigger className="w-32 h-8 text-sm">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="no_show">No Show</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowStatusDialog(true)}
                            className="text-blue-700 border-blue-200 hover:bg-blue-100"
                        >
                            <Clock className="h-4 w-4 mr-2" />
                            Update Status
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowCancelDialog(true)}
                            className="text-red-700 border-red-200 hover:bg-red-100"
                        >
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancel
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setShowRescheduleDialog(true)}>
                                    <Calendar className="h-4 w-4 mr-2" />
                                    Reschedule All
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setShowStatusDialog(true)}>
                                    <Clock className="h-4 w-4 mr-2" />
                                    Update Status
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => setShowCancelDialog(true)}
                                    className="text-red-600"
                                >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Cancel All
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </div>

            <BulkOperationConfirmationDialog
                isOpen={showCancelDialog}
                onClose={() => setShowCancelDialog(false)}
                onConfirm={handleBulkCancel}
                operation="cancel"
                appointmentCount={selectedCount}
                appointments={getSelectedAppointments(appointments)}
            />

            <BulkOperationConfirmationDialog
                isOpen={showStatusDialog}
                onClose={() => setShowStatusDialog(false)}
                onConfirm={handleBulkStatusUpdate}
                operation="status_update"
                appointmentCount={selectedCount}
                appointments={getSelectedAppointments(appointments)}
                newStatus={selectedStatus}
            />

            <BulkRescheduleDialog
                isOpen={showRescheduleDialog}
                onClose={() => setShowRescheduleDialog(false)}
                onConfirm={handleBulkReschedule}
                appointments={getSelectedAppointments(appointments)}
            />
        </>
    );
}
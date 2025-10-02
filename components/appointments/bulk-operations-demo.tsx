'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useBulkOperations } from '@/hooks/use-bulk-operations';
import { AppointmentStatus, DashboardAppointment } from '@/types';
import { addHours, format } from 'date-fns';
import {
    Calendar,
    CheckSquare,
    Users
} from 'lucide-react';
import { useState } from 'react';
import { AppointmentBlock } from './appointment-block';
import { BulkOperationHistory } from './bulk-operation-history';
import { BulkOperationProgress } from './bulk-operation-progress';
import { BulkOperationsToolbar } from './bulk-operations-toolbar';
import { BulkSelectionProvider, useBulkSelection } from './bulk-selection-provider';

// Mock appointment data
const mockAppointments: DashboardAppointment[] = [
    {
        id: '1',
        businessId: 'business-1',
        clientId: 'client-1',
        staffId: 'staff-1',
        startTime: new Date(),
        endTime: addHours(new Date(), 1),
        status: 'confirmed' as AppointmentStatus,
        services: [{
            id: 'service-1',
            service: { id: 'service-1', name: 'Haircut', duration: 60, price: 50 },
            duration: 60,
            price: 50
        }],
        totalPrice: 50,
        totalDuration: 60,
        client: {
            id: 'client-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            phone: '555-0123',
        },
        staff: {
            id: 'staff-1',
            firstName: 'Sarah',
            lastName: 'Johnson',
            displayName: 'Sarah J.',
            color: '#3B82F6',
        },
        isConflicted: false,
        canEdit: true,
        canCancel: true,
        canReschedule: true,
        lastUpdated: new Date(),
    },
    {
        id: '2',
        businessId: 'business-1',
        clientId: 'client-2',
        staffId: 'staff-1',
        startTime: addHours(new Date(), 2),
        endTime: addHours(new Date(), 3),
        status: 'pending' as AppointmentStatus,
        services: [{
            id: 'service-2',
            service: { id: 'service-2', name: 'Hair Color', duration: 120, price: 80 },
            duration: 120,
            price: 80
        }],
        totalPrice: 80,
        totalDuration: 120,
        client: {
            id: 'client-2',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane@example.com',
            phone: '555-0124',
        },
        staff: {
            id: 'staff-1',
            firstName: 'Sarah',
            lastName: 'Johnson',
            displayName: 'Sarah J.',
            color: '#3B82F6',
        },
        isConflicted: false,
        canEdit: true,
        canCancel: true,
        canReschedule: true,
        lastUpdated: new Date(),
    },
    {
        id: '3',
        businessId: 'business-1',
        clientId: 'client-3',
        staffId: 'staff-2',
        startTime: addHours(new Date(), 4),
        endTime: addHours(new Date(), 5),
        status: 'confirmed' as AppointmentStatus,
        services: [{
            id: 'service-3',
            service: { id: 'service-3', name: 'Manicure', duration: 45, price: 35 },
            duration: 45,
            price: 35
        }],
        totalPrice: 35,
        totalDuration: 45,
        client: {
            id: 'client-3',
            firstName: 'Bob',
            lastName: 'Wilson',
            email: 'bob@example.com',
            phone: '555-0125',
        },
        staff: {
            id: 'staff-2',
            firstName: 'Mike',
            lastName: 'Chen',
            displayName: 'Mike C.',
            color: '#10B981',
        },
        isConflicted: false,
        canEdit: true,
        canCancel: true,
        canReschedule: true,
        lastUpdated: new Date(),
    },
];

function BulkOperationsDemoContent() {
    const {
        isSelectionMode,
        enterSelectionMode,
        exitSelectionMode,
        selectedAppointments,
        getSelectedAppointments
    } = useBulkSelection();

    const [showProgress, setShowProgress] = useState(false);
    const [progressOperation, setProgressOperation] = useState<'cancel' | 'status_update' | 'reschedule'>('cancel');
    const [progressResults, setProgressResults] = useState<any[]>([]);
    const [progressTotal, setProgressTotal] = useState(0);
    const [progressCompleted, setProgressCompleted] = useState(0);

    const {
        isLoading,
        currentOperation,
        cancelAppointments,
        updateAppointmentStatus,
        rescheduleAppointments,
    } = useBulkOperations({
        businessId: 'business-1',
        onOperationComplete: (operation, results) => {
            console.log(`${operation} completed:`, results);
            setShowProgress(false);
        },
        onError: (error) => {
            console.error('Bulk operation error:', error);
            setShowProgress(false);
        },
    });

    const handleBulkCancel = async (appointmentIds: string[]) => {
        setProgressOperation('cancel');
        setProgressTotal(appointmentIds.length);
        setProgressCompleted(0);
        setProgressResults([]);
        setShowProgress(true);

        await cancelAppointments(
            appointmentIds,
            'Bulk cancellation',
            true,
            (results) => {
                setProgressResults(results);
                setProgressCompleted(results.length);
            }
        );
    };

    const handleBulkStatusUpdate = async (appointmentIds: string[], status: AppointmentStatus) => {
        setProgressOperation('status_update');
        setProgressTotal(appointmentIds.length);
        setProgressCompleted(0);
        setProgressResults([]);
        setShowProgress(true);

        await updateAppointmentStatus(
            appointmentIds,
            status,
            'Bulk status update',
            (results) => {
                setProgressResults(results);
                setProgressCompleted(results.length);
            }
        );
    };

    const handleBulkReschedule = async (appointmentIds: string[], newDateTime: Date) => {
        setProgressOperation('reschedule');
        setProgressTotal(appointmentIds.length);
        setProgressCompleted(0);
        setProgressResults([]);
        setShowProgress(true);

        await rescheduleAppointments(
            appointmentIds,
            newDateTime,
            true,
            (results) => {
                setProgressResults(results);
                setProgressCompleted(results.length);
            }
        );
    };

    const selectedCount = selectedAppointments.size;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Bulk Operations Demo</h2>
                    <p className="text-gray-600">
                        Demonstrate bulk appointment management capabilities
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {!isSelectionMode ? (
                        <Button onClick={enterSelectionMode} variant="outline">
                            <CheckSquare className="h-4 w-4 mr-2" />
                            Select Multiple
                        </Button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                                {selectedCount} selected
                            </Badge>
                            <Button onClick={exitSelectionMode} variant="outline" size="sm">
                                Cancel Selection
                            </Button>
                        </div>
                    )}

                    <BulkOperationHistory businessId="business-1" />
                </div>
            </div>

            {/* Bulk Operations Toolbar */}
            <BulkOperationsToolbar
                appointments={mockAppointments}
                onBulkCancel={handleBulkCancel}
                onBulkStatusUpdate={handleBulkStatusUpdate}
                onBulkReschedule={handleBulkReschedule}
            />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{mockAppointments.length}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Selected</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{selectedCount}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Staff Members</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Set(mockAppointments.map(apt => apt.staffId)).size}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${mockAppointments.reduce((sum, apt) => sum + apt.totalPrice, 0)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Appointments Grid */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Appointments
                    </CardTitle>
                    <CardDescription>
                        {isSelectionMode
                            ? 'Click appointments to select them for bulk operations'
                            : 'Click "Select Multiple" to enable bulk operations'
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {mockAppointments.map((appointment) => (
                            <AppointmentBlock
                                key={appointment.id}
                                appointment={{
                                    id: appointment.id,
                                    clientName: `${appointment.client.firstName} ${appointment.client.lastName}`,
                                    serviceName: appointment.services.map(s => s.service.name).join(', '),
                                    startTime: appointment.startTime,
                                    endTime: appointment.endTime,
                                    status: appointment.status,
                                    staffName: appointment.staff.displayName,
                                    price: appointment.totalPrice,
                                }}
                                onClick={() => {
                                    if (!isSelectionMode) {
                                        console.log('Open appointment details:', appointment.id);
                                    }
                                }}
                                enableSelection={true}
                                view="day"
                            />
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Operation Instructions */}
            {isSelectionMode && selectedCount === 0 && (
                <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-full">
                                <CheckSquare className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-medium text-blue-900">Selection Mode Active</h3>
                                <p className="text-sm text-blue-700">
                                    Click on appointments to select them, then use the toolbar above to perform bulk operations.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Selected Appointments Summary */}
            {selectedCount > 0 && (
                <Card className="border-green-200 bg-green-50">
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-green-100 rounded-full">
                                <Users className="h-5 w-5 text-green-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-medium text-green-900 mb-2">
                                    {selectedCount} Appointment{selectedCount > 1 ? 's' : ''} Selected
                                </h3>
                                <div className="space-y-1">
                                    {getSelectedAppointments(mockAppointments).map((apt) => (
                                        <div key={apt.id} className="text-sm text-green-700">
                                            • {apt.client.firstName} {apt.client.lastName} - {format(apt.startTime, 'MMM d, h:mm a')}
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 text-sm text-green-600">
                                    Use the toolbar above to cancel, reschedule, or update the status of selected appointments.
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Progress Dialog */}
            <BulkOperationProgress
                isOpen={showProgress}
                operation={progressOperation}
                results={progressResults}
                totalCount={progressTotal}
                completedCount={progressCompleted}
                onClose={() => setShowProgress(false)}
            />
        </div>
    );
}

export function BulkOperationsDemo() {
    return (
        <BulkSelectionProvider>
            <BulkOperationsDemoContent />
        </BulkSelectionProvider>
    );
}
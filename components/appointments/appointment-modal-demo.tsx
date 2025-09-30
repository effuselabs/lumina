'use client';

import { Button } from '@/components/ui/button';
import { AppointmentStatus, DashboardAppointment } from '@/types/dashboard-appointments';
import { useState } from 'react';
import { AppointmentModal } from './appointment-modal';

/**
 * Demo component to test the AppointmentModal functionality
 * This can be used for development and testing purposes
 */
export function AppointmentModalDemo() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [mode, setMode] = useState<'view' | 'edit' | 'create'>('view');

    // Mock data for testing
    const mockAppointment: DashboardAppointment = {
        id: '1',
        businessId: 'business-1',
        clientId: 'client-1',
        staffId: 'staff-1',
        startTime: new Date('2024-01-15T10:00:00'),
        endTime: new Date('2024-01-15T11:00:00'),
        status: AppointmentStatus.SCHEDULED,
        services: [
            {
                id: 'service-1',
                name: 'Haircut',
                duration: 60,
                price: 5000, // $50.00 in cents
            },
        ],
        totalPrice: 5000,
        totalDuration: 60,
        notes: 'Client prefers shorter styles and is sensitive to heat.',
        client: {
            id: 'client-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            phone: '(555) 123-4567',
        },
        staff: {
            id: 'staff-1',
            firstName: 'Jane',
            lastName: 'Smith',
            displayName: 'Jane Smith',
            color: '#3B82F6',
        },
        isConflicted: false,
        canEdit: true,
        canCancel: true,
        canReschedule: true,
        lastUpdated: new Date('2024-01-15T09:00:00'),
    };

    const mockStaffMembers = [
        {
            id: 'staff-1',
            firstName: 'Jane',
            lastName: 'Smith',
            displayName: 'Jane Smith',
        },
        {
            id: 'staff-2',
            firstName: 'Mike',
            lastName: 'Johnson',
            displayName: 'Mike Johnson',
        },
    ];

    const mockServices = [
        {
            id: 'service-1',
            name: 'Haircut',
            duration: 60,
            price: 5000,
        },
        {
            id: 'service-2',
            name: 'Hair Wash',
            duration: 30,
            price: 2500,
        },
        {
            id: 'service-3',
            name: 'Styling',
            duration: 45,
            price: 3500,
        },
    ];

    const handleSave = async (appointment: Partial<DashboardAppointment>) => {
        console.log('Saving appointment:', appointment);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
    };

    const handleDelete = async (appointmentId: string) => {
        console.log('Deleting appointment:', appointmentId);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
    };

    const openModal = (modalMode: 'view' | 'edit' | 'create') => {
        setMode(modalMode);
        setIsModalOpen(true);
    };

    return (
        <div className="p-6 space-y-4">
            <h2 className="text-2xl font-bold">Appointment Modal Demo</h2>
            <p className="text-gray-600">
                Test the appointment modal functionality with different modes.
            </p>

            <div className="flex space-x-4">
                <Button onClick={() => openModal('view')}>
                    View Appointment
                </Button>
                <Button onClick={() => openModal('edit')} variant="outline">
                    Edit Appointment
                </Button>
                <Button onClick={() => openModal('create')} variant="secondary">
                    Create Appointment
                </Button>
            </div>

            <AppointmentModal
                appointment={mode === 'create' ? null : mockAppointment}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                onDelete={handleDelete}
                mode={mode}
                staffMembers={mockStaffMembers}
                services={mockServices}
            />
        </div>
    );
}
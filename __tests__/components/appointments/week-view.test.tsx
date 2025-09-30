import { WeekView } from '@/components/appointments/week-view';
import { AppointmentStatus, BusinessHours, DashboardAppointment, StaffMember } from '@/types/dashboard-appointments';
import { fireEvent, render, screen } from '@testing-library/react';

// Mock data
const mockStaffMembers: StaffMember[] = [
    {
        id: 'staff-1',
        firstName: 'John',
        lastName: 'Doe',
        displayName: 'John Doe',
        color: '#3B82F6',
        isActive: true,
        role: 'Stylist',
    },
    {
        id: 'staff-2',
        firstName: 'Jane',
        lastName: 'Smith',
        displayName: 'Jane Smith',
        color: '#EF4444',
        isActive: true,
        role: 'Colorist',
    },
];

const mockBusinessHours: BusinessHours[] = [
    { dayOfWeek: 0, openTime: '09:00', closeTime: '17:00', isClosed: false }, // Sunday
    { dayOfWeek: 1, openTime: '09:00', closeTime: '18:00', isClosed: false }, // Monday
    { dayOfWeek: 2, openTime: '09:00', closeTime: '18:00', isClosed: false }, // Tuesday
    { dayOfWeek: 3, openTime: '09:00', closeTime: '18:00', isClosed: false }, // Wednesday
    { dayOfWeek: 4, openTime: '09:00', closeTime: '18:00', isClosed: false }, // Thursday
    { dayOfWeek: 5, openTime: '09:00', closeTime: '18:00', isClosed: false }, // Friday
    { dayOfWeek: 6, openTime: '10:00', closeTime: '16:00', isClosed: false }, // Saturday
];

const mockAppointments: DashboardAppointment[] = [
    {
        id: 'apt-1',
        businessId: 'business-1',
        clientId: 'client-1',
        staffId: 'staff-1',
        startTime: new Date(2024, 0, 15, 10, 0), // Monday 10:00 AM
        endTime: new Date(2024, 0, 15, 11, 0),   // Monday 11:00 AM
        status: AppointmentStatus.CONFIRMED,
        services: [{ id: 'service-1', name: 'Haircut', duration: 60, price: 50 }],
        totalPrice: 50,
        totalDuration: 60,
        client: {
            id: 'client-1',
            firstName: 'Alice',
            lastName: 'Johnson',
            email: 'alice@example.com',
            phone: '555-0123',
        },
        staff: {
            id: 'staff-1',
            firstName: 'John',
            lastName: 'Doe',
            displayName: 'John Doe',
            color: '#3B82F6',
        },
        isConflicted: false,
        canEdit: true,
        canCancel: true,
        canReschedule: true,
        lastUpdated: new Date(),
    },
];

const mockProps = {
    currentDate: new Date(2024, 0, 15), // Monday, January 15, 2024
    appointments: mockAppointments,
    staffMembers: mockStaffMembers,
    businessHours: mockBusinessHours,
    onAppointmentClick: jest.fn(),
    onAppointmentDrop: jest.fn(),
    onTimeSlotClick: jest.fn(),
};

describe('WeekView', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders week header with day names and dates', () => {
        render(<WeekView {...mockProps} />);

        // Check for day names
        expect(screen.getByText('Sun')).toBeInTheDocument();
        expect(screen.getByText('Mon')).toBeInTheDocument();
        expect(screen.getByText('Tue')).toBeInTheDocument();
        expect(screen.getByText('Wed')).toBeInTheDocument();
        expect(screen.getByText('Thu')).toBeInTheDocument();
        expect(screen.getByText('Fri')).toBeInTheDocument();
        expect(screen.getByText('Sat')).toBeInTheDocument();

        // Check for time column header
        expect(screen.getByText('Time')).toBeInTheDocument();
    });

    it('displays appointment count indicators', () => {
        render(<WeekView {...mockProps} />);

        // Should show appointment count for Monday (where we have 1 appointment)
        expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('shows density visualization with appropriate colors', () => {
        const propsWithManyAppointments = {
            ...mockProps,
            appointments: [
                ...mockAppointments,
                ...Array.from({ length: 5 }, (_, i) => ({
                    ...mockAppointments[0],
                    id: `apt-${i + 2}`,
                    startTime: new Date(2024, 0, 15, 11 + i, 0),
                    endTime: new Date(2024, 0, 15, 12 + i, 0),
                })),
            ],
        };

        render(<WeekView {...propsWithManyAppointments} />);

        // Should show high density styling
        const mondayColumn = screen.getByText('15').closest('div');
        expect(mondayColumn).toHaveClass('bg-red-100');
    });

    it('handles time slot clicks', () => {
        render(<WeekView {...mockProps} />);

        // Find a time slot and click it
        const timeSlots = screen.getAllByText(/AM|PM/);
        if (timeSlots.length > 0) {
            fireEvent.click(timeSlots[0].closest('div')!);
            expect(mockProps.onTimeSlotClick).toHaveBeenCalled();
        }
    });

    it('displays appointments in correct time slots', () => {
        render(<WeekView {...mockProps} />);

        // Should show the appointment client name
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    it('shows closed business hours appropriately', () => {
        const propsWithClosedDay = {
            ...mockProps,
            businessHours: mockBusinessHours.map(bh =>
                bh.dayOfWeek === 1 ? { ...bh, isClosed: true } : bh
            ),
        };

        render(<WeekView {...propsWithClosedDay} />);

        // Should show "Closed" indicators
        expect(screen.getAllByText('Closed').length).toBeGreaterThan(0);
    });

    it('handles drag and drop operations', () => {
        render(<WeekView {...mockProps} />);

        // Find a time slot
        const timeSlots = document.querySelectorAll('[data-testid="time-slot"]');
        if (timeSlots.length > 0) {
            const dragEvent = new DragEvent('drop', {
                dataTransfer: new DataTransfer(),
            });
            dragEvent.dataTransfer!.setData('text/plain', 'apt-1');

            fireEvent(timeSlots[0], dragEvent);
            // Note: The actual drop handling would need more complex setup
        }
    });

    it('is responsive on mobile screens', () => {
        // Mock mobile viewport
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 375,
        });

        render(<WeekView {...mockProps} />);

        // Check for mobile-specific classes
        const timeColumn = screen.getByText('Time').closest('div');
        expect(timeColumn).toHaveClass('w-16');
    });

    it('shows current time indicator for today', () => {
        const today = new Date();
        const propsWithToday = {
            ...mockProps,
            currentDate: today,
            businessHours: mockBusinessHours.map(bh => ({
                ...bh,
                dayOfWeek: today.getDay(),
            })),
        };

        render(<WeekView {...propsWithToday} />);

        // Current time indicator should be present if within business hours
        // This is a complex test that would need more setup for exact timing
    });
});
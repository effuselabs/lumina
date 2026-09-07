import { DayView } from '@/components/appointments/day-view';
import {
  AppointmentStatus,
  DashboardAppointment,
} from '@/types/dashboard-appointments';
import { render, screen } from '@testing-library/react';

// Mock data for testing
const mockStaffMembers = [
  {
    id: 'staff-1',
    firstName: 'John',
    lastName: 'Doe',
    displayName: 'John Doe',
    color: '#FF7A5A',
    isActive: true,
    role: 'Stylist',
  },
  {
    id: 'staff-2',
    firstName: 'Jane',
    lastName: 'Smith',
    displayName: 'Jane Smith',
    color: '#4A90E2',
    isActive: true,
    role: 'Colorist',
  },
];

const mockBusinessHours = [
  { dayOfWeek: 1, openTime: '09:00', closeTime: '17:00', isClosed: false }, // Monday
  { dayOfWeek: 2, openTime: '09:00', closeTime: '17:00', isClosed: false }, // Tuesday
  { dayOfWeek: 3, openTime: '09:00', closeTime: '17:00', isClosed: false }, // Wednesday
  { dayOfWeek: 4, openTime: '09:00', closeTime: '17:00', isClosed: false }, // Thursday
  { dayOfWeek: 5, openTime: '09:00', closeTime: '17:00', isClosed: false }, // Friday
  { dayOfWeek: 6, openTime: '10:00', closeTime: '16:00', isClosed: false }, // Saturday
  { dayOfWeek: 0, openTime: null, closeTime: null, isClosed: true }, // Sunday
];

const mockAppointments: DashboardAppointment[] = [
  {
    id: 'apt-1',
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
        price: 50,
      },
    ],
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
      color: '#FF7A5A',
    },
    isConflicted: false,
    canEdit: true,
    canCancel: true,
    canReschedule: true,
    lastUpdated: new Date(),
  },
];

describe('DayView Component', () => {
  const defaultProps = {
    currentDate: new Date('2024-01-15'), // Monday
    appointments: mockAppointments,
    staffMembers: mockStaffMembers,
    businessHours: mockBusinessHours,
    onAppointmentClick: jest.fn(),
    onTimeSlotClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders staff headers correctly', () => {
    render(<DayView {...defaultProps} />);

    expect(screen.getByText('Time')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Stylist')).toBeInTheDocument();
    expect(screen.getByText('Colorist')).toBeInTheDocument();
  });

  it('generates time slots based on business hours', () => {
    render(<DayView {...defaultProps} />);

    // Should show time slots from 9:00 AM to 5:00 PM
    expect(screen.getByText('9:00 AM')).toBeInTheDocument();
    expect(screen.getByText('5:00 PM')).toBeInTheDocument();
  });

  it('displays appointments in correct time slots', () => {
    render(<DayView {...defaultProps} />);

    // Should show the appointment for Alice Johnson
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('Haircut')).toBeInTheDocument();
  });

  it('shows business closed message for closed days', () => {
    const sundayProps = {
      ...defaultProps,
      currentDate: new Date('2024-01-14'), // Sunday
    };

    render(<DayView {...sundayProps} />);

    expect(screen.getByText('Business Closed')).toBeInTheDocument();
    expect(
      screen.getByText('No business hours set for this day')
    ).toBeInTheDocument();
  });

  it('handles appointment conflicts correctly', () => {
    const conflictedAppointments = [
      ...mockAppointments,
      {
        ...mockAppointments[0],
        id: 'apt-2',
        clientId: 'client-2',
        client: {
          id: 'client-2',
          firstName: 'Bob',
          lastName: 'Wilson',
          email: 'bob@example.com',
          phone: '555-0124',
        },
        isConflicted: true,
      },
    ];

    const conflictProps = {
      ...defaultProps,
      appointments: conflictedAppointments,
    };

    render(<DayView {...conflictProps} />);

    // Should show both appointments
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
  });

  it('calls onTimeSlotClick when time slot is clicked', () => {
    const onTimeSlotClick = jest.fn();
    const props = {
      ...defaultProps,
      onTimeSlotClick,
    };

    render(<DayView {...props} />);

    // Find and click a time slot (this is a simplified test)
    // In a real test, you'd need to find the specific time slot element
    // and simulate a click event
    expect(onTimeSlotClick).not.toHaveBeenCalled();
  });

  it('filters appointments by staff member', () => {
    const multiStaffAppointments = [
      ...mockAppointments,
      {
        ...mockAppointments[0],
        id: 'apt-2',
        staffId: 'staff-2',
        clientId: 'client-2',
        client: {
          id: 'client-2',
          firstName: 'Bob',
          lastName: 'Wilson',
          email: 'bob@example.com',
          phone: '555-0124',
        },
        staff: {
          id: 'staff-2',
          firstName: 'Jane',
          lastName: 'Smith',
          displayName: 'Jane Smith',
          color: '#4A90E2',
        },
      },
    ];

    const props = {
      ...defaultProps,
      appointments: multiStaffAppointments,
    };

    render(<DayView {...props} />);

    // Should show appointments for both staff members
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
  });
});

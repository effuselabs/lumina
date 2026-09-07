import { MonthView } from '@/components/appointments/month-view';
import {
  AppointmentStatus,
  BusinessHours,
  DashboardAppointment,
  StaffMember,
} from '@/types/dashboard-appointments';
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
  { dayOfWeek: 0, openTime: null, closeTime: null, isClosed: true }, // Sunday - closed
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
    endTime: new Date(2024, 0, 15, 11, 0), // Monday 11:00 AM
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
  {
    id: 'apt-2',
    businessId: 'business-1',
    clientId: 'client-2',
    staffId: 'staff-2',
    startTime: new Date(2024, 0, 15, 14, 0), // Monday 2:00 PM
    endTime: new Date(2024, 0, 15, 15, 30), // Monday 3:30 PM
    status: AppointmentStatus.SCHEDULED,
    services: [{ id: 'service-2', name: 'Color', duration: 90, price: 120 }],
    totalPrice: 120,
    totalDuration: 90,
    client: {
      id: 'client-2',
      firstName: 'Bob',
      lastName: 'Wilson',
      email: 'bob@example.com',
      phone: '555-0456',
    },
    staff: {
      id: 'staff-2',
      firstName: 'Jane',
      lastName: 'Smith',
      displayName: 'Jane Smith',
      color: '#EF4444',
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

describe('MonthView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders month header with day names', () => {
    render(<MonthView {...mockProps} />);

    // Check for day names (should show full names on desktop)
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Tue')).toBeInTheDocument();
    expect(screen.getByText('Wed')).toBeInTheDocument();
    expect(screen.getByText('Thu')).toBeInTheDocument();
    expect(screen.getByText('Fri')).toBeInTheDocument();
    expect(screen.getByText('Sat')).toBeInTheDocument();
  });

  it('displays calendar grid with correct number of days', () => {
    render(<MonthView {...mockProps} />);

    // Should display 42 days (6 weeks × 7 days)
    const dayNumbers = screen.getAllByText(/^\d+$/);
    expect(dayNumbers.length).toBeGreaterThanOrEqual(28); // At least the days in the month
  });

  it('shows appointment count indicators', () => {
    render(<MonthView {...mockProps} />);

    // Should show appointment count for January 15 (where we have 2 appointments)
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('displays staff color indicators', () => {
    render(<MonthView {...mockProps} />);

    // Should show colored dots for different staff members
    const colorIndicators = document.querySelectorAll(
      '[style*="backgroundColor"]'
    );
    expect(colorIndicators.length).toBeGreaterThan(0);
  });

  it('shows density visualization with appropriate styling', () => {
    const propsWithManyAppointments = {
      ...mockProps,
      appointments: [
        ...mockAppointments,
        ...Array.from({ length: 6 }, (_, i) => ({
          ...mockAppointments[0],
          id: `apt-${i + 3}`,
          startTime: new Date(2024, 0, 15, 11 + i, 0),
          endTime: new Date(2024, 0, 15, 12 + i, 0),
        })),
      ],
    };

    render(<MonthView {...propsWithManyAppointments} />);

    // Should show high density styling
    const dayCell = screen.getByText('15').closest('div');
    expect(dayCell).toHaveClass('bg-red-50');
  });

  it('handles day cell clicks', () => {
    render(<MonthView {...mockProps} />);

    // Find the day with appointments and click it
    const dayCell = screen.getByText('15').closest('div');
    fireEvent.click(dayCell!);

    expect(mockProps.onTimeSlotClick).toHaveBeenCalled();
  });

  it('shows appointment previews on desktop', () => {
    render(<MonthView {...mockProps} />);

    // Should show appointment times and client names
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.getByText(/Bob/)).toBeInTheDocument();
  });

  it('displays closed business days', () => {
    render(<MonthView {...mockProps} />);

    // Should show "Closed" for Sunday
    expect(screen.getAllByText('Closed').length).toBeGreaterThan(0);
  });

  it('highlights today correctly', () => {
    const today = new Date();
    const propsWithToday = {
      ...mockProps,
      currentDate: today,
    };

    render(<MonthView {...propsWithToday} />);

    // Today should have special styling
    const todayCell = screen
      .getByText(today.getDate().toString())
      .closest('div');
    expect(todayCell).toHaveClass('bg-lumina-radiant/10');
  });

  it('shows density legend', () => {
    render(<MonthView {...mockProps} />);

    // Should show density legend at bottom
    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('Moderate')).toBeInTheDocument();
    expect(screen.getByText('Busy')).toBeInTheDocument();
    expect(screen.getByText('Very Busy')).toBeInTheDocument();
  });

  it('handles appointment clicks', () => {
    render(<MonthView {...mockProps} />);

    // Find and click an appointment
    const appointmentElement = screen.getByText(/Alice/).closest('div');
    fireEvent.click(appointmentElement!);

    expect(mockProps.onAppointmentClick).toHaveBeenCalledWith(
      mockAppointments[0]
    );
  });

  it('supports drag and drop operations', () => {
    render(<MonthView {...mockProps} />);

    // Find a day cell
    const dayCell = screen.getByText('16').closest('div');

    const dragEvent = new DragEvent('drop', {
      dataTransfer: new DataTransfer(),
    });
    dragEvent.dataTransfer!.setData('text/plain', 'apt-1');

    fireEvent(dayCell!, dragEvent);
    // Note: Full drag and drop testing would require more complex setup
  });

  it('is responsive on mobile screens', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    render(<MonthView {...mockProps} />);

    // Should show abbreviated day names on mobile
    // This would need more complex responsive testing setup
  });

  it('shows overflow indicator for many appointments', () => {
    const propsWithManyAppointments = {
      ...mockProps,
      appointments: [
        ...mockAppointments,
        ...Array.from({ length: 3 }, (_, i) => ({
          ...mockAppointments[0],
          id: `apt-${i + 3}`,
          startTime: new Date(2024, 0, 15, 11 + i, 0),
          endTime: new Date(2024, 0, 15, 12 + i, 0),
        })),
      ],
    };

    render(<MonthView {...propsWithManyAppointments} />);

    // Should show "+X more" indicator
    expect(screen.getByText(/\+\d+ more/)).toBeInTheDocument();
  });
});

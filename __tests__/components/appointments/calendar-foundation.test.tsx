import { AppointmentBlock } from '@/components/appointments/appointment-block';
import { CalendarHeader } from '@/components/appointments/calendar-header';
import { CalendarView } from '@/components/appointments/calendar-view';
import { TimeSlot } from '@/components/appointments/time-slot';
import {
  AppointmentStatus,
  CalendarSlot,
  DashboardAppointment,
} from '@/types/dashboard-appointments';
import { BusinessHours, StaffMember } from '@/types/booking';
import { render, screen } from '@testing-library/react';

// Mock data for testing
const mockStaffMembers: StaffMember[] = [
  {
    id: 'staff-1',
    firstName: 'John',
    lastName: 'Doe',
    displayName: 'John Doe',
    color: '#FF7A5A',
    isActive: true,
    role: 'Stylist',
  },
];

const mockBusinessHours: BusinessHours[] = [
  { dayOfWeek: 1, openTime: '09:00', closeTime: '17:00', isClosed: false },
  { dayOfWeek: 2, openTime: '09:00', closeTime: '17:00', isClosed: false },
  { dayOfWeek: 3, openTime: '09:00', closeTime: '17:00', isClosed: false },
  { dayOfWeek: 4, openTime: '09:00', closeTime: '17:00', isClosed: false },
  { dayOfWeek: 5, openTime: '09:00', closeTime: '17:00', isClosed: false },
  { dayOfWeek: 6, openTime: '10:00', closeTime: '16:00', isClosed: false },
  { dayOfWeek: 0, openTime: null, closeTime: null, isClosed: true },
];

const mockAppointment: DashboardAppointment = {
  id: 'apt-1',
  businessId: 'business-1',
  clientId: 'client-1',
  staffId: 'staff-1',
  startTime: new Date('2024-01-15T10:00:00'),
  endTime: new Date('2024-01-15T11:00:00'),
  status: AppointmentStatus.SCHEDULED,
  services: [{ id: 'service-1', name: 'Haircut', duration: 60, price: 5000 }],
  totalPrice: 5000,
  totalDuration: 60,
  client: {
    id: 'client-1',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
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
};

const mockTimeSlot: CalendarSlot = {
  startTime: new Date('2024-01-15T10:00:00'),
  endTime: new Date('2024-01-15T11:00:00'),
  staffId: 'staff-1',
  isAvailable: true,
  appointments: [mockAppointment],
  conflicts: [],
};

describe('Calendar Foundation Components', () => {
  describe('CalendarHeader', () => {
    it('renders calendar header with navigation controls', () => {
      const mockProps = {
        view: 'week' as const,
        currentDate: new Date('2024-01-15'),
        onViewChange: jest.fn(),
        onDateChange: jest.fn(),
        onNavigate: jest.fn(),
        onToday: jest.fn(),
      };

      render(<CalendarHeader {...mockProps} />);

      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('Day')).toBeInTheDocument();
      expect(screen.getByText('Week')).toBeInTheDocument();
      expect(screen.getByText('Month')).toBeInTheDocument();
    });
  });

  describe('AppointmentBlock', () => {
    it('renders appointment block with client information', () => {
      const mockProps = {
        appointment: mockAppointment,
        view: 'day' as const,
        onClick: jest.fn(),
      };

      render(<AppointmentBlock {...mockProps} />);

      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Haircut')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  describe('TimeSlot', () => {
    it('renders time slot with appointments', () => {
      const mockProps = {
        slot: mockTimeSlot,
        view: 'day' as const,
        onClick: jest.fn(),
      };

      render(<TimeSlot {...mockProps} />);

      // Should render the appointment within the time slot
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  describe('CalendarView', () => {
    it('renders calendar view with proper view switching', () => {
      const mockProps = {
        view: 'week' as const,
        currentDate: new Date('2024-01-15'),
        appointments: [mockAppointment],
        staffMembers: mockStaffMembers,
        businessHours: mockBusinessHours,
        onAppointmentClick: jest.fn(),
        onTimeSlotClick: jest.fn(),
      };

      render(<CalendarView {...mockProps} />);

      // Should render the week view component
      // The exact content will depend on the view implementation
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });
});

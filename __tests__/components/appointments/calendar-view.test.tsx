import { CalendarView } from '@/components/appointments/calendar-view';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  createTestDashboardAppointment,
  createTestStaffMembersList,
  createTestBusinessHoursWeek,
} from '@/__tests__/utils/test-data-factories';

const mockAppointment = createTestDashboardAppointment({
  id: 'appointment-1',
  startTime: new Date('2024-01-15T09:00:00'),
  endTime: new Date('2024-01-15T10:00:00'),
  client: {
    id: 'client-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+1234567890',
  },
  services: [
    {
      id: 'service-1',
      name: 'Haircut',
      duration: 60,
      price: 50.0,
    },
  ],
});

const mockStaff = createTestStaffMembersList(2);
mockStaff[0].displayName = 'Alice Johnson';
mockStaff[1].displayName = 'Bob Smith';

const mockBusinessHours = createTestBusinessHoursWeek();

const mockProps = {
  view: 'day' as const,
  currentDate: new Date('2024-01-15'),
  appointments: [mockAppointment],
  staffMembers: mockStaff,
  businessHours: mockBusinessHours,
  onAppointmentClick: jest.fn(),
  onAppointmentDrop: jest.fn(),
  onTimeSlotClick: jest.fn(),
};

const renderWithDnd = (component: React.ReactElement) => {
  return render(<DndProvider backend={HTML5Backend}>{component}</DndProvider>);
};

describe('CalendarView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Day View', () => {
    it('should render day view with time slots', () => {
      renderWithDnd(<CalendarView {...mockProps} view="day" />);

      expect(screen.getByTestId('day-view')).toBeInTheDocument();
      expect(screen.getByText('9:00 AM')).toBeInTheDocument();
      expect(screen.getByText('10:00 AM')).toBeInTheDocument();
    });

    it('should display appointments in correct time slots', () => {
      renderWithDnd(<CalendarView {...mockProps} view="day" />);

      const appointment = screen.getByTestId('appointment-block-1');
      expect(appointment).toBeInTheDocument();
      expect(appointment).toHaveTextContent('John Doe');
      expect(appointment).toHaveTextContent('Haircut');
    });

    it('should handle appointment click', () => {
      renderWithDnd(<CalendarView {...mockProps} view="day" />);

      const appointment = screen.getByTestId('appointment-block-1');
      fireEvent.click(appointment);

      expect(mockProps.onAppointmentClick).toHaveBeenCalledWith(
        mockAppointment
      );
    });

    it('should handle time slot click for new appointments', () => {
      renderWithDnd(<CalendarView {...mockProps} view="day" />);

      const timeSlot = screen.getByTestId('time-slot-10-00');
      fireEvent.click(timeSlot);

      expect(mockProps.onTimeSlotClick).toHaveBeenCalledWith({
        startTime: expect.any(Date),
        endTime: expect.any(Date),
        staffId: expect.any(String),
      });
    });
  });

  describe('Week View', () => {
    it('should render week view with 7 days', () => {
      renderWithDnd(<CalendarView {...mockProps} view="week" />);

      expect(screen.getByTestId('week-view')).toBeInTheDocument();
      expect(screen.getAllByTestId(/day-column/)).toHaveLength(7);
    });

    it('should show day headers with dates', () => {
      renderWithDnd(<CalendarView {...mockProps} view="week" />);

      expect(screen.getByText('Mon 15')).toBeInTheDocument();
      expect(screen.getByText('Tue 16')).toBeInTheDocument();
    });

    it('should display appointments across multiple days', () => {
      const weekAppointments = [
        mockAppointment,
        createTestDashboardAppointment({
          id: 'appointment-2',
          startTime: new Date('2024-01-16T10:00:00'),
          endTime: new Date('2024-01-16T11:00:00'),
        }),
        createTestDashboardAppointment({
          id: 'appointment-3',
          startTime: new Date('2024-01-17T10:00:00'),
          endTime: new Date('2024-01-17T11:00:00'),
        }),
      ];

      renderWithDnd(
        <CalendarView
          {...mockProps}
          view="week"
          appointments={weekAppointments}
        />
      );

      expect(screen.getAllByTestId(/appointment-block/)).toHaveLength(3);
    });
  });

  describe('Month View', () => {
    it('should render month view with calendar grid', () => {
      renderWithDnd(<CalendarView {...mockProps} view="month" />);

      expect(screen.getByTestId('month-view')).toBeInTheDocument();
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should show appointment indicators', () => {
      renderWithDnd(<CalendarView {...mockProps} view="month" />);

      const dayCell = screen.getByTestId('day-cell-15');
      expect(dayCell).toBeInTheDocument();
      expect(
        dayCell.querySelector('.appointment-indicator')
      ).toBeInTheDocument();
    });

    it('should handle day cell click', () => {
      renderWithDnd(<CalendarView {...mockProps} view="month" />);

      const dayCell = screen.getByTestId('day-cell-15');
      fireEvent.click(dayCell);

      expect(mockProps.onTimeSlotClick).toHaveBeenCalled();
    });
  });

  describe('Drag and Drop', () => {
    it('should handle appointment drag start', () => {
      renderWithDnd(<CalendarView {...mockProps} view="day" />);

      const appointment = screen.getByTestId('appointment-block-1');
      fireEvent.dragStart(appointment);

      expect(appointment).toHaveAttribute('draggable', 'true');
    });

    it('should handle appointment drop', async () => {
      renderWithDnd(<CalendarView {...mockProps} view="day" />);

      const appointment = screen.getByTestId('appointment-block-1');
      const targetSlot = screen.getByTestId('time-slot-11-00');

      fireEvent.dragStart(appointment);
      fireEvent.dragOver(targetSlot);
      fireEvent.drop(targetSlot);

      await waitFor(() => {
        expect(mockProps.onAppointmentDrop).toHaveBeenCalledWith(
          'appointment-1',
          expect.objectContaining({
            startTime: expect.any(Date),
            endTime: expect.any(Date),
          })
        );
      });
    });

    it('should show drop zone visual feedback', () => {
      renderWithDnd(<CalendarView {...mockProps} view="day" />);

      const appointment = screen.getByTestId('appointment-block-1');
      const targetSlot = screen.getByTestId('time-slot-11-00');

      fireEvent.dragStart(appointment);
      fireEvent.dragEnter(targetSlot);

      expect(targetSlot).toHaveClass('drop-zone-active');
    });
  });

  describe('Staff Color Coding', () => {
    it('should apply staff colors to appointments', () => {
      renderWithDnd(<CalendarView {...mockProps} view="day" />);

      const appointment = screen.getByTestId('appointment-block-1');
      expect(appointment).toHaveStyle('border-left-color: #3B82F6');
    });

    it('should show staff legend', () => {
      renderWithDnd(<CalendarView {...mockProps} view="day" />);

      expect(screen.getByTestId('staff-legend')).toBeInTheDocument();
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    });
  });

  describe('Conflict Visualization', () => {
    it('should highlight conflicting appointments', () => {
      const conflictingAppointments = [
        mockAppointment,
        createTestDashboardAppointment({
          id: 'appointment-conflict',
          startTime: new Date('2024-01-15T09:30:00'),
          endTime: new Date('2024-01-15T10:30:00'),
          isConflicted: true,
        }),
      ];

      renderWithDnd(
        <CalendarView {...mockProps} appointments={conflictingAppointments} />
      );

      const conflictedAppointment = screen.getByTestId(
        'appointment-block-conflict'
      );
      expect(conflictedAppointment).toHaveClass('appointment-conflict');
    });

    it('should show conflict tooltip', async () => {
      const conflictingAppointments = [
        createTestDashboardAppointment({
          id: 'appointment-1',
          isConflicted: true,
        }),
      ];

      renderWithDnd(
        <CalendarView {...mockProps} appointments={conflictingAppointments} />
      );

      const appointment = screen.getByTestId('appointment-block-1');
      fireEvent.mouseEnter(appointment);

      await waitFor(() => {
        expect(
          screen.getByText('Overlaps with another appointment')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should adapt to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderWithDnd(<CalendarView {...mockProps} view="day" />);

      expect(screen.getByTestId('mobile-calendar-view')).toBeInTheDocument();
    });

    it('should show condensed view on small screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      renderWithDnd(<CalendarView {...mockProps} view="week" />);

      expect(screen.getByTestId('condensed-week-view')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should virtualize large appointment lists', () => {
      const manyAppointments = Array.from({ length: 100 }, (_, i) =>
        createTestDashboardAppointment({
          id: `appointment-${i}`,
          startTime: new Date(`2024-01-15T${9 + (i % 8)}:00:00`),
          endTime: new Date(`2024-01-15T${10 + (i % 8)}:00:00`),
        })
      );

      renderWithDnd(
        <CalendarView {...mockProps} appointments={manyAppointments} />
      );

      // Should only render visible appointments
      const renderedAppointments = screen.getAllByTestId(/appointment-block/);
      expect(renderedAppointments.length).toBeLessThan(100);
    });
  });
});

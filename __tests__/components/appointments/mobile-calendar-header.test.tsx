import { MobileCalendarHeader } from '@/components/appointments/mobile-calendar-header';
import { CalendarView } from '@/types/dashboard-appointments';
import { fireEvent, render, screen } from '@testing-library/react';

// Mock the mobile detection hook
jest.mock('@/hooks/use-mobile-detection', () => ({
    useMobileDetection: jest.fn(() => ({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        orientation: 'landscape',
    })),
}));

// Mock the touch gestures hook
jest.mock('@/hooks/use-touch-gestures', () => ({
    useTouchGestures: jest.fn(() => ({
        attachToElement: jest.fn(),
        gestureState: {
            isTouch: false,
            isSwiping: false,
            isPinching: false,
            isLongPressing: false,
        },
    })),
}));

const mockProps = {
    view: 'week' as CalendarView,
    currentDate: new Date('2024-01-15'),
    onViewChange: jest.fn(),
    onDateChange: jest.fn(),
    onNavigate: jest.fn(),
    onToday: jest.fn(),
};

describe('MobileCalendarHeader', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders desktop header by default', () => {
        render(<MobileCalendarHeader {...mockProps} />);

        expect(screen.getByText('Today')).toBeInTheDocument();
        expect(screen.getByText('Day')).toBeInTheDocument();
        expect(screen.getByText('Week')).toBeInTheDocument();
        expect(screen.getByText('Month')).toBeInTheDocument();
    });

    it('calls onNavigate when navigation buttons are clicked', () => {
        render(<MobileCalendarHeader {...mockProps} />);

        const prevButton = screen.getByLabelText('Previous period');
        const nextButton = screen.getByLabelText('Next period');

        fireEvent.click(prevButton);
        expect(mockProps.onNavigate).toHaveBeenCalledWith('prev');

        fireEvent.click(nextButton);
        expect(mockProps.onNavigate).toHaveBeenCalledWith('next');
    });

    it('calls onToday when Today button is clicked', () => {
        render(<MobileCalendarHeader {...mockProps} />);

        const todayButton = screen.getByText('Today');
        fireEvent.click(todayButton);

        expect(mockProps.onToday).toHaveBeenCalled();
    });

    it('calls onViewChange when view buttons are clicked', () => {
        render(<MobileCalendarHeader {...mockProps} />);

        const dayButton = screen.getByText('Day');
        const monthButton = screen.getByText('Month');

        fireEvent.click(dayButton);
        expect(mockProps.onViewChange).toHaveBeenCalledWith('day');

        fireEvent.click(monthButton);
        expect(mockProps.onViewChange).toHaveBeenCalledWith('month');
    });

    it('highlights active view button', () => {
        render(<MobileCalendarHeader {...mockProps} view="day" />);

        const dayButton = screen.getByText('Day');
        const weekButton = screen.getByText('Week');

        // Day button should have primary variant (active)
        expect(dayButton).toHaveAttribute('data-variant', 'primary');
        // Week button should have ghost variant (inactive)
        expect(weekButton).toHaveAttribute('data-variant', 'ghost');
    });

    it('formats date correctly for different views', () => {
        const { rerender } = render(<MobileCalendarHeader {...mockProps} view="day" />);
        expect(screen.getByText(/Monday, January 15, 2024/)).toBeInTheDocument();

        rerender(<MobileCalendarHeader {...mockProps} view="month" />);
        expect(screen.getByText(/January 2024/)).toBeInTheDocument();
    });
});

describe('MobileCalendarHeader - Mobile Layout', () => {
    beforeEach(() => {
        // Mock mobile detection
        const { useMobileDetection } = require('@/hooks/use-mobile-detection');
        useMobileDetection.mockReturnValue({
            isMobile: true,
            isTablet: false,
            isDesktop: false,
            orientation: 'portrait',
        });
    });

    it('renders mobile layout with stacked elements', () => {
        render(<MobileCalendarHeader {...mockProps} />);

        // Should show swipe hint
        expect(screen.getByText('Swipe to navigate')).toBeInTheDocument();

        // Should show icons with view names
        expect(screen.getByLabelText('day view')).toBeInTheDocument();
        expect(screen.getByLabelText('week view')).toBeInTheDocument();
        expect(screen.getByLabelText('month view')).toBeInTheDocument();
    });

    it('shows shortened date format on mobile', () => {
        render(<MobileCalendarHeader {...mockProps} view="day" />);

        // Mobile should show shorter format
        expect(screen.getByText(/Mon, Jan 15/)).toBeInTheDocument();
    });
});

describe('MobileCalendarHeader - Tablet Layout', () => {
    beforeEach(() => {
        // Mock tablet detection
        const { useMobileDetection } = require('@/hooks/use-mobile-detection');
        useMobileDetection.mockReturnValue({
            isMobile: false,
            isTablet: true,
            isDesktop: false,
            orientation: 'landscape',
        });
    });

    it('renders tablet layout with appropriate spacing', () => {
        render(<MobileCalendarHeader {...mockProps} />);

        // Should have touch-manipulation class for better touch targets
        const buttons = screen.getAllByRole('button');
        buttons.forEach(button => {
            expect(button).toHaveClass('touch-manipulation');
        });
    });

    it('adjusts layout for portrait orientation', () => {
        const { useMobileDetection } = require('@/hooks/use-mobile-detection');
        useMobileDetection.mockReturnValue({
            isMobile: false,
            isTablet: true,
            isDesktop: false,
            orientation: 'portrait',
        });

        render(<MobileCalendarHeader {...mockProps} />);

        // Should render without errors in portrait mode
        expect(screen.getByText('Today')).toBeInTheDocument();
    });
});
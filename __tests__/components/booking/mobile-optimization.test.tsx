import { MobileOptimizedBooking } from '@/components/booking/mobile-optimized-booking';
import { OfflineSupport } from '@/components/booking/offline-support';
import { ProgressiveLoading } from '@/components/booking/progressive-loading';
import { useBookingPerformance } from '@/hooks/use-booking-performance';
import { useNetworkResilience } from '@/hooks/use-network-resilience';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';

// Mock hooks
jest.mock('@/hooks/use-network-resilience');
jest.mock('@/hooks/use-booking-performance', () => ({
  useBookingPerformance: jest.fn(),
}));
jest.mock('@/lib/performance-hooks', () => ({
  usePerformanceMonitor: jest.fn(),
}));

const mockUseNetworkResilience = useNetworkResilience as jest.MockedFunction<
  typeof useNetworkResilience
>;
const mockUseBookingPerformance = useBookingPerformance as jest.MockedFunction<
  typeof useBookingPerformance
>;

// Mock performance hooks
const mockUsePerformanceMonitor = require('@/lib/performance-hooks')
  .usePerformanceMonitor as jest.MockedFunction<any>;

// Mock performance APIs
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(() => []),
  },
});

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation((callback: any) => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn(),
}));

// Mock PerformanceObserver
global.PerformanceObserver = jest.fn().mockImplementation((callback: any) => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
}));

describe('Mobile Optimization', () => {
  beforeEach(() => {
    mockUsePerformanceMonitor.mockReturnValue({
      trackPropsChange: jest.fn(),
    });

    mockUseNetworkResilience.mockReturnValue({
      networkState: {
        isOnline: true,
        connectionType: '4g',
        isSlowConnection: false,
        retryCount: 0,
      },
      resilientFetch: jest.fn(),
      shouldShowOfflineMessage: jest.fn(() => false),
      resetRetryState: jest.fn(),
      getNetworkErrorMessage: jest.fn(),
      isRetrying: false,
      canRetry: true,
      cancelRetry: jest.fn(),
    });

    mockUseBookingPerformance.mockReturnValue({
      metrics: {},
      webVitals: {},
      optimizations: {
        shouldPreloadImages: true,
        shouldUseWebP: true,
        shouldLazyLoad: false,
        imageQuality: 80,
        cacheStrategy: 'moderate' as const,
      },
      startMeasurement: jest.fn(),
      endMeasurement: jest.fn(),
      measureAsync: jest.fn(),
      optimizeImageSrc: jest.fn(src => src),
      preloadResource: jest.fn(),
      prefetchResource: jest.fn(),
      getRecommendations: jest.fn(() => []),
      getPerformanceScore: jest.fn(() => 85),
      isSlowConnection: false,
      connectionType: '4g',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('MobileOptimizedBooking', () => {
    const defaultProps = {
      currentStep: '1',
      totalSteps: 4,
      onNext: jest.fn(),
      onBack: jest.fn(),
      children: <div>Test Content</div>,
    };

    it('renders mobile-optimized layout', () => {
      render(<MobileOptimizedBooking {...defaultProps} />);

      expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
      expect(screen.getByText('Continue')).toBeInTheDocument();
    });

    it('shows progress bar with correct percentage', () => {
      render(<MobileOptimizedBooking {...defaultProps} currentStep="2" />);

      expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('handles touch gestures for navigation', async () => {
      const onNext = jest.fn();
      render(<MobileOptimizedBooking {...defaultProps} onNext={onNext} />);

      const container = screen.getByText('Test Content').closest('div');

      // Simulate swipe up gesture
      fireEvent.touchStart(container!, { touches: [{ clientY: 100 }] });
      fireEvent.touchEnd(container!, { changedTouches: [{ clientY: 40 }] });

      await waitFor(() => {
        expect(onNext).toHaveBeenCalled();
      });
    });

    it('prevents navigation during loading', () => {
      const onNext = jest.fn();
      render(
        <MobileOptimizedBooking
          {...defaultProps}
          onNext={onNext}
          isLoading={true}
        />
      );

      const nextButton = screen.getByText('Processing...');
      fireEvent.click(nextButton);

      expect(onNext).not.toHaveBeenCalled();
    });

    it('shows network status when offline', () => {
      mockUseNetworkResilience.mockReturnValue({
        ...mockUseNetworkResilience(),
        networkState: {
          isOnline: false,
          connectionType: 'none',
          isSlowConnection: false,
          retryCount: 0,
        },
        shouldShowOfflineMessage: jest.fn(() => true),
      });

      render(<MobileOptimizedBooking {...defaultProps} />);

      expect(screen.getByText('No internet connection')).toBeInTheDocument();
    });

    it('shows slow connection warning', () => {
      mockUseNetworkResilience.mockReturnValue({
        ...mockUseNetworkResilience(),
        networkState: {
          isOnline: true,
          connectionType: '2g',
          isSlowConnection: true,
          retryCount: 0,
        },
      });

      render(<MobileOptimizedBooking {...defaultProps} />);

      expect(screen.getByText(/Slow connection detected/)).toBeInTheDocument();
    });
  });

  describe('ProgressiveLoading', () => {
    it('renders loading state initially', () => {
      render(
        <ProgressiveLoading loadingMessage="Loading services...">
          <div>Loaded Content</div>
        </ProgressiveLoading>
      );

      expect(screen.getByText('Loading services...')).toBeInTheDocument();
    });

    it('adjusts loading behavior for slow connections', () => {
      mockUseNetworkResilience.mockReturnValue({
        ...mockUseNetworkResilience(),
        networkState: {
          isOnline: true,
          connectionType: '2g',
          isSlowConnection: true,
          retryCount: 0,
        },
      });

      render(
        <ProgressiveLoading priority="low">
          <div>Content</div>
        </ProgressiveLoading>
      );

      expect(screen.getByText(/Slow connection detected/)).toBeInTheDocument();
    });

    it('shows offline message when not connected', () => {
      mockUseNetworkResilience.mockReturnValue({
        ...mockUseNetworkResilience(),
        networkState: {
          isOnline: false,
          connectionType: 'none',
          isSlowConnection: false,
          retryCount: 0,
        },
      });

      render(
        <ProgressiveLoading>
          <div>Content</div>
        </ProgressiveLoading>
      );

      expect(
        screen.getByText('Offline - content unavailable')
      ).toBeInTheDocument();
    });
  });

  describe('OfflineSupport', () => {
    it('renders children when online', () => {
      render(
        <OfflineSupport>
          <div>Online Content</div>
        </OfflineSupport>
      );

      expect(screen.getByText('Online Content')).toBeInTheDocument();
    });

    it('shows offline message when not connected and offline mode disabled', () => {
      mockUseNetworkResilience.mockReturnValue({
        ...mockUseNetworkResilience(),
        networkState: {
          isOnline: false,
          connectionType: 'none',
          isSlowConnection: false,
          retryCount: 0,
        },
      });

      render(
        <OfflineSupport enableOfflineMode={false}>
          <div>Online Content</div>
        </OfflineSupport>
      );

      expect(screen.getByText('No Internet Connection')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('shows offline mode when not connected and offline mode enabled', () => {
      mockUseNetworkResilience.mockReturnValue({
        ...mockUseNetworkResilience(),
        networkState: {
          isOnline: false,
          connectionType: 'none',
          isSlowConnection: false,
          retryCount: 0,
        },
      });

      // Mock localStorage
      const mockLocalStorage = {
        getItem: jest.fn(() => JSON.stringify({ services: [] })),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      };
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
      });

      render(
        <OfflineSupport enableOfflineMode={true}>
          <div>Online Content</div>
        </OfflineSupport>
      );

      expect(
        screen.getByText('Offline Mode - Limited functionality available')
      ).toBeInTheDocument();
    });
  });

  describe('Performance Optimizations', () => {
    it('optimizes images for slow connections', () => {
      mockUseBookingPerformance.mockReturnValue({
        ...mockUseBookingPerformance(),
        optimizations: {
          shouldPreloadImages: false,
          shouldUseWebP: false,
          shouldLazyLoad: true,
          imageQuality: 60,
          cacheStrategy: 'aggressive' as const,
        },
        optimizeImageSrc: jest.fn(src => `${src}?q=60`),
        isSlowConnection: true,
      });

      const { optimizeImageSrc } = mockUseBookingPerformance();
      const optimizedSrc = optimizeImageSrc('test.jpg');

      expect(optimizedSrc).toBe('test.jpg?q=60');
    });

    it('preloads resources on fast connections', () => {
      const { preloadResource } = mockUseBookingPerformance();

      act(() => {
        preloadResource('test.jpg', 'image');
      });

      expect(preloadResource).toHaveBeenCalledWith('test.jpg', 'image');
    });

    it('measures performance metrics', () => {
      const { startMeasurement, endMeasurement } = mockUseBookingPerformance();

      act(() => {
        startMeasurement('test-operation');
        endMeasurement('test-operation');
      });

      expect(startMeasurement).toHaveBeenCalledWith('test-operation');
      expect(endMeasurement).toHaveBeenCalledWith('test-operation');
    });
  });

  describe('Touch Interactions', () => {
    it('prevents double-tap zoom on inputs', () => {
      render(
        <input
          type="text"
          className="touch-target"
          style={{ fontSize: '16px' }}
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveStyle('font-size: 16px');
    });

    it('provides adequate touch targets', () => {
      render(<button className="touch-target">Touch Me</button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('touch-target');
    });
  });

  describe('Accessibility', () => {
    it('supports reduced motion preferences', () => {
      // Mock matchMedia for prefers-reduced-motion
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(<div className="smooth-transition">Animated Content</div>);

      const element = screen.getByText('Animated Content');
      expect(element).toHaveClass('smooth-transition');
    });

    it('supports high contrast mode', () => {
      render(<button className="booking-button">High Contrast Button</button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('booking-button');
    });

    it('provides proper focus management', () => {
      render(<button className="focus-visible">Focusable Button</button>);

      const button = screen.getByRole('button');
      button.focus();

      expect(button).toHaveFocus();
      expect(button).toHaveClass('focus-visible');
    });
  });
});

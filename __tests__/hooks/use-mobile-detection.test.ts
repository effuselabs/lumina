import {
  useIsMobile,
  useIsTouchDevice,
  useMobileDetection,
} from '@/hooks/use-mobile-detection';
import { act, renderHook } from '@testing-library/react';

// Mock window properties
const mockWindow = (width: number, height: number, userAgent: string) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  Object.defineProperty(navigator, 'userAgent', {
    writable: true,
    configurable: true,
    value: userAgent,
  });
  Object.defineProperty(navigator, 'maxTouchPoints', {
    writable: true,
    configurable: true,
    value: 0,
  });
};

describe('useMobileDetection', () => {
  beforeEach(() => {
    // Reset to desktop defaults
    mockWindow(
      1920,
      1080,
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    );
  });

  it('should detect desktop correctly', () => {
    const { result } = renderHook(() => useMobileDetection());

    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(true);
    expect(result.current.screenSize).toBe('xl');
    expect(result.current.orientation).toBe('landscape');
  });

  it('should detect mobile correctly', () => {
    mockWindow(
      375,
      667,
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'
    );

    const { result } = renderHook(() => useMobileDetection());

    expect(result.current.isMobile).toBe(true);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.screenSize).toBe('sm');
    expect(result.current.orientation).toBe('portrait');
  });

  it('should detect tablet correctly', () => {
    mockWindow(768, 1024, 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)');

    const { result } = renderHook(() => useMobileDetection());

    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(true);
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.screenSize).toBe('md');
    expect(result.current.orientation).toBe('portrait');
  });

  it('should detect touch device correctly', () => {
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: 5,
    });

    const { result } = renderHook(() => useMobileDetection());

    expect(result.current.isTouchDevice).toBe(true);
  });

  it('should update on window resize', () => {
    const { result } = renderHook(() => useMobileDetection());

    expect(result.current.screenSize).toBe('xl');

    act(() => {
      mockWindow(375, 667, navigator.userAgent);
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current.screenSize).toBe('sm');
    expect(result.current.isMobile).toBe(true);
  });

  it('should update on orientation change', () => {
    mockWindow(
      375,
      667,
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'
    );

    const { result } = renderHook(() => useMobileDetection());

    expect(result.current.orientation).toBe('portrait');

    act(() => {
      mockWindow(667, 375, navigator.userAgent);
      window.dispatchEvent(new Event('orientationchange'));
    });

    // Wait for timeout
    setTimeout(() => {
      expect(result.current.orientation).toBe('landscape');
    }, 150);
  });
});

describe('useIsMobile', () => {
  it('should return mobile status', () => {
    mockWindow(
      375,
      667,
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'
    );

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });
});

describe('useIsTouchDevice', () => {
  it('should return touch device status', () => {
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: 5,
    });

    const { result } = renderHook(() => useIsTouchDevice());

    expect(result.current).toBe(true);
  });
});

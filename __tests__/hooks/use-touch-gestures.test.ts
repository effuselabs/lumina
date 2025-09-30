import { useTouchGestures } from '@/hooks/use-touch-gestures';
import { act, renderHook } from '@testing-library/react';

// Mock touch events
const createTouchEvent = (type: string, touches: Array<{ clientX: number; clientY: number }>) => {
    const touchList = touches.map(touch => ({
        clientX: touch.clientX,
        clientY: touch.clientY,
        identifier: Math.random(),
        target: document.body,
        radiusX: 1,
        radiusY: 1,
        rotationAngle: 0,
        force: 1,
    }));

    return new TouchEvent(type, {
        touches: touchList as any,
        changedTouches: touchList as any,
        targetTouches: touchList as any,
    });
};

describe('useTouchGestures', () => {
    let mockElement: HTMLElement;
    let onSwipeLeft: jest.Mock;
    let onSwipeRight: jest.Mock;
    let onSwipeUp: jest.Mock;
    let onSwipeDown: jest.Mock;
    let onTap: jest.Mock;
    let onLongPress: jest.Mock;
    let onPinch: jest.Mock;

    beforeEach(() => {
        mockElement = document.createElement('div');
        document.body.appendChild(mockElement);

        onSwipeLeft = jest.fn();
        onSwipeRight = jest.fn();
        onSwipeUp = jest.fn();
        onSwipeDown = jest.fn();
        onTap = jest.fn();
        onLongPress = jest.fn();
        onPinch = jest.fn();

        jest.useFakeTimers();
    });

    afterEach(() => {
        document.body.removeChild(mockElement);
        jest.useRealTimers();
    });

    it('should initialize with correct default state', () => {
        const { result } = renderHook(() => useTouchGestures());

        expect(result.current.gestureState).toEqual({
            isTouch: false,
            isSwiping: false,
            isPinching: false,
            isLongPressing: false,
        });
    });

    it('should detect swipe right gesture', () => {
        const { result } = renderHook(() => useTouchGestures({
            onSwipeRight,
            threshold: 50,
        }));

        act(() => {
            const cleanup = result.current.attachToElement(mockElement);

            // Start touch
            const touchStart = createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]);
            mockElement.dispatchEvent(touchStart);

            // Move right beyond threshold
            const touchMove = createTouchEvent('touchmove', [{ clientX: 200, clientY: 100 }]);
            mockElement.dispatchEvent(touchMove);

            // End touch
            const touchEnd = createTouchEvent('touchend', [{ clientX: 200, clientY: 100 }]);
            mockElement.dispatchEvent(touchEnd);

            cleanup?.();
        });

        expect(onSwipeRight).toHaveBeenCalled();
    });

    it('should detect swipe left gesture', () => {
        const { result } = renderHook(() => useTouchGestures({
            onSwipeLeft,
            threshold: 50,
        }));

        act(() => {
            const cleanup = result.current.attachToElement(mockElement);

            // Start touch
            const touchStart = createTouchEvent('touchstart', [{ clientX: 200, clientY: 100 }]);
            mockElement.dispatchEvent(touchStart);

            // Move left beyond threshold
            const touchMove = createTouchEvent('touchmove', [{ clientX: 100, clientY: 100 }]);
            mockElement.dispatchEvent(touchMove);

            // End touch
            const touchEnd = createTouchEvent('touchend', [{ clientX: 100, clientY: 100 }]);
            mockElement.dispatchEvent(touchEnd);

            cleanup?.();
        });

        expect(onSwipeLeft).toHaveBeenCalled();
    });

    it('should detect swipe up gesture', () => {
        const { result } = renderHook(() => useTouchGestures({
            onSwipeUp,
            threshold: 50,
        }));

        act(() => {
            const cleanup = result.current.attachToElement(mockElement);

            // Start touch
            const touchStart = createTouchEvent('touchstart', [{ clientX: 100, clientY: 200 }]);
            mockElement.dispatchEvent(touchStart);

            // Move up beyond threshold
            const touchMove = createTouchEvent('touchmove', [{ clientX: 100, clientY: 100 }]);
            mockElement.dispatchEvent(touchMove);

            // End touch
            const touchEnd = createTouchEvent('touchend', [{ clientX: 100, clientY: 100 }]);
            mockElement.dispatchEvent(touchEnd);

            cleanup?.();
        });

        expect(onSwipeUp).toHaveBeenCalled();
    });

    it('should detect swipe down gesture', () => {
        const { result } = renderHook(() => useTouchGestures({
            onSwipeDown,
            threshold: 50,
        }));

        act(() => {
            const cleanup = result.current.attachToElement(mockElement);

            // Start touch
            const touchStart = createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]);
            mockElement.dispatchEvent(touchStart);

            // Move down beyond threshold
            const touchMove = createTouchEvent('touchmove', [{ clientX: 100, clientY: 200 }]);
            mockElement.dispatchEvent(touchMove);

            // End touch
            const touchEnd = createTouchEvent('touchend', [{ clientX: 100, clientY: 200 }]);
            mockElement.dispatchEvent(touchEnd);

            cleanup?.();
        });

        expect(onSwipeDown).toHaveBeenCalled();
    });

    it('should detect tap gesture', () => {
        const { result } = renderHook(() => useTouchGestures({
            onTap,
        }));

        act(() => {
            const cleanup = result.current.attachToElement(mockElement);

            // Start touch
            const touchStart = createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]);
            mockElement.dispatchEvent(touchStart);

            // Quick end without movement
            const touchEnd = createTouchEvent('touchend', [{ clientX: 100, clientY: 100 }]);
            mockElement.dispatchEvent(touchEnd);

            cleanup?.();
        });

        expect(onTap).toHaveBeenCalled();
    });

    it('should detect long press gesture', () => {
        const { result } = renderHook(() => useTouchGestures({
            onLongPress,
            longPressDelay: 500,
        }));

        act(() => {
            const cleanup = result.current.attachToElement(mockElement);

            // Start touch
            const touchStart = createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]);
            mockElement.dispatchEvent(touchStart);

            // Wait for long press delay
            jest.advanceTimersByTime(500);

            cleanup?.();
        });

        expect(onLongPress).toHaveBeenCalled();
    });

    it('should detect pinch gesture', () => {
        const { result } = renderHook(() => useTouchGestures({
            onPinch,
        }));

        act(() => {
            const cleanup = result.current.attachToElement(mockElement);

            // Start two-finger touch
            const touchStart = createTouchEvent('touchstart', [
                { clientX: 100, clientY: 100 },
                { clientX: 200, clientY: 100 }
            ]);
            mockElement.dispatchEvent(touchStart);

            // Move fingers closer (pinch in)
            const touchMove = createTouchEvent('touchmove', [
                { clientX: 120, clientY: 100 },
                { clientX: 180, clientY: 100 }
            ]);
            mockElement.dispatchEvent(touchMove);

            cleanup?.();
        });

        expect(onPinch).toHaveBeenCalled();
    });

    it('should update gesture state correctly', () => {
        const { result } = renderHook(() => useTouchGestures({
            onSwipeRight,
            threshold: 50,
        }));

        act(() => {
            const cleanup = result.current.attachToElement(mockElement);

            // Start touch
            const touchStart = createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]);
            mockElement.dispatchEvent(touchStart);

            cleanup?.();
        });

        expect(result.current.gestureState.isTouch).toBe(true);

        act(() => {
            const cleanup = result.current.attachToElement(mockElement);

            // Move beyond threshold
            const touchMove = createTouchEvent('touchmove', [{ clientX: 200, clientY: 100 }]);
            mockElement.dispatchEvent(touchMove);

            cleanup?.();
        });

        expect(result.current.gestureState.isSwiping).toBe(true);
    });

    it('should respect custom threshold', () => {
        const { result } = renderHook(() => useTouchGestures({
            onSwipeRight,
            threshold: 100,
        }));

        act(() => {
            const cleanup = result.current.attachToElement(mockElement);

            // Start touch
            const touchStart = createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]);
            mockElement.dispatchEvent(touchStart);

            // Move right but not beyond custom threshold
            const touchMove = createTouchEvent('touchmove', [{ clientX: 150, clientY: 100 }]);
            mockElement.dispatchEvent(touchMove);

            // End touch
            const touchEnd = createTouchEvent('touchend', [{ clientX: 150, clientY: 100 }]);
            mockElement.dispatchEvent(touchEnd);

            cleanup?.();
        });

        // Should not trigger swipe with movement less than threshold
        expect(onSwipeRight).not.toHaveBeenCalled();
    });

    it('should cancel long press on movement', () => {
        const { result } = renderHook(() => useTouchGestures({
            onLongPress,
            onSwipeRight,
            longPressDelay: 500,
            threshold: 50,
        }));

        act(() => {
            const cleanup = result.current.attachToElement(mockElement);

            // Start touch
            const touchStart = createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]);
            mockElement.dispatchEvent(touchStart);

            // Move before long press delay
            jest.advanceTimersByTime(200);
            const touchMove = createTouchEvent('touchmove', [{ clientX: 200, clientY: 100 }]);
            mockElement.dispatchEvent(touchMove);

            // Complete long press delay
            jest.advanceTimersByTime(300);

            cleanup?.();
        });

        // Long press should be cancelled by movement
        expect(onLongPress).not.toHaveBeenCalled();
    });
});
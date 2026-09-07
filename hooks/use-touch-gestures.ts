'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface TouchGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onTap?: (event: TouchEvent) => void;
  onLongPress?: (event: TouchEvent) => void;
  onPinch?: (scale: number) => void;
  threshold?: number;
  longPressDelay?: number;
  preventScroll?: boolean;
}

export interface TouchGestureState {
  isTouch: boolean;
  isSwiping: boolean;
  isPinching: boolean;
  isLongPressing: boolean;
}

/**
 * Custom hook for handling touch gestures on mobile devices
 *
 * Provides swipe detection, tap handling, long press, and pinch gestures
 * with configurable thresholds and callbacks.
 *
 * Requirements: 6.4, 6.5
 */
export function useTouchGestures(options: TouchGestureOptions = {}) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onTap,
    onLongPress,
    onPinch,
    threshold = 50,
    longPressDelay = 500,
    preventScroll = false,
  } = options;

  const [gestureState, setGestureState] = useState<TouchGestureState>({
    isTouch: false,
    isSwiping: false,
    isPinching: false,
    isLongPressing: false,
  });

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(
    null
  );
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialPinchDistanceRef = useRef<number | null>(null);

  // Calculate distance between two touch points
  const getTouchDistance = useCallback((touches: TouchList) => {
    if (touches.length < 2) return 0;

    const touch1 = touches[0];
    const touch2 = touches[1];

    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback(
    (event: TouchEvent) => {
      const touch = event.touches[0];

      if (event.touches.length === 1) {
        // Single touch - potential swipe or tap
        touchStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          time: Date.now(),
        };

        setGestureState(prev => ({ ...prev, isTouch: true }));

        // Start long press timer
        if (onLongPress) {
          longPressTimerRef.current = setTimeout(() => {
            setGestureState(prev => ({ ...prev, isLongPressing: true }));
            onLongPress(event);
          }, longPressDelay);
        }
      } else if (event.touches.length === 2) {
        // Two touches - potential pinch
        initialPinchDistanceRef.current = getTouchDistance(event.touches);
        setGestureState(prev => ({ ...prev, isPinching: true }));

        // Clear long press timer
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }

      if (preventScroll) {
        event.preventDefault();
      }
    },
    [onLongPress, longPressDelay, getTouchDistance, preventScroll]
  );

  // Handle touch move
  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      if (event.touches.length === 1 && touchStartRef.current) {
        const touch = event.touches[0];
        const deltaX = touch.clientX - touchStartRef.current.x;
        const deltaY = touch.clientY - touchStartRef.current.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // If moved beyond threshold, it's a swipe
        if (distance > threshold) {
          setGestureState(prev => ({ ...prev, isSwiping: true }));

          // Clear long press timer
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
        }
      } else if (
        event.touches.length === 2 &&
        initialPinchDistanceRef.current &&
        onPinch
      ) {
        // Handle pinch gesture
        const currentDistance = getTouchDistance(event.touches);
        const scale = currentDistance / initialPinchDistanceRef.current;
        onPinch(scale);
      }

      if (preventScroll) {
        event.preventDefault();
      }
    },
    [threshold, onPinch, getTouchDistance, preventScroll]
  );

  // Handle touch end
  const handleTouchEnd = useCallback(
    (event: TouchEvent) => {
      if (touchStartRef.current && event.changedTouches.length === 1) {
        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - touchStartRef.current.x;
        const deltaY = touch.clientY - touchStartRef.current.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const timeDelta = Date.now() - touchStartRef.current.time;

        // Clear long press timer
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }

        if (distance > threshold) {
          // Determine swipe direction
          const absX = Math.abs(deltaX);
          const absY = Math.abs(deltaY);

          if (absX > absY) {
            // Horizontal swipe
            if (deltaX > 0 && onSwipeRight) {
              onSwipeRight();
            } else if (deltaX < 0 && onSwipeLeft) {
              onSwipeLeft();
            }
          } else {
            // Vertical swipe
            if (deltaY > 0 && onSwipeDown) {
              onSwipeDown();
            } else if (deltaY < 0 && onSwipeUp) {
              onSwipeUp();
            }
          }
        } else if (timeDelta < 300 && !gestureState.isLongPressing && onTap) {
          // Quick tap
          onTap(event);
        }
      }

      // Reset state
      setGestureState({
        isTouch: false,
        isSwiping: false,
        isPinching: false,
        isLongPressing: false,
      });

      touchStartRef.current = null;
      initialPinchDistanceRef.current = null;
    },
    [
      threshold,
      onSwipeLeft,
      onSwipeRight,
      onSwipeUp,
      onSwipeDown,
      onTap,
      gestureState.isLongPressing,
    ]
  );

  // Create ref callback for attaching to elements
  const attachToElement = useCallback(
    (element: HTMLElement | null) => {
      if (!element) return;

      element.addEventListener('touchstart', handleTouchStart, {
        passive: !preventScroll,
      });
      element.addEventListener('touchmove', handleTouchMove, {
        passive: !preventScroll,
      });
      element.addEventListener('touchend', handleTouchEnd, {
        passive: !preventScroll,
      });

      return () => {
        element.removeEventListener('touchstart', handleTouchStart);
        element.removeEventListener('touchmove', handleTouchMove);
        element.removeEventListener('touchend', handleTouchEnd);
      };
    },
    [handleTouchStart, handleTouchMove, handleTouchEnd, preventScroll]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  return {
    gestureState,
    attachToElement,
  };
}

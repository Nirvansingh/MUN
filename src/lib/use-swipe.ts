'use client';

import { useEffect, useRef, useCallback } from 'react';

interface SwipeConfig {
  edgeThreshold?: number;    // px from edge to trigger edge swipe
  swipeThreshold?: number;   // minimum px distance to count as swipe
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeLeftEdge?: () => void;
  onSwipeRightEdge?: () => void;
  enabled?: boolean;
}

/**
 * Hook that detects swipe gestures, especially edge swipes (for opening side panels).
 * Attaches to the document body.
 */
export function useSwipeGesture(config: SwipeConfig) {
  const {
    edgeThreshold = 30,
    swipeThreshold = 50,
    onSwipeLeft,
    onSwipeRight,
    onSwipeLeftEdge,
    onSwipeRightEdge,
    enabled = true,
  } = config;

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const swipedRef = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    swipedRef.current = false;
  }, [enabled]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || !touchStartRef.current || swipedRef.current) return;

    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const elapsed = Date.now() - touchStartRef.current.time;
    const startX = touchStartRef.current.x;
    const winWidth = window.innerWidth;

    // Only handle horizontal swipes (ignore vertical scrolling)
    if (Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (Math.abs(dx) < swipeThreshold) return;
    if (elapsed > 500) return; // too slow

    // Edge swipe from left: open sidebar
    if (dx > swipeThreshold && startX <= edgeThreshold) {
      swipedRef.current = true;
      onSwipeRightEdge?.();
      return;
    }

    // Edge swipe from right: open right panel
    if (dx < -swipeThreshold && startX >= winWidth - edgeThreshold) {
      swipedRef.current = true;
      onSwipeLeftEdge?.();
      return;
    }

    // General swipe (not from edge)
    if (dx > swipeThreshold) {
      swipedRef.current = true;
      onSwipeRight?.();
      return;
    }
    if (dx < -swipeThreshold) {
      swipedRef.current = true;
      onSwipeLeft?.();
      return;
    }
  }, [enabled, edgeThreshold, swipeThreshold, onSwipeLeft, onSwipeRight, onSwipeLeftEdge, onSwipeRightEdge]);

  const handleTouchEnd = useCallback(() => {
    touchStartRef.current = null;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);
}

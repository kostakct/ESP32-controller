import React, { useRef, useEffect } from 'react';

interface HoldRepeatButtonProps {
  onAction: () => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
  id?: string;
  ariaLabel?: string;
}

export const HoldRepeatButton: React.FC<HoldRepeatButtonProps> = ({
  onAction,
  children,
  className = '',
  title,
  id,
  ariaLabel,
}) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isHoldingRef = useRef(false);

  // Keep a stable ref to onAction so intervals always call the latest callback
  const actionRef = useRef(onAction);
  useEffect(() => {
    actionRef.current = onAction;
  }, [onAction]);

  const stop = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isHoldingRef.current = false;
  };

  const start = (e: React.PointerEvent) => {
    // Only handle primary button (e.g. left click or touch)
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    // Trigger immediate first step
    actionRef.current();
    isHoldingRef.current = true;

    // Clear any leftover timers
    stop();

    // After 350ms delay, start accelerated repeat intervals
    timeoutRef.current = setTimeout(() => {
      let speed = 120; // start speed
      let ticks = 0;

      const runInterval = () => {
        actionRef.current();
        ticks++;
        // Accelerate after holding for a while
        if (ticks > 10 && speed > 50) {
          speed = 60;
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = setInterval(runInterval, speed);
        }
      };

      intervalRef.current = setInterval(runInterval, speed);
    }, 350);
  };

  useEffect(() => {
    return () => stop();
  }, []);

  return (
    <button
      id={id}
      type="button"
      title={title}
      aria-label={ariaLabel}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      className={`select-none touch-manipulation active:scale-95 transition-transform ${className}`}
    >
      {children}
    </button>
  );
};

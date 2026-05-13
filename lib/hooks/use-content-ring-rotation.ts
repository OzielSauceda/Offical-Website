"use client";

import {
  PointerEvent as ReactPointerEvent,
  useCallback,
  useRef,
  WheelEvent as ReactWheelEvent,
} from "react";

const DRAG_SENSITIVITY = 0.006;
const WHEEL_THRESHOLD = 120;
const WHEEL_DECAY_MS = 100;
const COOLDOWN_MS = 360;

// rotates a ring of N content elements. snaps to N evenly-spaced stops on
// release so one element is always centered toward the camera.
export function useContentRingRotation(stops: number) {
  const STEP_RAD = (Math.PI * 2) / stops;
  const targetRotationRef = useRef(0);
  const swipeStartRef = useRef<{ x: number; rotation: number } | null>(null);
  const cooldownUntilRef = useRef(0);
  const wheelAccumRef = useRef({ value: 0, lastT: 0 });

  const reset = useCallback(() => {
    targetRotationRef.current = 0;
    swipeStartRef.current = null;
  }, []);

  const onPointerSwipeStart = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      swipeStartRef.current = {
        x: e.clientX,
        rotation: targetRotationRef.current,
      };
    },
    [],
  );

  const onPointerSwipeMove = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      const start = swipeStartRef.current;
      if (!start) return;
      const dx = e.clientX - start.x;
      targetRotationRef.current = start.rotation + dx * DRAG_SENSITIVITY;
    },
    [],
  );

  const onPointerSwipeEnd = useCallback(() => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start) return;
    const snapped =
      Math.round(targetRotationRef.current / STEP_RAD) * STEP_RAD;
    targetRotationRef.current = snapped;
  }, [STEP_RAD]);

  const advance = useCallback(
    (dir: -1 | 1) => {
      cooldownUntilRef.current = performance.now() + COOLDOWN_MS;
      targetRotationRef.current -= dir * STEP_RAD;
    },
    [STEP_RAD],
  );

  const onWheel = useCallback(
    (e: ReactWheelEvent<HTMLElement>) => {
      const now = performance.now();
      if (now < cooldownUntilRef.current) return;
      const accum = wheelAccumRef.current;
      if (now - accum.lastT > WHEEL_DECAY_MS) accum.value = 0;
      accum.value += e.deltaY;
      accum.lastT = now;
      if (Math.abs(accum.value) >= WHEEL_THRESHOLD) {
        advance(accum.value > 0 ? 1 : -1);
        accum.value = 0;
      }
    },
    [advance],
  );

  return {
    targetRotationRef,
    onPointerSwipeStart,
    onPointerSwipeMove,
    onPointerSwipeEnd,
    onWheel,
    reset,
  };
}

"use client";

import {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  useCallback,
  useRef,
  useState,
  WheelEvent as ReactWheelEvent,
} from "react";

import { SECTIONS } from "@/lib/sections";

const DRAG_SENSITIVITY = 0.006;
const WHEEL_THRESHOLD = 120;
const WHEEL_DECAY_MS = 100;
const COOLDOWN_MS = 520;
const STEP_RAD = Math.PI / 2;

const N = SECTIONS.length;

// rotation R produces world angle (local + R) for each label. About is camera-facing
// when R = 0; Projects when R = -π/2; etc. So idx = round(-R / step) mod N.
function rotationToIdx(rotation: number): number {
  return ((Math.round(-rotation / STEP_RAD) % N) + N) % N;
}

export function useSectionNavigator() {
  const [activeIdx, setActiveIdx] = useState(0);
  const activeIdxRef = useRef(0);
  const targetRotationRef = useRef(0);
  const cooldownUntilRef = useRef(0);
  const swipeStartRef = useRef<{ x: number; rotation: number } | null>(null);
  const wheelAccumRef = useRef({ value: 0, lastT: 0 });

  const syncActiveFromRotation = useCallback(() => {
    const next = rotationToIdx(targetRotationRef.current);
    if (next !== activeIdxRef.current) {
      activeIdxRef.current = next;
      setActiveIdx(next);
    }
  }, []);

  const advance = useCallback(
    (dir: -1 | 1) => {
      cooldownUntilRef.current = performance.now() + COOLDOWN_MS;
      targetRotationRef.current -= dir * STEP_RAD;
      syncActiveFromRotation();
    },
    [syncActiveFromRotation],
  );

  // drag begin — record the pointer X and current rotation so subsequent moves
  // compute a relative delta
  const onPointerSwipeStart = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      swipeStartRef.current = {
        x: e.clientX,
        rotation: targetRotationRef.current,
      };
    },
    [],
  );

  // drag move — track the pointer 1:1 (same sensitivity as the globe drag).
  // no snapping mid-drag; the screen rotates continuously with the finger.
  const onPointerSwipeMove = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      const start = swipeStartRef.current;
      if (!start) return;
      const dx = e.clientX - start.x;
      targetRotationRef.current = start.rotation + dx * DRAG_SENSITIVITY;
    },
    [],
  );

  // drag release — snap to the nearest section angle. the ScreenAssembly's lerp
  // animates the snap smoothly.
  const onPointerSwipeEnd = useCallback(() => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start) return;
    const snapped =
      Math.round(targetRotationRef.current / STEP_RAD) * STEP_RAD;
    targetRotationRef.current = snapped;
    syncActiveFromRotation();
  }, [syncActiveFromRotation]);

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

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLElement>) => {
      if (performance.now() < cooldownUntilRef.current) return;
      if (e.key === "ArrowLeft") advance(-1);
      else if (e.key === "ArrowRight") advance(1);
    },
    [advance],
  );

  return {
    activeIdx,
    targetRotationRef,
    onPointerSwipeStart,
    onPointerSwipeMove,
    onPointerSwipeEnd,
    onWheel,
    onKeyDown,
    advance,
  };
}

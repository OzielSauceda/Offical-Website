"use client";

import {
  PointerEvent,
  useCallback,
  useRef,
  useState,
} from "react";

import dynamic from "next/dynamic";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

const StarCanvas = dynamic(
  () => import("./canvas").then((m) => m.StarCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 bg-[color:var(--color-bg)]" />
    ),
  },
);

export function StarCoreHero() {
  const [grabbing, setGrabbing] = useState(false);
  const targetRotationRef = useRef(0);
  const isDraggingRef = useRef(false);
  const lastInteractionRef = useRef(0);
  const lastXRef = useRef(0);
  const reducedMotion = useReducedMotion();

  const onPointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // capture can fail on some browsers
    }
    isDraggingRef.current = true;
    lastXRef.current = e.clientX;
    lastInteractionRef.current = performance.now();
    setGrabbing(true);
  }, []);

  const onPointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastXRef.current;
    lastXRef.current = e.clientX;
    targetRotationRef.current += dx * 0.012;
    lastInteractionRef.current = performance.now();
  }, []);

  const onPointerUp = useCallback((e: PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // already released
    }
    isDraggingRef.current = false;
    lastInteractionRef.current = performance.now();
    setGrabbing(false);
  }, []);

  return (
    <section
      aria-label="Star core hero"
      className="relative w-full h-[100svh] overflow-hidden bg-[color:var(--color-bg)]"
    >
      <div className="absolute inset-0">
        <StarCanvas
          targetRotationRef={targetRotationRef}
          isDraggingRef={isDraggingRef}
          lastInteractionRef={lastInteractionRef}
          reducedMotion={reducedMotion}
        />
      </div>

      <div
        className={`absolute inset-0 z-10 touch-none select-none ${grabbing ? "cursor-grabbing" : "cursor-grab"}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="presentation"
      />

      <div className="pointer-events-none absolute inset-0">
        <p className="absolute left-6 top-6 sm:left-10 sm:top-10 text-xs sm:text-sm uppercase tracking-[0.32em] text-[color:var(--color-fg)]">
          Oziel Sauceda
        </p>

        <p className="absolute right-6 bottom-6 sm:right-10 sm:bottom-10 text-[10px] sm:text-xs uppercase tracking-[0.25em] text-[color:var(--color-muted)]">
          drag to rotate · scroll to read on
        </p>
      </div>
    </section>
  );
}

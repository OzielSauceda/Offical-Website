"use client";

import { PointerEvent, useCallback, useRef, useState } from "react";

import dynamic from "next/dynamic";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

const StageCanvas = dynamic(
  () => import("./stage-canvas").then((m) => m.StageCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 bg-[color:var(--color-stage-bg)]" />
    ),
  },
);

export function PixelEarthStage() {
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
      // capture can fail on some browsers; drag still works via window events
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
    targetRotationRef.current += dx * 0.006;
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
      aria-label="Interactive pixel earth stage"
      className={`relative min-h-[100svh] w-full overflow-hidden select-none touch-none ${grabbing ? "stage-cursor-grabbing" : "stage-cursor-grab"}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <StageCanvas
        targetRotationRef={targetRotationRef}
        isDraggingRef={isDraggingRef}
        lastInteractionRef={lastInteractionRef}
        reducedMotion={reducedMotion}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[color:var(--color-stage-bg)]" />
      <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-xs uppercase tracking-[0.3em] text-[color:var(--color-stage-muted)]">
        drag to spin
      </div>
    </section>
  );
}

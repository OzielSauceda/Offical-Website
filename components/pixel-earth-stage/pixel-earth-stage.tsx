"use client";

import { PointerEvent, useCallback, useRef, useState, WheelEvent } from "react";

import dynamic from "next/dynamic";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { useSectionNavigator } from "@/lib/hooks/use-section-navigator";
import { SECTIONS } from "@/lib/sections";

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

  const {
    activeIdx,
    targetRotationRef: screenRotationTargetRef,
    onPointerSwipeStart,
    onPointerSwipeMove,
    onPointerSwipeEnd,
    onWheel,
    onKeyDown,
  } = useSectionNavigator();

  // GLOBE zone — drag-to-spin only. No section nav.
  const onGlobePointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // capture can fail on some browsers; drag still works via window events
      }
      isDraggingRef.current = true;
      lastXRef.current = e.clientX;
      lastInteractionRef.current = performance.now();
      setGrabbing(true);
    },
    [],
  );

  const onGlobePointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastXRef.current;
    lastXRef.current = e.clientX;
    targetRotationRef.current += dx * 0.006;
    lastInteractionRef.current = performance.now();
  }, []);

  const onGlobePointerUp = useCallback((e: PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // already released
    }
    isDraggingRef.current = false;
    lastInteractionRef.current = performance.now();
    setGrabbing(false);
  }, []);

  const onEnvironmentWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const primaryDelta =
      Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    targetRotationRef.current += primaryDelta * 0.0022;
    lastInteractionRef.current = performance.now();
  }, []);

  // SCREEN zone — drives the screen carousel rotation. stopPropagation so the
  // globe handler never sees these events.
  const onScreenPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // capture can fail on some browsers
      }
      onPointerSwipeStart(e);
    },
    [onPointerSwipeStart],
  );

  const onScreenPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      onPointerSwipeMove(e);
    },
    [onPointerSwipeMove],
  );

  const onScreenPointerUp = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // already released
      }
      onPointerSwipeEnd();
    },
    [onPointerSwipeEnd],
  );

  const onScreenWheel = useCallback(
    (e: WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      onWheel(e);
    },
    [onWheel],
  );

  const sectionTitle = SECTIONS[activeIdx]?.title ?? "About";
  const environment = SECTIONS[activeIdx]?.environment ?? "globe";

  return (
    <section
      aria-label={`Interactive pixel earth stage, ${sectionTitle} section`}
      tabIndex={0}
      className={`stage-shell relative h-[100svh] w-full overflow-hidden select-none touch-none outline-none ${grabbing ? "stage-cursor-grabbing" : "stage-cursor-grab"}`}
      onPointerDown={onGlobePointerDown}
      onPointerMove={onGlobePointerMove}
      onPointerUp={onGlobePointerUp}
      onPointerCancel={onGlobePointerUp}
      onWheel={onEnvironmentWheel}
      onKeyDown={onKeyDown}
    >
      <div aria-hidden className="stage-nebula pointer-events-none absolute inset-0" />
      <div aria-hidden className="stage-vignette pointer-events-none absolute inset-0" />
      <StageCanvas
        targetRotationRef={targetRotationRef}
        isDraggingRef={isDraggingRef}
        lastInteractionRef={lastInteractionRef}
        reducedMotion={reducedMotion}
        screenRotationTargetRef={screenRotationTargetRef}
        environment={environment}
      />

      {/* SCREEN INTERACTION ZONE — invisible, captures pointer + wheel for
          rotating the screen carousel. Covers the upper portion of the viewport
          where the arena screen sits. */}
      <div
        aria-label="Section navigator: drag the circular screen to rotate between sections"
        role="region"
        className="absolute inset-x-0 top-0 h-[36%] cursor-ew-resize"
        onPointerDown={onScreenPointerDown}
        onPointerMove={onScreenPointerMove}
        onPointerUp={onScreenPointerUp}
        onPointerCancel={onScreenPointerUp}
        onWheel={onScreenWheel}
      />

      <div aria-hidden className="stage-grain pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[color:var(--color-stage-bg)]" />
      <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 text-[10px] uppercase tracking-[0.4em] text-[color:var(--color-stage-muted)]">
        <span className="h-px w-8 bg-[color:var(--color-stage-muted)]/40" />
        spin environment · rotate screen · ←→
        <span className="h-px w-8 bg-[color:var(--color-stage-muted)]/40" />
      </div>
    </section>
  );
}

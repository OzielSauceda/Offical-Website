"use client";

import {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  WheelEvent,
} from "react";

import dynamic from "next/dynamic";

import { useContentRingRotation } from "@/lib/hooks/use-content-ring-rotation";
import { useEnteredSection } from "@/lib/hooks/use-entered-section";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { useSectionNavigator } from "@/lib/hooks/use-section-navigator";
import { SECTIONS } from "@/lib/sections";

import { EnterChip } from "./enter-chip";
import { IntroLoader } from "./intro-loader";

const StageCanvas = dynamic(
  () => import("./stage-canvas").then((m) => m.StageCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 bg-[color:var(--color-stage-bg)]" />
    ),
  },
);

// the carousel snaps to multiples of π/2; "settled" means the live rotation
// is within ~0.04 rad of a snap point, which is roughly the threshold the
// labels-ring uses to consider a section centered.
const SETTLE_TOLERANCE = 0.04;

export function PixelEarthStage() {
  const [grabbing, setGrabbing] = useState(false);
  const targetRotationRef = useRef(-0.55);
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
    onKeyDown: navigatorKeyDown,
  } = useSectionNavigator();

  const { enteredSectionId, enter, exit } = useEnteredSection();

  // content-ring rotation: 3 stops for now (About has 3 slabs). when the
  // first non-About reveal lands with a different slab count, we can lift
  // this to read from SECTION_CONTENT.
  const contentRing = useContentRingRotation(3);

  // track whether the carousel is "settled" so the ENTER chip only appears
  // when there is a centered section to enter. polled on a short interval
  // because the rotation value lives in a ref (no React state).
  const [settled, setSettled] = useState(true);
  useEffect(() => {
    const id = window.setInterval(() => {
      const target = screenRotationTargetRef.current;
      const snapStep = Math.PI / 2;
      const distance = Math.abs(
        target - Math.round(target / snapStep) * snapStep,
      );
      setSettled(distance < SETTLE_TOLERANCE);
    }, 80);
    return () => window.clearInterval(id);
  }, [screenRotationTargetRef]);

  // when an entry happens, reset the content ring rotation so the centered
  // slab is the front one. on exit, also reset.
  useEffect(() => {
    contentRing.reset();
  }, [enteredSectionId, contentRing]);

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

  // SCREEN zone — drives the screen carousel rotation OR the content ring,
  // depending on whether a section is currently entered.
  const screenZoneActive = enteredSectionId === null;

  const onScreenPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // capture can fail on some browsers
      }
      if (screenZoneActive) onPointerSwipeStart(e);
      else contentRing.onPointerSwipeStart(e);
    },
    [screenZoneActive, onPointerSwipeStart, contentRing],
  );

  const onScreenPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      if (screenZoneActive) onPointerSwipeMove(e);
      else contentRing.onPointerSwipeMove(e);
    },
    [screenZoneActive, onPointerSwipeMove, contentRing],
  );

  const onScreenPointerUp = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // already released
      }
      if (screenZoneActive) onPointerSwipeEnd();
      else contentRing.onPointerSwipeEnd();
    },
    [screenZoneActive, onPointerSwipeEnd, contentRing],
  );

  const onScreenWheel = useCallback(
    (e: WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (screenZoneActive) onWheel(e);
      else contentRing.onWheel(e);
    },
    [screenZoneActive, onWheel, contentRing],
  );

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLElement>) => {
      if (e.key === "Escape" && enteredSectionId !== null) {
        e.preventDefault();
        exit();
        return;
      }
      if (
        e.key === "Enter" &&
        enteredSectionId === null &&
        settled
      ) {
        const section = SECTIONS[activeIdx];
        if (
          section &&
          (section.id === "about" || section.id === "projects")
        ) {
          e.preventDefault();
          enter(section.id);
          return;
        }
      }
      navigatorKeyDown(e);
    },
    [enteredSectionId, settled, activeIdx, enter, exit, navigatorKeyDown],
  );

  const activeSection = SECTIONS[activeIdx];
  const sectionTitle = activeSection?.title ?? "About";
  const environment = activeSection?.environment ?? "globe";
  // listening-set framing: when entered, the screen flashes
  // "PERFORMANCE 0X" above a smaller "// SECTIONTITLE". performance number
  // is 1-indexed from the section's position in SECTIONS so it reads as a
  // setlist position, not a route slug.
  const enteredIdx = enteredSectionId
    ? SECTIONS.findIndex((s) => s.id === enteredSectionId)
    : -1;
  const enteredSubhead =
    enteredIdx >= 0 ? (SECTIONS[enteredIdx]?.title ?? "") : "";
  const enteredHeader =
    enteredIdx >= 0
      ? `PERFORMANCE ${String(enteredIdx + 1).padStart(2, "0")}`
      : "";
  // About and Projects have wired reveals; Research and Contact still show
  // the chip in a disabled (OFF-AIR) state until their props land.
  const enterAvailable =
    activeSection?.id === "about" || activeSection?.id === "projects";

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
      <IntroLoader />
      <StageCanvas
        targetRotationRef={targetRotationRef}
        isDraggingRef={isDraggingRef}
        lastInteractionRef={lastInteractionRef}
        reducedMotion={reducedMotion}
        screenRotationTargetRef={screenRotationTargetRef}
        environment={environment}
        enteredSectionId={enteredSectionId}
        enteredHeader={enteredHeader}
        enteredSubhead={enteredSubhead}
        contentRingRotationRef={contentRing.targetRotationRef}
      />

      {/* SCREEN INTERACTION ZONE — invisible, captures pointer + wheel for
          rotating the screen carousel (or the content ring when entered).
          Covers the upper portion of the viewport where the arena screen sits. */}
      <div
        aria-label={
          enteredSectionId
            ? "Drag to rotate section content"
            : "Section navigator: drag the circular screen to rotate between sections"
        }
        role="region"
        className="absolute inset-x-0 top-0 h-[36%] cursor-ew-resize"
        onPointerDown={onScreenPointerDown}
        onPointerMove={onScreenPointerMove}
        onPointerUp={onScreenPointerUp}
        onPointerCancel={onScreenPointerUp}
        onWheel={onScreenWheel}
      />

      <EnterChip
        visible={settled && enteredSectionId === null}
        title={sectionTitle}
        available={enterAvailable}
        onActivate={() => {
          if (activeSection) enter(activeSection.id);
        }}
      />

      {/* EXIT affordance — only visible while entered. positioned bottom-left
          out of the way of the slab ring. */}
      {enteredSectionId !== null && (
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            exit();
          }}
          onClick={(e) => e.stopPropagation()}
          aria-label="End set and return to navigator"
          className="pointer-events-auto absolute left-5 top-5 z-20 inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/40 px-3 py-1.5 text-[10px] uppercase tracking-[0.34em] text-white/85 backdrop-blur-sm transition-colors hover:border-white/70 hover:bg-black/60 focus-visible:border-white focus-visible:outline-none"
        >
          <span aria-hidden>←</span>
          <span>END SET</span>
          <span aria-hidden className="text-[9px] opacity-60">ESC</span>
        </button>
      )}

      <div aria-hidden className="stage-audience pointer-events-none absolute inset-0" />
      <div aria-hidden className="stage-grain pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[color:var(--color-stage-bg)]" />
      <div hidden className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 text-[10px] uppercase tracking-[0.4em] text-[color:var(--color-stage-muted)]">
        <span className="h-px w-8 bg-[color:var(--color-stage-muted)]/40" />
        spin environment · rotate screen · ←→
        <span className="h-px w-8 bg-[color:var(--color-stage-muted)]/40" />
      </div>
    </section>
  );
}

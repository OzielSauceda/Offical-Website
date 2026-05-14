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
import { SECTION_CONTENT } from "@/lib/section-content";
import { SECTIONS } from "@/lib/sections";

import { EnterChip } from "./enter-chip";
import { IntroLoader } from "./intro-loader";
import { JCardPage, type JCardScreenRect } from "./jcard-page";

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
  const sectionRef = useRef<HTMLElement>(null);
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

  // selected About cassette (lifted from the reveal). drives the read-mode
  // camera dolly + the J-card print layer. `null` while the cassette ring is
  // idle or no cassette has been clicked yet.
  const [aboutSelectedIndex, setAboutSelectedIndex] = useState<number | null>(
    null,
  );
  // becomes true a beat after a cassette is selected (lid has had time to
  // swing open) so the print layer + camera push-in only kick in once the open
  // animation has settled. instant under reduced motion.
  const [aboutReadReady, setAboutReadReady] = useState(false);
  // any time an About cassette is selected (opening, open, closing) we want
  // pointer/wheel routed away from the carousels so the user can't yank the
  // ring while a cassette is mid-animation. read-mode waits for the open
  // animation to settle.
  const aboutCassetteOpen =
    enteredSectionId === "about" && aboutSelectedIndex !== null;
  const aboutReadModeActive = aboutCassetteOpen && aboutReadReady;

  // delay reading-mode readiness so the lid open + cassette focus animation
  // can play first. reset and re-time whenever the selected cassette
  // changes; clear immediately on deselect. these setStates are exactly the
  // "sync local state to an external trigger" use effects exist for.
  useEffect(() => {
    if (aboutSelectedIndex === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAboutReadReady(false);
      return;
    }
    if (reducedMotion) {
      setAboutReadReady(true);
      return;
    }
    setAboutReadReady(false);
    const id = window.setTimeout(() => setAboutReadReady(true), 1050);
    return () => window.clearTimeout(id);
  }, [aboutSelectedIndex, reducedMotion]);

  // viewport-percent rect the J-card paper occupies on screen. updated every
  // frame by the AboutCassette projection so it tracks the paper through
  // the camera dolly AND the extract+flip motion. snapshotted into state
  // at the instant extraction completes so JCardPage's morph starts from
  // the paper's actual presented pose — the user reads the rect grow as
  // a continuation of the physical paper, not a separate page swap.
  const jcardScreenRectRef = useRef<JCardScreenRect | null>(null);
  const [jcardStartRect, setJcardStartRect] = useState<JCardScreenRect | null>(
    null,
  );

  // reading-mode camera has dollied to its close pose. armed by the camera
  // rig once distance to ABOUT_READING_CAMERA crosses a tight threshold.
  const [cameraReadingSettled, setCameraReadingSettled] = useState(false);

  // paper-extract phase: 0 = paper at rest inside the case, 1 = paper has
  // slid forward of the case and rotated from portrait to landscape, ready
  // to hand off to the DOM page. rAF-driven, read inside the canvas via
  // paperProgressRef.current. the boolean mirror paperExtracted lets
  // React-side state (page mount) react to the animation finishing without
  // re-rendering every frame.
  const paperProgressRef = useRef(0);
  const [paperExtracted, setPaperExtracted] = useState(false);

  // closingPage gates the cassette close so page-exit and paper-retract
  // play in sequence before the lid swings shut.
  const [closingPage, setClosingPage] = useState(false);

  const handleReadingCameraSettled = useCallback((settled: boolean) => {
    setCameraReadingSettled(settled);
  }, []);

  // when the camera arrives, animate the paper out of the case and rotate
  // it from portrait to landscape. one progress value, split into
  // overlapping slide/rotate phases inside AboutCassette so the motion
  // reads as a single continuous pull-out + flip.
  useEffect(() => {
    if (closingPage) return;
    if (!cameraReadingSettled) {
      paperProgressRef.current = 0;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPaperExtracted(false);
      return;
    }
    if (reducedMotion) {
      paperProgressRef.current = 1;
      setPaperExtracted(true);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const startVal = paperProgressRef.current;
    const duration = 1000 * Math.max(0.05, 1 - startVal);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // cubic-in-out: gentle takeoff, smooth landing, no jerky ends.
      const eased =
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      paperProgressRef.current = startVal + (1 - startVal) * eased;
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        paperProgressRef.current = 1;
        setPaperExtracted(true);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cameraReadingSettled, closingPage, reducedMotion]);

  // snapshot the paper's screen rect the instant extraction finishes, so
  // JCardPage's morph starts from the just-flipped landscape paper.
  useEffect(() => {
    if (paperExtracted) {
      setJcardStartRect(jcardScreenRectRef.current);
    } else {
      setJcardStartRect(null);
    }
  }, [paperExtracted]);

  const aboutPageActive = paperExtracted && !closingPage;

  // close orchestration. Escape → closingPage true → JCardPage exit shrinks
  // back to paper rect (520ms). then paper retracts (700ms): rotates back
  // to portrait, slides back into the case. then setAboutSelectedIndex(null)
  // → cassette lid swings shut via the existing open/close logic.
  const initiatePageClose = useCallback(() => {
    if (!aboutPageActive && !closingPage) {
      setAboutSelectedIndex(null);
      return;
    }
    if (closingPage) return;
    setClosingPage(true);
  }, [aboutPageActive, closingPage]);

  useEffect(() => {
    if (!closingPage) return;
    const pageExit = reducedMotion ? 0 : 520;
    const paperRetract = reducedMotion ? 0 : 700;

    let raf = 0;
    let pageTimer = 0;
    let cassetteTimer = 0;

    pageTimer = window.setTimeout(() => {
      if (reducedMotion) {
        paperProgressRef.current = 0;
      } else {
        const start = performance.now();
        const startVal = paperProgressRef.current;
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / paperRetract);
          const eased =
            t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
          paperProgressRef.current = startVal * (1 - eased);
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      }
      cassetteTimer = window.setTimeout(() => {
        paperProgressRef.current = 0;
        setAboutSelectedIndex(null);
        setClosingPage(false);
      }, paperRetract);
    }, pageExit);

    return () => {
      window.clearTimeout(pageTimer);
      window.clearTimeout(cassetteTimer);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [closingPage, reducedMotion]);

  // when the cassette closes, focus was probably inside the J-card reader
  // (now hidden) or the 3D liner-note column (now unmounted). put focus
  // back on the stage section so a follow-up Escape can still exit About.
  useEffect(() => {
    if (aboutSelectedIndex !== null) return;
    const section = sectionRef.current;
    if (!section) return;
    const active = document.activeElement;
    if (!active || active === document.body || section.contains(active)) {
      section.focus({ preventScroll: true });
    }
  }, [aboutSelectedIndex]);

  // content-ring rotation: 3 stops for now (About has 3 slabs). when the
  // first non-About reveal lands with a different slab count, we can lift
  // this to read from SECTION_CONTENT.
  // 3 cassettes spaced 60° apart in a front-facing fan (not a full ring),
  // so the snap step is π/3 not 2π/3. clamps the swipe range to ±60° so
  // the user can only land on the three actual cassette positions.
  const contentRing = useContentRingRotation(3, Math.PI / 3);

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
  // disabled when a section is entered so interactive props inside the
  // section reveal (cassettes etc.) don't kick off a globe spin.
  const onGlobePointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (enteredSectionId !== null || aboutReadModeActive) return;
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
    [enteredSectionId, aboutReadModeActive],
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

  const onEnvironmentWheel = useCallback(
    (e: WheelEvent<HTMLDivElement>) => {
      // when the J-card reader is up, wheel events inside it stop
      // propagation before they reach here. anything that does bubble up is
      // outside the reader, but we still want the globe spin to freeze
      // while reading, so bail out.
      if (aboutCassetteOpen) return;
      e.preventDefault();
      const primaryDelta =
        Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      targetRotationRef.current += primaryDelta * 0.0022;
      lastInteractionRef.current = performance.now();
    },
    [aboutCassetteOpen],
  );

  // SCREEN zone — drives the screen carousel rotation OR the content ring,
  // depending on whether a section is currently entered. fully inert while
  // the J-card reader is up so swipes inside the readable area don't
  // accidentally rotate the cassette ring underneath.
  const screenZoneActive = enteredSectionId === null;

  const onScreenPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      if (aboutCassetteOpen) return;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // capture can fail on some browsers
      }
      if (screenZoneActive) onPointerSwipeStart(e);
      else contentRing.onPointerSwipeStart(e);
    },
    [aboutCassetteOpen, screenZoneActive, onPointerSwipeStart, contentRing],
  );

  const onScreenPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      if (aboutCassetteOpen) return;
      if (screenZoneActive) onPointerSwipeMove(e);
      else contentRing.onPointerSwipeMove(e);
    },
    [aboutCassetteOpen, screenZoneActive, onPointerSwipeMove, contentRing],
  );

  const onScreenPointerUp = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      if (aboutCassetteOpen) return;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // already released
      }
      if (screenZoneActive) onPointerSwipeEnd();
      else contentRing.onPointerSwipeEnd();
    },
    [aboutCassetteOpen, screenZoneActive, onPointerSwipeEnd, contentRing],
  );

  const onScreenWheel = useCallback(
    (e: WheelEvent<HTMLDivElement>) => {
      e.stopPropagation();
      if (aboutCassetteOpen) return;
      e.preventDefault();
      if (screenZoneActive) onWheel(e);
      else contentRing.onWheel(e);
    },
    [aboutCassetteOpen, screenZoneActive, onWheel, contentRing],
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
      ref={sectionRef}
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
        aboutReadModeActive={aboutReadModeActive}
        aboutPageActive={aboutPageActive}
        paperProgressRef={paperProgressRef}
        jcardScreenRectRef={jcardScreenRectRef}
        onAboutSelectionChange={setAboutSelectedIndex}
        onAboutPageCloseRequest={initiatePageClose}
        onReadingCameraSettled={handleReadingCameraSettled}
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
        className={`absolute inset-x-0 top-0 h-[36%] cursor-ew-resize ${aboutCassetteOpen ? "pointer-events-none" : ""}`}
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
          out of the way of the slab ring. z-40 so it floats above the
          full-viewport J-card reader (z-30). */}
      {enteredSectionId !== null && (
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            exit();
          }}
          onClick={(e) => e.stopPropagation()}
          aria-label="End set and return to navigator"
          className={`pointer-events-auto absolute left-5 top-5 z-40 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.34em] backdrop-blur-sm transition-colors focus-visible:outline-none ${
            aboutPageActive
              ? "border-[#a8895a]/60 bg-[#f3e8d0]/85 text-[#5a4520] hover:border-[#7a5b1e] hover:bg-[#f3e8d0] focus-visible:border-[#5a4520]"
              : "border-white/30 bg-black/40 text-white/85 hover:border-white/70 hover:bg-black/60 focus-visible:border-white"
          }`}
        >
          <span aria-hidden>←</span>
          <span>END SET</span>
          <span aria-hidden className="text-[9px] opacity-60">ESC</span>
        </button>
      )}

      <JCardPage
        visible={aboutPageActive}
        reducedMotion={reducedMotion}
        slab={
          aboutSelectedIndex !== null
            ? (SECTION_CONTENT.about.slabs[aboutSelectedIndex] ?? null)
            : null
        }
        trackIndex={aboutSelectedIndex}
        startRect={jcardStartRect}
        onClose={initiatePageClose}
      />

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

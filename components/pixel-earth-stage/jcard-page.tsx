"use client";

import { useEffect, useRef } from "react";

import { AnimatePresence, motion } from "motion/react";

import { Slab } from "@/lib/section-content";

// viewport-relative rect (percent of the stage shell) the in-cassette J-card
// occupies at the moment the camera settles. used as the starting frame for
// the morph from physical paper to full-viewport page.
export type JCardScreenRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const FULL_RECT: JCardScreenRect = { left: 0, top: 0, width: 100, height: 100 };

type Props = {
  visible: boolean;
  reducedMotion: boolean;
  slab: Slab | null;
  trackIndex: number | null;
  startRect: JCardScreenRect | null;
  onClose: () => void;
};

const SIDE_LABEL = ["A", "A", "B"] as const;

// full-viewport J-card reader. visually it's the same cream paper that was
// just inside the cassette case, grown to fill the screen. lives outside the
// canvas (DOM) so the column can be wide, the text crisp, and native scroll
// behavior handles long content. fades in once the read-mode dolly has
// settled — see the `aboutPageActive` trigger in pixel-earth-stage.tsx.
export function JCardPage({
  visible,
  reducedMotion,
  slab,
  trackIndex,
  startRect,
  onClose,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;
    const id = window.requestAnimationFrame(() => {
      scrollerRef.current?.focus({ preventScroll: true });
      scrollerRef.current?.scrollTo({ top: 0 });
    });
    return () => window.cancelAnimationFrame(id);
  }, [visible, slab]);

  if (!slab || trackIndex === null) return null;

  const trackLabel = String(trackIndex + 1).padStart(2, "0");
  const sideLabel = SIDE_LABEL[trackIndex] ?? "A";
  const paragraphs = slab.paragraphs ?? [slab.detail ?? slab.body];
  const credits = slab.credits ?? [];

  // Morph from the extracted, flipped paper rect to the full viewport. The
  // cassette has already done its extract + flip motion at this point — the
  // morph is the final phase of one continuous gesture: paper → paper grows
  // → readable page. content is held off until the rect has effectively
  // landed at the viewport, so readable text never appears while the cream
  // rectangle is still mid-grow.
  const initialRect =
    !reducedMotion && startRect && visible ? startRect : FULL_RECT;
  const morphDuration = reducedMotion ? 0 : 0.9;
  const morphEase: [number, number, number, number] = [0.22, 0.8, 0.22, 1];
  const opacityDuration = reducedMotion ? 0 : 0.28;
  // Hold the article off until the paper is almost full-screen.
  const contentDelay = reducedMotion ? 0 : 0.72;
  const exitDuration = reducedMotion ? 0 : 0.52;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="jcard-overlay"
          aria-hidden={!visible}
          className="pointer-events-auto absolute z-30 overflow-hidden bg-[#f3e8d0] shadow-[0_30px_120px_-30px_rgba(0,0,0,0.4)]"
          initial={{
            left: `${initialRect.left}%`,
            top: `${initialRect.top}%`,
            width: `${initialRect.width}%`,
            height: `${initialRect.height}%`,
            opacity: reducedMotion ? 1 : 0.94,
          }}
          animate={{
            left: "0%",
            top: "0%",
            width: "100%",
            height: "100%",
            opacity: 1,
          }}
          exit={{
            left: `${initialRect.left}%`,
            top: `${initialRect.top}%`,
            width: `${initialRect.width}%`,
            height: `${initialRect.height}%`,
            opacity: 0,
            transition: {
              duration: exitDuration,
              ease: morphEase,
              opacity: { duration: reducedMotion ? 0 : exitDuration * 0.7 },
            },
          }}
          transition={{
            duration: morphDuration,
            ease: morphEase,
            opacity: {
              duration: opacityDuration,
              ease: "easeOut",
            },
          }}
        >
          <div
            ref={scrollerRef}
            tabIndex={visible ? 0 : -1}
            role="document"
            aria-label={`${slab.heading} liner notes`}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onPointerCancel={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }
            }}
            className="jcard-page h-full w-full overflow-y-auto overscroll-contain text-[#221708] outline-none [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: "none" }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: reducedMotion ? 0 : 0.18 } }}
              transition={{
                duration: reducedMotion ? 0 : 0.34,
                delay: contentDelay,
                ease: "easeOut",
              }}
            >
        <article
          className="grid min-h-full w-full grid-cols-1 gap-y-10 px-6 pt-[max(8vh,56px)] pb-24 sm:px-10 lg:grid-cols-[minmax(220px,1fr)_minmax(0,2.6fr)_minmax(220px,1fr)] lg:gap-x-14 lg:gap-y-12 lg:px-14 lg:pt-[max(10vh,80px)] xl:gap-x-20 xl:px-24 2xl:px-32"
        >
          <aside className="lg:sticky lg:top-[max(10vh,80px)] lg:self-start">
            <p className="text-[11px] font-medium uppercase tracking-[0.42em] text-[#7a5b1e]">
              Side {sideLabel} · Track {trackLabel}
            </p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-[clamp(40px,6vw,68px)] leading-[1.02] tracking-[-0.01em] text-[#1a1208]">
              {slab.heading}
            </h1>
            {slab.tagline && (
              <p className="mt-4 max-w-[34ch] text-[clamp(15px,1.4vw,18px)] italic leading-[1.45] text-[#5a4520]">
                {slab.tagline}
              </p>
            )}
            <div aria-hidden className="my-6 h-px w-24 bg-[#a8895a] lg:my-8" />
            <p className="text-[10px] uppercase tracking-[0.42em] text-[#7a5b1e]">
              {slab.meta}
            </p>
          </aside>

          <div className="max-w-[68ch] space-y-5 text-[clamp(15px,1.25vw,17px)] leading-[1.75] text-[#221708] lg:max-w-none lg:pr-2">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          <aside className="flex flex-col gap-10 lg:sticky lg:top-[max(10vh,80px)] lg:self-start">
            {credits.length > 0 && (
              <section>
                <p className="text-[11px] font-medium uppercase tracking-[0.42em] text-[#7a5b1e]">
                  Credits
                </p>
                <ul className="mt-4 space-y-2 text-[14px] leading-[1.55] text-[#221708]">
                  {credits.map((c) => (
                    <li key={c} className="flex gap-3">
                      <span aria-hidden className="mt-[2px] text-[#a8895a]">
                        —
                      </span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <footer className="border-t border-[#c8b48a]/70 pt-3 text-[10px] uppercase tracking-[0.42em] text-[#7a5b1e]">
              <p>Oziel Sauceda</p>
              <p className="mt-3 tracking-[0.38em] text-[#a8895a]">
                ESC closes · scroll for more
              </p>
            </footer>
          </aside>
        </article>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

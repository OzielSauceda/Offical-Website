"use client";

import { PointerEvent as ReactPointerEvent } from "react";

type Props = {
  visible: boolean;
  title: string;
  available: boolean;
  onActivate: () => void;
};

// small affordance under the centered section title. only shows when the
// carousel is settled on a section and the user hasn't entered yet.
// "available" toggles styling for sections whose reveal isn't built yet —
// the chip is still focusable but conveys it's coming soon.
export function EnterChip({ visible, title, available, onActivate }: Props) {
  const handle = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!available) return;
    onActivate();
  };

  return (
    <div
      aria-hidden={!visible}
      className={`pointer-events-none absolute left-1/2 top-[26%] z-20 -translate-x-1/2 select-none transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <button
        type="button"
        tabIndex={visible ? 0 : -1}
        onPointerDown={handle}
        onClick={(e) => e.stopPropagation()}
        aria-label={
          available
            ? `Enter the ${title} section`
            : `${title} section is off-air`
        }
        className={`pointer-events-auto group inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] uppercase tracking-[0.34em] backdrop-blur-sm transition-colors ${
          available
            ? "border-white/30 bg-black/30 text-white/90 hover:border-white/70 hover:bg-black/55 focus-visible:border-white focus-visible:outline-none"
            : "border-white/12 bg-black/20 text-white/40 cursor-not-allowed"
        }`}
      >
        <span className="text-[10px] font-medium tracking-[0.34em]">
          {available ? "ENTER" : "OFF-AIR"}
        </span>
        <span
          aria-hidden
          className={`inline-block h-[6px] w-[6px] rounded-full ${
            available
              ? "bg-white/90 group-hover:bg-white"
              : "bg-white/30"
          } ${available ? "animate-pulse" : ""}`}
        />
        <span className="text-[10px]">{available ? "⏎" : ""}</span>
      </button>
    </div>
  );
}

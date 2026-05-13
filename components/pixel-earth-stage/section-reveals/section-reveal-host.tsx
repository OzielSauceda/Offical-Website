"use client";

import { RefObject } from "react";

import type { SectionId } from "@/lib/sections";

import { AboutGlobeReveal } from "./about-globe-reveal";
import { ProjectsMountainReveal } from "./projects-mountain-reveal";

type Props = {
  enteredSectionId: SectionId | null;
  reducedMotion: boolean;
  ringRotationRef: RefObject<number>;
};

// picks which section reveal to mount. each reveal component handles its
// own entry / exit animation + delayed unmount so the host can hand the
// `entered` flag in without worrying about timing.
export function SectionRevealHost({
  enteredSectionId,
  reducedMotion,
  ringRotationRef,
}: Props) {
  return (
    <>
      <AboutGlobeReveal
        entered={enteredSectionId === "about"}
        reducedMotion={reducedMotion}
        ringRotationRef={ringRotationRef}
      />
      <ProjectsMountainReveal
        entered={enteredSectionId === "projects"}
        reducedMotion={reducedMotion}
        ringRotationRef={ringRotationRef}
      />
    </>
  );
}

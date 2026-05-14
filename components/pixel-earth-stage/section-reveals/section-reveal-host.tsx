"use client";

import { RefObject } from "react";

import type { SectionId } from "@/lib/sections";

import type { JCardScreenRect } from "../jcard-page";
import { AboutGlobeReveal } from "./about-globe-reveal";
import { ProjectsMountainReveal } from "./projects-mountain-reveal";

type Props = {
  enteredSectionId: SectionId | null;
  reducedMotion: boolean;
  ringRotationRef: RefObject<number>;
  aboutPageActive: boolean;
  paperProgressRef?: RefObject<number>;
  jcardScreenRectRef?: RefObject<JCardScreenRect | null>;
  onAboutSelectionChange?: (index: number | null) => void;
  onAboutPageCloseRequest?: () => void;
};

// picks which section reveal to mount. each reveal component handles its
// own entry / exit animation + delayed unmount so the host can hand the
// `entered` flag in without worrying about timing.
export function SectionRevealHost({
  enteredSectionId,
  reducedMotion,
  ringRotationRef,
  aboutPageActive,
  paperProgressRef,
  jcardScreenRectRef,
  onAboutSelectionChange,
  onAboutPageCloseRequest,
}: Props) {
  return (
    <>
      <AboutGlobeReveal
        entered={enteredSectionId === "about"}
        reducedMotion={reducedMotion}
        ringRotationRef={ringRotationRef}
        aboutPageActive={aboutPageActive}
        paperProgressRef={paperProgressRef}
        jcardScreenRectRef={jcardScreenRectRef}
        onSelectionChange={onAboutSelectionChange}
        onPageCloseRequest={onAboutPageCloseRequest}
      />
      <ProjectsMountainReveal
        entered={enteredSectionId === "projects"}
        reducedMotion={reducedMotion}
        ringRotationRef={ringRotationRef}
      />
    </>
  );
}

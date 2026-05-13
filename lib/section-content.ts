import type { SectionId } from "@/lib/sections";

// each slab is presented as a different "album cover" treatment so the three
// of them read like records from the same artist's catalog rather than three
// identical cards. paper = cream sketchbook page, black = aggressive
// brutalist red-on-black, concrete = cream stone with a dark photo plate.
export type SlabTreatment = "paper" | "black" | "concrete";

export type Slab = {
  heading: string;
  body: string;
  // small corner indicator in the lower-right of the slab face — back-sleeve
  // framing (side label + fake run length, or a chapter index).
  meta: string;
  // legacy field from the early slab-based design — kept optional so the
  // type still validates the about cassettes that include it. unused by
  // the current cassette / CD-case / vinyl / laminate props.
  treatment?: SlabTreatment;
};

export type SectionContent = {
  slabs: Slab[];
};

// placeholder copy. swap into MDX later if/when content authoring needs grow.
// keep heading <= 14 chars and body <= 220 chars so it lays out on a slab
// without wrapping past the inscription area.
export const SECTION_CONTENT: Record<SectionId, SectionContent> = {
  about: {
    slabs: [
      {
        heading: "ORIGIN",
        body: "Built from a small town and a louder imagination. Software, design, and stage craft in equal measure.",
        meta: "SIDE A · 2:34",
        treatment: "paper",
      },
      {
        heading: "FOCUS",
        body: "Interfaces that move. Real-time graphics, careful typography, and product instincts borrowed from album rollouts.",
        meta: "SIDE A · 3:12",
        treatment: "black",
      },
      {
        heading: "SIGNAL",
        body: "Always sketching. Always shipping. The site you are inside of is the current draft of the answer.",
        meta: "SIDE B · 1:48",
        treatment: "concrete",
      },
    ],
  },
  projects: {
    slabs: [
      {
        heading: "FIRST CUT",
        body: "Placeholder for the first project. Swap this body copy with a one-paragraph description of the work, the stack, and the role.",
        meta: "2024 · LEAD",
      },
      {
        heading: "B-SIDE",
        body: "Placeholder for the second project. Keep entries short — one strong sentence on what it was, one on the outcome.",
        meta: "2024 · DESIGN",
      },
      {
        heading: "LIVE SET",
        body: "Placeholder for the third project. The CD-case prop gives you a sticker, a track number, and a body paragraph to work with.",
        meta: "2025 · BUILD",
      },
    ],
  },
  research: { slabs: [] },
  contact: { slabs: [] },
};

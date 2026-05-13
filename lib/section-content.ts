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
  // optional richer content used when a slab can unfold into a larger
  // J-card insert: a short tagline that sits under the heading, a longer
  // body paragraph for the middle panel, and a bullet list of credits
  // for the right panel.
  tagline?: string;
  detail?: string;
  credits?: string[];
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
        heading: "INTRODUCTION",
        body: "Hello — this is me.",
        meta: "SIDE A · 2:34",
        treatment: "paper",
        tagline: "A short note from the front of the stage.",
        detail:
          "I'm Oziel Sauceda — a developer who builds cinematic, performance-minded interfaces. I treat every site like a stage: composition, lighting, motion, restraint. Quietly opinionated about typography and the small details that decide whether a page feels designed or assembled.",
        credits: [
          "Based in Texas",
          "Always sketching",
          "Open to collaborate",
          "Reachable via the contact set",
        ],
      },
      {
        heading: "EDUCATION",
        body: "Where the practice was forged.",
        meta: "SIDE A · 3:12",
        treatment: "black",
        tagline: "Formal training, plus a stubborn obsession.",
        detail:
          "Computer Science fundamentals paired with a self-driven obsession with type, motion, and graphics programming. The classroom gave me the grammar; small projects, late-night experiments, and dissecting album rollouts gave me the voice.",
        credits: [
          "BS Computer Science",
          "Self-taught design",
          "Stage craft via tour studies",
          "Daily reading & sketching",
        ],
      },
      {
        heading: "HOBBIES",
        body: "Off-stage interests.",
        meta: "SIDE B · 1:48",
        treatment: "concrete",
        tagline: "What I do when I'm not shipping.",
        detail:
          "Music — listening, dissecting, and rebuilding album rollouts in code. Photography at golden hour. Long walks. Building tiny tools nobody asked for. Anything that rewards patience and craft over speed.",
        credits: [
          "Album rollouts",
          "Photography",
          "Code as craft",
          "Long walks at golden hour",
        ],
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

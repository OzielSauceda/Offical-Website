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
  // longer-form liner notes. when present, the J-card reader renders each
  // entry as its own paragraph so a slab can carry a few short passages
  // worth of copy without becoming one wall of text. falls back to `detail`
  // or `body` when absent so the legacy single-paragraph slabs still work.
  paragraphs?: string[];
  credits?: string[];
};

export type SectionContent = {
  slabs: Slab[];
};

// TEMP-SCROLL-TEST — extra paragraphs appended to each About slab so the
// J-card reader has enough body copy to require vertical scrolling. remove
// once the real liner-note copy lands.
const SCROLL_TEST_FILLER: readonly string[] = [
  "[TEMP-SCROLL-TEST] Filler paragraph. The reader should scroll once this lands on the page. Replace this block with real liner-note copy before shipping. Lorem ipsum-style content kept short on purpose so the column rhythm still reads.",
  "[TEMP-SCROLL-TEST] Another filler beat. The intent is to push the body copy past the viewport so a wheel/trackpad gesture inside the reader can be exercised. None of this text is final.",
  "[TEMP-SCROLL-TEST] Continuing the scroll dummy. Type at a comfortable reading measure, paragraphs of roughly the same length as the real ones above so the rhythm of the page is honest while testing.",
  "[TEMP-SCROLL-TEST] A fourth filler paragraph for additional vertical room. Once the reader scrolls cleanly past the fold, this block plus the others above can be deleted in one pass.",
  "[TEMP-SCROLL-TEST] Final filler stretch. The credits block sits below this on wide layouts and below the body on mobile, so this gives both arrangements something to push against.",
];

function withScrollTestFiller(paragraphs: string[]): string[] {
  return [...paragraphs, ...SCROLL_TEST_FILLER];
}

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
        paragraphs: withScrollTestFiller([
          "I'm Oziel Sauceda, a developer who builds cinematic, performance-minded interfaces. I treat every site like a stage: composition, lighting, motion, restraint. Quietly opinionated about typography and the small details that decide whether a page feels designed or assembled.",
          "Day to day I work in TypeScript, React, and a heavy dose of WebGL when a page deserves it. Currently obsessing over Three.js, shader graphs, and the bit of motion that turns a layout into a stage.",
          "I tend to care most about the parts of a project nobody mentions: hierarchy that survives long copy, type scales that hold up at 320px, transitions that don't punish a user for using a trackpad. Most of the actual craft lives in those quieter decisions.",
          "Off the clock: long-form notes, daily sketches, and small experiments to keep the eye sharp. Most of my best ideas show up while walking, not while staring at a screen.",
        ]),
        credits: [
          "Based in Texas",
          "Always sketching",
          "Strong opinions on stage lighting",
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
        paragraphs: withScrollTestFiller([
          "Computer Science fundamentals paired with a self-driven obsession with type, motion, and graphics programming. The classroom gave me the grammar. Small projects, late-night experiments, and dissecting album rollouts gave me the voice.",
          "Graphics, real-time rendering, and human-computer interaction were the courses I kept circling back to. The rest of my education came from rebuilding album rollouts and tour visuals in code until the patterns clicked.",
          "Outside the syllabus I spent a lot of time on the edges of WebGL: shader walkthroughs, framebuffer tricks, post-processing chains. Once you can write a fragment shader from scratch, you stop being afraid of how anything looks on screen.",
          "These days the reading list is a mix of Refactoring UI, Tufte, and behind-the-scenes books from artists whose stagecraft I respect. New tooling shows up almost weekly; the goal is to keep the taste sharper than the stack.",
        ]),
        credits: [
          "BS Computer Science",
          "Self-taught design",
          "Stage craft via tour studies",
          "Shader sketchbook on the side",
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
        paragraphs: withScrollTestFiller([
          "Music sits at the center. I listen to entire albums front to back, then re-stage them as interactive pages. It's where most of my visual instincts come from.",
          "Photography pulls me outside around sunset. Long shadows, weird color casts, the kind of light that makes you stop walking. It teaches the same lesson restraint does on a page: leave room for the subject.",
          "I keep a running notebook of things that caught my eye that week: a poster outside a record store, the type on the back of a tape, the way a stage was lit. Most of it never becomes a project, and that's fine.",
          "The rest of it is small tools nobody asked for, pocket-notebook sketches on the bus, and long walks to think a problem through. Anything that rewards patience over speed.",
        ]),
        credits: [
          "Album rollouts",
          "Photography",
          "Notebooks and ephemera",
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

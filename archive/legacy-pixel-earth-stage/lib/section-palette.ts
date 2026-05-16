import type { SectionId } from "@/lib/sections";

export type SectionPalette = {
  // emissive rim strip on the top edge of each content slab. picks up the
  // section's stage-light personality without recoloring the whole slab.
  rim: string;
  // subtle warm/cool tint added to the slab body via emissive material so
  // the stone face reads as lit by the section's key light, not neutral.
  emissive: string;
};

// per-section stage palette. each section gets its own rim accent so the
// reveal feels keyed to that environment instead of being a uniform UI.
// safe vocabulary — these are general lighting palettes, not anyone's IP.
export const SECTION_PALETTE: Record<SectionId, SectionPalette> = {
  about: {
    rim: "#f6c98b",
    emissive: "#2a2018",
  },
  projects: {
    rim: "#9bb6ff",
    emissive: "#1d2740",
  },
  research: {
    rim: "#ff6b6b",
    emissive: "#2c1518",
  },
  contact: {
    rim: "#f0d68c",
    emissive: "#2a2412",
  },
};

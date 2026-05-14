import type { SectionId } from "@/lib/sections";

export type CameraTarget = {
  position: [number, number, number];
  lookAt: [number, number, number];
  transitionRate?: number;
};

// per-section entry camera. when a section is "entered", the camera lerps
// from its default pose to this target. about is the only one wired right
// now — the others sit at defaults until their reveals land.
export const SECTION_CAMERA_TARGETS: Record<SectionId, CameraTarget> = {
  about: {
    position: [0, 1.95, 3.95],
    lookAt: [0, 1.78, 0],
  },
  projects: {
    position: [0, 1.95, 3.95],
    lookAt: [0, 1.78, 0],
  },
  research: {
    position: [0, 1.72, 4.85],
    lookAt: [0, 1.52, 0],
  },
  contact: {
    position: [0, 1.72, 4.85],
    lookAt: [0, 1.52, 0],
  },
};

// reading pose for the About cassette. lands with enough breathing room
// that once the J-card paper extracts forward and rotates into landscape
// it still has margin against the viewport — about 70% wide × 77% tall —
// which is the rect the DOM page morphs out of to reach full viewport.
export const ABOUT_READING_CAMERA: CameraTarget = {
  position: [0, 1.87, 3.6],
  lookAt: [0, 1.86, 2.34],
  transitionRate: 1.55,
};

export type SectionEnv = {
  ringColor?: string;
  beamPalette?: { warm: string; cool: string };
  ambientHue?: string;
  starsIntensity?: number;
};

export type SectionId = "about" | "projects" | "research" | "contact";

export type Section = {
  id: SectionId;
  title: string;
  // angle around the screen cylinder Y-axis, in radians.
  // 0 = camera-facing initial position (cylinder UV 0 = +Z direction).
  angle: number;
  env: SectionEnv;
};

const HALF_PI = Math.PI / 2;

export const SECTIONS: readonly Section[] = [
  { id: "about",    title: "About",    angle: 0,            env: {} },
  { id: "projects", title: "Projects", angle: HALF_PI,      env: {} },
  { id: "research", title: "Research", angle: Math.PI,      env: {} },
  { id: "contact",  title: "Contact",  angle: HALF_PI * 3,  env: {} },
];

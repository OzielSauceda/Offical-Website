export type SectionEnv = {
  ringColor?: string;
  beamPalette?: { warm: string; cool: string };
  ambientHue?: string;
  starsIntensity?: number;
};

export type SectionId = "about" | "projects" | "research" | "contact";

export type EnvironmentId = "globe" | "pyramid";

export type Section = {
  id: SectionId;
  title: string;
  // angle around the screen cylinder Y-axis, in radians.
  // 0 = camera-facing initial position (cylinder UV 0 = +Z direction).
  angle: number;
  environment: EnvironmentId;
  env: SectionEnv;
};

const HALF_PI = Math.PI / 2;

export const SECTIONS: readonly Section[] = [
  { id: "about",    title: "About",    angle: 0,            environment: "globe",    env: {} },
  { id: "projects", title: "Projects", angle: HALF_PI,      environment: "pyramid",  env: {} },
  { id: "research", title: "Research", angle: Math.PI,      environment: "globe",    env: {} },
  { id: "contact",  title: "Contact",  angle: HALF_PI * 3,  environment: "globe",    env: {} },
];

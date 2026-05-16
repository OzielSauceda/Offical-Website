export const RIM_GLOW_OPACITY = {
  hot: 0.82,
  halo: 0.62,
  bloom: 0.26,
  flat: 0.72,
  spill: 0.09,
  farSpill: 0.04,
} as const;

export const RIM_GLOW_BREATH = {
  hot: 0.04,
  halo: 0.04,
  bloom: 0.03,
  flat: 0.04,
} as const;

export function rimGlowBeat(elapsed: number) {
  return 0.5 + 0.5 * Math.sin(elapsed * 0.7);
}

// Shared warm-rim glow vocabulary. The globe's GlowRing established this
// palette + layering — extracting it lets the mountain platform border
// reuse the exact same colors, opacities, and breath cadence so the two
// stages read as the same lighting language.
//
// "filament" = bright opaque core ring/outline
// "hot"      = tight bright additive layer right against the core
// "halo"     = creamy mid-radius additive layer
// "bloom"    = wider warm halo blossoming outward
// "flat"     = horizontal warm wash on the platform plane
// "spill"    = soft outward spill onto the floor
// "farSpill" = very wide, very faint final fade

export const RIM_GLOW = {
  filament: "#fff8df",
  hot: "#fff6d0",
  halo: "#fff1c8",
  bloom: "#ffdc92",
  flat: "#fff4cc",
  spill: "#f4e2c0",
  farSpill: "#fff1d2",
} as const;

// base opacity values, before the breathing oscillator is applied
export const RIM_GLOW_OPACITY = {
  hot: 0.82,
  halo: 0.62,
  bloom: 0.26,
  flat: 0.72,
  spill: 0.09,
  farSpill: 0.04,
} as const;

// breath driver. matches the dome's GlowRing — slow steady stage light,
// no heartbeat. callers pass elapsed seconds in.
export function rimGlowBeat(elapsed: number) {
  return 0.5 + 0.5 * Math.sin(elapsed * 0.7);
}

// per-layer breath ranges. these are the same deltas the GlowRing applies
// (hot/flat: ±0.04, halo: ±0.04, bloom: ±0.03) so any glow built from
// these helpers oscillates in sync with the dome's rim.
export const RIM_GLOW_BREATH = {
  hot: 0.04,
  halo: 0.04,
  bloom: 0.03,
  flat: 0.04,
} as const;

// Rainbow rim shader. Used by ring/ribbon geometries that carry a perimeter
// UV: vUv.x is arc-length around the loop (0..1, wrap-continuous via a
// duplicated end vertex at u=1), vUv.y is inner→outer across the ribbon.
//
// Hue is driven by perimeter position + time, so the light reads as flowing
// around the shape rather than per-edge cycling. Saturation is held low
// (premium iridescence, not neon) and per-layer uniforms decide how much
// the result is pulled toward white — the bright "filament" reads near
// white, only halo/spill layers expose the rainbow strongly.
export const RAINBOW_RIM_VERTEX = `
  varying vec2 vRimUv;
  attribute vec2 rimUv;
  void main() {
    vRimUv = rimUv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const RAINBOW_RIM_FRAGMENT = `
  varying vec2 vRimUv;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uHueSpeed;
  uniform float uSaturation;
  uniform float uWhiteMix;
  uniform vec3 uTint;
  uniform float uTintMix;

  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  void main() {
    float hue = fract(vRimUv.x + uTime * uHueSpeed);
    vec3 rainbow = hsv2rgb(vec3(hue, uSaturation, 1.0));
    // bias toward the layer's warm tint so the rainbow sits inside the
    // rim's palette family instead of overriding it
    vec3 tinted = mix(rainbow, uTint, uTintMix);
    // pull toward white for the bright inner layers — keeps the core
    // luminous; only the falloff layers expose the rainbow strongly
    vec3 col = mix(tinted, vec3(1.0), uWhiteMix);
    gl_FragColor = vec4(col, uOpacity);
  }
`;

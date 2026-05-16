"use client";

// Rainbow rim beam for a stage footprint. A crisp emissive outline around
// a polygon plus a stack of additive ribbons (hot / halo / bloom / flat /
// spill / far spill) that fade outward into the surrounding floor. Time
// drives a hue cycle around the perimeter; the dome's shared breath
// cadence drives the opacity pulse so all stages feel lit by the same
// room. The polygon is supplied by the consumer (rectangle, quad, or any
// convex shape) so the rim can be retargeted to fit each stage exactly.

import { useEffect, useMemo, useRef } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import {
  RAINBOW_RIM_FRAGMENT,
  RAINBOW_RIM_VERTEX,
  RIM_GLOW,
  RIM_GLOW_BREATH,
  rimGlowBeat,
} from "./rim-glow";

// Absolute outset distances (world units, perpendicular to each edge) for
// each rim layer. Calibrated so the bloom volume matches the old mountain
// rim's world-space falloff.
export type RimOutsets = {
  hot: number;
  halo: number;
  bloom: number;
  flat: number;
  spillInner: number;
  spillOuter: number;
  farSpillInner: number;
  farSpillOuter: number;
};

export const DEFAULT_RIM_OUTSETS: RimOutsets = {
  hot: 0.025,
  halo: 0.062,
  bloom: 0.152,
  flat: 0.076,
  spillInner: 0.221,
  spillOuter: 0.552,
  farSpillInner: 0.497,
  farSpillOuter: 0.828,
};

// Expand a closed CCW polygon outward by d perpendicular world units on
// every edge. Each corner moves along the bisector of its two adjacent
// edges so axis-aligned rectangles stay axis-aligned, and arbitrary convex
// quads get a uniform halo width on every side instead of the asymmetric
// stretching a centroid-based scale would produce.
function offsetPolygon(
  poly: ReadonlyArray<readonly [number, number]>,
  d: number,
): Array<[number, number]> {
  if (d === 0) return poly.map(([x, z]) => [x, z] as [number, number]);
  const n = poly.length;

  // outward unit normals per edge — for a CCW polygon (viewed from +Y) the
  // outward normal is the edge direction rotated -90° in the XZ plane.
  const normals: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const [ax, az] = poly[i]!;
    const [bx, bz] = poly[(i + 1) % n]!;
    const ex = bx - ax;
    const ez = bz - az;
    const len = Math.hypot(ex, ez);
    normals.push([ez / len, -ex / len]);
  }

  const result: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const prev = (i - 1 + n) % n;
    const [nx1, nz1] = normals[prev]!;
    const [nx2, nz2] = normals[i]!;
    const bx = nx1 + nx2;
    const bz = nz1 + nz2;
    const blen2 = bx * bx + bz * bz;
    if (blen2 < 1e-12) {
      // colinear edges (straight extension) — just offset by either normal
      result.push([poly[i]![0] + nx1 * d, poly[i]![1] + nz1 * d]);
      continue;
    }
    // displacement along the bisector lands on both offset edges:
    //   disp = b * (2d / |b|^2)
    // because |b| = 2 cos(half-angle) and we need |disp| = d / cos(half-angle).
    const k = (2 * d) / blen2;
    result.push([poly[i]![0] + bx * k, poly[i]![1] + bz * k]);
  }

  return result;
}

// uniform arc-length parameterization along the closed polygon. Returns the
// normalized cumulative distance at each corner so the rainbow hue gradient
// travels at world speed regardless of which edge it is crossing.
function computeArcLengthU(pts: ReadonlyArray<readonly [number, number]>) {
  const n = pts.length;
  const seg: number[] = new Array(n);
  let total = 0;
  for (let i = 0; i < n; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % n]!;
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    seg[i] = len;
    total += len;
  }
  const u: number[] = new Array(n);
  let acc = 0;
  for (let i = 0; i < n; i++) {
    u[i] = acc / total;
    acc += seg[i]!;
  }
  return u;
}

// closed polyline geometry for the crisp emissive outline. Emitted as
// edge pairs so it draws via <lineSegments>. The wrap segment's terminal
// vertex carries u=1 so the rainbow shader hue flow stays continuous
// across the wrap.
function createOutlineLoopGeometry(
  pts: ReadonlyArray<readonly [number, number]>,
  y: number,
) {
  const u = computeArcLengthU(pts);
  const positions: number[] = [];
  const rimUv: number[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % n]!;
    positions.push(a[0], y, a[1], b[0], y, b[1]);
    const ua = u[i]!;
    const ub = i === n - 1 ? 1 : u[i + 1]!;
    rimUv.push(ua, 0, ub, 0);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("rimUv", new THREE.Float32BufferAttribute(rimUv, 2));
  return geo;
}

// flat ribbon between an inner polygon and an outer polygon, lying on a
// horizontal plane. Writes a perimeter UV per vertex (rimUv.x = arc-length
// along loop, rimUv.y = inner=0 / outer=1) and duplicates the wrap pair at
// u=1 so the shader hue flow is continuous around the loop.
function createRibbonGeometry(
  inner: ReadonlyArray<readonly [number, number]>,
  outer: ReadonlyArray<readonly [number, number]>,
  y: number,
) {
  const u = computeArcLengthU(inner);
  const positions: number[] = [];
  const rimUv: number[] = [];
  const indices: number[] = [];
  const n = inner.length;
  for (let i = 0; i < n; i++) {
    const [ix, iz] = inner[i]!;
    const [ox, oz] = outer[i]!;
    positions.push(ix, y, iz);
    rimUv.push(u[i]!, 0);
    positions.push(ox, y, oz);
    rimUv.push(u[i]!, 1);
  }
  const firstInner = inner[0]!;
  const firstOuter = outer[0]!;
  positions.push(firstInner[0], y, firstInner[1]);
  rimUv.push(1, 0);
  positions.push(firstOuter[0], y, firstOuter[1]);
  rimUv.push(1, 1);

  for (let i = 0; i < n; i++) {
    const a = i * 2;
    const b = i * 2 + 1;
    const c = (i + 1) * 2;
    const d = (i + 1) * 2 + 1;
    indices.push(a, c, b);
    indices.push(b, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("rimUv", new THREE.Float32BufferAttribute(rimUv, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

type RainbowLayer = {
  hueSpeed: number;
  saturation: number;
  whiteMix: number;
  tint: string;
  tintMix: number;
};

// Per-layer rainbow tuning — pumped up vs the original calibration so the
// hue flow reads clearly against the platform. Saturation up across the
// board; whiteMix down on the bright core/halo so the rainbow shows
// through them; tintMix down so the warm rim color biases the rainbow
// without overpowering it.
const LAYER_FILAMENT: RainbowLayer = {
  hueSpeed: 0.10,
  saturation: 0.65,
  whiteMix: 0.45,
  tint: RIM_GLOW.filament,
  tintMix: 0.18,
};
const LAYER_HOT: RainbowLayer = {
  hueSpeed: 0.10,
  saturation: 0.78,
  whiteMix: 0.28,
  tint: RIM_GLOW.hot,
  tintMix: 0.18,
};
const LAYER_HALO: RainbowLayer = {
  hueSpeed: 0.10,
  saturation: 0.88,
  whiteMix: 0.10,
  tint: RIM_GLOW.halo,
  tintMix: 0.16,
};
const LAYER_BLOOM: RainbowLayer = {
  hueSpeed: 0.10,
  saturation: 0.95,
  whiteMix: 0.04,
  tint: RIM_GLOW.bloom,
  tintMix: 0.14,
};
const LAYER_FLAT: RainbowLayer = {
  hueSpeed: 0.10,
  saturation: 0.72,
  whiteMix: 0.18,
  tint: RIM_GLOW.flat,
  tintMix: 0.20,
};
const LAYER_SPILL: RainbowLayer = {
  hueSpeed: 0.10,
  saturation: 0.88,
  whiteMix: 0.02,
  tint: RIM_GLOW.spill,
  tintMix: 0.14,
};
const LAYER_FAR_SPILL: RainbowLayer = {
  hueSpeed: 0.10,
  saturation: 0.78,
  whiteMix: 0.02,
  tint: RIM_GLOW.farSpill,
  tintMix: 0.16,
};

// Local opacity overrides for the Projects rim. Bloom / spill / far-spill
// get the biggest boost because that is where the rainbow lives — the
// previous values were tuned for a warm-white globe ring and left the
// rainbow halo too faint to read. Core layers (hot / halo / flat / filament)
// nudge up a bit so the bright outline pops alongside the wider rainbow.
const RIM_OPACITY = {
  filament: 1.0,
  hot: 0.92,
  halo: 0.78,
  bloom: 0.55,
  flat: 0.84,
  spill: 0.28,
  farSpill: 0.14,
} as const;

type RainbowUniforms = {
  uTime: { value: number };
  uOpacity: { value: number };
  uHueSpeed: { value: number };
  uSaturation: { value: number };
  uWhiteMix: { value: number };
  uTint: { value: THREE.Color };
  uTintMix: { value: number };
};

function makeRainbowUniforms(
  layer: RainbowLayer,
  baseOpacity: number,
): RainbowUniforms {
  return {
    uTime: { value: 0 },
    uOpacity: { value: baseOpacity },
    uHueSpeed: { value: layer.hueSpeed },
    uSaturation: { value: layer.saturation },
    uWhiteMix: { value: layer.whiteMix },
    uTint: { value: new THREE.Color(layer.tint) },
    uTintMix: { value: layer.tintMix },
  };
}

type Props = {
  // CCW polygon in local XZ — defines the rim's outline. World units.
  polygon: ReadonlyArray<readonly [number, number]>;
  // Y of the polygon plane, in local coords (typically just above the floor).
  polygonY: number;
  // Optional per-layer outsets. Default matches the old mountain rim's halo.
  outsets?: RimOutsets;
};

export function PlatformRimBeam({
  polygon,
  polygonY,
  outsets = DEFAULT_RIM_OUTSETS,
}: Props) {
  const filamentMatRef = useRef<THREE.ShaderMaterial>(null);
  const hotMatRef = useRef<THREE.ShaderMaterial>(null);
  const haloMatRef = useRef<THREE.ShaderMaterial>(null);
  const bloomMatRef = useRef<THREE.ShaderMaterial>(null);
  const flatMatRef = useRef<THREE.ShaderMaterial>(null);
  const spillMatRef = useRef<THREE.ShaderMaterial>(null);
  const farSpillMatRef = useRef<THREE.ShaderMaterial>(null);

  const filamentU = useMemo(
    () => makeRainbowUniforms(LAYER_FILAMENT, RIM_OPACITY.filament),
    [],
  );
  const hotU = useMemo(
    () => makeRainbowUniforms(LAYER_HOT, RIM_OPACITY.hot),
    [],
  );
  const haloU = useMemo(
    () => makeRainbowUniforms(LAYER_HALO, RIM_OPACITY.halo),
    [],
  );
  const bloomU = useMemo(
    () => makeRainbowUniforms(LAYER_BLOOM, RIM_OPACITY.bloom),
    [],
  );
  const flatU = useMemo(
    () => makeRainbowUniforms(LAYER_FLAT, RIM_OPACITY.flat),
    [],
  );
  const spillU = useMemo(
    () => makeRainbowUniforms(LAYER_SPILL, RIM_OPACITY.spill),
    [],
  );
  const farSpillU = useMemo(
    () => makeRainbowUniforms(LAYER_FAR_SPILL, RIM_OPACITY.farSpill),
    [],
  );

  const outlineGeo = useMemo(
    () => createOutlineLoopGeometry(polygon, polygonY),
    [polygon, polygonY],
  );

  const hotGeo = useMemo(() => {
    const outer = offsetPolygon(polygon, outsets.hot);
    return createRibbonGeometry(polygon, outer, polygonY + 0.006);
  }, [polygon, polygonY, outsets.hot]);
  const haloGeo = useMemo(() => {
    const outer = offsetPolygon(polygon, outsets.halo);
    return createRibbonGeometry(polygon, outer, polygonY + 0.005);
  }, [polygon, polygonY, outsets.halo]);
  const bloomGeo = useMemo(() => {
    const outer = offsetPolygon(polygon, outsets.bloom);
    return createRibbonGeometry(polygon, outer, polygonY + 0.004);
  }, [polygon, polygonY, outsets.bloom]);
  const flatGeo = useMemo(() => {
    const outer = offsetPolygon(polygon, outsets.flat);
    return createRibbonGeometry(polygon, outer, polygonY + 0.003);
  }, [polygon, polygonY, outsets.flat]);
  const spillGeo = useMemo(() => {
    const inner = offsetPolygon(polygon, outsets.spillInner);
    const outer = offsetPolygon(polygon, outsets.spillOuter);
    return createRibbonGeometry(inner, outer, polygonY + 0.0015);
  }, [polygon, polygonY, outsets.spillInner, outsets.spillOuter]);
  const farSpillGeo = useMemo(() => {
    const inner = offsetPolygon(polygon, outsets.farSpillInner);
    const outer = offsetPolygon(polygon, outsets.farSpillOuter);
    return createRibbonGeometry(inner, outer, polygonY + 0.001);
  }, [polygon, polygonY, outsets.farSpillInner, outsets.farSpillOuter]);

  useEffect(() => {
    const geos = [outlineGeo, hotGeo, haloGeo, bloomGeo, flatGeo, spillGeo, farSpillGeo];
    return () => {
      for (const g of geos) g.dispose();
    };
  }, [outlineGeo, hotGeo, haloGeo, bloomGeo, flatGeo, spillGeo, farSpillGeo]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const beat = rimGlowBeat(t);
    const setUniforms = (
      mat: THREE.ShaderMaterial | null,
      time: number,
      opacity: number,
    ) => {
      if (!mat) return;
      const tU = mat.uniforms.uTime;
      const oU = mat.uniforms.uOpacity;
      if (tU) tU.value = time;
      if (oU) oU.value = opacity;
    };
    setUniforms(
      hotMatRef.current,
      t,
      RIM_OPACITY.hot + RIM_GLOW_BREATH.hot * beat,
    );
    setUniforms(
      haloMatRef.current,
      t,
      RIM_OPACITY.halo - 0.02 + RIM_GLOW_BREATH.halo * beat,
    );
    setUniforms(
      bloomMatRef.current,
      t,
      RIM_OPACITY.bloom - 0.02 + RIM_GLOW_BREATH.bloom * beat,
    );
    setUniforms(
      flatMatRef.current,
      t,
      RIM_OPACITY.flat - 0.02 + RIM_GLOW_BREATH.flat * beat,
    );
    setUniforms(spillMatRef.current, t, RIM_OPACITY.spill);
    setUniforms(farSpillMatRef.current, t, RIM_OPACITY.farSpill);
    setUniforms(filamentMatRef.current, t, RIM_OPACITY.filament - 0.05 + 0.05 * beat);
  });

  return (
    <group>
      <mesh geometry={farSpillGeo} renderOrder={3}>
        <shaderMaterial
          ref={farSpillMatRef}
          vertexShader={RAINBOW_RIM_VERTEX}
          fragmentShader={RAINBOW_RIM_FRAGMENT}
          uniforms={farSpillU}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={spillGeo} renderOrder={4}>
        <shaderMaterial
          ref={spillMatRef}
          vertexShader={RAINBOW_RIM_VERTEX}
          fragmentShader={RAINBOW_RIM_FRAGMENT}
          uniforms={spillU}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={bloomGeo} renderOrder={5}>
        <shaderMaterial
          ref={bloomMatRef}
          vertexShader={RAINBOW_RIM_VERTEX}
          fragmentShader={RAINBOW_RIM_FRAGMENT}
          uniforms={bloomU}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={flatGeo} renderOrder={6}>
        <shaderMaterial
          ref={flatMatRef}
          vertexShader={RAINBOW_RIM_VERTEX}
          fragmentShader={RAINBOW_RIM_FRAGMENT}
          uniforms={flatU}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={haloGeo} renderOrder={7}>
        <shaderMaterial
          ref={haloMatRef}
          vertexShader={RAINBOW_RIM_VERTEX}
          fragmentShader={RAINBOW_RIM_FRAGMENT}
          uniforms={haloU}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={hotGeo} renderOrder={8}>
        <shaderMaterial
          ref={hotMatRef}
          vertexShader={RAINBOW_RIM_VERTEX}
          fragmentShader={RAINBOW_RIM_FRAGMENT}
          uniforms={hotU}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <lineSegments geometry={outlineGeo} renderOrder={9}>
        <shaderMaterial
          ref={filamentMatRef}
          vertexShader={RAINBOW_RIM_VERTEX}
          fragmentShader={RAINBOW_RIM_FRAGMENT}
          uniforms={filamentU}
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </lineSegments>
    </group>
  );
}

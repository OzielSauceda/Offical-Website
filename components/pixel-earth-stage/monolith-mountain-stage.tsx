"use client";

// Carved stone monolith mountain. Production version for the Projects environment.
// Geometry was tuned in monolith-mountain-debug.tsx; this is the production render.

import { RefObject, useEffect, useMemo, useRef } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import {
  RAINBOW_RIM_FRAGMENT,
  RAINBOW_RIM_VERTEX,
  RIM_GLOW,
  RIM_GLOW_BREATH,
  RIM_GLOW_OPACITY,
  rimGlowBeat,
} from "./rim-glow";


type Vertex = readonly [number, number, number];
type Face = readonly [number, number, number, ...number[]];

const LOWER_BASE_WEDGE_VERTICES = [
  [-3.8, -1.6, 2.15],
  [3.35, -1.6, 1.6],
  [2.95, -1.6, -2.3],
  [-2.6, -1.6, -2.55],
  [-1.95, -0.18, 1.1],
  [2.05, -0.18, 1.0],
  [1.9, -0.04, -1.92],
  [-1.1, -0.04, -1.82],
] as const satisfies readonly Vertex[];

const LOWER_BASE_WEDGE_FACES = [
  [4, 5, 6, 7],
  [0, 1, 5, 4],
  [1, 2, 6, 5],
  [2, 3, 7, 6],
  [3, 0, 4, 7],
  [3, 2, 1, 0],
] as const satisfies readonly Face[];

const MIDDLE_HORIZONTAL_LEDGE_VERTICES = [
  [-1.6, -0.22, 1.0],
  [2.22, -0.16, 0.88],
  [2.02, -0.1, -1.98],
  [-0.92, -0.08, -1.86],
  [-1.5, -0.04, 0.92],
  [2.14, 0.02, 0.78],
  [1.92, 0.1, -1.96],
  [-0.85, 0.12, -1.82],
] as const satisfies readonly Vertex[];

const MIDDLE_HORIZONTAL_LEDGE_FACES = [
  [4, 5, 6, 7],
  [0, 1, 5, 4],
  [1, 2, 6, 5],
  [2, 3, 7, 6],
  [3, 0, 4, 7],
  [3, 2, 1, 0],
] as const satisfies readonly Face[];

const UPPER_BLOCK_TIER_VERTICES = [
  [-0.88, 0.04, 0.88],
  [1.92, 0.04, 0.72],
  [1.6, 0.04, -1.82],
  [-0.68, 0.04, -1.66],
  [-0.48, 0.3, 0.52],
  [1.5, 0.38, 0.26],
  [1.32, 0.98, -1.64],
  [0.08, 0.74, -1.4],
] as const satisfies readonly Vertex[];

const UPPER_BLOCK_TIER_FACES = [
  [4, 5, 6, 7],
  [0, 1, 5, 4],
  [1, 2, 6, 5],
  [2, 3, 7, 6],
  [3, 0, 4, 7],
  [3, 2, 1, 0],
] as const satisfies readonly Face[];

const TOP_TRIANGULAR_PEAK_VERTICES = [
  [-0.5, 0.18, 0.42],
  [1.0, 0.18, 0.2],
  [1.32, 0.18, -1.2],
  [-0.05, 0.18, -1.34],
  [0.35, 0.94, 0.04],
  [1.18, 2.3, -1.32],
] as const satisfies readonly Vertex[];

const TOP_TRIANGULAR_PEAK_FACES = [
  [0, 3, 2, 1],
  [1, 2, 5, 4],
  [3, 0, 4, 5],
  [0, 1, 4],
  [2, 3, 5],
] as const satisfies readonly Face[];

function createPolyGeometry(
  vertices: readonly Vertex[],
  faces: readonly Face[],
) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let cursor = 0;

  for (const face of faces) {
    const corners: THREE.Vector3[] = [];
    for (const idx of face) {
      const v = vertices[idx]!;
      corners.push(new THREE.Vector3(v[0], v[1], v[2]));
    }
    if (corners.length < 3) continue;

    const edge1 = new THREE.Vector3().subVectors(corners[1]!, corners[0]!);
    const edge2 = new THREE.Vector3().subVectors(corners[2]!, corners[0]!);
    const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

    const absN = new THREE.Vector3(
      Math.abs(normal.x),
      Math.abs(normal.y),
      Math.abs(normal.z),
    );
    const ref =
      absN.y >= absN.x && absN.y >= absN.z
        ? new THREE.Vector3(0, 0, 1)
        : new THREE.Vector3(0, 1, 0);
    const tangent = new THREE.Vector3().crossVectors(normal, ref).normalize();
    const bitangent = new THREE.Vector3()
      .crossVectors(normal, tangent)
      .normalize()
      .negate();

    const origin = corners[0]!;
    const baseIndex = cursor;

    for (const c of corners) {
      positions.push(c.x, c.y, c.z);
      const local = new THREE.Vector3().subVectors(c, origin);
      uvs.push(local.dot(tangent), local.dot(bitangent));
      cursor += 1;
    }

    for (let i = 1; i < corners.length - 1; i++) {
      indices.push(baseIndex, baseIndex + i, baseIndex + i + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// Procedural stone shader. Samples noise in object-local space so the
// pattern stays glued to the rock as the mountain auto-rotates. Computes
// the face normal via screen-space derivatives so the low-poly faceted
// silhouette is preserved while each face is broken up with continuous
// texture.
const MOUNTAIN_STONE_VERTEX = `
  varying vec3 vLocalPos;
  varying vec3 vWorldPos;
  varying vec3 vViewDir;

  void main() {
    vLocalPos = position;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const MOUNTAIN_STONE_FRAGMENT = `
  varying vec3 vLocalPos;
  varying vec3 vWorldPos;
  varying vec3 vViewDir;

  uniform vec3 uSunDir;

  float hash13(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float vnoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash13(i + vec3(0.0, 0.0, 0.0));
    float b = hash13(i + vec3(1.0, 0.0, 0.0));
    float c = hash13(i + vec3(0.0, 1.0, 0.0));
    float d = hash13(i + vec3(1.0, 1.0, 0.0));
    float e = hash13(i + vec3(0.0, 0.0, 1.0));
    float g = hash13(i + vec3(1.0, 0.0, 1.0));
    float h = hash13(i + vec3(0.0, 1.0, 1.0));
    float k = hash13(i + vec3(1.0, 1.0, 1.0));
    return mix(
      mix(mix(a, b, f.x), mix(c, d, f.x), f.y),
      mix(mix(e, g, f.x), mix(h, k, f.x), f.y),
      f.z);
  }

  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * vnoise(p);
      p *= 2.07;
      a *= 0.55;
    }
    return v;
  }

  // triplanar fbm — blends three orthogonal projections weighted by the
  // normal so steep / wraparound faces don't stretch the noise
  float triplanarFbm(vec3 p, vec3 nrm) {
    vec3 b = pow(abs(nrm), vec3(4.0));
    b /= (b.x + b.y + b.z + 0.0001);
    return fbm(p.yzx) * b.x + fbm(p.xzy) * b.y + fbm(p.xyz) * b.z;
  }

  void main() {
    // flat face normals via screen-space derivatives — keeps the low-poly
    // faceted look while letting the fragment shader paint continuously
    // across each face.
    vec3 worldNormal = normalize(cross(dFdx(vWorldPos), dFdy(vWorldPos)));
    vec3 localNormal = normalize(cross(dFdx(vLocalPos), dFdy(vLocalPos)));

    // fine grain (catches light at surface scale) + larger rock-mass
    // variation (breaks up the height bands so they don't read as stripes)
    float grain = triplanarFbm(vLocalPos * 2.4, localNormal);
    float mass = triplanarFbm(vLocalPos * 0.7, localNormal);

    // vertical erosion striations along the local Y axis — fall-line streaks
    // wavered by the mass field so they don't look mathematically straight
    float striaeRaw = vLocalPos.y * 5.0 + mass * 2.8;
    float striae = sin(striaeRaw) * 0.5 + 0.5;
    striae = pow(striae, 3.0);

    // height-driven palette in local Y. mountain local y spans ~[-1.6, 2.3].
    float h = clamp((vLocalPos.y + 1.6) / 3.9, 0.0, 1.0);

    vec3 cBase = vec3(0.085, 0.092, 0.115);
    vec3 cMid = vec3(0.24, 0.255, 0.30);
    vec3 cUpper = vec3(0.46, 0.475, 0.51);
    vec3 cSnow = vec3(0.93, 0.95, 0.99);

    vec3 stone = mix(cBase, cMid, smoothstep(0.05, 0.55, h));
    stone = mix(stone, cUpper, smoothstep(0.55, 0.95, h));

    // mass + grain modulation breaks up the bands and adds rock-cluster
    // variation so the surface looks natural, not painted on
    stone *= 0.68 + mass * 0.55 + grain * 0.30;
    // erosion darkens the streak lines slightly
    stone *= 1.0 - striae * 0.20;

    // snow on upward-facing surfaces near the peak — local normal so the
    // snow stays on the same geometry faces as the mountain rotates
    float snowMask = smoothstep(0.35, 0.8, localNormal.y) * smoothstep(0.72, 0.98, h);
    snowMask *= 0.7 + grain * 0.5;
    stone = mix(stone, cSnow, snowMask);

    // light dust on the mid-altitude ledge tops — also upward-facing,
    // mid-height only. subtle, just lifts the ledge plane a touch.
    float dustMask =
      smoothstep(0.55, 0.92, localNormal.y) *
      smoothstep(0.28, 0.45, h) *
      (1.0 - smoothstep(0.55, 0.75, h));
    dustMask *= 0.45 + grain * 0.4;
    stone = mix(stone, vec3(0.72, 0.70, 0.66), dustMask * 0.55);

    // STYLIZED LIGHTING — warm key from upper-front-left, cool sky fill,
    // dark ambient, view-angle rim accent so the silhouette reads cleanly
    vec3 sunDir = normalize(uSunDir);
    float keyLight = max(dot(worldNormal, sunDir), 0.0);
    float skyFill = 0.5 + 0.5 * worldNormal.y;

    vec3 warm = vec3(1.0, 0.92, 0.78);
    vec3 cool = vec3(0.55, 0.65, 0.85);
    vec3 ambient = vec3(0.10, 0.11, 0.14);

    vec3 lit = stone * (warm * keyLight * 0.82 + cool * skyFill * 0.42 + ambient);

    // rim accent — view-dependent silhouette catch so the dark base reads
    // against the dark background instead of disappearing
    float rim = 1.0 - max(dot(worldNormal, vViewDir), 0.0);
    rim = pow(rim, 2.6);
    lit += rim * vec3(0.22, 0.28, 0.42) * 0.38;

    gl_FragColor = vec4(lit, 1.0);
  }
`;

function createMountainStoneMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: MOUNTAIN_STONE_VERTEX,
    fragmentShader: MOUNTAIN_STONE_FRAGMENT,
    uniforms: {
      uSunDir: { value: new THREE.Vector3(-0.45, 0.92, 0.3).normalize() },
    },
    side: THREE.DoubleSide,
  });
}

// Base outline traced from the 4 bottom corners of LOWER_BASE_WEDGE.
// Lives in mountain-local space so it inherits the stage rotation and the
// MODEL_SCALE / MODEL_Y transforms, keeping the beam glued to the silhouette
// no matter how the monolith spins.
const BASE_OUTLINE_CORNERS: ReadonlyArray<readonly [number, number]> = [
  [-3.8, 2.15],
  [3.35, 1.6],
  [2.95, -2.3],
  [-2.6, -2.55],
] as const;
const BASE_OUTLINE_Y = -1.59;
// centroid of the four base corners — used to expand the polygon outward
// for the soft halo ribbon and the broader floor spill.
const BASE_OUTLINE_CENTROID: [number, number] = (() => {
  let sx = 0;
  let sz = 0;
  for (const [x, z] of BASE_OUTLINE_CORNERS) {
    sx += x;
    sz += z;
  }
  return [sx / BASE_OUTLINE_CORNERS.length, sz / BASE_OUTLINE_CORNERS.length];
})();

function scalePolygonAround(
  pts: ReadonlyArray<readonly [number, number]>,
  cx: number,
  cz: number,
  k: number,
): Array<[number, number]> {
  return pts.map(([x, z]) => [cx + (x - cx) * k, cz + (z - cz) * k] as [number, number]);
}

// arc-length parameterization along the closed polygon. returns the
// normalized cumulative distance at each corner (0 at the first corner,
// approaching 1 just before the wrap). these become the perimeter UV the
// rainbow shader reads, so the hue gradient travels at a uniform world-
// speed regardless of which edge it is currently crossing.
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
// edge pairs (v0,v1, v1,v2, v2,v3, v3,v0') so it draws via <lineSegments>.
// The wrap segment's terminal vertex carries u=1 (instead of cycling back
// to 0) so the rainbow shader hue flow stays continuous across the wrap.
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

// flat ribbon (annulus-shaped quad strip) between an inner polygon and an
// outer polygon, lying on a horizontal plane. Writes a perimeter UV per
// vertex (rimUv.x = arc-length along loop, rimUv.y = inner=0 / outer=1)
// and duplicates the wrap pair at u=1 so the shader hue flow is
// continuous around the loop.
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
  // n corner pairs + a wrap pair → n+1 pairs total
  for (let i = 0; i < n; i++) {
    const [ix, iz] = inner[i]!;
    const [ox, oz] = outer[i]!;
    positions.push(ix, y, iz);
    rimUv.push(u[i]!, 0);
    positions.push(ox, y, oz);
    rimUv.push(u[i]!, 1);
  }
  // wrap duplicate at u=1
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
    // two triangles per segment, wound so the visible face points up
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

// scale offsets calibrated against the globe's torus radii so the mountain
// border lands at the same warm palette + bloom proportions in world units.
// the mountain's local extents get multiplied by MODEL_SCALE = 0.46, so the
// world-space falloff matches the globe's R_HOT / R_HALO / R_BLOOM /
// R_FLAT_OUT / R_SPILL_IN / R_SPILL_OUT / R_SPILL_FAR_OUT spacing.
const K_HOT = 1.018;
const K_HALO = 1.045;
const K_BLOOM = 1.11;
const K_FLAT = 1.055;
const K_SPILL_IN = 1.16;
const K_SPILL_OUT = 1.4;
const K_FAR_SPILL_OUT = 1.6;

// per-layer rainbow tuning. saturation stays low across the stack so the
// effect reads as iridescent stage light rather than a neon stripe; the
// inner layers (filament/hot) are pulled hard toward white so the bright
// core remains luminous, and the rainbow shows mainly through the broader
// halo / spill bands where the eye expects falloff.
type RainbowLayer = {
  // hue cycles per second around the perimeter. small positive value =
  // gentle drift; matches a slow stage cue.
  hueSpeed: number;
  // 0..1 — how saturated the rainbow gets at this layer
  saturation: number;
  // 0..1 — how strongly the result is pulled toward white
  whiteMix: number;
  // warm rim color to bias the rainbow into the same family as the dome
  tint: string;
  // 0..1 — how strongly the result is biased toward `tint`
  tintMix: number;
};

const LAYER_FILAMENT: RainbowLayer = {
  hueSpeed: 0.08,
  saturation: 0.32,
  whiteMix: 0.78,
  tint: RIM_GLOW.filament,
  tintMix: 0.25,
};
const LAYER_HOT: RainbowLayer = {
  hueSpeed: 0.08,
  saturation: 0.4,
  whiteMix: 0.58,
  tint: RIM_GLOW.hot,
  tintMix: 0.25,
};
const LAYER_HALO: RainbowLayer = {
  hueSpeed: 0.08,
  saturation: 0.5,
  whiteMix: 0.3,
  tint: RIM_GLOW.halo,
  tintMix: 0.22,
};
const LAYER_BLOOM: RainbowLayer = {
  hueSpeed: 0.08,
  saturation: 0.55,
  whiteMix: 0.08,
  tint: RIM_GLOW.bloom,
  tintMix: 0.2,
};
const LAYER_FLAT: RainbowLayer = {
  hueSpeed: 0.08,
  saturation: 0.42,
  whiteMix: 0.35,
  tint: RIM_GLOW.flat,
  tintMix: 0.28,
};
const LAYER_SPILL: RainbowLayer = {
  hueSpeed: 0.08,
  saturation: 0.5,
  whiteMix: 0.05,
  tint: RIM_GLOW.spill,
  tintMix: 0.2,
};
const LAYER_FAR_SPILL: RainbowLayer = {
  hueSpeed: 0.08,
  saturation: 0.4,
  whiteMix: 0.05,
  tint: RIM_GLOW.farSpill,
  tintMix: 0.22,
};

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

function BorderBeam() {
  // each layer's uniforms are built once and mutated via the corresponding
  // shaderMaterial ref each frame — same pattern stage-beams uses.
  const filamentMatRef = useRef<THREE.ShaderMaterial>(null);
  const hotMatRef = useRef<THREE.ShaderMaterial>(null);
  const haloMatRef = useRef<THREE.ShaderMaterial>(null);
  const bloomMatRef = useRef<THREE.ShaderMaterial>(null);
  const flatMatRef = useRef<THREE.ShaderMaterial>(null);
  const spillMatRef = useRef<THREE.ShaderMaterial>(null);
  const farSpillMatRef = useRef<THREE.ShaderMaterial>(null);

  const filamentU = useMemo(() => makeRainbowUniforms(LAYER_FILAMENT, 0.95), []);
  const hotU = useMemo(
    () => makeRainbowUniforms(LAYER_HOT, RIM_GLOW_OPACITY.hot),
    [],
  );
  const haloU = useMemo(
    () => makeRainbowUniforms(LAYER_HALO, RIM_GLOW_OPACITY.halo),
    [],
  );
  const bloomU = useMemo(
    () => makeRainbowUniforms(LAYER_BLOOM, RIM_GLOW_OPACITY.bloom),
    [],
  );
  const flatU = useMemo(
    () => makeRainbowUniforms(LAYER_FLAT, RIM_GLOW_OPACITY.flat),
    [],
  );
  const spillU = useMemo(
    () => makeRainbowUniforms(LAYER_SPILL, RIM_GLOW_OPACITY.spill),
    [],
  );
  const farSpillU = useMemo(
    () => makeRainbowUniforms(LAYER_FAR_SPILL, RIM_GLOW_OPACITY.farSpill),
    [],
  );

  const [cx, cz] = BASE_OUTLINE_CENTROID;

  // crisp closed outline along the polygon corners
  const outlineGeo = useMemo(
    () => createOutlineLoopGeometry(BASE_OUTLINE_CORNERS, BASE_OUTLINE_Y),
    [],
  );

  // each ribbon spans from the polygon edge outward to a scaled-out copy.
  // tighter ribbons sit closer to the outline; broader ribbons fall onto
  // the floor. additive across all layers builds the bloom volume.
  const hotGeo = useMemo(() => {
    const inner = scalePolygonAround(BASE_OUTLINE_CORNERS, cx, cz, 1.0);
    const outer = scalePolygonAround(BASE_OUTLINE_CORNERS, cx, cz, K_HOT);
    return createRibbonGeometry(inner, outer, BASE_OUTLINE_Y + 0.006);
  }, [cx, cz]);
  const haloGeo = useMemo(() => {
    const inner = scalePolygonAround(BASE_OUTLINE_CORNERS, cx, cz, 1.0);
    const outer = scalePolygonAround(BASE_OUTLINE_CORNERS, cx, cz, K_HALO);
    return createRibbonGeometry(inner, outer, BASE_OUTLINE_Y + 0.005);
  }, [cx, cz]);
  const bloomGeo = useMemo(() => {
    const inner = scalePolygonAround(BASE_OUTLINE_CORNERS, cx, cz, 1.0);
    const outer = scalePolygonAround(BASE_OUTLINE_CORNERS, cx, cz, K_BLOOM);
    return createRibbonGeometry(inner, outer, BASE_OUTLINE_Y + 0.004);
  }, [cx, cz]);
  // flat ring lying on the platform — clean warm ellipse against the floor
  const flatGeo = useMemo(() => {
    const inner = scalePolygonAround(BASE_OUTLINE_CORNERS, cx, cz, 1.0);
    const outer = scalePolygonAround(BASE_OUTLINE_CORNERS, cx, cz, K_FLAT);
    return createRibbonGeometry(inner, outer, BASE_OUTLINE_Y + 0.003);
  }, [cx, cz]);
  // wide spill softens the beam into the surrounding floor — well outside
  // the close halo layers so it reads as light bleeding away from the rim
  const spillGeo = useMemo(() => {
    const inner = scalePolygonAround(BASE_OUTLINE_CORNERS, cx, cz, K_SPILL_IN);
    const outer = scalePolygonAround(BASE_OUTLINE_CORNERS, cx, cz, K_SPILL_OUT);
    return createRibbonGeometry(inner, outer, BASE_OUTLINE_Y + 0.0015);
  }, [cx, cz]);
  const farSpillGeo = useMemo(() => {
    const inner = scalePolygonAround(BASE_OUTLINE_CORNERS, cx, cz, K_SPILL_OUT * 0.9);
    const outer = scalePolygonAround(
      BASE_OUTLINE_CORNERS,
      cx,
      cz,
      K_FAR_SPILL_OUT,
    );
    return createRibbonGeometry(inner, outer, BASE_OUTLINE_Y + 0.001);
  }, [cx, cz]);

  useEffect(() => {
    const geos = [outlineGeo, hotGeo, haloGeo, bloomGeo, flatGeo, spillGeo, farSpillGeo];
    return () => {
      for (const g of geos) g.dispose();
    };
  }, [outlineGeo, hotGeo, haloGeo, bloomGeo, flatGeo, spillGeo, farSpillGeo]);

  useFrame(({ clock }) => {
    // share the dome's breath cadence so the two stages feel lit by the
    // same room; time also drives the rainbow hue flow around the perimeter
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
      RIM_GLOW_OPACITY.hot + RIM_GLOW_BREATH.hot * beat,
    );
    setUniforms(
      haloMatRef.current,
      t,
      RIM_GLOW_OPACITY.halo - 0.02 + RIM_GLOW_BREATH.halo * beat,
    );
    setUniforms(
      bloomMatRef.current,
      t,
      RIM_GLOW_OPACITY.bloom - 0.02 + RIM_GLOW_BREATH.bloom * beat,
    );
    setUniforms(
      flatMatRef.current,
      t,
      RIM_GLOW_OPACITY.flat - 0.02 + RIM_GLOW_BREATH.flat * beat,
    );
    setUniforms(spillMatRef.current, t, RIM_GLOW_OPACITY.spill);
    setUniforms(farSpillMatRef.current, t, RIM_GLOW_OPACITY.farSpill);
    setUniforms(filamentMatRef.current, t, 0.9 + 0.05 * beat);
  });

  return (
    <group>
      {/* far spill — broadest, faintest fade into the floor */}
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
      {/* close spill — soft warm wash that ties the rim into the platform */}
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
      {/* outer bloom — wide warm halo */}
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
      {/* flat warm ring on the platform plane */}
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
      {/* creamy halo right against the core */}
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
      {/* hot bloom — thin bright layer hugging the outline */}
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
      {/* warm-white filament — the bright crisp core of the rim. drawn as
          lineSegments over consecutive edge pairs; the wrap segment's
          terminal vertex carries u=1 so the hue flow is continuous across
          the wrap. */}
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

const MODEL_SCALE = 0.46;
// Mountain's local bottom is y = -1.6. Offsetting by +0.736 places the base at world y=0,
// landing it on the same plane as the glow ring / where the dome sat.
const MODEL_Y = 0.736;
const AUTO_SPEED = 0.22;
const RESUME_DELAY_MS = 1400;

type Props = {
  targetRotationRef: RefObject<number>;
  isDraggingRef: RefObject<boolean>;
  lastInteractionRef: RefObject<number>;
  reducedMotion: boolean;
  isPyramidEnvironment: boolean;
};

export function MonolithMountainStage({
  targetRotationRef,
  isDraggingRef,
  lastInteractionRef,
  reducedMotion,
  isPyramidEnvironment,
}: Props) {
  const groupRef = useRef<THREE.Group>(null);

  const baseGeo = useMemo(
    () =>
      createPolyGeometry(LOWER_BASE_WEDGE_VERTICES, LOWER_BASE_WEDGE_FACES),
    [],
  );
  const ledgeGeo = useMemo(
    () =>
      createPolyGeometry(
        MIDDLE_HORIZONTAL_LEDGE_VERTICES,
        MIDDLE_HORIZONTAL_LEDGE_FACES,
      ),
    [],
  );
  const upperGeo = useMemo(
    () =>
      createPolyGeometry(UPPER_BLOCK_TIER_VERTICES, UPPER_BLOCK_TIER_FACES),
    [],
  );
  const peakGeo = useMemo(
    () =>
      createPolyGeometry(
        TOP_TRIANGULAR_PEAK_VERTICES,
        TOP_TRIANGULAR_PEAK_FACES,
      ),
    [],
  );

  // single procedural material shared across all four tiers — keeps the
  // noise pattern continuous across face boundaries and lets the height-
  // driven palette do the heavy lifting that the per-tier canvas textures
  // used to do.
  const stoneMat = useMemo(() => createMountainStoneMaterial(), []);

  useEffect(() => {
    const geos = [baseGeo, ledgeGeo, upperGeo, peakGeo];
    return () => {
      geos.forEach((g) => g.dispose());
      stoneMat.dispose();
    };
  }, [baseGeo, ledgeGeo, upperGeo, peakGeo, stoneMat]);

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;

    g.visible = isPyramidEnvironment;
    if (!isPyramidEnvironment) return;

    // mirror the dome's auto-spin behavior so the mountain drifts slowly to
    // the right when the user isn't interacting with it.
    const sinceInteraction = performance.now() - lastInteractionRef.current;
    const canAutoRotate =
      !reducedMotion &&
      !isDraggingRef.current &&
      sinceInteraction > RESUME_DELAY_MS;
    if (canAutoRotate) {
      targetRotationRef.current += AUTO_SPEED * delta;
    }

    const target = targetRotationRef.current;
    const current = g.rotation.y;
    const k = reducedMotion ? 1 : Math.min(1, delta * 14);
    g.rotation.y = current + (target - current) * k;
  });

  return (
    <group ref={groupRef} position={[0, MODEL_Y, 0]} scale={MODEL_SCALE}>
      <group rotation-y={-0.28}>
        <mesh geometry={baseGeo} material={stoneMat} />
        <mesh geometry={ledgeGeo} material={stoneMat} />
        <mesh geometry={upperGeo} material={stoneMat} />
        <mesh geometry={peakGeo} material={stoneMat} />
        <BorderBeam />
      </group>
    </group>
  );
}

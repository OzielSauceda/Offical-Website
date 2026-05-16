"use client";

import { RefObject, useEffect, useMemo, useRef } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { createSpotlightGlow } from "./textures";

// One dominant overhead spotlight aimed at the performer. The visible beam is
// a transparent cone, while the "impact" is a curved wash shell on the globe so
// the light reads as landing on the dome instead of floating in front of it.

const SOURCE_Y = 5.35;
const TARGET_Y = 1.66;
const SOURCE_VEC = new THREE.Vector3(0, SOURCE_Y, 0.08);
const TARGET_VEC = new THREE.Vector3(0, TARGET_Y, 0);
const BEAM_DIR = TARGET_VEC.clone().sub(SOURCE_VEC);
const BEAM_LENGTH = BEAM_DIR.length();
BEAM_DIR.normalize();
const BEAM_CENTER = SOURCE_VEC.clone().add(TARGET_VEC).multiplyScalar(0.5);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const BEAM_TILT_QUAT = new THREE.Quaternion().setFromUnitVectors(
  Y_AXIS,
  BEAM_DIR,
);

// each side gets a "backbone" of soft cone shells (custom shader with length
// envelope and view-angle falloff so the cylinder surface dissolves into haze
// instead of reading as a polygon) plus a string of layered glow sprites
// that fill the air around the beam. low opacity across the board — the
// dramatic look comes from accumulating many soft layers, not from any one
// strong surface.

const SOFT_BEAM_VERTEX = `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying float vT;
  uniform float uHalfLength;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    vT = (position.y + uHalfLength) / (uHalfLength * 2.0);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

// alpha = length envelope * front-facing falloff. peaks where the cone
// surface faces the camera (the central zone of the visible cross-section)
// and goes to zero at the silhouette — so the beam edges fade into the
// background instead of presenting a clean triangular boundary. the length
// envelope fades both ends so source and target don't show hard caps.
const SOFT_BEAM_FRAGMENT = `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uFresPower;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying float vT;

  void main() {
    float startFade = smoothstep(0.0, 0.32, vT);
    float endFade = 1.0 - smoothstep(0.6, 1.0, vT);
    float env = startFade * endFade;
    float facing = max(dot(normalize(vNormal), normalize(vViewDir)), 0.0);
    // front-facing weighting — brightness peaks at the camera-facing center
    // of the cone, drops smoothly to zero at the silhouette so the edges
    // dissolve into the air rather than ending in a visible shape.
    float body = pow(facing, uFresPower);
    float alpha = body * env * uIntensity;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

// center-spotlight shader — barbell envelope inside a hard fade at both
// caps. fade range is now uniform-driven so the long shaft cones can
// push their source-end fade deep into the cylinder (hiding the wide
// top rim that was reading as an elliptical lip under the ABOUT ring)
// while the short splay cone keeps a tight fade at the dome impact.
// the source-end barbell peak is also killed inside the fade band so
// nothing bright lives at the rim.
const CENTER_BEAM_FRAGMENT = `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uFresPower;
  uniform float uFadeStart;
  uniform float uFadeEnd;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying float vT;

  void main() {
    float topCap = smoothstep(uFadeStart, uFadeEnd, vT);
    float bottomCap = 1.0 - smoothstep(0.92, 1.0, vT);
    float distToMid = abs(vT - 0.5) * 2.0;
    float ends = pow(distToMid, 1.4);
    // tiny baseline so the middle isn't pure zero — keeps a whisper of
    // atmospheric connection between source and impact.
    float env = (0.08 + 0.92 * ends) * topCap * bottomCap;
    float facing = max(dot(normalize(vNormal), normalize(vViewDir)), 0.0);
    float body = pow(facing, uFresPower);
    float alpha = body * env * uIntensity;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

// inner-core shader — same vertex as the outer cones but the envelope is
// biased heavily toward the source end. brightness peaks near the upper
// outer side (where the "lamp" is) and tapers long toward the globe, so
// the core reads as a bright spotlight shaft inside the haze.
const SOFT_CORE_FRAGMENT = `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uTightness;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying float vT;

  void main() {
    // vT = 0 at source, 1 at target. gentle fade-in across the source area
    // so the shaft emerges out of the source bloom instead of starting as a
    // visible wedge; long fade-out across the rest of the length so it
    // doesn't blast onto the globe.
    float startFade = smoothstep(0.0, 0.24, vT);
    float endFade = 1.0 - smoothstep(0.28, 1.0, vT);
    float env = startFade * endFade;
    float facing = max(dot(normalize(vNormal), normalize(vViewDir)), 0.0);
    // tighter front-facing falloff so the cross-section reads as a clear
    // narrow shaft with feathered edges that dissolve at the silhouette.
    float body = pow(facing, uTightness);
    float alpha = body * env * uIntensity;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

type SoftBeam = {
  center: [number, number, number];
  length: number;
  halfLength: number;
  quaternion: [number, number, number, number];
  radiusTop: number;
  radiusBottom: number;
  color: string;
  intensity: number;
};

function makeSoftBeam(
  from: [number, number, number],
  to: [number, number, number],
  rTop: number,
  rBot: number,
  color: string,
  intensity: number,
): SoftBeam {
  const start = new THREE.Vector3(...from);
  const end = new THREE.Vector3(...to);
  const dir = end.clone().sub(start);
  const length = dir.length();
  dir.normalize();
  const center = start.clone().add(end).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(Y_AXIS, dir);
  return {
    center: [center.x, center.y, center.z],
    length,
    halfLength: length / 2,
    quaternion: [q.x, q.y, q.z, q.w],
    radiusTop: rTop,
    radiusBottom: rBot,
    color,
    intensity,
  };
}

// source = upper-outer (offscreen), target = near the dome's upper hemisphere.
// for each side: an outer broad cone (very soft, hazy outer shape) and a
// tighter inner cone (slightly brighter beam core). rTop is at the +Y end
// after the quaternion aligns local +Y with from→to, so rTop sits at the
// target side and rBot at the source.
// subtle asymmetry — left reads slightly broader/softer/mistier, right reads
// slightly tighter/cleaner/cooler. radii, intensities, and palette differ
// just enough that the beams don't feel mirror-perfect.
const SIDE_SOFT_BEAMS: SoftBeam[] = [
  // LEFT outer haze — broader cone, lower intensity, mistier green-cyan
  makeSoftBeam([-4.7, 4.1, -1.55], [-0.85, 1.85, 0.2], 1.72, 0.52, "#b8d8c0", 0.34),
  // LEFT inner body — tighter, slightly brighter pale green-blue
  makeSoftBeam([-4.45, 4.0, -1.48], [-0.95, 1.85, 0.18], 0.86, 0.24, "#d6efd8", 0.46),
  // RIGHT outer haze — slightly tighter than left, cool icy blue
  makeSoftBeam([4.55, 4.0, -1.46], [0.9, 1.85, 0.2], 1.42, 0.42, "#b9c8e8", 0.42),
  // RIGHT inner body — cleaner, marginally brighter cool blue-white
  makeSoftBeam([4.35, 3.95, -1.42], [0.98, 1.85, 0.18], 0.74, 0.2, "#d7e2ff", 0.54),
];

// inner bright shafts — narrow cones with a source-biased envelope. these
// are the visible spotlight cores inside each beam, brighter near the lamp
// side and tapering long toward the globe so they don't wash the texture.
const SIDE_BEAM_CORES: SoftBeam[] = [
  // LEFT core — pale green-cyan, slightly wider/softer than the right
  makeSoftBeam([-4.5, 4.05, -1.5], [-0.95, 1.85, 0.18], 0.36, 0.12, "#d8f5df", 0.95),
  // RIGHT core — cool blue-white, slightly tighter/cleaner
  makeSoftBeam([4.4, 4.0, -1.46], [0.98, 1.85, 0.18], 0.3, 0.1, "#e4ecff", 1.05),
];

type BeamPuff = {
  position: [number, number, number];
  scale: [number, number];
  color: string;
  opacity: number;
};

type SideTuning = {
  // multipliers applied to every puff so the two beams can be slightly
  // different overall without rewriting the path. left = broader/softer,
  // right = tighter/cleaner.
  scaleMul: number;
  opacityMul: number;
  // seed for deterministic per-puff jitter so density isn't perfectly
  // uniform along the beam length — uneven haze instead of a clean wedge.
  jitterSeed: number;
};

function pseudoNoise(i: number, seed: number) {
  const v = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

function buildBeamPuffs(
  sourceX: number,
  palette: string[],
  tuning: SideTuning,
): BeamPuff[] {
  // a denser string of soft puffs stitched along the beam path. positions
  // and opacities are perturbed per-puff using a deterministic pseudo-noise
  // so the haze density along the beam doesn't read as uniform.
  const sx = Math.sign(sourceX);
  // (xOffsetFromSource, y, z, scaleX, scaleY, paletteIdx, opacity)
  const path: Array<[number, number, number, number, number, number, number]> = [
    [0.0, 4.0, -1.55, 4.4, 4.0, 0, 0.18],
    [-0.3, 3.55, -1.4, 4.2, 3.8, 0, 0.24],
    [-0.65, 3.1, -1.25, 4.05, 3.6, 1, 0.32],
    [-1.0, 2.65, -1.08, 3.9, 3.3, 1, 0.4],
    [-1.4, 2.2, -0.9, 3.75, 3.0, 2, 0.46],
    [-1.78, 1.8, -0.72, 3.55, 2.7, 2, 0.5],
    [-2.1, 1.4, -0.55, 3.35, 2.3, 2, 0.48],
    [-2.4, 1.05, -0.42, 3.15, 2.0, 1, 0.44],
    [-2.65, 0.72, -0.3, 2.95, 1.7, 1, 0.38],
    [-2.85, 0.45, -0.2, 2.7, 1.4, 0, 0.3],
    [-3.0, 0.22, -0.12, 2.4, 1.1, 0, 0.22],
    [-3.1, 0.06, -0.06, 2.0, 0.85, 0, 0.14],
  ];
  return path.map(([dx, y, z, sX, sY, pi, op], i) => {
    // jitter values are deterministic per puff & seed. amplitudes are small
    // so the path stays recognizable; they just break the perfect cadence.
    const nA = pseudoNoise(i, tuning.jitterSeed);
    const nB = pseudoNoise(i + 17, tuning.jitterSeed);
    const nC = pseudoNoise(i + 41, tuning.jitterSeed);
    const xJit = (nA - 0.5) * 0.18;
    const yJit = (nB - 0.5) * 0.12;
    const zJit = (nC - 0.5) * 0.14;
    const opJit = 0.78 + nA * 0.44; // 0.78..1.22 — uneven density
    const scaleJit = 0.88 + nB * 0.24; // 0.88..1.12 — uneven puff size
    return {
      position: [sourceX + (dx + xJit) * sx, y + yJit, z + zJit],
      scale: [sX * tuning.scaleMul * scaleJit, sY * tuning.scaleMul * scaleJit],
      color: palette[pi] ?? palette[0]!,
      opacity: op * tuning.opacityMul * opJit,
    };
  });
}

// pale misty cyan-green on the left, cool icy blue on the right.
const LEFT_PALETTE = ["#c8e8d2", "#a8cfc4", "#b8d8c0"];
const RIGHT_PALETTE = ["#d7e2ff", "#b9c8e8", "#c8d8ff"];

// left is broader and softer; right is slightly tighter and cleaner. jitter
// seeds differ so the irregularity pattern isn't the same on both sides.
const LEFT_TUNING: SideTuning = { scaleMul: 1.08, opacityMul: 0.94, jitterSeed: 7.3 };
const RIGHT_TUNING: SideTuning = { scaleMul: 0.96, opacityMul: 1.04, jitterSeed: 23.1 };

const LEFT_PUFFS = buildBeamPuffs(-3.4, LEFT_PALETTE, LEFT_TUNING);
const RIGHT_PUFFS = buildBeamPuffs(3.4, RIGHT_PALETTE, RIGHT_TUNING);

// outer atmospheric spread — wide, low-opacity sprites placed slightly
// outside the main beam path. these bloom the beam edges into the dark
// background so the silhouette doesn't read as a clean triangle.
function buildBeamHalo(
  sourceX: number,
  color: string,
  tuning: SideTuning,
): BeamPuff[] {
  const sx = Math.sign(sourceX);
  // (xOffset, y, z, scaleX, scaleY, opacity) — offsets slightly outward and
  // back from the puff path so the halo sits around the beam, not on top
  const path: Array<[number, number, number, number, number, number]> = [
    [0.55, 3.7, -1.85, 7.0, 6.2, 0.07],
    [0.1, 2.85, -1.5, 6.4, 5.2, 0.1],
    [-0.5, 1.95, -1.1, 5.8, 4.2, 0.12],
    [-1.0, 1.15, -0.78, 5.0, 3.4, 0.11],
    [-1.5, 0.5, -0.45, 4.2, 2.4, 0.08],
  ];
  return path.map(([dx, y, z, sX, sY, op], i) => {
    const n = pseudoNoise(i + 5, tuning.jitterSeed);
    const opJit = 0.8 + n * 0.4;
    return {
      position: [sourceX + dx * sx, y, z],
      scale: [sX * tuning.scaleMul, sY * tuning.scaleMul],
      color,
      opacity: op * tuning.opacityMul * opJit,
    };
  });
}

// far outer wisps — even wider, even fainter. they live just outside the
// halo so the beam silhouette has one more soft step before dissolving
// into background.
function buildBeamWisps(
  sourceX: number,
  color: string,
  tuning: SideTuning,
): BeamPuff[] {
  const sx = Math.sign(sourceX);
  const path: Array<[number, number, number, number, number, number]> = [
    [0.95, 3.4, -2.0, 8.0, 6.6, 0.045],
    [0.3, 2.4, -1.6, 7.4, 5.6, 0.055],
    [-0.35, 1.5, -1.2, 6.8, 4.4, 0.06],
    [-1.0, 0.7, -0.8, 5.8, 3.0, 0.05],
  ];
  return path.map(([dx, y, z, sX, sY, op], i) => {
    const n = pseudoNoise(i + 31, tuning.jitterSeed);
    return {
      position: [sourceX + dx * sx, y, z],
      scale: [sX * tuning.scaleMul, sY * tuning.scaleMul],
      color,
      opacity: op * tuning.opacityMul * (0.85 + n * 0.3),
    };
  });
}

const LEFT_HALO = buildBeamHalo(-3.4, "#b8d8c0", LEFT_TUNING);
const RIGHT_HALO = buildBeamHalo(3.4, "#b9c8e8", RIGHT_TUNING);
const LEFT_WISPS = buildBeamWisps(-3.4, "#aac8b6", LEFT_TUNING);
const RIGHT_WISPS = buildBeamWisps(3.4, "#b0c0de", RIGHT_TUNING);

// source bloom — a soft cluster of overlapping sprites near the upper
// origin of each beam. these suggest an offscreen lamp blooming into haze
// and act as a transition between "no light" and the beam shaft. multiple
// layered sprites at varying scales/opacities/offsets prevent any single
// sprite from reading as a flat disc.
type SourceBloomCfg = {
  origin: [number, number, number];
  // bias direction along the beam (unit vector roughly source→target)
  bias: [number, number, number];
  hotColor: string;
  mistColor: string;
  tightness: number;
};

function buildSourceBloom(cfg: SourceBloomCfg): BeamPuff[] {
  const [ox, oy, oz] = cfg.origin;
  const [bx, by, bz] = cfg.bias;
  // each row: distance-along-beam, lateral offset, scale, opacity, useHot.
  // distances and lateral offsets are in world units along/perp to the
  // beam direction. all sprites are intentionally low-opacity and broad —
  // no single sprite is allowed to read as a bright circle. the bright
  // kernel is small AND dim; brightness emerges only from accumulation.
  const tight = cfg.tightness;
  const rows: Array<[number, number, number, number, boolean]> = [
    // dim soft kernel — replaces the old bright hot kernel. small, but
    // opacity is low so it never reads as an orb on its own.
    [0.08, 0.0, 0.85 * tight, 0.3, true],
    // close mist — wider, very low-opacity, sits over the kernel and
    // immediately broadens the source so the kernel can't read as a disc
    [0.14, -0.04, 2.1 * tight, 0.26, false],
    // upper-lateral wisp — pushed sideways and back so the cluster
    // doesn't sit on a single axis (kills the "concentric circles" tell)
    [0.04, 0.34, 1.7 * tight, 0.18, false],
    // lower-lateral wisp — opposite lateral direction, slight forward shift
    [0.26, -0.32, 1.95 * tight, 0.18, false],
    // upstream halo — broad mist sitting slightly behind the origin so the
    // bloom feels three-dimensional, not a stamp at the front
    [-0.28, 0.05, 2.55 * tight, 0.16, false],
    // diffuse outer — very wide, very faint, ties the source into the
    // surrounding scene haze
    [0.12, 0.1, 3.4 * tight, 0.12, false],
    // bridge 1 — soft puff along the shaft direction, blends source→body
    [0.7, -0.05, 2.9 * tight, 0.24, false],
    // bridge 2 — further along, broader, dimmer, full transition into body
    [1.1, 0.06, 3.25 * tight, 0.18, false],
    // bridge 3 — last gradient step before puffs take over the shaft
    [1.55, -0.04, 3.4 * tight, 0.12, false],
  ];
  // perpendicular direction in the X-Z plane for the lateral offsets
  // (close enough — beam direction has small Y component)
  const perpX = -bz;
  const perpZ = bx;
  return rows.map(([d, lat, scale, op, hot]) => ({
    position: [
      ox + bx * d + perpX * lat,
      oy + by * d,
      oz + bz * d + perpZ * lat,
    ],
    scale: [scale, scale],
    color: hot ? cfg.hotColor : cfg.mistColor,
    opacity: op,
  }));
}

// beam direction roughly source→target (normalized). using cached values
// instead of recomputing — these match the LEFT/RIGHT core source/target
// pairs above.
const LEFT_BEAM_DIR: [number, number, number] = (() => {
  const v = new THREE.Vector3(-0.95 - -4.5, 1.85 - 4.05, 0.18 - -1.5).normalize();
  return [v.x, v.y, v.z];
})();
const RIGHT_BEAM_DIR: [number, number, number] = (() => {
  const v = new THREE.Vector3(0.98 - 4.4, 1.85 - 4.0, 0.18 - -1.46).normalize();
  return [v.x, v.y, v.z];
})();

const LEFT_SOURCE_BLOOM = buildSourceBloom({
  origin: [-4.45, 4.08, -1.5],
  bias: LEFT_BEAM_DIR,
  hotColor: "#e8fbe5",
  mistColor: "#c6e6cf",
  // left = broader, mistier
  tightness: 1.12,
});
const RIGHT_SOURCE_BLOOM = buildSourceBloom({
  origin: [4.35, 4.02, -1.46],
  bias: RIGHT_BEAM_DIR,
  hotColor: "#eef2ff",
  mistColor: "#c2d2ee",
  // right = slightly tighter, cleaner
  tightness: 0.94,
});

const GLOBE_WASH_VERTEX = `
  varying vec3 vLocalPosition;

  void main() {
    vLocalPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const GLOBE_WASH_FRAGMENT = `
  uniform float uOpacity;
  varying vec3 vLocalPosition;

  float lobe(vec3 n, vec3 center, float radius, float feather) {
    float d = acos(clamp(dot(n, normalize(center)), -1.0, 1.0));
    return 1.0 - smoothstep(radius, radius + feather, d);
  }

  void main() {
    vec3 n = normalize(vLocalPosition);
    float theta = acos(clamp(n.y, -1.0, 1.0));
    float core = 1.0 - smoothstep(0.0, 0.16, theta);
    float wash = 1.0 - smoothstep(0.12, 0.54, theta);
    float feather = smoothstep(0.18, 0.38, theta) * (1.0 - smoothstep(0.38, 0.62, theta));
    float leftLand = lobe(n, vec3(-0.28, 0.95, 0.08), 0.08, 0.2);
    float rightLand = lobe(n, vec3(0.28, 0.95, 0.02), 0.08, 0.2);
    float rearLand = lobe(n, vec3(0.04, 0.91, -0.36), 0.09, 0.22);
    float sideLand = max(max(leftLand, rightLand), rearLand);
    float alpha = (core * 0.46 + wash * 0.34 + feather * 0.08 + sideLand * 0.34) * uOpacity;
    vec3 coolEdge = vec3(0.42, 0.62, 1.0);
    vec3 warmWhite = vec3(1.0, 0.98, 0.9);
    vec3 sideColor = mix(vec3(0.58, 0.72, 1.0), vec3(0.88, 0.94, 0.7), leftLand * 0.45);
    vec3 color = mix(coolEdge, warmWhite, clamp(core * 1.4 + wash * 0.35, 0.0, 1.0));
    color = mix(color, sideColor, clamp(sideLand * 0.65, 0.0, 1.0));

    gl_FragColor = vec4(color, alpha);
  }
`;

type Props = {
  reducedMotion: boolean;
  isGlobeEnvironment: boolean;
  cueMode: "default" | "entered";
};

type DustSpec = {
  x: number;
  z: number;
  phase: number;
  size: number;
  speed: number;
};

const DUST: DustSpec[] = Array.from({ length: 18 }).map((_, i) => {
  const a = ((i * 73 + 13) % 1000) / 1000;
  const b = ((i * 191 + 41) % 1000) / 1000;
  const c = ((i * 53 + 7) % 1000) / 1000;
  return {
    x: (a - 0.5) * 0.44,
    z: (b - 0.5) * 0.44,
    phase: c,
    size: 0.018 + a * 0.032,
    speed: 0.08 + b * 0.15,
  };
});

function SoftBeamCone({
  beam,
  cueMulRef,
}: {
  beam: SoftBeam;
  cueMulRef: RefObject<number>;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(beam.color) },
      uIntensity: { value: beam.intensity },
      uFresPower: { value: 1.6 },
      uHalfLength: { value: beam.halfLength },
    }),
    [beam.color, beam.intensity, beam.halfLength],
  );
  // base intensity is captured once; per-frame we multiply by the cue ref so
  // side beams can dim down to a stage-cue level without rebuilding uniforms.
  useFrame(() => {
    const m = matRef.current;
    if (m && m.uniforms.uIntensity) {
      m.uniforms.uIntensity.value = beam.intensity * cueMulRef.current;
    }
  });
  return (
    <mesh
      position={beam.center}
      quaternion={beam.quaternion}
      renderOrder={1}
    >
      <cylinderGeometry
        args={[beam.radiusTop, beam.radiusBottom, beam.length, 48, 1, true]}
      />
      <shaderMaterial
        ref={matRef}
        vertexShader={SOFT_BEAM_VERTEX}
        fragmentShader={SOFT_BEAM_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

function SoftBeamCoreCone({
  beam,
  tightness,
  cueMulRef,
}: {
  beam: SoftBeam;
  tightness: number;
  cueMulRef: RefObject<number>;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(beam.color) },
      uIntensity: { value: beam.intensity },
      uTightness: { value: tightness },
      uHalfLength: { value: beam.halfLength },
    }),
    [beam.color, beam.intensity, beam.halfLength, tightness],
  );
  useFrame(() => {
    const m = matRef.current;
    if (m && m.uniforms.uIntensity) {
      m.uniforms.uIntensity.value = beam.intensity * cueMulRef.current;
    }
  });
  return (
    <mesh
      position={beam.center}
      quaternion={beam.quaternion}
      renderOrder={2}
    >
      <cylinderGeometry
        args={[beam.radiusTop, beam.radiusBottom, beam.length, 48, 1, true]}
      />
      <shaderMaterial
        ref={matRef}
        vertexShader={SOFT_BEAM_VERTEX}
        fragmentShader={SOFT_CORE_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

// uniforms for the central spotlight cones — each cone gets its own
// shaderMaterial driven by these, so they all share the same length envelope
// math and dissolve to zero at the silhouette instead of reading as panels.
const CENTER_BEAM_HALF = BEAM_LENGTH / 2;

function makeCenterUniforms(color: string, intensity: number, fresPower: number) {
  return {
    uColor: { value: new THREE.Color(color) },
    uIntensity: { value: intensity },
    uFresPower: { value: fresPower },
    // long shaft cones — source-end fade is pushed deep into the cylinder
    // so the wide top rim is hidden well below the ABOUT ring before any
    // surface alpha is allowed to accumulate. with 3.69-unit beam length,
    // 0.18→0.38 fade means alpha is zero from the source down ~0.66u and
    // only reaches full env by ~1.4u below the source.
    uFadeStart: { value: 0.18 },
    uFadeEnd: { value: 0.38 },
    uHalfLength: { value: CENTER_BEAM_HALF },
  };
}

export function StageBeams({
  reducedMotion,
  isGlobeEnvironment,
  cueMode,
}: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.ShaderMaterial>(null);
  const washRef = useRef<THREE.ShaderMaterial>(null);
  const dustRefs = useRef<(THREE.Sprite | null)[]>([]);
  const glow = useMemo(() => createSpotlightGlow(), []);
  // intensity multipliers lerped each frame toward their cue targets. side
  // beams dim hard, the center key light bumps up slightly so the performer
  // feels isolated under a single light when entered.
  const sideMulRef = useRef(1);
  const centerMulRef = useRef(1);

  // dropped the wide outer/far haze cones — they were the main source of
  // the "gray curtain" silhouette. only three narrow cones remain (mid,
  // inner, core), each with tight fresPower so the visible body is a thin
  // strip rather than a translucent panel.
  const midUniforms = useMemo(
    () => makeCenterUniforms("#a8bdec", 0.08, 2.3),
    [],
  );
  const innerUniforms = useMemo(
    () => makeCenterUniforms("#cdd8f4", 0.14, 2.7),
    [],
  );
  const coreUniforms = useMemo(
    () => makeCenterUniforms("#eef4ff", 0.26, 3.4),
    [],
  );
  // short flared cone sitting just above the dome top — broadens the beam
  // only at the impact area, so the spotlight feels like it diffuses into
  // stage haze right where it lands without thickening the rest of the
  // shaft. higher fresPower so the cone surface doesn't read as a panel
  // either.
  const splayUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color("#f4f8ff") },
      uIntensity: { value: 0.12 },
      uFresPower: { value: 1.6 },
      // splay cone is short (0.7u) and sits at the dome impact — keep the
      // original tight fade so the flare still reads where the spotlight
      // lands. only the long shaft cones get the aggressive source fade.
      uFadeStart: { value: 0.0 },
      uFadeEnd: { value: 0.12 },
      uHalfLength: { value: 0.35 },
    }),
    [],
  );

  useEffect(() => () => glow.dispose(), [glow]);

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;
    g.visible = isGlobeEnvironment;
    if (!isGlobeEnvironment) return;

    // cue multipliers: side beams ease to 0.30 when entered, center key
    // light eases up to 1.10. lerp rate 6/sec gives a ~0.25s feel.
    const sideTarget = cueMode === "entered" ? 0.3 : 1.0;
    const centerTarget = cueMode === "entered" ? 1.1 : 1.0;
    const k = reducedMotion ? 1 : Math.min(1, delta * 6);
    sideMulRef.current += (sideTarget - sideMulRef.current) * k;
    centerMulRef.current += (centerTarget - centerMulRef.current) * k;

    const t = performance.now() / 1000;
    const breathe = reducedMotion ? 0 : 0.5 + 0.5 * Math.sin(t * 1.25);
    if (coreRef.current) {
      const u = coreRef.current.uniforms.uIntensity;
      if (u) u.value = (0.24 + 0.05 * breathe) * centerMulRef.current;
    }
    if (washRef.current) {
      const opacityUniform = washRef.current.uniforms.uOpacity;
      if (opacityUniform) opacityUniform.value = 0.88 + 0.12 * breathe;
    }

    if (!reducedMotion) {
      for (let i = 0; i < DUST.length; i++) {
        const s = dustRefs.current[i];
        const cfg = DUST[i]!;
        if (!s) continue;
        const u = (t * cfg.speed + cfg.phase) % 1;
        s.position.y = BEAM_LENGTH / 2 - u * BEAM_LENGTH;
        s.position.x = cfg.x + Math.sin(t * 0.48 + i) * 0.025;
        s.position.z = cfg.z + Math.cos(t * 0.4 + i * 1.3) * 0.025;
      }
    }
  });

  return (
    <group ref={groupRef}>
      <group
        position={[BEAM_CENTER.x, BEAM_CENTER.y, BEAM_CENTER.z]}
        quaternion={[
          BEAM_TILT_QUAT.x,
          BEAM_TILT_QUAT.y,
          BEAM_TILT_QUAT.z,
          BEAM_TILT_QUAT.w,
        ]}
      >
        {/* mid body cone — narrow cool blue diffusion */}
        <mesh>
          <cylinderGeometry args={[0.95, 0.28, BEAM_LENGTH, 64, 1, true]} />
          <shaderMaterial
            vertexShader={SOFT_BEAM_VERTEX}
            fragmentShader={CENTER_BEAM_FRAGMENT}
            uniforms={midUniforms}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
        {/* inner body cone — brighter cool white */}
        <mesh>
          <cylinderGeometry args={[0.52, 0.15, BEAM_LENGTH, 64, 1, true]} />
          <shaderMaterial
            vertexShader={SOFT_BEAM_VERTEX}
            fragmentShader={CENTER_BEAM_FRAGMENT}
            uniforms={innerUniforms}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
        {/* hot core shaft — narrow, tight front-facing falloff so the
            visible shaft reads as a slim luminous spine inside the
            surrounding haze rather than a thick white tube. */}
        <mesh>
          <cylinderGeometry args={[0.22, 0.05, BEAM_LENGTH, 64, 1, true]} />
          <shaderMaterial
            ref={coreRef}
            vertexShader={SOFT_BEAM_VERTEX}
            fragmentShader={CENTER_BEAM_FRAGMENT}
            uniforms={coreUniforms}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>

        {/* internal vertical haze sprites — barely-there whispers near
            each end of the shaft. the middle is intentionally empty. */}
        <sprite position={[-0.04, BEAM_LENGTH * 0.4, 0.02]} scale={[1.4, 1.2, 1]}>
          <spriteMaterial
            map={glow}
            color="#dde6f8"
            transparent
            opacity={0.03}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
        <sprite position={[0.05, -BEAM_LENGTH * 0.36, 0.02]} scale={[1.15, 1.1, 1]}>
          <spriteMaterial
            map={glow}
            color="#e4ecff"
            transparent
            opacity={0.05}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>

        {DUST.map((d, i) => (
          <sprite
            key={i}
            ref={(el) => {
              dustRefs.current[i] = el;
            }}
            position={[d.x, BEAM_LENGTH / 2 - d.phase * BEAM_LENGTH, d.z]}
            scale={[d.size, d.size, 1]}
          >
            <spriteMaterial
              map={glow}
              color="#ffffff"
              transparent
              opacity={0.08}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </sprite>
        ))}
      </group>

      {/* SOURCE BLOOM under the ABOUT ring — layered soft sprites so the
          beam reads as coming from inside/above the ring opening. opacities
          are gentle and scales lean wide so no single layer presents as a
          flat strip or solid block. */}
      <sprite position={[0, SOURCE_Y - 0.05, 0.08]} scale={[1.4, 1.4, 1]}>
        <spriteMaterial
          map={glow}
          color="#eef4ff"
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
      <sprite position={[-0.12, SOURCE_Y - 0.2, 0.08]} scale={[2.0, 1.6, 1]}>
        <spriteMaterial
          map={glow}
          color="#dfe6f8"
          transparent
          opacity={0.09}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
      <sprite position={[0.08, SOURCE_Y - 0.38, 0.08]} scale={[2.8, 2.1, 1]}>
        <spriteMaterial
          map={glow}
          color="#d4dcf6"
          transparent
          opacity={0.07}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
      <sprite position={[0, SOURCE_Y + 0.2, 0.05]} scale={[3.6, 2.2, 1]}>
        <spriteMaterial
          map={glow}
          color="#c8d2ee"
          transparent
          opacity={0.05}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
      {/* very faint upstream wisp — gives the bloom dimensionality so the
          source feels like it lives inside the ring, not pasted in front. */}
      <sprite position={[-0.06, SOURCE_Y + 0.45, -0.04]} scale={[3.0, 1.6, 1]}>
        <spriteMaterial
          map={glow}
          color="#bdc8e8"
          transparent
          opacity={0.04}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>

      {/* LOWER SPLAY CONE — short flared cone just above the dome top.
          softens and widens the beam right at the landing area so the
          spotlight reads as diffusing into stage haze instead of arriving
          as a sharp point. doesn't thicken the rest of the shaft. */}
      <mesh position={[0, 2.15, 0.05]}>
        <cylinderGeometry args={[0.18, 0.5, 0.7, 48, 1, true]} />
        <shaderMaterial
          vertexShader={SOFT_BEAM_VERTEX}
          fragmentShader={CENTER_BEAM_FRAGMENT}
          uniforms={splayUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      {/* IMPACT BLOOM at the dome top — soft wash where the spotlight lands.
          much dimmer and cooler than before so it reads as light falling on
          the dome rather than a painted white patch. wider scales with
          lower opacities feather the glow softly into the texture. */}
      <sprite position={[0, 1.8, 0.05]} scale={[0.5, 0.5, 1]}>
        <spriteMaterial
          map={glow}
          color="#eef4ff"
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
      <sprite position={[0, 1.86, 0.04]} scale={[1.9, 1.2, 1]}>
        <spriteMaterial
          map={glow}
          color="#e4ecff"
          transparent
          opacity={0.07}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
      <sprite position={[0, 1.95, 0.0]} scale={[3.2, 1.25, 1]}>
        <spriteMaterial
          map={glow}
          color="#dde6f8"
          transparent
          opacity={0.045}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>

      {/* PERFORMER HALO — small vertical elliptical glow centered just
          behind the character. keeps the character spotlighted without
          building a white patch over the dome. drawn at slight z-offset
          so it sits *behind* the character relative to the camera. */}
      <sprite position={[0, 1.96, -0.02]} scale={[0.42, 0.72, 1]}>
        <spriteMaterial
          map={glow}
          color="#eef4ff"
          transparent
          opacity={0.11}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
      <sprite position={[0, 2.0, -0.04]} scale={[0.7, 1.0, 1]}>
        <spriteMaterial
          map={glow}
          color="#dde6f8"
          transparent
          opacity={0.06}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>

      {/* PERFORMER HAZE — a single wide gentle mist sitting just above the
          character. dropped the mirror sprite pairs and the stage-line
          pair from the previous step because they were stacking up as
          repeated blobs around the impact. one elliptical mist is enough
          to suggest atmosphere. */}
      <sprite position={[0, 2.0, 0.03]} scale={[1.7, 0.8, 1]}>
        <spriteMaterial
          map={glow}
          color="#eef4ff"
          transparent
          opacity={0.07}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>

      {/* FAR WISPS — broadest, faintest layer. these dissolve the beam
          silhouette into the background before the halo even reads as light */}
      {LEFT_WISPS.map((p, i) => (
        <sprite
          key={`lw-${i}`}
          position={p.position}
          scale={[p.scale[0], p.scale[1], 1]}
          renderOrder={0}
        >
          <spriteMaterial
            map={glow}
            color={p.color}
            transparent
            opacity={p.opacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
      ))}
      {RIGHT_WISPS.map((p, i) => (
        <sprite
          key={`rw-${i}`}
          position={p.position}
          scale={[p.scale[0], p.scale[1], 1]}
          renderOrder={0}
        >
          <spriteMaterial
            map={glow}
            color={p.color}
            transparent
            opacity={p.opacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
      ))}

      {/* OUTER HALO — very wide, low-opacity sprites blooming around the beam
          path so the silhouette dissolves into the background air */}
      {LEFT_HALO.map((p, i) => (
        <sprite
          key={`lh-${i}`}
          position={p.position}
          scale={[p.scale[0], p.scale[1], 1]}
          renderOrder={0}
        >
          <spriteMaterial
            map={glow}
            color={p.color}
            transparent
            opacity={p.opacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
      ))}
      {RIGHT_HALO.map((p, i) => (
        <sprite
          key={`rh-${i}`}
          position={p.position}
          scale={[p.scale[0], p.scale[1], 1]}
          renderOrder={0}
        >
          <spriteMaterial
            map={glow}
            color={p.color}
            transparent
            opacity={p.opacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
      ))}

      {/* SIDE-BEAM BACKBONES — soft cone shells, custom shader with length
          envelope + front-facing falloff. provides directional structure
          for the puff sprites to wrap around */}
      {SIDE_SOFT_BEAMS.map((beam, i) => (
        <SoftBeamCone key={`beam-${i}`} beam={beam} cueMulRef={sideMulRef} />
      ))}

      {/* INNER CORES — narrow bright spotlight shafts inside each beam.
          source-biased envelope so the brightness peaks near the lamp side
          and tapers long toward the dome. tighter front-facing falloff for
          a clearer shaft, but still feathered (no hard edge). */}
      {SIDE_BEAM_CORES.map((beam, i) => (
        <SoftBeamCoreCone
          key={`core-${i}`}
          beam={beam}
          tightness={i === 1 ? 2.6 : 2.2}
          cueMulRef={sideMulRef}
        />
      ))}

      {/* SOURCE BLOOMS — overlapping soft sprites near each beam's upper
          origin. a small bright kernel sits at the lamp position, wrapped
          in broader mist, with two larger bridge puffs trailing along the
          beam direction so the shaft emerges out of the source rather than
          appearing as a wedge. */}
      {LEFT_SOURCE_BLOOM.map((p, i) => (
        <sprite
          key={`lsb-${i}`}
          position={p.position}
          scale={[p.scale[0], p.scale[1], 1]}
          renderOrder={3}
        >
          <spriteMaterial
            map={glow}
            color={p.color}
            transparent
            opacity={p.opacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
      ))}
      {RIGHT_SOURCE_BLOOM.map((p, i) => (
        <sprite
          key={`rsb-${i}`}
          position={p.position}
          scale={[p.scale[0], p.scale[1], 1]}
          renderOrder={3}
        >
          <spriteMaterial
            map={glow}
            color={p.color}
            transparent
            opacity={p.opacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
      ))}

      {/* LEFT beam puffs — string of soft radial sprites traced along the
          diagonal beam path. additive overlap creates the impression of
          light scattering through haze */}
      {LEFT_PUFFS.map((p, i) => (
        <sprite
          key={`l-${i}`}
          position={p.position}
          scale={[p.scale[0], p.scale[1], 1]}
          renderOrder={1}
        >
          <spriteMaterial
            map={glow}
            color={p.color}
            transparent
            opacity={p.opacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
      ))}

      {/* RIGHT beam — mirror of the left, icy blue tint */}
      {RIGHT_PUFFS.map((p, i) => (
        <sprite
          key={`r-${i}`}
          position={p.position}
          scale={[p.scale[0], p.scale[1], 1]}
          renderOrder={1}
        >
          <spriteMaterial
            map={glow}
            color={p.color}
            transparent
            opacity={p.opacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
      ))}

      {/* GROUND HAZE — wide low fog around the dome base that pulls the
          plumes into the rest of the scene atmosphere */}
      <sprite position={[0, 0.12, 0.4]} scale={[6.8, 1.2, 1]} renderOrder={2}>
        <spriteMaterial
          map={glow}
          color="#cbd6e8"
          transparent
          opacity={0.22}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
      <sprite position={[0, 0.32, -0.8]} scale={[5.6, 1.4, 1]} renderOrder={2}>
        <spriteMaterial
          map={glow}
          color="#b6c6df"
          transparent
          opacity={0.18}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>

      <mesh renderOrder={3}>
        <sphereGeometry args={[1.828, 128, 40, 0, Math.PI * 2, 0, 0.88]} />
        <shaderMaterial
          ref={washRef}
          vertexShader={GLOBE_WASH_VERTEX}
          fragmentShader={GLOBE_WASH_FRAGMENT}
          uniforms={{ uOpacity: { value: 0.9 } }}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

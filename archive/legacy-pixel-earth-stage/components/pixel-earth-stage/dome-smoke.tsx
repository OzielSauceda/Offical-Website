"use client";

import { useEffect, useMemo, useRef } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { createSoftPuff } from "./textures";

const DOME_R = 1.82;
const TAU = Math.PI * 2;

type ZoneCfg = {
  count: number;
  latMin: number;
  latMax: number;
  maxScale: number;
  opacity: number;
  rise: number;
  upward: number;
  lateral: number;
  surfaceOffset: number;
  speedMin: number;
  speedMax: number;
  // fixed cool gray-blue per zone. no Earth color sampling — haze stays
  // neutral so the natural Earth palette on the globe reads correctly.
  color: [number, number, number];
  // light-catch fraction: small subset of puffs in this zone tint slightly
  // brighter to read as haze catching the rim/key light.
  lightCatchChance: number;
  lightCatchColor: [number, number, number];
};

// hex refs: top #b8c4d6, mid #aab7c8, base #b8c4d6, catch #eef2f8
const TOP_COLOR: [number, number, number] = [0.722, 0.769, 0.839];
const MID_COLOR: [number, number, number] = [0.667, 0.718, 0.784];
const BASE_COLOR: [number, number, number] = [0.722, 0.769, 0.839];
const CATCH_COLOR: [number, number, number] = [0.933, 0.949, 0.973];

const ZONES: ZoneCfg[] = [
  // zone 0 — top haze near the performer / globe peak. very sparse and
  // mostly transparent so there's no visible vertical column under the
  // ABOUT ring. light-catch sprites are the only ones that read at all.
  {
    count: 14,
    latMin: 0.78,
    latMax: 0.97,
    maxScale: 0.46,
    opacity: 0.06,
    rise: 0.24,
    upward: 0.42,
    lateral: 0.08,
    surfaceOffset: 0.07,
    speedMin: 0.045,
    speedMax: 0.085,
    color: TOP_COLOR,
    lightCatchChance: 0.22,
    lightCatchColor: CATCH_COLOR,
  },
  // zone 1 — background haze. low-opacity and very irregular so it
  // doesn't read as a gray wall behind the globe; just scattered puffs of
  // atmosphere that the side beams pass through. higher count adds depth
  // without raising per-puff opacity.
  {
    count: 58,
    latMin: 0.24,
    latMax: 0.64,
    maxScale: 0.78,
    opacity: 0.09,
    rise: 0.4,
    upward: 0.22,
    lateral: 0.22,
    surfaceOffset: 0.24,
    speedMin: 0.04,
    speedMax: 0.075,
    color: MID_COLOR,
    lightCatchChance: 0.1,
    lightCatchColor: CATCH_COLOR,
  },
  // zone 2 — low fog wrapping the lower globe rim, base ring, and floor.
  // this is the layer that actually embeds the globe into the stage, so
  // it stays the strongest — latMax stays tight so fog doesn't climb up
  // the globe shell.
  {
    count: 82,
    latMin: 0.02,
    latMax: 0.17,
    maxScale: 0.98,
    opacity: 0.32,
    rise: 0.46,
    upward: 0.08,
    lateral: 0.32,
    surfaceOffset: 0.04,
    speedMin: 0.035,
    speedMax: 0.065,
    color: BASE_COLOR,
    lightCatchChance: 0.18,
    lightCatchColor: CATCH_COLOR,
  },
];

type Props = {
  reducedMotion: boolean;
  isGlobeEnvironment: boolean;
};

type PuffCfg = {
  zone: number;
  phase: number;
  speed: number;
  maxScale: number;
  opacity: number;
  rise: number;
  upward: number;
  lateral: number;
  baseX: number;
  baseY: number;
  baseZ: number;
  // unit-ish vector along which this puff actually travels during its
  // lifetime. mostly upward + slight outward + small random lateral kick.
  // baked once at creation so each puff has its own "wind" and doesn't bob
  // around the anchor — it leaves it.
  driftDirX: number;
  driftDirY: number;
  driftDirZ: number;
  // curl direction (±1) so puffs arc rather than travel on a perfect line.
  curlSign: number;
  tangentX: number;
  tangentZ: number;
  // per-puff wobble frequency + phase for the small high-frequency air
  // tremor laid on top of the linear drift.
  wobbleFreq: number;
  wobblePhase: number;
  rotation: number;
  rotationDrift: number;
  scaleX: number;
  scaleY: number;
  color: [number, number, number];
};

export function DomeSmoke({
  reducedMotion,
  isGlobeEnvironment,
}: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const spriteRefs = useRef<(THREE.Sprite | null)[]>([]);
  const matRefs = useRef<(THREE.SpriteMaterial | null)[]>([]);
  const smokeTex = useMemo(() => createSoftPuff(), []);

  useEffect(() => () => smokeTex.dispose(), [smokeTex]);

  const puffs: PuffCfg[] = useMemo(() => {
    const arr: PuffCfg[] = [];
    for (let z = 0; z < ZONES.length; z++) {
      const zone = ZONES[z]!;
      for (let i = 0; i < zone.count; i++) {
        const a = ((i * 137 + z * 53 + 23) % 1000) / 1000;
        const b = ((i * 211 + z * 71 + 47) % 1000) / 1000;
        const c = ((i * 53 + z * 23 + 11) % 1000) / 1000;
        const d = ((i * 97 + z * 181 + 29) % 1000) / 1000;
        const e = ((i * 191 + z * 113 + 19) % 1000) / 1000;
        const f = ((i * 263 + z * 89 + 37) % 1000) / 1000;
        // jitter the polar lat slightly so puffs don't fall on the zone's
        // exact latitude band — breaks horizontal banding.
        const latJitter = (c - 0.5) * 0.07;
        const lat = Math.max(
          0,
          Math.min(1, zone.latMin + a * (zone.latMax - zone.latMin) + latJitter),
        );
        const theta = lat * Math.PI * 0.5;
        const ringR = DOME_R * Math.cos(theta);
        const ringY = DOME_R * Math.sin(theta);
        // every zone excludes a wedge directly facing the camera so
        // no puff projects onto the globe's front face. mid/top use a
        // larger gap (~75°) because they sit at globe-equator height;
        // base uses a smaller gap (~48°) so we keep good left/right
        // coverage along the floor.
        const frontGap = z === 2 ? 0.42 : 0.65;
        const arcStart = Math.PI / 2 + frontGap;
        const arcSpan = TAU - 2 * frontGap;
        // angular jitter is wider for the base zone so the side puffs
        // spread along the floor as a diffuse cloud rather than clumping
        // into two visible plumes at left and right.
        const angleJitter = z === 2 ? 0.85 : 0.45;
        const u = (i / zone.count + (b - 0.5) * 0.03) % 1;
        const angle =
          arcStart + u * arcSpan + (c - 0.5) * angleJitter;
        const cx = Math.cos(angle);
        const cz = Math.sin(angle);
        const nx = cx * Math.cos(theta);
        const ny = Math.sin(theta);
        const nz = cz * Math.cos(theta);
        // per-puff radial offset jitter — some puffs sit closer to the
        // dome surface, some drift further into the surrounding air.
        // makes the haze read as a depth field instead of a hugging shell.
        // base zone uses a wider radial spread so the left/right side
        // smoke blends into the surrounding floor haze rather than
        // forming distinct plumes pinned to the ring radius.
        const radialJitterScale = z === 2 ? 0.65 : 0.32;
        const radialJitter = (f - 0.5) * radialJitterScale;
        const surfaceOffset = Math.max(0, zone.surfaceOffset + radialJitter);
        const isTop = z === 0;
        const isMid = z === 1;
        // vary scale + aspect per zone so the puffs don't read as
        // repeated identical sprites. top puffs are taller (rising
        // column), mid puffs are wider (background haze), base puffs
        // are very wide and short (low fog hugging the floor).
        const scaleX = isTop
          ? 0.55 + b * 0.32
          : isMid
            ? 1.15 + b * 0.46
            : 1.55 + b * 0.55;
        const scaleY = isTop
          ? 1.35 + c * 0.7
          : isMid
            ? 0.74 + c * 0.32
            : 0.5 + c * 0.22;
        // small fraction of puffs catch the rim/key light and tint a touch
        // brighter — gives the haze depth instead of one flat tone.
        const color: [number, number, number] =
          e < zone.lightCatchChance ? zone.lightCatchColor : zone.color;

        // build the per-puff drift direction. start from the outward
        // dome normal (so smoke flows away from the dome shell), bias
        // strongly upward (warm air rising), add a small random lateral
        // kick so puffs don't all rise in parallel.
        const g = ((i * 311 + z * 127 + 5) % 1000) / 1000;
        const h = ((i * 79 + z * 233 + 41) % 1000) / 1000;
        const lateralKickX = -cz * (g - 0.5) * 0.7;
        const lateralKickZ = cx * (g - 0.5) * 0.7;
        // base zone fog rises mostly straight up + spreads outward
        // along the floor; mid/top puffs rise more diagonally.
        const upBias = isTop ? 0.55 : isMid ? 0.85 : 1.05;
        const outBias = isTop ? 0.55 : isMid ? 0.45 : 0.3;
        const rawX = nx * outBias + lateralKickX;
        const rawY = ny * outBias + upBias;
        const rawZ = nz * outBias + lateralKickZ;
        const mag = Math.hypot(rawX, rawY, rawZ) || 1;

        arr.push({
          zone: z,
          phase: d,
          // wider speed variance per puff so lifetimes don't sync up.
          // shorter lifetimes for top zone so the top haze churns more
          // visibly rather than holding mid-cycle.
          speed:
            (zone.speedMin + b * (zone.speedMax - zone.speedMin)) *
            (0.7 + d * 0.9),
          maxScale: zone.maxScale * (0.55 + c * 0.85),
          opacity: zone.opacity * (0.35 + b * 1.05),
          // travel distance over a full lifetime — longer than before so
          // the motion actually reads. base/mid puffs travel ~0.7–1.0
          // world units across the cycle.
          rise: zone.rise * (1.4 + d * 0.6),
          upward: zone.upward * (0.8 + a * 0.34),
          lateral: zone.lateral * (0.55 + c * 0.9),
          baseX: cx * ringR + nx * surfaceOffset,
          baseY: ringY + ny * surfaceOffset,
          baseZ: cz * ringR + nz * surfaceOffset,
          driftDirX: rawX / mag,
          driftDirY: rawY / mag,
          driftDirZ: rawZ / mag,
          curlSign: h < 0.5 ? -1 : 1,
          tangentX: -cz,
          tangentZ: cx,
          // wobble frequency well below 1Hz, varied per puff so the
          // micro-tremor on each puff is on its own clock.
          wobbleFreq: 0.35 + e * 0.45,
          wobblePhase: f * TAU,
          rotation: c * TAU,
          // per-puff sprite rotation rate (rad/s) so puffs slowly turn
          // independently. tiny — about ±2°/sec.
          rotationDrift: (g - 0.5) * 0.07,
          scaleX,
          scaleY,
          color,
        });
      }
    }
    return arr;
  }, []);

  useFrame(() => {
    const grp = groupRef.current;
    if (!grp) return;
    grp.visible = isGlobeEnvironment;
    if (!isGlobeEnvironment) return;

    // smoke is world-anchored — does NOT rotate with the globe. concert
    // haze stays put in the stage air while the Earth texture spins under
    // it. targetRotationRef intentionally unread here.

    const t = performance.now() / 1000;
    for (let i = 0; i < puffs.length; i++) {
      const cfg = puffs[i]!;
      const sprite = spriteRefs.current[i];
      const mat = matRefs.current[i];
      if (!sprite || !mat) continue;

      // each puff has a sawtooth lifecycle 0→1. it spawns at baseX/Y/Z,
      // drifts away along its own drift vector, expands and fades, and
      // respawns. fadeIn/fadeOut hide the respawn jump.
      const cycle = reducedMotion ? 0.42 : (t * cfg.speed + cfg.phase) % 1;
      const fadeIn = Math.min(1, cycle / 0.18);
      const fadeOut = Math.pow(Math.max(0, 1 - (cycle - 0.18) / 0.82), 1.6);
      const envelope = fadeIn * fadeOut;

      // smoke expands as it ages — classic real-world behavior. starts
      // small at spawn, blooms to full size near end of life.
      const swell = 0.28 + cycle * 1.05;
      const scale = Math.max(0.12, cfg.maxScale * swell);

      // distance traveled along the puff's drift direction. linear in
      // cycle, so a puff visibly moves at a steady pace from spawn point
      // outward — not bobbing around the anchor.
      const travelDist = cycle * cfg.rise;

      // curl — tangential offset that grows quadratically and never
      // reverses. each puff curls one direction (curlSign), so the field
      // reads as turbulent rather than oscillating.
      const curl = cycle * cycle * cfg.lateral * cfg.curlSign;

      // micro-wobble — tiny non-repeating sine on each axis using
      // incommensurate frequencies. low amplitude (~0.025 world units)
      // so it reads as air tremor, not a bob.
      const wob = reducedMotion ? 0 : 1;
      const wf = cfg.wobbleFreq;
      const wp = cfg.wobblePhase;
      const wobbleX =
        wob *
        (Math.sin(t * wf + wp) * 0.022 +
          Math.sin(t * wf * 1.73 + wp * 1.4) * 0.014);
      const wobbleY =
        wob *
        (Math.sin(t * wf * 0.81 + wp + 1.3) * 0.012 +
          Math.sin(t * wf * 1.31 + wp * 0.7) * 0.008);
      const wobbleZ =
        wob *
        (Math.cos(t * wf * 1.21 + wp + 0.5) * 0.022 +
          Math.sin(t * wf * 0.93 + wp * 1.1) * 0.014);

      // gentle opacity shimmer on its own slow clock per puff
      const breath = reducedMotion
        ? 1
        : 1 + Math.sin(t * 0.27 + cfg.phase * TAU + cfg.zone * 0.7) * 0.08;

      sprite.scale.set(scale * cfg.scaleX, scale * cfg.scaleY, 1);
      sprite.position.x =
        cfg.baseX +
        cfg.driftDirX * travelDist +
        cfg.tangentX * curl +
        wobbleX;
      sprite.position.y =
        cfg.baseY + cfg.driftDirY * travelDist + cycle * cfg.upward + wobbleY;
      sprite.position.z =
        cfg.baseZ +
        cfg.driftDirZ * travelDist +
        cfg.tangentZ * curl +
        wobbleZ;

      mat.opacity = cfg.opacity * envelope * breath;
      // sprite rotation drifts on its own slow clock per puff — gives
      // each puff a unique slow spin without obvious tumble.
      mat.rotation =
        cfg.rotation + cycle * 0.65 + (reducedMotion ? 0 : t * cfg.rotationDrift);
    }
  });

  return (
    <group ref={groupRef}>
      {puffs.map((p, i) => (
        <sprite
          key={i}
          ref={(el) => {
            spriteRefs.current[i] = el;
          }}
          position={[p.baseX, p.baseY, p.baseZ]}
          scale={[0.18, 0.18, 1]}
          renderOrder={4}
        >
          <spriteMaterial
            ref={(el) => {
              matRefs.current[i] = el;
            }}
            map={smokeTex}
            // fixed per-puff cool gray-blue (or rare light-catch). normal
            // blending so stacked sprites don't blow toward white.
            // depthTest on for every zone so the opaque globe occludes
            // any puff that sits behind it — kills "smoke rendering
            // through globe" artifacts. depthWrite stays off so smoke
            // stays soft.
            color={
              new THREE.Color(p.color[0], p.color[1], p.color[2])
            }
            transparent
            opacity={0}
            blending={THREE.NormalBlending}
            depthWrite={false}
            depthTest
            toneMapped={false}
          />
        </sprite>
      ))}
    </group>
  );
}

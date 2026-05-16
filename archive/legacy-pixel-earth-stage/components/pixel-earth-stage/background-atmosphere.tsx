"use client";

import { useEffect, useMemo, useRef } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { createSoftPuff } from "./textures";

// purely-background layer: far nebula sprites, brighter cluster stars,
// and slow drifting dust. sits behind the globe stage to add depth and
// atmospheric mood without competing for attention.

const SMALL_STAR_COUNT = 220;
const BRIGHT_STAR_COUNT = 40;
const DUST_COUNT = 64;

type Vec3 = [number, number, number];

// cluster anchors — stars bias toward these instead of uniform random, so
// the field reads as a real sky with denser/sparser regions instead of an
// even dot grid.
const CLUSTER_ANCHORS: Vec3[] = [
  [-14, 8, -22],
  [16, 11, -20],
  [-4, -4, -26],
  [10, 5, -28],
  [0, 16, -24],
  [-18, -2, -18],
];

// generate star positions with a clustered distribution: most stars sit
// near a cluster anchor with a tight jitter; a small fraction scatter
// uniformly across the back hemisphere so the field still feels full.
function makeStarPositions(
  count: number,
  clusterChance: number,
  clusterTightness: number,
  rng: () => number,
): Float32Array {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    if (rng() < clusterChance) {
      const a =
        CLUSTER_ANCHORS[Math.floor(rng() * CLUSTER_ANCHORS.length)] ??
        CLUSTER_ANCHORS[0]!;
      out[i * 3] = a[0] + (rng() - 0.5) * clusterTightness;
      out[i * 3 + 1] = a[1] + (rng() - 0.5) * clusterTightness * 0.8;
      out[i * 3 + 2] = a[2] + (rng() - 0.5) * clusterTightness * 0.6;
    } else {
      // wide back-hemisphere scatter — clamp z to negative so background
      // stars stay behind the globe stage, not in front of the camera.
      const phi = rng() * Math.PI * 2;
      const cosTheta = rng() * 2 - 1;
      const sinTheta = Math.sqrt(Math.max(0, 1 - cosTheta * cosTheta));
      const r = 22 + rng() * 14;
      out[i * 3] = r * sinTheta * Math.cos(phi);
      out[i * 3 + 1] = r * sinTheta * Math.sin(phi) * 0.7;
      out[i * 3 + 2] = -Math.abs(r * cosTheta) - 6;
    }
  }
  return out;
}

// deterministic seeded PRNG so positions are stable across mounts and
// don't shift between client-side renders.
function seededRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

export function BackgroundAtmosphere({
  reducedMotion,
}: {
  reducedMotion: boolean;
}) {
  const dustRef = useRef<THREE.Points>(null);
  // wraps the small star layer + nebula sprites. rotated slowly so the
  // far backdrop drifts past the camera. bright stars sit OUTSIDE this
  // group so they can move on their own per-star velocities — gives the
  // sky individual "flying" stars instead of just one rigid rotation.
  const skyRef = useRef<THREE.Group>(null);
  const brightStarsRef = useRef<THREE.Points>(null);
  const brightStarMatRef = useRef<THREE.PointsMaterial>(null);
  const smallStarMatRef = useRef<THREE.PointsMaterial>(null);

  const puffTex = useMemo(() => createSoftPuff(), []);
  useEffect(() => () => puffTex.dispose(), [puffTex]);

  // two star layers — many small dim stars + a handful of brighter stars
  // for the eye-catching highlights. clusters drive the structure.
  const smallStars = useMemo(
    () => makeStarPositions(SMALL_STAR_COUNT, 0.62, 5.8, seededRng(0x5a1d)),
    [],
  );
  // bright stars use a *mutable* position buffer so the per-frame drift
  // loop can write into it. memoized once at mount so the initial layout
  // is deterministic.
  const brightStars = useMemo(
    () => makeStarPositions(BRIGHT_STAR_COUNT, 0.78, 4.6, seededRng(0xb71a)),
    [],
  );

  // per-bright-star velocities. each star drifts on its own slow vector
  // so the field reads as many independently moving stars instead of a
  // rotating block. velocities stay small so motion is calm, not
  // distracting. seeded so positions are stable.
  const brightStarVel = useMemo(() => {
    const rng = seededRng(0x9e3f);
    const arr = new Float32Array(BRIGHT_STAR_COUNT * 3);
    for (let i = 0; i < BRIGHT_STAR_COUNT; i++) {
      arr[i * 3] = (rng() - 0.5) * 0.14;
      arr[i * 3 + 1] = (rng() - 0.5) * 0.09;
      arr[i * 3 + 2] = (rng() - 0.5) * 0.14;
    }
    return arr;
  }, []);

  // dust particles drifting in front of the back-stage and behind the
  // globe — adds a faint sense of air without thickening the smoke.
  const dustPositions = useMemo(() => {
    const rng = seededRng(0xd057);
    const arr = new Float32Array(DUST_COUNT * 3);
    for (let i = 0; i < DUST_COUNT; i++) {
      arr[i * 3] = (rng() - 0.5) * 14;
      arr[i * 3 + 1] = -1.5 + rng() * 6.5;
      arr[i * 3 + 2] = -7 - rng() * 8;
    }
    return arr;
  }, []);
  const dustPhases = useMemo(() => {
    const rng = seededRng(0xd158);
    const arr = new Float32Array(DUST_COUNT * 2);
    for (let i = 0; i < DUST_COUNT; i++) {
      arr[i * 2] = rng() * Math.PI * 2;
      arr[i * 2 + 1] = 0.04 + rng() * 0.07;
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    if (reducedMotion) return;
    const t = performance.now() / 1000;

    // slow starfield drift — rotate the small-star + nebula group on Y
    // so the far backdrop sweeps gradually past the camera. ~1.7°/sec —
    // perceptible motion, not spin.
    const sky = skyRef.current;
    if (sky) sky.rotation.y += delta * 0.03;

    // per-star drift on the bright layer. each star travels along its
    // own velocity vector; when one wanders outside the back-hemisphere
    // bounding box it wraps to the opposite face so the field stays
    // dense without ever feeling like the same loop.
    const bs = brightStarsRef.current;
    if (bs) {
      const pos = bs.geometry.attributes.position!.array as Float32Array;
      for (let i = 0; i < BRIGHT_STAR_COUNT; i++) {
        const vx = brightStarVel[i * 3] ?? 0;
        const vy = brightStarVel[i * 3 + 1] ?? 0;
        const vz = brightStarVel[i * 3 + 2] ?? 0;
        let x = (pos[i * 3] ?? 0) + vx * delta;
        let y = (pos[i * 3 + 1] ?? 0) + vy * delta;
        let z = (pos[i * 3 + 2] ?? 0) + vz * delta;
        if (x > 24) x = -24;
        else if (x < -24) x = 24;
        if (y > 18) y = -18;
        else if (y < -18) y = 18;
        if (z > -6) z = -36;
        else if (z < -36) z = -6;
        pos[i * 3] = x;
        pos[i * 3 + 1] = y;
        pos[i * 3 + 2] = z;
      }
      bs.geometry.attributes.position!.needsUpdate = true;
    }

    // global twinkle: oscillate star material opacity on slow
    // off-frequency sines so the field shimmers gently.
    const bm = brightStarMatRef.current;
    if (bm) bm.opacity = 0.85 + Math.sin(t * 0.6) * 0.1;
    const sm = smallStarMatRef.current;
    if (sm) sm.opacity = 0.8 + Math.sin(t * 0.43 + 1.4) * 0.08;

    // dust drift
    const dust = dustRef.current;
    if (!dust) return;
    const arr = dust.geometry.attributes.position!.array as Float32Array;
    for (let i = 0; i < DUST_COUNT; i++) {
      const ph = dustPhases[i * 2] ?? 0;
      const sp = dustPhases[i * 2 + 1] ?? 0.05;
      // tiny horizontal sway + slow vertical rise. respawns at bottom
      // once a particle clears the top of the band.
      arr[i * 3] = (arr[i * 3] ?? 0) + Math.sin(t * sp + ph) * 0.0009;
      const y = (arr[i * 3 + 1] ?? 0) + sp * 0.003;
      arr[i * 3 + 1] = y > 6 ? -1.5 : y;
    }
    dust.geometry.attributes.position!.needsUpdate = true;
  });

  return (
    <group>
      {/* rotating sky layer — nebula clouds + both star layers ride this
          group so the entire background drifts together. */}
      <group ref={skyRef}>
        {/* far nebula clouds — three large soft sprites in navy/indigo/
            dusty purple at very low opacity. additive blending so they
            warm the back of the scene without producing visible blobs. */}
        <sprite position={[-9, 4, -22]} scale={22}>
          <spriteMaterial
            map={puffTex}
            color="#3a4a96"
            transparent
            opacity={0.16}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
        <sprite position={[11, 6, -24]} scale={24}>
          <spriteMaterial
            map={puffTex}
            color="#2a3470"
            transparent
            opacity={0.14}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
        <sprite position={[-2, -3, -26]} scale={20}>
          <spriteMaterial
            map={puffTex}
            color="#4a3e7e"
            transparent
            opacity={0.1}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </sprite>

        {/* small dim star layer — uniform tiny size, very high count,
            sits deep behind the scene for general fill. */}
        <points renderOrder={-2}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={smallStars}
              count={SMALL_STAR_COUNT}
              itemSize={3}
              args={[smallStars, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            ref={smallStarMatRef}
            size={0.075}
            color="#aab4d8"
            map={puffTex}
            transparent
            opacity={0.8}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            sizeAttenuation
          />
        </points>

      </group>

      {/* bright star highlights — sit OUTSIDE the rotating sky group so
          each star can fly on its own per-star velocity. positions are
          updated every frame; stars wrap at the bounds of the back
          hemisphere so the field stays full without obvious loop seams. */}
      <points ref={brightStarsRef} renderOrder={-2}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={brightStars}
            count={BRIGHT_STAR_COUNT}
            itemSize={3}
            args={[brightStars, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          ref={brightStarMatRef}
          size={0.22}
          color="#e8ecff"
          map={puffTex}
          transparent
          opacity={0.85}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>

      {/* slow drifting dust — fine cool-blue particles in the mid
          distance for atmospheric depth between the globe and the
          back nebula. lives outside the rotating sky group so its
          drift reads as foreground air, not part of the sky spin. */}
      <points ref={dustRef} renderOrder={-1}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={dustPositions}
            count={DUST_COUNT}
            itemSize={3}
            args={[dustPositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.05}
          color="#c8d4ec"
          map={puffTex}
          transparent
          opacity={0.32}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

"use client";

import { useMemo, useRef } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { getSoftPuff } from "@/lib/three-helpers/soft-puff";

const SMALL_STAR_COUNT = 220;
const BRIGHT_STAR_COUNT = 40;
const DUST_COUNT = 64;

type Vec3 = [number, number, number];

const CLUSTER_ANCHORS: Vec3[] = [
  [-14, 8, -22],
  [16, 11, -20],
  [-4, -4, -26],
  [10, 5, -28],
  [0, 16, -24],
  [-18, -2, -18],
];

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

function seededRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

export function SpaceBackground({
  reducedMotion,
}: {
  reducedMotion: boolean;
}) {
  const dustRef = useRef<THREE.Points>(null);
  const skyRef = useRef<THREE.Group>(null);
  const brightStarsRef = useRef<THREE.Points>(null);
  const brightStarMatRef = useRef<THREE.PointsMaterial>(null);
  const smallStarMatRef = useRef<THREE.PointsMaterial>(null);

  const puffTex = getSoftPuff();

  const smallStars = useMemo(
    () => makeStarPositions(SMALL_STAR_COUNT, 0.62, 5.8, seededRng(0x5a1d)),
    [],
  );
  const brightStars = useMemo(
    () => makeStarPositions(BRIGHT_STAR_COUNT, 0.78, 4.6, seededRng(0xb71a)),
    [],
  );

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

    const sky = skyRef.current;
    if (sky) sky.rotation.y += delta * 0.03;

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

    const bm = brightStarMatRef.current;
    if (bm) bm.opacity = 0.85 + Math.sin(t * 0.6) * 0.1;
    const sm = smallStarMatRef.current;
    if (sm) sm.opacity = 0.8 + Math.sin(t * 0.43 + 1.4) * 0.08;

    const dust = dustRef.current;
    if (!dust) return;
    const arr = dust.geometry.attributes.position!.array as Float32Array;
    for (let i = 0; i < DUST_COUNT; i++) {
      const ph = dustPhases[i * 2] ?? 0;
      const sp = dustPhases[i * 2 + 1] ?? 0.05;
      arr[i * 3] = (arr[i * 3] ?? 0) + Math.sin(t * sp + ph) * 0.0009;
      const y = (arr[i * 3 + 1] ?? 0) + sp * 0.003;
      arr[i * 3 + 1] = y > 6 ? -1.5 : y;
    }
    dust.geometry.attributes.position!.needsUpdate = true;
  });

  return (
    <group>
      <group ref={skyRef}>
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
            color="#8eaccc"
            map={puffTex}
            transparent
            opacity={0.8}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            sizeAttenuation
          />
        </points>
      </group>

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
          color="#eaf6ff"
          map={puffTex}
          transparent
          opacity={0.85}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>

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

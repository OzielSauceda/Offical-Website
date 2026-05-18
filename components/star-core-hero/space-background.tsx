"use client";

import { useMemo, useRef } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { getSoftPuff } from "@/lib/three-helpers/soft-puff";

const SMALL_STAR_COUNT = 160;
const BRIGHT_STAR_COUNT = 28;
const ACCENT_STAR_COUNT = 14;
const WARM_SPARK_COUNT = 12;
const DUST_COUNT = 56;

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
    () => makeStarPositions(SMALL_STAR_COUNT, 0.22, 5.8, seededRng(0x5a1d)),
    [],
  );
  const brightStars = useMemo(
    () => makeStarPositions(BRIGHT_STAR_COUNT, 0.3, 4.6, seededRng(0xb71a)),
    [],
  );
  // sparse accent stars — slightly larger and a touch bluer, sprinkled
  // across the field for natural variation
  const accentStars = useMemo(
    () => makeStarPositions(ACCENT_STAR_COUNT, 0.18, 4.2, seededRng(0xc04a)),
    [],
  );
  // sparse tiny warm sparks — gold/peach pinpoints scattered across the
  // background to add subtle premium atmosphere. kept very small and few.
  const warmSparks = useMemo(
    () => makeStarPositions(WARM_SPARK_COUNT, 0.1, 6, seededRng(0x77a3)),
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

  // edge vignette — triangle fan with RGBA vertex colors so the
  // center is fully transparent and the corners are opaque dark
  // navy. drawn last with depthTest off so it darkens the corners
  // of the framebuffer regardless of what sits behind it.
  const vignetteGeometry = useMemo(() => {
    const segments = 80;
    const radiusX = 26;
    const radiusY = 18;
    const positions: number[] = [0, 0, 0];
    const colors: number[] = [0, 0, 0, 0];
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * Math.PI * 2;
      positions.push(Math.cos(t) * radiusX, Math.sin(t) * radiusY, 0);
      colors.push(0.0, 0.0, 0.02, 1.0);
    }
    const indices: number[] = [];
    for (let i = 1; i <= segments; i++) indices.push(0, i, i + 1);
    const geom = new THREE.BufferGeometry();
    geom.setIndex(indices);
    geom.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    // itemSize=4 enables per-vertex alpha in three.js
    geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 4));
    return geom;
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
      {/* nebula wisps — left and lower-right only, never behind the
          star. fog={false} is critical: scene fog at far=11 would
          otherwise fully erase anything this distant. opacities are
          tuned for visible-but-subtle on a normal desktop screenshot. */}
      <sprite position={[-15.5, 0.8, -18]} scale={[17, 24, 1]}>
        <spriteMaterial
          map={puffTex}
          color="#3b577e"
          transparent
          opacity={0.48}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
          fog={false}
          rotation={0.18}
        />
      </sprite>

      <sprite position={[15.5, -4.2, -19]} scale={[19, 15, 1]}>
        <spriteMaterial
          map={puffTex}
          color="#2f4a72"
          transparent
          opacity={0.42}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
          fog={false}
          rotation={-0.5}
        />
      </sprite>

      {/* a slim diagonal accent wisp drifting in from the right */}
      <sprite position={[12, 6.5, -21]} scale={[13, 8.5, 1]}>
        <spriteMaterial
          map={puffTex}
          color="#476890"
          transparent
          opacity={0.34}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
          fog={false}
          rotation={-0.9}
        />
      </sprite>

      {/* atmospheric haze behind the star — subtle, soft, narrower
          than the star silhouette and well behind the star plane
          so it reads as depth, never as a disc. */}
      <sprite position={[0, 1.85, -1.4]} scale={[2.2, 1.9, 1]}>
        <spriteMaterial
          map={puffTex}
          color="#3a5278"
          transparent
          opacity={0.1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
          fog={false}
        />
      </sprite>

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
            size={0.062}
            color="#d6e2f2"
            map={puffTex}
            transparent
            opacity={0.78}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            sizeAttenuation
          />
        </points>

        <points renderOrder={-2}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={accentStars}
              count={ACCENT_STAR_COUNT}
              itemSize={3}
              args={[accentStars, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.13}
            color="#a8c8ec"
            map={puffTex}
            transparent
            opacity={0.78}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            sizeAttenuation
          />
        </points>

        <points renderOrder={-2}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={warmSparks}
              count={WARM_SPARK_COUNT}
              itemSize={3}
              args={[warmSparks, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.11}
            color="#ffc890"
            map={puffTex}
            transparent
            opacity={0.7}
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
          size={0.18}
          color="#eef6ff"
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

      {/* edge vignette — drawn last with depthTest off so it sits
          on top of stars, nebula, and any background detail at the
          corners while leaving the center untouched. */}
      <mesh
        position={[0, 1.5, -2]}
        geometry={vignetteGeometry}
        renderOrder={9999}
      >
        <meshBasicMaterial
          vertexColors
          transparent
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
          fog={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

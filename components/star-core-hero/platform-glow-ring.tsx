"use client";

import { useRef } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import {
  RIM_GLOW_BREATH,
  RIM_GLOW_OPACITY,
  rimGlowBeat,
} from "@/lib/three-helpers/rim-glow";

const R_PLATFORM = 2.36;
const R_BASE = 1.82;
const R_CORE = R_BASE + 0.008;
const R_HOT = R_BASE + 0.02;
const R_HALO = R_BASE + 0.05;
const R_BLOOM = R_BASE + 0.14;
const R_FLAT_IN = R_BASE + 0.004;
const R_FLAT_OUT = R_BASE + 0.07;
const R_SPILL_IN = R_BASE + 0.22;
const R_SPILL_OUT = R_PLATFORM + 0.05;

export function PlatformGlowRing({ reducedMotion }: { reducedMotion: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.MeshBasicMaterial>(null);
  const hotRef = useRef<THREE.MeshBasicMaterial>(null);
  const flatRef = useRef<THREE.MeshBasicMaterial>(null);
  const haloRef = useRef<THREE.MeshBasicMaterial>(null);
  const bloomRef = useRef<THREE.MeshBasicMaterial>(null);

  // star should remain the brightest element. scale the platform's
  // animated rings down a touch so it stays crisp without competing.
  const DIM = 0.54;

  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const beat = rimGlowBeat(clock.getElapsedTime());
    if (haloRef.current)
      haloRef.current.opacity =
        (RIM_GLOW_OPACITY.halo - 0.02 + RIM_GLOW_BREATH.halo * beat) * DIM;
    if (bloomRef.current)
      bloomRef.current.opacity =
        (RIM_GLOW_OPACITY.bloom - 0.02 + RIM_GLOW_BREATH.bloom * beat) * DIM;
    if (hotRef.current)
      hotRef.current.opacity =
        (RIM_GLOW_OPACITY.hot + RIM_GLOW_BREATH.hot * beat) * DIM;
    if (flatRef.current)
      flatRef.current.opacity =
        (RIM_GLOW_OPACITY.flat - 0.02 + RIM_GLOW_BREATH.flat * beat) * DIM;
  });

  return (
    <group ref={groupRef} position={[0, -0.01, 0]}>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.022, 0]}>
        <ringGeometry args={[R_SPILL_IN, R_SPILL_OUT, 160]} />
        <meshBasicMaterial
          color="#bff3ff"
          toneMapped={false}
          transparent
          opacity={0.09}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* warm amber spill picks up the lower-left rim from the reference */}
      <mesh
        rotation-x={-Math.PI / 2}
        rotation-z={Math.PI * 0.75}
        position={[0, -0.018, 0]}
      >
        <ringGeometry args={[R_SPILL_IN, R_SPILL_OUT, 160, 1, 0, Math.PI * 0.55]} />
        <meshBasicMaterial
          color="#f0a86a"
          toneMapped={false}
          transparent
          opacity={0.06}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh rotation-x={-Math.PI / 2} renderOrder={5}>
        <torusGeometry args={[R_BLOOM, 0.11, 12, 220]} />
        <meshBasicMaterial
          ref={bloomRef}
          color="#4ad9e8"
          toneMapped={false}
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh rotation-x={-Math.PI / 2} renderOrder={6}>
        <torusGeometry args={[R_HALO, 0.04, 14, 240]} />
        <meshBasicMaterial
          ref={haloRef}
          color="#8eecf2"
          toneMapped={false}
          transparent
          opacity={0.48}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh rotation-x={-Math.PI / 2} renderOrder={7}>
        <torusGeometry args={[R_HOT, 0.018, 14, 260]} />
        <meshBasicMaterial
          ref={hotRef}
          color="#a6f0ff"
          toneMapped={false}
          transparent
          opacity={0.64}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh rotation-x={-Math.PI / 2} position={[0, 0.001, 0]} renderOrder={8}>
        <ringGeometry args={[R_FLAT_IN, R_FLAT_OUT, 200]} />
        <meshBasicMaterial
          ref={flatRef}
          color="#bff3ff"
          toneMapped={false}
          transparent
          opacity={0.56}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh rotation-x={-Math.PI / 2} renderOrder={9}>
        <torusGeometry args={[R_CORE, 0.0105, 14, 260]} />
        <meshBasicMaterial
          ref={coreRef}
          color="#d6f7ff"
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

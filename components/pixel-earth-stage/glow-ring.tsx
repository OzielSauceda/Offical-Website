"use client";

import { useRef } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { RIM_GLOW_BREATH, RIM_GLOW_OPACITY, rimGlowBeat } from "./rim-glow";

type Props = {
  reducedMotion: boolean;
  isGlobeEnvironment: boolean;
};

// dome radius is 1.82. all rim layers sit just outside that perimeter and
// rely on the dome's own depth to mask the back half — no depthTest-off
// arcs, which were producing vertical streaks where the partial torus
// endpoints clipped through the dome silhouette on the sides.
const DOME_R = 1.82;
const R_PLATFORM = 2.36;
const R_CORE = DOME_R + 0.008;
const R_HOT = DOME_R + 0.02;
const R_HALO = DOME_R + 0.05;
const R_BLOOM = DOME_R + 0.14;
const R_FLAT_IN = DOME_R + 0.004;
const R_FLAT_OUT = DOME_R + 0.07;
const R_SPILL_IN = DOME_R + 0.22;
const R_SPILL_OUT = R_PLATFORM + 0.05;
const R_SPILL_FAR_OUT = R_PLATFORM + 0.85;

export function GlowRing({ reducedMotion, isGlobeEnvironment }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.MeshBasicMaterial>(null);
  const hotRef = useRef<THREE.MeshBasicMaterial>(null);
  const flatRef = useRef<THREE.MeshBasicMaterial>(null);
  const haloRef = useRef<THREE.MeshBasicMaterial>(null);
  const bloomRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.visible = isGlobeEnvironment;
    if (!isGlobeEnvironment || reducedMotion) return;
    // very subtle steady breathing — stage light, not a heartbeat
    const beat = rimGlowBeat(clock.getElapsedTime());
    if (haloRef.current)
      haloRef.current.opacity = RIM_GLOW_OPACITY.halo - 0.02 + RIM_GLOW_BREATH.halo * beat;
    if (bloomRef.current)
      bloomRef.current.opacity =
        RIM_GLOW_OPACITY.bloom - 0.02 + RIM_GLOW_BREATH.bloom * beat;
    if (hotRef.current)
      hotRef.current.opacity = RIM_GLOW_OPACITY.hot + RIM_GLOW_BREATH.hot * beat;
    if (flatRef.current)
      flatRef.current.opacity =
        RIM_GLOW_OPACITY.flat - 0.02 + RIM_GLOW_BREATH.flat * beat;
  });

  return (
    <group ref={groupRef} position={[0, -0.01, 0]}>
      {/* dark platform disc — plinth the rim sits on */}
      <mesh position={[0, -0.085, 0]}>
        <cylinderGeometry args={[R_PLATFORM, R_PLATFORM, 0.1, 160]} />
        <meshStandardMaterial
          color="#0b0c16"
          roughness={0.78}
          metalness={0.12}
          transparent
          opacity={0.96}
        />
      </mesh>

      {/* very wide soft spill on the platform — kept dim so it never competes
          with the rim. two stacked low-opacity rings fade outward */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.022, 0]}>
        <ringGeometry args={[R_SPILL_IN, R_SPILL_OUT, 160]} />
        <meshBasicMaterial
          color="#f4e2c0"
          toneMapped={false}
          transparent
          opacity={0.09}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]}>
        <ringGeometry args={[R_PLATFORM * 0.9, R_SPILL_FAR_OUT, 160]} />
        <meshBasicMaterial
          color="#fff1d2"
          toneMapped={false}
          transparent
          opacity={0.04}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* outer bloom torus — soft warm halo blossoming out from the filament.
          full ring, normal depth — back half is naturally hidden by the dome */}
      <mesh rotation-x={-Math.PI / 2} renderOrder={5}>
        <torusGeometry args={[R_BLOOM, 0.11, 12, 220]} />
        <meshBasicMaterial
          ref={bloomRef}
          color="#ffdc92"
          toneMapped={false}
          transparent
          opacity={0.26}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* tight creamy halo against the core */}
      <mesh rotation-x={-Math.PI / 2} renderOrder={6}>
        <torusGeometry args={[R_HALO, 0.04, 14, 240]} />
        <meshBasicMaterial
          ref={haloRef}
          color="#fff1c8"
          toneMapped={false}
          transparent
          opacity={0.62}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* hot bloom right against the core — thin layer of additive white that
          sells the rim as a real light source */}
      <mesh rotation-x={-Math.PI / 2} renderOrder={7}>
        <torusGeometry args={[R_HOT, 0.018, 14, 260]} />
        <meshBasicMaterial
          ref={hotRef}
          color="#fff6d0"
          toneMapped={false}
          transparent
          opacity={0.82}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* flat warm ring lying on the platform plane right against the dome.
          gives the rim a clean horizontal ellipse from the camera angle and
          lights the seam without climbing any of the dome's vertical surface */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.001, 0]} renderOrder={8}>
        <ringGeometry args={[R_FLAT_IN, R_FLAT_OUT, 200]} />
        <meshBasicMaterial
          ref={flatRef}
          color="#fff4cc"
          toneMapped={false}
          transparent
          opacity={0.72}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* warm-white core filament — thin, opaque, full ring. naturally only
          visible across the front half because the dome occludes the back */}
      <mesh rotation-x={-Math.PI / 2} renderOrder={9}>
        <torusGeometry args={[R_CORE, 0.0105, 14, 260]} />
        <meshBasicMaterial
          ref={coreRef}
          color="#fff8df"
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

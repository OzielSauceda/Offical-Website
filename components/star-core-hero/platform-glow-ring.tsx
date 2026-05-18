"use client";

import { useMemo, useRef } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import {
  RIM_GLOW_BREATH,
  RIM_GLOW_OPACITY,
  rimGlowBeat,
} from "@/lib/three-helpers/rim-glow";

const R_PLATFORM = 2.28;
const R_BASE = 1.76;
const R_CORE = R_BASE + 0.008;
const R_HOT = R_BASE + 0.02;
const R_HALO = R_BASE + 0.05;
const R_BLOOM = R_BASE + 0.14;
const R_FLAT_IN = R_BASE + 0.004;
const R_FLAT_OUT = R_BASE + 0.07;
const R_SPILL_IN = R_BASE + 0.22;
const R_SPILL_OUT = R_PLATFORM + 0.05;
// two thin concentric outer rings — projected diagram look, no
// dense technical stack
const R_CONCENTRIC_1 = R_BASE * 1.18;
const R_CONCENTRIC_2 = R_BASE * 1.38;
const R_GOLD_1 = R_BASE * 1.28;
const R_GOLD_2 = R_BASE * 1.48;

// flat radial-fan disc — center vertex bright, perimeter
// transparent black. additive blending = a smooth round glow with
// no visible edges, so the center reads as light emitted from the
// portal, not a painted circle on the floor.
function buildRadialDisc(
  radius: number,
  segments: number,
): THREE.BufferGeometry {
  const positions: number[] = [0, 0, 0];
  const colors: number[] = [1, 1, 1];
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    positions.push(Math.cos(t) * radius, Math.sin(t) * radius, 0);
    colors.push(0, 0, 0);
  }
  const indices: number[] = [];
  for (let i = 1; i <= segments; i++) indices.push(0, i, i + 1);
  const geom = new THREE.BufferGeometry();
  geom.setIndex(indices);
  geom.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return geom;
}

function buildOrbitDots(
  radius: number,
  count: number,
  every: number,
): THREE.BufferGeometry {
  const positions: number[] = [];
  for (let i = 0; i < count; i++) {
    if (i % every !== 0) continue;
    const t = (i / count) * Math.PI * 2;
    positions.push(Math.cos(t) * radius, Math.sin(t) * radius, 0);
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  return geom;
}

export function PlatformGlowRing({ reducedMotion }: { reducedMotion: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.MeshBasicMaterial>(null);
  const hotRef = useRef<THREE.MeshBasicMaterial>(null);
  const flatRef = useRef<THREE.MeshBasicMaterial>(null);
  const haloRef = useRef<THREE.MeshBasicMaterial>(null);
  const bloomRef = useRef<THREE.MeshBasicMaterial>(null);

  // three stacked radial-fan discs — small bright white core, mid
  // cyan halo, soft outer falloff. produces a smooth point-of-light
  // gradient with no visible disc edge.
  const coreHotGeometry = useMemo(() => buildRadialDisc(0.32, 128), []);
  const coreMidGeometry = useMemo(() => buildRadialDisc(0.7, 160), []);
  const coreSoftGeometry = useMemo(() => buildRadialDisc(1.05, 192), []);
  const orbitDotGeometry = useMemo(() => buildOrbitDots(R_GOLD_2, 168, 2), []);

  // star should remain the brightest element. scale the platform's
  // animated rings down a touch so it stays crisp without competing.
  const DIM = 0.58;

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
      {/* soft floor spill — wide low-opacity additive ring. only
          reveals the floor surface as faint cyan light, never as a
          dark oval. */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.022, 0]}>
        <ringGeometry args={[R_SPILL_IN, R_SPILL_OUT, 160]} />
        <meshBasicMaterial
          color="#bff3ff"
          toneMapped={false}
          transparent
          opacity={0.035}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* === center floor glow — three stacked smooth radial-fan
          discs. brightest at the middle, fades cleanly outward, no
          visible edges. reads as light emitted from the portal,
          never as a gray painted oval. === */}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, 0.0006, 0]}
        geometry={coreSoftGeometry}
        renderOrder={3}
      >
        <meshBasicMaterial
          vertexColors
          color="#7fc7e2"
          transparent
          opacity={0.16}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, 0.0009, 0]}
        geometry={coreMidGeometry}
        renderOrder={3}
      >
        <meshBasicMaterial
          vertexColors
          color="#c5edff"
          transparent
          opacity={0.28}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, 0.0012, 0]}
        geometry={coreHotGeometry}
        renderOrder={3}
      >
        <meshBasicMaterial
          vertexColors
          color="#ffffff"
          transparent
          opacity={0.62}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      {/* === thin concentric outer rings — just two, clean and
          delicate so the portal reads as a projected diagram. === */}
      <mesh rotation-x={-Math.PI / 2} renderOrder={4}>
        <torusGeometry args={[R_CONCENTRIC_1, 0.005, 8, 220]} />
        <meshBasicMaterial
          color="#dceeff"
          transparent
          opacity={0.26}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <mesh rotation-x={-Math.PI / 2} renderOrder={4}>
        <torusGeometry args={[R_CONCENTRIC_2, 0.004, 8, 240]} />
        <meshBasicMaterial
          color="#d4c17a"
          transparent
          opacity={0.18}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* === main bright cyan-white ring stack — kept intact, this
          is the visual focus of the portal. === */}
      <mesh rotation-x={-Math.PI / 2} renderOrder={5}>
        <torusGeometry args={[R_BLOOM, 0.11, 12, 220]} />
        <meshBasicMaterial
          ref={bloomRef}
          color="#53cee5"
          toneMapped={false}
          transparent
          opacity={0.14}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh rotation-x={-Math.PI / 2} renderOrder={6}>
        <torusGeometry args={[R_HALO, 0.04, 14, 240]} />
        <meshBasicMaterial
          ref={haloRef}
          color="#d9f7ff"
          toneMapped={false}
          transparent
          opacity={0.34}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh rotation-x={-Math.PI / 2} renderOrder={7}>
        <torusGeometry args={[R_HOT, 0.018, 14, 260]} />
        <meshBasicMaterial
          ref={hotRef}
          color="#ffffff"
          toneMapped={false}
          transparent
          opacity={0.58}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh rotation-x={-Math.PI / 2} position={[0, 0.001, 0]} renderOrder={8}>
        <ringGeometry args={[R_FLAT_IN, R_FLAT_OUT, 200]} />
        <meshBasicMaterial
          ref={flatRef}
          color="#ffffff"
          toneMapped={false}
          transparent
          opacity={0.46}
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

      <mesh rotation-x={-Math.PI / 2} renderOrder={4}>
        <torusGeometry args={[R_GOLD_1, 0.004, 8, 260]} />
        <meshBasicMaterial
          color="#d4a944"
          transparent
          opacity={0.16}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <mesh rotation-x={-Math.PI / 2} renderOrder={4}>
        <torusGeometry args={[R_GOLD_2, 0.003, 8, 300]} />
        <meshBasicMaterial
          color="#d4a944"
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <points
        rotation-x={-Math.PI / 2}
        geometry={orbitDotGeometry}
        renderOrder={5}
      >
        <pointsMaterial
          size={0.028}
          color="#f2c64b"
          transparent
          opacity={0.48}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

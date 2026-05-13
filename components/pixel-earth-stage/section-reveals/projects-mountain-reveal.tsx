"use client";

import { RefObject, useEffect, useMemo, useRef, useState } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { SECTION_CONTENT, type Slab } from "@/lib/section-content";
import { SECTION_PALETTE } from "@/lib/section-palette";

import { createCdCaseFaceTexture } from "../textures";

const RING_RADIUS = 1.7;
// square CD-case proportions (1:1). slightly smaller than the cassette
// so three of them in a row sit comfortably around the character.
const CASE_W = 0.82;
const CASE_H = 0.82;
const CASE_D = 0.07;
const CASE_REST_Y = 1.85;
const CASE_HIDDEN_Y = -0.6;
const RING_CENTER_Z = -0.05;

const CASE_ANGLES = [-Math.PI / 3, 0, Math.PI / 3];

const PALETTE = SECTION_PALETTE.projects;

type Props = {
  entered: boolean;
  reducedMotion: boolean;
  ringRotationRef: RefObject<number>;
};

function useEaseLerp(active: boolean, reducedMotion: boolean, rate = 2.0) {
  const ref = useRef(0);
  useFrame((_, delta) => {
    const target = active ? 1 : 0;
    const k = reducedMotion ? 1 : Math.min(1, delta * rate);
    ref.current += (target - ref.current) * k;
  });
  return ref;
}

function cubicOut(t: number) {
  const u = 1 - Math.max(0, Math.min(1, t));
  return 1 - u * u * u;
}

function ProjectsCdCase({
  slab,
  angle,
  staggerOffset,
  entryProgressRef,
  reducedMotion,
  trackIndex,
}: {
  slab: Slab;
  angle: number;
  staggerOffset: number;
  entryProgressRef: RefObject<number>;
  reducedMotion: boolean;
  trackIndex: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const trackNumber = String(trackIndex + 1).padStart(2, "0");
  const faceTexture = useMemo(
    () =>
      createCdCaseFaceTexture(
        trackIndex,
        trackNumber,
        slab.heading,
        slab.body,
        slab.meta,
      ),
    [trackIndex, trackNumber, slab.heading, slab.body, slab.meta],
  );

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const raw = entryProgressRef.current;
    const local = reducedMotion
      ? raw >= 1 ? 1 : 0
      : Math.max(0, Math.min(1, (raw - staggerOffset) / (1 - staggerOffset)));
    const eased = cubicOut(local);
    const overshoot = reducedMotion ? 0 : Math.sin(eased * Math.PI) * 0.04;
    const y =
      CASE_HIDDEN_Y + (CASE_REST_Y - CASE_HIDDEN_Y) * eased + overshoot;
    g.position.y = y;
  });

  const xz = useMemo(() => {
    const x = Math.sin(angle) * RING_RADIUS;
    const z = Math.cos(angle) * RING_RADIUS + RING_CENTER_Z;
    return [x, z] as const;
  }, [angle]);

  return (
    <group
      ref={groupRef}
      position={[xz[0], CASE_HIDDEN_Y, xz[1]]}
      rotation={[0, angle, 0]}
    >
      <group rotation={[-0.09, 0, 0]}>
        {/* clear-ish plastic case shell. light gray + slight emissive
            bias from the cool-blue Projects palette so the case picks up
            the mountain environment's stage lighting. */}
        <mesh castShadow>
          <boxGeometry args={[CASE_W, CASE_H, CASE_D]} />
          <meshStandardMaterial
            color="#dfe2ea"
            emissive={PALETTE.emissive}
            emissiveIntensity={0.18}
            roughness={0.32}
            metalness={0.12}
            transparent
            opacity={0.92}
          />
        </mesh>
        {/* front face — baked CD-in-case texture */}
        <mesh position={[0, 0, CASE_D / 2 + 0.001]}>
          <planeGeometry args={[CASE_W, CASE_H]} />
          <meshBasicMaterial map={faceTexture} toneMapped={false} />
        </mesh>
        {/* top emissive rim — cool blue from Projects palette */}
        <mesh position={[0, CASE_H / 2 - 0.005, CASE_D / 2 + 0.003]}>
          <planeGeometry args={[CASE_W - 0.06, 0.012]} />
          <meshBasicMaterial
            color={PALETTE.rim}
            transparent
            opacity={0.85}
            toneMapped={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>
    </group>
  );
}

function ProjectsCdRing({
  entered,
  reducedMotion,
  ringRotationRef,
}: Props) {
  const ringRef = useRef<THREE.Group>(null);
  const entryProgressRef = useEaseLerp(entered, reducedMotion, 1.6);

  useFrame((_, delta) => {
    const g = ringRef.current;
    if (!g) return;
    const target = ringRotationRef.current;
    const current = g.rotation.y;
    const k = reducedMotion ? 1 : Math.min(1, delta * 7);
    g.rotation.y = current + (target - current) * k;
  });

  const slabs = SECTION_CONTENT.projects.slabs;

  return (
    <group ref={ringRef}>
      {slabs.map((slab, i) => (
        <ProjectsCdCase
          key={i}
          slab={slab}
          angle={CASE_ANGLES[i] ?? 0}
          staggerOffset={i * 0.12}
          entryProgressRef={entryProgressRef}
          reducedMotion={reducedMotion}
          trackIndex={i}
        />
      ))}
    </group>
  );
}

// gates the heavy CD-case tree on a delayed-unmount flag so it doesn't mount
// (and load any textures) until the user actually enters Projects. tail of
// 1.6s after exit so the descent animation completes before unmount.
export function ProjectsMountainReveal(props: Props) {
  const [shouldMount, setShouldMount] = useState(false);

  useEffect(() => {
    if (props.entered) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShouldMount(true);
      return;
    }
    const t = window.setTimeout(() => setShouldMount(false), 1600);
    return () => window.clearTimeout(t);
  }, [props.entered]);

  if (!shouldMount) return null;
  return <ProjectsCdRing {...props} />;
}

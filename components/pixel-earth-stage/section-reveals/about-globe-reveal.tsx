"use client";

import { RefObject, useEffect, useMemo, useRef, useState } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { SECTION_CONTENT, type Slab } from "@/lib/section-content";
import { SECTION_PALETTE } from "@/lib/section-palette";

import { createCassetteFaceTexture } from "../textures";

const RING_RADIUS = 1.7;
// real-cassette aspect (W:H ≈ 1.56). scaled so the cassettes are large
// enough to read the handwritten label at typical entry-camera distance.
const CASSETTE_W = 1.05;
const CASSETTE_H = 0.67;
const CASSETTE_D = 0.075;
const CASSETTE_REST_Y = 1.85;
const CASSETTE_HIDDEN_Y = -0.6;
const RING_CENTER_Z = -0.05;

// three cassettes at chest height arranged in a fan around the character
const CASSETTE_ANGLES = [-Math.PI / 3, 0, Math.PI / 3];

type Props = {
  entered: boolean;
  reducedMotion: boolean;
  ringRotationRef: RefObject<number>;
};

// stage-light rim color comes from the per-section palette — about gets
// a warm amber rim so the reveal reads as candlelit / listening-party warm
// instead of clinical cool.
const PALETTE = SECTION_PALETTE.about;

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

function AboutCassette({
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
  // full cassette face baked into one texture — shell, owner + slab title,
  // reels, tape, counter, multicolor stripe, screws. matches a classic
  // late-2000s major-label J-card layout, with the portfolio owner's name
  // where the artist credit lives and the slab keyword in the album-title
  // position.
  const faceTexture = useMemo(
    () =>
      createCassetteFaceTexture(
        trackIndex,
        trackNumber,
        slab.heading,
        slab.body,
        slab.meta,
        "Oziel Sauceda",
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
      CASSETTE_HIDDEN_Y +
      (CASSETTE_REST_Y - CASSETTE_HIDDEN_Y) * eased +
      overshoot;
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
      position={[xz[0], CASSETTE_HIDDEN_Y, xz[1]]}
      rotation={[0, angle, 0]}
    >
      {/* slight backward tilt so the label catches the overhead amber key
          light from the stage spotlights */}
      <group rotation={[-0.09, 0, 0]}>
        {/* cassette plastic shell — off-white plastic matching the front
            face. the front-face plane below carries the baked layout
            (reels, tape, screws, label); the shell just supplies the
            side/back edges so the cassette reads as a solid object. */}
        <mesh castShadow>
          <boxGeometry args={[CASSETTE_W, CASSETTE_H, CASSETTE_D]} />
          <meshStandardMaterial
            color="#ece4d4"
            emissive={PALETTE.emissive}
            emissiveIntensity={0.16}
            roughness={0.55}
            metalness={0.06}
          />
        </mesh>
        {/* front face — full baked cassette texture sitting 0.001 in front
            of the shell box */}
        <mesh position={[0, 0, CASSETTE_D / 2 + 0.001]}>
          <planeGeometry args={[CASSETTE_W, CASSETTE_H]} />
          <meshBasicMaterial map={faceTexture} toneMapped={false} />
        </mesh>
        {/* top emissive rim — the stage key light catches the top edge of
            the plastic shell. amber from the About palette so the
            cassettes pick up "lit from above" warmth. */}
        <mesh position={[0, CASSETTE_H / 2 - 0.005, CASSETTE_D / 2 + 0.003]}>
          <planeGeometry args={[CASSETTE_W - 0.06, 0.012]} />
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

function AboutCassetteRing({
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

  const slabs = SECTION_CONTENT.about.slabs;

  return (
    <group ref={ringRef}>
      {slabs.map((slab, i) => (
        <AboutCassette
          key={i}
          slab={slab}
          angle={CASSETTE_ANGLES[i] ?? 0}
          staggerOffset={i * 0.12}
          entryProgressRef={entryProgressRef}
          reducedMotion={reducedMotion}
          trackIndex={i}
        />
      ))}
    </group>
  );
}

// public wrapper: gates the heavy slab tree on a delayed-unmount flag so it
// doesn't mount (and therefore can't load the troika SDF font) until the user
// actually enters the section. tail of 1.6s after exit so the slab descent
// animation finishes before unmount.
export function AboutGlobeReveal(props: Props) {
  const [shouldMount, setShouldMount] = useState(false);

  useEffect(() => {
    if (props.entered) {
      // syncing React state to "section is now entered" — this IS the kind
      // of external-event reflection effects exist for.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShouldMount(true);
      return;
    }
    const t = window.setTimeout(() => setShouldMount(false), 1600);
    return () => window.clearTimeout(t);
  }, [props.entered]);

  if (!shouldMount) return null;
  return <AboutCassetteRing {...props} />;
}
